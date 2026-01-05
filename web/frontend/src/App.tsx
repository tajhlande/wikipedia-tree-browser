import type { Component } from 'solid-js';
import { onMount } from "solid-js";
import { initScene } from "./babylon/scene";
import Overlay from "./ui/Overlay";

const App: Component = () => {
  onMount(() => {
    initScene("scene");
  });

  return <Overlay />;
};

export default App;
