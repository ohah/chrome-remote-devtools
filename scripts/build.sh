#!/usr/bin/env bash
set -e

echo "🔨 Building Chrome Remote DevTools..."
echo ""

PACKAGES=("server" "client" "inspector")

for pkg in "${PACKAGES[@]}"; do
  pkg_path="packages/$pkg"
  
  if [ ! -d "$pkg_path" ]; then
    echo "  ⚠ $pkg package not found, skipping..."
    continue
  fi
  
  echo "  📦 Building $pkg..."
  cd "$pkg_path"
  bun run build || {
    echo "  ✗ Failed to build $pkg"
    exit 1
  }
  cd ../..
  echo "  ✓ $pkg built successfully"
done

echo ""
echo "✅ Build complete!"

