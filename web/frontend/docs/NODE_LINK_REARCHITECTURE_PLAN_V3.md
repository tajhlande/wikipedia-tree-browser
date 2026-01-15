# Node and Link Storage Rearchitecture Plan - V3

## Simplified Architecture: Cluster ID = Node ID

**Important Clarification**: The cluster ID is the same as the current node ID. There is no separate ID for clusters. The cluster is defined by the "current" node, its children, and the parent node (if any).

## Core Concept: Node-Centric Clusters

```typescript
// Cluster is defined by a node ID (which is the same as the cluster ID)
class ClusterManager {
  // Master node map - every node exists here exactly once
  private masterNodeMap: Map<number, Mesh> = new Map(); // nodeId -> Mesh
  
  // Node-to-cluster associations: which nodes belong to which clusters
  // Since clusterId = nodeId, this tracks which nodes are part of each node's cluster
  private nodeClusterMembers: Map<number, Set<number>> = new Map(); // clusterNodeId -> Set<memberNodeIds>
  
  // Link associations: which links belong to which clusters
  private clusterLinks: Map<number, Set<string>> = new Map(); // clusterNodeId -> Set<linkKeys>
  
  // Track which clusters (nodes) are currently visible
  private visibleClusters: Set<number> = new Set(); // Set of nodeIds that are visible
  
  // Root node is always visible
  private rootNodeId: number | null = null;
}
```

## Revised Architecture

### Phase 1: Node-Centric Cluster Manager

#### 1. Simplified Cluster Manager

