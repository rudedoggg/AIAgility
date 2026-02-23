#!/usr/bin/env bash
# sync-governance.sh — Syncs governance files from origin/main and updates global IDE files
# Usage: bash script/sync-governance.sh [--skip-fetch]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKIP_FETCH=false

for arg in "$@"; do
  case "$arg" in
    --skip-fetch) SKIP_FETCH=true ;;
  esac
done

# --- Colors (if terminal supports them) ---
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  RED='\033[0;31m'
  NC='\033[0m'
else
  GREEN=''
  YELLOW=''
  RED=''
  NC=''
fi

info()  { printf "${GREEN}[sync]${NC} %s\n" "$1"; }
warn()  { printf "${YELLOW}[sync]${NC} %s\n" "$1"; }
error() { printf "${RED}[sync]${NC} %s\n" "$1"; }

# --- Step 1: Fetch latest from origin ---
if [ "$SKIP_FETCH" = false ]; then
  info "Fetching latest from origin..."
  if ! git -C "$REPO_ROOT" fetch origin 2>/dev/null; then
    warn "Could not fetch from origin (offline?). Continuing with local state."
  fi
fi

# --- Step 2: Sync repo governance files from origin/main ---
# List of governance files tracked in the repo
GOVERNANCE_FILES=(
  "CONSTITUTION.md"
  "CLAUDE.md"
  "GEMINI.md"
  ".cursorrules"
  "replit.md"
)

# Check if origin/main ref exists
if git -C "$REPO_ROOT" rev-parse --verify origin/main >/dev/null 2>&1; then
  for file in "${GOVERNANCE_FILES[@]}"; do
    filepath="$REPO_ROOT/$file"

    # Check if the file exists in origin/main
    if ! git -C "$REPO_ROOT" cat-file -e "origin/main:$file" 2>/dev/null; then
      continue
    fi

    # Check for local uncommitted changes to this file
    if git -C "$REPO_ROOT" diff --name-only HEAD -- "$file" 2>/dev/null | grep -q "^$file$" || \
       git -C "$REPO_ROOT" diff --name-only --cached -- "$file" 2>/dev/null | grep -q "^$file$"; then
      warn "Skipping $file — has local uncommitted changes"
      continue
    fi

    # Compare local file to origin/main version
    LOCAL_HASH=$(git -C "$REPO_ROOT" hash-object "$filepath" 2>/dev/null || echo "missing")
    REMOTE_HASH=$(git -C "$REPO_ROOT" rev-parse "origin/main:$file" 2>/dev/null || echo "missing")

    if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
      git -C "$REPO_ROOT" show "origin/main:$file" > "$filepath"
      info "Updated $file from origin/main"
    fi
  done
else
  warn "origin/main not found. Skipping repo file sync."
fi

# --- Step 3: Sync global IDE files from governance/global-template.md ---
TEMPLATE="$REPO_ROOT/governance/global-template.md"

if [ ! -f "$TEMPLATE" ]; then
  warn "governance/global-template.md not found. Skipping global IDE file sync."
  exit 0
fi

TEMPLATE_CONTENT=$(cat "$TEMPLATE")

# IDE config: target_path and placeholder replacement value
declare -A IDE_TARGETS
IDE_TARGETS["$HOME/.claude/CLAUDE.md"]="CLAUDE.md"
IDE_TARGETS["$HOME/.codex/AGENTS.md"]="AGENTS.md"
IDE_TARGETS["$HOME/.gemini/GEMINI.md"]="GEMINI.md"

for target_path in "${!IDE_TARGETS[@]}"; do
  ide_file="${IDE_TARGETS[$target_path]}"
  target_dir="$(dirname "$target_path")"

  # Create directory if it doesn't exist
  mkdir -p "$target_dir"

  # Generate content with placeholder replaced
  generated_content="${TEMPLATE_CONTENT//\{\{IDE_FILE\}\}/$ide_file}"

  # Check if file already matches
  if [ -f "$target_path" ]; then
    existing_content=$(cat "$target_path")
    if [ "$existing_content" = "$generated_content" ]; then
      continue
    fi
  fi

  printf '%s\n' "$generated_content" > "$target_path"
  info "Updated $target_path"
done

info "Governance sync complete."
