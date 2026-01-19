/**
 * Environment utility functions for determining API URLs
 */

/**
 * Determines the API base URL using the following fallback strategy:
 * 1. Use VITE_API_BASE_URL environment variable if available
 * 2. Construct URL from current hostname if possible
 * 3. Fall back to default URL
 */
export function getApiBaseUrl(): string {
  // 1. Try environment variable first
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl) {
    console.debug('[ENV] Using API URL from environment variable:', envApiUrl);
    return envApiUrl;
  }

  // 2. Try to construct from current hostname
  try {
    // Get current hostname (works in browser environment)
    const currentHostname = window.location.hostname;
    const currentProtocol = window.location.protocol;
    
    // If we're on localhost, use the default localhost URL
    if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
      const constructedUrl = 'http://localhost:8000/api';
      console.debug('[ENV] Using constructed localhost API URL:', constructedUrl);
      return constructedUrl;
    }
    
    // For other hostnames, try to construct a reasonable URL
    // Replace port 3000 (frontend) with 8000 (backend) if present
    const constructedUrl = `${currentProtocol}//${currentHostname}:8000/api`;
    console.debug('[ENV] Using constructed API URL from hostname:', constructedUrl);
    return constructedUrl;
  } catch (error) {
    console.debug('[ENV] Failed to construct URL from hostname:', error);
    // Continue to fallback
  }

  // 3. Fall back to default URL
  const defaultUrl = 'http://localhost:8000/api';
  console.debug('[ENV] Using default API URL:', defaultUrl);
  return defaultUrl;
}
