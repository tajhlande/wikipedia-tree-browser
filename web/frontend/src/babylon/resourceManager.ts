import { ClusterManager } from './clusterManager';

/**
 * ResourceManager for intelligent cleanup and memory management
 * Handles periodic cleanup of unused resources
 */
export class ResourceManager {
  private clusterManager: ClusterManager;
  private cleanupInterval: number = 60000; // 60 seconds
  private cleanupTimer: any = null;
  private aggressiveCleanupThreshold: number = 10; // Max clusters before aggressive cleanup

  constructor(clusterManager: ClusterManager) {
    this.clusterManager = clusterManager;
    this.startPeriodicCleanup();
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.periodicCleanup();
    }, this.cleanupInterval);

    console.log(`[RESOURCE] Started periodic cleanup every ${this.cleanupInterval/1000} seconds`);
  }

  /**
   * Stop periodic cleanup
   */
  public stopPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log('[RESOURCE] Stopped periodic cleanup');
    }
  }

  /**
   * Set cleanup interval
   */
  public setCleanupInterval(intervalMs: number): void {
    this.cleanupInterval = intervalMs;
    if (this.cleanupTimer) {
      this.stopPeriodicCleanup();
      this.startPeriodicCleanup();
    }
  }

  /**
   * Set aggressive cleanup threshold
   */
  public setAggressiveCleanupThreshold(maxClusters: number): void {
    this.aggressiveCleanupThreshold = maxClusters;
  }

  /**
   * Periodic cleanup of unused resources
   */
  public periodicCleanup(): void {
    console.log('[RESOURCE] Running periodic cleanup');
    
    // Check if we need aggressive cleanup
    const visibleClusters = this.clusterManager.getVisibleClusters();
    const allClusters = this.clusterManager.getAllClusters();
    
    if (allClusters.size > this.aggressiveCleanupThreshold) {
      console.log(`[RESOURCE] Aggressive cleanup triggered (${allClusters.size} clusters > ${this.aggressiveCleanupThreshold} threshold)`);
      this.aggressiveCleanup();
    } else {
      // Regular cleanup
      this.clusterManager.cleanupUnusedNodes();
      this.clusterManager.cleanupUnusedLinks();
      console.log(`[RESOURCE] Regular cleanup completed. Visible clusters: ${visibleClusters.size}, Total clusters: ${allClusters.size}`);
    }
  }

  /**
   * Aggressive cleanup - remove all non-visible clusters except root
   */
  public aggressiveCleanup(): void {
    const visibleClusters = this.clusterManager.getVisibleClusters();
    const rootNodeId = this.clusterManager.getRootNodeId();

    console.log(`[RESOURCE] Starting aggressive cleanup. Visible clusters: ${visibleClusters.size}, Root: ${rootNodeId}`);

    // Hide all non-visible clusters (except root)
    const allClusters = this.clusterManager.getAllClusters();
    allClusters.forEach(clusterNodeId => {
      if (clusterNodeId !== rootNodeId && !visibleClusters.has(clusterNodeId)) {
        this.clusterManager.hideCluster(clusterNodeId);
      }
    });

    // Clean up unused resources
    this.clusterManager.cleanupUnusedNodes();
    this.clusterManager.cleanupUnusedLinks();

    console.log('[RESOURCE] Aggressive cleanup completed');
  }

  /**
   * Manual cleanup trigger
   */
  public manualCleanup(): void {
    console.log('[RESOURCE] Running manual cleanup');
    this.clusterManager.cleanupUnusedNodes();
    this.clusterManager.cleanupUnusedLinks();
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryStats(): { 
    visibleClusters: number, 
    totalClusters: number, 
    nodeCount: number, 
    linkCount: number 
  } {
    const visibleClusters = this.clusterManager.getVisibleClusters();
    const allClusters = this.clusterManager.getAllClusters();
    const nodeCount = this.clusterManager.getAllNodes()?.size || 0;
    const linkCount = this.clusterManager.getAllLinks()?.size || 0;

    return {
      visibleClusters: visibleClusters.size,
      totalClusters: allClusters.size,
      nodeCount: nodeCount,
      linkCount: linkCount
    };
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.stopPeriodicCleanup();
    console.log('[RESOURCE] ResourceManager disposed');
  }
}