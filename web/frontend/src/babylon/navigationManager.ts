import { ClusterManager } from './clusterManager';
import { Vector3, ArcRotateCamera, CubicEase, EasingFunction, Animation } from "@babylonjs/core";
import type { ClusterNode } from '../types';
import { apiClient } from '../services/apiClient';

declare module "@babylonjs/core" {
  interface ArcRotateCamera {
    easeTo(whichprop: string, targetval: number, speed: number): void;
  }
  interface Vector3 {
    easeTo(whichprop: string, targetval: number, speed: number): void;
  }
}

const easingFunction = (whichprop: string, targetval: number, frames: number, fps=60) => {
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
	Animation.CreateAndStartAnimation('at4', this, whichprop, frames, 60, (this as any)[whichprop], targetval, 0, ease);
  console.debug(`[NAV] Easing camera ${whichprop} to ${targetval} in ${frames} frames`)
}

ArcRotateCamera.prototype.easeTo = easingFunction;
Vector3.prototype.easeTo = easingFunction;

/**
 * NavigationManager for cluster-based navigation
 * Handles navigation between nodes/clusters and manages navigation history
 */
export class NavigationManager {
  protected clusterManager: ClusterManager;
  protected currentNodeId: number | null = null;
  protected navigationHistory: number[] = [];
  protected dataCache: Map<string, ClusterNode[]> = new Map();
  protected camera: ArcRotateCamera | null = null;

  constructor(clusterManager: ClusterManager) {
    this.clusterManager = clusterManager;
  }

  /**
   * Set camera reference for positioning
   */
  public setCamera(camera: ArcRotateCamera): void {
    this.camera = camera;
  }

  /**
   * Load node cluster data from API
   */
  protected async loadNodeClusterData(nodeId: number, namespace: string): Promise<ClusterNode[]> {
    const cacheKey = `${namespace}_${nodeId}`;

    // Check cache first
    if (this.dataCache.has(cacheKey)) {
      return this.dataCache.get(cacheKey)!;
    }

    try {
      // Load the node cluster data
      const response = await apiClient.getNodeCluster(nodeId, namespace);
      const clusterData = response.data;

      // Cache the data
      this.dataCache.set(cacheKey, clusterData);

      return clusterData;
    } catch (error) {
      console.error(`[NAV] Failed to load cluster data for node ${nodeId}:`, error);
      throw error;
    }
  }

  /**
   * Position camera for a specific node
   */
  protected positionCameraForNode(nodeId: number): void {
    if (!this.camera) {
      console.warn(`[NAV] Cannot position camera - camera reference not set`);
      return;
    }
    console.debug("[NAV] Positioning camera for node");

    // Get the node mesh to position camera
    const nodeMesh = this.clusterManager.getNodeMesh(nodeId);

    if (!nodeMesh) {
      console.warn(`[NAV] Cannot position camera - node ${nodeId} mesh not found`);
      return;
    }

    // Calculate bounds of visible nodes in the current cluster for better positioning
    const visibleClusters = this.clusterManager.getVisibleClusters();
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    if (visibleClusters && visibleClusters.size > 0) {
      visibleClusters.forEach(clusterNodeId => {
        const nodesInCluster = this.clusterManager.getNodesInCluster(clusterNodeId);
        if (nodesInCluster) {
          nodesInCluster.forEach(nodeId => {
            const mesh = this.clusterManager.getNodeMesh(nodeId);
            if (mesh?.isEnabled()) {
              const pos = mesh.position;
              minX = Math.min(minX, pos.x);
              maxX = Math.max(maxX, pos.x);
              minY = Math.min(minY, pos.y);
              maxY = Math.max(maxY, pos.y);
              minZ = Math.min(minZ, pos.z);
              maxZ = Math.max(maxZ, pos.z);
            }
          });
        }
      });
    }

    let targetPosition = nodeMesh.position;
    let cameraDistance = 20; // Default distance

    // If we found visible nodes, calculate better positioning
    if (minX !== Infinity) {
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;

      const sizeX = maxX - minX;
      const sizeY = maxY - minY;
      const sizeZ = maxZ - minZ;
      const maxSize = Math.max(sizeX, sizeY, sizeZ);

      // Use the center of the cluster as target
      targetPosition = new Vector3(centerX, centerY, centerZ);

      // Adjust camera distance based on cluster size
      cameraDistance = 25 + maxSize * 1.5;
    }

    // Position the camera
    const easingFrames = 90;
    const timeoutDelay = 10;
    const newCameraPosition = new Vector3(
      targetPosition.x,
      targetPosition.y + 5, // Slightly elevated
      targetPosition.z - cameraDistance
    );
    // this.camera.setPosition(newCameraPosition);
    setTimeout(() => this.camera?.position.easeTo("x", newCameraPosition.x, easingFrames), timeoutDelay);
    setTimeout(() => this.camera?.position.easeTo("y", newCameraPosition.y, easingFrames), timeoutDelay);
    setTimeout(() => this.camera?.position.easeTo("z", newCameraPosition.z, easingFrames), timeoutDelay);


    // this.camera.setTarget(targetPosition);
    setTimeout(() => this.camera?.target.easeTo("x", targetPosition.x, easingFrames), timeoutDelay);
    setTimeout(() => this.camera?.target.easeTo("y", targetPosition.y, easingFrames), timeoutDelay);
    setTimeout(() => this.camera?.target.easeTo("z", targetPosition.z, easingFrames), timeoutDelay);

    // this.camera.radius = cameraDistance;
    // this.camera.alpha = Math.PI / 2; // Side view
    // this.camera.beta = Math.PI / 4; // Slightly above
    setTimeout(() => this.camera?.easeTo("radius", cameraDistance, easingFrames), timeoutDelay);
    setTimeout(() => this.camera?.easeTo("alpha", Math.PI / 2, easingFrames), timeoutDelay);
    setTimeout(() => this.camera?.easeTo("beta",  Math.PI / 4, easingFrames), timeoutDelay);

    console.log(`[NAV] Positioned camera for node ${nodeId} at (${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z}) with distance ${cameraDistance}`);
  }


  /**
   * Clear data cache
   */
  public clearCache(): void {
    this.dataCache.clear();
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.clearCache();
  }
}