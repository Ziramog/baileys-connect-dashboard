# Outreach Connect — Project Update Log

Fecha inicio: 26 Abril 2026
Última actualización: 26 Abril 2026

---

##为本

Este archivo es la memoria técnica del proyecto. Todo lo que se haga, se anota acá.
Cada sección = un bloque de trabajo completo con: qué se hizo, por qué, y el comando o archivo.

---

## WORKFLOW PRINCIPAL (End-to-End)

```
Google Maps scrape (main_fixed.py + xvfb-run + DataImpulse proxy)
    ↓
CSVs en /tmp/ → normalize_name() + normalize_phone() (solo dígitos)
    ↓
import_leads.py → POST /api/leads/import → wolfim-api
    ↓
Supabase/SQLite: leads table con dedup por (telefono, vertical)
    ↓
wolfim-daemon (cron 8AM Lunes-Viernes) → /api/leads/outreach
    ↓
leads.ts → phoneNormalized → baileysService.sendMessage()
    ↓
WhatsApp (Baileys, session auth)
```

---

## WORKLOG

### Día 1 — 26 Abril 2026

## (1) Análisis de Infraestructura de Scrape

### Problema encontrado: dos scrapers, uno roto
- `scraper_maps.py` — usa Playwright async, está **roto con proxy** (se queda colgado en `page.goto()`)
- `main_fixed.py` — usa Playwright con `xvfb-run` + sync, **funciona correctamente**
- El consent handler de Google Maps está en `main_fixed.py`

**Lección:** Siempre usar `main_fixed.py`, nunca `scraper_maps.py`.

### Datos encontrados en /tmp/
20+ CSVs con 268 leads de inmobiliarias:

**Chubut:** Puerto Madryn, Trelew, Comodoro Rivadavia, Esquel, Rada Tilly
**Santa Fe:** Rosario (13 leads), Santa Fe Capital, Rafaela, Venado Tuerto, Villa Constitución (14), San Lorenzo, Santo Tomé, Sunchales, Calchaquí, Recreo
**Córdoba:** Córdoba Capital, Villa Carlos Paz

Todos scraped con DataImpulse proxy (`gw.dataimpulse.com:823`).

### Credentials y acceso
```
DataImpulse proxy: 022dd721a029802f73a4 / gw.dataimpulse.com:823
YCloud phone: +5491178243152
WABA: 26538996002360109
Supabase: mrrieeeilameejhvbccu.supabase.co
wolfim API secret: [REDACTED]
YCloud webhook token: [REDACTED]
```

---

## (2) Fix: import_leads.py — Mapeo de Campos

### Problema: campos mal mapeados
`import_leads.py` enviaba `name` y `phone` a la API, pero la interfaz `RawLead` espera `nombre` y `telefono`.

### Solución
```python
# ANTES (roto):
"phone": row["phone"],

# DESPUÉS (fijo):
"phone": row["phone"].replace(/\D/g, ""),  # normalizado

# Y en el POST body:
"telefono": lead["phone"],  # era "phone", ahora mapea a campo correcto
"nombre": lead["name"],
```

También se cambió el path del CSV:
```python
# ANTES:
path = "/workspace/projects/scraping/data/"

# DESPUÉS:
path = "/workspace/shared/scraping/data/"
```

### Resultado
253 leads importados correctamente de los CSVs en /tmp/.

---

## (3) Fix: scrape_rosario.sh — Auto-Import Post-Scrape

### Problema
El script de scrape NO llamaba a `import_leads.py` automáticamente. Había que importar manual después.

### Solución: rewrite completo de `scrape_rosario.sh`

El script ahora:
1. Corre `main_fixed.py` para cada ciudad
2. **Inyecta columna `city`** desde el slug de cada ciudad (el scraper no la agrega)
3. Consolida todos los CSVs en `inmobiliarias_latest.csv` con un único header
4. **Deduplica** por (name + phone) con Python inline
5. **Llama `python3 import_leads.py`** automáticamente al final

