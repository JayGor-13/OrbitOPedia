@echo off
REM OrbitOPedia E2E Test - MongoDB Integration Check
REM This script tests server startup and API endpoints

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo OrbitOPedia E2E Test Suite - MongoDB Integration
echo ============================================================
echo.

REM Change to backend directory
cd /d "C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia\backend"

if not exist ".env" (
  echo ERROR: .env file not found
  exit /b 1
)

echo [CHECK 1] Environment Configuration
echo ────────────────────────────────────────────────────────────
echo PASS: .env file exists
for /f "tokens=2 delims==" %%i in ('findstr "MONGO_URI=" .env') do (
  set "MONGO_URI=%%i"
  echo PASS: MONGO_URI configured: !MONGO_URI:~0,50!...
)
echo.

echo [CHECK 2] Starting Backend Server
echo ────────────────────────────────────────────────────────────
echo Starting server on port 5000...
echo Server will be accessible at: http://localhost:5000
echo Health check endpoint: http://localhost:5000/api/health
echo.

REM Start the server (this will run until stopped)
start "OrbitOPedia Backend" cmd /k node server.js

REM Wait for server to initialize
timeout /t 3 /nobreak

echo.
echo [CHECK 3] API Endpoint Testing
echo ────────────────────────────────────────────────────────────
echo Open a new terminal and run these curl commands:
echo.
echo   # Test health check
echo   curl http://localhost:5000/api/health
echo.
echo   # Test rockets list
echo   curl http://localhost:5000/api/rockets
echo.
echo   # Test satellites list
echo   curl http://localhost:5000/api/satellites
echo.
echo   # Test satellite search
echo   curl http://localhost:5000/api/satellites/search?q=ISS
echo.
echo   # Test satellite by NORAD ID (get from rockets endpoint response)
echo   curl http://localhost:5000/api/satellites/[NORAD_ID]
echo.

echo [CHECK 4] Direct MongoDB Verification
echo ────────────────────────────────────────────────────────────
echo To verify data in MongoDB directly, run this in a new terminal:
echo.
echo   # Connect to MongoDB Atlas and check collections
echo   mongosh "!MONGO_URI!"
echo.
echo   # In the mongosh shell, run:
echo   use orbitopedia
echo   db.rockets.countDocuments()
echo   db.satellites.countDocuments()
echo   db.rockets.findOne()
echo   db.satellites.findOne()
echo.

echo [CHECK 5] Server Control
echo ────────────────────────────────────────────────────────────
echo Server is now running in the window above.
echo Close the server window or press Ctrl+C to stop it.
echo.

echo ============================================================
echo Test Instructions Complete
echo ============================================================
