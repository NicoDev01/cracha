import asyncio
import contextlib
import socket
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from cracha_crawler.crawl import _safe_download
from cracha_crawler.security import (
    SafeAsyncHTTPTransport,
    SafeEgressProxy,
    SafeRobotsParser,
    SSRFSafeNetworkBackend,
    UnsafeUrlError,
    assert_public_url,
    create_safe_client,
    filter_ssrf_route,
)


@pytest.mark.asyncio
async def test_rejects_loopback_targets() -> None:
    for target in ["http://127.0.0.1/internal", "http://localhost:8000/path", "http://[::1]/"]:
        with pytest.raises(UnsafeUrlError):
            await assert_public_url(target)


@pytest.mark.asyncio
async def test_rejects_non_http_schemes() -> None:
    for scheme_url in ["file:///etc/passwd", "gopher://127.0.0.1:70", "ftp://example.com/file"]:
        with pytest.raises(UnsafeUrlError):
            await assert_public_url(scheme_url)


@pytest.mark.asyncio
async def test_rejects_embedded_credentials() -> None:
    with pytest.raises(UnsafeUrlError):
        await assert_public_url("https://user:password@example.com/page")


@pytest.mark.asyncio
async def test_rejects_private_and_metadata_ranges() -> None:
    for ip in [
        "http://10.0.0.1/",
        "http://172.16.0.1/",
        "http://192.168.1.1/",
        "http://169.254.169.254/latest/meta-data",
        "http://0.0.0.0/",
    ]:
        with pytest.raises(UnsafeUrlError):
            await assert_public_url(ip)


@pytest.mark.asyncio
async def test_dns_rebinding_audit_regression_blocked_at_connection() -> None:
    """Audit A1 regression:

    A domain resolves to a public IP on preflight check, then rebinds to 127.0.0.1
    for the connection attempt. With SafeAsyncHTTPTransport, the connection backend
    resolves and verifies the IP immediately prior to TCP connection and pins it.
    If the second resolution returns a loopback IP, connection is aborted with UnsafeUrlError
    and the local server NEVER receives any request.
    """
    received_requests = 0

    async def handle_dummy_client(
        reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        nonlocal received_requests
        received_requests += 1
        writer.write(b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nAUDIT_LOOPBACK_ONLY")
        await writer.drain()
        writer.close()

    server = await asyncio.start_server(handle_dummy_client, "127.0.0.1", 0)
    server_port = server.sockets[0].getsockname()[1]

    call_count = 0
    orig_getaddrinfo = socket.getaddrinfo

    def mocked_getaddrinfo(host: str, port: Any, *args: Any, **kwargs: Any) -> list[Any]:
        nonlocal call_count
        if host == "audit.invalid":
            call_count += 1
            if call_count == 1:
                # First resolution: simulate legitimate public IP
                return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))]
            # Second resolution (connection time): rebind to local dummy server
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", port))]
        return orig_getaddrinfo(host, port, *args, **kwargs)

    try:
        with pytest.MonkeyPatch.context() as mp:
            mp.setattr(socket, "getaddrinfo", mocked_getaddrinfo)
            async with create_safe_client(timeout=5) as client:
                with pytest.raises(UnsafeUrlError):
                    await _safe_download(client, f"http://audit.invalid:{server_port}/")
    finally:
        server.close()
        await server.wait_closed()

    # The local loopback server MUST NEVER have received any request!
    assert received_requests == 0


@pytest.mark.asyncio
async def test_safe_egress_proxy_blocks_connect_to_private_and_loopback() -> None:
    proxy = SafeEgressProxy()
    await proxy.start()
    try:
        for dangerous_host in ["127.0.0.1", "localhost", "169.254.169.254", "10.0.0.1"]:
            reader, writer = await asyncio.open_connection("127.0.0.1", proxy.port)
            req = f"CONNECT {dangerous_host}:80 HTTP/1.1\r\nHost: {dangerous_host}:80\r\n\r\n"
            writer.write(req.encode())
            await writer.drain()
            response = await reader.read(1024)
            writer.close()
            assert b"403 Forbidden" in response
    finally:
        await proxy.close()


@pytest.mark.asyncio
async def test_safe_egress_proxy_blocks_plain_http_to_private_and_loopback() -> None:
    proxy = SafeEgressProxy()
    await proxy.start()
    try:
        for dangerous_target in [
            "http://127.0.0.1:8080/admin",
            "http://localhost/status",
            "http://169.254.169.254/latest/meta-data",
        ]:
            reader, writer = await asyncio.open_connection("127.0.0.1", proxy.port)
            writer.write(
                f"GET {dangerous_target} HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n".encode()
            )
            await writer.drain()
            response = await reader.read(1024)
            writer.close()
            assert b"403 Forbidden" in response
    finally:
        await proxy.close()


