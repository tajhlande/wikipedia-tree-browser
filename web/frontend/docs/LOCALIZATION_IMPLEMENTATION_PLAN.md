# Localization Implementation Plan for Wikipedia Tree Browser

## Overview

This document outlines the comprehensive plan to implement localization (i18n) for the Wikipedia Tree Browser user interface using **@solid-primitives/i18n**, the official SolidJS internationalization library. This approach leverages the framework's built-in capabilities for better integration and performance.

## Key Features

### ✅ Framework Integration
- **Using @solid-primitives/i18n** instead of custom implementation
- **Leverages SolidJS reactivity** for automatic UI updates
- **Better performance** with lazy loading and resource management
- **TypeScript support** with full type safety

### ✅ Simplified Architecture
- **No custom i18n service needed** - use built-in primitives
- **Built-in template resolution** for dynamic content
- **Automatic fallback handling** for missing translations

### ✅ Emoji Handling
- **Emojis remain localization-independent** as requested
- **Hardcoded in UI components** for consistency
- **Not included in translation dictionaries**
- All languages display the same visual icons

**Example:**
```typescript
// ✅ In Component (LeafNodeOverlay.tsx)
<p>🌐 {t("leafNodeOverlay.viewOnWikipedia")}</p>

// ✅ In Translation (en.ts)
viewOnWikipedia: "View on Wikipedia"
```

## Scope

**In Scope:**
- All user interface text that currently appears in the codebase
- Three initial languages: English (default), French, and German
- Language selector UI component using Kobalte
- Integration with @solid-primitives/i18n

**Out of Scope:**
- Content retrieved from the API (namespace names, page titles, etc.)
- Dynamic content that comes from Wikipedia
- BabylonJS manager console logging (debug/development only)
- dataStore.ts console logging (debug/development only)
- Right-to-left language support (for now)

## Comprehensive UI Text Inventory

All user-facing strings have been identified across the following components:

### Components with User-Facing Strings:
- **NamespaceSelector.tsx** - Wiki selection screen
- **NavigationControls.tsx** - Navigation buttons and tooltips
- **NodeViewLoading.tsx** - Loading indicators for node view
- **ErrorOverlay.tsx** - Error messages and recovery options
- **Loading.tsx** - Reusable loading/error components
- **LeafNodeOverlay.tsx** - Leaf node details and Wikipedia links
- **NodeInfoOverlay.tsx** - Node information panel
- **PerformanceMonitor.tsx** - FPS and performance metrics
- **ZoomControl.tsx** - Zoom control label
- **NamespaceCard.tsx** - Individual wiki cards
- **WikiTitleOverlay.tsx** - Uses dynamic wiki name (no localization needed)
- **BillboardInfoOverlay.tsx** - Billboard hover information

### Components NOT Requiring Localization:
- **BabylonJS managers** (clusterManager, nodeManager, linkManager, interactionManager, resourceManager) - Console logging only
- **dataStore.ts** - Console logging only
- **scene.ts** - Console logging only

## Architecture Design with @solid-primitives/i18n

### Directory Structure

```
frontend/
├── src/
│   ├── i18n/
│   │   ├── index.ts                # i18n setup and exports
│   │   ├── types.ts                # Type definitions
│   │   ├── dictionaries/
│   │   │   ├── en.ts               # English localizations
│   │   │   ├── fr.ts               # French localizations
│   │   │   ├── de.ts               # German localizations
│   │   │   └── index.ts            # Dictionary loader
│   │   └── utils.ts                # Utility functions
│   └── ...
```

### Complete Translation File Structure (TypeScript)

Each translation file exports both the dictionary and metadata about the language:

