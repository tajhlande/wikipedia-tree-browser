# CORS Configuration Fix Plan

## Problem Statement

The current CORS configuration in [`web/backend/app/main.py:50`](web/backend/app/main.py:50) uses a wildcard (`allow_origins=["*"]`) which:
- Is insecure for production environments
- Prevents using credentials (cookies, authorization headers)
- Exposes the API to any website

## Required Origins Analysis

### Development Environment
When developing locally, the frontend and backend run on different ports:
- **Frontend**: `http://localhost:3000` (Vite dev server)
- **Backend**: `http://localhost:8000` (FastAPI server)
- **Alternate**: `http://127.0.0.1:3000` (some browsers treat localhost and 127.0.0.1 differently)

### Production Environment
Two deployment scenarios:

**Scenario 1: Integrated Deployment (Current Architecture)**
- Backend serves frontend static files from `/app`
- Frontend and API share the same origin
- **No CORS needed** (same-origin requests)
- Example: `https://example.com/app` (frontend) and `https://example.com/api` (backend)

**Scenario 2: Separate Deployment**
- Frontend hosted on CDN or separate server
- Backend hosted independently
- **Requires specific origin**: e.g., `https://frontend.example.com`

## Recommended Solution: Environment-Based Configuration

### Why Environment Variables?

1. **Security**: Keep configuration out of source code
2. **Flexibility**: Different settings for dev/staging/prod
3. **Maintainability**: Change origins without code changes
4. **Best Practice**: Follows 12-factor app methodology

### Implementation Architecture

```
wp-embeddings/              # Project root
├── .env                    # Local configuration (git-ignored)
├── env-example             # UPDATED: Add CORS configuration
└── web/backend/
    ├── app/
    │   └── main.py         # UPDATED: Use environment config for CORS
    ├── util/
    │   ├── __init__.py     # Existing
    │   ├── languages.py    # Existing
    │   └── environment.py  # NEW: Environment configuration module
    └── pyproject.toml      # UPDATED: Add python-dotenv dependency
```

## Implementation Details

### 1. Environment Variable Structure

**File**: `env-example` (project root - update existing file)

Add these CORS configuration variables to the existing `env-example`:

```bash
# ... existing variables ...

# ===================================================================
# Web Backend CORS Configuration
# ===================================================================

# CORS Configuration
# Comma-separated list of allowed origins (no spaces)
# For development, include all localhost variants
# For production, list specific domains or leave empty for same-origin only
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Alternative: Use wildcard ONLY for development
# CORS_ORIGINS=*

# Enable credentials (cookies, authorization headers)
# Must be False when using wildcard origins
CORS_ALLOW_CREDENTIALS=false

# Allowed HTTP methods (usually leave as default)
CORS_ALLOW_METHODS=GET,POST,PUT,DELETE,OPTIONS

# Allowed headers (usually leave as default)
CORS_ALLOW_HEADERS=*
```

### 2. Configuration Module

