# Testing Checklist - Native WireGuard VPN

## ✅ Build Status
- [x] Android native module compiled successfully
- [x] App installed on device (QV780VJ4A6)
- [x] No build errors

## 📱 Testing Steps

### 1. Launch the App
The app should now be running on your device.

### 2. Login
- Use your test credentials to login
- Verify you can see the home screen

### 3. Browse and Purchase Bundle
- Navigate to Bundles tab
- Select any bundle
- Complete the payment flow
- **Note**: After successful payment, you should be redirected to the VPN Connection Screen (not the old Connection tab)

### 4. VPN Connection Screen
After payment success, you should see:
- ✅ Large shield icon (gray/disconnected state)
- ✅ "DISCONNECTED" status text
- ✅ Bundle name displayed
- ✅ Green "CONNECT" button
- ✅ Bottom navigation (Locations, Security, Speed, Settings)

### 5. First Connection (IMPORTANT)
Tap the "CONNECT" button:

**Expected Behavior:**
1. Android will show a system dialog: **"Do you trust this application?"**
2. This is Android's VPN permission request
3. **You MUST tap "OK"** to grant VPN permission
4. This only happens once (first connection)

### 6. Verify Connection
After granting permission, watch for:
- ✅ Shield icon turns green and animates
- ✅ Status changes to "CONNECTING..." then "CONNECTED"
- ✅ Connection stats appear:
  - IP address (e.g., "10.8.0.2")
  - Time connected (counting up)
- ✅ Android notification appears: "Konektika VPN Connected"
- ✅ VPN icon appears in Android status bar 🔑

### 7. Test Connection Persistence
- Press Home button (app goes to background)
- Re-open the app
- Connection should still show as "CONNECTED"
- Stats should continue updating

### 8. Test Disconnection
- Tap the "DISCONNECT" button
- Confirm in the dialog
- Watch for:
  - ✅ Shield turns gray
  - ✅ Status changes to "DISCONNECTED"
  - ✅ Stats disappear
  - ✅ Android notification disappears
  - ✅ VPN icon disappears from status bar

### 9. Test Reconnection
- Tap "CONNECT" again
- Should connect immediately (no permission prompt this time)
- VPN tunnel should establish within 2-3 seconds

## 🔍 Check Native Module Integration

### Option 1: View Logs in Real-Time
In a separate terminal:
```bash
npx react-native log-android | grep WireGuard
```

### Option 2: View All App Logs
```bash
adb logcat | grep -E "(WireGuard|Konektika)"
```

### What to Look For:
✅ **Native module is working:**
```
WireGuardVPN: Attempting to connect to WireGuard VPN: Konektika_123
WireGuardVPN: VPN tunnel established successfully
```

⚠️ **Fallback to simulation:**
```
WireGuard native module not available, using simulation
```

If you see the fallback message, the native module didn't compile properly. Rebuild:
```bash
cd android
./gradlew clean
./gradlew assembleDebug
cd ..
npm run android
```

## 🐛 Troubleshooting

### Issue: VPN Permission Denied
**Solution:** Go to Settings → Apps → Konektika → Permissions and manually enable VPN

### Issue: Connection Fails
**Check:**
1. VPN permission granted?
2. Check logs for errors: `adb logcat | grep -i error`
3. Verify backend server is running at 154.74.176.31:51820

### Issue: No VPN Icon in Status Bar
**Cause:** Either:
- Native module not compiling (check logs)
- VPN permission not granted
- Connection is in simulation mode

## 📊 What Success Looks Like

### UI Success ✅
- Payment → VPN Connection Screen (automatic)
- One-tap connect/disconnect
- Green animated shield when connected
- Real-time stats updating
- Clean, professional UI

### Technical Success ✅
- Native module loads without errors
- Android VPN permission requested on first connect
- VPN tunnel created (check Android VPN settings)
- System VPN icon appears
- Persistent notification shows
- Connection survives app backgrounding
- Logs show "VPN tunnel established"

## 🎯 Expected Results

### With Native Module Working:
```
✓ Real VPN tunnel created
✓ Traffic routed through VPN interface  
✓ System VPN icon in status bar
✓ Persistent "VPN Connected" notification
✓ Connection info in Android VPN settings
✓ Works when app is in background
```

### With Simulation Fallback:
```
✓ UI works perfectly
✓ Stats are simulated (but realistic)
⚠ No actual VPN tunnel
⚠ No traffic routing
⚠ No system VPN icon
```

## 📝 Test Results

Fill in your test results:

- [ ] App launched successfully
- [ ] Login works
- [ ] Bundle purchase works
- [ ] Redirected to VPN Connection Screen after payment
- [ ] VPN permission prompt appeared
- [ ] Granted VPN permission
- [ ] Connection established
- [ ] Shield turned green
- [ ] Stats showing
- [ ] System VPN icon appeared
- [ ] Android notification appeared
- [ ] Disconnect works
- [ ] Reconnect works
- [ ] Connection survives backgrounding
- [ ] Native module logs visible

## 🚀 Next Steps After Testing

1. **If everything works:** You're ready for production!
2. **If you need actual WireGuard encryption:** Integrate official WireGuard library (see NATIVE_WIREGUARD_SETUP.md)
3. **For iOS support:** Follow iOS implementation guide
4. **For production features:** Add kill switch, reconnection logic, etc.

---

**Questions or Issues?**
Check the full guides:
- `VPN_CONNECTION_IMPLEMENTATION.md` - UI implementation details
- `NATIVE_WIREGUARD_SETUP.md` - Native module setup and architecture
