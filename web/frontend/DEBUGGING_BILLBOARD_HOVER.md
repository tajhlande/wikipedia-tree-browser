# Billboard Hover Debugging Guide

## Issue Description
The billboard hover functionality is not working as expected. No `[INTERACT]` log messages are appearing in the console when hovering over billboards.

## Changes Made

### 1. Billboard Pickability
**File:** `frontend/src/babylon/nodeManager.ts`
- Added `billboard.isPickable = true` to make billboards respond to pointer events
- Added `billboard.position.z += 0.1` to ensure billboards are in front of nodes
- Added alpha mode settings to handle transparency properly

### 2. Interaction Manager Updates
**File:** `frontend/src/babylon/interactionManager.ts`
- Updated `handleNodeHover()` to recognize both `node_*` and `billboard_*` mesh names
- Added comprehensive debugging logs to track pointer events
- Added error handling for cases where node data is not found

### 3. New UI Component
**File:** `frontend/src/ui/BillboardInfoOverlay.tsx` (created)
- New component that displays node information when hovering over billboards
- Shows in bottom-left corner (complements existing NodeInfoOverlay)
- Displays: Node ID, Label, Depth, Type, and Parent ID

### 4. Integration
**File:** `frontend/src/App.tsx`
- Added import for BillboardInfoOverlay
- Added component to the main app layout

## Debugging Steps

### Step 1: Verify Pointer Events
1. Open browser developer console (F12)
2. Move mouse around the scene
3. Look for messages: `[INTERACT] Pointer move event, picked mesh: ...`

**If no messages appear:**
- The interaction manager is not receiving pointer events
- Check if the scene has a camera with proper input handling
- Verify the interaction manager is properly initialized

### Step 2: Verify Billboard Pickability
1. Hover specifically over billboard labels
2. Look for messages containing `billboard_*`

**If no billboard messages appear:**
- Billboards might not be pickable
- Check if `billboard.isPickable = true` is set
- Verify billboard naming follows `billboard_${node.id}` pattern
- Check if billboards are being occluded by other objects

### Step 3: Verify Node Registration
1. Check if nodes are properly registered with the interaction manager
2. Look for registration messages in the console

**If nodes aren't registered:**
- Check the scene setup code where nodes are created
- Verify `interactionManager.registerNode()` is called for each node

### Step 4: Verify UI Response
1. If console shows hover events but no UI panel appears
2. Check the BillboardInfoOverlay component
3. Verify the component is properly connected to the interaction manager

## Common Issues and Solutions

### Issue: No Pointer Events at All
**Possible Causes:**
- Interaction manager not initialized
- Scene camera not set up for input
- Babylon.js engine not properly configured

**Solutions:**
- Check `scene.ts` for proper interaction manager initialization
- Verify camera has `camera.attachControl(canvas, true)`
- Ensure engine is created with proper parameters

### Issue: Pointer Events but No Billboard Detection
**Possible Causes:**
- Billboards not pickable
- Billboards occluded by other objects
- Billboard transparency blocking picks
- Billboard naming incorrect

**Solutions:**
- Verify `billboard.isPickable = true`
- Increase billboard size or position
- Adjust alpha mode settings
- Check billboard naming pattern

### Issue: Billboard Detection but No UI
**Possible Causes:**
- BillboardInfoOverlay not imported/rendered
- Component not properly connected to interaction manager
- CSS styling issues

**Solutions:**
- Check App.tsx for proper component inclusion
- Verify component is subscribed to interaction manager changes
- Inspect DOM for rendered component

## Testing the Implementation

### Manual Testing
1. Build and run the application: `npm run dev`
2. Open browser and navigate to node view
3. Open developer console
4. Hover over billboard labels
5. Verify console messages and UI panel

### Expected Console Output
```
[INTERACT] Pointer move event, picked mesh: billboard_123
[INTERACT] Hovering over billboard 123: Node Label
```

### Expected UI Behavior
- Panel appears in bottom-left corner when hovering over billboards
- Panel disappears when mouse moves away
- Panel shows comprehensive node information

## Additional Debugging Tools

### Babylon.js Inspector
1. Press F12 to open Babylon.js inspector
2. Check scene graph for billboard meshes
3. Verify pickable property is set
4. Check material properties

### Browser Debugging
1. Use element inspector to check if BillboardInfoOverlay is rendered
2. Check network tab for any errors
3. Use console to manually test interaction manager methods

## Rollback Plan

If issues persist, you can temporarily revert the changes:

```bash
# Revert billboard changes
git checkout HEAD -- frontend/src/babylon/nodeManager.ts

# Revert interaction manager changes
git checkout HEAD -- frontend/src/babylon/interactionManager.ts

# Remove new UI component
rm frontend/src/ui/BillboardInfoOverlay.tsx

# Revert app changes
git checkout HEAD -- frontend/src/App.tsx
```

Then gradually reapply changes to isolate the issue.