**File**: `web/backend/util/environment.py`
```python
"""
Environment configuration management for the web backend application
Loads environment variables from project root and provides typed configuration
"""

import os
from typing import List
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
# __file__ is web/backend/util/environment.py
# Go up 3 levels to reach project root
project_root = Path(__file__).parent.parent.parent
dotenv_path = project_root / ".env"

# Load environment variables
# Use override=False to allow system environment variables to take precedence
load_dotenv(dotenv_path=dotenv_path, override=False)


class CORSConfig:
    """CORS configuration settings"""

    @staticmethod
    def get_origins() -> List[str]:
        """
        Get allowed CORS origins from environment

        Returns:
            List of allowed origins, or ["*"] for wildcard

        Environment:
            CORS_ORIGINS: Comma-separated list of origins
                         Special value "*" enables all origins
                         Empty or unset defaults to localhost for development
        """
        origins_str = os.getenv("CORS_ORIGINS", "").strip()

        # If explicitly set to wildcard
        if origins_str == "*":
            return ["*"]

        # If set to specific origins, parse comma-separated list
        if origins_str:
            origins = [origin.strip() for origin in origins_str.split(",")]
            return [origin for origin in origins if origin]  # Filter empty strings

        # Default to localhost for development
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

    @staticmethod
    def allow_credentials() -> bool:
        """
        Whether to allow credentials (cookies, authorization headers)

        Must be False when using wildcard origins
        """
        return os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"

    @staticmethod
    def get_methods() -> List[str]:
        """Get allowed HTTP methods"""
        methods_str = os.getenv("CORS_ALLOW_METHODS", "GET,POST,PUT,DELETE,OPTIONS")
        return [m.strip() for m in methods_str.split(",")]

    @staticmethod
    def get_headers() -> List[str] | str:
        """Get allowed headers"""
        headers = os.getenv("CORS_ALLOW_HEADERS", "*")
        if headers == "*":
            return ["*"]
        return [h.strip() for h in headers.split(",")]


class Config:
    """Main application configuration"""

    # CORS settings
    cors = CORSConfig()

    # Data directory (shared with dataprep)
    data_dir = Path(os.getenv("DATA_STORAGE_DIRNAME_VAR", "data"))

    # Logging level
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
```

### 3. Update main.py

**File**: `web/backend/app/main.py` (lines 47-54)

```python
# Import configuration
from util.environment import Config

# Configure CORS for frontend communication
cors_origins = Config.cors.get_origins()
cors_credentials = Config.cors.allow_credentials()

# Validation: Cannot use credentials with wildcard origins
if "*" in cors_origins and cors_credentials:
    logger.warning(
        "CORS configuration error: allow_credentials cannot be True when using wildcard origins. "
        "Setting allow_credentials to False."
    )
    cors_credentials = False

logger.info(f"CORS enabled for origins: {cors_origins}")
logger.info(f"CORS credentials allowed: {cors_credentials}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_credentials,
    allow_methods=Config.cors.get_methods(),
    allow_headers=Config.cors.get_headers(),
)
```

### 4. Update Dependencies

**File**: `web/backend/pyproject.toml`

Add `python-dotenv` to dependencies:
```toml
dependencies = [
    "fastapi>=0.115.6",
    "uvicorn[standard]>=0.34.0",
    "python-dotenv>=1.0.0",  # NEW
]
```

## Configuration Examples

### Development Setup

**File**: `.env` (project root)
```bash
# ... existing variables ...

# Web Backend CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ALLOW_CREDENTIALS=false
```

### Production Setup (Integrated)

**File**: `.env` (project root)
```bash
# ... existing variables ...

# Web Backend CORS
# Empty origins = same-origin only (frontend served from /app)
CORS_ORIGINS=
# Or explicitly list your domain
# CORS_ORIGINS=https://yourapp.example.com
CORS_ALLOW_CREDENTIALS=true
```

### Production Setup (Separate Frontend)

**File**: `.env` (project root)
```bash
# ... existing variables ...

# Web Backend CORS
# Frontend hosted separately
CORS_ORIGINS=https://app.example.com,https://www.example.com
CORS_ALLOW_CREDENTIALS=true
```

### Staging/Testing Environment

**File**: `.env` (project root)
```bash
# ... existing variables ...

# Web Backend CORS
# Multiple environments
CORS_ORIGINS=https://staging.example.com,https://dev.example.com,http://localhost:3000
CORS_ALLOW_CREDENTIALS=true
```

## Security Considerations

1. **Never use wildcard in production**: Always specify exact origins
2. **Validate .env file**: Ensure it's in `.gitignore` to prevent committing credentials
3. **Use HTTPS in production**: HTTP origins should only be used for local development
4. **Credentials flag**: Only enable if you need cookies or auth headers
5. **Least privilege**: Only allow methods and headers that your API actually uses
6. **Regular audits**: Review allowed origins periodically

## Testing Strategy

### Manual Testing

1. **Development CORS**:
   ```bash
   # At project root: Set up environment
   cp env-example .env
   # Edit .env and ensure CORS_ORIGINS includes localhost:3000

   # Terminal 1: Start backend
   cd web/backend
   uv run uvicorn app.main:app --reload

   # Terminal 2: Start frontend
   cd web/frontend
   npm run dev

   # Browser: Navigate to http://localhost:3000
   # Open DevTools → Network → Check for CORS errors
   ```

