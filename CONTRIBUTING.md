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

### 3. Build the project

```bash
# Build all packages
bun run build
```

## Building DevTools Frontend

The DevTools UI is based on a fork of Chrome DevTools frontend. To build it, you need to have [depot_tools](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up) installed.

### Prerequisites

1. **Install depot_tools**: Follow the [depot_tools setup guide](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up).

2. **Ensure depot_tools is in your PATH**: The `gclient`, `gn`, and `autoninja` commands should be available.

### Build Steps

1. **Navigate to devtools directory**:

   ```bash
   cd devtools
   ```

2. **Sync dependencies**:

   ```bash
   gclient sync
   ```

   This will download all required dependencies for devtools-frontend.

3. **Generate build configuration**:

   ```bash
   cd devtools-frontend
   gn gen out/Default
   ```

4. **Build DevTools**:

   ```bash
   autoninja -C out/Default
   ```

   Alternatively, you can use npm:

   ```bash
   npm run build
   ```

5. **Build artifacts location**:
   The built files will be in `devtools/devtools-frontend/out/Default/gen/front_end`.

### Fast Build Options

For faster iteration during development, you can skip type checking and bundling:

```bash
gn gen out/fast-build --args="devtools_skip_typecheck=true devtools_bundle=false"
autoninja -C out/fast-build
```

Or use npm with the fast-build target:

```bash
npm run build -- -t fast-build
```

### Notes

- The first build may take a while as it downloads dependencies and compiles everything.
- Subsequent builds are incremental and much faster.
- The build uses `Default` as the target by default. You can specify a different target with `-t <name>`.
- For development, you typically don't need to rebuild DevTools unless you're modifying the DevTools frontend code itself.

## Running Development Servers

### Prerequisites

**For unified development environment (`bun run dev`)**: No manual build required. The client package is automatically built in watch mode.

**For individual servers**: Before running the development servers, you must build the client package:

```bash
# Build client package
cd packages/client
bun run build
cd ../..
```

This is required because the server serves the built client script at `/client.js`.

### Unified Development Environment

For a simplified development experience, you can run all services with a single command:

```bash
bun run dev
```

This command automatically:

- Builds the client package in watch mode (auto-rebuilds on file changes)
- Starts the WebSocket server on `http://localhost:8080`
- Starts the Inspector on `http://localhost:1420`
- Starts the example app on `http://localhost:5173` (optional)

All services run in a single terminal with color-coded logs:

- `[CLIENT]` - Client build output (cyan)
- `[SERVER]` - Server logs (green)
- `[INSPECTOR]` - Inspector logs (yellow)
- `[EXAMPLE]` - Example app logs (magenta)

Press `Ctrl+C` to stop all services at once.

**Note**: The client package is automatically built in watch mode, so you don't need to manually rebuild it when making changes to the client code.

#### Configuration Options / 설정 옵션

You can configure the unified development environment using environment variables:

```bash
# Custom ports / 커스텀 포트
PORT=8081 INSPECTOR_PORT=3000 EXAMPLE_PORT=5174 bun run dev

# Exclude example app / 예제 앱 제외
INCLUDE_EXAMPLE=false bun run dev

# Custom health check timeout / 커스텀 헬스 체크 타임아웃
HEALTH_CHECK_TIMEOUT=15000 bun run dev
```

**Environment Variables / 환경 변수**:

- `PORT` - Server port (default: 8080)
- `INSPECTOR_PORT` - Inspector port (default: 1420)
- `EXAMPLE_PORT` - Example app port (default: 5173)
- `INCLUDE_EXAMPLE` - Include example app (default: true, set to `false` to exclude)
- `HEALTH_CHECK_TIMEOUT` - Health check timeout in milliseconds (default: 10000)

The script performs health checks on services to ensure they're ready before reporting success.

### Running Individual Servers

During development, you can run each package individually:

```bash
# Run WebSocket relay server
bun run dev:server

# Run Inspector web version
bun run dev:inspector

# Run Inspector desktop version (Tauri)
bun run dev:inspector:tauri

# Run documentation site
bun run dev:docs
```

### Complete Development Workflow (Multiple Terminals)

If you prefer to run services in separate terminals for better log separation, you can use the individual commands:

**Terminal 1 - WebSocket Server**:

```bash
bun run dev:server
```

- Server runs on `http://localhost:8080`
- Provides WebSocket endpoints: `/remote/debug/client/:id` and `/remote/debug/devtools/:id`
- Serves client script at `/client.js`
- Provides HTTP API at `/json`, `/json/clients`, `/json/inspectors`

**Terminal 2 - Inspector**:

