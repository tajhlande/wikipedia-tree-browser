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
import { dataStore } from './stores/dataStore';

const App: Component = () => {
  onMount(() => {
    initScene("scene");
  });

  return (
    <>
      {/* Babylon.js canvas - always present */}
      <canvas id="scene" class="w-full h-full" />

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


    </>
  );
};

export default App;
