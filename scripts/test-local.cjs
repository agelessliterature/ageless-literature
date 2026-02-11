#!/usr/bin/env node

/**
 * Local Test Orchestration Script
 * 
 * This script handles the complete test lifecycle:
 * 1. Check if dev containers are running (Postgres + Redis)
 * 2. Run tests (unit + integration + e2e)
 * 3. Generate coverage report
 * 
 * Tests use the dev database with transactions that rollback automatically,
 * so no data persists after tests complete.
 * 
 * Usage:
 *   npm run test:local           # Run tests using dev containers & database
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, colors.cyan + colors.bright);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function exec(command, options = {}) {
  try {
    execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return true;
  } catch (error) {
    if (!options.ignoreError) {
      logError(`Command failed: ${command}`);
      if (options.silent && error.stdout) {
        console.log(error.stdout.toString());
      }
      if (options.silent && error.stderr) {
        console.error(error.stderr.toString());
      }
    }
    return false;
  }
}

function startDockerServices() {
  logStep('1/4', 'Checking dev containers...');
  
  // Check if Postgres is running
  try {
    const result = execSync('docker ps --filter "name=ageless-lit-postgres" --format "{{.Names}}"', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (!result.trim().includes('ageless-lit-postgres')) {
      logError('Dev Postgres container is not running');
      logError('Start it with: docker-compose up -d postgres redis');
      return false;
    }
    
    logSuccess('Dev Postgres container is running');
  } catch (error) {
    logError('Failed to check Docker containers');
    return false;
  }
  
  // Check if Redis is running
  try {
    const result = execSync('docker ps --filter "name=ageless-lit-redis" --format "{{.Names}}"', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (!result.trim().includes('ageless-lit-redis')) {
      logWarning('Dev Redis container is not running (optional for most tests)');
    } else {
      logSuccess('Dev Redis container is running');
    }
  } catch (error) {
    logWarning('Could not check Redis container');
  }
  
  return true;
}

function waitForServices() {
  logStep('2/4', 'Verifying database connection...');
  
  // Check Postgres health
  log('  Checking Postgres connection...', colors.blue);
  try {
    const result = execSync(
      'docker exec ageless-lit-postgres pg_isready -U postgres',
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    if (!result.includes('accepting connections')) {
      logError('Postgres is not ready');
      return false;
    }
    logSuccess('  Database is ready (tests use transactions for cleanup)');
  } catch (error) {
    logError('  Failed to connect to Postgres');
    return false;
  }
  
  return true;
}

function runTests() {
  logStep('3/4', 'Running tests...');
  
  log('\n  Running unit tests...', colors.blue);
  if (!exec('npm run test:unit', { ignoreError: true })) {
    logWarning('Some unit tests failed');
  }
  
  log('\n  Running integration tests...', colors.blue);
  if (!exec('npm run test:integration', { ignoreError: true })) {
    logWarning('Some integration tests failed');
  }
  
  log('\n  Running E2E tests...', colors.blue);
  if (!exec('npm run test:e2e', { ignoreError: true })) {
    logWarning('Some E2E tests failed');
  }
  
  return true;
}

function generateCoverage() {
  logStep('4/4', 'Generating coverage report...');
  
  if (!exec('npm run test:coverage -- --silent', { ignoreError: true })) {
    logWarning('Coverage generation failed');
    return false;
  }
  
  logSuccess('Coverage report generated: coverage/index.html');
  return true;
}

function main() {
  log('\n' + '='.repeat(60), colors.bright);
  log('  Ageless Literature - Local Test Suite', colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.bright);
  
  try {
    
    // Step 1: Check dev containers are running
    if (!startDockerServices()) {
      process.exit(1);
    }
    
    // Step 2: Verify database connection
    if (!waitForServices()) {
      process.exit(1);
    }
    
    // Step 3: Run tests (they use transactions for cleanup)
    runTests(); // Continue even if tests fail
    
    // Step 4: Generate coverage
    generateCoverage(); // Continue even if this fails
    
    log('\n' + '='.repeat(60), colors.bright);
    log('  Test suite complete!', colors.bright + colors.green);
    log('='.repeat(60) + '\n', colors.bright);
    
    log('Next steps:', colors.cyan);
    log('  • View coverage: open coverage/index.html');
    log('  • View Playwright report: npx playwright show-report');
    log('\nNote: Tests use transactions - no cleanup needed!', colors.green);
    log('');
    
  } catch (error) {
    logError(`\nUnexpected error: ${error.message}`);
    process.exit(1);
  }
}

main();
