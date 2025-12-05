@echo off
echo ===================================================
echo Supabase Connection Test Helper
echo ===================================================
echo.

rem Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in the PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js is installed.
echo Node version:
node --version
echo.

echo ===================================================
echo Available test scripts:
echo ===================================================
echo 1. Run simple database check (no external packages)
echo 2. Run CommonJS test connection
echo 3. Run original test connection
echo 4. Install required packages
echo 5. Exit
echo.

:menu
set /p choice=Enter your choice (1-5): 

if "%choice%"=="1" (
    echo.
    echo Running simple database check...
    echo.
    node simple-db-check.js
    echo.
    pause
    goto menu
) else if "%choice%"=="2" (
    echo.
    echo Running CommonJS test connection...
    echo.
    node test-connection-cjs.js
    echo.
    pause
    goto menu
) else if "%choice%"=="3" (
    echo.
    echo Running original test connection...
    echo.
    node test-connection.js
    echo.
    pause
    goto menu
) else if "%choice%"=="4" (
    echo.
    echo Installing required packages...
    echo.
    node install-packages.js
    echo.
    pause
    goto menu
) else if "%choice%"=="5" (
    echo Exiting...
    exit /b 0
) else (
    echo Invalid choice. Please enter a number between 1 and 5.
    goto menu
) 