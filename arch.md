# Wolfim — Arquitectura y Guía de Implementación

> WhatsApp Outreach Node · Baileys + Express + Next.js · VPS Contabo 194.163.161.99
> Actualizado: 2026-05-01

---

## 1. Stack de Producción

| Capa | Tecnología | Dónde corre |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Vercel (outreach-wolfim.vercel.app) |
| API Gateway | Express 4 | VPS :3000 → api.wolfim.com |
| WhatsApp | Baileys @whiskeysockets | VPS (pm2 outreach-daemon) |
| Daemon Outreach | daemon.js | VPS (pm2 outreach-daemon) |
| Lead Database | Supabase (PostgreSQL) | Cloud |
| Session Storage | Baileys session files | VPS /home/hermes/data/baileys-connect/ |
| Reverse Proxy | Nginx + SSL | VPS :443 |

**Repositorios:**
- Dashboard/API: `https://github.com/Ziramog/outreach-connect-dashboard`
- Daemon: `https://github.com/Ziramog/outreach-connect-daemon`

**IPs / Puertos:**
```
VPS:   194.163.161.99
API:   :3000 (PM2: outreach-api)
Daemon: outreach-daemon (PM2: outreach-daemon)
Nginx: :443 → api.wolfim.com → :3000
Ports: 4001, 4002, 4003, 5003 — Docker (no tocar)
Data:  /home/hermes/data/baileys-connect/ ← session + status
```

---

## 2. Anti-Ban Strategy (Implementado)

### Límite Diario
- **Máximo 20 mensajes por día** (Argentina time, reset 03:00 UTC)
- Contador persiste en `state.json` → `daily_stats.sent_today`
- Al alcanzar el límite: log `[Cap] DAILY LIMIT REACHED` y skip todo envío

### Delay Variable
- **15-45 segundos random** entre cada mensaje (antes era fijo 2.5s)
- Función `getVariableDelay()` genera delay aleatorio
- Log muestra delay real: `[Delay] 23.4s`

### Ramp-Up (Post-Reconexión)
Después de offline prolongado, el daemon limita automáticamente:

| Tiempo offline | Límite diario | Estado |
|---|---|---|
| Fresh start (sin historial) | 5 msgs/día | `[RampUp] Fresh start — 5 msgs/day` |
| >72 horas offline | 5 msgs/día | `[RampUp] Offline>72h — 5/day` |
| 24-72 horas offline | 10 msgs/día | `[RampUp] Offline>24h — 10/day` |
| <24 horas offline | 20 msgs/día (full) | `[RampUp] Normal — 20/day` |

Tracking: `state.json` → `last_message_at` para calcular horas offline.

### Horario Comercial
- **8 AM - 5 PM Argentina** (UTC-3)
- Sábados y domingos: no se envía
- Fuera de horario: log `[Business Hours] Outside schedule — skipping outreach`

### Mensajes Más Naturaless
-Máx 3-4 líneas
- Sin asteriscos ni mayúsculas excesivas
- Emojis mínimos
- Greeting variado (¡Hola! / Buenas tardes / Hola / Buenas)
- Templates en `outreach.js`:

```javascript
intro_es: "Buenas tardes, soy Juan. Trabajo creando web para inmobiliarias que attract clientes sin depender solo de Instagram. ¿Te interesa saber más?"
followup_1: "¡Hola! Te escribí hace unos días sobre crear una web para tu inmobiliaria. ¿Tuviste tiempo de verlo?"
followup_2: "Hola de nuevo. Solo quería confirmar si les interesa recibir más info sobre generar consultas desde su propia web."
```

---

## 3. Estructura de Repositorios

```
outreach-connect-dashboard/     ← monorepo local: F:/hermes-workspace/outreach-connect-dashboard/
├── apps/
│   ├── api/                   ← Express API en VPS (PM2: outreach-api)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── config.ts
│   │   │   ├── middleware/auth.ts
│   │   │   ├── routes/{qr,daemon,leads,stats,settings,health,webhook}.ts
│   │   │   └── services/{baileys,daemon,db}.service.ts
│   │   └── dist/              ← compiled output (VPS)
│   └── web/                   ← Next.js (Vercel)
│       ├── app/{page,connect,leads,stats,settings}
│       ├── components/{Sidebar,QRDisplay,DaemonControl,LeadCard,StatsCard,StatusBadge,LogTerminal}
│       ├── contexts/WhatsAppContext.tsx
│       └── lib/{api,types}.ts
└── packages/shared/types.ts

outreach-connect-daemon/        ← daemon repo en VPS: /home/hermes/workspace/projects/outreach-connect-daemon/
├── daemon.js                   ← main loop + anti-ban
├── baileys-relay.js            ← WhatsApp connection + forceReconnect
├── outreach.js                 ← message templates + classifyReply
├── state.js                    ← state persistence
├── leads.js                    ← lead management
├── notifier.js                 ← notifications
└── ecosystem.config.js
```

