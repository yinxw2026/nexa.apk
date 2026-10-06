#!/bin/sh
# Build the API AI v2 APK by hand (aapt2 -> javac -> d8 -> zipalign -> apksigner)
set -e

ROOT=/var/minis/shared/aiapp_v2
OUT=/tmp/aiapp_build
AAPT2=/opt/android-tools/bin/aapt2
D8=/opt/android-tools/bin/d8
ZIPALIGN=/var/minis/shared/android-build-tools/zipalign
APKSIGNER=/opt/android-tools/bin/apksigner
AJAR=/opt/android-tools/android-35/android.jar
KS=$ROOT/keystore/debug.keystore

rm -rf "$OUT"
mkdir -p "$OUT/gen" "$OUT/classes" "$OUT/dex"
cd "$ROOT"

echo "[1/8] embed readme"
python3 "$ROOT/tools/mkreadme.py"

echo "[2/8] aapt2 compile"
"$AAPT2" compile --dir res -o "$OUT/compiled.zip"

echo "[3/8] aapt2 link"
"$AAPT2" link -o "$OUT/base.apk" -I "$AJAR" \
  --manifest AndroidManifest.xml --java "$OUT/gen" \
  --min-sdk-version 26 --target-sdk-version 34 \
  -A assets "$OUT/compiled.zip"

echo "[4/8] javac"
javac -encoding UTF-8 --release 8 -nowarn \
  -classpath "$AJAR" -d "$OUT/classes" \
  $(find java -name '*.java') $(find "$OUT/gen" -name '*.java')

echo "[5/8] d8"
"$D8" --min-api 26 --lib "$AJAR" --release --output "$OUT/dex" \
  $(find "$OUT/classes" -name '*.class')

echo "[6/8] package dex into apk"
python3 "$ROOT/tools/pack.py" "$OUT/base.apk" "$OUT/dex/classes.dex" "$OUT/unsigned.apk"

echo "[7/8] zipalign"
"$ZIPALIGN" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

echo "[8/8] sign"
mkdir -p "$ROOT/keystore"
if [ ! -f "$KS" ]; then
  keytool -genkeypair -v -keystore "$KS" -alias nexa -keyalg RSA -keysize 2048 \
    -validity 10000 -storepass android -keypass android \
    -dname "CN=API AI, OU=Dev, O=Dev, L=NA, ST=NA, C=CN" >/dev/null 2>&1
fi
"$APKSIGNER" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android \
  --v1-signing-enabled true --v2-signing-enabled true \
  --out "$OUT/Nexa-1.0.apk" "$OUT/aligned.apk"
rm -f "$OUT/Nexa-1.0.apk.idsig"

ls -l "$OUT/Nexa-1.0.apk"
echo "BUILD OK"
