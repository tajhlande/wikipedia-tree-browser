"""
FastAPI application entry point for Wikipedia Pages 3D Cluster Visualization
"""

import logging

import uvicorn

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# API routes
from api import pages, clusters, search

# Injected service management
from services.service_setup import init_services, shutdown_services

# Environment configuration
from util.environment import Config

# logging setup
logging.basicConfig(
    level=logging.DEBUG, format="%(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # initialize services
    init_services()
    yield
    # shutdown services
    shutdown_services()


# Create FastAPI application
app = FastAPI(
    title="Wikipedia Cluster Visualization API",
    description="API for 3D cluster visualization of Wikipedia pages",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for frontend communication
cors_origins = Config.cors.get_origins()
cors_credentials = Config.cors.allow_credentials()

# Validation: Cannot use credentials with wildcard origins
if "*" in cors_origins and cors_credentials:
    logger.warning(
        "CORS configuration error: allow_credentials cannot be True when using wildcard origins. "
        "Setting allow_credentials to False."
    )
    cors_credentials = False

logger.info(f"CORS enabled for origins: {cors_origins}")
logger.info(f"CORS credentials allowed: {cors_credentials}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_credentials,
    allow_methods=Config.cors.get_methods(),
    allow_headers=Config.cors.get_headers(),
)

# Frontend dist directory
# __file__ is web/backend/app/main.py, go up 4 levels to project root
frontend_dist = Path(__file__).parent.parent.parent.parent / "web" / "frontend" / "dist"

# Mount the SPA frontend at /app
if frontend_dist.exists():
    # Mount assets directory separately (index.html references /assets/...)
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")
    # Mount the rest of the app at /app
    app.mount("/app", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")


@app.get("/")
async def root():
    """Root endpoint - redirects to the web app if it has been built"""
    if frontend_dist.exists():
        return RedirectResponse("/app")
    return {
        "message": "Wikipedia Embeddings API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "pages": "/api/pages",
            "clusters": "/api/clusters",
            "search": "/api/search",
        },
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# Include API routers
app.include_router(pages.router, prefix="/api/pages", tags=["pages"])
app.include_router(clusters.router, prefix="/api/clusters", tags=["clusters"])
app.include_router(search.router, prefix="/api/search", tags=["search"])

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
