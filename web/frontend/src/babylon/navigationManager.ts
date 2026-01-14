import { ClusterManager } from './clusterManager';
import { Vector3, ArcRotateCamera } from "@babylonjs/core";
import type { ClusterNode } from '../types';
import { apiClient } from '../services/apiClient';

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
   * Create a node cluster from cluster data
   */
  protected createNodeCluster(clusterData: ClusterNode[]): void {
    if (!clusterData || clusterData.length === 0) {
      console.warn('[NAV] Empty cluster data received');
      return;
    }

    // Find the central node (this should be the clusterNodeId)
    const centralNode = clusterData.find(node => node.id === this.currentNodeId);
    
    if (!centralNode) {
      console.error('[NAV] Central node not found in cluster data.', {
        currentNodeId: this.currentNodeId,
        availableNodeIds: clusterData.map(n => n.id),
        availableNodeLabels: clusterData.map(n => n.label).slice(0, 5) + (clusterData.length > 5 ? '...' : '')
      });
      
      // Check if any of the available nodes might be related to our target
      const possibleMatches = clusterData.filter(node => 
        node.parent_id === this.currentNodeId || 
        (node.children && node.children.includes(this.currentNodeId))
      );
      
      if (possibleMatches.length > 0) {
        console.warn('[NAV] Found possible related nodes. Using first match as central node');
        const matchedNode = possibleMatches[0];
        
        // Add all nodes to the cluster using the matched node as central
        clusterData.forEach(node => {
          this.clusterManager.addNodeToCluster(node, matchedNode.id);
        });
        
        // Create links based on parent-child relationships
        clusterData.forEach(childNode => {
          if (childNode.parent_id === matchedNode.id) {
            this.clusterManager.addLinkToCluster(matchedNode, childNode, matchedNode.id);
          }
        });
        
        // Also create link to our target node if it's a parent
        if (matchedNode.parent_id === this.currentNodeId) {
          // We need to create a placeholder for the missing central node
          console.warn('[NAV] Creating placeholder for missing central node (parent)');
          // Note: In a real scenario, we might want to load the parent node data
        }
        
        return;
      }
      
      // Fallback: use the first node as central node if current node is not in the data
      if (clusterData.length > 0) {
        console.warn('[NAV] Using first node as fallback central node');
        const fallbackCentralNode = clusterData[0];
        
        // Add all nodes to the cluster using the fallback central node
        clusterData.forEach(node => {
          this.clusterManager.addNodeToCluster(node, fallbackCentralNode.id);
        });
        
        // Create links based on parent-child relationships
        clusterData.forEach(childNode => {
          if (childNode.parent_id === fallbackCentralNode.id) {
            this.clusterManager.addLinkToCluster(fallbackCentralNode, childNode, fallbackCentralNode.id);
          }
        });
      }
      
      return;
    }

    // Add all nodes in the cluster to the cluster manager
    clusterData.forEach(node => {
      // Each node belongs to the cluster defined by the central node
      this.clusterManager.addNodeToCluster(node, centralNode.id);
    });

    // Add links between nodes based on parent-child relationships
    clusterData.forEach(childNode => {
      if (childNode.parent_id === centralNode.id) {
        this.clusterManager.addLinkToCluster(centralNode, childNode, centralNode.id);
      }
    });

    // Also create links from other nodes to their children if they exist in this cluster
    clusterData.forEach(potentialParent => {
      clusterData.forEach(potentialChild => {
        if (potentialChild.parent_id === potentialParent.id && 
            potentialChild.id !== centralNode.id) {
          this.clusterManager.addLinkToCluster(potentialParent, potentialChild, centralNode.id);
        }
      });
    });
  }

  /**
   * Position camera for a specific node
   */
  protected positionCameraForNode(nodeId: number): void {
    if (!this.camera) {
      console.warn(`[NAV] Cannot position camera - camera reference not set`);
      return;
    }
    
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
    this.camera.setPosition(new Vector3(
      targetPosition.x,
      targetPosition.y + 5, // Slightly elevated
      targetPosition.z - cameraDistance
    ));
    
    this.camera.setTarget(targetPosition);
    this.camera.radius = cameraDistance;
    this.camera.alpha = Math.PI / 2; // Side view
    this.camera.beta = Math.PI / 4; // Slightly above
    
    console.log(`[NAV] Positioned camera for node ${nodeId} at (${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z}) with distance ${cameraDistance}`);
  }

  /**
   * Navigate to a specific node
   */
  public async navigateToNode(nodeId: number, namespace: string): Promise<void> {
    if (!nodeId) {
      console.error('[NAV] Cannot navigate to null or undefined nodeId');
      return;
    }

    if (this.currentNodeId === nodeId) return;

    // Push current node to history
    if (this.currentNodeId !== null) {
      this.navigationHistory.push(this.currentNodeId);
    }

    try {
      console.log(`[NAV] Navigating to node ${nodeId} in namespace ${namespace}`);

      // Load node cluster data
      const clusterData = await this.loadNodeClusterData(nodeId, namespace);

      if (!clusterData || clusterData.length === 0) {
        console.error(`[NAV] No cluster data received for node ${nodeId}`);
        throw new Error(`No cluster data available for node ${nodeId}`);
      }

      // Create the cluster
      this.createNodeCluster(clusterData);

      // Show new cluster, hide previous (except root)
      this.clusterManager.showCluster(nodeId);
      if (this.currentNodeId !== null && this.currentNodeId !== this.clusterManager.getRootNodeId()) {
        this.clusterManager.hideCluster(this.currentNodeId);
      }

      // Update current node ID before positioning camera
      this.currentNodeId = nodeId;
      
      // Small delay to ensure nodes are visible before positioning camera
      await new Promise(resolve => setTimeout(resolve, 100));

      // Position camera
      this.positionCameraForNode(nodeId);

      // Clean up unused resources
      this.clusterManager.cleanupUnusedNodes();
      this.clusterManager.cleanupUnusedLinks();

      console.log(`[NAV] Successfully navigated to node ${nodeId}`);

    } catch (error) {
      console.error(`[NAV] Failed to navigate to node ${nodeId}:`, error);
      // Reset currentNodeId if navigation failed
      if (this.currentNodeId !== nodeId) {
        this.currentNodeId = null;
      }
      throw error;
    }
  }

  /**
   * Go back to previous node
   */
  public goBack(): void {
    if (this.navigationHistory.length > 0) {
      const previousNodeId = this.navigationHistory.pop();
      if (previousNodeId) {
        // Get current namespace from data store or context
        const namespace = ''; // This should be obtained from the application context
        this.navigateToNode(previousNodeId, namespace);
      }
    }
  }

  /**
   * Go forward to next node (if available)
   */
  public goForward(): void {
    // Note: For simplicity, we're not implementing forward navigation history
    // This could be added if needed by maintaining a forward stack
    console.log('[NAV] Forward navigation not implemented');
  }

  /**
   * Get current node ID
   */
  public getCurrentNodeId(): number | null {
    return this.currentNodeId;
  }

  /**
   * Get navigation history
   */
  public getNavigationHistory(): number[] {
    return [...this.navigationHistory];
  }

  /**
   * Clear navigation history
   */
  public clearHistory(): void {
    this.navigationHistory = [];
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
    this.clearHistory();
    this.clearCache();
  }
}