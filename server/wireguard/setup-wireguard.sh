#!/bin/bash
# Konektika WireGuard Setup Script
set -e

echo "=== Konektika WireGuard Server Setup ==="
echo ""

# Copy configuration to system directory
echo "1. Installing WireGuard configuration..."
sudo cp /home/mosatinc/mosatinc/konektika/server/wireguard/wg0.conf /etc/wireguard/wg0.conf
sudo chmod 600 /etc/wireguard/wg0.conf

# Enable IP forwarding
echo "2. Enabling IP forwarding..."
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf

# Configure firewall
echo "3. Configuring firewall..."
sudo ufw allow 51820/udp
sudo ufw allow OpenSSH

# Enable and start WireGuard
echo "4. Starting WireGuard..."
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "WireGuard server is running on:"
echo "  IP: $(curl -s ifconfig.me)"
echo "  Port: 51820/UDP"
echo "  Interface: wg0"
echo ""
echo "Check status with:"
echo "  sudo wg show wg0"
echo "  sudo systemctl status wg-quick@wg0"
echo ""
echo "View logs with:"
echo "  sudo journalctl -u wg-quick@wg0 -f"
echo ""
echo "Update Render environment variables:"
echo "  VPN_SERVER_IP=154.74.176.31"
echo "  VPN_SERVER_PORT=51820"
echo "  WG_SERVER_PUBLIC_KEY=MnCNzbqBakBqxeb31i8A4KisTkO3ZD2/yTiGZnuLHlA="
echo ""
