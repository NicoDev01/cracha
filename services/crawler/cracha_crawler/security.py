import asyncio
import contextlib
import hashlib
import ipaddress
import os
import socket
import sqlite3
import time
from collections.abc import Iterable
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import httpcore
import httpx


class UnsafeUrlError(ValueError):
    pass


def _is_public(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
        return (
            ip.is_global
            and not ip.is_loopback
            and not ip.is_link_local
            and not ip.is_private
            and not ip.is_reserved
            and not ip.is_multicast
            and not ip.is_unspecified
        )
    except ValueError:
        return False


async def assert_public_url(url: str) -> None:
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise UnsafeUrlError("Only public HTTP(S) URLs are supported.")
    if parsed.username or parsed.password:
        raise UnsafeUrlError("URLs with embedded credentials are not supported.")

    loop = asyncio.get_running_loop()
    try:
        records = await loop.run_in_executor(
            None,
            lambda: socket.getaddrinfo(
                parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM
            ),
        )
    except OSError as exc:
        raise UnsafeUrlError(f"Host {parsed.hostname!r} could not be resolved: {exc}") from exc

    addresses = {record[4][0] for record in records}
    if not addresses or any(not _is_public(address) for address in addresses):
        raise UnsafeUrlError("Private, local, reserved, or unresolved hosts are not allowed.")


class SSRFSafeNetworkBackend(httpcore.AsyncNetworkBackend):
    """Network backend for httpcore that pins TCP connections to verified public IPs.

    Prevents DNS-rebinding attacks by resolving DNS exactly once at connection time,
    verifying all returned IP addresses are public, and connecting directly to the pinned IP.
    For TLS connections, httpcore continues to use the original domain for SNI and
    certificate verification.
    """

    def __init__(self, inner: httpcore.AsyncNetworkBackend | None = None) -> None:
        from httpcore._backends.auto import AutoBackend

        self._inner = inner or AutoBackend()

    async def connect_tcp(
        self,
        host: str,
        port: int,
        timeout: float | None = None,
        local_address: str | None = None,
        socket_options: Iterable[Any] | None = None,
    ) -> httpcore.AsyncNetworkStream:
        loop = asyncio.get_running_loop()
        try:
            records = await loop.run_in_executor(
                None,
                lambda: socket.getaddrinfo(host, port, type=socket.SOCK_STREAM),
            )
        except OSError as exc:
            raise UnsafeUrlError(f"Host {host!r} could not be resolved: {exc}") from exc

        if not records:
            raise UnsafeUrlError(f"Host {host!r} produced no address records.")

        verified_ips: list[str] = []
        for record in records:
            ip_str = record[4][0]
            if not _is_public(ip_str):
                raise UnsafeUrlError(f"Host {host!r} resolved to non-public address {ip_str!r}.")
            verified_ips.append(ip_str)

        pinned_ip = verified_ips[0]
        return await self._inner.connect_tcp(
            host=pinned_ip,
            port=port,
            timeout=timeout,
            local_address=local_address,
            socket_options=socket_options,
        )

    async def connect_unix_socket(
        self,
        path: str,
        timeout: float | None = None,
        socket_options: Iterable[Any] | None = None,
    ) -> httpcore.AsyncNetworkStream:
        raise UnsafeUrlError("Unix domain sockets are not allowed.")

    async def sleep(self, seconds: float) -> None:
        await self._inner.sleep(seconds)


class SafeAsyncHTTPTransport(httpx.AsyncHTTPTransport):
    """HTTPX Async Transport using SSRFSafeNetworkBackend."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self._pool._network_backend = SSRFSafeNetworkBackend()


def create_safe_client(**kwargs: Any) -> httpx.AsyncClient:
    transport = kwargs.pop("transport", None) or SafeAsyncHTTPTransport()
    return httpx.AsyncClient(transport=transport, **kwargs)


class SafeRobotsParser:
    """Drop-in replacement for Crawl4AI's RobotsParser that uses SafeAsyncHTTPTransport.

    Guarantees that robots.txt fetching is protected against SSRF and DNS rebinding:
    every connection (including redirects) is pinned to verified public IPs.
    If a domain rebinds or redirects to private/loopback addresses, access is denied
    without ever contacting the local or private target.
    """

    CACHE_TTL = 7 * 24 * 60 * 60

    def __init__(
        self,
        cache_dir: str | None = None,
        cache_ttl: int | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        try:
            from crawl4ai.utils import get_home_folder

            base_dir = get_home_folder()
        except Exception:
            base_dir = os.path.expanduser("~")

        self.cache_dir = cache_dir or os.path.join(base_dir, ".crawl4ai", "robots")
        self.cache_ttl = cache_ttl or self.CACHE_TTL
        self.transport = transport
        os.makedirs(self.cache_dir, exist_ok=True)
        self.db_path = os.path.join(self.cache_dir, "robots_cache.db")
        self._init_db()

    def _init_db(self) -> None:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("PRAGMA journal_mode=WAL")
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS robots_cache (
                        domain TEXT PRIMARY KEY,
                        rules TEXT NOT NULL,
                        fetch_time INTEGER NOT NULL,
                        hash TEXT NOT NULL
                    )
                """
                )
                conn.execute("CREATE INDEX IF NOT EXISTS idx_domain ON robots_cache(domain)")
        except Exception:
            pass

    def _get_cached_rules(self, domain: str) -> tuple[str | None, bool]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(
                    "SELECT rules, fetch_time, hash FROM robots_cache WHERE domain = ?",
                    (domain,),
                )
                result = cursor.fetchone()
                if not result:
                    return None, False
                rules, fetch_time, _ = result
                return rules, (time.time() - fetch_time) < self.cache_ttl
        except Exception:
            return None, False

    def _cache_rules(self, domain: str, content: str) -> None:
        try:
            hash_val = hashlib.md5(content.encode()).hexdigest()
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(
                    "SELECT hash FROM robots_cache WHERE domain = ?",
                    (domain,),
                )
                result = cursor.fetchone()
                if not result or result[0] != hash_val:
                    conn.execute(
                        """INSERT OR REPLACE INTO robots_cache
                           (domain, rules, fetch_time, hash)
                           VALUES (?, ?, ?, ?)""",
                        (domain, content, int(time.time()), hash_val),
                    )
        except Exception:
            pass

    async def can_fetch(self, url: str, user_agent: str = "*") -> bool:
        try:
            parsed = urlsplit(url)
            domain = parsed.hostname
            if not domain:
                return True
            try:
                ip = ipaddress.ip_address(domain)
                if not _is_public(str(ip)):
                    return False
            except ValueError:
                pass
        except Exception:
            return True

        rules, is_fresh = self._get_cached_rules(domain)

        if not is_fresh:
            scheme = parsed.scheme or "http"
            port_part = f":{parsed.port}" if parsed.port and parsed.port not in (80, 443) else ""
            robots_url = f"{scheme}://{domain}{port_part}/robots.txt"

            try:
                async with create_safe_client(
                    timeout=3.0, follow_redirects=True, transport=self.transport
                ) as client:
                    response = await client.get(robots_url)
                    if response.status_code == 200:
                        rules = response.text
                        self._cache_rules(domain, rules)
                    else:
                        return response.status_code not in (401, 403)
            except Exception as exc:
                # Inspect exception chain for UnsafeUrlError (httpx wraps in ConnectError)
                err: BaseException | None = exc
                is_unsafe = False
                while err is not None:
                    if isinstance(err, UnsafeUrlError) or "UnsafeUrlError" in type(err).__name__:
                        is_unsafe = True
                        break
                    err = err.__cause__ or err.__context__

                return not is_unsafe

        if not rules:
            return True

        from urllib.robotparser import RobotFileParser

        parser = RobotFileParser()
        parser.parse(rules.splitlines())
        if not parser.mtime():
            return True
        return parser.can_fetch(user_agent, url)

    def clear_cache(self) -> None:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("DELETE FROM robots_cache")
        except Exception:
            pass

    def clear_expired(self) -> None:
        try:
            with sqlite3.connect(self.db_path) as conn:
                expire_time = int(time.time()) - self.cache_ttl
                conn.execute("DELETE FROM robots_cache WHERE fetch_time < ?", (expire_time,))
        except Exception:
            pass


