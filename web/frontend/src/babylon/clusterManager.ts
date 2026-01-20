 import { Scene, Mesh, Vector3, MeshBuilder, StandardMaterial, Color3, Quaternion, TransformNode } from "@babylonjs/core";
import type { ClusterNode } from '../types';
import { dataStore } from "../stores/dataStore";

export class ClusterManager {
  private scene: Scene;
  // Changed: Store meshes per cluster using composite key "clusterID_nodeID"
  private clusterNodeMeshes: Map<string, Mesh> = new Map();
  private clusterLinkMeshes: Map<string, Mesh> = new Map();
  private nodeClusterMembers: Map<number, Set<number>> = new Map();
  private clusterLinks: Map<number, Set<string>> = new Map();
  private visibleClusters: Set<number> = new Set();
  private rootNodeId: number | null = null;
  private materialCache: Map<string, StandardMaterial> = new Map();

  // Transform containers for each cluster
  private clusterContainers: Map<number, TransformNode> = new Map();
  // Store cluster node data for transform calculations
  private clusterNodeData: Map<number, ClusterNode> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Generate a composite key for cluster-specific node meshes
   */
  private getClusterNodeKey(clusterNodeId: number, nodeId: number): string {
    return `cluster_${clusterNodeId}_node_${nodeId}`;
  }

  /**
   * Generate a composite key for cluster-specific link meshes
   */
  private getClusterLinkKey(clusterNodeId: number, parentId: number, childId: number): string {
    return `cluster_${clusterNodeId}_link_${parentId}_${childId}`;
  }

  // Set the root node ID (always visible)
  setRootNodeId(nodeId: number): void {
    this.rootNodeId = nodeId;
  }

  // Get the root node ID
  getRootNodeId(): number | null {
    return this.rootNodeId;
  }

  // Get all visible clusters
  getVisibleClusters(): Set<number> {
    return new Set(this.visibleClusters);
  }

  // Get all clusters
  getAllClusters(): Set<number> {
    return new Set([...this.nodeClusterMembers.keys(), ...this.clusterLinks.keys()]);
  }

  // Create a node mesh with consistent properties
  private createNodeMesh(node: ClusterNode, clusterNodeId: number): Mesh {
    const nodeMesh = MeshBuilder.CreateSphere(
      `node_${node.id}`,
      {
        segments: 16,
        diameter: 0.5 // Consistent size for all nodes
      },
      this.scene
    );

    // Get the cluster's TransformNode container
    const clusterContainer = this.getOrCreateClusterContainer(clusterNodeId);

    // Parent this node to the cluster container
    nodeMesh.setParent(clusterContainer);

    // Position using coordinates relative to the cluster's parent node
    if (node.centroid && node.centroid.length === 3) {
      const relativePos = this.calculateRelativePosition(node, clusterNodeId);
      nodeMesh.position = relativePos;
    }

    // Apply material based on node type
    this.applyNodeMaterial(nodeMesh, node);

    // Enable interactions
    nodeMesh.isPickable = true;
    nodeMesh.checkCollisions = true;

    return nodeMesh;
  }

  /**
   * Get or create a TransformNode container for a cluster
   */
  private getOrCreateClusterContainer(clusterNodeId: number): TransformNode {
    let container = this.clusterContainers.get(clusterNodeId);
    if (!container) {
      container = new TransformNode(`cluster_${clusterNodeId}`, this.scene);
      this.clusterContainers.set(clusterNodeId, container);

      // Position the container based on the cluster's parent node
      this.positionClusterContainer(container, clusterNodeId);
    }
    return container;
  }

  /**
   * Position a cluster container based on its parent node's position
   */
  private positionClusterContainer(container: TransformNode, clusterNodeId: number): void {
    // All cluster containers are at the origin
    // The focal node (node being viewed) will be at origin within the container
    // and all other nodes will be positioned relative to it
    container.position = Vector3.Zero();
    console.log(`[CLUSTERMANAGER] Cluster ${clusterNodeId} container positioned at origin`);
  }

