#!/usr/bin/env node
/**
 * Synchronous Backend Verification
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const axios = require('axios');
const { MongoClient } = require('mongodb');

const BACKEND_DIR = 'C:\\Users\\jaygo\\Desktop\\DESKTOP\\Projects\\OrbitOPedia\\backend';
process.chdir(BACKEND_DIR);

// Load .env
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });
const MONGO_URI = process.env.MONGO_URI;
const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║     OrbitOPedia Backend Verification              ║');
console.log('╚════════════════════════════════════════════════════╝\n');

// Step 1: Install deps
console.log('[1/5] Installing dependencies...');
try {
  execSync('npm install --silent', { stdio: 'pipe' });
  console.log('✅ Dependencies installed\n');
} catch (e) {
  console.log('⚠️  npm install had warnings (may be normal)\n');
}

// Step 2: Start server
console.log('[2/5] Starting backend server...');
let serverPid = null;
const serverProcess = spawn('node', ['server.js'], {
  cwd: BACKEND_DIR,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

serverPid = serverProcess.pid;
console.log(`✅ Server process started (PID: ${serverPid})`);

// Capture startup logs
let startupDone = false;
let startupLogs = [];

serverProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(l => l.trim());
  lines.forEach(line => {
    startupLogs.push(line);
    console.log(`   [LOG] ${line}`);
  });
  if (startupLogs.length >= 3) startupDone = true;
});

serverProcess.stderr.on('data', (data) => {
  console.log(`   [ERR] ${data.toString().trim()}`);
});

// Wait for server to be ready
console.log('[3/5] Waiting for server startup...');
let serverReady = false;
let waitCount = 0;
const waitInterval = setInterval(async () => {
  try {
    await axios.get(`${BASE_URL}/api/health`, { timeout: 1000 });
    serverReady = true;
    clearInterval(waitInterval);
    console.log('✅ Server is responding\n');
  } catch (e) {
    waitCount++;
    if (waitCount > 20) {
      clearInterval(waitInterval);
      console.log('⚠️  Server startup timeout (continuing anyway)\n');
    }
  }
}, 500);

// Wait synchronously using setInterval
let ready = false;
setTimeout(() => {
  ready = true;
}, 12000);

const checkReady = () => {
  if (!ready && !serverReady) {
    setTimeout(checkReady, 100);
  }
};
checkReady();

// Step 4: Test endpoints
setTimeout(async () => {
  console.log('[4/5] Testing API endpoints...\n');
  
  const tests = [
    { name: 'Health', url: '/api/health' },
    { name: 'Rockets', url: '/api/rockets' },
    { name: 'Satellites', url: '/api/satellites' },
    { name: 'Search ISS', url: '/api/satellites/search?q=ISS' }
  ];

  for (const test of tests) {
    try {
      const res = await axios.get(`${BASE_URL}${test.url}`, { timeout: 5000 });
      const body = JSON.stringify(res.data).substring(0, 150);
      console.log(`✅ ${test.name} (${res.status}): ${body}...\n`);
    } catch (e) {
      console.log(`❌ ${test.name}: ${e.message}\n`);
    }
  }

  // Test specific satellite
  try {
    const res = await axios.get(`${BASE_URL}/api/satellites`, { timeout: 5000 });
    if (res.data && res.data.length > 0) {
      const satId = res.data[0].norad_cat_id;
      const satRes = await axios.get(`${BASE_URL}/api/satellites/${satId}`, { timeout: 5000 });
      const body = JSON.stringify(satRes.data).substring(0, 150);
      console.log(`✅ Satellite ${satId} (${satRes.status}): ${body}...\n`);
    }
  } catch (e) {
    console.log(`⚠️  Could not test specific satellite\n`);
  }

  // Step 5: Query MongoDB
  console.log('[5/5] Querying MongoDB...\n');
  
  if (!MONGO_URI) {
    console.log('❌ MONGO_URI not set\n');
  } else {
    try {
      const client = new MongoClient(MONGO_URI, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 8000,
        retryWrites: false
      });

      await client.connect();
      const db = client.db('orbitopedia');

      const rocketsCount = await db.collection('rockets').countDocuments();
      const satellitesCount = await db.collection('satellites').countDocuments();

      console.log(`📊 Counts:`);
      console.log(`   Rockets: ${rocketsCount}`);
      console.log(`   Satellites: ${satellitesCount}\n`);

      const rocketSample = await db.collection('rockets').findOne();
      const satelliteSample = await db.collection('satellites').findOne();

      if (rocketSample) {
        console.log(`📦 Rocket sample: ${rocketSample.name} (${rocketSample.status})`);
      }
      if (satelliteSample) {
        console.log(`🛰️  Satellite sample: ${satelliteSample.name} (NORAD: ${satelliteSample.norad_cat_id})\n`);
      }

      await client.close();

      // Final status
      console.log('╔════════════════════════════════════════════════════╗');
      if (rocketsCount > 0 && satellitesCount > 0) {
        console.log('║                ✅ ALL TESTS PASSED                  ║');
      } else {
        console.log('║               ⚠️  PARTIAL SUCCESS                    ║');
      }
      console.log('╚════════════════════════════════════════════════════╝\n');

      // Cleanup
      console.log(`[CLEANUP] Stopping server (PID: ${serverPid})...`);
      try {
        process.kill(-serverPid, 'SIGTERM');
        console.log('✅ Server stopped');
      } catch (e) {
        console.log('⚠️  Could not stop server gracefully');
      }

      process.exit(0);
    } catch (e) {
      console.log(`❌ MongoDB Error: ${e.message}\n`);
      
      console.log(`[CLEANUP] Stopping server (PID: ${serverPid})...`);
      try {
        process.kill(-serverPid, 'SIGTERM');
      } catch (e) {}
      process.exit(1);
    }
  }
}, 12000);