```typescript
// frontend/src/i18n/dictionaries/en.ts
export const dict = {
  namespaceSelector: {
    title: "Wikipedia Tree Browser",
    subtitle: "Select a wiki to begin",
    searchPlaceholder: "Search wikis...",
    loading: "Loading namespaces...",
    error: {
      connection: "Failed to connect to the backend server. Please ensure the backend is running and the /api/search/namespaces endpoint is available.",
      unknown: "Unknown error loading namespaces",
      retry: "Retry"
    },
    empty: {
      noMatch: "No namespaces found matching {{query}}",
      noAvailable: "No namespaces available. Please ensure the backend is running."
    }
  },

  navigationControls: {
    parent: "← Parent",
    parentTooltip: "Go to parent node",
    noParentTooltip: "No parent node",
    home: "Home",
    homeTooltip: "Return to root node",
    hideLabels: "Hide Labels",
    showLabels: "Show Labels",
    labelsTooltip: {
      hide: "Hide billboard labels",
      show: "Show billboard labels"
    },
    chooseWiki: "Choose a wiki",
    chooseWikiTooltip: "Back to wiki selection",
    hideBoundingBox: "Hide Bounding Box",
    showBoundingBox: "Show Bounding Box",
    boundingBoxTooltip: {
      hide: "Hide bounding box",
      show: "Show bounding box"
    }
  },

  nodeViewLoading: {
    title: "Loading Node View...",
    loadingChildren: "Loading children of {{nodeLabel}}",
    initializing: "Initializing visualization"
  },

  // ... rest of translations
};

// Metadata about this language file
export const meta = {
  code: "en" as const,
  name: "English",
  nativeName: "English"
};

export type Dict = typeof dict;
```

```typescript
// frontend/src/i18n/dictionaries/fr.ts
export const dict = {
  // ... French translations
};

export const meta = {
  code: "fr" as const,
  name: "French",
  nativeName: "Français"
};

export type Dict = typeof dict;
```

```typescript
// frontend/src/i18n/dictionaries/de.ts
export const dict = {
  // ... German translations
};

export const meta = {
  code: "de" as const,
  name: "German",
  nativeName: "Deutsch"
};

export type Dict = typeof dict;

  nodeInfoOverlay: {
    currentNode: "Current Node",
    hoveredNode: "Hovered Node",
    id: "ID",
    label: "Label",
    depth: "Depth",
    namespace: "Namespace",
    type: "Type",
    leaf: "Leaf",
    cluster: "Cluster"
  },

  leafNodeOverlay: {
    missingLabel: "[missing cluster label]",
    viewOnWikipedia: "🌐 View on Wikipedia",
    loading: "Loading page links...",
    noPages: "No pages found",
    previous: "Previous",
    next: "Next",
    close: "Close",
    pageOf: "Page {{currentPage}} of {{totalPages}}"
  },

  errorOverlay: {
    title: "Error",
    dismiss: "Dismiss error",
    backToNamespaces: "Back to Namespaces",
    retry: "Retry"
  },

  performanceMonitor: {
    fps: "FPS",
    status: "Status",
    excellent: "Excellent",
    good: "Good",
    poor: "Poor"
  },

  zoomControl: {
    label: "Zoom"
  },

  namespaceCard: {
    explore: "Explore this Wiki"
  },

  billboardInfoOverlay: {
    title: "Node Information",
    id: "ID",
    label: "Label",
    depth: "Depth",
    type: "Type",
    leafNode: "Leaf Node",
    clusterNode: "Cluster Node",
    parentId: "Parent ID"
  },

  common: {
    loading: "Loading...",
    retry: "Retry",
    close: "Close",
    dismiss: "Dismiss"
  }
};

export type Dict = typeof dict;
```

### i18n Setup with Dynamic Language Discovery