```typescript
class ClusterManager {
  private scene: Scene;
  private masterNodeMap: Map<number, Mesh> = new Map(); // nodeId -> Mesh
  private masterLinkMap: Map<string, Mesh> = new Map(); // "parentId_childId" -> Mesh
  
  // Node-to-cluster membership: which nodes are part of each cluster
  // clusterNodeId -> Set of nodeIds that belong to this cluster
  private nodeClusterMembers: Map<number, Set<number>> = new Map();
  
  // Link-to-cluster membership: which links belong to each cluster  
  // clusterNodeId -> Set of linkKeys that belong to this cluster
  private clusterLinks: Map<number, Set<string>> = new Map();
  
  // Track which clusters (nodes) are currently visible
  private visibleClusters: Set<number> = new Set();
  
  // Root node is always visible
  private rootNodeId: number | null = null;
  
  constructor(scene: Scene) {
    this.scene = scene;
  }
  
  /**
   * Add a node to the master map and associate it with a cluster
   * @param node The node to add
   * @param clusterNodeId The node ID that defines the cluster (cluster ID = node ID)
   */
  addNodeToCluster(node: ClusterNode, clusterNodeId: number): Mesh {
    // Check if node already exists in master map
    if (this.masterNodeMap.has(node.id)) {
      // Node already exists, just associate with this cluster
      this.associateNodeWithCluster(node.id, clusterNodeId);
      return this.masterNodeMap.get(node.id)!;
    }
    
    // Create new node mesh
    const nodeMesh = this.createNodeMesh(node);
    
    // Add to master map
    this.masterNodeMap.set(node.id, nodeMesh);
    
    // Associate with cluster (clusterNodeId = node ID)
    this.associateNodeWithCluster(node.id, clusterNodeId);
    
    // Set initial visibility based on cluster visibility
    nodeMesh.setEnabled(this.visibleClusters.has(clusterNodeId));
    
    return nodeMesh;
  }
  
  private associateNodeWithCluster(nodeId: number, clusterNodeId: number): void {
    if (!this.nodeClusterMembers.has(clusterNodeId)) {
      this.nodeClusterMembers.set(clusterNodeId, new Set());
    }
    this.nodeClusterMembers.get(clusterNodeId)?.add(nodeId);
  }
  
  /**
   * Add a link to the master map and associate it with a cluster
   */
  addLinkToCluster(parentNode: ClusterNode, childNode: ClusterNode, clusterNodeId: number): Mesh {
    const linkKey = this.getLinkKey(parentNode.id, childNode.id);
    
    // Check if link already exists in master map
    if (this.masterLinkMap.has(linkKey)) {
      // Link already exists, just associate with this cluster
      this.associateLinkWithCluster(linkKey, clusterNodeId);
      return this.masterLinkMap.get(linkKey)!;
    }
    
    // Create new link mesh
    const linkMesh = this.createLinkMesh(parentNode, childNode);
    
    // Add to master map
    this.masterLinkMap.set(linkKey, linkMesh);
    
    // Associate with cluster
    this.associateLinkWithCluster(linkKey, clusterNodeId);
    
    // Set initial visibility based on cluster visibility
    linkMesh.setEnabled(this.visibleClusters.has(clusterNodeId));
    
    return linkMesh;
  }
  
  private associateLinkWithCluster(linkKey: string, clusterNodeId: number): void {
    if (!this.clusterLinks.has(clusterNodeId)) {
      this.clusterLinks.set(clusterNodeId, new Set());
    }
    this.clusterLinks.get(clusterNodeId)?.add(linkKey);
  }
  
  /**
   * Show a cluster (make all its nodes and links visible)
   * @param clusterNodeId The node ID that defines the cluster
   */
  showCluster(clusterNodeId: number): void {
    if (this.visibleClusters.has(clusterNodeId)) {
      return; // Already visible
    }
    
    this.visibleClusters.add(clusterNodeId);
    
    // Make all nodes in this cluster visible
    const nodeIds = this.nodeClusterMembers.get(clusterNodeId);
    if (nodeIds) {
      nodeIds.forEach(nodeId => {
        const nodeMesh = this.masterNodeMap.get(nodeId);
        if (nodeMesh) {
          nodeMesh.setEnabled(true);
        }
      });
    }
    
    // Make all links in this cluster visible
    const linkKeys = this.clusterLinks.get(clusterNodeId);
    if (linkKeys) {
      linkKeys.forEach(linkKey => {
        const linkMesh = this.masterLinkMap.get(linkKey);
        if (linkMesh) {
          linkMesh.setEnabled(true);
        }
      });
    }
  }
  
  /**
   * Hide a cluster (make all its nodes and links invisible)
   */
  hideCluster(clusterNodeId: number): void {
    if (!this.visibleClusters.has(clusterNodeId)) {
      return; // Already hidden
    }
    
    // Don't hide root cluster
    if (clusterNodeId === this.rootNodeId) {
      return;
    }
    
    this.visibleClusters.delete(clusterNodeId);
    
    // Make all nodes in this cluster invisible
    const nodeIds = this.nodeClusterMembers.get(clusterNodeId);
    if (nodeIds) {
      nodeIds.forEach(nodeId => {
        const nodeMesh = this.masterNodeMap.get(nodeId);
        if (nodeMesh) {
          nodeMesh.setEnabled(false);
        }
      });
    }
    
    // Make all links in this cluster invisible
    const linkKeys = this.clusterLinks.get(clusterNodeId);
    if (linkKeys) {
      linkKeys.forEach(linkKey => {
        const linkMesh = this.masterLinkMap.get(linkKey);
        if (linkMesh) {
          linkMesh.setEnabled(false);
        }
      });
    }
  }
  
  /**
   * Set root node (always visible)
   */
  setRootNode(rootNodeId: number): void {
    this.rootNodeId = rootNodeId;
    this.showCluster(rootNodeId); // Root cluster is always visible
  }
  
  /**
   * Get all nodes in a cluster
   */
  getClusterNodes(clusterNodeId: number): Mesh[] {
    const nodeIds = this.nodeClusterMembers.get(clusterNodeId);
    if (!nodeIds) return [];
    
    return Array.from(nodeIds).map(nodeId => this.masterNodeMap.get(nodeId)).filter(Boolean) as Mesh[];
  }
  
  /**
   * Get all links in a cluster
   */
  getClusterLinks(clusterNodeId: number): Mesh[] {
    const linkKeys = this.clusterLinks.get(clusterNodeId);
    if (!linkKeys) return [];
    
    return Array.from(linkKeys).map(linkKey => this.masterLinkMap.get(linkKey)).filter(Boolean) as Mesh[];
  }
  
  /**
   * Check if a cluster is visible
   */
  isClusterVisible(clusterNodeId: number): boolean {
    return this.visibleClusters.has(clusterNodeId);
  }
  
  /**
   * Get all visible clusters
   */
  getVisibleClusters(): Set<number> {
    return new Set(this.visibleClusters);
  }
  
  /**
   * Get all clusters (node IDs that have clusters defined)
   */
  getAllClusters(): Set<number> {
    return new Set(this.nodeClusterMembers.keys());
  }
  
  /**
   * Clean up nodes that are not in any visible clusters
   */
  cleanupUnusedNodes(): void {
    const usedNodeIds = new Set<number>();
    
    // Collect all node IDs from visible clusters
    this.visibleClusters.forEach(clusterNodeId => {
      const nodeIds = this.nodeClusterMembers.get(clusterNodeId);
      if (nodeIds) {
        nodeIds.forEach(nodeId => usedNodeIds.add(nodeId));
      }
    });
    
    // Also keep root cluster nodes if root is defined
    if (this.rootNodeId) {
      const rootNodeIds = this.nodeClusterMembers.get(this.rootNodeId);
      if (rootNodeIds) {
        rootNodeIds.forEach(nodeId => usedNodeIds.add(nodeId));
      }
    }
    
    // Remove nodes not in any visible cluster
    this.masterNodeMap.forEach((nodeMesh, nodeId) => {
      if (!usedNodeIds.has(nodeId)) {
        nodeMesh.dispose();
        this.masterNodeMap.delete(nodeId);
      }
    });
    
    // Clean up cluster references to removed nodes
    this.nodeClusterMembers.forEach((nodeIds, clusterNodeId) => {
      nodeIds.forEach(nodeId => {
        if (!usedNodeIds.has(nodeId)) {
          nodeIds.delete(nodeId);
        }
      });
    });
  }
  
  /**
   * Clean up links that are not in any visible clusters
   */
  cleanupUnusedLinks(): void {
    const usedLinkKeys = new Set<string>();
    
    // Collect all link keys from visible clusters
    this.visibleClusters.forEach(clusterNodeId => {
      const linkKeys = this.clusterLinks.get(clusterNodeId);
      if (linkKeys) {
        linkKeys.forEach(linkKey => usedLinkKeys.add(linkKey));
      }
    });
    
    // Also keep root cluster links if root is defined
    if (this.rootNodeId) {
      const rootLinkKeys = this.clusterLinks.get(this.rootNodeId);
      if (rootLinkKeys) {
        rootLinkKeys.forEach(linkKey => usedLinkKeys.add(linkKey));
      }
    }
    
    // Remove links not in any visible cluster
    this.masterLinkMap.forEach((linkMesh, linkKey) => {
      if (!usedLinkKeys.has(linkKey)) {
        linkMesh.dispose();
        this.masterLinkMap.delete(linkKey);
      }
    });
    
    // Clean up cluster references to removed links
    this.clusterLinks.forEach((linkKeys, clusterNodeId) => {
      linkKeys.forEach(linkKey => {
        if (!usedLinkKeys.has(linkKey)) {
          linkKeys.delete(linkKey);
        }
      });
    });
  }
  
  /**
   * Complete cleanup
   */
  cleanupAll(): void {
    this.masterNodeMap.forEach(mesh => mesh.dispose());
    this.masterNodeMap.clear();
    
    this.masterLinkMap.forEach(mesh => mesh.dispose());
    this.masterLinkMap.clear();
    
    this.nodeClusterMembers.clear();
    this.clusterLinks.clear();
    this.visibleClusters.clear();
    this.rootNodeId = null;
  }
  
  // Helper methods
  private getLinkKey(parentId: number, childId: number): string {
    return `link_${parentId}_${childId}`;
  }
  
  private createNodeMesh(node: ClusterNode): Mesh {
    // Create sphere mesh with consistent properties
    const nodeMesh = MeshBuilder.CreateSphere(
      `node_${node.id}`,
      {
        segments: 16,
        diameter: 0.5
      },
      this.scene
    );
    
    // Position using centroid
    if (node.centroid && node.centroid.length === 3) {
      const [x, y, z] = node.centroid;
      nodeMesh.position = new Vector3(x * 3.0, y * 3.0, z * 3.0); // Apply scene scaling
    }
    
    // Apply material based on node type
    this.applyNodeMaterial(nodeMesh, node);
    
    // Enable interactions
    nodeMesh.isPickable = true;
    nodeMesh.checkCollisions = true;
    
    return nodeMesh;
  }
  
  private applyNodeMaterial(mesh: Mesh, node: ClusterNode): void {
    // Consistent material application (no ancestor/regular distinction)
    let material: StandardMaterial;
    
    if (node.depth === 0) {
      material = this.getRootMaterial();
    } else if (node.is_leaf) {
      material = this.getLeafMaterial();
    } else {
      material = this.getDepthMaterial(node.depth);
    }
    
    mesh.material = material;
  }
  
  private createLinkMesh(parentNode: ClusterNode, childNode: ClusterNode): Mesh {
    // Create cylinder mesh for link
    const parentPos = this.getNodePosition(parentNode);
    const childPos = this.getNodePosition(childNode);
    const distance = Vector3.Distance(parentPos, childPos);
    
    const linkMesh = MeshBuilder.CreateCylinder(
      `link_${parentNode.id}_${childNode.id}`,
      {
        height: distance,
        diameter: 0.1,
        tessellation: 8
      },
      this.scene
    );
    
    // Position and rotate link
    this.positionLink(linkMesh, parentPos, childPos);
    
    // Apply consistent link material
    linkMesh.material = this.getLinkMaterial();
    
    return linkMesh;
  }
  
  // Additional helper methods would be implemented here...
}
```

