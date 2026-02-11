# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Build arguments for Next.js environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ARG NEXT_PUBLIC_FONTAWESOME_KIT
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET

# Set as environment variables for build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ENV NEXT_PUBLIC_FONTAWESOME_KIT=$NEXT_PUBLIC_FONTAWESOME_KIT
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# Copy package files (web app only, no workspace references)
COPY apps/web/package*.json ./

# Install dependencies with optimizations
# Using npm install instead of npm ci since we don't have a lockfile
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --prefer-offline --no-audit --ignore-scripts --production=false

# Copy source files
COPY apps/web .
COPY tsconfig.base.json ../tsconfig.base.json

# Build the application with high memory allocation
# Next.js 15 uses webpack by default (Turbopack is opt-in with --turbo flag)
# Using 3GB as a balance between build requirements and server capacity
RUN NODE_OPTIONS="--no-warnings --max-old-space-size=3072" \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    GENERATE_SOURCEMAP=false \
    DISABLE_ESLINT_PLUGIN=true \
    npx next build

# Prune dev dependencies after build
RUN npm prune --production --ignore-scripts

# Stage 2: Runner (standalone mode)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone server (includes minimal node_modules)
COPY --from=builder /app/.next/standalone ./
# Copy static assets into standalone .next directory
COPY --from=builder /app/.next/static ./.next/static
# Copy public assets
COPY --from=builder /app/public ./public

# Set runtime environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ARG NEXT_PUBLIC_FONTAWESOME_KIT
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ENV NEXT_PUBLIC_FONTAWESOME_KIT=$NEXT_PUBLIC_FONTAWESOME_KIT
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
