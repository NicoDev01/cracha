"""Runs ssrf_acceptance.py inside the production crawler image on Modal.

Locally the check proves little: home routers often drop DNS answers that point
at private addresses (rebind protection), so the rebinding domain never
resolves to 127.0.0.1 and the test passes for the wrong reason. On Modal the
answers arrive unfiltered, as they would for a real crawl.

    cd services/crawler
    ../../venv/Scripts/python.exe -m modal run acceptance/modal_ssrf_acceptance.py
"""

import subprocess
from pathlib import Path

import modal

# Same image as modal_app.py, plus the acceptance script.
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
    .add_local_file(Path(__file__).with_name("ssrf_acceptance.py"), "/root/ssrf_acceptance.py")
)
app = modal.App("cracha-ssrf-acceptance", image=image)


@app.function(timeout=600, retries=0)
def run() -> str:
    done = subprocess.run(
        ["python", "/root/ssrf_acceptance.py"], capture_output=True, text=True, cwd="/root"
    )
    return done.stdout + done.stderr[-3000:]


@app.local_entrypoint()
def main() -> None:
    print(run.remote())
