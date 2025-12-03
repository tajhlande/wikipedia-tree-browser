"""
Search functionality API endpoints for Wikipedia Embeddings
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List
from models.page import PageResponse
from services.database_service import DatabaseService

router = APIRouter()
db_service = DatabaseService()


@router.get("/pages", response_model=List[PageResponse])
async def search_pages(
    namespace: str = Query(..., description="Wikipedia namespace"),
    query: str = Query(..., description="Search query"),
    search_type: str = Query("title", description="Type of search: title, abstract, or both"),
    limit: int = Query(20, description="Maximum number of results"),
    offset: int = Query(0, description="Offset for pagination")
):
    """Search for pages by title, abstract, or both"""
    try:
        pages = db_service.search_pages(namespace, query, search_type, limit, offset)
        return [PageResponse.from_db_page(page) for page in pages]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching pages: {str(e)}")


@router.get("/clusters")
async def search_clusters(
    namespace: str = Query(..., description="Wikipedia namespace"),
    query: str = Query(..., description="Search query for cluster labels"),
    limit: int = Query(10, description="Maximum number of results")
):
    """Search for clusters by their labels"""
    try:
        clusters = db_service.search_clusters(namespace, query, limit)
        return clusters
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching clusters: {str(e)}")


@router.get("/namespaces")
async def get_available_namespaces():
    """Get list of available namespaces"""
    try:
        namespaces = db_service.get_available_namespaces()
        return {"namespaces": namespaces}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving namespaces: {str(e)}")


@router.get("/suggestions")
async def get_search_suggestions(
    namespace: str = Query(..., description="Wikipedia namespace"),
    partial_query: str = Query(..., description="Partial query for autocomplete"),
    limit: int = Query(5, description="Maximum number of suggestions")
):
    """Get search suggestions based on partial query"""
    try:
        suggestions = db_service.get_search_suggestions(namespace, partial_query, limit)
        return {"suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting suggestions: {str(e)}")
