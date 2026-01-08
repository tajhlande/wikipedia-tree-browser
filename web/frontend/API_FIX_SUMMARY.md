# API Endpoint Fix Summary

## Problem Identified

The frontend API client was calling incorrect endpoints that didn't match the backend API structure, causing 404 errors.

### Original Error
```
[API] Error in GET http://localhost:8000/api/namespace/enwiki_namespace_0/root_node: 
Error: HTTP error! status: 404, message: Not Found
```

## Root Cause

The frontend API client was missing the proper API module prefixes:
- **Incorrect**: `/api/namespace/...`
- **Correct**: `/api/clusters/namespace/...` or `/api/pages/namespace/...`

## Backend API Structure

The backend has three main API modules:
1. **Search API**: `/api/search/...` - For namespace discovery
2. **Clusters API**: `/api/clusters/namespace/...` - For cluster-related operations
3. **Pages API**: `/api/pages/namespace/...` - For page-related operations

## Files Modified

### `frontend/src/services/apiClient.ts`

Fixed 7 API endpoints:

1. **getRootNode()**
   - ❌ Before: `${this.baseUrl}/namespace/${namespace}/root_node`
   - ✅ After: `${this.baseUrl}/clusters/namespace/${namespace}/root_node`

2. **getClusterNode()**
   - ❌ Before: `${this.baseUrl}/namespace/${namespace}/node_id/${nodeId}`
   - ✅ After: `${this.baseUrl}/clusters/namespace/${namespace}/node_id/${nodeId}`

3. **getClusterNodeChildren()**
   - ❌ Before: `${this.baseUrl}/namespace/${namespace}/node_id/${nodeId}/children`
   - ✅ After: `${this.baseUrl}/clusters/namespace/${namespace}/node_id/${nodeId}/children`

4. **getClusterNodeParent()**
   - ❌ Before: `${this.baseUrl}/namespace/${namespace}/node_id/${nodeId}/parent`
   - ✅ After: `${this.baseUrl}/clusters/namespace/${namespace}/node_id/${nodeId}/parent`

5. **getClusterNodeSiblings()**
   - ❌ Before: `${this.baseUrl}/namespace/${namespace}/node_id/${nodeId}/siblings`
   - ✅ After: `${this.baseUrl}/clusters/namespace/${namespace}/node_id/${nodeId}/siblings`

6. **getPagesInCluster()**
   - ❌ Before: `${this.baseUrl}/namespace/${namespace}/node_id/${nodeId}`
   - ✅ After: `${this.baseUrl}/pages/namespace/${namespace}/node_id/${nodeId}`

7. **getPageDetails()**
   - ❌ Before: `${this.baseUrl}/namespace/${namespace}/page_id/${pageId}`
   - ✅ After: `${this.baseUrl}/pages/namespace/${namespace}/page_id/${pageId}`

## Verification

The search namespaces endpoint was already correct:
- ✅ **getAvailableNamespaces()**: `${this.baseUrl}/search/namespaces`

## Impact

This fix resolves the 404 errors and ensures that:
1. Namespace selection works correctly
2. Root node loading works
3. Cluster navigation works
4. Page data loading works
5. All API calls reach the correct backend endpoints

## Testing

The fix can be verified by:
1. Running the application and selecting a namespace
2. Navigating through the cluster hierarchy
3. Loading page details
4. Using the provided test HTML file to verify all endpoints

## Related Files

- `backend/api/clusters.py` - Backend cluster endpoints
- `backend/api/pages.py` - Backend page endpoints  
- `backend/api/search.py` - Backend search endpoints
- `frontend/test_api_fix.html` - Test page for verification
