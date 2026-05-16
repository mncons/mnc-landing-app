# MIGRATION_LOG

Registro de migración de artefactos del legacy a `mnc-landing-app` + decisiones técnicas tomadas durante la reconstrucción + riesgos conocidos pendientes.

---

## Tabla de migración de artefactos

> Una fila por artefacto del `~/projects/mnc-landing/_legacy/` cuando se integre. Lote 1 NO migra ninguno — solo deja la tabla preparada.

| Fecha | Origen (`_legacy/`) | Destino (`src/`) | Bucket | Ajustes aplicados | Decisiones | Estado |
|---|---|---|---|---|---|---|

---

## Decisiones técnicas — lote 2

### 7. ODOO_SETUP.md como bloqueo intencional antes de codear el Worker (sub-lote 2.A)

**Contexto:** el Worker `lead-to-odoo` (sub-lote 2.B) necesita IDs reales de tags, team, UTM source y user de Odoo para mapear `crm.lead.create`. Sin esos IDs el Worker no compila lógica útil.

**Decisión:** generar `workers/lead-to-odoo/ODOO_SETUP.md` + `tests/odoo-smoke.sh` como primer sub-lote (2.A) **antes** de cualquier código del Worker. El user ejecuta el setup manual en `mnaranjo.odoo.com`, corre el script, devuelve los IDs en YAML. Recién entonces arranca 2.B.

**Razones:**
1. **Single point of failure clarificado:** si el setup Odoo está mal, lo detectamos en minutos en lugar de en el primer smoke e2e del 2.D (después de horas de código).
2. **Trazabilidad de configuración:** el `.md` queda como referencia para futuras rotaciones de API key o recreación del entorno si Odoo se cae.
3. **Idempotencia:** el script smoke se puede re-correr sin efectos secundarios (las queries son `search_read` puras; el `--create-test-lead` es opt-in).
4. **Defensa en profundidad:** valida credentials antes de exponerlas al Worker.

**Componentes:**
- `ODOO_SETUP.md`: checklist UI paso a paso para 10 tags (7 sectores + web + mnconsultoria.org + smoke-test), Sales team `Web`, UTM source `Web — mnconsultoria.org`, API key (rotación trimestral declarada), `.dev.vars` local.
- `tests/odoo-smoke.sh`: bash + python3 inline con `xmlrpc.client` stdlib (cero deps extra). Autentica, lista IDs, soporta `--create-test-lead`. Exit codes 0/1/2/3 según tipo de fallo.

**Bloqueo declarado:** sub-lote 2.B no se inicia hasta que el user devuelva la salida YAML del script con todos los IDs ≠ `MISSING`.

**Rotación API key:** declarada cada 90 días en `ODOO_SETUP.md §4`. Estado real en decisión #8 sub-bloque "API key real": la key se creó **sin expiración explícita** (opción de Odoo aplicada al momento de generación). Odoo NO permite editar `expiration date` post-creación. Rotación es **manual** vía `borrar + recrear`. Próxima rotación calendarizada: **2026-08-14**.

---

### 8. Delta entre `ODOO_SETUP.md` propuesto y setup real ejecutado (2026-05-15)

**Contexto:** el doc inicial del 2.A asumía valores placeholder (`mnaranjo.odoo.com`, `mnaranjo` DB, team `Web`, 7 sectores). El user ejecutó el setup real contra su instancia Odoo Enterprise online y reportó 10 diferencias concretas + 2 IDs faltantes. Este sub-lote (`2.A.1`) ajusta script + doc + schema para reflejar la realidad y queda como referencia para futuras rotaciones.

**Los 10 puntos del delta:**

