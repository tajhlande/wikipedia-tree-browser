import type { Component } from 'solid-js';
import type { Namespace } from '../types';

/**
 * Namespace Card Component
 * Individual card for displaying a namespace in the selection grid
 */
export const NamespaceCard: Component<{
  namespace: Namespace;
  onSelect: (namespace: Namespace) => void;
}> = (props) => {
  return (
    <div
      class="namespace-card bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 cursor-pointer transition-all duration-200"
      onClick={() => props.onSelect(props.namespace)}
    >
      <div class="flex items-start justify-between mb-2">
        <h3 class="text-lg font-semibold text-white">
          {props.namespace.display_name}
        </h3>
        <span class="bg-blue-600 text-white px-2 py-1 rounded text-xs">
          {props.namespace.name}
        </span>
      </div>
      <div class="flex items-center text-blue-400 text-sm space-x-2">
        <span>✨</span>
        <span class="ml-0">Explore this Wiki</span>
        <span>✨</span>
      </div>
    </div>
  );
};

export default NamespaceCard;