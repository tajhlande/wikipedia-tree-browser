import {
  Scene,
  Mesh,
  Vector3,
  PointerEventTypes,
  Observer,
  PointerInfo,
  AbstractMesh
} from "@babylonjs/core";
import { dataStore } from '../stores/dataStore';
import type { ClusterNode } from '../types';

/**
 * Interaction Manager for WP Embeddings Visualization
 * Handles user interactions with nodes (hover, click, etc.)
 */
export class InteractionManager {
  private scene: Scene;
  private hoverObserver: Observer<PointerInfo> | null = null;
  private clickObserver: Observer<PointerInfo> | null = null;
  private currentHoveredNode: ClusterNode | null = null;
  private nodeIdToDataMap: Map<number, ClusterNode> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
    this.setupInteractions();
    console.log('[INTERACT] InteractionManager initialized');

    // Debug: List all pickable meshes after a short delay
    // This helps identify if meshes are properly set up for picking
    setTimeout(() => {
      this.debugListPickableMeshes();
    }, 2000); // 2 second delay to allow scene to stabilize
  }

  /**
   * Setup interaction observers
   */
  private setupInteractions(): void {
    // Hover interaction using proper Babylon.js picking methods
    this.hoverObserver = this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
        // Use scene.pick method for proper mesh picking with predicate
        const pickResult = this.scene.pick(pointerInfo.event.clientX, pointerInfo.event.clientY, (mesh) => {
          // Only pick meshes that are pickable and match our naming pattern
          return mesh.isEnabled() && mesh.isPickable && (mesh.name.startsWith('node_') || mesh.name.startsWith('billboard_'));
        });

        const mesh = pickResult?.pickedMesh;

        // console.debug(`[INTERACT] Pointer move event, picked mesh: ${mesh ? mesh.name : 'null'}`);
        // if (mesh) {
        //   console.debug(`[INTERACT] Picked mesh details - name: ${mesh.name}, isPickable: ${mesh.isPickable}, position: (${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`);
        //   console.debug(`[INTERACT] Pick result - hit: ${pickResult?.hit}, distance: ${pickResult?.distance}`);
        // }

        if (mesh) {
          this.handleNodeHover(mesh);
        } else {
          this.handleNodeHoverEnd();
        }
      }
    });

    // Click interaction using proper Babylon.js picking methods
    this.clickObserver = this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERPICK) {
        // Use scene.pick method for proper mesh picking with predicate
        const pickResult = this.scene.pick(pointerInfo.event.clientX, pointerInfo.event.clientY, (mesh) => {
          // Only pick meshes that are pickable and match our naming pattern
          return mesh.isEnabled() && mesh.isPickable && (mesh.name.startsWith('node_') || mesh.name.startsWith('billboard_'));
        });

        const mesh = pickResult?.pickedMesh;
        if (mesh) {
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
  private handleNodeHover(mesh: AbstractMesh): void {
    // Debug: Log all pointer events to see what's being picked
    // console.debug(`[INTERACT] Pointer event on mesh: ${mesh.name}, isPickable: ${mesh.isPickable}`);

    // Extract node ID from mesh name (format: node_<id> or billboard_<id>)
    const meshName = mesh.name;
    let nodeId: number | null = null;

    if (meshName.startsWith('node_')) {
      nodeId = parseInt(meshName.substring(5));
    } else if (meshName.startsWith('billboard_')) {
      nodeId = parseInt(meshName.substring(10));
    }

    if (nodeId !== null) {
      const nodeData = this.nodeIdToDataMap.get(nodeId);

      if (nodeData) {
        this.currentHoveredNode = nodeData;
        const meshType = meshName.startsWith('node_') ? 'node' : 'billboard';
        // console.log(`[INTERACT] Hovering over ${meshType} ${nodeId}: ${nodeData.label}`);

        // Notify UI that hover state changed
        // if (meshType === 'billboard') {
        //   console.debug(`[INTERACT] Billboard hover detected - UI should show overlay`);
        // }

        // TODO: Update UI overlay with hover information
        // This will be implemented in Phase 4
      } else {
        console.warn(`[INTERACT] No node data found for ID ${nodeId}`);
      }
    } else {
      console.warn(`[INTERACT] Mesh name ${meshName} doesn't match expected patterns`);
    }
  }

  /**
   * Handle end of node hover
   */
  private handleNodeHoverEnd(): void {
    if (this.currentHoveredNode) {
      // console.debug(`[INTERACT] End hover over node ${this.currentHoveredNode.id}`);
      this.currentHoveredNode = null;

      // TODO: Clear UI overlay
      // This will be implemented in Phase 4
    }
  }

  /**
   * Handle node click event
   */
  private handleNodeClick(mesh: AbstractMesh): void {
    // Extract node ID from mesh name (format: node_<id> or billboard_<id>)
    const meshName = mesh.name;
    let nodeId: number | null = null;

    if (meshName.startsWith('node_')) {
      nodeId = parseInt(meshName.substring(5));
    } else if (meshName.startsWith('billboard_')) {
      nodeId = parseInt(meshName.substring(10));
    }

    if (nodeId !== null) {
      const nodeData = this.nodeIdToDataMap.get(nodeId);

      if (nodeData) {
        const meshType = meshName.startsWith('node_') ? 'node' : 'billboard';
        console.debug(`[INTERACT] Clicked ${meshType} ${nodeId}: ${nodeData.label}`);
        const currentNamespace = dataStore.state.currentNamespace;

        // if this is a leaf node, show the list of pages
        if (nodeData.is_leaf) {
          console.debug(`[INTERACT] Show pages for leaf node ${nodeId}: ${nodeData.label}`)
          // Set the current node and show the leaf node overlay
          //dataStore.setCurrentNode(nodeData);
          dataStore.setState('leafNodeInfoVisible', true);
          dataStore.setState('leafNode', nodeData)
          console.debug(`[INTERACT] Set leafNodeInfoVisible to true, currentNode:`, nodeData);
        } else {
          // Navigate to the clicked node
          if (currentNamespace) {
            console.debug(`[INTERACT] Navigating to node ${nodeId}`)
            dataStore.setState('leafNodeInfoVisible', false);
            dataStore.setState('leafNode', null)
            dataStore.navigateToNode(currentNamespace, nodeId);
          }
        }
      }
    }
  }

  /**
   * Debug method to list all pickable meshes in the scene
   */
  public debugListPickableMeshes(): void {
    // console.debug('[INTERACT] Listing all pickable meshes in scene:');
    const meshes = this.scene.meshes;
    let pickableCount = 0;

    meshes.forEach(mesh => {
      if (mesh.isPickable) {
        // console.log(`[INTERACT] Pickable mesh: ${mesh.name} at (${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})`);
        pickableCount++;
      }
    });

    console.debug(`[INTERACT] Total pickable meshes: ${pickableCount} out of ${meshes.length} total meshes`);
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