| # | Asumido en doc inicial | Realidad en `mnconsultoria.odoo.com` | Impacto |
|---|---|---|---|
| 1 | URL `https://mnaranjo.odoo.com` | `https://mnconsultoria.odoo.com` | `ODOO_URL` cambia |
| 2 | DB `mnaranjo` | `mnconsultoria` | `ODOO_DB` cambia |
| 3 | Team `Web` (crear nuevo) | `Sitio web` con espacio (re-usar existente — user único pago, evitar fragmentar pipeline) | `crm.team.search_read` query y secret name. Smoke `2.A.1` ajusta search a `('name','=','Sitio web')` |
| 4 | Alias team optional | `leads@mnconsultoria.org` configurado en el team `Sitio web` | OK, sin código que tocar |
| 5 | 7 sectores | 8 sectores (`manufactura` agregado) | `expected_tags` del smoke + `TAG_SECTORS` JSON + Zod schema enum sector en 2.B |
| 6 | UTM source con guion `-` | Guion largo `—` (em-dash, U+2014) confirmado | Script ya buscaba con `ilike "Web"` — funciona. Documentado |
| 7 | 2FA opcional | **Enforced** por Odoo Enterprise online para crear API keys vía modal | Documentado como pre-requisito. NO desactivar 2FA |
| 8 | Opción A vs B (recomendaba B) | Opción B aplicada (`leads@` como follower del team `Sitio web` con suscripciones completas) | Documentado como aplicado |
| 9 | Email-to-Lead (IMAP) ambiguo | **NO configurado.** Alias funciona como outbound (follower) pero NO captura emails entrantes como `crm.lead`. Diferido a Ola 2 (riesgo de secrets IMAP) | Documentado como TODO Ola 2 |
| 10 | Plantilla custom recomendada | Plantilla `Nuevo Lead · {{object.name}}` **creada pero NO asociada a automatización**. Artefacto disponible si Ola 2 cambia a Opción A | Documentado como artefacto Ola 2 |

**IDs reales (smoke ejecutado 2026-05-15 + 2026-05-16 con ajustes 2.A.1/2.A.2):**

```yaml
TAG_WEB:        "4"
TAG_DOMAIN:     "5"
TAG_SMOKE:      "6"
TAG_SECTORS:    '{"horeca":7,"agroindustria":8,"retail":9,"servicios-profesionales":10,"agencias":11,"bpm":12,"marketplace":13,"manufactura":14}'
TEAM_WEB:       "2"     # crm.team — name técnico 'Website' (UI español 'Sitio web')
UTM_SOURCE_WEB: "20"
USER_SUPER_MN:  "2"     # res.users — colisión numérica con TEAM_WEB OK (modelos distintos)
```

**Nota sobre la colisión numérica `TEAM_WEB=2 / USER_SUPER_MN=2`:** son IDs de modelos diferentes (`crm.team.id=2` vs `res.users.id=2`). Odoo permite IDs por-modelo sin namespace global. El Worker referencia cada uno por su modelo en el `execute_kw` correspondiente; no hay ambigüedad. Solo es nota mental al leer los secrets.

**API key real:**
- Nombre: `Landing` (única dedicada al Worker, scope CRM por permisos del super-user).
- Vence: **indefinido — no expiration date configurada al crear la key.** Odoo permite elegir esa opción al momento de generación, pero NO permite editar el campo `expiration date` post-creación (ni a `null`, ni a una fecha concreta). Una vez creada, la key vive hasta que se borre manualmente.
- **Rotación: manual, cada ~90 días vía `borrar key activa + crear key nueva con mismo nombre 'Landing'`** y actualizar el `wrangler secret put ODOO_API_KEY` con el valor nuevo. NO se confía en expiración automática.
- **Próxima rotación calendarizada: 2026-08-14** (~90 días desde la creación del 2026-05-15). Recordatorio externo en calendario del user.
- **Decisión Q4 2026:** evaluar si conviene generar keys con expiración explícita (60/90/180) en lugar del modelo "sin expiración + borrar+recrear". Trade-off:
  - **Sin expiración + rotación manual** (modelo actual): cero downtime si se olvida la rotación; depende totalmente de disciplina del calendario. Si se compromete la key, no hay safety net.
  - **Con expiración 90d**: Odoo invalida automáticamente; protege ante olvido. Trade-off: si pasás de fecha sin rotar, el Worker empieza a fallar todos los POST de leads hasta que se rota — outage visible.
- Almacenamiento: **KeePass (KeePassXC, vault `MNC.kdbx` local)**. NO Bitwarden — el user gestiona credenciales en KeePassXC offline para reducir superficie cloud.

