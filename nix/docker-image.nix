# nix/docker-image.nix
# Builds a minimal Docker image from the Nix package
{ pkgs
, scanapp-server
, name ? "scanapp"
, tag ? "latest"
}:

pkgs.dockerTools.buildLayeredImage {
  inherit name tag;

  contents = with pkgs; [
    # Runtime dependencies
    nodejs_20
    coreutils
    bash

    # The app itself
    scanapp-server

    # SSL certificates for HTTPS requests
    cacert
  ];

  # Layer configuration for optimal caching
  # Rarely-changing dependencies go in early layers
  maxLayers = 120;

  config = {
    Cmd = [ "${scanapp-server}/bin/scanapp-server" ];

    ExposedPorts = {
      "8081/tcp" = {}; # API server
      "8082/tcp" = {}; # Expo/frontend
    };

    Env = [
      "NODE_ENV=production"
      "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
    ];

    WorkingDir = "/app";

    Labels = {
      "org.opencontainers.image.title" = "Scan Containers";
      "org.opencontainers.image.description" = "Grocery store shopping assistant";
      "org.opencontainers.image.source" = "https://github.com/Rafie97/scan-containers";
    };
  };

  # Extra commands to run in the image context
  extraCommands = ''
    mkdir -p app/db
    cp -r ${scanapp-server}/lib/scanapp/db/* app/db/
  '';
}
