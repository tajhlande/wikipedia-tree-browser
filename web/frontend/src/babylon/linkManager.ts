import {
  Scene,
  Mesh,
  StandardMaterial,
  Color3,
  Vector3,
  MeshBuilder,
  TransformNode,
  Quaternion,
  Matrix
} from "@babylonjs/core";
import type { ClusterNode } from '../types';
import { ANCESTOR_VISUALIZATION } from '../types';

/**
 * Link Manager for WP Embeddings Visualization
 * Handles creation, management, and destruction of 3D links between nodes
 */
export class LinkManager {
  private scene: Scene;
  private linkMeshes: Map<string, Mesh> = new Map();
  private linkMaterial: StandardMaterial;
  private linkContainer: TransformNode;

  // Reference to node manager for positioning adjustments
  private nodeManager: any = null;

  // Link quality settings (adjustable for performance)
  private linkSegments: number = 8;
  private linkThickness: number = 0.1;
  private linkEndOffset: number = 0.23; // Terminate within sphere radius (slightly less than sphere radius of 0.25)

  // Scene scaling factor to match node scaling
  private sceneScale: number = 3.0; // Should match the scale used in NodeManager

  constructor(scene: Scene) {
    this.scene = scene;
    this.linkContainer = new TransformNode("linkContainer", scene);

    // Initialize link material
    this.linkMaterial = new StandardMaterial("linkMaterial", this.scene);
    this.linkMaterial.diffuseColor = new Color3(0.7, 0.7, 0.7); // Gray
    this.linkMaterial.specularColor = new Color3(0.3, 0.3, 0.3);
    this.linkMaterial.specularPower = 16;

    // console.log('[LINK] LinkManager initialized');
  }


  /**
   * Create a link between two nodes
   */
  public createLink(parentNode: ClusterNode, childNode: ClusterNode, isExtended: boolean = false): Mesh {
    const linkKey = this.getLinkKey(parentNode.id, childNode.id);

    // console.log(`[LINK] Creating ${isExtended ? 'extended ' : ''}link from node ${parentNode.id} to node ${childNode.id}`);

    // Check if link already exists
    const existingLink = this.linkMeshes.get(linkKey);
    if (existingLink) {
      // console.log(`[LINK] Updating existing link`);
      this.updateLink(existingLink, parentNode, childNode, isExtended);
      return existingLink;
    }

    // Create link mesh
    const linkMesh = this.createLinkMesh(parentNode, childNode, isExtended);

    // Parent to container for easier management
    linkMesh.setParent(this.linkContainer);

    // Store reference
    this.linkMeshes.set(linkKey, linkMesh);

    // console.log(`[LINK] Created ${isExtended ? 'extended ' : ''}link from node ${parentNode.id} to node ${childNode.id}`);

    return linkMesh;
  }

  /**
   * Create the actual link mesh between two nodes
   */
  private createLinkMesh(parentNode: ClusterNode, childNode: ClusterNode, isExtended: boolean = false): Mesh {
    // Calculate positions from centroids
    const parentPosition = this.getNodePosition(parentNode);
    const childPosition = this.getNodePosition(childNode);

    // Calculate direction vector
    const direction = childPosition.subtract(parentPosition);
    const distance = direction.length();

    // The actual distance between nodes (already accounts for any repositioning done in scene)
    const finalDistance = distance;

    // console.log(`[LINK] Using direct center-to-center link with length: ${finalDistance}`);

    // Create cylinder for the link
    // console.log(`[LINK] Creating cylinder with height=${finalDistance}, diameter=${this.linkThickness}`);
    const linkMesh = MeshBuilder.CreateCylinder(
      `link_${parentNode.id}_${childNode.id}`,
      {
        height: finalDistance,
        diameter: this.linkThickness,
        tessellation: this.linkSegments
      },
      this.scene
    );

    // Check if cylinder was created successfully
    if (!linkMesh) {
      console.error(`[LINK] Failed to create cylinder for link between ${parentNode.id} and ${childNode.id}`);
      throw new Error(`Failed to create link cylinder`);
    }

    // console.log(`[LINK] Successfully created cylinder mesh`);

    // Position and rotate the link
    this.positionLink(linkMesh, parentPosition, childPosition, direction, finalDistance, parentNode, childNode, isExtended);

    // Apply material with opacity for extended links
    linkMesh.material = this.linkMaterial;
    if (isExtended) {
      this.linkMaterial.alpha = ANCESTOR_VISUALIZATION.ANCESTOR_LINK_OPACITY;
    } else {
      this.linkMaterial.alpha = 1.0;
    }

    // Enable physics
    linkMesh.checkCollisions = true;
    linkMesh.isPickable = false; // Links shouldn't be pickable

    return linkMesh;
  }

