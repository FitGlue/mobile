# FitGlue Mobile — Development Guide

A practical guide to building, updating, and releasing the FitGlue mobile app using Expo and EAS.

---

## Key Concepts

### The Three Build Profiles

Your `eas.json` defines three build profiles. Each produces a different kind of binary:

| Profile | Purpose | Distribution | Environment | When to use |
|---|---|---|---|---|
| **development** | Local development & debugging | Internal (+ iOS simulator) | `development` | Day-to-day coding. Includes dev tools, hot reload, and the Expo dev client. |
| **preview** | Internal testing | Internal (direct install) | `test` | Share a test build with yourself or testers before going to the store. |
| **production** | Store release | App Store / Google Play | `production` | Ready to ship to real users. |

**"Internal" distribution** means the app is installed directly on devices (via QR code / link) rather than going through the stores. Think of it like TestFlight but cross-platform.

### Native Binary vs JavaScript Bundle

This is the most important concept to understand:

```
┌──────────────────────────────────────────────┐
│              Native Binary (.apk/.ipa)       │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │         JavaScript Bundle              │  │
│  │  (your React Native code, assets)      │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Native modules, permissions, SDK versions   │
└──────────────────────────────────────────────┘
```

- The **native binary** is the container — it includes native modules (Health Connect, HealthKit), permissions, SDK versions, etc. This is what goes through store review.
- The **JavaScript bundle** is your actual app code. This can be updated independently via **EAS Update** (OTA).

---

## How EAS Update (OTA) Works

EAS Update lets you push JavaScript-only changes directly to users' devices **without a store submission**. Updates are downloaded in the background and applied on the next app restart.

### Update Channels & Branches

```
Build Profile        →    Channel        →    Branch
─────────────────────────────────────────────────────
development          →    development    →    development
preview              →    preview        →    preview
production           →    production     →    production
```

- A **channel** is assigned to a build profile. When a user opens the app, it checks its channel for updates.
- A **branch** is where you publish updates to. You publish an update to a branch, and any build on the matching channel receives it.

### When can I use OTA vs when do I need a new build?

| Change | OTA Update? | New Native Build? |
|---|---|---|
| Fix a bug in JS/TS code | ✅ Yes | ❌ No |
| Update text, styles, images | ✅ Yes | ❌ No |
| Change app logic / screens | ✅ Yes | ❌ No |
| Add a new native module / plugin | ❌ No | ✅ Yes |
| Change permissions in `app.json` | ❌ No | ✅ Yes |
| Update SDK version | ❌ No | ✅ Yes |
| Change `app.json` native config | ❌ No | ✅ Yes |

**Rule of thumb**: If you touched anything in the `plugins`, `ios`, or `android` sections of `app.json`, or added/removed a native dependency — you need a new build.

---

## Versioning

### How version numbers work

There are **two separate version concepts**:

1. **Marketing version** (`expo.version` in `app.json`) — e.g. `1.2.0`. This is what users see in the store. You control this manually.
2. **Build number** (`android.versionCode` / `ios.buildNumber`) — e.g. `7`. This is an internal counter that must increase with every store submission. **EAS manages this automatically** because of `"appVersionSource": "remote"` in `eas.json`.

### When to bump the marketing version

- **Bump the patch** (`1.0.0` → `1.0.1`) for bug fixes shipped via a new build.
- **Bump the minor** (`1.0.0` → `1.1.0`) for new features.
- **Bump the major** (`1.0.0` → `2.0.0`) for breaking changes or major redesigns.
- **Don't bump for OTA updates** — they go to the existing version.

---

## Day-to-Day Workflows

### 1. Local Development

```bash
# Start the dev server
cd mobile
npx expo start

# Run on a connected device / simulator
npx expo run:android
npx expo run:ios
```

No EAS needed for local development. You only need a development build if you're using native modules that aren't in Expo Go.

### 2. Creating a Development Build

```bash
# Build for iOS simulator
eas build --profile development --platform ios

# Build for Android device
eas build --profile development --platform android
```

Do this when you **add or change a native module**. Install the resulting build on your device, then continue local development with `npx expo start`.

### 3. Creating a Preview Build (Internal Testing)

```bash
# Build for both platforms
eas build --profile preview --platform all
```

This creates installable builds you can share via a link. Use this to test on real devices before submitting to stores.

### 4. Pushing an OTA Update (JS-only fix)

