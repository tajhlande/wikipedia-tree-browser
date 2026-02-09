# Repository Guidelines

These guidelines help contributors work efficiently with **wp-embeddings**.  Follow them to keep the codebase consistent and easy to maintain.

## Project Structure & Module Organization

This project consists of two separate Python applications that work together:

```
wp-embeddings/
├── dataprep/                    # Data preparation application
│   ├── classes.py               # Dataclass objects for the application
│   ├── command.py               # CLI entry point for data processing
│   ├── database.py              # SQLite database helper methods
│   ├── download_chunks.py       # Download and extract Wikipedia content
│   ├── graph_cluster_tree.py    # Generate 2D cluster visualization
│   ├── index_pages.py           # Compute embeddings on page content
│   ├── languages.py             # Language mapping utilities
│   ├── migrate_to_duck_db.py    # Database migration utilities
│   ├── progress_utils.py       # Progress bar helpers
│   ├── test_*.py               # PyTest unit/integration tests
│   ├── topic_discovery.py       # LLM-based topic discovery
│   ├── transform.py             # ML transformations (UMAP, clustering)
│   └── pyproject.toml          # Data preparation dependencies
├── web/                         # Web application for 3D visualization
│   ├── backend/                # FastAPI backend
│   │   ├── api/                # API route handlers
│   │   │   ├── __init__.py
│   │   │   ├── pages.py        # Page-related endpoints (GET pages in cluster, page details)
│   │   │   ├── clusters.py     # Cluster tree endpoints (GET root, node, children, siblings, parent)
│   │   │   └── search.py       # Search functionality (placeholder)
│   │   ├── app/                # FastAPI app configuration
│   │   │   ├── __init__.py
│   │   │   └── main.py         # FastAPI application entry point with CORS, lifespan management
│   │   ├── models/             # Pydantic models for API
│   │   │   ├── __init__.py
│   │   │   ├── page.py         # PageResponse, PageDetailResponse models
│   │   │   └── cluster.py      # ClusterNodeResponse model
│   │   ├── services/           # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── cluster_service.py # Core cluster operations and database access
│   │   │   ├── database_service.py # Database connection management
│   │   │   ├── service_model.py  # Service provider pattern implementation
│   │   │   └── service_setup.py # Service initialization and dependency injection
│   │   └── test/               # Pytest tests
│   │       ├── __init__.py
│   │       ├── test_clusters_service.py # Cluster service unit tests
│   │       └── test_pages_service.py    # Page service unit tests
│   ├── frontend/               # SolidJS + BabylonJS 3D visualization frontend
│   │   ├── index.html          # Main application page with canvas element
│   │   ├── src/
│   │   │   ├── index.tsx       # SolidJS application entry point
│   │   │   ├── App.tsx         # Main application component
│   │   │   ├── Comp.tsx        # Component template
│   │   │   ├── index.css       # Global CSS styles
│   │   │   ├── babylon/        # BabylonJS 3D visualization
│   │   │   │   └── scene.ts    # BabylonJS scene initialization and rendering
│   │   │   └── ui/             # UI components
│   │   │       ├── Overlay.tsx  # UI overlay with buttons and controls
│   │   │       └── Overlay.css  # UI overlay styles
│   │   ├── package.json        # Frontend dependencies and scripts
│   │   ├── tsconfig.json       # TypeScript configuration
│   │   ├── vite.config.ts      # Vite build configuration
│   │   └── tailwind.config.js  # Tailwind CSS configuration
│   ├── .python-version         # Python version specification
│   ├── pyproject.toml          # Web application dependencies
│   └── uv.lock                 # UV dependency lock file
├── data/                       # Shared data directory
│   ├── downloaded/             # Raw .tar.gz chunk files per namespace
│   ├── extracted/              # Extracted NDJSON files (temporary)
│   └── *.db                    # SQLite databases (enwiki_namespace_0.db, etc.)
└── wme_sdk/                    # Wikimedia Enterprise API SDK (read only)
```

## Application Responsibilities

### Data Preparation Application (`dataprep/`)
- Downloads and extracts Wikipedia content from Wikimedia Enterprise API
- Computes embeddings using ML models (jina-embeddings-v4-text-matching-GGUF)
- Performs dimensionality reduction using UMAP
- Runs recursive clustering algorithms to build cluster trees
- Discovers topics using LLMs (gpt-oss-20b)
- Stores results in SQLite databases
- Provides CLI interface for all data processing operations

