#!/usr/bin/env bash
# Commits what a refresh step changed under tools/mx-consumidor and site/mx/consumidor and pushes it to the branch the
# run works on. Used by every commit step of the Mexican Consumer refresh workflow.
#
#   bash scripts/mx-consumidor/commit.sh "commit message"
#
# When the push is refused because the branch moved (another run, the daily upkeep task, a merge), this run's files are
# laid on top of the branch as it now stands: the branch is taken as it is and only the files this run changed are
# written over it, whole. Nothing is ever merged line by line, so a data file can never be committed half one version
# and half another (a rebase left conflict markers inside two JSON files on 11-Oct-2026, and the next step committed them).
set -uo pipefail
MSG="${1:?commit message missing}"
REF="${GITHUB_REF_NAME:?GITHUB_REF_NAME missing}"
PATHS=(tools/mx-consumidor site/mx/consumidor)

git config user.name "mx-consumidor-refresh[bot]"
git config user.email "mx-consumidor-refresh@users.noreply.github.com"

stage() { for d in "${PATHS[@]}"; do [ -e "$d" ] && git add -A "$d"; done; }
# a file with conflict markers or an unfinished merge never reaches the branch
clean() {
  if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] || [ -f .git/MERGE_HEAD ]; then echo "::error::an unfinished rebase or merge is in the work tree"; return 1; fi
  if git diff --cached --name-only -z | xargs -0 -r grep -l -E '^(<<<<<<<|>>>>>>>) ' -- 2>/dev/null | grep -q .; then echo "::error::conflict markers in a staged file"; return 1; fi
  return 0
}

stage
if git diff --cached --quiet; then echo "Nothing to commit."; exit 0; fi
clean || exit 1
git commit -q -m "$MSG"

for i in 1 2 3 4; do
  if git push origin "HEAD:${REF}"; then exit 0; fi
  echo "push refused; laying this run's files on top of the branch and retrying ($i)"
  OURS=$(git rev-parse HEAD)
  git fetch -q origin "${REF}" || { sleep $((i * 5)); continue; }
  BASE=$(git merge-base "$OURS" FETCH_HEAD)
  git reset -q --hard FETCH_HEAD
  git diff --name-only --diff-filter=d -z "$BASE" "$OURS" -- "${PATHS[@]}" | xargs -0 -r git checkout -q "$OURS" --
  git diff --name-only --diff-filter=D -z "$BASE" "$OURS" -- "${PATHS[@]}" | xargs -0 -r git rm -q --ignore-unmatch --
  stage
  if git diff --cached --quiet; then echo "The branch already carries this run's files."; exit 0; fi
  clean || exit 1
  git commit -q -m "$MSG"
  sleep $((i * 5))
done
echo "::error::the push was refused four times"
exit 1
