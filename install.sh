#!/bin/bash
set -euo pipefail

REPO="matutetandil/mycel-studio"
INSTALL_DIR="/usr/local/bin"
APP_NAME="MycelStudio"

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

ARTIFACT="${APP_NAME}-${OS}-${ARCH}"

# Get latest release tag
echo "Fetching latest release..."
TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | head -1 | cut -d'"' -f4)

if [ -z "$TAG" ]; then
  echo "Failed to fetch latest release"
  exit 1
fi

echo "Latest release: $TAG"

if [ "$OS" = "darwin" ]; then
  # macOS: download .zip, extract .app to ~/Applications
  URL="https://github.com/$REPO/releases/download/$TAG/${ARTIFACT}.zip"
  DEST="$HOME/Applications"
  mkdir -p "$DEST"

  echo "Downloading $URL..."
  TMPDIR=$(mktemp -d)
  curl -fSL "$URL" -o "$TMPDIR/$ARTIFACT.zip"

  echo "Installing to $DEST/${APP_NAME}.app..."
  rm -rf "$DEST/${APP_NAME}.app"
  unzip -q "$TMPDIR/$ARTIFACT.zip" -d "$DEST"
  rm -rf "$TMPDIR"

  # Remove quarantine flag
  echo "Removing quarantine flag..."
  xattr -cr "$DEST/${APP_NAME}.app"

  echo ""
  echo "Installed to $DEST/${APP_NAME}.app"
  echo "You can now open it from ~/Applications or with:"
  echo "  open \"$DEST/${APP_NAME}.app\""

else
  # Linux: download binary to /usr/local/bin
  URL="https://github.com/$REPO/releases/download/$TAG/$ARTIFACT"

  echo "Downloading $URL..."
  TMPFILE=$(mktemp)
  curl -fSL "$URL" -o "$TMPFILE"
  chmod +x "$TMPFILE"

  echo "Installing to $INSTALL_DIR/mycel-studio..."
  if [ -w "$INSTALL_DIR" ]; then
    mv "$TMPFILE" "$INSTALL_DIR/mycel-studio"
  else
    sudo mv "$TMPFILE" "$INSTALL_DIR/mycel-studio"
  fi

  echo ""
  echo "Installed to $INSTALL_DIR/mycel-studio"
  echo "Run with: mycel-studio"
fi
