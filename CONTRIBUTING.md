# Contributing to Chrome Remote DevTools

Thank you for your interest in contributing to Chrome Remote DevTools!

We welcome contributions from the community and appreciate your efforts to help improve this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Help](#getting-help)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Running Development Servers](#running-development-servers)
- [Testing](#testing)
- [Code Quality Checks](#code-quality-checks)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). By participating, you are expected to uphold this code.

## Getting Help

If you have questions about the project or need help getting started, please use our [GitHub Discussions](https://github.com/ohah/chrome-remote-devtools/discussions) page. This is the best place to ask questions, share ideas, and engage with the community.

## How to Contribute

There are many ways to contribute to Chrome Remote DevTools:

- **Report bugs**: If you find a bug, please [open an issue](https://github.com/ohah/chrome-remote-devtools/issues/new) with a clear description and reproduction steps.
- **Suggest features**: Have an idea for a new feature? Start a discussion or open an issue to share your thoughts.
- **Improve documentation**: Help us improve our docs by fixing typos, adding examples, or clarifying instructions.
- **Submit pull requests**: Fix bugs, add features, or improve existing code.

## Development Setup

Chrome Remote DevTools uses [mise](https://mise.jdx.dev/) to manage Rust and Bun versions, ensuring consistent development environments across the team.

### 1. Set up the project

```bash
# Trust mise and install tools
mise trust
mise install
```

### 2. Install dependencies

```bash
# Install Bun workspace dependencies
bun install
```

### 3. Initialize Git Submodules

```bash
# Initialize devtools-frontend submodule
git submodule update --init --recursive
```

### 4. Build the project

```bash
# Build all packages
bun run build
```

## Running Development Servers

During development, you can run each package individually:

```bash
# Run WebSocket relay server
bun run dev:server

# Run Inspector web version
bun run dev:inspector

# Run Inspector desktop version (Tauri)
bun run dev:inspector:desktop

# Run documentation site
bun run dev:docs
```

### Development Workflow

Typical development workflow:

1. **Start server**: Run `bun run dev:server` to start the WebSocket server
2. **Run Inspector**: Run `bun run dev:inspector` to start the web Inspector
3. **Prepare test page**: Load the client script in the web page you want to debug
4. **Verify connection**: Check client connection and CDP message relay in the Inspector

## Testing

### TypeScript/JavaScript Tests

You can run tests for each package:

```bash
# Run all tests
bun test

# Test specific package
bun test packages/server
bun test packages/client
bun test packages/inspector
```

### Rust Tests

Test Tauri backend and Rust code:

```bash
# Run all Rust tests
cargo test --all

# Test specific package
cargo test --package inspector
```

### Integration Tests

Verify the entire system works correctly:

1. Start server: `bun run dev:server`
2. Run Inspector: `bun run dev:inspector`
3. Load client script in test web page
4. Verify connection and CDP message relay in Inspector

## Code Style Guidelines

### Comment Style

All comments should use **both English and Korean** together.

**Format**: `English description / 한글 설명`

**Examples**:
```typescript
// Update connection state / 연결 상태 업데이트
function updateConnection() {
  // ...
}

// Handle WebSocket message / WebSocket 메시지 처리
async function handleMessage(msg: string) {
  // ...
}
```

**Script file examples**:
```bash
# Install dependencies / 의존성 설치
bun install

# Build packages / 패키지 빌드
bun run build
```

**Principles**:
- Write English first, then separate with slash (`/`), then write Korean
- Short comments should be written in one line
- Long explanations can be split into multiple lines if needed
- Comments can be omitted if the code itself is clear

## Code Quality Checks

Before submitting a pull request, ensure your code passes all quality checks. Run these commands locally to catch issues early.

### TypeScript/JavaScript

- **Lint check**:
  ```bash
  bun run lint
  ```

- **Formatting check and apply**:
  ```bash
  # Apply formatting
  bun run format

  # Formatting check only (for CI)
  bun run format:check
  ```

- **Type check**:
  ```bash
  # Type check for each package
  bun run --filter='*' typecheck
  ```

### Rust

- **Clippy (linter)**:
  ```bash
  cargo clippy --all -- --deny warnings
  ```

- **Formatting**:
  ```bash
  # Apply formatting
  bun run format:rust

  # Formatting check only
  bun run format:rust:check
  ```

- **Run tests**:
  ```bash
  cargo test --all
  ```

### Important Notes

- Run all quality checks locally before opening a PR. This speeds up the review process and reduces CI failures.
- CI runs comprehensive validation including build processes and integration tests.
- All checks must pass before your PR can be merged.

## Pull Request Process

1. **Fork repository**: Fork the repository on GitHub.

2. **Make your changes**: Implement your bug fix, feature, or improvement.

3. **Test locally**: Run all code quality checks mentioned above to ensure everything passes.

4. **Commit your changes**: Follow our [commit message guidelines](#commit-message-guidelines).

5. **Push and open a pull request**: Push your branch and open a PR against the `main` branch.

6. **CI approval**: After you open a PR, a maintainer will approve the CI workflow to run automated tests.

7. **CI validation**: The CI workflow will run all quality checks, build processes, and integration tests. All checks must pass before your PR can be merged.

### Important Notes

- Make sure to run all quality checks locally before opening a PR. This speeds up the review process and reduces CI failures.
- The CI runs comprehensive validation including build processes and integration tests that verify the entire system works correctly.
- Address all feedback from maintainers promptly and update your PR as needed.

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This helps us maintain a clear and consistent project history.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Type (Required)

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring (no functional changes)
- `test`: Test additions/modifications
- `docs`: Documentation updates
- `chore`: Build configuration, dependency updates, etc.
- `style`: Code formatting, missing semicolons, etc. (no functional changes)

### Scope (Optional)

- `server`: Server package related
- `client`: Client package related
- `inspector`: Inspector package related
- `devtools`: devtools-frontend related
- `docs`: Documentation related
- `scripts`: Build/initialization scripts related
- `config`: Project configuration files related

### Subject (Required)

- Write concisely within 50 characters
- Use imperative mood (not past tense)
- Do not capitalize the first letter
- Do not end with a period (.)

### Body (Optional)

- Wrap at 72 characters
- Explain what and why you changed
- How you changed it can be omitted as it's visible in the code

### Footer (Optional)

- Breaking changes, Issue numbers, etc.

### Commit Examples

```
feat(server): add WebSocket relay server

- Implement basic WebSocket server for CDP message relay
- Support multiple client connections
- Add connection state management
```

```
fix(client): handle WebSocket reconnection properly

- Fix reconnection logic when connection is lost
- Add exponential backoff for reconnection attempts
```

```
refactor(inspector): reorganize component structure

- Move DevTools integration to separate module
- Extract connection logic to custom hook
```

### Commit Principles

1. **Single purpose**: One commit should have only one purpose
2. **Logical separation**: Unrelated changes should be separated into different commits
3. **Independent meaning**: Each commit should have independent meaning
4. **Easy to revert**: Structure so that specific features can be reverted
5. **Small units**: Commit in as small units as possible (but not too small)

### Commit Order Example

1. Add dependencies
2. Define types
3. Implement features
4. Refactor
5. Add tests
6. Update documentation

Following this order makes the history clear and easy to understand.

---

Thank you for contributing to Chrome Remote DevTools! Your efforts help make this project a better tool.
