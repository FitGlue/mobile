# EAS Build

FitGlue mobile uses [Expo Application Services (EAS)](https://expo.dev/eas) for building and distributing the app.

## Overview

EAS Build creates native binaries in the cloud, handling code signing, native dependencies, and platform-specific configuration.

## Configuration

### app.json

Key fields for EAS:

```json
{
  "expo": {
    "name": "FitGlue",
    "slug": "fitglue-mobile",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.fitglue.mobile"
    },
    "android": {
      "package": "com.fitglue.mobile"
    }
  }
}
```

### eas.json

Build profiles configuration (create if not exists):

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "distribution": "store"
    }
  },
  "submit": {
    "production": {}
  }
}
```

## Build Profiles

| Profile | Purpose | Distribution |
|---------|---------|--------------|
| `development` | Local testing with dev client | Internal (TestFlight/Internal) |
| `preview` | QA and stakeholder testing | Internal |
| `production` | App Store/Play Store release | Store |

## Build Commands

```bash
# Development build (includes Expo dev tools)
npm run build:dev
# or: eas build --profile development

# Preview build (production-like, internal distribution)
npm run build:preview
# or: eas build --profile preview

# Production build (for app stores)
npm run build:prod
# or: eas build --profile production

# Build for specific platform
eas build --profile production --platform ios
eas build --profile production --platform android
```

## Environment Variables

EAS supports environment variables via `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "production"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "test"
      }
    },
    "development": {
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "development"
      }
    }
  }
}
```

## Code Signing

### iOS

EAS can manage certificates automatically:

```json
{
  "build": {
    "production": {
      "ios": {
        "credentialsSource": "remote"
      }
    }
  }
}
```

Or use local credentials:

```bash
eas credentials
```

### Android

Generate and upload keystore:

```bash
eas credentials --platform android
```

## Build Process

```
1. eas build --profile production
                │
                ▼
2. EAS uploads code to build servers
                │
                ▼
3. Native project generated (prebuild)
                │
                ▼
4. Dependencies installed (CocoaPods/Gradle)
                │
                ▼
5. Binary compiled and signed
                │
                ▼
6. Artifact available for download/distribution
```

## Monitoring Builds

```bash
# View build status
eas build:list

# View specific build
eas build:view <build-id>

# Cancel a build
eas build:cancel <build-id>
```

## Local Builds

For debugging build issues locally:

```bash
# Generate native projects
npm run prebuild:clean

# iOS (requires Xcode)
cd ios && pod install
xcodebuild -workspace *.xcworkspace -scheme FitGlue

# Android (requires Android Studio)
cd android && ./gradlew assembleRelease
```

## Troubleshooting

### Build fails with dependency error

```bash
# Clear EAS cache
eas build --clear-cache --profile development
```

### iOS signing issues

```bash
# Reset credentials
eas credentials --platform ios
```

### Android keystore issues

```bash
# View current credentials
eas credentials --platform android
```

## Related Documentation

- [Local Development](../development/local-development.md)
- [App Store](./app-store.md)
