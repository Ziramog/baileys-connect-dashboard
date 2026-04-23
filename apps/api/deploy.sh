#!/bin/bash
set -e

echo "[Deploy] Installing dependencies..."
npm install

echo "[Deploy] Building..."
npm run build

echo "[Deploy] Creating data directories..."
mkdir -p /data/auth-session

echo "[Deploy] Copying env file..."
cp .env.example .env 2>/dev/null || true

echo "[Deploy] Starting with PM2..."
pm2 start ecosystem.config.js
pm2 save

echo "[Deploy] Done. Checking status..."
pm2 status