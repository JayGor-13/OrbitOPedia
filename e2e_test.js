#!/usr/bin/env node

/**
 * E2E Test Suite for OrbitOPedia Backend + Mongo
 * Tests: Server startup, API endpoints, and DB connectivity
 */

const http = require('http');
const { MongoClient } = require('mongodb');
const path = require('path');

// Load .env
require('dotenv').config({ path: path.resolve(__dirname, 'backend', '.env') });

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess = null;
let mongoClient = null;

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const log = {
  pass: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  fail: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`)
};

// Start server
async function startServer() {
  return new Promise((resolve, reject) => {
    log.info('Starting backend server...');
    
    const { spawn } = require('child_process');
    serverProcess = spawn('node', ['backend/server.js'], {
      cwd: __dirname,
      stdio: 'pipe'
    });

    let output = '';
    let ready = false;

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      output += msg;
      console.log(msg.trim());
      
      if (msg.includes('running on port') || msg.includes('Health check:')) {
        ready = true;
        setTimeout(() => resolve(true), 500); // Give it a moment to fully initialize
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(data.toString());
      output += data.toString();
    });

    serverProcess.on('error', (err) => {
      reject(new Error(`Failed to start server: ${err.message}`));
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!ready) {
        reject(new Error('Server startup timeout (>10s)'));
      }
    }, 10000);
  });
}

// Stop server
async function stopServer() {
  return new Promise((resolve) => {
    log.info('Stopping server...');
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        resolve();
      }, 2000);
    } else {
      resolve();
    }
  });
}

// HTTP request helper
function httpGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const req = http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
            error: 'Failed to parse JSON'
          });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Test API endpoints
async function testEndpoints() {
  const tests = [
    { path: '/api/health', name: 'Health Check' },
    { path: '/api/rockets', name: 'Rockets List' },
    { path: '/api/satellites', name: 'Satellites List' },
    { path: '/api/satellites/search?q=ISS', name: 'Satellite Search (ISS)' }
  ];

  log.info('\n=== ENDPOINT TESTS ===\n');

  for (const test of tests) {
    try {
      const result = await httpGet(test.path);
      if (result.status === 200) {
        log.pass(`${test.name} (${result.status})`);
        if (result.data) {
          const preview = JSON.stringify(result.data).substring(0, 100);
          console.log(`  Response preview: ${preview}...`);
        }
      } else {
        log.fail(`${test.name} (HTTP ${result.status})`);
        if (result.data) console.log(`  Error: ${JSON.stringify(result.data)}`);
      }
    } catch (err) {
      log.fail(`${test.name}: ${err.message}`);
    }
  }
}

// Test specific NORAD ID
async function testSatelliteById() {
  try {
    const satList = await httpGet('/api/satellites?limit=1');
    if (satList.data && satList.data.length > 0) {
      const noradId = satList.data[0].noradId;
      log.info(`\nTesting specific satellite endpoint with NORAD ID: ${noradId}`);
      
      const result = await httpGet(`/api/satellites/${noradId}`);
      if (result.status === 200) {
        log.pass(`Satellite by ID (${result.status})`);
        if (result.data) {
          console.log(`  Data: ${JSON.stringify(result.data).substring(0, 150)}...`);
        }
      } else {
        log.fail(`Satellite by ID (HTTP ${result.status})`);
      }
    }
  } catch (err) {
    log.warn(`Could not test satellite by ID: ${err.message}`);
  }
}

// Connect to MongoDB and query data
async function queryDatabase() {
  if (!MONGO_URI) {
    log.warn('No MONGO_URI configured, skipping DB checks');
    return;
  }

  log.info('\n=== DATABASE CHECKS ===\n');

  try {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    log.pass('Connected to MongoDB');

    const db = mongoClient.db('orbitopedia');

    // Count documents
    const rocketsCount = await db.collection('rockets').countDocuments();
    const satellitesCount = await db.collection('satellites').countDocuments();

    log.info(`\nRockets collection: ${rocketsCount} documents`);
    log.info(`Satellites collection: ${satellitesCount} documents`);

    if (rocketsCount === 0) {
      log.warn('Rockets collection is empty - lazy seed may be pending');
    } else {
      log.pass(`Rockets collection loaded (${rocketsCount} docs)`);
    }

    if (satellitesCount === 0) {
      log.warn('Satellites collection is empty - lazy seed may be pending');
    } else {
      log.pass(`Satellites collection loaded (${satellitesCount} docs)`);
    }

    // Sample rocket
    if (rocketsCount > 0) {
      const rocketSample = await db.collection('rockets').findOne({});
      if (rocketSample) {
        log.info('\nSample rocket document:');
        const safe = {
          _id: rocketSample._id,
          name: rocketSample.name,
          agency: rocketSample.agency,
          country: rocketSample.country,
          status: rocketSample.status
        };
        console.log('  ' + JSON.stringify(safe, null, 2).split('\n').join('\n  '));
      }
    }

    // Sample satellite
    if (satellitesCount > 0) {
      const satSample = await db.collection('satellites').findOne({});
      if (satSample) {
        log.info('\nSample satellite document:');
        const safe = {
          _id: satSample._id,
          name: satSample.name,
          noradId: satSample.noradId,
          country: satSample.country,
          launchDate: satSample.launchDate
        };
        console.log('  ' + JSON.stringify(safe, null, 2).split('\n').join('\n  '));
      }
    }

    await mongoClient.close();
    log.pass('Disconnected from MongoDB');
  } catch (err) {
    log.fail(`Database check failed: ${err.message}`);
    if (err.message.includes('ECONNREFUSED')) {
      log.info('Hint: Is MongoDB Atlas online and MONGO_URI correct?');
    }
  }
}

// Main
async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('OrbitOPedia E2E Test Suite');
  console.log('='.repeat(50) + '\n');

  try {
    await startServer();
    log.pass('Server started successfully\n');

    // Wait for server to be ready
    await new Promise(r => setTimeout(r, 2000));

    // Run tests
    await testEndpoints();
    await testSatelliteById();
    await queryDatabase();

    console.log('\n' + '='.repeat(50));
    log.pass('E2E Test Suite Completed');
    console.log('='.repeat(50) + '\n');

  } catch (err) {
    log.fail(`Test suite failed: ${err.message}`);
    process.exit(1);
  } finally {
    await stopServer();
  }
}

main().catch(err => {
  log.fail(`Unhandled error: ${err.message}`);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  log.warn('\nInterrupted by user');
  await stopServer();
  process.exit(0);
});
