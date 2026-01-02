{
  description = "NixOS configuration with Scan Containers";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    scanapp.url = "github:Rafie97/scan-containers";
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
            # That's it! JWT secret auto-generates on first start.

            # Optional: customize ports
            # ports.api = 8081;
            # ports.app = 8082;

            # Optional: use SOPS for secrets (production)
            # autoGenerateJwtSecret = false;
            # jwtSecretFile = config.sops.secrets."scanapp/jwt-secret".path;

            # Optional: use external database
            # database.createLocally = false;
            # database.host = "postgres.example.com";
            # database.passwordFile = config.sops.secrets."scanapp/db-password".path;
          };
        })
      ];
    };
  };
}
