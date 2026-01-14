# Node and Link Storage Rearchitecture Plan - V2

## Simplified Shared Node Approach

Based on the insightful feedback, this revised plan uses a **shared node instance** approach with **cluster-based visibility management**, which is much more efficient and aligns better with the navigation requirements.

## Core Concept: Shared Node Master Map

```typescript
// Single master map for all nodes in the scene
class ClusterManager {
  // Master node map - every node exists here exactly once
  private masterNodeMap: Map<number, Mesh> = new Map();

  // Clusters reference nodes from the master map
  private clusterNodeSets: Map<number, Set<number>> = new Map(); // clusterNodeId -> Set<nodeIds>

  // Track which clusters are currently visible
  private visibleClusters: Set<number> = new Set();

  // Root cluster is always visible
  private rootClusterNodeId: number | null = null;
}
```

## Revised Architecture

### Phase 1: Shared Node Cluster Manager

#### 1. Cluster Manager with Master Node Map

```typescript
class ClusterManager {
  private scene: Scene;
  private masterNodeMap: Map<number, Mesh> = new Map(); // nodeId -> Mesh
  private masterLinkMap: Map<string, Mesh> = new Map(); // "parentId_childId" -> Mesh

  private clusterNodeSets: Map<number, Set<number>> = new Map(); // clusterId -> Set<nodeIds>
  private clusterLinkSets: Map<number, Set<string>> = new Map(); // clusterId -> Set<linkKeys>

  private visibleClusters: Set<number> = new Set();
  private rootClusterId: number | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Add a node to the master map and associate it with a cluster
   */
  addNodeToCluster(node: ClusterNode, clusterId: number): Mesh {
    // Check if node already exists in master map
    if (this.masterNodeMap.has(node.id)) {
      // Node already exists, just associate with this cluster
      this.associateNodeWithCluster(node.id, clusterId);
      return this.masterNodeMap.get(node.id)!;
    }

    // Create new node mesh
    const nodeMesh = this.createNodeMesh(node);

    // Add to master map
    this.masterNodeMap.set(node.id, nodeMesh);

    // Associate with cluster
    this.associateNodeWithCluster(node.id, clusterId);

    // Set initial visibility based on cluster visibility
    nodeMesh.setEnabled(this.visibleClusters.has(clusterId));

    return nodeMesh;
  }

  private associateNodeWithCluster(nodeId: number, clusterId: number): void {
    if (!this.clusterNodeSets.has(clusterId)) {
      this.clusterNodeSets.set(clusterId, new Set());
    }
    this.clusterNodeSets.get(clusterId)?.add(nodeId);
  }

  /**
   * Add a link to the master map and associate it with a cluster
   */
  addLinkToCluster(parentNode: ClusterNode, childNode: ClusterNode, clusterId: number): Mesh {
    const linkKey = this.getLinkKey(parentNode.id, childNode.id);

    // Check if link already exists in master map
    if (this.masterLinkMap.has(linkKey)) {
      // Link already exists, just associate with this cluster
      this.associateLinkWithCluster(linkKey, clusterId);
      return this.masterLinkMap.get(linkKey)!;
    }

    // Create new link mesh
    const linkMesh = this.createLinkMesh(parentNode, childNode);

    // Add to master map
    this.masterLinkMap.set(linkKey, linkMesh);

    // Associate with cluster
    this.associateLinkWithCluster(linkKey, clusterId);

    // Set initial visibility based on cluster visibility
    linkMesh.setEnabled(this.visibleClusters.has(clusterId));

    return linkMesh;
  }

  private associateLinkWithCluster(linkKey: string, clusterId: number): void {
    if (!this.clusterLinkSets.has(clusterId)) {
      this.clusterLinkSets.set(clusterId, new Set());
    }
    this.clusterLinkSets.get(clusterId)?.add(linkKey);
  }

  /**
   * Show a cluster (make all its nodes and links visible)
   */
  showCluster(clusterId: number): void {
    if (this.visibleClusters.has(clusterId)) {
      return; // Already visible
    }

    this.visibleClusters.add(clusterId);

    // Make all nodes in this cluster visible
    const nodeIds = this.clusterNodeSets.get(clusterId);
    if (nodeIds) {
      nodeIds.forEach(nodeId => {
        const nodeMesh = this.masterNodeMap.get(nodeId);
        if (nodeMesh) {
          nodeMesh.setEnabled(true);
        }
      });
    }

    // Make all links in this cluster visible
    const linkKeys = this.clusterLinkSets.get(clusterId);
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
  hideCluster(clusterId: number): void {
    if (!this.visibleClusters.has(clusterId)) {
      return; // Already hidden
    }

    this.visibleClusters.delete(clusterId);

    // Make all nodes in this cluster invisible
    const nodeIds = this.clusterNodeSets.get(clusterId);
    if (nodeIds) {
      nodeIds.forEach(nodeId => {
        const nodeMesh = this.masterNodeMap.get(nodeId);
        if (nodeMesh) {
          nodeMesh.setEnabled(false);
        }
      });
    }

    // Make all links in this cluster invisible
    const linkKeys = this.clusterLinkSets.get(clusterId);
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
   * Set root cluster (always visible)
   */
  setRootCluster(clusterId: number): void {
    this.rootClusterId = clusterId;
    this.showCluster(clusterId); // Root cluster is always visible
  }

  /**
   * Get all nodes in a cluster
   */
  getClusterNodes(clusterId: number): Mesh[] {
    const nodeIds = this.clusterNodeSets.get(clusterId);
    if (!nodeIds) return [];

    return Array.from(nodeIds).map(nodeId => this.masterNodeMap.get(nodeId)).filter(Boolean) as Mesh[];
  }

  /**
   * Get all links in a cluster
   */
  getClusterLinks(clusterId: number): Mesh[] {
    const linkKeys = this.clusterLinkSets.get(clusterId);
    if (!linkKeys) return [];

    return Array.from(linkKeys).map(linkKey => this.masterLinkMap.get(linkKey)).filter(Boolean) as Mesh[];
  }

  /**
   * Check if a cluster is visible
   */
  isClusterVisible(clusterId: number): boolean {
    return this.visibleClusters.has(clusterId);
  }

  /**
   * Get all visible clusters
   */
  getVisibleClusters(): Set<number> {
    return new Set(this.visibleClusters);
  }

  /**
   * Clean up nodes that are not in any visible clusters
   */
  cleanupUnusedNodes(): void {
    const usedNodeIds = new Set<number>();

    // Collect all node IDs from visible clusters
    this.visibleClusters.forEach(clusterId => {
      const nodeIds = this.clusterNodeSets.get(clusterId);
      if (nodeIds) {
        nodeIds.forEach(nodeId => usedNodeIds.add(nodeId));
      }
    });

    // Also keep root cluster nodes if root is defined
    if (this.rootClusterId) {
      const rootNodeIds = this.clusterNodeSets.get(this.rootClusterId);
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
    this.clusterNodeSets.forEach((nodeIds, clusterId) => {
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
    this.visibleClusters.forEach(clusterId => {
      const linkKeys = this.clusterLinkSets.get(clusterId);
      if (linkKeys) {
        linkKeys.forEach(linkKey => usedLinkKeys.add(linkKey));
      }
    });

    // Also keep root cluster links if root is defined
    if (this.rootClusterId) {
      const rootLinkKeys = this.clusterLinkSets.get(this.rootClusterId);
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
    this.clusterLinkSets.forEach((linkKeys, clusterId) => {
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

    this.clusterNodeSets.clear();
    this.clusterLinkSets.clear();
    this.visibleClusters.clear();
    this.rootClusterId = null;
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

### Phase 2: Cluster-Based Navigation System

#### 1. Navigation Manager

```typescript
class NavigationManager {
  private clusterManager: ClusterManager;
  private currentClusterId: number | null = null;
  private navigationHistory: number[] = [];

