@echo off
REM MCP Tools Setup Script for Windows

echo =========================================
echo MCP Tools Setup Script (Windows)
echo =========================================
echo.

REM Check Node.js
echo Checking prerequisites...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js ^>= 18.0.0
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION%

REM Check npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION%

REM Check FFmpeg
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] FFmpeg is not installed
    echo FFmpeg is required for video processing features
    echo.
    echo Install FFmpeg:
    echo   choco install ffmpeg
    echo.
    set /p CONTINUE="Continue without FFmpeg? (y/n): "
    if /i not "%CONTINUE%"=="y" exit /b 1
) else (
    for /f "tokens=*" %%i in ('ffmpeg -version ^| findstr /C:"version"') do set FFMPEG_VERSION=%%i
    echo [OK] FFmpeg installed
)

echo.
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed
    exit /b 1
)

echo.
echo Building TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    exit /b 1
)

echo.
echo Creating directories...
if not exist "recordings" mkdir recordings
if not exist "logs" mkdir logs
if not exist "tmp" mkdir tmp

echo.
echo Setting up environment...
if not exist ".env" (
    copy .env.example .env
    echo [OK] Created .env file
    echo Please review and update .env with your settings
) else (
    echo [WARNING] .env already exists
)

echo.
echo Installing Playwright browsers...
call npx playwright install chromium
if %errorlevel% neq 0 (
    echo [WARNING] Playwright installation had issues
)

echo.
echo =========================================
echo Setup Complete!
echo =========================================
echo.
echo Next steps:
echo   1. Review and update .env file
echo   2. Run 'npm start' to start the MCP server
echo   3. Run 'npm run dev' for development mode
echo   4. Check examples\usage.ts for examples
echo.
echo Documentation:
echo   - README.md - Getting started
echo   - docs\API.md - API reference
echo   - docs\QUICKSTART.md - Quick start guide
echo.
echo Happy coding!
pause
