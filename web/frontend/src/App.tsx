import type { Component } from 'solid-js';
import { onMount, Show, createSignal } from "solid-js";
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
import { AppHeader } from "./ui/AppHeader";
import { AppInfoOverlay } from "./ui/AppInfoOverlay";
import { dataStore } from './stores/dataStore';
import { I18nProvider } from "./i18n";

const App: Component = () => {
  const [showAppInfo, setShowAppInfo] = createSignal(false);

  onMount(() => {
    initScene("scene");
  });

  return (
    <>
      <I18nProvider>
        {/* Babylon.js canvas - always present */}
        <canvas id="scene" class="w-full h-full" />

        {/* App Header - contains title card, locale selector, and "What's this?" button */}
        <AppHeader onWhatsThisClick={() => setShowAppInfo(true)} />

        {/* App Info Overlay - shown when "What's this?" button is clicked */}
        <AppInfoOverlay visible={showAppInfo()} onClose={() => setShowAppInfo(false)} />

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
