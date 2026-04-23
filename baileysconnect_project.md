# Wolfim — BaileysConnect Project

> WhatsApp Outreach Node · Baileys + Express + Next.js · VPS Contabo

---

## 1. Architecture

### 1.1 Stack

| Layer | Technology | Runs on |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Vercel |
| API Gateway | Express 4 | VPS :3000 |
| WhatsApp | Baileys @whiskeysockets | VPS (pm2) |
| Daemon Outreach | daemon.js | VPS (pm2) |
| Storage | SQLite (better-sqlite3) | VPS /data/ |
| Auth Dashboard | API_SECRET header | Vercel + VPS |
| Reverse Proxy | Nginx | VPS :80/:443 |

### 1.2 Repositories

```
F:/Baileysconnect/              ← monorepo root
├── apps/
│   ├── api/                    ← Express + Baileys (VPS :3000)
│   │   ├── src/
│   │   │   ├── index.ts          ← Entry point
│   │   │   ├── config.ts         ← Env config
│   │   │   ├── middleware/auth.ts
│   │   │   ├── routes/
│   │   │   │   ├── qr.ts
│   │   │   │   ├── daemon.ts
│   │   │   │   ├── leads.ts
│   │   │   │   ├── stats.ts
│   │   │   │   └── settings.ts
│   │   │   └── services/
│   │   │       ├── baileys.service.ts
│   │   │       ├── daemon.service.ts
│   │   │       └── db.service.ts
│   │   ├── ecosystem.config.js
│   │   ├── deploy.sh
│   │   └── nginx.conf
│   └── web/                    ← Next.js (Vercel)
│       ├── app/
│       │   ├── page.tsx              → /  Dashboard
│       │   ├── connect/page.tsx      → /connect  QR flow
│       │   ├── leads/page.tsx        → /leads
│       │   ├── leads/[id]/page.tsx  → /leads/[id]
│       │   ├── stats/page.tsx        → /stats
│       │   └── settings/page.tsx      → /settings
│       ├── components/
│       │   ├── Sidebar.tsx
│       │   ├── QRDisplay.tsx
│       │   ├── DaemonControl.tsx
│       │   ├── LeadCard.tsx
│       │   ├── StatusBadge.tsx
│       │   └── StatsCard.tsx
│       └── lib/
│           ├── api.ts
│           └── types.ts
└── packages/
    └── shared/
        └── types.ts
```

### 1.3 Infrastructure

```
VPS:   194.163.161.99
Nginx: :443  → proxy_pass :3000  (API Express)
PM2:   wolfim-api    → :3000
       wolfim-daemon → /home/hermes/workspace/autonomous-daemon/daemon.js

Data dirs:
  /data/auth-session/   ← Baileys auth state
  /data/wolfim.db       ← SQLite DB

Existing docker ports: 4001, 4002, 4003, 5003 — do NOT touch
```

---

## 2. Shared Types

```typescript
// packages/shared/types.ts

export type QRStatus = 'idle' | 'waiting' | 'scanned' | 'connected' | 'disconnected'
export type LeadStatus = 'new' | 'contacted' | 'followup_1' | 'followup_2' | 'hot' | 'discarded'

export interface LeadAction {
  action: string
  timestamp: string
  message_sent?: string
}

export interface Lead {
  id: string; name: string; phone: string; city: string
  status: LeadStatus; created_at: string; last_contact?: string
  notes?: string; actions_history: LeadAction[]
}

export interface DaemonStatus {
  running: boolean; pid?: number; uptime?: number
  leads_processed_today: number; next_run?: string; last_run?: string
}

export interface Stats {
  sent_today: number; sent_week: number; pending: number; hot_leads: number
  response_rate: number; conversion_rate: number
  by_city: { city: string; count: number }[]
  by_status: { status: string; count: number }[]
}

export interface Settings {
  business_hours: { start: string; end: string; timezone: string; days: number[] }
  cities: string[]
  message_templates: { intro: string; followup_1: string; followup_2: string }
  cooldown_minutes: number; daily_limit: number
}
```

---

## 3. API Express — Endpoints

### Base URL
```
https://api.tudominio.com   (Nginx → VPS :3000)
```

### Auth
All endpoints require header: `x-api-secret: <API_SECRET_ENV>`

### QR