  /**
   * Calculate position of a node with proper parent-relative positioning
   * Root node is always at origin, all other nodes are offset from their parents
   */
  private calculateRelativePosition(node: ClusterNode, clusterNodeId: number): Vector3 {
    if (!node.centroid || node.centroid.length !== 3) {
      return Vector3.Zero();
    }

    const [x, y, z] = node.centroid;
    const viewScaleFactor = 3.0;
    const nodeAbsolutePos = new Vector3(x * viewScaleFactor, y * viewScaleFactor, z * viewScaleFactor);

    // Root node (depth 0 or no parent) is always at origin
    if (!node.parent_id || node.parent_id === 0 || node.depth === 0) {
      console.log(`[CLUSTERMANAGER] Root node ${node.id} positioned at origin`);
      return Vector3.Zero();
    }

    // All other nodes: position relative to their parent
    const parentNodeData = this.clusterNodeData.get(node.parent_id);
    if (parentNodeData && parentNodeData.centroid && parentNodeData.centroid.length === 3) {
      // **CRITICAL FIX: Recursively calculate parent's position**
      // This ensures children move with their parents when parents are 3x spaced
      const parentAbsolutePos = this.calculateRelativePosition(parentNodeData, clusterNodeId);

      // **NEW: Check if this is an ancestor link**
      // A link is an ancestor link if both endpoints are in visibleClusters
      // This ensures consistent positioning across all cluster contexts
      const isAncestorLink =
        this.visibleClusters.has(node.id) &&
        this.visibleClusters.has(node.parent_id);

      // Apply 3x spacing multiplier for ancestor chain links
      const spacingMultiplier = isAncestorLink ? 3.0 : 1.0;

      // Calculate position relative to parent with spacing multiplier
      const offsetVector = nodeAbsolutePos.scale(spacingMultiplier);
      const relativePos = parentAbsolutePos.add(offsetVector);

      console.log(
        `[CLUSTERMANAGER] Node ${node.id} (depth ${node.depth}) in cluster ${clusterNodeId} ` +
        `offset from parent ${node.parent_id}: ` +
        `(${relativePos.x.toFixed(2)}, ${relativePos.y.toFixed(2)}, ${relativePos.z.toFixed(2)}) ` +
        `[inVisibleClusters: ${this.visibleClusters.has(node.id)}, ancestor link: ${isAncestorLink}, multiplier: ${spacingMultiplier}x]`
      );

      return relativePos;
    }

    // Fallback: no parent data available, use absolute position
    console.warn(
      `[CLUSTERMANAGER] Node ${node.id} parent_id=${node.parent_id} not found, ` +
      `using absolute position`
    );
    return nodeAbsolutePos;
  }

  // Apply material to node based on its properties
  private applyNodeMaterial(nodeMesh: Mesh, node: ClusterNode): void {
    // Create a unique material key based on node properties
    const materialKey = this.getMaterialKey(node);

    const cachedMaterial = this.materialCache.get(materialKey);
    if (cachedMaterial) {
      nodeMesh.material = cachedMaterial;
    } else {
      const material = new StandardMaterial(materialKey, this.scene);

      // Set material properties based on node
      material.diffuseColor = this.getNodeColor(node);
      material.specularColor = new Color3(0.1, 0.1, 0.1);
      material.emissiveColor = new Color3(0.05, 0.05, 0.05);
      material.roughness = 0.8;

      this.materialCache.set(materialKey, material);
      nodeMesh.material = material;
    }
  }

  // Get material key for caching based on node properties
  private getMaterialKey(node: ClusterNode): string {
    // Root node (depth 0)
    if (node.depth === 0) {
      return 'node_material_root';
    }

    // Leaf nodes
    if (node.is_leaf) {
      return 'node_material_leaf';
    }

    // Intermediate nodes - keyed by depth (cycles every 12 depths)
    const depthKey = ((node.depth - 1) % 12) + 1;
    return `node_material_depth_${depthKey}`;
  }