  /**
   * Position the link between two nodes
   */
  private positionLink(
    linkMesh: Mesh,
    parentPosition: Vector3,
    childPosition: Vector3,
    direction: Vector3,
    finalDistance: number,
    parentNode: ClusterNode,
    childNode: ClusterNode,
    isExtended: boolean = false
  ): void {
    // Calculate midpoint for link position
    // Note: For extended links, we use the finalDistance (which is already multiplied)
    // but position is still centered between the actual node positions
    const midpoint = parentPosition.add(childPosition).scale(0.5);
    linkMesh.position = midpoint;

    // Calculate the correct rotation to align the link with the direction
    // Babylon.js cylinders are oriented along Y-axis by default, so we need to rotate them
    const linkDirection = childPosition.subtract(parentPosition).normalize();

    // Debug: Log the positions and direction
    // console.log(`[LINK] Positioning ${isExtended ? 'extended ' : ''}link from ${parentNode.id} to ${childNode.id}`);
    // console.log(`[LINK] Parent position: (${parentPosition.x}, ${parentPosition.y}, ${parentPosition.z})`);
    // console.log(`[LINK] Child position: (${childPosition.x}, ${childPosition.y}, ${childPosition.z})`);
    // console.log(`[LINK] Link direction: (${linkDirection.x}, ${linkDirection.y}, ${linkDirection.z})`);
    // console.log(`[LINK] Midpoint: (${midpoint.x}, ${midpoint.y}, ${midpoint.z})`);

    // WORKING APPROACH: Use Euler angles with proper cylinder orientation
    // Babylon.js cylinders have their height along the Y-axis by default

    // Calculate the angle between the Y axis and the link direction
    const angle = Math.acos(Vector3.Dot(Vector3.Up(), linkDirection));

    // Calculate rotation axis (cross product of Y axis and direction)
    const rotationAxis = Vector3.Cross(Vector3.Up(), linkDirection);

    if (rotationAxis.length() > 0.001) {
      rotationAxis.normalize();

      // Create and apply rotation quaternion
      const rotationQuaternion = Quaternion.RotationAxis(rotationAxis, angle);
      linkMesh.rotationQuaternion = rotationQuaternion;

      // console.log(`[LINK] Applied rotation: angle=${angle}, axis=(${rotationAxis.x}, ${rotationAxis.y}, ${rotationAxis.z})`);
      // console.log(`[LINK] Link should now point from (${parentPosition.x}, ${parentPosition.y}, ${parentPosition.z}) to (${childPosition.x}, ${childPosition.y}, ${childPosition.z})`);
    } else {
      // Direction is straight up - no rotation needed
      linkMesh.rotation = Vector3.Zero();
      // console.log(`[LINK] No rotation needed - link is vertical`);
    }
  }

  /**
   * Update an existing link
   */
  private updateLink(linkMesh: Mesh, parentNode: ClusterNode, childNode: ClusterNode, isExtended: boolean = false): void {
    const parentPosition = this.getNodePosition(parentNode);
    const childPosition = this.getNodePosition(childNode);
    const direction = childPosition.subtract(parentPosition);
    const distance = direction.length();

    // Use direct distance for simplicity
    const finalDistance = isExtended ? distance * ANCESTOR_VISUALIZATION.EXTENDED_LINK_LENGTH_MULTIPLIER : distance;

    // Update link dimensions
    if (linkMesh instanceof Mesh && linkMesh.getClassName() === 'Cylinder') {
      (linkMesh as any).scaling.y = finalDistance / this.linkThickness; // Adjust height
    }

    // Update link position and rotation
    this.positionLink(linkMesh, parentPosition, childPosition, direction, finalDistance, parentNode, childNode, isExtended);
  }