| Method | Path | Response |
|---|---|---|
| GET | `/api/qr/status` | `{ status, phone?, qr_available, last_connected? }` |
| GET | `/api/qr/image` | PNG image or 404 |
| POST | `/api/qr/start` | `{ ok: true, message: "QR generation started" }` |
| POST | `/api/qr/disconnect` | `{ ok: true }` |

### Daemon

| Method | Path | Response |
|---|---|---|
| GET | `/api/daemon/status` | DaemonStatus |
| POST | `/api/daemon/start` | `{ ok: true, pid?: number }` |
| POST | `/api/daemon/stop` | `{ ok: true }` |
| POST | `/api/daemon/restart` | `{ ok: true }` |
| GET | `/api/daemon/logs?lines=50` | `{ logs: string[], timestamp }` |

### Leads

| Method | Path | Response |
|---|---|---|
| GET | `/api/leads?status=&city=&page=&limit=` | `{ leads, total, page }` |
| GET | `/api/leads/:id` | Lead (full + history) |
| POST | `/api/leads/:id/action` | `{ ok: true, lead, message_sent? }` |
| POST | `/api/leads/import` | `{ imported, skipped }` |

### Stats & Settings

| Method | Path | Response |
|---|---|---|
| GET | `/api/stats` | Stats |
| GET | `/api/settings` | Settings |
| PUT | `/api/settings` | Settings (updated) |

---

## 4. Services

### 4.1 BaileysService

Singleton class managing WhatsApp connection.

**State machine:** `idle | waiting | scanned | connected | disconnected`

**Methods:**
- `init()` — checks for existing `/data/auth-session/creds.json` → auto-reconnect or stay idle
- `startQRFlow()` — clean session, generate new QR via Baileys, capture QR as PNG buffer
- `reconnect()` — use saved session (no QR), auto-reconnect on unexpected disconnect
- `disconnect()` — logout, clean session files
- `getStatus()` → `{ status, phone?, qr_available }`
- `getQRPNGBuffer()` → `Buffer | null`
- `sendMessage(phone, text)` → message ID

### 4.2 DbService

Singleton SQLite wrapper using better-sqlite3.

**Tables:**
- `leads` — indexed on (status, city, phone)
- `actions_history` — indexed on (lead_id)
- `settings` — single row (id=1)
- `stats_daily` — date-primary, UPSERT for counters

**Key methods:** `getLeads(filters)`, `getLeadById(id)`, `insertLead(raw)`, `importLeads([])`, `updateLeadStatus(id, status)`, `insertAction(leadId, action, msg?)`, `getStats()`, `getSettings()`, `updateSettings(partial)`

### 4.3 DaemonService

Controls `daemon.js` via PM2 programmatic API.

**Methods:** `getStatus()`, `start()`, `stop()`, `restart()`, `getLogs(lines)`

---

## 5. Frontend — Next.js Pages

| Route | Page | Features |
|---|---|---|
| `/` | Dashboard | WA status badge, daemon control, quick stats, activity feed |
| `/connect` | QR Connect | Poll every 2s, display QR img, auto-redirect on connect |
| `/leads` | Leads Table | Filter by status/city, pagination, action buttons per row |
| `/leads/[id]` | Lead Detail | Full lead info, action history timeline, notes, action buttons |
| `/stats` | Stats | Cards (sent today/week, pending, hot), bar charts by city & status |
| `/settings` | Settings | Business hours, cities (tag input), message templates, limits |

All API calls from Next.js go through `/api/proxy/[...path]` route handler — API_SECRET is injected server-side, never exposed to client.

---

## 6. Environment Variables

### VPS — `apps/api/.env`

```env
PORT=3000
API_SECRET=<generar-con-openssl-rand-hex-32>
AUTH_SESSION_PATH=/data/auth-session
DB_PATH=/data/wolfim.db
DAEMON_SCRIPT=/home/hermes/workspace/autonomous-daemon/daemon.js
ALLOWED_ORIGIN=https://your-app.vercel.app
NODE_ENV=production
```

### Vercel — `.env.local`

```env
NEXT_PUBLIC_VPS_API_URL=https://api.tudominio.com
API_SECRET=<same-as-vps>
NEXTAUTH_SECRET=<generate-long-random>
NEXTAUTH_URL=https://your-app.vercel.app
```

---

## 7. Auto-Reconnect Flow

