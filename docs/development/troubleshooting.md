# Troubleshooting

Common issues and solutions for FitGlue mobile development.

## Health Permission Issues

### iOS: HealthKit Not Available

**Symptoms:**
- "HealthKit not available" message
- `isHealthKitAvailable()` returns `false`

**Causes & Solutions:**

1. **Running in Expo Go**
   ```
   [AppleHealthService] react-native-health not available
   ```
   - HealthKit requires a development build
   - Run `npm run prebuild` and build from Xcode

2. **Simulator without HealthKit**
   - Some older simulators lack HealthKit
   - Use iPhone 8 or newer simulator

3. **Missing entitlements**
   - Check `ios/*.entitlements` includes HealthKit
   - Re-run `npm run prebuild:clean`

### iOS: Permissions Not Appearing

**Symptoms:**
- Permission dialog doesn't show
- Permissions show as "Not Granted" after approving

**Solutions:**

1. **Check Info.plist descriptions**
   ```json
   // app.json should have:
   "infoPlist": {
     "NSHealthShareUsageDescription": "...",
     "NSHealthUpdateUsageDescription": "..."
   }
   ```

2. **Reset simulator permissions**
   - iOS Simulator > Device > Erase All Content and Settings

3. **Manually grant in Health app**
   - Open Health app > Sharing > Apps > FitGlue

### Android: Health Connect Not Found

**Symptoms:**
- "Health Connect not installed" status
- SDK status is 1 (unavailable)

**Solutions:**

1. **Install Health Connect**
   - API 34+: Pre-installed
   - API 26-33: Install from Play Store
   - Emulator: Download APK manually

2. **Check SDK status**
   ```typescript
   const status = await HealthConnect.getSdkStatus();
   // 3 = Available, 2 = Needs update, 1 = Not installed
   ```

### Android: Permissions Denied

**Symptoms:**
- Permission request returns empty
- "Permission request failed" error

**Solutions:**

1. **Check manifest permissions**
   ```json
   // app.json
   "android": {
     "permissions": [
       "android.permission.health.READ_EXERCISE",
       "android.permission.health.READ_HEART_RATE"
     ]
   }
   ```

2. **Rebuild native project**
   ```bash
   npm run prebuild:clean
   ```

3. **Check Health Connect settings**
   - Open Health Connect app
   - Check "Data and access" for FitGlue
   - Manually grant permissions

## Background Sync Issues

### Sync Not Triggering

**Symptoms:**
- Background sync never runs
- Last sync date doesn't update

**Causes & Solutions:**

1. **Task not registered**
   ```typescript
   const isRegistered = await isBackgroundSyncRegistered();
   console.log('Background sync registered:', isRegistered);
   ```
   - Call `registerBackgroundSync()` after health init

2. **iOS restrictions**
   - iOS aggressively limits background tasks
   - Minimum interval is 15 minutes
   - System decides when to actually run
   - Low battery/power mode disables background fetch

3. **Android restrictions**
   - Check battery optimization settings
   - Disable battery optimization for FitGlue
   - Some manufacturers (Xiaomi, Huawei) are more aggressive

4. **Debug mode**
   - Force trigger on iOS: Xcode > Debug > Simulate Background Fetch
   - Use `triggerManualSync()` for testing

### Sync Fails Silently

**Symptoms:**
- Sync attempts but no data synced
- No errors visible

**Debug steps:**

1. **Check logs**
   ```bash
   # iOS
   npx react-native log-ios | grep -E "(Sync|BackgroundSync)"

   # Android
   adb logcat | grep -iE "(sync|fitglue)"
   ```

2. **Check sync status**
   ```typescript
   const status = await getSyncStatus();
   console.log(status);
   // { lastSyncDate, syncEnabled, isAuthenticated, platform }
   ```

3. **Check if disabled**
   ```typescript
   const enabled = await isSyncEnabled();
   if (!enabled) {
     await setSyncEnabled(true);
   }
   ```

