# WP Embeddings Ancestor Visualization Implementation Plan

## Overview

This document outlines the implementation plan for extending the node view to include parent nodes and ancestors back to the root node, as requested in the requirements.

The requirements: extend the node view in the following way.  When the current node is not the root node, also include in the scene the model elements for the parent node,
and each parent node, back to the root node. For each parent or ancestor node, include that node's direct children.  Do not show billboards for these nodes. To avoid
crowding the view, the link from the parent to the current node should be extended about 3x longer so that the other parts of the tree are far away from the view.  The
camera should continue to point the centroid of the model parts for the current node and the current node's children.  One way to accomplish this is to add to/update the
scene when visiting a child node, and to reverse that when navigating back to the parent.

## Current State Analysis

Based on the existing implementation:

1. **Current Node View**: Shows the current node, its children, and parent node
2. **Navigation**: Users can click nodes to navigate to them with smooth transitions
3. **Performance**: Only loads current node, children, and parent to handle large datasets
4. **Visualization**: Uses Babylon.js with spheres for nodes and cylinders for links

## Requirements for Extension

The extension should:

1. Include parent node and all ancestor nodes back to root
2. Show direct children for each parent/ancestor node
3. Extend the link from parent to current node by ~5x to avoid crowding
4. Keep camera focused on centroid of current node and its children
5. Add/remove these elements when navigating to/from child nodes

## Implementation Plan

### Phase 1: Data Structure and State Management

**Objective**: Extend data structures to support ancestor tracking and extended visualization

**Tasks**:

1. **Extend Type Definitions** (`src/types/index.ts`)
   - Add `AncestorNode` type to track nodes in the path from current node to root
   - Extend `NodeViewData` to include ancestor chain with their direct children
   - Add constants for extended link length (3x normal length)

2. **Update Data Store** (`src/stores/dataStore.ts`)
   - Add `ancestorChain` to state to track nodes from current to root
   - Add `ancestorChildren` map to store direct children for each ancestor
   - Implement `loadExtendedNodeView()` method that loads:
     - Current node and its children (existing)
     - Parent node and its children (existing)
     - All ancestors back to root with their direct children (new)
   - Add caching for ancestor data to avoid redundant API calls

3. **Update API Client** (`src/services/apiClient.ts`)
   - Add `getNodeAncestors()` method to fetch all ancestors for a node
   - Add `getNodeChildrenBatch()` for efficient loading of children for multiple nodes
   - Optimize caching strategy for ancestor data

### Phase 2: Scene Management and Rendering

**Objective**: Extend Babylon.js scene to handle ancestor visualization

**Tasks**:

1. **Update Scene Manager** (`src/babylon/scene.ts`)
   - Add `ancestorNodes` and `ancestorLinks` collections
   - Implement `addAncestorNodes()` method to create ancestor meshes
   - Implement `removeAncestorNodes()` method to clean up when navigating away
   - Add extended link length calculation (5x normal, controlled by a variable in the code)

2. **Update Node Manager** (`src/babylon/nodeManager.ts`)
   - Implement positioning algorithm that extends links by 5x
   - Use existing colors and materials for ancestor nodes

3. **Update Link Manager** (`src/babylon/linkManager.ts`)
   - Implement extended link rendering for ancestor connections
   - Extended links should have the same material and color properties as other links
   - Ensure links terminate properly within sphere radii

### Phase 3: Camera and View Management

**Objective**: Maintain proper camera focus while showing extended tree

**Tasks**:

1. **Update Camera Controls** (`src/babylon/scene.ts`)
   - Modify camera targeting to focus on centroid of current node + its children
   - Add smooth transition when adding/removing ancestor elements
   - Add on-screen controls for zoom adjustment to accommodate extended view

2. **Add View State Management**
   - Track whether ancestor view is active
   - Add transition animations for showing/hiding ancestors
   - Implement performance monitoring for extended views

### Phase 4: Navigation Integration

**Objective**: Integrate ancestor visualization with navigation system

**Tasks**:

1. **Update Navigation Logic** (`src/stores/dataStore.ts`)
   - Modify `navigateToNode()` to load and display ancestors
   - Update `navigateToParent()` to remove ancestor elements
   - Add `toggleAncestorView()` method for user control


### Phase 5: Performance Optimization

**Objective**: Ensure smooth performance with extended visualization

**Tasks**:

1. **Implement Lazy Loading**
   - Load ancestors progressively (closest first)
   - Add loading states for ancestor data

2. **Optimize Rendering**
   - Use lower detail meshes for distant ancestor nodes
   - Implement frustum culling for ancestors
   - Add level-of-detail (LOD) for ancestor elements

3. **Memory Management**
   - Implement proper cleanup when navigating away
   - Add memory monitoring for extended views
   - Implement cache size limits for ancestor data

