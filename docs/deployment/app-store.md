# App Store Deployment

Guide for publishing FitGlue mobile to the iOS App Store and Google Play Store.

## iOS App Store

### Requirements

| Requirement | Status |
|-------------|--------|
| Apple Developer Account ($99/year) | Required |
| Bundle ID: `com.fitglue.mobile` | Configured |
| HealthKit entitlement | Configured in app.json |
| Privacy Policy URL | Required |
| App screenshots (6.5", 5.5") | Required |

### Health Data Privacy

Apple requires special attention for health apps:

#### Required Privacy Descriptions

```json
{
  "ios": {
    "infoPlist": {
      "NSHealthShareUsageDescription": "FitGlue needs access to read your health data including workouts, heart rate, and GPS routes to sync with your connected services.",
      "NSHealthUpdateUsageDescription": "FitGlue needs access to write workout data to Apple Health."
    }
  }
}
```

#### App Store Privacy Questions

When submitting, you'll need to answer:
- **Data Types**: Health & Fitness (Workouts, Heart Rate)
- **Data Usage**: Linked to user identity (for syncing)
- **Data Sharing**: Shared with third parties (FitGlue backend)

### Submission Checklist

- [ ] Production build with correct bundle ID
- [ ] App Store Connect listing complete
- [ ] Screenshots for all required sizes
- [ ] Privacy Policy URL added
- [ ] Health data usage description accurate
- [ ] Export compliance (encryption) answered
- [ ] Age rating configured

### Submit with EAS

```bash
# Build production
eas build --profile production --platform ios

# Submit to App Store
eas submit --platform ios
```

---

## Google Play Store

### Requirements

| Requirement | Status |
|-------------|--------|
| Google Play Developer Account ($25 one-time) | Required |
| Package: `com.fitglue.mobile` | Configured |
| Health Connect permissions | Configured in app.json |
| Privacy Policy URL | Required |
| Feature graphic (1024x500) | Required |

### Health Connect Requirements

#### Manifest Permissions

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

#### Data Safety Section

When submitting, declare:
- **Data Types**: Health info (Fitness info)
- **Data Collection**: Yes, collected and linked to identity
- **Data Sharing**: Yes, shared with FitGlue servers
- **Encryption**: Yes, encrypted in transit

### Submission Checklist

- [ ] Production build (AAB format)
- [ ] Play Console listing complete
- [ ] Screenshots and feature graphic
- [ ] Privacy Policy URL added
- [ ] Data safety form completed
- [ ] Target API level compliance (34+)
- [ ] Content rating questionnaire

### Submit with EAS

```bash
# Build production
eas build --profile production --platform android

# Submit to Play Store
eas submit --platform android
```

---

## Privacy Policy Requirements

Your privacy policy must address:

1. **Data Collection**: Describe workout, heart rate, GPS data collected
2. **Data Usage**: Explain sync to FitGlue servers for enrichment
3. **Data Sharing**: List any third-party integrations
4. **Data Retention**: Specify how long data is stored
5. **User Rights**: Explain data deletion process
6. **Contact Information**: Provide support email

Example sections for health data:

```markdown
## Health Data

FitGlue collects the following health data from your device:
- Workout sessions (type, duration, distance)
- Heart rate measurements during workouts
- GPS route data (if available)

This data is transmitted securely to FitGlue servers and used to:
- Enrich your workout data with additional analytics
- Sync workouts to your connected services (Strava, etc.)

You can delete your data at any time through the app or website.
```

---

## App Updates

### Version Bumping

Update `app.json`:

```json
{
  "expo": {
    "version": "1.1.0"
  }
}
```

For iOS, also update `buildNumber`. For Android, update `versionCode`.

### OTA Updates (Expo Updates)

For JavaScript-only changes:

```bash
eas update --branch production --message "Bug fixes"
```

> **Note:** Native changes (permissions, plugins) require a full App Store update.

---

## Release Channels

| Environment | Branch | Distribution |
|-------------|--------|--------------|
| Development | `development` | Internal |
| Staging | `preview` | TestFlight / Internal Testing |
| Production | `production` | App Store / Play Store |

## Related Documentation

- [EAS Build](./eas-build.md)
- [Troubleshooting](../development/troubleshooting.md)
