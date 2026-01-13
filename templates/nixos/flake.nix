{
  description = "NixOS configuration with Shop App";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    shopapp.url = "github:Rafie97/scan-containers";
  };

  outputs = { self, nixpkgs, shopapp }: {
    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        # Import the shopapp NixOS module
        shopapp.nixosModules.shopapp

        # Your configuration
        ({ config, pkgs, ... }: {
          # Enable the service
          services.shopapp = {
            enable = true;
            domain = "shop.home.local";
            # That's it! JWT secret auto-generates on first start.

            # Optional: customize ports
            # ports.api = 8081;
            # ports.app = 8082;

            # Optional: use SOPS for secrets (production)
            # autoGenerateJwtSecret = false;
            # jwtSecretFile = config.sops.secrets."shopapp/jwt-secret".path;

            # Optional: use external database
            # database.createLocally = false;
            # database.host = "postgres.example.com";
            # database.passwordFile = config.sops.secrets."shopapp/db-password".path;
          };
        })
      ];
    };
  };
}