---

## 4. Endpoints API

### Base URL
```
Vercel → /api/proxy/* → http://194.163.161.99:3000/api/*
```

### Auth
Todos requieren header: `x-api-secret: <API_SECRET>`

### 4.1 QR

| Método | Path | Descripción |
|---|---|---|
| GET | `/api/qr/status` | `{ status, phone?, qr_available }` |
| GET | `/api/qr/image` | PNG del QR o 404 |
| POST | `/api/qr/start` | Inicia generación de QR |
| POST | `/api/qr/disconnect` | Cierra sesión WhatsApp |
| POST | `/api/qr/regenerate` | Borra sesión, genera nuevo QR (via control.json) |

### 4.2 Daemon

| Método | Path | Descripción |
|---|---|---|
| GET | `/api/daemon/status` | `{ running, pid?, uptime?, leads_processed_today }` |
| POST | `/api/daemon/start` | Inicia daemon |
| POST | `/api/daemon/stop` | Detiene daemon |
| POST | `/api/daemon/restart` | Reinicia daemon |
| GET | `/api/daemon/logs?lines=50` | `{ logs: string[] }` |

### 4.3 Leads

| Método | Path | Descripción |
|---|---|---|
| GET | `/api/leads?status=&city=&page=&limit=` | `{ leads, total, page }` |
| GET | `/api/leads/:id` | Lead completo |
| POST | `/api/leads/:id/action` | `{ ok, lead, message_sent? }` |
| POST | `/api/leads/import` | `{ imported, skipped }` |

### 4.4 Stats & Settings

| Método | Path | Descripción |
|---|---|---|
| GET | `/api/stats` | Stats desde Supabase |
| GET | `/api/settings` | Settings |
| PUT | `/api/settings` | Actualizar settings |

---

## 5. Flujo de Auto-Reconexión WhatsApp

```
[Dashboard] POST /qr/regenerate
    ↓
[API] Escribe /home/hermes/data/baileys-connect/control.json → { "action": "reconnect" }
    ↓
[Daemon] checkControl() detecta el file, llama baileysRelay.forceReconnect()
    ↓
[Baileys Relay] Borra session-* files, update status → 'reconnecting'
    ↓
[Baileys Relay] sock.end(), sock = null
    ↓
[Daemon] Reconnect con nuevo QR
```

**Control File:** `/home/hermes/data/baileys-connect/control.json`

---

## 6. Comandos Rápidos

```bash
# === VPS ===
pm2 restart outreach-api           # Reiniciar API
pm2 restart outreach-daemon       # Reiniciar daemon
pm2 logs outreach-daemon --lines 50  # Ver logs daemon
pm2 status                        # Estado de PM2

# === Local → VPS ===
ssh root@194.163.161.99

# === Testing ===
curl -H "x-api-secret: <SECRET>" http://localhost:3000/api/qr/status
curl -H "x-api-secret: <SECRET>" http://localhost:3000/api/stats
curl -H "x-api-secret: <SECRET>" http://localhost:3000/api/leads?limit=5
```

---

## 7. Variables de Entorno

### VPS (PM2 ecosystem o .env)
```
API_SECRET=30038fa230438403eeb24caa3c2670d1f62eeb36fcc80f82f7da4eca6b2c9d45
SUPABASE_URL=https://mrrieeeilameejhvbccu.supabase.co
SUPABASE_SERVICE_KEY=<key>
PORT=3000
```

### Vercel
```
NEXT_PUBLIC_VPS_API_URL=http://194.163.161.99:3000
API_SECRET=30038fa230438403eeb24caa3c2670d1f62eeb36fcc80f7da4eca6b2c9d45
```

---

*Wolfim · Anti-ban: 20msg/día · 15-45s delay · Ramp-up · 8AM-5PM Argentina · No fines de semana*