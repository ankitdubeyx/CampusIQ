#!/usr/bin/env bash
set -e

# ==============================================================================
# CampusIQ - Android APK Build Script
# Student Developer: Ankit Kumar Dubey (Reg. No: 251302058)
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$ROOT_DIR/android-app"
SDK_DIR="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
BUILD_TOOLS_DIR="$SDK_DIR/build-tools/34.0.0"
PLATFORM_JAR="$SDK_DIR/platforms/android-36/android.jar"

echo "=== Building CampusIQ Android APK ==="
echo "Project Root: $ROOT_DIR"
echo "SDK Directory: $SDK_DIR"

if [ ! -f "$BUILD_TOOLS_DIR/aapt2" ]; then
  echo "Error: Android SDK build-tools not found at $BUILD_TOOLS_DIR"
  echo "Please make sure Android SDK build-tools 34.0.0 is installed."
  exit 1
fi

export PATH="$BUILD_TOOLS_DIR:$SDK_DIR/platform-tools:$PATH"

cd "$APP_DIR"
mkdir -p build/gen build/classes build/dex

echo "[1/7] Compiling Android Resources..."
aapt2 compile --dir res -o build/compiled_res.zip

echo "[2/7] Linking Android Resources & Manifest..."
aapt2 link build/compiled_res.zip \
  -I "$PLATFORM_JAR" \
  --manifest AndroidManifest.xml \
  --java build/gen \
  -o build/unaligned_no_dex.apk \
  --auto-add-overlay

echo "[3/7] Compiling Java Sources..."
javac -target 11 -source 11 \
  -cp "$PLATFORM_JAR" \
  -d build/classes \
  build/gen/com/campusiq/app/R.java \
  src/com/campusiq/app/MainActivity.java

echo "[4/7] Dexing Bytecode with D8..."
rm -rf build/dex/*
d8 --lib "$PLATFORM_JAR" --output build/dex $(find build/classes -name "*.class")

echo "[5/7] Packaging classes.dex & offline web assets..."
cp build/unaligned_no_dex.apk build/unaligned.apk
(cd build/dex && zip -q -u ../unaligned.apk classes.dex)
zip -q -r build/unaligned.apk assets

echo "[6/7] 4-Byte ZipAligning APK..."
zipalign -f -p 4 build/unaligned.apk build/CampusIQ_aligned.apk

echo "[7/7] Signing APK with Release/Debug Keystore..."
if [ ! -f build/debug.keystore ]; then
  keytool -genkeypair -v -keystore build/debug.keystore \
    -storepass android -alias androiddebugkey -keypass android \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=CampusIQ,OU=Engineering,O=CampusIQ,L=Campus,ST=Karnataka,C=IN"
fi

apksigner sign --ks build/debug.keystore \
  --ks-pass pass:android --key-pass pass:android \
  --out "$ROOT_DIR/CampusIQ.apk" build/CampusIQ_aligned.apk

# Distribute to user locations
cp "$ROOT_DIR/CampusIQ.apk" "$HOME/Downloads/CampusIQ.apk" 2>/dev/null || true
cp "$ROOT_DIR/CampusIQ.apk" "$HOME/Desktop/CampusIQ.apk" 2>/dev/null || true
cp "$ROOT_DIR/CampusIQ.apk" "$ROOT_DIR/public/CampusIQ.apk" 2>/dev/null || true

echo "=== Build Succeeded! ==="
echo "APK Output: $ROOT_DIR/CampusIQ.apk"
apksigner verify -v "$ROOT_DIR/CampusIQ.apk"