### Web Application (`web/`)
- Provides REST API for accessing processed data
- Offers 3D visualization of cluster trees using BabylonJS
- Supports search and navigation of Wikipedia clusters
- Serves static frontend assets
- Implements pagination and performance optimizations

### Web Application Backend (`web/backend/`)
- **FastAPI REST API**: Provides endpoints for cluster tree navigation and page data
- **Cluster Service**: Business logic for cluster operations (get root, node, children, siblings, parent)
- **Page Service**: Business logic for page operations (get pages in cluster, page details)
- **Database Service**: Manages SQLite database connections and queries
- **Service Provider Pattern**: Dependency injection system for service management
- **CORS Configuration**: Enables frontend-backend communication
- **Lifespan Management**: Handles service initialization and cleanup

### Web Application Frontend (`web/frontend/`)
- **SolidJS Framework**: Reactive UI components with TypeScript
- **BabylonJS Integration**: 3D visualization engine for cluster tree rendering
- **Vite Build System**: Modern frontend tooling with hot module replacement
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Kobalte UI**: Accessible UI component library
- **Responsive Design**: Adapts to different screen sizes

### Shared Components
- **`wme_sdk/`**: Wikimedia Enterprise API SDK (avoid making changes)
- **`data/`**: Shared directory for all data files (databases, downloads, extracts)

## Build, Test, and Development Commands for the `dataprep` application
Run these in the `dataprep` directory

| Command                       | Description                                                     |
|-------------------------------|-----------------------------------------------------------------|
| `uv sync`                     | Install/upgrade all dependencies into the virtual environment.  |
| `python -m command <options>` | Run the interactive or one‑off CLI (e.g. `status`, `download`). |
| `pytest -q`                   | Execute the test suite.                                         |
| `uv run black .`              | Reformat code with Black (if needed).                           |
| `uv run ruff check`           | Run Ruff linter for code quality checks.                        |

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.13+)
- **Database**: SQLite (via existing dataprep databases)
- **API Design**: RESTful endpoints with Pydantic models
- **Dependency Management**: UV with virtual environments
- **Testing**: Pytest with async support
- **Code Quality**: Black (formatting), Ruff (linting), Flake8

### Frontend
- **Framework**: SolidJS (reactive UI library)
- **Language**: TypeScript
- **3D Engine**: BabylonJS (WebGL-based 3D rendering)
- **Build Tool**: Vite (fast development server and bundler)
- **Styling**: Tailwind CSS (utility-first framework)
- **UI Components**: Kobalte (accessible component library)
- **Package Management**: npm

## Coding Style & Naming Conventions

* **Indentation** – 4 spaces, no tabs.
* **Line length** – 88 characters (Black default) for Python, 120 for frontend.
* **File names** – snake_case for modules, `CamelCase` for classes.
* **Functions/variables** – lower_case_with_underscores.
* **Formatting/Linting** – Black for formatting, ruff for linting (`uv run ruff check`).

### Application-Specific Guidelines

**Data Preparation Application:**
- All ML processing code should be in `dataprep/`
- CLI commands are accessible via `python -m command`
- Database operations should use the `database.py` helper methods

**Web Application Backend:**
- API endpoints should be in `web/backend/api/` with FastAPI routers
- Business logic should be in `web/backend/services/` using service provider pattern
- Data models should be in `web/backend/models/` as Pydantic models
- Database access should use `web/backend/services/database_service.py`
- Service initialization should be handled in `web/backend/services/service_setup.py`

**Web Application Frontend:**
- SolidJS components should be in `web/frontend/src/` with `.tsx` extension
- BabylonJS 3D code should be in `web/frontend/src/babylon/`
- UI components should be in `web/frontend/src/ui/`
- API communication should be implemented as separate service modules
- Use Tailwind CSS for styling via utility classes
- Follow SolidJS reactive patterns for state management

## Testing Guidelines

