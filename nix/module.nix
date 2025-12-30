# nix/module.nix
# NixOS module for Scan Containers
{ config, lib, pkgs, ... }:

let
  cfg = config.services.scanapp;
  inherit (lib) mkEnableOption mkOption mkIf types;
in {
  options.services.scanapp = {
    enable = mkEnableOption "Scan Containers grocery shopping assistant";

    package = mkOption {
      type = types.package;
      default = pkgs.scanapp-server;
      defaultText = "pkgs.scanapp-server";
      description = "The scanapp-server package to use";
    };

    domain = mkOption {
      type = types.str;
      default = "shop.local";
      example = "shop.home.local";
      description = "Domain for the app (used with nginx and avahi)";
    };

    ports = {
      api = mkOption {
        type = types.port;
        default = 8081;
        description = "Port for the API server";
      };
      app = mkOption {
        type = types.port;
        default = 8082;
        description = "Port for the Expo/frontend server";
      };
    };

    database = {
      host = mkOption {
        type = types.str;
        default = "/run/postgresql";
        description = ''
          PostgreSQL host. Use a socket path for local connections
          or a hostname for remote connections.
        '';
      };
      name = mkOption {
        type = types.str;
        default = "scanapp";
        description = "Database name";
      };
      user = mkOption {
        type = types.str;
        default = "scanapp";
        description = "Database user";
      };
      createLocally = mkOption {
        type = types.bool;
        default = true;
        description = "Whether to create the database locally";
      };
      passwordFile = mkOption {
        type = types.nullOr types.path;
        default = null;
        description = ''
          Path to file containing database password.
          Used with SOPS: config.sops.secrets."scanapp/db-password".path
          Not needed for local socket connections with peer auth.
        '';
      };
    };

    jwtSecretFile = mkOption {
      type = types.path;
      description = ''
        Path to file containing JWT secret for authentication.
        Should be managed by SOPS: config.sops.secrets."scanapp/jwt-secret".path
      '';
    };

    storage = {
      dataDir = mkOption {
        type = types.path;
        default = "/var/lib/scanapp";
        description = "Data directory for uploads and assets";
      };
    };

    nginx = {
      enable = mkOption {
        type = types.bool;
        default = true;
        description = "Whether to configure nginx reverse proxy";
      };
      enableSSL = mkOption {
        type = types.bool;
        default = false;
        description = "Whether to enable ACME SSL certificates";
      };
    };

    avahi = {
      enable = mkOption {
        type = types.bool;
        default = true;
        description = "Whether to advertise via mDNS (for .local domains)";
      };
    };

    openFirewall = mkOption {
      type = types.bool;
      default = true;
      description = "Whether to open firewall ports";
    };
  };

  config = mkIf cfg.enable {
    # Ensure the overlay is applied so pkgs.scanapp-server exists
    nixpkgs.overlays = [
      (final: prev: {
        scanapp-server = final.callPackage ./package.nix {};
      })
    ];

    # PostgreSQL database (if local)
    services.postgresql = mkIf cfg.database.createLocally {
      enable = true;
      ensureDatabases = [ cfg.database.name ];
      ensureUsers = [{
        name = cfg.database.user;
        ensureDBOwnership = true;
      }];
      # Schema is initialized by the server on startup (server.node.mjs:initializeDatabase)
    };

    # System user for the service
    users.users.scanapp = {
      isSystemUser = true;
      group = "scanapp";
      home = cfg.storage.dataDir;
      createHome = true;
      description = "Scan Containers service user";
    };
    users.groups.scanapp = {};

    # Create data directory with proper permissions
    systemd.tmpfiles.rules = [
      "d ${cfg.storage.dataDir} 0750 scanapp scanapp -"
    ];

    # Main systemd service
    systemd.services.scanapp-server = {
      description = "Scan Containers API Server";
      documentation = [ "https://github.com/youruser/scan-containers" ];
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ] ++ lib.optional cfg.database.createLocally "postgresql.service";
      requires = lib.optional cfg.database.createLocally "postgresql.service";

      environment = {
        NODE_ENV = "production";
        DATABASE_HOST = cfg.database.host;
        DATABASE_NAME = cfg.database.name;
        DATABASE_USER = cfg.database.user;
        APP_PORT = toString cfg.ports.app;
      } // lib.optionalAttrs cfg.database.createLocally {
        # For local socket connections with peer auth, no password needed
        DATABASE_PASSWORD = "";
      };

      serviceConfig = {
        Type = "simple";
        User = "scanapp";
        Group = "scanapp";
        WorkingDirectory = cfg.storage.dataDir;
        Restart = "always";
        RestartSec = 5;

        # Load password from file if specified (for remote database connections)
        EnvironmentFile = lib.optional (cfg.database.passwordFile != null) cfg.database.passwordFile;

        # Security hardening
        NoNewPrivileges = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        PrivateTmp = true;
        PrivateDevices = true;
        ProtectKernelTunables = true;
        ProtectKernelModules = true;
        ProtectControlGroups = true;
        RestrictSUIDSGID = true;
        RestrictNamespaces = true;
        LockPersonality = true;
        RemoveIPC = true;
        ReadWritePaths = [ cfg.storage.dataDir ];

        # Capability restrictions
        CapabilityBoundingSet = "";
        AmbientCapabilities = "";
      };

      # Load JWT secret from file and start the server
      script = ''
        export JWT_SECRET="$(cat ${cfg.jwtSecretFile})"
        exec ${cfg.package}/bin/scanapp-server
      '';
    };

    # Nginx reverse proxy
    services.nginx = mkIf cfg.nginx.enable {
      enable = true;
      recommendedProxySettings = true;
      recommendedOptimisation = true;
      recommendedGzipSettings = true;

      virtualHosts.${cfg.domain} = {
        forceSSL = cfg.nginx.enableSSL;
        enableACME = cfg.nginx.enableSSL;

        locations."/" = {
          proxyPass = "http://127.0.0.1:${toString cfg.ports.app}";
          proxyWebsockets = true;
          extraConfig = ''
            proxy_read_timeout 86400;
          '';
        };

        locations."/api" = {
          proxyPass = "http://127.0.0.1:${toString cfg.ports.api}";
          extraConfig = ''
            proxy_read_timeout 60;
          '';
        };
      };
    };

    # Firewall rules
    networking.firewall = mkIf cfg.openFirewall {
      allowedTCPPorts = [
        cfg.ports.api
        cfg.ports.app
      ] ++ lib.optionals cfg.nginx.enable [ 80 443 ];
    };

    # Avahi mDNS advertisement
    services.avahi = mkIf cfg.avahi.enable {
      enable = true;
      nssmdns4 = true;
      publish = {
        enable = true;
        domain = true;
        addresses = true;
        userServices = true;
      };
      extraServiceFiles.scanapp = ''
        <?xml version="1.0" standalone='no'?>
        <!DOCTYPE service-group SYSTEM "avahi-service.dtd">
        <service-group>
          <name>Scan Containers</name>
          <service>
            <type>_http._tcp</type>
            <port>${toString cfg.ports.app}</port>
            <txt-record>path=/</txt-record>
            <txt-record>version=0.1.0</txt-record>
          </service>
          <service>
            <type>_scanapp._tcp</type>
            <port>${toString cfg.ports.api}</port>
            <txt-record>api=true</txt-record>
          </service>
        </service-group>
      '';
    };
  };
}
