# Architecture Decision Records

This document captures key architectural decisions made for the FitGlue mobile app.

---

## ADR-001: Use Expo Managed Workflow

**Status:** Accepted
**Date:** 2024-01

### Context

We needed to build a cross-platform mobile app with native health integrations. Options considered:
1. Pure React Native (bare workflow)
2. Expo managed workflow
3. Native iOS + Android

### Decision

Use **Expo managed workflow** with config plugins for native features.

### Consequences

**Positive:**
- Faster development with Expo tooling
- Simplified build/deploy with EAS
- OTA updates for JS changes
- Single codebase for iOS and Android

**Negative:**
- Limited to Expo-compatible libraries
- Must eject for certain native features
- App size slightly larger

**Mitigations:**
- Health libraries (`react-native-health`, `react-native-health-connect`) are compatible via config plugins
- Development builds allow native module testing

---

## ADR-002: Separate Health Libraries per Platform

**Status:** Accepted
**Date:** 2024-01

### Context

iOS uses HealthKit, Android uses Health Connect. Options:
1. Single abstraction library
2. Separate libraries per platform
3. Custom native module

### Decision

Use **separate libraries**: `react-native-health` (iOS) and `react-native-health-connect` (Android).

### Consequences

**Positive:**
- Best-maintained libraries for each platform
- Full feature access
- Independent updates

**Negative:**
- Two codepaths to maintain
- Different API patterns
- Platform testing required

**Mitigations:**
- Created unified `useHealth` hook for UI consistency
- Platform services produce standardized `StandardizedActivity` format
- Services isolated in dedicated files

---

## ADR-003: Firebase Authentication

**Status:** Accepted
**Date:** 2024-01

### Context

Need authentication that works with the existing FitGlue backend. Options:
1. Firebase Auth (existing backend integration)
2. Custom auth server
3. Third-party auth (Auth0, etc.)

### Decision

Use **Firebase Authentication** matching the server and web app.

### Consequences

**Positive:**
- Same auth system as server/web
- ID tokens work with Cloud Functions
- Persistent sessions with AsyncStorage
- Automatic token refresh

**Negative:**
- Firebase SDK adds bundle size
- Tied to Firebase ecosystem

**Mitigations:**
- AsyncStorage persistence reduces re-auth friction
- Same Firebase project for consistency

---

## ADR-004: Background Sync with expo-background-fetch

**Status:** Accepted
**Date:** 2024-01

### Context

Need to sync health data when app is not active. Options:
1. Manual sync only
2. Push notifications triggering sync
3. Background fetch

### Decision

Use **expo-background-fetch** for automatic periodic syncing.

### Consequences

**Positive:**
- Syncs even when app is closed
- System-managed scheduling
- Battery-friendly (OS controls timing)

**Negative:**
- Unpredictable timing (OS decides)
- iOS 15-minute minimum interval
- Requires development build

**Mitigations:**
- Manual sync button in UI for immediate sync
- Last sync time displayed for transparency
- Background sync supplementary, not primary

---

## ADR-005: Login Only (No Mobile Registration)

**Status:** Accepted
**Date:** 2024-01

### Context

Should users be able to register via the mobile app? Options:
1. Full registration flow in app
2. Login only, register on web

### Decision

**Login only** — users must register via the website.

### Consequences

**Positive:**
- Simpler mobile app
- Consistent onboarding experience
- Billing/subscription handled on web
- Reduces mobile app complexity

**Negative:**
- Extra friction for new users
- Requires web access to sign up

**Mitigations:**
- Clear messaging on login screen
- Direct link to web registration
- Deep link support for future activation flows

---

## ADR-006: Environment-Aware Configuration

**Status:** Accepted
**Date:** 2024-01

### Context

Need to target different backends (dev/test/prod). Options:
1. Build-time configuration
2. Runtime environment switching
3. Separate app builds per environment

### Decision

Use **runtime environment configuration** via `EXPO_PUBLIC_ENVIRONMENT`.

### Consequences

**Positive:**
- Single codebase, multiple environments
- Easy switching during development
- Environment badge shows current target

**Negative:**
- All configs bundled in app
- Environment visible in bundle (not secret)

**Mitigations:**
- No sensitive secrets in environment config
- Config only contains Firebase project IDs and API URLs
- Production builds default to production environment

---

## ADR-007: AsyncStorage for Local Persistence

**Status:** Accepted
**Date:** 2024-01

### Context

Need to persist sync state and preferences. Options:
1. AsyncStorage
2. SQLite
3. MMKV

### Decision

Use **AsyncStorage** via `@react-native-async-storage/async-storage`.

### Consequences

**Positive:**
- Simple key-value API
- Works well with Expo
- Firebase Auth uses it for persistence
- Sufficient for our data needs

**Negative:**
- Not suitable for large datasets
- No query capabilities

**Mitigations:**
- Only storing simple values (dates, booleans, small JSON)
- Health data not persisted locally (synced to server)

---

## Future Considerations

### Potential ADRs

- **Offline sync queue**: Store activities locally when offline
- **Biometric authentication**: Add Face ID/Touch ID for sensitive operations
- **Push notifications**: Alert users of sync failures or new features
- **Deep linking**: Handle URLs for specific app states
