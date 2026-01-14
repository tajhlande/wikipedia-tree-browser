# Node and Link Storage Rearchitecture Plan

## Current Implementation Analysis

### Current Architecture
The current implementation uses:

1. **NodeManager**: Manages node creation, positioning, and cleanup
   - Uses `Map<number, Mesh>` to store nodes by ID
   - Handles materials, billboards, and positioning logic
   - Supports ancestor vs. regular node rendering with different visual properties

2. **LinkManager**: Manages link creation and cleanup  
   - Uses `Map<string, Mesh>` to store links by "parentId_childId" key
   - Handles link positioning and rotation
   - Supports extended links for ancestor visualization

3. **Scene Management**: Centralized in `scene.ts`
   - Handles view transitions and data loading
   - Manages camera positioning and animations
   - Coordinates between node and link managers

### Current Issues

1. **Complex Rendering Logic**: Nodes have different sizes, opacities, and billboard behavior based on whether they're "ancestor" nodes or "current" nodes

2. **Positioning Complexity**: Relative positioning logic for non-root nodes adds significant complexity

3. **Performance Concerns**: Frequent mesh creation/destruction during view transitions

4. **State Management**: Visual state (ancestor vs. regular) is mixed with data state

5. **Limited Grouping**: No built-in way to associate nodes/links with clusters

## BabylonJS Capabilities Research

### Available Grouping/Tagging Features

1. **TransformNode Hierarchy**: BabylonJS supports parent-child relationships via `setParent()`
   - Already used for nodeContainer and linkContainer
   - Can be extended for cluster grouping

2. **Metadata/userData**: Each mesh can store custom data
   - `mesh.metadata = { clusterId: 123, nodeType: 'regular' }`
   - `mesh.userData = { isAncestor: false }`

3. **Tags**: BabylonJS has a tagging system
   - `mesh.tags.add('cluster_123')`
   - `scene.getMeshesByTags('cluster_123')`

4. **Layers**: Can assign meshes to different rendering layers
   - Useful for showing/hiding groups

### Recommended Approach

**Use TransformNode containers for clusters** + **metadata for node classification**:
- Create TransformNode containers for each cluster
- Store cluster-specific data in metadata
- Use tags for quick lookup when needed
- Maintain external collections for efficient management

## Rearchitecture Plan

### Phase 1: Cluster-Based Storage Architecture

#### Understanding Node Cluster Membership

**Key Insight**: In the hierarchical cluster structure, each node belongs to exactly ONE cluster - the cluster it represents. However, a node can appear in MULTIPLE VIEWS:

