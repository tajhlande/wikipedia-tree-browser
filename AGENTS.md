# Repository Guidelines

These guidelines help contributors work efficiently with **wp-embeddings**.  Follow them to keep the codebase consistent and easy to maintain.

## Project Structure & Module Organization
```
.
├─ wme_sdk/           # Copied and slightly modified Wikimedia Enterprise API SDK. Avoid making changes here.
├─ downloaded/        # Raw .tar.gz chunk files per namespace
├─ extracted/         # Extracted NDJSON files (temporary)
├─ web/               # Web application for 3D cluster visualization
│  ├─ backend/        # FastAPI backend
│  │  ├─ main.py     # FastAPI application entry point
│  │  ├─ api/        # API route handlers
│  │  │  ├─ __init__.py
│  │  │  ├─ pages.py # Page-related endpoints
│  │  │  ├─ clusters.py # Cluster tree endpoints
│  │  │  └─ search.py # Search functionality
│  │  ├─ models/     # Pydantic models for API
│  │  │  ├─ __init__.py
│  │  │  ├─ page.py
│  │  │  └─ cluster.py
│  │  └─ services/   # Business logic layer
│  │     ├─ __init__.py
│  │     └─ database_service.py # Wrapper for database.py
│  └─ frontend/      # BabylonJS 3D visualization frontend
│     ├─ index.html  # Main application page
│     ├─ css/
│     │  └─ styles.css
│     ├─ js/
│     │  ├─ app.js # Main application logic
│     │  ├─ babylon-scene.js # 3D visualization with BabylonJS
│     │  └─ api-client.js # API communication
│     └─ assets/     # Static assets (images, icons, etc.)
├─ classes.py         # Dataclass objects for the application
├─ command.py         # CLI entry point
├─ database.py        # SQLite database helper methods
├─ download_chunks.py # Methods to download and extract Wikipedia content archives from the Wikimedia Enterprise API
├─ index_pages.py     # Methods to compute embeddings on the extracted page content
├─ progress_utils.py  # Helper to show progress bars on long-running activities
├─ test_*.py          # PyTest unit/integration tests and other manual tests
├─ transform.py       # Sci-kit Learn and UMAP functions to reduce, cluster, and project embeddings down to 3-space
└─ pyproject.toml     # Project metadata & dependencies
```
Source lives in the top‑level package files; tests start with `test_` and reside alongside the code they verify.

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
* **Formatting/Linting** – Black for formatting, flake8 for linting (`uv run flake8`).

## Testing Guidelines
* **Framework** – PyTest (declared in `pyproject.toml`).
* **Naming** – Test files start with `test_`; test functions start with `test_`.
* **Running** – `pytest` runs all tests; add `-k <expr>` to filter.
    * **Coverage** – Aim for ≥80 % line coverage on new code (use `pytest --cov`).

**Agent Note:** No testing is required for code inside `wme_sdk`. Tests for that package are intentionally excluded from CI.

## Commit & Pull Request Guidelines
* **Commit messages** – Follow the conventional format:
  ```
  type(scope): short description

  Optional longer description.
  ```
  Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.
* **PR description** – Brief overview, related issue numbers (`Closes #123`), and any required screenshots or performance notes.
* **CI checks** – All tests and linting must pass before merging.

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
