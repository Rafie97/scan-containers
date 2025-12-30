#!/bin/sh
# Start script to run both Expo dev server and Node.js QR server inside the container.
# It runs Expo in LAN mode so it advertises a LAN IP, and runs the Node.js server
# which serves the QR landing page.

# Run in offline/CI mode to avoid interactive prompts in Docker
export CI=1
export EXPO_OFFLINE=1

# Log database connection info (without password)
echo "Database: ${DATABASE_NAME:-mydatabase} @ ${DATABASE_HOST:-localhost}"
echo "Database User: ${DATABASE_USER:-myuser}"

echo "Starting Expo dev server on port ${APP_PORT:-8082} (mode: lan)"
# Start Expo/Metro in background
npm run start -- --lan &

echo "Starting Node.js QR server on port ${NODE_PORT:-8081}"
# Start Node server in foreground so the container stays up
npm run server:node

# If Node exits, forward exit code
exit $?
