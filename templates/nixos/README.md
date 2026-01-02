# Scan Containers NixOS Deployment

This template shows how to deploy Scan Containers on a NixOS server **without Docker**.

## Quick Start

### Flake-based NixOS

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

### Traditional configuration.nix (no flakes)

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

## What Gets Deployed

The NixOS module automatically sets up:

- **PostgreSQL** database with the `scanapp` user and database
- **JWT secret** auto-generated on first start
- **systemd service** running the Node.js API server
- **nginx** reverse proxy at your configured domain
- **Avahi/mDNS** for `.local` domain discovery
- **Firewall** rules for ports 80, 443, 8081, 8082

## Accessing the App

After deployment:

- **Admin setup**: `http://shop.home.local/admin/setup`
- **API**: `http://shop.home.local/api/`
- **App**: `http://shop.home.local/`

If using Avahi, any device on your local network can access `shop.home.local`.

## Secrets Management

By default, the JWT secret is **auto-generated** on first start and stored in `/var/lib/scanapp/jwt-secret`. This is fine for most homelab setups.

For production or multi-machine deployments, you can use SOPS or agenix:

### SOPS

```nix
{
  sops.secrets."scanapp/jwt-secret".owner = "scanapp";

  services.scanapp = {
    autoGenerateJwtSecret = false;
    jwtSecretFile = config.sops.secrets."scanapp/jwt-secret".path;
  };
}
```

### agenix

```nix
{
  age.secrets.scanapp-jwt = {
    file = ./secrets/scanapp-jwt.age;
    owner = "scanapp";
  };

  services.scanapp = {
    autoGenerateJwtSecret = false;
    jwtSecretFile = config.age.secrets.scanapp-jwt.path;
  };
}
```

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `enable` | `false` | Enable the service |
| `domain` | `"shop.local"` | Domain for nginx/avahi |
| `autoGenerateJwtSecret` | `true` | Auto-generate JWT secret on first start |
| `jwtSecretFile` | `null` | Path to JWT secret (optional if auto-generating) |
| `ports.api` | `8081` | API server port |
| `ports.app` | `8082` | Frontend/Expo port |
| `database.createLocally` | `true` | Create local PostgreSQL |
| `database.host` | `"/run/postgresql"` | DB host (socket path for local) |
| `database.name` | `"scanapp"` | Database name |
| `database.user` | `"scanapp"` | Database user |
| `nginx.enable` | `true` | Enable nginx reverse proxy |
| `nginx.enableSSL` | `false` | Enable ACME SSL |
| `avahi.enable` | `true` | Enable mDNS advertisement |
| `openFirewall` | `true` | Open firewall ports |

## Using an External Database

```nix
services.scanapp = {
  enable = true;
  domain = "shop.example.com";

  autoGenerateJwtSecret = false;
  jwtSecretFile = config.sops.secrets."scanapp/jwt-secret".path;

  database = {
    createLocally = false;
    host = "postgres.example.com";
    name = "scanapp_prod";
    user = "scanapp";
    passwordFile = config.sops.secrets."scanapp/db-password".path;
  };

  nginx.enableSSL = true;  # Use Let's Encrypt
};
```

## Checking Service Status

```bash
# View service status
systemctl status scanapp-server

# View logs
journalctl -u scanapp-server -f

# Check database
sudo -u postgres psql -d scanapp -c '\dt'
```

## Troubleshooting

### Service won't start

Check the logs:
```bash
journalctl -u scanapp-server -e
```

Common issues:
- JWT secret file doesn't exist or has wrong permissions
- PostgreSQL not running: `systemctl status postgresql`

### Can't connect to database

For local socket connections, ensure:
- PostgreSQL is running
- The `scanapp` user exists: `sudo -u postgres psql -c '\du'`
- The database exists: `sudo -u postgres psql -c '\l'`

### mDNS not working

Ensure Avahi is running:
```bash
systemctl status avahi-daemon
avahi-browse -a  # List all services
```
