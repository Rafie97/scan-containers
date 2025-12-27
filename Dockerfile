# Use an official Node.js base image
FROM node:20 AS base

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy the rest of the app's source code
COPY . .

# Production stage: minimal server to serve the exported files.
FROM base AS production

WORKDIR /app

# Install server dependencies
RUN npm install qrcode pg bcrypt

# The dist directory is already present since we're using builder as base
# No need to copy from builder stage

# Copy our custom Node.js server file
COPY server.node.mjs .
# Copy the database schema
COPY db ./db
# Copy the start script that runs both processes
COPY start.sh .
RUN chmod +x ./start.sh

# Expose the ports the container will use:
#  - 8081 for the Node.js static/QR server
#  - 8082 for the Expo / app dev server (Metro)
EXPOSE 8081
EXPOSE 8082

# Start both the Expo dev server (via the npm script) and the Node.js server.
# We pass `--host 0.0.0.0` to ensure Expo listens on all interfaces inside
# the container. The two processes run in the foreground; the shell will keep
# the container alive as long as one of them runs. This is a simple approach
# for local/dev usage. For production you might prefer a process manager.
CMD ["sh", "-c", "./start.sh"]