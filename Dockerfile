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

# We are using a prebuilt `dist` in the build context. Skip the export step
# and use the base image (which already installed dependencies) as the
# production base so `node_modules` and app files are present.
# Production stage: minimal server to serve the exported files.
FROM base AS production

WORKDIR /app

# Install only the qrcode dependency needed for the server.
# A minimal package.json is created on the fly by bun.
RUN bun add qrcode

# COPY --from=base /app/node_modules ./node_modules

# The dist directory is already present since we're using builder as base
# No need to copy from builder stage

# Copy our custom Bun server file
COPY server.bun.ts .
# Copy the start script that runs both processes
COPY start.sh .
RUN chmod +x ./start.sh

# Expose the ports the container will use:
#  - 8081 for the Bun static/QR server
#  - 8082 for the Expo / app dev server (Metro)
EXPOSE 8081
EXPOSE 8082

# Start both the Expo dev server (via the npm script) and the Bun server.
# We pass `-- --host 0.0.0.0` to ensure Expo listens on all interfaces inside
# the container. The two processes run in the foreground; the shell will keep
# the container alive as long as one of them runs. This is a simple approach
# for local/dev usage. For production you might prefer a process manager.
CMD ["sh", "-c", "./start.sh"]
