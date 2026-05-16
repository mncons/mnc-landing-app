# ODOO_SETUP.md — Configuración manual previa al Worker `lead-to-odoo`

**Bloqueante:** el Worker NO se codea hasta que este setup esté ejecutado en `https://mnaranjo.odoo.com` y los IDs reales estén en mano vía `tests/odoo-smoke.sh`.

**Duración estimada:** ~1 h primera vez (cuentas: ~10 min cada paso).
**Re-ejecutable:** sí. Idempotente para tags y team (si ya existen, no se duplican).

---

## Pre-requisitos

- [ ] Acceso de administrador a `https://mnaranjo.odoo.com` (super-user MN).
- [ ] Módulos instalados (verificar en Apps):
  - **CRM** (`crm`) — obligatorio
  - **UTM** (`utm`) — viene con CRM/Sales en Odoo 17/18; verificar.
- [ ] El usuario super-user MN tiene grupo "Administración: Configuración" para crear API keys + UTM sources.

---

## Paso 1 — Tags CRM (10 tags obligatorios)

**Ruta UI:**
```
Apps → CRM → Configuración → Etiquetas (CRM Tags)
```

**Crear los siguientes 10 tags con nombre exacto** (mayúsculas/minúsculas importan):

| # | Nombre exacto del tag | Color sugerido | Uso |
|---|---|---|---|
| 1 | `web` | azul | Marca origen "viene del sitio web" |
| 2 | `mnconsultoria.org` | gris | Marca dominio canónico |
| 3 | `smoke-test` | rojo | Solo para leads de prueba durante 2.D. Filtrable para limpieza |
| 4 | `sector-horeca` | naranja | Vertical HORECA 360° |
| 5 | `sector-agroindustria` | verde | Vertical Agroindustria Inteligente |
| 6 | `sector-retail` | amarillo | Vertical Retail Omnicanal |
| 7 | `sector-servicios-profesionales` | púrpura | Vertical Servicios Profesionales |
| 8 | `sector-agencias` | rosa | Vertical Agencias Creativas |
| 9 | `sector-bpm` | celeste | Vertical BPM Inteligente |
| 10 | `sector-marketplace` | gris oscuro | Vertical Marketplace Consultoría |

**Procedimiento por tag:**
1. Botón "Nuevo" arriba a la izquierda.
2. Campo "Nombre del Tag" → pegar el nombre exacto de la columna 2 de arriba.
3. Click en el círculo de color → elegir color de la columna 3 (estético, no funcional).
4. Guardar (botón "Guardar" o Ctrl+S).

**Verificación:** la lista debe mostrar los 10 nombres. Nombres con espacios o capitalización incorrecta van a hacer fallar el script `odoo-smoke.sh` (búsqueda exacta con `[('name','in',[...])]`).

---

## Paso 2 — Sales Team "Web"

**Ruta UI:**
```
Apps → CRM → Configuración → Equipos de venta
```

**Procedimiento:**
1. Botón "Nuevo".
2. Campo "Nombre del Equipo de Ventas" → `Web` (exacto, 3 caracteres).
3. Campo "Alias del Equipo" → opcional, sugerido `web@mnconsultoria.org` (si tenés alias mail configurado en Odoo; si no, dejar vacío).
4. Campo "Líder del Equipo" → el super-user MN.
5. Marcar "CRM" en "Use Pipelines" / "Usar Pipeline".
6. Tab "Members" / "Miembros" → agregar el super-user MN al menos.
7. Guardar.

**Verificación:** en la lista de equipos debe aparecer `Web` con leader = super-user MN.

---

## Paso 3 — UTM Source "Web — mnconsultoria.org"

**Ruta UI:**
```
Apps → CRM → Configuración → UTM → Sources
```
(En Odoo 17/18 puede estar en `Marketing → Configuración → Sources` si tenés Marketing instalado.)

