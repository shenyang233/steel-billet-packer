"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

app = FastAPI(
    title="钢坯堆积优化系统",
    description="Steel Billet Container Packing Optimizer - 自动生成最优钢坯堆积方案",
    version="1.0.0",
)

# CORS configuration - allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root redirect to API docs."""
    return {
        "message": "钢坯堆积优化系统 API",
        "docs": "/docs",
        "api_prefix": "/api/v1",
    }
