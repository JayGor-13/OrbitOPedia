@echo off
setlocal enabledelayedexpansion

echo ========================================
echo OrbitOPedia Validation Script
echo ========================================
echo.

echo [1/3] Frontend Build Test
echo ----------------------------------------
cd /d "C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia"
if exist node_modules (
    echo node_modules found, skipping npm install
) else (
    echo Installing frontend dependencies...
    call npm install
)
echo Running npm run build...
call npm run build
if !errorlevel! neq 0 (
    echo FRONTEND BUILD FAILED
    exit /b 1
)
echo FRONTEND BUILD SUCCESS
echo.

echo [2/3] Backend Dependencies
echo ----------------------------------------
cd /d "C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia\backend"
if exist node_modules (
    echo node_modules found, skipping npm install
) else (
    echo Installing backend dependencies...
    call npm install
)
echo.

echo [3/3] Backend Startup Smoke Test (5 seconds)
echo ----------------------------------------
echo Starting server...
timeout /t 1 /nobreak >nul
start /b "Backend Server" node server.js > backend_startup.log 2>&1
set SERVER_PID=!errorlevel!
timeout /t 5 /nobreak
taskkill /f /im node.exe >nul 2>&1
echo.
echo Startup logs:
type backend_startup.log
del backend_startup.log

echo.
echo ========================================
echo Validation Complete
echo ========================================
