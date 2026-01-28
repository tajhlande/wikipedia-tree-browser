import { Component, For } from "solid-js";
import { Button, DropdownMenu } from "@kobalte/core";
import { AVAILABLE_LANGUAGES, useI18n } from "../i18n";

/**
 * Locale Selector Component
 * Provides a dropdown to select the application language
 * Automatically discovers available languages from the i18n system
 * Uses createEffect to reactively load dictionaries when locale changes
 */
export const LocaleSelector: Component = () => {

  const { locale, setLocale } = useI18n();

  // Check if browser language is available
  const isBrowserLanguageAvailable = () => {
    const browserLang = navigator.language.split("-")[0];
    return AVAILABLE_LANGUAGES.some((lang: any) => lang.code === browserLang);
  };

  // Detect and set browser language
  const detectBrowserLanguage = () => {
    const browserLang = navigator.language.split("-")[0];
    const matchingLang = AVAILABLE_LANGUAGES.find((l) => l.code === browserLang);
    if (matchingLang) {
      setLocale(matchingLang.code);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button.Root
          class="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
          aria-label="Select language"
        >
          <span class="mr-1">{locale().toUpperCase()}</span>
          <span class="text-xs">▼</span>
        </Button.Root>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          class="bg-gray-900 border border-gray-700 rounded p-2 min-w-50 z-60 shadow-lg"
        >
          <DropdownMenu.Item
            class="px-3 py-2 text-sm text-gray-400 cursor-default"
            disabled
          >
            Language / Langue
          </DropdownMenu.Item>

          <DropdownMenu.Separator class="my-1 border-t border-gray-700" />

          <For each={AVAILABLE_LANGUAGES}>
            {(lang) => (
              <DropdownMenu.Item
                onSelect={() => {
                  console.log('[LanguageSelector] Selecting language:', lang.code);
                  setLocale(lang.code);
                }}
                classList={{
                  "px-3 py-2 text-sm cursor-pointer rounded transition-colors": true,
                  "hover:bg-gray-800": true,
                  "bg-blue-600": lang.code === locale,
                  "text-white": lang.code === locale,
                  "text-gray-300": lang.code !== locale,
                }}
              >
                <span class="flex items-center gap-2">
                  <span class="font-mono text-xs">{lang.code.toUpperCase()}</span>
                  <span>{lang.nativeName}</span>
                  {lang.code === locale && <span class="ml-auto">✓</span>}
                </span>
              </DropdownMenu.Item>
            )}
          </For>

          <DropdownMenu.Separator class="my-1 border-t border-gray-700" />

          <DropdownMenu.Item
            onSelect={detectBrowserLanguage}
            disabled={!isBrowserLanguageAvailable()}
            classList={{
              "px-3 py-2 text-sm cursor-pointer rounded transition-colors": true,
              "hover:bg-gray-800": true,
              "opacity-50 cursor-not-allowed": !isBrowserLanguageAvailable(),
              "text-gray-300": isBrowserLanguageAvailable(),
              "text-gray-500": !isBrowserLanguageAvailable(),
            }}
          >
            <span class="flex items-center gap-2">
              <span>🌐</span>
              <span>Detect Language</span>
            </span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default LocaleSelector;
