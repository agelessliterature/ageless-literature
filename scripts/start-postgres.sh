#!/bin/bash

# PostgreSQL Auto-Start Script
# Checks if PostgreSQL Docker container is running and starts it if needed

CONTAINER_NAME="ageless-lit-postgres"

echo "Checking PostgreSQL container..."

# Check if container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Container '${CONTAINER_NAME}' not found"
    echo "Starting via docker-compose..."
    docker-compose up -d postgres
    exit $?
fi

# Check if container is running
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "PostgreSQL is already running"
    exit 0
fi

# Container exists but is stopped - start it
echo "Starting PostgreSQL container..."
docker start ${CONTAINER_NAME}

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec ${CONTAINER_NAME} pg_isready -U postgres &>/dev/null; then
        echo "PostgreSQL is ready!"
        exit 0
    fi
    sleep 1
done

echo "PostgreSQL started but may still be initializing"
exit 0
