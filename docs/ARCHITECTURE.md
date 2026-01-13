# Shop App - NixOS-First Architecture

## Overview

Shop App follows a **NixOS-first** deployment strategy with a single Nix flake as the source of truth. This provides:

1. **Native NixOS deployment** - For homelab platform users
2. **Nix-built Docker images** - For non-NixOS users

```
┌─────────────────────────────────────────────────────┐
│  Source of Truth: flake.nix                         │
│                                                     │
│  ├── packages.shopapp        (the server package)   │
│  ├── nixosModules.shopapp    (NixOS module)         │
│  └── packages.docker-image   (Docker image)         │
└─────────────────────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
 ┌─────────────────┐      ┌─────────────────┐
 │  NixOS Users    │      │  Non-Nix Users  │
 │                 │      │                 │
 │  services.      │      │  docker pull    │
 │    shopapp      │      │    shopapp      │
 │    .enable=true │      │  docker-compose │
 └─────────────────┘      └─────────────────┘
```

## Directory Structure

```
scan-containers/
├── flake.nix                    # Main flake - source of truth
├── flake.lock
│
├── nix/
│   ├── package.nix              # Shop App server package derivation
│   ├── module.nix               # NixOS module
│   ├── docker-image.nix         # Docker image derivation
│   └── default.nix              # Shared utilities
│
├── server.node.mjs              # Node.js API server (unchanged)
├── db/schema.sql                # PostgreSQL schema (unchanged)
├── app/                         # Expo frontend (unchanged)
├── services/                    # Frontend API client (unchanged)
│
├── docker-compose.yml           # For non-Nix users (uses nix-built image)
└── docs/
    └── ARCHITECTURE.md          # This file
```

## Component Details

### 1. Server Package (`nix/package.nix`)

Builds the Node.js server as a Nix package:

```nix
{ lib, stdenv, nodejs_20, nodePackages, ... }:

stdenv.mkDerivation {
  pname = "shopapp-server";
  version = "0.1.0";

  src = ../.;

  nativeBuildInputs = [ nodejs_20 nodePackages.npm ];

  buildPhase = ''
    export HOME=$TMPDIR
    npm ci --production
  '';

  installPhase = ''
    mkdir -p $out/{bin,lib/shopapp}
    cp -r node_modules server.node.mjs db $out/lib/shopapp/

    # Create wrapper script
    cat > $out/bin/shopapp-server << 'EOF'
    #!/usr/bin/env bash
    exec ${nodejs_20}/bin/node $out/lib/shopapp/server.node.mjs "$@"
    EOF
    chmod +x $out/bin/shopapp-server
  '';

  meta = with lib; {
    description = "Shop App - Grocery store shopping assistant API";
    license = licenses.mit;
    platforms = platforms.linux ++ platforms.darwin;
  };
}
```

### 2. NixOS Module (`nix/module.nix`)

Native NixOS integration with SOPS secrets, PostgreSQL, and systemd:

