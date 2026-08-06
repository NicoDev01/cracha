import asyncio
import hmac
import os
import uuid
from datetime import UTC, datetime
from typing import Annotated

import modal

from cracha_crawler.crawl import analyze_site, crawl_pages
from cracha_crawler.ingest import RagIngestClient
from cracha_crawler.models import AnalyzeRequest, CrawlRequest, SiteAnalysis

APP_NAME = "cracha-crawler"
ANALYZE_TIMEOUT_SECONDS = 120
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
                error=(
                    "Cloudflare konnte die Wissensbasis nicht vollständig indexieren. "
                    "Details stehen im Modal-Log."
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
)
async def process_crawl(payload: dict, job_id: str) -> dict:
    request = CrawlRequest.model_validate(payload)
    ingest_client = RagIngestClient()

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
            total = int(progress.get("total") or len(pages))
            result.update(
                indexed_pages=indexed,
                indexing_pending=max(0, total - indexed),
                indexing_complete=False,
            )
        await update_status(job_id, progress=progress, result=result)

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
        pages, skipped = await crawl_pages(request, report_progress)
        if not pages:
            raise RuntimeError("No indexable content was found.")

        await update_status(
            job_id,
            status="running",
            phase="indexing",
            result={"pages_count": len(pages), "skipped_count": skipped},
            progress={
                "stage": "indexing",
                "current": 0,
                "total": len(pages),
                "percent": 0,
            },
        )
        ingest_result = await ingest_client.ingest(
            request.tenant_id, request.user_id, pages, report_progress
        )
        skipped += len(pages) - len(ingest_result.active_keys)
        result = {
            "success": True,
            "pages_count": len(ingest_result.active_keys),
            "skipped_count": skipped,
            "chunks_count": ingest_result.chunks_count,
            "indexed_pages": ingest_result.indexed_count,
            "indexing_pending": ingest_result.pending_count,
            "indexing_complete": ingest_result.indexing_complete,
            "active_keys": ingest_result.active_keys,
        }
        if not ingest_result.indexing_complete:
            finalizer = await finalize_index.spawn.aio(
                job_id,
                request.tenant_id,
                request.user_id,
                ingest_result.active_keys,
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
                    "current": ingest_result.indexed_count,
                    "total": len(ingest_result.active_keys),
                    "percent": round(
                        ingest_result.indexed_count
                        / max(1, len(ingest_result.active_keys))
                        * 100
                    ),
                    "chunks_count": ingest_result.chunks_count,
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
                    "current": ingest_result.indexed_count,
                    "total": len(ingest_result.active_keys),
                    "percent": 100,
                    "chunks_count": ingest_result.chunks_count,
                },
            )
        return result
    except Exception as error:
        try:
            await ingest_client.mark_failed(request.tenant_id, request.user_id, str(error))
        finally:
            await update_status(
                job_id,
                status="failed",
                phase="failed",
                error="Crawl oder Indexierung ist fehlgeschlagen. Details stehen im Modal-Log.",
            )
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
                            "Crawl oder Indexierung ist fehlgeschlagen. "
                            "Details stehen im Modal-Log."
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
        for call_id in {status.get("call_id"), status.get("finalizer_call_id")} - {None}:
            call = modal.FunctionCall.from_id(call_id)
            await call.cancel.aio()
        await update_status(job_id, status="cancelled", phase="cancelled", error=None)
        return {"success": True, "job_id": job_id, "status": "cancelled", "phase": "cancelled"}

    return web
