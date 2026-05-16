# MNC Consultoría · MNconsultor.IA™

> Landing y verticales de **MNARANJO Consultoría SAS** (Bogotá, Colombia).
> Consultoría de IA aplicada y ERP Odoo para MiPyMEs. HORECA, agroindustria,
> retail, manufactura y servicios profesionales.
> Wordmark: **MNC Consultoría · MNconsultor.IA™**.

---

## Stack

| Capa | Elección | Notas |
|---|---|---|
| Runtime | Node 22 LTS | pin via `.nvmrc` y `engines.node` |
| Package manager | pnpm | lockfile commiteado |
| Framework | Astro 6.3.3 | static-first, islands cuando aplique |
| CSS | Tailwind v4 (Vite plugin) | tokens en `@theme` (CSS), sin `tailwind.config.ts` |
| Iconos | `@lucide/astro` | tree-shakeable, monocromo |
| Fuentes | DIN 2014 Narrow self-hosted (200/300/400/700) | subset latin + latin-ext + puntuación MNC vía `pyftsubset` |
| Hosting (Ola 1) | Cloudflare Pages | edge, SSL automático |
| Forms | Cloudflare Worker → Odoo XML-RPC | lote 2 |
| Analítica | GoatCounter cloud | sin cookies, sin Google |
| DNS | Hostinger (mantener Ola 1) | CNAME `www`, redirect 301 apex |

Decisión de versionado: el spec original menciona "Astro 5"; la versión real
es current major estable (Astro 6.3.3 al 2026-05-15). Ver
`~/projects/mnc-landing/spec-v3-addendum.md §1.0`.

---

## Comandos

```bash
pnpm dev                              # dev server :4321
pnpm build                            # build a dist/
pnpm preview                          # preview del build
pnpm astro check                      # type-check
pnpm fonts:subset                     # regenerar .woff2 desde .fonts-source/*.otf
./tests/odoo-smoke.sh                 # validar credentials Odoo + listar IDs (lote 2.A)
./tests/odoo-smoke.sh --create-test-lead  # smoke: crear Lead de prueba en Odoo (con tag smoke-test)
```

Pre-requisito de `fonts:subset`: `python3-fonttools` + `python3-brotli`
instalados (apt). El script usa `pyftsubset` directo, no `glyphhanger` CLI
(decisión documentada en `MIGRATION_LOG.md`).

Pre-requisito de `odoo-smoke.sh`: `python3` (xmlrpc.client viene con stdlib,
cero deps extra). Lee `workers/lead-to-odoo/.dev.vars` o env vars
`ODOO_URL`/`ODOO_DB`/`ODOO_USER`/`ODOO_API_KEY`. Ver
`workers/lead-to-odoo/ODOO_SETUP.md` para el setup manual previo en Odoo.

---

## Estructura

```
mnc-landing-app/
├── astro.config.mjs           # Tailwind v4 Vite plugin
├── tsconfig.json              # extends astro/tsconfigs/strict
├── package.json
├── .nvmrc                     # 22
├── .gitignore
├── plan.md                    # plan vigente del lote actual
├── MIGRATION_LOG.md           # decisiones técnicas + riesgos conocidos
├── README.md
├── LICENSE                    # MIT
├── .github/
│   └── dependabot.yml         # npm + github-actions semanal
├── public/
│   └── brand/
│       ├── logo/              # PNGs originales + favicon.svg + USAGE.md
│       │   ├── mnc-full-logo.png
│       │   ├── mn-symbol*.png
│       │   ├── favicon.svg
│       │   ├── favicon-16.png · favicon-32.png · apple-touch-icon.png
│       │   └── USAGE.md
│       ├── fonts/             # .woff2 subset (200/300/400/700)
│       ├── colors-legacy.txt
│       └── brand-notes-v2.md
├── scripts/
│   └── fonts-subset.sh        # pyftsubset directo a public/brand/fonts/
├── src/
│   ├── layouts/
│   │   └── Base.astro         # head, preload fonts, favicons, slot
│   ├── pages/
│   │   └── index.astro
│   └── styles/
│       └── globals.css        # @theme + 4 @font-face + base + reduced-motion
└── (lote 2)
    ├── functions/api/lead.ts  # Pages Function
    └── workers/lead-to-odoo/  # Worker XML-RPC → Odoo
```