**Acción inmediata tras este sub-lote:** el user re-corre `./tests/odoo-smoke.sh` y devuelve los 2 IDs pendientes (`TEAM_WEB` real + `TAG_SECTORS.manufactura`). Recién entonces arranca 2.B con todos los IDs en mano.

**Lecciones aprendidas (para próximas iteraciones SDD):**
1. **Documentos con placeholders explícitos** (e.g. `mnaranjo` ← reemplazar con dato real) son riesgosos cuando se confunde el placeholder con el dato real. Marcar `{{ }}` o `<TODO>` en el siguiente doc.
2. **Setup manual fuera del repo** introduce drift entre lo documentado y lo real. El smoke script captura los IDs reales y los expone — patrón correcto: "el código de verificación es la fuente de verdad, el doc es guía".
3. **El bloqueo intencional funcionó**: detectamos las 10 diferencias en minutos, no después de horas de Worker code que asumía la versión incorrecta.

---

### 8.1. Odoo i18n: queries XML-RPC con nombres técnicos en inglés

**Contexto (descubierto 2026-05-16):** la primera iteración del smoke script tras 2.A.1 buscaba el team con `('name', '=', 'Sitio web')` y devolvía `MISSING`. El user debugueó listando todos los teams sin filtro y descubrió que el campo `name` está almacenado en inglés en la DB; la UI traduce según idioma de sesión.

Listing real recibido:

```
ID=1  active=True   name='Sales'           (UI español: "Ventas")
ID=2  active=True   name='Website'         (UI español: "Sitio web")
ID=3  active=False  name='Point of Sale'   (UI español: "Punto de venta")
```

**Regla aplicable a todas las queries XML-RPC desde el Worker / smoke / cualquier integración externa:**

> Los modelos de sistema de Odoo (`crm.team`, `crm.stage`, etc.) almacenan `name` en INGLÉS técnico. La traducción a español/otros idiomas vive en `ir.translation` y se aplica en la UI según `res.users.lang` de sesión. **Las queries server-side deben usar el nombre técnico inglés.**

**Modelos afectados conocidos (cualquiera con `name` traducible):**

| Modelo | Query Worker | Nombre técnico esperado | UI español |
|---|---|---|---|
| `crm.team` | filtrar por team | `Website` | "Sitio web" |
| `crm.stage` | filtrar por stage | `New`, `Qualified`, `Proposition`, `Won`, etc. | "Nuevo", "Calificado", "Propuesta", "Ganado" |
| `res.country` | filtrar por país | `Colombia` (inglés) | "Colombia" (mismo) |
| `res.lang` | seleccionar idioma | código (`es_CO`, `en_US`) — NO `name` traducido | n/a |

**Excepción:** `utm.source` con nombres custom creados por el usuario (`Web — mnconsultoria.org`) NO se traduce — Odoo solo traduce cadenas registradas en `ir.translation`, y los datos custom se quedan literales. Por eso `UTM_SOURCE_WEB` funciona con `ilike "Web"` en cualquier idioma de sesión.

**Implementación en el Worker (sub-lote 2.B):**

- Hardcodear nombres técnicos en inglés para queries de modelos de sistema.
- NO depender del idioma de sesión del API user (`info@mnconsultoria.org` tiene sesión es_CO). El `execute_kw` evalúa el filtro en el contexto del registro, no en el contexto traducido.
- Para crear `crm.lead` con `lang: 'es_CO'` (que sí se respeta), está OK — el `lang` del lead no afecta cómo Odoo busca registros relacionados.

**Acción 2.B:** documentar inline en `odoo-client.ts` cada vez que se hardcoda un nombre técnico inglés, con referencia a esta decisión #8.1.

**Riesgo residual:** si en Ola 2 se contrata un developer Odoo que renombra el team "Website" → "Sitio web" en la UI (rompiendo la i18n nativa), el Worker fallaría con `TEAM_WEB: MISSING`. Mitigación: documentado en `ODOO_SETUP.md §Paso 2` explícito "NO renombrar el team en la UI".

---

### 9. Worker `lead-to-odoo` (sub-lote 2.B) — arquitectura y decisiones

**Stack:** Cloudflare Worker · TypeScript strict · Zod · XML-RPC manual · KV rate limit · Workers Observability.