```typescript
// frontend/src/i18n/index.ts
import * as i18n from "@solid-primitives/i18n";
import { createResource, createSignal } from "solid-js";

// Dynamically import all dictionary files using Vite's import.meta.glob
const dictionaryModules = import.meta.glob('./dictionaries/*.ts', { eager: true });

// Extract language metadata from all dictionary modules
export const AVAILABLE_LANGUAGES = Object.entries(dictionaryModules)
  .map(([path, module]: [string, any]) => module.meta)
  .filter(meta => meta && meta.code) // Ensure valid metadata
  .sort((a, b) => a.code.localeCompare(b.code));

// Export base dictionary type
export type { Dict } from "./dictionaries/en";

export type Locale = typeof AVAILABLE_LANGUAGES[number]["code"];

// Create i18n context
export function createI18nContext() {
  const [locale, setLocale] = createSignal<Locale>("en");

  const [dict] = createResource(locale, async (locale: Locale) => {
    const module = await import(`./dictionaries/${locale}.ts`);
    return i18n.flatten(module.dict);
  }, {
    initialValue: (await import("./dictionaries/en.ts")).dict
  });

  const t = i18n.translator(dict, i18n.resolveTemplate);

  return { locale, setLocale, dict, t };
}

// Export available languages for use in LanguageSelector component
export { AVAILABLE_LANGUAGES as languages };
```

### Key Advantage: Truly Dynamic Language Discovery

**Why This Approach is Better:**

❌ **Old Way (Hardcoded):**
```typescript
// Language list hardcoded in component
const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" }
];
// Problem: Adding Spanish requires updating 2+ places
```

❌ **Semi-Dynamic Way (Still Manual):**
```typescript
// Still have to manually add each import
import { meta as enMeta } from "./dictionaries/en";
import { meta as frMeta } from "./dictionaries/fr";
import { meta as deMeta } from "./dictionaries/de";

export const AVAILABLE_LANGUAGES = [enMeta, frMeta, deMeta];
// Problem: Adding Spanish requires 1 import + 1 array entry
```

✅ **New Way (Fully Dynamic):**
```typescript
// Automatically discovers all dictionary files
const dictionaryModules = import.meta.glob('./dictionaries/*.ts', { eager: true });

export const AVAILABLE_LANGUAGES = Object.entries(dictionaryModules)
  .map(([path, module]) => module.meta)
  .filter(meta => meta && meta.code);
// Benefit: Adding Spanish ONLY requires creating es.ts - that's it!
```

**Benefits:**
1. **Zero manual updates** - Add a translation file, it automatically appears
2. **Single source of truth** - Translation files define themselves
3. **No duplicate code** - Language list never gets out of sync
4. **Type safety** - TypeScript validates all language codes
5. **Native names** - Each language provides its own native name
6. **Scalable** - Add 10 languages in minutes, not hours

## Implementation Approach

### Phase 1: Setup and Infrastructure

1. **Install dependencies**
   ```bash
   npm install @solid-primitives/i18n
   ```

2. **Create i18n directory structure**
   - Set up `frontend/src/i18n/` with necessary files
   - Create type definitions for translations

3. **Create complete translation files**
   - English (en.ts) - base translations
   - French (fr.ts) - initial translations
   - German (de.ts) - initial translations

4. **Set up i18n context**
   - Create reactive language management
   - Implement dictionary loading with `createResource`
   - Set up template resolution

### Phase 2: Language Selector Component

The LanguageSelector component uses the dynamically discovered languages from the i18n module:

