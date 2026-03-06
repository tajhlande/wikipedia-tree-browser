import { Component, Show } from "solid-js";
import { dataStore } from '../stores/dataStore';

/**
 * Wiki Title Overlay Component
 * Shows the title of the currently selected wiki
 * Positioned within AppHeader flex container
 */
export const WikiTitleOverlay: Component = () => {
  return (
    <Show when={dataStore.state.currentView === 'node_view' && dataStore.state.currentNamespace}>
      <div class="bg-black/35 text-white p-4 rounded-lg border border-gray-600 shadow-lg">
        <div class="flex items-center gap-2 mb-1">
          <h2 class="text-3xl font-bold">
            {dataStore.state.currentWikiName}
          </h2>
        </div>
      </div>
    </Show>
  );
};