* **Framework** – PyTest (declared in each application's `pyproject.toml`).
* **Naming** – Test files start with `test_`; test functions start with `test_`.
* **Running** – `uv run pytest` runs all tests; add `-k <expr>` to filter.
    * **Coverage** – Aim for ≥80 % line coverage on new code (use `uv run pytest --cov`).

### Application-Specific Testing

**Data Preparation Tests:**
- Located in `dataprep/test_*.py`
- Test data processing, ML transformations, and CLI commands
- Run with: `cd dataprep && uv run pytest`

**Web Application Backend Tests:**
- Located in `web/backend/test/`
- Test API endpoints, services, and business logic
- Run with: `cd web/backend && uv run pytest`
- Key test files:
  - `test_clusters_service.py`: Tests cluster service functionality
  - `test_pages_service.py`: Tests page service functionality

**Web Application Frontend Tests:**
- Located in `web/frontend/`
- Test SolidJS components and BabylonJS integration
- Run with: `cd web/frontend && npm test` (when configured)
- Use Vite's test runner or Jest for component testing

**Agent Note:** No testing is required for code inside `wme_sdk`. Tests for that package are intentionally excluded from CI.

## Commit & Pull Request Guidelines

* **Commit messages** – Follow the conventional format:
  ```
  type(scope): short description

  Optional longer description.
  ```
  Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.

  **Scope prefixes:**
  - `dataprep:` - Changes to data preparation application
  - `web:` - Changes to web application
  - `shared:` - Changes to shared components (data/, wme_sdk/)

* **PR description** – Brief overview, related issue numbers (`Closes #123`), and any required screenshots or performance notes.
* **CI checks** – All tests and linting must pass before merging.
* **Scope** – Clearly indicate which application(s) are affected by your changes.

## API Documentation & Development Workflow

### API Documentation
- FastAPI automatically generates interactive API documentation
- Access Swagger UI at `/docs` when running the backend
- Access ReDoc at `/redoc` for alternative documentation format
- API endpoints are organized by functionality:
  - `/api/clusters/*`: Cluster tree navigation endpoints
  - `/api/pages/*`: Page data retrieval endpoints
  - `/api/search/*`: Search functionality (placeholder)

### Development Workflow

**Backend Development:**
1. Navigate to `web/backend/`
2. Install dependencies: `uv sync`
3. Run development server: `uv run fastapi dev app/main.py`
4. Access API docs at `http://localhost:8000/docs`

**Frontend Development:**
1. Navigate to `web/frontend/`
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Access frontend at `http://localhost:3000`

**Full Stack Development:**
1. Run backend in one terminal: `cd web/backend && uv run uvicorn app.main:app --reload`
2. Run frontend in another terminal: `cd web/frontend && npm run dev`
3. Configure CORS in backend to allow frontend communication
4. Use proxy configuration in Vite if needed for API calls

## Security & Configuration Tips (optional)
* Store API credentials in a `.env` file – never commit it.
* Review third‑party SDK changes in `wme_sdk/` for licensing compliance.
* Configure CORS settings appropriately for production deployment.
* Use environment variables for sensitive configuration (database paths, API keys).

### CORS Configuration

The backend API uses environment-based CORS configuration for security:

1. **Development**: Copy [`env-example`](env-example) to `.env` in project root
2. **Configure**: Set `CORS_ORIGINS` to allowed frontend origins
   - Development: `http://localhost:3000,http://127.0.0.1:3000`
   - Production (integrated): Leave empty or set to your domain
   - Production (separate): `https://your-frontend-domain.com`
3. **Never use wildcard (`*`) in production**

See [`env-example`](env-example) for full CORS configuration documentation.

**Configuration Location:**
- The `.env` file is located at the project root (shared with dataprep)
- CORS settings are loaded by [`web/backend/util/environment.py`](web/backend/util/environment.py)
- Applied in [`web/backend/app/main.py`](web/backend/app/main.py)

**Environment Variables:**
- `CORS_ORIGINS`: Comma-separated list of allowed origins (or `*` for wildcard)
- `CORS_ALLOW_CREDENTIALS`: Enable credentials (cookies, auth headers) - must be `false` with wildcard
- `CORS_ALLOW_METHODS`: Allowed HTTP methods (default: `GET,POST,PUT,DELETE,OPTIONS`)
- `CORS_ALLOW_HEADERS`: Allowed headers (default: `*`)

**Important Note for Agents:**
- Only modify [`env-example`](env-example) which is under git control
- Never modify the live `.env` file as it contains sensitive credentials
- Users should copy `env-example` to `.env` and customize it for their environment

## Web Application (3D Cluster Visualization)

The web application provides an interactive 3D visualization of Wikipedia page clusters using BabylonJS. It reads from the existing SQLite databases and displays cluster trees in three-dimensional space, allowing users to explore and navigate the hierarchical structure of Wikipedia knowledge.

### Web App Features
* **3D Cluster Visualization**: Interactive 3D representation of cluster trees using BabylonJS
* **Namespace Selection**: Choose which Wikipedia namespace to visualize (e.g., enwiki_namespace_0)
* **Hierarchical Navigation**: Explore cluster relationships and page distributions
* **Search Functionality**: Find specific pages or clusters
* **Performance Optimization**: Efficient handling of large datasets with pagination and lazy loading

### Current Implementation Status

**Backend (FastAPI)**: ✅ Fully implemented with:
- REST API endpoints for cluster tree navigation
- Page data retrieval with pagination
- CORS configuration for frontend communication
- Service-based architecture with dependency injection
- Comprehensive error handling and logging

**Frontend (SolidJS + BabylonJS)**: ⏳ Partially implemented with:
- BabylonJS scene initialization and basic 3D rendering
- SolidJS component structure with TypeScript
- Vite build system with Tailwind CSS
- Basic UI overlay with Kobalte components
- Responsive design foundation

## Build, Test, and Development Commands (Extended)
| Command                       | Description                                                     |
|-------------------------------|-----------------------------------------------------------------|
| `uv sync`                     | Install/upgrade all dependencies into the virtual environment.  |
| `python -m command <options>` | Run the interactive or one‑off CLI (e.g. `status`, `download`). |
| `pytest -q`                   | Execute the test suite.                                         |
| `uv run black .`              | Reformat code with Black (if needed).                           |
| `cd web/backend && uv run fastapi dev app/main.py` | Run FastAPI development server           |
| `cd web/frontend && npm run dev` | Run Vite development server with hot reload        |
| `cd web/frontend && npm run build` | Build production frontend assets        |
| `cd web/frontend && npm run preview` | Preview built frontend locally         |
| `cd web/backend && uv run uvicorn app.main:app --reload` | Run FastAPI with auto-reload for development |

## Web App Deployment
| Command                       | Description                                                     |
|-------------------------------|-----------------------------------------------------------------|
| `cd web/backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000` | Deploy backend API |
| `cd web/frontend && npm run build` | Build production frontend assets |
| `cd web/frontend && npm run preview` | Preview built frontend locally |

## Project TODO List

### Phase 1: Backend Development ✅ (COMPLETED)
- [x] Set up FastAPI project structure in `web/backend/`
- [x] Create database service wrapper for existing database.py functions
- [x] Implement Pydantic models for API responses
- [x] Build cluster tree API endpoints (get tree structure, node details)
- [x] Build page API endpoints (get pages in cluster, page details)
- [ ] Implement search functionality API endpoints (placeholder exists)
- [x] Add CORS configuration for frontend communication
- [x] Test all API endpoints with existing SQLite data

### Phase 2: Frontend Development ⏳ (IN PROGRESS)
- [x] Set up HTML/CSS/JS structure in `web/frontend/`
- [x] Integrate BabylonJS for 3D visualization
- [x] Create API client for frontend-backend communication
- [x] Implement cluster tree visualization (3D nodes and connections)
- [x] Add namespace selection interface
- [ ] Implement search UI and functionality
- [ ] Add cluster node selection and page listing
- [ ] Optimize rendering for large cluster datasets
=======
## Project TODO List

### Phase 1: Backend Development ✅ (COMPLETED)
- [x] Set up FastAPI project structure in `web/backend/`
- [x] Create database service wrapper for existing database.py functions
- [x] Implement Pydantic models for API responses
- [x] Build cluster tree API endpoints (get tree structure, node details)
- [x] Build page API endpoints (get pages in cluster, page details)
- [ ] Implement search functionality API endpoints (placeholder exists)
- [x] Add CORS configuration for frontend communication
- [x] Test all API endpoints with existing SQLite data

### Phase 2: Frontend Development
- [x] Set up HTML/CSS/JS structure in `web/frontend/`
- [x] Integrate BabylonJS for 3D visualization
- [x] Create API client for frontend-backend communication
- [x] Implement cluster tree visualization (3D nodes and connections)
- [x] Add namespace selection interface
- [x] Implement search UI and functionality
- [x] Add cluster node selection and page listing
- [x] Optimize rendering for large cluster datasets

### Phase 3: Build & Deployment System
- [x] Set up build system for frontend (Vite/Webpack/bundler)
- [ ] Configure production environment variables
- [ ] Create Docker containerization for easy deployment
- [ ] Implement CI/CD pipeline for automated builds and deployments
- [ ] Add health checks and monitoring for the API
- [ ] Configure static file serving for production

### Phase 4: Performance & Polish
- [x] Implement pagination for large datasets
- [x] Add loading states and progress indicators
- [x] Optimize 3D rendering performance
- [ ] Add keyboard shortcuts and accessibility features
- [ ] Implement responsive design for mobile devices
- [ ] Add error handling and user feedback


## MCP tools

Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.