def install_crawl4ai_security_patches() -> None:
    try:
        import crawl4ai.async_webcrawler
        import crawl4ai.utils

        orig_class = getattr(crawl4ai.utils, "RobotsParser", None)
        if orig_class and orig_class is not SafeRobotsParser:
            orig_class.__init__ = SafeRobotsParser.__init__
            orig_class.can_fetch = SafeRobotsParser.can_fetch
            orig_class._init_db = SafeRobotsParser._init_db
            orig_class._get_cached_rules = SafeRobotsParser._get_cached_rules
            orig_class._cache_rules = SafeRobotsParser._cache_rules
            orig_class.clear_cache = SafeRobotsParser.clear_cache
            orig_class.clear_expired = getattr(SafeRobotsParser, "clear_expired", lambda s: None)

        crawl4ai.utils.RobotsParser = SafeRobotsParser
        crawl4ai.async_webcrawler.RobotsParser = SafeRobotsParser

        # Ensure AsyncWebCrawler always initializes with SafeRobotsParser
        orig_crawler_init = crawl4ai.async_webcrawler.AsyncWebCrawler.__init__

        def safe_crawler_init(self: Any, *args: Any, **kwargs: Any) -> None:
            orig_crawler_init(self, *args, **kwargs)
            self.robots_parser = SafeRobotsParser()

        crawl4ai.async_webcrawler.AsyncWebCrawler.__init__ = safe_crawler_init
    except ImportError:
        pass


install_crawl4ai_security_patches()


