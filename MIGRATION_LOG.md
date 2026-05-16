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

**Rotación API key:** declarada cada 90 días en `ODOO_SETUP.md §4`. Próxima rotación: 2026-08-06 (7 días antes del vencimiento si setup ejecutado 2026-05-15). Ver decisión #8 — la rotación real quedó en 180 días por confort operativo del user.

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

**IDs reales recibidos (smoke ejecutado 2026-05-15):**

```yaml
TAG_WEB:        "4"
TAG_DOMAIN:     "5"
TAG_SMOKE:      "6"
TAG_SECTORS:    '{"horeca":7,"agroindustria":8,"retail":9,"servicios-profesionales":10,"agencias":11,"bpm":12,"marketplace":13}'
UTM_SOURCE_WEB: "20"
USER_SUPER_MN:  "2"

# Pendiente re-ejecución smoke tras ajustes 2.A.1:
TEAM_WEB:                  ID del team "Sitio web"
TAG_SECTORS.manufactura:   ID del tag "sector-manufactura"
```

**API key real:**
- Nombre: `Landing` (única dedicada al Worker, scope CRM por permisos del super-user)
- Vence: **2026-11-11** (180 días, no 90 — el user eligió duración default de Odoo por confort operativo)
- Próxima rotación calendarizada: **2026-11-04** (7 días antes)
- Almacenamiento: Bitwarden Premium (vault personal del super-user MN)

**Acción inmediata tras este sub-lote:** el user re-corre `./tests/odoo-smoke.sh` y devuelve los 2 IDs pendientes (`TEAM_WEB` real + `TAG_SECTORS.manufactura`). Recién entonces arranca 2.B con todos los IDs en mano.

**Lecciones aprendidas (para próximas iteraciones SDD):**
1. **Documentos con placeholders explícitos** (e.g. `mnaranjo` ← reemplazar con dato real) son riesgosos cuando se confunde el placeholder con el dato real. Marcar `{{ }}` o `<TODO>` en el siguiente doc.
2. **Setup manual fuera del repo** introduce drift entre lo documentado y lo real. El smoke script captura los IDs reales y los expone — patrón correcto: "el código de verificación es la fuente de verdad, el doc es guía".
3. **El bloqueo intencional funcionó**: detectamos las 10 diferencias en minutos, no después de horas de Worker code que asumía la versión incorrecta.

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
