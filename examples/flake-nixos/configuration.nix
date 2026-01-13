# Edit this configuration file to define what should be installed on
# your system.  Help is available in the configuration.nix(5) man page
# and in the NixOS manual (accessible by running 'nixos-help').

{ config, pkgs, unstable, ... }:  # unstable comes from specialArgs in flake.nix

{
  imports = [
    ./hardware-configuration.nix
    # shopapp module is imported in flake.nix
  ];

  services.shopapp = {
    enable = true;
    domain = "shop.local";
  };

  nix = {
    extraOptions = ''
      experimental-features = nix-command flakes
    '';
  };

  # Bootloader
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;

  # Kernel
  boot.kernelPackages = pkgs.linuxPackages_6_12;
  boot.kernelModules = [ "nvidia" "nvidia_modeset" "nvidia_uvm" "nvidia_drm" ];
  boot.kernelParams = [
    "nvidia-drm.modeset=1"
    "nvidia-drm.fbdev=1"
  ];

  networking.hostName = "nixos";
  networking.networkmanager.enable = true;

  networking.hosts = {
    "127.0.0.1" = ["rafa.local"];
    "192.168.8.141" = ["rafa.area"];
  };

  services.avahi = {
    enable = true;
    publish = {
      enable = true;
      addresses = true;
      workstation = true;
    };
  };

  virtualisation.docker = {
    enable = true;
    enableOnBoot = false;
  };

  time.timeZone = "America/Chicago";

  i18n.defaultLocale = "en_US.UTF-8";
  i18n.extraLocaleSettings = {
    LC_ADDRESS = "en_US.UTF-8";
    LC_IDENTIFICATION = "en_US.UTF-8";
    LC_MEASUREMENT = "en_US.UTF-8";
    LC_MONETARY = "en_US.UTF-8";
    LC_NAME = "en_US.UTF-8";
    LC_NUMERIC = "en_US.UTF-8";
    LC_PAPER = "en_US.UTF-8";
    LC_TELEPHONE = "en_US.UTF-8";
    LC_TIME = "en_US.UTF-8";
  };

  # X11/XWayland
  services.xserver.enable = true;
  services.xserver.videoDrivers = [ "nvidia" ];

  # Plasma 6 (Wayland)
  services.displayManager.sddm.enable = true;
  services.displayManager.sddm.wayland.enable = true;
  services.desktopManager.plasma6.enable = true;

  services.xserver.xkb = {
    layout = "us";
    variant = "";
  };

  environment.sessionVariables = {
    LIBVA_DRIVER_NAME = "nvidia";
    XDG_SESSION_TYPE = "wayland";
    GBM_BACKEND = "nvidia-drm";
    __GLX_VENDOR_LIBRARY_NAME = "nvidia";
    NIXOS_OZONE_WL = "1";
  };

  # Graphics
  hardware.graphics = {
    enable = true;
    enable32Bit = true;
  };

  hardware.nvidia = {
    modesetting.enable = true;
    powerManagement.enable = false;
    powerManagement.finegrained = false;
    open = true;
    nvidiaSettings = true;

    package = config.boot.kernelPackages.nvidiaPackages.mkDriver {
      version = "570.86.16";
      sha256_64bit = "sha256-RWPqS7ZUJH9JEAWlfHLGdqrNlavhaR1xMyzs8lJhy9U=";
      sha256_aarch64 = "sha256-RiO2njJ+z0DYBo/1DKa9rUy260064k1TWpKFSNS309k=";
      openSha256 = "sha256-DuVNA63+pJ8IB7Tw2gM4HbwlOh1bcDg2AN2mbEU9VPE=";
      settingsSha256 = "sha256-9rtqh64TyhDF5fFAYiWl3oDHzKJqyOW3abpcf2iNRT8=";
      persistencedSha256 = "sha256-3mp9X/oV8o2pV9zvXBdFTkxyKOImqQt0hazfJ7HR0UA=";
    };
  };

  # PostgreSQL & Gitea
  services.postgresql = {
    enable = true;
    package = pkgs.postgresql_15;
    ensureDatabases = [ "gitea" ];
    ensureUsers = [ { name = "gitea"; } ];
  };

  services.gitea = {
    enable = true;
    appName = "Rafa Git";
    database = {
      type = "postgres";
      host = "/run/postgresql";
      name = "gitea";
      user = "gitea";
      passwordFile = "/etc/nixos/gitea-db-password";
    };
    settings = {
      server = {
        DOMAIN = "rafa.area";
        ROOT_URL = "http://rafa.area:3000/";
        HTTP_PORT = 3000;
        HTTP_ADDR = "0.0.0.0";
        SSH_DOMAIN = "localhost";
        SSH_PORT = 2222;
        SSH_LISTEN_PORT = 2222;
      };
      service = {
        DISABLE_REGISTRATION = false;
        REQUIRE_SIGNIN_VIEW = false;
      };
    };
  };

  networking.firewall.allowedTCPPorts = [ 3000 2222 ];

  services.printing.enable = true;

  hardware.pulseaudio.enable = false;
  security.rtkit.enable = true;
  services.pipewire = {
    enable = true;
    alsa.enable = true;
    alsa.support32Bit = true;
    pulse.enable = true;
  };

  users.users.rafa = {
    isNormalUser = true;
    description = "Rafa";
    extraGroups = [ "networkmanager" "wheel" "docker" ];
    packages = with pkgs; [
      kdePackages.kate
      pciutils
      glxinfo
    ];
  };

  programs.firefox.enable = true;

  programs.starship = {
    enable = true;
    settings = {
      nix_shell = {
        format = "via [$symbol$state]($style) ";
        symbol = "❄ ";
      };
    };
  };

  nixpkgs.config.allowUnfree = true;

  environment.systemPackages = with pkgs; [
    wget
    git
    vscode
    pwgen
    age
    sops
    lsof
    bun
    nodejs_20
    unstable.claude-code  # Still works! unstable passed via specialArgs
  ];

  system.stateVersion = "24.11";
}