1. **As the current node** (center of the view)
2. **As a child node** (in its parent's view)
3. **As a parent node** (in its child's view)  
4. **As an ancestor node** (in descendant views)

**Important Distinction**:
- **Cluster Membership**: A node belongs to exactly one cluster (itself)
- **View Participation**: A node can participate in multiple views (as parent, child, ancestor, etc.)

#### 1. Cluster Container System

```typescript
// New ClusterManager class
class ClusterManager {
  private scene: Scene;
  private clusterContainers: Map<number, TransformNode> = new Map();
  private clusterMetadata: Map<number, ClusterMetadata> = new Map();
  
  // Track which clusters are currently visible
  private visibleClusters: Set<number> = new Set();
  
  constructor(scene: Scene) {
    this.scene = scene;
  }
  
  createClusterContainer(clusterId: number, metadata: ClusterMetadata): TransformNode {
    const container = new TransformNode(`cluster_${clusterId}`, this.scene);
    this.clusterContainers.set(clusterId, container);
    this.clusterMetadata.set(clusterId, metadata);
    return container;
  }
  
  getClusterContainer(clusterId: number): TransformNode | undefined {
    return this.clusterContainers.get(clusterId);
  }
  
  removeCluster(clusterId: number): void {
    const container = this.clusterContainers.get(clusterId);
    if (container) {
      container.dispose();
      this.clusterContainers.delete(clusterId);
      this.clusterMetadata.delete(clusterId);
      this.visibleClusters.delete(clusterId);
    }
  }
  
  showCluster(clusterId: number): void {
    const container = this.clusterContainers.get(clusterId);
    if (container) {
      container.setEnabled(true);
      this.visibleClusters.add(clusterId);
    }
  }
  
  hideCluster(clusterId: number): void {
    const container = this.clusterContainers.get(clusterId);
    if (container) {
      container.setEnabled(false);
      this.visibleClusters.delete(clusterId);
    }
  }
  
  isClusterVisible(clusterId: number): boolean {
    return this.visibleClusters.has(clusterId);
  }
  
  getAllClusters(): Map<number, TransformNode> {
    return this.clusterContainers;
  }
  
  getVisibleClusters(): Set<number> {
    return new Set(this.visibleClusters);
  }
}
```

#### 2. Enhanced Node Storage with Multi-View Support

```typescript
// Enhanced NodeManager with multi-view support
class NodeManager {
  // ... existing properties ...
  
  // Track node participation in different views
  private nodeViewParticipation: Map<number, Set<string>> = new Map(); // nodeId -> Set<viewIds>
  private viewNodeMap: Map<string, Set<number>> = new Map(); // viewId -> Set<nodeIds>
  
  // Track which view each node instance belongs to
  private nodeViewInstances: Map<string, Mesh> = new Map(); // "nodeId_viewId" -> Mesh
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.nodeContainer = new TransformNode("nodeContainer", scene);
  }
  
  /**
   * Create or get a node instance for a specific view
   * Each node can have multiple instances (one per view it participates in)
   */
  public createNodeForView(node: ClusterNode, viewId: string, clusterId: number | null = null): Mesh {
    const instanceKey = `${node.id}_${viewId}`;
    
    // Check if this node instance already exists for this view
    const existingInstance = this.nodeViewInstances.get(instanceKey);
    if (existingInstance) {
      return existingInstance;
    }
    
    // Create new node mesh
    const nodeMesh = this.createNodeMesh(node);
    
    // Track view participation
    if (!this.nodeViewParticipation.has(node.id)) {
      this.nodeViewParticipation.set(node.id, new Set());
    }
    this.nodeViewParticipation.get(node.id)?.add(viewId);
    
    if (!this.viewNodeMap.has(viewId)) {
      this.viewNodeMap.set(viewId, new Set());
    }
    this.viewNodeMap.get(viewId)?.add(node.id);
    
    // Associate with cluster if provided
    if (clusterId !== null) {
      this.nodeClusterMap.set(node.id, clusterId);
      
      if (!this.clusterNodeMap.has(clusterId)) {
        this.clusterNodeMap.set(clusterId, new Set());
      }
      this.clusterNodeMap.get(clusterId)?.add(node.id);
      
      // Parent to cluster container if it exists
      const clusterContainer = clusterManager.getClusterContainer(clusterId);
      if (clusterContainer) {
        nodeMesh.setParent(clusterContainer);
      }
    }
    
    // Store the instance
    this.nodeViewInstances.set(instanceKey, nodeMesh);
    this.nodeMeshes.set(node.id, nodeMesh); // Keep reference to latest instance
    
    return nodeMesh;
  }
  
  /**
   * Get all instances of a node across all views
   */
  public getNodeInstances(nodeId: number): Mesh[] {
    const instances: Mesh[] = [];
    
    this.nodeViewInstances.forEach((mesh, key) => {
      if (key.startsWith(`${nodeId}_`)) {
        instances.push(mesh);
      }
    });
    
    return instances;
  }
  
  /**
   * Remove a node instance from a specific view
   */
  public removeNodeFromView(nodeId: number, viewId: string): void {
    const instanceKey = `${nodeId}_${viewId}`;
    const instance = this.nodeViewInstances.get(instanceKey);
    
    if (instance) {
      instance.dispose();
      this.nodeViewInstances.delete(instanceKey);
      
      // Update participation tracking
      this.nodeViewParticipation.get(nodeId)?.delete(viewId);
      this.viewNodeMap.get(viewId)?.delete(nodeId);
      
      // If this was the last instance, clean up
      if (!this.nodeViewParticipation.get(nodeId)?.size) {
        this.nodeViewParticipation.delete(nodeId);
        this.nodeMeshes.delete(nodeId);
      }
    }
  }
  
  /**
   * Remove all instances of a node from all views
   */
  public removeNodeCompletely(nodeId: number): void {
    // Get all instances of this node
    const instances = this.getNodeInstances(nodeId);
    
    // Remove each instance
    instances.forEach(instance => {
      instance.dispose();
    });
    
    // Clean up tracking
    const viewIds = this.nodeViewParticipation.get(nodeId);
    if (viewIds) {
      viewIds.forEach(viewId => {
        this.viewNodeMap.get(viewId)?.delete(nodeId);
        this.nodeViewInstances.delete(`${nodeId}_${viewId}`);
      });
      this.nodeViewParticipation.delete(nodeId);
    }
    
    this.nodeMeshes.delete(nodeId);
    this.nodeClusterMap.delete(nodeId);
  }
  
  /**
   * Remove all nodes from a specific view
   */
  public clearView(viewId: string): void {
    const nodeIds = this.viewNodeMap.get(viewId);
    
    if (nodeIds) {
      nodeIds.forEach(nodeId => {
        this.removeNodeFromView(nodeId, viewId);
      });
      this.viewNodeMap.delete(viewId);
    }
  }
}
```

#### 3. View-Based Scene Management

```typescript
// ViewManager to handle different scene views
class ViewManager {
  private currentViewId: string | null = null;
  private viewHistory: string[] = [];
  
  constructor() {}
  
  createViewId(clusterId: number, viewType: 'regular' | 'ancestor' = 'regular'): string {
    return `${viewType}_${clusterId}_${Date.now()}`;
  }
  
  setCurrentView(viewId: string): void {
    if (this.currentViewId) {
      this.viewHistory.push(this.currentViewId);
    }
    this.currentViewId = viewId;
  }
  
  getCurrentViewId(): string | null {
    return this.currentViewId;
  }
  
  goBack(): string | null {
    if (this.viewHistory.length > 0) {
      const previousView = this.viewHistory.pop();
      if (previousView) {
        this.currentViewId = previousView;
        return previousView;
      }
    }
    return null;
  }
  
  clearHistory(): void {
    this.viewHistory = [];
  }
}
```

### Phase 2: Multi-View Rendering Strategy

#### 1. Node Participation Rules

**When a node should be visible in a view**:

1. **Current Node View**: Show the node itself + its immediate children + its parent
2. **Ancestor View**: Show the node itself + its immediate children + its parent + ancestors + ancestor children

**Node Role Determination**:

```typescript
// Determine a node's role in a specific view
function getNodeRoleInView(nodeId: number, viewId: string): NodeRole {
  // Parse view context from viewId or view metadata
  const viewContext = getViewContext(viewId);
  
  if (nodeId === viewContext.currentNodeId) {
    return 'current';
  } else if (viewContext.childIds.includes(nodeId)) {
    return 'child';
  } else if (nodeId === viewContext.parentId) {
    return 'parent';
  } else if (viewContext.ancestorIds.includes(nodeId)) {
    return 'ancestor';
  } else if (viewContext.ancestorChildIds.includes(nodeId)) {
    return 'ancestor_child';
  } else {
    return 'none'; // Should not be visible
  }
}
```

#### 2. View-Based Rendering Logic

```typescript
// Enhanced scene rendering with view management
async function renderView(namespace: string, nodeId: number, viewType: 'regular' | 'ancestor' = 'regular') {
  const viewManager = new ViewManager();
  const viewId = viewManager.createViewId(nodeId, viewType);
  viewManager.setCurrentView(viewId);
  
  // Load data based on view type
  const viewData = viewType === 'ancestor'
    ? await dataStore.loadExtendedNodeView(namespace, nodeId)
    : await dataStore.loadNodeView(namespace, nodeId);
  
  // Create view context
  const viewContext = {
    viewId,
    currentNodeId: nodeId,
    childIds: viewData.children.map(c => c.id),
    parentId: viewData.parent?.id || null,
    ancestorIds: viewData.ancestors.map(a => a.id),
    ancestorChildIds: Object.values(viewData.ancestorChildren).flat().map(c => c.id)
  };
  
  // Clear previous view
  nodeManager.clearView(viewId);
  linkManager.clearView(viewId);
  
  // Create current node (always visible)
  const currentNodeMesh = nodeManager.createNodeForView(viewData.currentNode, viewId, nodeId);
  
  // Create children
  viewData.children.forEach(child => {
    nodeManager.createNodeForView(child, viewId, nodeId);
    linkManager.createLinkForView(viewData.currentNode, child, viewId, nodeId);
  });
  
  // Create parent if exists
  if (viewData.parent) {
    nodeManager.createNodeForView(viewData.parent, viewId, nodeId);
    linkManager.createLinkForView(viewData.parent, viewData.currentNode, viewId, nodeId);
  }
  
  // For ancestor view, create ancestors and their children
  if (viewType === 'ancestor') {
    viewData.ancestors.forEach(ancestor => {
      nodeManager.createNodeForView(ancestor, viewId, nodeId);
      
      // Link to next ancestor or parent
      const parentAncestor = viewData.ancestors.find(a => a.id === ancestor.parent_id);
      if (parentAncestor) {
        linkManager.createLinkForView(parentAncestor, ancestor, viewId, nodeId);
      } else if (viewData.parent && ancestor.id === viewData.parent.parent_id) {
        linkManager.createLinkForView(ancestor, viewData.parent, viewId, nodeId);
      }
    });
    
    // Create ancestor children
    Object.entries(viewData.ancestorChildren).forEach(([ancestorIdStr, children]) => {
      const ancestorId = parseInt(ancestorIdStr);
      const ancestor = viewData.ancestors.find(a => a.id === ancestorId) || viewData.parent;
      
      if (ancestor) {
        children.forEach(child => {
          // Skip current node if it appears in ancestor's children
          if (child.id !== nodeId) {
            nodeManager.createNodeForView(child, viewId, nodeId);
            linkManager.createLinkForView(ancestor, child, viewId, nodeId);
          }
        });
      }
    });
  }
  
  // Position camera
  positionCameraForView(viewContext);
}
```

#### 3. View Transition Logic

```typescript
// Smooth view transitions
function transitionToView(newNodeId: number, currentViewId: string | null, viewType: 'regular' | 'ancestor' = 'regular') {
  const viewManager = new ViewManager();
  
  // Hide current view if different
  if (currentViewId) {
    const currentContext = getViewContext(currentViewId);
    
    // If navigating within the same cluster, we might want to keep some elements
    if (currentContext.currentNodeId !== newNodeId) {
      // Hide all nodes from current view
      const currentNodeIds = nodeManager.getNodesInView(currentViewId);
      currentNodeIds.forEach(nodeId => {
        const instances = nodeManager.getNodeInstances(nodeId);
        instances.forEach(instance => {
          if (instance.getScene().getTransformNodeById(currentViewId)) {
            instance.setEnabled(false);
          }
        });
      });
    }
  }
  
  // Create and show new view
  renderView(dataStore.state.currentNamespace || '', newNodeId, viewType);
}
```

### Phase 3: Node Instance Management Strategy

#### 1. Node Instance Reuse vs. Creation

**Strategy**: Create separate mesh instances for each view participation to allow independent positioning and properties.

**Rationale**:
- Nodes can have different positions in different views (e.g., relative positioning)
- Nodes can have different visual properties in different views (though we're simplifying this)
- Independent lifecycle management per view
- Cleaner resource management

#### 2. Memory Management

```typescript
// Resource cleanup strategy
class ResourceManager {
  private maxNodeInstances: number = 1000; // Configurable limit
  private maxLinkInstances: number = 5000;
  
  constructor() {
    // Setup periodic cleanup
    setInterval(this.cleanupUnusedResources.bind(this), 30000); // Every 30 seconds
  }
  
  cleanupUnusedResources(): void {
    // Find views that are no longer active
    const activeViews = new Set([viewManager.getCurrentViewId()]);
    viewManager.getViewHistory().forEach(viewId => activeViews.add(viewId));
    
    // Clean up resources from inactive views
    nodeManager.getAllViews().forEach(viewId => {
      if (!activeViews.has(viewId)) {
        nodeManager.clearView(viewId);
      }
    });
    
    linkManager.getAllViews().forEach(viewId => {
      if (!activeViews.has(viewId)) {
        linkManager.clearView(viewId);
      }
    });
  }
  
  enforceMemoryLimits(): void {
    // If we exceed memory limits, clean up oldest views first
    const allViews = Array.from(nodeManager.getAllViews());
    if (allViews.length > 10) { // Keep max 10 views in memory
      const viewsToClean = allViews.slice(0, -5); // Keep newest 5
      viewsToClean.forEach(viewId => {
        if (viewId !== viewManager.getCurrentViewId()) {
          nodeManager.clearView(viewId);
          linkManager.clearView(viewId);
        }
      });
    }
  }
}
```

### Phase 4: Simplified Rendering with Multi-View Support

#### 1. Consistent Node Visualization Across Views

```typescript
// Simplified createNode method with view support
public createNodeForView(node: ClusterNode, viewId: string): Mesh {
  const instanceKey = `${node.id}_${viewId}`;
  
  // Check if this node instance already exists for this view
  const existingInstance = this.nodeViewInstances.get(instanceKey);
  if (existingInstance) {
    this.updateNode(existingInstance, node);
    return existingInstance;
  }
  
  // Create new node mesh with consistent properties
  const nodeMesh = MeshBuilder.CreateSphere(
    `node_${node.id}_${viewId}`,
    {
      segments: this.sphereSegments,
      diameter: this.sphereDiameter // Always use same diameter
    },
    this.scene
  );
  
  // Position using global coordinates
  this.positionNode(nodeMesh, node);
  
  // Apply material based on node type (consistent across all views)
  this.applyNodeMaterial(nodeMesh, node);
  
  // Always create billboard (consistent across all views)
  this.createBillboardLabel(node, nodeMesh);
  
  // Enable interactions
  nodeMesh.isPickable = true;
  nodeMesh.checkCollisions = true;
  
  // Store the instance
  this.nodeViewInstances.set(instanceKey, nodeMesh);
  
  return nodeMesh;
}
```

#### 2. View-Based Positioning Strategy

```typescript
// Position nodes based on view context
private positionNode(nodeMesh: Mesh, node: ClusterNode, viewContext?: ViewContext): void {
  // Use global coordinates consistently
  if (node.centroid && Array.isArray(node.centroid) && node.centroid.length === 3) {
    const [x, y, z] = node.centroid;
    
    if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number' &&
        isFinite(x) && isFinite(y) && isFinite(z)) {
      
      // Apply scene scaling
      const scaledX = x * this.sceneScale;
      const scaledY = y * this.sceneScale;
      const scaledZ = z * this.sceneScale;
      
      nodeMesh.position = new Vector3(scaledX, scaledY, scaledZ);
      return;
    }
  }
  
  // Use fallback position for invalid centroids
  nodeMesh.position = this.getFallbackPosition();
}
```

#### 1. Cluster Container System

```typescript
// New ClusterManager class
class ClusterManager {
  private scene: Scene;
  private clusterContainers: Map<number, TransformNode> = new Map();
  private clusterMetadata: Map<number, ClusterMetadata> = new Map();
  
  constructor(scene: Scene) {
    this.scene = scene;
  }
  
  createClusterContainer(clusterId: number, metadata: ClusterMetadata): TransformNode {
    const container = new TransformNode(`cluster_${clusterId}`, this.scene);
    this.clusterContainers.set(clusterId, container);
    this.clusterMetadata.set(clusterId, metadata);
    return container;
  }
  
  getClusterContainer(clusterId: number): TransformNode | undefined {
    return this.clusterContainers.get(clusterId);
  }
  
  removeCluster(clusterId: number): void {
    const container = this.clusterContainers.get(clusterId);
    if (container) {
      container.dispose();
      this.clusterContainers.delete(clusterId);
      this.clusterMetadata.delete(clusterId);
    }
  }
  
  getAllClusters(): Map<number, TransformNode> {
    return this.clusterContainers;
  }
}
```

#### 2. Enhanced Node Storage

```typescript
// Enhanced NodeManager with cluster association
class NodeManager {
  // ... existing properties ...
  
  // Add cluster tracking
  private nodeClusterMap: Map<number, number> = new Map(); // nodeId -> clusterId
  private clusterNodeMap: Map<number, Set<number>> = new Map(); // clusterId -> Set<nodeId>
  
  createNode(node: ClusterNode, clusterId: number | null = null): Mesh {
    const mesh = this.createNodeMesh(node);
    
    // Associate with cluster if provided
    if (clusterId !== null) {
      this.nodeClusterMap.set(node.id, clusterId);
      
      if (!this.clusterNodeMap.has(clusterId)) {
        this.clusterNodeMap.set(clusterId, new Set());
      }
      this.clusterNodeMap.get(clusterId)?.add(node.id);
      
      // Parent to cluster container if it exists
      const clusterContainer = clusterManager.getClusterContainer(clusterId);
      if (clusterContainer) {
        mesh.setParent(clusterContainer);
      }
    }
    
    return mesh;
  }
  
  getNodesByCluster(clusterId: number): Mesh[] {
    const nodeIds = this.clusterNodeMap.get(clusterId);
    if (!nodeIds) return [];
    
    return Array.from(nodeIds).map(nodeId => this.nodeMeshes.get(nodeId)).filter(Boolean) as Mesh[];
  }
  
  removeClusterNodes(clusterId: number): void {
    const nodeIds = this.clusterNodeMap.get(clusterId);
    if (nodeIds) {
      nodeIds.forEach(nodeId => {
        this.removeNode(nodeId);
      });
      this.clusterNodeMap.delete(clusterId);
    }
  }
}
```

#### 3. Enhanced Link Storage

```typescript
// Enhanced LinkManager with cluster association
class LinkManager {
  // ... existing properties ...
  
  // Add cluster tracking for links
  private linkClusterMap: Map<string, number> = new Map(); // "parentId_childId" -> clusterId
  private clusterLinkMap: Map<number, Set<string>> = new Map(); // clusterId -> Set<linkKeys>
  
  createLink(parentNode: ClusterNode, childNode: ClusterNode, clusterId: number | null = null): Mesh {
    const linkKey = this.getLinkKey(parentNode.id, childNode.id);
    const mesh = this.createLinkMesh(parentNode, childNode);
    
    // Associate with cluster if provided
    if (clusterId !== null) {
      this.linkClusterMap.set(linkKey, clusterId);
      
      if (!this.clusterLinkMap.has(clusterId)) {
        this.clusterLinkMap.set(clusterId, new Set());
      }
      this.clusterLinkMap.get(clusterId)?.add(linkKey);
      
      // Parent to cluster container if it exists
      const clusterContainer = clusterManager.getClusterContainer(clusterId);
      if (clusterContainer) {
        mesh.setParent(clusterContainer);
      }
    }
    
    return mesh;
  }
  
  getLinksByCluster(clusterId: number): Mesh[] {
    const linkKeys = this.clusterLinkMap.get(clusterId);
    if (!linkKeys) return [];
    
    return Array.from(linkKeys).map(linkKey => this.linkMeshes.get(linkKey)).filter(Boolean) as Mesh[];
  }
  
  removeClusterLinks(clusterId: number): void {
    const linkKeys = this.clusterLinkMap.get(clusterId);
    if (linkKeys) {
      linkKeys.forEach(linkKey => {
        this.removeLinkByKey(linkKey);
      });
      this.clusterLinkMap.delete(clusterId);
    }
  }
}
```

### Phase 2: Simplified Rendering Architecture

#### 1. Unified Node Visualization

**Current Complexity**:
- Nodes have different sizes based on `isAncestor` flag
- Nodes have different opacities based on `isAncestor` flag  
- Billboards are only shown for non-ancestor nodes
- Complex relative positioning logic

**Simplified Approach**:
- **All nodes have consistent size** (remove `ANCESTOR_NODE_SCALE`)
- **All nodes have consistent opacity** (remove `ANCESTOR_NODE_OPACITY`)
- **All nodes show billboards** (remove conditional billboard logic)
- **Simplified positioning**: Use global coordinates consistently

```typescript
// Simplified createNode method
public createNode(node: ClusterNode): Mesh {
  // Validate node data
  if (!this.validateNode(node)) {
    throw new Error(`Invalid node data for node ${node.id}`);
  }
  
  // Check if node already exists
  const existingMesh = this.nodeMeshes.get(node.id);
  if (existingMesh) {
    this.updateNode(existingMesh, node);
    return existingMesh;
  }
  
  // Create new node mesh with consistent size
  const nodeMesh = MeshBuilder.CreateSphere(
    `node_${node.id}`,
    {
      segments: this.sphereSegments,
      diameter: this.sphereDiameter // Always use same diameter
    },
    this.scene
  );
  
  // Position using global coordinates (no relative positioning)
  this.positionNode(nodeMesh, node);
  
  // Apply material based on node type (consistent for all nodes)
  this.applyNodeMaterial(nodeMesh, node);
  
  // Always create billboard (no conditional logic)
  this.createBillboardLabel(node, nodeMesh);
  
  // Enable interactions
  nodeMesh.isPickable = true;
  nodeMesh.checkCollisions = true;
  
  // Store reference
  this.nodeMeshes.set(node.id, nodeMesh);
  
  return nodeMesh;
}
```

#### 2. Simplified Link Visualization

**Current Complexity**:
- Links have different lengths based on `isExtended` flag
- Links have different opacities based on `isExtended` flag
- Complex positioning logic for extended links

**Simplified Approach**:
- **All links use actual centroid distances** (remove `EXTENDED_LINK_LENGTH_MULTIPLIER`)
- **All links have consistent opacity** (remove `ANCESTOR_LINK_OPACITY`)
- **Simplified link creation**: Use direct node-to-node connections

```typescript
// Simplified createLink method
public createLink(parentNode: ClusterNode, childNode: ClusterNode): Mesh {
  const linkKey = this.getLinkKey(parentNode.id, childNode.id);
  
  // Check if link already exists
  const existingLink = this.linkMeshes.get(linkKey);
  if (existingLink) {
    this.updateLink(existingLink, parentNode, childNode);
    return existingLink;
  }
  
  // Create link using actual distance between nodes
  const linkMesh = this.createLinkMesh(parentNode, childNode);
  
  // Apply consistent material (no opacity variations)
  linkMesh.material = this.linkMaterial;
  
  // Store reference
  this.linkMeshes.set(linkKey, linkMesh);
  
  return linkMesh;
}
```

### Phase 3: Cluster-Based View Management

#### 1. Cluster-Centric Data Loading

```typescript
// Enhanced data loading with cluster awareness
async function loadClusterView(clusterId: number, namespace: string): Promise<ClusterViewData> {
  // Load the cluster node itself
  const clusterNode = await apiClient.getClusterNode(namespace, clusterId);
  
  // Load immediate children (nodes in this cluster)
  const children = await apiClient.getClusterNodeChildren(namespace, clusterId);
  
  // Load parent cluster (if exists)
  const parent = clusterNode.data.parent_id 
    ? await apiClient.getClusterNode(namespace, clusterNode.data.parent_id) 
    : null;
  
  // Load ancestor chain for context
  const ancestors = await apiClient.getClusterAncestors(namespace, clusterId);
  
  return {
    clusterNode: clusterNode.data,
    children: children.data || [],
    parent: parent?.data || null,
    ancestors: ancestors.data || [],
    clusterId: clusterId
  };
}
```

#### 2. Cluster-Based Scene Management

```typescript
// Cluster-based scene rendering
async function renderClusterView(clusterData: ClusterViewData) {
  // Create cluster container
  const clusterContainer = clusterManager.createClusterContainer(
    clusterData.clusterId,
    {
      name: clusterData.clusterNode.label,
      depth: clusterData.clusterNode.depth,
      namespace: clusterData.clusterNode.namespace
    }
  );
  
  // Create all nodes in this cluster
  const allNodes = [clusterData.clusterNode, ...clusterData.children];
  
  allNodes.forEach(node => {
    nodeManager.createNode(node, clusterData.clusterId);
  });
  
  // Create links between nodes in this cluster
  clusterData.children.forEach(child => {
    linkManager.createLink(clusterData.clusterNode, child, clusterData.clusterId);
  });
  
  // Create parent link (if parent exists)
  if (clusterData.parent) {
    linkManager.createLink(clusterData.parent, clusterData.clusterNode, clusterData.clusterId);
  }
  
  // Position camera based on cluster centroid
  positionCameraForCluster(clusterData);
}
```

#### 3. Cluster Transition Logic

```typescript
// Smooth cluster transitions
function transitionToCluster(newClusterId: number, currentClusterId: number | null) {
  // Hide current cluster if different
  if (currentClusterId && currentClusterId !== newClusterId) {
    const currentContainer = clusterManager.getClusterContainer(currentClusterId);
    if (currentContainer) {
      currentContainer.setEnabled(false);
    }
  }
  
  // Show new cluster
  const newContainer = clusterManager.getClusterContainer(newClusterId);
  if (newContainer) {
    newContainer.setEnabled(true);
    
    // Animate camera to new cluster position
    animateCameraToCluster(newClusterId);
  }
}
```

### Phase 4: Performance Optimization

#### 1. Caching Strategy

```typescript
// Cluster caching system
class ClusterCache {
  private cache: Map<number, ClusterCacheEntry> = new Map();
  private maxSize: number = 10; // Max clusters to cache
  
  cacheCluster(clusterId: number, nodes: ClusterNode[], links: LinkData[]): void {
    if (this.cache.size >= this.maxSize) {
      // Evict least recently used cluster
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(clusterId, {
      nodes,
      links,
      timestamp: Date.now(),
      accessCount: 0
    });
  }
  
  getCachedCluster(clusterId: number): ClusterCacheEntry | undefined {
    const entry = this.cache.get(clusterId);
    if (entry) {
      entry.accessCount++;
      entry.timestamp = Date.now(); // Update access time
    }
    return entry;
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}
```

#### 2. Mesh Reuse Strategy

```typescript
// Mesh pooling for performance
class MeshPool {
  private nodePool: Mesh[] = [];
  private linkPool: Mesh[] = [];
  
  getNodeMesh(): Mesh | null {
    if (this.nodePool.length > 0) {
      return this.nodePool.pop() as Mesh;
    }
    return null;
  }
  
  returnNodeMesh(mesh: Mesh): void {
    // Reset mesh properties
    mesh.setEnabled(false);
    mesh.position = Vector3.Zero();
    this.nodePool.push(mesh);
  }
  
  // Similar methods for links
}
```

## Implementation Roadmap

### Step 1: Implement ClusterManager
- Create new `ClusterManager` class
- Integrate with existing `NodeManager` and `LinkManager`
- Add cluster association methods

### Step 2: Simplify Node Rendering
- Remove `isAncestor` parameter from `createNode`
- Standardize node sizes and opacities
- Ensure all nodes show billboards
- Simplify positioning logic

### Step 3: Simplify Link Rendering  
- Remove `isExtended` parameter from `createLink`
- Standardize link lengths and opacities
- Use direct node-to-node connections

### Step 4: Update Scene Management
- Modify `loadNodeView` to use cluster-based approach
- Update camera positioning logic
- Implement cluster transitions

### Step 5: Add Performance Optimizations
- Implement cluster caching
- Add mesh pooling
- Optimize view transitions

## Multi-Cluster Node Scenario Resolution

### Problem Analysis

The key question was: *"What happens when a single node appears in multiple clusters, in one as a child and the other as the current node?"*

**Answer**: This scenario doesn't actually occur in the hierarchical cluster structure because:

1. **Cluster Membership**: Each node belongs to exactly ONE cluster - the cluster it represents
2. **View Participation**: A node can participate in MULTIPLE VIEWS with different roles
3. **Hierarchical Structure**: The tree structure ensures each node has exactly one parent cluster

### How the Solution Handles This

#### 1. Node Instance Per View Participation

```typescript
// Each node can have multiple instances - one for each view it participates in
class NodeManager {
  private nodeViewInstances: Map<string, Mesh> = new Map(); // "nodeId_viewId" -> Mesh
  
  createNodeForView(node: ClusterNode, viewId: string): Mesh {
    const instanceKey = `${node.id}_${viewId}`;
    
    // Create separate instance for each view
    const nodeMesh = this.createNodeMesh(node);
    this.nodeViewInstances.set(instanceKey, nodeMesh);
    
    return nodeMesh;
  }
}
```

#### 2. Example Scenario: Node 123

**View 1**: Node 123 as current node
- Instance: `node_123_view1`
- Role: Current node
- Position: Center of view
- Cluster: Cluster 123

**View 2**: Node 123 as child of Node 456  
- Instance: `node_123_view2`
- Role: Child node
- Position: Relative to parent Node 456
- Cluster: Cluster 456

**View 3**: Node 123 as parent of Node 789
- Instance: `node_123_view3`
- Role: Parent node
- Position: Relative to child Node 789
- Cluster: Cluster 123 (same cluster, different view)

#### 3. View Transition Handling

```typescript
// When navigating from View 1 to View 2:
function navigateToView(newNodeId: number) {
  const currentViewId = viewManager.getCurrentViewId();
  const newViewId = viewManager.createViewId(newNodeId);
  
  // Hide nodes from current view
  nodeManager.getNodesInView(currentViewId).forEach(nodeId => {
    nodeManager.getNodeInstances(nodeId).forEach(instance => {
      instance.setEnabled(false); // Hide, but keep in memory
    });
  });
  
  // Create new view with new node instances
  renderView(newNodeId, newViewId);
  
  // Clean up old views if memory limits exceeded
  resourceManager.enforceMemoryLimits();
}
```

#### 4. Memory Management Strategy

```typescript
// Intelligent resource cleanup
class ResourceManager {
  cleanupStrategy: 'aggressive' | 'balanced' | 'conservative' = 'balanced';
  
  cleanupResources(): void {
    switch (this.cleanupStrategy) {
      case 'aggressive':
        // Keep only current view
        this.cleanupAllExceptCurrent();
        break;
        
      case 'balanced':
        // Keep current view + 2 previous views
        this.cleanupOldViews(2);
        break;
        
      case 'conservative':
        // Keep current view + 5 previous views
        this.cleanupOldViews(5);
        break;
    }
  }
  
  private cleanupOldViews(keepCount: number): void {
    const allViews = Array.from(nodeManager.getAllViews());
    const currentView = viewManager.getCurrentViewId();
    
    // Sort views by access time (oldest first)
    const sortedViews = allViews.sort((a, b) => {
      return this.getViewAccessTime(a) - this.getViewAccessTime(b);
    });
    
    // Clean up oldest views, keeping current + keepCount previous
    const viewsToClean = sortedViews.filter(viewId => 
      viewId !== currentView && 
      !viewManager.getViewHistory().includes(viewId)
    ).slice(0, -keepCount);
    
    viewsToClean.forEach(viewId => {
      nodeManager.clearView(viewId);
      linkManager.clearView(viewId);
    });
  }
}
```

### Benefits of Multi-Instance Approach

1. **Independent Positioning**: Each instance can have different positions for different views
2. **Clean Lifecycle Management**: Views can be created/destroyed independently
3. **Memory Efficiency**: Unused views can be cleaned up while keeping active ones
4. **Smooth Transitions**: Can pre-load adjacent views for faster navigation
5. **Flexible Rendering**: Different visual properties per view if needed (though we're standardizing)

## Benefits of This Approach

1. **Simplified Architecture**: Clear separation between cluster management and rendering
2. **Consistent Visualization**: All nodes/links rendered uniformly regardless of context
3. **Better Performance**: Efficient cluster-based loading and caching
4. **Easier Maintenance**: Reduced complexity in positioning and rendering logic
5. **Scalability**: Can handle large graphs by loading only relevant clusters
6. **Future Extensibility**: Easy to add cluster-specific features and visualizations
7. **Multi-View Support**: Proper handling of nodes appearing in multiple views with different roles
8. **Memory Management**: Intelligent cleanup of unused view resources
9. **Navigation Flexibility**: Support for both regular and ancestor views with proper transitions

## Updated Implementation Roadmap

### Step 1: Implement View Management System
- Create `ViewManager` class for view lifecycle management
- Add view tracking to `NodeManager` and `LinkManager`
- Implement view-based instance creation methods

### Step 2: Implement Multi-Instance Node Management
- Modify `createNode` to `createNodeForView` with viewId parameter
- Add instance tracking and cleanup methods
- Implement view-based positioning logic

### Step 3: Update Scene Rendering to Use Views
- Modify `loadNodeView` and `loadExtendedNodeView` to use view-based approach
- Implement view transitions with proper cleanup
- Add view history management

### Step 4: Implement Resource Management
- Create `ResourceManager` class with cleanup strategies
- Add memory limit enforcement
- Implement periodic cleanup of unused resources

### Step 5: Add Performance Optimizations
- Implement view caching for frequently accessed views
- Add pre-loading of adjacent views
- Optimize view transitions with smooth animations

## Migration Strategy

1. **Incremental Implementation**: Implement cluster management first, then simplify rendering
2. **Backward Compatibility**: Maintain existing API during transition
3. **Feature Flags**: Allow toggling between old and new rendering approaches
4. **Performance Testing**: Validate performance improvements at each stage
5. **Visual Regression Testing**: Ensure consistent visual output during transition

## Expected Outcomes

- **Reduced Code Complexity**: ~30-40% reduction in rendering logic complexity
- **Improved Performance**: Faster view transitions and smoother animations
- **Better Maintainability**: Clearer separation of concerns and responsibilities
- **Enhanced User Experience**: More consistent and predictable visualizations
- **Future-Proof Architecture**: Foundation for advanced cluster-based features