import asyncio
import hmac
import os
import time
import uuid
from datetime import UTC, datetime
from typing import Annotated

import modal

from cracha_crawler.crawl import CrawlBlockedError, analyze_site, crawl_pages
from cracha_crawler.ingest import INDEX_STATUS_ATTEMPTS, PageBuffer, RagIngestClient
from cracha_crawler.models import AnalyzeRequest, CrawlRequest, Page, SiteAnalysis
from cracha_crawler.status import stale_job_ids

APP_NAME = "cracha-crawler"
ANALYZE_TIMEOUT_SECONDS = 120
# Pages are handed to Cloudflare while the crawl is still running: AI Search
# needs seconds to minutes per page, and every second of that spent during the
# crawl is a second the user does not wait through afterwards.
INGEST_BATCH_SIZE = 25
MAX_PARALLEL_UPLOADS = 3
# A batch that only ever leaves when it is full never leaves at all on a small
# crawl: ten pages sat in the buffer until the crawl ended, which is the whole
# pipeline doing nothing for the most common job size. A partial batch goes out
# once its oldest page has waited this long, so a small crawl starts indexing
# while it is still fetching and a large one still fills its batches first.
INGEST_MAX_BUFFER_SECONDS = 5.0
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("curl")
    .pip_install(
        "crawl4ai==0.9.2",
        "defusedxml==0.7.1",
        "fastapi==0.141.1",
        "httpx==0.28.1",
        "pydantic==2.13.4",
    )
    .run_commands("crawl4ai-setup")
    .add_local_python_source("cracha_crawler")
)
app = modal.App(APP_NAME)
runtime_secret = modal.Secret.from_name("cracha-crawler-secrets-v2")
crawl_statuses = modal.Dict.from_name("cracha-crawl-status-v1", create_if_missing=True)


async def update_status(job_id: str, **changes) -> dict:
    current = await crawl_statuses.get.aio(job_id) or {}
    if "result" in changes:
        changes["result"] = {**(current.get("result") or {}), **changes["result"]}
    updated = {**current, **changes, "updated_at": datetime.now(UTC).isoformat()}
    await crawl_statuses.put.aio(job_id, updated)
    return updated


async def prune_crawl_statuses() -> int:
    """Drop status records nobody will read again.

    Opportunistic on purpose: a crawl that cannot tidy up is still a crawl that
    ran, so every failure here is logged and swallowed.
    """
    try:
        items = [entry async for entry in crawl_statuses.items.aio()]
        stale = stale_job_ids(items)
        for job_id in stale:
            await crawl_statuses.pop.aio(job_id, None)
    except Exception as error:
        print(f"[PRUNE] crawl status cleanup failed: {type(error).__name__}: {error}")
        return 0
    if stale:
        print(f"[PRUNE] removed {len(stale)} of {len(items)} crawl status records")
    return len(stale)


@app.function(
    image=image,
    secrets=[runtime_secret],
    timeout=1800,
    cpu=0.25,
    memory=512,
    scaledown_window=60,
)
async def finalize_index(
    job_id: str,
    database_id: str,
    user_id: str,
    active_keys: list[str],
    skipped_count: int,
) -> dict:
    ingest_client = RagIngestClient()
    submitted_count = len(active_keys)

    async def report_progress(progress: dict[str, object]) -> None:
        indexed = int(progress.get("current") or 0)
        total = int(progress.get("total") or len(active_keys))
        chunks = int(progress.get("chunks_count") or 0)
        await update_status(
            job_id,
            status="running",
            phase="indexing",
            progress=progress,
            result={
                "pages_count": len(active_keys),
                "chunks_count": chunks,
                "indexed_pages": indexed,
                "indexing_pending": max(0, total - indexed),
                "indexing_complete": False,
                "skipped_count": skipped_count + submitted_count - len(active_keys),
            },
        )

    try:
        status = await ingest_client.finalize(
            database_id,
            user_id,
            active_keys,
            attempts=250,
            on_progress=report_progress,
        )
        # Only an empty index is a failure. AI Search leaving a handful of items
        # in "running" is not: their chunks are searchable, and declaring the
        # crawl failed threw away a knowledge base that worked.
        if not status.complete and status.searchable_count < 1:
            raise TimeoutError("AI Search produced no searchable content")

        result = {
            "success": True,
            "pages_count": len(active_keys),
            "skipped_count": skipped_count + submitted_count - len(active_keys),
            "chunks_count": status.chunks_count,
            "indexed_pages": max(status.indexed_count, status.searchable_count),
            "indexing_pending": 0 if status.complete else status.pending_count,
            "indexing_complete": status.complete,
            "active_keys": active_keys,
        }
        await update_status(
            job_id,
            status="completed",
            phase="completed",
            call_id=None,
            finalizer_call_id=None,
            result=result,
            progress={
                "stage": "completed",
                "current": max(status.indexed_count, status.searchable_count),
                "total": len(active_keys),
                "percent": 100,
                "chunks_count": status.chunks_count,
            },
        )
        return result
    except Exception as error:
        try:
            await ingest_client.mark_failed(database_id, user_id, str(error))
        finally:
            await update_status(
                job_id,
                status="failed",
                phase="failed",
                call_id=None,
                finalizer_call_id=None,
                # This sentence is what the reader of the crawl monitor sees.
                # No service names, no infrastructure: what happened to their
                # knowledge base, and what to do next.
                error=(
                    "Deine Wissensbasis konnte nicht fertiggestellt werden. "
                    "Bitte versuche es erneut."
                ),
            )
        raise


