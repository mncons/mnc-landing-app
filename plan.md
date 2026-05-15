# Plan — MNC Consultoría Landing Rebuild (Ola 1 · Sesión 1, ~4 h)

> Este archivo es el `plan.md` que pediste. Está escrito en el slot de plan-mode del harness. Cuando lo apruebes con ExitPlanMode, el **Paso 1.0** lo copia a `~/projects/mnc-landing-app/plan.md` y `~/projects/mnc-landing/plan.md`.

---

## Contexto

Reconstrucción desde cero de `mnconsultoria.org` con SDD estricto. Esta sesión cubre el **primer lote del kickoff**: repo, scaffold Astro 6.3.3, brand assets, fuentes self-hosted, dirección estética vía skill `frontend-design`, tokens Tailwind v4, README con security baseline §14, primer commit semántico. El **segundo lote** (Base.astro + ContactForm + Pages Function + Worker `lead-to-odoo` + smoke test contra Odoo real) queda planteado al final y se aprueba aparte, con diagrama ASCII de por medio.

Decisiones cerradas (no se debaten en este plan): Astro 6.3.3 + Tailwind v4 (Vite) + pnpm + Cloudflare Pages + Worker `lead-to-odoo` + Odoo Enterprise online (`https://mnaranjo.odoo.com`) + GoatCounter cloud + DIN 2014 Narrow self-hosted + `@lucide/astro` + paleta `#008080` teal / `#ff8c00` naranja. Wordmark `MNC Consultoría · MNconsultor.IA™`. Domino.IA SOLO en `/sobre#proyectos-en-desarrollo`. Footer `© 2026 MNARANJO Consultoría SAS · NIT [TBD] · Bogotá, Colombia`.

Autoridad de docs: `mnc-landing-spec-v3.md` > `spec-v3-addendum.md` > `artefactos-clasificacion.md` > `legal-marcas-v2.md` > `MNC_Contexto_Referencia_2026Q2.md` > `brand-notes-v2.md`.

---

## Entorno verificado (`2026-05-15`)

| Tool / fact | Esperado | Real | Acción |
|---|---|---|---|
| Node | 22 | v24.15.0 instalado | **Decidido**: pin a 22 con `nvm install 22 && nvm use 22` antes del scaffold (Paso 3) |
| pnpm | ✓ | 10.33.2 | OK |
| gh | ✓ auth `mncons` | 2.45.0 · scope `repo, workflow, gist, read:org` | OK |
| git config | — | `Marlon` / `info@mnconsultoria.org` | OK |
| wrangler | ✓ instalado | **NO instalado** | Paso 2 lo instala global |
| glyphhanger | ✓ | **NO instalado** | Paso 2 lo instala + `fonttools` |
| `~/projects/mnc-landing/` | ✓ | ✓ con `_legacy/`, `_archived-specs/`, `_reference/` | OK |
| `~/projects/mnc-landing-assets/` | ✓ | ✓ 4 pesos DIN 2014 + Univers (standby) + `logo/` + `colors-legacy.txt` + `brand-notes-v2.md` | OK (el doc se llama `brand-notes-v2.md`, no `brand-notes.md`) |
| `~/projects/mnc-landing-app/` | no existe | no existe | correcto, Paso 1 lo crea |

---

## Inventario `_legacy/` (18 artefactos)

```
_legacy/
├── bucket-a-tools/        ai_adoption_matrix.tsx · correlacion-causalidad.tsx ·
│                          escala-magnitudes.tsx · formalidad-diagnostico.tsx ·
│                          probabilidades-cotidianas.tsx
├── bucket-b-diagnostics/  ai_assessment_form.tsx · dt_diagnostic_tool.tsx ·
│                          llm-diagnostic-questionnaire.tsx
├── bucket-c-internal/     SelectorModeloColaboracionMNC.html
├── bucket-d-insights/     country_metrics_viz · harmony-evolution-dashboard ·
│                          income-education-visualization · production-factors-visualization ·
│                          wealth-distribution-visualizer · wealth-redistribution-simulator
├── bucket-e-archive/      roadmap_tracker-digitalsurvivors-postscarcitysociety.html
└── _html-legacy/          index.html · contact.html.html   ← NO clasificados en doc
```