```typescript
// frontend/src/ui/LanguageSelector.tsx
import { Component } from "solid-js";
import { Button, DropdownMenu } from "@kobalte/core";
import { useI18n, languages } from "../i18n";

export const LanguageSelector: Component = () => {
  const { locale, setLocale } = useI18n();

  const currentLanguage = () =>
    languages.find(lang => lang.code === locale()) || languages[0];

  // Check if browser language is available
  const isBrowserLanguageAvailable = () => {
    const browserLang = navigator.language.split("-")[0];
    return languages.some(lang => lang.code === browserLang);
  };

  return (
    <div class="fixed top-4 right-4 z-50">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button.Root class="px-3 py-2 bg-gray-800 text-white rounded">
            {currentLanguage().code.toUpperCase()} ▼
          </Button.Root>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content class="bg-gray-900 border border-gray-700 rounded p-2">
            {languages.map(lang => (
              <DropdownMenu.Item
                onSelect={() => setLocale(lang.code)}
                class="px-3 py-2 hover:bg-gray-800 cursor-pointer"
              >
                {lang.nativeName}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onSelect={() => {
                const browserLang = navigator.language.split("-")[0];
                const matchingLang = languages.find(l => l.code === browserLang);
                if (matchingLang) {
                  setLocale(matchingLang.code);
                }
              }}
              disabled={!isBrowserLanguageAvailable()}
              class="px-3 py-2 hover:bg-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Detect Language
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
};
```

**Key Benefits of This Approach:**

1. **Single Source of Truth**: Adding a new language only requires:
   - Creating a new translation file (e.g., `es.ts`)
   - Adding it to the import list in `index.ts`
   - The LanguageSelector automatically discovers it

2. **No Hardcoded Lists**: The language selector stays in sync with available translations

3. **Native Language Names**: Each translation file defines its own native name for proper display

4. **Type Safety**: TypeScript ensures all locale codes are valid

### Phase 3: Component Integration

**Example: Updating NamespaceSelector.tsx**

```typescript
// Before (hardcoded strings)
<h1 class="text-3xl font-bold text-white">Wikipedia Tree Browser</h1>

// After (localized)
import { useI18n } from "../i18n";

const NamespaceSelector = () => {
  const { t } = useI18n();

  return (
    <h1 class="text-3xl font-bold text-white">{t("namespaceSelector.title")}</h1>
  );
};
```

**Example: Using emojis (remain hardcoded)**

```typescript
// NavigationControls.tsx - emojis stay hardcoded
<Button.Root>
  🏠 {t("navigationControls.home")}
</Button.Root>
```

**Example: Dynamic template resolution**

```typescript
// NodeViewLoading.tsx - dynamic node label
const { t } = useI18n();
const loadingText = t("nodeViewLoading.loadingChildren", {
  nodeLabel: currentNode.label
});
```

### Phase 4: Advanced Features

1. **Language persistence**
   ```typescript
   // Add to i18n setup
   import { createEffect } from "solid-js";

   createEffect(() => {
     const lang = locale();
     localStorage.setItem("language", lang);
   });

   // Initialize with saved preference
   const savedLang = localStorage.getItem("language") as Locale | null;
   const [locale, setLocale] = createSignal<Locale>(savedLang || "en");
   ```

2. **Fallback handling**
   ```typescript
   // @solid-primitives/i18n automatically falls back to English
   // Add custom fallback if needed
   const safeT = (key: string, params?: Record<string, string>) => {
     const result = t(key, params);
     return result === key ? `Missing translation: ${key}` : result;
   };
   ```

## Complete French Translations (fr.ts)

