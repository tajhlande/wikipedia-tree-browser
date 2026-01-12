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
  Camera
} from "@babylonjs/core";
import type { ClusterNode } from '../types';

/**
 * Node Manager for WP Embeddings Visualization
 * Handles creation, management, and destruction of 3D nodes
 */
export class NodeManager {
  private scene: Scene;
  private nodeMeshes: Map<number, Mesh> = new Map();
  private nodeMaterials: Map<string, StandardMaterial> = new Map();
  private nodeContainer: TransformNode;

  // Mesh quality settings (adjustable for performance)
  private sphereSegments: number = 16;
  private sphereDiameter: number = 0.5;

  // Scene scaling factor to make the visualization more spread out
  private sceneScale: number = 3.0; // 3x scaling for better visibility

  // Fallback position tracking for nodes without centroids
  private fallbackPositionIndex: number = 0;
  private readonly FALLBACK_RADIUS: number = 10; // Distance from origin
  private readonly FALLBACK_ANGLE_INCREMENT: number = Math.PI / 4; // 45 degree increments

  // Billboard labels for nodes
  private nodeBillboards: Map<number, Mesh> = new Map();

  // LOD (Level of Detail) settings for label visibility
  private readonly LABEL_VISIBILITY_DISTANCE: number = 20; // Show labels when closer than this
  private readonly LABEL_FADE_START: number = 15; // Start fading at this distance

  constructor(scene: Scene) {
    this.scene = scene;
    this.nodeContainer = new TransformNode("nodeContainer", scene);

    // Initialize color materials
    this.initializeMaterials();

    // console.log('[NODE] NodeManager initialized with scene scale:', this.sceneScale);
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

    // Depth-based materials (orange to green gradient)
    const depthColors = [
      '#FF8C00', '#FFA500', '#FFB700', '#FFC900', '#FFD700', // Orange to yellow
      '#E8FF00', '#D0FF00', '#B8FF00', '#A0FF00', '#88FF00', // Yellow to green
      '#70FF00', '#58FF00'  // Green
    ];

    depthColors.forEach((color, index) => {
      const material = new StandardMaterial(`depthMaterial_${index}`, this.scene);
      material.diffuseColor = Color3.FromHexString(color);
      material.specularColor = new Color3(0.3, 0.3, 0.3);
      material.specularPower = 32;
      this.nodeMaterials.set(`depth_${index}`, material);
    });

    // console.log('[NODE] Initialized node materials');
  }


  /**
   * Wrap text into multiple lines based on maximum width
   * @param text The text to wrap
   * @param maxWidth Maximum width in pixels before wrapping
   * @param fontSize Font size in pixels
   * @returns Array of text lines
   */
  private wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      // Estimate if adding this word would exceed max width
      // Approximate: each character is about fontSize/2 pixels wide
      const estimatedLineWidth = (currentLine.length + word.length) * (fontSize / 2);

