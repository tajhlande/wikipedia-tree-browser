"""
Page-related API endpoints for Wikipedia Embeddings
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import Annotated, List
from web.backend.models.page import PageResponse, PageDetailResponse
from web.backend.services.cluster_service import ClusterService
from web.backend.services.service_setup import get_cluster_service

router = APIRouter()

logger = logging.getLogger(__name__)


@router.get("/namespace/{namespace}/node_id/{node_id}", response_model=List[PageResponse])
async def get_pages_in_cluster(
    namespace: Annotated[str, Path(title="Wikipedia namespace")],
    node_id: Annotated[int, Path(title="Cluster node ID")],
    limit: Annotated[int, Query(description="Maximum number of pages to return")] = 50,
    offset: Annotated[int, Query(description="Offset for pagination")] = 0,
    cluster_service: ClusterService = Depends(get_cluster_service),  # lambda: service_provider("cluster_service")
):
    """Get pages in a specific cluster node"""
    try:
        return cluster_service.get_pages_in_cluster(namespace, node_id, limit, offset)
    except Exception as e:
        logger.exception("Unable to get pages for cluster")
        raise HTTPException(status_code=500, detail=f"Error retrieving pages: {str(e)}")


@router.get("/namespace/{namespace}/page_id/{page_id}", response_model=PageDetailResponse)
async def get_page_details(
    namespace: Annotated[str, Path(title="Wikipedia namespace")],
    page_id: Annotated[int, Path(title="Page ID")],
    cluster_service: ClusterService = Depends(get_cluster_service),
):
    """Get detailed information about a specific page"""
    try:
        page = cluster_service.get_page_by_id(namespace, page_id)
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")
        return page
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unable to get pages for cluster")
        raise HTTPException(status_code=500, detail=f"Error retrieving page details: {str(e)}")


# @router.get("/search/by-title")
# async def search_pages_by_title(
#     namespace: str = Query(..., description="Wikipedia namespace"),
#     title: str = Query(..., description="Page title to search for"),
#     limit: int = Query(10, description="Maximum number of results")
# ):
#     """Search for pages by title"""
#     try:
#         pages = db_service.search_pages_by_title(namespace, title, limit)
#         return [PageResponse.from_db_page(page) for page in pages]
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error searching pages: {str(e)}")