NO se toca ninguno en este lote — son base para Ola 1.5.

---

## Discrepancias y decisiones a confirmar antes de ejecutar

1. ~~Node 22 vs 24~~ → **Decidido: Node 22** (fiel al spec). Paso 3 ejecuta `nvm install 22 && nvm use 22` y escribe `.nvmrc` con `22`.
2. **`_html-legacy/` con `index.html` y `contact.html.html`**: el doc menciona un `index.html` como C2 (plantilla diagnóstico cliente) pero lo ubica en `bucket-c-internal/`; en disco está en `_html-legacy/`. NO se migra en este lote — agendar revisión en Ola 1.5.
3. **`GloWealth.html`** mencionado en `artefactos-clasificacion.md` no existe en disco → confirmar "descartado".
4. **Bucket D blockers** (D3 `harmony-evolution-dashboard` con data inverificable, D5 `production-factors-visualization` con `Math.random()`): NO tocan este lote (son Ola 1.5), pero quedan listados como riesgo conocido en `MIGRATION_LOG.md`.
5. **Licencia DIN 2014 Narrow para web**: `brand-notes-v2.md §6` advierte que la licencia OTF puede no cubrir uso `@font-face` público. Postura: Ola 1 riesgo bajo (tráfico minúsculo). Ola 2 = comprar licencia (~$200–400 USD) o pivotar a Barlow Condensed (OFL). Se documenta en `MIGRATION_LOG.md` y en README.
6. **Engram**: en cwd `~/projects` hay múltiples repos → "ambiguous project". Los `mem_save` quedan diferidos hasta que `mnc-landing-app/.git` exista y se haga `cd` dentro.
7. **CLAUDE.md global** prohíbe `cat/grep/find/sed/ls`; sistema no tiene `eza`/`fd`/`rg`. Para este lote uso `ls`/`bash` puntual con justificación, y/o instalo `eza`/`fd`/`rg` si querés (paso opcional).

---

## PRIMER LOTE — para aprobar y ejecutar

> Tres sub-lotes de 3 pasos. Diff resumido entre cada uno antes de continuar.

### Sub-lote 1.A — Infra base (Pasos 1–3)

#### Paso 1 · Crear repo público + clonar + plan.md + .gitignore

```bash
cd ~/projects
gh repo create mncons/mnc-landing-app --public \
  --description "Landing y verticales MNC Consultoría · MNconsultor.IA™" \
  --license mit --add-readme=false
git clone https://github.com/mncons/mnc-landing-app.git
cd mnc-landing-app
printf "node_modules/\ndist/\n.astro/\n.wrangler/\n.dev.vars\n.env*\n.fonts-source/\n.DS_Store\n*.log\n" > .gitignore
# copiar este plan al repo y al workspace
cp /home/thinkpad/.claude/plans/soy-marlon-naranjo-consultor-woolly-kettle.md ./plan.md
cp /home/thinkpad/.claude/plans/soy-marlon-naranjo-consultor-woolly-kettle.md ~/projects/mnc-landing/plan.md
```

- **Archivos**: `~/projects/mnc-landing-app/{.git, .gitignore, plan.md}` · `~/projects/mnc-landing/plan.md`
- **Done**: `gh repo view mncons/mnc-landing-app --json visibility,defaultBranchRef` → `public`, `main`; `plan.md` existe en ambas rutas.

#### Paso 2 · Instalar wrangler + glyphhanger + fonttools (faltantes)

```bash
pnpm add -g wrangler@latest
pnpm add -g glyphhanger
# backend de glyphhanger (pyftsubset, woff2)
pip install --user --upgrade fonttools brotli zopfli
```

- **Archivos**: ninguno en repo.
- **Done**: `wrangler --version` ≥ 3, `glyphhanger --version` responde, `pyftsubset --help | head -1` responde.

#### Paso 3 · Scaffold Astro 6.3.3 + Tailwind v4 + `@lucide/astro`

