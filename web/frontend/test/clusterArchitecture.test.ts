import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClusterManager } from '../src/babylon/clusterManager';
import { Scene, Mesh, Vector3, MeshBuilder, StandardMaterial } from "@babylonjs/core";
import type { ClusterNode } from '../src/types';

// Mock Babylon.js classes
vi.mock("@babylonjs/core", () => ({
  Scene: class Scene {
    constructor() {}
  },
  Mesh: class Mesh {
    setEnabled: vi.fn();
    dispose: vi.fn();
    isPickable = true;
    checkCollisions = true;
    position = new Vector3(0, 0, 0);
  },
  Vector3: class Vector3 {
    constructor(x: number = 0, y: number = 0, z: number = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    x: number;
    y: number;
    z: number;
    length(): number { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    normalize(): Vector3 { 
      const len = this.length();
      return len > 0 ? new Vector3(this.x / len, this.y / len, this.z / len) : new Vector3(0, 1, 0);
    }
    scale(scalar: number): Vector3 { return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar); }
    subtract(other: Vector3): Vector3 { return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z); }
    add(other: Vector3): Vector3 { return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z); }
    static RotationFromAxis(axis1: Vector3, axis2: Vector3): Vector3 {
      // Simplified rotation calculation for testing
      return new Vector3(0, 0, 0);
    }
  },
  MeshBuilder: {
    CreateSphere: vi.fn((name: string, options: any, scene: Scene) => {
      const mesh = new Mesh();
      mesh.name = name;
      return mesh;
    }),
    CreateCylinder: vi.fn((name: string, options: any, scene: Scene) => {
      const mesh = new Mesh();
      mesh.name = name;
      return mesh;
    })
  },
  StandardMaterial: class StandardMaterial {
    constructor(name: string, scene: Scene) {
      this.name = name;
    }
    name: string;
    diffuseColor: any;
    specularColor: any;
    emissiveColor: any;
    roughness: number = 0.8;
    dispose: vi.fn();
  },
  Color3: class Color3 {
    constructor(r: number, g: number, b: number) {
      this.r = r;
      this.g = g;
      this.b = b;
    }
    r: number;
    g: number;
    b: number;
  }
}));

