# Local Development

This guide covers setting up and running the FitGlue mobile app locally.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | 18+ | JavaScript runtime |
| [npm](https://www.npmjs.com/) | 9+ | Package manager |
| [Expo CLI](https://docs.expo.dev/get-started/installation/) | Latest | Development tools |
| [Xcode](https://developer.apple.com/xcode/) | 15+ | iOS development (macOS only) |
| [Android Studio](https://developer.android.com/studio) | Latest | Android development |

### iOS-Specific (macOS only)

- macOS Ventura or later
- Xcode Command Line Tools: `xcode-select --install`
- iOS Simulator (comes with Xcode)
- CocoaPods: `sudo gem install cocoapods`

### Android-Specific

- Android Studio with SDK 34+ installed
- Android Emulator with API 26+ (for Health Connect)
- Health Connect app installed on emulator

## Installation

```bash
# Clone and navigate to mobile directory
cd /path/to/fitglue/mobile

# Install dependencies
npm install
```

## Environment Configuration

The app uses environment variables to switch between backends:

### Development (default)

```bash
npm run start:dev
# Or just:
npm start
```

Uses `fitglue-dev` Firebase project.

### Test/Staging

```bash
npm run start:test
```

Uses `fitglue-test` Firebase project.

### Production

```bash
npm run start:prod
```

Uses `fitglue-prod` Firebase project.

## Running the App

### Expo Go vs Development Builds

> **Important:** Health features (HealthKit/Health Connect) require a **development build**. They will **not work** in Expo Go.

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| UI/Navigation | ✅ | ✅ |
| Firebase Auth | ✅ | ✅ |
| HealthKit (iOS) | ❌ | ✅ |
| Health Connect (Android) | ❌ | ✅ |
| Background Sync | ❌ | ✅ |

### Quick Start with Expo Go

For UI development without health features:

```bash
# Start dev server
npm start

# Scan QR code with Expo Go app
```

### Running on iOS Simulator

```bash
# Generate native iOS project
npm run prebuild

# Start and open simulator
npm run ios
```

Or press `i` after starting the dev server.

### Running on Android Emulator

```bash
# Generate native Android project
npm run prebuild

# Start and open emulator
npm run android
```

Or press `a` after starting the dev server.

### Creating a Development Build

For full feature testing including health integration:

```bash
# Clean prebuild (regenerates ios/ and android/ folders)
npm run prebuild:clean

# Build for iOS simulator
cd ios && pod install && cd ..
open ios/*.xcworkspace
# Build and run from Xcode

# Build for Android
# Open android/ folder in Android Studio
# Build and run from Android Studio
```

Or use EAS Build:

```bash
# Development build (includes dev client)
npm run build:dev
```

## iOS HealthKit Setup

Health features require a development build with proper entitlements.

### 1. Run Prebuild

```bash
npm run prebuild
```

This generates the `ios/` folder with HealthKit configured from `app.json`:

```json
{
  "ios": {
    "infoPlist": {
      "NSHealthShareUsageDescription": "FitGlue needs access to read your health data...",
      "NSHealthUpdateUsageDescription": "FitGlue needs access to write workout data..."
    },
    "entitlements": {
      "com.apple.developer.healthkit": true,
      "com.apple.developer.healthkit.access": []
    }
  }
}
```

### 2. Build and Run

```bash
cd ios
pod install
open *.xcworkspace
```

In Xcode:
1. Select your target device/simulator
2. Build and Run (Cmd+R)

### 3. Grant Permissions

On first launch, the app will request HealthKit permissions. In the simulator, grant access via:
- Health app > Sharing > Apps > FitGlue

## Android Health Connect Setup

### 1. Install Health Connect

Health Connect must be installed on the device/emulator:
- API 34+: Pre-installed as system app
- API 26-33: Download from Play Store

### 2. Run Prebuild

```bash
npm run prebuild
```

This generates the `android/` folder with Health Connect configured from `app.json`:

```json
{
  "android": {
    "permissions": [
      "android.permission.health.READ_EXERCISE",
      "android.permission.health.READ_HEART_RATE",
      "android.permission.health.READ_EXERCISE_ROUTE"
    ]
  }
}
```

### 3. Build and Run

Open the `android/` folder in Android Studio and run.

### 4. Grant Permissions

On first launch:
1. App requests Health Connect permissions
2. System opens Health Connect permission UI
3. Grant access to required data types

## Project Structure

```
mobile/
├── App.tsx                 # Root component
├── app.json               # Expo config (permissions, plugins)
├── package.json           # Dependencies
├── index.ts              # Entry point
├── ios/                  # Generated iOS project (after prebuild)
├── android/              # Generated Android project (after prebuild)
└── src/
    ├── config/           # Environment, Firebase, API
    ├── context/          # React Context (Auth)
    ├── hooks/            # Custom hooks (useHealth)
    ├── navigation/       # Navigation structure
    ├── screens/          # UI screens
    ├── services/         # Business logic
    └── types/            # TypeScript types
```

## Common Development Tasks

### Clean Rebuild

If you encounter build issues:

```bash
# Clean native projects
npm run prebuild:clean

# Clear Metro cache
npx expo start --clear
```

### Update Dependencies

```bash
# Update to latest compatible versions
npx expo install --fix
```

### Check Expo Doctor

```bash
npx expo-doctor
```

### View Logs

```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
adb logcat | grep -i fitglue
```

## Debugging

### React Native Debugger

Press `j` in the terminal to open React DevTools.

### Console Logging

The app includes debug logging that activates in development:

```typescript
// In src/config/environment.ts
export const isDebug = config.debug; // true in dev

// Throughout the codebase
if (isDebug) {
  console.log('[Service] Debug message');
}
```

### Network Requests

Use React Native Debugger or Flipper to inspect network traffic.

## Testing Authentication

### Test Accounts

Use accounts from the development Firebase project. Create test users via:
- Firebase Console (Authentication > Users)
- Web app registration

### Simulating Auth States

```typescript
// Force logout for testing
await signOut();

// Test error handling with invalid credentials
await signIn('test@example.com', 'wrongpassword');
```

## Related Documentation

- [Testing](./testing.md)
- [Troubleshooting](./troubleshooting.md)
- [EAS Build](../deployment/eas-build.md)
- [Health Integration](../features/health-integration.md)
