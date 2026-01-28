import { Component, Show, createEffect, createSignal } from "solid-js";
import { dataStore } from '../stores/dataStore';
import { interactionManager } from '../babylon/scene';
import { useI18n } from "../i18n";

/**
 * Node Information Overlay Component
 * Shows information about the current node and hovered nodes
 */
export const NodeInfoOverlay: Component = () => {
  const { t } = useI18n();
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
          <h3 class="text-lg font-bold mb-1">{t("nodeInfoOverlay.currentNode")}</h3>
          <p class="text-sm">
            <strong>{t("nodeInfoOverlay.id")}:</strong> {dataStore.state.currentNode?.id}<br/>
            <strong>{t("nodeInfoOverlay.label")}:</strong> {dataStore.state.currentNode?.label}<br/>
            <strong>{t("nodeInfoOverlay.depth")}:</strong> {dataStore.state.currentNode?.depth}<br/>
            <strong>{t("nodeInfoOverlay.namespace")}:</strong> {dataStore.state.currentNamespace}<br/>
            <strong>{t("nodeInfoOverlay.type")}:</strong> {dataStore.state.currentNode?.is_leaf ? t("nodeInfoOverlay.leaf") : t("nodeInfoOverlay.cluster")}
          </p>
        </div>

        {/* Hover Info */}
        <Show when={hoverInfo()}>
          <div class="mt-3 pt-3 border-t border-gray-600">
            <h4 class="font-semibold mb-1">{t("nodeInfoOverlay.hoveredNode")}</h4>
            <p class="text-sm">
              <strong>{t("nodeInfoOverlay.id")}:</strong> {hoverInfo()?.nodeId}<br/>
              <strong>{t("nodeInfoOverlay.label")}:</strong> {hoverInfo()?.label}<br/>
              <strong>{t("nodeInfoOverlay.depth")}:</strong> {hoverInfo()?.depth}
            </p>
          </div>
        </Show>

      </div>
    </Show>
  );
};