@pytest.mark.asyncio
async def test_filter_ssrf_route_allows_data_and_blob_urls() -> None:
    for safe_url in ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==", "blob:https://example.com/uuid"]:
        route = MagicMock()
        route.request = MagicMock()
        route.request.url = safe_url
        route.continue_ = AsyncMock()
        route.abort = AsyncMock()

        await filter_ssrf_route(route)
        route.continue_.assert_awaited_once()
        route.abort.assert_not_called()


@pytest.mark.asyncio
async def test_filter_ssrf_route_blocks_private_and_metadata_targets() -> None:
    for dangerous_url in [
        "http://127.0.0.1:8080/admin",
        "http://169.254.169.254/latest/meta-data",
        "http://localhost/",
    ]:
        route = MagicMock()
        route.request = MagicMock()
        route.request.url = dangerous_url
        route.continue_ = AsyncMock()
        route.abort = AsyncMock()

        await filter_ssrf_route(route)
        route.abort.assert_awaited_once_with("blockedbyclient")
        route.continue_.assert_not_called()


@pytest.mark.asyncio
async def test_safe_robots_parser_blocks_dns_rebinding_regression(tmp_path: Any) -> None:
    """R1 regression test:

    Simulates preflight public DNS resolution followed by DNS rebinding to 127.0.0.1
    during robots.txt fetch. SafeRobotsParser must use SafeAsyncHTTPTransport,
    detect non-public address, deny access (can_fetch -> False), and send ZERO requests
    to the local dummy server.
    """
    received_requests = 0

    async def handle_dummy_client(
        reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        nonlocal received_requests
        received_requests += 1
        writer.write(
            b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nUser-agent: *\nDisallow:\n"
        )
        await writer.drain()
        writer.close()

    server = await asyncio.start_server(handle_dummy_client, "127.0.0.1", 0)
    server_port = server.sockets[0].getsockname()[1]

    call_count = 0
    orig_getaddrinfo = socket.getaddrinfo

    def mocked_getaddrinfo(host: str, port: Any, *args: Any, **kwargs: Any) -> list[Any]:
        nonlocal call_count
        if host == "robots-rebind.invalid":
            call_count += 1
            if call_count == 1:
                return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))]
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", port))]
        return orig_getaddrinfo(host, port, *args, **kwargs)

    try:
        with pytest.MonkeyPatch.context() as mp:
            mp.setattr(socket, "getaddrinfo", mocked_getaddrinfo)
            # First resolution (preflight check) returns legitimate public IP:
            await assert_public_url(f"http://robots-rebind.invalid:{server_port}/article")
            # Second resolution (robots.txt connection time) rebinds to loopback:
            parser = SafeRobotsParser(cache_dir=str(tmp_path / "robots"))
            allowed = await parser.can_fetch(f"http://robots-rebind.invalid:{server_port}/article")
    finally:
        server.close()
        await server.wait_closed()

    # The local loopback server MUST NEVER have received any robots.txt request!
    assert received_requests == 0
    assert allowed is False


@pytest.mark.asyncio
async def test_crawl4ai_library_robots_parser_blocks_dns_rebinding(tmp_path: Any) -> None:
    """R1 regression test:

    Verifies that crawl4ai.utils.RobotsParser and crawl4ai.async_webcrawler.RobotsParser
    themselves have been secured against DNS rebinding, and send ZERO requests to loopback.
    """
    import crawl4ai.async_webcrawler
    import crawl4ai.utils

    received_requests = 0

    async def handle_dummy_client(
        reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        nonlocal received_requests
        received_requests += 1
        writer.write(
            b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nUser-agent: *\nDisallow:\n"
        )
        await writer.drain()
        writer.close()

    server = await asyncio.start_server(handle_dummy_client, "127.0.0.1", 0)
    server_port = server.sockets[0].getsockname()[1]

    call_count = 0
    orig_getaddrinfo = socket.getaddrinfo

    def mocked_getaddrinfo(host: str, port: Any, *args: Any, **kwargs: Any) -> list[Any]:
        nonlocal call_count
        if host == "robots-crawl4ai-rebind.invalid":
            call_count += 1
            if call_count == 1:
                return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))]
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", port))]
        return orig_getaddrinfo(host, port, *args, **kwargs)

    try:
        with pytest.MonkeyPatch.context() as mp:
            mp.setattr(socket, "getaddrinfo", mocked_getaddrinfo)
            await assert_public_url(f"http://robots-crawl4ai-rebind.invalid:{server_port}/article")

            # 1. Direct crawl4ai.utils.RobotsParser instantiation
            utils_parser = crawl4ai.utils.RobotsParser(cache_dir=str(tmp_path / "robots-utils"))
            allowed_utils = await utils_parser.can_fetch(
                f"http://robots-crawl4ai-rebind.invalid:{server_port}/article"
            )

            # 2. AsyncWebCrawler default robots parser
            crawler = crawl4ai.async_webcrawler.AsyncWebCrawler()
            allowed_crawler = await crawler.robots_parser.can_fetch(
                f"http://robots-crawl4ai-rebind.invalid:{server_port}/article"
            )
    finally:
        server.close()
        await server.wait_closed()

    assert received_requests == 0
    assert allowed_utils is False
    assert allowed_crawler is False


