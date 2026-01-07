import type { Component } from 'solid-js';
import { onMount, Show } from "solid-js";
import { initScene } from "./babylon/scene";
import Overlay from "./ui/Overlay";
import Phase1Demo from "./demo/phase1Demo";
import NamespaceSelector from "./ui/NamespaceSelector";
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
      
      {/* Overlay UI - always visible */}
      <Overlay />
      
      {/* Phase 1 Demo - for development */}
      <Phase1Demo />
    </>
  );
};

export default App;
