#!/usr/bin/env bash
# Add TermiusClone to the application menu, with its icon.
# Undo with: rm ~/.local/share/applications/termiusclone.desktop
set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"
apps="$HOME/.local/share/applications"
icons="$HOME/.local/share/icons/hicolor"

for size in 16 24 32 48 64 128 256 512; do
  install -Dm644 "$root/build/icons/icon-$size.png" \
    "$icons/${size}x${size}/apps/termiusclone.png"
done

mkdir -p "$apps"
cat > "$apps/termiusclone.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=TermiusClone
Comment=SSH client with local key files and snippets
Exec=$root/run.sh
Icon=termiusclone
Terminal=false
Categories=Network;RemoteAccess;System;
StartupWMClass=termiusclone
DESKTOP

chmod +x "$apps/termiusclone.desktop"
command -v update-desktop-database >/dev/null && update-desktop-database "$apps" || true
command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -f -t "$icons" 2>/dev/null || true
echo "Installed. Look for TermiusClone in the menu."
