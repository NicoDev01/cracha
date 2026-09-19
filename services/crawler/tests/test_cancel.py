from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException
from services.crawler import modal_app


@pytest.fixture
def cancel_endpoint(monkeypatch):
    statuses = SimpleNamespace(get=SimpleNamespace(aio=AsyncMock()))
    monkeypatch.setattr(modal_app, "crawl_statuses", statuses)
    update = AsyncMock()
    monkeypatch.setattr(modal_app, "update_status", update)
    cancel = AsyncMock()
    factory = Mock(return_value=SimpleNamespace(cancel=SimpleNamespace(aio=cancel)))
    monkeypatch.setattr(modal_app.modal.FunctionCall, "from_id", factory)
    web = modal_app.api.get_raw_f()()
    endpoint = next(route.endpoint for route in web.routes if route.path == "/cancel/{job_id}")
    return endpoint, statuses.get.aio, update, cancel


@pytest.mark.asyncio
@pytest.mark.parametrize("state", ["completed", "failed"])
async def test_terminal_job_cannot_be_converted_to_a_free_cancellation(cancel_endpoint, state):
    endpoint, get, update, cancel = cancel_endpoint
    get.return_value = {"status": state, "call_id": "call"}
    with pytest.raises(HTTPException) as error:
        await endpoint("job")
    assert error.value.status_code == 409
    update.assert_not_awaited()
    cancel.assert_not_awaited()


@pytest.mark.asyncio
async def test_repeated_cancellation_is_safe_for_refund_retry(cancel_endpoint):
    endpoint, get, update, cancel = cancel_endpoint
    get.return_value = {"status": "cancelled", "call_id": "call"}
    assert (await endpoint("job"))["status"] == "cancelled"
    update.assert_not_awaited()
    cancel.assert_not_awaited()


@pytest.mark.asyncio
async def test_running_crawl_stops_both_processors(cancel_endpoint):
    endpoint, get, update, cancel = cancel_endpoint
    get.return_value = {"status": "running", "call_id": "crawl", "finalizer_call_id": "index"}
    assert (await endpoint("job"))["status"] == "cancelled"
    assert cancel.await_count == 2
    update.assert_awaited_once_with("job", status="cancelled", phase="cancelled", error=None)
