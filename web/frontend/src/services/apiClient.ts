import { API_BASE_URL } from '../types';
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

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetchWithErrorHandling<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      console.log(`[API] ${options.method || 'GET'} ${url}`);

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

      const data = await response.json();
      console.log(`[API] Response:`, data);

      return {
        success: true,
        data: data.data || data,
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
        const namespacesArray = Array.isArray(result.data) ? result.data : result.data.namespaces;
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
      `${this.baseUrl}/namespace/${namespace}/root_node`
    );
  }

  /**
   * Get specific cluster node
   */
  async getClusterNode(namespace: string, nodeId: number): Promise<ApiResponse<ClusterNode>> {
    return this.fetchWithErrorHandling<ClusterNode>(
      `${this.baseUrl}/namespace/${namespace}/node_id/${nodeId}`
    );
  }

  /**
   * Get children of a cluster node
   */
  async getClusterNodeChildren(namespace: string, nodeId: number): Promise<ApiResponse<ClusterNode[]>> {
    return this.fetchWithErrorHandling<ClusterNode[]>(
      `${this.baseUrl}/namespace/${namespace}/node_id/${nodeId}/children`
    );
  }

  /**
   * Get parent of a cluster node
   */
  async getClusterNodeParent(namespace: string, nodeId: number): Promise<ApiResponse<ClusterNode | null>> {
    return this.fetchWithErrorHandling<ClusterNode | null>(
      `${this.baseUrl}/namespace/${namespace}/node_id/${nodeId}/parent`
    );
  }

  /**
   * Get siblings of a cluster node
   */
  async getClusterNodeSiblings(namespace: string, nodeId: number): Promise<ApiResponse<ClusterNode[]>> {
    return this.fetchWithErrorHandling<ClusterNode[]>(
      `${this.baseUrl}/namespace/${namespace}/node_id/${nodeId}/siblings`
    );
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
    const url = new URL(`${this.baseUrl}/namespace/${namespace}/node_id/${nodeId}`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());

    return this.fetchWithErrorHandling<Page[]>(url.toString());
  }

  /**
   * Get specific page details
   */
  async getPageDetails(namespace: string, pageId: number): Promise<ApiResponse<Page>> {
    return this.fetchWithErrorHandling<Page>(
      `${this.baseUrl}/namespace/${namespace}/page_id/${pageId}`
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