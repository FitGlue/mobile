#!/bin/bash
# Local Android build using Docker — mirrors the EAS cloud environment.
# Usage: ./scripts/local-build-android.sh [profile]
#   profile: EAS build profile (default: production-apk)
#
# Examples:
#   ./scripts/local-build-android.sh production-apk    # production APK
#   ./scripts/local-build-android.sh production        # production AAB (store)
#   ./scripts/local-build-android.sh preview           # preview build

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="fitglue-eas-builder"
PROFILE="${1:-local-verification}"

# Check for EXPO_TOKEN
if [ -z "${EXPO_TOKEN:-}" ]; then
    echo "❌ EXPO_TOKEN is not set."
    echo ""
    echo "   Generate one at: https://expo.dev/accounts/settings/access-tokens"
    echo "   Then run: EXPO_TOKEN=your_token ./scripts/local-build-android.sh"
    exit 1
fi

echo "╔════════════════════════════════════════════════╗"
echo "║  FitGlue Local Android Build (Docker)          ║"
echo "║  Profile: ${PROFILE}"
echo "║  Image:   ${IMAGE_NAME}"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Generate debug keystore + credentials.json if not present
if [ ! -f "$PROJECT_DIR/credentials.json" ]; then
    echo "🔑 Generating debug keystore for local builds..."
    docker run --rm \
        -v "$PROJECT_DIR":/app \
        -w /app \
        "$IMAGE_NAME" \
        keytool -genkeypair \
            -alias debug \
            -keyalg RSA -keysize 2048 -validity 10000 \
            -dname "CN=Local Debug,O=FitGlue,L=Local,C=GB" \
            -keystore .local-debug.keystore \
            -storepass android -keypass android

    cat > "$PROJECT_DIR/credentials.json" << 'CREDS'
{
  "android": {
    "keystore": {
      "keystorePath": ".local-debug.keystore",
      "keystorePassword": "android",
      "keyAlias": "debug",
      "keyPassword": "android"
    }
  }
}
CREDS
    echo "✅ Debug keystore created."
    echo ""
fi

# Build the Docker image if it doesn't exist
if ! docker image inspect "$IMAGE_NAME" > /dev/null 2>&1; then
    echo "🐳 Building Docker image (first run — this takes a while)..."
    docker build -f "$PROJECT_DIR/Dockerfile.eas-local" -t "$IMAGE_NAME" "$PROJECT_DIR"
    echo "✅ Docker image built successfully."
    echo ""
fi

# Set environment variable for the profile
EXPO_ENV="production"
if [ "$PROFILE" = "development" ]; then
    EXPO_ENV="development"
elif [ "$PROFILE" = "preview" ]; then
    EXPO_ENV="test"
fi

echo "🔨 Starting local build..."
echo "   Environment: ${EXPO_ENV}"
echo ""

docker run --rm \
    -v "$PROJECT_DIR":/app \
    -w /app \
    -e "EAS_NO_VCS=1" \
    -e "EXPO_TOKEN=${EXPO_TOKEN}" \
    -e "EXPO_PUBLIC_ENVIRONMENT=${EXPO_ENV}" \
    -e "SENTRY_DISABLE_AUTO_UPLOAD=true" \
    -it "$IMAGE_NAME" \
    eas build --profile "$PROFILE" --platform android --local --non-interactive

echo ""
echo "✅ Build complete! APK should be in the mobile/ directory."