  // Get node color based on its properties using Wikimedia Codex colors
  private getNodeColor(node: ClusterNode): Color3 {
    try {
      // Root node (depth 0) - red500
      if (node.depth === 0) {
        return Color3.FromHexString('#f52719');
      }

      // Leaf nodes - blue700
      if (node.is_leaf) {
        return Color3.FromHexString('#3366cc');
      }

      // Intermediate nodes - cycle through orange, yellow, lime pattern
      // Pattern: orange600, yellow400, lime600, orange500, yellow300, lime500,
      //          orange400, yellow200, lime400, orange300, yellow100, lime300
      const depthColors = [
        '#d46926', // Depth 1: orange600
        '#ca982e', // Depth 2: yellow400
        '#1f893f', // Depth 3: lime600
        '#f97f26', // Depth 4: orange500
        '#edb537', // Depth 5: yellow300
        '#259948', // Depth 6: lime500
        '#f97f26', // Depth 7: orange400 (using orange500 as fallback)
        '#ffcf4d', // Depth 8: yellow200 (approximation)
        '#5db26c', // Depth 9: lime400 (approximation)
        '#ffa758', // Depth 10: orange300 (approximation)
        '#ffe49c', // Depth 11: yellow100 (approximation)
        '#94cb9a'  // Depth 12: lime300
      ];

      // Use modulo to cycle through colors for depths beyond 12
      const colorIndex = (node.depth - 1) % depthColors.length;
      const hexColor = depthColors[colorIndex];

      console.log(`[CLUSTERMANAGER] Node ${node.id} (${node.label}): depth=${node.depth}, is_leaf=${node.is_leaf}, colorIndex=${colorIndex}, hex=${hexColor}`);

      return Color3.FromHexString(hexColor);
    } catch (error) {
      console.error(`[CLUSTERMANAGER] Error getting color for node ${node.id}:`, error);
      // Fallback to gray if there's any error
      return new Color3(0.5, 0.5, 0.5);
    }
  }

  // Create a link mesh between two nodes
  private createLinkMesh(parentNode: ClusterNode, childNode: ClusterNode, clusterNodeId: number): Mesh {
    const linkKey = `${parentNode.id}_${childNode.id}`;

    // Get the cluster's TransformNode container
    const clusterContainer = this.getOrCreateClusterContainer(clusterNodeId);

    // Create a cylinder for the link
    const linkMesh = MeshBuilder.CreateCylinder(
      `link_${linkKey}`,
      {
        height: 1.0, // Will be adjusted based on distance
        diameter: 0.05,
        tessellation: 8
      },
      this.scene
    );

    // Parent this link to the cluster container
    linkMesh.setParent(clusterContainer);

    // Position and rotate the link (now relative to the cluster container)
    this.positionLink(linkMesh, parentNode, childNode, clusterNodeId);

    // Apply link material
    const linkMaterial = new StandardMaterial(`link_material`, this.scene);
    linkMaterial.diffuseColor = new Color3(0.6, 0.6, 0.6);
    linkMaterial.emissiveColor = new Color3(0.1, 0.1, 0.1);
    linkMesh.material = linkMaterial;

    return linkMesh;
  }

  // Position and rotate a link between two nodes
  private positionLink(linkMesh: Mesh, parentNode: ClusterNode, childNode: ClusterNode, clusterNodeId: number): void {
    if (!parentNode.centroid || !childNode.centroid ||
        parentNode.centroid.length !== 3 || childNode.centroid.length !== 3) {
      return;
    }

    // Calculate relative positions (relative to the cluster's parent node)
    const parentRelativePos = this.calculateRelativePosition(parentNode, clusterNodeId);
    const childRelativePos = this.calculateRelativePosition(childNode, clusterNodeId);

    // Calculate direction and distance
    const direction = childRelativePos.subtract(parentRelativePos);
    const distance = direction.length();

    // Position the link at the midpoint (in local coordinates)
    const midpoint = parentRelativePos.add(direction.scale(0.5));
    linkMesh.position = midpoint;

    // Rotate the link to point from parent to child
    // Use Quaternion for proper rotation
    if (distance > 0) {
      const normalizedDirection = direction.normalize();
      const axis = Vector3.Cross(Vector3.Up(), normalizedDirection);

      if (axis.length() > 0.001) { // Only rotate if there's a meaningful angle
        const angle = Math.acos(Vector3.Dot(Vector3.Up(), normalizedDirection));
        const quaternion = new Quaternion();
        Quaternion.RotationAxisToRef(axis.normalize(), angle, quaternion);
        linkMesh.rotationQuaternion = quaternion;
      }
    }

    // Adjust height to match distance
    linkMesh.scaling.y = distance;
  }