**9.1. XML-RPC manual sin librería externa**

Las opciones disponibles (`xmlrpc`, `fast-xml-parser`) traen deps Node que wrangler no resuelve sin `compatibility_flags = ["nodejs_compat"]`. El subset de XML-RPC que necesitamos para `crm.lead.create` es trivial:

- Marshalling: `string | int | double | boolean | array | struct`.
- Parsing del response: `<int>` (lead_id) + `<fault>` (faultCode + faultString).

Implementado en `src/odoo-client.ts` con `escapeXml()` + `marshal()` + `parseResponse()`. **Trade-off**: si Odoo cambia el formato wire en una versión futura (improbable; XML-RPC es estable hace 20 años), reescribimos. Beneficio: bundle 140 KiB / 25 KiB gzip, cero deps Node, cold start mínimo.

**9.2. Cache de `uid` en `globalThis` del isolate (~15 min)**

`common.authenticate(db, user, key)` se llama una vez por isolate y se cachea por 15 min. Cloudflare Workers reutiliza isolates entre requests del mismo POP (~15-30 min de vida del isolate). Ahorra ~200 ms por request en el path crítico.

**Invalidación**: ante cualquier error 5xx o timeout, el cache se descarta y el siguiente call re-autentica. Esto cubre el caso de rotación de API key durante la vida del isolate.

**9.3. Rate limit con `sha256(ip)` en KV, ventana 60 s, max 10**

Implementado en `src/rate-limit.ts`. La IP se hashea antes de guardar en KV — defensa frente a leak accidental de PII si alguien inspecciona el namespace desde el dashboard.

**Race condition documentada**: dos requests simultáneos con `count = max-1` pueden ambos pasar. El siguiente request sí ve `count >= max` y se rechaza. KV no ofrece strong consistency sin Durable Objects (overkill Ola 1). Impacto real es despreciable; mitigación más fuerte en Ola 2 si vemos abuso.

**9.4. Honeypot indistinguible del éxito (Ajuste A del plan lote 2)**

Si `payload.website !== ""`, el Worker responde `200 {ok:true, ref:null}`. No 4xx, no marca especial. Para el bot, parece éxito; no aprende a evadir. El log marca el evento `honeypot_triggered` para métricas internas.

**9.5. Captura UTM + referrer en `description` (Ajuste C del plan lote 2)**

Schema acepta `utm_source`, `utm_medium`, `utm_campaign`, `referrer` (opcionales, max 200 chars cada uno). Se anexan al `description` del lead Odoo después del mensaje con formato:

```
<mensaje del cliente>

[source: <source>, utm_source=X, utm_medium=Y, utm_campaign=Z, referrer=R]
```

Si no hay UTMs, solo `[source: <source>]`. Visible en el lead Odoo para atribución sin Google Analytics.

**9.6. CORS estricto con allowlist específico (D8 clarificación)**

`ALLOWED_ORIGINS` env var (no secret): `https://mnconsultoria.org,https://www.mnconsultoria.org,https://mnc-landing-app.pages.dev`. Subdomain específico de Pages, **NO** wildcard `*.pages.dev` (cualquier proyecto Cloudflare podría originar requests).

**9.7. Log estructurado JSON sin PII**

`src/logger.ts` implementa una lista negra de keys (`PII_KEYS = {nombre, email, telefono, mensaje, ip, ua, ODOO_API_KEY, LEAD_INTERNAL_SECRET, Authorization, Cookie, ...}`). El sanitize filtra esas keys antes de serializar a JSON. Cualquier campo nuevo con PII debe sumarse a `PII_KEYS` o no pasarse a `log()`.

Workers Observability captura `console.{log|warn|error}` con `head_sampling_rate=1.0` en Ola 1 (bajo tráfico — sampling 100% sin costo significativo). En Ola 2 si volumen crece bajar a 0.1.

**9.8. Comparación constant-time del `LEAD_INTERNAL_SECRET`**

`constantTimeEqual()` en `src/index.ts` itera el largo completo del string. Mitiga timing attacks pese a que la latencia de fetch en Workers es ruidosa — defensa en profundidad.

