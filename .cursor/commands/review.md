# Review a Pull Request (AI review and post summary + inline suggestions)

Fetch the PR for the current branch, have the AI review the code and description, then post **both** a **summary review (body)** and **line-level suggestions (inline comments)** to the PR.

- **Summary review**: Write a review body in English covering: whether the PR purpose and description match the changes, what’s done well, improvement suggestions (bugs, edge cases, performance, tests), and testing notes.
- **Line-level suggestions**: For concrete code changes, add inline comments on the right file/line with a short explanation and, when applicable, a ` ```suggestion ``` ` block so the author can apply it on GitHub.

## Order of operations

1. **Find the PR for the current branch**
   - If there is no PR, say "There is no PR for the current branch" and stop.

   ```bash
   gh pr view --json number,title,body,url,additions,deletions,changedFiles
   ```

   - If that fails (no PR): `gh pr list --head $(git branch --show-current)` to confirm.

2. **Gather PR details and diff**
   - PR meta and body: `gh pr view`
   - Changed files: `gh pr diff --name-only`
   - Full diff: `gh pr diff`
   - Use this to build context for the review.

3. **Write the AI review (summary + line suggestions)**
   - **Summary body** (in English):
     - **Purpose and description**: Do the PR purpose and description match the changes?
     - **What’s done well**: Structure, naming, conventions, consistency.
     - **Improvement suggestions**: Potential bugs, edge cases, performance, tests, and other recommendations.
   - **Line-level suggestions**: For each place that needs a change, prepare an inline comment with:
     - **path**: Repo-root-relative path (e.g. `packages/react-native-inspector/src/websocket-client.ts`)
     - **line**: Line number in the **new (right) side** of the diff.
     - **side**: `"RIGHT"`
     - **body**: Short explanation; if the change is a concrete code edit, include a ` ```suggestion ``` ` block so GitHub shows "Commit suggestion".

4. **Submit the review (summary + inlines together when there are inlines)**
   - **4-a. When there is at least one inline suggestion**
     Submit **one** review that includes both the **body** and the **comments** array.
     - **body**: The summary written in step 3 (what’s done well, improvement summary, testing notes).
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

   - **4-b. When there are no inline suggestions**
     Post only the summary as a single comment:

     ```bash
     gh pr comment $(gh pr view --json number -q .number) --body-file review-comment.md
     ```

     (Write the summary from step 3 into `review-comment.md` first. You can delete it after posting.)

   - **Rule**: If there are line-level suggestions, use 4-a (one review with body + comments). If not, use 4-b (comment only).

## Notes

- Run from the repo root with `gh` authenticated.
- If the current branch has no PR, do not post a review; only output the message above.
- **Inline comments**: `line` must be the line number on the **new (right)** side of the diff; `side` is `"RIGHT"`. Wrong line numbers can cause 422; confirm against the actual file.
- **Suggestion blocks**: In the comment body, put the suggested code between ` ```suggestion ` and ` ``` ` so GitHub shows "Commit suggestion".
- Keep the review within GitHub’s comment length limits; use bullets and short paragraphs.
