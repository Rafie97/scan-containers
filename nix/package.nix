# nix/package.nix
# Builds the scanapp-server as a Nix package
{ lib
, buildNpmPackage
, nodejs_22
, makeWrapper
}:

builtins.seq
  (builtins.trace "Shop App Server: Building Expo web app (this may take a few minutes on first build...)" null)
  (buildNpmPackage rec {
    pname = "scanapp-server";
    version = "0.1.0";

    src = ./..;

    # Generate with: nix run nixpkgs#prefetch-npm-deps -- package-lock.json
    npmDepsHash = "sha256-S14iXwJpEbRgysct136cOcCJLAFm4Lt07ruJxDEKFXQ=";

    # Allow npm to write to cache during install
    makeCacheWritable = true;

    # Use Node.js 22
    nodejs = nodejs_22;

    nativeBuildInputs = [ makeWrapper ];

    # Build the Expo web app
    buildPhase = ''
      runHook preBuild
      echo "Building Expo web app..."
      npx expo export --platform web --output-dir dist
      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall

      mkdir -p $out/{bin,lib/scanapp}

      # Copy server and dependencies
      cp -r node_modules $out/lib/scanapp/
      cp server.node.mjs $out/lib/scanapp/
      cp -r db $out/lib/scanapp/

      # Copy built web app
      cp -r dist $out/lib/scanapp/

      # Create wrapper script that sets up the environment
      makeWrapper ${nodejs_22}/bin/node $out/bin/scanapp-server \
        --add-flags "$out/lib/scanapp/server.node.mjs" \
        --set NODE_ENV production

      runHook postInstall
    '';

    meta = with lib; {
      description = "Scan Containers - Grocery store shopping assistant API server";
      homepage = "https://github.com/Rafie97/scan-containers";
      license = licenses.mit;
      platforms = platforms.linux ++ platforms.darwin;
      mainProgram = "scanapp-server";
    };
  })
