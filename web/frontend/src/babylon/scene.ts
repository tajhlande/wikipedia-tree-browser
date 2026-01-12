import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  Color3,
  DirectionalLight
} from "@babylonjs/core";
import { NodeManager } from './nodeManager';
import { LinkManager } from './linkManager';
import { InteractionManager } from './interactionManager';
import { dataStore } from '../stores/dataStore';
import { createEffect, onCleanup } from 'solid-js';

// Global scene references for reactive updates
export let scene: Scene | null = null;
export let engine: Engine | null = null;
export let camera: ArcRotateCamera | null = null;
export let nodeManager: NodeManager | null = null;
export let linkManager: LinkManager | null = null;
export let interactionManager: InteractionManager | null = null;

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

    // console.log("[SCENE] Camera controls enabled");

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

    // Initialize managers
    nodeManager = new NodeManager(scene);
    linkManager = new LinkManager(scene);
    interactionManager = new InteractionManager(scene);

    // Synchronize scene scaling between node and link managers
    // This ensures links scale properly with nodes
    const initialScale = 3.0; // Default scale factor
    if (nodeManager) nodeManager.setSceneScale(initialScale);
    if (linkManager) linkManager.setSceneScale(initialScale);

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
            nodeManager.updateLabelVisibility(camera);
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

    // console.log("[SCENE] Babylon.js scene initialized with visualization managers");

    return {
      engine,
      scene,
      camera,
      nodeManager,
      linkManager,
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
  if (!scene || !nodeManager || !linkManager) {
    console.error("[SCENE] Cannot setup reactive updates - scene or managers not initialized");
    return;
  }

  // Reactive effect for current view changes
  createEffect(() => {
    const currentView = dataStore.state.currentView;
    const currentNode = dataStore.state.currentNode;
    const currentNamespace = dataStore.state.currentNamespace;

    // console.log(`[SCENE] View changed to: ${currentView}`);

    if (currentView === 'node_view' && currentNode && currentNamespace) {
      // Remove demo box if it exists
      if ((scene as any).demoBox) {
        (scene as any).demoBox.dispose();
        (scene as any).demoBox = null;
      }

      // Load and render the node view
      loadNodeView(currentNamespace, currentNode.id);
    }
  });

  // Reactive effect for current node changes
  createEffect(() => {
    const currentNode = dataStore.state.currentNode;
    if (currentNode) {
      // console.log(`[SCENE] Current node changed to: ${currentNode.id} (${currentNode.label})`);

      // Center camera on current node
      if (camera && currentNode.centroid) {
        const targetPosition = new Vector3(
          currentNode.centroid[0],
          currentNode.centroid[1],
          currentNode.centroid[2]
        );

        // Set camera target directly (don't interfere with mouse controls)
        camera.setTarget(targetPosition);

        // console.log(`[SCENE] Camera centered on node ${currentNode.id} at (${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z})`);
      }
    }
  });
}

/**
 * Load and render a node view (current node, children, parent)
 */
