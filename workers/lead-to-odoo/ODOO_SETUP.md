# ODOO_SETUP.md — Configuración manual previa al Worker `lead-to-odoo`

**Bloqueante:** el Worker NO se codea hasta que este setup esté ejecutado en `https://mnconsultoria.odoo.com` y los IDs reales estén en mano vía `tests/odoo-smoke.sh`.

**Duración estimada:** ~1 h primera vez (cuentas: ~10 min cada paso).
**Re-ejecutable:** sí. Idempotente para tags y team (si ya existen, no se duplican).

---

## Pre-requisitos

- [ ] Acceso de administrador a `https://mnconsultoria.odoo.com` (super-user MN, login `info@mnconsultoria.org`).
- [ ] Módulos instalados (verificar en Apps):
  - **CRM** (`crm`) — obligatorio
  - **UTM** (`utm`) — viene con CRM/Sales en Odoo 17/18; verificar.
- [ ] El usuario super-user MN tiene grupo "Administración: Configuración" para crear API keys + UTM sources.
- [ ] **2FA activo en la cuenta del super-user** (Google Authenticator, Authy o similar). Odoo Enterprise online exige 2FA enforced para que el modal de "API Keys → New" sea accesible. **NO desactivar 2FA después.**

---

## Paso 1 — Tags CRM (11 tags obligatorios)

**Ruta UI:**
```
Apps → CRM → Configuración → Etiquetas (CRM Tags)
```

**Crear los siguientes 11 tags con nombre exacto** (mayúsculas/minúsculas importan):

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
| 11 | `sector-manufactura` | marrón | Vertical Manufactura (agregado tras setup real 2026-05-15) |

**Procedimiento por tag:**
1. Botón "Nuevo" arriba a la izquierda.
2. Campo "Nombre del Tag" → pegar el nombre exacto de la columna 2 de arriba.
3. Click en el círculo de color → elegir color de la columna 3 (estético, no funcional).
4. Guardar (botón "Guardar" o Ctrl+S).

**Verificación:** la lista debe mostrar los 10 nombres. Nombres con espacios o capitalización incorrecta van a hacer fallar el script `odoo-smoke.sh` (búsqueda exacta con `[('name','in',[...])]`).

---

## Paso 2 — Sales Team "Sitio web" (re-usar existente)

**Ruta UI:**
```
Apps → CRM → Configuración → Equipos de venta
```

**Importante:** en `mnconsultoria.odoo.com` ya existe un team llamado **"Sitio web"** (con espacio, capitalización exacta). Este es el team a usar — NO crear duplicado "Web". Justificación: user único pago, evitar fragmentación del pipeline.

**Procedimiento (re-uso del existente):**
1. Abrir el team `Sitio web` desde la lista.
2. Verificar que tiene "Use Pipelines" / "Usar Pipeline" activado.
3. **Alias del Equipo** → debe estar configurado en `leads@mnconsultoria.org` (confirmado tras setup real 2026-05-15).
4. **Líder del Equipo** → super-user MN.
5. Tab "Members" / "Miembros" → super-user MN presente.
6. Tab "Followers" / "Seguidores" → agregar `leads@mnconsultoria.org` como follower con suscripciones completas a notificaciones (Opción B del Paso 5 — aplicada).
7. Guardar si hubo cambios.

**Verificación:** smoke script busca con `name = "Sitio web"` exacto. El `ID` se devuelve como `TEAM_WEB` en la salida YAML.

**Si no existe** (Odoo nuevo o ambiente distinto): crear con nombre exacto `Sitio web`, alias `leads@mnconsultoria.org`, leader super-user MN.

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

**Estado real tras setup 2026-05-15:**
- API key activa: **"Landing"** (única dedicada al Worker)
- Vence: **2026-11-11** (180 días — la duración default cuando se eligió la rotación trimestral declarada en el spec se extendió por confort operativo del usuario)
- Rotación calendarizada: **2026-11-04** (7 días antes del vencimiento)
- 2FA con Google Authenticator: **activado y enforced** en el super-user — requisito para que el API key creation modal sea accesible. NO desactivar.