### Phase 2: Node-Centric Navigation System

#### 1. Navigation Manager

```typescript
class NavigationManager {
  private clusterManager: ClusterManager;
  private currentNodeId: number | null = null;
  private navigationHistory: number[] = [];
  
  constructor(clusterManager: ClusterManager) {
    this.clusterManager = clusterManager;
  }
  
  /**
   * Navigate to a node (show its cluster and hide others as needed)
   */
  async navigateToNode(nodeId: number, namespace: string): Promise<void> {
    // If already at this node, do nothing
    if (this.currentNodeId === nodeId) {
      return;
    }
    
    // Push current node to history if it exists
    if (this.currentNodeId !== null) {
      this.navigationHistory.push(this.currentNodeId);
    }
    
    // Load node cluster data
    const clusterData = await this.loadNodeClusterData(nodeId, namespace);
    
    // Create the cluster with all its nodes and links
    this.createNodeCluster(clusterData);
    
    // Show the new cluster (clusterId = nodeId)
    this.clusterManager.showCluster(nodeId);
    
    // Hide previous clusters (except root)
    if (this.currentNodeId !== null && this.currentNodeId !== this.getRootNodeId()) {
      this.clusterManager.hideCluster(this.currentNodeId);
    }
    
    // Update current node
    this.currentNodeId = nodeId;
    
    // Position camera
    this.positionCameraForNode(nodeId);
    
    // Clean up unused resources
    this.clusterManager.cleanupUnusedNodes();
    this.clusterManager.cleanupUnusedLinks();
  }
  
  /**
   * Go back to previous node
   */
  goBack(): void {
    if (this.navigationHistory.length > 0) {
      const previousNodeId = this.navigationHistory.pop();
      if (previousNodeId) {
        // Navigate back to previous node
        this.navigateToNode(previousNodeId, dataStore.state.currentNamespace || '');
      }
    }
  }
  
  /**
   * Go to root node
   */
  goToRoot(): void {
    const rootNodeId = this.getRootNodeId();
    if (rootNodeId) {
      this.navigateToNode(rootNodeId, dataStore.state.currentNamespace || '');
    }
  }
  
  private async loadNodeClusterData(nodeId: number, namespace: string): Promise<NodeClusterData> {
    // Load the node itself
    const node = await apiClient.getClusterNode(namespace, nodeId);
    
    // Load immediate children
    const children = await apiClient.getClusterNodeChildren(namespace, nodeId);
    
    // Load parent (if exists)
    const parent = node.data.parent_id
      ? await apiClient.getClusterNode(namespace, node.data.parent_id)
      : null;
    
    return {
      node: node.data,
      children: children.data || [],
      parent: parent?.data || null,
      nodeId: nodeId // clusterId = nodeId
    };
  }
  
  private createNodeCluster(clusterData: NodeClusterData): void {
    // Add the node itself to its cluster (clusterId = nodeId)
    this.clusterManager.addNodeToCluster(clusterData.node, clusterData.nodeId);
    
    // Add children to the cluster
    clusterData.children.forEach(child => {
      this.clusterManager.addNodeToCluster(child, clusterData.nodeId);
      
      // Add link from node to child
      this.clusterManager.addLinkToCluster(clusterData.node, child, clusterData.nodeId);
    });
    
    // Add parent to the cluster (if exists)
    if (clusterData.parent) {
      this.clusterManager.addNodeToCluster(clusterData.parent, clusterData.nodeId);
      
      // Add link from parent to node
      this.clusterManager.addLinkToCluster(clusterData.parent, clusterData.node, clusterData.nodeId);
    }
  }
  
  private getRootNodeId(): number | null {
    // In a real implementation, this would come from the data store
    // or be determined by finding the root node (depth = 0)
    return 1; // Example root node ID
  }
  
  private positionCameraForNode(nodeId: number): void {
    // Position camera based on node cluster centroid
    const clusterNodes = this.clusterManager.getClusterNodes(nodeId);
    
    if (clusterNodes.length > 0) {
      // Calculate centroid of visible nodes
      const centroid = this.calculateCentroid(clusterNodes);
      
      // Animate camera to centroid
      this.animateCameraToPosition(centroid);
    }
  }
  
  // Additional helper methods...
}
```

