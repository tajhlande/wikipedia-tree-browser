import { createStore } from 'solid-js/store';
import type { 
  AppState, 
  ClusterNode, 
  Page, 
  NodeCache, 
  PageCache,
  Namespace 
} from '../types';
import { apiClient } from '../services/apiClient';

/**
 * Data Store for WP Embeddings Visualization
 * Manages application state and data caching
 */
export const createDataStore = () => {
  const [state, setState] = createStore<AppState>({
    currentView: 'namespace_selection',
    currentNamespace: null,
    currentNode: null,
    loading: false,
    error: null,
  });

  const [nodeCache, setNodeCache] = createStore<NodeCache>({});
  const [pageCache, setPageCache] = createStore<PageCache>({});
  const [namespaceCache, setNamespaceCache] = createStore<Namespace[]>([]);

  /**
   * Set loading state
   */
  const setLoading = (loading: boolean) => {
    setState('loading', loading);
  };

  /**
   * Set error state
   */
  const setError = (error: string | null) => {
    setState('error', error);
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Set current view
   */
  const setCurrentView = (view: AppState['currentView']) => {
    setState('currentView', view);
  };

  /**
   * Set current namespace
   */
  const setCurrentNamespace = (namespace: string | null) => {
    setState('currentNamespace', namespace);
  };

  /**
   * Set current node
   */
  const setCurrentNode = (node: ClusterNode | null) => {
    setState('currentNode', node);
  };

  /**
   * Cache a namespace
   */
  const cacheNamespace = (namespace: Namespace) => {
    setNamespaceCache(prev => {
      const existingIndex = prev.findIndex(n => n.name === namespace.name);
      if (existingIndex >= 0) {
        return [...prev.slice(0, existingIndex), namespace, ...prev.slice(existingIndex + 1)];
      }
      return [...prev, namespace];
    });
  };

  /**
   * Cache namespaces
   */
  const cacheNamespaces = (namespaces: Namespace[]) => {
    setNamespaceCache(namespaces);
  };

  /**
   * Get cached namespace by name
   */
  const getCachedNamespace = (namespaceName: string): Namespace | undefined => {
    return namespaceCache.find(n => n.name === namespaceName);
  };

  /**
   * Cache a node
   */
  const cacheNode = (key: string, node: ClusterNode | ClusterNode[]) => {
    setNodeCache(key, node);
  };

  /**
   * Get cached node
   */
  const getCachedNode = (key: string): ClusterNode | ClusterNode[] | undefined => {
    return nodeCache[key];
  };

  /**
   * Cache a page
   */
  const cachePage = (key: string, page: Page | Page[]) => {
    setPageCache(key, page);
  };

  /**
   * Get cached page
   */
  const getCachedPage = (key: string): Page | Page[] | undefined => {
    return pageCache[key];
  };

  /**
   * Clear all caches
   */
  const clearAllCaches = () => {
    setNodeCache({});
    setPageCache({});
    setNamespaceCache([]);
  };

  /**
   * Load namespaces from API
   */
  const loadNamespaces = async (): Promise<Namespace[]> => {
    setLoading(true);
    clearError();

    try {
      const result = await apiClient.getNamespaces();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load namespaces');
      }

      cacheNamespaces(result.data);
      return result.data;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error loading namespaces');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load root node for namespace
   */
  const loadRootNode = async (namespace: string): Promise<ClusterNode> => {
    setLoading(true);
    clearError();

    const cacheKey = `root_${namespace}`;
    const cachedNode = getCachedNode(cacheKey);

    if (cachedNode) {
      console.log(`[CACHE] Returning cached root node for namespace: ${namespace}`);
      return cachedNode as ClusterNode;
    }

    try {
      const result = await apiClient.getRootNode(namespace);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load root node');
      }

      cacheNode(cacheKey, result.data);
      return result.data;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error loading root node');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load node view (current node, children, parent)
   */
  const loadNodeView = async (namespace: string, nodeId: number): Promise<{
    currentNode: ClusterNode;
    children: ClusterNode[];
    parent: ClusterNode | null;
  }> => {
    setLoading(true);
    clearError();

    try {
      const { currentNode, children, parent } = await apiClient.loadNodeView(namespace, nodeId);

      if (!currentNode.success || !currentNode.data) {
        throw new Error(currentNode.error || 'Failed to load current node');
      }

      if (!children.success) {
        throw new Error(children.error || 'Failed to load children');
      }

      if (!parent.success) {
        throw new Error(parent.error || 'Failed to load parent');
      }

      // Cache the loaded data
      cacheNode(`node_${namespace}_${nodeId}`, currentNode.data);
      cacheNode(`children_${namespace}_${nodeId}`, children.data || []);
      if (parent.data) {
        cacheNode(`node_${namespace}_${parent.data.id}`, parent.data);
      }

      return {
        currentNode: currentNode.data,
        children: children.data || [],
        parent: parent.data || null,
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error loading node view');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigate to a node
   */
  const navigateToNode = async (namespace: string, nodeId: number): Promise<void> => {
    try {
      const { currentNode } = await loadNodeView(namespace, nodeId);
      setCurrentNode(currentNode);
      setCurrentNamespace(namespace);
      setCurrentView('node_view');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error navigating to node');
      throw error;
    }
  };

  /**
   * Navigate to parent node
   */
  const navigateToParent = async (): Promise<void> => {
    const currentNode = state.currentNode;
    const currentNamespace = state.currentNamespace;

    if (!currentNode || !currentNamespace || !currentNode.parent_id) {
      setError('No parent node available');
      return;
    }

    try {
      await navigateToNode(currentNamespace, currentNode.parent_id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error navigating to parent');
      throw error;
    }
  };

  /**
   * Navigate to root node
   */
  const navigateToRoot = async (): Promise<void> => {
    const currentNamespace = state.currentNamespace;

    if (!currentNamespace) {
      setError('No namespace selected');
      return;
    }

    try {
      const rootNode = await loadRootNode(currentNamespace);
      setCurrentNode(rootNode);
      setCurrentView('node_view');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error navigating to root');
      throw error;
    }
  };

  /**
   * Navigate to namespace selection
   */
  const navigateToNamespaceSelection = (): void => {
    setCurrentView('namespace_selection');
    setCurrentNamespace(null);
    setCurrentNode(null);
    clearError();
  };

  /**
   * Load pages for a cluster node
   */
  const loadPagesForNode = async (namespace: string, nodeId: number, page: number = 1, pageSize: number = 10): Promise<Page[]> => {
    setLoading(true);
    clearError();

    const cacheKey = `pages_${namespace}_${nodeId}_${page}_${pageSize}`;
    const cachedPages = getCachedPage(cacheKey);

    if (cachedPages) {
      console.log(`[CACHE] Returning cached pages for node ${nodeId}`);
      return cachedPages as Page[];
    }

    try {
      const result = await apiClient.getPagesInCluster(namespace, nodeId, page, pageSize);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load pages');
      }

      cachePage(cacheKey, result.data.items);
      return result.data.items;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error loading pages');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    state,
    setState,
    setLoading,
    setError,
    clearError,
    setCurrentView,
    setCurrentNamespace,
    setCurrentNode,
    cacheNode,
    getCachedNode,
    cachePage,
    getCachedPage,
    cacheNamespace,
    cacheNamespaces,
    getCachedNamespace,
    clearAllCaches,
    loadNamespaces,
    loadRootNode,
    loadNodeView,
    navigateToNode,
    navigateToParent,
    navigateToRoot,
    navigateToNamespaceSelection,
    loadPagesForNode,
  };
};

// Singleton instance for convenience
export const dataStore = createDataStore();

// Export type for easier usage
export type DataStore = ReturnType<typeof createDataStore>;