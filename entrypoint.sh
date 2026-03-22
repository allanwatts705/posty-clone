#!/bin/bash
set -e



# --- 📦 Installing Proxy Libs ---
cd /tmp
npm install http-proxy
cd /app

# --- 🗄️ Initializing Database ---
npx prisma@5.22.0 db push --schema ./libraries/nestjs-libraries/src/database/prisma/schema.prisma --accept-data-loss

# --- ⏳ Starting Temporal ---
temporal server start-dev --ip 0.0.0.0 --ui-port 8233 &
sleep 5

echo "--- ⚡ Starting Backend ---"
PORT=4000 pm2 start pnpm --name backend --cwd /app/apps/backend -- run start

echo "--- 🎨 Starting Frontend ---"
PORT=5000 HOSTNAME=0.0.0.0 pm2 start pnpm --name frontend --cwd /app/apps/frontend -- run start

echo "--- 🤖 Starting Orchestrator ---"
pm2 start pnpm --name orchestrator --cwd /app/apps/orchestrator -- run start

echo "--- 🚦 Starting Proxy ---"
export NODE_PATH=/tmp/node_modules
node /app/proxy.js &

echo ""
echo "🚀 APP READY: https://allan345-postyiz.hf.space"
echo ""

pm2 logs