  // Associate a node with a cluster
  private associateNodeWithCluster(nodeId: number, clusterNodeId: number): void {
    if (!this.nodeClusterMembers.has(clusterNodeId)) {
      this.nodeClusterMembers.set(clusterNodeId, new Set());
    }
    this.nodeClusterMembers.get(clusterNodeId)?.add(nodeId);
  }

  // Associate a link with a cluster
  private associateLinkWithCluster(linkKey: string, clusterNodeId: number): void {
    if (!this.clusterLinks.has(clusterNodeId)) {
      this.clusterLinks.set(clusterNodeId, new Set());
    }
    this.clusterLinks.get(clusterNodeId)?.add(linkKey);
  }

  // Add a node to a cluster
  addNodeToCluster(node: ClusterNode, clusterNodeId: number): Mesh {
    // Store ALL node data for transform calculations (not just the focal node)
    // This allows us to calculate parent-relative positions for all nodes
    this.clusterNodeData.set(node.id, node);

    const clusterNodeKey = this.getClusterNodeKey(clusterNodeId, node.id);

    if (this.clusterNodeMeshes.has(clusterNodeKey)) {
      // Mesh already exists for this cluster+node combination
      this.associateNodeWithCluster(node.id, clusterNodeId);
      return this.clusterNodeMeshes.get(clusterNodeKey)!;
    }

    // Create new node mesh for this specific cluster
    const nodeMesh = this.createNodeMesh(node, clusterNodeId);
    this.clusterNodeMeshes.set(clusterNodeKey, nodeMesh);
    this.associateNodeWithCluster(node.id, clusterNodeId);
    nodeMesh.setEnabled(this.visibleClusters.has(clusterNodeId));

    return nodeMesh;
  }

  // Add a link to a cluster
  addLinkToCluster(parentNode: ClusterNode, childNode: ClusterNode, clusterNodeId: number): Mesh {
    const linkKey = `${parentNode.id}_${childNode.id}`;
    const clusterLinkKey = this.getClusterLinkKey(clusterNodeId, parentNode.id, childNode.id);

    if (this.clusterLinkMeshes.has(clusterLinkKey)) {
      // Link already exists for this cluster
      this.associateLinkWithCluster(linkKey, clusterNodeId);
      return this.clusterLinkMeshes.get(clusterLinkKey)!;
    }

    // Create new link mesh for this specific cluster
    const linkMesh = this.createLinkMesh(parentNode, childNode, clusterNodeId);
    this.clusterLinkMeshes.set(clusterLinkKey, linkMesh);
    this.associateLinkWithCluster(linkKey, clusterNodeId);
    linkMesh.setEnabled(this.visibleClusters.has(clusterNodeId));

    return linkMesh;
  }

  // Pre-register a cluster as visible (before meshes are created)
  // This ensures calculateRelativePosition() has correct context during cluster creation
  preRegisterClusterAsVisible(clusterNodeId: number): void {
    this.visibleClusters.add(clusterNodeId);
    console.log(`[CLUSTERMANAGER] Pre-registered cluster ${clusterNodeId} as visible`);
  }

