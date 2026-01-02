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
      description = "Domain for the shopping web app";
    };

    connectDomain = mkOption {
      type = types.str;
      default = "connect.local";
      example = "connect.home.local";
      description = "Domain for the QR code / connection page (displayed in-store)";
    };

    ports = {
      api = mkOption {
        type = types.port;
        default = 8081;
        description = "Port for the API/connect server";
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
      type = types.nullOr types.path;
      default = null;
      description = ''
        Path to file containing JWT secret for authentication.
        If null and autoGenerateJwtSecret is true, a secret will be auto-generated.
        For production, use SOPS: config.sops.secrets."scanapp/jwt-secret".path
      '';
    };

    autoGenerateJwtSecret = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Automatically generate a JWT secret if jwtSecretFile is not specified.
        The secret is stored persistently in the data directory.
        Set to false if you want to manage secrets with SOPS/agenix.
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

  config = mkIf cfg.enable (let
    # Determine JWT secret path: user-provided or auto-generated
    jwtSecretPath = if cfg.jwtSecretFile != null
      then cfg.jwtSecretFile
      else "${cfg.storage.dataDir}/jwt-secret";
  in {
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
      documentation = [ "https://github.com/Rafie97/scan-containers" ];
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ] ++ lib.optional cfg.database.createLocally "postgresql.service";
      requires = lib.optional cfg.database.createLocally "postgresql.service";

      environment = {
        NODE_ENV = "production";
        DATABASE_HOST = cfg.database.host;
        DATABASE_NAME = cfg.database.name;
        DATABASE_USER = cfg.database.user;
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

      # Generate JWT secret if needed, then start the server
      script = ''
        # Auto-generate JWT secret if it doesn't exist
        if [ ! -f "${jwtSecretPath}" ] && [ "${toString cfg.autoGenerateJwtSecret}" = "1" ]; then
          echo "Generating JWT secret..."
          ${pkgs.openssl}/bin/openssl rand -base64 48 > "${jwtSecretPath}"
          chmod 600 "${jwtSecretPath}"
        fi

        export JWT_SECRET="$(cat ${jwtSecretPath})"
        exec ${cfg.package}/bin/scanapp-server
      '';
    };

    # Nginx reverse proxy
    services.nginx = mkIf cfg.nginx.enable {
      enable = true;
      recommendedProxySettings = true;
      recommendedOptimisation = true;
      recommendedGzipSettings = true;

      # Shopping app - static files
      virtualHosts.${cfg.domain} = {
        forceSSL = cfg.nginx.enableSSL;
        enableACME = cfg.nginx.enableSSL;

        root = "${cfg.package}/lib/scanapp/dist";

        # API routes - proxy to Node server
        locations."/api/" = {
          proxyPass = "http://127.0.0.1:${toString cfg.ports.api}";
          proxyWebsockets = true;
          extraConfig = ''
            proxy_read_timeout 60;
          '';
        };

        # Static assets - cache aggressively
        locations."/_expo/" = {
          extraConfig = ''
            expires 1y;
            add_header Cache-Control "public, immutable";
          '';
        };

        locations."/assets/" = {
          extraConfig = ''
            expires 1y;
            add_header Cache-Control "public, immutable";
          '';
        };

        # Web app - serve static files, fallback to index.html for SPA routing
        locations."/" = {
          tryFiles = "$uri $uri/ /index.html";
        };
      };

      # Connect page - QR codes for in-store display
      virtualHosts.${cfg.connectDomain} = {
        forceSSL = cfg.nginx.enableSSL;
        enableACME = cfg.nginx.enableSSL;

        locations."/" = {
          proxyPass = "http://127.0.0.1:${toString cfg.ports.api}";
          proxyWebsockets = true;
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
      extraServiceFiles = {
        scanapp-shop = ''
          <?xml version="1.0" standalone='no'?>
          <!DOCTYPE service-group SYSTEM "avahi-service.dtd">
          <service-group>
            <name>Scan App - Shop</name>
            <service>
              <type>_http._tcp</type>
              <port>80</port>
              <txt-record>path=/</txt-record>
              <txt-record>type=shop</txt-record>
            </service>
          </service-group>
        '';
        scanapp-connect = ''
          <?xml version="1.0" standalone='no'?>
          <!DOCTYPE service-group SYSTEM "avahi-service.dtd">
          <service-group>
            <name>Scan App - Connect</name>
            <service>
              <type>_http._tcp</type>
              <port>80</port>
              <txt-record>path=/</txt-record>
              <txt-record>type=connect</txt-record>
            </service>
          </service-group>
        '';
      };
    };

    # Publish additional hostnames via mDNS
    systemd.services.scanapp-avahi-cnames = mkIf cfg.avahi.enable {
      description = "Publish Scan App mDNS hostnames";
      wantedBy = [ "multi-user.target" ];
      after = [ "avahi-daemon.service" "network-online.target" ];
      requires = [ "avahi-daemon.service" ];
      wants = [ "network-online.target" ];

      path = [ pkgs.avahi pkgs.iproute2 pkgs.gawk ];

      serviceConfig = {
        Type = "simple";
        Restart = "always";
        RestartSec = 5;
      };

      script = let
        shopHost = builtins.head (lib.splitString "." cfg.domain);
        connectHost = builtins.head (lib.splitString "." cfg.connectDomain);
      in ''
        IP=$(ip -4 addr show | grep -oP '(?<=inet\s)192\.\d+\.\d+\.\d+' | head -1)
        if [ -z "$IP" ]; then
          IP=$(hostname -I | awk '{print $1}')
        fi
        echo "Publishing mDNS hostnames for IP: $IP"
        avahi-publish -a -R ${shopHost}.local "$IP" &
        avahi-publish -a -R ${connectHost}.local "$IP" &
        wait
      '';
    };
  });
}