Documentos de autoridad (NO se commitean al repo público):
`~/projects/mnc-landing/{mnc-landing-spec-v3.md, spec-v3-addendum.md,
artefactos-clasificacion.md, legal-marcas-v2.md,
MNC_Contexto_Referencia_2026Q2.md}` ·
`~/projects/mnc-landing-assets/brand-notes-v2.md`.

---

## Security baseline (§14 del spec)

Solopreneur DevSecOps mínimo para `mncons/mnc-landing-app`:

- [x] GitHub Advanced Security + secret scanning activos
- [x] Dependabot semanal: npm (lunes 06:00) + github-actions
      (`.github/dependabot.yml`)
- [x] 2FA obligatorio + YubiKey 5C en cuenta `mncons` (manual)
- [x] Bitwarden Premium para credenciales locales
- [x] Cloudflare / AWS access vía SSO + IAM Identity Center
- [x] Conventional Commits + scope `lote-N` por sub-lote
- [ ] TruffleHog en CI (pendiente lote 2 — sale junto con el Worker)
- [ ] Checkov en CI (pendiente lote 2 — sale junto con `wrangler.toml`)
- [ ] Worker secrets vía `wrangler secret put`:
      `ODOO_URL`, `ODOO_DB`, `ODOO_UID`, `ODOO_API_KEY`
      (scope CRM read+write `crm.lead`, rotación trimestral)
- [ ] CORS Worker estricto: `https://mnconsultoria.org`,
      `https://www.mnconsultoria.org`
- [ ] Rate limiting Worker: 10 req/min/IP vía KV
- [ ] Honeypot field en `ContactForm`
- [ ] Cloudflare Turnstile (v1.1 si llega spam)

Este checklist NO es contenido público — vive en este README para que el
equipo (yo) lo siga.

---

## Convenciones de commits

[Conventional Commits](https://www.conventionalcommits.org/) estricto.
Tipos válidos: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`,
`perf`, `build`, `ci`. Scope opcional pero recomendado:
`lote-1` / `lote-2` / `ola-1.5` durante migración; después por componente
(`hero`, `worker`, `forms`, etc.).

Ejemplos:

```
feat(lote-1): tokens design-direction + Base.astro layout
chore(lote-1): set favicons del brand kit
fix(worker): retry Odoo XML-RPC ante 503 transitorio
docs(plan): corregir referencias Astro 5 -> 6.3.3
```

**NO** usar `Co-Authored-By` ni atribución a IA. **NO** usar `--no-verify` ni
`--amend` sobre commits ya pusheados.

---

## Riesgos conocidos

Lista corta — la versión completa con mitigaciones vive en `MIGRATION_LOG.md`
sección "Riesgos conocidos pendientes".

| Riesgo | Severidad | Mitigación Ola 1 |
|---|---|---|
| Licencia DIN 2014 Narrow para uso web no cubierta por OTF desktop license | Bajo (tráfico inicial mínimo) | Aceptado. Ola 2: comprar licencia web (~$200-400 USD) o pivotar a Barlow Condensed (OFL) |
| `USAGE.md` ll. 92-105 asume PNGs origen cuadrados (no lo son) | Resuelto en Commit A | Comandos corregidos con `-extent NxN -background`. TODO Ola 1.5: actualizar `USAGE.md` o generar asset `mn-symbol-square.png` cuadrado |
| Bucket D — datos `Math.random()` o inverificables (D3, D5) | Medio (afecta credibilidad si publicado) | Diferido a Ola 1.5 con auditoría obligatoria previa |
| Hostinger no soporta CNAME en apex | Medio (SEO menor) | Redirect 301 apex → `www`. Ola 2: migrar nameservers a Cloudflare |
| Domino Data Lab vía Madrid antes que registro local | Medio (afecta marca `Domino.IA`) | `MNconsultor.IA` prioridad absoluta. Ver `legal-marcas-v2.md` |

---

**Última revisión:** 2026-05-15
