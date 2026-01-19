# API URL Configuration

## Overview

The WP Embeddings Visualization frontend now supports flexible API URL configuration through a multi-tiered fallback strategy. This allows the application to work seamlessly across different deployment environments without requiring code changes.

## Implementation

### Environment Utility

A new utility module `src/util/environment.ts` provides the `getApiBaseUrl()` function that implements the following resolution strategy:

1. **Environment Variable**: Uses `VITE_API_BASE_URL` if defined
2. **Hostname Construction**: Constructs URL from current hostname
3. **Default**: Falls back to `http://localhost:8000/api`

### API Client Integration

The `ApiClient` class in `src/services/apiClient.ts` now uses `getApiBaseUrl()` as the default constructor parameter instead of the hardcoded `API_BASE_URL` constant.

## Configuration Options

### 1. Environment Variable (Recommended)

Create a `.env` file in the frontend directory:

```env
VITE_API_BASE_URL=http://your-api-server:port/api
```

Example for production:
```env
VITE_API_BASE_URL=https://api.example.com/api
```

### 2. Hostname-Based Construction

If no environment variable is set, the application will automatically construct the API URL based on the current hostname:

- **Localhost**: `http://localhost:8000/api`
- **Other hosts**: `${protocol}//${hostname}:8000/api`

### 3. Default Fallback

If both environment variable and hostname construction fail, the application falls back to:
```
http://localhost:8000/api
```

## Deployment Scenarios

### Development Environment

```env
# .env file
VITE_API_BASE_URL=http://localhost:8000/api
```

### Staging Environment

```env
# .env.staging file
VITE_API_BASE_URL=https://staging-api.example.com/api
```

### Production Environment

```env
# .env.production file
VITE_API_BASE_URL=https://api.example.com/api
```

## Testing

Comprehensive unit tests are provided in `src/test/environment.test.ts` that verify:

- Environment variable precedence
- Localhost URL construction
- Hostname-based URL construction
- Fallback to default URL
- Error handling scenarios

## Benefits

1. **Flexibility**: Supports multiple deployment scenarios
2. **No Code Changes**: Configuration through environment variables
3. **Robust Fallback**: Graceful degradation when configuration fails
4. **Development Friendly**: Works out-of-the-box for local development
5. **Production Ready**: Easy to configure for different environments

## Migration Guide

If you were previously using a hardcoded API URL, you can now:

1. Remove any hardcoded URL references
2. Create appropriate `.env` files for your environments
3. Use the standard `ApiClient` constructor without parameters

The application will automatically use the most appropriate URL based on the configured strategy.