```bash
cd ~/projects/mnc-landing-app
# Pin Node 22 (fiel al spec; v24.15.0 instalado queda fuera para este repo)
nvm install 22
nvm use 22
echo "22" > .nvmrc
node -v                                     # debe imprimir v22.x.x antes de seguir
pnpm create astro@latest . --template minimal --typescript strict --skip-houston --no-install --yes
pnpm install
pnpm astro add tailwind --yes               # añade @tailwindcss/vite (v4) + integration
pnpm add @lucide/astro
pnpm add -D @types/node prettier prettier-plugin-astro prettier-plugin-tailwindcss
```

- **Archivos**: `package.json`, `pnpm-lock.yaml`, `astro.config.mjs`, `tsconfig.json`, `src/pages/index.astro`, `src/env.d.ts`, `.nvmrc`, `public/favicon.svg`.
- **Done**: `pnpm dev` arranca en `:4321`; en `index.astro` `<h1 class="text-3xl text-teal-600">test</h1>` resuelve color y tamaño en DevTools.

---

### Sub-lote 1.B — Brand assets + fuentes (Pasos 4–5)

#### Paso 4 · Copiar assets a `public/brand/`

```bash
cd ~/projects/mnc-landing-app
mkdir -p public/brand/logo public/brand/fonts .fonts-source
cp ~/projects/mnc-landing-assets/logo/*.{png,svg,md,pbm} public/brand/logo/ 2>/dev/null
cp ~/projects/mnc-landing-assets/colors-legacy.txt public/brand/colors-legacy.txt
cp ~/projects/mnc-landing-assets/brand-notes-v2.md public/brand/brand-notes-v2.md
# fuentes OTF van a staging fuera de public/
cp "/home/thinkpad/projects/mnc-landing-assets/DIN 2014 Narrow.otf"            .fonts-source/din-2014-narrow-regular.otf
cp "/home/thinkpad/projects/mnc-landing-assets/DIN 2014 Narrow Light.otf"      .fonts-source/din-2014-narrow-light.otf
cp "/home/thinkpad/projects/mnc-landing-assets/DIN 2014 Narrow ExtraLight.otf" .fonts-source/din-2014-narrow-extralight.otf
cp "/home/thinkpad/projects/mnc-landing-assets/DIN 2014 Narrow DemiBold.otf"   .fonts-source/din-2014-narrow-demibold.otf
```

- **Archivos**: `public/brand/logo/{mnc-full-logo.png, mn-symbol.png, mn-symbol-centered.png, mn-symbol-transparent.png, favicon.svg, USAGE.md, MN O Transparente.pbm}`, `public/brand/colors-legacy.txt`, `public/brand/brand-notes-v2.md`, `.fonts-source/*.otf` (4 archivos).
- **Done**: `ls public/brand/logo/` muestra 7 entradas; `ls .fonts-source/` muestra 4 `.otf`.

#### Paso 5 · Convertir `.otf` → `.woff2` (subset latin + latin-ext) con `glyphhanger`

```bash
cd ~/projects/mnc-landing-app/.fonts-source
for w in regular light extralight demibold; do
  glyphhanger --subset="din-2014-narrow-$w.otf" \
    --formats=woff2 \
    --LATIN --LATIN-EXT \
    --whitelist="·—–™®©«»¿¡€"
done
mv din-2014-narrow-regular-subset.woff2    ../public/brand/fonts/din-2014-narrow-400.woff2
mv din-2014-narrow-light-subset.woff2      ../public/brand/fonts/din-2014-narrow-300.woff2
mv din-2014-narrow-extralight-subset.woff2 ../public/brand/fonts/din-2014-narrow-200.woff2
mv din-2014-narrow-demibold-subset.woff2   ../public/brand/fonts/din-2014-narrow-700.woff2
cd .. && rm -rf .fonts-source
```

- **Archivos**: `public/brand/fonts/din-2014-narrow-{200,300,400,700}.woff2`.
- **Done**: 4 `.woff2` presentes; `du -h public/brand/fonts/*.woff2` cada uno < 60 KB tras subset latin+ext (típicamente 25–45 KB).

---

### Sub-lote 1.C — Dirección estética + tokens + README + commit (Pasos 6–9)

#### Paso 6 · Invocar skill `frontend-design` — STOP para aprobación

Brief literal al skill:

