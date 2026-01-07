"""
FastAPI application entry point for Wikipedia Pages 3D Cluster Visualization
"""

import logging

import uvicorn

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# API routes
from api import pages, clusters, search

# Injected service management
from services.service_setup import init_services, shutdown_services

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(pages.router, prefix="/api/pages", tags=["pages"])
app.include_router(clusters.router, prefix="/api/clusters", tags=["clusters"])
app.include_router(search.router, prefix="/api/search", tags=["search"])


@app.get("/")
async def root():
    """Root endpoint with API information"""
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


# Mount static files for production (if serving frontend from same server)
# app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
