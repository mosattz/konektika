#!/bin/bash

# Build and Test Script for Konektika Mobile with Native WireGuard
# This script rebuilds the Android app with native VPN module

set -e  # Exit on error

echo "🚀 Konektika Mobile - Native WireGuard Build Script"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Clean previous builds
echo -e "${BLUE}Step 1: Cleaning previous builds...${NC}"
cd android
./gradlew clean
cd ..
echo -e "${GREEN}✓ Clean complete${NC}"
echo ""

# Step 2: Clear Metro bundler cache
echo -e "${BLUE}Step 2: Clearing Metro bundler cache...${NC}"
npm start --reset-cache &
METRO_PID=$!
sleep 5
kill $METRO_PID 2>/dev/null || true
echo -e "${GREEN}✓ Cache cleared${NC}"
echo ""

# Step 3: Rebuild Android app
echo -e "${BLUE}Step 3: Building Android app with native WireGuard module...${NC}"
echo -e "${YELLOW}This may take a few minutes...${NC}"
cd android
./gradlew assembleDebug
cd ..
echo -e "${GREEN}✓ Android build complete${NC}"
echo ""

# Step 4: Start Metro bundler
echo -e "${BLUE}Step 4: Starting Metro bundler...${NC}"
npm start &
METRO_PID=$!
echo -e "${GREEN}✓ Metro started (PID: $METRO_PID)${NC}"
sleep 5
echo ""

# Step 5: Install and run on device/emulator
echo -e "${BLUE}Step 5: Installing app on device/emulator...${NC}"
npm run android
echo -e "${GREEN}✓ App installed and launched${NC}"
echo ""

echo "=================================================="
echo -e "${GREEN}✅ Build Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Login to the app"
echo "2. Purchase a bundle"
echo "3. After payment, tap 'Connect to VPN'"
echo "4. Grant VPN permission when prompted"
echo "5. Watch the shield turn green!"
echo ""
echo "To view logs:"
echo "  npx react-native log-android | grep WireGuard"
echo ""
echo "To stop Metro bundler:"
echo "  kill $METRO_PID"
echo ""
