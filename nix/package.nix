# nix/package.nix
# Builds the scanapp-server as a Nix package
{ lib
, buildNpmPackage
, nodejs_20
, makeWrapper
}:

buildNpmPackage rec {
  pname = "scanapp-server";
  version = "0.1.0";

  src = ./..;

  # Generate with: nix run nixpkgs#prefetch-npm-deps -- package-lock.json
  npmDepsHash = "sha256-S14iXwJpEbRgysct136cOcCJLAFm4Lt07ruJxDEKFXQ=";

  # Allow npm to write to cache during install
  makeCacheWritable = true;

  # Don't run npm build (no build script needed for this server)
  dontNpmBuild = true;

  # Use Node.js 20
  nodejs = nodejs_20;

  nativeBuildInputs = [ makeWrapper ];

  installPhase = ''
    runHook preInstall

    mkdir -p $out/{bin,lib/scanapp}

    # Copy server and dependencies
    cp -r node_modules $out/lib/scanapp/
    cp server.node.mjs $out/lib/scanapp/
    cp -r db $out/lib/scanapp/

    # Create wrapper script that sets up the environment
    makeWrapper ${nodejs_20}/bin/node $out/bin/scanapp-server \
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
}
