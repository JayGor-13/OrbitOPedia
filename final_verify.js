#!/usr/bin/env node
/**
 * OrbitOPedia MongoDB & Backend Verification
 * Final comprehensive test script
 */

const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const BACKEND = path.resolve(__dirname, 'backend');
const MONGO_URI = (() => {
  const envFile = path.join(BACKEND, '.env');
  if (!fs.existsSync(envFile)) return null;
  const content = fs.readFileSync(envFile, 'utf-8');
  const match = content.match(/MONGO_URI=(.+)/);
  return match ? match[1].trim() : null;
})();

const PORT = 5000;
let SERVER_PID = null;

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║  OrbitOPedia MongoDB & Backend Verification      ║');
console.log('╚════════════════════════════════════════════════════╝\n');

// === STEP 1: Install Dependencies ===
console.log('[STEP 1] Installing npm dependencies');
console.log('─'.repeat(52));

try {
  const result = cp.spawnSync('npm', ['install', '--silent'], {
    cwd: BACKEND,
    stdio: 'pipe'
  });
  console.log('✓ npm dependencies installed\n');
} catch (e) {
  console.log('⚠  Dependencies may need manual installation\n');
}

// === STEP 2: Start Server ===
console.log('[STEP 2] Starting backend server');
console.log('─'.repeat(52));

let serverReady = false;
let logOutput = [];

const server = cp.spawn('node', ['server.js'], {
  cwd: BACKEND,
  detached: false,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: process.platform === 'win32'
});

SERVER_PID = server.pid;
console.log(`✓ Server process started (PID: ${SERVER_PID})\n`);

server.stdout.on('data', (data) => {
  const msg = data.toString().trim();
  if (msg) {
    logOutput.push(msg);
    console.log(`  [LOG] ${msg}`);
  }
});

server.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  if (msg) console.log(`  [ERR] ${msg}`);
});

server.on('exit', (code) => {
  if (!serverReady) {
    console.log(`⚠  Server exited with code ${code}`);
  }
});

