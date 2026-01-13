# nix/package.nix
# Builds the shopapp-server as a Nix package
{ lib
, buildNpmPackage
, nodejs_22
, makeWrapper
, domain ? "shop.local"
}:

builtins.seq
  (builtins.trace "Shop App Server: Building Expo web app (this may take a few minutes on first build...)" null)
  (buildNpmPackage rec {
    pname = "shopapp-server";
    version = "0.1.0";

    src = ./..;

    # Generate with: nix run nixpkgs#prefetch-npm-deps -- package-lock.json
    npmDepsHash = "sha256-BwaqIooGLhW3rZGZwjpo7N3XKYhBqz9phnAk4KP19j0=";

    # Allow npm to write to cache during install
    makeCacheWritable = true;

    # Use Node.js 22
    nodejs = nodejs_22;

    nativeBuildInputs = [ makeWrapper ];

    # Build the Expo web app
    buildPhase = ''
      runHook preBuild
      echo "Building Expo web app..."
      export EXPO_PUBLIC_DOMAIN="${domain}"
      npx expo export --platform web --output-dir dist
      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall

      mkdir -p $out/{bin,lib/shopapp}

      # Copy server and dependencies
      cp -r node_modules $out/lib/shopapp/
      cp server.node.mjs $out/lib/shopapp/
      cp -r db $out/lib/shopapp/

      # Copy built web app
      cp -r dist $out/lib/shopapp/

      # Create wrapper script that sets up the environment
      makeWrapper ${nodejs_22}/bin/node $out/bin/shopapp-server \
        --add-flags "$out/lib/shopapp/server.node.mjs" \
        --set NODE_ENV production

      runHook postInstall
    '';

    meta = with lib; {
      description = "Shop App - Grocery store shopping assistant API server";
      homepage = "https://github.com/Rafie97/scan-containers";
      license = licenses.mit;
      platforms = platforms.linux ++ platforms.darwin;
      mainProgram = "shopapp-server";
    };
  })