#### 2. Ancestor View Navigation

```typescript
class AncestorNavigationManager extends NavigationManager {
  private ancestorNodes: Set<number> = new Set();
  
  constructor(clusterManager: ClusterManager) {
    super(clusterManager);
  }
  
  /**
   * Show ancestor view for current node
   */
  async showAncestorView(): Promise<void> {
    if (this.currentNodeId === null) {
      return;
    }
    
    // Load ancestor chain
    const ancestors = await this.loadAncestorChain(this.currentNodeId, dataStore.state.currentNamespace || '');
    
    // Show all ancestor clusters (each ancestor is a cluster defined by its node ID)
    ancestors.forEach(ancestor => {
      this.clusterManager.showCluster(ancestor.id);
      this.ancestorNodes.add(ancestor.id);
    });
    
    // Also show ancestor children for context
    await this.showAncestorChildren(ancestors);
    
    // Position camera for ancestor view
    this.positionCameraForAncestorView();
  }
  
  /**
   * Hide ancestor view
   */
  hideAncestorView(): void {
    // Hide all ancestor clusters
    this.ancestorNodes.forEach(nodeId => {
      this.clusterManager.hideCluster(nodeId);
    });
    
    this.ancestorNodes.clear();
    
    // Clean up unused resources
    this.clusterManager.cleanupUnusedNodes();
    this.clusterManager.cleanupUnusedLinks();
    
    // Position camera for regular view
    if (this.currentNodeId) {
      this.positionCameraForNode(this.currentNodeId);
    }
  }
  
  private async loadAncestorChain(nodeId: number, namespace: string): Promise<ClusterNode[]> {
    // Load all ancestors from current node to root
    const ancestorsResponse = await apiClient.getClusterNodeAncestors(namespace, nodeId);
    return ancestorsResponse.data || [];
  }
  
  private async showAncestorChildren(ancestors: ClusterNode[]): Promise<void> {
    const namespace = dataStore.state.currentNamespace || '';
    
    for (const ancestor of ancestors) {
      // Load direct children for each ancestor
      const childrenResponse = await apiClient.getClusterNodeChildren(namespace, ancestor.id);
      const children = childrenResponse.data || [];
      
      // Add children to ancestor's cluster (clusterId = ancestor.id)
      children.forEach(child => {
        // Skip current node if it appears in ancestor's children
        if (child.id !== this.currentNodeId) {
          this.clusterManager.addNodeToCluster(child, ancestor.id);
          this.clusterManager.addLinkToCluster(ancestor, child, ancestor.id);
        }
      });
      
      // Show the ancestor cluster (already shown, but ensure children are visible)
      this.clusterManager.showCluster(ancestor.id);
    }
  }
  
  private positionCameraForAncestorView(): void {
    // Calculate centroid that includes current node and ancestors
    const allVisibleNodes: Mesh[] = [];
    
    // Include current node cluster nodes
    if (this.currentNodeId) {
      allVisibleNodes.push(...this.clusterManager.getClusterNodes(this.currentNodeId));
    }
    
    // Include ancestor nodes
    this.ancestorNodes.forEach(nodeId => {
      allVisibleNodes.push(...this.clusterManager.getClusterNodes(nodeId));
    });
    
    if (allVisibleNodes.length > 0) {
      const centroid = this.calculateCentroid(allVisibleNodes);
      this.animateCameraToPosition(centroid, true); // Wider view for ancestors
    }
  }
}
```

