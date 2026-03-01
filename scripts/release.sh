#!/usr/bin/env bash
set -euo pipefail

BUMP="${1:?Usage: scripts/release.sh <patch|minor|major|x.y.z>}"

# Resolve new version
CURRENT=$(node -p "require('./packages/config/package.json').version")
if [[ "$BUMP" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
  NEW_VERSION="$BUMP"
else
  NEW_VERSION=$(npx semver "$CURRENT" -i "$BUMP")
fi

echo "Current: $CURRENT -> New: $NEW_VERSION"

# Pre-flight checks
echo "Running build..."
bun run build

echo "Running tests..."
bun test

# Check working tree is clean
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree is not clean" >&2
  exit 1
fi

# Check we're on main
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "main" ]]; then
  echo "Error: not on main branch (on $BRANCH)" >&2
  exit 1
fi

# Check version doesn't already exist on npm
if npm view "@tooee/config@$NEW_VERSION" version &>/dev/null; then
  echo "Error: version $NEW_VERSION already exists on npm" >&2
  exit 1
fi

# Bump all package versions
for pkg in packages/*/package.json apps/cli/package.json; do
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$pkg', 'utf8'));
    pkg.version = '$NEW_VERSION';
    fs.writeFileSync('$pkg', JSON.stringify(pkg, null, 2) + '\n');
  "
done

# Re-resolve workspace deps
bun install --no-frozen-lockfile

# Commit, tag, push
git add packages/*/package.json apps/cli/package.json
git commit -m "v$NEW_VERSION"
git tag "v$NEW_VERSION"
git push origin main "v$NEW_VERSION"

echo "Pushed v$NEW_VERSION — CI will publish to npm"
