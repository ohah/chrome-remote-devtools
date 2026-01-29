# Apply GitHub Copilot review feedback

Review Copilot feedback on a branch/PR and apply the suggested changes. The user will provide the branch or PR link.

## Input

- **Branch/PR link**: User provides the link (e.g. `https://github.com/owner/repo/pull/123` or branch URL). Use it to locate the PR and the Copilot review.

## Steps

1. **Get the review**:
   - If the user pasted the PR link: open or fetch the PR and find the GitHub Copilot review (summary and/or file comments).
   - If the user pasted the review text directly: use that as the source of feedback.
   - If you have GitHub CLI: `gh pr view <number> --repo <owner/repo>` and check the PR conversation for Copilot review, or use the web URL the user gave.

2. **Read the feedback**:
   - Summarize what Copilot suggested (e.g. style, security, logic, tests).
   - Identify which files and lines each comment refers to.

3. **Apply the changes**:
   - Edit the codebase to address each suggestion where it makes sense.
   - Prefer accepting suggestions that improve correctness, security, or maintainability; skip or adapt ones that conflict with project rules or intent.
   - Run format/lint after edits (`bun run format`, `bun run lint` for TS/JS; `cargo fmt`, `cargo clippy` for Rust).

4. **Reply to the user**:
   - List what was changed and what was skipped (and why, if relevant).
   - If the user did not provide a link yet, ask for the branch or PR link so the review can be fetched.

5. **Update PR content** (after applying Copilot review):
   - Add to `branch-summary.md` (or the PR description source) a short section describing what Copilot suggested and what was applied (e.g. "Copilot review: applied AGENTS.MD casing, frontmatter name/model, Redux export alignment").
   - If the branch is already pushed and a PR exists, suggest or run `gh pr edit --body-file branch-summary.md` so the PR description reflects the Copilot review work. Do not commit `branch-summary.md`; it is used only for the PR body.

6. **Resolve review threads** (after applying feedback):
   - For each Copilot comment thread that was addressed, mark the conversation as **resolved** on GitHub so the PR does not show unresolved threads.
   - **Web**: PR → "Files changed" → open each comment → "Resolve conversation".
   - **CLI**: `gh` has no built-in resolve command; use GraphQL: `gh api graphql -f query='mutation { resolveReviewThread(input: { threadId: "PRRT_xxx" }) { thread { isResolved } } }'` with the thread ID from the PR (e.g. from `pull-requests/pr-N/comments.json` or the review comment payload). Run once per unresolved thread.

## Notes

- Always wait for or ask for the branch/PR link (or the review text) before applying feedback.
- Do not commit automatically; let the user review the diff and run `/commit` if they want to commit.
- After applying Copilot review, always update the PR content (branch-summary.md) and optionally refresh the PR body with `gh pr edit --body-file branch-summary.md`.
- After applying feedback, resolve the addressed review threads on GitHub (web "Resolve conversation" or `gh api graphql` with `resolveReviewThread` and the thread ID).
