@echo off
REM Install dependencies
echo [1/5] Installing dependencies...
cd /d "C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia\backend"
call npm install 2>&1

REM Start backend server in background
echo [2/5] Starting backend server...
timeout /t 2 /nobreak
start "OrbitOPedia Backend" cmd /k "cd /d C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia\backend && npm start"

REM Wait for server to start
echo [3/5] Waiting for server startup...
timeout /t 5 /nobreak

REM Test endpoints
echo [4/5] Testing endpoints...
echo ====== HEALTH CHECK ======
curl -s http://localhost:5000/api/health | find "status"

echo ====== ROCKETS ======
curl -s http://localhost:5000/api/rockets | find "name" | head -5

echo ====== SATELLITES ======
curl -s http://localhost:5000/api/satellites | find "name" | head -5

echo ====== SEARCH ISS ======
curl -s "http://localhost:5000/api/satellites/search?q=ISS"

echo [5/5] Complete - server running in background
echo Stop with: taskkill /FI "WINDOWTITLE eq OrbitOPedia*" /T
pause