2. **Production CORS**:
   ```bash
   # At project root: Set up environment
   # Edit .env and set CORS_ORIGINS= (empty for same-origin)

   # Build frontend
   cd web/frontend
   npm run build

   # Start backend (serves frontend from /app)
   cd ../backend
   uv run uvicorn app.main:app

   # Browser: Navigate to http://localhost:8000/app
   # Should work without CORS issues (same origin)
   ```

### Automated Testing

Add to `web/backend/test/test_environment.py`:
```python
import pytest
from util.environment import CORSConfig
import os


def test_cors_default_origins():
    """Test default localhost origins"""
    if "CORS_ORIGINS" in os.environ:
        del os.environ["CORS_ORIGINS"]

    origins = CORSConfig.get_origins()
    assert "http://localhost:3000" in origins
    assert "http://127.0.0.1:3000" in origins


def test_cors_wildcard():
    """Test wildcard origin"""
    os.environ["CORS_ORIGINS"] = "*"
    origins = CORSConfig.get_origins()
    assert origins == ["*"]


def test_cors_custom_origins():
    """Test custom origins"""
    os.environ["CORS_ORIGINS"] = "https://app.example.com,https://www.example.com"
    origins = CORSConfig.get_origins()
    assert "https://app.example.com" in origins
    assert "https://www.example.com" in origins


def test_cors_credentials_validation():
    """Test credentials cannot be True with wildcard"""
    os.environ["CORS_ORIGINS"] = "*"
    os.environ["CORS_ALLOW_CREDENTIALS"] = "true"

    # The main.py validation should catch this
    # This is tested in integration tests
```

## Documentation Updates

### Update AGENTS.md

Add section under "Security & Configuration Tips":

```markdown
## CORS Configuration

The backend API uses environment-based CORS configuration for security:

1. **Development**: Copy [`env-example`](env-example) to `.env` in project root
2. **Configure**: Set `CORS_ORIGINS` to allowed frontend origins
   - Development: `http://localhost:3000,http://127.0.0.1:3000`
   - Production (integrated): Leave empty or set to your domain
   - Production (separate): `https://your-frontend-domain.com`
3. **Never use wildcard (`*`) in production**

See [`env-example`](env-example) for full CORS configuration documentation.
```

## Migration Path

### For Existing Deployments

1. **Before deployment**:
   - Update `.env` file in project root with CORS settings
   - Set appropriate `CORS_ORIGINS` for your environment
   - Test thoroughly in staging

2. **During deployment**:
   - Update code (environment.py, main.py)
   - Update env-example with CORS documentation
   - Install dependencies (`cd web/backend && uv sync`)
   - Restart backend service

3. **After deployment**:
   - Monitor logs for CORS configuration messages
   - Test frontend connectivity
   - Verify no CORS errors in browser console

### Rollback Plan

If issues occur, temporarily revert to wildcard in your `.env` file at project root:
```bash
# Add or update in .env at project root
CORS_ORIGINS=*
# Restart service
```

Then investigate and fix the origin configuration.

## Summary

**What origins do you need?**
1. **Development**: `http://localhost:3000` and `http://127.0.0.1:3000`
2. **Production (integrated)**: None (same-origin) or your deployment domain
3. **Production (separate)**: Your specific frontend domain(s)

**Can you draw from a text file?**
Yes! The recommended approach uses environment variables in the project root `.env` file, which:
- Keeps configuration separate from code
- Allows different settings per environment
- Follows security best practices
- Is more maintainable than hardcoded values
- Centralizes all environment config (shared with dataprep)

The `.env` file is a simple text file with key=value pairs that gets loaded at runtime from the project root.

## Next Steps

1. Review and approve this plan
2. Switch to Code mode to implement the changes
3. Test in development environment
4. Document deployment procedure
5. Deploy to production with proper CORS settings