```bash
# Push to preview channel (for testing)
eas update --branch preview --message "Fix login button alignment"

# Push to production channel (live users get this)
eas update --branch production --message "Fix crash on settings page"
```

Users will get the update on their next app restart. No store review needed.

### 5. Production Release (Store Submission)

```bash
# 1. Bump version in app.json (e.g. 1.0.0 → 1.1.0)
#    Edit expo.version manually

# 2. Build for stores
eas build --profile production --platform all

# 3. Submit to App Store & Google Play
eas submit --platform all

# 4. Tag the commit
git tag mobile/v1.1.0
git push --tags
```

---

## Decision Flowchart

```
I made a code change. What do I do?
│
├─ Did I change native config, plugins, or permissions?
│  │
│  ├─ YES → New native build required
│  │        1. Bump expo.version in app.json
│  │        2. eas build --profile production --platform all
│  │        3. eas submit --platform all
│  │        4. git tag mobile/vX.Y.Z
│  │
│  └─ NO → JS-only change, OTA eligible
│          │
│          ├─ Is this a critical fix for live users?
│          │  └─ YES → eas update --branch production --message "description"
│          │
│          ├─ Am I still testing?
│          │  └─ YES → eas update --branch preview --message "description"
│          │
│          └─ Can it wait for the next store release?
│             └─ YES → Just merge to main, it'll ship with the next build
```

---

## CI/CD Strategy

Testing and linting run in **CircleCI** (cheap, just a Node container). Native builds run in **EAS** (paid per build, only when needed).

```
Push to main
    │
    ▼
CircleCI                          EAS
┌──────────────────┐     ┌─────────────────────┐
│ npm ci            │     │                     │
│ tsc --noEmit      │     │  Triggered manually │
│ eslint .          │     │  or by CI after     │
│ jest              │     │  checks pass        │
│                   │     │                     │
│ ✅ All pass?     │────▶│  eas build           │
│                   │     │  eas submit          │
└──────────────────┘     └─────────────────────┘
  Free / cheap              Paid per build
```

> **Note**: CircleCI mobile checks are not set up yet. When they are, add them as a job in the existing CircleCI config, scoped to `mobile/**` path changes.

---

## Git Strategy

### Branching

Use **trunk-based development** — same as the rest of the monorepo:

- **`main`** — always deployable, all work merges here.
- **Feature branches** — short-lived, merge via PR.
- **No `develop` or `release` branches** — tags serve as release markers.

### Tagging Store Releases

When you submit to stores, tag the commit:

```bash
git tag mobile/v1.1.0
git push --tags
```

This gives you a clear "what code is in the store" reference without maintaining long-lived branches.

---

## Quick Reference

| I want to... | Command |
|---|---|
| Start local dev server | `npx expo start` |
| Build for local dev (native modules changed) | `eas build --profile development --platform <ios\|android>` |
| Build for internal testing | `eas build --profile preview --platform all` |
| Push a JS-only fix to testers | `eas update --branch preview --message "description"` |
| Push a JS-only fix to production | `eas update --branch production --message "description"` |
| Build for store release | `eas build --profile production --platform all` |
| Submit to stores | `eas submit --platform all` |
| Check current build versions | `eas build:version:get` |

---

## Local Android Build (Docker)

If an EAS cloud build fails, you can reproduce it locally using Docker. The `Dockerfile.eas-local` mirrors the EAS SDK 54 build server (`ubuntu-24.04-jdk-17-ndk-r27b`), so if it builds locally, it should build in the cloud.

### Prerequisites

- Docker installed in WSL (`sudo apt install docker.io`, then `sudo usermod -aG docker $USER`)

### Usage

```bash
# Default: production-apk profile
./scripts/local-build-android.sh

# Specific profile
./scripts/local-build-android.sh production
./scripts/local-build-android.sh preview
```

The script auto-builds the Docker image on first run (~5-10 min for SDK downloads). Subsequent builds reuse the cached image.

### Rebuilding the Docker image

If the EAS build server specs change (e.g. SDK upgrade), rebuild:

```bash
docker build -f Dockerfile.eas-local -t fitglue-eas-builder --no-cache .
```

---

## Further Reading

- [EAS Build docs](https://docs.expo.dev/build/introduction/)
- [EAS Update docs](https://docs.expo.dev/eas-update/introduction/)
- [EAS Submit docs](https://docs.expo.dev/submit/introduction/)
- [App versioning with EAS](https://docs.expo.dev/build-reference/app-versions/)
