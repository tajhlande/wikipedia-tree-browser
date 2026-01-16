import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  Color3,
  DirectionalLight,
  CubicEase,
  EasingFunction,
  Animation,
} from "@babylonjs/core";
import { NodeManager } from './nodeManager';
import { ClusterManager } from './clusterManager';
import { NavigationManager } from './navigationManager';
import { ResourceManager } from './resourceManager';
import { InteractionManager } from './interactionManager';
import { dataStore } from '../stores/dataStore';
import { createEffect } from 'solid-js';
import type { ClusterNode } from '../types';

// Global scene references for reactive updates
export let scene: Scene | null = null;
export let engine: Engine | null = null;
export let camera: ArcRotateCamera | null = null;
export let clusterManager: ClusterManager | null = null;
export let nodeManager: NodeManager | null = null;
export let navigationManager: NavigationManager | null = null;
export let resourceManager: ResourceManager | null = null;
export let interactionManager: InteractionManager | null = null;

// Track current node ID for cluster management
let currentNodeId: number | null = null;
let rootNodeId: number | null = null;

declare module "@babylonjs/core" {
  interface ArcRotateCamera {
    easeTo(whichprop: string, targetval: number, speed: number): void;
  }
  interface Vector3 {
    easeTo(whichprop: string, targetval: number, speed: number): void;
  }
}

ArcRotateCamera.prototype.easeTo = function (whichprop: string, targetval: number, frames: number, fps=60) {
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  Animation.CreateAndStartAnimation('at4', this, whichprop, frames, 60, (this as any)[whichprop], targetval, 0, ease);
  // console.debug(`[CAMERA] Easing camera.${whichprop} to ${targetval} in ${frames} frames`)
};
Vector3.prototype.easeTo = function (whichprop: string, targetval: number, frames: number, fps=60) {
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  Animation.CreateAndStartAnimation('at4', this, whichprop, frames, 60, (this as any)[whichprop], targetval, 0, ease);
  // console.debug(`[CAMERA] Easing vector.${whichprop} to ${targetval} in ${frames} frames`)
};

export function initScene(canvasId: string) {
  try {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      console.error(`Canvas element with id "${canvasId}" not found or is not a canvas element`);
      return;
    }

    // Initialize Babylon.js engine and scene
    engine = new Engine(canvas, true);
    scene = new Scene(engine);

    // Setup camera with better initial positioning
    camera = new ArcRotateCamera(
      "camera",
      Math.PI / 2,
      Math.PI / 3,
      10,
      Vector3.Zero(),
      scene
    );

    // Camera control setup
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50; // Smoother zoom
    camera.panningSensibility = 500; // Better panning
    camera.minZ = 0.1; // Closer zoom
    camera.maxZ = 1000; // Farther zoom

    // Enable camera inertia for smoother movement
    camera.inertia = 0.8;

    // Set initial camera position and target
    camera.setPosition(new Vector3(0, 0, -15));
    camera.setTarget(Vector3.Zero());

    // Improved lighting setup
    const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.8;
    hemiLight.diffuse = new Color3(0.8, 0.8, 0.8);
    hemiLight.specular = new Color3(0.2, 0.2, 0.2);

    const dirLight1 = new DirectionalLight("dirLight1", new Vector3(-1, -2, -1), scene);
    dirLight1.intensity = 0.5;
    dirLight1.diffuse = new Color3(0.9, 0.9, 0.9);
    dirLight1.specular = new Color3(0.5, 0.5, 0.5);

    const dirLight2 = new DirectionalLight("dirLight2", new Vector3(1, 2, -1), scene);
    dirLight2.intensity = 0.5;
    dirLight2.diffuse = new Color3(0.9, 0.9, 0.9);
    dirLight2.specular = new Color3(0.5, 0.5, 0.5);

    const dirLight3 = new DirectionalLight("dirLight3", new Vector3(1, 2, 1), scene);
    dirLight3.intensity = 0.5;
    dirLight3.diffuse = new Color3(0.9, 0.9, 0.9);
    dirLight3.specular = new Color3(0.5, 0.5, 0.5);

    // Initialize cluster-based managers
    clusterManager = new ClusterManager(scene);
    nodeManager = new NodeManager(scene, clusterManager);
    navigationManager = new NavigationManager(clusterManager);
    resourceManager = new ResourceManager(clusterManager);
    interactionManager = new InteractionManager(scene);

    // Set camera reference for navigation managers
    if (camera) {
      navigationManager.setCamera(camera);
    }

    // Setup reactive updates for data store changes
    setupReactiveUpdates();

    // Create a simple box for initial demo (will be removed when nodes are loaded)
    const demoBox = MeshBuilder.CreateBox("demoBox", { size: 1 }, scene);
    demoBox.position = new Vector3(0, 0, 0);

    // Store reference to remove later
    (scene as any).demoBox = demoBox;

    // Ensure canvas has focus for camera controls
    canvas.focus();
    canvas.tabIndex = 1; // Make canvas focusable

    engine.runRenderLoop(() => {
      try {
        if (scene) {
          // Update label visibility based on camera distance (LOD system)
          if (nodeManager && camera) {
            nodeManager.updateLabelVisibility(camera, currentNodeId ?? -1);
          }

          scene.render();
        }
      } catch (renderError) {
        console.error("Error during scene rendering:", renderError);
      }
    });

    window.addEventListener("resize", () => {
      try {
        if (engine) {
          engine.resize();
        }
      } catch (resizeError) {
        console.error("Error during engine resize:", resizeError);
      }
    });

    console.log("[SCENE] Babylon.js scene initialized with cluster-based architecture");

    return {
      engine,
      scene,
      camera,
      clusterManager,
      nodeManager,
      navigationManager,
      resourceManager,
      interactionManager
    };
  } catch (error) {
    console.error("Failed to initialize Babylon.js scene:", error);
    return null;
  }
}

