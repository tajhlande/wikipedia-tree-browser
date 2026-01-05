import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder
} from "@babylonjs/core";

export function initScene(canvasId: string) {
  try {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      console.error(`Canvas element with id "${canvasId}" not found or is not a canvas element`);
      return;
    }
    
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);

    const camera = new ArcRotateCamera(
      "camera",
      Math.PI / 2,
      Math.PI / 3,
      5,
      Vector3.Zero(),
      scene
    );
    camera.attachControl(canvas, true);

    new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    // MeshBuilder.CreateSphere("sphere", {}, scene);
    MeshBuilder.CreateBox("box", {}, scene);
    
    engine.runRenderLoop(() => {
      try {
        scene.render();
      } catch (renderError) {
        console.error("Error during scene rendering:", renderError);
      }
    });
    
    window.addEventListener("resize", () => {
      try {
        engine.resize();
      } catch (resizeError) {
        console.error("Error during engine resize:", resizeError);
      }
    });
    
  } catch (initError) {
    console.error("Error initializing Babylon.js scene:", initError);
  }
}
