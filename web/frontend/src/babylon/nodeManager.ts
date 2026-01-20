import {
  Scene,
  Mesh,
  StandardMaterial,
  Color3,
  Vector3,
  MeshBuilder,
  TransformNode,
  DynamicTexture,
  Engine,
  ArcRotateCamera
} from "@babylonjs/core";
import type { ClusterNode } from '../types';
import { ClusterManager } from './clusterManager';
import { dataStore } from '../stores/dataStore';

/**
 * Node Manager for WP Embeddings Visualization
 * Simplified version that delegates to ClusterManager
 */
export class NodeManager {
  private scene: Scene;
  private clusterManager: ClusterManager;
  private nodeMaterials: Map<string, StandardMaterial> = new Map();
  private nodeContainer: TransformNode;

  // Billboard labels for nodes
  private nodeBillboards: Map<number, Mesh> = new Map();
  private billboardMaterials: Map<number, StandardMaterial> = new Map();

  // LOD (Level of Detail) settings for label visibility, starting out
  private readonly LABEL_VISIBILITY_DISTANCE: number = 15;
  private readonly LABEL_FADE_START: number = 10;

  constructor(scene: Scene, clusterManager: ClusterManager) {
    this.scene = scene;
    this.clusterManager = clusterManager;
    this.nodeContainer = new TransformNode("nodeContainer", scene);

    // Initialize color materials
    this.initializeMaterials();
  }

  /**
   * Initialize color materials for different node types
   */
  private initializeMaterials(): void {
    // Root node material (red)
    const rootMaterial = new StandardMaterial("rootMaterial", this.scene);
    rootMaterial.diffuseColor = new Color3(1, 0, 0); // Red
    rootMaterial.specularColor = new Color3(0.5, 0.5, 0.5);
    rootMaterial.specularPower = 32;
    this.nodeMaterials.set('root', rootMaterial);

    // Leaf node material (Wikipedia blue)
    const leafMaterial = new StandardMaterial("leafMaterial", this.scene);
    leafMaterial.diffuseColor = Color3.FromHexString('#3366CC'); // Wikipedia blue
    leafMaterial.specularColor = new Color3(0.3, 0.3, 0.5);
    leafMaterial.specularPower = 32;
    this.nodeMaterials.set('leaf', leafMaterial);

    // Depth-based materials (alternating color families with decreasing richness)
    const depthColors = [
      '#FF6B00', // Level 1: Rich orange
      '#FFD700', // Level 2: Rich yellow
      '#7CFC00', // Level 3: Rich green
      '#FFA500', // Level 4: Medium orange
      '#FFE633', // Level 5: Medium yellow
      '#9ACD32', // Level 6: Medium green
      '#FFB700', // Level 7: Light orange
      '#FFF176', // Level 8: Light yellow
      '#B0F2B4', // Level 9: Light green
      '#FFD180', // Level 10: Very light orange
      '#FFFF99', // Level 11: Very light yellow
      '#C8E6C9'  // Level 12: Very light green
    ];

    depthColors.forEach((color, index) => {
      const material = new StandardMaterial(`depthMaterial_${index}`, this.scene);
      material.diffuseColor = Color3.FromHexString(color);
      material.specularColor = new Color3(0.3, 0.3, 0.3);
      material.specularPower = 32;
      this.nodeMaterials.set(`depth_${index}`, material);
    });
  }

  /**
   * Wrap text into multiple lines based on maximum width
   */
  private wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const estimatedLineWidth = (currentLine.length + word.length) * (fontSize / 2);

