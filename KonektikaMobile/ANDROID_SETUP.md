# Testing Konektika on Your Android Device

## 🎯 Easiest Method (Recommended)

Since you don't have Android Studio set up yet, here are your options:

---

## Option 1: Install Android Studio (Best for Development)

### Download & Install
1. **Download Android Studio**: https://developer.android.com/studio
2. **Run the installer** and follow the setup wizard
3. **Install Android SDK** (will be prompted during setup)
4. **Install required components**:
   - Android SDK Platform 33
   - Android SDK Build-Tools
   - Android Emulator (optional)

### Set Environment Variables
Add these to your Windows Environment Variables:

```
ANDROID_HOME=C:\Users\mosat.inc\AppData\Local\Android\Sdk
Path=%Path%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools
```

### Enable USB Debugging on Your Phone
1. Open **Settings** on your Android phone
2. Go to **About Phone**
3. Tap **Build Number** 7 times (enables Developer Mode)
4. Go back to **Settings** → **Developer Options**
5. Enable **USB Debugging**
6. Connect phone to computer via USB
7. Accept the USB debugging prompt on your phone

### Run the App
```bash
cd C:\konektika\KonektikaMobile
npm run android
```

**Time Required**: ~30-45 minutes (download + setup)

---

## Option 2: Use React Native CLI with Android SDK Only

If you don't want the full Android Studio:

### 1. Install Java JDK 17
Download from: https://adoptium.net/

### 2. Install Android SDK Command Line Tools
Download from: https://developer.android.com/studio#command-line-tools-only

### 3. Set up environment variables and run
Same as Option 1

**Time Required**: ~20-30 minutes

---

## Option 3: Build APK on Cloud (Fastest - No Setup!)

Use EAS Build (Expo's cloud build service) - works without local Android setup:

### 1. Create Expo Account
```bash
npx expo login
```

### 2. Initialize EAS
```bash
cd C:\konektika\KonektikaMobile
npx expo install expo
npx eas build:configure
```

### 3. Build APK
```bash
npx eas build -p android --profile preview
```

This builds in the cloud and gives you a download link for the APK!

**Time Required**: ~10-15 minutes + build time (~5-10 min)

---

## Option 4: Build Debug APK Locally (IF you have Gradle)

If you have basic Android tools:

### 1. Build Debug APK
```bash
cd C:\konektika\KonektikaMobile\android
.\gradlew assembleDebug
```

### 2. Find APK
The APK will be at:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

### 3. Install on Phone
- Copy APK to your phone
- Open it and install
- Or use ADB: `adb install android\app\build\outputs\apk\debug\app-debug.apk`

---

## Quick Test Without Phone Setup

### Use Web Preview (Limited)
```bash
cd C:\konektika\KonektikaMobile
npm install -g @expo/cli
npx expo start --web
```

This opens in your browser (limited React Native features)

---

## 🎯 My Recommendation for You

Since you want to test NOW without much setup:

### Immediate Solution (5 minutes):
1. **Download Android Studio** and let it install in background
2. Meanwhile, **update your backend API URL** for physical device testing

### Update API Configuration:

#### Find your computer's IP address:
```powershell
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.1.100)

#### Edit API config:
File: `C:\konektika\KonektikaMobile\src\config\api.ts`

Change:
```typescript
BASE_URL: __DEV__ 
  ? 'http://10.0.2.2:3000/api' // This is for emulator only
  : 'https://api.konektika.com/api'
```

To:
```typescript
BASE_URL: __DEV__ 
  ? 'http://YOUR_COMPUTER_IP:3000/api' // e.g., http://192.168.1.100:3000/api
  : 'https://api.konektika.com/api'
```

Make sure your phone is on the **same WiFi** as your computer!

---

## Alternative: Quick Demo Video

If you want to see the app working immediately, I can help you:
1. Set up screen recording
2. Run app in Android Studio emulator on your PC
3. Record a demo of all features

---

## What Would You Prefer?

**Choose based on your priority:**

- **Want it NOW** → Use EAS Build (Option 3) - cloud builds APK
- **Long term development** → Install Android Studio (Option 1)
- **Just need to demo** → Use emulator + screen recording
- **Have some time** → Android SDK CLI only (Option 2)

Let me know which option you'd like to proceed with!
