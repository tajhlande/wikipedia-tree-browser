#!/bin/bash
# run-local.sh - Run the full app locally like Toolforge does
# This mirrors the Procfile: web: cd web/backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT

set -e

echo "=== Building frontend ==="
cd web/frontend
npm run build
cd ../..

echo ""
echo "=== Starting FastAPI server ==="
echo "Visit http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""

# Match the Procfile command (using PORT=8000 for local testing)
cd web/backend && .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
