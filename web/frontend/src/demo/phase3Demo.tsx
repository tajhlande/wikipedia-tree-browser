import { Component, Show, createEffect, createSignal, onMount } from "solid-js";
import { dataStore } from '../stores/dataStore';
import { scene, nodeManager, linkManager, interactionManager } from '../babylon/scene';
import { ClusterNode } from '../types';

/**
 * Phase 3 Demo Component
 * Demonstrates the 3D visualization core functionality
 */
export const Phase3Demo: Component = () => {
  const [demoStatus, setDemoStatus] = createSignal<string>('Ready');
  const [nodeCount, setNodeCount] = createSignal<number>(0);
  const [linkCount, setLinkCount] = createSignal<number>(0);
  
  // Update counts when managers are available
  createEffect(() => {
    if (nodeManager && linkManager) {
      setNodeCount(nodeManager.getAllNodes().size);
      setLinkCount(linkManager.getAllLinks().size);
    }
  });
  
  // Create a simple test structure
  const createTestStructure = () => {
    if (!scene || !nodeManager || !linkManager || !interactionManager) {
      setDemoStatus('Scene not initialized');
      return;
    }
    
    try {
      setDemoStatus('Creating test structure...');
      
      // Clear existing structure
      nodeManager.clearAllNodes();
      linkManager.clearAllLinks();
      interactionManager.clearAllNodes();
      
      // Create root node (red)
      const rootNode: ClusterNode = {
        id: 1,
        namespace: 'test',
        label: 'Root Node',
        final_label: 'Root Node',
        depth: 0,
        is_leaf: false,
        centroid: [0, 0, 0],
        size: 100,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Create child nodes at different depths
      const childNodes: ClusterNode[] = [
        {
          id: 2,
          namespace: 'test',
          label: 'Child 1 (Depth 1)',
          final_label: 'Child 1',
          depth: 1,
          is_leaf: false,
          centroid: [3, 2, 1],
          size: 50,
          parent_id: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          namespace: 'test',
          label: 'Child 2 (Depth 1)',
          final_label: 'Child 2',
          depth: 1,
          is_leaf: false,
          centroid: [-3, 2, -1],
          size: 50,
          parent_id: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 4,
          namespace: 'test',
          label: 'Child 3 (Depth 2)',
          final_label: 'Child 3',
          depth: 2,
          is_leaf: false,
          centroid: [1, -3, 2],
          size: 25,
          parent_id: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 5,
          namespace: 'test',
          label: 'Leaf Node (Depth 3)',
          final_label: 'Leaf Node',
          depth: 3,
          is_leaf: true,
          centroid: [-2, -3, -2],
          size: 10,
          parent_id: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      // Create all nodes
      nodeManager.createNode(rootNode);
      interactionManager.registerNode(rootNode.id, rootNode);
      
      childNodes.forEach(child => {
        nodeManager.createNode(child);
        interactionManager.registerNode(child.id, child);
      });
      
      // Create links
      linkManager.createLink(rootNode, childNodes[0]); // Root -> Child 1
      linkManager.createLink(rootNode, childNodes[1]); // Root -> Child 2
      linkManager.createLink(childNodes[0], childNodes[2]); // Child 1 -> Child 3
      linkManager.createLink(childNodes[1], childNodes[3]); // Child 2 -> Leaf
      
      setDemoStatus('Test structure created successfully!');
      
    } catch (error) {
      setDemoStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Phase 3 Demo Error:', error);
    }
  };
  
  // Clear the test structure
  const clearTestStructure = () => {
    if (nodeManager && linkManager && interactionManager) {
      nodeManager.clearAllNodes();
      linkManager.clearAllLinks();
      interactionManager.clearAllNodes();
      setDemoStatus('Test structure cleared');
    }
  };
  
  // Test mesh quality settings
  const testMeshQuality = () => {
    if (nodeManager && linkManager) {
      const originalNodeSettings = nodeManager.getMeshQuality();
      const originalLinkSettings = linkManager.getLinkQuality();
      
      console.log('Original Node Settings:', originalNodeSettings);
      console.log('Original Link Settings:', originalLinkSettings);
      
      // Test high quality
      nodeManager.setMeshQuality(32, 1.0);
      linkManager.setLinkQuality(16, 0.2, 0.3);
      
      setDemoStatus('Mesh quality set to high');
      
      // Revert after 3 seconds
      setTimeout(() => {
        nodeManager.setMeshQuality(originalNodeSettings.segments, originalNodeSettings.diameter);
        linkManager.setLinkQuality(originalLinkSettings.segments, originalLinkSettings.thickness, originalLinkSettings.endOffset);
        setDemoStatus('Mesh quality reverted to default');
      }, 3000);
    }
  };
  
  return (
    <Show when={dataStore.state.currentView === 'node_view'}>
      <div class="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div class="bg-black bg-opacity-80 text-white p-3 rounded-lg">
          <h3 class="font-bold text-center mb-2">🎮 Phase 3 Demo</h3>
          
          <div class="text-sm mb-2">
            <p>Status: {demoStatus()}</p>
            <p>Nodes: {nodeCount()} | Links: {linkCount()}</p>
          </div>
          
          <div class="flex gap-2">
            <button
              onClick={createTestStructure}
              class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs transition-colors"
              title="Create test node structure"
            >
              Create Test
            </button>
            
            <button
              onClick={clearTestStructure}
              class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs transition-colors"
              title="Clear test structure"
            >
              Clear
            </button>
            
            <button
              onClick={testMeshQuality}
              class="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs transition-colors"
              title="Test mesh quality settings"
            >
              Test Quality
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};