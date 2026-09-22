from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from services.crawler import modal_app

from cracha_crawler.settlement import settle_status


@pytest.mark.asyncio
async def test_nonterminal_status_does_not_settle():
    assert not await settle_status({"hold_reference": "ref", "status": "running"})


@pytest.mark.asyncio
async def test_terminal_status_is_durable_before_callback_and_retry(monkeypatch):
    records = {"job": {"status": "running", "hold_reference": "ref"}}

    async def get(key):
        return records.get(key)

    async def put(key, value):
        records[key] = value.copy()

    async def fail(_status):
        assert records["job"]["status"] == "completed"
        raise RuntimeError("offline")

    monkeypatch.setattr(
        modal_app,
        "crawl_statuses",
        SimpleNamespace(get=SimpleNamespace(aio=get), put=SimpleNamespace(aio=put)),
    )
    monkeypatch.setattr(modal_app, "settle_status", fail)
    await modal_app.update_status("job", status="completed", result={"indexed_pages": 7})
    assert not records["job"].get("credits_settled")
    callback = AsyncMock(return_value=True)
    monkeypatch.setattr(modal_app, "settle_status", callback)
    await modal_app.update_status("job")
    assert records["job"]["credits_settled"]
    await modal_app.update_status("job")
    callback.assert_awaited_once()
