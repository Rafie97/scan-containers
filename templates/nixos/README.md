# Scan Containers NixOS Deployment

This template shows how to deploy Scan Containers on a NixOS server **without Docker**.

## Quick Start

1. Add the flake input to your NixOS configuration:

```nix
{
  inputs.scanapp.url = "github:youruser/scan-containers";
}
```

2. Import the module and enable the service:

```nix
{ config, ... }: {
  imports = [ inputs.scanapp.nixosModules.scanapp ];

  services.scanapp = {
    enable = true;
    domain = "shop.home.local";
    jwtSecretFile = "/run/secrets/scanapp-jwt";
  };
}
```

3. Create the JWT secret:

```bash
# Generate and save JWT secret
openssl rand -base64 48 | sudo tee /run/secrets/scanapp-jwt > /dev/null
sudo chmod 600 /run/secrets/scanapp-jwt
```

4. Rebuild and switch:

```bash
sudo nixos-rebuild switch
```

## What Gets Deployed

The NixOS module automatically sets up:

- **PostgreSQL** database with the `scanapp` user and database
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

### Option 1: Manual (shown above)

```bash
openssl rand -base64 48 | sudo tee /run/secrets/scanapp-jwt > /dev/null
```

### Option 2: SOPS (recommended for production)

```nix
{
  sops.secrets."scanapp/jwt-secret" = {
    owner = "scanapp";
    group = "scanapp";
  };

  services.scanapp.jwtSecretFile = config.sops.secrets."scanapp/jwt-secret".path;
}
```

### Option 3: agenix

```nix
{
  age.secrets.scanapp-jwt = {
    file = ./secrets/scanapp-jwt.age;
    owner = "scanapp";
    group = "scanapp";
  };

  services.scanapp.jwtSecretFile = config.age.secrets.scanapp-jwt.path;
}
```

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `enable` | `false` | Enable the service |
| `domain` | `"shop.local"` | Domain for nginx/avahi |
| `jwtSecretFile` | required | Path to JWT secret file |
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
