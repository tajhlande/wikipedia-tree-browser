# WP Embeddings Visualization - Frontend

A 3D visualization tool for exploring hierarchical Wikipedia embeddings clusters.

## Project Status

### Phase 1: API Client & Data Layer ✅ COMPLETED

The first phase of implementation has been completed, providing the foundational API client and data management layer for the application.

**Implemented Components:**
- ✅ TypeScript type definitions for API responses and application state
- ✅ Comprehensive API client with error handling and caching
- ✅ SolidJS-based data store with reactive state management
- ✅ Demonstration component showcasing Phase 1 functionality
- ✅ Unit tests for core functionality

**Key Features:**
- Robust API communication with comprehensive error handling
- Namespace caching with configurable TTL
- Reactive state management using SolidJS stores
- Type-safe data structures throughout the codebase
- Convenience methods for common operations

## Configuration

The application supports flexible API URL configuration through environment variables:

### Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```env
# API Base URL - Overrides the default API endpoint
VITE_API_BASE_URL=http://your-api-server:port/api
```

Or copy the example file:

```bash
cp env.example .env
```

### API URL Resolution Strategy

The application determines the API URL using this fallback strategy:

1. **Environment Variable**: Uses `VITE_API_BASE_URL` if defined
2. **Hostname Construction**: Constructs URL from current hostname (e.g., `https://current-host:8000/api`)
3. **Default**: Falls back to `http://localhost:8000/api`

This allows for flexible deployment scenarios including development, staging, and production environments.

## Usage

Those templates dependencies are maintained via [pnpm](https://pnpm.io) via `pnpm up -Lri`.

This is the reason you see a `pnpm-lock.yaml`. That being said, any package manager will work. This file can be safely be removed once you clone a template.

```bash
$ npm install # or pnpm install or yarn install
```

### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)

## Available Scripts

In the project directory, you can run:

### `npm run dev` or `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>

### `npm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

## Architecture Overview

### Phase 1 Components

**1. API Client (`src/services/apiClient.ts`)**
- Handles all backend API communication
- Implements namespace caching (5-minute TTL)
- Provides comprehensive error handling
- Includes convenience methods like `loadNodeView`

**2. Data Store (`src/stores/dataStore.ts`)**
- Manages application state using SolidJS stores
- Implements caching for nodes, pages, and namespaces
- Provides navigation methods (`navigateToNode`, `navigateToParent`, etc.)
- Handles loading states and error management

**3. Type Definitions (`src/types/index.ts`)**
- Centralized TypeScript interfaces for API responses
- Application state types and constants
- Color schemes and mesh settings configuration

**4. Environment Utilities (`src/util/environment.ts`)**
- Dynamic API URL resolution with fallback strategy
- Environment variable support for flexible deployment
- Hostname-based URL construction for different environments

**5. Demonstration Component (`src/demo/phase1Demo.tsx`)**
- Interactive showcase of Phase 1 functionality
- Tests API client, data store, and type definitions
- Provides visual feedback on implementation status

## Implementation Details

### API Client

The API client provides a robust interface to the backend with:

- **Dynamic Base URL Configuration**: Automatically determines API URL using environment variables, hostname construction, or falls back to `http://localhost:8000/api`
- **Error Handling**: Comprehensive try-catch blocks with detailed logging
- **Caching**: Namespace caching with configurable TTL
- **Methods**: All backend endpoints implemented with proper typing
- **Convenience**: `loadNodeView` method loads node, children, and parent in parallel

### Data Store

The data store implements reactive state management with:

- **SolidJS Stores**: Efficient reactive state updates
- **Caching Strategy**: Separate caches for different data types
- **Navigation**: Methods for navigating the cluster hierarchy
- **State Management**: Loading states, error handling, and view management
- **Singleton Pattern**: Global access to application state

### Type Safety

Strong TypeScript typing ensures data consistency:

- **API Responses**: Properly typed interfaces for all endpoints
- **Application State**: Type-safe state management
- **Constants**: Centralized configuration for colors and settings
- **Type Guards**: Runtime validation of data structures

## Testing

### Unit Tests

Comprehensive unit tests are provided in `src/test/phase1.test.ts`:

- API client initialization and method availability
- Data store state management and caching
- Type definition validation
- Error handling scenarios

### Demonstration Component

The `Phase1Demo` component provides interactive testing:

- Visual feedback on implementation status
- Interactive buttons to re-run tests
- Real-time validation of functionality
- Error highlighting for failed tests

## Next Steps

### Phase 2: Namespace Selection & Initial State

- Create namespace selection component
- Implement namespace loading and selection logic
- Add loading states and error handling
- Update App component for conditional rendering

### Phase 3: 3D Visualization Core

- Enhance Babylon.js scene for node rendering
- Implement node and link managers
- Add camera controls and positioning
- Implement lighting and materials

## Deployment

You can deploy the `dist` folder to any static host provider (netlify, surge, now, etc.)

## Documentation

- **Implementation Plan**: See `IMPLEMENTATION_PLAN.md`
- **Requirements**: See `REQUIREMENTS.md`
- **Phase 1 Summary**: See `PHASE1_IMPLEMENTATION_SUMMARY.md`

## This project was created with the [Solid CLI](https://github.com/solidjs-community/solid-cli)