  // Show a cluster (make all its nodes and links visible)
  showCluster(clusterNodeId: number): void {
    console.log(`[CLUSTERMANAGER] Showing cluster `, clusterNodeId, `current visible clusters:`, Array.from(this.visibleClusters));
    this.visibleClusters.add(clusterNodeId);

    // Make all nodes in this cluster visible, but prioritize focal cluster for each node
    const nodeIds = this.nodeClusterMembers.get(clusterNodeId);
    nodeIds?.forEach(nodeId => {
      // If this node's focal cluster (where nodeId === clusterNodeId) is visible,
      // only show it there. Otherwise, show it in this cluster.
      const nodeFocalClusterVisible = this.visibleClusters.has(nodeId);
      const shouldShowInThisCluster = !nodeFocalClusterVisible || nodeId === clusterNodeId;

      const clusterNodeKey = this.getClusterNodeKey(clusterNodeId, nodeId);
      const mesh = this.clusterNodeMeshes.get(clusterNodeKey);
      if (mesh) {
        mesh.setEnabled(shouldShowInThisCluster);
        console.log(`[CLUSTERMANAGER] Node ${nodeId} in cluster ${clusterNodeId}: ` +
          `focalClusterVisible=${nodeFocalClusterVisible}, isFocal=${nodeId === clusterNodeId}, ` +
          `enabled=${shouldShowInThisCluster}`);
      }
    });

    // Make all links in this cluster visible
    const linkKeys = this.clusterLinks.get(clusterNodeId);
    linkKeys?.forEach(linkKey => {
      // linkKey is in format "parentId_childId"
      const [parentId, childId] = linkKey.split('_').map(Number);
      const clusterLinkKey = this.getClusterLinkKey(clusterNodeId, parentId, childId);
      this.clusterLinkMeshes.get(clusterLinkKey)?.setEnabled(true);
    });
  }

  // Hide a cluster (make all its nodes and links invisible)
  hideCluster(clusterNodeId: number): void {
    if (clusterNodeId === this.rootNodeId) return; // Don't hide root

    console.log(`[CLUSTERMANAGER] Hiding cluster ${clusterNodeId}, current visible clusters:`, Array.from(this.visibleClusters));
    this.visibleClusters.delete(clusterNodeId);

    // Make all nodes in this cluster invisible
    const nodeIds = this.nodeClusterMembers.get(clusterNodeId);
    // console.log(`[CLUSTERMANAGER] DEBUG: Nodes in cluster ${clusterNodeId}:`, nodeIds ? Array.from(nodeIds) : 'none');
    nodeIds?.forEach(nodeId => {
      const clusterNodeKey = this.getClusterNodeKey(clusterNodeId, nodeId);
      const mesh = this.clusterNodeMeshes.get(clusterNodeKey);
      if (mesh) {
        const prevEnabled = mesh.isEnabled();
        mesh.setEnabled(false);
        // console.log(`[CLUSTERMANAGER] DEBUG: Hiding node ${nodeId} in cluster ${clusterNodeId}, enabled ${prevEnabled} -> ${mesh.isEnabled()}`);
      } else {
        console.warn(`[CLUSTERMANAGER] DEBUG: No mesh found for node ${nodeId} in cluster ${clusterNodeId} while hiding`);
      }
    });

    // Make all links in this cluster invisible
    const linkKeys = this.clusterLinks.get(clusterNodeId);
    // console.log(`[CLUSTERMANAGER] DEBUG: Links in cluster ${clusterNodeId}:`, linkKeys ? Array.from(linkKeys) : 'none');
    linkKeys?.forEach(linkKey => {
      const [parentId, childId] = linkKey.split('_').map(Number);
      const clusterLinkKey = this.getClusterLinkKey(clusterNodeId, parentId, childId);
      const linkMesh = this.clusterLinkMeshes.get(clusterLinkKey);
      if (linkMesh) {
        // console.log(`[CLUSTERMANAGER] DEBUG: Hiding link ${parentId}-${childId} in cluster ${clusterNodeId}, enabled before:`, linkMesh.isEnabled());
        linkMesh.setEnabled(false);
        // console.log(`[CLUSTERMANAGER] DEBUG: Hiding link ${parentId}-${childId} in cluster ${clusterNodeId}, enabled after:`, linkMesh.isEnabled());
      } else {
        console.warn(`[CLUSTERMANAGER] DEBUG: No mesh found for link ${parentId}-${childId} in cluster ${clusterNodeId} while hiding`);
      }
    });
  }

