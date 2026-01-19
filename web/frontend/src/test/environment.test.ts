import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getApiBaseUrl } from '../util';

describe('getApiBaseUrl', () => {
  // Mock window.location
  const originalWindow = { ...window };
  
  beforeEach(() => {
    // Reset mocks
    vi.restoreAllMocks();
    
    // Mock window.location
    delete (window as any).location;
    window.location = { hostname: 'localhost', protocol: 'http:' } as any;
  });

  afterAll(() => {
    // Restore original window
    Object.assign(window, originalWindow);
  });

  it('should use environment variable when available', () => {
    // Mock import.meta.env
    vi.stubEnv('VITE_API_BASE_URL', 'http://custom-api.example.com');
    
    const url = getApiBaseUrl();
    expect(url).toBe('http://custom-api.example.com');
  });

  it('should use localhost URL when on localhost', () => {
    // No environment variable set
    vi.stubEnv('VITE_API_BASE_URL', '');
    
    window.location.hostname = 'localhost';
    const url = getApiBaseUrl();
    expect(url).toBe('http://localhost:8000/api');
  });

  it('should use localhost URL when on 127.0.0.1', () => {
    // No environment variable set
    vi.stubEnv('VITE_API_BASE_URL', '');
    
    window.location.hostname = '127.0.0.1';
    const url = getApiBaseUrl();
    expect(url).toBe('http://localhost:8000/api');
  });

  it('should construct URL from other hostnames', () => {
    // No environment variable set
    vi.stubEnv('VITE_API_BASE_URL', '');
    
    window.location.hostname = 'example.com';
    window.location.protocol = 'https:';
    const url = getApiBaseUrl();
    expect(url).toBe('https://example.com:8000/api');
  });

  it('should fall back to default URL when construction fails', () => {
    // No environment variable set
    vi.stubEnv('VITE_API_BASE_URL', '');
    
    // Mock window.location to throw error
    vi.spyOn(window.location, 'hostname', 'get').mockImplementation(() => {
      throw new Error('Cannot access window');
    });
    
    const url = getApiBaseUrl();
    expect(url).toBe('http://localhost:8000/api');
  });
});