### Phase 6: Testing and Validation

**Tasks**:

1. **Unit Tests**
   - Test ancestor chain calculation
   - Test extended link positioning
   - Test camera targeting with ancestors

2. **Integration Tests**
   - Test navigation with ancestor view active
   - Test performance with deep hierarchies
   - Test memory usage patterns

3. **Visual Validation**
   - Verify ancestor nodes are properly positioned
   - Confirm extended links are 5x longer
   - Validate camera focus remains correct

## Technical Implementation Details

### Ancestor Chain Calculation

```typescript
// In dataStore.ts
async function loadExtendedNodeView(namespace: string, nodeId: number) {
  // Load current node view (existing)
  const [currentNode, children, parent] = await Promise.all([
    apiClient.getClusterNode(namespace, nodeId),
    apiClient.getClusterNodeChildren(namespace, nodeId),
    apiClient.getClusterNodeParent(namespace, nodeId),
  ]);

  // Load ancestors and their children (new)
  const ancestors = await apiClient.getNodeAncestors(namespace, nodeId);
  const ancestorChildrenPromises = ancestors.map(ancestor =>
    apiClient.getClusterNodeChildren(namespace, ancestor.id)
  );
  const ancestorChildrenList = await Promise.all(ancestorChildrenPromises);

  // Update state
  setAncestorChain(ancestors);
  setAncestorChildren(ancestors.reduce((map, ancestor, index) => {
    map[ancestor.id] = ancestorChildrenList[index];
    return map;
  }, {} as Record<number, ClusterNode[]>));
}
```

### Extended Link Positioning

```typescript
// In nodeManager.ts
function positionAncestorNodes(ancestors: ClusterNode[], currentNode: ClusterNode) {
  const NORMAL_LINK_LENGTH = 2.0;
  const EXTENDED_LINK_LENGTH = NORMAL_LINK_LENGTH * 5;

  // Position ancestors along extended path
  ancestors.forEach((ancestor, index) => {
    const nextNode = index < ancestors.length - 1 ? ancestors[index + 1] : currentNode;
    const direction = calculateDirection(ancestor, nextNode);

    // Position ancestor node
    const position = ancestor.centroid;
    createNodeMesh(ancestor, position, {
      size: 0.3, // Smaller for ancestors
      opacity: 0.7, // Semi-transparent
      color: getDepthColor(ancestor.depth, true) // Dimmer color
    });

    // Create extended link
    const linkLength = index === ancestors.length - 1 ? EXTENDED_LINK_LENGTH : NORMAL_LINK_LENGTH;
    createLinkMesh(ancestor, nextNode, {
      length: linkLength,
      thickness: 0.05,
      color: '#666666',
      dashed: index === ancestors.length - 1 // Dash only the extended link
    });
  });
}
```

### Camera Targeting with Ancestors

```typescript
// In scene.ts
function updateCameraTarget(currentNode: ClusterNode, children: ClusterNode[]) {
  // Calculate centroid of current node and its children
  const nodesForCentroid = [currentNode, ...children];
  const centroid = calculateCentroid(nodesForCentroid.map(n => n.centroid));

  // Smooth camera transition
  animateCameraToTarget(centroid, {
    duration: 500,
    easing: 'easeInOutQuad',
    zoomAdjustment: 1.2 // Slightly zoom out to accommodate extended view
  });
}
```

## Risk Assessment and Mitigation

### Performance Risks
- **Risk**: Large ancestor chains could impact performance
- **Mitigation**: Implement progressive loading and LOD

### Visual Clutter
- **Risk**: Extended view could become visually overwhelming
- **Mitigation**: Use semi-transparent materials and smaller sizes for ancestors

### Navigation Complexity
- **Risk**: Adding ancestors could complicate navigation logic
- **Mitigation**: Keep navigation state management separate from visualization

## Timeline Estimate

| Phase | Duration | Priority |
|-------|----------|----------|
| 1. Data Structure & State | 2-3 days | High |
| 2. Scene Management | 3-4 days | High |
| 3. Camera & View Management | 2 days | High |
| 4. Navigation Integration | 2 days | High |
| 5. Performance Optimization | 2-3 days | Medium |
| 6. Testing & Validation | 2 days | High |

**Total Estimated Time**: 13-17 days

## Implementation Order Recommendation

1. **Data Structure & State Management** (Foundation)
2. **Scene Management & Rendering** (Core visualization)
3. **Camera & View Management** (User experience)
4. **Navigation Integration** (Functionality)
5. **Performance Optimization** (Scalability)
6. **Testing & Validation** (Quality assurance)

This plan provides a comprehensive approach to extending the node view while maintaining performance and user experience. The implementation builds on existing patterns and architecture, ensuring consistency with the current codebase.