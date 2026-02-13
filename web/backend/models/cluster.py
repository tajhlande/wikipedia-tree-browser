"""
Pydantic models for cluster-related API responses
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class ClusterNodeResponse(BaseModel):
    """Response model for cluster node information"""

    node_id: int = Field(..., description="Unique cluster node identifier")
    namespace: str = Field(..., description="Wikipedia namespace")
    parent_id: Optional[int] = Field(None, description="Parent node ID")
    depth: int = Field(..., description="Depth in the cluster tree")
    doc_count: int = Field(..., description="Number of documents in this cluster")
    child_count: int = Field(..., description="Number of child nodes")
    final_label: Optional[str] = Field(None, description="Final topic label")
    centroid_3d: Optional[List[float]] = Field(
        None, description="3D centroid coordinates"
    )


class ClusterSearchResult(BaseModel):
    """Response model for cluster search results"""

    clusters: List[ClusterNodeResponse] = Field(
        ..., description="List of matching clusters"
    )
    total_count: int = Field(..., description="Total number of matching clusters")
    query: str = Field(..., description="Search query used")
