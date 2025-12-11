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
│   ├── languages.py            # Language mapping utilities
│   ├── migrate_to_duck_db.py    # Database migration utilities
│   ├── progress_utils.py       # Progress bar helpers
│   ├── test_*.py               # PyTest unit/integration tests
│   ├── topic_discovery.py       # LLM-based topic discovery
│   ├── transform.py             # ML transformations (UMAP, clustering)
│   └── pyproject.toml          # Data preparation dependencies
├── web/                         # Web application for 3D visualization
│   ├── backend/                # FastAPI backend
│   │   ├── main.py             # FastAPI application entry point
│   │   ├── api/                # API route handlers
│   │   │   ├── __init__.py
│   │   │   ├── pages.py        # Page-related endpoints
│   │   │   ├── clusters.py     # Cluster tree endpoints
│   │   │   └── search.py       # Search functionality
│   │   ├── models/             # Pydantic models for API
│   │   │   ├── __init__.py
│   │   │   ├── page.py
│   │   │   └── cluster.py
│   │   └── services/           # Business logic layer
│   │       ├── __init__.py
│   │       ├── cluster_service.py
│   │       ├── database_service.py
│   │       ├── service_model.py
│   │       └── service_setup.py
│   ├── frontend/               # BabylonJS 3D visualization frontend
│   │   ├── index.html          # Main application page
│   │   ├── css/
│   │   │   └── styles.css
│   │   ├── js/
│   │   │   ├── app.js          # Main application logic
│   │   │   ├── babylon-scene.js # 3D visualization with BabylonJS
│   │   │   └── api-client.js  # API communication
│   │   └── assets/             # Static assets (images, icons, etc.)
│   ├── test_clusters_service.py # Web application tests
│   ├── test_pages_service.py
│   └── pyproject.toml          # Web application dependencies
├── data/                       # Shared data directory
│   ├── downloaded/             # Raw .tar.gz chunk files per namespace
│   ├── extracted/              # Extracted NDJSON files (temporary)
│   └── *.db                    # SQLite databases (enwiki_namespace_0.db, etc.)
├── wme_sdk/                    # Wikimedia Enterprise API SDK (shared)
└── pyproject.toml              # Root configuration (deprecated)
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

### Shared Components
- **`wme_sdk/`**: Wikimedia Enterprise API SDK (avoid making changes)
- **`data/`**: Shared directory for all data files (databases, downloads, extracts)

## Build, Test, and Development Commands
| Command                       | Description                                                     |
|-------------------------------|-----------------------------------------------------------------|
| `uv sync`                     | Install/upgrade all dependencies into the virtual environment.  |
| `python -m command <options>` | Run the interactive or one‑off CLI (e.g. `status`, `download`). |
| `pytest -q`                   | Execute the test suite.                                         |
| `uv run black .`              | Reformat code with Black (if needed).                           |

## Coding Style & Naming Conventions

* **Indentation** – 4 spaces, no tabs.
* **Line length** – 88 characters (Black default).
* **File names** – snake_case for modules, `CamelCase` for classes.
* **Functions/variables** – lower_case_with_underscores.
* **Formatting/Linting** – Black for formatting, ruff for linting (`uv run ruff check`).

### Application-Specific Guidelines

**Data Preparation Application:**
- All ML processing code should be in `dataprep/`
- CLI commands are accessible via `python -m command`
- Database operations should use the `database.py` helper methods

**Web Application:**
- API endpoints should be in `web/backend/api/`
- Business logic should be in `web/backend/services/`
- Data models should be in `web/backend/models/`
- Frontend code should be in `web/frontend/`

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

**Web Application Tests:**
- Located in `web/test_*.py`
- Test API endpoints, services, and business logic
- Run with: `cd web && uv run pytest`

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

## Security & Configuration Tips (optional)
* Store API credentials in a `.env` file – never commit it.
* Review third‑party SDK changes in `wme_sdk/` for licensing compliance.

## Web Application (3D Cluster Visualization)

The web application provides an interactive 3D visualization of Wikipedia page clusters using BabylonJS. It reads from the existing SQLite databases and displays cluster trees in three-dimensional space, allowing users to explore and navigate the hierarchical structure of Wikipedia knowledge.

### Web App Features
* **3D Cluster Visualization**: Interactive 3D representation of cluster trees using BabylonJS
* **Namespace Selection**: Choose which Wikipedia namespace to visualize (e.g., enwiki_namespace_0)
* **Hierarchical Navigation**: Explore cluster relationships and page distributions
* **Search Functionality**: Find specific pages or clusters
* **Performance Optimization**: Efficient handling of large datasets with pagination and lazy loading

## Build, Test, and Development Commands (Extended)
| Command                       | Description                                                     |
|-------------------------------|-----------------------------------------------------------------|
| `uv sync`                     | Install/upgrade all dependencies into the virtual environment.  |
| `python -m command <options>` | Run the interactive or one‑off CLI (e.g. `status`, `download`). |
| `pytest -q`                   | Execute the test suite.                                         |
| `uv run black .`              | Reformat code with Black (if needed).                           |
| `uv run fastapi dev web/backend/main.py` | Run FastAPI development server           |
| `cd web/frontend && npm run build` | Build production frontend assets        |
| `cd web/frontend && npm run preview` | Preview built frontend locally         |

## Web App Deployment
| Command                       | Description                                                     |
|-------------------------------|-----------------------------------------------------------------|
| `cd web/backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000` | Deploy backend API |
| `npm run build && npm run deploy` | Build and deploy frontend (when configured) |

## Project TODO List

### Phase 1: Backend Development
- [ ] Set up FastAPI project structure in `web/backend/`
- [ ] Create database service wrapper for existing database.py functions
- [ ] Implement Pydantic models for API responses
- [ ] Build cluster tree API endpoints (get tree structure, node details)
- [ ] Build page API endpoints (get pages in cluster, page details)
- [ ] Implement search functionality API endpoints
- [ ] Add CORS configuration for frontend communication
- [ ] Test all API endpoints with existing SQLite data

### Phase 2: Frontend Development
- [ ] Set up HTML/CSS/JS structure in `web/frontend/`
- [ ] Integrate BabylonJS for 3D visualization
- [ ] Create API client for frontend-backend communication
- [ ] Implement cluster tree visualization (3D nodes and connections)
- [ ] Add namespace selection interface
- [ ] Implement search UI and functionality
- [ ] Add cluster node selection and page listing
- [ ] Optimize rendering for large cluster datasets

### Phase 3: Build & Deployment System
- [ ] Set up build system for frontend (Vite/Webpack/bundler)
- [ ] Configure production environment variables
- [ ] Create Docker containerization for easy deployment
- [ ] Implement CI/CD pipeline for automated builds and deployments
- [ ] Add health checks and monitoring for the API
- [ ] Configure static file serving for production

### Phase 4: Performance & Polish
- [ ] Implement pagination for large datasets
- [ ] Add loading states and progress indicators
- [ ] Optimize 3D rendering performance
- [ ] Add keyboard shortcuts and accessibility features
- [ ] Implement responsive design for mobile devices
- [ ] Add error handling and user feedback

---
Happy hacking! If anything is unclear, open an issue or ask the maintainers.
