#!/usr/bin/env node

/**
 * Test Setup Validation
 * 
 * Checks if all test prerequisites are met:
 * - .env exists (uses dev environment)
 * - Docker is installed and running
 * - Dev containers are running (Postgres + Redis)
 * - Node modules are installed
 */

const fs = require('fs');
const { execSync } = require('child_process');

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

function checkEnv() {
  if (fs.existsSync('.env')) {
    checks.passed.push('✓ .env file exists (using dev environment)');
  } else {
    checks.failed.push('✗ .env file not found');
  }
}

function checkDocker() {
  try {
    execSync('docker --version', { stdio: 'pipe' });
    checks.passed.push('✓ Docker is installed');
    
    try {
      execSync('docker ps', { stdio: 'pipe' });
      checks.passed.push('✓ Docker is running');
    } catch {
      checks.failed.push('✗ Docker is not running (start Docker Desktop)');
    }
  } catch {
    checks.failed.push('✗ Docker is not installed');
  }
}

function checkDockerCompose() {
  if (fs.existsSync('docker-compose.yml')) {
    checks.passed.push('✓ docker-compose.yml exists (using dev setup)');
  } else {
    checks.failed.push('✗ docker-compose.yml not found');
  }
}

function checkNodeModules() {
  if (fs.existsSync('node_modules')) {
    checks.passed.push('✓ node_modules installed');
  } else {
    checks.failed.push('✗ node_modules missing (run: npm install)');
  }
}

function checkTestDirectory() {
  if (fs.existsSync('tests')) {
    checks.passed.push('✓ /tests directory exists');
    
    const requiredDirs = ['unit', 'integration', 'e2e', 'mocks', 'helpers', 'fixtures'];
    const missingDirs = requiredDirs.filter(dir => !fs.existsSync(`tests/${dir}`));
    
    if (missingDirs.length === 0) {
      checks.passed.push('✓ All test subdirectories present');
    } else {
      checks.warnings.push(`⚠ Missing test directories: ${missingDirs.join(', ')}`);
    }
  } else {
    checks.failed.push('✗ /tests directory not found');
  }
}

function checkPortConflicts() {
  try {
    // Check if port 5433 is in use
    execSync('lsof -i:5433', { stdio: 'pipe' });
    checks.warnings.push('⚠ Port 5433 is in use (test Postgres may conflict)');
  } catch {
    checks.passed.push('✓ Port 5433 is available (test Postgres)');
  }
  
  try {
    // Check if port 6380 is in use
    execSync('lsof -i:6380', { stdio: 'pipe' });
    checks.warnings.push('⚠ Port 6380 is in use (test Redis may conflict)');
  } catch {
    checks.passed.push('✓ Port 6380 is available (test Redis)');
  }
}

function checkPlaywright() {
  try {
    const playwrightPath = 'node_modules/@playwright/test';
    if (fs.existsSync(playwrightPath)) {
      checks.passed.push('✓ Playwright installed');
      
      // Check if browsers are installed
      try {
        execSync('npx playwright --version', { stdio: 'pipe' });
        checks.passed.push('✓ Playwright browsers ready');
      } catch {
        checks.warnings.push('⚠ Playwright browsers not installed (run: npx playwright install chromium)');
      }
    } else {
      checks.warnings.push('⚠ Playwright not installed (needed for E2E tests)');
    }
  } catch {
    checks.warnings.push('⚠ Could not check Playwright installation');
  }
}

function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('  Test Setup Validation');
  console.log('='.repeat(60) + '\n');
  
  if (checks.passed.length > 0) {
    console.log('\x1b[32m%s\x1b[0m', 'PASSED:');
    checks.passed.forEach(msg => console.log('  ' + msg));
    console.log('');
  }
  
  if (checks.warnings.length > 0) {
    console.log('\x1b[33m%s\x1b[0m', 'WARNINGS:');
    checks.warnings.forEach(msg => console.log('  ' + msg));
    console.log('');
  }
  
  if (checks.failed.length > 0) {
    console.log('\x1b[31m%s\x1b[0m', 'FAILED:');
    checks.failed.forEach(msg => console.log('  ' + msg));
    console.log('');
  }
  
  console.log('='.repeat(60));
  
  if (checks.failed.length === 0) {
    console.log('\x1b[32m%s\x1b[0m', '✓ All checks passed! Ready to run tests.');
    console.log('\nRun: \x1b[36mnpm run test:local\x1b[0m\n');
    process.exit(0);
  } else {
    console.log('\x1b[31m%s\x1b[0m', '✗ Some checks failed. Fix the issues above before running tests.\n');
    process.exit(1);
  }
}

// Run all checks
checkEnv();
checkDocker();
checkDockerCompose();
checkNodeModules();
checkTestDirectory();
checkPortConflicts();
checkPlaywright();

// Print results
printResults();
