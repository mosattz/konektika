# Android Studio Setup Guide for Konektika

## 📥 Step 1: Download & Install Android Studio

### Download
✅ Download page should be open: https://developer.android.com/studio

Click **"Download Android Studio"** button (free)

File size: ~1GB
Estimated download time: 5-10 minutes (depending on internet speed)

---

## 💿 Step 2: Install Android Studio

### Run the Installer
1. **Find downloaded file**: `android-studio-xxxx.exe` in your Downloads folder
2. **Run the installer** (Right-click → Run as Administrator)
3. **Follow the setup wizard**:
   - ✅ Click "Next"
   - ✅ Select components: **Keep all defaults checked** (Android Studio, Android Virtual Device)
   - ✅ Choose install location: Use default or choose custom
   - ✅ Wait for installation (~5-10 minutes)

### First Launch
4. **Complete the Setup Wizard**:
   - ✅ Import settings: Choose "Do not import settings"
   - ✅ Install Type: Choose **"Standard"** (recommended)
   - ✅ Select UI Theme: Light or Dark (your preference)
   - ✅ **IMPORTANT**: Let it download SDK components (~2-3 GB)
   
   This step downloads:
   - Android SDK
   - Android SDK Platform
   - Android SDK Build-Tools
   - Android Emulator (optional but useful)

**⏱️ Total time for Step 2**: ~15-20 minutes

---

## ⚙️ Step 3: Configure Environment Variables

After Android Studio is installed, you need to set environment variables.

### Find Your Android SDK Path
The default path is usually:
```
C:\Users\mosat.inc\AppData\Local\Android\Sdk
```

### Set Environment Variables (Windows)

**Option A: Via PowerShell (Quickest)**
```powershell
# Set ANDROID_HOME for current user
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\mosat.inc\AppData\Local\Android\Sdk', 'User')

# Add to PATH
$currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$newPath = $currentPath + ';C:\Users\mosat.inc\AppData\Local\Android\Sdk\platform-tools;C:\Users\mosat.inc\AppData\Local\Android\Sdk\tools'
[System.Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
```

**Option B: Via Windows Settings (GUI)**
1. Press `Windows + X` → Select **"System"**
2. Click **"Advanced system settings"**
3. Click **"Environment Variables"**
4. Under "User variables", click **"New"**:
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\mosat.inc\AppData\Local\Android\Sdk`
5. Find **"Path"** variable, click **"Edit"**, then **"New"** and add:
   - `C:\Users\mosat.inc\AppData\Local\Android\Sdk\platform-tools`
   - `C:\Users\mosat.inc\AppData\Local\Android\Sdk\tools`
6. Click **OK** on all dialogs

### Verify Installation
Close and reopen PowerShell, then run:
```powershell
$env:ANDROID_HOME
adb version
```

You should see the SDK path and ADB version.

**⏱️ Time for Step 3**: ~5 minutes

---

## 📱 Step 4: Enable USB Debugging on Your Android Phone

### On Your Phone:
1. Open **Settings**
2. Go to **About Phone** (or **About Device**)
3. Find **"Build Number"**
4. **Tap "Build Number" 7 times** (you'll see "You are now a developer!")
5. Go back to **Settings**
6. Find and open **"Developer Options"** (now visible)
7. **Enable "USB Debugging"**
8. (Optional) Enable "Install via USB" if available

### Connect Phone to PC:
1. **Connect your phone via USB cable**
2. On your phone, you'll see a popup **"Allow USB debugging?"**
3. Check **"Always allow from this computer"**
4. Tap **"OK"**

### Verify Connection:
```powershell
adb devices
```

You should see your device listed:
```
List of devices attached
ABC123DEF456    device
```

**⏱️ Time for Step 4**: ~2 minutes

---

## 🚀 Step 5: Run the App on Your Phone

### Update API URL for Physical Device

First, we need to update the API URL since your phone needs your computer's IP:

#### Find Your Computer's IP:
```powershell
ipconfig
```

Look for **"Wireless LAN adapter Wi-Fi"** → **"IPv4 Address"**
Example: `192.168.1.100`

#### Edit the API Config:
Open: `C:\konektika\KonektikaMobile\src\config\api.ts`

Change:
```typescript
BASE_URL: __DEV__ 
  ? 'http://10.0.2.2:3000/api'
  : 'https://api.konektika.com/api'
```

To (replace with YOUR IP):
```typescript
BASE_URL: __DEV__ 
  ? 'http://192.168.1.100:3000/api'
  : 'https://api.konektika.com/api'
```

**IMPORTANT**: Your phone must be on the **same WiFi network** as your computer!

### Run the App:
```powershell
cd C:\konektika\KonektikaMobile
npm run android
```

This will:
1. Start the Metro bundler
2. Build the Android app
3. Install it on your connected phone
4. Launch the app

**⏱️ Time for Step 5**: First build ~5-10 minutes, subsequent builds ~1-2 minutes

---

## ✅ Verification Checklist

Before running the app, make sure:

- [ ] Android Studio installed successfully
- [ ] SDK components downloaded
- [ ] Environment variables set (`$env:ANDROID_HOME` shows path)
- [ ] ADB works (`adb version` shows version)
- [ ] Phone shows in `adb devices`
- [ ] Backend server is running (check: `Get-Job`)
- [ ] API URL updated with your computer's IP
- [ ] Phone is on same WiFi as computer

---

## 🐛 Common Issues & Solutions

### Issue 1: "adb: command not found"
**Solution**: Environment variables not set correctly. Close PowerShell completely and reopen, or restart computer.

### Issue 2: "device unauthorized"
**Solution**: Unplug phone, revoke USB debugging authorizations in Developer Options, reconnect, and accept popup again.

### Issue 3: "Could not connect to development server"
**Solution**: 
- Check backend server is running: `Get-Job`
- Verify API URL has correct IP
- Ensure phone is on same WiFi
- Check firewall isn't blocking port 3000

### Issue 4: Build fails with Gradle errors
**Solution**:
```powershell
cd C:\konektika\KonektikaMobile\android
.\gradlew clean
cd ..
npm run android
```

### Issue 5: Metro bundler port conflict
**Solution**:
```powershell
npx react-native start --reset-cache
```

---

## 📊 Expected Timeline

| Step | Task | Time |
|------|------|------|
| 1 | Download Android Studio | 5-10 min |
| 2 | Install & SDK Download | 15-20 min |
| 3 | Set Environment Variables | 5 min |
| 4 | Enable USB Debugging | 2 min |
| 5 | Build & Run App | 5-10 min |
| **Total** | **Complete Setup** | **~30-45 minutes** |

---

## 🎉 After Successful Installation

Once the app launches on your phone, you should see:

1. **Splash Screen** → **Login Screen**
2. Try registering a new user
3. Browse the **4 VPN bundles** (1000, 3000, 17000, 45000 TZS)
4. Test the payment flow
5. Check your profile

---

## 🔄 Next Steps After First Run

For subsequent development sessions:

```powershell
# 1. Start backend server (if not running)
cd C:\konektika\server
node server.js

# 2. Connect phone via USB

# 3. Run app
cd C:\konektika\KonektikaMobile
npm run android
```

---

## 📞 Need Help?

If you encounter issues during setup:

1. Check the **Common Issues** section above
2. Verify all checkboxes in the **Verification Checklist**
3. Review PowerShell/terminal error messages carefully
4. Make sure all steps were completed in order

---

**Good luck with the setup! 🚀**

Once Android Studio is installed, we'll continue with the next steps!
