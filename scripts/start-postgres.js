#!/usr/bin/env node

/**
 * Cross-platform PostgreSQL Auto-Start Script
 * Works on Windows, macOS, and Linux
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const CONTAINER_NAME = 'ageless-lit-postgres';

async function checkDocker() {
  try {
    await execAsync('docker --version');
    return true;
  } catch (error) {
    return false;
  }
}

async function isDockerRunning() {
  try {
    await execAsync('docker ps');
    return true;
  } catch (error) {
    return false;
  }
}

async function containerExists() {
  try {
    const { stdout } = await execAsync('docker ps -a --format "{{.Names}}"');
    return stdout.includes(CONTAINER_NAME);
  } catch (error) {
    return false;
  }
}

async function isContainerRunning() {
  try {
    const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
    return stdout.includes(CONTAINER_NAME);
  } catch (error) {
    return false;
  }
}

async function startPostgres() {
  console.log('Checking PostgreSQL container...');

  // Check if Docker is installed
  const dockerInstalled = await checkDocker();
  if (!dockerInstalled) {
    console.error('❌ Docker is not installed or not in PATH');
    console.error('Please install Docker Desktop: https://www.docker.com/products/docker-desktop');
    process.exit(1);
  }

  // Check if Docker is running
  const dockerRunning = await isDockerRunning();
  if (!dockerRunning) {
    console.error('❌ Docker is not running');
    console.error('Please start Docker Desktop and try again');
    process.exit(1);
  }

  // Check if container exists
  const exists = await containerExists();
  if (!exists) {
    console.log(`Container '${CONTAINER_NAME}' not found`);
    console.log('Starting via docker-compose...');
    try {
      await execAsync('docker-compose up -d postgres');
      console.log('✅ PostgreSQL container started');
      return;
    } catch (error) {
      console.error('❌ Failed to start PostgreSQL:', error.message);
      process.exit(1);
    }
  }

  // Check if container is running
  const running = await isContainerRunning();
  if (running) {
    console.log('✅ PostgreSQL is already running');
    return;
  }

  // Container exists but is stopped - start it
  console.log('Starting PostgreSQL container...');
  try {
    await execAsync(`docker start ${CONTAINER_NAME}`);

    // Wait for PostgreSQL to be ready
    console.log('Waiting for PostgreSQL to be ready...');
    for (let i = 0; i < 30; i++) {
      try {
        await execAsync(`docker exec ${CONTAINER_NAME} pg_isready -U postgres`);
        console.log('✅ PostgreSQL is ready!');
        return;
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log('⚠️  PostgreSQL started but may still be initializing');
  } catch (error) {
    console.error('❌ Failed to start PostgreSQL:', error.message);
    process.exit(1);
  }
}

startPostgres();
