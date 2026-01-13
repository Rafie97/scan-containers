{
  description = "Rafa's NixOS Configuration";

  inputs = {
    # Stable nixpkgs (your base system)
    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.11";

    # Unstable for bleeding-edge packages (claude-code, etc)
    nixpkgs-unstable.url = "github:nixos/nixpkgs/nixos-unstable";

    # Your shop-app
    shopapp = {
      url = "path:/home/rafa/Documents/code/scan-containers";
      # Or use git: url = "git+file:///home/rafa/Documents/code/scan-containers";
    };
  };

  outputs = { self, nixpkgs, nixpkgs-unstable, shopapp, ... }:
  {
    nixosConfigurations.nixos = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";

      # Pass extra arguments to configuration.nix
      specialArgs = {
        inherit shopapp;
        # Create unstable overlay
        unstable = import nixpkgs-unstable {
          system = "x86_64-linux";
          config.allowUnfree = true;
        };
      };

      modules = [
        ./configuration.nix
        shopapp.nixosModules.shopapp
      ];
    };
  };
}
