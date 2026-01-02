# Scan Containers

A self-hosted grocery store shopping assistant for your store. Scan barcodes, manage inventory, track promotions, and navigate store layouts.

## Quick Start (NixOS)

### Option A: Flake-based NixOS

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
            domain = "shop.home.local";  # Access via http://shop.home.local
          };
        }
      ];
    };
  };
}
```

### Option B: Traditional configuration.nix

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

Access at `http://shop.home.local/admin/setup` to create your admin account.

**What gets set up automatically:** PostgreSQL, nginx reverse proxy, mDNS (so `shop.home.local` works on your LAN), firewall rules, and a JWT secret for authentication.

## Quick Start (Docker)

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

## Development

```bash
nix develop                    # Enter dev shell
docker-compose up -d db        # Start dev database (port 5433)
npm install                    # Install dependencies
npm run server:node            # Start API server
npx expo start --port 8082     # Start Expo dev server
```

Development uses port 5433 for PostgreSQL to avoid conflicts with system postgres.

## Documentation

See [claude.md](./claude.md) for full documentation including:
- NixOS module options
- Secrets management (SOPS/agenix)
- Architecture overview
- API endpoints
- Project structure
