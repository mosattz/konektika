#!/bin/bash

# Konektika VPN - Ubuntu Setup Script
# This script installs all dependencies and sets up the project on Ubuntu

set -e

echo "🚀 Konektika VPN - Ubuntu Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  This script needs sudo privileges to install system packages${NC}"
    echo "Please run with: sudo ./setup_ubuntu.sh"
    exit 1
fi

echo "📦 Step 1: Installing system dependencies..."
apt-get update
apt-get install -y \
    openvpn \
    easy-rsa \
    mysql-server \
    adb \
    build-essential

echo -e "${GREEN}✅ System dependencies installed${NC}"
echo ""

echo "📦 Step 2: Setting up Easy-RSA..."
if [ ! -d "/usr/share/easy-rsa" ]; then
    echo "  Installing easy-rsa..."
    apt-get install -y easy-rsa
fi

# Link easy-rsa to project directory
if [ ! -L "/home/mosatinc/mosatinc/konektika/server/openvpn/easyrsa" ]; then
    ln -sf /usr/share/easy-rsa /home/mosatinc/mosatinc/konektika/server/openvpn/easyrsa
    echo "  Linked easy-rsa to project directory"
fi

echo -e "${GREEN}✅ Easy-RSA configured${NC}"
echo ""

echo "🔐 Step 3: Setting up MySQL..."
# Start MySQL service
systemctl start mysql
systemctl enable mysql

echo "  Creating database and user..."
mysql -e "CREATE DATABASE IF NOT EXISTS konektika CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'konektika_user'@'localhost' IDENTIFIED BY 'konektika_pass_2024';"
mysql -e "GRANT ALL PRIVILEGES ON konektika.* TO 'konektika_user'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

echo "  Importing database schema..."
mysql konektika < /home/mosatinc/mosatinc/konektika/database/schema.sql

echo -e "${GREEN}✅ MySQL database created and configured${NC}"
echo ""

echo "📱 Step 4: Setting up ADB for Android device..."
# Add user to plugdev group for USB access
usermod -a -G plugdev mosatinc

# Create udev rules for Android devices
cat > /etc/udev/rules.d/51-android.rules <<EOF
# Sony devices
SUBSYSTEM=="usb", ATTR{idVendor}=="0fce", MODE="0666", GROUP="plugdev"
# Generic Android devices
SUBSYSTEM=="usb", ATTR{idVendor}=="18d1", MODE="0666", GROUP="plugdev"
EOF

udevadm control --reload-rules
udevadm trigger

echo -e "${GREEN}✅ ADB configured for Android devices${NC}"
echo ""

echo "📦 Step 5: Installing Node.js dependencies..."
cd /home/mosatinc/mosatinc/konektika/server
sudo -u mosatinc npm install

echo -e "${GREEN}✅ Server dependencies installed${NC}"
echo ""

echo "📱 Step 6: Installing Mobile App dependencies..."
cd /home/mosatinc/mosatinc/konektika/KonektikaMobile
sudo -u mosatinc npm install

echo -e "${GREEN}✅ Mobile app dependencies installed${NC}"
echo ""

echo "🔧 Step 7: Setting correct permissions..."
chown -R mosatinc:mosatinc /home/mosatinc/mosatinc/konektika
chmod +x /home/mosatinc/mosatinc/konektika/server/openvpn/scripts/*.js 2>/dev/null || true

echo -e "${GREEN}✅ Permissions set${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start the backend server:"
echo "   cd /home/mosatinc/mosatinc/konektika/server"
echo "   node server.js"
echo ""
echo "2. In another terminal, check your Android device:"
echo "   adb devices"
echo ""
echo "3. Get your computer's IP address:"
echo "   ip addr show | grep 'inet '"
echo ""
echo "4. Update the mobile app API config with your IP"
echo "   Edit: KonektikaMobile/src/config/api.ts"
echo "   Change BASE_URL to: http://YOUR_IP:3000/api"
echo ""
echo "5. Start the mobile app:"
echo "   cd /home/mosatinc/mosatinc/konektika/KonektikaMobile"
echo "   npm run android"
echo ""
echo "Happy coding! 🎉"