**9.9. Retry exponencial 250 ms / 1 s ante 5xx HTTP o timeout; cero retry ante `OdooFault`**

`OdooFault` es 4xx-equivalente (schema error, permission error) — determinístico. Retry no ayudaría. Solo retry para 5xx HTTP y `OdooTimeoutError` (network blip, restart). Después de retry exponencial agotado, propaga el error como `502 odoo_unavailable` al cliente.

**9.10. Schema `source` regex permisiva en lugar de enum cerrado**

`source: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/)` en lugar de enum con `SOURCES = ['contacto', 'diagnostico-X', 'herramienta-Y', ...]`. Razón: agregar una herramienta nueva en el front (`tools/correlacion`, etc.) no debe romper el Worker. La validación garantiza formato (lowercase + kebab-case + 1..64 chars) sin lista cerrada.

**9.11. `lang: "es_CO"` hardcoded en `crm.lead.create`**

Único hardcode de string es el código `res.lang.code` (no traducido — los códigos `es_CO`, `en_US` son técnicos, no nombres). Si Ola 2 abre EN i18n, agregar `lang` al payload y permitir override.

**Build verificado:**
- `pnpm install` OK (zod + workers-types + wrangler + typescript)
- `pnpm typecheck` OK (`tsc --noEmit`, strict mode)
- `pnpm build:dry` OK (`wrangler deploy --dry-run`): bundle 140.45 KiB / gzip 25.65 KiB; bindings KV `RATE_LIMIT` + 6 env vars detectados

**Pendiente antes de deployar (lote 2.C/2.D):**
- `wrangler kv:namespace create "RATE_LIMIT"` y reemplazar `REPLACE_WITH_REAL_KV_ID` en `wrangler.toml`.
- `openssl rand -base64 32 | wrangler secret put LEAD_INTERNAL_SECRET` (compartir mismo valor con Pages Function).
- Resto de secrets via `wrangler secret put` con valores reales del Odoo setup.

---

## Decisiones técnicas — lote 1

### 1. `pyftsubset` directo en lugar de `glyphhanger` CLI

**Contexto:** `spec-v3-addendum.md` y el plan original mencionaban `glyphhanger` (envoltorio Node sobre `pyftsubset`) para convertir DIN 2014 Narrow `.otf` → `.woff2` con subset.

**Decisión:** usar `pyftsubset` directo desde `scripts/fonts-subset.sh`.

**Razones:**
1. `glyphhanger` CLI agrega capa de abstracción sobre `pyftsubset` sin valor real — terminamos pasándole los mismos flags Unicode.
2. Menos dependencias en `devDependencies` (glyphhanger sigue listado por `pnpm fonts:subset` legacy, pero el script no lo invoca — pendiente removerlo en lote 2 cuando esté validado el flujo).
3. Mejor control del `--unicodes` (subset latin + latin-ext + puntuación MNC explícita) y de `--layout-features`.
4. Si se pierde la red, `glyphhanger` necesita resolver paquetes Node; `pyftsubset` es puro Python local.

**Implementación:** `scripts/fonts-subset.sh` (commiteado en `feat(lote-1): Astro 6 scaffold...`). Comando equivalente:
```bash
pyftsubset din-2014-narrow-{variant}.otf \
  --output-file=public/brand/fonts/din-2014-narrow-{weight}.woff2 \
  --flavor=woff2 \
  --unicodes="U+0000-00FF,U+0100-017F,U+0131,...,U+FFFD" \
  --layout-features='*' \
  --no-hinting
```

**Pre-requisito sistema:** `apt install python3-fonttools python3-brotli`.

**Acción Ola 1.5:** quitar `glyphhanger` de `devDependencies` cuando el script esté en CI verde.

---

### 2. NO crear `tailwind.config.ts`

**Contexto:** convención Tailwind v3 era declarar tokens en `tailwind.config.ts`. Tailwind v4 cambió a leer tokens desde `@theme` en CSS.

**Decisión:** no crear `tailwind.config.ts`. Todo el design system vive en `src/styles/globals.css` bloque `@theme`.

