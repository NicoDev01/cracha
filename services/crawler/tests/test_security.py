import pytest

from cracha_crawler.security import UnsafeUrlError, assert_public_url


@pytest.mark.asyncio
async def test_rejects_loopback_targets() -> None:
    with pytest.raises(UnsafeUrlError):
        await assert_public_url("http://127.0.0.1/internal")


@pytest.mark.asyncio
async def test_rejects_non_http_schemes() -> None:
    with pytest.raises(UnsafeUrlError):
        await assert_public_url("file:///etc/passwd")