  // Ensure that all nodes and links in this cluster are still visible
  ensureClusterVisibility(clusterNodeId: number): void {
    console.log(`[CLUSTERMANAGER] Ensuring cluster visibility for cluster `, clusterNodeId, `. Current node: `, dataStore.state.currentNode);
    const nodeIds = this.nodeClusterMembers.get(clusterNodeId);
    nodeIds?.forEach(nodeId => {
      // If this node's focal cluster (where nodeId === clusterNodeId) is visible,
      // only show it there. Otherwise, show it in this cluster.
      const nodeFocalClusterVisible = this.visibleClusters.has(nodeId);
      const shouldShowInThisCluster = !nodeFocalClusterVisible || nodeId === clusterNodeId;

      const clusterNodeKey = this.getClusterNodeKey(clusterNodeId, nodeId);
      const mesh = this.clusterNodeMeshes.get(clusterNodeKey);
      if (mesh) {
        mesh.setEnabled(shouldShowInThisCluster);
        // console.log(`[CLUSTERMANAGER] Node ${nodeId} in cluster ${clusterNodeId}: ` +
        //   `focalClusterVisible=${nodeFocalClusterVisible}, isFocal=${nodeId === clusterNodeId}, ` +
        //   `enabled=${shouldShowInThisCluster}`);
      }
    });

    // Make all links in this cluster visible
    const linkKeys = this.clusterLinks.get(clusterNodeId);
    linkKeys?.forEach(linkKey => {
      // linkKey is in format "parentId_childId"
      const [parentId, childId] = linkKey.split('_').map(Number);
      const clusterLinkKey = this.getClusterLinkKey(clusterNodeId, parentId, childId);
      this.clusterLinkMeshes.get(clusterLinkKey)?.setEnabled(true);
    });
  }

  // Clean up nodes that are not in any visible clusters
  cleanupUnusedNodes(): void {
    const usedClusterNodeKeys = new Set<string>();

    // Collect all cluster+node combinations from visible clusters
    this.visibleClusters.forEach(clusterNodeId => {
      this.nodeClusterMembers.get(clusterNodeId)?.forEach(nodeId => {
        usedClusterNodeKeys.add(this.getClusterNodeKey(clusterNodeId, nodeId));
      });
    });

    // Also keep root cluster nodes
    if (this.rootNodeId !== null) {
      const rootId = this.rootNodeId;
      this.nodeClusterMembers.get(rootId)?.forEach(nodeId => {
        usedClusterNodeKeys.add(this.getClusterNodeKey(rootId, nodeId));
      });
    }

    // Remove cluster-specific node meshes not in any visible cluster
    this.clusterNodeMeshes.forEach((nodeMesh, clusterNodeKey) => {
      if (!usedClusterNodeKeys.has(clusterNodeKey)) {
        nodeMesh.dispose();
        this.clusterNodeMeshes.delete(clusterNodeKey);
      }
    });
  }

  // Clean up links that are not in any visible clusters
  cleanupUnusedLinks(): void {
    const usedClusterLinkKeys = new Set<string>();

    // Collect all cluster+link combinations from visible clusters
    this.visibleClusters.forEach(clusterNodeId => {
      this.clusterLinks.get(clusterNodeId)?.forEach(linkKey => {
        const [parentId, childId] = linkKey.split('_').map(Number);
        usedClusterLinkKeys.add(this.getClusterLinkKey(clusterNodeId, parentId, childId));
      });
    });

    // Also keep root cluster links
    if (this.rootNodeId !== null) {
      const rootId = this.rootNodeId;
      this.clusterLinks.get(rootId)?.forEach(linkKey => {
        const [parentId, childId] = linkKey.split('_').map(Number);
        usedClusterLinkKeys.add(this.getClusterLinkKey(rootId, parentId, childId));
      });
    }

    // Remove cluster-specific link meshes not in any visible cluster
    this.clusterLinkMeshes.forEach((linkMesh, clusterLinkKey) => {
      if (!usedClusterLinkKeys.has(clusterLinkKey)) {
        linkMesh.dispose();
        this.clusterLinkMeshes.delete(clusterLinkKey);
      }
    });
  }

