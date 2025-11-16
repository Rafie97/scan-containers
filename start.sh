#!/bin/sh
# Start script to run both Expo dev server and Bun QR server inside the container.
# It runs Expo in LAN mode so it advertises a LAN IP, and runs the Bun server
# which serves the QR landing page.

echo "Starting Expo dev server on port ${APP_PORT:-8082} (mode: lan)"
# Start Expo/Metro in background
bun run start -- --host lan &

echo "Starting Bun QR server on port ${BUN_PORT:-8081}"
# Start Bun server in foreground so the container stays up
bun run server.bun.ts

# If Bun exits, forward exit code
exit $?
