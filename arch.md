# Wolfim — Arquitectura y Guía de Implementación
> WhatsApp Outreach Node · Baileys + Express + Next.js · VPS Contabo 194.163.161.99

---

## 1. Stack de Producción

| Capa | Tecnología | Dónde corre |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Vercel |
| API Gateway | Express 4 | VPS :3000 |
| WhatsApp | Baileys @whiskeysockets | VPS (pm2) |
| Daemon Outreach | daemon.js | VPS (pm2) |
| Storage | SQLite (better-sqlite3) | VPS /data/ |
| Auth Dashboard | API_SECRET header | Vercel + VPS |
| Reverse Proxy | Nginx | VPS :80/:443 |

**IPs / Puertos definitivos:**
```
VPS:   194.163.161.99
Nginx: :443  → proxy_pass :3000  (API Express)
PM2:   wolfim-api    → :3000
       wolfim-daemon → proceso interno (no HTTP propio)
Data:  /data/auth-session/   ← Baileys auth
       /data/wolfim.db       ← SQLite
Ports: 4001, 4002, 4003, 5003 — NO TOCAR
```

---

## 2. Estructura de Repositorios

```
wolfim-dashboard/          ← monorepo local: F:/Baileysconnect/
├── apps/
│   ├── api/               ← Express en VPS
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── config.ts
│   │   │   ├── middleware/auth.ts
│   │   │   ├── routes/{qr,daemon,leads,stats,settings,health}.ts
│   │   │   └── services/{baileys,daemon,db}.service.ts
│   │   ├── ecosystem.config.js
│   │   ├── nginx.conf
│   │   └── deploy.sh
│   └── web/               ← Next.js (Vercel)
│       ├── app/{page,connect,leads,stats,settings}
│       ├── components/{Sidebar,QRDisplay,DaemonControl,LeadCard,StatsCard,StatusBadge}
│       └── lib/{api,types}.ts
└── packages/shared/types.ts
```

---

## 3. Endpoints API — Completos

### Base URL
```
https://api.tudominio.com   (Nginx → VPS :3000)
```

### Auth
Todos los endpoints requieren:
```
x-api-secret: <API_SECRET_ENV>
```

### 3.1 QR

| Método | Path | Respuesta |
|---|---|---|
| GET | `/api/qr/status` | `{ status, phone?, qr_available }` |
| GET | `/api/qr/image` | PNG del QR o 404 |
| POST | `/api/qr/start` | `{ ok: true, message: "..." }` |
| POST | `/api/qr/disconnect` | `{ ok: true }` |

### 3.2 Daemon

| Método | Path | Respuesta |
|---|---|---|
| GET | `/api/daemon/status` | `{ running, pid?, uptime?, leads_processed_today, next_run?, last_run? }` |
| POST | `/api/daemon/start` | `{ ok: true, pid? }` |
| POST | `/api/daemon/stop` | `{ ok: true }` |
| POST | `/api/daemon/restart` | `{ ok: true }` |
| GET | `/api/daemon/logs?lines=50` | `{ logs: string[], timestamp }` |

### 3.3 Leads

| Método | Path | Respuesta |
|---|---|---|
| GET | `/api/leads?status=&city=&page=&limit=` | `{ leads, total, page }` |
| GET | `/api/leads/:id` | Lead completo + historial |
| POST | `/api/leads/:id/action` | `{ ok: true, lead, message_sent? }` |
| POST | `/api/leads/import` | `{ imported, skipped }` |

### 3.4 Stats & Settings

| Método | Path | Respuesta |
|---|---|---|
| GET | `/api/stats` | `{ sent_today, sent_week, pending, hot_leads, response_rate, by_city, by_status }` |
| GET | `/api/settings` | Settings |
| PUT | `/api/settings` | Settings actualizado |

---

## 4. Servicios

### 4.1 BaileysService

**State machine:** `idle | waiting | scanned | connected | disconnected`

- `init()` → si existe `creds.json` reconnect automático, sino idle
- `startQRFlow()` → limpia sesión, genera QR, captura PNG
- `reconnect()` → usa sesión guardada (sin QR), auto-reconecta en desconexión inesperada
- `disconnect()` → logout + limpia archivos
- `getStatus()` → `{ status, phone?, qr_available }`
- `getQRPNGBuffer()` → `Buffer | null`
- `sendMessage(phone, text)` → message ID

### 4.2 DbService

SQLite con better-sqlite3. Tablas:
- `leads` — indexes en (status, city, phone)
- `actions_history` — index en (lead_id)
- `settings` — fila única (id=1)
- `stats_daily` — UPSERT por fecha

### 4.3 DaemonService

Controla `daemon.js` via PM2 programmatic API.

---

## 5. Flujo Auto-Reconexión