  // Get a node mesh by ID (returns first found across all clusters)
  getNodeMesh(nodeId: number): Mesh | undefined {
    // Look for the node in visible clusters first
    for (const clusterNodeId of this.visibleClusters) {
      const clusterNodeKey = this.getClusterNodeKey(clusterNodeId, nodeId);
      const mesh = this.clusterNodeMeshes.get(clusterNodeKey);
      if (mesh) return mesh;
    }
    // If not found in visible clusters, search all clusters
    for (const [key, mesh] of this.clusterNodeMeshes) {
      if (key.endsWith(`_node_${nodeId}`)) {
        return mesh;
      }
    }
    return undefined;
  }

  // Get a node mesh from a specific cluster
  getNodeMeshFromCluster(nodeId: number, clusterNodeId: number): Mesh | undefined {
    const clusterNodeKey = this.getClusterNodeKey(clusterNodeId, nodeId);
    return this.clusterNodeMeshes.get(clusterNodeKey);
  }

  // Get all node meshes
  getAllNodes(): Map<number, Mesh> {
    // Return a map of nodeId -> mesh (using first found for each nodeId)
    const nodeMap = new Map<number, Mesh>();
    this.clusterNodeMeshes.forEach((mesh, key) => {
      const nodeId = parseInt(key.split('_node_')[1]);
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, mesh);
      }
    });
    return nodeMap;
  }

  // Get a link mesh by key (returns first found across all clusters)
  getLinkMesh(linkKey: string): Mesh | undefined {
    const [parentId, childId] = linkKey.split('_').map(Number);
    // Look in visible clusters first
    for (const clusterNodeId of this.visibleClusters) {
      const clusterLinkKey = this.getClusterLinkKey(clusterNodeId, parentId, childId);
      const mesh = this.clusterLinkMeshes.get(clusterLinkKey);
      if (mesh) return mesh;
    }
    return undefined;
  }

  // Check if a cluster is visible
  isClusterVisible(clusterNodeId: number): boolean {
    return this.visibleClusters.has(clusterNodeId);
  }

  // Get all nodes in a cluster
  getNodesInCluster(clusterNodeId: number): Set<number> | undefined {
    return this.nodeClusterMembers.get(clusterNodeId);
  }

  // Get all links in a cluster
  getLinksInCluster(clusterNodeId: number): Set<string> | undefined {
    return this.clusterLinks.get(clusterNodeId);
  }

  // Get all links
  getAllLinks(): Map<string, Mesh> {
    // Return a map of linkKey -> mesh (using first found for each linkKey)
    const linkMap = new Map<string, Mesh>();
    this.clusterLinkMeshes.forEach((mesh, key) => {
      const parts = key.split('_link_');
      if (parts.length > 1) {
        const linkKey = parts[1];
        if (!linkMap.has(linkKey)) {
          linkMap.set(linkKey, mesh);
        }
      }
    });
    return linkMap;
  }

  // Clear all clusters and resources
  clearAll(): void {
    console.log('[CLEANUP] ClusterManager clearing all clusters and resources');
    // Dispose all cluster-specific node meshes
    this.clusterNodeMeshes.forEach(nodeMesh => nodeMesh.dispose());
    this.clusterNodeMeshes.clear();

    // Dispose all cluster-specific link meshes
    this.clusterLinkMeshes.forEach(linkMesh => linkMesh.dispose());
    this.clusterLinkMeshes.clear();

    // Dispose all cluster containers
    this.clusterContainers.forEach(container => container.dispose());
    this.clusterContainers.clear();

    // Clear cluster associations
    this.nodeClusterMembers.clear();
    this.clusterLinks.clear();
    this.visibleClusters.clear();
    this.rootNodeId = null;
    this.clusterNodeData.clear();

    // Clear material cache
    this.materialCache.forEach(material => material.dispose());
    this.materialCache.clear();
  }
}

