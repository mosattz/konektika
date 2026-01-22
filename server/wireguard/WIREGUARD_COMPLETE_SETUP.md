# Konektika WireGuard Complete Setup Guide

## 🎉 Why WireGuard?

✅ **Much Simpler** - No complex certificates like OpenVPN
✅ **Faster** - Better performance and lower latency  
✅ **Modern** - Built into Linux kernel (5.6+)
✅ **Easy Keys** - Just public/private key pairs
✅ **Better Mobile** - Excellent iOS/Android apps

## Current Status

### ✅ Completed:
- WireGuard installed on Ubuntu
- Server keys generated
- Configuration file created
- Backend code updated to use WireGuard
- wireguardManager.js created

### 🔧 To Do:
- Start WireGuard server
- Update Render environment variables
- Test with mobile app

## Step 1: Start WireGuard Server

Run this command:

```bash
cd /home/mosatinc/mosatinc/konektika/server/wireguard
sudo ./setup-wireguard.sh
```

Or manually:

```bash
# Copy config
sudo cp /home/mosatinc/mosatinc/konektika/server/wireguard/wg0.conf /etc/wireguard/wg0.conf
sudo chmod 600 /etc/wireguard/wg0.conf

# Enable IP forwarding  
sudo sysctl -w net.ipv4.ip_forward=1

# Allow firewall
sudo ufw allow 51820/udp

# Start WireGuard
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
```

## Step 2: Verify WireGuard is Running

```bash
# Check status
sudo systemctl status wg-quick@wg0

# View WireGuard interface
sudo wg show wg0

# Should see:
# interface: wg0
#   public key: MnCNzbqBakBqxeb31i8A4KisTkO3ZD2/yTiGZnuLHlA=
#   private key: (hidden)
#   listening port: 51820
```

## Step 3: Update Render Environment Variables

Go to: https://dashboard.render.com

Add these environment variables to your backend service:

```bash
VPN_SERVER_IP=154.74.176.31
VPN_SERVER_PORT=51820
WG_SERVER_PUBLIC_KEY=MnCNzbqBakBqxeb31i8A4KisTkO3ZD2/yTiGZnuLHlA=
```

Click "Save" - Render will auto-redeploy.

## Step 4: Test VPN Config Generation

Once Render redeploys, test if VPN config generation works:

```bash
# Get auth token from mobile app or previous curl command
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Try to generate config
curl -X POST "https://konektika.online/api/vpn/generate-config" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bundle_id": 1}' | jq

# Should return success with WireGuard config!
```

## Step 5: Test from Mobile App

1. **Make a payment** or use existing subscription
2. **Go to VPN Configs** screen in app
3. **Download the config** - it will be a WireGuard config (not OpenVPN)
4. **Import to WireGuard app**:
   - Android: Install "WireGuard" app from Play Store
   - iOS: Install "WireGuard" app from App Store
5. **Connect!**

## WireGuard Config Format

Users will get a config like this:

```ini
[Interface]
# Konektika WireGuard Client Configuration
# User ID: 3, Bundle ID: 1
Address = 10.8.0.2/32
PrivateKey = <client_private_key>
DNS = 8.8.8.8, 8.8.4.4

[Peer]
PublicKey = MnCNzbqBakBqxeb31i8A4KisTkO3ZD2/yTiGZnuLHlA=
Endpoint = 154.74.176.31:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
```

## System Architecture

```
User's Phone (WireGuard App)
    ↓
    | UDP Port 51820
    ↓
YOUR Ubuntu PC (154.74.176.31)
    ├─ WireGuard Interface (wg0)
    ├─ IP: 10.8.0.1/24
    └─ Routes traffic to internet
```

```
Payment Flow:
User Pays → Render Backend → Database
    ↓
Subscription Created
    ↓
wireguardManager.generateClientConfig()
    ↓
Generate Keys (wg genkey)
    ↓
Store Config in Database
    ↓
User Downloads from App
    ↓
Connects to YOUR PC
```

## Monitoring

### View connected clients:
```bash
sudo wg show wg0
```

### View logs:
```bash
sudo journalctl -u wg-quick@wg0 -f
```

### See active connections:
```bash
sudo wg show wg0 peers
```

## Troubleshooting

### WireGuard won't start
```bash
# Check config syntax
sudo wg-quick up wg0

# Check logs
sudo journalctl -u wg-quick@wg0 -n 50
```

### Clients can't connect
```bash
# Check if port is open
sudo ss -tulpn | grep 51820

# Check firewall
sudo ufw status

# Verify IP forwarding
cat /proc/sys/net/ipv4/ip_forward  # Should show: 1
```

### No internet after connecting
```bash
# Check NAT rules
sudo iptables -t nat -L -n -v | grep MASQUERADE

# Verify interface
ip addr show wg0
```

## Key Files

- **Server Config:** `/etc/wireguard/wg0.conf`
- **Server Keys:** `/home/mosatinc/mosatinc/konektika/server/wireguard/keys/`
- **Backend Manager:** `/home/mosatinc/mosatinc/konektika/server/utils/wireguardManager.js`

## Stop OpenVPN (if running)

Since we switched to WireGuard, stop OpenVPN:

```bash
sudo systemctl stop konektika-vpn
sudo systemctl disable konektika-vpn
```

## Advantages Over OpenVPN

| Feature | WireGuard | OpenVPN |
|---------|-----------|---------|
| Setup Complexity | ⭐⭐⭐⭐⭐ Simple | ⭐⭐ Complex |
| Performance | ⭐⭐⭐⭐⭐ Fast | ⭐⭐⭐ Moderate |
| Battery Usage | ⭐⭐⭐⭐⭐ Efficient | ⭐⭐⭐ Higher |
| Code Size | ~4,000 lines | ~100,000 lines |
| Key Management | Simple keys | Complex certs |
| Reconnection | Seamless | Can be slow |

## Next Steps

1. Run the setup script above
2. Update Render variables
3. Test config generation
4. Try connecting from mobile app
5. Monitor with `sudo wg show wg0`

---

**Your server public key:** `MnCNzbqBakBqxeb31i8A4KisTkO3ZD2/yTiGZnuLHlA=`

**Ready to go!** 🚀
