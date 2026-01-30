import { Component, Show, createSignal } from "solid-js";
import { Button } from "@kobalte/core";
import { dataStore } from '../stores/dataStore';
import { LocaleSelector } from "./LocaleSelector";
import { useI18n } from "../i18n";

/**
 * App Header Component
 * Contains the title card, locale selector (always visible), and "What's this?" button
 * Title card and "What's this?" button are visible when currentView = 'namespace_selection'
 */
export const AppHeader: Component<{ onWhatsThisClick: () => void }> = (props) => {
  const { t } = useI18n();

  return (
    <div class="fixed top-4 left-4 right-4 z-60 flex items-center gap-4">
      {/* Title Card - visible in namespace_selection view */}
      <Show when={dataStore.state.currentView === 'namespace_selection'}>
        <div class="bg-black/35 text-white px-4 py-2 rounded-lg border border-gray-600 shadow-lg">
          <h1 class="text-xl font-bold">
            {t('appHeader.title')}
          </h1>
        </div>
      </Show>

      {/* Locale Selector - always visible */}
      <LocaleSelector />

      {/* "What's this?" button - visible in namespace_selection view */}
      <Show when={dataStore.state.currentView === 'namespace_selection'}>
        <Button.Root
          onClick={props.onWhatsThisClick}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {t('appHeader.whatsThis')}
        </Button.Root>
      </Show>
    </div>
  );
};

export default AppHeader;
