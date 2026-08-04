import asyncio
import ipaddress
import socket
from urllib.parse import urlsplit


class UnsafeUrlError(ValueError):
    pass


def _is_public(address: str) -> bool:
    ip = ipaddress.ip_address(address)
    return ip.is_global


async def assert_public_url(url: str) -> None:
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise UnsafeUrlError("Only public HTTP(S) URLs are supported.")
    if parsed.username or parsed.password:
        raise UnsafeUrlError("URLs with embedded credentials are not supported.")

    loop = asyncio.get_running_loop()
    records = await loop.run_in_executor(
        None,
        lambda: socket.getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM),
    )
    addresses = {record[4][0] for record in records}
    if not addresses or any(not _is_public(address) for address in addresses):
        raise UnsafeUrlError("Private, local, reserved, or unresolved hosts are not allowed.")
