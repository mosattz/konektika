# Konektika VPN - Ubuntu Migration Guide

## 🎯 Overview

Your Konektika VPN project has been successfully migrated from Windows 11 to Ubuntu! This guide explains what was fixed and how to complete the setup.

## ✅ What Was Fixed

### 1. **Environment Configuration (.env)**
- ✅ Changed Windows paths (`C:/...`) to Linux paths
- ✅ Updated `OPENVPN_DIR` to `/home/mosatinc/mosatinc/konektika/server/openvpn`
- ✅ Updated `OPENVPN_EXECUTABLE` to `/usr/sbin/openvpn`

### 2. **VPN Manager (vpnManager.js)**
- ✅ Replaced Windows `sc query OpenVPN` with Linux `systemctl is-active openvpn`
- ✅ Updated path handling for Linux
- ✅ Removed Windows-specific double backslashes

### 3. **Certificate Manager (certificateManager.js)**
- ✅ Replaced Windows batch files (`.bat`) with Linux shell scripts
- ✅ Updated Easy-RSA paths to use `/usr/share/easy-rsa`
- ✅ Changed from Windows `sh.exe` to native Linux bash execution
- ✅ Simplified file path handling for Linux

## 🚀 Quick Setup (2 Options)

### **Option 1: Automated Setup (Recommended)**

Run the setup script that installs everything automatically:

```bash
cd /home/mosatinc/mosatinc/konektika
sudo ./setup_ubuntu.sh
```

This script will:
- ✅ Install OpenVPN and Easy-RSA
- ✅ Install and configure MySQL
- ✅ Set up Android Debug Bridge (ADB)
- ✅ Install all Node.js dependencies
- ✅ Configure permissions
- ✅ Set up USB device access

### **Option 2: Manual Setup**

If you prefer to install manually:

#### 1. Install System Dependencies
```bash
sudo apt-get update
sudo apt-get install -y openvpn easy-rsa mysql-server adb build-essential
```

#### 2. Configure MySQL
```bash
sudo systemctl start mysql
sudo systemctl enable mysql

# Create database and user
sudo mysql -e "CREATE DATABASE IF NOT EXISTS konektika CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'konektika_user'@'localhost' IDENTIFIED BY 'konektika_pass_2024';"
sudo mysql -e "GRANT ALL PRIVILEGES ON konektika.* TO 'konektika_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Import schema
sudo mysql konektika < database/schema.sql
```

#### 3. Install Node.js Dependencies
```bash
cd server
npm install

cd ../KonektikaMobile
npm install
```

#### 4. Set up ADB for Android
```bash
# Add your user to plugdev group
sudo usermod -a -G plugdev $USER

# Create udev rules for Sony device
sudo tee /etc/udev/rules.d/51-android.rules <<EOF
SUBSYSTEM=="usb", ATTR{idVendor}=="0fce", MODE="0666", GROUP="plugdev"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger

# Log out and back in for group changes to take effect
```

## 📱 Setting Up Your Android Device (Sony SO-53B)

### 1. Enable Developer Mode on Your Phone
1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times
3. Go back to **Settings** → **Developer Options**
4. Enable **USB Debugging**

### 2. Connect via USB
```bash
# Check if device is detected
lsusb | grep Sony

# Start ADB server
adb devices

# You should see your device listed
# If prompted on your phone, allow USB debugging
```

### 3. Get Your Computer's IP Address
```bash
# Find your local IP address
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Example output: `inet 192.168.1.100/24`

### 4. Update Mobile App Configuration

Edit `KonektikaMobile/src/config/api.ts`:

```typescript
BASE_URL: __DEV__
  ? 'http://192.168.1.100:3000/api' // Use YOUR computer's IP
  : 'https://konektika.online/api',
```

**Important:** Replace `192.168.1.100` with your actual IP address!

## 🏃 Running the Project

### 1. Start the Backend Server
```bash
cd /home/mosatinc/mosatinc/konektika/server
node server.js
```

You should see:
```
✅ Connected to MySQL database
🚀 Konektika Server running on port 3000
Environment: development
✅ Server started successfully with database
```

### 2. Start the Mobile App

In a **new terminal**:

```bash
cd /home/mosatinc/mosatinc/konektika/KonektikaMobile

# Start Metro bundler
npm start

