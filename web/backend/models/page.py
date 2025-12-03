"""
Pydantic models for page-related API responses
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class PageResponse(BaseModel):
    """Response model for page information"""
    page_id: int = Field(..., description="Unique page identifier")
    title: str = Field(..., description="Page title")
    abstract: Optional[str] = Field(None, description="Page abstract")
    url: Optional[str] = Field(None, description="Page URL")
    cluster_node_id: Optional[int] = Field(None, description="Associated cluster node ID")


class PageDetailResponse(BaseModel):
    """Response model for detailed page information"""
    page_id: int = Field(..., description="Unique page identifier")
    title: str = Field(..., description="Page title")
    abstract: Optional[str] = Field(None, description="Page abstract")
    url: Optional[str] = Field(None, description="Page URL")
    cluster_node_id: Optional[int] = Field(None, description="Associated cluster node ID")
    three_d_vector: Optional[List[float]] = Field(None, description="3D coordinates")


class PageSearchResult(BaseModel):
    """Response model for page search results"""
    pages: List[PageResponse] = Field(..., description="List of matching pages")
    total_count: int = Field(..., description="Total number of matching pages")
    query: str = Field(..., description="Search query used")
    search_type: str = Field(..., description="Type of search performed")
