# 🚀 Konektika Setup Guide

Complete guide to setting up the Konektika VPN Bundle Sharing Platform.

## 📋 Prerequisites

### System Requirements
- **Windows 10/11** (with WSL2 recommended)
- **Node.js 18+**
- **Docker & Docker Compose**
- **MySQL 8.0** or **MariaDB 10.6+**
- **Redis 6.0+**
- **OpenVPN** (for VPN server)

### Development Tools
- **Visual Studio Code** (recommended)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development - macOS only)
- **Git**

## 🏗️ Installation Steps

### 1. Clone and Setup Project

```bash
# Navigate to your projects directory
cd C:\
git clone <your-konektika-repo> konektika
cd konektika

# Copy environment configuration
copy .env.example .env

# Edit .env file with your specific configuration
notepad .env
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies for server
cd server
npm install

# Install mobile app dependencies
cd ../mobile-app
npm install

# Install dashboard dependencies
cd ../dashboard
npm install
```

### 3. Database Setup

#### Option A: Using Docker (Recommended)
```bash
# Start database services
docker-compose up -d mysql redis

# Wait for services to be healthy
docker-compose ps

# Database will be automatically initialized with schema
```

#### Option B: Manual Installation
```bash
# Install MySQL and create database
mysql -u root -p
CREATE DATABASE konektika CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'konektika_user'@'localhost' IDENTIFIED BY 'konektika_pass_2024';
GRANT ALL PRIVILEGES ON konektika.* TO 'konektika_user'@'localhost';
FLUSH PRIVILEGES;

# Import schema
mysql -u konektika_user -p konektika < database/schema.sql
```

### 4. OpenVPN Server Setup

#### Windows OpenVPN Installation
```powershell
# Download and install OpenVPN
# https://openvpn.net/community-downloads/

# Create OpenVPN directory structure
mkdir C:\konektika\server\openvpn
mkdir C:\konektika\server\openvpn\configs
mkdir C:\konektika\server\openvpn\keys

# Generate CA and server certificates
cd C:\konektika\server\openvpn
# Follow OpenVPN certificate generation guide
```

#### Quick OpenVPN Setup Script
```bash
# Run the automated setup
cd server
npm run setup-vpn
```

### 5. Start Development Environment

#### Using Docker Compose (Easiest)
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

#### Manual Development Setup
```bash
# Terminal 1: Start backend API
cd server
npm run dev

# Terminal 2: Start mobile app
cd mobile-app
npm start
# In another terminal: npm run android

# Terminal 3: Start dashboard
cd dashboard
npm start
```

## 📱 Mobile App Setup

### Android Development
```bash
# Prerequisites
# - Android Studio installed
# - Android SDK configured
# - Device/emulator connected

cd mobile-app

# Install dependencies
npm install

# Link native dependencies
cd android
./gradlew clean

# Run on Android
cd ..
npm run android
```

### iOS Development (macOS only)
```bash
cd mobile-app

# Install iOS dependencies
cd ios
pod install

# Run on iOS
cd ..
npm run ios
```

## 🔧 Configuration

### 1. VPN Server Configuration

Edit `.env` file:
```env
VPN_SERVER_IP=192.168.1.100          # Your server IP
VPN_SERVER_PORT=1194                 # OpenVPN port
VPN_PROTOCOL=udp                     # udp or tcp
VPN_SUBNET=10.8.0.0/24              # VPN client subnet
```

### 2. Payment Gateway Setup

Configure mobile money APIs in `.env`:
```env
# Tanzania Mobile Money
VODACOM_MPESA_API_KEY=your_api_key
TIGO_PESA_API_KEY=your_api_key
AIRTEL_MONEY_API_KEY=your_api_key
```

### 3. Push Notifications

Configure Firebase:
```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key"
```

## 🚀 Production Deployment

### 1. Server Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with production profile
docker-compose -f docker-compose.prod.yml --profile production up -d

# Setup reverse proxy (nginx)
# SSL certificates
# Domain configuration
```

### 2. Mobile App Release

#### Android APK Build
```bash
cd mobile-app/android
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

#### iOS Release Build
```bash
cd mobile-app
npm run build:ios

# Follow iOS App Store deployment process
```

## 🔐 Security Checklist

- [ ] Change all default passwords in `.env`
- [ ] Generate strong JWT secrets
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set up monitoring and logging

## 📊 Monitoring

### Health Checks
```bash
# Backend health
curl http://localhost:3000/health

# Database health
docker exec konektika-mysql mysqladmin ping

# VPN server status
npm run vpn:status
```

### Logs
```bash
# View all logs
docker-compose logs -f

# Backend logs only
docker-compose logs -f backend

# Database logs
docker-compose logs -f mysql
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check database status
docker-compose ps mysql

# Restart database
docker-compose restart mysql

# Check logs
docker-compose logs mysql
```

#### 2. VPN Server Not Starting
```bash
# Check OpenVPN installation
openvpn --version

# Verify certificates exist
ls server/openvpn/keys/

# Check VPN logs
docker-compose logs openvpn
```

#### 3. Mobile App Build Errors
```bash
# Clean React Native cache
cd mobile-app
npm start --reset-cache

# Clean Android build
cd android
./gradlew clean

# Reinstall node_modules
rm -rf node_modules
npm install
```

#### 4. Port Already in Use
```bash
# Check what's using the port
netstat -ano | findstr :3000

# Kill the process or change port in .env
```

## 📞 Support

- **Documentation**: `/docs`
- **API Reference**: `http://localhost:3000/api/docs`
- **Issues**: Create issue in repository
- **Email**: support@konektika.com

## 🔄 Updates

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm update

# Rebuild containers
docker-compose build --no-cache

# Restart services
docker-compose up -d
```

---

**Happy coding with Konektika! 🌐**