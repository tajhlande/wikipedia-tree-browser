import { Component, Show } from "solid-js";
import { dataStore } from '../stores/dataStore';

/**
 * Wiki Title Overlay Component
 * Shows the title of the currently selected wiki at the top left of the window
 */
export const WikiTitleOverlay: Component = () => {
  return (
    <Show when={dataStore.state.currentView === 'node_view' && dataStore.state.currentNamespace}>
      <div class="fixed top-4 left-4 z-50 bg-black/35 text-white p-4 rounded-lg border border-gray-600 shadow-lg">
        <div class="flex items-center gap-2 mb-1">
          <h2 class="text-3xl font-bold">
            {dataStore.state.currentWikiName}
          </h2>
        </div>
      </div>
    </Show>
  );
};