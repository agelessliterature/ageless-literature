FROM node:20-alpine

WORKDIR /app

# Copy root and API package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install dependencies (skip husky prepare script in Docker)
RUN npm install --workspace=apps/api --production=false --ignore-scripts && \
    cd apps/api && npm rebuild

# Copy API source code
COPY apps/api ./apps/api

# Set production environment
ENV NODE_ENV=production

EXPOSE 3001

# Start the API server directly (no npm scripts to avoid predev hooks)
CMD ["node", "--experimental-specifier-resolution=node", "apps/api/src/server.js"]