```typescript
import type { Dict } from "./en";

export const dict: Dict = {
  namespaceSelector: {
    title: "Navigateur d'arborescence Wikipedia",
    subtitle: "Sélectionnez un wiki pour commencer",
    searchPlaceholder: "Rechercher des wikis...",
    loading: "Chargement des espaces de noms...",
    error: {
      connection: "Échec de la connexion au serveur principal.",
      unknown: "Erreur inconnue lors du chargement des espaces de noms",
      retry: "Réessayer"
    },
    empty: {
      noMatch: "Aucun espace de noms trouvé correspondant à {{query}}",
      noAvailable: "Aucun espace de noms disponible."
    }
  },

  navigationControls: {
    parent: "← Parent",
    parentTooltip: "Aller au nœud parent",
    noParentTooltip: "Aucun nœud parent",
    home: "Accueil",
    homeTooltip: "Retour au nœud racine",
    hideLabels: "Masquer les étiquettes",
    showLabels: "Afficher les étiquettes",
    labelsTooltip: {
      hide: "Masquer les étiquettes des panneaux",
      show: "Afficher les étiquettes des panneaux"
    },
    chooseWiki: "Choisir un wiki",
    chooseWikiTooltip: "Retour à la sélection de wiki",
    hideBoundingBox: "Masquer la boîte de délimitation",
    showBoundingBox: "Afficher la boîte de délimitation",
    boundingBoxTooltip: {
      hide: "Masquer la boîte de délimitation",
      show: "Afficher la boîte de délimitation"
    }
  },

  nodeViewLoading: {
    title: "Chargement de la vue des nœuds...",
    loadingChildren: "Chargement des enfants de {{nodeLabel}}",
    initializing: "Initialisation de la visualisation"
  },

  nodeInfoOverlay: {
    currentNode: "Nœud actuel",
    hoveredNode: "Nœud survolé",
    id: "ID",
    label: "Étiquette",
    depth: "Profondeur",
    namespace: "Espace de noms",
    type: "Type",
    leaf: "Feuille",
    cluster: "Cluster"
  },

  leafNodeOverlay: {
    missingLabel: "[étiquette de cluster manquante]",
    viewOnWikipedia: "🌐 Voir sur Wikipedia",
    loading: "Chargement des liens de page...",
    noPages: "Aucune page trouvée",
    previous: "Précédent",
    next: "Suivant",
    close: "Fermer",
    pageOf: "Page {{currentPage}} sur {{totalPages}}"
  },

  errorOverlay: {
    title: "Erreur",
    dismiss: "Ignorer l'erreur",
    backToNamespaces: "Retour aux espaces de noms",
    retry: "Réessayer"
  },

  performanceMonitor: {
    fps: "IPS",
    status: "État",
    excellent: "Excellent",
    good: "Bon",
    poor: "Médiocre"
  },

  zoomControl: {
    label: "Zoom"
  },

  namespaceCard: {
    explore: "Explorer ce Wiki"
  },

  billboardInfoOverlay: {
    title: "Informations sur le nœud",
    id: "ID",
    label: "Étiquette",
    depth: "Profondeur",
    type: "Type",
    leafNode: "Nœud feuille",
    clusterNode: "Nœud cluster",
    parentId: "ID parent"
  },

  common: {
    loading: "Chargement...",
    retry: "Réessayer",
    close: "Fermer",
    dismiss: "Ignorer"
  }
};
```

## Benefits of @solid-primitives/i18n Approach

### ✅ Performance Optimizations
- **Lazy loading**: Dictionaries loaded only when needed
- **Resource management**: Uses SolidJS `createResource` for efficient loading
- **Flattened dictionaries**: Optimized for fast lookup

### ✅ Developer Experience
- **Type safety**: Full TypeScript support with type inference
- **IDE integration**: Go-to-definition and autocomplete work perfectly
- **Template resolution**: Built-in support for dynamic content
- **Single source of truth**: Language list comes from translation files, not hardcoded

### ✅ Framework Integration
- **Reactive updates**: Automatic UI refresh on language change
- **Suspense support**: Works with SolidJS loading states
- **Transition support**: Smooth language switching with transitions

### ✅ Scalability
- **Module splitting**: Can split dictionaries by feature
- **Dynamic loading**: Load only needed translations
- **Easy maintenance**: Clear structure for adding new languages
- **Fully automatic discovery**: Drop in a new translation file, it just works

## Implementation Timeline

| Phase | Task | Estimated Time |
|-------|------|----------------|
| 1 | Install @solid-primitives/i18n and setup | 1-2 hours |
| 2 | Create complete translation files and types | 3-4 hours |
| 3 | Implement language selector with Kobalte | 2-3 hours |
| 4 | Update all UI components with localization | 6-8 hours |
| 5 | Add language persistence and testing | 2-3 hours |
| Total | Full implementation | 14-20 hours |