@app.function(
    image=image,
    secrets=[runtime_secret],
    timeout=3600,
    cpu=2.0,
    memory=4096,
    scaledown_window=60,
    # Each crawl holds 2 CPUs and 4 GB for as long as it runs, and nothing
    # bounded how many could start at once. Ten at a time is far more than the
    # expected load, so no one waits in practice — it exists so that a burst
    # queues instead of turning into an unbounded number of containers.
    max_containers=10,
)
async def process_crawl(payload: dict, job_id: str) -> dict:
    request = CrawlRequest.model_validate(payload)
    ingest_client = RagIngestClient()
    # Here rather than in the endpoint: this function is already long-running,
    # so the cleanup costs the caller nothing.
    await prune_crawl_statuses()

    async def report_progress(progress: dict[str, object]) -> None:
        result = {}
        if "pages_count" in progress:
            result["pages_count"] = progress["pages_count"]
        if "skipped_count" in progress:
            result["skipped_count"] = progress["skipped_count"]
        if "chunks_count" in progress:
            result["chunks_count"] = progress["chunks_count"]
        if progress.get("stage") == "indexing":
            indexed = int(progress.get("current") or 0)
            total = int(progress.get("total") or 0)
            result.update(
                indexed_pages=indexed,
                indexing_pending=max(0, total - indexed),
                indexing_complete=False,
            )
        await update_status(job_id, progress=progress, result=result)

    # Crawled pages stream into upload batches instead of waiting for the crawl
    # to finish: by the time the last page is fetched, most of them are already
    # inside Cloudflare's indexing pipeline. The listing each batch returns
    # travels to the next one, so the dedupe scan runs once per job.
    buffer = PageBuffer(INGEST_BATCH_SIZE, INGEST_MAX_BUFFER_SECONDS)
    upload_tasks: list[asyncio.Task] = []
    known_items: dict[str, dict] | None = None
    upload_slots = asyncio.Semaphore(MAX_PARALLEL_UPLOADS)
    # The first batch is the one that scans the instance, and everything after
    # it reuses that listing. Letting three start at once would mean three
    # scans, so the rest wait for the first to hand its listing over.
    scanned = asyncio.Event()

    async def upload_batch(batch: list[Page], first: bool) -> list[str]:
        nonlocal known_items
        if not first:
            await scanned.wait()
        async with upload_slots:
            uploaded = await ingest_client.upload(
                request.tenant_id, request.user_id, batch, known_items
            )
        if uploaded.known_items is not None:
            known_items = uploaded.known_items
        scanned.set()
        return uploaded.active_keys

    def send(batch: list[Page]) -> None:
        if not batch:
            return
        first = not upload_tasks
        upload_tasks.append(asyncio.create_task(upload_batch(batch, first)))

    async def accept_page(page: Page) -> None:
        send(buffer.add(page, time.monotonic()) or [])

    async def flush_when_stale() -> None:
        # A crawl that slows down must not leave its last few pages waiting for
        # a batch that will never fill, so the clock releases them instead.
        while True:
            await asyncio.sleep(1)
            if buffer.due(time.monotonic()):
                send(buffer.drain())

    try:
        await update_status(
            job_id,
            status="running",
            phase="crawling",
            error=None,
            progress={
                "stage": "crawling",
                "current": 0,
                "total": 1 if request.type.value == "single" else request.limit,
                "percent": 0,
            },
        )
        stale_flusher = asyncio.create_task(flush_when_stale())
        try:
            pages, skipped = await crawl_pages(request, report_progress, accept_page)
        finally:
            stale_flusher.cancel()
        if not pages:
            raise RuntimeError("No indexable content was found.")

        send(buffer.drain())
        # Nothing may wait on a scan that will never happen: if the crawl ended
        # before a single batch went out, the gate has to open by itself.
        scanned.set()
        try:
            key_lists = await asyncio.gather(*upload_tasks)
        except BaseException:
            for task in upload_tasks:
                task.cancel()
            raise
        active_keys = list(dict.fromkeys(key for keys in key_lists for key in keys))
        # `pages` is what the last crawl pass returned; `active_keys` is
        # everything that reached Cloudflare, which after a mid-crawl fallback
        # can be the larger of the two. Only a genuine shortfall is a skip.
        skipped += max(0, len(pages) - len(active_keys))

        await update_status(
            job_id,
            status="running",
            phase="indexing",
            result={"pages_count": len(active_keys), "skipped_count": skipped},
            progress={
                "stage": "indexing",
                "current": 0,
                "total": len(active_keys),
                "percent": 0,
            },
        )
        index_status = await ingest_client.finalize(
            request.tenant_id,
            request.user_id,
            active_keys,
            attempts=INDEX_STATUS_ATTEMPTS,
            on_progress=report_progress,
        )
        result = {
            "success": True,
            "pages_count": len(active_keys),
            "skipped_count": skipped,
            "chunks_count": index_status.chunks_count,
            "indexed_pages": index_status.indexed_count,
            "indexing_pending": index_status.pending_count,
            "indexing_complete": index_status.complete,
            "active_keys": active_keys,
        }
        if not index_status.complete:
            finalizer = await finalize_index.spawn.aio(
                job_id,
                request.tenant_id,
                request.user_id,
                active_keys,
                skipped,
            )
            await update_status(
                job_id,
                status="running",
                phase="indexing",
                call_id=None,
                finalizer_call_id=finalizer.object_id,
                result=result,
                progress={
                    "stage": "indexing",
                    "current": index_status.indexed_count,
                    "total": len(active_keys),
                    "percent": round(
                        index_status.indexed_count / max(1, len(active_keys)) * 100
                    ),
                    "chunks_count": index_status.chunks_count,
                },
            )
        else:
            await update_status(
                job_id,
                status="completed",
                phase="completed",
                call_id=None,
                result=result,
                progress={
                    "stage": "completed",
                    "current": index_status.indexed_count,
                    "total": len(active_keys),
                    "percent": 100,
                    "chunks_count": index_status.chunks_count,
                },
            )
        return result
    except Exception as error:
        for task in upload_tasks:
            task.cancel()
        # A site that refused us is not a site with nothing to index, and the
        # reader cannot open a log to tell the two apart. When the crawler
        # knows which it was, that sentence is the error.
        message = (
            f"{error} Die Quelle lässt sich nicht automatisiert abrufen."
            if isinstance(error, CrawlBlockedError)
            else "Der Aufbau der Wissensbasis ist fehlgeschlagen. Bitte versuche es erneut."
        )
        try:
            await ingest_client.mark_failed(request.tenant_id, request.user_id, str(error))
        finally:
            await update_status(job_id, status="failed", phase="failed", error=message)
            raise


