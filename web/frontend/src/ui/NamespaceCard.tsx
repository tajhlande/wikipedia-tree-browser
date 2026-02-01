import type { Component } from 'solid-js';
import type { Namespace } from '../types';
import { useI18n } from '../i18n';

/**
 * Namespace Card Component
 * Individual card for displaying a namespace in the selection grid
 */
export const NamespaceCard: Component<{
  namespace: Namespace;
  onSelect: (namespace: Namespace) => void;
}> = (props) => {
  const { t } = useI18n();

  const handleClick = () => {
    // console.log(`[ROOT] Clicked namespace card: ${props.namespace.name}`);
    // console.log(`[ROOT] onSelect function exists: ${typeof props.onSelect === 'function'}`);
    props.onSelect(props.namespace);
  };

  return (
    <div
      class="namespace-card bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-4 cursor-pointer transition-all duration-200"
      onClick={handleClick}
    >
      <div class="flex items-start justify-between mb-2">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-white">
            {props.namespace.english_wiki_name}
          </h3>
          <p class="text-sm text-gray-300 italic">
            {props.namespace.localized_wiki_name}
          </p>
        </div>
        <span class="bg-blue-600 text-white px-2 py-1 rounded text-xs">
          {props.namespace.name}
        </span>
      </div>
      <div class="flex items-center text-blue-400 text-sm space-x-2">
        <span>✨</span>
        <span class="ml-0">{t("namespaceCard.explore")}</span>
        <span>✨</span>
      </div>
    </div>
  );
};

export default NamespaceCard;