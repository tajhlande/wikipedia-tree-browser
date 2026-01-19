import { getApiBaseUrl } from '../util';
import type {
  Namespace,
  ClusterNode,
  Page,
  ApiResponse,
  PaginatedResponse,
  Vector3D
} from '../types';

/**
 * API Client for WP Embeddings Visualization
 * Handles all communication with the backend API
 */
export class ApiClient {
  private baseUrl: string;
  private namespaceCache: Namespace[] | null = null;
  private lastCacheTime: number = 0;
  private cacheTTL: number = 300000; // 5 minutes

  constructor(baseUrl: string = getApiBaseUrl()) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetchWithErrorHandling<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      console.debug(`[API] ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorData.error || response.statusText}`
        );
      }

      let data;
      try {
        data = await response.json();
        console.debug(`[API] Response for ${url}:`, data);
      } catch (jsonError) {
        console.error(`[API] Failed to parse JSON response for ${url}:`, jsonError);
        return {
          success: false,
          data: null as unknown as T,
          error: `Failed to parse JSON response: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        };
      }

      // Handle null responses (e.g., when parent doesn't exist)
      let responseData;
      if (data === null) {
        console.debug(`[API] Null response received for ${url} - this is expected for root node parent`);
        responseData = null;
      } else if (data !== null && data !== undefined && data.data !== undefined) {
        responseData = data.data;
      } else if (data !== null && data !== undefined) {
        responseData = data;
      } else {
        console.warn(`[API] Empty response received for ${url}`);
        responseData = null;
      }

      return {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[API] Error in ${options.method || 'GET'} ${url}:`, error);

      return {
        success: false,
        data: null as unknown as T,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get available namespaces
   */
  async getNamespaces(): Promise<ApiResponse<Namespace[]>> {
    // Return cached namespaces if available and not expired
    if (this.namespaceCache && Date.now() - this.lastCacheTime < this.cacheTTL) {
      return {
        success: true,
        data: this.namespaceCache,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const result = await this.fetchWithErrorHandling<any[]>(`${this.baseUrl}/search/namespaces`);

      if (result.success && result.data) {
        // Transform backend response to Namespace format
        const namespacesArray = result.data;
        const transformedNamespaces = namespacesArray.map(item => ({
          name: item.namespace,
          display_name: `${item.language} Wikipedia`,
          language: item.language
        }));

        this.namespaceCache = transformedNamespaces;
        this.lastCacheTime = Date.now();

        // Return transformed data
        return {
          success: true,
          data: transformedNamespaces,
          timestamp: new Date().toISOString(),
        };
      }

      return result;
    } catch (error) {
      console.error('Failed to load namespaces:', error);
      return {
        success: false,
        data: [],
        error: 'Failed to load namespaces. The backend may need to be restarted or the endpoint may not be available.',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get root node for a namespace
   */
  async getRootNode(namespace: string): Promise<ApiResponse<ClusterNode>> {
    return this.fetchWithErrorHandling<ClusterNode>(
      `${this.baseUrl}/clusters/namespace/${namespace}/root_node`
    );
  }

  /**
   * Get specific cluster node
   */
  async getClusterNode(namespace: string, nodeId: number): Promise<ApiResponse<ClusterNode>> {
    return this.fetchWithErrorHandling<ClusterNode>(
      `${this.baseUrl}/clusters/namespace/${namespace}/node_id/${nodeId}`
    );
  }

  /**
   * Get children of a cluster node
   */
  async getClusterNodeChildren(namespace: string, nodeId: number): Promise<ApiResponse<ClusterNode[]>> {
    return this.fetchWithErrorHandling<ClusterNode[]>(
      `${this.baseUrl}/clusters/namespace/${namespace}/node_id/${nodeId}/children`
    );
  }

  /**
   * Get parent of a cluster node
   */
  async getClusterNodeParent(namespace: string, nodeId: number): Promise<ApiResponse<ClusterNode | null>> {
    return this.fetchWithErrorHandling<ClusterNode | null>(
      `${this.baseUrl}/clusters/namespace/${namespace}/node_id/${nodeId}/parent`
    );
  }

  /**
   * Get siblings of a cluster node
   */
  async getClusterNodeSiblings(namespace: string, nodeId: number): Promise<ApiResponse<ClusterNode[]>> {
    return this.fetchWithErrorHandling<ClusterNode[]>(
      `${this.baseUrl}/clusters/namespace/${namespace}/node_id/${nodeId}/siblings`
    );
  }

  /**
   * Get all ancestors for a cluster node back to root
   */
  async getNodeAncestors(namespace: string, nodeId: number): Promise<ApiResponse<ClusterNode[]>> {
    return this.fetchWithErrorHandling<ClusterNode[]>(
      `${this.baseUrl}/clusters/namespace/${namespace}/node_id/${nodeId}/ancestors`
    );
  }

  /**
   * Get children for multiple nodes (batch loading)
   */
  async getNodeChildrenBatch(namespace: string, nodeIds: number[]): Promise<ApiResponse<Record<number, ClusterNode[]>>> {
    try {
      // For now, implement as sequential calls since backend may not support batch
      // This can be optimized later if backend adds batch endpoint
      const result: Record<number, ClusterNode[]> = {};

      for (const nodeId of nodeIds) {
        const response = await this.getClusterNodeChildren(namespace, nodeId);
        if (response.success && response.data) {
          result[nodeId] = response.data;
        } else {
          result[nodeId] = [];
        }
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get node cluster data (node + children + parent)
   */
  async getNodeCluster(nodeId: number, namespace: string): Promise<ApiResponse<ClusterNode[]>> {
    try {
      // Load the node and its immediate context
      const [node, children, parent] = await Promise.all([
        this.getClusterNode(namespace, nodeId),
        this.getClusterNodeChildren(namespace, nodeId),
        this.getClusterNodeParent(namespace, nodeId),
      ]);

      if (!node.success || !node.data) {
        return {
          success: false,
          data: [],
          error: node.error || 'Failed to load node',
          timestamp: new Date().toISOString(),
        };
      }

      const clusterData: ClusterNode[] = [node.data];

      // Add children if they exist
      if (children.success && children.data) {
        clusterData.push(...children.data);
      }

      // Add parent if it exists
      if (parent.success && parent.data) {
        clusterData.push(parent.data);
      }

      return {
        success: true,
        data: clusterData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get children for a specific node
   */
  async getNodeChildren(nodeId: number, namespace: string): Promise<ApiResponse<ClusterNode[]>> {
    return this.getClusterNodeChildren(namespace, nodeId);
  }

  /**
   * Get pages in a cluster
   */
  async getPagesInCluster(
    namespace: string,
    nodeId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<ApiResponse<Page[]>> {
    const url = new URL(`${this.baseUrl}/pages/namespace/${namespace}/node_id/${nodeId}`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());

    return this.fetchWithErrorHandling<Page[]>(url.toString());
  }

  /**
   * Get specific page details
   */
  async getPageDetails(namespace: string, pageId: number): Promise<ApiResponse<Page>> {
    return this.fetchWithErrorHandling<Page>(
      `${this.baseUrl}/pages/namespace/${namespace}/page_id/${pageId}`
    );
  }

  /**
   * Load all data needed for a node view (current node, children, parent)
   */
  async loadNodeView(namespace: string, nodeId: number): Promise<{
    currentNode: ApiResponse<ClusterNode>;
    children: ApiResponse<ClusterNode[]>;
    parent: ApiResponse<ClusterNode | null>;
  }> {
    const [currentNode, children, parent] = await Promise.all([
      this.getClusterNode(namespace, nodeId),
      this.getClusterNodeChildren(namespace, nodeId),
      this.getClusterNodeParent(namespace, nodeId),
    ]);

    return { currentNode, children, parent };
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.namespaceCache = null;
    this.lastCacheTime = 0;
  }

  /**
   * Set custom cache TTL
   */
  setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }
}

// Singleton instance for convenience
export const apiClient = new ApiClient();