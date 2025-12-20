@echo off
setlocal enabledelayedexpansion

echo 🚀 Initializing Chrome Remote DevTools...
echo.

REM 1. Update DevTools submodule / DevTools submodule 업데이트
if exist "devtools\devtools-frontend" (
  echo 📦 Updating DevTools frontend submodule...
  git submodule update --init --recursive
  echo ✓ DevTools frontend submodule updated
  echo.
) else (
  echo ⚠ DevTools frontend submodule not found, skipping...
  echo.
)

REM 2. Install Bun dependencies / Bun 의존성 설치
echo 📦 Installing Bun dependencies...
bun install
if errorlevel 1 (
  echo ✗ Failed to install Bun dependencies
  exit /b 1
)
echo ✓ Bun dependencies installed
echo.

REM 3. Install Rust dependencies / Rust 의존성 설치
echo 📦 Installing Rust dependencies...
cargo fetch
if errorlevel 1 (
  echo ✗ Failed to fetch Rust dependencies
  exit /b 1
)
echo ✓ Rust dependencies installed
echo.

REM 4. Setup reference repositories / 레퍼런스 저장소 설정
echo 📚 Setting up reference repositories...

set REFERENCE_DIR=reference
if not exist "%REFERENCE_DIR%" mkdir "%REFERENCE_DIR%"

call :clone_repo chii https://github.com/liriliri/chii.git
call :clone_repo chobitsu https://github.com/liriliri/chobitsu.git
call :clone_repo devtools-remote-debugger https://github.com/Nice-PLQ/devtools-remote-debugger.git
call :clone_repo rrweb https://github.com/rrweb-io/rrweb.git

goto :end_clone

:clone_repo
set name=%~1
set url=%~2
set repo_path=%REFERENCE_DIR%\%name%

if exist "%repo_path%" (
  echo   ✓ %name% already exists, skipping...
) else (
  echo   📦 Cloning %name%...
  git clone --depth 1 "%url%" "%repo_path%"
  if errorlevel 1 (
    echo   ✗ Failed to clone %name%
    exit /b 1
  )
  echo   ✓ %name% cloned successfully
)
exit /b

:end_clone

echo ✅ Reference repositories setup complete!
echo.

echo ✅ Initialization complete!
echo.
echo Next steps:
echo   - Run 'bun run dev:server' to start the WebSocket server
echo   - Run 'bun run dev:inspector' to start the Inspector
echo   - Check reference\ directory for reference implementations

endlocal

