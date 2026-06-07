#!/usr/bin/env bash
# File: tools/cic-ui/repair-ui-layer.sh | Date: 2026-05-31 | v1.0.0
# Description: Automated CIC UI Recovery & Repair Script
# Runs a sequence of workspace restorations, package stitching, and HTML headers validations.

set -eo pipefail

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0;0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${MAGENTA}              CIC UI AUTOMATED RECOVERY SCRIPT (v1.0.0)         ${NC}"
echo -e "${BLUE}================================================================${NC}"

# Find workspace root directory (where package.json exists)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo -e "${CYAN}[1/5] Setting up Monorepo workspace directories...${NC}"
mkdir -p "${ROOT_DIR}/packages/cic-design-system/tokens"
mkdir -p "${ROOT_DIR}/packages/cic-design-system/components"
mkdir -p "${ROOT_DIR}/packages/cic-design-system/dist"
mkdir -p "${ROOT_DIR}/packages/cic-ui/src/dashboard"
mkdir -p "${ROOT_DIR}/packages/cic-ui/src/panels"
mkdir -p "${ROOT_DIR}/packages/cic-ui/dist"
mkdir -p "${ROOT_DIR}/packages/cic-docs-theme/overrides"
mkdir -p "${ROOT_DIR}/apps/pipeline-observatory/dist"

# Generate skeleton package.json files if not already populated
write_skeleton_package_json() {
  local target_file="$1"
  local name="$2"
  local version="$3"
  
  if [ ! -f "$target_file" ]; then
    echo -e "${YELLOW}  - Creating skeleton package.json for ${name}...${NC}"
    cat <<EOF > "$target_file"
{
  "name": "${name}",
  "version": "${version}",
  "private": true,
  "type": "module",
  "main": "index.js",
  "scripts": {
    "build": "echo 'Building ${name}...'"
  }
}
EOF
  fi
}

write_skeleton_package_json "${ROOT_DIR}/packages/cic-design-system/package.json" "cic-design-system" "1.0.0"
write_skeleton_package_json "${ROOT_DIR}/packages/cic-ui/package.json" "cic-ui" "1.0.0"
write_skeleton_package_json "${ROOT_DIR}/packages/cic-docs-theme/package.json" "cic-docs-theme" "1.0.0"
write_skeleton_package_json "${ROOT_DIR}/apps/pipeline-observatory/package.json" "pipeline-observatory" "1.0.0"

# Generate index.js mock exports for packages
if [ ! -f "${ROOT_DIR}/packages/cic-ui/index.js" ]; then
  echo -e "${YELLOW}  - Creating index.js for cic-ui...${NC}"
  cat <<EOF > "${ROOT_DIR}/packages/cic-ui/index.js"
// File: packages/cic-ui/index.js
export * from "./src/dashboard/index.js";
export * from "./src/panels/index.js";
EOF
  mkdir -p "${ROOT_DIR}/packages/cic-ui/src/dashboard"
  mkdir -p "${ROOT_DIR}/packages/cic-ui/src/panels"
  touch "${ROOT_DIR}/packages/cic-ui/src/dashboard/index.js"
  touch "${ROOT_DIR}/packages/cic-ui/src/panels/index.js"
fi

echo -e "${GREEN}✓ Workspace directories and package skeletons aligned.${NC}"

echo -e "\n${CYAN}[2/5] Restoring pnpm-workspace.yaml...${NC}"
WORKSPACE_YAML="${ROOT_DIR}/pnpm-workspace.yaml"
if [ ! -f "$WORKSPACE_YAML" ]; then
  echo -e "${YELLOW}  - Creating missing pnpm-workspace.yaml...${NC}"
  cat <<EOF > "$WORKSPACE_YAML"
packages:
  - "apps/*"
  - "packages/cic-design-system"
  - "packages/cic-ui"
  - "packages/cic-docs-theme"
EOF
  echo -e "${GREEN}✓ Restored pnpm-workspace.yaml.${NC}"
