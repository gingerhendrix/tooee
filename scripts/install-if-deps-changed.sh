#!/bin/sh
# Run `bun install` when the dependency files differ between two commits.
#
# Lefthook calls this from the post-checkout, post-merge, and post-rewrite
# hooks with the old and new commits. A stale node_modules makes the
# pre-commit `check` and `lint:check` fail with "Cannot find module" errors.
#
# Usage: scripts/install-if-deps-changed.sh <old-commit> <new-commit>

old=$1
new=$2

# A worktree with no install yet (for example, just after `git worktree add`)
# is left alone. Run `bun install` there yourself.
[ -d node_modules ] || exit 0

git rev-parse --quiet --verify "$old^{commit}" >/dev/null || exit 0
git rev-parse --quiet --verify "$new^{commit}" >/dev/null || exit 0

if git diff --quiet "$old" "$new" -- bun.lock '*package.json'; then
  exit 0
fi

echo "Dependency files changed between ${old} and ${new}. Running bun install."
exec bun install
