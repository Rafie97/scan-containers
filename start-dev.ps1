# start-dev.ps1
# Helper to detect the host's LAN IP (Windows) and run docker-compose with
# HOST_IP set so QR codes and Metro/Expo advertise the correct address.

# Try to find a private LAN IPv4 (192.168.* or 10.*) preferring Wi‑Fi/Ethernet
$ip = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    -not ($_.IPAddress -like '127.*') -and
    -not ($_.IPAddress -like '169.*') -and
    ($_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*')
} | Sort-Object -Property InterfaceAlias | Select-Object -First 1 -ExpandProperty IPAddress -ErrorAction SilentlyContinue

if (-not $ip) {
    # Fallback: any non-loopback IPv4
    $ip = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { -not ($_.IPAddress -like '127.*') -and -not ($_.IPAddress -like '169.*') } | Select-Object -First 1 -ExpandProperty IPAddress -ErrorAction SilentlyContinue
}

if (-not $ip) {
    Write-Error "Could not detect a suitable host IP. Please set HOST_IP manually (e.g. 192.168.8.180)."
    exit 1
}

Write-Host "Detected host IP: $ip"
# Export for docker-compose to pick up
$env:HOST_IP = $ip

Write-Host "Starting docker-compose with HOST_IP=$env:HOST_IP"
docker-compose up --build