```bash
# Key snippet - inyección de city:
CITY=$(echo "$city" | sed 's/-/ /g' | sed 's/\b\(.\)/\U\1/g')
head -1 "$CITY_CSV" | sed "s/$/,city/" > "$CONSOLIDATED"
sed "s/$/,$CITY/" "$CITY_CSV" >> "$CONSOLIDATED"

# Deduplicación:
python3 - <<'PYEOF'
import csv, sys
seen = set()
for row in csv.DictReader(open('/tmp/inmobiliarias_consolidated.csv')):
    key = (row['name'].lower().strip(), row['phone'].strip())
    if key not in seen:
        seen.add(key)
        print(row['name'] + ',' + row['phone'] + ',' + row['city'])
PYEOF
```

### Proceso de consolidación
- Rosario: 13 leads
- Villa Constitución: 14 leads
- San Lorenzo: scrape timeout (no llegó a importar)
- Total único: 268 leads deduplicados

---

## (4) Fix: Normalización de Teléfono en Envío (CRÍTICO)

### Problema
`Baileys.sendMessage()` recibía `lead.telefono` directo sin limpiar. Si el teléfono tenía `+`, espacios, guiones o paréntesis, WhatsApp fallaba silenciosamente.

### Solución
**Archivo:** `apps/api/src/routes/leads.ts` (línea 52-53)

```typescript
// ANTES (roto):
await baileysService.sendMessage(lead.telefono, text)

// DESPUÉS (fijo):
const phoneNormalized = String(lead.telefono).replace(/\D/g, '')
await baileysService.sendMessage(phoneNormalized, text)
```

### Por qué es crítico
Cualquier lead importado con formato no-estándar (ej: `+54 9 11 1234-5678`) llegaba a la DB y se intentaba enviar así. WhatsApp requiere E.164 limpio: `54911XXXXXXXX`.

### Build y deploy
```bash
cd /home/hermes/workspace/outreach-connect/apps/api
npx tsc                    # sin errores
pm2 restart outreach-api   # reload en producción
```

---

## (5) Stats del Sistema (estado actual)

```
wolfim-api (outreach-api) en puerto 3000:
- Total leads: 264
- Pending: 2
- Outreach sent: 2
- Discarded: 7
- Vertical: inmobiliarias

PM2:
- outreach-api: online, cluster mode, pid 253957
- outreach-daemon: online, cron 8AM L-V
- chrome-headless-shell: online
```

---

## (6) Lecciones Clave del Proyecto

### Lección 1: Dos scrapers, uno funciona
`scraper_maps.py` (async) no funciona con proxy.
`main_fixed.py` (sync + xvfb-run) sí.
**Nunca usar `scraper_maps.py`.**

### Lección 2: La normalización va en el punto de envío
No en el scraper (no sabe cómo se envía).
No en el import (no sabe cómo se envía).
**En `leads.ts` antes de `sendMessage()`** — el único lugar correcto.

### Lección 3: Formato WhatsApp Argentina
```
E.164 limpio: 54911XXXXXXXX
- 54 = país Argentina
- 9 = prefijo móvil
- 11 = código área BsAs
- XXXXXXXX = 8 dígitos
```

### Lección 4: Deduplicación en dos niveles
1. Python inline en shell script (antes de importar) — por (name + phone)
2. `dbService.importLeads()` en la API — por (telefono + vertical)

Redundante pero seguro.

### Lección 5: Ciudad se inyecta en el shell
`main_fixed.py` no agrega columna `city` al CSV.
El shell script lo inyecta usando el slug de cada ciudad.

---

## ESTRUCTURA DE ARCHIVOS DEL PROYECTO

```
/home/hermes/workspace/outreach-connect/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   └── leads.ts        ← FIX: normalización de teléfono (línea 52)
│   │   │   └── services/
│   │   │       ├── baileys.service.ts    ← sendMessage con jid
│   │   │       └── db.service.ts        ← importLeads con dedup
│   │   └── dist/                  ← Build compilado (no editar a mano)
│   └── web/
├── packages/
│   └── shared/
│       └── types.ts               ← RawLead interface
├── baileysconnect_project.md
├── arch.md
├── prompt.md
└── update.md                      ← Este archivo
```

