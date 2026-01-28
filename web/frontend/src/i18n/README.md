# Internationalization (i18n) Setup

## Overview

This directory contains the internationalization infrastructure for the Wikipedia Tree Browser application using `@solid-primitives/i18n`.

## Directory Structure

```
i18n/
├── dictionaries/
│   ├── en.ts          # English translations (base)
│   ├── fr.ts          # French translations
│   └── de.ts          # German translations
├── index.ts           # Main i18n setup with dynamic language discovery
├── types.ts           # Type definitions
└── README.md          # This file
```

## Features

### ✅ Dynamic Language Discovery
- Languages are automatically discovered from the `dictionaries/` directory
- Uses Vite's `import.meta.glob` to scan for translation files
- Adding a new language only requires creating a new translation file

### ✅ Type Safety
- Full TypeScript support with inferred types
- All translation keys are validated against the base dictionary
- Locale codes are type-safe

### ✅ Reactive Updates
- Language changes automatically update all components
- Uses SolidJS reactivity for seamless UI updates

### ✅ Language Persistence
- User's language preference is saved to localStorage
- Automatically loads saved preference on app start

## Available Languages

Currently supported languages:

| Code | Name      | Native Name | File       |
|------|-----------|-------------|------------|
| en   | English   | English     | `en.ts`    |
| fr   | French    | Français    | `fr.ts`    |
| de   | German    | Deutsch     | `de.ts`    |

## Adding a New Language

1. Create a new translation file in `dictionaries/` (e.g., `es.ts`):
   ```typescript
   import type { Dict } from "./en";

   export const dict: Dict = {
     // ... all translations
   };

   export const meta = {
     code: "es" as const,
     name: "Spanish",
     nativeName: "Español"
   };
   ```

2. **That's it!** The language will automatically appear in the LanguageSelector component.

## Usage

### In Components

```typescript
import { useI18n } from "../i18n";

export const MyComponent = () => {
  const { t, locale, setLocale } = useI18n();

  return (
    <div>
      <h1>{t("namespaceSelector.title")}</h1>
      <button onClick={() => setLocale("fr")}>Français</button>
    </div>
  );
};
```

### With Template Interpolation

```typescript
const { t } = useI18n();

const nodeName = "My Node";
const message = t("nodeViewLoading.loadingChildren", {
  nodeLabel: nodeName
});
// Result: "Loading children of My Node"
```

## Translation Keys

See the `dictionaries/en.ts` file for the complete list of translation keys organized by component:

- `namespaceSelector.*` - Namespace selection screen
- `navigationControls.*` - Navigation buttons and tooltips
- `nodeViewLoading.*` - Node view loading indicators
- `nodeInfoOverlay.*` - Node information panel
- `leafNodeOverlay.*` - Leaf node details and Wikipedia links
- `errorOverlay.*` - Error messages and recovery options
- `performanceMonitor.*` - FPS and performance metrics
- `zoomControl.*` - Zoom control label
- `namespaceCard.*` - Individual wiki cards
- `billboardInfoOverlay.*` - Billboard hover information
- `common.*` - Common/reusable translations

## Technical Details

### Dynamic Language Discovery

The system uses Vite's `import.meta.glob` to automatically discover all translation files:

```typescript
const dictionaryModules = import.meta.glob('./dictionaries/*.ts', { eager: true });

export const AVAILABLE_LANGUAGES = Object.entries(dictionaryModules)
  .map(([path, module]) => module.meta)
  .filter(meta => meta && meta.code)
  .sort((a, b) => a.code.localeCompare(b.code));
```

This means:
- No manual imports needed for each language
- No manual array updates
- Languages appear in alphabetical order
- Adding a language is as simple as dropping in a new file

### Template Resolution

Uses `@solid-primitives/i18n`'s built-in `resolveTemplate` for dynamic content:

```typescript
const t = i18n.translator(dict, i18n.resolveTemplate);
```

Templates use `{{variableName}}` syntax:
```typescript
"Loading children of {{nodeLabel}}"
```

## Dependencies

- `@solid-primitives/i18n` ^2.2.1
- SolidJS built-in reactivity
- Vite (for `import.meta.glob`)

## Emoji Handling

**Important**: Emojis should remain in UI components, not in translation dictionaries. This ensures:

- All languages display the same visual icons
- Translators don't need to include emojis in their work
- Consistent visual appearance across languages

**Example from LeafNodeOverlay.tsx (Phase 3):**
```typescript
// ✅ Correct: Emoji in component
<p>🌐 {t("leafNodeOverlay.viewOnWikipedia")}</p>

// ❌ Wrong: Emoji in translation
// viewOnWikipedia: "🌐 View on Wikipedia"
```

## Implementation Progress

1. ✅ **Phase 1: Setup and Infrastructure** (COMPLETE)
   - Dependencies installed
   - Translation files created (en, fr, de)
   - i18n context with dynamic discovery
   - Language persistence to localStorage

2. ✅ **Phase 2: Language Selector Component** (COMPLETE)
   - LanguageSelector.tsx created using Kobalte
   - Integrated into App.tsx
   - Browser language detection
   - Dynamic language discovery working

3. ⏳ **Phase 3: Component Integration** (NEXT)
   - Update NamespaceSelector.tsx
   - Update NavigationControls.tsx
   - Update NodeViewLoading.tsx
   - Update NodeInfoOverlay.tsx
   - Update LeafNodeOverlay.tsx
   - Update ErrorOverlay.tsx
   - Update PerformanceMonitor.tsx
   - Update ZoomControl.tsx
   - Update NamespaceCard.tsx
   - Update BillboardInfoOverlay.tsx
   - Update Loading.tsx

4. ⏳ **Phase 4: Testing and Validation**

## Next Steps

To complete the localization implementation:

1. ✅ Phase 1: Setup and Infrastructure (COMPLETE)
2. ✅ Phase 2: Language Selector Component (COMPLETE)
3. ⏳ Phase 3: Component Integration
   - Update LeafNodeOverlay.tsx line 98 to use `t()`
   - Keep emoji hardcoded: `🌐 {t("leafNodeOverlay.viewOnWikipedia")}`
4. ⏳ Phase 4: Testing and Validation

See the main [Localization Implementation Plan](../../../docs/LOCALIZATION_IMPLEMENTATION_PLAN.md) for details.
