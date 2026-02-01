---
name: rn-self-feedback
description: Use Maestro MCP and Tauri MCP to run React Native flows and capture Inspector state for self-validation. Use when working on RN/Inspector code and you need to verify changes (run app, run Maestro flows, capture screenshots, then evaluate results).
---

# RN Self-Feedback (Maestro + Tauri MCP)

When you change React Native or Inspector code and need to verify behavior, use Maestro MCP and Tauri MCP to run the app, run flows, and capture state—then evaluate the results yourself.

## When to use

- After changing `packages/react-native-inspector` or related RN/Inspector code.
- When the user or context implies "verify this" or "check if it works" for RN.
- When you want to give yourself feedback on whether a change behaves correctly.

## Prerequisites

- **MCP setup**: MCP is configured so the `tauri` and `maestro` servers use the correct `mise` path. If this repo provides it, run `bun run setup-mcp` once per machine.
- **Tauri MCP**: Inspector (Tauri) app running in debug (`bun run dev:inspector:tauri`) so Tauri MCP can connect.
- **Maestro MCP**: Maestro available via mise (`.mise.toml`); Maestro MCP enabled in Cursor.

## Workflow

1. **Run / drive the RN app**
   - Use Maestro MCP to run flows or start the app as needed (e.g. `maestro run ...` or equivalent MCP tools). Check available Maestro MCP tools for run, tap, assert, etc.

2. **Capture Inspector / UI state**
   - Use Tauri MCP to take a screenshot of the Inspector (e.g. "Take a screenshot of my app") or to interact (click, type) if needed.

3. **Evaluate**
   - From the screenshot or flow result, decide: does the change work as intended? Note any failures or UI mismatches and suggest fixes.

## Notes

- MCP tools are provided by the configured `maestro` and `tauri` servers in your MCP configuration. Call them when you need to run or inspect the RN/Inspector stack.
- If Tauri MCP cannot connect, confirm Inspector is running with `bun run dev:inspector:tauri` (debug build).
- If Maestro MCP fails, ensure MCP is configured (e.g. run `bun run setup-mcp` if available) and Maestro is installed via mise.
