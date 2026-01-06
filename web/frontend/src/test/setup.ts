// Test setup file for Vitest
// This file runs before all tests to set up the testing environment

// Import SolidJS testing utilities
import { cleanup } from '@solidjs/testing-library';
import { afterEach } from 'vitest';

// Clean up after each test to prevent memory leaks
afterEach(() => {
  cleanup();
});

// Mock browser APIs for node environment
globalThis.ResizeObserver = class ResizeObserver {
  observe() { /* mock */ }
  unobserve() { /* mock */ }
  disconnect() { /* mock */ }
};

// Mock document and window for node environment
globalThis.document = {
  createElement: () => ({
    setAttribute: () => {},
    appendChild: () => {},
    className: '',
    textContent: '',
  }),
  querySelector: () => null,
  getElementById: () => null,
} as any;

globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
} as any;

console.log('Test setup completed successfully');