/**
 * Setup reactive updates for data store changes
 */
function setupReactiveUpdates() {
  if (!scene || !nodeManager || !clusterManager || !navigationManager) {
    console.error("[SCENE] Cannot setup reactive updates - scene or managers not initialized");
    return;
  }

  // Single consolidated reactive effect for view and node changes
  // This prevents duplicate triggers that were causing the blinking issue
  createEffect(() => {
    const currentView = dataStore.state.currentView;
    const currentNode = dataStore.state.currentNode;
    const currentNamespace = dataStore.state.currentNamespace;

    console.log(`[SCENE EFFECT] View: ${currentView}, Node: ${currentNode?.id}`);

    if (currentView === 'node_view' && currentNode && currentNamespace && clusterManager) {
      // Remove demo box if it exists
      if ((scene as any).demoBox) {
        (scene as any).demoBox.dispose();
        (scene as any).demoBox = null;
      }

      // Set root node ID on first load (always visible)
      if (rootNodeId === null) {
        rootNodeId = currentNode.id;
        clusterManager.setRootNodeId(currentNode.id);
        console.log(`[SCENE] Set root node ID: ${rootNodeId}`);
      }

      // Load and render the appropriate node view
      console.log(`[SCENE EFFECT] Loading view for node ${currentNode.id}`);
      loadNodeView(currentNamespace, currentNode.id);
    }
  });

  // Reactive effect for billboard visibility toggle
  createEffect(() => {
    const showBillboards = dataStore.state.showBillboards;
    console.log(`[SCENE EFFECT] Billboard visibility changed: ${showBillboards}`);

    if (nodeManager && camera) {
      // Force update label visibility to apply the new state
      nodeManager.updateLabelVisibility(camera, currentNodeId ?? -1);
    }
  });

  // Reactive effect for current node changes (camera positioning only)
  createEffect(() => {
    const currentNode = dataStore.state.currentNode;
    if (currentNode && camera) {
      console.log(`[SCENE] Current node changed to: ${currentNode.id} (${currentNode.label})`);

      // Center camera on appropriate target based on view mode
      if (currentNode.centroid) {
        let targetPosition: Vector3;

        // For regular view, focus on current node only
        targetPosition = new Vector3(
          currentNode.centroid[0] * 3.0, // Apply scene scaling
          currentNode.centroid[1] * 3.0,
          currentNode.centroid[2] * 3.0
        );

        // Small delay to ensure nodes are actually visible before positioning camera
        setTimeout(() => {
          if (camera) {
            // Reset camera to consistent zoom level and position
            resetCameraForNodeView(camera, targetPosition);
            console.log(`[SCENE] Camera centered on node ${currentNode.id} at (${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z})`);
          }
        }, 200); // 200ms delay to allow nodes to become visible
      }
    }
  });
}

