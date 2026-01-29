# Create a Pull Request

Open a PR for the current branch. Follow these steps.

## Steps

1. **Push the branch** (if not already pushed):

   ```bash
   git push -u origin $(git branch --show-current)
   ```

   If the branch exists on origin, use:

   ```bash
   git push
   ```

2. **Create or update the PR** using GitHub CLI:
   - **If the branch is not yet on origin**, or no PR exists for this branch → **create**:

   ```bash
   gh pr create --fill
   ```

   To use a custom body from `branch-summary.md`:

   ```bash
   gh pr create --title "refactor/jsi-to-javascript" --body-file branch-summary.md
   ```

   - **If the branch is already pushed and a PR exists** → **edit** (update title/body):

   ```bash
   gh pr edit --title "chore(config): add cursor sub-agent rules" --body-file branch-summary.md
   ```

   Or paste the contents of `branch-summary.md` when prompted.

3. **If `gh` is not installed**: Install [GitHub CLI](https://cli.github.com/), or open the PR manually:
   - Go to the repo on GitHub → "Compare & pull request" for the current branch, or "New pull request" and choose the branch.
   - Use `branch-summary.md` (Summary, What changed, Why) as the PR description.

## Notes

- **Language**: Write the PR **title** and **body** in **English**.
- Ensure commits follow project rules and `branch-summary.md` is up to date before creating the PR.
- Do not commit `branch-summary.md`; use it only as the PR description source.