async function loadNodeView(namespace: string, nodeId: number) {
  if (!scene || !nodeManager || !linkManager) {
    console.error("[SCENE] Cannot load node view - scene or managers not initialized");
    return;
  }

  try {
    // console.log(`[SCENE] Loading node view for node ${nodeId} in namespace ${namespace}`);

    // Clear existing nodes and links
    nodeManager.clearAllNodes();
    linkManager.clearAllLinks();

    // Load node data using API client
    const nodeViewData = await dataStore.loadNodeView(namespace, nodeId);

    // Log node data for debugging
    /* console.log(`[SCENE] Loaded node view data:`, {
      currentNode: {
        id: nodeViewData.currentNode.id,
        label: nodeViewData.currentNode.label,
        depth: nodeViewData.currentNode.depth,
        centroid: nodeViewData.currentNode.centroid,
        hasValidCentroid: nodeViewData.currentNode.centroid &&
                         Array.isArray(nodeViewData.currentNode.centroid) &&
                         nodeViewData.currentNode.centroid.length === 3
      },
      childrenCount: nodeViewData.children.length,
      parentExists: !!nodeViewData.parent
    }); */

    // Validate children data
    const invalidChildren = nodeViewData.children.filter(child =>
      !child || !child.id || !child.centroid || !Array.isArray(child.centroid) || child.centroid.length !== 3
    );

    if (invalidChildren.length > 0) {
      console.warn(`[SCENE] Found ${invalidChildren.length} children with invalid centroids:`,
                  invalidChildren.map(c => ({ id: c?.id, label: c?.label, centroid: c?.centroid })));

      // Filter out completely invalid children to prevent rendering issues
      const validChildren = nodeViewData.children.filter(child =>
        child && child.id && child.centroid && Array.isArray(child.centroid) && child.centroid.length === 3
      );

      // console.log(`[SCENE] Filtered out ${nodeViewData.children.length - validChildren.length} invalid children, keeping ${validChildren.length} valid ones`);

      // Update the node view data to only include valid children
      nodeViewData.children = validChildren;
    }

    // Create current node
    const currentNodeMesh = nodeManager.createNode(nodeViewData.currentNode);

    // Register nodes with interaction manager
    interactionManager.registerNode(nodeViewData.currentNode.id, nodeViewData.currentNode);

    // Create parent node if it exists
    if (nodeViewData.parent) {
      try {
        const parentNodeMesh = nodeManager.createNode(nodeViewData.parent);
        interactionManager.registerNode(nodeViewData.parent.id, nodeViewData.parent);

        // Create link from parent to current node
        try {
          linkManager.createLink(nodeViewData.parent, nodeViewData.currentNode);
          // console.log(`[SCENE] Created link from parent ${nodeViewData.parent.id} to current node ${nodeViewData.currentNode.id}`);
        } catch (linkError) {
          console.error(`[SCENE] Failed to create link from parent to current node:`, linkError);
        }
        // console.log(`[SCENE] Created parent node ${nodeViewData.parent.id}`);
      } catch (error) {
        console.error(`[SCENE] Failed to create parent node:`, error);
      }
    } else {
      // console.log(`[SCENE] No parent node for ${nodeViewData.currentNode.id} - this is expected for root nodes`);
    }

    // Create child nodes
    const successfulChildren = [];
    const failedChildren = [];

    nodeViewData.children.forEach(child => {
      try {
        const childNodeMesh = nodeManager.createNode(child);
        interactionManager.registerNode(child.id, child);

        // Create link from current node to child
        try {
          linkManager.createLink(nodeViewData.currentNode, child);
          // console.log(`[SCENE] Created link from current node ${nodeViewData.currentNode.id} to child ${child.id}`);
        } catch (linkError) {
          console.error(`[SCENE] Failed to create link to child ${child.id}:`, linkError);
        }

        successfulChildren.push(child.id);
      } catch (error) {
        console.error(`[SCENE] Failed to create child node ${child.id} (${child.label}):`, error);
        failedChildren.push({ id: child.id, label: child.label, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    if (failedChildren.length > 0) {
      console.warn(`[SCENE] Created ${successfulChildren.length} children successfully, failed to create ${failedChildren.length} children`);
      console.warn('[SCENE] Failed children:', failedChildren);
    }

    /* console.log(`[SCENE] Successfully loaded node view: ` +
                `${nodeViewData.children.length} children, ` +
                `${nodeViewData.parent ? 1 : 0} parent`); */

  } catch (error) {
    console.error("[SCENE] Failed to load node view:", error);
    dataStore.setError(`Failed to load node view: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean up scene resources
 */
export function cleanupScene() {
  if (nodeManager) {
    nodeManager.dispose();
    nodeManager = null;
  }

  if (linkManager) {
    linkManager.dispose();
    linkManager = null;
  }

  if (interactionManager) {
    interactionManager.dispose();
    interactionManager = null;
  }

  if (scene) {
    scene.dispose();
    scene = null;
  }

  if (engine) {
    engine.dispose();
    engine = null;
  }

  // console.log("[SCENE] Scene resources cleaned up");
}

// Setup cleanup on component unmount
onCleanup(() => {
  cleanupScene();
});