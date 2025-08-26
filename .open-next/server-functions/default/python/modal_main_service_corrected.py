#!/usr/bin/env python3
"""
Modal.com service that hosts the complete main.py
This preserves all Python dependencies and logic
"""

import modal
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import sys
import asyncio
from datetime import datetime

# Create Modal app
app = modal.App("cracha-main-service")

# Create image with ALL dependencies from pyproject.toml
image = (
    modal.Image.debian_slim()
    .pip_install([
        # Core dependencies from pyproject.toml
        "aiohttp>=3.8.0",
        "tenacity>=8.0.0", 
        "python-dotenv>=1.0.0",
        "pydantic>=2.0.0",
        "requests>=2.28.0",
        "asyncio-throttle>=1.0.0",
        "psutil>=5.9.0",
        "httpx>=0.24.0",
        "backoff>=2.2.0",
        "numpy>=1.21.0",
        
        # Additional dependencies for main.py
        "fastapi",
        "uvicorn",
        "typer",
        "rich",
        "openai",
        "google-generativeai",
        "cloudflare",
    ])
    .env({
        "PYTHONPATH": "/app"
    })
)

# Mount the entire ingestion directory
mount = modal.Mount.from_local_dir(".", remote_path="/app")

class MainPyRequest(BaseModel):
    command: str = "crawl"
    args: List[str]  # CLI arguments as list
    environment: Optional[Dict[str, str]] = None

class MainPyResponse(BaseModel):
    success: bool
    command: str
    result: Optional[Dict[str, Any]] = None
    output: Optional[str] = None
    error: Optional[str] = None
    duration_ms: Optional[int] = None

# Create FastAPI instance
web_app = FastAPI(title="CraCha Main.py Service", version="1.0.0")

@web_app.post("/execute", response_model=MainPyResponse)
async def execute_main_py(
    request: MainPyRequest,
    authorization: Optional[str] = Header(None)
):
    """Execute main.py with the given CLI arguments"""
    
    # Simple API key validation
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    start_time = datetime.utcnow()
    
    try:
        # Set environment variables from request
        if request.environment:
            for key, value in request.environment.items():
                os.environ[key] = value
        
        # Import main.py CLI class
        sys.path.append('/app')
        from main import CraChaIngestionCLI
        
        # Create CLI instance
        cli = CraChaIngestionCLI()
        
        # Parse arguments like CLI would
        import argparse
        from main import create_parser
        
        parser = create_parser()
        args = parser.parse_args([request.command] + request.args)
        
        # Execute the command
        if request.command == "crawl":
            result = await cli.crawl_and_ingest(args)
        elif request.command == "databases":
            result = await cli.list_databases(args)
        elif request.command == "database-info":
            result = await cli.get_database_info(args)
        elif request.command == "database-delete":
            result = await cli.delete_database(args)
        else:
            raise ValueError(f"Unknown command: {request.command}")
        
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        return MainPyResponse(
            success=result.get("success", True),
            command=request.command,
            result=result,
            output=f"Command '{request.command}' executed successfully",
            duration_ms=duration_ms
        )
            
    except Exception as e:
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        return MainPyResponse(
            success=False,
            command=request.command,
            error=str(e),
            duration_ms=duration_ms
        )

@web_app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "cracha-main-service",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": "modal.com"
    }

# Deploy the FastAPI app
@app.function(
    image=image,
    mounts=[mount],
    secrets=[
        modal.Secret.from_name("cracha-secrets")  # All environment variables
    ],
    timeout=1800,  # 30 minutes timeout for long crawls
    memory=4096,   # 4GB memory
    cpu=2.0,       # 2 CPU cores
)
@modal.web_endpoint(method="POST", path="/execute")
def execute_web_endpoint(request_data: dict):
    """Web endpoint for main.py execution"""
    import asyncio
    
    # Convert dict to Pydantic model
    main_request = MainPyRequest(**request_data)
    
    # Run the async function
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(execute_main_py(main_request))
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
    print("Starting CraCha Main.py Service locally...")
    print("Access at: http://localhost:8001")
    print("Docs at: http://localhost:8001/docs")
    uvicorn.run(web_app, host="0.0.0.0", port=8001)