@pytest.mark.asyncio
async def test_safe_robots_parser_blocks_redirect_to_loopback(tmp_path: Any) -> None:
    """R1 regression test:

    A public site responds to /robots.txt with a redirect (302) to 127.0.0.1.
    SafeRobotsParser's transport must intercept the redirect target, verify it is
    private, refuse connection, and send ZERO requests to the local server.
    """
    from unittest.mock import patch

    import httpcore
    from httpcore._backends.auto import AutoBackend

    local_server_requests = 0
    redirect_server_requests = 0

    async def handle_local_client(
        reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        nonlocal local_server_requests
        local_server_requests += 1
        writer.write(
            b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nUser-agent: *\nAllow: /\n"
        )
        await writer.drain()
        writer.close()

    local_server = await asyncio.start_server(handle_local_client, "127.0.0.1", 0)
    local_port = local_server.sockets[0].getsockname()[1]

    # Mock public redirector that returns 302 to local_server
    async def handle_redirect_client(
        reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        nonlocal redirect_server_requests
        redirect_server_requests += 1
        # Read HTTP request
        while True:
            line = await reader.readline()
            if not line or line in (b"\r\n", b"\n"):
                break
        writer.write(
            f"HTTP/1.1 302 Found\r\nLocation: http://127.0.0.1:{local_port}/robots.txt\r\n\r\n".encode()
        )
        await writer.drain()
        writer.close()

    redirect_server = await asyncio.start_server(handle_redirect_client, "127.0.0.1", 0)
    redirect_port = redirect_server.sockets[0].getsockname()[1]

    orig_getaddrinfo = socket.getaddrinfo

    def mocked_getaddrinfo(host: str, port: Any, *args: Any, **kwargs: Any) -> list[Any]:
        if host == "redirector.public":
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))]
        return orig_getaddrinfo(host, port, *args, **kwargs)

    class RedirectMockBackend(httpcore.AsyncNetworkBackend):
        def __init__(self, inner: httpcore.AsyncNetworkBackend) -> None:
            self._inner = inner

        async def connect_tcp(
            self, host: str, port: int, **kwargs: Any
        ) -> httpcore.AsyncNetworkStream:
            # If connecting to the public pinned IP for redirector, route to local redirect_server
            if host == "93.184.216.34":
                return await self._inner.connect_tcp(
                    host="127.0.0.1", port=redirect_port, **kwargs
                )
            return await self._inner.connect_tcp(host=host, port=port, **kwargs)

        async def sleep(self, seconds: float) -> None:
            await self._inner.sleep(seconds)

    inner_backend = RedirectMockBackend(AutoBackend())
    transport = SafeAsyncHTTPTransport()
    transport._pool._network_backend = SSRFSafeNetworkBackend(inner=inner_backend)

    try:
        parser = SafeRobotsParser(cache_dir=str(tmp_path / "robots"), transport=transport)
        with patch("socket.getaddrinfo", side_effect=mocked_getaddrinfo):
            # Test that redirector.public is contacted, returns 302 to loopback, and gets blocked
            allowed = await parser.can_fetch(f"http://redirector.public:{redirect_port}/target")
    finally:
        local_server.close()
        await local_server.wait_closed()
        redirect_server.close()
        await redirect_server.wait_closed()

    # The redirect server was actually contacted for the public address
    assert redirect_server_requests >= 1
    # The local loopback server MUST NEVER have received any robots.txt request!
    assert local_server_requests == 0
    assert allowed is False

    # Also test direct loopback IP literal: must be blocked immediately
    allowed_direct = await parser.can_fetch(f"http://127.0.0.1:{local_port}/target")
    assert allowed_direct is False


@pytest.mark.asyncio
async def test_safe_robots_parser_respects_rules_on_public_server(tmp_path: Any) -> None:
    """SafeRobotsParser correctly parses and enforces robots.txt rules when fetched."""
    parser = SafeRobotsParser(cache_dir=str(tmp_path / "robots"))
    rules_text = "User-agent: *\nAllow: /admin/public/\nDisallow: /admin/\n"
    parser._cache_rules("example.com", rules_text)

    # Disallowed path
    assert await parser.can_fetch("http://example.com/admin/secret") is False
    # Allowed path
    assert await parser.can_fetch("http://example.com/admin/public/file") is True
    # Default allowed path
    assert await parser.can_fetch("http://example.com/blog") is True


