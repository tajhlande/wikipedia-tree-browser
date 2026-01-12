import {
  Scene,
  Mesh,
  Vector3,
  PointerEventTypes,
  Observer
} from "@babylonjs/core";
import { dataStore } from '../stores/dataStore';
import type { ClusterNode } from '../types';

/**
 * Interaction Manager for WP Embeddings Visualization
 * Handles user interactions with nodes (hover, click, etc.)
 */
export class InteractionManager {
  private scene: Scene;
  private hoverObserver: Observer<Mesh> | null = null;
  private clickObserver: Observer<Mesh> | null = null;
  private currentHoveredNode: ClusterNode | null = null;
  private nodeIdToDataMap: Map<number, ClusterNode> = new Map();
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.setupInteractions();
    console.log('[INTERACT] InteractionManager initialized');
  }
  
  /**
   * Setup interaction observers
   */
  private setupInteractions(): void {
    // Hover interaction
    this.hoverObserver = this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
        const mesh = pointerInfo.pickInfo?.pickedMesh;
        if (mesh && mesh.isPickable) {
          this.handleNodeHover(mesh);
        } else {
          this.handleNodeHoverEnd();
        }
      }
    });
    
    // Click interaction
    this.clickObserver = this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERPICK) {
        const mesh = pointerInfo.pickInfo?.pickedMesh;
        if (mesh && mesh.isPickable) {
          this.handleNodeClick(mesh);
        }
      }
    });
  }
  
  /**
   * Register a node with its data for interaction
   */
  public registerNode(nodeId: number, nodeData: ClusterNode): void {
    this.nodeIdToDataMap.set(nodeId, nodeData);
  }
  
  /**
   * Unregister a node
   */
  public unregisterNode(nodeId: number): void {
    this.nodeIdToDataMap.delete(nodeId);
    
    // If this was the hovered node, clear hover state
    if (this.currentHoveredNode?.id === nodeId) {
      this.currentHoveredNode = null;
    }
  }
  
  /**
   * Clear all registered nodes
   */
  public clearAllNodes(): void {
    this.nodeIdToDataMap.clear();
    this.currentHoveredNode = null;
  }
  
  /**
   * Handle node hover event
   */
  private handleNodeHover(mesh: Mesh): void {
    // Extract node ID from mesh name (format: node_<id>)
    const meshName = mesh.name;
    if (meshName.startsWith('node_')) {
      const nodeId = parseInt(meshName.substring(5));
      const nodeData = this.nodeIdToDataMap.get(nodeId);
      
      if (nodeData) {
        this.currentHoveredNode = nodeData;
        console.log(`[INTERACT] Hovering over node ${nodeId}: ${nodeData.label}`);
        
        // TODO: Update UI overlay with hover information
        // This will be implemented in Phase 4
      }
    }
  }
  
  /**
   * Handle end of node hover
   */
  private handleNodeHoverEnd(): void {
    if (this.currentHoveredNode) {
      console.log(`[INTERACT] End hover over node ${this.currentHoveredNode.id}`);
      this.currentHoveredNode = null;
      
      // TODO: Clear UI overlay
      // This will be implemented in Phase 4
    }
  }
  
  /**
   * Handle node click event
   */
  private handleNodeClick(mesh: Mesh): void {
    // Extract node ID from mesh name (format: node_<id>)
    const meshName = mesh.name;
    if (meshName.startsWith('node_')) {
      const nodeId = parseInt(meshName.substring(5));
      const nodeData = this.nodeIdToDataMap.get(nodeId);
      
      if (nodeData) {
        console.log(`[INTERACT] Clicked node ${nodeId}: ${nodeData.label}`);
        
        // Navigate to the clicked node
        const currentNamespace = dataStore.state.currentNamespace;
        if (currentNamespace) {
          dataStore.navigateToNode(currentNamespace, nodeId);
        }
      }
    }
  }
  
  /**
   * Get currently hovered node
   */
  public getHoveredNode(): ClusterNode | null {
    return this.currentHoveredNode;
  }
  
  /**
   * Dispose all resources
   */
  public dispose(): void {
    if (this.hoverObserver) {
      this.scene.onPointerObservable.remove(this.hoverObserver);
      this.hoverObserver = null;
    }
    
    if (this.clickObserver) {
      this.scene.onPointerObservable.remove(this.clickObserver);
      this.clickObserver = null;
    }
    
    this.clearAllNodes();
    console.log('[INTERACT] InteractionManager disposed');
  }
}