```nix
{ config, lib, pkgs, ... }:

let
  cfg = config.services.shopapp;
in {
  options.services.shopapp = {
    enable = lib.mkEnableOption "Shop App grocery app";

    domain = lib.mkOption {
      type = lib.types.str;
      default = "shop.local";
      description = "Domain for the app (used with avahi/nginx)";
    };

    ports = {
      api = lib.mkOption {
        type = lib.types.port;
        default = 8081;
        description = "API server port";
      };
      app = lib.mkOption {
        type = lib.types.port;
        default = 8082;
        description = "Expo/frontend port";
      };
    };

    database = {
      host = lib.mkOption {
        type = lib.types.str;
        default = "/run/postgresql";
        description = "PostgreSQL host (socket path or hostname)";
      };
      name = lib.mkOption {
        type = lib.types.str;
        default = "shopapp";
        description = "Database name";
      };
      user = lib.mkOption {
        type = lib.types.str;
        default = "shopapp";
        description = "Database user";
      };
      passwordFile = lib.mkOption {
        type = lib.types.nullOr lib.types.path;
        default = null;
        description = "Path to file containing database password (for SOPS)";
      };
    };

    jwtSecretFile = lib.mkOption {
      type = lib.types.path;
      description = "Path to file containing JWT secret (for SOPS)";
    };

    storage = {
      dataDir = lib.mkOption {
        type = lib.types.path;
        default = "/var/lib/shopapp";
        description = "Data directory for uploads and assets";
      };
    };

    nginx = {
      enable = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Configure nginx reverse proxy";
      };
    };
  };

  config = lib.mkIf cfg.enable {
    # PostgreSQL database
    services.postgresql = {
      enable = true;
      ensureDatabases = [ cfg.database.name ];
      ensureUsers = [{
        name = cfg.database.user;
        ensureDBOwnership = true;
      }];
    };

    # System user
    users.users.shopapp = {
      isSystemUser = true;
      group = "shopapp";
      home = cfg.storage.dataDir;
      createHome = true;
    };
    users.groups.shopapp = {};

    # Systemd service
    systemd.services.shopapp-server = {
      description = "Scan Containers API Server";
      wantedBy = [ "multi-user.target" ];
      after = [ "postgresql.service" "network.target" ];
      requires = [ "postgresql.service" ];

      environment = {
        NODE_ENV = "production";
        DATABASE_HOST = cfg.database.host;
        DATABASE_NAME = cfg.database.name;
        DATABASE_USER = cfg.database.user;
        APP_PORT = toString cfg.ports.app;
      };

      serviceConfig = {
        Type = "simple";
        User = "shopapp";
        Group = "shopapp";
        WorkingDirectory = cfg.storage.dataDir;
        ExecStart = "${pkgs.shopapp-server}/bin/shopapp-server";
        Restart = "always";
        RestartSec = 5;

        # Security hardening
        NoNewPrivileges = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        PrivateTmp = true;
        ReadWritePaths = [ cfg.storage.dataDir ];

        # Load secrets
        EnvironmentFile = lib.mkIf (cfg.database.passwordFile != null) [
          cfg.database.passwordFile
        ];
      };

      # Load JWT secret separately
      preStart = ''
        export JWT_SECRET=$(cat ${cfg.jwtSecretFile})
      '';
    };

    # Nginx reverse proxy
    services.nginx = lib.mkIf cfg.nginx.enable {
      enable = true;
      virtualHosts.${cfg.domain} = {
        locations."/" = {
          proxyPass = "http://127.0.0.1:${toString cfg.ports.app}";
          proxyWebsockets = true;
        };
        locations."/api" = {
          proxyPass = "http://127.0.0.1:${toString cfg.ports.api}";
        };
      };
    };

    # Firewall
    networking.firewall.allowedTCPPorts = [ 80 443 cfg.ports.api cfg.ports.app ];

    # Avahi mDNS (for .local domain)
    services.avahi = {
      enable = true;
      publish = {
        enable = true;
        domain = true;
        addresses = true;
      };
      extraServiceFiles.shopapp = ''
        <?xml version="1.0" standalone='no'?>
        <!DOCTYPE service-group SYSTEM "avahi-service.dtd">
        <service-group>
          <name>Shop App</name>
          <service>
            <type>_http._tcp</type>
            <port>${toString cfg.ports.app}</port>
            <txt-record>path=/</txt-record>
          </service>
        </service-group>
      '';
    };
  };
}
```

### 3. Docker Image (`nix/docker-image.nix`)

Reproducible Docker image built from the same Nix definitions:

```nix
{ pkgs, shopapp-server, ... }:

pkgs.dockerTools.buildLayeredImage {
  name = "shopapp";
  tag = "latest";

  contents = [
    pkgs.nodejs_20
    pkgs.coreutils
    pkgs.bash
    shopapp-server
  ];

  config = {
    Cmd = [ "${shopapp-server}/bin/shopapp-server" ];
    ExposedPorts = {
      "8081/tcp" = {};
      "8082/tcp" = {};
    };
    Env = [
      "NODE_ENV=production"
    ];
    WorkingDir = "/app";
  };

  # Layer optimization - put rarely-changing deps in early layers
  maxLayers = 120;
}
```

### 4. Main Flake (`flake.nix`)

Ties everything together:

```nix
{
  description = "Shop App - Grocery store shopping assistant";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        shopapp-server = pkgs.callPackage ./nix/package.nix {};

      in {
        # The server package
        packages = {
          default = shopapp-server;
          inherit shopapp-server;

          # Docker image (linux only)
          docker-image = pkgs.callPackage ./nix/docker-image.nix {
            inherit shopapp-server;
          };
        };

        # Development shell
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            nodePackages.npm
            postgresql_14
          ];
        };
      }
    ) // {
      # NixOS module (not system-specific)
      nixosModules = {
        default = self.nixosModules.shopapp;
        shopapp = import ./nix/module.nix;
      };

      # Overlay for easy integration
      overlays.default = final: prev: {
        shopapp-server = final.callPackage ./nix/package.nix {};
      };
    };
}
```

## Deployment Scenarios

### Scenario 1: NixOS Native (Recommended)

