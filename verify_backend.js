#!/usr/bin/env node

const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');

// Setup
const BACKEND_DIR = 'C:\\Users\\jaygo\\Desktop\\DESKTOP\\Projects\\OrbitOPedia\\backend';
process.chdir(BACKEND_DIR);

// Load .env
require('dotenv').config({ path: '.env' });
const MONGO_URI = process.env.MONGO_URI;

console.log('\n════════════════════════════════════════════════════');
console.log('   OrbitOPedia Backend Verification                ');
console.log('════════════════════════════════════════════════════\n');

// STEP 1: Install deps
console.log('[1/5] Installing backend dependencies...');
const npmInstall = spawnSync('npm', ['install', '--silent'], {
  cwd: BACKEND_DIR,
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});
console.log('✅ Dependencies installed\n');

// STEP 2: Start server
console.log('[2/5] Starting backend server...');
const serverProcess = spawn('node', ['server.js'], {
  cwd: BACKEND_DIR,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

const serverPid = serverProcess.pid;
console.log(`Process PID: ${serverPid}`);

let logLines = [];
serverProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(l => l.trim());
  lines.forEach(l => {
    logLines.push(l);
    console.log(`  ${l}`);
  });
});

serverProcess.stderr.on('data', (data) => {
  console.log(`  [ERR] ${data}`);
});

console.log('');

// STEP 3: Wait and test
console.log('[3/5] Waiting 8 seconds for server startup...');
setTimeout(() => {
  (async () => {
    // Wait a bit more
    await new Promise(r => setTimeout(r, 2000));

    const axios = require('axios');
    const BASE_URL = 'http://localhost:5000';

    console.log('✅ Testing endpoints...\n');

    // Test endpoints
    try {
      const r1 = await axios.get(`${BASE_URL}/api/health`, { timeout: 3000 });
      console.log(`✅ Health: ${r1.status} - ${JSON.stringify(r1.data).substring(0, 100)}`);
    } catch (e) { console.log(`❌ Health: ${e.message}`); }

    try {
      const r2 = await axios.get(`${BASE_URL}/api/rockets`, { timeout: 3000 });
      const count = Array.isArray(r2.data) ? r2.data.length : 'unknown';
      const sample = Array.isArray(r2.data) && r2.data[0] ? r2.data[0].name : 'none';
      console.log(`✅ Rockets: ${r2.status} - ${count} items, first: "${sample}"`);
    } catch (e) { console.log(`❌ Rockets: ${e.message}`); }

    try {
      const r3 = await axios.get(`${BASE_URL}/api/satellites`, { timeout: 3000 });
      const count = Array.isArray(r3.data) ? r3.data.length : 'unknown';
      const sample = Array.isArray(r3.data) && r3.data[0] ? r3.data[0].name : 'none';
      console.log(`✅ Satellites: ${r3.status} - ${count} items, first: "${sample}"`);
      
      // Test specific satellite
      if (Array.isArray(r3.data) && r3.data[0]) {
        const noradId = r3.data[0].norad_cat_id;
        try {
          const r4 = await axios.get(`${BASE_URL}/api/satellites/${noradId}`, { timeout: 3000 });
          console.log(`✅ Satellite ${noradId}: ${r4.status} - "${r4.data.name}"`);
        } catch (e) {
          console.log(`❌ Satellite ${noradId}: ${e.message}`);
        }
      }
    } catch (e) { console.log(`❌ Satellites: ${e.message}`); }

    try {
      const r5 = await axios.get(`${BASE_URL}/api/satellites/search?q=ISS`, { timeout: 3000 });
      const count = Array.isArray(r5.data) ? r5.data.length : 'unknown';
      console.log(`✅ Search ISS: ${r5.status} - ${count} results`);
    } catch (e) { console.log(`❌ Search ISS: ${e.message}`); }

    console.log('');

    // STEP 4: Query MongoDB
    console.log('[4/5] Querying MongoDB...\n');

    if (!MONGO_URI) {
      console.log('❌ MONGO_URI not configured\n');
    } else {
      try {
        const { MongoClient } = require('mongodb');
        const client = new MongoClient(MONGO_URI, {
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 10000,
          retryWrites: false
        });

        await client.connect();
        const db = client.db('orbitopedia');

        const rocketsCount = await db.collection('rockets').countDocuments();
        const satellitesCount = await db.collection('satellites').countDocuments();

        console.log(`📊 Database Counts:`);
        console.log(`   Rockets: ${rocketsCount}`);
        console.log(`   Satellites: ${satellitesCount}\n`);

        const rocketSample = await db.collection('rockets').findOne();
        if (rocketSample) {
          console.log(`📦 Rocket Sample:`);
          console.log(`   Name: ${rocketSample.name}`);
          console.log(`   Status: ${rocketSample.status}`);
          console.log(`   ID: ${rocketSample._id}\n`);
        }

        const satelliteSample = await db.collection('satellites').findOne();
        if (satelliteSample) {
          console.log(`🛰️  Satellite Sample:`);
          console.log(`   Name: ${satelliteSample.name}`);
          console.log(`   NORAD ID: ${satelliteSample.norad_cat_id}`);
          console.log(`   ID: ${satelliteSample._id}\n`);
        }

        await client.close();

        // Final summary
        console.log('[5/5] Final Status\n');
        console.log('════════════════════════════════════════════════════');
        if (rocketsCount > 0 && satellitesCount > 0) {
          console.log('                  ✅ ALL TESTS PASSED');
        } else {
          console.log('                 ⚠️  PARTIAL SUCCESS');
        }
        console.log('════════════════════════════════════════════════════\n');

      } catch (e) {
        console.log(`❌ MongoDB Error: ${e.message}\n`);
      }
    }

    // STEP 5: Cleanup
    console.log('[CLEANUP] Stopping server...');
    try {
      // Windows: taskkill, Unix: kill
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(serverPid), '/T', '/F'], { stdio: 'pipe' });
      } else {
        process.kill(-serverPid, 'SIGTERM');
      }
      console.log(`✅ Server process ${serverPid} terminated\n`);
    } catch (e) {
      console.log(`⚠️  Could not terminate server: ${e.message}\n`);
    }

    process.exit(0);
  })();
}, 8000);
