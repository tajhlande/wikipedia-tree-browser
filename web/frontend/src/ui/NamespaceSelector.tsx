import { createSignal, onMount, Show, For } from 'solid-js';
import { apiClient } from '../services/apiClient';
import { dataStore } from '../stores/dataStore';
import type { Namespace } from '../types';
import { Button } from '@kobalte/core';
import NamespaceCard from './NamespaceCard';

/**
 * Namespace Selection Component
 * Handles loading and displaying available namespaces for selection
 */
export const NamespaceSelector = () => {
  const [namespaces, setNamespaces] = createSignal<Namespace[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');

  /**
   * Load namespaces from API
   */
  const loadNamespaces = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.getNamespaces();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load namespaces');
      }

      setNamespaces(result.data);
      dataStore.cacheNamespaces(result.data);
    } catch (error) {
      console.error('Failed to load namespaces:', error);
      let errorMessage = 'Unknown error loading namespaces';

      if (error instanceof Error) {
        errorMessage = error.message;
        // Provide more helpful error message for network errors
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Failed to connect to the backend server. Please ensure the backend is running and the /api/search/namespaces endpoint is available.';
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle namespace selection
   */
  const handleNamespaceSelect = async (namespace: Namespace) => {
    try {
      dataStore.setLoading(true);
      dataStore.setError(null);

      // Load root node for the selected namespace
      const rootNodeResult = await dataStore.loadRootNode(namespace.name);

      if (rootNodeResult) {
        // Validate root node has a valid ID
        if (!rootNodeResult.id) {
          throw new Error('Root node ID is undefined or invalid');
        }

        console.log(`[NAV] Navigating to root node ${rootNodeResult.id} for namespace ${namespace.name}`);

        // Set the root node as current node and switch to node view
        dataStore.setCurrentNode(rootNodeResult);
        dataStore.setCurrentNamespace(namespace.name);
        dataStore.setCurrentView('node_view');
      }
    } catch (error) {
      console.error('Failed to navigate to namespace:', error);
      setError(`Failed to load namespace: ${error instanceof Error ? error.message : 'Unknown error'}`);
      dataStore.setLoading(false);
    }
  };

  /**
   * Filter namespaces based on search query
   */
  const filteredNamespaces = () => {
    const query = searchQuery().toLowerCase();
    const currentNamespaces = namespaces();

    // Handle cases where namespaces might not be an array
    if (!Array.isArray(currentNamespaces)) {
      console.warn('namespaces is not an array:', currentNamespaces);
      return [];
    }

    if (!query) return currentNamespaces;

    return currentNamespaces.filter(namespace =>
      namespace.name.toLowerCase().includes(query) ||
      namespace.english_wiki_name.toLowerCase().includes(query) ||
      namespace.localized_wiki_name.toLowerCase().includes(query) ||
      namespace.language.toLowerCase().includes(query)
    );
  };

  /**
   * Load namespaces when component mounts
   */
  onMount(() => {
    loadNamespaces();
  });

  return (
    <div class="namespace-selector fixed inset-0 bg-gray-900/90 z-50 p-6 overflow-y-auto">
      <div class="max-w-6xl mx-auto">
        {/* Header */}
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold text-white">Wikipedia Tree Browser</h1>
          <div class="text-white text-sm">
            Select a wiki to begin
          </div>
        </div>

        {/* Search */}
        <div class="mb-6">
          <input
            type="text"
            placeholder="Search wikis..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Loading State */}
        <Show when={loading()}>
          <div class="loading-state text-center py-8">
            <div class="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="text-blue-400">Loading namespaces...</p>
          </div>
        </Show>

        {/* Error State */}
        <Show when={error()}>
          <div class="error-state bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <div class="flex items-center mb-2">
              <span class="text-red-400 mr-2">⚠️</span>
              <span class="text-red-300">{error()}</span>
            </div>
            <Button.Root
              onClick={loadNamespaces}
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
            >
              Retry
            </Button.Root>
          </div>
        </Show>

        {/* Namespace Grid */}
        <Show when={!loading() && !error()}>
          <div class="namespace-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={filteredNamespaces()}>
              {(namespace) => (
                <NamespaceCard
                  namespace={namespace}
                  onSelect={handleNamespaceSelect}
                />
              )}
            </For>

            {/* Empty State */}
            <Show when={filteredNamespaces().length === 0}>
              <div class="no-results col-span-full text-center py-8 text-gray-500">
                {searchQuery() ?
                  `No namespaces found matching "${searchQuery()}"` :
                  'No namespaces available. Please ensure the backend is running.'}
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default NamespaceSelector;