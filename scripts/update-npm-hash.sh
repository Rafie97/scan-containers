#!/usr/bin/env bash
# Updates the npmDepsHash in nix/package.nix automatically
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PACKAGE_NIX="$PROJECT_ROOT/nix/package.nix"

echo "Prefetching npm deps..."
NEW_HASH=$(nix run nixpkgs#prefetch-npm-deps -- "$PROJECT_ROOT/package-lock.json" 2>/dev/null)

echo "New hash: $NEW_HASH"

# Update the hash in package.nix
sed -i "s|npmDepsHash = \"sha256-[^\"]*\"|npmDepsHash = \"$NEW_HASH\"|" "$PACKAGE_NIX"

echo "Updated $PACKAGE_NIX"