### Phase 3: Simplified Rendering with Node-Centric Clusters

#### 1. Consistent Node Visualization

```typescript
// Simplified NodeManager that works with ClusterManager
class NodeManager {
  private scene: Scene;
  private clusterManager: ClusterManager;
  
  // Material cache for consistent rendering
  private materialCache: Map<string, StandardMaterial> = new Map();
  
  constructor(scene: Scene, clusterManager: ClusterManager) {
    this.scene = scene;
    this.clusterManager = clusterManager;
    this.initializeMaterials();
  }
  
  /**
   * Create a node and add it to the specified cluster
   * @param node The node to create
   * @param clusterNodeId The node ID that defines the cluster (cluster ID = node ID)
   */
  public createNode(node: ClusterNode, clusterNodeId: number): Mesh {
    // Let ClusterManager handle the actual creation and clustering
    return this.clusterManager.addNodeToCluster(node, clusterNodeId);
  }
  
  /**
   * Create a link between nodes and add it to the specified cluster
   */
  public createLink(parentNode: ClusterNode, childNode: ClusterNode, clusterNodeId: number): Mesh {
    return this.clusterManager.addLinkToCluster(parentNode, childNode, clusterNodeId);
  }
  
  /**
   * Show a cluster (make all its nodes and links visible)
   */
  public showCluster(clusterNodeId: number): void {
    this.clusterManager.showCluster(clusterNodeId);
  }
  
  /**
   * Hide a cluster (make all its nodes and links invisible)
   */
  public hideCluster(clusterNodeId: number): void {
    this.clusterManager.hideCluster(clusterNodeId);
  }
  
  /**
   * Set root node (always visible)
   */
  public setRootNode(rootNodeId: number): void {
    this.clusterManager.setRootNode(rootNodeId);
  }
  
  /**
   * Clean up unused resources
   */
  public cleanupUnusedResources(): void {
    this.clusterManager.cleanupUnusedNodes();
    this.clusterManager.cleanupUnusedLinks();
  }
  
  // Material management methods
  private initializeMaterials(): void {
    // Root material (red)
    const rootMaterial = new StandardMaterial("rootMaterial", this.scene);
    rootMaterial.diffuseColor = new Color3(1, 0, 0);
    this.materialCache.set('root', rootMaterial);
    
    // Leaf material (Wikipedia blue)
    const leafMaterial = new StandardMaterial("leafMaterial", this.scene);
    leafMaterial.diffuseColor = Color3.FromHexString('#3366CC');
    this.materialCache.set('leaf', leafMaterial);
    
    // Depth-based materials
    const depthColors = [
      '#FF8C00', '#FFA500', '#FFB700', '#FFC900', '#FFD900',
      '#FFE900', '#E6FF00', '#CCFF00', '#B3FF00', '#99FF00',
      '#80FF00', '#66FF00'
    ];
    
    depthColors.forEach((color, index) => {
      const material = new StandardMaterial(`depthMaterial_${index}`, this.scene);
      material.diffuseColor = Color3.FromHexString(color);
      this.materialCache.set(`depth_${index}`, material);
    });
  }
  
  public getRootMaterial(): StandardMaterial {
    return this.materialCache.get('root')!;
  }
  
  public getLeafMaterial(): StandardMaterial {
    return this.materialCache.get('leaf')!;
  }
  
  public getDepthMaterial(depth: number): StandardMaterial {
    const depthIndex = Math.min(Math.max(0, depth - 1), 11);
    return this.materialCache.get(`depth_${depthIndex}`)!;
  }
  
  public getLinkMaterial(): StandardMaterial {
    if (!this.materialCache.has('link')) {
      const linkMaterial = new StandardMaterial("linkMaterial", this.scene);
      linkMaterial.diffuseColor = new Color3(0.7, 0.7, 0.7);
      this.materialCache.set('link', linkMaterial);
    }
    return this.materialCache.get('link')!;
  }
}
```

