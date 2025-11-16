#!/usr/bin/env bash
# start-dev.sh - helper for macOS / Linux to detect host LAN IP and run docker-compose
# Usage: ./start-dev.sh

set -euo pipefail

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

docker-compose up --build
