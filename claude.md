# Scan Containers - Grocery Store Shopping Assistant

A self-hosted mobile/web app for scanning product barcodes, managing inventory, and navigating store layouts. Built for homelab deployment on NixOS.

## Deployment Options

### NixOS Homelab (Recommended)

#### Flake-based NixOS

```nix
# flake.nix
{
  inputs.scanapp.url = "github:Rafie97/scan-containers";

  outputs = { nixpkgs, scanapp, ... }: {
    nixosConfigurations.yourhost = nixpkgs.lib.nixosSystem {
      modules = [
        scanapp.nixosModules.scanapp
        {
          services.scanapp = {
            enable = true;
            domain = "shop.home.local";
          };
        }
      ];
    };
  };
}
```

#### Traditional configuration.nix (no flakes)

```nix
# /etc/nixos/configuration.nix
{ config, pkgs, ... }:
let
  scanapp = builtins.fetchGit {
    url = "https://github.com/Rafie97/scan-containers";
    ref = "main";
  };
in {
  imports = [ "${scanapp}/nix/module.nix" ];

  services.scanapp = {
    enable = true;
    domain = "shop.home.local";
  };
}
```

Then rebuild:
```bash
sudo nixos-rebuild switch
```

**What gets deployed automatically:**
- PostgreSQL database (socket auth, no password needed)
- JWT secret (auto-generated on first start)
- systemd service with security hardening
- nginx reverse proxy
- Avahi mDNS (access via `shop.home.local` from any device on LAN)
- Firewall rules

### Docker (Non-NixOS)

Build the Docker image from Nix (ensures consistency):

```bash
nix build .#docker-image
docker load < result
docker run -p 8081:8081 -p 8082:8082 \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -e DATABASE_HOST=your-postgres-host \
  -e DATABASE_USER=scanapp \
  -e DATABASE_PASSWORD=yourpassword \
  -e DATABASE_NAME=scanapp \
  scanapp:latest
```

### Development

```bash
nix develop              # Enter dev shell with node, npm, postgres tools
docker-compose up -d db  # Start dev database (port 5433)
npm install              # Install dependencies
npm run server:node      # Start API server
npx expo start --port 8082  # Start Expo dev server
```

Development uses port 5433 for PostgreSQL to avoid conflicts with system postgres.

## First-Time Setup

After deployment, access the admin setup wizard:

1. Open `http://shop.home.local/admin/setup` (or your configured domain)
2. Create the initial admin account
3. Start adding inventory, promotions, and store maps

**In-Store Display:** Open `/connect` to show a QR code for customers to scan (e.g., `http://shop.local/connect`)

## Architecture

```
┌─────────────────────────────────────────────┐
│  flake.nix (source of truth)                │
│  ├── packages.scanapp-server                │
│  ├── packages.docker-image                  │
│  └── nixosModules.scanapp                   │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   NixOS Native            Docker Image
   (homelab)               (other Linux)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Expo (React Native) v54, React 19, expo-router v6 |
| Backend | Node.js HTTP server, PostgreSQL 14 |
| Auth | JWT + bcrypt, role-based (admin/manager/user) |
| Deployment | NixOS module, Nix-built Docker image |

## Project Structure

```
app/
├── (tabs)/           # Mobile app screens (scan, cart, map, promos, account)
├── admin/            # Web admin portal (inventory, promos, users, maps)
└── connect.tsx       # In-store QR code display page

server.node.mjs       # API server (40+ endpoints)
db/schema.sql         # PostgreSQL schema

nix/
├── package.nix       # Server package (buildNpmPackage)
├── module.nix        # NixOS module (systemd, postgres, nginx, avahi)
└── docker-image.nix  # Docker image derivation

flake.nix             # Nix flake
```

## Key Files

| File | Purpose |
|------|---------|
| `server.node.mjs` | API server, all backend logic |
| `services/api.ts` | Frontend API client |
| `contexts/AuthContext.tsx` | Authentication state |
| `db/schema.sql` | Database schema |
| `nix/module.nix` | NixOS service definition |

## API Endpoints

All routes under `/api/*`:

- `/api/setup/*` - Initial admin setup
- `/api/auth/*` - Login/logout/session
- `/api/items/*` - Product CRUD
- `/api/cart/*` - Cart management
- `/api/map/*` - Store layout
- `/api/promos/*` - Promotions
- `/api/users/*` - User management

## NixOS Module Options

| Option | Default | Description |
|--------|---------|-------------|
| `services.scanapp.enable` | `false` | Enable the service |
| `services.scanapp.domain` | `"shop.local"` | Domain for nginx/avahi |
| `services.scanapp.autoGenerateJwtSecret` | `true` | Auto-generate JWT secret on first start |
| `services.scanapp.jwtSecretFile` | `null` | Path to JWT secret (optional if auto-generating) |
| `services.scanapp.ports.api` | `8081` | API port |
| `services.scanapp.database.createLocally` | `true` | Auto-create PostgreSQL |
| `services.scanapp.nginx.enable` | `true` | Enable reverse proxy |
| `services.scanapp.avahi.enable` | `true` | Enable mDNS |

## Secrets Management

For most homelab setups, the default auto-generated JWT secret is fine. For production or multi-machine setups, you can use SOPS or agenix.

**SOPS (for production):**
```nix
sops.secrets."scanapp/jwt-secret".owner = "scanapp";
services.scanapp = {
  autoGenerateJwtSecret = false;
  jwtSecretFile = config.sops.secrets."scanapp/jwt-secret".path;
};
```

**agenix:**
```nix
age.secrets.scanapp-jwt = { file = ./secrets/scanapp-jwt.age; owner = "scanapp"; };
services.scanapp = {
  autoGenerateJwtSecret = false;
  jwtSecretFile = config.age.secrets.scanapp-jwt.path;
};
```

## Service Management

```bash
# Check status
systemctl status scanapp-server

# View logs
journalctl -u scanapp-server -f

# Restart
sudo systemctl restart scanapp-server

# Check database
sudo -u postgres psql -d scanapp -c '\dt'
```

## Implementation Status

**Complete:** Barcode scanner, auth system, API server, admin portal (inventory, promos, users, map editor)

**Incomplete:** Cart display, account page, user-facing map, recipe management
