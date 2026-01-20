import type { Component } from 'solid-js';
import { Button } from "@kobalte/core";

/**
 * Loading Spinner Component
 * Animated spinner for loading states
 */
export const LoadingSpinner: Component<{
  size?: 'small' | 'medium' | 'large';
  message?: string;
}> = (props) => {
  const sizeClasses = {
    small: 'w-6 h-6 border-2',
    medium: 'w-8 h-8 border-4',
    large: 'w-12 h-12 border-4'
  };

  return (
    <div class="loading-spinner flex flex-col items-center justify-center">
      <div
        class={`inline-block border-blue-500 border-t-transparent rounded-full animate-spin ${sizeClasses[props.size || 'medium']}`}
        role="status"
        aria-live="polite"
      ></div>
      {props.message && (
        <p class="mt-2 text-blue-400 text-sm">{props.message}</p>
      )}
    </div>
  );
};

/**
 * Error Display Component
 * Shows error messages with optional retry button
 */
export const ErrorDisplay: Component<{
  message: string;
  onRetry?: () => void;
  class?: string;
}> = (props) => {
  return (
    <div class={`error-display bg-red-900 bg-opacity-50 border border-red-700 rounded-lg p-4 ${props.class || ''}`}>
      <div class="flex items-start mb-3">
        <span class="text-red-400 mr-2 mt-1">⚠️</span>
        <span class="text-red-300 flex-1">{props.message}</span>
      </div>
      {props.onRetry && (
        <Button.Root
          onClick={props.onRetry}
          class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
        >
          Retry
        </Button.Root>
      )}
    </div>
  );
};

/**
 * Full Page Loading Overlay
 * Covers entire screen during loading operations
 */
export const LoadingOverlay: Component<{
  message?: string;
}> = (props) => {
  return (
    <div class="loading-overlay fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50">
      <div class="text-center">
        <LoadingSpinner size="large" />
        {props.message && (
          <p class="mt-4 text-white text-lg">{props.message}</p>
        )}
      </div>
    </div>
  );
};

/**
 * Progress Bar Component
 * Shows progress for operations
 */
export const ProgressBar: Component<{
  progress: number; // 0-100
  class?: string;
}> = (props) => {
  return (
    <div class={`progress-bar w-full bg-gray-700 rounded-full h-2.5 ${props.class || ''}`}>
      <div
        class="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${props.progress}%` }}
      ></div>
    </div>
  );
};

export default LoadingSpinner;