      if (currentLine.length === 0) {
        // First word in line
        currentLine = word;
      } else if (estimatedLineWidth < maxWidth) {
        // Add to current line
        currentLine += ' ' + word;
      } else {
        // Start new line
        lines.push(currentLine);
        currentLine = word;
      }
    }

    // Add the last line
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Generate a unique fallback position for nodes without centroids
   * Positions nodes in a circle around the origin to prevent overlap
   */
  private getFallbackPosition(): Vector3 {
    // Calculate position on a circle in the X-Z plane (Y=0 for simplicity)
    const angle = this.fallbackPositionIndex * this.FALLBACK_ANGLE_INCREMENT;
    const x = this.FALLBACK_RADIUS * Math.cos(angle);
    const z = this.FALLBACK_RADIUS * Math.sin(angle);

    // Increment index for next fallback position
    this.fallbackPositionIndex++;

    // Add some vertical variation for better visual distinction
    const y = this.fallbackPositionIndex % 2 === 0 ? 1 : -1;

    // Apply scene scaling to fallback positions as well
    return new Vector3(
      x * this.sceneScale,
      y * this.sceneScale,
      z * this.sceneScale
    );
  }

  /**
   * Validate node data before creation
   */
  private validateNode(node: ClusterNode): boolean {
    if (!node || !node.id) {
      console.error('[NODE] Invalid node - missing required fields:', node);
      return false;
    }

    if (node.centroid === undefined) {
      console.warn(`[NODE] Node ${node.id} (${node.label}) is missing centroid data - will use fallback position`);
      return true; // We can still create the node, just use fallback position
    }

    if (!Array.isArray(node.centroid) || node.centroid.length !== 3) {
      console.error(`[NODE] Node ${node.id} (${node.label}) has invalid centroid format:`, node.centroid);
      return false;
    }

    // Check for NaN or Infinite values
    const [x, y, z] = node.centroid;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number' ||
        isNaN(x) || isNaN(y) || isNaN(z) || !isFinite(x) || !isFinite(y) || !isFinite(z)) {
      console.error(`[NODE] Node ${node.id} (${node.label}) has invalid centroid values:`, node.centroid);
      return false;
    }

    return true;
  }

  /**
   * Create or update a node in the scene
   */
  public createNode(node: ClusterNode): Mesh {
    // Validate node data first
    if (!this.validateNode(node)) {
      console.error(`[NODE] Failed validation - cannot create node ${node.id}`);
      throw new Error(`Invalid node data for node ${node.id}`);
    }

    // Check if node already exists
    const existingMesh = this.nodeMeshes.get(node.id);
    if (existingMesh) {
      this.updateNode(existingMesh, node);
      return existingMesh;
    }

    // Create new node mesh
    const nodeMesh = MeshBuilder.CreateSphere(
      `node_${node.id}`,
      {
        segments: this.sphereSegments,
        diameter: this.sphereDiameter
      },
      this.scene
    );

    // Set node properties
    this.updateNode(nodeMesh, node);

    // Parent to container for easier management
    nodeMesh.setParent(this.nodeContainer);

    // Store reference
    this.nodeMeshes.set(node.id, nodeMesh);

    // Create billboard label for the node
    this.createBillboardLabel(node, nodeMesh);

    // console.log(`[NODE] Created node ${node.id} (${node.label}) at depth ${node.depth}`);

    return nodeMesh;
  }

  /**
   * Update an existing node mesh
   */
  private updateNode(mesh: Mesh, node: ClusterNode): void {
    // Position the node using its centroid with scene scaling
    if (node.centroid && Array.isArray(node.centroid) && node.centroid.length === 3) {
      // Validate that all centroid values are valid numbers
      const [x, y, z] = node.centroid;
      if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number' &&
          isFinite(x) && isFinite(y) && isFinite(z)) {
        // Apply scene scaling to make the visualization more spread out
        const scaledX = x * this.sceneScale;
        const scaledY = y * this.sceneScale;
        const scaledZ = z * this.sceneScale;
        mesh.position = new Vector3(scaledX, scaledY, scaledZ);
        // console.log(`[NODE] Original centroid (${x}, ${y}, ${z}) scaled by ${this.sceneScale} -> (${scaledX}, ${scaledY}, ${scaledZ})`);
      } else {
        // Use fallback position for invalid centroid values
        mesh.position = this.getFallbackPosition();
        console.warn(`[NODE] Node ${node.id} has invalid centroid values - using fallback position:`, node.centroid);
      }
    } else if (node.centroid === undefined) {
      // Use fallback position for missing centroid data
      mesh.position = this.getFallbackPosition();
      console.warn(`[NODE] Node ${node.id} is missing centroid data - using fallback position`);
    } else {
      // Use fallback position for malformed centroid data
      mesh.position = this.getFallbackPosition();
      console.warn(`[NODE] Node ${node.id} has malformed centroid - using fallback position:`, node.centroid);
    }

    // Apply appropriate material based on node type
    this.applyNodeMaterial(mesh, node);

    // Enable physics and interactions
    mesh.isPickable = true;
    mesh.checkCollisions = true;
  }

  /**
   * Apply material to node based on its type and depth
   */
  private applyNodeMaterial(mesh: Mesh, node: ClusterNode): void {
    let materialKey: string;

    if (node.depth === 0) {
      // Root node
      materialKey = 'root';
    } else if (node.is_leaf) {
      // Leaf node
      materialKey = 'leaf';
    } else {
      // Non-leaf, non-root node - use depth-based color
      // Clamp depth to available materials
      const depthIndex = Math.min(Math.max(0, node.depth - 1), 11); // 0-11 for 12 depth levels
      materialKey = `depth_${depthIndex}`;
    }

    const material = this.nodeMaterials.get(materialKey);
    if (material) {
      mesh.material = material;
    } else {
      console.error(`[NODE] No material found for key: ${materialKey}`);
      // Fallback to default material
      const fallbackMaterial = new StandardMaterial(`fallback_${node.id}`, this.scene);
      fallbackMaterial.diffuseColor = new Color3(0.8, 0.8, 0.8); // Gray
      mesh.material = fallbackMaterial;
    }
  }

  /**
   * Remove a node from the scene
   */
  public removeNode(nodeId: number): void {
    const mesh = this.nodeMeshes.get(nodeId);
    if (mesh) {
      mesh.dispose();
      this.nodeMeshes.delete(nodeId);
      // console.log(`[NODE] Removed node ${nodeId}`);
    }
  }

  /**
   * Remove all nodes from the scene
   */
  public clearAllNodes(): void {
    this.nodeMeshes.forEach((mesh, nodeId) => {
      mesh.dispose();
    });
    this.nodeMeshes.clear();

    // Also clear billboards when clearing nodes
    this.clearAllBillboards();

    // console.log('[NODE] Cleared all nodes and billboards');
  }

  /**
   * Get a node mesh by ID
   */
  public getNode(nodeId: number): Mesh | undefined {
    return this.nodeMeshes.get(nodeId);
  }

  /**
   * Get all node meshes
   */
  public getAllNodes(): Map<number, Mesh> {
    return this.nodeMeshes;
  }

  /**
   * Set mesh quality settings
   */
  public setMeshQuality(segments: number, diameter: number): void {
    this.sphereSegments = segments;
    this.sphereDiameter = diameter;
    // console.log(`[NODE] Updated mesh quality: segments=${segments}, diameter=${diameter}`);
  }

  /**
   * Get current mesh quality settings
   */
  public getMeshQuality(): { segments: number; diameter: number } {
    return {
      segments: this.sphereSegments,
      diameter: this.sphereDiameter
    };
  }

  /**
   * Set scene scaling factor
   * @param scale The scaling factor to apply to node positions
   */
  public setSceneScale(scale: number): void {
    this.sceneScale = scale;
    // console.log(`[NODE] Updated scene scale to ${scale}x`);
  }

  /**
   * Get current scene scale
   */
  public getSceneScale(): number {
    return this.sceneScale;
  }

  /**
   * Create a billboard label for a node
   */
  private createBillboardLabel(node: ClusterNode, nodeMesh: Mesh): void {
    // Wrap the label text into multiple lines if needed
    // Allow about 3 words per line (increase max width)
    const maxLineWidth = 450; // pixels (was 300, now allows ~3 words per line)
    const fontSize = 48;
    const textLines = this.wrapText(node.label, maxLineWidth, fontSize);

    // Adjust height based on number of text lines
    // Use consistent line spacing: 0.15 3D units per line
    const lineHeight3D = 0.30; // 3D units per line
    const billboardHeight = Math.max(0.5, textLines.length * lineHeight3D);

    // Double the width for better readability (was 1.5, now 3.0)
    const billboardWidth = 3.0;

    // Create a plane that will serve as the billboard
    const billboard = MeshBuilder.CreatePlane(
      `billboard_${node.id}`,
      { size: 1, width: billboardWidth, height: billboardHeight }, // Consistent width, variable height
      this.scene
    );

    // Position the billboard along the link vector with margin
    // For root node or nodes without parent, use default positioning
    const labelPosition = this.calculateBillboardPosition(node, nodeMesh);
    billboard.position = labelPosition;

    // Make it always face the camera (billboard behavior)
    billboard.billboardMode = Mesh.BILLBOARDMODE_ALL;

    // Create dynamic texture for the label text with consistent sizing
    const textureSize = 512;
    const lineHeight = fontSize * 1.15; // 1.15 line spacing in pixels
    const textureHeight = Math.max(128, textLines.length * lineHeight + 50);
    const dynamicTexture = new DynamicTexture(
      `label_texture_${node.id}`,
      { width: textureSize, height: textureHeight },
      this.scene,
      false,
      DynamicTexture.TRILINEAR_SAMPLINGMODE
    );

    // Set up text properties for consistent rendering
    dynamicTexture.hasAlpha = true;

    // Get the 2D context to draw background
    const ctx = dynamicTexture.getContext();

    // HIGH PRIORITY IMPROVEMENT #1: Add semi-transparent background
    // Calculate background rectangle dimensions with padding
    const padding = 20; // pixels
    const bgWidth = textureSize - (padding * 2);
    const bgHeight = textureHeight - (padding * 2);

    // Draw rounded rectangle background with semi-transparent dark color
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent black background
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

    // Draw each line of text with consistent rendering
    const yStart = (textureHeight - textLines.length * lineHeight) / 2 + fontSize;
    for (let i = 0; i < textLines.length; i++) {
      const yPos = yStart + i * lineHeight;
      dynamicTexture.drawText(
        textLines[i],
        padding + 10, //textureSize / 2, // x position (centered)
        yPos, // y position
        `bold ${fontSize}px Arial`,
        "#FFFFFF", // White color for better contrast against dark background
        null, // No background (we already drew it)
        true, // invertY
        true // center horizontally
      );
    }

    // Force texture update to ensure consistency
    dynamicTexture.update();

    // Create a unique material for this billboard (each needs its own texture)
    const billboardMat = new StandardMaterial(`billboard_mat_${node.id}`, this.scene);
    billboardMat.diffuseColor = new Color3(1, 1, 1); // White
    billboardMat.specularColor = new Color3(0, 0, 0); // No specular
    billboardMat.emissiveColor = new Color3(0.8, 0.8, 0.8); // Slight glow
    billboardMat.disableLighting = true; // Not affected by lighting
    billboardMat.backFaceCulling = false;
    billboardMat.useAlphaFromDiffuseTexture = true; // Enable transparency
    billboardMat.diffuseTexture = dynamicTexture;
    billboard.material = billboardMat;

    // Store reference for later management
    this.nodeBillboards.set(node.id, billboard);

    // console.log(`[NODE] Created text billboard label for node ${node.id}: "${node.label}"`);
  }

  /**
   * Calculate the optimal position for a billboard label
   * Position is colinear with the link vector, past the child node by a margin
   */
  private calculateBillboardPosition(node: ClusterNode, nodeMesh: Mesh): Vector3 {
    // Default position (above node) for root nodes or nodes without parents
    const defaultPosition = nodeMesh.position.add(new Vector3(0, 0.6, 0));

    // If this is the root node or has no parent, use default positioning
    if (!node.parent_id || node.parent_id === 0) {
      return defaultPosition;
    }

    // Get parent node position
    const parentNodeMesh = this.nodeMeshes.get(node.parent_id);
    if (!parentNodeMesh) {
      console.warn(`[NODE] Parent node ${node.parent_id} not found for billboard positioning`);
      return defaultPosition;
    }

    // Calculate direction vector from parent to child
    const direction = nodeMesh.position.subtract(parentNodeMesh.position);
    const distance = direction.length();

    // Normalize direction vector
    const normalizedDirection = distance > 0 ? direction.scale(1 / distance) : new Vector3(0, 1, 0);

    // Position billboard along the link vector, past the child node by margin
    // HIGH PRIORITY IMPROVEMENT #3: Increase margin for better separation
    const margin = 1.0; // Increased from 0.4 to 1.0 for better label spacing
    const nodeRadius = this.sphereDiameter / 2;
    const billboardPosition = nodeMesh.position.add(normalizedDirection.scale(nodeRadius + margin));

    // console.log(`[NODE] Positioning billboard for node ${node.id} at (${billboardPosition.x}, ${billboardPosition.y}, ${billboardPosition.z})`);
    // console.log(`[NODE] Direction from parent to child: (${normalizedDirection.x}, ${normalizedDirection.y}, ${normalizedDirection.z})`);

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
      // console.log(`[NODE] Removed billboard label for node ${nodeId}`);
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
    // console.log('[NODE] Cleared all billboard labels');
  }

  /**
   * Update label visibility based on camera distance (LOD)
   * HIGH PRIORITY IMPROVEMENT #2: Implement distance-based label visibility
   */
  public updateLabelVisibility(camera: Camera): void {
    if (!camera) return;

    const cameraPosition = camera.position;

    this.nodeBillboards.forEach((billboard, nodeId) => {
      const nodeMesh = this.nodeMeshes.get(nodeId);
      if (!nodeMesh) return;

      // Calculate distance from camera to node
      const distance = Vector3.Distance(cameraPosition, nodeMesh.position);

      // Show/hide based on distance threshold
      if (distance > this.LABEL_VISIBILITY_DISTANCE) {
        billboard.setEnabled(false);
      } else {
        billboard.setEnabled(true);

        // Fade labels between LABEL_FADE_START and LABEL_VISIBILITY_DISTANCE
        if (distance > this.LABEL_FADE_START) {
          const fadeRange = this.LABEL_VISIBILITY_DISTANCE - this.LABEL_FADE_START;
          const fadeAmount = (distance - this.LABEL_FADE_START) / fadeRange;
          const opacity = 1.0 - fadeAmount;

          // Update material alpha
          if (billboard.material) {
            billboard.material.alpha = opacity;
          }
        } else {
          // Full opacity when closer than fade start distance
          if (billboard.material) {
            billboard.material.alpha = 1.0;
          }
        }
      }
    });
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

    this.nodeContainer.dispose();
    // console.log('[NODE] NodeManager disposed');
  }
}