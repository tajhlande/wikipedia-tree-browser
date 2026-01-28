import { Component, Show } from "solid-js";
import { dataStore } from '../stores/dataStore';
import { ZoomControl } from './ZoomControl';
import { Button } from "@kobalte/core";
import { useI18n } from "../i18n";

/**
 * Navigation Controls Component
 * Provides UI controls for navigating the node hierarchy
 */
export const NavigationControls: Component = () => {
  const { t } = useI18n();

  return (
    <Show when={dataStore.state.currentView === 'node_view' && dataStore.state.currentNode}>
      <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {/* Parent Button */}
        <Button.Root
          onClick={() => {
            const currentNode = dataStore.state.currentNode;
            if (currentNode && currentNode.parent_id) {
              dataStore.navigateToParent();
            }
          }}
          disabled={!dataStore.state.currentNode?.parent_id}
          class={`px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${
            dataStore.state.currentNode?.parent_id
              ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
          title={dataStore.state.currentNode?.parent_id ? t("navigationControls.parentTooltip") : t("navigationControls.noParentTooltip")}
        >
          ← {t("navigationControls.parent")}
        </Button.Root>

        {/* Home Button */}
        <Button.Root
          onClick={() => {
            dataStore.navigateToRoot();
          }}
          class="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-all duration-200"
          title={t("navigationControls.homeTooltip")}
        >
          🏠 {t("navigationControls.home")}
        </Button.Root>


        {/* Billboard Toggle */}
        <Button.Root
          onClick={() => {
            dataStore.toggleBillboards();
          }}
          class={`px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${
            dataStore.state.showBillboards
              ? 'bg-teal-600 hover:bg-teal-700'
              : 'bg-gray-600 hover:bg-gray-700'
          }`}
          title={dataStore.state.showBillboards ? t("navigationControls.labelsTooltip.hide") : t("navigationControls.labelsTooltip.show")}
        >
          🏷️ {dataStore.state.showBillboards ? t("navigationControls.hideLabels") : t("navigationControls.showLabels")}
        </Button.Root>

        {/* Back to Namespace Selection */}
        <Button.Root
          onClick={() => {
            dataStore.navigateToNamespaceSelection();
          }}
          class="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all duration-200"
          title={t("navigationControls.chooseWikiTooltip")}
        >
          🔙 {t("navigationControls.chooseWiki")}
        </Button.Root>

        {/* Toggle bounding box visibility */}
        <Button.Root
          onClick={() => {
            dataStore.toggleBoundingBox();
          }}
          class={`px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${
            dataStore.state.showBoundingBox
              ? 'bg-teal-600 hover:bg-teal-700'
              : 'bg-gray-600 hover:bg-gray-700'
          }`}
          title={dataStore.state.showBoundingBox ? t("navigationControls.boundingBoxTooltip.hide") : t("navigationControls.boundingBoxTooltip.show")}
        >
          📦 {dataStore.state.showBoundingBox ? t("navigationControls.hideBoundingBox") : t("navigationControls.showBoundingBox")}
        </Button.Root>

      </div>

      {/* Zoom slider  */}
      <ZoomControl />
    </Show>
  );
};