  constructor(clusterManager: ClusterManager) {
    this.clusterManager = clusterManager;
  }

  /**
   * Navigate to a cluster (show it and hide others as needed)
   */
  async navigateToCluster(clusterId: number, namespace: string): Promise<void> {
    // If already at this cluster, do nothing
    if (this.currentClusterId === clusterId) {
      return;
    }

    // Push current cluster to history if it exists
    if (this.currentClusterId !== null) {
      this.navigationHistory.push(this.currentClusterId);
    }

    // Load cluster data
    const clusterData = await this.loadClusterData(clusterId, namespace);

    // Create the cluster with all its nodes and links
    this.createCluster(clusterData);

    // Show the new cluster
    this.clusterManager.showCluster(clusterId);

    // Hide previous clusters (except root)
    if (this.currentClusterId !== null && this.currentClusterId !== this.getRootClusterId()) {
      this.clusterManager.hideCluster(this.currentClusterId);
    }

    // Update current cluster
    this.currentClusterId = clusterId;

    // Position camera
    this.positionCameraForCluster(clusterId);

    // Clean up unused resources
    this.clusterManager.cleanupUnusedNodes();
    this.clusterManager.cleanupUnusedLinks();
  }

  /**
   * Go back to previous cluster
   */
  goBack(): void {
    if (this.navigationHistory.length > 0) {
      const previousClusterId = this.navigationHistory.pop();
      if (previousClusterId) {
        // Navigate back to previous cluster
        this.navigateToCluster(previousClusterId, dataStore.state.currentNamespace || '');
      }
    }
  }

