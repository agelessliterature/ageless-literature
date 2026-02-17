FROM node:20-alpine

WORKDIR /app

# Install build tools needed for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# Copy only the API package.json (no workspace mode)
COPY apps/api/package.json ./

# Install dependencies directly (no workspace, no lockfile)
RUN npm install --no-audit --ignore-scripts=false && \
    npm cache clean --force

# Copy API source files and Sequelize CLI config
COPY apps/api/.sequelizerc ./
COPY apps/api/src ./src

# Set environment
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "--experimental-specifier-resolution=node", "src/server.js"]
