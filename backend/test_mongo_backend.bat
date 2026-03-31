@echo off
setlocal enabledelayedexpansion

REM Change to backend directory
cd /d "C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia\backend"

REM Step 1: Install dependencies
echo [1/5] Installing dependencies...
call npm install >nul 2>&1
echo Completed
echo.

REM Step 2: Start server in background and get PID
echo [2/5] Starting backend server...
start "OrbitOPedia-Backend" /B node server.js

REM Get the PID of the started process - store in temp file
for /f "tokens=2" %%A in ('tasklist ^| find /i "node"') do (
  set SERVER_PID=%%A
  goto :found_pid
)

:found_pid
echo Server PID: !SERVER_PID!
echo.

REM Step 3: Wait for server to startup
echo [3/5] Waiting 6 seconds for server startup...
timeout /t 6 /nobreak > nul
echo.

REM Step 4: Test endpoints
echo [4/5] Testing API endpoints...
echo ====== HEALTH CHECK ======
curl -s http://localhost:5000/api/health
echo.
echo.

echo ====== ROCKETS (first 3) ======
curl -s http://localhost:5000/api/rockets ^| jq '.[0:3]'
echo.
echo.

echo ====== SATELLITES (first 3) ======
curl -s http://localhost:5000/api/satellites ^| jq '.[0:3]'
echo.
echo.

echo ====== SEARCH ISS ======
curl -s "http://localhost:5000/api/satellites/search?q=ISS" ^| jq '.'
echo.
echo.

REM Get first NORAD ID for specific test
echo ====== SPECIFIC SATELLITE (first from list) ======
for /f "tokens=*" %%F in ('curl -s http://localhost:5000/api/satellites ^| jq -r ".[0].norad_cat_id"') do (
  set NORAD_ID=%%F
)
if defined NORAD_ID (
  echo Testing NORAD ID: !NORAD_ID!
  curl -s http://localhost:5000/api/satellites/!NORAD_ID! ^| jq '.'
) else (
  echo Could not determine NORAD ID
)
echo.
echo.

REM Step 5: Query MongoDB
echo [5/5] Querying MongoDB...
echo Connecting to MongoDB and checking collection counts...
node -e "const {MongoClient} = require('mongodb'); const uri = 'mongodb+srv://jgor280505_db_user:cnktgLpVFI3ysqQW@orbitopedia.a8aqhsr.mongodb.net/orbitopedia?retryWrites=true&w=majority&tls=true'; const client = new MongoClient(uri, {serverSelectionTimeoutMS: 8000}); client.connect().then(c => { const db = c.db('orbitopedia'); return Promise.all([db.collection('rockets').countDocuments(), db.collection('satellites').countDocuments(), db.collection('rockets').findOne(), db.collection('satellites').findOne()]).then(results => { console.log('Rockets Count:', results[0]); console.log('Satellites Count:', results[1]); console.log('Rocket Sample:', JSON.stringify(results[2], null, 2)); console.log('Satellite Sample:', JSON.stringify(results[3], null, 2)); return c.close(); }); }).catch(e => console.error('MongoDB Error:', e.message));"
echo.
echo.

REM Step 6: Stop server
echo [6/5] Stopping server...
if defined SERVER_PID (
  taskkill /PID !SERVER_PID! /T /F >nul 2>&1
  echo Server stopped
) else (
  echo Stopping all node processes...
  taskkill /IM node.exe /T /F >nul 2>&1
)
echo.

echo ====== VERIFICATION COMPLETE ======
pause
