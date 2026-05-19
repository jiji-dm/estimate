#!/usr/bin/env bash
# Claude worktree のブランチを main にマージして GitHub へ push し、worktree とブランチを後片付けする。
#
# usage:
#   scripts/merge-claude.sh <worktree-name>
#   例) scripts/merge-claude.sh pensive-margulis-0ec21d

set -euo pipefail

NAME="${1:?worktree名を指定してください (例: pensive-margulis-0ec21d)}"
BRANCH="claude/$NAME"
WT=".claude/worktrees/$NAME"
REPO_ROOT="/Users/nh/estimate"

cd "$REPO_ROOT"

if [ ! -d "$WT" ]; then
  echo "ERROR: worktree '$WT' が見つかりません" >&2
  exit 1
fi

if ! git -C "$WT" diff --quiet || ! git -C "$WT" diff --cached --quiet; then
  echo "ERROR: $WT に未コミットの変更があります。先にコミットしてください。" >&2
  exit 1
fi

if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "ERROR: ブランチ '$BRANCH' が見つかりません" >&2
  exit 1
fi

echo "→ main を最新化"
git checkout main
git pull origin main

echo "→ $BRANCH を main にマージ"
git merge --no-ff "$BRANCH" -m "Merge $BRANCH into main"

echo "→ GitHub へ push"
git push origin main

echo "→ worktree とブランチを削除"
git worktree remove "$WT"
git branch -d "$BRANCH"
git push origin --delete "$BRANCH" 2>/dev/null || true

echo "✓ $BRANCH を main へ反映して後片付けまで完了しました"
