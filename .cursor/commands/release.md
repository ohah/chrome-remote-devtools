# Release package to npm

Trigger npm publish by creating a version tag and pushing it. The GitHub Action **Publish to npm** runs on tag push. Also generate release notes (commits since previous tag) and create a GitHub Release.

## What the agent should do

1. **Determine package**: If the user specifies a package (e.g. "rn-inspector", "react-native-inspector", "client", "server"), use it. Otherwise default to **react-native-inspector**. Map to script key: react-native-inspector → `rn-inspector`.
2. **Check version**: Read the package’s `package.json` and confirm `version` is set to the desired release version (e.g. `0.1.0-rc.1`). If the user gave a version (e.g. `/release 0.1.0`), update that package’s `package.json` version and tell the user to commit it before tagging, or run `npm version` in that package and then run the release command.
3. **SSH remote**: Ensure origin is `git@github.com-private:ohah/chrome-remote-devtools.git` so push uses ohah’s key. If not, run `git remote set-url origin git@github.com-private:ohah/chrome-remote-devtools.git`.
4. **gh account**: Before push, run `gh api user -q .login`. If not `ohah`, run `gh auth switch --hostname github.com --user ohah` and remember the previous user to switch back after.
5. **Run release command** (tag and push):
   - **react-native-inspector**: `bun run release:rn-inspector` (or `bun run release`). This reads `packages/react-native-inspector/package.json` version, creates tag `chrome-remote-devtools-rn-inspector-v<version>`, and pushes it. The workflow then publishes `@ohah/chrome-remote-devtools-inspector-react-native` to npm.
   - **client**: Tag format `chrome-remote-devtools-client-v<version>`. Create tag and push: `git tag chrome-remote-devtools-client-v$(node -p "require('./packages/client/package.json').version") && git push origin --tags`.
   - **server**: Tag format `chrome-remote-devtools-server-v<version>`. Create tag and push: `git tag chrome-remote-devtools-server-v$(node -p "require('./packages/server/package.json').version") && git push origin --tags`.
6. **Release notes**: Generate notes from commits since the previous package tag (package path only), grouped by type (Features, Fixes, Documentation, etc.). Run: `bun scripts/release-notes.ts <package-key> <version>` (e.g. `bun scripts/release-notes.ts rn-inspector 0.1.0-rc.1`). This writes `release-notes-<package-key>-<version>.md`. If the file is empty or only “No package-specific commits”, still use it or add a single line like “- Initial release” / “- See git log for changes”.
7. **GitHub Release**: Create a release for the new tag with the notes as body: `gh release create <tag> --notes-file release-notes-<package-key>-<version>.md` (e.g. `gh release create chrome-remote-devtools-rn-inspector-v0.1.0-rc.1 --notes-file release-notes-rn-inspector-0.1.0-rc.1.md`). Use the same tag that was pushed in step 5.
8. **Restore gh account**: If you switched to ohah, run `gh auth switch --hostname github.com --user <previous-login>`.
9. **Confirm**: Tell the user the tag was pushed, the GitHub Release was created with the generated notes, and that the **Publish to npm** workflow will run (and that `NPM_TOKEN` must be set in the repo secrets).

## Notes

- Version in `package.json` must already be committed before running the release command (tag is created from the current repo state).
- Release notes compare with the **previous tag** for the same package (e.g. previous `chrome-remote-devtools-rn-inspector-v*`) and list commits that touch that package directory, grouped by conventional commit type.
- Alternative: run the workflow manually via **Actions → Publish to npm → Run workflow** (workflow_dispatch) with package and version inputs; then no tag is needed.
- This repo uses the **ohah** GitHub account for push (see AGENTS.md).
