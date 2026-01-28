import { Component, Show } from "solid-js";
import { dataStore } from '../stores/dataStore';
import { useI18n } from "../i18n";

/**
 * Node View Loading Indicator
 * Shows loading state when node view data is being loaded
 */
export const NodeViewLoading: Component = () => {
  const { t } = useI18n();

  return (
    <Show when={dataStore.state.currentView === 'node_view' && dataStore.state.loading}>
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-black/80 p-6 rounded-lg text-center">
          <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-white text-lg font-medium">{t("nodeViewLoading.title")}</p>
          <p class="text-gray-300 mt-2">
            {dataStore.state.currentNode
              ? t("nodeViewLoading.loadingChildren", { nodeLabel: dataStore.state.currentNode.label })
              : t("nodeViewLoading.initializing")
            }
          </p>
        </div>
      </div>
    </Show>
  );
};