```
VPS arranca (reboot / pm2 restart)
    ↓
BaileysService.init()
    ↓
¿Existe /data/auth-session/creds.json?
    ├─ SÍ → reconnect() sin QR → status='connected'
    └─ NO → status='idle' → esperar POST /api/qr/start
```

Una vez vinculado, el daemon puede enviar mensajes sin intervención por semanas/meses.

---

## 6. Estado de Implementación

| Phase | Task | Status |
|---|---|---|
| 1 | Express skeleton + auth + health | ✅ |
| 1 | BaileysService singleton | ✅ |
| 1 | Routes /api/qr/* | ✅ |
| 1 | PM2 ecosystem + deploy.sh | ✅ |
| 1 | Nginx config | ✅ |
| 1 | Next.js scaffold | ✅ |
| 1 | /connect page con polling | ✅ |
| 2 | Routes /api/daemon/* | ✅ |
| 2 | / Dashboard + daemon control | ✅ |
| 2 | /leads table + filtros | ✅ |
| 3 | /api/stats + /stats page | ✅ |
| 3 | /api/settings + /settings page | ✅ |
| 3 | /leads/[id] detail | ✅ |

**TypeScript:** `tsc --noEmit` pasa en `apps/api` y `apps/web`.

---

## 7. Instrucciones de Implementación para Hermes (VPS)

### Paso 0 — Verificar prerrequisitos en VPS

```bash
node --version        # >= 18
npm --version
pm2 --version
nginx -v
```

### Paso 1 — Subir proyecto al VPS

Desde tu **terminal local**:

```bash
# Copiar carpeta api al VPS
scp -r F:/Baileysconnect/apps/api user@194.163.161.99:/home/hermes/workspace/wolfim-api

# O si usas Git:
# En VPS: git clone <repo> && cd wolfim-api/apps/api
```

### Paso 2 — Instalar dependencias

```bash
cd /home/hermes/workspace/wolfim-api/apps/api

# Instalar sin compilar módulos nativos (evita errores de build)
npm install --ignore-scripts

# Si falla better-sqlite3, instalar单独:
npm install better-sqlite3 --ignore-scripts
```

### Paso 3 — Configurar variables de entorno

```bash
cd /home/hermes/workspace/wolfim-api/apps/api
cp .env.example .env
nano .env
```

**Valores requeridos:**

```env
PORT=3000
API_SECRET=<generar con: openssl rand -hex 32>
AUTH_SESSION_PATH=/data/auth-session
DB_PATH=/data/wolfim.db
DAEMON_SCRIPT=/home/hermes/workspace/autonomous-daemon/daemon.js
ALLOWED_ORIGIN=https://tu-app.vercel.app
NODE_ENV=production
```

### Paso 4 — Compilar TypeScript

```bash
npm run build
```

Si falla, verificar Node version: `node --version` (necesita >= 18).

### Paso 5 — Crear directorios de datos

```bash
mkdir -p /data/auth-session
mkdir -p /data
chmod 755 /data
chmod 755 /data/auth-session
```

### Paso 6 — Iniciar con PM2

```bash
cd /home/hermes/workspace/wolfim-api/apps/api

# Iniciar
pm2 start ecosystem.config.js

# Verificar estado
pm2 status

# Ver logs
pm2 logs wolfim-api --lines 50

# Guardar para sobrevivir reboot
pm2 save

# Verificar que responde
curl http://localhost:3000/health
# → {"ok":true,"version":"1.0.0","uptime":...}
```

### Paso 7 — Nginx + SSL

```bash
# Copiar config
sudo cp /home/hermes/workspace/wolfim-api/apps/api/nginx.conf /etc/nginx/sites-available/wolfim-api

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/wolfim-api /etc/nginx/sites-enabled/

# Editar config: cambiar api.tudominio.com por tu dominio real
sudo nano /etc/nginx/sites-available/wolfim-api

# Testear y recargar
sudo nginx -t
sudo systemctl reload nginx
```

**Si tienes dominio con Certbot:**
```bash
sudo certbot --nginx -d api.tudominio.com
sudo systemctl reload nginx
```

**Si NO tienes dominio (solo IP para testing):**
Editar `/etc/nginx/sites-available/wolfim-api`:
```nginx
server_name 194.163.161.99;
```
Y usar `http://194.163.161.99` en vez de dominio.

### Paso 8 — Verificar todos los endpoints

Desde **terminal local**:

```bash
# Health
curl http://localhost:3000/health

# QR status (debe estar idle)
curl -H "x-api-secret: TU_API_SECRET" http://localhost:3000/api/qr/status

# Iniciar generación de QR
curl -X POST -H "x-api-secret: TU_API_SECRET" http://localhost:3000/api/qr/start

# Ver QR como imagen
curl -H "x-api-secret: TU_API_SECRET" http://localhost:3000/api/qr/image -o qr.png

# Daemon status
curl -H "x-api-secret: TU_API_SECRET" http://localhost:3000/api/daemon/status

# Stats
curl -H "x-api-secret: TU_API_SECRET" http://localhost:3000/api/stats

# Settings
curl -H "x-api-secret: TU_API_SECRET" http://localhost:3000/api/settings

# Leads vacíos (primera vez)
curl -H "x-api-secret: TU_API_SECRET" "http://localhost:3000/api/leads?limit=5"
```

### Paso 9 — Deploy Vercel (Web)

```bash
cd F:/Baileysconnect/apps/web

# Instalar
npm install

# Configurar env
cp .env.local.example .env.local
nano .env.local
# NEXT_PUBLIC_VPS_API_URL=https://api.tudominio.com
# API_SECRET=<mismo-secret-del-vps>

# Deploy
vercel --prod
```

O configurar en Dashboard de Vercel:
- `NEXT_PUBLIC_VPS_API_URL` = `https://api.tudominio.com` (o tu IP)
- `API_SECRET` = `<mismo-del-vps>`
- `NEXTAUTH_SECRET` = `<generar-random-largo>`
- `NEXTAUTH_URL` = `https://tu-app.vercel.app`

---

## 8. Problemas Comunes y Soluciones

### better-sqlite3 falla en compilación

```bash
# Usar --ignore-scripts
npm install --ignore-scripts

# O usar sql.js como alternativa (cambiar package.json)
```

### PM2 no inicia

```bash
# Ver logs completos
pm2 logs wolfim-api --err --lines 100

# Ver si puerto 3000 está ocupado
lsof -i :3000

# Reiniciar
pm2 restart wolfim-api
```

### Nginx 502 Bad Gateway

```bash
# Verificar que Express corre
pm2 status
curl http://localhost:3000/health

# Si está caído, reiniciar
pm2 restart wolfim-api

# Ver errores nginx
sudo tail -20 /var/log/nginx/error.log
```

### QR no se genera

```bash
# Ver logs de Baileys
pm2 logs wolfim-api --out --lines 100

# Verificar que /data/auth-session es writable
ls -la /data/auth-session

# Limpiar sesión manual y reintentar
rm -rf /data/auth-session/*
curl -X POST -H "x-api-secret: <secret>" http://localhost:3000/api/qr/start
```

### Daemon no inicia

```bash
# Verificar que existe
ls -la /home/hermes/workspace/autonomous-daemon/daemon.js

# Ver logs
pm2 logs wolfim-daemon --lines 50

# Iniciar manualmente para ver errores
node /home/hermes/workspace/autonomous-daemon/daemon.js
```

---

## 9. Comandos Rápidos de Referencia

```bash
# === VPS ===
pm2 restart wolfim-api          # Reiniciar API
pm2 logs wolfim-api --lines 100 # Ver logs API
pm2 logs wolfim-daemon --lines 50 # Ver logs daemon
pm2 status                      # Estado general
pm2 stop all                    # Detener todo
sudo systemctl reload nginx     # Recargar nginx tras cambio config
sudo certbot renew              # Renovar SSL

# === Testing local ===
curl http://localhost:3000/health
curl -X POST -H "x-api-secret: <secret>" http://localhost:3000/api/qr/start
curl -H "x-api-secret: <secret>" http://localhost:3000/api/qr/image -o qr.png
curl -H "x-api-secret: <secret>" http://localhost:3000/api/leads?limit=5
curl -H "x-api-secret: <secret>" http://localhost:3000/api/stats

# === Desde local hacia VPS ===
scp -r F:/Baileysconnect/apps/api user@194.163.161.99:/home/hermes/workspace/wolfim-api
ssh user@194.163.161.99
```

---

## 10. Checklist Final de Verificación

```
□ Node >= 18 instalado en VPS
□ Proyecto copiado a /home/hermes/workspace/wolfim-api
□ npm install --ignore-scripts completado
□ .env configurado con API_SECRET válido
□ /data/auth-session y /data creados con permisos
□ npm run build exitoso (sin errores TS)
□ pm2 start ecosystem.config.js → status online
□ curl http://localhost:3000/health → {"ok":true,...}
□ Nginx configurado y corriendo
□ SSL certbot configurado (si hay dominio)
□ curl http://api.tudominio.com/health → funciona
□ Vercel deployado y funcionando
□ /connect page scanea QR y conecta WhatsApp
□ Daemon start/stop funciona desde dashboard
□ Leads se pueden importar y filtrar
□ Settings se guardan correctamente
```

---

*Proyecto: Baileysconnect · Stack: Baileys + Express + Next.js + PM2 + Nginx + SQLite · VPS: 194.163.161.99*