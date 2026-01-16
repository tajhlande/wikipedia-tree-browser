# Ancestor Spacing Problem Statement and Requirements

OK. I have a hard problem to solve. In the 3D node view, I am showing portions of a tree-like structure of nodes (each representing a cluster in the data with a centroid), going back to a root node. The default view is the root node and its direct children.  If a child is selected, then the view changes such that the child node is the current node, and its children are shown, but we continue showing the parent node, and all parents back to the root, plus the children of each parent.  Moreover, the raw cluster data only has centroids from the origin (0,0,0), but when showing the nodes for that cluster, we translate them along the cluster centroid so that the node's children appear to treat the cluster centroid as the origin.  The result is a set of bushy spherical collections of nodes that somewhat overlap.  I would like to space out the clusters such that when viewing a non-root node, the link to the parent node is 3x longer than usual.  There is code in @/../frontend/src/babylon/clusterManager.ts in calculateRelativePosition() starting at line 121 that computes the positioning for a node. I think that function doesn't have enough infromation in it to do this, because whether a node should be spaced out or not depends on whether it is a current node or a parent (or ancestor) of a current node.
All links on the path from the current node to the root node should be 3x longer.  so the current node to its parent, the parent to its parent, and so on, until the root is reached.
The current node and the ancestor chain are already tracked. The current node is in `dataStore.currentNode`, and the ancestor chain is in `clusterManager.getVisibleClusters()`. We do not need new code for that.
Plan out and propose a way to update this function such that the spacing I desire can be achieved.
Write this plan out to ANCESTOR_SPACING_IMPLEMENTATION_PLAN.md



## Critique of the Claude plan

Strong requirement coverage and defensive design by introducing a dedicated ancestor chain set plus integration in scene.ts. Highlights optional visual/camera adjustments and cleanup hooks, minimizing stale state. However, it adds extra data plumbing and storage even though clusterManager.getVisibleClusters() already supplies ancestor IDs, so the approach is heavier than necessary.

**Additional requirement:**
Remove the extra data plumbing and storage, and pay close attention to where costly functions