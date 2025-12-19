#!/usr/bin/env bash
set -e

echo "🚀 Initializing Chrome Remote DevTools..."
echo ""

# 1. Update DevTools submodule / DevTools submodule 업데이트
if [ -d "devtools/devtools-frontend" ]; then
  echo "📦 Updating DevTools frontend submodule..."
  git submodule update --init --recursive
  echo "✓ DevTools frontend submodule updated"
  echo ""
else
  echo "⚠ DevTools frontend submodule not found, skipping..."
  echo ""
fi

# 2. Install Bun dependencies / Bun 의존성 설치
echo "📦 Installing Bun dependencies..."
bun install
echo "✓ Bun dependencies installed"
echo ""

# 3. Install Rust dependencies / Rust 의존성 설치
echo "📦 Installing Rust dependencies..."
cargo fetch
echo "✓ Rust dependencies installed"
echo ""

# 4. Setup reference repositories / 레퍼런스 저장소 설정
echo "📚 Setting up reference repositories..."

REFERENCE_DIR="reference"
REFERENCE_REPOS=(
  "chii:https://github.com/liriliri/chii.git"
  "chobitsu:https://github.com/liriliri/chobitsu.git"
  "devtools-remote-debugger:https://github.com/Nice-PLQ/devtools-remote-debugger.git"
  "devtools-protocol:https://github.com/ChromeDevTools/devtools-protocol.git"
  "rrweb:https://github.com/rrweb-io/rrweb.git"
)

mkdir -p "$REFERENCE_DIR"

for repo_info in "${REFERENCE_REPOS[@]}"; do
  IFS=':' read -r name url <<< "$repo_info"
  repo_path="$REFERENCE_DIR/$name"
  
  if [ -d "$repo_path" ]; then
    echo "  ✓ $name already exists, skipping..."
  else
    echo "  📦 Cloning $name..."
    git clone --depth 1 "$url" "$repo_path" || {
      echo "  ✗ Failed to clone $name"
      exit 1
    }
    echo "  ✓ $name cloned successfully"
  fi
done

echo "✅ Reference repositories setup complete!"
echo ""

echo "✅ Initialization complete!"
echo ""
echo "Next steps:"
echo "  - Run 'bun run dev:server' to start the WebSocket server"
echo "  - Run 'bun run dev:inspector' to start the Inspector"
echo "  - Check reference/ directory for reference implementations"