```bash
bun run dev:inspector
```

- Inspector runs on `http://localhost:1420`
- Opens in your browser automatically
- Connects to the WebSocket server at `localhost:8080`

**Terminal 3 - Example App (optional)**:

```bash
cd examples/basic
bun run dev
```

- Example app runs on `http://localhost:5173` (or another port if 5173 is busy)
- Automatically loads the client script from `http://localhost:8080/client.js`
- The client script connects to the WebSocket server automatically

### Testing Your Setup

1. **Open Inspector**: Navigate to `http://localhost:1420` in your browser
2. **Open example app**: Navigate to `http://localhost:5173` (or the port shown in terminal)
3. **Verify connection**:
   - The example app automatically loads the client script
   - Check the Inspector UI - you should see the connected client in the dropdown
   - The DevTools iframe should load and connect to the client

### Ports and Endpoints

| Service          | Port | Endpoints                                                                                                                                                                                                     |
| ---------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WebSocket Server | 8080 | `ws://localhost:8080/remote/debug/client/:id`<br>`ws://localhost:8080/remote/debug/devtools/:id`<br>`http://localhost:8080/json`<br>`http://localhost:8080/json/clients`<br>`http://localhost:8080/client.js` |
| Inspector        | 1420 | `http://localhost:1420`                                                                                                                                                                                       |
| Example App      | 5173 | `http://localhost:5173` (default Vite port)                                                                                                                                                                   |

### Troubleshooting

#### Client script not found

If you see errors about `/client.js` not found:

1. **Build the client package**:

   ```bash
   cd packages/client
   bun run build
   ```

2. **Verify the file exists**:

   ```bash
   ls packages/client/dist/index.js
   ```

3. **Restart the server** after building:
   ```bash
   bun run dev:server
   ```

#### WebSocket connection fails

If the client cannot connect to the server:

1. **Verify server is running**: Check that `bun run dev:server` is running
2. **Check server URL**: Ensure the client script uses the correct server URL
3. **Check browser console**: Look for WebSocket connection errors
4. **Verify CORS**: The server should allow connections from your client origin

### Development Workflow

**Recommended workflow (unified)**:

1. **Start all services**: `bun run dev` (single terminal)
2. **Make changes**: Edit code in any package
3. **Test changes**: Refresh browser and verify functionality
4. **Verify connection**: Check Inspector to see connected clients and CDP messages

**Alternative workflow (separate terminals)**:

1. **Build client**: `cd packages/client && bun run build && cd ../..`
2. **Start server**: `bun run dev:server` (Terminal 1)
3. **Start Inspector**: `bun run dev:inspector` (Terminal 2)
4. **Start example app** (optional): `cd examples/basic && bun run dev` (Terminal 3)
5. **Make changes**: Edit code in any package
6. **Test changes**: Refresh browser and verify functionality
7. **Verify connection**: Check Inspector to see connected clients and CDP messages

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

Integration tests use Playwright to test the entire system end-to-end:

```bash
# Run integration tests
bun run test:e2e:integration

# Run with UI mode (interactive)
bun run test:e2e:integration:ui

# Run in debug mode
bun run test:e2e:integration:debug
```

**How integration tests work**:

1. **Automatic server startup**: The Playwright configuration automatically starts the WebSocket server before tests
2. **Browser automation**: Tests use Playwright to open a browser and load test pages
3. **WebSocket connections**: Tests simulate client and Inspector connections
4. **CDP message verification**: Tests verify that CDP messages are properly relayed

**Prerequisites for integration tests**:

- **Build client package**: The server needs the built client script:

  ```bash
  cd packages/client
  bun run build
  ```

- **Install Playwright browsers** (if not already installed):
  ```bash
  npx playwright install
  ```

**Note**: Integration tests are currently minimal (hello world tests). More comprehensive tests are planned.

### Manual Integration Testing

For manual testing of the entire system:

1. **Build client**: `cd packages/client && bun run build && cd ../..`
2. **Start server**: `bun run dev:server`
3. **Start Inspector**: `bun run dev:inspector`
4. **Load client script in test web page**:
   - Open a web page in your browser
   - Add this script tag to the HTML:
     ```html
     <script src="http://localhost:8080/client.js" data-server-url="http://localhost:8080"></script>
     ```
5. **Verify connection**:
   - Check Inspector at `http://localhost:1420`
   - You should see the connected client in the dropdown
   - The DevTools iframe should load and connect
   - Try executing JavaScript in the Console panel
   - Check Network requests in the Network panel

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

- Write English first, then separate with slash (`/`), then write Korean (for code comments only)
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
