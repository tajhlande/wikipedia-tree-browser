import { Component, Show } from "solid-js";
import { useI18n } from "../i18n";

/**
 * App Info Overlay Component
 * Displays information about the application when the "What's this?" button is clicked
 */
export const AppInfoOverlay: Component<{ visible: boolean; onClose: () => void }> = (props) => {
  const { t } = useI18n();

  return (
    <Show when={props.visible}>
      <div class="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div class="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-lg w-full h-4/5 mx-4 flex flex-col">
          {/* Header - fixed height */}
          <div class="flex justify-between items-start p-6 pb-4 flex-shrink-0">
            <h2 class="text-2xl font-bold text-white">{t('appInfoOverlay.title')}</h2>
            <button
              onClick={props.onClose}
              class="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
              aria-label={t('appInfoOverlay.close')}
            >
              ×
            </button>
          </div>

          {/* Scrollable content - takes remaining space */}
          <div class="flex-1 overflow-y-auto px-6 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-300 hover:scrollbar-thumb-gray-600">
            <div class="text-gray-300 space-y-4 pb-4 pr-2 text-sm">
              <p>{t('appInfoOverlay.description')}</p>
              <p>{t('appInfoOverlay.process')}</p>

              <div class="bg-gray-800 rounded p-4 text-sm">
                <p>{t('appInfoOverlay.infoEntries.creator')} Tajh Taylor.</p>
                <p>
                  {t('appInfoOverlay.infoEntries.codeRepo')}
                  <a class="ml-2 underline" href="https://gitlab.wikimedia.org/toolforge-repos/wikipedia-tree-browser" target="_blank">gitlab.wikimedia.org</a>.
                </p>
                <p>{t('appInfoOverlay.infoEntries.license')} <a class="underline" href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank">Apache License 2.0</a>.</p>
              </div>
              <p>{t('appInfo.specialThanks')}</p>
            </div>
          </div>

          {/* Footer - fixed height with close button */}
          <div class="p-6 pt-4 shrink-0 flex justify-end">
            <button
              onClick={props.onClose}
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default AppInfoOverlay;