#### 2. Scene Integration

```typescript
// Updated scene management with node-centric cluster approach
function setupNodeCentricScene() {
  // Initialize managers
  const clusterManager = new ClusterManager(scene);
  const nodeManager = new NodeManager(scene, clusterManager);
  const navigationManager = new NavigationManager(clusterManager);
  const ancestorNavigationManager = new AncestorNavigationManager(clusterManager);
  
  // Setup reactive updates
  createEffect(() => {
    const currentView = dataStore.state.currentView;
    const currentNode = dataStore.state.currentNode;
    const showAncestors = dataStore.state.showAncestors;
    
    if (currentView === 'node_view' && currentNode) {
      if (showAncestors) {
        ancestorNavigationManager.showAncestorView();
      } else {
        ancestorNavigationManager.hideAncestorView();
        navigationManager.navigateToNode(currentNode.id, dataStore.state.currentNamespace || '');
      }
    }
  });
  
  // Setup navigation event handlers
  interactionManager.setNavigationHandler((nodeId: number) => {
    navigationManager.navigateToNode(nodeId, dataStore.state.currentNamespace || '');
  });
  
  // Setup back button handler
  interactionManager.setBackHandler(() => {
    navigationManager.goBack();
  });
  
  // Setup home button handler
  interactionManager.setHomeHandler(() => {
    navigationManager.goToRoot();
  });
  
  // Setup ancestor toggle handler
  createEffect(() => {
    const showAncestors = dataStore.state.showAncestors;
    if (showAncestors) {
      ancestorNavigationManager.showAncestorView();
    } else {
      ancestorNavigationManager.hideAncestorView();
    }
  });
}
```

