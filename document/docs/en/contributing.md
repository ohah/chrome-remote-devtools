# Contributing

Thank you for your interest in contributing to Chrome Remote DevTools!

We welcome contributions from the community and appreciate your efforts to help improve this project.

## How to Contribute

There are many ways to contribute:

- **Report bugs**: [Open an issue](https://github.com/ohah/chrome-remote-devtools/issues/new) with a clear description
- **Suggest features**: Start a discussion or open an issue
- **Improve documentation**: Fix typos, add examples, or clarify instructions
- **Submit pull requests**: Fix bugs, add features, or improve existing code

## Development Setup

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

## Code Quality

### Linting

```bash
bun run lint
```

### Formatting

```bash
# Format TypeScript/JavaScript
bun run format

# Format Rust code
bun run format:rust
```

## Commit Message Guidelines

Follow the conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Test changes
- `docs`: Documentation changes
- `chore`: Build/config changes

### Example

```
feat(server): add client connection timeout

- Implement 30-second timeout for client connections
- Add connection state tracking
- Update error handling
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request with a clear description

## Getting Help

- [GitHub Discussions](https://github.com/ohah/chrome-remote-devtools/discussions)
- [GitHub Issues](https://github.com/ohah/chrome-remote-devtools/issues)

