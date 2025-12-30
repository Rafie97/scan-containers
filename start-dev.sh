#!/usr/bin/env bash
# start-dev.sh - helper for macOS / Linux to detect host LAN IP and run docker-compose
# Usage: ./start-dev.sh

set -eu

ENV_FILE=".env"

# Generate secure credentials on first run
generate_credentials() {
  if [ -f "$ENV_FILE" ]; then
    echo "Using existing credentials from $ENV_FILE"
    return 0
  fi

  echo "First run detected - generating secure database credentials..."

  # Clean up any stale volumes to avoid credential mismatch
  echo "Cleaning up any existing containers and volumes..."
  docker compose down -v 2>/dev/null || true

  # Generate random passwords (32 chars alphanumeric)
  # Note: Use dd to avoid SIGPIPE issues with pipefail
  if command -v openssl >/dev/null 2>&1; then
    DB_PASSWORD=$(openssl rand -hex 16)
    JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
  else
    # Fallback using /dev/urandom
    DB_PASSWORD=$(dd if=/dev/urandom bs=16 count=1 2>/dev/null | od -An -tx1 | tr -d ' \n')
    JWT_SECRET=$(dd if=/dev/urandom bs=36 count=1 2>/dev/null | base64 | tr -d '\n')
  fi

  cat > "$ENV_FILE" << EOF
# Auto-generated credentials for Scan App
# Created: $(date)
# KEEP THIS FILE SAFE - it contains your database credentials
#
# If you lose this file, see recover-db.sh for recovery options

DATABASE_USER=scanapp
DATABASE_PASSWORD=$DB_PASSWORD
DATABASE_NAME=scanapp_db
JWT_SECRET=$JWT_SECRET
EOF

  echo ""
  echo "=============================================="
  echo "  SECURE CREDENTIALS GENERATED"
  echo "=============================================="
  echo "  Database User:     scanapp"
  echo "  Database Password: $DB_PASSWORD"
  echo "  Database Name:     scanapp_db"
  echo "=============================================="
  echo ""
  echo "  Credentials saved to: $ENV_FILE"
  echo "  Keep this file safe for backup/recovery!"
  echo ""
}

# Generate credentials before anything else
generate_credentials

# Try to find a private LAN IPv4 address (prefer 192.168.* then 10.*)
get_ip() {
  # platform-specific commands
  if command -v ip >/dev/null 2>&1; then
    # Linux: list IPv4 addresses, skip loopback and docker/veth
    ip -4 addr show scope global | awk '/inet/ {print $2}' | cut -d'/' -f1 | grep -E '^(192\.168\.|10\.)' | head -n 1
  elif command -v ifconfig >/dev/null 2>&1; then
    # macOS or BSD
    ifconfig | awk '/inet /{print $2}' | grep -E '^(192\.168\.|10\.)' | head -n 1
  else
    echo ""
  fi
}

IP=$(get_ip || true)
if [ -z "$IP" ]; then
  # Try a broader match if no private IP found
  if command -v ip >/dev/null 2>&1; then
    IP=$(ip -4 addr show scope global | awk '/inet/ {print $2}' | cut -d'/' -f1 | head -n 1 || true)
  elif command -v ifconfig >/dev/null 2>&1; then
    IP=$(ifconfig | awk '/inet /{print $2}' | head -n 1 || true)
  fi
fi

if [ -z "$IP" ]; then
  echo "Could not detect host IP. Please set HOST_IP environment variable and re-run."
  exit 1
fi

echo "Detected host IP: $IP"

# Export HOST_IP for docker-compose
export HOST_IP="$IP"

echo "Starting docker-compose with HOST_IP=$HOST_IP"

docker compose up --build
