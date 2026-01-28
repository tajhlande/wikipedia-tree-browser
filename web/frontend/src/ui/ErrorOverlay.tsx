import { Component, Show, createEffect } from "solid-js";
import { dataStore } from '../stores/dataStore';
import { Button } from "@kobalte/core";
import { useI18n } from "../i18n";

/**
 * Error Overlay Component
 * Shows error messages to the user
 */
export const ErrorOverlay: Component = () => {
  const { t } = useI18n();

  return (
    <Show when={dataStore.state.error}>
      <div class="fixed bottom-4 right-4 z-50 max-w-sm">
        <div class="bg-red-600 text-white p-4 rounded-lg shadow-lg border-l-4 border-red-800">
          <div class="flex justify-between items-start">
            <h3 class="font-bold text-lg">{t("errorOverlay.title")}</h3>
            <Button.Root
              onClick={() => dataStore.setError(null)}
              class="text-white hover:text-gray-200 ml-2"
              title={t("errorOverlay.dismiss")}
            >
              ✕
            </Button.Root>
          </div>
          <p class="mt-2 text-sm">
            {dataStore.state.error}
          </p>
          <div class="mt-3 flex gap-2">
            <Button.Root
              onClick={() => {
                // Try to recover by going back to namespace selection
                dataStore.navigateToNamespaceSelection();
                dataStore.setError(null);
              }}
              class="bg-red-800 hover:bg-red-900 px-3 py-1 rounded text-sm transition-colors"
            >
              {t("errorOverlay.backToNamespaces")}
            </Button.Root>
            <Button.Root
              onClick={() => {
                // Try to reload the current view
                const currentNamespace = dataStore.state.currentNamespace;
                const currentNode = dataStore.state.currentNode;
                if (currentNamespace && currentNode) {
                  dataStore.loadNodeView(currentNamespace, currentNode.id);
                }
                dataStore.setError(null);
              }}
              class="bg-gray-700 hover:bg-gray-800 px-3 py-1 rounded text-sm transition-colors"
            >
              {t("errorOverlay.retry")}
            </Button.Root>
          </div>
        </div>
      </div>
    </Show>
  );
};