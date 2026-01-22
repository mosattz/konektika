#!/bin/bash
# Konektika OpenVPN Server Setup Script
# Run this with: sudo bash setup-vpn-server.sh

set -e

echo "=== Konektika OpenVPN Server Setup ==="
echo ""

# Enable IP forwarding
echo "1. Enabling IP forwarding..."
sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf

# Configure firewall (UFW)
echo "2. Configuring firewall..."
# Allow OpenVPN port
ufw allow 1194/udp
ufw allow OpenSSH

# Get primary network interface
PRIMARY_IFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
echo "Primary interface detected: $PRIMARY_IFACE"

# Configure NAT for VPN clients
echo "3. Setting up NAT/masquerading..."
iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o $PRIMARY_IFACE -j MASQUERADE

# Make iptables rules persistent
if command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
fi

# Set correct permissions for OpenVPN keys
echo "4. Setting permissions..."
chmod 600 /home/mosatinc/mosatinc/konektika/server/openvpn/keys/server.key
chmod 644 /home/mosatinc/mosatinc/konektika/server/openvpn/keys/ca.crt
chmod 644 /home/mosatinc/mosatinc/konektika/server/openvpn/keys/server.crt

# Test OpenVPN configuration
echo "5. Testing OpenVPN configuration..."
openvpn --config /home/mosatinc/mosatinc/konektika/server/openvpn/server.conf --test-crypto || true

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "To start OpenVPN server manually:"
echo "  sudo openvpn --config /home/mosatinc/mosatinc/konektika/server/openvpn/server.conf"
echo ""
echo "Or install as systemd service:"
echo "  sudo cp /home/mosatinc/mosatinc/konektika/server/openvpn/konektika-vpn.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable konektika-vpn"
echo "  sudo systemctl start konektika-vpn"
echo ""
echo "Your VPN server IP: $(curl -s ifconfig.me)"
echo "Update this in Render: VPN_SERVER_IP=<IP_ABOVE>"
echo ""