### Phase 4: Performance Optimization

#### 1. Resource Cleanup Strategy

```typescript
// Enhanced cleanup with intelligent resource management
class ResourceManager {
  private clusterManager: ClusterManager;
  private cleanupInterval: number | null = null;
  
  constructor(clusterManager: ClusterManager) {
    this.clusterManager = clusterManager;
    
    // Setup periodic cleanup
    this.cleanupInterval = window.setInterval(() => {
      this.periodicCleanup();
    }, 60000); // Every 60 seconds
  }
  
  periodicCleanup(): void {
    // Clean up unused nodes and links
    this.clusterManager.cleanupUnusedNodes();
    this.clusterManager.cleanupUnusedLinks();
    
    // Additional cleanup logic can be added here
  }
  
  aggressiveCleanup(): void {
    // Keep only visible clusters and root cluster
    const visibleClusters = this.clusterManager.getVisibleClusters();
    const rootNodeId = this.getRootNodeId();
    
    // Hide and clean up all non-visible, non-root clusters
    this.clusterManager.getAllClusters().forEach(clusterNodeId => {
      if (clusterNodeId !== rootNodeId && !visibleClusters.has(clusterNodeId)) {
        this.clusterManager.hideCluster(clusterNodeId);
      }
    });
    
    // Force immediate cleanup
    this.clusterManager.cleanupUnusedNodes();
    this.clusterManager.cleanupUnusedLinks();
  }
  
  private getRootNodeId(): number | null {
    // Implementation would access the root node ID
    return 1; // Example
  }
  
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
```

#### 2. Pre-loading Strategy

```typescript
// Pre-load adjacent nodes for smoother navigation
class PreloadManager {
  private clusterManager: ClusterManager;
  private navigationManager: NavigationManager;
  private preloadedNodes: Set<number> = new Set();
  
  constructor(clusterManager: ClusterManager, navigationManager: NavigationManager) {
    this.clusterManager = clusterManager;
    this.navigationManager = navigationManager;
  }
  
  async preloadAdjacentNodes(currentNodeId: number): Promise<void> {
    // Load parent node
    const parent = await this.loadParentNode(currentNodeId);
    if (parent) {
      this.preloadedNodes.add(parent.id);
      this.createNodeClusterSilently(parent);
    }
    
    // Load child nodes (first few children)
    const children = await this.loadChildNodes(currentNodeId);
    children.slice(0, 3).forEach(child => { // Preload first 3 children
      this.preloadedNodes.add(child.id);
      this.createNodeClusterSilently(child);
    });
  }
  
  private async loadParentNode(nodeId: number): Promise<ClusterNode | null> {
    const namespace = dataStore.state.currentNamespace || '';
    const node = await apiClient.getClusterNode(namespace, nodeId);
    
    if (node.data && node.data.parent_id) {
      const parent = await apiClient.getClusterNode(namespace, node.data.parent_id);
      return parent.data;
    }
    
    return null;
  }
  
  private async loadChildNodes(nodeId: number): Promise<ClusterNode[]> {
    const namespace = dataStore.state.currentNamespace || '';
    const childrenResponse = await apiClient.getClusterNodeChildren(namespace, nodeId);
    return childrenResponse.data || [];
  }
  
  private createNodeClusterSilently(node: ClusterNode): void {
    // Create node cluster without showing it
    const clusterData = {
      node,
      children: [],
      parent: null,
      nodeId: node.id // clusterId = nodeId
    };
    
    // Add to cluster manager but don't show
    this.clusterManager.addNodeToCluster(node, node.id);
    
    // Note: We don't load children or parent for preloading to save resources
  }
  
  navigateToPreloadedNode(nodeId: number): void {
    if (this.preloadedNodes.has(nodeId)) {
      // Node is already preloaded, just show it
      this.clusterManager.showCluster(nodeId);
      this.preloadedNodes.delete(nodeId);
    } else {
      // Fall back to normal navigation
      this.navigationManager.navigateToNode(nodeId, dataStore.state.currentNamespace || '');
    }
  }
}
```

