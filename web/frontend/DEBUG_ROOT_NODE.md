# Root Node Loading Debug Guide

## Issue Analysis

The error `[API] Error in GET http://localhost:8000/api/clusters/namespace/enwiki_namespace_0/node_id/undefined` indicates that `node_id` is `undefined` when trying to load a cluster node.

## Root Cause

The problem occurs in the navigation flow when selecting a namespace:

1. `NamespaceSelector.tsx` calls `dataStore.loadRootNode(namespace.name)`
2. `dataStore.loadRootNode()` successfully loads the root node
3. Then it calls `dataStore.navigateToNode(namespace.name, rootNodeResult.id)`
4. `navigateToNode()` calls `loadNodeView()` which tries to load current node, children, and parent
5. The `node_id` parameter becomes `undefined`

## Debugging Steps

### 1. Check Root Node Data Structure

Add logging to see what the root node contains:

```typescript
// In dataStore.ts, modify loadRootNode to add logging:
const result = await apiClient.getRootNode(namespace);
console.log('Root node data:', result.data);
```

### 2. Verify Root Node ID

Check if the root node has a valid ID:

```typescript
// In NamespaceSelector.tsx, add validation:
console.log('Root node result:', rootNodeResult);
if (!rootNodeResult.id) {
  console.error('Root node ID is undefined!');
  throw new Error('Root node ID is undefined');
}
```

### 3. Check Cache Behavior

The root node might be loaded from cache with incomplete data:

```typescript
// In dataStore.ts, check cached node:
if (cachedNode) {
  console.log('Using cached root node:', cachedNode);
  if (!cachedNode.id) {
    console.warn('Cached root node has no ID, clearing cache');
    clearAllCaches();
    return loadRootNode(namespace); // Retry without cache
  }
}
```

### 4. Alternative Solution (Implemented)

Instead of using `navigateToNode()` which loads children and parent, directly set the root node:

```typescript
// Set the root node as current node and switch to node view
dataStore.setCurrentNode(rootNodeResult);
dataStore.setCurrentNamespace(namespace.name);
dataStore.setCurrentView('node_view');
```

This avoids the complex `loadNodeView()` call for the initial root node load.

## Verification

After the fix, the flow should be:
1. Select namespace → `handleNamespaceSelect()`
2. Load root node → `loadRootNode()`
3. Set root node as current node directly
4. Switch to node view
5. Later navigation (clicking on nodes) will use `navigateToNode()` with proper node IDs

## Additional Checks

- Verify that `rootNodeResult` is not null
- Verify that `rootNodeResult.id` is defined
- Check that the root node data structure matches `ClusterNode` interface
- Ensure that the backend is returning proper root node data with valid ID
