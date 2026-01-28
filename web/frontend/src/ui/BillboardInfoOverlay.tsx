import { Component, Show, createEffect, createSignal, onCleanup } from "solid-js";
import { interactionManager } from '../babylon/scene';
import type { ClusterNode } from '../types';
import { useI18n } from "../i18n";

/**
 * Billboard Information Overlay Component
 * Shows information about nodes when hovering over their billboard labels
 */
export const BillboardInfoOverlay: Component = () => {
  const { t } = useI18n();
    const [billboardHoverInfo, setBillboardHoverInfo] = createSignal<{
    nodeId: number;
    label: string;
    depth: number;
    isLeaf: boolean;
    parentId: number | null;
  } | null>(null);

  // Create a reactive signal for the hovered node
  const [hoveredNode, setHoveredNode] = createSignal<ClusterNode | null>(null);

  // Update hovered node when interaction manager changes
  createEffect(() => {
    if (interactionManager) {
      // Poll the interaction manager for hovered node changes
      const checkHoveredNode = () => {
        const currentHoveredNode = interactionManager?.getHoveredNode();
        // console.log(`[UI] BillboardInfoOverlay: Checking hovered node: ${currentHoveredNode ? currentHoveredNode.label : 'null'}`);
        if (currentHoveredNode) {
          setHoveredNode(currentHoveredNode);
        } else {
          setHoveredNode(null);
        }
      };

      // Check immediately
      checkHoveredNode();

      // Set up polling to detect changes
      const intervalId = setInterval(checkHoveredNode, 100);

      // Clean up interval on effect cleanup
      onCleanup(() => clearInterval(intervalId));
    }
  });

  // Update billboard hover info when hovered node changes
  createEffect(() => {
    const currentHoveredNode = hoveredNode();
    // console.debug(`[UI] BillboardInfoOverlay: Hovered node changed: ${currentHoveredNode ? currentHoveredNode.label : 'null'}`);

    if (currentHoveredNode) {
      // console.debug(`[UI] BillboardInfoOverlay: Showing info for node ${currentHoveredNode.id} - ${currentHoveredNode.label}`);
      setBillboardHoverInfo({
        nodeId: currentHoveredNode.id,
        label: currentHoveredNode.label,
        depth: currentHoveredNode.depth,
        isLeaf: currentHoveredNode.is_leaf,
        parentId: currentHoveredNode.parent_id
      });
      // console.debug(`[UI] BillboardInfoOverlay: State updated, should be visible`);
    } else {
      // console.debug(`[UI] BillboardInfoOverlay: Hiding overlay (no hovered node)`);
      setBillboardHoverInfo(null);
    }
  });

  return (
    <Show when={billboardHoverInfo()}>
      {/* {console.log(`[UI] BillboardInfoOverlay: Rendering with data`, billboardHoverInfo())} */}
      <div class="fixed bottom-4 left-4 z-50 bg-black/65 text-white p-4 rounded-lg max-w-xs border-2 border-blue-500">
        <h3 class="text-lg font-bold mb-2">{t("billboardInfoOverlay.title")}</h3>
        <p class="text-sm">
          <strong>{t("billboardInfoOverlay.id")}:</strong> {billboardHoverInfo()?.nodeId}<br/>
          <strong>{t("billboardInfoOverlay.label")}:</strong> {billboardHoverInfo()?.label}<br/>
          <strong>{t("billboardInfoOverlay.depth")}:</strong> {billboardHoverInfo()?.depth}<br/>
          <strong>{t("billboardInfoOverlay.type")}:</strong> {billboardHoverInfo()?.isLeaf ? t("billboardInfoOverlay.leafNode") : t("billboardInfoOverlay.clusterNode")}<br/>
          <Show when={billboardHoverInfo()?.parentId !== null && billboardHoverInfo()?.parentId !== undefined}>
            <strong>{t("billboardInfoOverlay.parentId")}:</strong> {billboardHoverInfo()?.parentId}<br/>
          </Show>
        </p>
      </div>
    </Show>
  );
};