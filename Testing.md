To test cold start on boot

  curl http://127.0.0.1:8081/api/health

  # Check if avahi hostname publishing is working
  systemctl status shopapp-avahi-hostname
  journalctl -u shopapp-avahi-hostname -b

  # Can you resolve the .local hostname?
  avahi-resolve -n shop.home.local