# 180s so a sitemap index spanning many files still fits; /analyze bounds its
# own work below, every other endpoint returns in well under a second.
@app.function(image=image, secrets=[runtime_secret], timeout=180)
@modal.concurrent(max_inputs=50)
@modal.asgi_app()
def api():
    from fastapi import Depends, FastAPI, HTTPException
    from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

    web = FastAPI(title="CraCha Crawler", version="1.0.0")
    bearer = HTTPBearer(auto_error=False)

    credentials_dependency = Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer),
    ]

    def authorize(credentials: credentials_dependency) -> None:
        expected = os.environ["CRAWLER_API_SECRET"]
        supplied = credentials.credentials if credentials else ""
        if not hmac.compare_digest(supplied, expected):
            raise HTTPException(status_code=401, detail="Unauthorized")

    @web.get("/health")
    async def health() -> dict:
        return {"status": "healthy", "service": APP_NAME}

    @web.post("/analyze", dependencies=[Depends(authorize)])
    async def analyze(request: AnalyzeRequest) -> SiteAnalysis:
        """Reads sitemaps only — no page is fetched and nothing is indexed."""
        try:
            async with asyncio.timeout(ANALYZE_TIMEOUT_SECONDS):
                return await analyze_site(str(request.url))
        except Exception as error:
            print(f"[ANALYZE] {request.url} failed: {type(error).__name__}: {error}")
            raise HTTPException(
                status_code=502, detail="Die Website konnte nicht analysiert werden."
            ) from error

    @web.post("/crawl", dependencies=[Depends(authorize)])
    async def start_crawl(request: CrawlRequest) -> dict:
        job_id = uuid.uuid4().hex
        await update_status(
            job_id,
            status="queued",
            phase="queued",
            result={"pages_count": 0, "chunks_count": 0, "skipped_count": 0},
            progress={"stage": "queued", "current": 0, "total": 0, "percent": 0},
        )
        call = await process_crawl.spawn.aio(request.model_dump(mode="json"), job_id)
        await update_status(job_id, call_id=call.object_id)
        return {"success": True, "job_id": job_id, "status": "queued", "phase": "queued"}

    @web.get("/status/{job_id}", dependencies=[Depends(authorize)])
    async def crawl_status(job_id: str):
        from fastapi.responses import JSONResponse

        status = await crawl_statuses.get.aio(job_id)
        if not status:
            raise HTTPException(status_code=404, detail="Crawl job not found")

        if status.get("status") in {"queued", "running"}:
            call_id = status.get("call_id")
            if call_id:
                call = modal.FunctionCall.from_id(call_id)
                try:
                    result = await call.get.aio(timeout=0)
                except TimeoutError:
                    return JSONResponse(
                        status_code=202,
                        content={"success": True, "job_id": job_id, **status},
                    )
                except Exception:
                    status = await update_status(
                        job_id,
                        status="failed",
                        phase="failed",
                        error=(
                            "Der Aufbau der Wissensbasis ist fehlgeschlagen. "
                            "Bitte versuche es erneut."
                        ),
                    )
                else:
                    latest = await crawl_statuses.get.aio(job_id) or status
                    if latest.get("status") not in {"queued", "running"}:
                        status = latest
                    elif result.get("indexing_complete") is False:
                        status = await update_status(
                            job_id,
                            status="running",
                            phase="indexing",
                            call_id=None,
                            result=result,
                        )
                        return JSONResponse(
                            status_code=202,
                            content={"success": True, "job_id": job_id, **status},
                        )
                    else:
                        status = await update_status(
                            job_id,
                            status="completed",
                            phase="completed",
                            call_id=None,
                            result=result,
                        )
            else:
                return JSONResponse(
                    status_code=202,
                    content={"success": True, "job_id": job_id, **status},
                )
        return {"success": status.get("status") == "completed", "job_id": job_id, **status}

    @web.post("/cancel/{job_id}", dependencies=[Depends(authorize)])
    async def cancel_crawl(job_id: str) -> dict:
        status = await crawl_statuses.get.aio(job_id)
        if not status:
            raise HTTPException(status_code=404, detail="Crawl job not found")
        if status.get("status") in {"completed", "failed"}:
            raise HTTPException(status_code=409, detail="Crawl job already finished")
        if status.get("status") == "cancelled":
            return {"success": True, "job_id": job_id, "status": "cancelled", "phase": "cancelled"}
        for call_id in {status.get("call_id"), status.get("finalizer_call_id")} - {None}:
            call = modal.FunctionCall.from_id(call_id)
            await call.cancel.aio()
        await update_status(job_id, status="cancelled", phase="cancelled", error=None)
        return {"success": True, "job_id": job_id, "status": "cancelled", "phase": "cancelled"}

    return web
