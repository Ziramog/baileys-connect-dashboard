You are a senior full-stack engineer. Code the ENTIRE project in one shot, production-ready, no placeholders, no TODOs.

Project root: f:/Baileysconnect
Monorepo structure:

f:/Baileysconnect/
├── apps/
│   ├── api/          ← Express + Baileys (runs on VPS :3000)
│   └── web/          ← Next.js 14 App Router (deploys to Vercel)
└── packages/
    └── shared/       ← TypeScript types shared between both apps

---

## CONTEXT

VPS IP: 194.163.161.99
VPS has pm2 installed globally.
Daemon script already exists at: /home/hermes/workspace/autonomous-daemon/daemon.js
Auth session path: /data/auth-session
State/DB path: /data/wolfim.db (SQLite)
Existing docker ports on VPS: 4001, 4002, 4003, 5003 — do NOT touch these.

---

## apps/api — Express + TypeScript

Generate ALL of these files with full working code:

### Entry & Config
- src/index.ts             → Express app, loads routes, starts BaileysService.init() on boot
- src/config.ts            → reads process.env, exports typed config object
- .env.example             → PORT=3000, API_SECRET=, AUTH_SESSION_PATH=, DB_PATH=, DAEMON_SCRIPT=
- ecosystem.config.js      → pm2 config for wolfim-api and wolfim-daemon
- package.json             → deps: express, @whiskeysockets/baileys, qrcode, better-sqlite3, cors, better-pm2 (or pm2 programmatic api), typescript, @types/*
- tsconfig.json

### Middleware
- src/middleware/auth.ts   → checks x-api-secret header, returns 401 if missing/wrong

### Services
- src/services/baileys.service.ts
  → Singleton class BaileysService
  → Methods: init(), startQRFlow(), reconnect(), disconnect(), getStatus(), getQRPNGBuffer(), sendMessage(phone, text)
  → State machine: idle | waiting | scanned | connected | disconnected
  → On init(): if /data/auth-session/creds.json exists → reconnect() automatically, else → stay idle
  → QR captured with QRCode.toBuffer() from 'qrcode' package
  → Saves phone number from sock.user.id on connection open
  → Auto-reconnect on unexpected disconnect (not loggedOut)

- src/services/db.service.ts
  → Singleton SQLite (better-sqlite3)
  → Creates tables on init: leads, actions_history, settings, stats_daily
  → Exports typed query methods: getLeads(filters), getLeadById(id), insertLead(lead), updateLeadStatus(id, status), insertAction(leadId, action), getStats(), getSettings(), updateSettings(partial)

- src/services/daemon.service.ts
  → Controls daemon.js via pm2 programmatic API
  → Methods: getStatus(), start(), stop(), restart(), getLogs(lines)
  → Returns: { running, pid, uptime, leads_processed_today, next_run, last_run }

### Routes (all require auth middleware)
- src/routes/qr.ts
  GET  /api/qr/status     → { status, phone, qr_available, last_connected }
  GET  /api/qr/image      → res.contentType('image/png') + buffer, 404 if no QR
  POST /api/qr/start      → clears session, calls baileysService.startQRFlow()
  POST /api/qr/disconnect → calls baileysService.disconnect()

- src/routes/daemon.ts
  GET  /api/daemon/status
  POST /api/daemon/start
  POST /api/daemon/stop
  POST /api/daemon/restart
  GET  /api/daemon/logs?lines=50

- src/routes/leads.ts
  GET  /api/leads?status=&city=&page=&limit=
  GET  /api/leads/:id
  POST /api/leads/:id/action   body: { action: 'send_intro'|'send_followup'|'mark_hot'|'discard'|'reset' }
  POST /api/leads/import       body: { leads: RawLead[] }

- src/routes/stats.ts
  GET  /api/stats → { sent_today, sent_week, pending, hot_leads, response_rate, by_city, by_status }

- src/routes/settings.ts
  GET  /api/settings
  PUT  /api/settings

### Other
- src/routes/health.ts  → GET /health → { ok: true, version, uptime }
- nginx.conf            → ready to paste, CORS for Vercel, SSL placeholder comments
- deploy.sh             → bash script: npm install, npm run build, pm2 start ecosystem.config.js, pm2 save

---

## apps/web — Next.js 14 App Router + TypeScript + Tailwind

Generate ALL of these files:

### Config
- package.json
- tsconfig.json
- tailwind.config.ts
- next.config.ts
- .env.local.example   → NEXT_PUBLIC_VPS_API_URL=, API_SECRET=

### API Route Handlers (server-side, hides API_SECRET from client)
- app/api/proxy/[...path]/route.ts
  → Proxies all /api/proxy/* calls to VPS, injects x-api-secret server-side
  → Handles GET, POST, PUT

### lib/
- lib/api.ts     → client fetch wrapper, all calls go to /api/proxy/*
- lib/types.ts   → imports from packages/shared/types

### app/ pages (all with real UI, no placeholders)

- app/layout.tsx          → root layout, sidebar nav, dark theme
- app/page.tsx            → /  Dashboard
  → Shows: WA connection status badge, daemon status + start/stop button, quick stats (sent_today, pending, hot_leads), recent activity feed

- app/connect/page.tsx    → /connect
  → "Iniciar conexión" button → POST /api/qr/start
  → Polls /api/qr/status every 2s
  → Shows QR <img> refreshed every 2s with cache-bust (?t=timestamp)
  → Status messages: "Generando QR...", "Escaneá desde WhatsApp → Dispositivos vinculados", "Conectado como +54XXX"
  → Auto-redirects to / on connected
  → "Desconectar" button when connected

- app/leads/page.tsx      → /leads
  → Table with filters (status dropdown, city input)
  → Columns: nombre, ciudad, teléfono, status badge, última acción, acciones
  → Action buttons per row: send_intro, mark_hot, discard
  → Pagination

- app/leads/[id]/page.tsx → /leads/[id]
  → Full lead detail
  → Action history timeline
  → Manual action buttons
  → Edit notes

- app/stats/page.tsx      → /stats
  → Cards: sent today, sent week, pending, hot leads, response rate
  → Bar chart by city (use recharts or simple CSS bars)
  → Status distribution pie/donut

- app/settings/page.tsx   → /settings
  → Form: business hours (start/end time, days checkboxes, timezone)
  → Cities list (add/remove tags)
  → Message templates (intro, followup_1, followup_2) textareas with variable hints {name}, {city}
  → Daily limit input, cooldown minutes
  → Save button with optimistic update

### components/
- components/StatusBadge.tsx       → colored badge for lead status and WA status
- components/DaemonControl.tsx     → start/stop toggle + uptime display
- components/QRDisplay.tsx         → QR image with auto-refresh + status messages
- components/LeadCard.tsx          → lead row/card with action buttons
- components/Sidebar.tsx           → nav links to all routes
- components/StatsCard.tsx         → metric card with icon

---

## packages/shared/types.ts

Export all shared types:
- QRStatus
- LeadStatus  
- Lead
- LeadAction
- RawLead
- DaemonStatus
- Stats
- Settings
- ApiResponse<T>

---

## RULES

1. Every file must be COMPLETE. No "// ... rest of implementation", no "// TODO", no ellipsis.
2. TypeScript strict mode everywhere.
3. All API calls from Next.js go through the server-side proxy route handler — API_SECRET never in client bundle.
4. BaileysService must be a true singleton (module-level instance, not class instantiation per request).
5. SQLite schema must include indexes on leads(status), leads(city), leads(phone).
6. Error handling: all Express routes wrapped in try/catch, return { error: string } with appropriate HTTP status.
7. CORS in Express: only allow the Vercel domain (configurable via env ALLOWED_ORIGIN).
8. The QR PNG endpoint must set Cache-Control: no-store, no-cache.
9. Tailwind dark theme: bg-zinc-950 base, zinc-900 cards, zinc-800 borders, green-400 accents.
10. Do not use any UI component library. Plain Tailwind only.
11. Output files in order: shared types first, then api/, then web/.
12. After the last file, output a DEPLOY CHECKLIST with exact commands for VPS and Vercel.