# brand-notes.md

**Versión:** 2.0 · 2026-05-15 (reemplaza v1)
**Cambio crítico vs v1:** las fuentes ya están decididas. La skill `frontend-design` NO debe proponer alternativas tipográficas.

---

## Identidad corporativa

**Marca techo:** MNARANJO Consultoría SAS (razón social)
**Marca comercial visible:** MNC Consultoría · MNconsultor.IA™
**Tipo de empresa:** consultoría B2B colombiana, MiPyMEs sectores HORECA, agroindustria, retail, manufactura, servicios profesionales
**Tono:** profesional, técnico, honesto. NO playful, NO startup-bro, NO corporate-sterile.
**Audiencia primaria:** dueños/gerentes de MiPyMEs colombianas (40-60 años), decisores técnicos de empresas medianas (CTOs/COOs).

---

## Paleta base (NO negociable)

- **Primario:** `#008080` (teal corporativo MNARANJO)
- **Acento:** `#ff8c00` (naranja MNARANJO — viene del símbolo del logo)

Variantes derivadas verificadas en `public/brand/colors-legacy.txt`. La skill puede extender a escala 50-950, NO sustituir los valores base.

---

## Tipografía (DECIDIDA — no negociable)

**Familia única:** **DIN 2014 Narrow** (Paramount Type Co.)
**Self-hosted en:** `public/brand/fonts/`
**Formatos disponibles:** `.otf` (convertir a `.woff2` en build pipeline para web)

Roles:
- **Display (H1/H2):** DIN 2014 Narrow DemiBold (700)
- **Subhead (H3/H4):** DIN 2014 Narrow Regular (400)
- **Body:** DIN 2014 Narrow Regular (400) 16/1.65 o 17/1.7
- **Metadata / labels / captions:** DIN 2014 Narrow Light (300)
- **Hero subtitle decorativo (uso limitado):** DIN 2014 Narrow ExtraLight (200) — verificar contraste WCAG AA antes de usar en producción

**Fallback stack para CSS:**
```css
font-family: 'DIN 2014 Narrow', 'Roboto Condensed', 'Arial Narrow', sans-serif;
```

**Conversión de OTF a WOFF2:** usar `fonttools` (Python) o `glyphhanger` en el build pipeline. NO servir `.otf` directo al cliente — peso ~3-5x mayor que WOFF2.

Comando sugerido (parte del setup del repo):
```bash
pnpm dlx glyphhanger \
  --formats=woff2 \
  --subset=public/brand/fonts/*.otf \
  --LATIN \
  --output=public/brand/fonts/web/
```

**Univers LT Std Condensed (Cn + LightCn):** en standby, NO usar en Ola 1. Reservado por si en Ola 2 se decide jerarquía tipográfica dual.

---

## Caveat legal sobre las fuentes (importante)

DIN 2014 y Univers LT son fuentes **comercialmente licenciadas**. La licencia de escritorio típica (OEM Adobe, Linotype, instalación con software) **NO cubre uso web self-hosted** por defecto. Para auditoría estricta se requiere licencia web (pageview-based).

**Postura Ola 1 (riesgo bajo aceptado):** usar DIN 2014 self-hosted local. Tráfico bajo, auditoría improbable.
**Postura Ola 2+ (si tráfico crece):** comprar licencia web de DIN 2014 (~$200-400 USD una vez) o sustituir por **Barlow Condensed** (Google Fonts, licencia OFL/MIT, visualmente ~85% similar).

Esta nota queda documentada para que la decisión esté trazable. No se menciona en la landing.

---

## Elementos visuales del legacy

**Mantener (parte de la identidad):**
- Logo MNARANJO® con tulipán/símbolo naranja sobre wordmark
- Paleta teal + naranja
- Densidad de información media

**Descartar (del legacy actual):**
- Banner Fibonacci canvas decorativo
- Doble CTA hero
- Branding mezclado "Domino.IA"
- Mock contacto con teléfono +57 300 123 4567
- Iconos FontAwesome 4 (`fontawesome-webfont.*`) — usar `@lucide/astro`
- Glyphicons de Bootstrap 3 (`glyphicons-halflings-regular.*`) — descartar
- Tailwind v2.x vía CDN

---

## Dirección estética para la skill `frontend-design`

Con las fuentes ya decididas, la skill debe enfocar su propuesta en:

1. **Aesthetic direction** en 3-5 frases: cómo se ve el sitio en conjunto, qué inspiración estética sigue, qué reglas auto-impone (qué NO va a hacer).
2. **Spacing scale:** 4px o 8px base, escala armónica.
3. **Border radius global:** propuesta entre 0-8px máximo (NO 12-16px tipo Linear).
4. **Elevación / sombras:** máximo 1-2 niveles. NO sombras múltiples tipo Material Design.
5. **Animation philosophy:** una entrada en hero, hover discreto, nada más. NO scroll-triggered animations por defecto.
6. **Grid system:** propuesta de columnas y breakpoints alineada con Tailwind.

**Lo que la skill NO debe proponer:**
- Tipografía (ya decidida: DIN 2014 Narrow)
- Paleta primaria/acento (ya decididas: teal #008080 + naranja #ff8c00)
- Gradientes púrpura o variantes AI-genéricas
- Mega-radius (12-16px)
- Glassmorphism / neumorphism / cualquier moda estética de 2022-2024

---

## Referencias estéticas válidas

- Sitios editoriales con tipografía condensed protagónica: *The Browser Company*, *Stripe Press*, *Linear* (paleta diferente)
- Consultoras técnicas serias B2B: *Thoughtworks*, *Basecamp pages individuales*, *Pivotal Labs legacy*
- Densidad y honestidad informativa: *37signals*, *Plain Text Sports*, *txti.es* (extremo, solo como referencia conceptual)

**Anti-referencias (lo que NO queremos parecer):**
- Cualquier startup IA con landing "AI for X" estándar (gradiente púrpura/azul, Inter, glassmorphism)
- Wix/Squarespace templates
- WordPress corporate themes

---

## Inspiración futura (Ola 2+)

El cliente expresó interés en explorar:
- **Fractales** (Mandelbrot, L-systems, bioinspiración matemática)
- **Bioinspiración** (redes celulares, mycelium, dendritas, ramificaciones)

NO entran en Ola 1. Cuando se exploren posteriormente, evaluar:
- SVG fractal sutil como background pattern (estático, no protagónico)
- Iconografía bioinspirada por vertical
- Visualizaciones bioinspiradas en `/insights/*` (Ola 1.5+)

---

**Última revisión:** 2026-05-15
