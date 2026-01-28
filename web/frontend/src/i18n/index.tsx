// frontend/src/i18n/I18nManager.ts
import * as i18n from "@solid-primitives/i18n";

// Import English dictionary for fallback/initial value
import { dict as enDict } from "./dictionaries/en";

// Dynamically import all dictionary files using Vite's import.meta.glob
const dictionaryModules = import.meta.glob('./dictionaries/*.ts', { eager: true });

// Extract language metadata from all dictionary modules
export const AVAILABLE_LANGUAGES = Object.entries(dictionaryModules)
  .map(([path, module]: [string, any]) => module.meta)
  .filter((meta: any) => meta && meta.code)
  .sort((a: any, b: any) => a.code.localeCompare(b.code));

// Export base dictionary type
export type { Dict } from "./dictionaries/en";

export type Locale = typeof AVAILABLE_LANGUAGES[number]["code"];

// --------------
// the ChatGPT way

import { createContext, createMemo, useContext } from "solid-js";
import { createSignal, Accessor, createEffect } from "solid-js";

const flatEnDict = i18n.flatten(enDict);
const dictCache = new Map<string, Record<string, string>>();

/**
 * Load dictionary for a specific locale
 * Uses the pre-loaded dictionaryModules from import.meta.glob
 */
function loadDictionary(locale: Locale): i18n.BaseRecordDict {
  console.debug(`[i18n] Loading dictionary for locale: ${locale}`);

  // Check if already cached
  if (dictCache.has(locale)) {
    console.debug(`[i18n] Dictionary for locale ${locale} already cached`);
    return dictCache.get(locale)!;
  }

  let dict: i18n.BaseRecordDict = flatEnDict; // default to English

  // Find the dictionary module from the pre-loaded modules
  const dictModule = Object.entries(dictionaryModules).find(
    ([path, module]: [string, any]) => path.includes(`/dictionaries/${locale}.ts`)
  );

  if (dictModule) {
    const [, module] = dictModule;
    dict = i18n.flatten(module.dict);
    dictCache.set(locale, dict);
    console.log(`[i18n] Successfully loaded dictionary for locale: ${locale}`);
  } else {
    console.error(`[i18n] Dictionary not found for locale: ${locale}, falling back to English`);
  }

  return dict;
}

// i18n context

type I18nContextValue = {
  locale: Accessor<string>;
  setLocale: (l: string) => void;
  t: (key: string, params? : any) => string;
};

const I18nContext = createContext<I18nContextValue>();

import { translator } from "@solid-primitives/i18n";
// i18n provider that owns the context
export function I18nProvider(props: any) {
  const [locale, setLocale] = createSignal("en");
  const [dict, setDict] = createSignal<Record<string, string>>({});

  createEffect(() => {
    const l = locale();
    if (dictCache.has(l)) {
      setDict(dictCache.get(l)!);
      return;
    }

    const d = loadDictionary(l);
    dictCache.set(l, d);
    setDict(d);
  });


  // const t = (key: string) => {
  //   const d = dict();          // dependency
  //   return d[key] ?? key;
  // };
  const t = createMemo(() => translator(() => dict(), i18n.resolveTemplate));

  return (
  <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t: (key: string, params? : any) => t()(key, params),
      }}
    >
      {props.children}
    </I18nContext.Provider>
  );
}
// export helper function
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