```
LOCKED (no proponer alternativas):
  - Tipografía: DIN 2014 Narrow self-hosted (.woff2), pesos 200/300/400/700
  - Paleta: primary #008080 (teal) + accent #ff8c00 (naranja)
  - Audiencia: MiPyME dueños/gerentes 40–60 + CTOs/COOs decisores, Colombia
  - Tono: profesional, técnico, honesto. No playful, no startup-bro, no AI-slop.

OPEN (proponer concretamente):
  1. Spacing scale (base 4 px u 8 px) y aplicación a componentes típicos
  2. Border radius (rango 0–8 px) — qué radii usar dónde
  3. Elevation / sombras (máx 1–2 niveles) — cuándo y por qué
  4. Animation philosophy (entrada hero, hover, transición — sin scroll-triggered)
  5. Grid + breakpoints (Tailwind-aligned, máx 5)

Anti-refs:
  - Templates "AI for X", Wix/Squarespace boilerplate, glassmorphism/neumorphism,
    gradientes púrpura, mega-radius estilo Linear.

Refs válidas:
  - Stripe Press, Browser Company, Thoughtworks, 37signals, Plain Text Sports,
    Linear (sólo estructura, paleta diferente).

Output deliverable: design-direction.md en la raíz del repo, con propuesta
para los 5 puntos OPEN. No generar componentes todavía.
```

- **Archivos**: `design-direction.md` (raíz repo).
- **Done**: documento creado. **STOP**. Esperar aprobación explícita antes de Paso 7.

#### Paso 7 · `tailwind.config.ts` + `src/styles/globals.css` con tokens

Después de aprobar `design-direction.md`:

Tokens base (de `colors-legacy.txt`, mapeados a CSS vars Tailwind v4):

```css
/* src/styles/globals.css (extracto) */
@import "tailwindcss";

@theme {
  --color-primary:         #008080;
  --color-primary-hover:   #006666;
  --color-primary-300:     #5eead4;
  --color-primary-600:     #0d9488;
  --color-primary-700:     #0f766e;
  --color-accent:          #ff8c00;
  --color-accent-hover:    #e67a00;
  --color-accent-400:      #fb923c;
  --color-accent-500:      #f97316;
  --color-text:            #333333;
  --color-text-muted:      #666666;
  --color-surface:         #f8f8f8;
  --color-surface-elevated:#ffffff;
  --color-surface-dark:    #111827;
  --color-border:          #eeeeee;
  /* spacing/radii/elevation desde design-direction.md aprobado */
  --font-sans: "DIN 2014 Narrow", "Roboto Condensed", "Arial Narrow", system-ui, sans-serif;
}

@font-face {
  font-family: "DIN 2014 Narrow";
  src: url("/brand/fonts/din-2014-narrow-200.woff2") format("woff2");
  font-weight: 200; font-style: normal; font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
/* idem 300, 400, 700 */
```

- **Archivos**: `tailwind.config.ts` (mínimo, v4 usa CSS vars), `src/styles/globals.css`, `src/pages/index.astro` con `import "../styles/globals.css"`.
- **Done**: `pnpm dev` → DevTools Network muestra `din-2014-narrow-400.woff2` cargado; `<p class="font-sans text-primary">` resuelve `#008080` y la familia correcta.

#### Paso 8 · `README.md` con Security baseline (§14) + `.github/dependabot.yml` + `MIGRATION_LOG.md`

Secciones del README:

1. Wordmark + descripción del proyecto (1 párrafo)
2. **Stack**: Astro 6.3.3, Tailwind v4, Cloudflare Pages, Worker `lead-to-odoo`, Odoo Enterprise online, GoatCounter, DIN 2014 Narrow self-hosted, `@lucide/astro`
3. **Comandos**: `pnpm dev`, `pnpm build`, `pnpm preview`, `pnpm wrangler dev` (worker), `pnpm fonts:subset` (script glyphhanger)
4. **Estructura**: `src/pages/`, `src/components/islands/`, `src/content/`, `src/layouts/`, `src/styles/`, `workers/lead-to-odoo/`, `public/brand/`, `functions/api/`
5. **Security baseline §14** (checklist):
   - GitHub Advanced Security + secret scanning ON
   - Dependabot semanal (npm + actions)
   - TruffleHog en CI (pendiente Sub-lote 2)
   - Checkov en CI (pendiente Sub-lote 2)
   - 2FA + YubiKey 5C en cuenta `mncons` (manual)
   - Secrets Worker vía `wrangler secret put`: `ODOO_URL`, `ODOO_DB`, `ODOO_UID`, `ODOO_API_KEY` (scope CRM read+write `crm.lead`)
   - CORS Worker estricto: `https://mnconsultoria.org`, `https://www.mnconsultoria.org`
   - Rate limit Worker: 10 req/min/IP vía KV
   - Honeypot en ContactForm
   - Bitwarden Premium para credenciales locales
   - Cloudflare/AWS SSO + IAM Identity Center