  /**
   * Go to root cluster
   */
  goToRoot(): void {
    const rootClusterId = this.getRootClusterId();
    if (rootClusterId) {
      this.navigateToCluster(rootClusterId, dataStore.state.currentNamespace || '');
    }
  }

  private async loadClusterData(clusterId: number, namespace: string): Promise<ClusterData> {
    // Load the cluster node itself
    const clusterNode = await apiClient.getClusterNode(namespace, clusterId);

    // Load immediate children
    const children = await apiClient.getClusterNodeChildren(namespace, clusterId);

    // Load parent (if exists)
    const parent = clusterNode.data.parent_id
      ? await apiClient.getClusterNode(namespace, clusterNode.data.parent_id)
      : null;

    return {
      clusterNode: clusterNode.data,
      children: children.data || [],
      parent: parent?.data || null,
      clusterId: clusterId
    };
  }

  private createCluster(clusterData: ClusterData): void {
    // Add cluster node to cluster manager
    this.clusterManager.addNodeToCluster(clusterData.clusterNode, clusterData.clusterId);

    // Add children to cluster
    clusterData.children.forEach(child => {
      this.clusterManager.addNodeToCluster(child, clusterData.clusterId);

      // Add link from cluster node to child
      this.clusterManager.addLinkToCluster(clusterData.clusterNode, child, clusterData.clusterId);
    });

    // Add parent to cluster (if exists)
    if (clusterData.parent) {
      this.clusterManager.addNodeToCluster(clusterData.parent, clusterData.clusterId);

      // Add link from parent to cluster node
      this.clusterManager.addLinkToCluster(clusterData.parent, clusterData.clusterNode, clusterData.clusterId);
    }
  }

  private getRootClusterId(): number | null {
    // In a real implementation, this would come from the data store
    // or be determined by finding the root node
    return 1; // Example root cluster ID
  }

