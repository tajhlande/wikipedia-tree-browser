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

  /**
   * Map backend cluster node response to frontend ClusterNode model
   */
  const _mapBackendNodeToFrontend = (backendNode: any, namespace: string): ClusterNode => {
    // Validate and normalize centroid data
    let centroid: Vector3D = [0, 0, 0]; // Default to origin

    if (backendNode.centroid_3d !== undefined && backendNode.centroid_3d !== null) {
      if (Array.isArray(backendNode.centroid_3d) && backendNode.centroid_3d.length === 3) {
        // Validate that all values are valid numbers
        const [x, y, z] = backendNode.centroid_3d;
        if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number' &&
            isFinite(x) && isFinite(y) && isFinite(z)) {
          centroid = [x, y, z];
        } else {
          console.warn(`[DATA] Invalid centroid values for node ${backendNode.node_id}:`, backendNode.centroid_3d);
        }
      } else {
        console.warn(`[DATA] Malformed centroid for node ${backendNode.node_id}:`, backendNode.centroid_3d);
      }
    } else if (backendNode.centroid_3d === null) {
      console.warn(`[DATA] Node ${backendNode.node_id} has null centroid_3d`);
    }

    return {
      id: backendNode.node_id || 0,
      namespace: backendNode.namespace || namespace,
      label: backendNode.final_label || backendNode.first_label || `Node ${backendNode.node_id}`,
      final_label: backendNode.final_label || backendNode.first_label || `Node ${backendNode.node_id}`,
      depth: backendNode.depth || 0,
      is_leaf: backendNode.child_count === 0, // Leaf if no children
      centroid: centroid,
      size: backendNode.doc_count || 0,
      parent_id: backendNode.parent_id || null,
      created_at: new Date().toISOString(), // Use current time as fallback
      updated_at: new Date().toISOString()  // Use current time as fallback
    };
  };

  const [state, setState] = createStore<AppState>({
    currentView: 'namespace_selection',
    currentNamespace: null,
    currentNode: null,
    ancestorChain: [],
    ancestorChildren: {},
    showAncestors: false,
    showBillboards: true,
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
   * Set ancestor chain
   */
  const setAncestorChain = (ancestors: ClusterNode[]) => {
    setState('ancestorChain', ancestors);
  };

  /**
   * Set ancestor children
   */
  const setAncestorChildren = (children: Record<number, ClusterNode[]>) => {
    setState('ancestorChildren', children);
  };

  /**
   * Set show ancestors flag
   */
  const setShowAncestors = (show: boolean) => {
    setState('showAncestors', show);
  };

  /**
   * Toggle ancestor visualization
   */
  const toggleAncestorView = () => {
    setState('showAncestors', !state.showAncestors);
  };

  /**
   * Set show billboards flag
   */
  const setShowBillboards = (show: boolean) => {
    setState('showBillboards', show);
  };

  /**
   * Toggle billboard visibility
   */
  const toggleBillboards = () => {
    setState('showBillboards', !state.showBillboards);
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
  const loadRootNode = async (namespace: string, bypassCache: boolean = false): Promise<ClusterNode> => {
    const cacheKey = `root_${namespace}`;
    const cachedNode = getCachedNode(cacheKey);

    if (cachedNode && !bypassCache) {
      console.log(`[CACHE] Returning cached root node for namespace: ${namespace}`);
      return cachedNode as ClusterNode;
    }

    setLoading(true);
    clearError();

    try {
      const result = await apiClient.getRootNode(namespace);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load root node');
      }

      // Map backend response to frontend model
      const mappedNode = _mapBackendNodeToFrontend(result.data, namespace);

      // Validate mapped node has a valid ID
      if (!mappedNode.id) {
        console.error('[DATA] Mapped root node missing ID:', mappedNode);
        throw new Error('Root node data is incomplete - missing ID after mapping');
      }

      // Validate this is actually a root node before caching
      if (mappedNode.parent_id !== null && mappedNode.parent_id !== undefined) {
        console.error(`[DATA] ERROR: Attempting to cache non-root node ${mappedNode.id} (parent_id: ${mappedNode.parent_id}) as root for namespace ${namespace}`);
        throw new Error(`Invalid root node: node ${mappedNode.id} has parent ${mappedNode.parent_id}`);
      }

      console.log(`[DATA] Loaded and mapped root node ${mappedNode.id} for namespace ${namespace} (bypass cache: ${bypassCache})`);

      cacheNode(cacheKey, mappedNode);
      return mappedNode;
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

      if (!parent.success || parent.data === null) {
        // It's okay for root node to have no parent
        if (parent.error && !parent.error.includes('no parent') && !parent.error.includes('not found')) {
          console.warn(`[DATA] Parent load warning: ${parent.error}`);
        }
        // Set parent to null if not found (expected for root node)
        parent.data = null;
        console.log(`[DATA] No parent found for node ${nodeId} - this is expected for root nodes`);
      }

      // Map backend data to frontend models
      const mappedCurrentNode = _mapBackendNodeToFrontend(currentNode.data, namespace);
      const mappedChildren = children.data ? children.data.map(child => _mapBackendNodeToFrontend(child, namespace)) : [];
      const mappedParent = parent.data ? _mapBackendNodeToFrontend(parent.data, namespace) : null;

      // Cache the mapped data
      cacheNode(`node_${namespace}_${nodeId}`, mappedCurrentNode);
      cacheNode(`children_${namespace}_${nodeId}`, mappedChildren);
      if (mappedParent) {
        cacheNode(`node_${namespace}_${mappedParent.id}`, mappedParent);
      }

      return {
        currentNode: mappedCurrentNode,
        children: mappedChildren,
        parent: mappedParent,
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error loading node view');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load extended node view with ancestors (current node, children, parent, ancestors)
   */
  const loadExtendedNodeView = async (namespace: string, nodeId: number): Promise<{
    currentNode: ClusterNode;
    children: ClusterNode[];
    parent: ClusterNode | null;
    ancestors: ClusterNode[];
    ancestorChildren: Record<number, ClusterNode[]>;
  }> => {
    setLoading(true);
    clearError();

    try {
      // Load basic node view first
      const { currentNode, children, parent } = await loadNodeView(namespace, nodeId);

      // Load ancestors and their children
      const ancestorsResult = await apiClient.getNodeAncestors(namespace, nodeId);

      if (!ancestorsResult.success || !ancestorsResult.data) {
        console.warn(`[DATA] No ancestors found for node ${nodeId} - this is expected for root nodes`);
        return {
          currentNode,
          children,
          parent,
          ancestors: [],
          ancestorChildren: {},
        };
      }

      // Build list of node IDs to load children for: all ancestors + parent (if exists)
      const ancestorIds = ancestorsResult.data.map(ancestor => ancestor.id);
      const nodeIdsToLoadChildrenFor = [...ancestorIds];

      // Add parent ID to load its children (siblings of current node)
      if (parent && parent.id) {
        // Only add if not already in ancestors list
        if (!nodeIdsToLoadChildrenFor.includes(parent.id)) {
          nodeIdsToLoadChildrenFor.push(parent.id);
          console.log(`[DATA] Adding parent ${parent.id} to children batch load`);
        }
      }

      console.log(`[DATA] Loading children for ${nodeIdsToLoadChildrenFor.length} nodes:`, nodeIdsToLoadChildrenFor);
      const childrenBatchResult = await apiClient.getNodeChildrenBatch(namespace, nodeIdsToLoadChildrenFor);

      if (!childrenBatchResult.success) {
        console.warn(`[DATA] Failed to load children for some ancestors: ${childrenBatchResult.error}`);
      }

      // Map backend data to frontend models for ancestors
      const mappedAncestors = ancestorsResult.data.map(ancestor =>
        _mapBackendNodeToFrontend(ancestor, namespace)
      );

      // Map ancestor children
      const mappedAncestorChildren: Record<number, ClusterNode[]> = {};
      if (childrenBatchResult.success && childrenBatchResult.data) {
        Object.entries(childrenBatchResult.data).forEach(([ancestorIdStr, childrenData]) => {
          const ancestorId = parseInt(ancestorIdStr);
          if (childrenData && childrenData.length > 0) {
            mappedAncestorChildren[ancestorId] = childrenData.map(child =>
              _mapBackendNodeToFrontend(child, namespace)
            );
            console.log(`[DATA] Loaded ${childrenData.length} children for node ${ancestorId}`);
          } else {
            mappedAncestorChildren[ancestorId] = [];
          }
        });
      }

      // Cache ancestor data
      mappedAncestors.forEach(ancestor => {
        cacheNode(`node_${namespace}_${ancestor.id}`, ancestor);
      });

      Object.entries(mappedAncestorChildren).forEach(([ancestorIdStr, childrenData]) => {
        const ancestorId = parseInt(ancestorIdStr);
        cacheNode(`children_${namespace}_${ancestorId}`, childrenData);
      });

      console.log(`[DATA] Extended view loaded: ${mappedAncestors.length} ancestors, ${Object.keys(mappedAncestorChildren).length} sets of ancestor children`);

      return {
        currentNode,
        children,
        parent,
        ancestors: mappedAncestors,
        ancestorChildren: mappedAncestorChildren,
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error loading extended node view');
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
      let result;
      if (state.showAncestors) {
        result = await loadExtendedNodeView(namespace, nodeId);
        setAncestorChain(result.ancestors);
        setAncestorChildren(result.ancestorChildren);
      } else {
        result = await loadNodeView(namespace, nodeId);
        setAncestorChain([]);
        setAncestorChildren({});
      }

      setCurrentNode(result.currentNode);
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
      // When navigating to parent, we need to reload the parent's view
      // If we're in ancestor view, we need to load the parent with its own ancestors
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
      // Always fetch fresh root node from API when navigating to root
      // This ensures we get the actual root (parent_id = null) and not a stale cache
      const rootNode = await loadRootNode(currentNamespace, true);
      // Use navigateToNode to properly load the full view (with children)
      await navigateToNode(currentNamespace, rootNode.id);
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
    setAncestorChain,
    setAncestorChildren,
    setShowAncestors,
    toggleAncestorView,
    setShowBillboards,
    toggleBillboards,
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
    loadExtendedNodeView,
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