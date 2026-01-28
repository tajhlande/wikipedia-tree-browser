import type { Component } from 'solid-js';
import { onMount, Show } from "solid-js";
import { initScene } from "./babylon/scene";
import NamespaceSelector from "./ui/NamespaceSelector";
import { NavigationControls } from "./ui/NavigationControls";
import { NodeInfoOverlay } from "./ui/NodeInfoOverlay";
import { BillboardInfoOverlay } from "./ui/BillboardInfoOverlay";
import { NodeViewLoading } from "./ui/NodeViewLoading";
import { ErrorOverlay } from "./ui/ErrorOverlay";
import { PerformanceMonitor } from "./ui/PerformanceMonitor";
import { LeafNodeOverlay } from "./ui/LeafNodeOverlay";
import { WikiTitleOverlay } from "./ui/WikiTitleOverlay";
import { LocaleSelector } from "./ui/LocaleSelector";
import { dataStore } from './stores/dataStore';
import { I18nProvider } from "./i18n";

const App: Component = () => {
  onMount(() => {
    initScene("scene");
  });

  return (
    <>
      <I18nProvider>
        {/* Babylon.js canvas - always present */}
        <canvas id="scene" class="w-full h-full" />

        {/* Language Selector  */}
        <div class="fixed top-4 left-4 z-60">
          <LocaleSelector />
        </div>

        {/* Conditional rendering based on current view */}
        <Show when={dataStore.state.currentView === 'namespace_selection'}>
          <NamespaceSelector />
        </Show>

        {/* Navigation Controls - shown in node view */}
        <NavigationControls />

        {/* Node Information Overlay - shown in node view */}
        <NodeInfoOverlay />

        {/* Billboard Information Overlay - shown when hovering over billboard labels */}
        <BillboardInfoOverlay />

        {/* Node View Loading Indicator */}
        {/* <NodeViewLoading /> */}

        {/* Error Overlay */}
        <ErrorOverlay />

        {/* Wiki Title Overlay - shown in node view */}
        <WikiTitleOverlay />

        {/* Performance Monitor */}
        <PerformanceMonitor />

        {/* Leaf Node Overlay - shown when clicking on leaf nodes */}
        <LeafNodeOverlay />

      </I18nProvider>
    </>
  );
};

export default App;
