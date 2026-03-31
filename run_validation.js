#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const projectRoot = 'c:\\Users\\jaygo\\Desktop\\DESKTOP\\Projects\\OrbitOPedia';
process.chdir(projectRoot);

console.log('============================================================');
console.log('1) Running: npm run build');
console.log('============================================================\n');

try {
  const buildOutput = execSync('npm run build', { encoding: 'utf-8', stdio: 'pipe' });
  console.log(buildOutput);
  console.log('\n✓ Build succeeded\n');
} catch (error) {
  console.error('✗ Build failed:\n', error.stdout || error.message);
  console.error(error.stderr || '');
}

console.log('\n============================================================');
console.log('2) Running: node test_auto.js');
console.log('============================================================\n');

try {
  const testOutput = execSync('node test_auto.js', { encoding: 'utf-8', stdio: 'pipe', timeout: 60000 });
  console.log(testOutput);
  console.log('\n✓ Tests completed\n');
} catch (error) {
  if (error.killed || error.signal === 'SIGTERM') {
    console.warn('⚠ Test timeout - backend startup may have failed or test requires external services');
  }
  console.error('✗ Test failed or timed out:\n', error.stdout || error.message);
  if (error.stderr) console.error(error.stderr);
}
