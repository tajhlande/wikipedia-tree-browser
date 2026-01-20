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
    console.log(`[INIT] Creating new ArcRotateCamera`);
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
    resourceManager = new ResourceManager(clusterManager);
    interactionManager = new InteractionManager(scene);

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
  if (!scene || !nodeManager || !clusterManager) {
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

  // Step 5: Determine clusters that remain visible
  const clustersRemainingVisible = new Set(targetClusters).intersection(currentlyVisible);
  if (clustersRemainingVisible.intersection(clustersToShow).size != 0) {
    console.warn(`[SCENE] Clusters remaining visible somehow intersects with clusters to show. `,
      `Clusters remaining visible: `, Array(clustersRemainingVisible),
      ` Clusters to show: `, Array(clustersToShow)
    );
  }

  console.log(`[SCENE] Sync: Clusters to show:`, Array.from(clustersToShow));
  console.log(`[SCENE] Sync: Clusters to hide:`, Array.from(clustersToHide));

  // Step 6: PRE-REGISTER all target clusters as visible before creating them
  // This ensures calculateRelativePosition() has the correct ancestor chain context
  targetClusters.forEach(clusterId => {
    if (clusterManager) {
      clusterManager.preRegisterClusterAsVisible(clusterId);
    }
  });

  // Step 7: Create missing clusters (now visibleClusters contains full ancestor chain)
  for (const clusterId of clustersToShow) {
    const nodeViewData = await dataStore.loadNodeView(namespace, clusterId);
    createNodeCluster(nodeViewData, clusterId);
  }

  // Step 8: Show target clusters (enable their meshes)
  targetClusters.forEach(clusterId => {
    if (nodeManager) {
      nodeManager.showCluster(clusterId);
    } else if (clusterManager) {
      clusterManager.showCluster(clusterId);
    }
  });

  // Step 9: Hide non-target clusters
  clustersToHide.forEach(clusterId => {
    if (nodeManager) {
      nodeManager.hideCluster(clusterId);
    } else if (clusterManager) {
      clusterManager.hideCluster(clusterId);
      console.warn(`[SCENE] Sync: Using cluster manager instead of node manager`)
    }
  });

  // Step 10: Ensure node meshes are not hidden for clusters remaining visible
  clustersRemainingVisible.forEach(clusterId => {
    console.log(`[SCENE] Refreshing visibility for cluster ${clusterId}`);
    if (clusterManager != null) {
      clusterManager.ensureClusterVisibility(clusterId);
    }
  });

  // Step 8: Clean up unused resources
  // console.log(`[SCENE] DEBUG: Before cleanup - Visible clusters:`, Array.from(clusterManager.getVisibleClusters()));
  // console.log(`[SCENE] Cleaning up unused nodes, links, and billboards`);
  clusterManager.cleanupUnusedNodes();
  clusterManager.cleanupUnusedLinks();
  if (nodeManager) {
    // console.log(`[SCENE] DEBUG: Before billboard cleanup - Billboard count:`, nodeManager['nodeBillboards']?.size || 'unknown');
    nodeManager.cleanupUnusedBillboards();
    // console.log(`[SCENE] DEBUG: After billboard cleanup - Billboard count:`, nodeManager['nodeBillboards']?.size || 'unknown');
  }
  // console.log(`[SCENE] DEBUG: After cleanup - Visible clusters:`, Array.from(clusterManager.getVisibleClusters()));

  // Step 9: Update all billboard positions after node movement is complete
  // This ensures billboards are properly positioned after ancestor chain calculations
  if (nodeManager) {
    console.log(`[SCENE] Updating all billboard positions after node movement`);
    nodeManager.updateAllBillboardPositions();
  }

  console.log(`[SCENE] Sync: final cluster list:`, Array.from(clusterManager.getVisibleClusters()));
}

/**
 * Load and render a node view (current node, children, parent)
 * Using state synchronization approach
 */