describe('ClusterManager', () => {
  let scene: Scene;
  let clusterManager: ClusterManager;

  beforeEach(() => {
    scene = new Scene();
    clusterManager = new ClusterManager(scene);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty maps', () => {
    expect(clusterManager).toBeDefined();
    expect(clusterManager['masterNodeMap'].size).toBe(0);
    expect(clusterManager['masterLinkMap'].size).toBe(0);
    expect(clusterManager['nodeClusterMembers'].size).toBe(0);
    expect(clusterManager['clusterLinks'].size).toBe(0);
    expect(clusterManager['visibleClusters'].size).toBe(0);
    expect(clusterManager['rootNodeId']).toBeNull();
  });

  it('should set and get root node ID', () => {
    clusterManager.setRootNodeId(123);
    expect(clusterManager.getRootNodeId()).toBe(123);
    expect(clusterManager['visibleClusters'].has(123)).toBe(true);
  });

  it('should add node to cluster and reuse existing nodes', () => {
    const mockNode: ClusterNode = {
      id: 1,
      label: 'Test Node',
      centroid: [1, 2, 3],
      depth: 1,
      parent_id: 0,
      children: [],
      is_leaf: false,
      page_count: 10
    };

    // First call should create a new node
    const nodeMesh1 = clusterManager.addNodeToCluster(mockNode, 1);
    expect(nodeMesh1).toBeDefined();
    expect(clusterManager['masterNodeMap'].size).toBe(1);
    expect(clusterManager['nodeClusterMembers'].get(1)?.size).toBe(1);

    // Second call with same node should reuse existing mesh
    const nodeMesh2 = clusterManager.addNodeToCluster(mockNode, 1);
    expect(nodeMesh2).toBe(nodeMesh1);
    expect(clusterManager['masterNodeMap'].size).toBe(1);
    expect(clusterManager['nodeClusterMembers'].get(1)?.size).toBe(1);

    // Adding to different cluster should reuse node but add to new cluster
    const nodeMesh3 = clusterManager.addNodeToCluster(mockNode, 2);
    expect(nodeMesh3).toBe(nodeMesh1);
    expect(clusterManager['masterNodeMap'].size).toBe(1);
    expect(clusterManager['nodeClusterMembers'].get(1)?.size).toBe(1);
    expect(clusterManager['nodeClusterMembers'].get(2)?.size).toBe(1);
  });

  it('should show and hide clusters', () => {
    const mockNode: ClusterNode = {
      id: 1,
      label: 'Test Node',
      centroid: [1, 2, 3],
      depth: 1,
      parent_id: 0,
      children: [],
      is_leaf: false,
      page_count: 10
    };

    // Add node to cluster
    clusterManager.addNodeToCluster(mockNode, 1);

    // Show cluster should enable the node
    clusterManager.showCluster(1);
    expect(clusterManager['visibleClusters'].has(1)).toBe(true);

    // Hide cluster should remove from visible clusters but not delete the node
    clusterManager.hideCluster(1);
    expect(clusterManager['visibleClusters'].has(1)).toBe(false);
    expect(clusterManager['masterNodeMap'].size).toBe(1); // Node still exists
  });

  it('should not hide root cluster', () => {
    clusterManager.setRootNodeId(1);
    
    const mockNode: ClusterNode = {
      id: 1,
      label: 'Root Node',
      centroid: [0, 0, 0],
      depth: 0,
      parent_id: 0,
      children: [],
      is_leaf: false,
      page_count: 1
    };

    clusterManager.addNodeToCluster(mockNode, 1);
    clusterManager.showCluster(1);

    // Try to hide root cluster - should not work
    clusterManager.hideCluster(1);
    expect(clusterManager['visibleClusters'].has(1)).toBe(true);
  });

  it('should add links to clusters', () => {
    const parentNode: ClusterNode = {
      id: 1,
      label: 'Parent',
      centroid: [0, 0, 0],
      depth: 1,
      parent_id: 0,
      children: [2],
      is_leaf: false,
      page_count: 5
    };

    const childNode: ClusterNode = {
      id: 2,
      label: 'Child',
      centroid: [1, 1, 1],
      depth: 2,
      parent_id: 1,
      children: [],
      is_leaf: true,
      page_count: 3
    };

    // Add link to cluster
    const linkMesh = clusterManager.addLinkToCluster(parentNode, childNode, 1);
    expect(linkMesh).toBeDefined();
    expect(clusterManager['masterLinkMap'].size).toBe(1);
    expect(clusterManager['clusterLinks'].get(1)?.size).toBe(1);
  });

  it('should clean up unused nodes', () => {
    const node1: ClusterNode = {
      id: 1,
      label: 'Node 1',
      centroid: [1, 0, 0],
      depth: 1,
      parent_id: 0,
      children: [],
      is_leaf: false,
      page_count: 5
    };

    const node2: ClusterNode = {
      id: 2,
      label: 'Node 2',
      centroid: [2, 0, 0],
      depth: 1,
      parent_id: 0,
      children: [],
      is_leaf: false,
      page_count: 5
    };

    // Add nodes to different clusters
    clusterManager.addNodeToCluster(node1, 1);
    clusterManager.addNodeToCluster(node2, 2);

    // Show cluster 1, hide cluster 2
    clusterManager.showCluster(1);
    clusterManager.hideCluster(2);

    // Cleanup should remove node2 (not in any visible cluster)
    clusterManager.cleanupUnusedNodes();
    expect(clusterManager['masterNodeMap'].size).toBe(1); // Only node1 remains
    expect(clusterManager['masterNodeMap'].has(1)).toBe(true);
    expect(clusterManager['masterNodeMap'].has(2)).toBe(false);
  });

  it('should clean up unused links', () => {
    const parent1: ClusterNode = {
      id: 1,
      label: 'Parent 1',
      centroid: [0, 0, 0],
      depth: 1,
      parent_id: 0,
      children: [2],
      is_leaf: false,
      page_count: 5
    };

    const child1: ClusterNode = {
      id: 2,
      label: 'Child 1',
      centroid: [1, 1, 1],
      depth: 2,
      parent_id: 1,
      children: [],
      is_leaf: true,
      page_count: 3
    };

    const parent2: ClusterNode = {
      id: 3,
      label: 'Parent 2',
      centroid: [0, 0, 0],
      depth: 1,
      parent_id: 0,
      children: [4],
      is_leaf: false,
      page_count: 5
    };

    const child2: ClusterNode = {
      id: 4,
      label: 'Child 2',
      centroid: [1, 1, 1],
      depth: 2,
      parent_id: 3,
      children: [],
      is_leaf: true,
      page_count: 3
    };

    // Add links to different clusters
    clusterManager.addLinkToCluster(parent1, child1, 1);
    clusterManager.addLinkToCluster(parent2, child2, 2);

    // Show cluster 1, hide cluster 2
    clusterManager.showCluster(1);
    clusterManager.hideCluster(2);

    // Cleanup should remove link from cluster 2
    clusterManager.cleanupUnusedLinks();
    expect(clusterManager['masterLinkMap'].size).toBe(1); // Only link from cluster 1 remains
  });

  it('should clear all clusters and resources', () => {
    const mockNode: ClusterNode = {
      id: 1,
      label: 'Test Node',
      centroid: [1, 2, 3],
      depth: 1,
      parent_id: 0,
      children: [],
      is_leaf: false,
      page_count: 10
    };

    const parentNode: ClusterNode = {
      id: 2,
      label: 'Parent',
      centroid: [0, 0, 0],
      depth: 0,
      parent_id: 0,
      children: [1],
      is_leaf: false,
      page_count: 5
    };

    // Add some data
    clusterManager.addNodeToCluster(mockNode, 1);
    clusterManager.addLinkToCluster(parentNode, mockNode, 1);
    clusterManager.showCluster(1);

    // Clear everything
    clusterManager.clearAll();

    // All maps should be empty
    expect(clusterManager['masterNodeMap'].size).toBe(0);
    expect(clusterManager['masterLinkMap'].size).toBe(0);
    expect(clusterManager['nodeClusterMembers'].size).toBe(0);
    expect(clusterManager['clusterLinks'].size).toBe(0);
    expect(clusterManager['visibleClusters'].size).toBe(0);
    expect(clusterManager['rootNodeId']).toBeNull();
  });
});