## Firebase Connection Issues

### Auth Fails Immediately

**Symptoms:**
- "Network error" on sign in
- "An error occurred"

**Solutions:**

1. **Check environment**
   ```typescript
   console.log('Environment:', environment);
   console.log('Firebase project:', firebaseConfig.projectId);
   ```

2. **Verify Firebase config**
   - Check that the API key matches Firebase Console
   - Ensure the project exists and is enabled

3. **Check network**
   - Test device has internet
   - Firebase domains not blocked

### Token Refresh Fails

**Symptoms:**
- API calls return 401 after some time
- "Not authenticated" errors

**Solutions:**

1. **Force token refresh**
   ```typescript
   const token = await user.getIdToken(true); // Force refresh
   ```

2. **Check token expiry**
   - Firebase tokens expire after 1 hour
   - SDK should auto-refresh

3. **Re-authenticate**
   - Sign out and sign back in
   - Clear AsyncStorage: `await clearAllStorage()`

## Build Failures

### iOS Build Errors

**CocoaPods issues:**
```bash
cd ios
pod deintegrate
pod install --repo-update
```

**Xcode signing issues:**
- Open `ios/*.xcworkspace` in Xcode
- Set Team in Signing & Capabilities
- Ensure HealthKit capability is checked

**Clean build:**
```bash
rm -rf ios/build
rm -rf ios/Pods
rm ios/Podfile.lock
npm run prebuild:clean
```

### Android Build Errors

**Gradle sync failed:**
```bash
cd android
./gradlew clean
./gradlew --refresh-dependencies
```

**Min SDK version:**
- Health Connect requires API 26+
- Check `app.json`:
  ```json
  "plugins": [
    ["expo-build-properties", {
      "android": {
        "minSdkVersion": 26
      }
    }]
  ]
  ```

### Metro Bundler Issues

**"Unable to resolve module":**
```bash
# Clear Metro cache
npx expo start --clear

# Or manually
rm -rf node_modules/.cache
```

**Haste module map collision:**
```bash
watchman watch-del-all
rm -rf node_modules
npm install
```

## Runtime Errors

### "useAuth must be used within AuthProvider"

**Cause:** Component using `useAuth()` is not wrapped in `AuthProvider`

**Solution:** Ensure component tree has `AuthProvider`:
```tsx
<AuthProvider>
  <YourComponent />
</AuthProvider>
```

### "Cannot read property 'currentUser' of undefined"

**Cause:** Firebase not initialized before use

**Solution:** Check initialization order in `App.tsx`:
```tsx
// firebase.ts initializes on import
import { auth } from './config/firebase';
```

### "Invariant Violation: Native module cannot be null"

**Cause:** Native module not linked or running in Expo Go

**Solutions:**
1. Use development build instead of Expo Go
2. Re-run `npm run prebuild`
3. Rebuild native app

## Debug Logging

Enable verbose logging for debugging:

```typescript
// In src/config/environment.ts
// Debug is true for development
export const isDebug = config.debug;

// Throughout codebase, logs are wrapped:
if (isDebug) {
  console.log('[AuthContext] Auth state changed:', user?.email);
}
```

Key prefixes to monitor:
- `[AuthContext]` — Authentication state
- `[Firebase]` — Firebase operations
- `[SyncService]` — Sync orchestration
- `[BackgroundSync]` — Background task
- `[AppleHealthService]` — iOS HealthKit
- `[AndroidHealthService]` — Android Health Connect
- `[StorageService]` — Local storage

## Getting Help

1. **Check logs** — Most issues have logged errors
2. **Check environment** — Verify correct Firebase project
3. **Reset state** — Clear storage and re-authenticate
4. **Clean rebuild** — `npm run prebuild:clean`
5. **Check permissions** — Both app and system level

## Related Documentation

- [Local Development](./local-development.md)
- [Testing](./testing.md)
- [Health Integration](../features/health-integration.md)
