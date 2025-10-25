# Use an official Bun base image
FROM oven/bun:1.3 AS base

# Set the working directory
WORKDIR /app

# Bun automatically reads from package.json to install dependencies.
# Copy package.json and the bun lockfile
COPY package*.json bun.lock ./

# Install all dependencies
RUN bun install

# Copy the rest of the app's source code
COPY . .

# --- Build Stage ---
# This stage exports the app into a static bundle
FROM base AS builder

# Export the app using expo-cli with our metro config
# RUN set -eux; \
#     echo "Starting expo export with custom metro config"; \
#     export NODE_OPTIONS="--max-old-space-size=4096"; \
#     export DEBUG=expo:*; \
RUN    CI=1 NODE_ENV=production bunx expo export --platform web
# This stage sets up a minimal server to serve the exported files.
FROM builder AS production

WORKDIR /app

# Install only the qrcode dependency needed for the server.
# A minimal package.json is created on the fly by bun.
RUN bun add qrcode

# COPY --from=base /app/node_modules ./node_modules

# The dist directory is already present since we're using builder as base
# No need to copy from builder stage

# Copy our custom Bun server file
COPY server.bun.ts .

# Expose the port the server will run on
EXPOSE 8081

# Command to start the server
CMD ["bun", "run", "server.bun.ts"]