/**
 * Convert node view data to cluster data format
 */
function convertToClusterData(nodeViewData: {
  currentNode: ClusterNode;
  children: ClusterNode[];
  parent: ClusterNode | null;
}): ClusterNode[] {
  const clusterData: ClusterNode[] = [];

  // Add current node
  if (nodeViewData.currentNode) {
    clusterData.push(nodeViewData.currentNode);
  }

  // Add parent node if exists
  if (nodeViewData.parent) {
    clusterData.push(nodeViewData.parent);
  }

  // Add child nodes
  if (nodeViewData.children && nodeViewData.children.length > 0) {
    clusterData.push(...nodeViewData.children);
  }

  return clusterData;
}

/**
 * Compute which clusters should be visible based on current node and ancestors
 */
async function computeTargetClusters(namespace: string, nodeId: number, includeAncestors: boolean): Promise<Array<number>> {
  const targetClusters = new Array<number>();

  // Always include current node cluster
  let currentNodeId: number | null = nodeId;
  while (currentNodeId != null) {
    targetClusters.push(currentNodeId);
    const nodeViewData = await dataStore.loadNodeView(namespace, currentNodeId);
    if (nodeViewData.parent) {
      currentNodeId = nodeViewData.parent.id;
    } else {
      currentNodeId = null;
    }
  }

  return targetClusters;
}

/**
 * Synchronize scene state: ensure only target clusters are visible
 */
async function syncSceneToTargetState(namespace: string, nodeId: number, includeAncestors: boolean) {
  if (!clusterManager || !nodeManager) {
    console.error("[SCENE] Cannot sync scene - managers not initialized");
    return;
  }

  // Step 1: Compute which clusters should be visible
  const targetClusters: Array<number> = await computeTargetClusters(namespace, nodeId, includeAncestors);
  console.log(`[SCENE] Sync: Target clusters for node ${nodeId}:`, targetClusters);

  // Step 2: Get currently visible clusters
  const currentlyVisible = clusterManager.getVisibleClusters();
  console.log(`[SCENE] Sync: Currently visible clusters:`, Array.from(currentlyVisible));

  // Step 3: Determine which clusters to show (in target but not visible)
  const clustersToShow = new Set<number>();
  targetClusters.forEach(clusterId => {
    if (!currentlyVisible.has(clusterId)) {
      clustersToShow.add(clusterId);
    }
  });

  // Step 4: Determine which clusters to hide (visible but not in target)
  const clustersToHide = new Set<number>();
  currentlyVisible.forEach(clusterId => {
    if (targetClusters.indexOf(clusterId) < 0) {
      clustersToHide.add(clusterId);
    }
  });

  console.log(`[SCENE] Sync: Clusters to show:`, Array.from(clustersToShow));
  console.log(`[SCENE] Sync: Clusters to hide:`, Array.from(clustersToHide));

  // Step 5: Create missing clusters
  for (const clusterId of clustersToShow) {
    const nodeViewData = await dataStore.loadNodeView(namespace, clusterId);
    createNodeCluster(nodeViewData, clusterId);
  }

  // Step 6: Show target clusters
  targetClusters.forEach(clusterId => {
    if (nodeManager) {
      nodeManager.showCluster(clusterId);
    } else if (clusterManager) {
      clusterManager.showCluster(clusterId);
    }
  });

  // Step 7: Hide non-target clusters
  clustersToHide.forEach(clusterId => {
    if (nodeManager) {
      nodeManager.hideCluster(clusterId);
    } else if (clusterManager) {
      clusterManager.hideCluster(clusterId);
      console.warn(`[SCENE] Sync: Using cluster manager instead of node manager`)
    }
  });

  // Step 8: Clean up unused resources
  console.log(`[SCENE] Cleaning up unused nodes, links, and billboards`);
  clusterManager.cleanupUnusedNodes();
  clusterManager.cleanupUnusedLinks();
  if (nodeManager) {
    nodeManager.cleanupUnusedBillboards();
  }

  console.log(`[SCENE] Sync: final cluster list:`, Array.from(clusterManager.getVisibleClusters()));
}