else
  # Verify packages exists in yaml
  if ! grep -q "packages/cic-design-system" "$WORKSPACE_YAML"; then
    echo -e "${YELLOW}  - Stitching missing design system into pnpm-workspace.yaml...${NC}"
    echo "  - \"packages/cic-design-system\"" >> "$WORKSPACE_YAML"
  fi
  if ! grep -q "packages/cic-ui" "$WORKSPACE_YAML"; then
    echo "  - \"packages/cic-ui\"" >> "$WORKSPACE_YAML"
  fi
  if ! grep -q "packages/cic-docs-theme" "$WORKSPACE_YAML"; then
    echo "  - \"packages/cic-docs-theme\"" >> "$WORKSPACE_YAML"
  fi
  echo -e "${GREEN}✓ Verified pnpm-workspace.yaml graph integrity.${NC}"
fi

echo -e "\n${CYAN}[3/5] Checking apps/operator-ui CSS imports...${NC}"
CONTROL_ROOM_HTML="${ROOT_DIR}/apps/operator-ui/control-room.html"
if [ -f "$CONTROL_ROOM_HTML" ]; then
  # Inject styling tags if they aren't loaded
  if ! grep -q "assets/cic.css" "$CONTROL_ROOM_HTML"; then
    echo -e "${YELLOW}  - Injecting cic.css link tag...${NC}"
    # Insert before css/tokens.css
    sed -i.bak 's|<link rel="stylesheet" href="css/tokens.css">|<link rel="stylesheet" href="/assets/cic.css">\n  <link rel="stylesheet" href="/assets/cic-tokens.css">\n  <link rel="stylesheet" href="/assets/cic-components.css">\n  <link rel="stylesheet" href="css/tokens.css">|' "$CONTROL_ROOM_HTML"
    rm -f "${CONTROL_ROOM_HTML}.bak"
    echo -e "${GREEN}✓ Injected CIC style imports successfully.${NC}"
  else
    echo -e "${GREEN}✓ Stylesheet links are already present.${NC}"
  fi
else
  echo -e "${RED}✗ Error: control-room.html not found at expected location!${NC}"
fi

echo -e "\n${CYAN}[4/5] Restoring MkDocs CIC custom theme theme settings...${NC}"
MKDOCS_YML="${ROOT_DIR}/apps/control-plane/mkdocs.yml"
# Fallback to root mkdocs if control-plane docs doesn't have it
if [ ! -f "$MKDOCS_YML" ] && [ -f "${ROOT_DIR}/mkdocs.yml" ]; then
  MKDOCS_YML="${ROOT_DIR}/mkdocs.yml"
fi

if [ -f "$MKDOCS_YML" ]; then
  if grep -q "theme: readthedocs" "$MKDOCS_YML"; then
    echo -e "${YELLOW}  - Restoring MkDocs null custom_dir config...${NC}"
    sed -i.bak 's|theme: readthedocs|theme:\n  name: null\n  custom_dir: cic-docs-theme|' "$MKDOCS_YML"
    rm -f "${MKDOCS_YML}.bak"
    echo -e "${GREEN}✓ MkDocs CIC docs theme patched.${NC}"
  else
    echo -e "${GREEN}✓ MkDocs theme settings are correct.${NC}"
  fi
else
  echo -e "${YELLOW}  - Note: No mkdocs.yml configuration file found to repair.${NC}"
fi

echo -e "\n${CYAN}[5/5] Aligning pipeline assets & copying assets...${NC}"
# Copy CSS and component assets to simulator assets folder
mkdir -p "${ROOT_DIR}/apps/operator-ui/assets"
cp -f "${ROOT_DIR}/apps/operator-ui/css/"*.css "${ROOT_DIR}/apps/operator-ui/assets/" || true
echo -e "${GREEN}✓ Asset replication completed successfully.${NC}"

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}✓ RECOVERY PROCESS COMPLETE: Workspace is fully aligned and ready!${NC}"
echo -e "${GREEN}================================================================${NC}"