## Migration Strategy

### Step-by-Step Approach

1. **Setup infrastructure first**
   - Install dependencies
   - Create i18n context
   - Set up complete translation files

2. **Add language selector**
   - Implement UI component
   - Add language switching functionality
   - Test persistence

3. **Gradual component migration**
   - Start with NamespaceSelector (most visible)
   - Continue with NavigationControls
   - Then NodeViewLoading and NodeInfoOverlay
   - Then LeafNodeOverlay and ErrorOverlay
   - Then PerformanceMonitor and ZoomControl
   - Finally NamespaceCard and other small components

4. **Testing and validation**
   - Test each language individually
   - Verify fallback behavior
   - Check for missing translations
   - Test language switching performance

## Success Criteria

✅ All UI text is localized in English, French, and German
✅ Language selector is functional and accessible using Kobalte
✅ Language preference persists across sessions
✅ All components update reactively when language changes
✅ Proper fallback to English for missing translations
✅ No hardcoded UI strings remain (except emojis)
✅ TypeScript types provide full type safety
✅ Performance remains excellent with lazy loading
✅ All 11 UI components are covered

## Adding New Languages

Thanks to the truly dynamic language discovery system, adding a new language is **automatic**:

### Step-by-Step Process

1. **Create a new translation file**
   ```typescript
   // frontend/src/i18n/dictionaries/es.ts
   import type { Dict } from "./en";

   export const dict: Dict = {
     // ... all Spanish translations
   };

   export const meta = {
     code: "es" as const,
     name: "Spanish",
     nativeName: "Español"
   };
   ```

2. **That's it!** The LanguageSelector component will automatically discover and display the new language.

**No other code changes needed!**

### How It Works

- Vite's `import.meta.glob` scans the `dictionaries/` directory at build time
- All files matching `*.ts` are automatically imported
- Each file's `meta` export is collected into `AVAILABLE_LANGUAGES`
- The LanguageSelector iterates over this dynamic list

### Type Safety

TypeScript will automatically:
- Validate that the new `es.ts` file has all required translation keys (via `Dict` type)
- Update the `Locale` type to include `"es"`
- Ensure type safety throughout the application

## Future Enhancements

1. **Pluralization support** - Use @solid-primitives/i18n pluralization features for handling singular/plural forms
2. **Date/number formatting** - Integrate with Intl API for locale-specific formatting
3. **RTL language support** - When adding Arabic/Hebrew languages, add CSS direction support
4. **Translation progress tracking** - For incomplete language support, show which components are translated
5. **Language detection improvements** - More sophisticated browser language detection with fallbacks

## Appendix: Component Coverage Checklist

- [x] NamespaceSelector.tsx
- [x] NavigationControls.tsx
- [x] NodeViewLoading.tsx
- [x] NodeInfoOverlay.tsx
- [x] LeafNodeOverlay.tsx
- [x] ErrorOverlay.tsx
- [x] PerformanceMonitor.tsx
- [x] ZoomControl.tsx
- [x] NamespaceCard.tsx
- [x] Loading.tsx (reusable components)
- [x] BillboardInfoOverlay.tsx
- [ ] WikiTitleOverlay.tsx (not needed - uses dynamic data)
- [ ] BabylonJS managers (console logging only - not needed)
- [ ] dataStore.ts (console logging only - not needed)

## Appendix: Key @solid-primitives/i18n Features Used

- **`createResource`**: For dynamic dictionary loading
- **`flatten()`**: Optimize nested dictionaries for performance
- **`translator()`**: Create translation functions with template support
- **`resolveTemplate()`**: Handle dynamic content in translations
- **TypeScript integration**: Full type safety for translation keys
- **Reactive updates**: Automatic UI refresh on language change

This approach provides a robust, performant, and maintainable localization solution that integrates seamlessly with the existing SolidJS architecture.