**Razones:**
1. `design-direction.md §"Cómo se traduce a tailwind.config.ts y globals.css"` lo dice literal: *"Tailwind v4 lee `@theme` desde CSS, así que el config queda mínimo (sólo `content` globs si es necesario). En Astro 6 + `@tailwindcss/vite`, ni siquiera hace falta el config TS"*.
2. Un archivo de config TS vacío o casi vacío introduce ruido y un segundo lugar donde buscar tokens.
3. Astro 6 + `@tailwindcss/vite` v4 hace tree-shaking de utilities automáticamente sin necesidad de `content` globs explícitos.

**Re-evaluación cuando:** si se agrega un plugin Tailwind que requiera config TS (typography, forms, etc.). Por ahora no se ven candidatos.

---

### 3. `globals.css` (plural) en lugar de `global.css` (singular)

**Contexto:** Astro CLI 6 crea `src/styles/global.css` por default. Spec v3 §4, `design-direction.md` (×3 menciones) y `plan.md` Paso 7 (×4 menciones) usan `globals.css` (plural).

**Decisión:** renombrar a `globals.css` (plural).

**Razones:**
1. Consistencia con 4 fuentes de autoridad del proyecto.
2. Convención Next.js App Router + Tailwind v4 docs.
3. Cambio una sola vez al inicio cuesta menos que dejar drift entre código y docs durante toda la Ola 1.

**Aplicación:** `git mv src/styles/global.css src/styles/globals.css` (commit A). Astro tree-shaking y Vite picks up el archivo por import, no por convención de nombre — sin impacto en bundling.

---

### 4. Favicons con padding centrado + canvas cuadrado (Opción A)

**Bug detectado:** `public/brand/logo/USAGE.md` ll. 92-105 indica:
```bash
convert mn-symbol-transparent.png -resize 16x16 favicon-16.png
convert mn-symbol-transparent.png -resize 32x32 favicon-32.png
convert mn-symbol-centered.png -resize 180x180 apple-touch-icon.png
```

Pero los assets origen NO son cuadrados:
- `mn-symbol-transparent.png` = **62×73** (ratio 0.85)
- `mn-symbol-centered.png` = **280×325** (ratio 0.86, a pesar del nombre)
- `mn-symbol.png` = 204×240

El comando literal produce favicons rectangulares (14×16, 27×32, 155×180) que los navegadores deforman al renderizar.

**Decisión (Opción A):** mantener proporciones del símbolo + agregar padding hasta llegar al canvas cuadrado.
- `favicon-16` / `favicon-32`: fondo **transparente** (`-background none -alpha set`).
- `apple-touch-icon` (180×180): fondo **blanco opaco** (`-background "#ffffff" -alpha remove -alpha off`). iOS recorta esquinas y aplica radio propio sobre cualquier wallpaper — blanco se ve más limpio que teal o transparente.

Comandos aplicados:
```bash
convert mn-symbol-transparent.png \
  -resize 16x16 -background none -gravity center -extent 16x16 \
  favicon-16.png

convert mn-symbol-transparent.png \
  -resize 32x32 -background none -gravity center -extent 32x32 \
  favicon-32.png

convert mn-symbol-centered.png \
  -resize 180x180 -background "#ffffff" -alpha remove -alpha off \
  -gravity center -extent 180x180 \
  apple-touch-icon.png
```

**Verificado:** `identify` confirma 16×16, 32×32, 180×180.

**Alternativas evaluadas y descartadas:**
- **Opción B (forzar `!`)**: deforma el símbolo ~17% horizontal. Inaceptable visualmente.
- **Opción C (asset cuadrado nuevo `mn-symbol-square.png`)**: mejor solución de raíz pero agrega archivo al brand kit y obliga a editar `USAGE.md`. Diferido a Ola 1.5.

**Acción pendiente:** actualizar `USAGE.md` (TODO Ola 1.5) — o reemplazar los assets origen por versiones cuadradas, lo que sea más simple cuando se haga la auditoría del brand kit completo.

---

### 5. Pesos de fuente en preload — solo 400 y 700

**Decisión:** `Base.astro` preloadea **dos** pesos:
- `din-2014-narrow-400.woff2` (body — uso masivo)
- `din-2014-narrow-700.woff2` (H1, LCP element)

