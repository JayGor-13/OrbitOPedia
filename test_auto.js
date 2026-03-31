#!/usr/bin/env node
/**
 * OrbitOPedia E2E Test - Auto Mode
 * 
 * This script automates the E2E testing process:
 * 1. Starts the backend server
 * 2. Tests all API endpoints
 * 3. Queries MongoDB directly
 * 4. Stops the server
 * 
 * Usage:
 *   cd C:\Users\jaygo\Desktop\DESKTOP\Projects\OrbitOPedia
 *   node test_auto.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

// Color codes
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  title: (t) => console.log(`\n${c.bold}${t}${c.reset}`),
  pass: (m) => console.log(`  ${c.green}✓${c.reset} ${m}`),
  fail: (m) => console.log(`  ${c.red}✗${c.reset} ${m}`),
  info: (m) => console.log(`  ${c.cyan}ℹ${c.reset} ${m}`),
  warn: (m) => console.log(`  ${c.yellow}⚠${c.reset} ${m}`),
  sep: () => console.log('  ' + '─'.repeat(56))
};

let serverProcess = null;

// Helper: Make HTTP request
function httpGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('timeout'));
    }, 5000);

    const req = http.get(url, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Start server
async function startServer() {
  return new Promise((resolve, reject) => {
    log.info('Spawning server process...');
    serverProcess = spawn('node', ['backend/server.js'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let started = false;
    const onData = (data) => {
      const msg = data.toString();
      if (!started && (msg.includes('running on port') || msg.includes('listening'))) {
        started = true;
        log.pass('Server process started');
        resolve(true);
      }
    };

    serverProcess.stdout.on('data', onData);
    serverProcess.stderr.on('data', onData);

    serverProcess.on('error', reject);

    setTimeout(() => {
      if (!started) reject(new Error('Server startup timeout'));
    }, 15000);
  });
}

// Stop server
async function stopServer() {
  if (serverProcess) {
    return new Promise((resolve) => {
      log.info('Stopping server...');
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        log.pass('Server stopped');
        resolve();
      }, 2000);
    });
  }
}

// Test endpoints
async function testEndpoints() {
  const endpoints = [
    { path: '/api/health', name: 'Health Check' },
    { path: '/api/rockets', name: 'Rockets List' },
    { path: '/api/satellites', name: 'Satellites List' },
    { path: '/api/satellites/search?q=ISS', name: 'Satellite Search (ISS)' }
  ];

  log.title('API Endpoint Tests');
  log.sep();

  let passCount = 0;
  for (const test of endpoints) {
    try {
      const result = await httpGet(test.path);
      if (result.status === 200) {
        const itemCount = Array.isArray(result.data) 
          ? result.data.length 
          : (result.data?.count ?? result.data?.data?.length ?? 0);
        log.pass(`${test.name} (${result.status}) - ${itemCount} items`);
        passCount++;
      } else {
        log.fail(`${test.name} (HTTP ${result.status})`);
      }
    } catch (err) {
      log.fail(`${test.name} - ${err.message}`);
    }
  }
  return passCount;
}

// Test specific satellite by ID
async function testSatelliteById() {
  log.title('Satellite by NORAD ID Test');
  log.sep();

  try {
    const satList = await httpGet('/api/satellites?limit=1');
    if (satList.data?.length > 0) {
      const noradId = satList.data[0].noradId;
      log.info(`Using NORAD ID: ${noradId}`);

      const result = await httpGet(`/api/satellites/${noradId}`);
      if (result.status === 200 && result.data) {
        log.pass(`Retrieved satellite by NORAD ID ${noradId}`);
        return true;
      } else {
        log.fail(`Failed to retrieve satellite (HTTP ${result.status})`);
        return false;
      }
    } else {
      log.warn('No satellites available for ID test');
      return false;
    }
  } catch (err) {
    log.fail(`Error testing by ID: ${err.message}`);
    return false;
  }
}

// Query MongoDB directly
async function testDatabase() {
  if (!MONGO_URI) {
    log.warn('MONGO_URI not configured, skipping MongoDB tests');
    return { skip: true };
  }

  log.title('MongoDB Direct Query Tests');
  log.sep();

  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    
    log.info('Connecting to MongoDB...');
    await client.connect();
    log.pass('Connected to MongoDB');

    const db = client.db('orbitopedia');

    // Count documents
    const rocketsCount = await db.collection('rockets').countDocuments();
    const satellitesCount = await db.collection('satellites').countDocuments();

    log.info(`Rockets collection: ${rocketsCount} documents`);
    log.info(`Satellites collection: ${satellitesCount} documents`);

    const results = { rocketsCount, satellitesCount };

    // Get sample documents
    if (rocketsCount > 0) {
      const rocketSample = await db.collection('rockets').findOne({});
      if (rocketSample) {
        log.pass('Sample rocket document:');
        console.log(`    Name: ${rocketSample.name}`);
        console.log(`    Agency: ${rocketSample.agency}`);
        console.log(`    Country: ${rocketSample.country}`);
        results.rocketSample = { name: rocketSample.name, agency: rocketSample.agency };
      }
    } else {
      log.warn('No rockets in database');
    }

    if (satellitesCount > 0) {
      const satSample = await db.collection('satellites').findOne({});
      if (satSample) {
        log.pass('Sample satellite document:');
        console.log(`    Name: ${satSample.name}`);
        console.log(`    NORAD ID: ${satSample.noradId}`);
        console.log(`    Country: ${satSample.country}`);
        results.satSample = { name: satSample.name, noradId: satSample.noradId };
      }
    } else {
      log.warn('No satellites in database');
    }

    await client.close();
    log.pass('Disconnected from MongoDB');

    return results;
  } catch (err) {
    log.fail(`MongoDB error: ${err.message}`);
    if (err.message.includes('ECONNREFUSED')) {
      log.info('MongoDB Atlas may be offline or MONGO_URI is incorrect');
    }
    return { error: err.message };
  }
}

// Main test flow
async function runTests() {
  console.log(`\n${c.bold}${'='.repeat(60)}${c.reset}`);
  console.log(`${c.bold}OrbitOPedia E2E Test Suite - MongoDB Integration${c.reset}`);
  console.log(`${c.bold}${'='.repeat(60)}${c.reset}`);

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // 1. Start server
    log.title('Server Startup');
    log.sep();
    await startServer();
    await new Promise(r => setTimeout(r, 2000)); // Wait for server to fully initialize

    // 2. Test endpoints
    const endpointPass = await testEndpoints();
    testsPassed += endpointPass;
    testsFailed += (4 - endpointPass);

    // 3. Test by ID
    const byIdPass = await testSatelliteById();
    testsPassed += (byIdPass ? 1 : 0);
    testsFailed += (byIdPass ? 0 : 1);

    // 4. Test database
    const dbResults = await testDatabase();
    if (!dbResults.skip) {
      if (!dbResults.error) {
        testsPassed += 2;
        if (dbResults.rocketsCount > 0 && dbResults.satellitesCount > 0) {
          testsPassed++;
        } else {
          log.warn('Collections are empty - lazy seed may not have run');
          testsFailed++;
        }
      } else {
        testsFailed += 3;
      }
    }

    // 5. Summary
    console.log(`\n${c.bold}${'='.repeat(60)}${c.reset}`);
    console.log(`${c.bold}Test Summary${c.reset}`);
    console.log(`${c.bold}${'='.repeat(60)}${c.reset}`);
    log.sep();
    if (testsFailed === 0) {
      log.pass(`All tests passed! (${testsPassed} checks)`);
    } else {
      log.info(`${testsPassed} passed, ${testsFailed} failed`);
    }
    console.log(`${c.bold}${'='.repeat(60)}${c.reset}\n`);

  } catch (err) {
    log.fail(`Fatal error: ${err.message}`);
    console.error(err.stack);
  } finally {
    await stopServer();
  }
}

// Run
runTests().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  log.warn('Interrupted by user');
  await stopServer();
  process.exit(0);
});
