import hmac
import os
from typing import Annotated

import modal

from cracha_crawler.crawl import crawl_pages
from cracha_crawler.ingest import RagIngestClient
from cracha_crawler.models import CrawlRequest

APP_NAME = "cracha-crawler"
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
    .run_commands("playwright install --with-deps chromium")
    .add_local_python_source("cracha_crawler")
)
app = modal.App(APP_NAME)
runtime_secret = modal.Secret.from_name("cracha-crawler-secrets-v2")


@app.function(
    image=image,
    secrets=[runtime_secret],
    timeout=3600,
    cpu=2.0,
    memory=4096,
    scaledown_window=2,
)
async def process_crawl(payload: dict) -> dict:
    request = CrawlRequest.model_validate(payload)
    ingest_client = RagIngestClient()
    try:
        pages, skipped = await crawl_pages(request)
        if not pages:
            raise RuntimeError("No indexable content was found.")

        active_keys = await ingest_client.ingest(request.tenant_id, request.user_id, pages)
        return {
            "success": True,
            "pages_count": len(pages),
            "skipped_count": skipped,
            "active_keys": active_keys,
        }
    except Exception as error:
        try:
            await ingest_client.mark_failed(request.tenant_id, request.user_id, str(error))
        finally:
            raise


@app.function(image=image, secrets=[runtime_secret], timeout=60)
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

    @web.post("/crawl", dependencies=[Depends(authorize)])
    async def start_crawl(request: CrawlRequest) -> dict:
        call = await process_crawl.spawn.aio(request.model_dump(mode="json"))
        return {"success": True, "job_id": call.object_id, "status": "queued"}

    @web.get("/status/{job_id}", dependencies=[Depends(authorize)])
    async def crawl_status(job_id: str):
        from fastapi.responses import JSONResponse

        call = modal.FunctionCall.from_id(job_id)
        try:
            result = await call.get.aio(timeout=0)
        except TimeoutError:
            return JSONResponse(
                status_code=202,
                content={"success": True, "job_id": job_id, "status": "running"},
            )
        except Exception:
            return JSONResponse(
                status_code=200,
                content={
                    "success": False,
                    "job_id": job_id,
                    "status": "failed",
                    "error": "Crawl or indexing failed. Check the Modal logs.",
                },
            )
        return {"success": True, "job_id": job_id, "status": "completed", "result": result}

    @web.post("/cancel/{job_id}", dependencies=[Depends(authorize)])
    async def cancel_crawl(job_id: str) -> dict:
        call = modal.FunctionCall.from_id(job_id)
        await call.cancel.aio()
        return {"success": True, "job_id": job_id, "status": "cancelled"}

    return web
