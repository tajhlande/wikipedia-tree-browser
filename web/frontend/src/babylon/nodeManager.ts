import {
  Scene,
  Mesh,
  StandardMaterial,
  Color3,
  Color4,
  Vector3,
  MeshBuilder,
  TransformNode,
  DynamicTexture,
  Camera,
  Engine
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

  // LOD (Level of Detail) settings for label visibility
  private readonly LABEL_VISIBILITY_DISTANCE: number = 20;
  private readonly LABEL_FADE_START: number = 15;

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
    const nodeMesh = this.clusterManager.getNodeMesh(nodeId);
    if (!nodeMesh) {
      console.warn(`[NODEMANAGER] Cannot create billboard for node ${nodeId}: mesh not found`);
      return;
    }

    // Check if billboard already exists
    if (this.nodeBillboards.has(nodeId)) {
      console.log(`[NODEMANAGER] Billboard for node ${nodeId} already exists, skipping`);
      return;
    }

    this.createBillboardLabel(node, nodeMesh, clusterNodeId);
    console.log(`[NODEMANAGER] Created billboard for node ${nodeId} (${node.label})`);
  }

  /**
   * Create a billboard label for a node
   */
  private createBillboardLabel(node: ClusterNode, nodeMesh: Mesh, clusterNodeId?: number): void {
    const maxLineWidth = 450;
    const fontSize = 48;
    const textLines = this.wrapText(node.label, maxLineWidth, fontSize);

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
    if (!nodeIds) return;

    nodeIds.forEach(nodeId => {
      const billboard = this.nodeBillboards.get(nodeId);
      if (billboard) {
        billboard.setEnabled(false);
      }
    });
    console.log(`[NODEMANAGER] Disabled billboards for cluster ${clusterNodeId}`);
  }

  /**
   * Update label visibility based on camera distance (LOD)
   */
  public updateLabelVisibility(camera: Camera): void {
    if (!camera) return;

    // If billboards are globally disabled, hide all and return
    if (!dataStore.state.showBillboards) {
      this.nodeBillboards.forEach((billboard) => {
        billboard.setEnabled(false);
      });
      return;
    }

    const cameraPosition = camera.position;

    this.nodeBillboards.forEach((billboard, nodeId) => {
      const nodeMesh = this.clusterManager.getNodeMesh(nodeId);
      if (!nodeMesh) return;

      // Use absolute position for distance calculation (accounts for transform hierarchy)
      const nodeAbsolutePos = nodeMesh.getAbsolutePosition();
      const distance = Vector3.Distance(cameraPosition, nodeAbsolutePos);

      if (distance > this.LABEL_VISIBILITY_DISTANCE) {
        billboard.setEnabled(false);
      } else {
        billboard.setEnabled(true);

        if (distance > this.LABEL_FADE_START) {
          const fadeRange = this.LABEL_VISIBILITY_DISTANCE - this.LABEL_FADE_START;
          const fadeAmount = (distance - this.LABEL_FADE_START) / fadeRange;
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