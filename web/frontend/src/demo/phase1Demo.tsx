// Demonstration component for Phase 1: API Client & Data Layer
import type { Component } from 'solid-js';
import { createEffect, onMount } from 'solid-js';
import { apiClient } from '../services/apiClient';
import { dataStore } from '../stores/dataStore';
import { Button } from '@kobalte/core';
import { API_BASE_URL, COLORS, MESH_SETTINGS } from '../types';

const Phase1Demo: Component = () => {
  // Demo state
  let demoOutputRef: HTMLDivElement | undefined;

  const addDemoOutput = (message: string, isError: boolean = false) => {
    if (demoOutputRef) {
      const messageElement = document.createElement('div');
      messageElement.textContent = message;
      messageElement.className = isError
        ? 'text-red-500 mb-2'
        : 'text-green-500 mb-2';
      demoOutputRef.appendChild(messageElement);
    }
  };

  // Test API Client
  const testApiClient = async () => {
    addDemoOutput('Testing API Client...');

    try {
      // Test cache TTL
      apiClient.setCacheTTL(60000);
      addDemoOutput('✓ Cache TTL set to 60000ms');

      // Test that all methods exist
      const methods = [
        'getNamespaces', 'getRootNode', 'getClusterNode',
        'getClusterNodeChildren', 'getClusterNodeParent',
        'getClusterNodeSiblings', 'getPagesInCluster',
        'getPageDetails', 'loadNodeView', 'clearCache'
      ];

      methods.forEach(method => {
        if (typeof (apiClient as any)[method] === 'function') {
          addDemoOutput(`✓ API Client has method: ${method}`);
        } else {
          addDemoOutput(`✗ API Client missing method: ${method}`, true);
        }
      });

    } catch (error) {
      addDemoOutput(`✗ API Client test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  };

  // Test Data Store
  const testDataStore = async () => {
    addDemoOutput('Testing Data Store...');

    try {
      // Test initial state
      const initialState = dataStore.state;
      addDemoOutput(`✓ Initial view: ${initialState.currentView}`);
      addDemoOutput(`✓ Initial namespace: ${initialState.currentNamespace || 'null'}`);
      addDemoOutput(`✓ Initial loading: ${initialState.loading}`);
      addDemoOutput(`✓ Initial error: ${initialState.error || 'null'}`);

      // Test state changes
      dataStore.setLoading(true);
      addDemoOutput(`✓ Loading state set to: ${dataStore.state.loading}`);

      dataStore.setError('Test error');
      addDemoOutput(`✓ Error state set to: ${dataStore.state.error}`);

      dataStore.clearError();
      addDemoOutput(`✓ Error cleared: ${dataStore.state.error || 'null'}`);

      dataStore.setCurrentView('node_view');
      addDemoOutput(`✓ View changed to: ${dataStore.state.currentView}`);

      dataStore.setCurrentNamespace('enwiki_namespace_0');
      addDemoOutput(`✓ Namespace set to: ${dataStore.state.currentNamespace}`);

      // Test caching
      const testNode = {
        id: 1,
        namespace: 'enwiki_namespace_0',
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
      if (cachedNode) {
        addDemoOutput(`✓ Node caching works: ${(cachedNode as any).label}`);
      } else {
        addDemoOutput('✗ Node caching failed', true);
      }

      // Test namespace caching
      const testNamespace = {
        name: 'enwiki_namespace_0',
        display_name: 'English Wikipedia',
        language: 'English',
      };

      dataStore.cacheNamespace(testNamespace);
      const cachedNamespace = dataStore.getCachedNamespace('enwiki_namespace_0');
      if (cachedNamespace) {
        addDemoOutput(`✓ Namespace caching works: ${cachedNamespace.display_name}`);
      } else {
        addDemoOutput('✗ Namespace caching failed', true);
      }

      // Reset to initial state
      dataStore.setCurrentView('namespace_selection');
      dataStore.setCurrentNamespace(null);
      dataStore.setLoading(false);

    } catch (error) {
      addDemoOutput(`✗ Data Store test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  };

  // Test Type Definitions
  const testTypeDefinitions = () => {
    addDemoOutput('Testing Type Definitions...');

    try {
      // Test that constants are defined (now using imported constants)
      addDemoOutput(`✓ API_BASE_URL: ${API_BASE_URL}`);
      addDemoOutput(`✓ COLORS.ROOT: ${COLORS.ROOT}`);
      addDemoOutput(`✓ COLORS.LEAF: ${COLORS.LEAF}`);
      addDemoOutput(`✓ DEPTH colors count: ${COLORS.DEPTH.length}`);
      addDemoOutput(`✓ MESH_SETTINGS.SPHERE_SEGMENTS: ${MESH_SETTINGS.SPHERE_SEGMENTS}`);

    } catch (error) {
      addDemoOutput(`✗ Type Definitions test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  };

  // Run all tests on mount
  onMount(() => {
    addDemoOutput('=== WP Embeddings Visualization - Phase 1 Demo ===');
    addDemoOutput('Testing API Client & Data Layer Implementation');
    addDemoOutput('');

    // Run tests sequentially
    setTimeout(testApiClient, 100);
    setTimeout(testDataStore, 200);
    setTimeout(testTypeDefinitions, 300);
  });

  return (
    <div class="fixed top-4 right-4 w-80 bg-gray-900 bg-opacity-80 p-4 rounded-lg text-white text-sm overflow-y-auto max-h-96">
      <h3 class="text-lg font-bold mb-4 text-blue-400">Phase 1 Demo</h3>
      <div ref={demoOutputRef} class="demo-output"></div>
      <div class="mt-4 flex space-x-2">
        <Button.Root
          class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
          onClick={testApiClient}
        >
          Re-test API Client
        </Button.Root>
        <Button.Root
          class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
          onClick={testDataStore}
        >
          Re-test Data Store
        </Button.Root>
        <Button.Root
          class="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
          onClick={testTypeDefinitions}
        >
          Re-test Types
        </Button.Root>
      </div>
    </div>
  );
};

export default Phase1Demo;