  /**
   * Get node position as Vector3
   */
  private getNodePosition(node: ClusterNode): Vector3 {
    if (this.nodeManager) {
      // Get the actual mesh position from node manager to account for relative positioning
      const nodeMesh = this.nodeManager.getNode(node.id);
      if (nodeMesh) {
        return nodeMesh.position;
      }
    }
    
    // Fallback: use centroid if node mesh not found
    if (node.centroid && node.centroid.length === 3) {
      return new Vector3(
        node.centroid[0] * this.sceneScale,
        node.centroid[1] * this.sceneScale,
        node.centroid[2] * this.sceneScale
      );
    }
    return Vector3.Zero();
  }

  /**
   * Generate unique key for a link
   */
  private getLinkKey(parentId: number, childId: number): string {
    return `link_${parentId}_${childId}`;
  }

  /**
   * Remove a specific link
   */
  public removeLink(parentId: number, childId: number): void {
    const linkKey = this.getLinkKey(parentId, childId);
    const linkMesh = this.linkMeshes.get(linkKey);
    if (linkMesh) {
      linkMesh.dispose();
      this.linkMeshes.delete(linkKey);
      // console.log(`[LINK] Removed link from node ${parentId} to node ${childId}`);
    }
  }

  /**
   * Remove all links from a specific parent node
   */
  public removeLinksFromParent(parentId: number): void {
    const linksToRemove: string[] = [];

    this.linkMeshes.forEach((linkMesh, linkKey) => {
      if (linkKey.startsWith(`link_${parentId}_`)) {
        linkMesh.dispose();
        linksToRemove.push(linkKey);
      }
    });

    linksToRemove.forEach(linkKey => {
      this.linkMeshes.delete(linkKey);
    });

    // console.log(`[LINK] Removed ${linksToRemove.length} links from parent node ${parentId}`);
  }

  /**
   * Remove all links to a specific child node
   */
  public removeLinksToChild(childId: number): void {
    const linksToRemove: string[] = [];

    this.linkMeshes.forEach((linkMesh, linkKey) => {
      if (linkKey.endsWith(`_${childId}`)) {
        linkMesh.dispose();
        linksToRemove.push(linkKey);
      }
    });

    linksToRemove.forEach(linkKey => {
      this.linkMeshes.delete(linkKey);
    });

    // console.log(`[LINK] Removed ${linksToRemove.length} links to child node ${childId}`);
  }

  /**
   * Remove all links from the scene
   */
  public clearAllLinks(): void {
    this.linkMeshes.forEach((linkMesh) => {
      linkMesh.dispose();
    });
    this.linkMeshes.clear();
    console.log('[LINK] Cleared all links');
  }

  /**
   * Get a link mesh by parent and child IDs
   */
  public getLink(parentId: number, childId: number): Mesh | undefined {
    const linkKey = this.getLinkKey(parentId, childId);
    return this.linkMeshes.get(linkKey);
  }

  /**
   * Get all link meshes
   */
  public getAllLinks(): Map<string, Mesh> {
    return this.linkMeshes;
  }

  /**
   * Set link quality settings
   */
  public setLinkQuality(segments: number, thickness: number, endOffset: number): void {
    this.linkSegments = segments;
    this.linkThickness = thickness;
    this.linkEndOffset = endOffset;
    // console.log(`[LINK] Updated link quality: segments=${segments}, thickness=${thickness}, endOffset=${endOffset}`);
  }

  /**
   * Set node manager reference for positioning adjustments
   */
  public setNodeManager(nodeManager: any): void {
    this.nodeManager = nodeManager;
    // console.log(`[LINK] Set node manager reference`);
  }

  /**
   * Set scene scaling factor to match node scaling
   * @param scale The scaling factor to apply (should match NodeManager)
   */
  public setSceneScale(scale: number): void {
    this.sceneScale = scale;
    // console.log(`[LINK] Updated scene scale to ${scale}x`);
  }

  /**
   * Get current scene scale
   */
  public getSceneScale(): number {
    return this.sceneScale;
  }

  /**
   * Get current link quality settings
   */
  public getLinkQuality(): { segments: number; thickness: number; endOffset: number } {
    return {
      segments: this.linkSegments,
      thickness: this.linkThickness,
      endOffset: this.linkEndOffset
    };
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    this.clearAllLinks();
    this.linkMaterial.dispose();
    this.linkContainer.dispose();
    // console.log('[LINK] LinkManager disposed');
  }
}