---

## Paso 5 — Notificación email a `leads@mnconsultoria.org`

**Decisión aplicada Ola 1: Opción B** (follower en el team `Sitio web`).

En `Sales team Sitio web` → tab "Followers" / "Seguidores" → `leads@mnconsultoria.org` como follower con **todas las suscripciones de notificación marcadas** (Discussions, Notes, Activities, …). Cualquier `crm.lead` asignado al team dispara mail automático.

**Estado real tras setup 2026-05-15:**
- Follower `leads@mnconsultoria.org` configurado con suscripciones completas — **OK**.
- Plantilla custom de correo creada (`Nuevo Lead · {{object.name}}`) pero **NO asociada a automatización** — queda como artefacto para Ola 2 si se decide cambiar de Opción B a Opción A.

### Email-to-Lead automático (IMAP incoming) — diferido a Ola 2

El alias `leads@mnconsultoria.org` está creado en Odoo y configurado en el team `Sitio web`. **Sin embargo**, el feature "Email-to-Lead" (parsear emails entrantes y crear `crm.lead` automáticamente) requiere un **incoming mail server** vía IMAP en `Configuración → Técnico → Email → Incoming Mail Servers`.

**Decisión Ola 1: NO configurar IMAP.** Razones:
1. Requiere guardar las credentials IMAP del buzón `leads@mnconsultoria.org` (password completo o app-password) en Odoo — superficie de leak ampliada.
2. El flujo Lead Ola 1 va del form web al Worker al `crm.lead.create` directo. NO depende de email entrante.
3. Emails dirigidos a `leads@` siguen llegando como follower (notificación outbound), no como creación inbound.

**Ola 2 (cuando sea):** configurar IMAP solo si se quiere capturar respuestas de clientes a hilos como follow-up automático. Pre-requisito: revisar política de secrets de email en Bitwarden/wrangler.

---

## Paso 6 — Crear `.dev.vars` local con credentials (para el smoke script)

**ANTES de correr el smoke script**, crear:

```
~/projects/mnc-landing-app/workers/lead-to-odoo/.dev.vars
```

Contenido (sin export, sin comillas para wrangler dev format):
```
ODOO_URL=https://mnconsultoria.odoo.com
ODOO_DB=mnconsultoria
ODOO_USER=info@mnconsultoria.org
ODOO_API_KEY=<la-key-del-paso-4>
```

> **`ODOO_DB`** = `mnconsultoria` (confirmado tras setup real 2026-05-15). En general es el nombre del subdomain. Si dudás, verificá en `https://mnconsultoria.odoo.com/web/database/selector` o `https://mnconsultoria.odoo.com/web/database/list`.

> `.dev.vars` está en `.gitignore` — nunca se commitea. Es solo para `wrangler dev --local` y para el smoke script. Los secrets de producción se ponen con `wrangler secret put` cuando deployemos en 2.B.

---

## Paso 7 — Correr el smoke script

```bash
cd ~/projects/mnc-landing-app
./tests/odoo-smoke.sh
```

**Output esperado** (si todo está bien configurado; los IDs reales serán distintos):

```yaml
# === IDs encontrados (pegar a wrangler secret put) ===

# Tags simples
TAG_WEB:     "4"
TAG_DOMAIN:  "5"
TAG_SMOKE:   "6"

# Tags por sector (JSON único para 1 secret — 8 sectores incluyendo manufactura)
TAG_SECTORS: '{"horeca":7,"agroindustria":8,"retail":9,"servicios-profesionales":10,"agencias":11,"bpm":12,"marketplace":13,"manufactura":<id>}'

# Sales team "Sitio web" (re-uso, no Web)
TEAM_WEB: "<id>"

# UTM source
UTM_SOURCE_WEB: "20"

# Owner default (super-user MN)
USER_SUPER_MN: "2"
```

Los IDs de arriba reflejan el setup real de `mnconsultoria.odoo.com` al 2026-05-15. `<id>` corresponde a entidades que se ajustaron post-setup inicial (sector manufactura + team Sitio web).

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
