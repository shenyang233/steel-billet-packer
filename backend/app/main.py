"""
Production entry point for the steel billet packing API.

Serves the built frontend from ../frontend/dist alongside the API.
Uses absolute paths for deployment reliability.
"""
import os
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router

# Determine frontend dist path (adjacent to backend directory)
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent
FRONTEND_DIST = os.environ.get("FRONTEND_DIST", str(PROJECT_DIR / "frontend" / "dist"))

app = FastAPI(
    title="钢坯堆积优化系统",
    description="Steel Billet Container Packing Optimizer — 自动生成最优钢坯堆积方案",
    version="1.0.0",
)

# CORS — allow all origins in production (adjust for security)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root redirect to API docs or SPA."""
    return {
        "message": "钢坯堆积优化系统 API",
        "docs": "/docs",
        "api_prefix": "/api/v1",
    }


# Serve frontend static files if dist directory exists
dist_path = Path(FRONTEND_DIST)
if dist_path.exists():
    from fastapi.responses import FileResponse

    # Mount static assets
    assets_dir = dist_path / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # Mount public files (favicon, etc.)
    for pub_file in dist_path.glob("*"):
        if pub_file.is_file():
            pass  # Served via catch-all below

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve SPA — return index.html for all non-API, non-asset routes."""
        file_path = dist_path / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        # Fall back to index.html for SPA routing
        index_path = dist_path / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))
        return {"error": "Frontend not found", "path": full_path}
