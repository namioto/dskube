#!/bin/bash
# macOS에서 실행하는 빌드 + 서버 업로드 스크립트
# 사전 조건: Rust, Node.js 설치 (brew install node && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh)

set -e

REMOTE_HOST="namioto@dspark.kro.kr"
REMOTE_PATH="/home/namioto/dskube/landing/downloads"
VERSION=$(cat src-tauri/tauri.conf.json | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])")

echo "==> dskube v$VERSION macOS 빌드 시작"

# 의존성 설치
npm ci

# Apple Silicon 빌드
echo "==> Apple Silicon (aarch64) 빌드..."
rustup target add aarch64-apple-darwin
npm run tauri build -- --target aarch64-apple-darwin
APP_ARM=$(find src-tauri/target/aarch64-apple-darwin/release/bundle/macos -name "*.app" | head -1)
echo "==> Ad-hoc 서명 (aarch64)..."
codesign --force --deep --sign - "$APP_ARM"
DMG_ARM=$(find src-tauri/target/aarch64-apple-darwin/release/bundle/dmg -name "*.dmg" | head -1)
cp "$DMG_ARM" "dskube_${VERSION}_aarch64.dmg"

# Intel 빌드
echo "==> Intel (x64) 빌드..."
rustup target add x86_64-apple-darwin
npm run tauri build -- --target x86_64-apple-darwin
APP_X64=$(find src-tauri/target/x86_64-apple-darwin/release/bundle/macos -name "*.app" | head -1)
echo "==> Ad-hoc 서명 (x64)..."
codesign --force --deep --sign - "$APP_X64"
DMG_X64=$(find src-tauri/target/x86_64-apple-darwin/release/bundle/dmg -name "*.dmg" | head -1)
cp "$DMG_X64" "dskube_${VERSION}_x64.dmg"

echo "==> 빌드 완료. 서버에 업로드합니다..."
scp "dskube_${VERSION}_aarch64.dmg" "$REMOTE_HOST:$REMOTE_PATH/"
scp "dskube_${VERSION}_x64.dmg" "$REMOTE_HOST:$REMOTE_PATH/"

echo "✅ 완료! https://dskube.dspark.kro.kr 에서 다운로드 가능"
