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
  LinesMesh,
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
      // Ensure interaction manager exists - recreate if it was disposed
      if (!interactionManager && scene) {
        console.log("[SCENE EFFECT] Recreating InteractionManager after namespace switch");
        interactionManager = new InteractionManager(scene);
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

  // Reactive effect for bounding box visibility toggle
  createEffect(() => {
    const showBoundingBox = dataStore.state.showBoundingBox;
    console.log(`[SCENE EFFECT] Boundingbox visibility changed: ${showBoundingBox}`);

    updateBoundingBoxVisibility(showBoundingBox)
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

const bbNodeName = "scene-bounding-box";

/**
 * Add a bounding box around all the clusters in the scene
 *
 * @param scene the scene to add to
 * @param clusterManager the source of cluster info
 */
function setupBoundingBox(scene: Scene, clusterManager: ClusterManager): void {
  console.debug('[BOUNDINGBOX] Setting up bounding box');


  // determine bounds
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
  console.debug('[BOUNDINGBOX] Range: (', minX, ', ', minY, ', ', minZ, ') to (', maxX, ', ', maxY, ', ', maxZ, ')');


  // create line paths
  // each step should change only one of the 3 dimensions

  const linePath1 = Array<Vector3>();
  linePath1.push(new Vector3(minX, minY, minZ));
  linePath1.push(new Vector3(maxX, minY, minZ));
  linePath1.push(new Vector3(maxX, minY, maxZ));
  linePath1.push(new Vector3(minX, minY, maxZ));

  const linePath2 = Array<Vector3>();
  linePath2.push(new Vector3(maxX, maxY, minZ));
  linePath2.push(new Vector3(minX, maxY, minZ));
  linePath2.push(new Vector3(minX, maxY, maxZ));
  linePath2.push(new Vector3(maxX, maxY, maxZ));

  const linePath3 = Array<Vector3>();
  linePath3.push(new Vector3(minX, maxY, minZ));
  linePath3.push(new Vector3(minX, minY, minZ));
  linePath3.push(new Vector3(minX, minY, maxZ));
  linePath3.push(new Vector3(minX, maxY, maxZ));

  const linePath4 = Array<Vector3>();
  linePath4.push(new Vector3(maxX, minY, maxZ));
  linePath4.push(new Vector3(maxX, maxY, maxZ));
  linePath4.push(new Vector3(maxX, maxY, minZ));
  linePath4.push(new Vector3(maxX, minY, minZ));
  const bbLines = [linePath1, linePath2, linePath3, linePath4];

  // create the parent node if it doesn't exist, and update the lines in it
  let fetchedNode = scene.getNodeByName(bbNodeName);
  let bbLineSystem: LinesMesh | null;
  if (fetchedNode != null && fetchedNode instanceof LinesMesh) {
    console.debug('[BOUNDINGBOX] Found existing LinesMesh');
    bbLineSystem = fetchedNode as LinesMesh;
    bbLineSystem = MeshBuilder.CreateLineSystem(bbNodeName, {lines: bbLines, updatable: true, instance: bbLineSystem, });
  } else {
    console.debug('[BOUNDINGBOX] Creating new LinesMesh');
    bbLineSystem =  MeshBuilder.CreateLineSystem(bbNodeName, {lines: bbLines, updatable: true, }, scene);
    bbLineSystem.color = Color3.White();
  }

  bbLineSystem.setEnabled(dataStore.state.showBoundingBox);

}

function updateBoundingBoxVisibility(showBoundingBox: boolean) {
  let fetchedNode = scene?.getNodeByName(bbNodeName);
  if (fetchedNode != null && fetchedNode instanceof LinesMesh) {
    console.debug('[BOUNDINGBOX] Found existing LinesMesh to toggle bounding box visibility');
    fetchedNode.setEnabled(showBoundingBox);
  } else {
    console.warn('[BOUNDINGBOX] Did not find existing LinesMesh to toggle bounding box visibility');
  }
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

  // Step 11: Clean up unused resources
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

  // Step 12: Update all billboard positions after node movement is complete
  // This ensures billboards are properly positioned after ancestor chain calculations
  if (nodeManager) {
    console.log(`[SCENE] Updating all billboard positions after node movement`);
    nodeManager.updateAllBillboardPositions();
  }

  // Step 13: Draw a bounding box around the entire set of nodes
  if (clusterManager && scene) {
    setupBoundingBox(scene, clusterManager);
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

  // Ensure interaction manager exists - recreate if it was disposed
  if (!interactionManager && scene) {
    console.log("[SCENE] Recreating InteractionManager after namespace switch");
    interactionManager = new InteractionManager(scene);
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
    console.debug(`[CAMERA][POSITION] Positioning camera for node ${nodeId}`);

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
    console.debug(`[CAMERA][POSITION] Bounding box of visible nodes: (`, minX.toFixed(3), `, `, minY.toFixed(3), `, `, minZ.toFixed(3), `) to (`, maxX.toFixed(3), `, `, maxY.toFixed(3), `, `, maxZ.toFixed(3), `)`);

    // Calculate cluster center - this is what the camera will look at
    let targetPosition = nodeMesh.position.clone();
    let cameraDistance = 20; // Default distance

    // If we found visible nodes, calculate cluster center for camera target
    if (minX !== Infinity) {
      console.debug(`[CAMERA] Computing cluster center for camera target`);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;

      const sizeX = maxX - minX;
      const sizeY = maxY - minY;
      const sizeZ = maxZ - minZ;
      const maxSize = Math.max(sizeX, sizeY, sizeZ);

      // Use the center of the cluster as camera target
      targetPosition = new Vector3(centerX, centerY, centerZ);
      console.debug(`[CAMERA][POSITION] Cluster center for target position is now (`, centerX, `, `, centerY, `, `, centerZ, `)`);

      // Adjust camera distance based on cluster size
      cameraDistance = 5 + maxSize * 1.4;
    } else {
      console.warn(`[CAMERA] Not computing cluster center because no nodes found`);
      console.debug(`[CAMERA][POSITION] Cluster center for target position is now (`, targetPosition.x, `, `, targetPosition.y, `, `, targetPosition.z, `)`);
    }

    console.log(`[CAMERA][POSITION] Hacking target position to node mesh: (`, nodeMesh.position.x, `, `, nodeMesh.position.y, `, `, nodeMesh.position.z, `)`);

    // Position the camera using spherical coordinates (alpha, beta, radius)
    const easingFrames = 60;
    const fps = 30;

    // If we're at the root node, use a generic position
    // otherwise use a position collinear with the target position and the current node
    const currentNodeMesh = currentNodeId == null ? null : clusterManager?.getNodeMesh(currentNodeId);
    const standardNewCameraPosition = new Vector3(
      targetPosition.x,
      targetPosition.y + 5, // Slightly elevated
      targetPosition.z - cameraDistance
    );
    console.log(`[CAMERA][POSITION] Standard new camera position `, standardNewCameraPosition);
    // Calculate camera spherical coordinates to point at the selected node with cluster behind it
    let alpha, beta, radius;

    if (currentNodeId != rootNodeId && currentNodeId != null && currentNodeMesh != null) {
      const currentNodeMesh = clusterManager?.getNodeMesh(currentNodeId);
      if (currentNodeMesh) {
        console.log(`[CAMERA][POSITION] Camera target (cluster center)`, targetPosition);
        console.log(`[CAMERA][POSITION] Selected node position`, currentNodeMesh.position);

        // Calculate direction from selected node to camera target (cluster center)
        // This ensures the selected node is positioned between camera and cluster center
        const directionToTarget = targetPosition; // .subtract(currentNodeMesh.position);

        // Calculate the length of the direction vector
        const directionLength = directionToTarget.length();

        // Only proceed if the direction vector has significant length
        if (directionLength > 0.01) { // Small threshold to avoid division by zero
          // Normalize the direction vector for stable angle calculation
          const normalizedDirection = directionToTarget.normalize();

          // Position camera opposite to the cluster center relative to the selected node
          // This ensures: camera -> selected node -> cluster center (colinear)
          // And puts the bulk of meshes behind the selected node from camera's perspective
          radius = cameraDistance;
          alpha = Math.atan2(normalizedDirection.z, normalizedDirection.x); // Add Math.PI to position on opposite side

          // Ensure beta is in a reasonable range to avoid looking straight up/down
          const rawBeta = Math.acos(normalizedDirection.y);
          beta = Math.max(0.1, Math.min(Math.PI - 0.1, rawBeta)); // Clamp between 0.1 and PI-0.1 radians

          console.log(`[CAMERA][POSITION] Using cluster-focused spherical coordinates - alpha: ${alpha}, beta: ${beta}, radius: ${radius}`);
          console.log(`[CAMERA][POSITION] Camera will point at cluster center with selected node in foreground`);
        } else {
          console.warn(`[CAMERA][POSITION] Direction vector too small. Using standard spherical coordinates`);
          // Fallback when selected node and cluster center are too close
          radius = cameraDistance;
          alpha = Math.PI / 2; // Side view
          beta = Math.PI / 4;  // Slightly above
        }
      } else {
        console.warn(`[CAMERA][POSITION] Current node mesh not found. Using standard spherical coordinates`);
        // Fallback to standard positioning
        radius = cameraDistance;
        alpha = Math.PI / 2; // Side view
        beta = Math.PI / 4;  // Slightly above
      }
    } else {
      console.log(`[CAMERA][POSITION] Using standard spherical coordinates for root node`);
      // Standard positioning for root node
      radius = cameraDistance;
      alpha = Math.PI / 2; // Side view
      beta = Math.PI / 4;  // Slightly above
    }
    console.debug(`[CAMERA][POSITION] Calculated spherical coordinates - alpha: ${alpha}, beta: ${beta}, radius: ${radius}`);

    // Animate camera movement to new target
    const targetAnimation = new Animation(
      "camera.target",
      "target",
      fps,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    targetAnimation.setKeys([
      { frame: 0, value: camera.target.clone() },
      { frame: easingFrames, value: targetPosition.clone() }
    ]);

    const easingFn = new CubicEase();
    easingFn.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    targetAnimation.setEasingFunction(easingFn);

    // Animate camera movement to new radius
    const radiusAnimation = new Animation(
      "camera.radius",
      "radius",
      fps,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    radiusAnimation.setKeys([
      { frame: 0, value: camera.radius },
      { frame: easingFrames, value: radius }
    ]);

    radiusAnimation.setEasingFunction(easingFn);

    // Animate camera movement to new alpha
    const alphaAnimation = new Animation(
      "camera.alpha",
      "alpha",
      fps,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    alphaAnimation.setKeys([
      { frame: 0, value: camera.alpha },
      { frame: easingFrames, value: alpha }
    ]);

    alphaAnimation.setEasingFunction(easingFn);

    // Animate camera movement to new beta
    const betaAnimation = new Animation(
      "camera.beta",
      "beta",
      fps,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    betaAnimation.setKeys([
      { frame: 0, value: camera.beta },
      { frame: easingFrames, value: beta }
    ]);

    betaAnimation.setEasingFunction(easingFn);

    camera.animations = [targetAnimation, radiusAnimation, alphaAnimation, betaAnimation];

    console.log(`[CAMERA][POSITION] Starting alpha: `, camera?.alpha, `, beta: `, camera?.beta)
    console.log(`[CAMERA][POSITION] Target alpha: `, alpha, `, beta: `, beta)

    scene?.beginAnimation(camera, 0, easingFrames, false, 1, () => {
      console.log(`[CAMERA][POSITION] Setting post-animation target to `, targetPosition);
      camera?.setTarget(targetPosition, false, false, true);
      console.log(`[CAMERA][POSITION] Final alpha: `, camera?.alpha, `, beta: `, camera?.beta)
    });

    dataStore.setState('cameraStartDistance', cameraDistance);

    setTimeout((camera: ArcRotateCamera) => console.log(`[CAMERA][POSITION] After animation, position: `,
      [camera.position.x, camera.position.y, camera.position.z],
      `, target: `,
       [camera.target.x, camera.target.y, camera.target.z]), 3000, camera);

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
    // Don't dispose the interaction manager completely - just clear its node registrations
    // This preserves the interaction manager for hover/click events when switching namespaces
    interactionManager.clearAllNodes();
    console.log('[SCENE][CLEANUP] Cleared interaction manager node registrations (preserving manager for namespace switching)');
  }

  // if (engine) {
  //   engine.dispose();
  // }

  // Reset tracking variables
  currentNodeId = null;
  rootNodeId = null;

  console.log("[SCENE] Scene cleanup completed");
}