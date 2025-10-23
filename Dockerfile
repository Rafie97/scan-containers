# Use an official Bun base image
FROM oven/bun:1.0-alpine AS base

# Set the working directory
WORKDIR /app

# Bun automatically reads from package.json to install dependencies.
# Copy package.json and the bun lockfile
COPY package*.json bun.lockb ./

# Install all dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the app's source code
COPY . .

# --- Build Stage ---
# This stage exports the app into a static bundle
FROM base AS builder
# Run the export command using bun's executor
RUN bunx expo export


# --- Production Stage ---
# This stage sets up a minimal server to serve the exported files.
FROM oven/bun:1.0-alpine AS production

WORKDIR /app

# Install only the qrcode dependency needed for the server.
# A minimal package.json is created on the fly by bun.
RUN bun add qrcode

# Copy the exported 'dist' directory from the builder stage
COPY --from=builder /app/dist ./dist

# Copy our custom Bun server file
COPY server.bun.ts .

# Expose the port the server will run on
EXPOSE 8081

# Command to start the server
CMD ["bun", "run", "server.bun.ts"]
