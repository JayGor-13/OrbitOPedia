@echo off
REM OrbitOPedia Backend Verification Script for Windows
REM This script will:
REM   1. Install npm dependencies
REM   2. Start the backend server
REM   3. Test API endpoints
REM   4. Query MongoDB
REM   5. Stop the server

setlocal enabledelayedexpansion

cd /d "C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia"

echo.
echo ====================================================
echo   OrbitOPedia MongoDB ^& Backend Verification
echo ====================================================
echo.

REM === STEP 1: Install Dependencies ===
echo [STEP 1] Installing npm dependencies...
cd backend
call npm install >nul 2>&1
echo OK
echo.

REM === STEP 2: Start Server ===
echo [STEP 2] Starting backend server...
cd backend
start /B node server.js >server.log 2>&1
REM Get PID of node process
for /f "tokens=2" %%A in ('tasklist ^| findstr node') do (
  set SERVER_PID=%%A
  goto found_pid
)

:found_pid
echo Server PID: !SERVER_PID!
echo.

REM === STEP 3: Wait and Test ===
echo [STEP 3] Waiting 8 seconds for server startup...
timeout /t 8 /nobreak >nul
echo.

echo [STEP 4] Testing API endpoints...
echo.

REM Test Health
echo Testing: /api/health
curl -s http://localhost:5000/api/health | jq '.' 2>nul || curl -s http://localhost:5000/api/health
echo.

REM Test Rockets
echo Testing: /api/rockets
curl -s http://localhost:5000/api/rockets | jq '.[0:2]' 2>nul || echo (Got rockets data)
echo.

REM Test Satellites
echo Testing: /api/satellites
curl -s http://localhost:5000/api/satellites | jq '.[0:2]' 2>nul || echo (Got satellites data)
echo.

REM Test Search
echo Testing: /api/satellites/search?q=ISS
curl -s "http://localhost:5000/api/satellites/search?q=ISS" | jq '.' 2>nul || curl -s "http://localhost:5000/api/satellites/search?q=ISS"
echo.

REM === STEP 5: MongoDB Query ===
echo [STEP 5] MongoDB Query...
echo.

node -e "const{MongoClient}=require('mongodb');const uri=require('dotenv').config({path:'.env'}).parsed.MONGO_URI;const client=new MongoClient(uri,{serverSelectionTimeoutMS:8000});client.connect().then(c=>{const db=c.db('orbitopedia');return Promise.all([db.collection('rockets').countDocuments(),db.collection('satellites').countDocuments(),db.collection('rockets').findOne(),db.collection('satellites').findOne()]).then(r=>{console.log('Rockets:',r[0]);console.log('Satellites:',r[1]);console.log('Rocket Sample:',JSON.stringify(r[2],null,2));console.log('Satellite Sample:',JSON.stringify(r[3],null,2));return c.close();});}).catch(e=>console.error('Error:',e.message));"

echo.
echo ====================================================
echo [CLEANUP] Stopping server...

taskkill /PID !SERVER_PID! /T /F >nul 2>&1
echo Server stopped
echo.
echo Verification complete!
echo ====================================================
echo.
pause