**Procedimiento:**
1. Botón "Nuevo".
2. Campo "Source Name" → `Web — mnconsultoria.org` (con guion largo `—`, no `-`).
3. Guardar.

**Verificación:** el script `odoo-smoke.sh` busca con `ilike "Web — mnconsultoria"` así que matchea con o sin guion largo. Pero **dejarlo con `—` por consistencia con la marca**.

---

## Paso 4 — API Key dedicada del super-user MN

**Ruta UI:**
```
Esquina superior derecha → Click en avatar/iniciales → "Mi Perfil" / "Preferencias"
→ Tab "Cuenta" / "Account Security"
→ Sección "API Keys"
```

**Procedimiento:**
1. Click "Nueva clave API" / "New API Key".
2. Descripción: `mnc-lead-to-odoo · CF Worker · {fecha-actual}`
3. **Duración:** seleccionar 90 días (rotación trimestral declarada en spec §10).
4. Click "Generar Clave" / "Generate Key".
5. **COPIAR LA CLAVE EXACTAMENTE Y GUARDARLA EN BITWARDEN AHORA.** No se puede recuperar después; si se pierde hay que generar otra.
6. Anotar también:
   - Fecha de expiración (90 días desde hoy → 2026-08-13 si ejecutás hoy 2026-05-15).
   - Agregar recordatorio de rotación en calendario para `2026-08-06` (7 días antes).

**Cuestiones de scope:**
- Odoo no permite limitar API key por modelo en UI estándar (Enterprise online). La key tiene los permisos del usuario.
- Mitigación: el super-user MN tiene todos los permisos, pero el Worker SOLO va a llamar `crm.lead.create` y `crm.tag/team/utm.source.search_read`. No hay escalación adicional posible desde el Worker porque está sandboxed por código.
- **Acción Ola 2:** crear un usuario técnico dedicado `worker-web@mnconsultoria.local` con grupos solo de CRM + UTM read, y generar API key sobre ese user. Bajamos blast-radius en caso de leak.

---

## Paso 5 — Notificación email a `leads@mnconsultoria.org` (opcional pero recomendado)

Odoo dispara `mail.activity` automáticamente al crear `crm.lead`. Para que llegue email también a `leads@mnconsultoria.org`:

**Opción A — Server Action sobre create (recomendada):**
```
Apps → Configuración → Técnico → Acciones del Servidor
```
1. Botón "Nuevo".
2. Nombre: `Notify leads@ on web lead created`.
3. Modelo: `crm.lead`.
4. Trigger: `On Creation` (si está disponible) o manual desde una Automation.
5. Tipo de Acción: `Send Email` (o `Execute Code` con un `template.send_mail`).
6. Plantilla email: crear una nueva en `Configuración → Técnico → Plantillas Email` con asunto `Nuevo Lead · {{object.name}}` y destinatario `leads@mnconsultoria.org`.

**Opción B — Suscribir leads@ al equipo `Web`:**
Más simple. En `Sales team Web` → tab "Followers" → agregar `leads@mnconsultoria.org` como follower del equipo. Cualquier lead asignado al equipo dispara mail automático.

**Recomendación Ola 1:** Opción B (5 min vs 30 min, mismo efecto).

---

## Paso 6 — Crear `.dev.vars` local con credentials (para el smoke script)

**ANTES de correr el smoke script**, crear:

```
~/projects/mnc-landing-app/workers/lead-to-odoo/.dev.vars
```

Contenido (sin export, sin comillas para wrangler dev format):
```
ODOO_URL=https://mnaranjo.odoo.com
ODOO_DB=mnaranjo
ODOO_USER=info@mnconsultoria.org
ODOO_API_KEY=<la-key-del-paso-4>
```

> **`ODOO_DB`** suele ser el nombre del subdomain (`mnaranjo` para `mnaranjo.odoo.com`). Si no, verificá en `https://mnaranjo.odoo.com/web/database/selector` (si está habilitado) o pegale a `https://mnaranjo.odoo.com/web/database/list`.