      if (currentLine.length === 0) {
        currentLine = word;
      } else if (estimatedLineWidth < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Create or update a node in the scene using ClusterManager
   */
  public createNode(node: ClusterNode, clusterNodeId: number): Mesh {
    // Delegate to ClusterManager for node creation
    return this.clusterManager.addNodeToCluster(node, clusterNodeId);
  }

  /**
   * Create a link between two nodes using ClusterManager
   */
  public createLink(parentNode: ClusterNode, childNode: ClusterNode, clusterNodeId: number): Mesh {
    // Delegate to ClusterManager for link creation
    return this.clusterManager.addLinkToCluster(parentNode, childNode, clusterNodeId);
  }

  /**
   * Show a cluster (make all its nodes and links visible)
   */
  public showCluster(clusterNodeId: number): void {
    this.clusterManager.showCluster(clusterNodeId);
    this.showBillboardsForCluster(clusterNodeId);
  }

  /**
   * Hide a cluster (make all its nodes and links invisible)
   */
  public hideCluster(clusterNodeId: number): void {
    this.clusterManager.hideCluster(clusterNodeId);
    this.hideBillboardsForCluster(clusterNodeId);
  }

  /**
   * Clean up unused nodes and links
   */
  public cleanupUnusedResources(): void {
    this.clusterManager.cleanupUnusedNodes();
    this.clusterManager.cleanupUnusedLinks();
  }

  /**
   * Get a node mesh by ID
   */
  public getNode(nodeId: number): Mesh | undefined {
    return this.clusterManager.getNodeMesh(nodeId);
  }

  /**
   * Get all node meshes
   */
  public getAllNodes(): Map<number, Mesh> {
    // Return a copy of the master node map
    const allNodes = this.clusterManager.getAllNodes();
    return allNodes ? new Map(allNodes) : new Map();
  }

  /**
   * Remove a node from the scene
   */
  public removeNode(nodeId: number): void {
    // Note: In the new architecture, nodes are managed by ClusterManager
    // and are automatically cleaned up when not in visible clusters
    // This method is kept for backward compatibility
  }

  /**
   * Remove all nodes from the scene
   */
  public clearAllNodes(): void {
    this.clusterManager.clearAll();
    this.clearAllBillboards();
  }

  /**
   * Create a billboard label for a node (public method for external access)
   */
  public createBillboardForNode(nodeId: number, node: ClusterNode, clusterNodeId?: number): void {
    // Get the node mesh from the specific cluster context if provided
    const nodeMesh = clusterNodeId !== undefined
      ? this.clusterManager.getNodeMeshFromCluster(nodeId, clusterNodeId)
      : this.clusterManager.getNodeMesh(nodeId);

    if (!nodeMesh) {
      console.warn(`[NODEMANAGER] Cannot create billboard for node ${nodeId}: mesh not found in cluster ${clusterNodeId}`);
      return;
    }

    // If billboard already exists, update its position for the new cluster context
    const existingBillboard = this.nodeBillboards.get(nodeId);
    if (existingBillboard) {
      // Update billboard parent and position to match current node mesh from this cluster
      if (nodeMesh.parent) {
        existingBillboard.setParent(nodeMesh.parent);
      }
      const labelPosition = this.calculateBillboardPosition(node, nodeMesh);
      existingBillboard.position = labelPosition;
      console.log(`[NODEMANAGER] Updated billboard position for node ${nodeId} in cluster ${clusterNodeId} to (${labelPosition.x.toFixed(2)}, ${labelPosition.y.toFixed(2)}, ${labelPosition.z.toFixed(2)})`);
      return;
    }

    this.createBillboardLabel(node, nodeMesh, clusterNodeId);
    console.log(`[NODEMANAGER] Created billboard for node ${nodeId} (${node.label}) in cluster ${clusterNodeId}`);
  }

  /**
   * Create a billboard label for a node
   */
  private createBillboardLabel(node: ClusterNode, nodeMesh: Mesh, clusterNodeId?: number): void {
    const maxLineWidth = 405;
    const fontSize = 48;
    let displayText = node.label;
    if (node.is_leaf) {
      displayText =  '🌐 ' + displayText;
    } else {
      displayText = '✳️ ' + displayText;
    }
    const textLines = this.wrapText(displayText, maxLineWidth, fontSize);

    const lineHeight3D = 0.30;
    const billboardHeight = Math.max(0.5, textLines.length * lineHeight3D);
    const billboardWidth = 3.0;

    const billboard = MeshBuilder.CreatePlane(
      `billboard_${node.id}`,
      { size: 1, width: billboardWidth, height: billboardHeight },
      this.scene
    );

    // Parent billboard to the same parent as the node mesh (cluster container)
    // This ensures billboards move with their cluster
    if (nodeMesh.parent) {
      billboard.setParent(nodeMesh.parent);
    }

    // Calculate position relative to the node in local space
    const labelPosition = this.calculateBillboardPosition(node, nodeMesh);
    billboard.position = labelPosition;
    billboard.billboardMode = Mesh.BILLBOARDMODE_ALL;
    billboard.isPickable = true;

    const textureSize = 512;
    const lineHeight = fontSize * 1.15;
    const textureHeight = Math.max(128, textLines.length * lineHeight + 50);
    const dynamicTexture = new DynamicTexture(
      `label_texture_${node.id}`,
      { width: textureSize, height: textureHeight },
      this.scene,
      false,
      DynamicTexture.TRILINEAR_SAMPLINGMODE
    );

    dynamicTexture.hasAlpha = true;
    const ctx = dynamicTexture.getContext();

    const padding = 20;
    const bgWidth = textureSize - (padding * 2);
    const bgHeight = textureHeight - (padding * 2);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const cornerRadius = 10;
    ctx.beginPath();
    ctx.moveTo(padding + cornerRadius, padding);
    ctx.lineTo(padding + bgWidth - cornerRadius, padding);
    ctx.quadraticCurveTo(padding + bgWidth, padding, padding + bgWidth, padding + cornerRadius);
    ctx.lineTo(padding + bgWidth, padding + bgHeight - cornerRadius);
    ctx.quadraticCurveTo(padding + bgWidth, padding + bgHeight, padding + bgWidth - cornerRadius, padding + bgHeight);
    ctx.lineTo(padding + cornerRadius, padding + bgHeight);
    ctx.quadraticCurveTo(padding, padding + bgHeight, padding, padding + bgHeight - cornerRadius);
    ctx.lineTo(padding, padding + cornerRadius);
    ctx.quadraticCurveTo(padding, padding, padding + cornerRadius, padding);
    ctx.closePath();
    ctx.fill();

    const yStart = (textureHeight - textLines.length * lineHeight) / 2 + fontSize;
    for (let i = 0; i < textLines.length; i++) {
      const yPos = yStart + i * lineHeight;
      dynamicTexture.drawText(
        textLines[i],
        padding + 10,
        yPos,
        `bold ${fontSize}px Arial`,
        "#FFFFFF",
        null,
        true,
        true
      );
    }

    dynamicTexture.update();

    const billboardMat = new StandardMaterial(`billboard_mat_${node.id}`, this.scene);
    billboardMat.diffuseColor = new Color3(1, 1, 1);
    billboardMat.specularColor = new Color3(0, 0, 0);
    billboardMat.emissiveColor = new Color3(0.8, 0.8, 0.8);
    billboardMat.disableLighting = true;
    billboardMat.backFaceCulling = false;
    billboardMat.useAlphaFromDiffuseTexture = true;
    billboardMat.alphaMode = Engine.ALPHA_COMBINE;
    billboardMat.alpha = 1.0;
    billboardMat.diffuseTexture = dynamicTexture;

    billboard.position.z += 0.5;
    billboardMat.alphaMode = Engine.ALPHA_COMBINE;
    billboardMat.alphaCutOff = 0.3;
    billboard.scaling = new Vector3(1.5, 1.5, 1.5);
    billboard.material = billboardMat;

    this.nodeBillboards.set(node.id, billboard);
    this.billboardMaterials.set(node.id, billboardMat);
  }

  /**
   * Calculate the optimal position for a billboard label
   * Returns position in local space (relative to parent container) since billboard is parented
   */
  private calculateBillboardPosition(node: ClusterNode, nodeMesh: Mesh): Vector3 {
    // Since billboard is parented to the same container as nodeMesh, use local positions
    const defaultPosition = nodeMesh.position.add(new Vector3(0, 0.6, 0));

    if (!node.parent_id || node.parent_id === 0) {
      return defaultPosition;
    }

    const parentNodeMesh = this.clusterManager.getNodeMesh(node.parent_id);
    if (!parentNodeMesh) {
      return defaultPosition;
    }

    // Use local positions since we're in the same coordinate space
    const direction = nodeMesh.position.subtract(parentNodeMesh.position);
    const distance = direction.length();
    const normalizedDirection = distance > 0 ? direction.scale(1 / distance) : new Vector3(0, 1, 0);

    const margin = 1.0;
    const nodeRadius = 0.25; // Fixed radius since all nodes have same size now
    const billboardPosition = nodeMesh.position.add(normalizedDirection.scale(nodeRadius + margin));

    return billboardPosition;
  }

  /**
   * Remove a billboard label
   */
  private removeBillboardLabel(nodeId: number): void {
    const billboard = this.nodeBillboards.get(nodeId);
    if (billboard) {
      billboard.dispose();
      this.nodeBillboards.delete(nodeId);
    }

    const material = this.billboardMaterials.get(nodeId);
    if (material) {
      material.dispose();
      this.billboardMaterials.delete(nodeId);
    }
  }

  /**
   * Remove all billboard labels
   */
  public clearAllBillboards(): void {
    this.nodeBillboards.forEach((billboard, nodeId) => {
      billboard.dispose();
    });
    this.nodeBillboards.clear();

    this.billboardMaterials.forEach((material, nodeId) => {
      material.dispose();
    });
    this.billboardMaterials.clear();
  }

  /**
   * Clean up billboards for nodes that are not in any visible cluster
   */
  public cleanupUnusedBillboards(): void {
    const visibleClusters = this.clusterManager.getVisibleClusters();
    // console.log(`[NODEMANAGER] DEBUG: Cleanup check - Visible clusters:`, Array.from(visibleClusters));
    const usedNodeIds = new Set<number>();

    // Collect all node IDs from visible clusters
    visibleClusters.forEach(clusterNodeId => {
      const nodeIds = this.clusterManager.getNodesInCluster(clusterNodeId);
      // console.log(`[NODEMANAGER] DEBUG: Nodes in visible cluster ${clusterNodeId}:`, nodeIds ? Array.from(nodeIds) : 'none');
      if (nodeIds) {
        nodeIds.forEach(nodeId => usedNodeIds.add(nodeId));
      }
    });

    // console.log(`[NODEMANAGER] DEBUG: Total billboards before cleanup:`, this.nodeBillboards.size);
    // console.log(`[NODEMANAGER] DEBUG: Used node IDs for billboards:`, Array.from(usedNodeIds));

    // Remove billboards for nodes not in any visible cluster
    const billboardsToRemove: number[] = [];
    this.nodeBillboards.forEach((billboard, nodeId) => {
      if (!usedNodeIds.has(nodeId)) {
        // console.log(`[NODEMANAGER] DEBUG: Billboard ${nodeId} marked for removal, enabled:`, billboard.isEnabled());
        billboardsToRemove.push(nodeId);
      }
    });

    billboardsToRemove.forEach(nodeId => {
      this.removeBillboardLabel(nodeId);
    });

    // if (billboardsToRemove.length > 0) {
    //   console.log(`[NODEMANAGER] DEBUG: Cleaned up ${billboardsToRemove.length} unused billboards`);
    // }
    // console.log(`[NODEMANAGER] DEBUG: Total billboards after cleanup:`, this.nodeBillboards.size);
  }

  /**
   * Update all billboard positions to match current node positions
   * This should be called after node movement/positioning is complete
   */
  public updateAllBillboardPositions(): void {
    if (!dataStore.state.showBillboards) {
      console.log(`[NODEMANAGER] Skipping billboard position update - billboards are disabled`);
      return;
    }

    let updatedCount = 0;
    const visibleClusters = this.clusterManager.getVisibleClusters();

    this.nodeBillboards.forEach((billboard, nodeId) => {
      // Find the cluster where this node is currently visible
      let foundInCluster = false;

      for (const clusterNodeId of visibleClusters) {
        const nodesInCluster = this.clusterManager.getNodesInCluster(clusterNodeId);
        if (nodesInCluster && nodesInCluster.has(nodeId)) {
          const nodeMesh = this.clusterManager.getNodeMeshFromCluster(nodeId, clusterNodeId);
          if (nodeMesh) {
            const nodePromise = dataStore.getNodeById(dataStore.state.currentNamespace!, nodeId);
            nodePromise.then((node) => {
              if (node) {
                const labelPosition = this.calculateBillboardPosition(node, nodeMesh);
                billboard.position = labelPosition;
                console.debug(`[NODEMANAGER] Updated billboard position for node ${nodeId} in cluster ${clusterNodeId} to (${labelPosition.x.toFixed(2)}, ${labelPosition.y.toFixed(2)}, ${labelPosition.z.toFixed(2)})`);
                updatedCount++;
                foundInCluster = true;
              }
            });
          }
        }
      }

      if (!foundInCluster) {
        console.debug(`[NODEMANAGER] Billboard for node ${nodeId} not found in any visible cluster`);
      }
    });

    console.log(`[NODEMANAGER] Updated positions for ${updatedCount} billboards`);
  }

  /**
   * Show billboards for nodes in a cluster
   */
  public showBillboardsForCluster(clusterNodeId: number): void {
    // Only show billboards if the global flag is enabled
    if (!dataStore.state.showBillboards) {
      console.log(`[NODEMANAGER] Billboards disabled globally, skipping cluster ${clusterNodeId}`);
      return;
    }

    const nodeIds = this.clusterManager.getNodesInCluster(clusterNodeId);
    if (!nodeIds) return;

    nodeIds.forEach(nodeId => {
      const billboard = this.nodeBillboards.get(nodeId);
      if (billboard) {
        // Update billboard position when showing it to ensure it's correctly positioned
        const nodeMesh = this.clusterManager.getNodeMeshFromCluster(nodeId, clusterNodeId);
        if (nodeMesh && dataStore.state.currentNamespace != null) {
          const nodePromise = dataStore.getNodeById(dataStore.state.currentNamespace!, nodeId);
          nodePromise.then((node) => {
              if (node) {
                const labelPosition = this.calculateBillboardPosition(node, nodeMesh);
                billboard.position = labelPosition;
                console.log(`[NODEMANAGER] Updated billboard position for node ${nodeId} in cluster ${clusterNodeId} to (${labelPosition.x.toFixed(2)}, ${labelPosition.y.toFixed(2)}, ${labelPosition.z.toFixed(2)})`);
              }
            }
          );
        }
        billboard.setEnabled(true);
      }
    });
    console.log(`[NODEMANAGER] Enabled billboards for cluster ${clusterNodeId}`);
  }

  /**
   * Hide billboards for nodes in a cluster
   */
  public hideBillboardsForCluster(clusterNodeId: number): void {
    const nodeIds = this.clusterManager.getNodesInCluster(clusterNodeId);
    console.log(`[NODEMANAGER] DEBUG: Hiding billboards for cluster ${clusterNodeId}, nodes:`, nodeIds ? Array.from(nodeIds) : 'none');
    if (!nodeIds) return;

    let hiddenCount = 0;
    nodeIds.forEach(nodeId => {
      const billboard = this.nodeBillboards.get(nodeId);
      if (billboard) {
        const prevEnabled = billboard.isEnabled();
        billboard.setEnabled(false);
        // console.log(`[NODEMANAGER] DEBUG: Hiding billboard for node ${nodeId}, enabled: ${prevEnabled} -> ${billboard.isEnabled()}`);
        hiddenCount++;
      } else {
        console.warn(`[NODEMANAGER] DEBUG: No billboard found for node ${nodeId}`);
      }
    });
    // console.log(`[NODEMANAGER] DEBUG: Disabled ${hiddenCount} billboards for cluster ${clusterNodeId}`);
  }

  /**
   * Update label visibility based on camera distance (LOD)
   */
  public updateLabelVisibility(camera: ArcRotateCamera, currentNodeId: number): void {
    if (!camera) return;

    // If billboards are globally disabled, hide all and return
    if (!dataStore.state.showBillboards) {
      this.nodeBillboards.forEach((billboard) => {
        billboard.setEnabled(false);
      });
      return;
    }

    const cameraPosition = camera.position;
    const visibleClusters = this.clusterManager.getVisibleClusters();

    this.nodeBillboards.forEach((billboard, nodeId) => {
      const nodeMesh = this.clusterManager.getNodeMesh(nodeId);
      if (!nodeMesh) return;

      // Check if the node belongs to a visible cluster for the current node
      let isInVisibleCluster = false;
      for (const clusterNodeId of visibleClusters) {
        const nodesInCluster = this.clusterManager.getNodesInCluster(clusterNodeId);
        if (nodesInCluster && nodesInCluster.has(nodeId) && currentNodeId == clusterNodeId) {
          isInVisibleCluster = true;
          break;
        }
        // also check if the node is a parent node, i.e. a cluster node id of a visible cluster
        if (clusterNodeId == nodeId) {
          isInVisibleCluster = true;
          break;
        }
      }

      // Only show billboard if node is in a visible cluster
      if (!isInVisibleCluster) {
        billboard.setEnabled(false);
        return;
      }

      // Use absolute position for distance calculation (accounts for transform hierarchy)
      const nodeAbsolutePos = nodeMesh.getAbsolutePosition();
      const distance = Vector3.Distance(cameraPosition, nodeAbsolutePos);

      // Compute label visibility and fade distances based on camera distance
      const label_fade_start = this.LABEL_FADE_START; //camera.radius * 0.8;
      const label_visibility_distance = camera.radius * 1.4;
      // console.debug(`[BILLBOARD_LOD] Billboard: '${billboard.id}'`,
      //   `Camera radius:`, camera.radius,
      //   `, label fade start: `, label_fade_start,
      //   `, label visibility distance: `, label_visibility_distance
      // );

      if (distance > label_visibility_distance) {
        billboard.setEnabled(false);
      } else {
        billboard.setEnabled(true);

        if (distance > label_fade_start) {
          const fadeRange = label_visibility_distance - label_fade_start;
          const fadeAmount = (distance - label_fade_start) / fadeRange;
          const opacity = 1.0 - fadeAmount;

          if (billboard.material) {
            billboard.material.alpha = opacity;
          }
        } else {
          if (billboard.material) {
            billboard.material.alpha = 1.0;
          }
        }
      }
    });
  }

  /**
   * Set the root node ID
   */
  public setRootNodeId(nodeId: number): void {
    this.clusterManager.setRootNodeId(nodeId);
  }

  /**
   * Get the root node ID
   */
  public getRootNodeId(): number | null {
    return this.clusterManager.getRootNodeId();
  }

  /**
   * Check if a cluster is visible
   */
  public isClusterVisible(clusterNodeId: number): boolean {
    return this.clusterManager.isClusterVisible(clusterNodeId);
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    console.log('[CLEANUP] Disposing NodeManager');
    this.clearAllNodes();
    this.nodeMaterials.forEach((material) => {
      material.dispose();
    });
    this.nodeMaterials.clear();

    this.billboardMaterials.forEach((material) => {
      material.dispose();
    });
    this.billboardMaterials.clear();

    this.nodeContainer.dispose();
  }
}