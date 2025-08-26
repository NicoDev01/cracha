#!/usr/bin/env python3
"""
Modal.com FastAPI service that hosts main.py directly
This is the simplest and most reliable approach
"""

import modal
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import asyncio
from datetime import datetime

# Import your existing main.py CLI
from main import CraChaIngestionCLI

# Create Modal app
app = modal.App("cracha-main-api")

# Create image with all your existing dependencies
image = (
    modal.Image.debian_slim()
    .pip_install_from_pyproject("pyproject.toml")
    .env({"PYTHONPATH": "/app"})
)

# Mount the entire ingestion directory
mount = modal.Mount.from_local_dir(".", remote_path="/app")

class CrawlRequest(BaseModel):
    url: str
    tenant_id: str
    user_id: str
    type: str = "single"
    embedding_model: str = "gemini-768"
    max_depth: Optional[int] = None
    limit: Optional[int] = None
    include_patterns: Optional[List[str]] = None
    exclude_domains: Optional[List[str]] = None
    include_domains: Optional[List[str]] = None
    url_filter: Optional[str] = None
    exclude_external: bool = False
    generate_summaries: bool = True
    ultra_fast: bool = True
    max_concurrent: int = 5
    force: bool = True
    cleanup: bool = True
    exclude_social_media: bool = True

class CrawlResponse(BaseModel):
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    duration_ms: Optional[int] = None

# Create FastAPI instance
web_app = FastAPI(title="CraCha Main.py API", version="1.0.0")

@web_app.post("/crawl", response_model=CrawlResponse)
async def crawl_endpoint(request: CrawlRequest):
    """Execute main.py crawl command directly"""
    
    start_time = datetime.utcnow()
    
    try:
        # Create CLI instance (your existing code)
        cli = CraChaIngestionCLI()
        
        # Create args object that matches your CLI structure
        class Args:
            def __init__(self, **kwargs):
                for key, value in kwargs.items():
                    setattr(self, key, value)
        
        # Map request to CLI args (matching main.py interface)
        args = Args(
            # Core parameters
            url=request.url,
            tenant_id=request.tenant_id,
            user_id=request.user_id,
            type=request.type,
            embedding_model=request.embedding_model,
            
            # Crawl parameters
            max_depth=request.max_depth or 3,
            limit=request.limit or 100,
            max_concurrent=request.max_concurrent,
            
            # URL filtering
            include_patterns=request.include_patterns or [],
            exclude_domains=request.exclude_domains or [],
            include_domains=request.include_domains or [],
            url_filter=request.url_filter or '',
            exclude_external=request.exclude_external,
            exclude_social_media=request.exclude_social_media,
            
            # Processing options
            generate_summaries=request.generate_summaries,
            ultra_fast=request.ultra_fast,
            force=request.force,
            cleanup=request.cleanup,
            
            # Additional CLI parameters
            urls_file=None,  # Not used in API mode
            dry_run=False
        )
        
        # Execute your existing crawl_and_ingest method
        result = await cli.crawl_and_ingest(args)
        
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        return CrawlResponse(
            success=result.get("success", False),
            result=result,
            duration_ms=duration_ms
        )
        
    except Exception as e:
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        return CrawlResponse(
            success=False,
            error=str(e),
            duration_ms=duration_ms
        )

@web_app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "cracha-main-api",
        "timestamp": datetime.utcnow().isoformat()
    }

# Deploy the FastAPI app
@app.function(
    image=image,
    mounts=[mount],
    secrets=[
        modal.Secret.from_name("cracha-secrets")  # Your existing secrets
    ],
    timeout=1800,  # 30 minutes
    memory=4096,   # 4GB
    cpu=2.0,       # 2 CPU cores
)
@modal.web_endpoint(method="POST", path="/crawl")
def crawl_web_endpoint(request_data: dict):
    """Web endpoint for crawl requests"""
    
    # Convert dict to Pydantic model
    crawl_request = CrawlRequest(**request_data)
    
    # Run the async function
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(crawl_endpoint(crawl_request))
        return result.dict()
    finally:
        loop.close()

@app.function(image=image, mounts=[mount])
@modal.web_endpoint(method="GET", path="/health")
def health_web_endpoint():
    """Health check web endpoint"""
    import asyncio
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(health_check())
        return result
    finally:
        loop.close()

if __name__ == "__main__":
    # For local development
    import uvicorn
    print("Starting CraCha Main.py API locally...")
    print("Access at: http://localhost:8000")
    uvicorn.run(web_app, host="0.0.0.0", port=8000)