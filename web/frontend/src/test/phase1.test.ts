// Test file for Phase 1: API Client & Data Layer
// This tests the basic functionality of the API client and data store

import { describe, beforeEach, it, expect } from 'vitest';
import { apiClient } from '../services/apiClient';
import { dataStore } from '../stores/dataStore';
import { API_BASE_URL, ClusterNode } from '../types';

describe('Phase 1: API Client & Data Layer', () => {
  beforeEach(() => {
    // Clear caches before each test
    apiClient.clearCache();
    dataStore.clearAllCaches();
  });

  describe('API Client', () => {
    it('should be initialized with correct base URL', () => {
      expect(apiClient).toBeDefined();
      // We can't test the private baseUrl directly, but we can test the singleton exists
    });

    it('should have all required methods', () => {
      expect(typeof apiClient.getNamespaces).toBe('function');
      expect(typeof apiClient.getRootNode).toBe('function');
      expect(typeof apiClient.getClusterNode).toBe('function');
      expect(typeof apiClient.getClusterNodeChildren).toBe('function');
      expect(typeof apiClient.getClusterNodeParent).toBe('function');
      expect(typeof apiClient.getClusterNodeSiblings).toBe('function');
      expect(typeof apiClient.getPagesInCluster).toBe('function');
      expect(typeof apiClient.getPageDetails).toBe('function');
      expect(typeof apiClient.loadNodeView).toBe('function');
      expect(typeof apiClient.clearCache).toBe('function');
      expect(typeof apiClient.setCacheTTL).toBe('function');
    });

    it('should handle cache TTL settings', () => {
      const originalTTL = apiClient['cacheTTL'];
      apiClient.setCacheTTL(60000); // 1 minute
      expect(apiClient['cacheTTL']).toBe(60000);
      apiClient.setCacheTTL(originalTTL);
    });
  });

  describe('Data Store', () => {
    it('should be initialized with correct default state', () => {
      const initialState = dataStore.state;
      expect(initialState.currentView).toBe('namespace_selection');
      expect(initialState.currentNamespace).toBeNull();
      expect(initialState.currentNode).toBeNull();
      expect(initialState.loading).toBe(false);
      expect(initialState.error).toBeNull();
    });

    it('should have all required methods', () => {
      expect(typeof dataStore.setLoading).toBe('function');
      expect(typeof dataStore.setError).toBe('function');
      expect(typeof dataStore.clearError).toBe('function');
      expect(typeof dataStore.setCurrentView).toBe('function');
      expect(typeof dataStore.setCurrentNamespace).toBe('function');
      expect(typeof dataStore.setCurrentNode).toBe('function');
      expect(typeof dataStore.cacheNode).toBe('function');
      expect(typeof dataStore.getCachedNode).toBe('function');
      expect(typeof dataStore.cachePage).toBe('function');
      expect(typeof dataStore.getCachedPage).toBe('function');
      expect(typeof dataStore.cacheNamespace).toBe('function');
      expect(typeof dataStore.cacheNamespaces).toBe('function');
      expect(typeof dataStore.getCachedNamespace).toBe('function');
      expect(typeof dataStore.clearAllCaches).toBe('function');
      expect(typeof dataStore.loadNamespaces).toBe('function');
      expect(typeof dataStore.loadRootNode).toBe('function');
      expect(typeof dataStore.loadNodeView).toBe('function');
      expect(typeof dataStore.navigateToNode).toBe('function');
      expect(typeof dataStore.navigateToParent).toBe('function');
      expect(typeof dataStore.navigateToRoot).toBe('function');
      expect(typeof dataStore.navigateToNamespaceSelection).toBe('function');
      expect(typeof dataStore.loadPagesForNode).toBe('function');
    });

    it('should handle state changes correctly', () => {
      // Test setting loading state
      dataStore.setLoading(true);
      expect(dataStore.state.loading).toBe(true);

      // Test setting error
      dataStore.setError('Test error');
      expect(dataStore.state.error).toBe('Test error');

      // Test clearing error
      dataStore.clearError();
      expect(dataStore.state.error).toBeNull();

      // Test setting view
      dataStore.setCurrentView('node_view');
      expect(dataStore.state.currentView).toBe('node_view');

      // Test setting namespace
      dataStore.setCurrentNamespace('enwiki');
      expect(dataStore.state.currentNamespace).toBe('enwiki');
    });

    it('should handle caching correctly', () => {
      // Test node caching
      const testNode: ClusterNode = {
        id: 1,
        namespace: 'enwiki',
        label: 'Test Node',
        final_label: 'Test Node',
        depth: 0,
        is_leaf: false,
        centroid: [0, 0, 0],
        size: 1,
        parent_id: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      dataStore.cacheNode('test_node', testNode);
      const cachedNode = dataStore.getCachedNode('test_node');
      expect(cachedNode).toEqual(testNode);

      // Test namespace caching
      const testNamespace = {
        id: 'enwiki',
        name: 'enwiki',
        display_name: 'English Wikipedia',
        description: 'English Wikipedia namespace',
      };

      dataStore.cacheNamespace(testNamespace);
      const cachedNamespace = dataStore.getCachedNamespace('enwiki');
      expect(cachedNamespace).toEqual(testNamespace);
    });
  });

  describe('Type Definitions', () => {
    it('should have correct type definitions', () => {
      expect(API_BASE_URL).toBe('http://localhost:8000/api');

      // Test that our type definitions are exported correctly
      // This is more of a compilation test than runtime test
      const testVector: [number, number, number] = [1, 2, 3];
      expect(Array.isArray(testVector)).toBe(true);
      expect(testVector.length).toBe(3);
    });
  });
});

// Mock API responses for testing (these would be used in a real test environment)
const mockNamespaceResponse = {
  success: true,
  data: [
    {
      id: 'enwiki',
      name: 'enwiki',
      display_name: 'English Wikipedia',
      description: 'English Wikipedia namespace',
    },
  ],
  timestamp: new Date().toISOString(),
};

const mockRootNodeResponse = {
  success: true,
  data: {
    id: 1,
    namespace: 'enwiki',
    label: 'Root',
    final_label: 'Root',
    depth: 0,
    is_leaf: false,
    centroid: [0, 0, 0],
    size: 1,
    parent_id: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  timestamp: new Date().toISOString(),
};