**NO** se preloadean:
- `din-2014-narrow-300.woff2` (Light — usos puntuales: captions, metadata)
- `din-2014-narrow-200.woff2` (ExtraLight — uso decorativo limitado, ver `brand-notes-v2.md` advertencia contraste WCAG)

**Razón:** preloadear todo el set anula la ventaja del unicode-range subset y consume ancho de banda en first paint para fuentes que no se usan above-the-fold. El navegador carga 300 y 200 on-demand cuando algún elemento las pide.

**Verificación:** DevTools Network al cargar `index.astro` debe mostrar:
- 2 `.woff2` con `Initiator: preload` (400 y 700)
- 1 `.woff2` cargado por el `<p class="font-light">` del smoke test (peso 300)
- 0 cargas del peso 200 (no se usa en `index.astro`)

---

### 6. Licencia DIN 2014 Narrow — riesgo bajo aceptado Ola 1

**Contexto:** `brand-notes-v2.md §"Caveat legal sobre las fuentes"` advierte que la licencia OTF desktop típica NO cubre uso web `@font-face` self-hosted.

**Decisión Ola 1:** aceptar el riesgo. Tráfico inicial mínimo, auditoría improbable.

**Decisión Ola 2** (cuando tráfico crezca o llegue cliente que exija compliance):
- **Vía A:** comprar licencia web de DIN 2014 Narrow (~$200-400 USD una vez, Paramount Type Co.).
- **Vía B:** sustituir por **Barlow Condensed** (Google Fonts, licencia OFL/MIT, visualmente ~85% similar). Cambio en `@font-face` + actualización de `brand-notes-v2.md`.

---

## Riesgos conocidos pendientes (no resueltos en lote 1)

### R1. GloWealth.html mencionado en `artefactos-clasificacion.md` D1 pero ausente en `_legacy/`

`artefactos-clasificacion.md §D1` dice: *"`GloWealth.html` es el mismo código TSX pero con extensión HTML errada. Confirmar y descartar uno."* — el archivo `.html` NO existe en `~/projects/mnc-landing/_legacy/bucket-d-insights/`. Solo está el `.tsx`. **Confirmado descartado** en auditoría implícita; queda esta nota para que la próxima sesión no lo busque.

### R2. `_html-legacy/contact.html.html` y `_html-legacy/index.html` sin clasificar

Estos dos archivos están en `_legacy/_html-legacy/` y NO aparecen en `artefactos-clasificacion.md`. El `index.html` parece ser el C2 (template diagnóstico cliente) pero el doc lo ubica en `bucket-c-internal/`. Auditoría pendiente Ola 1.5 antes de tocar cualquiera de los dos.

### R3. Bucket D blockers de datos

- **D3 `harmony-evolution-dashboard.tsx`**: datos "simulados basados en indicadores reales y estimaciones" sin fuente verificable. Mitigación Ola 1.5: reemplazar con HDI + World Happiness Report + Global Innovation Index, O degradar a Bucket E.
- **D5 `production-factors-visualization.tsx`**: usa `Math.random()` con patrones realistas. Si se publica como está, lector atento detecta datos falsos y pierde credibilidad. Mitigación Ola 1.5: reescribir como simulador educativo controlado por el usuario, O degradar a Bucket E.

### R4. Engram resolución de proyecto

`mem_save` en cwd `~/projects/` falla con `ambiguous project: multiple git repos found in cwd`. Workaround mientras dure el lote 1: ejecutar saves con `cd ~/projects/mnc-landing-app/` y proyecto explícito. Diferido: investigar si la config de Engram acepta una raíz por defecto que evite el lookup ambiguo.

### R5. spec-v3-addendum.md no commiteado al repo

Los 5 docs de autoridad viven en `~/projects/mnc-landing/` (privado), NO en este repo. Cualquier cambio a esos docs no genera trazabilidad git en `mnc-landing-app`. **Decisión Ola 2:** o (a) mover esos docs al repo en una carpeta `docs/` privada, o (b) crear un repo `mnc-landing-docs` separado con `gh repo create --private`. Por ahora la trazabilidad real está en este `MIGRATION_LOG.md` cuando cambian las decisiones.

---

**Última revisión:** 2026-05-15
