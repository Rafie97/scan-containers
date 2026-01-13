# Shop App - Grocery Store Shopping Assistant

A self-hosted mobile/web app for scanning product barcodes, managing inventory, and navigating store layouts. Built for homelab deployment on NixOS.

## Deployment Options

### NixOS Homelab (Recommended)

#### Flake-based NixOS

```nix
# flake.nix
{
  inputs.shopapp.url = "github:Rafie97/scan-containers";

  outputs = { nixpkgs, shopapp, ... }: {
    nixosConfigurations.yourhost = nixpkgs.lib.nixosSystem {
      modules = [
        shopapp.nixosModules.shopapp
        {
          services.shopapp = {
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
  shopapp = builtins.fetchGit {
    url = "https://github.com/Rafie97/scan-containers";
    ref = "main";
  };
in {
  imports = [ "${shopapp}/nix/module.nix" ];

  services.shopapp = {
    enable = true;
    domain = "shop.home.local";
  };
}
```

Then rebuild:
```bash
sudo nixos-rebuild switch     # Silent build
sudo nixos-rebuild switch -L  # Verbose (shows Expo bundling progress)
```

**What gets deployed automatically:**
- PostgreSQL database (socket auth, no password needed)
- JWT secret (auto-generated on first start)
- systemd service with security hardening
- nginx reverse proxy
- Avahi mDNS (access via `shop.home.local` from any device on LAN)
- Firewall rules

### Docker (Non-NixOS, Limited)

For non-NixOS Linux systems, a Docker image is available. Note: **The NixOS module has no Docker dependencies** - this is purely an alternative deployment method.

**Limitations:** Docker deployment cannot use mDNS/Avahi for `.local` domain discovery. You'll need to use IP addresses or configure DNS manually.

```bash
# Build uses Nix's dockerTools - no Docker daemon required to build
nix build .#docker-image
docker load < result
docker run -p 8081:8081 -p 8082:8082 \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -e DATABASE_HOST=your-postgres-host \
  -e DATABASE_USER=shopapp \
  -e DATABASE_PASSWORD=yourpassword \
  -e DATABASE_NAME=shopapp \
  shopapp:latest
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
│  ├── packages.shopapp-server                │
│  ├── packages.docker-image                  │
│  └── nixosModules.shopapp                   │
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
| `services.shopapp.enable` | `false` | Enable the service |
| `services.shopapp.domain` | `"shop.local"` | Domain for nginx/avahi |
| `services.shopapp.autoGenerateJwtSecret` | `true` | Auto-generate JWT secret on first start |
| `services.shopapp.jwtSecretFile` | `null` | Path to JWT secret (optional if auto-generating) |
| `services.shopapp.ports.api` | `8081` | API port |
| `services.shopapp.database.createLocally` | `true` | Auto-create PostgreSQL |
| `services.shopapp.nginx.enable` | `true` | Enable reverse proxy |
| `services.shopapp.avahi.enable` | `true` | Enable mDNS |

**Note:** The `domain` option is baked into the frontend at build time via `EXPO_PUBLIC_DOMAIN`. Changing the domain requires a rebuild.

## Secrets Management

For most homelab setups, the default auto-generated JWT secret is fine. For production or multi-machine setups, you can use SOPS or agenix.

**SOPS (for production):**
```nix
sops.secrets."shopapp/jwt-secret".owner = "shopapp";
services.shopapp = {
  autoGenerateJwtSecret = false;
  jwtSecretFile = config.sops.secrets."shopapp/jwt-secret".path;
};
```

**agenix:**
```nix
age.secrets.shopapp-jwt = { file = ./secrets/shopapp-jwt.age; owner = "shopapp"; };
services.shopapp = {
  autoGenerateJwtSecret = false;
  jwtSecretFile = config.age.secrets.shopapp-jwt.path;
};
```

## Service Management

```bash
# Check status
systemctl status shopapp-server

# View logs
journalctl -u shopapp-server -f

# Restart
sudo systemctl restart shopapp-server

# Check database
sudo -u postgres psql -d shopapp -c '\dt'
```

## Implementation Status

**Complete:** Barcode scanner, auth system, API server, admin portal (inventory, promos, users, map editor)

**Incomplete:** Cart display, account page, user-facing map, recipe management
