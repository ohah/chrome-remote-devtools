# Installation

## Prerequisites

Before installing Chrome Remote DevTools, ensure you have the following installed:

- [Bun](https://bun.sh) (latest version)
- [Rust](https://www.rust-lang.org/) (stable)
- [mise](https://mise.jdx.dev/) (for tool version management)
- Git

## Installation Steps

### 1. Clone the repository

```bash
git clone https://github.com/ohah/chrome-remote-devtools.git
cd chrome-remote-devtools
```

### 2. Initialize the project

Run the initialization script to set up dependencies and reference repositories:

```bash
# Automatically detects OS and runs appropriate script
bun run init

# Or manually:
# Windows:
scripts\init.bat

# Linux/macOS:
bash scripts/init.sh
```

This will:

- Install Bun dependencies
- Install Rust dependencies
- Clone reference repositories (chii, chobitsu, devtools-remote-debugger, devtools-protocol, rrweb)

### 3. Verify installation

```bash
# Check Bun version
bun --version

# Check Rust version
rustc --version
```

## Next Steps

Once installation is complete, proceed to the [Quick Start Guide](/guide/quick-start) to begin using Chrome Remote DevTools.
