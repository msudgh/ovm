#!/bin/bash

# Generate changelog for OVM releases
# Usage: ./scripts/generate-changelog.sh <version_type> <version> [pre_version]

set -e

VERSION_TYPE=$1
VERSION=$2
PRE_VERSION=$3

if [ "$VERSION_TYPE" != "pre-release" ] && [ "$VERSION_TYPE" != "release" ]; then
  echo "Error: version_type must be 'pre-release' or 'release'"
  exit 1
fi

# Get the latest semantic version tag (not pre-release)
LATEST_SEMVER_TAG=$(git tag -l | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -n1 || echo "")

# If no semver tag found, fallback to any tag
if [ -z "$LATEST_SEMVER_TAG" ]; then
  LATEST_SEMVER_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
fi

# Generate changelog from commits since last semantic version
if [ -z "$LATEST_SEMVER_TAG" ]; then
  # No previous tags, get commits from last 30 days
  COMMITS=$(git log --oneline --since="30 days ago" --pretty=format:"- %s (%h)")
  COMPARISON_TEXT="the last 30 days"
else
  # Get commits since last semantic version tag
  COMMITS=$(git log ${LATEST_SEMVER_TAG}..HEAD --oneline --pretty=format:"- %s (%h)")
  COMPARISON_TEXT="v${LATEST_SEMVER_TAG#v}"
fi

# Count commits
COMMIT_COUNT=$(echo "$COMMITS" | wc -l | tr -d ' ')

# Detect if we have breaking changes, features, or fixes from conventional commits
BREAKING_CHANGES=$(echo "$COMMITS" | grep -i "BREAKING CHANGE\|!" | wc -l | tr -d ' ')
FEATURES=$(echo "$COMMITS" | grep -E "^- feat" | wc -l | tr -d ' ')
FIXES=$(echo "$COMMITS" | grep -E "^- fix" | wc -l | tr -d ' ')
CHORES=$(echo "$COMMITS" | grep -E "^- chore" | wc -l | tr -d ' ')

# Determine branch name, fallback to current git branch if GITHUB_REF not set
if [ -n "$GITHUB_REF" ]; then
  BRANCH_NAME="${GITHUB_REF#refs/heads/}"
else
  BRANCH_NAME=$(git branch --show-current)
fi

# Determine title and installation command based on version type
if [ "$VERSION_TYPE" = "pre-release" ]; then
  TITLE="# Pre-Release v${PRE_VERSION}"
  INSTALL_CMD="npm install -g https://github.com/${GITHUB_REPOSITORY}/releases/download/v${PRE_VERSION}/ovm-${PRE_VERSION}.tgz"
  RELEASE_TYPE="pre-release"
else
  TITLE="# Release v${VERSION}"
  INSTALL_CMD="npm install -g ovm@${VERSION}"
  RELEASE_TYPE="release"
fi

# Create changelog
cat > CHANGELOG.md << EOF
${TITLE}

This ${RELEASE_TYPE} contains **${COMMIT_COUNT} commits** since ${COMPARISON_TEXT} built from branch: \`${BRANCH_NAME}\` on \`$(date -u +"%Y-%m-%d %H:%M:%S UTC")\`.

## Change Summary

- **Features**: ${FEATURES}
- **Fixes**: ${FIXES}
- **Chores**: ${CHORES}
- **Breaking**: ${BREAKING_CHANGES}

## Changes Since ${COMPARISON_TEXT}

Commits list include changes that can be used to identify potential points of interest for compatibility testing.

${COMMITS}

## Installation

\`\`\`bash
${INSTALL_CMD}
\`\`\`

## Testing Instructions

Steps to test the ${RELEASE_TYPE}:

1. Install the ${RELEASE_TYPE} using the command above
2. Test your existing workflows and configurations
3. Test new features introduced in this ${RELEASE_TYPE}

## Feedback & Issues

You could report issues by using repository issue tracker: ${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/issues
EOF

echo "Generated changelog with ${COMMIT_COUNT} commits"
