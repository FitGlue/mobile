# FitGlue Mobile App

The official mobile companion app for the FitGlue platform. Automatically syncs workouts from iOS Apple Health and Android Health Connect to your FitGlue account.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [Expo](https://expo.dev/) | 54.0 | React Native framework |
| [React Native](https://reactnative.dev/) | 0.81 | Cross-platform UI |
| [TypeScript](https://www.typescriptlang.org/) | 5.9 | Type-safe JavaScript |
| [Firebase Auth](https://firebase.google.com/docs/auth) | 11.6 | Authentication |
| [react-native-health](https://github.com/agencyenterprise/react-native-health) | 1.19 | iOS HealthKit |
| [react-native-health-connect](https://github.com/matinzd/react-native-health-connect) | 3.5 | Android Health Connect |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Or run with a specific environment
npm run start:dev
npm run start:test
npm run start:prod
```

> **Note:** Health features require a custom development build. They will not work in Expo Go.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo development server |
| `npm run start:dev` | Start with development environment |
| `npm run start:test` | Start with test environment |
| `npm run start:prod` | Start with production environment |
| `npm run ios` | Start and open iOS simulator |
| `npm run android` | Start and open Android emulator |
| `npm run prebuild` | Generate native iOS/Android projects |
| `npm run prebuild:clean` | Clean and regenerate native projects |
| `npm run build:dev` | EAS build for development |
| `npm run build:preview` | EAS build for preview/testing |
| `npm run build:prod` | EAS build for production |

## Project Structure

```
mobile/
├── App.tsx                    # Root component with providers
├── app.json                   # Expo configuration
├── package.json               # Dependencies and scripts
├── index.ts                   # Entry point
├── tsconfig.json              # TypeScript configuration
│
├── assets/                    # App icons and splash screen
│   ├── icon.png
│   ├── splash-icon.png
│   └── adaptive-icon.png
│
└── src/
    ├── config/                # Configuration
    │   ├── api.ts             # API client with auth
    │   ├── environment.ts     # Environment-aware config
    │   └── firebase.ts        # Firebase initialization
    │
    ├── context/               # React Context providers
    │   └── AuthContext.tsx    # Firebase Auth state
    │
    ├── hooks/                 # Custom React hooks
    │   └── useHealth.ts       # Cross-platform health access
    │
    ├── navigation/            # Navigation structure
    │   └── AppNavigator.tsx   # Auth-aware stack navigator
    │
    ├── screens/               # App screens
    │   ├── HomeScreen.tsx     # Main dashboard
    │   └── LoginScreen.tsx    # Sign in screen
    │
    ├── services/              # Business logic
    │   ├── AppleHealthService.ts     # iOS HealthKit
    │   ├── AndroidHealthService.ts   # Android Health Connect
    │   ├── BackgroundSyncTask.ts     # Background fetch
    │   ├── StorageService.ts         # Local persistence
    │   └── SyncService.ts            # Sync orchestration
    │
    └── types/                 # TypeScript types
        └── health.ts          # Health data models
```

## Documentation

| Topic | Description |
|-------|-------------|
| **Architecture** | |
| [Overview](docs/architecture/overview.md) | App architecture and data flow |
| [Navigation](docs/architecture/navigation.md) | Screen hierarchy and routing |
| [Authentication](docs/architecture/authentication.md) | Firebase Auth integration |
| **Development** | |
| [Local Development](docs/development/local-development.md) | Setup and running locally |
| [Testing](docs/development/testing.md) | Testing strategies |
| [Troubleshooting](docs/development/troubleshooting.md) | Common issues and solutions |
| **Features** | |
| [Health Integration](docs/features/health-integration.md) | iOS HealthKit & Android Health Connect |
| [Background Sync](docs/features/background-sync.md) | Background fetch configuration |
| [Sync Service](docs/features/sync-service.md) | Data synchronization logic |
| **Deployment** | |
| [EAS Build](docs/deployment/eas-build.md) | Expo Application Services builds |
| [App Store](docs/deployment/app-store.md) | Publishing to iOS/Android stores |
| **Decisions** | |
| [ADR](docs/decisions/ADR.md) | Architecture Decision Records |

## Key Features

- **🔐 Secure Authentication** — Firebase Auth with persistent sessions
- **❤️ Health Data Sync** — Workouts, heart rate, and GPS from device health platforms
- **📡 Background Sync** — Automatic syncing even when app is closed
- **🌍 Cross-Platform** — iOS (HealthKit) and Android (Health Connect) support
- **⚙️ Multi-Environment** — Development, Test, and Production configurations

## Environment Configuration

The app supports three environments, configured via the `EXPO_PUBLIC_ENVIRONMENT` variable:

| Environment | Firebase Project | API Base URL |
|-------------|-----------------|--------------|
| `development` | fitglue-dev | https://fitglue-dev.web.app |
| `test` | fitglue-test | https://fitglue-test.web.app |
| `production` | fitglue-prod | https://fitglue.app |

See [Local Development](docs/development/local-development.md) for detailed setup.

## Related Repositories

- **[Server](../server/)** — Backend API and Cloud Functions
- **[Web](../web/)** — Marketing site and web dashboard
