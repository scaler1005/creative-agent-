#!/bin/bash
export PATH="$HOME/.local/bin:$PATH"
cd "$(dirname "$0")"

echo "🚀 Creative Agent starten..."
echo ""

# Start dev server als die nog niet draait
if ! lsof -i :3000 -sTCP:LISTEN > /dev/null 2>&1; then
  echo "Dev server starten op port 3000..."
  npm run dev &
  sleep 4
fi

echo ""
echo "Tunnel starten — je krijgt zo een publieke URL..."
echo ""

cloudflared tunnel --url http://localhost:3000
