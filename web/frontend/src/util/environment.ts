/**
 * Environment utility functions for determining API URLs
 */

/**
 * Determines the API base URL using the following fallback strategy:
 * 1. Use VITE_API_BASE_URL environment variable if available
 * 2. Use relative URL '/api' (browser automatically uses current host)
 *
 * Using relative URLs ensures the API works regardless of how the app is accessed:
 * - http://localhost:8000/api
 * - http://192.168.1.100:8000/api
 * - https://example.com/api
 */
export function getApiBaseUrl(): string {
  // 1. Try environment variable first (for explicit overrides)
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl) {
    console.debug('[ENV] Using API URL from environment variable:', envApiUrl);
    return envApiUrl;
  }

  // 2. Use relative URL - browser automatically uses current host:port
  // This works for localhost, IP addresses, and domain names
  const relativeUrl = '/api';
  console.debug('[ENV] Using relative API URL:', relativeUrl);
  return relativeUrl;
}
