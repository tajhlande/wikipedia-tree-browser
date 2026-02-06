#!/bin/bash
# build.sh - Prepare requirements.txt for Toolforge deployment
# This script should be run locally before committing/pushing for deployment
# The frontend build happens automatically via root package.json during Toolforge build

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Preparing requirements.txt for Toolforge ===${NC}"

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo -e "${RED}Error: 'uv' is not installed. Please install it first:${NC}"
    echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Generate requirements.txt from uv.lock
echo -e "${YELLOW}Generating requirements.txt from uv.lock...${NC}"
cd web/backend
uv export --format requirements-txt | grep -E '^[a-z]' | awk '{print $1}' | grep -vE '^(black|flake8|pytest|coverage|ruff|vulture|mccabe|pycodestyle|pyflakes|pytokens|fastar|rignore|rich-toolkit)' > ../../requirements.txt
cd ../..
echo -e "${GREEN}✓ Created requirements.txt with $(wc -l < requirements.txt) production dependencies${NC}"

# Verify required files exist
echo ""
echo -e "${YELLOW}Verifying deployment files...${NC}"

REQUIRED_FILES=(
    "Procfile"
    "package.json"
    "requirements.txt"
    "web/backend/app/main.py"
    "web/frontend/package.json"
)

all_good=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}  ✓ $file${NC}"
    else
        echo -e "${RED}  ✗ $file (missing)${NC}"
        all_good=false
    fi
done

if [ "$all_good" = false ]; then
    echo -e "${RED}Error: Some required files are missing.${NC}"
    exit 1
fi

# Summary
echo ""
echo -e "${GREEN}=== Ready for Toolforge deployment ===${NC}"
echo ""
echo "What happens during Toolforge build:"
echo "  1. Python buildpack installs dependencies from requirements.txt"
echo "  2. Node.js buildpack installs npm dependencies"
echo "  3. npm run build creates web/frontend/dist/ automatically"
echo "  4. Container starts with FastAPI serving the built frontend"
echo ""
echo "Next steps:"
echo "  1. Commit these changes:"
echo "     $ git add Procfile package.json requirements.txt build.sh web/backend/app/main.py"
echo "     $ git commit -m 'Configure for Toolforge deployment'"
echo "     $ git push"
echo ""
echo "  2. On Toolforge:"
echo "     $ toolforge build start <your-repo-url>"
echo "     $ toolforge webservice buildservice start --mount=none"
echo ""
echo "To monitor logs:"
echo "  $ toolforge webservice buildservice logs -f"
echo ""
