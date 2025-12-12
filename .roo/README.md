# Roo files README

This directory contains guidance for the Roo code assistant and implementation plans created by the Roo code assistant.

## Project Refactoring Guidance

This project has been refactored to separate concerns into two distinct Python applications:

### 1. Data Preparation Application (`dataprep/`)
- **Purpose**: Downloads, processes, and analyzes Wikipedia data
- **Key Files**: `command.py`, `database.py`, `transform.py`, `index_pages.py`
- **Dependencies**: ML libraries, database tools, embedding models
- **Testing**: Run with `cd dataprep && uv run pytest`

### 2. Web Application (`web/`)
- **Purpose**: Provides 3D visualization of processed Wikipedia embeddings
- **Key Files**: `backend/main.py`, `backend/api/`, `frontend/`
- **Dependencies**: FastAPI, Pydantic, BabylonJS
- **Testing**: Run with `cd web && uv run pytest`

## Development Guidelines

### When Working on Data Preparation
1. Navigate to `dataprep/` directory
2. Use `uv sync` to manage dependencies
3. Run CLI commands with `python -m command <options>`
4. Test with `uv run pytest`

### When Working on Web Application
1. Navigate to `web/` directory
2. Use `uv sync` to manage dependencies
3. Run development server with `uv run fastapi dev backend/main.py`
4. Test with `uv run pytest`

### Shared Components
- **`wme_sdk/`**: Wikimedia Enterprise SDK (avoid changes)
- **`data/`**: Shared data directory for databases and downloads
- **`.env`**: Configuration file for API credentials

## Import Path Considerations

### Data Preparation Imports
- Local imports should be relative (e.g., `from database import ...`)
- No need for absolute imports within dataprep/

### Web Application Imports
- Backend imports use `backend.*` pattern
- Test files in `web/` can import from `backend.*`

## Testing Strategy

### Data Preparation Tests
- Located in `dataprep/test_*.py`
- Focus on data processing, ML transformations, CLI commands
- Use pytest fixtures for test data

### Web Application Tests
- Located in `web/test_*.py`
- Focus on API endpoints, services, business logic
- Use FastAPI TestClient for integration tests

## Common Tasks

### Adding New Data Processing Steps
1. Add to `dataprep/command.py` for CLI integration
2. Implement logic in appropriate module (e.g., `transform.py`)
3. Add tests in `dataprep/test_*.py`
4. Update documentation in README.md

### Adding New API Endpoints
1. Create endpoint in `web/backend/api/`
2. Add business logic in `web/backend/services/`
3. Create Pydantic models in `web/backend/models/`
4. Add tests in `web/test_*.py`
5. Update frontend integration if needed

## File Organization

```
wp-embeddings/
├── dataprep/          # Data preparation code and tests
├── web/               # Web application code and tests
├── data/              # Shared data files
├── wme_sdk/           # Shared SDK
└── .roo/              # This guidance file
```

## Important Notes

- Both applications are independent but share the same data directory
- Each has its own `pyproject.toml` with appropriate dependencies
- Import paths should reflect the new directory structure
- Update documentation when making significant changes

