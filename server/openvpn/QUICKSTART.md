# Konektika OpenVPN Server - Quick Start Guide

## Your Setup is Ready!

**Your Public IP:** 154.74.176.31
**VPN Port:** 1194 UDP
**VPN Subnet:** 10.8.0.0/24

## Step 1: Run Setup Script

```bash
cd /home/mosatinc/mosatinc/konektika/server/openvpn
sudo ./setup-vpn-server.sh
```

This will:
- ✅ Enable IP forwarding
- ✅ Configure firewall rules
- ✅ Set up NAT/masquerading
- ✅ Set correct file permissions

## Step 2: Start OpenVPN Server

### Option A: Manual Start (for testing)
```bash
sudo openvpn --config /home/mosatinc/mosatinc/konektika/server/openvpn/server.conf
```

Leave this terminal open. Press Ctrl+C to stop.

### Option B: Install as System Service (recommended)
```bash
sudo cp /home/mosatinc/mosatinc/konektika/server/openvpn/konektika-vpn.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable konektika-vpn
sudo systemctl start konektika-vpn
```

Check status:
```bash
sudo systemctl status konektika-vpn
```

View logs:
```bash
sudo journalctl -u konektika-vpn -f
```

## Step 3: Update Render Environment Variables

Go to Render dashboard and update:
```
VPN_SERVER_IP=154.74.176.31
VPN_SERVER_PORT=1194
VPN_PROTOCOL=udp
```

Then redeploy the backend (Render will do this automatically).

## Step 4: Test from Mobile App

1. User makes a payment
2. Payment succeeds
3. VPN config is auto-generated
4. Go to "VPN Configs" screen in app
5. Tap to download/view config
6. Connect!

## Monitoring

### Check connected clients:
```bash
cat /home/mosatinc/mosatinc/konektika/server/openvpn/logs/openvpn-status.log
```

### View OpenVPN logs:
```bash
tail -f /home/mosatinc/mosatinc/konektika/server/openvpn/logs/openvpn.log
```

### Check if port is open:
```bash
sudo ss -tulpn | grep 1194
```

## Troubleshooting

### VPN server won't start
```bash
# Check config syntax
sudo openvpn --config /home/mosatinc/mosatinc/konektika/server/openvpn/server.conf --test-crypto

# Check if port is already in use
sudo ss -tulpn | grep 1194
```

### Clients can connect but no internet
```bash
# Verify IP forwarding is enabled
cat /proc/sys/net/ipv4/ip_forward  # should show: 1

# Check NAT rules
sudo iptables -t nat -L -n -v
```

### Firewall blocking connections
```bash
# Allow OpenVPN through firewall
sudo ufw allow 1194/udp
sudo ufw status
```

## Security Notes

- Server key is protected (chmod 600)
- Using AES-256-GCM encryption
- TLS authentication enabled
- Running on non-standard subnet (10.8.0.0/24)

## Stop/Restart Service

```bash
# Stop
sudo systemctl stop konektika-vpn

# Restart
sudo systemctl restart konektika-vpn

# Disable autostart
sudo systemctl disable konektika-vpn
```

## Files Location

- **Config:** `/home/mosatinc/mosatinc/konektika/server/openvpn/server.conf`
- **Certificates:** `/home/mosatinc/mosatinc/konektika/server/openvpn/keys/`
- **Logs:** `/home/mosatinc/mosatinc/konektika/server/openvpn/logs/`
- **Service:** `/etc/systemd/system/konektika-vpn.service`

---

**Ready to go!** Run the setup script and start the service.
