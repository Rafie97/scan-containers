{
  description = "NixOS configuration with Scan Containers";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    scanapp.url = "github:youruser/scan-containers";
  };

  outputs = { self, nixpkgs, scanapp }: {
    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        # Import the scanapp NixOS module
        scanapp.nixosModules.scanapp

        # Your configuration
        ({ config, pkgs, ... }: {
          # Enable the service
          services.scanapp = {
            enable = true;
            domain = "shop.home.local";

            # JWT secret file (required)
            # For SOPS users: config.sops.secrets."scanapp/jwt-secret".path
            jwtSecretFile = "/run/secrets/scanapp-jwt";

            # Optional: customize ports
            # ports.api = 8081;
            # ports.app = 8082;

            # Optional: use external database
            # database.createLocally = false;
            # database.host = "postgres.example.com";
            # database.passwordFile = config.sops.secrets."scanapp/db-password".path;
          };

          # Example SOPS secrets configuration (if using sops-nix)
          # sops.secrets."scanapp/jwt-secret" = {};
          # sops.secrets."scanapp/db-password" = {};
        })
      ];
    };
  };
}
