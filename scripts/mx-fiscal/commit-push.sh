#!/usr/bin/env bash
# Commits the given paths if they changed and pushes them to the workflow's branch. main receives commits from the
# other pages' refresh jobs at any time: rebase onto the newest remote head and retry, and fail loudly (the owner
# gets GitHub's e-mail) if it never lands.
#
#   bash scripts/mx-fiscal/commit-push.sh "<commit message>" <path>...
#
# The message carries [skip actions], never the other skip marker: Cloudflare Pages treats that one as its own
# skip marker too, so data commits carrying it were never deploying.
set -euo pipefail
msg="$1"; shift
git config user.name "fnam-data-bot"
git config user.email "actions@users.noreply.github.com"
git add -A -- "$@"
if git diff --cached --quiet; then echo "No changes in: $*"; exit 0; fi
git commit -q -m "$msg"
branch="${GITHUB_REF_NAME:-main}"
for i in 1 2 3 4; do
  if git pull --rebase --autostash -q origin "$branch" && git push -q origin "HEAD:$branch"; then echo "Pushed: $msg"; exit 0; fi
  echo "push attempt $i failed; retrying in 20s"; sleep 20
done
echo "::error::changes committed but could not be pushed after 4 attempts"
exit 1