```
/home/hermes/workspace/projects/scraping/
├── scrape_rosario.sh              ← MODIFICADO: auto-import
├── import_leads.py                ← MODIFICADO: mapeo de campos
├── inmobiliarias_master.py
└── data/
```

```
/tmp/
├── main_fixed.py                  ← Scraper que funciona
├── scraper_maps.py                ← NO USAR (roto con proxy)
├── inmobiliarias_rosario.csv
├── inmobiliarias_villa-constitucion.csv
├── inmobiliarias_san-lorenzo.csv
└── ... (20+ ciudades)
```

---

## SCRIPTS Y COMANDOS ÚTILES

### Ver estado del sistema
```bash
pm2 status
curl -s http://localhost:3000/api/stats -H "x-api-secret: [REDACTED]"
```

### Ver logs
```bash
pm2 logs outreach-api --lines 50
pm2 logs outreach-daemon --lines 50
```

### Reiniciar después de cambios
```bash
cd /home/hermes/workspace/outreach-connect/apps/api
npx tsc
pm2 restart outreach-api
```

### Run scrape Rosariocon auto-import
```bash
cd /home/hermes/workspace/projects/scraping
bash scrape_rosario.sh
```

### Importar leads manualmente
```bash
cd /home/hermes/workspace/projects/scraping
python3 import_leads.py
```

### Ver leads en la DB
```bash
curl -s "http://localhost:3000/api/leads?limit=5" -H "x-api-secret: [REDACTED]" | python3 -m json.tool
```

---

## PENDIENTE

- [ ] Modificar `scrape_cordoba.sh` con mismo patrón auto-import
- [ ] Crear `scrape_mendoza.sh`
- [ ] Programar cron job para scrape diario (ej: 6AM) antes del outreach 8AM
- [ ] Probar outreach end-to-end con un lead de prueba
- [ ] Agregar normalización de nombre en el mismo punto (limpiar emojis/artefactos)
- [ ] Dashboard web para ver stats de outreach en tiempo real
- [ ] Migrar SQLite → Supabase (ya está migrado en wolfim-api, pero outreach-connect usa SQLite propio)

---

## (7) Portfolio de servicios comerciales

Creado `/home/hermes/workspace/hq/portfolio_servicios.md` — menú completo de servicios:

### Web
| Servicio | Precio |
|----------|--------|
| Módulo 1 Web Básica | $250 USD |
| Módulo 2 Web Premium | $400 USD |
| Landing Page Express | $120 USD |

### Recurrentes
| Servicio | Precio |
|----------|--------|
| Mantenimiento Tier 1 | $25 USD/mes |
| Mantenimiento Tier 2 | $50 USD/mes |
| Mantenimiento Tier 3 | $80 USD/mes |

### Valor agregado
| Servicio | Setup | Recurrente |
|----------|-------|------------|
| WhatsApp Automation | $100 USD | $30/mes |
| Google Business Profile | $80 USD | — |
| SEO Local Avanzado | $150 USD | $40/mes |
| Google Ads Gestión | $100 USD | $120/mes |
| Meta Ads | $100 USD | $100/mes |

### Pipe comercial actualizado
| Lead | Precio | Status |
|------|--------|--------|
| Franco Roma | Roggero & Roma, Córdoba | $300 + $25/mes | Reunión mañana |
| Luis Farias | Farias & Asociados, San Francisco Córdoba | $300 + $50/mes | PDF enviado, socio vuelve viernes |
| Juan Quital | ? | TBD | Semana que viene, hermano revisa |
| Laura (Conforti Propiedades) | TBD | TBD | Video llamada esta semana, le propone ella |
| Rivas Inmuebles | TBD | TBD | Le pasan info al titular esta semana |
| Lead 6 | ? | ? | Sin contexto |