# In another terminal, deploy to your device
npm run android
```

The app will be installed and launched on your Sony device!

## 🔍 Verifying Everything Works

### Check Server Health
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-12-20T...",
  "service": "Konektika VPN Server"
}
```

### Check VPN Status
```bash
curl http://localhost:3000/health/vpn
```

### Check Database Connection
```bash
mysql -u konektika_user -pkonektika_pass_2024 konektika -e "SHOW TABLES;"
```

### Check ADB Connection
```bash
adb devices
```

Should show your Sony device:
```
List of devices attached
XXXXXXXXXX      device
```

## 📊 Project Structure

```
konektika/
├── server/                  ✅ Backend API (Node.js + Express)
│   ├── config/             Database & server config
│   ├── routes/             API endpoints
│   ├── services/           Payment & VPN services
│   ├── utils/              VPN manager, certificate manager
│   └── server.js           Main server file
│
├── KonektikaMobile/        ✅ Mobile App (React Native)
│   ├── android/            Android native code
│   ├── src/
│   │   ├── config/         API configuration
│   │   ├── screens/        UI screens
│   │   └── services/       API services
│   └── App.tsx             Main app entry
│
├── database/               ✅ Database schemas
│   └── schema.sql          MySQL database schema
│
├── .env                    ✅ Environment config (UPDATED for Linux)
└── setup_ubuntu.sh         ✅ Automated setup script
```

## 🎯 Key Differences: Windows → Linux

| Component | Windows | Linux |
|-----------|---------|-------|
| OpenVPN Path | `C:\Program Files\OpenVPN\bin\openvpn.exe` | `/usr/sbin/openvpn` |
| Easy-RSA | `EasyRSA-3.1.7` with `.bat` files | `/usr/share/easy-rsa` with shell scripts |
| Service Check | `sc query OpenVPN` | `systemctl is-active openvpn` |
| Path Separator | `\` (backslash) | `/` (forward slash) |
| Line Endings | `\r\n` (CRLF) | `\n` (LF) |

## 🐛 Troubleshooting

### Issue: ADB doesn't detect device
**Solution:**
```bash
# Kill and restart ADB server
adb kill-server
adb start-server
adb devices

# Make sure USB debugging is enabled on phone
```

### Issue: MySQL connection refused
**Solution:**
```bash
# Check if MySQL is running
sudo systemctl status mysql

# Start if not running
sudo systemctl start mysql

# Check connection
mysql -u konektika_user -pkonektika_pass_2024 konektika -e "SELECT 1;"
```

### Issue: Cannot connect from mobile app
**Solution:**
1. Make sure backend server is running (`node server.js`)
2. Verify your IP address: `ip addr show`
3. Ensure phone and computer are on same WiFi network
4. Update API config in `KonektikaMobile/src/config/api.ts`
5. Rebuild the app: `npm run android`

### Issue: Easy-RSA not found
**Solution:**
```bash
# Install easy-rsa
sudo apt-get install -y easy-rsa

# Create symlink if needed
sudo ln -sf /usr/share/easy-rsa /home/mosatinc/mosatinc/konektika/server/openvpn/easyrsa
```

## 📞 Next Steps

1. ✅ **Test Authentication**: Register a user in the mobile app
2. ✅ **Test Bundle Purchase**: Browse and purchase a VPN bundle
3. ✅ **Test VPN Config**: Generate VPN configuration
4. ✅ **Test Payment**: Try mobile money payment integration

## 🎉 Success Criteria

When everything is working, you should be able to:
- ✅ Start the backend server without errors
- ✅ Connect your Android device via ADB
- ✅ Launch the mobile app on your device
- ✅ Register/login from the app
- ✅ Browse VPN bundles
- ✅ Make a purchase
- ✅ Generate VPN configuration

## 💡 Tips

1. **Keep terminals open**: Run server in one terminal, Metro bundler in another
2. **Check logs**: Server logs show in the terminal where you ran `node server.js`
3. **Reload app**: Shake device and press "Reload" to see changes
4. **Debug menu**: Shake device to access React Native dev menu

---

**Need Help?** Check the logs in:
- Backend: Terminal output from `node server.js`
- Mobile: React Native Metro bundler terminal
- MySQL: `sudo journalctl -u mysql`
- ADB: `adb logcat`

**Happy coding with Konektika VPN!** 🚀
