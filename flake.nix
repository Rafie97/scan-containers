{
  description = "Scan Containers - Grocery store shopping assistant";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    let
      # Supported systems
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      # Version from flake
      version = "0.1.0";

    in
    flake-utils.lib.eachSystem supportedSystems (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ self.overlays.default ];
        };

        # The server package
        scanapp-server = pkgs.callPackage ./nix/package.nix {};

      in {
        # Packages
        packages = {
          default = scanapp-server;
          inherit scanapp-server;
        } // pkgs.lib.optionalAttrs pkgs.stdenv.isLinux {
          # Docker image only on Linux
          docker-image = pkgs.callPackage ./nix/docker-image.nix {
            inherit scanapp-server;
          };
        };

        # Development shell
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Node.js development
            nodejs_20
            nodePackages.npm

            # Database
            postgresql_14

            # Nix tools
            nil           # Nix LSP
            nixpkgs-fmt   # Nix formatter

            # Useful utilities
            jq
            curl
          ];

          shellHook = ''
            echo "Scan Containers Development Shell"
            echo "================================="
            echo "Node.js: $(node --version)"
            echo ""
            echo "Commands:"
            echo "  npm install     - Install dependencies"
            echo "  npm run dev     - Start Expo dev server"
            echo "  npm run server  - Start API server"
            echo ""
            echo "Nix commands:"
            echo "  nix build              - Build the server package"
            echo "  nix build .#docker-image - Build Docker image (Linux only)"
            echo ""
          '';
        };

        # Checks
        checks = {
          package = scanapp-server;
        };
      }
    ) // {
      # NixOS module (not system-specific)
      nixosModules = {
        default = self.nixosModules.scanapp;
        scanapp = import ./nix/module.nix;
      };

      # Overlay for integration into other flakes
      overlays.default = final: prev: {
        scanapp-server = final.callPackage ./nix/package.nix {};
      };

      # Templates for getting started
      templates = {
        default = {
          path = ./templates/nixos;
          description = "NixOS configuration with Scan Containers";
        };
      };
    };
}