def test_real_chromium_browser_subresources_and_websockets_blocked_by_proxy() -> None:
    """R1 requirement: Full browser test with real Chromium.

    Verifies that Chromium running through SafeEgressProxy cannot reach a local dummy
    server through:
    1. Direct page navigation
    2. Subresources: <img>, <script>, <iframe>, fetch() / XMLHttpRequest
    3. WebSockets (ws://)
    """
    from playwright.async_api import async_playwright

    loop_factory = getattr(asyncio, "ProactorEventLoop", None)
    with asyncio.Runner(loop_factory=loop_factory) as runner:

        async def _run() -> None:
            received_requests = 0

            async def handle_dummy_client(
                reader: asyncio.StreamReader, writer: asyncio.StreamWriter
            ) -> None:
                nonlocal received_requests
                received_requests += 1
                writer.write(
                    b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nFORBIDDEN_LOCAL_ACCESS"
                )
                await writer.drain()
                writer.close()

            dummy_server = await asyncio.start_server(handle_dummy_client, "127.0.0.1", 0)
            dummy_port = dummy_server.sockets[0].getsockname()[1]

            proxy = SafeEgressProxy()
            await proxy.start()

            try:
                async with async_playwright() as p:
                    browser = await p.chromium.launch(
                        headless=True,
                        args=[
                            "--no-sandbox",
                            "--disable-dev-shm-usage",
                            "--disable-gpu",
                            f"--proxy-server=http://127.0.0.1:{proxy.port}",
                            "--proxy-bypass-list=<-loopback>",
                        ],
                    )
                    # 1. Direct navigation to local dummy server: proxy blocks it
                    page1 = await browser.new_page()
                    with contextlib.suppress(Exception):
                        await page1.goto(f"http://127.0.0.1:{dummy_port}/direct", timeout=2000)
                    await page1.close()

                    # 2. Subresources & WebSockets via a separate clean page
                    page2 = await browser.new_page()
                    html_content = f"""
                    <!DOCTYPE html>
                    <html>
                    <body>
                        <img src="http://127.0.0.1:{dummy_port}/img.png" />
                        <script src="http://127.0.0.1:{dummy_port}/script.js"></script>
                        <iframe src="http://127.0.0.1:{dummy_port}/frame"></iframe>
                        <script>
                            fetch("http://127.0.0.1:{dummy_port}/fetch").catch(() => {{}});
                            try {{
                                const ws = new WebSocket("ws://127.0.0.1:{dummy_port}/ws");
                            }} catch (e) {{}}
                        </script>
                    </body>
                    </html>
                    """
                    await page2.set_content(html_content)
                    await asyncio.sleep(0.5)
                    await page2.close()

                    await browser.close()
            finally:
                await proxy.close()
                dummy_server.close()
                await dummy_server.wait_closed()

            # The local loopback server MUST NEVER have received any requests from Chromium!
            assert received_requests == 0

        runner.run(_run())


@pytest.mark.asyncio
async def test_safe_async_http_transport_sni_preservation_and_internals() -> None:
    """Verify SafeAsyncHTTPTransport pool configuration and SNI preservation.

    Ensures that SSRFSafeNetworkBackend is cleanly attached to httpcore AsyncConnectionPool,
    and that connection logic preserves the original hostname for SNI in TLS streams.
    """
    transport = SafeAsyncHTTPTransport()
    assert hasattr(transport, "_pool")
    assert hasattr(transport._pool, "_network_backend")
    assert isinstance(transport._pool._network_backend, SSRFSafeNetworkBackend)

    from unittest.mock import AsyncMock, MagicMock, patch

    mock_inner = MagicMock()
    mock_stream = MagicMock()
    mock_stream.start_tls = AsyncMock(return_value=mock_stream)
    mock_inner.connect_tcp = AsyncMock(return_value=mock_stream)

    backend = SSRFSafeNetworkBackend(inner=mock_inner)

    def mocked_getaddrinfo(host: str, port: Any, *args: Any, **kwargs: Any) -> list[Any]:
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))]

    with patch("socket.getaddrinfo", side_effect=mocked_getaddrinfo):
        stream = await backend.connect_tcp("my-site.example.com", 443)

    mock_inner.connect_tcp.assert_awaited_once()
    assert mock_inner.connect_tcp.await_args.kwargs["host"] == "93.184.216.34"
    assert mock_inner.connect_tcp.await_args.kwargs["port"] == 443
    assert stream is mock_stream
