import { Component, Show, createEffect, createSignal, onCleanup } from "solid-js";
import { dataStore } from '../stores/dataStore';
import { engine } from '../babylon/scene';
import { Button } from "@kobalte/core";

/**
 * Performance Monitor Component
 * Shows FPS and other performance metrics
 */
export const PerformanceMonitor: Component = () => {
  const [fps, setFps] = createSignal(0);
  const [showMonitor, setShowMonitor] = createSignal(false);

  // Toggle monitor visibility
  const toggleMonitor = () => {
    setShowMonitor(!showMonitor());
  };

  // Setup FPS monitoring
  createEffect(() => {
    if (showMonitor() && engine) {
      const fpsMonitor = setInterval(() => {
        if (engine) {
          setFps(Math.round(engine.getFps()));
        }
      }, 1000);

      onCleanup(() => {
        clearInterval(fpsMonitor);
      });
    }
  });

  return (
    <Show when={dataStore.state.currentView === 'node_view'}>
      {/* Toggle button */}
      <Button.Root
        onClick={toggleMonitor}
        class="fixed bottom-4 left-4 z-50 bg-black/65 text-white p-2 rounded-lg hover:bg-black/90 transition-all"
        title="Toggle performance monitor"
      >
        ⚡
      </Button.Root>

      {/* Performance monitor display */}
      <Show when={showMonitor()}>
        <div class="fixed bottom-16 left-4 z-50 bg-black/85 text-white p-3 rounded-lg text-sm">
          <div class="flex items-center gap-2">
            <span class="font-bold">FPS:</span>
            <span class={fps() >= 60 ? 'text-green-400' : fps() >= 30 ? 'text-yellow-400' : 'text-red-400'}>
              {fps()}
            </span>
          </div>
          <div class="mt-1">
            <span class="font-bold">Status:</span>
            <span class="ml-1">
              {fps() >= 60 ? 'Excellent' : fps() >= 30 ? 'Good' : 'Poor'}
            </span>
          </div>
        </div>
      </Show>
    </Show>
  );
};