import type { Component } from 'solid-js';
import { Button } from "@kobalte/core";
import './Overlay.css';


const Overlay: Component = () => {
  return (
    <div class="fixed top-4 left-4 z-10 space-x-2">
      {/* Test with debug class first */}
      <Button.Root class="debug-button">
        Debug Button
      </Button.Root>
      {/* Test with Kobalte CSS classes */}
      <Button.Root class="kobalte-button">
        Kobalte Button
      </Button.Root>
      {/* Test with Tailwind classes */}
      <Button.Root class="px-3 py-2 rounded bg-zinc-800 text-white hover:bg-zinc-700">
        Tailwind Button
      </Button.Root>
    </div>
  );
}

export default Overlay;