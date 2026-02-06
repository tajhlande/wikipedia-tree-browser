# Wikipedia Embeddings and Visualization

This project consists of two separate applications that work together to process and visualize Wikipedia embeddings:

1. **Data Preparation** (`dataprep/`) - Downloads, processes, and analyzes Wikipedia data
2. **Web Application** (`web/`) - Provides 3D visualization of the processed embeddings

The data preparation component downloads and extracts Wikipedia article page titles and abstracts from [Wikimedia Enterprise](https://enterprise.wikimedia.com/),
then computes embeddings on them and recursively clusters the embeddings. The web application provides an interactive 3D visualization of the resulting cluster trees.

The goal is to have visualizations for multiple languages – as many as can be supported by the ML models I've selected for this project:

* [jinaai/jina-embeddings-v4-text-matching-GGUF](https://huggingface.co/jinaai/jina-embeddings-v4-text-matching-GGUF) for embeddings
* [ggml-org/gpt-oss-20b-GGUF](https://huggingface.co/ggml-org/gpt-oss-20b-GGUF) for topic discovery

## Project Structure

```
wp-embeddings/
├── dataprep/          # Data preparation application
│   ├── command.py     # CLI interface for data processing
│   ├── classes.py     # Data models
│   ├── database.py    # Database operations
│   ├── download_chunks.py    # Download Wikipedia chunks
│   ├── index_pages.py        # Process page content through embedding functions
│   ├── transform.py          # ML and statistical data transformations
│   └── pyproject.toml        # Dependencies for data prep
├── web/               # Web application for 3D visualization
│   ├── backend/       # FastAPI backend
│   │   └── pyproject.toml    # Dependencies for backend API
│   └── frontend/      # SolidJS + Kobalte + BabylonJS frontend
│       └── package.json      # Dependencies for frontend web app
├── data/              # Shared data directory (you need to create this)
│   ├── downloaded/    # Raw downloaded chunks
│   ├── extracted/     # Extracted page data
│   └── *.db          # SQLite databases
└── wme_sdk/          # Wikimedia Enterprise SDK (shared)
```

## Data Preparation Application

The data preparation application handles downloading, processing, and analyzing Wikipedia data.
It can be invoked interactively:

```
$ cd dataprep
$ uv run python -m command
Welcome to wp-embeddings command interpreter!
Type 'help' for available commands or 'quit' to exit.

>
```

or with command parameters:

```
$ cd dataprep
$ python -m command help
Available commands:
  refresh - Refresh chunk data for a namespace
  download - Download chunks that haven't been downloaded yet
  unpack - Unpack and process downloaded chunks
  embed - Process remaining pages for embedding computation
  reduce - Reduce dimension of embeddings
  recursive-cluster - Run recursive clustering algorithm to build a tree of clusters
  project - Project reduced vector clusters into 3-space.
  topics - Use an LLM to discover topics for clusters according to their page content.
  status - Show current data status
  help - Show help information

Use 'help <command>' for more information about a specific command.

$
```

Available commands are:

* **refresh** - Fetch metadata from the Wikimedia Enterprise API about snapshots available for download
* **download** – Download snapshot chunks
* **unpack** – Unpack and extract article page titles and abstracts from the snapshot chunks
* **embed** – Compute embeddings on the page titles and abstracts
* **reduce** – Reduce the dimensionality of the embeddings
* **recursive-cluster** – Run recursive clustering with k-means to build a tree of clusters
* **project** – Project the single-pass vectors into 3-space
* **topics** – Use an LLM model to discover topics for clusters according to their page content
* **status** – Show current data status
* **help** – Show help information

All operations require a `--namespace` argument provided before the command name.
Example: `python -m command --namespace enwiki_namespace_0 <command> [options]`

All the page content, metadata, computed embeddings, and cluster information
are stored in a Sqlite 3 database named after the namespace,
for example `enwiki_namespace_0.db`.

A slightly modified copy of the Wikimedia Enterprise Python SDK is in the `wme_sdk` directory.
Their code has its own license, to be found in the [wme_sdk/LICENSE](wme_sdk/LICENSE) file.

The remainder of the project is licensed by the file in [LICENSE](LICENSE).


## Getting Started

This project is managed with [uv](https://docs.astral.sh/uv/), the awesome Python package manager from Astral.

### Prerequisites

First, install `uv` if you haven't already:

```bash
pip3 install uv
```

### Data Preparation Setup

1. Create a virtual environment for the data preparation application:
```bash
cd dataprep
uv venv
```

2. Fetch the data preparation dependencies:
```bash
uv sync
source .venv/bin/activate
```

3. Run the data preparation CLI interactively:
```bash
python -m command
```

When starting interactive mode, you can provide the namespace via command line,
or you will be prompted to enter it:

**With namespace on command line:**
```bash
$ python -m command --namespace enwiki_namespace_0
Using namespace: enwiki_namespace_0
Type 'help' for available commands or 'quit' to exit.

>
```

**Without namespace (prompted):**
```bash
$ python -m command
Welcome to wp-embeddings command interpreter!
Please enter a namespace (e.g. enwiki_namespace_0): enwiki_namespace_0
Using namespace: enwiki_namespace_0
Type 'help' for available commands or 'quit' to exit.

>
```

### Web Application Setup

1. Create a virtual environment for the web application:
```bash
cd web
uv venv
```

2. Fetch the web application dependencies:
```bash
uv sync
```

3. Run the FastAPI development server:
```bash
cd web/backend
uv run fastapi dev
```

The web application will be available at `http://localhost:8000`

For required and optional parameters to a command, precede them with a double-dash:

```bash
cd dataprep
python -m command --namespace enwiki_namespace_0 refresh
```

### Running Tests

**Data Preparation Tests:**
```bash
cd dataprep
uv run pytest
```

**Web Application Tests:**
```bash
cd web
uv run pytest
```

## Command notes and tips

Most commands that can operate on more than one item accept a `--limit n` parameter
to limit how many operations they perform,
unless the operation can't be done in incremental pieces.
You can use this capability to manage the work done at any given time.

The `download`, `unpack`, and `embed` commands will all try to avoid repeating work that's already been completed, so you can run
them repeatedly with `--limit` to incrementally do the required work over an entire namespace.

The `topics` command also has a `--mode` option to select either `refresh` or `resume`, which
can be used in combination with `--limit` to manage the workload.  This command is typically the most time consuming,
because it invokes the gpt-oss-20b model to discover topics for each tree cluster node.

## Operational Notes

### Data Storage

* Data files are stored in the `data/` directory at the project root
* Downloaded archive files are stored in `data/downloaded/{namespace}` and named like `{chunk_name}.tar.gz`
* Extracted archives are stored in `data/extracted/{namespace}` and are deleted after unpacking and parsing completes (because they are about 2GB each!)
* SQLite databases are stored in `data/` with names like `enwiki_namespace_0.db`

### API Configuration

For accessing the Wikimedia Enterprise API and the LLM API endpoints, the code expects a `.env` file containing valid credentials and configuration.
A sample file can be found in [env-example](env-example).

### Data Processing

* This code assumes that each archive contains exactly one chunk file in ndjson format. If Enterprise changes this, the code must be changed.
* Both download and extract operations will silently overwrite files if the files exist already.
* Make sure you have enough disk space. For reference, the complete English Wikipedia namespace 0 archive (article pages) takes about 133G in .tar.gz form (as measured in October 2025).

## Embeddings

Embeddings are computed with the `jina-embeddings-v4-text-matching-GGUF` embedding model by default.
Model config is provided through environment variables, and the following parameters are needed:

- `EMBEDDING_MODEL_API_URL` – Required: An OpenAI compatible endpoint for model access
- `EMBEDDING_MODEL_API_KEY` - Required: The key for accessing that API
- `EMBEDDING_MODEL_NAME` - Optional: The name of the model in the API. Defaults to `jina-embeddings-v4-text-matching-GGUF` if not provided

The easiest way to configure the embedding model is to add the  environment variables to a `.env` file in the project root:

```bash
EMBEDDING_MODEL_API_URL=https://api.example.com/v1/embeddings
EMBEDDING_MODEL_API_KEY=your_api_key_here
EMBEDDING_MODEL_NAME=jina-embeddings-v4-text-matching-GGUF
```

### Data Processing Applications

**Data Preparation Application (`dataprep/`):**
- Downloads and extracts Wikipedia content
- Computes embeddings using ML models
- Performs clustering and dimensionality reduction
- Discovers topics using LLMs
- Stores results in SQLite databases

**Web Application (`web/`):**
- Provides REST API for accessing processed data
- Offers 3D visualization of cluster trees using BabylonJS
- Supports search and navigation of Wikipedia clusters
- Serves static frontend assets

Both applications share the same data files in the `data/` directory, allowing the data preparation pipeline to generate data that the web application can visualize.

Embeddings are stored in the sqlite3 database after computation. Though `chromadb` is a project dependency, I am not using
ChromaDB to store the embeddings.  ChromaDB's embedding function code is used to call the embedding
and return the vector. I may refactor this dependency out later. It was very convenient!

## Topic discovery

Topic discovery is computed with the `gpt-oss-20b` model by default.
Model config is provided through environment variables, and the following parameters are needed:

- `SUMMARIZING_MODEL_API_URL` – Required: An OpenAI compatible endpoint for model access
- `SUMMARIZING_MODEL_API_KEY` - Required: The key for accessing that API
- `SUMMARIZING_MODEL_NAME` - Optional: The name of the model in the API. Defaults to `gpt-oss-20b` if not provided

## Data structure

The sqlite3 database has the following tables:

* **chunk_log** – Name, download path, and other metadata about chunks of the Wikipedia archive that can be or have been downloaded
* **page_log** – Page ID, title, abstract, and other metadata
* **page_vector** – Embedding and other computed vectors, plus cluster ID assignments for pages.
* **cluster_tree** – Cluster node info from the `recursive-cluster` command

## Visualization

The primary visualization is provided by the web application, which offers:

- **3D Cluster Visualization**: Interactive 3D representation of cluster trees using BabylonJS
- **Namespace Selection**: Choose which Wikipedia namespace to visualize (e.g., enwiki_namespace_0)
- **Hierarchical Navigation**: Explore cluster relationships and page distributions
- **Search Functionality**: Find specific pages or clusters

For development and testing, a 2D visualization can still be generated using:

```bash
cd dataprep
python graph_cluster_tree.py
```

which produces `cluster_tree.html`, which you can load in the browser to view a flexible network diagram of the clusters.

## Development and CI

### Linting and Code Quality

This project uses [ruff](https://github.com/astral-sh/ruff) for linting (also from Astral Labs):

**Data Preparation Application:**
```bash
cd dataprep
uv run ruff check
```

**Web Application:**
```bash
cd web/backend
uv run ruff check
```

Both applications also use [vulture](https://github.com/jendrikseipp/vulture) to help find dead code, though the output must be evaluated by a human:

**Data Preparation Application:**
```bash
cd dataprep
uv run vulture *.py
```

**Web Application:**
```bash
cd web
uv run vulture *.py
```

### Testing

**Data Preparation Tests:**
```bash
cd dataprep
uv run pytest
```

**Web Application Tests:**
```bash
cd web
uv run pytest
```

## Deployment

This project is configured for deployment to [Toolforge](https://wikitech.wikimedia.org/wiki/Help:Toolforge),
the Wikimedia Foundation's hosting platform for tools and bots.

### Deployment Files

The following files at the repository root are used for Toolforge deployment:

| File | Purpose |
|------|---------|
| `Procfile` | Tells Toolforge how to start the web service |
| `package.json` | Triggers frontend build during Toolforge's build phase |
| `requirements.txt` | Python dependencies for the backend (generated from `uv.lock`) |
| `build.sh` | Script to regenerate `requirements.txt` when dependencies change |
| `.githooks/pre-commit` | Git hook that auto-runs `build.sh` when deps change |

### How Toolforge Build Works

```
┌─────────────────────────────────────────────────────────────┐
│  Toolforge Build Time (happens once per deployment)          │
│  ─────────────────────────────────────────────────────────   │
│  1. Detect package.json at root → install Node.js           │
│  2. Detect requirements.txt → install Python deps           │
│  3. Run npm run build → creates web/frontend/dist/          │
│  4. Bake everything into container image                    │
├─────────────────────────────────────────────────────────────┤
│  Runtime (container starts)                                  │
│  ─────────────────────────────────────────────────────────   │
│  5. Procfile runs: cd web/backend && uvicorn app.main:app  │
│  6. FastAPI serves pre-built dist/ files                    │
└─────────────────────────────────────────────────────────────┘
```

**Key point**: The frontend is built during Toolforge's image build, not at container startup. This means:
- Build artifacts are not committed to git
- Frontend stays in sync automatically
- Container restarts are fast

### The Procfile

```procfile
web: cd web/backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

The `web` process type is what Toolforge uses to start your web service. It:
1. Changes to the backend directory
2. Starts uvicorn with the FastAPI app
3. Uses the `$PORT` environment variable (set by Toolforge)

### Root package.json

The root `package.json` is minimal and delegates to the frontend's build:

```json
{
  "name": "wp-embeddings",
  "description": "3D visualization of Wikipedia topic clusters",
  "scripts": {
    "build": "cd web/frontend && npm install && npm run build"
  }
}
```

This allows the Node.js buildpack to detect the project and run the build during image construction.

### The build.sh Script

Since this project uses `uv` for Python dependency management (with `pyproject.toml` and `uv.lock`), but Toolforge's Python buildpack expects a `requirements.txt`, the `build.sh` script bridges this gap:

```bash
#!/bin/bash
# Generates requirements.txt from uv.lock

cd web/backend
uv export --format requirements-txt | \
  grep -E '^[a-z]' | awk '{print $1}' | \
  grep -vE '^(black|flake8|pytest|...)' > ../../requirements.txt
```

**When to run**: Manually before deploying, OR automatically via the pre-commit hook.

### Pre-commit Hook

The `.githooks/pre-commit` file automatically runs `build.sh` when Python dependencies change:

```bash
#!/bin/bash
# Runs when pyproject.toml or uv.lock is being committed
if git diff --cached --name-only | grep -q "web/backend/pyproject.toml\|web/backend/uv.lock"; then
    ./build.sh
    git add requirements.txt
fi
```

#### Setting up the hook

One-time setup per developer (no installation required):

```bash
git config core.hooksPath .githooks
```

This tells Git to look in the `.githooks/` directory (tracked in git) instead of `.git/hooks/` (not tracked).

### Deployment Workflow

```bash
# 1. Make changes to the code
vim web/backend/app/main.py

# 2. If Python dependencies changed, the pre-commit hook auto-runs build.sh
git add web/backend/pyproject.toml
git commit -m "Update fastapi"
# → Hook runs build.sh, stages requirements.txt

# 3. Commit all changes
git add Procfile package.json requirements.txt build.sh web/
git commit -m "Deploy to Toolforge"
git push

# 4. On Toolforge
toolforge build start <your-repo-url>
toolforge webservice buildservice start --mount=none

# 5. Monitor logs
toolforge webservice buildservice logs -f
```

### Files NOT in git

The following are in `.gitignore` and NOT committed:

- `web/frontend/dist/` - Build output, created during Toolforge build
- `web/frontend/node_modules/` - npm dependencies, installed during build
- `web/backend/.venv/` - Python virtual environment

### Testing Locally

You can test the build process locally using the Toolforge builder (requires Docker):

```bash
pack build --builder tools-harbor.wmcloud.org/toolforge/heroku-builder:22 myimage
docker run -e PORT=8000 -p 8000:8000 --rm --entrypoint web myimage
```

Then navigate to `http://127.0.0.1:8000` to verify it works.

### Environment Variables

For production, configure environment variables via Toolforge's envvars service:

```bash
toolforge envvars create EMBEDDING_MODEL_API_KEY
toolforge envvars create SUMMARIZING_MODEL_API_KEY
```