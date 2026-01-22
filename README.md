# 🌐 Konektika - VPN Bundle Sharing Platform

**Konektika** is a mobile VPN application that enables users to share internet bundles through a secure VPN connection.

## 📱 What is Konektika?

Konektika allows you to:
- **Share your internet bundle** with multiple users
- **Monetize your unused data** by selling access
- **Provide secure internet access** through VPN technology
- **Manage users and track usage** through a web dashboard

## 🏗️ Project Structure

```
konektika/
├── server/              # VPN Server & Backend API
├── mobile-app/          # React Native Mobile App
├── dashboard/           # Web Management Dashboard
├── database/            # Database schemas and migrations
├── docker-compose.yml   # Complete development environment
└── docs/               # Documentation
```

## ⭐ Features

### 🔒 VPN Server
- OpenVPN/WireGuard protocol support
- Multi-client connections
- Bandwidth management
- Connection monitoring

### 📱 Mobile App (Android/iOS)
- Easy VPN connection setup
- Data usage tracking
- Payment integration
- User-friendly interface

### 🎛️ Management Dashboard
- User management
- Connection monitoring
- Data usage analytics
- Payment processing
- Bundle allocation

## 🚀 Quick Start

1. **Setup VPN Server**
   ```bash
   cd server
   npm install
   npm run setup-vpn
   ```

2. **Start Backend API**
   ```bash
   npm start
   ```

3. **Run Mobile App**
   ```bash
   cd mobile-app
   npm install
   npm run android  # or npm run ios
   ```

4. **Launch Dashboard**
   ```bash
   cd dashboard
   npm install
   npm start
   ```

## 🛠️ Technology Stack

- **VPN**: OpenVPN/WireGuard
- **Backend**: Node.js + Express
- **Mobile**: React Native
- **Dashboard**: React + Tailwind CSS
- **Database**: MySQL/PostgreSQL
- **Authentication**: JWT + OAuth
- **Payments**: Mobile Money APIs

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ for sharing internet connectivity**