6. **Convenciones de commits**: Conventional Commits (`feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`, `perf`, `build`, `ci`)
7. **Referencias**: punteros a `~/projects/mnc-landing/{spec, addendum, artefactos, legal, contexto, brand-notes}` (no se commitean al repo público)
8. **Riesgos conocidos**: licencia DIN 2014 (Ola 1 riesgo bajo, Ola 2 decisión); Bucket D items con data dudosa pendientes de auditoría

`.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule: { interval: weekly, day: monday, time: "06:00" }
    open-pull-requests-limit: 5
    commit-message: { prefix: "chore(deps)" }
  - package-ecosystem: github-actions
    directory: "/"
    schedule: { interval: weekly }
    commit-message: { prefix: "chore(ci)" }
```

`MIGRATION_LOG.md` (encabezados, sin filas todavía):

```markdown
# MIGRATION_LOG

| Fecha | Origen | Destino | Bucket | Ajustes aplicados | Decisiones | Estado |
|---|---|---|---|---|---|---|
```

- **Archivos**: `README.md`, `.github/dependabot.yml`, `MIGRATION_LOG.md`.
- **Done**: `gh repo view mncons/mnc-landing-app --web` muestra README renderado con secciones; `cat .github/dependabot.yml | yq` valida YAML.

#### Paso 9 · Primer commit semántico + push

```bash
cd ~/projects/mnc-landing-app
git add -A
git status                                  # revisar manualmente antes
git commit -m "feat: scaffold astro 6.3.3 + tailwind v4 + brand assets + security baseline"
git push -u origin main
```

- **Archivos**: histórico git.
- **Done**: `gh repo view mncons/mnc-landing-app --json defaultBranchRef --jq .defaultBranchRef.target.history.totalCount` ≥ 1; `git log --oneline -1` muestra el commit; remoto sincronizado.

---

## SEGUNDO LOTE — outline (NO ejecutar todavía)

> Pre-requisito: ASCII context loading del flujo end-to-end. **Lo dibujo y vos aprobás antes de tocar código.**

Pasos previstos (a desglosar en otro `plan.md` o en este mismo extendido):

1. **ASCII diagram** del flujo Lead: `ContactForm → /api/lead (Pages Function) → Worker lead-to-odoo → Odoo crm.lead`
2. **ASCII diagram** del state machine `DiagnosticoGate` (Bucket B): `idle → filling → validating → submitting → success(redirect /gracias?reporte={slug}) | error(inline)`
3. `Base.astro` con `<head>` (OG meta, JSON-LD `Organization`, GoatCounter script, font preload, favicon)
4. `src/layouts/{PageLayout, HerramientaLayout, DiagnosticoLayout, InsightLayout}.astro`
5. `src/pages/contacto.astro` + `src/components/ContactForm.astro` (honeypot, validación cliente, `goatcounter.count('form_submit_contacto')`)
6. `functions/api/lead.ts` (Pages Function: valida payload, reenvía a Worker con header de origen)
7. `workers/lead-to-odoo/` con `wrangler init`, TS, cliente XML-RPC Odoo, KV rate limit, CORS estricto, secrets `wrangler secret put`
8. Smoke test: form en `pnpm dev` → Pages Function local (`wrangler pages dev`) → Worker en preview → Lead REAL en `mnaranjo.odoo.com` con tag `web,mnconsultoria.org`
9. `src/pages/gracias.astro` con query params `?from=` y `?reporte={slug}`
10. `src/pages/politica-privacidad.astro` (Ley 1581 mínimo, copy desde `contexto` + `legal-marcas`)
11. Lighthouse local (≥ 95 perf/a11y/best/SEO) y fixes
12. DNS Hostinger: CNAME `www` → `mnc-landing-app.pages.dev` + redirect 301 apex `→ www` (Opción 1 sub-opción 3a)
13. Cloudflare Pages: conectar repo, env vars, custom domains, deploy producción