  private positionCameraForCluster(clusterId: number): void {
    // Position camera based on cluster centroid
    const clusterNodes = this.clusterManager.getClusterNodes(clusterId);

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
  private ancestorClusters: Set<number> = new Set();

  constructor(clusterManager: ClusterManager) {
    super(clusterManager);
  }

  /**
   * Show ancestor view for current cluster
   */
  async showAncestorView(): Promise<void> {
    if (this.currentClusterId === null) {
      return;
    }

    // Load ancestor chain
    const ancestors = await this.loadAncestorChain(this.currentClusterId, dataStore.state.currentNamespace || '');

    // Show all ancestor clusters
    ancestors.forEach(ancestor => {
      this.clusterManager.showCluster(ancestor.id);
      this.ancestorClusters.add(ancestor.id);
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
    this.ancestorClusters.forEach(clusterId => {
      this.clusterManager.hideCluster(clusterId);
    });

    this.ancestorClusters.clear();

    // Clean up unused resources
    this.clusterManager.cleanupUnusedNodes();
    this.clusterManager.cleanupUnusedLinks();

    // Position camera for regular view
    if (this.currentClusterId) {
      this.positionCameraForCluster(this.currentClusterId);
    }
  }

  private async loadAncestorChain(clusterId: number, namespace: string): Promise<ClusterNode[]> {
    // Load all ancestors from current cluster to root
    const ancestorsResponse = await apiClient.getClusterNodeAncestors(namespace, clusterId);
    return ancestorsResponse.data || [];
  }

  private async showAncestorChildren(ancestors: ClusterNode[]): Promise<void> {
    const namespace = dataStore.state.currentNamespace || '';

    for (const ancestor of ancestors) {
      // Load direct children for each ancestor
      const childrenResponse = await apiClient.getClusterNodeChildren(namespace, ancestor.id);
      const children = childrenResponse.data || [];

      // Add children to ancestor's cluster
      children.forEach(child => {
        // Skip current cluster node if it appears in ancestor's children
        if (child.id !== this.currentClusterId) {
          this.clusterManager.addNodeToCluster(child, ancestor.id);
          this.clusterManager.addLinkToCluster(ancestor, child, ancestor.id);
        }
      });

      // Show the ancestor cluster (already shown, but ensure children are visible)
      this.clusterManager.showCluster(ancestor.id);
    }
  }

  private positionCameraForAncestorView(): void {
    // Calculate centroid that includes current cluster and ancestors
    const allVisibleNodes: Mesh[] = [];

    // Include current cluster nodes
    if (this.currentClusterId) {
      allVisibleNodes.push(...this.clusterManager.getClusterNodes(this.currentClusterId));
    }

    // Include ancestor nodes
    this.ancestorClusters.forEach(clusterId => {
      allVisibleNodes.push(...this.clusterManager.getClusterNodes(clusterId));
    });

    if (allVisibleNodes.length > 0) {
      const centroid = this.calculateCentroid(allVisibleNodes);
      this.animateCameraToPosition(centroid, true); // Wider view for ancestors
    }
  }
}
```

### Phase 3: Simplified Rendering with Cluster Management

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
   * Uses consistent properties regardless of context
   */
  public createNode(node: ClusterNode, clusterId: number): Mesh {
    // Let ClusterManager handle the actual creation and clustering
    return this.clusterManager.addNodeToCluster(node, clusterId);
  }

  /**
   * Create a link between nodes and add it to the specified cluster
   */
  public createLink(parentNode: ClusterNode, childNode: ClusterNode, clusterId: number): Mesh {
    return this.clusterManager.addLinkToCluster(parentNode, childNode, clusterId);
  }

  /**
   * Show a cluster (make all its nodes and links visible)
   */
  public showCluster(clusterId: number): void {
    this.clusterManager.showCluster(clusterId);
  }

  /**
   * Hide a cluster (make all its nodes and links invisible)
   */
  public hideCluster(clusterId: number): void {
    this.clusterManager.hideCluster(clusterId);
  }

  /**
   * Set root cluster (always visible)
   */
  public setRootCluster(clusterId: number): void {
    this.clusterManager.setRootCluster(clusterId);
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
// Updated scene management with cluster-based approach
function setupClusterBasedScene() {
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
        navigationManager.navigateToCluster(currentNode.id, dataStore.state.currentNamespace || '');
      }
    }
  });

  // Setup navigation event handlers
  interactionManager.setNavigationHandler((nodeId: number) => {
    navigationManager.navigateToCluster(nodeId, dataStore.state.currentNamespace || '');
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
    const rootClusterId = this.getRootClusterId();

    // Hide and clean up all non-visible, non-root clusters
    this.clusterManager.getAllClusters().forEach(clusterId => {
      if (clusterId !== rootClusterId && !visibleClusters.has(clusterId)) {
        this.clusterManager.hideCluster(clusterId);
      }
    });

    // Force immediate cleanup
    this.clusterManager.cleanupUnusedNodes();
    this.clusterManager.cleanupUnusedLinks();
  }

  private getRootClusterId(): number | null {
    // Implementation would access the root cluster ID
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
// Pre-load adjacent clusters for smoother navigation
class PreloadManager {
  private clusterManager: ClusterManager;
  private navigationManager: NavigationManager;
  private preloadedClusters: Set<number> = new Set();

  constructor(clusterManager: ClusterManager, navigationManager: NavigationManager) {
    this.clusterManager = clusterManager;
    this.navigationManager = navigationManager;
  }

  async preloadAdjacentClusters(currentClusterId: number): Promise<void> {
    // Load parent cluster
    const parent = await this.loadParentCluster(currentClusterId);
    if (parent) {
      this.preloadedClusters.add(parent.id);
      this.createClusterSilently(parent);
    }

    // Load child clusters (first few children)
    const children = await this.loadChildClusters(currentClusterId);
    children.slice(0, 3).forEach(child => { // Preload first 3 children
      this.preloadedClusters.add(child.id);
      this.createClusterSilently(child);
    });
  }

  private async loadParentCluster(clusterId: number): Promise<ClusterNode | null> {
    const namespace = dataStore.state.currentNamespace || '';
    const clusterNode = await apiClient.getClusterNode(namespace, clusterId);

    if (clusterNode.data && clusterNode.data.parent_id) {
      const parent = await apiClient.getClusterNode(namespace, clusterNode.data.parent_id);
      return parent.data;
    }

    return null;
  }

  private async loadChildClusters(clusterId: number): Promise<ClusterNode[]> {
    const namespace = dataStore.state.currentNamespace || '';
    const childrenResponse = await apiClient.getClusterNodeChildren(namespace, clusterId);
    return childrenResponse.data || [];
  }

  private createClusterSilently(clusterNode: ClusterNode): void {
    // Create cluster without showing it
    const clusterData = {
      clusterNode,
      children: [],
      parent: null,
      clusterId: clusterNode.id
    };

    // Add to cluster manager but don't show
    this.clusterManager.addNodeToCluster(clusterNode, clusterNode.id);

    // Note: We don't load children or parent for preloading to save resources
  }

  navigateToPreloadedCluster(clusterId: number): void {
    if (this.preloadedClusters.has(clusterId)) {
      // Cluster is already preloaded, just show it
      this.clusterManager.showCluster(clusterId);
      this.preloadedClusters.delete(clusterId);
    } else {
      // Fall back to normal navigation
      this.navigationManager.navigateToCluster(clusterId, dataStore.state.currentNamespace || '');
    }
  }
}
```

## Benefits of This Revised Approach

### 1. **Simplified Architecture**
- Single master map for all nodes and links
- No duplicate instances for the same node
- Clear cluster-based visibility management

### 2. **Efficient Resource Management**
- Nodes are created once and reused across clusters
- Only visible clusters consume rendering resources
- Automatic cleanup of unused resources

### 3. **Intuitive Navigation**
- Add clusters as you navigate out from root
- Remove clusters as you navigate back in
- Root cluster always remains visible

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

### Step 1: Implement ClusterManager with Master Maps
- Create `ClusterManager` class with master node/link maps
- Implement cluster association and visibility methods
- Add resource cleanup functionality

### Step 2: Update NodeManager to Use ClusterManager
- Modify `NodeManager` to delegate to `ClusterManager`
- Remove duplicate node creation logic
- Implement consistent material management

### Step 3: Implement Navigation System
- Create `NavigationManager` for cluster-based navigation
- Implement `AncestorNavigationManager` for ancestor views
- Add navigation history and back/forward functionality

### Step 4: Integrate with Scene Management
- Update scene setup to use cluster-based approach
- Modify reactive effects to work with clusters
- Implement camera positioning for cluster views

### Step 5: Add Performance Optimizations
- Implement `ResourceManager` for periodic cleanup
- Add `PreloadManager` for smooth navigation
- Configure cleanup intervals and strategies

### Step 6: Migration from Current System
- Replace current node/link management with cluster-based approach
- Update interaction handlers to work with clusters
- Test navigation and visibility transitions

## Migration Strategy

### Incremental Adoption
1. **Phase 1**: Implement new `ClusterManager` alongside existing system
2. **Phase 2**: Gradually migrate node/link creation to use `ClusterManager`
3. **Phase 3**: Replace navigation logic with cluster-based approach
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
- **More Intuitive Architecture** that matches navigation requirements

This revised approach directly addresses the requirement to "add clusters to the view as we navigate out from the root, and remove them from the view as we navigate in" while maintaining a single master node map and efficient resource management.