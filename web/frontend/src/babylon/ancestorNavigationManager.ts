import { NavigationManager } from './navigationManager';
import { ClusterManager } from './clusterManager';
import type { ClusterNode } from '../types';
import { apiClient } from '../services/apiClient';

/**
 * AncestorNavigationManager for extended ancestor views
 * Extends NavigationManager to handle ancestor chain visualization
 */
export class AncestorNavigationManager extends NavigationManager {
  private ancestorNodes: Set<number> = new Set();
  private ancestorCache: Map<string, ClusterNode[]> = new Map();

  constructor(clusterManager: ClusterManager) {
    super(clusterManager);
  }

  /**
   * Load ancestor chain for a node
   */
  private async loadAncestorChain(nodeId: number, namespace: string): Promise<ClusterNode[]> {
    const cacheKey = `${namespace}_ancestors_${nodeId}`;
    
    // Check cache first
    if (this.ancestorCache.has(cacheKey)) {
      return this.ancestorCache.get(cacheKey)!;
    }

    try {
      // Load the ancestor chain data
      const response = await apiClient.getNodeAncestors(nodeId, namespace);
      const ancestorData = response.data;
      
      // Cache the data
      this.ancestorCache.set(cacheKey, ancestorData);
      
      return ancestorData;
    } catch (error) {
      console.error(`[ANCESTOR] Failed to load ancestor chain for node ${nodeId}:`, error);
      throw error;
    }
  }

  /**
   * Load ancestor children for context
   */
  private async loadAncestorChildren(ancestors: ClusterNode[], namespace: string): Promise<void> {
    // For each ancestor, load its children to provide context
    for (const ancestor of ancestors) {
      try {
        const cacheKey = `${namespace}_children_${ancestor.id}`;
        
        // Check cache first
        if (this.dataCache.has(cacheKey)) {
          const childrenData = this.dataCache.get(cacheKey)!;
          this.createAncestorChildrenCluster(childrenData, ancestor.id);
        } else {
          // Load children data
          const response = await apiClient.getNodeChildren(ancestor.id, namespace);
          const childrenData = response.data;
          
          // Cache the data
          this.dataCache.set(cacheKey, childrenData);
          
          this.createAncestorChildrenCluster(childrenData, ancestor.id);
        }
      } catch (error) {
        console.error(`[ANCESTOR] Failed to load children for ancestor ${ancestor.id}:`, error);
      }
    }
  }

  /**
   * Create cluster for ancestor children
   */
  private createAncestorChildrenCluster(childrenData: ClusterNode[], ancestorId: number): void {
    if (!childrenData || childrenData.length === 0) {
      return;
    }

    // Add children nodes to the ancestor's cluster
    childrenData.forEach(childNode => {
      this.clusterManager.addNodeToCluster(childNode, ancestorId);
    });

    // Add links from ancestor to children
    childrenData.forEach(childNode => {
      const ancestorNode = childrenData.find(node => node.id === ancestorId);
      if (ancestorNode) {
        this.clusterManager.addLinkToCluster(ancestorNode, childNode, ancestorId);
      }
    });
  }

  /**
   * Position camera for ancestor view
   */
  protected positionCameraForAncestorView(): void {
    // This method should be overridden by subclasses or handled by scene management
    console.log('[ANCESTOR] Positioning camera for ancestor view');
  }

  /**
   * Show ancestor view (extended view with ancestor chain)
   */
  public async showAncestorView(): Promise<void> {
    if (this.currentNodeId === null) return;

    try {
      // Load and show ancestor chain
      const ancestors = await this.loadAncestorChain(this.currentNodeId, ''); // namespace should be obtained from context
      ancestors.forEach(ancestor => {
        this.clusterManager.showCluster(ancestor.id);
        this.ancestorNodes.add(ancestor.id);
      });

      // Show ancestor children for context
      await this.showAncestorChildren(ancestors);

      // Position camera for wider ancestor view
      this.positionCameraForAncestorView();

    } catch (error) {
      console.error(`[ANCESTOR] Failed to show ancestor view:`, error);
      throw error;
    }
  }

  /**
   * Show ancestor children for context
   */
  private async showAncestorChildren(ancestors: ClusterNode[]): Promise<void> {
    const namespace = ''; // Should be obtained from context
    await this.loadAncestorChildren(ancestors, namespace);
  }

  /**
   * Hide ancestor view
   */
  public hideAncestorView(): void {
    // Hide all ancestor clusters
    this.ancestorNodes.forEach(nodeId => {
      this.clusterManager.hideCluster(nodeId);
    });
    this.ancestorNodes.clear();

    // Clean up and reposition camera
    this.clusterManager.cleanupUnusedNodes();
    this.clusterManager.cleanupUnusedLinks();
    
    if (this.currentNodeId) {
      this.positionCameraForNode(this.currentNodeId);
    }
  }

  /**
   * Check if ancestor view is currently shown
   */
  public isAncestorViewShown(): boolean {
    return this.ancestorNodes.size > 0;
  }

  /**
   * Get ancestor nodes currently shown
   */
  public getAncestorNodes(): Set<number> {
    return new Set(this.ancestorNodes);
  }

  /**
   * Clear ancestor cache
   */
  public clearAncestorCache(): void {
    this.ancestorCache.clear();
  }

  /**
   * Dispose resources
   */
  public override dispose(): void {
    super.dispose();
    this.clearAncestorCache();
    this.ancestorNodes.clear();
  }
}