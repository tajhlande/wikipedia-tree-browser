import { Component, Show, createEffect, createSignal } from "solid-js";
import { dataStore } from '../stores/dataStore';
import { interactionManager } from '../babylon/scene';

/**
 * Node Information Overlay Component
 * Shows information about the current node and hovered nodes
 */
export const NodeInfoOverlay: Component = () => {
  const [hoverInfo, setHoverInfo] = createSignal<{nodeId: number; label: string; depth: number} | null>(null);

  // Update hover info when interaction manager changes
  createEffect(() => {
    if (interactionManager) {
      const hoveredNode = interactionManager.getHoveredNode();
      if (hoveredNode) {
        setHoverInfo({
          nodeId: hoveredNode.id,
          label: hoveredNode.label,
          depth: hoveredNode.depth
        });
      } else {
        setHoverInfo(null);
      }
    }
  });

  return (
    <Show when={dataStore.state.currentView === 'node_view' && dataStore.state.currentNode}>
      <div class="fixed bottom-4 right-4 z-50 bg-black/65 text-white p-4 rounded-lg max-w-xs">
        {/* Current Node Info */}
        <div class="mb-3">
          <h3 class="text-lg font-bold mb-1">Current Node</h3>
          <p class="text-sm">
            <strong>ID:</strong> {dataStore.state.currentNode?.id}<br/>
            <strong>Label:</strong> {dataStore.state.currentNode?.label}<br/>
            <strong>Depth:</strong> {dataStore.state.currentNode?.depth}<br/>
            <strong>Namespace:</strong> {dataStore.state.currentNamespace}<br/>
            <strong>Type:</strong> {dataStore.state.currentNode?.is_leaf ? 'Leaf' : 'Cluster'}
          </p>
        </div>

        {/* Hover Info */}
        <Show when={hoverInfo()}>
          <div class="mt-3 pt-3 border-t border-gray-600">
            <h4 class="font-semibold mb-1">Hovered Node</h4>
            <p class="text-sm">
              <strong>ID:</strong> {hoverInfo()?.nodeId}<br/>
              <strong>Label:</strong> {hoverInfo()?.label}<br/>
              <strong>Depth:</strong> {hoverInfo()?.depth}
            </p>
          </div>
        </Show>

        {/* Wikipedia Link for Leaf Nodes */}
        {/* <Show when={dataStore.state.currentNode?.is_leaf && dataStore.state.currentNamespace}>
          <div class="mt-3">
            <a
              href={`https://${dataStore.state.currentNamespace}.wikipedia.org/wiki/${encodeURIComponent(dataStore.state.currentNode?.label || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-block bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              🌐 View on Wikipedia
            </a>
          </div>
        </Show> */}
      </div>
    </Show>
  );
};