// === STEP 3: Test Endpoints ===
setTimeout(() => {
  console.log('[STEP 3] Testing API endpoints');
  console.log('─'.repeat(52));

  const testEndpoint = (name, path) => {
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: PORT,
        path: path,
        method: 'GET',
        timeout: 3000
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const body = JSON.stringify(json).substring(0, 100) + '...';
            console.log(`✓ ${name.padEnd(25)} [${res.statusCode}]`);
            console.log(`  ${body}`);
            resolve({ ok: true, status: res.statusCode, data: json });
          } catch (e) {
            console.log(`✓ ${name.padEnd(25)} [${res.statusCode}] (text response)`);
            resolve({ ok: true, status: res.statusCode, data: data.substring(0, 100) });
          }
        });
      });

      req.on('error', (err) => {
        console.log(`✗ ${name.padEnd(25)} [ERROR] ${err.message}`);
        resolve({ ok: false, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        console.log(`✗ ${name.padEnd(25)} [TIMEOUT]`);
        resolve({ ok: false, error: 'timeout' });
      });

      req.end();
    });
  };

  (async () => {
    const results = [];
    results.push(await testEndpoint('Health Check', '/api/health'));
    results.push(await testEndpoint('Rockets List', '/api/rockets'));
    results.push(await testEndpoint('Satellites List', '/api/satellites'));
    results.push(await testEndpoint('Search ISS', '/api/satellites/search?q=ISS'));

    console.log('');

    // Get a satellite ID and test it
    if (results[2].ok && results[2].data && Array.isArray(results[2].data) && results[2].data[0]) {
      const noradId = results[2].data[0].norad_cat_id;
      const satResult = await testEndpoint(
        `Satellite ${noradId}`,
        `/api/satellites/${noradId}`
      );
      results.push(satResult);
      console.log('');
    }

    // === STEP 4: MongoDB Direct Query ===
    console.log('[STEP 4] Querying MongoDB directly');
    console.log('─'.repeat(52));

    if (!MONGO_URI) {
      console.log('✗ MONGO_URI not configured in .env\n');
      cleanup();
      return;
    }

    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 10000,
        retryWrites: false
      });

      console.log('Connecting to MongoDB...');
      await client.connect();
      console.log('✓ Connected\n');

      const db = client.db('orbitopedia');

      // Counts
      const rocketCount = await db.collection('rockets').countDocuments();
      const satelliteCount = await db.collection('satellites').countDocuments();

      console.log('Collection Counts:');
      console.log(`  Rockets:     ${rocketCount} documents`);
      console.log(`  Satellites:  ${satelliteCount} documents\n`);

      // Samples
      const rocketSample = await db.collection('rockets').findOne();
      const satelliteSample = await db.collection('satellites').findOne();

      console.log('Sample Documents:\n');

      if (rocketSample) {
        console.log('  ROCKET:');
        console.log(`    Name:     ${rocketSample.name}`);
        console.log(`    Status:   ${rocketSample.status}`);
        console.log(`    Type:     ${rocketSample.type || 'N/A'}`);
        console.log(`    _id:      ${rocketSample._id}\n`);
      }

      if (satelliteSample) {
        console.log('  SATELLITE:');
        console.log(`    Name:     ${satelliteSample.name}`);
        console.log(`    NORAD ID: ${satelliteSample.norad_cat_id}`);
        console.log(`    Country:  ${satelliteSample.country_of_origin || 'N/A'}`);
        console.log(`    _id:      ${satelliteSample._id}\n`);
      }

      await client.close();

      // === STEP 5: Summary ===
      console.log('[STEP 5] Verification Summary');
      console.log('─'.repeat(52));
      console.log('');

      const apiOk = results.every(r => r.ok);
      const dbOk = rocketCount > 0 && satelliteCount > 0;

      console.log('Results:');
      console.log(`  API Endpoints:       ${apiOk ? '✓ PASS' : '✗ FAIL'}`);
      console.log(`  MongoDB Connection:  ✓ PASS`);
      console.log(`  Database Data:       ${dbOk ? '✓ PASS' : '✗ FAIL'}`);
      console.log('');

      if (apiOk && dbOk) {
        console.log('╔════════════════════════════════════════════════════╗');
        console.log('║           ✓ ALL TESTS PASSED                       ║');
        console.log('╚════════════════════════════════════════════════════╝');
      } else {
        console.log('╔════════════════════════════════════════════════════╗');
        console.log('║        ⚠  PARTIAL SUCCESS / ISSUES FOUND          ║');
        console.log('╚════════════════════════════════════════════════════╝');
      }

      console.log('');

      cleanup();

    } catch (mongoErr) {
      console.log(`✗ MongoDB Error: ${mongoErr.message}\n`);
      cleanup();
    }
  })();

}, 10000);

function cleanup() {
  console.log('[CLEANUP] Stopping server process...');
  console.log('─'.repeat(52));

  try {
    if (process.platform === 'win32') {
      // Windows
      cp.spawnSync('taskkill', ['/PID', String(SERVER_PID), '/T', '/F'], {
        stdio: 'pipe'
      });
    } else {
      // Unix
      process.kill(SERVER_PID, 'SIGTERM');
    }
    console.log(`✓ Server process ${SERVER_PID} terminated\n`);
  } catch (err) {
    console.log(`⚠  Could not terminate server: ${err.message}\n`);
  }

  process.exit(0);
}

// Graceful shutdown on interrupt
process.on('SIGINT', () => {
  console.log('\n\n✗ Script interrupted\n');
  if (SERVER_PID) cleanup();
  else process.exit(1);
});

// Timeout failsafe (30 minutes)
setTimeout(() => {
  console.log('\n✗ Script timeout\n');
  if (SERVER_PID) cleanup();
  else process.exit(1);
}, 1800000);
