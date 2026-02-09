# CORS Configuration Architecture

## System Overview

```mermaid
graph TB
    subgraph "Development Environment"
        FE1[Frontend<br/>localhost:3000<br/>Vite Dev Server]
        BE1[Backend<br/>localhost:8000<br/>FastAPI]
        ENV1[Project Root .env<br/>CORS_ORIGINS=<br/>localhost:3000]

        FE1 -->|CORS Request| BE1
        ENV1 -.->|Loads Config| BE1
    end

    subgraph "Production Environment - Integrated"
        FE2[Frontend /app<br/>Static Files]
        BE2[Backend /api<br/>FastAPI]
        ENV2[Project Root .env<br/>CORS_ORIGINS=<br/>empty or domain]

        BE2 -->|Serves| FE2
        FE2 -->|Same Origin<br/>No CORS| BE2
        ENV2 -.->|Loads Config| BE2
    end

    subgraph "Production Environment - Separate"
        FE3[Frontend<br/>app.example.com<br/>CDN/Static Host]
        BE3[Backend<br/>api.example.com<br/>FastAPI]
        ENV3[Project Root .env<br/>CORS_ORIGINS=<br/>app.example.com]

        FE3 -->|CORS Request| BE3
        ENV3 -.->|Loads Config| BE3
    end
```

## Configuration Flow

```mermaid
flowchart LR
    A[Project Root<br/>.env file] --> B[python-dotenv]
    B --> C[web/backend/util/<br/>environment.py<br/>CORSConfig]
    C --> D[web/backend/app/<br/>main.py<br/>CORSMiddleware]
    D --> E{Wildcard?}
    E -->|Yes| F[Disable Credentials]
    E -->|No| G[Use Config Setting]
    F --> H[Apply CORS]
    G --> H
    H --> I[Log Configuration]
```

## Origin Validation Logic

```mermaid
flowchart TD
    Start[Load CORS_ORIGINS] --> Check1{Empty?}
    Check1 -->|Yes| Default[Use Default:<br/>localhost:3000,<br/>127.0.0.1:3000]
    Check1 -->|No| Check2{Equals '*'?}
    Check2 -->|Yes| Wildcard[Allow All Origins<br/>Force credentials=false]
    Check2 -->|No| Parse[Parse CSV List]
    Parse --> Validate[Filter Empty Strings]
    Validate --> Custom[Use Custom Origins]
    Default --> Apply[Apply to Middleware]
    Wildcard --> Apply
    Custom --> Apply
    Apply --> Log[Log Configuration]
```

## File Structure

```
wp-embeddings/              # Project root
├── .env                    # Local config - git ignored
│   └── CORS_ORIGINS=http://localhost:3000
├── env-example             # UPDATED - Template with CORS docs
│   └── CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
├── dataprep/               # Shares .env file
└── web/backend/
    ├── app/
    │   └── main.py         # UPDATED - Uses environment config
    │       └── Config.cors.get_origins()
    ├── util/
    │   ├── __init__.py     # Existing
    │   ├── languages.py    # Existing
    │   └── environment.py  # NEW - Environment config management
    │       └── Loads .env from project root
    └── pyproject.toml      # UPDATED - Add python-dotenv
```
