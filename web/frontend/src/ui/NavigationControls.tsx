import { Component, Show } from "solid-js";
import { dataStore } from '../stores/dataStore';

/**
 * Navigation Controls Component
 * Provides UI controls for navigating the node hierarchy
 */
export const NavigationControls: Component = () => {
  return (
    <Show when={dataStore.state.currentView === 'node_view' && dataStore.state.currentNode}>
      <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {/* Parent Button */}
        <button
          onClick={() => {
            const currentNamespace = dataStore.state.currentNamespace;
            const currentNode = dataStore.state.currentNode;
            if (currentNamespace && currentNode && currentNode.parent_id) {
              dataStore.navigateToParent(currentNamespace, currentNode.id);
            }
          }}
          disabled={!dataStore.state.currentNode?.parent_id}
          class={`px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${
            dataStore.state.currentNode?.parent_id 
              ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' 
              : 'bg-gray-400 cursor-not-allowed'
          }`}
          title={dataStore.state.currentNode?.parent_id ? 'Go to parent node' : 'No parent node'}
        >
          ← Parent
        </button>
        
        {/* Home Button */}
        <button
          onClick={() => {
            const currentNamespace = dataStore.state.currentNamespace;
            if (currentNamespace) {
              dataStore.navigateToRoot(currentNamespace);
            }
          }}
          class="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-all duration-200"
          title="Return to root node"
        >
          🏠 Home
        </button>
        
        {/* Back to Namespace Selection */}
        <button
          onClick={() => {
            dataStore.navigateToNamespaceSelection();
          }}
          class="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all duration-200"
          title="Back to namespace selection"
        >
          🔙 Namespaces
        </button>
      </div>
    </Show>
  );
};