/**
 * Load and render a node view (current node, children, parent)
 * Using state synchronization approach
 */
async function loadNodeView(namespace: string, nodeId: number) {
  if (!scene || !nodeManager || !clusterManager || !navigationManager || !camera) {
    console.error("[SCENE] Cannot load node view - scene or managers not initialized");
    return;
  }

  try {
    console.log(`[SCENE] Loading node view for node ${nodeId} in namespace ${namespace}`);

    // Remove demo box if it exists
    if ((scene as any).demoBox) {
      (scene as any).demoBox.dispose();
      (scene as any).demoBox = null;
    }

    // Synchronize scene to target state
    await syncSceneToTargetState(namespace, nodeId, false);

    // Update current node ID
    currentNodeId = nodeId;

    // Position camera for the node view
    const nodeViewData = await dataStore.loadNodeView(namespace, nodeId);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for nodes to be visible
    resetCameraForNodeView(camera,
      new Vector3(
        nodeViewData.currentNode.centroid[0] * 3.0,
        nodeViewData.currentNode.centroid[1] * 3.0,
        nodeViewData.currentNode.centroid[2] * 3.0
      )
    );

    console.log(`[SCENE] Successfully loaded node view for node ${nodeId}`);

  } catch (error) {
    console.error("[SCENE] Failed to load node view:", error);
    dataStore.setError(`Failed to load node view: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a node cluster from node view data
 */
function createNodeCluster(nodeViewData: {
  currentNode: ClusterNode;
  children: ClusterNode[];
  parent: ClusterNode | null;
}, clusterNodeId: number): void {
  if (!clusterManager || !nodeManager) {
    console.error("[SCENE] ClusterManager or NodeManager not initialized");
    return;
  }

  const mgr = clusterManager; // Capture for use in forEach
  const nodeMgr = nodeManager; // Capture for use in forEach

  // Add current node to cluster
  mgr.addNodeToCluster(nodeViewData.currentNode, clusterNodeId);
  interactionManager?.registerNode(nodeViewData.currentNode.id, nodeViewData.currentNode);
  // Create billboard for current node (pass clusterNodeId for proper parenting)
  nodeMgr.createBillboardForNode(nodeViewData.currentNode.id, nodeViewData.currentNode, clusterNodeId);

  // Add parent node to cluster (if exists)
  if (nodeViewData.parent) {
    mgr.addNodeToCluster(nodeViewData.parent, clusterNodeId);
    interactionManager?.registerNode(nodeViewData.parent.id, nodeViewData.parent);
    // Create billboard for parent node (pass clusterNodeId for proper parenting)
    nodeMgr.createBillboardForNode(nodeViewData.parent.id, nodeViewData.parent, clusterNodeId);

    // Create link from parent to current node
    mgr.addLinkToCluster(nodeViewData.parent, nodeViewData.currentNode, clusterNodeId);
  }

  // Add child nodes to cluster
  nodeViewData.children.forEach(child => {
    mgr.addNodeToCluster(child, clusterNodeId);
    interactionManager?.registerNode(child.id, child);
    // Create billboard for child node (pass clusterNodeId for proper parenting)
    nodeMgr.createBillboardForNode(child.id, child, clusterNodeId);

    // Create link from current node to child
    mgr.addLinkToCluster(nodeViewData.currentNode, child, clusterNodeId);
  });

  console.log(`[SCENE] Created cluster ${clusterNodeId} with ${1 + (nodeViewData.parent ? 1 : 0) + nodeViewData.children.length} nodes and billboards`);
}

/**
 * Reset camera for node view
 */
function resetCameraForNodeView(camera: ArcRotateCamera, targetPosition: Vector3): void {
  // Calculate appropriate camera distance based on view type
  // Reduced to ensure billboards are within LOD visibility distance (20 units)
  const baseDistance = 12;

  // Calculate bounds of all visible nodes for better camera positioning
  if (!clusterManager) {
    console.warn('[SCENE] ClusterManager not initialized for camera positioning');
  } else {
    const visibleClusters = clusterManager.getVisibleClusters();
    if (visibleClusters && visibleClusters.size > 0) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    // Get all nodes from visible clusters
    visibleClusters.forEach(clusterNodeId => {
      const nodesInCluster = clusterManager?.getNodesInCluster(clusterNodeId);
      if (nodesInCluster) {
        nodesInCluster.forEach(nodeId => {
          const nodeMesh = clusterManager?.getNodeMesh(nodeId);
          if (nodeMesh?.isEnabled()) {
            const pos = nodeMesh.position;
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

    if (minX !== Infinity) { // We found some enabled nodes
      // Calculate center of all visible nodes
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;

      // Calculate size of bounding box
      const sizeX = maxX - minX;
      const sizeY = maxY - minY;
      const sizeZ = maxZ - minZ;
      const maxSize = Math.max(sizeX, sizeY, sizeZ);

      // Adjust camera distance based on cluster size
      // Cap the distance to ensure billboards remain visible (LOD threshold is 20)
      const adjustedDistance = Math.min(18, baseDistance + maxSize * 1.5);

      // Position camera to see all nodes
      const easingFrames = 90;
      const timeoutDelay = 10;
      const newPosition = new Vector3(
        centerX,
        centerY + maxSize * 0.5, // Slightly above the center
        centerZ - adjustedDistance
      )
      // camera.setPosition(newPosition);
      setTimeout(() => camera.position.easeTo("x", newPosition.x, easingFrames), timeoutDelay);
      setTimeout(() => camera.position.easeTo("y", newPosition.y, easingFrames), timeoutDelay);
      setTimeout(() => camera.position.easeTo("z", newPosition.z, easingFrames), timeoutDelay);

      // Set target to center of all nodes
      const newTarget = new Vector3(centerX, centerY, centerZ);
      // camera.setTarget(newTarget);
      setTimeout(() => camera.target.easeTo("x", newTarget.x, easingFrames), timeoutDelay);
      setTimeout(() => camera.target.easeTo("y", newTarget.y, easingFrames), timeoutDelay);
      setTimeout(() => camera.target.easeTo("z", newTarget.z, easingFrames), timeoutDelay);

      // Adjust camera parameters
      camera.radius = adjustedDistance;
      // setTimeout(() => camera.easeTo("radius", adjustedDistance, easingFrames), timeoutDelay);
      camera.alpha = Math.PI / 2; // Side view
      camera.beta = Math.PI / 3; // Slightly above

      console.log(`[SCENE] Adjusted camera for cluster: size=${maxSize.toFixed(2)}, distance=${adjustedDistance.toFixed(2)}`);
      return;
    }
    }
  }

  // Fallback to original positioning if no nodes found
  console.warn('[SCENE] No enabled nodes found for camera positioning, using fallback');

  // Use a more robust fallback that ensures nodes are visible
  // Position camera within LOD threshold to ensure billboards are visible
  const fallbackDistance = Math.min(18, baseDistance * 1.2);

  // Position camera
  camera.setPosition(new Vector3(
    targetPosition.x,
    targetPosition.y + 5, // Slightly elevated for better view
    targetPosition.z - fallbackDistance
  ));

  // Set target
  camera.setTarget(targetPosition);

  // Adjust camera parameters for better viewing
  camera.radius = fallbackDistance;
  camera.alpha = Math.PI / 2; // Side view
  camera.beta = Math.PI / 4; // More elevated view

  // Ensure camera doesn't get too close
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 200;
}

/**
 * Clean up resources when component unmounts
 */
export function cleanupScene() {
  if (resourceManager) {
    resourceManager.dispose();
  }

  if (navigationManager) {
    navigationManager.dispose();
  }

  if (nodeManager) {
    nodeManager.dispose();
  }

  if (clusterManager) {
    clusterManager.clearAll();
  }

  if (interactionManager) {
    interactionManager.dispose();
  }

  if (engine) {
    engine.dispose();
  }

  // Reset tracking variables
  currentNodeId = null;
  rootNodeId = null;

  console.log("[SCENE] Scene cleanup completed");
}