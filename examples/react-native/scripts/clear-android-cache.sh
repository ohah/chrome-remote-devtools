#!/usr/bin/env sh
# Clear Android/Gradle/CMake caches for clean rebuild / 클린 빌드를 위한 Android·Gradle·CMake 캐시 삭제
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$ROOT/android/.gradle"
rm -rf "$ROOT/android/app/build"
rm -rf "$ROOT/android/build"
rm -rf "$ROOT/node_modules/@ohah/chrome-remote-devtools-inspector-react-native/android/.cxx"
echo "Android cache cleared."
