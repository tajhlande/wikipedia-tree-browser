import type { Component } from 'solid-js';
import { onMount } from "solid-js";
import { initScene } from "./babylon/scene";
import Overlay from "./ui/Overlay";
import Phase1Demo from "./demo/phase1Demo";

const App: Component = () => {
  onMount(() => {
    initScene("scene");
  });

  return (
    <>
      <Overlay />
      <Phase1Demo />
    </>
  );
};

export default App;