## Benefits of Node-Centric Approach

### 1. **Simplified Architecture**
- Cluster ID = Node ID (no separate cluster IDs)
- Single master map for all nodes and links
- Clear node-to-cluster associations

### 2. **Efficient Resource Management**
- Nodes are created once and reused across clusters
- Only visible clusters consume rendering resources
- Automatic cleanup of unused resources

### 3. **Intuitive Navigation**
- Each node defines its own cluster
- Navigate by showing/hiding node clusters
- Root node always remains visible

### 4. **Performance Optimizations**
- Minimal mesh creation/destruction
- Efficient visibility toggling
- Intelligent resource cleanup
- Optional pre-loading for smooth navigation

### 5. **Memory Efficiency**
- Shared node instances reduce memory usage
- Cleanup removes only truly unused resources
- Configurable cleanup strategies

### 6. **Scalability**
- Can handle large graphs by loading only relevant clusters
- Memory usage grows with visible clusters, not total graph size
- Efficient cleanup prevents memory leaks

## Implementation Roadmap

### Step 1: Implement Node-Centric ClusterManager
- Create `ClusterManager` with node ID = cluster ID
- Implement node/link master maps
- Add cluster association and visibility methods

### Step 2: Update NodeManager to Use ClusterManager
- Modify `NodeManager` to delegate to `ClusterManager`
- Remove duplicate node creation logic
- Implement consistent material management

### Step 3: Implement Navigation System
- Create `NavigationManager` for node-based navigation
- Implement `AncestorNavigationManager` for ancestor views
- Add navigation history and back/forward functionality

### Step 4: Integrate with Scene Management
- Update scene setup to use node-centric approach
- Modify reactive effects to work with node clusters
- Implement camera positioning for node views

### Step 5: Add Performance Optimizations
- Implement `ResourceManager` for periodic cleanup
- Add `PreloadManager` for smooth navigation
- Configure cleanup intervals and strategies

### Step 6: Migration from Current System
- Replace current node/link management with node-centric approach
- Update interaction handlers to work with node clusters
- Test navigation and visibility transitions

## Migration Strategy

### Incremental Adoption
1. **Phase 1**: Implement new `ClusterManager` alongside existing system
2. **Phase 2**: Gradually migrate node/link creation to use `ClusterManager`
3. **Phase 3**: Replace navigation logic with node-centric approach
4. **Phase 4**: Remove old node/link management code
5. **Phase 5**: Optimize and fine-tune performance

### Backward Compatibility
- Keep existing API during transition
- Use feature flags to toggle between old and new systems
- Gradually phase out old system as new one proves stable

### Testing Focus
- **Visual Consistency**: Ensure nodes look the same in all contexts
- **Navigation Performance**: Verify smooth cluster transitions
- **Memory Management**: Test cleanup and resource usage
- **Ancestor Views**: Validate proper ancestor cluster handling

## Expected Outcomes

- **50-70% Reduction** in mesh creation/destruction operations
- **30-50% Improvement** in navigation performance
- **Simpler Codebase** with clearer separation of concerns
- **Better Memory Usage** through shared instances and cleanup
- **More Intuitive Architecture** that matches the hierarchical data structure

## Key Terminology Clarification

### Node vs. Cluster Relationship

1. **Node**: A single entity in the hierarchy with an ID, centroid, depth, etc.
2. **Cluster**: A group of nodes centered around a specific node
3. **Cluster ID**: The same as the central node's ID
4. **Cluster Members**: The central node + its children + its parent (if any)

### Example

- **Node ID 123**: A node in the hierarchy
- **Cluster 123**: The cluster centered around node 123
- **Cluster Members**: Node 123 (center) + Node 123's children + Node 123's parent
- **Cluster ID**: 123 (same as the central node ID)

This approach perfectly matches the hierarchical structure where each node naturally defines its own cluster consisting of itself, its children, and its parent.