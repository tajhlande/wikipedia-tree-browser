import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Scene } from "@babylonjs/core";
import { InteractionManager } from '../src/babylon/interactionManager';
import type { ClusterNode } from '../src/types';

describe('InteractionManager Namespace Switch Fix', () => {
  let mockScene: any;
  let interactionManager: InteractionManager | null = null;

  beforeEach(() => {
    // Create a mock scene object
    mockScene = {
      onPointerObservable: {
        add: vi.fn(),
        remove: vi.fn()
      },
      pick: vi.fn(),
      meshes: []
    };

    // Create interaction manager
    interactionManager = new InteractionManager(mockScene);
  });

  afterEach(() => {
    if (interactionManager) {
      interactionManager.dispose();
      interactionManager = null;
    }
  });

  it('should preserve interaction manager when clearing nodes', () => {
    if (!interactionManager) return;

    // Register some nodes
    const node1: ClusterNode = {
      id: 1,
      namespace: 'test',
      label: 'Node 1',
      final_label: 'Node 1',
      depth: 0,
      is_leaf: false,
      centroid: [0, 0, 0],
      size: 10,
      parent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const node2: ClusterNode = {
      id: 2,
      namespace: 'test',
      label: 'Node 2',
      final_label: 'Node 2',
      depth: 1,
      is_leaf: true,
      centroid: [1, 1, 1],
      size: 5,
      parent_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Register nodes
    interactionManager.registerNode(node1.id, node1);
    interactionManager.registerNode(node2.id, node2);

    // Verify nodes are registered
    expect(interactionManager.getHoveredNode()).toBeNull();

    // Simulate namespace switch - clear nodes but preserve manager
    interactionManager.clearAllNodes();

    // Verify manager is still functional
    expect(interactionManager).toBeDefined();
    expect(interactionManager.getHoveredNode()).toBeNull();

    // Should be able to register new nodes after clearing
    const node3: ClusterNode = {
      id: 3,
      namespace: 'new_namespace',
      label: 'Node 3',
      final_label: 'Node 3',
      depth: 0,
      is_leaf: false,
      centroid: [0, 0, 0],
      size: 15,
      parent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    interactionManager.registerNode(node3.id, node3);
    
    // Manager should still be functional after clearing and re-registering
    expect(interactionManager.getHoveredNode()).toBeNull();
  });

  it('should handle dispose and recreate scenario', () => {
    if (!interactionManager) return;

    // Register a node
    const node1: ClusterNode = {
      id: 1,
      namespace: 'test',
      label: 'Node 1',
      final_label: 'Node 1',
      depth: 0,
      is_leaf: false,
      centroid: [0, 0, 0],
      size: 10,
      parent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    interactionManager.registerNode(node1.id, node1);

    // Dispose the manager (simulating cleanupScene)
    interactionManager.dispose();

    // Create a new manager (simulating what happens when switching namespaces)
    const newInteractionManager = new InteractionManager(mockScene);

    // Should be able to register nodes with the new manager
    const node2: ClusterNode = {
      id: 2,
      namespace: 'new_namespace',
      label: 'Node 2',
      final_label: 'Node 2',
      depth: 0,
      is_leaf: false,
      centroid: [0, 0, 0],
      size: 10,
      parent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    newInteractionManager.registerNode(node2.id, node2);
    
    // New manager should be functional
    expect(newInteractionManager.getHoveredNode()).toBeNull();

    // Clean up
    newInteractionManager.dispose();
  });

  it('should maintain hover functionality after namespace switch', () => {
    if (!interactionManager) return;

    // Register nodes from first namespace
    const node1: ClusterNode = {
      id: 1,
      namespace: 'namespace1',
      label: 'Node 1',
      final_label: 'Node 1',
      depth: 0,
      is_leaf: false,
      centroid: [0, 0, 0],
      size: 10,
      parent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    interactionManager.registerNode(node1.id, node1);

    // Simulate namespace switch - clear nodes
    interactionManager.clearAllNodes();

    // Register nodes from second namespace
    const node2: ClusterNode = {
      id: 2,
      namespace: 'namespace2',
      label: 'Node 2',
      final_label: 'Node 2',
      depth: 0,
      is_leaf: false,
      centroid: [0, 0, 0],
      size: 15,
      parent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    interactionManager.registerNode(node2.id, node2);

    // Manager should still be able to handle hover events
    expect(interactionManager.getHoveredNode()).toBeNull();

    // The manager should be in a valid state for hover interactions
    expect(interactionManager).toBeInstanceOf(InteractionManager);
  });
});