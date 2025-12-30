# Scan Containers

A self-hosted grocery store shopping assistant for your homelab. Scan barcodes, manage inventory, track promotions, and navigate store layouts.

## Quick Start (NixOS)

```nix
{
  inputs.scanapp.url = "github:youruser/scan-containers";
}

{ config, ... }: {
  imports = [ inputs.scanapp.nixosModules.scanapp ];

  services.scanapp = {
    enable = true;
    domain = "shop.home.local";
    jwtSecretFile = "/run/secrets/scanapp-jwt";
  };
}
```

```bash
openssl rand -base64 48 | sudo tee /run/secrets/scanapp-jwt
sudo nixos-rebuild switch
```

Access at `http://shop.home.local/admin/setup` to create your admin account.

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
npm install                    # Install dependencies
npm run server:node            # Start API server
npx expo start --port 8082     # Start Expo dev server
```

## Documentation

See [claude.md](./claude.md) for full documentation including:
- NixOS module options
- Secrets management (SOPS/agenix)
- Architecture overview
- API endpoints
- Project structure