class SafeEgressProxy:
    """Local forward and CONNECT proxy that prevents SSRF for browser crawlers.

    Chromium routes all HTTP, HTTPS (via CONNECT), and WebSocket traffic through this
    proxy. Target hostnames are resolved and checked for public IP compliance before
    any upstream connection is opened.
    """

    def __init__(self, host: str = "127.0.0.1", port: int = 0) -> None:
        self.host = host
        self.port = port
        self.server: asyncio.Server | None = None

    async def start(self) -> "SafeEgressProxy":
        self.server = await asyncio.start_server(self._handle_client, self.host, self.port)
        self.port = self.server.sockets[0].getsockname()[1]
        return self

    async def close(self) -> None:
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            self.server = None

    async def __aenter__(self) -> "SafeEgressProxy":
        return await self.start()

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.close()

    async def _handle_client(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        try:
            line = await reader.readline()
            if not line:
                writer.close()
                return

            line_str = line.decode("latin1", errors="replace").strip()
            parts = line_str.split()
            if len(parts) < 2:
                writer.close()
                return

            method, target = parts[0].upper(), parts[1]

            if method == "CONNECT":
                # Handle HTTPS / TLS tunneling via CONNECT host:port
                if ":" in target:
                    host, port_str = target.split(":", 1)
                    port = int(port_str)
                else:
                    host, port = target, 443

                # Consume remaining client headers until empty line
                while True:
                    hdr = await reader.readline()
                    if not hdr or hdr in (b"\r\n", b"\n"):
                        break

                # Resolve and validate host
                loop = asyncio.get_running_loop()
                try:
                    records = await loop.run_in_executor(
                        None, lambda: socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
                    )
                except Exception:
                    writer.write(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
                    await writer.drain()
                    writer.close()
                    return

                ips = [r[4][0] for r in records]
                if not ips or any(not _is_public(ip) for ip in ips):
                    writer.write(b"HTTP/1.1 403 Forbidden\r\n\r\nBlocked by SSRF policy")
                    await writer.drain()
                    writer.close()
                    return

                pinned_ip = ips[0]
                try:
                    rem_reader, rem_writer = await asyncio.open_connection(pinned_ip, port)
                except Exception:
                    writer.write(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
                    await writer.drain()
                    writer.close()
                    return

                writer.write(b"HTTP/1.1 200 Connection Established\r\n\r\n")
                await writer.drain()

                async def pipe(r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
                    try:
                        while True:
                            data = await r.read(65536)
                            if not data:
                                break
                            w.write(data)
                            await w.drain()
                    except Exception:
                        pass
                    finally:
                        with contextlib.suppress(Exception):
                            w.close()

                await asyncio.gather(pipe(reader, rem_writer), pipe(rem_reader, writer))

            else:
                # Handle plain HTTP request (GET http://example.com/path HTTP/1.1)
                parsed = urlsplit(target)
                host = parsed.hostname
                port = parsed.port or 80
                if not host or parsed.scheme not in ("http", "https"):
                    writer.write(b"HTTP/1.1 400 Bad Request\r\n\r\n")
                    await writer.drain()
                    writer.close()
                    return

                loop = asyncio.get_running_loop()
                try:
                    records = await loop.run_in_executor(
                        None, lambda: socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
                    )
                except Exception:
                    writer.write(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
                    await writer.drain()
                    writer.close()
                    return

                ips = [r[4][0] for r in records]
                if not ips or any(not _is_public(ip) for ip in ips):
                    writer.write(b"HTTP/1.1 403 Forbidden\r\n\r\nBlocked by SSRF policy")
                    await writer.drain()
                    writer.close()
                    return

                pinned_ip = ips[0]
                try:
                    rem_reader, rem_writer = await asyncio.open_connection(pinned_ip, port)
                except Exception:
                    writer.write(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
                    await writer.drain()
                    writer.close()
                    return

                # Rewrite request line to relative path
                path = urlunsplit(("", "", parsed.path or "/", parsed.query, ""))
                proto = parts[2] if len(parts) > 2 else "HTTP/1.1"
                rem_writer.write(f"{method} {path} {proto}\r\n".encode("latin1"))

                # Forward headers
                while True:
                    hdr = await reader.readline()
                    if not hdr:
                        break
                    rem_writer.write(hdr)
                    if hdr in (b"\r\n", b"\n"):
                        break
                await rem_writer.drain()

                async def pipe_http(r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
                    try:
                        while True:
                            data = await r.read(65536)
                            if not data:
                                break
                            w.write(data)
                            await w.drain()
                    except Exception:
                        pass
                    finally:
                        with contextlib.suppress(Exception):
                            w.close()

                await asyncio.gather(pipe_http(reader, rem_writer), pipe_http(rem_reader, writer))

        except Exception:
            with contextlib.suppress(Exception):
                writer.close()


async def filter_ssrf_route(route: Any) -> None:
    request = getattr(route, "request", None)
    url = getattr(request, "url", "") if request else ""
    if url.startswith(("data:", "blob:", "about:")):
        with contextlib.suppress(Exception):
            await route.continue_()
        return
    try:
        await assert_public_url(url)
        await route.continue_()
    except Exception as exc:
        print(f"[SECURITY] Intercepted SSRF attempt to {url}: {exc}")
        with contextlib.suppress(Exception):
            await route.abort("blockedbyclient")
