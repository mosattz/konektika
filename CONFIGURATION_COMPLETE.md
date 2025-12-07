# Konektika VPN - Configuration Complete! 🎉

## ✅ What Has Been Configured

### 1. System Requirements ✅
- **Node.js v18.19.1** installed
- **npm v9.2.0** installed  
- **MySQL 8.0.44** configured and running
- **OpenVPN 2.6.14** installed
- **Easy-RSA** installed for certificate management

### 2. Database Setup ✅
- Database `konektika` created
- User `konektika_user` created with full privileges
- Schema imported with all tables:
  - users (owner + clients)
  - bundles (data packages)
  - vpn_configs (VPN configurations)
  - vpn_connections (connection tracking)
  - payments (payment records)
  - subscriptions (user subscriptions)
  - settings (system configuration)
- **Default bundles seeded:**
  - Daily Bundle: 5GB / 1 day / TZS 1,000
  - Weekly Bundle: 20GB / 7 days / TZS 3,000
  - Monthly Bundle: 100GB / 30 days / TZS 17,000
  - Premium 3-Month: 500GB / 90 days / TZS 45,000
- **Owner account created:**
  - Email: owner@konektika.com
  - Password: admin123

### 3. Environment Configuration ✅
- Server IP updated: **10.165.221.165**
- OpenVPN paths updated for Linux:
  - `/home/mosat/konektika/server/openvpn`
  - `/home/mosat/konektika/server/openvpn/keys`
  - `/home/mosat/konektika/server/openvpn/configs`
- Database credentials configured
- JWT secrets in place

### 4. OpenVPN PKI Setup ✅
- **Certificate Authority (CA)** created
- **Server certificate and key** generated
- **Diffie-Hellman parameters** generated (2048-bit)
- **TLS authentication key** created
- All certificates copied to `/home/mosat/konektika/server/openvpn/keys/`

### 5. OpenVPN Server Configuration ✅
- Server configuration file: `/home/mosat/konektika/server/openvpn/server.conf`
- Network: 10.8.0.0/24 (VPN subnet)
- Port: 1194 UDP
- DNS: 8.8.8.8, 8.8.4.4
- Encryption: AES-256-GCM with SHA256 authentication
- Max clients: 100

### 6. Network Configuration ✅
- **IP forwarding enabled** (persistent)
- **iptables NAT configured** for internet sharing
- **Firewall rules** set up:
  - OpenVPN port 1194/UDP allowed
  - Traffic forwarding from VPN subnet (10.8.0.0/24)
  - Masquerading enabled on interface wlp1s0

### 7. Backend Server ✅
- Dependencies installed (464 packages)
- Server tested and working on port 3000
- Health endpoint verified: http://localhost:3000/health
- API endpoints functional:
  - `/api/bundles` - returns all 4 bundles
  - `/api/auth/*` - authentication endpoints
  - `/api/payments/*` - payment endpoints
  - `/api/vpn/*` - VPN management endpoints

### 8. Mobile App ✅
- Dependencies installed (908 packages)
- API endpoint configured: `http://10.165.221.165:3000/api`
- Ready for development build

---

## 🚀 How to Use Your VPN System

### Starting the Backend Server

```bash
cd /home/mosat/konektika/server
node server.js
```

The server will start on port 3000 and connect to the database.

**Keep it running in a terminal or use PM2:**
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start server with PM2
cd /home/mosat/konektika/server
pm2 start server.js --name konektika-server

# View logs
pm2 logs konektika-server

# Stop server
pm2 stop konektika-server
```

### Starting the OpenVPN Server

```bash
# Start OpenVPN server
sudo openvpn --config /home/mosat/konektika/server/openvpn/server.conf

# Or run in background with systemd
sudo cp /home/mosat/konektika/server/openvpn/server.conf /etc/openvpn/server/konektika.conf
sudo systemctl enable openvpn-server@konektika
sudo systemctl start openvpn-server@konektika
sudo systemctl status openvpn-server@konektika
```

### Running the Mobile App (Development)

**Android:**
```bash
cd /home/mosat/konektika/KonektikaMobile

# Start Metro bundler
npm start

# In another terminal, run on Android device/emulator
npm run android
```

**iOS (requires macOS):**
```bash
cd /home/mosat/konektika/KonektikaMobile
npm run ios
```

### Generating VPN Client Certificates

When a user purchases a bundle through the app, the backend will automatically generate a client certificate. You can also generate one manually:

```bash
cd /home/mosat/konektika/server/openvpn/easy-rsa

# Generate client certificate (replace 'client-name' with actual username)
./easyrsa build-client-full client-name nopass

# Certificates will be in:
# - pki/issued/client-name.crt
# - pki/private/client-name.key
```

---

## 📱 Testing the Complete Flow

### 1. Test Backend APIs

```bash
# Health check
curl http://localhost:3000/health

