#!/usr/bin/env python3
"""
Simple FastAPI server for CraCha ingestion
Run this optionally to provide HTTP API for crawling
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import subprocess
import sys
import os
import json
import uuid
from datetime import datetime

app = FastAPI(title="CraCha Ingestion API", version="1.0.0")

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
    job_id: Optional[str] = None

@app.post("/crawl")
async def crawl_endpoint(request: CrawlRequest):
    """Execute crawl using main.py"""
    
    job_id = request.job_id or str(uuid.uuid4())
    
    try:
        # Build command arguments
        args = [
            sys.executable, "main.py", "crawl",
            "--url", request.url,
            "--tenant-id", request.tenant_id,
            "--user-id", request.user_id,
            "--type", request.type,
            "--embedding-model", request.embedding_model
        ]
        
        # Add optional parameters
        if request.max_depth:
            args.extend(["--max-depth", str(request.max_depth)])
        if request.limit:
            args.extend(["--limit", str(request.limit)])
        if request.max_concurrent:
            args.extend(["--max-concurrent", str(request.max_concurrent)])
            
        # Add boolean flags
        if request.force:
            args.append("--force")
        if request.cleanup:
            args.append("--cleanup")
        if request.generate_summaries:
            args.append("--generate-summaries")
        if request.ultra_fast:
            args.append("--ultra-fast")
        if request.exclude_external:
            args.append("--exclude-external")
        if request.exclude_social_media:
            args.append("--exclude-social-media")
            
        # Add array parameters
        if request.include_patterns:
            args.extend(["--include-patterns"] + request.include_patterns)
        if request.exclude_domains:
            args.extend(["--exclude-domains"] + request.exclude_domains)
        if request.include_domains:
            args.extend(["--include-domains"] + request.include_domains)
        if request.url_filter:
            args.extend(["--url-filter", request.url_filter])
        
        print(f"Executing: {' '.join(args)}")
        
        # Use WSL to execute the command with proper Python environment
        current_dir = os.path.dirname(os.path.abspath(__file__))
        wsl_path = current_dir.replace('\\', '/').replace('C:', '/mnt/c')
        
        # Build WSL command with conda activation
        wsl_command = f"cd {wsl_path} && source ~/.bashrc && conda activate cracha && python {' '.join(args[1:])}"  # Skip 'python' from args
        
        print(f"Executing WSL command: wsl -e bash -c \"{wsl_command}\"")
        
        result = subprocess.run(
            ['wsl', '-e', 'bash', '-c', wsl_command],
            capture_output=True,
            text=True,
            timeout=600,  # 10 minutes
        )
        
        if result.returncode == 0:
            return {
                "success": True,
                "job_id": job_id,
                "message": "Crawl completed successfully",
                "output": result.stdout,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(
                status_code=500,
                detail={
                    "success": False,
                    "job_id": job_id,
                    "error": f"Command failed with code {result.returncode}",
                    "stdout": result.stdout,
                    "stderr": result.stderr
                }
            )
            
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=408,
            detail={
                "success": False,
                "job_id": job_id,
                "error": "Crawl timeout after 10 minutes"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "job_id": job_id,
                "error": str(e)
            }
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "cracha-ingestion-api",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "CraCha Ingestion API",
        "version": "1.0.0",
        "endpoints": {
            "crawl": "POST /crawl",
            "health": "GET /health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting CraCha Ingestion API server...")
    print("Access at: http://localhost:8000")
    print("Docs at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)