For NixOS users, add to configuration:

```nix
# /etc/nixos/configuration.nix
{ config, pkgs, ... }:
{
  imports = [
    # Option A: From local path
    /path/to/scan-containers/nix/module.nix

    # Option B: From flake (in flake-based config)
    # inputs.shopapp.nixosModules.shopapp
  ];

  services.shopapp = {
    enable = true;
    domain = "shop.home.local";
    jwtSecretFile = config.sops.secrets."shopapp/jwt-secret".path;
    database.passwordFile = config.sops.secrets."shopapp/db-password".path;
  };

  # SOPS secrets
  sops.secrets = {
    "shopapp/jwt-secret" = {};
    "shopapp/db-password" = {};
  };
}
```

Then:
```bash
sudo nixos-rebuild switch
```

### Scenario 2: Homelab Platform Integration

When integrated with the homelab platform using `mk-app.nix`:

```nix
# In homelab platform: apps/shopapp/default.nix
{ lib, ... }:
let
  inherit (import ../../lib/mk-app.nix { inherit lib; }) mkApp;
in mkApp {
  name = "shopapp";
  description = "Grocery store shopping assistant";

  extraOptions = {
    port = lib.mkOption {
      type = lib.types.port;
      default = 8082;
      description = "App port";
    };
  };

  config = cfg: {
    # Import the actual shopapp module
    imports = [ (builtins.fetchGit {
      url = "https://github.com/Rafie97/scan-containers";
      ref = "main";
    } + "/nix/module.nix") ];

    services.shopapp = {
      enable = true;
      domain = cfg.domain;
      ports.app = cfg.port;
      jwtSecretFile = cfg.secrets."jwt-secret";
    };
  };
}
```

Users then:
```nix
homelab.apps.shopapp = {
  enable = true;
  domain = "shop.home.local";  # avahi just works
};
```

### Scenario 3: Docker (Non-NixOS)

Build and export the Docker image:

```bash
# Build the image
nix build .#docker-image

# Load into Docker
docker load < result

# Run with docker-compose
docker-compose up
```

Or use the pre-built image from CI:

```bash
docker pull ghcr.io/Rafie97/shopapp:latest
docker-compose up
```

## Secrets Management

### NixOS: SOPS Integration

```yaml
# secrets/secrets.yaml (encrypted with sops)
shopapp:
  jwt-secret: ENC[AES256_GCM,...]
  db-password: ENC[AES256_GCM,...]
```

```nix
# In NixOS config
sops = {
  defaultSopsFile = ./secrets/secrets.yaml;
  age.keyFile = "/var/lib/sops/age-key.txt";
  secrets = {
    "shopapp/jwt-secret" = { owner = "shopapp"; };
    "shopapp/db-password" = { owner = "shopapp"; };
  };
};
```

### Docker: Environment Variables

For Docker users, secrets come from environment:

```yaml
# docker-compose.yml
services:
  shopapp:
    image: shopapp:latest
    environment:
      - DATABASE_PASSWORD=${DATABASE_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
```

## Migration Path

### From Current Docker Setup

1. **Keep docker-compose.yml** for non-Nix users
2. **Add flake.nix** with the new structure
3. **Create nix/ directory** with module and package
4. **Update docker-compose.yml** to use Nix-built image:

```yaml
services:
  app-server:
    # Instead of: build: .
    image: shopapp:latest
```

5. **Add CI** to build and push Docker image from Nix

### Files to Remove Eventually

Once fully migrated, these become optional:
- `Dockerfile` (replaced by `nix/docker-image.nix`)
- `start-dev.sh` credential generation (replaced by auto-generated secrets)

## Benefits Summary

| Aspect | Docker-First (Old) | NixOS-First (New) |
|--------|-------------------|-------------------|
| Source of truth | Multiple files | Single flake |
| Secrets | .env files | SOPS encrypted |
| Reproducibility | Dockerfile layers | Nix derivations |
| Image size | ~500MB+ | ~100MB (layered) |
| Local DNS | Manual avahi | Built into module |
| Updates | Rebuild image | `nixos-rebuild` |
| Rollback | Manual | `nixos-rebuild --rollback` |
| Multi-arch | Separate builds | One flake, all arches |

## Next Steps

1. [ ] Create `flake.nix` skeleton
2. [ ] Implement `nix/package.nix`
3. [ ] Implement `nix/module.nix`
4. [ ] Implement `nix/docker-image.nix`
5. [ ] Test NixOS deployment locally
6. [ ] Add CI for Docker image builds
7. [ ] Update README with new deployment options
