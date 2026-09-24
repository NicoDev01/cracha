"""Live SSRF acceptance: a bait server on this machine must never be reached.

Unlike tests/test_security.py this uses real DNS, a real rebinding domain, a
real redirect service and a real Chromium behind the egress proxy. Run it on
Modal (modal_ssrf_acceptance.py); see there why a local run proves little.
"""

import asyncio
import socket
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from cracha_crawler.security import (  # noqa: E402
    SafeEgressProxy,
    UnsafeUrlError,
    assert_public_url,
    create_safe_client,
)

# Alternates between 127.0.0.1 and 8.8.8.8 on every lookup (rbndr.us).
REBIND = "7f000001.08080808.rbndr.us"

hits: list[str] = []
results: list[tuple[str, bool]] = []


class Bait(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        hits.append(self.path)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"SECRET")

    def log_message(self, *args: object) -> None:
        pass


server = HTTPServer(("0.0.0.0", 0), Bait)
PORT = server.server_port
threading.Thread(target=server.serve_forever, daemon=True).start()


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok))
    print("PASS" if ok else "FAIL", name, detail)


async def check_url_forms() -> None:
    for url in [
        "http://localhost/",
        "http://localtest.me/",
        "http://127.0.0.1.nip.io/",
        "http://169.254.169.254.nip.io/latest/meta-data/",
        "http://10.0.0.1.nip.io/",
        "http://2130706433/",
        "http://0x7f000001/",
        "http://127.1/",
        "http://0/",
        "http://[::1]/",
        "http://[::ffff:127.0.0.1]/",
        "http://169.254.169.254/",
        "http://metadata.google.internal/",
        "file:///etc/passwd",
        "gopher://127.0.0.1/",
        "http://user:pw@example.com/",
    ]:
        try:
            await assert_public_url(url)
            check(f"URL check {url}", False, "accepted")
        except UnsafeUrlError:
            check(f"URL check {url}", True)
    try:
        await assert_public_url("https://example.com/")
        check("control: example.com accepted", True)
    except UnsafeUrlError as exc:
        check("control: example.com accepted", False, str(exc))


async def check_http_client() -> None:
    async with create_safe_client(timeout=3, follow_redirects=True) as client:

        async def get(url: str) -> str:
            try:
                response = await client.get(url)
                return f"status {response.status_code}"
            except Exception as exc:
                return type(exc).__name__

        before = len(hits)
        detail = await get(f"http://127.0.0.1.nip.io:{PORT}/b")
        check("client: nip.io to loopback", len(hits) == before, detail)

        # Resolvers may hold an answer for a second despite TTL 0, so ask slowly.
        seen: set[str] = set()
        for _ in range(40):
            try:
                records = socket.getaddrinfo(REBIND, PORT, type=socket.SOCK_STREAM)
                seen |= {str(record[4][0]) for record in records}
            except OSError:
                pass
            if "127.0.0.1" in seen:
                break
            await asyncio.sleep(1)
        check(
            "rebinding domain really alternates (test is meaningful)",
            "127.0.0.1" in seen,
            str(seen),
        )

        before = len(hits)
        for attempt in range(20):
            await get(f"http://{REBIND}:{PORT}/c{attempt}")
        check("client: DNS rebinding x20", len(hits) == before, f"{len(hits) - before} hits")

        redirect = "https://httpbin.org/redirect-to?url="
        before = len(hits)
        detail = await get(f"{redirect}http://127.0.0.1:{PORT}/d")
        check("client: public redirect to loopback", len(hits) == before, detail)
        detail = await get(f"{redirect}http://169.254.169.254/latest/meta-data/")
        check("client: public redirect to metadata IP", len(hits) == before, detail)


async def check_browser() -> None:
    from playwright.async_api import async_playwright

    async with SafeEgressProxy() as proxy, async_playwright() as playwright:
        # The same two flags crawl.py passes.
        browser = await playwright.chromium.launch(
            headless=True,
            args=[
                f"--proxy-server=http://127.0.0.1:{proxy.port}",
                "--proxy-bypass-list=<-loopback>",
            ],
        )
        page = await browser.new_page()

        async def navigate(url: str) -> str:
            try:
                response = await page.goto(url, timeout=8000)
                return f"status {response.status if response else None}"
            except Exception as exc:
                return str(exc).split("\n")[0][:60]

        for url in [
            f"http://127.0.0.1:{PORT}/e1",
            f"http://localhost:{PORT}/e2",
            f"http://127.0.0.1.nip.io:{PORT}/e3",
            f"http://[::1]:{PORT}/e4",
        ]:
            before = len(hits)
            detail = await navigate(url)
            check(f"browser: {url}", len(hits) == before, detail)

        before = len(hits)
        for attempt in range(10):
            await navigate(f"http://{REBIND}:{PORT}/e5-{attempt}")
        check("browser: DNS rebinding x10", len(hits) == before, f"{len(hits) - before} hits")

        detail = await navigate("https://example.com/")
        check("control: browser loads example.com via proxy", "200" in detail, detail)

        before = len(hits)
        targets = [
            f"http://127.0.0.1:{PORT}/f1",
            f"http://localtest.me:{PORT}/f2",
            f"http://{REBIND}:{PORT}/f3",
        ]
        await page.evaluate(
            """async ([targets, image]) => {
                for (const url of targets) {
                    try { await fetch(url, { mode: 'no-cors' }) } catch {}
                }
                await new Promise((done) => {
                    const img = new Image()
                    img.onerror = img.onload = done
                    img.src = image
                })
            }""",
            [targets, f"http://127.0.0.1:{PORT}/f4"],
        )
        await asyncio.sleep(1)
        check(
            "browser: page scripts fetch/img to internal targets",
            len(hits) == before,
            f"{len(hits) - before} hits",
        )
        await browser.close()


async def main() -> None:
    await check_url_forms()
    await check_http_client()
    await check_browser()
    passed = sum(ok for _, ok in results)
    print(f"\n{passed}/{len(results)} passed, bait hits total: {hits}")
    sys.exit(0 if passed == len(results) else 1)


asyncio.run(main())