> `.dev.vars` está en `.gitignore` — nunca se commitea. Es solo para `wrangler dev --local` y para el smoke script. Los secrets de producción se ponen con `wrangler secret put` cuando deployemos en 2.B.

---

## Paso 7 — Correr el smoke script

```bash
cd ~/projects/mnc-landing-app
./tests/odoo-smoke.sh
```

**Output esperado** (si todo está bien configurado):

```yaml
# === IDs encontrados (pegar a wrangler secret put) ===

# Tags simples
TAG_WEB:     "12"
TAG_DOMAIN:  "13"
TAG_SMOKE:   "14"

# Tags por sector (JSON único para 1 secret)
TAG_SECTORS: '{"horeca":15,"agroindustria":16,"retail":17,"servicios-profesionales":18,"agencias":19,"bpm":20,"marketplace":21}'

# Sales team
TEAM_WEB: "5"

# UTM source
UTM_SOURCE_WEB: "8"

# Owner default (super-user MN)
USER_SUPER_MN: "2"
```

(Los IDs reales van a ser distintos en tu Odoo — depende del orden de creación.)

**Si el script falla:**
- `authenticate falló (uid is False)` → revisar `ODOO_USER` (email exacto) y `ODOO_API_KEY` (sin espacios al copiar).
- `TAGS FALTANTES en Odoo` → volver al Paso 1 y crear el tag que falta con nombre exacto.
- `TEAM_WEB: MISSING` → volver al Paso 2.
- `UTM_SOURCE_WEB: MISSING` → volver al Paso 3.

---

## Paso 8 — Crear un Lead de prueba (opcional, recomendado)

Antes de avanzar a 2.B, validar que la creación de leads funciona end-to-end:

```bash
./tests/odoo-smoke.sh --create-test-lead
```

Esto crea un `crm.lead` con:
- Nombre: `SMOKE TEST · 20260515-143022` (timestamp UTC)
- Email: `smoke@example.com`
- Tags: `smoke-test`, `web`
- Team: `Web`

**Verificar en UI:** `Apps → CRM → Pipeline → filtro por tag "smoke-test"`. El Lead debe aparecer.

**Después del smoke completo (post-2.D), limpieza:** filtrar todos los leads con tag `smoke-test` y borrarlos en bulk. El tag se queda para futuras iteraciones.

---

## Paso 9 — Devolver los IDs a Claude Code

Después del Paso 7, pegame la salida YAML completa del script al chat. Con eso:

1. Configuro los secrets en `wrangler.toml` declarations (sin valores).
2. Vos corrés `wrangler secret put TAG_WEB` (etc.) en local cuando lleguemos al deploy de 2.B.
3. Para `wrangler dev --local` los toma de `.dev.vars` automáticamente.

---

## Riesgos y mitigaciones de este setup

| Riesgo | Mitigación |
|---|---|
| API key compromise → atacante crea spam leads o lee CRM | Rotación trimestral declarada (cron en calendario). Ola 2: usuario técnico dedicado con scope CRM only |
| Smoke leads ensucian el pipeline | Tag `smoke-test` filtrable. Limpieza post-2.D obligatoria |
| Nombre de tag mal escrito (mayúscula extra, espacio) | Script busca con `name in [...]` exacto y reporta missing. Caso atrapado |
| Odoo cambia API XML-RPC en upgrade | Acción Ola 2 cuando suceda. Worker encapsula, un solo punto de cambio |
| `.dev.vars` se commitea por error | `.gitignore` ya lo cubre. Pre-commit hook con TruffleHog en lote 2.F como segunda barrera |
| API key visible en logs de Worker | Log estructurado del Worker explícitamente excluye `ODOO_API_KEY` y todo header sensible (lote 2.B) |

---

**Última revisión:** 2026-05-15
