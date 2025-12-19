@echo off
setlocal

echo 🔨 Building Chrome Remote DevTools...
echo.

call :build_package server
call :build_package client
call :build_package inspector

echo.
echo ✅ Build complete!

endlocal
exit /b

:build_package
set pkg=%~1
set pkg_path=packages\%pkg%

if not exist "%pkg_path%" (
  echo   ⚠ %pkg% package not found, skipping...
) else (
  echo   📦 Building %pkg%...
  cd %pkg_path%
  bun run build
  if errorlevel 1 (
    echo   ✗ Failed to build %pkg%
    exit /b 1
  )
  cd ..\..
  echo   ✓ %pkg% built successfully
)
exit /b

