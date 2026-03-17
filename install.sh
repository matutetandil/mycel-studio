#!/bin/bash
set -euo pipefail

REPO="matutetandil/mycel-studio"
INSTALL_DIR="/usr/local/bin"
APP_NAME="mycel-studio"

# Detect OS and architecture
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64)  ARCH="amd64" ;;
  aarch64) ARCH="arm64" ;;
  arm64)   ARCH="arm64" ;;
  *)       echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

case "$OS" in
  darwin|linux) ;;
  mingw*|msys*|cygwin*) echo "On Windows, download the .exe from https://github.com/$REPO/releases/latest"; exit 1 ;;
  *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

ARTIFACT="MycelStudio-${OS}-${ARCH}"

# Get latest release tag
echo "Fetching latest release..."
TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | head -1 | cut -d'"' -f4)

if [ -z "$TAG" ]; then
  echo "Failed to fetch latest release"
  exit 1
fi

echo "Latest release: $TAG"

# Download checksums
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

CHECKSUM_URL="https://github.com/$REPO/releases/download/$TAG/checksums.txt"
if curl -fsSL "$CHECKSUM_URL" -o "$TMPDIR/checksums.txt" 2>/dev/null; then
  HAS_CHECKSUMS=true
else
  HAS_CHECKSUMS=false
fi

verify_checksum() {
  local file="$1"
  local name="$2"

  if [ "$HAS_CHECKSUMS" = false ]; then
    return 0
  fi

  EXPECTED=$(grep "$name" "$TMPDIR/checksums.txt" | awk '{print $1}')
  if [ -z "$EXPECTED" ]; then
    echo "Warning: no checksum found for $name, skipping verification"
    return 0
  fi

  if command -v sha256sum &>/dev/null; then
    ACTUAL=$(sha256sum "$file" | awk '{print $1}')
  else
    ACTUAL=$(shasum -a 256 "$file" | awk '{print $1}')
  fi

  if [ "$EXPECTED" != "$ACTUAL" ]; then
    echo "Checksum verification failed!"
    echo "  Expected: $EXPECTED"
    echo "  Actual:   $ACTUAL"
    exit 1
  fi

  echo "Checksum verified."
}

if [ "$OS" = "darwin" ]; then
  # macOS: download .zip, extract .app to ~/Applications
  URL="https://github.com/$REPO/releases/download/$TAG/${ARTIFACT}.zip"
  DEST="$HOME/Applications"
  mkdir -p "$DEST"

  echo "Downloading $URL..."
  curl -fSL "$URL" -o "$TMPDIR/$ARTIFACT.zip"

  verify_checksum "$TMPDIR/$ARTIFACT.zip" "${ARTIFACT}.zip"

  # Remove existing installation before extracting
  echo "Installing to $DEST/$APP_NAME.app..."
  rm -rf "$DEST/$APP_NAME.app"
  unzip -q "$TMPDIR/$ARTIFACT.zip" -d "$DEST"

  # Remove quarantine flag
  echo "Removing quarantine flag..."
  xattr -cr "$DEST/$APP_NAME.app"

  echo ""
  echo "Installed to $DEST/$APP_NAME.app"
  echo "You can now open it from ~/Applications or with:"
  echo "  open \"$DEST/$APP_NAME.app\""

else
  # Linux: download binary to /usr/local/bin
  URL="https://github.com/$REPO/releases/download/$TAG/$ARTIFACT"

  echo "Downloading $URL..."
  curl -fSL "$URL" -o "$TMPDIR/$ARTIFACT"

  verify_checksum "$TMPDIR/$ARTIFACT" "$ARTIFACT"

  chmod +x "$TMPDIR/$ARTIFACT"

  if [ -f "$INSTALL_DIR/mycel-studio" ]; then
    echo "Upgrading existing installation..."
  fi

  echo "Installing to $INSTALL_DIR/mycel-studio..."
  if [ -w "$INSTALL_DIR" ]; then
    mv -f "$TMPDIR/$ARTIFACT" "$INSTALL_DIR/mycel-studio"
  else
    sudo mv -f "$TMPDIR/$ARTIFACT" "$INSTALL_DIR/mycel-studio"
  fi

  echo ""
  echo "Installed to $INSTALL_DIR/mycel-studio"
  echo "Run with: mycel-studio"
fi