describe('ClusterManager Integration', () => {
  it('should demonstrate cluster-based architecture benefits', () => {
    const scene = new Scene();
    const clusterManager = new ClusterManager(scene);

    // Create mock nodes
    const nodes: ClusterNode[] = [];
    for (let i = 1; i <= 10; i++) {
      nodes.push({
        id: i,
        label: `Node ${i}`,
        centroid: [i, i, i],
        depth: i % 3,
        parent_id: i > 1 ? i - 1 : 0,
        children: i < 10 ? [i + 1] : [],
        is_leaf: i === 10,
        page_count: 10 - i
      });
    }

    // Simulate navigation through clusters
    // Cluster 1: nodes 1-3
    clusterManager.addNodeToCluster(nodes[0], 1);
    clusterManager.addNodeToCluster(nodes[1], 1);
    clusterManager.addNodeToCluster(nodes[2], 1);
    clusterManager.addLinkToCluster(nodes[0], nodes[1], 1);
    clusterManager.addLinkToCluster(nodes[1], nodes[2], 1);

    // Cluster 2: nodes 2-4
    clusterManager.addNodeToCluster(nodes[1], 2); // Reuse node 2
    clusterManager.addNodeToCluster(nodes[2], 2); // Reuse node 3
    clusterManager.addNodeToCluster(nodes[3], 2);
    clusterManager.addLinkToCluster(nodes[1], nodes[2], 2);
    clusterManager.addLinkToCluster(nodes[2], nodes[3], 2);

    // Show cluster 1
    clusterManager.showCluster(1);
    expect(clusterManager['visibleClusters'].has(1)).toBe(true);

    // Navigate to cluster 2
    clusterManager.showCluster(2);
    clusterManager.hideCluster(1);
    expect(clusterManager['visibleClusters'].has(2)).toBe(true);
    expect(clusterManager['visibleClusters'].has(1)).toBe(false);

    // Verify node reuse: node 2 and 3 should exist only once
    expect(clusterManager['masterNodeMap'].size).toBe(4); // nodes 1,2,3,4
    expect(clusterManager['masterNodeMap'].has(2)).toBe(true);
    expect(clusterManager['masterNodeMap'].has(3)).toBe(true);

    // Cleanup should remove nodes not in visible clusters
    clusterManager.cleanupUnusedNodes();
    expect(clusterManager['masterNodeMap'].size).toBe(3); // nodes 2,3,4 (node 1 removed)
  });
});