# Get bundles
curl http://localhost:3000/api/bundles

# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+255712345678",
    "password": "password123",
    "full_name": "Test User"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 2. Test on Mobile Device

1. **Connect your Android device/emulator to the same network** as your PC (10.165.221.165)
2. **Start the backend server** (keep it running)
3. **Run the mobile app** with `npm run android`
4. **Register a new account** in the app
5. **Browse bundles** and view bundle details
6. **Purchase a bundle** (payment will be simulated in dev mode)
7. **Download VPN config** from the app
8. **Import config** into OpenVPN app on Android

### 3. Test VPN Connection

1. Install **OpenVPN Connect** or **OpenVPN for Android** from Play Store
2. Import the downloaded .ovpn file
3. Connect to the VPN
4. Verify you have internet access through the VPN
5. Check your IP address (should show your PC's IP)

---

## 🔧 Important Configuration Files

| File | Purpose |
|------|---------|
| `/home/mosat/konektika/server/.env` | Environment variables and secrets |
| `/home/mosat/konektika/server/server.js` | Main backend server |
| `/home/mosat/konektika/server/openvpn/server.conf` | OpenVPN server config |
| `/home/mosat/konektika/server/openvpn/keys/` | SSL/TLS certificates |
| `/home/mosat/konektika/KonektikaMobile/src/config/api.ts` | Mobile app API config |

---

## 📊 Server Information

| Component | Value |
|-----------|-------|
| **Server IP** | 10.165.221.165 |
| **Backend API Port** | 3000 |
| **VPN Server Port** | 1194 (UDP) |
| **VPN Subnet** | 10.8.0.0/24 |
| **Database** | konektika (MySQL) |
| **Network Interface** | wlp1s0 |

---

## 🔐 Default Credentials

### Database
- **Host:** localhost
- **Database:** konektika
- **User:** konektika_user
- **Password:** konektika_pass_2024

### Admin Account (Backend)
- **Email:** owner@konektika.com
- **Password:** admin123
- **Type:** Owner

---

## 🛠️ Troubleshooting

### Backend won't start
```bash
# Check if port 3000 is already in use
netstat -tuln | grep 3000

# Check database connection
mysql -u konektika_user -pkonektika_pass_2024 -e "SHOW DATABASES;"

# View server logs
cd /home/mosat/konektika/server
node server.js
```

### OpenVPN won't start
```bash
# Test configuration
sudo openvpn --config /home/mosat/konektika/server/openvpn/server.conf

# Check if port 1194 is available
sudo netstat -tuln | grep 1194

# Verify IP forwarding is enabled
sysctl net.ipv4.ip_forward

# Check firewall rules
sudo iptables -t nat -L -n -v
```

### Mobile app can't connect
- Verify backend is running: `curl http://10.165.221.165:3000/health`
- Check firewall allows connections on port 3000
- Ensure device is on same network
- Check API config in `KonektikaMobile/src/config/api.ts`

### VPN clients can't connect
- Verify OpenVPN server is running
- Check firewall allows UDP port 1194
- Verify IP forwarding is enabled
- Check client certificate is valid
- Verify NAT/masquerading is configured

---

## 📝 Next Steps

### 1. Set Up Automatic Startup
Configure both services to start automatically on boot:

```bash
# For backend (using PM2)
pm2 startup
pm2 save

# For OpenVPN (using systemd)
sudo systemctl enable openvpn-server@konektika
```

### 2. Configure Payment Gateway
Update PesaPal credentials in `.env`:
```bash
PESAPAL_CONSUMER_KEY=your_key
PESAPAL_CONSUMER_SECRET=your_secret
PESAPAL_IPN_ID=your_ipn_id
```

### 3. Set Up SSL/HTTPS
For production, secure your backend API with SSL:
```bash
# Install certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com
```

### 4. Monitor & Logging
- Set up log rotation for OpenVPN logs
- Monitor backend with PM2
- Set up database backups

### 5. Security Hardening
- Change default passwords
- Use strong JWT secrets
- Configure rate limiting
- Set up fail2ban for SSH
- Regular security updates

---

## 🎯 Project Status

✅ **Backend Server** - Fully configured and tested  
✅ **Database** - Schema loaded with seed data  
✅ **OpenVPN Server** - PKI created, config ready  
✅ **Network Configuration** - IP forwarding and NAT enabled  
✅ **Mobile App** - Dependencies installed, API configured  

**Ready for development and testing!**

---

## 📚 Documentation

- Backend API: Check `/home/mosat/konektika/PROJECT_COMPLETE.md`
- Bundle Pricing: Check `/home/mosat/konektika/BUNDLE_PRICING.md`
- Database Schema: Check `/home/mosat/konektika/database/schema.sql`

---

**Built with ❤️ for internet sharing via VPN**

*Configuration completed on: December 7, 2025*
