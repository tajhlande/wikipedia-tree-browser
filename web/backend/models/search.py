"""
Pydantic models for search-related API responses
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal


class SearchResultResponse(BaseModel):
    """Response model for a single search result"""

    node_id: int = Field(..., description="Cluster node identifier")
    node_label: str = Field(..., description="Cluster node label")
    match_type: Literal["node_label", "page_titles"] = Field(
        ..., description="Type of match: node label or page titles"
    )
    depth: int = Field(..., description="Depth in the cluster tree")
    parent_id: Optional[int] = Field(None, description="Parent node ID")


class SearchNodeResponse(BaseModel):
    """Response model for search nodes endpoint"""

    results: list[SearchResultResponse] = Field(
        ..., description="List of search results"
    )
