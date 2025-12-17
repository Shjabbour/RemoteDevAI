@echo off
echo ================================================
echo RemoteDevAI Desktop Agent - Verification Script
echo ================================================
echo.

echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found! Please install Node.js 16+
    pause
    exit /b 1
)
node --version
echo ✅ Node.js is installed
echo.

echo [2/5] Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm not found! Please install npm
    pause
    exit /b 1
)
npm --version
echo ✅ npm is installed
echo.

echo [3/5] Checking dependencies...
if not exist "node_modules" (
    echo ⚠️  Dependencies not installed. Running npm install...
    npm install
    if errorlevel 1 (
        echo ❌ npm install failed!
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencies already installed
)
echo.

echo [4/5] Validating JavaScript files...
node --check src/server.js
if errorlevel 1 (
    echo ❌ server.js has syntax errors!
    pause
    exit /b 1
)
node --check src/claude-relay.js
if errorlevel 1 (
    echo ❌ claude-relay.js has syntax errors!
    pause
    exit /b 1
)
echo ✅ All JavaScript files are valid
echo.

echo [5/5] Checking Claude Code CLI...
where claude >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Claude CLI not found in PATH
    echo.
    echo To install Claude Code CLI:
    echo   npm install -g @anthropic-ai/claude-code
    echo.
    echo Or make sure it's in your PATH
    echo.
    echo ⚠️  The server will start but commands may fail without Claude CLI
    echo.
) else (
    echo ✅ Claude CLI is installed
    claude --version
)
echo.

echo ================================================
echo ✅ Verification Complete!
echo ================================================
echo.
echo You can now start the server with:
echo   npm start
echo.
echo Or double-click:
echo   start.bat
echo.
pause