async function loadNodeView(namespace: string, nodeId: number) {
  if (!scene || !nodeManager || !clusterManager || !camera) {
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

    // Position camera after nodes are loaded and visible
    positionCameraForNode(nodeId);

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
   * Position camera for a specific node
   */
  function positionCameraForNode(nodeId: number): void {
    if (!camera) {
      console.warn(`[CAMERA] Cannot position camera - camera reference not set`);
      return;
    }
    if (clusterManager == null) {
      console.warn(`[CAMERA]  Cannot position camera - cluster manager not set`);
      return;
    }
    console.debug(`[CAMERA] Positioning camera for node ${nodeId}`);

    // Get the node mesh to position camera
    const nodeMesh = clusterManager.getNodeMesh(nodeId);

    if (!nodeMesh) {
      console.warn(`[CAMERA] Cannot position camera - node ${nodeId} mesh not found`);
      return;
    }

    // Calculate bounds of visible nodes in the current cluster for better positioning
    const visibleClusters = clusterManager.getVisibleClusters();
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    if (visibleClusters && visibleClusters.size > 0) {
      visibleClusters.forEach(clusterNodeId => {
        const nodesInCluster = clusterManager?.getNodesInCluster(clusterNodeId);
        if (nodesInCluster) {
          nodesInCluster.forEach(nodeId => {
            const mesh = clusterManager?.getNodeMesh(nodeId);
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
    console.debug(`[CAMERA] Bounding box of visible nodes: x:(${minX}, ${maxX}), y:(${minY}, ${maxY}), z:(${minZ}, ${maxZ})`);

    let targetPosition = nodeMesh.position;
    let cameraDistance = 20; // Default distance

    // If we found visible nodes, calculate better positioning
    if (minX !== Infinity) {
      console.debug(`[CAMERA] Computing camera positioning`);
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
      cameraDistance = 5 + maxSize * 1.2;
    } else {
      console.warn(`[CAMERA] Not computing camera positioning because no nodes found`);
    }

    // Position the camera
    const easingFrames = 90;
    const timeoutDelay = 10;
    const newCameraPosition = new Vector3(
      targetPosition.x,
      targetPosition.y + 5, // Slightly elevated
      targetPosition.z - cameraDistance
    );

    console.debug(`[CAMERA] Target position: (${newCameraPosition.x}. ${newCameraPosition.y}, ${newCameraPosition.z}), distance: ${cameraDistance}`);

    camera.setPosition(newCameraPosition);
    // setTimeout(() => camera?.position.easeTo("x", newCameraPosition.x, easingFrames), timeoutDelay);
    // setTimeout(() => camera?.position.easeTo("y", newCameraPosition.y, easingFrames), timeoutDelay);
    // setTimeout(() => camera?.position.easeTo("z", newCameraPosition.z, easingFrames), timeoutDelay);


    camera.setTarget(targetPosition);
    // setTimeout(() => camera?.target.easeTo("x", targetPosition.x, easingFrames), timeoutDelay);
    // setTimeout(() => camera?.target.easeTo("y", targetPosition.y, easingFrames), timeoutDelay);
    // setTimeout(() => camera?.target.easeTo("z", targetPosition.z, easingFrames), timeoutDelay);

    camera.radius = cameraDistance;
    dataStore.setState('cameraStartDistance',cameraDistance);
    camera.alpha = Math.PI / 2; // Side view
    camera.beta = Math.PI / 4; // Slightly above
    // setTimeout(() => camera?.easeTo("radius", cameraDistance, easingFrames), timeoutDelay);
    // setTimeout(() => camera?.easeTo("alpha", Math.PI / 2, easingFrames), timeoutDelay);
    // setTimeout(() => camera?.easeTo("beta",  Math.PI / 4, easingFrames), timeoutDelay);

    console.log(`[NAV] Positioned camera for node ${nodeId} at (${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z}) with distance ${cameraDistance}`);
  }




/**
 * Clean up resources when component unmounts
 */
export function cleanupScene() {
  console.log('[SCENE][CLEANUP] Cleaning up all managers for scene');

  if (resourceManager) {
    resourceManager.dispose();
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

  // if (engine) {
  //   engine.dispose();
  // }

  // Reset tracking variables
  currentNodeId = null;
  rootNodeId = null;

  console.log("[SCENE] Scene cleanup completed");
}