# Konektika VPN Setup Guide - Windows PC OpenVPN Server

## Overview
After a user makes a successful payment, the system automatically:
1. ✅ Creates an active subscription
2. ✅ Generates an OpenVPN client configuration  
3. ✅ Stores the config in the database
4. ⚠️ **Requires OpenVPN server running on your PC**

## Current System Flow

```
Payment Success 
  ↓
Subscription Activated (PaymentManager.js line 178-268)
  ↓
VPN Config Auto-Generated (vpnManager.js line 122-198)
  ↓
User Downloads Config from Mobile App
  ↓
User Connects to YOUR PC's OpenVPN Server
```

## Prerequisites

### On Your Windows PC:
1. **OpenVPN** installed (community edition)
2. **Public IP address** or dynamic DNS
3. **Port forwarding** configured on router (port 1194 UDP)
4. **Internet sharing** enabled (mobile hotspot or ethernet)

## Step 1: Install OpenVPN on Windows PC

1. Download OpenVPN from: https://openvpn.net/community-downloads/
2. Install with default settings
3. Install location: `C:\Program Files\OpenVPN`

## Step 2: Configure Your PC as VPN Server

### A. Set Environment Variables on Render

Update your Render environment variables:

```bash
VPN_SERVER_IP=<YOUR_PUBLIC_IP>  # e.g., 41.59.23.145
VPN_SERVER_PORT=1194
VPN_PROTOCOL=udp
VPN_SUBNET=10.8.0.0/24
```

**To find your public IP:**
```powershell
# On Windows PC
curl ifconfig.me
```

### B. Configure Router Port Forwarding

1. Log into your router (usually 192.168.1.1 or 192.168.0.1)
2. Find "Port Forwarding" or "Virtual Server" section
3. Add rule:
   - External Port: 1194
   - Internal Port: 1194
   - Protocol: UDP
   - Internal IP: Your PC's local IP (e.g., 192.168.1.100)
   - Enable: Yes

**To find your PC's local IP:**
```powershell
ipconfig | findstr IPv4
```

### C. Setup OpenVPN Server on PC

The server already generated certificates in `/home/mosatinc/mosatinc/konektika/server/openvpn/keys/`. You need to copy them to your Windows PC:

1. **On Linux server, package the certificates:**
```bash
cd /home/mosatinc/mosatinc/konektika/server/openvpn
tar -czf openvpn-server-config.tar.gz keys/ configs/
```

2. **Transfer to Windows PC:**
   - Use SCP, FTP, or copy via USB
   - Extract to: `C:\Program Files\OpenVPN\config\`

3. **Create server config file:**
   - File: `C:\Program Files\OpenVPN\config\server.ovpn`
   - Content:

```conf
# Konektika OpenVPN Server Configuration
port 1194
proto udp
dev tun

# Certificates (update paths if needed)
ca "C:\\Program Files\\OpenVPN\\config\\keys\\ca.crt"
cert "C:\\Program Files\\OpenVPN\\config\\keys\\server.crt"
key "C:\\Program Files\\OpenVPN\\config\\keys\\server.key"
dh "C:\\Program Files\\OpenVPN\\config\\keys\\dh2048.pem"
tls-auth "C:\\Program Files\\OpenVPN\\config\\keys\\ta.key" 0

# Network
server 10.8.0.0 255.255.255.0
ifconfig-pool-persist ipp.txt

# Routing - IMPORTANT: Share your PC's internet
push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS 8.8.4.4"

# Security
cipher AES-256-GCM
auth SHA256
keepalive 10 120
comp-lzo

# Permissions
client-to-client
duplicate-cn

# Logging
verb 3
mute 20
status openvpn-status.log
```

4. **Enable Internet Sharing on Windows:**

```powershell
# Run as Administrator
# Open Network Connections
ncpa.cpl

# Right-click your internet connection (WiFi/Ethernet)
# Properties → Sharing tab
# ✓ Allow other network users to connect
# Select: "Local Area Connection*" (OpenVPN adapter)
```

5. **Start OpenVPN Server:**

```powershell
# Run as Administrator
cd "C:\Program Files\OpenVPN\bin"
.\openvpn-gui.exe --connect server.ovpn
```

Or install as Windows Service:
```powershell
# Run as Administrator
sc create OpenVPNServer binPath= "\"C:\Program Files\OpenVPN\bin\openvpn.exe\" --config \"C:\Program Files\OpenVPN\config\server.ovpn\"" start= auto
sc start OpenVPNServer
```

## Step 3: Test the Setup

### From Mobile App:
1. User completes payment
2. Go to "VPN Configs" screen
3. Download the auto-generated .ovpn file
4. Tap "Connect"
5. Should connect to your PC

### Monitor Connections:
```powershell
# On Windows PC
type "C:\Program Files\OpenVPN\config\openvpn-status.log"
```

## Step 4: Keep Server Running

### Option A: Manual (Testing)
- Keep OpenVPN GUI running
- Don't close or hibernate PC

### Option B: Windows Service (Production)
- Install as service (see above)
- Configure PC to not sleep
- Set OpenVPN service to start automatically

### Option C: Use Cloud VPS (Recommended for Production)
- Deploy OpenVPN on a Linux VPS (DigitalOcean, AWS, etc.)
- Better uptime and reliability
- No need to keep personal PC running 24/7

## Troubleshooting

### Issue: Clients can't connect
**Check:**
1. Firewall allows UDP port 1194
```powershell
netsh advfirewall firewall add rule name="OpenVPN" dir=in action=allow protocol=UDP localport=1194
```

2. Port forwarding is correct on router
3. Public IP is correct in Render env variables

### Issue: Connected but no internet
**Check:**
1. Internet sharing is enabled on Windows
2. OpenVPN TAP adapter is bridged/shared properly
3. DNS push routes are in server config

### Issue: Connection drops frequently
**Check:**
1. PC isn't going to sleep:
```powershell
powercfg -change -standby-timeout-ac 0
powercfg -change -hibernate-timeout-ac 0
```

2. Router has stable internet connection

## Security Considerations

1. **Change default passwords** in router
2. **Keep Windows updated**
3. **Monitor connections** regularly
4. **Revoke client certificates** if user subscription expires
5. **Use strong passwords** for Windows admin account

## Alternative: Cloud VPN Server

If keeping your PC running 24/7 isn't feasible, consider:

1. **DigitalOcean Droplet** ($6/month)
2. **AWS Lightsail** ($3.50/month)  
3. **Vultr VPS** ($5/month)

These will have:
- ✅ Better uptime
- ✅ Higher bandwidth
- ✅ Professional infrastructure
- ✅ No electricity costs

## Summary

**Current Status:**
- ✅ Payment flow works
- ✅ VPN configs auto-generate  
- ✅ Certificates are ready
- ⚠️ **YOU NEED**: OpenVPN server running on your PC (or VPS)

**Next Steps:**
1. Set your PC's public IP in Render environment variables
2. Setup port forwarding on router
3. Copy certificates to Windows PC
4. Start OpenVPN server
5. Test connection from mobile app

---

For questions or issues, check the logs:
- **Backend:** Render dashboard logs
- **OpenVPN:** `C:\Program Files\OpenVPN\log\openvpn.log`
- **Mobile App:** `adb logcat` on Android