---

## Olas posteriores (panorámica)

- **Ola 1.5**: Bucket A (5 islands en paralelo) + Bucket B (3 con gate común) + 7 verticales como `src/content/` + páginas `/sobre`, `/casos`, `/herramientas`, `/diagnosticos`. Lighthouse + Checkov + TruffleHog en CI.
- **Ola 2+**: Bucket D (6 insights, requiere auditoría de datos previa), chat widget, Umami self-host, nameserver migration completa, EN i18n, licencia/replace DIN 2014, `legacy.mnconsultoria.org` retirar a 30 días.

---

## Verificación end-to-end del PRIMER LOTE

1. `pnpm dev` → `http://localhost:4321` carga sin warnings; DevTools Network muestra 1 `.woff2` de DIN 2014 cargado en el viewport visible.
2. `pnpm build` produce `dist/` sin warnings; `dist/index.html` referencia `/brand/fonts/din-2014-narrow-400.woff2` con `preload` o `font-face`.
3. `gh repo view mncons/mnc-landing-app --web` muestra README con secciones legibles y `## Security baseline` visible.
4. Un Astro component con `<h1 class="bg-primary text-surface">` resuelve a `background-color: #008080`.
5. `.github/dependabot.yml` parsea (`gh api repos/mncons/mnc-landing-app/contents/.github/dependabot.yml` retorna 200).
6. `git log --oneline -1` muestra `feat: scaffold ...`.
7. `~/projects/mnc-landing-app/plan.md` y `~/projects/mnc-landing/plan.md` son idénticos a este plan.

---

## Archivos críticos creados/modificados en este lote

| Ruta | Por |
|---|---|
| `~/projects/mnc-landing-app/.git/` | Paso 1 |
| `~/projects/mnc-landing-app/.gitignore` | Paso 1 |
| `~/projects/mnc-landing-app/plan.md` (copia) | Paso 1 |
| `~/projects/mnc-landing/plan.md` (copia) | Paso 1 |
| `~/projects/mnc-landing-app/.nvmrc` | Paso 3 |
| `~/projects/mnc-landing-app/package.json` · `pnpm-lock.yaml` | Paso 3 |
| `~/projects/mnc-landing-app/astro.config.mjs` · `tsconfig.json` | Paso 3 |
| `~/projects/mnc-landing-app/src/pages/index.astro` · `src/env.d.ts` | Paso 3 |
| `~/projects/mnc-landing-app/public/brand/logo/*` | Paso 4 |
| `~/projects/mnc-landing-app/public/brand/{colors-legacy.txt, brand-notes-v2.md}` | Paso 4 |
| `~/projects/mnc-landing-app/public/brand/fonts/din-2014-narrow-{200,300,400,700}.woff2` | Paso 5 |
| `~/projects/mnc-landing-app/design-direction.md` | Paso 6 (frontend-design) |
| `~/projects/mnc-landing-app/tailwind.config.ts` · `src/styles/globals.css` | Paso 7 |
| `~/projects/mnc-landing-app/README.md` · `.github/dependabot.yml` · `MIGRATION_LOG.md` | Paso 8 |

---

## Recordatorios operacionales

- Lotes de **3–5 pasos** con diff resumido entre cada uno.
- **ASCII context loading obligatorio** antes de Sub-lote 2 (flujo Lead, state machine Gate, estructura de carpetas final).
- **Una pregunta por turno** si hay ambigüedad real; si no, ejecutar.
- **`handoff.md` ≤ 60 líneas** apenas el contexto cruce 60 %, sin pedir permiso.
- Engram queda diferido hasta que `cd ~/projects/mnc-landing-app/` resuelva proyecto único.
- Paralelización en este lote: ninguna (los 9 pasos son secuenciales lineales por dependencia). La paralelización real arranca en Ola 1.5 (5 islands Bucket A + 7 verticales en paralelo).
