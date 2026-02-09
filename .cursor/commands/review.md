# Review a Pull Request (AI review and post summary + inline suggestions)

Fetch the PR for the current branch, have the AI review the code and description, then post **both** a **summary review (body)** and **line-level suggestions (inline comments)** to the PR.

- **Summary review**: Write a review body in English covering: whether the PR purpose and description match the changes, what’s done well, improvement suggestions (bugs, edge cases, performance, tests), and testing notes.
- **Line-level suggestions**: For concrete code changes, add inline comments on the right file/line with a short explanation and, when applicable, a ` ```suggestion ``` ` block so the author can apply it on GitHub.

## gh account for this repo (ohah only)

This repo (ohah/chrome-remote-devtools) uses the **ohah** GitHub account for posting reviews.

- **Before** submitting the review (`gh api .../reviews` or `gh pr comment`): get current user with `gh api user -q .login`. If the result is not `ohah`, run `gh auth switch --hostname github.com --user ohah` and **remember the previous login** (e.g. `PREV_GH_USER=<that value>`).
- **After** submitting the review: if you switched to ohah, restore the previous account with `gh auth switch --hostname github.com --user <PREV_GH_USER>` so the global gh account is unchanged.

## Order of operations

1. **Branch and gh account (this repo / ohah only)**
   - Run from the repo root. The review targets the **current branch**'s PR.
   - Get current gh user: `gh api user -q .login`. If not `ohah`, run `gh auth switch --hostname github.com --user ohah` and store the previous login so you can restore later.

2. **Find the PR for the current branch**
   - If there is no PR, say "There is no PR for the current branch" and stop.

   ```bash
   gh pr view --json number,title,body,url,additions,deletions,changedFiles
   ```

   - If that fails (no PR): `gh pr list --head $(git branch --show-current)` to confirm.

3. **Gather PR details and diff**
   - PR meta and body: `gh pr view`
   - Changed files: `gh pr diff --name-only`
   - Full diff: `gh pr diff`
   - Use this to build context for the review.

4. **Write the AI review (three separate comments)**
   - **Comment 1 – Main review body** (in English): Purpose and description match; what's done well; improvement suggestions (bugs, edge cases, performance, tests); testing notes. Do **not** include maintainability or fallback in this body.
   - **Comment 2 – Maintainability perspective**: Apply `.cursor/agents/sub-agent-review-maintainability.mdc`. Write a separate comment body (e.g. "## Maintainability perspective" + bullet findings). Post it as its own PR comment in step 5-c.
   - **Comment 3 – Unnecessary fallback / scripts perspective**: Apply `.cursor/agents/sub-agent-review-fallback-scripts.mdc`. Write a separate comment body (e.g. "## Unnecessary fallback / scripts perspective" + bullet findings). Post it as its own PR comment in step 5-d.
   - **Line-level suggestions** (attach only to the main review): For each place that needs a change, prepare an inline comment with:
     - **path**: Repo-root-relative path (e.g. `packages/react-native-inspector/src/websocket-client.ts`)
     - **line**: Line number in the **new (right) side** of the diff.
     - **side**: `"RIGHT"`
     - **body**: Short explanation; if the change is a concrete code edit, include a ` ```suggestion ``` ` block so GitHub shows "Commit suggestion".

5. **Submit the review (summary + inlines together when there are inlines)**
   - **5-a. When there is at least one inline suggestion**
     Submit **one** review that includes both the **body** and the **comments** array.
     - **body**: The summary written in step 4 (what’s done well, improvement summary, testing notes).
     - **comments**: One entry per suggestion, e.g.:
       - **path**: Repo-root-relative path
       - **line**: Line number on the **new (right)** side. Verify against the actual file.
       - **side**: `"RIGHT"`
       - **body**: Short description + (if applicable) ` ```suggestion ` … ` ``` ` block.
     - Example payload file (`review-payload.json`):
       ````json
       {
         "commit_id": "<headRefOid>",
         "event": "COMMENT",
         "body": "## AI review\n\n### What’s done well\n- ...\n\n### Improvement suggestions\n- ...\n\n### Testing\n- ...",
         "comments": [
           {
             "path": "packages/react-native-inspector/src/websocket-client.ts",
             "line": 42,
             "side": "RIGHT",
             "body": "Prefer clearing the retry timeout on disconnect.\n\n```suggestion\n  clearTimeout(retryTimeoutId);\n```"
           }
         ]
       }
       ````
     - Commands:
       ```bash
       gh pr view --json headRefOid -q .headRefOid   # use as commit_id
       gh api repos/ohah/chrome-remote-devtools/pulls/$(gh pr view --json number -q .number)/reviews --input review-payload.json
       ```
     - You can delete `review-payload.json` after submitting.

   - **5-b. When there are no inline suggestions**
     Post only the summary as a single comment:

     ```bash
     gh pr comment $(gh pr view --json number -q .number) --body-file review-comment.md
     ```

     (Write the summary from step 4 into `review-comment.md` first. You can delete it after posting.)

   - **5-c. Post Comment 2 – Maintainability perspective**
     After 5-a or 5-b, post the maintainability comment as a **separate** PR comment:

     ```bash
     gh pr comment $(gh pr view --json number -q .number) --body-file maintainability-comment.md
     ```

     (Write the maintainability body from step 4 into `maintainability-comment.md`. You can delete it after posting.)

   - **5-d. Post Comment 3 – Unnecessary fallback / scripts perspective**
     After 5-c, post the fallback/scripts comment as a **separate** PR comment:

     ```bash
     gh pr comment $(gh pr view --json number -q .number) --body-file fallback-comment.md
     ```

     (Write the fallback/scripts body from step 4 into `fallback-comment.md`. You can delete it after posting.)

   - **Rule**: Post **three comments** in total: (1) main review via 5-a (with inlines) or 5-b (no inlines), (2) maintainability via 5-c, (3) fallback/scripts via 5-d.

6. **Restore gh account (this repo / ohah only)**: If you switched to ohah in step 1, run `gh auth switch --hostname github.com --user <PREV_GH_USER>` to restore the original gh account.

## Notes

- Run from the repo root with `gh` authenticated. This repo (ohah/chrome-remote-devtools): use ohah for posting reviews; switch gh before submit and restore after (see "gh account for this repo" and step 1, step 6).
- **Three comments**: The review is posted as three separate PR comments: (1) main review (body + optional inline suggestions), (2) maintainability perspective, (3) unnecessary fallback/scripts perspective.
- If the current branch has no PR, do not post a review; only output the message above.
- **Inline comments**: `line` must be the line number on the **new (right)** side of the diff; `side` is `"RIGHT"`. Wrong line numbers can cause 422; confirm against the actual file.
- **Suggestion blocks**: In the comment body, put the suggested code between ` ```suggestion ` and ` ``` ` so GitHub shows "Commit suggestion".
- Keep the review within GitHub’s comment length limits; use bullets and short paragraphs.