```
VPS starts (reboot / pm2 restart)
    ↓
BaileysService.init()
    ↓
Does /data/auth-session/creds.json exist?
    ├─ YES → reconnect() (no QR) → status='connected'
    └─ NO  → status='idle' → wait for POST /api/qr/start
```

Once connected, daemon can send messages without human intervention for weeks/months.

---

## 8. Implementation Status

| Phase | Task | Status |
|---|---|---|
| 1 | Express app skeleton + auth + health check | ✅ Done |
| 1 | BaileysService singleton | ✅ Done |
| 1 | Routes /api/qr/* | ✅ Done |
| 1 | PM2 ecosystem config + deploy script | ✅ Done |
| 1 | Nginx config + SSL | ✅ Done |
| 1 | Next.js scaffold | ✅ Done |
| 1 | /connect page with 2s polling | ✅ Done |
| 2 | Routes /api/daemon/* | ✅ Done |
| 2 | / Dashboard + daemon control | ✅ Done |
| 2 | /api/leads + /leads table | ✅ Done |
| 3 | /api/stats + /stats page | ✅ Done |
| 3 | /api/settings + /settings page | ✅ Done |
| 3 | /leads/[id] detail page | ✅ Done |

**TypeScript:** `tsc --noEmit` passes in both `apps/api` and `apps/web`.

---

## 9. VPS Implementation Instructions (For Hermes)

### Step 0 — Prerequisites on VPS

Check that these are available:

```bash
node --version        # >= 18
npm --version
pm2 --version
nginx -v
mkdir --version
```

### Step 1 — Upload Project to VPS

From your **local terminal** (not VPS), copy the project to VPS:

```bash
# Using scp (replace with your VPS credentials)
scp -r F:/Baileysconnect/apps/api user@194.163.161.99:/home/hermes/workspace/wolfim-api
```

Or if using Git:
```bash
# On VPS
cd /home/hermes/workspace
git clone <your-repo-url> wolfim-api
cd wolfim-api/apps/api
```

### Step 2 — Install Dependencies

```bash
cd /home/hermes/workspace/wolfim-api/apps/api

# Install dependencies (--ignore-scripts avoids native module build failures on some VPS)
npm install --ignore-scripts

# If better-sqlite3 fails, install it separately:
npm install better-sqlite3 --ignore-scripts
```

### Step 3 — Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit with your secrets
nano .env
```

**Must set these values in `.env`:**

```env
PORT=3000
API_SECRET=<generate with: openssl rand -hex 32>
AUTH_SESSION_PATH=/data/auth-session
DB_PATH=/data/wolfim.db
DAEMON_SCRIPT=/home/hermes/workspace/autonomous-daemon/daemon.js
ALLOWED_ORIGIN=https://your-app.vercel.app
NODE_ENV=production
```

### Step 4 — Build TypeScript

```bash
npm run build
```

If build fails, check Node version: `node --version` (needs >= 18).

### Step 5 — Create Data Directories

```bash
mkdir -p /data/auth-session
mkdir -p /data
chmod 755 /data
chmod 755 /data/auth-session
```

### Step 6 — Start with PM2

```bash
# Start the API
pm2 start ecosystem.config.js

# Verify it's running
pm2 status

# Check logs
pm2 logs wolfim-api --lines 50

# Save process list (survives reboot)
pm2 save
```

Verify:
```bash
curl http://localhost:3000/health
# → {"ok":true,"version":"1.0.0","uptime":...}
```

### Step 7 — Nginx + SSL

```bash
# Copy nginx config
sudo cp /home/hermes/workspace/wolfim-api/apps/api/nginx.conf /etc/nginx/sites-available/wolfim-api

# Enable the site
sudo ln -s /etc/nginx/sites-available/wolfim-api /etc/nginx/sites-enabled/

# Edit the config to replace "api.tudominio.com" with your actual domain
sudo nano /etc/nginx/sites-available/wolfim-api

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

**If using Certbot for SSL:**
```bash
sudo certbot --nginx -d api.tudominio.com
sudo systemctl reload nginx
```

**If no domain, just use IP (for testing only):**
```nginx
# Edit nginx.conf and replace server_name api.tudominio.com;
# with your VPS IP: server_name 194.163.161.99;
```

### Step 8 — Verify API Endpoints

Test all endpoints from **local terminal**:

```bash
# Health check
curl http://localhost:3000/health

# QR status (should be idle)
curl -H "x-api-secret: YOUR_API_SECRET" http://localhost:3000/api/qr/status

# Start QR flow (this will generate a QR)
curl -X POST -H "x-api-secret: YOUR_API_SECRET" http://localhost:3000/api/qr/start

# Check QR status again
curl -H "x-api-secret: YOUR_API_SECRET" http://localhost:3000/api/qr/status

# Daemon status
curl -H "x-api-secret: YOUR_API_SECRET" http://localhost:3000/api/daemon/status

# Stats
curl -H "x-api-secret: YOUR_API_SECRET" http://localhost:3000/api/stats
```

### Step 9 — Vercel Deployment (Web App)

```bash
cd apps/web

# Install dependencies
npm install

# Copy and configure env
cp .env.local.example .env.local
nano .env.local
# Fill: NEXT_PUBLIC_VPS_API_URL=https://api.tudominio.com
#       API_SECRET=<same-as-vps>

# Deploy
vercel --prod
```

Or set env vars in Vercel Dashboard:
- `NEXT_PUBLIC_VPS_API_URL` = `https://api.tudominio.com`
- `API_SECRET` = `<same-as-vps>`
- `NEXTAUTH_SECRET` = `<generate-random>`
- `NEXTAUTH_URL` = `https://your-app.vercel.app`

---

## 10. Common Issues & Solutions

### Issue: `better-sqlite3` fails to build on VPS

```bash
# Solution: use --ignore-scripts, rely on prebuilt binaries
npm install --ignore-scripts

# Or if VPS has old glibc, use sql.js instead (swap better-sqlite3 for sql.js)
```

### Issue: PM2 process not starting

```bash
# Check logs
pm2 logs wolfim-api --err --lines 100

# Check if port 3000 is in use
lsof -i :3000

# Kill conflicting process if needed
pm2 delete all
pm2 start ecosystem.config.js
```

### Issue: Nginx 502 Bad Gateway

```bash
# Check if Express is running
pm2 status
curl http://localhost:3000/health

# If Express is down, restart it
pm2 restart wolfim-api

# Check nginx error logs
sudo tail -20 /var/log/nginx/error.log
```

### Issue: WhatsApp QR not generating

```bash
# Check Baileys logs
pm2 logs wolfim-api --out --lines 100

# Ensure /data/auth-session is writable
ls -la /data/auth-session

# Manually clean session and retry
rm -rf /data/auth-session/*
curl -X POST -H "x-api-secret: <secret>" http://localhost:3000/api/qr/start
```

### Issue: Daemon won't start

```bash
# Verify daemon script exists
ls -la /home/hermes/workspace/autonomous-daemon/daemon.js

# Check PM2 daemon logs
pm2 logs wolfim-daemon --lines 50

# Start manually to see errors
node /home/hermes/workspace/autonomous-daemon/daemon.js
```

---

## 11. Quick Reference Commands

```bash
# === VPS Commands ===

# Restart API
pm2 restart wolfim-api

# View API logs
pm2 logs wolfim-api --lines 100

# View daemon logs
pm2 logs wolfim-daemon --lines 100

# Check status
pm2 status

# Stop everything
pm2 stop all

# Reload nginx after config change
sudo systemctl reload nginx

# Check SSL cert expiry
sudo certbot certificates

# Renew SSL
sudo certbot renew

# === Testing ===

# Test health
curl http://localhost:3000/health

# Test QR start
curl -X POST -H "x-api-secret: <secret>" http://localhost:3000/api/qr/start

# Test QR image
curl -H "x-api-secret: <secret>" http://localhost:3000/api/qr/image -o qr.png

# Test leads
curl -H "x-api-secret: <secret>" http://localhost:3000/api/leads?limit=5

# Test stats
curl -H "x-api-secret: <secret>" http://localhost:3000/api/stats

# Test settings
curl -H "x-api-secret: <secret>" http://localhost:3000/api/settings

# === From Local Terminal ===

# Copy project to VPS
scp -r F:/Baileysconnect/apps/api user@194.163.161.99:/home/hermes/workspace/wolfim-api

# SSH into VPS
ssh user@194.163.161.99
```

---

*Generated project: Baileysconnect · Baileys + Express + Next.js + PM2 + Nginx + SQLite*