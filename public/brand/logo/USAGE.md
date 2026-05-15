# logo/USAGE.md

**Mapeo de variantes del logo a usos en la landing.**
Este archivo vive en `public/brand/logo/USAGE.md` del repo. Claude Code lo lee al setup para decidir qué archivo usar en cada contexto.

---

## Variantes disponibles

| Archivo | Contenido | Tamaño |
|---|---|---|
| `mnc-full-logo.png` | Símbolo MNARANJO + wordmark completo (CONSULTORIA) | 685 KB |
| `mn-symbol-transparent.png` | Solo símbolo, fondo transparente | 2.6 KB |
| `mn-symbol-centered.png` | Símbolo centrado en canvas cuadrado | 9.9 KB |
| `mn-symbol.png` | Símbolo (puede tener fondo blanco) | 9.0 KB |
| `favicon.svg` | Vector generado con potrace desde `mn-symbol-transparent.png` | (generar en setup) |

---

## Mapeo a uso

### Header (Nav.astro)
- **Archivo:** `mnc-full-logo.png`
- **Render:** `<img>` con `width=180` `height=auto` en desktop, `width=120` en mobile
- **Loading:** `eager` (LCP element)
- **Optimización:** convertir a WebP + AVIF en build, fallback PNG

### Footer (Footer.astro)
- **Archivo:** `mnc-full-logo.png` (versión más pequeña)
- **Render:** `<img>` con `width=140` `height=auto`
- **Loading:** `lazy`

### Favicon (todos los `<head>`)
- **Archivos:**
  - `favicon.svg` (modernos, escalable)
  - `favicon.ico` (fallback IE/Edge viejo, generar 32x32 desde PNG)
  - `apple-touch-icon.png` (180x180, generar desde `mn-symbol-centered.png`)
- **HTML:**
  ```html
  <link rel="icon" type="image/svg+xml" href="/brand/logo/favicon.svg">
  <link rel="icon" type="image/png" href="/brand/logo/favicon-32.png" sizes="32x32">
  <link rel="apple-touch-icon" href="/brand/logo/apple-touch-icon.png">
  ```

### OG Image (Open Graph + Twitter Cards)
- **Archivo origen:** `mnc-full-logo.png` + composición
- **Generar:** `og-image.jpg` de 1200x630 con logo + tagline "IA aplicada y ERP Odoo para MiPyMEs colombianas"
- **Render en `Base.astro`:**
  ```html
  <meta property="og:image" content="https://mnconsultoria.org/og-image.jpg">
  <meta name="twitter:image" content="https://mnconsultoria.org/og-image.jpg">
  ```

### Chat bubble icon (Ola 2)
- **Archivo:** `mn-symbol-transparent.png` o `favicon.svg`
- **Render:** dentro del botón flotante del chat IA

### PWA / Manifest (si se activa)
- **Archivo:** `mn-symbol-centered.png` en múltiples tamaños (192, 512)

---

## Conversión OTF → WOFF2 y PNG → SVG (parte del setup)

### Símbolo a SVG (potrace)

```bash
sudo apt install potrace imagemagick -y

cd public/brand/logo/

# Generar PBM desde PNG transparente
convert mn-symbol-transparent.png \
        -alpha extract \
        -threshold 50% \
        -negate \
        mn-symbol-transparent.pbm

# Vectorizar
potrace mn-symbol-transparent.pbm -s -o favicon.svg

# Optimizar SVG (eliminar metadata, redondear paths)
pnpm dlx svgo favicon.svg --multipass

# Verificar resultado
ls -la favicon.svg
cat favicon.svg | head -5
```

### Favicon ICO (multi-resolución)

```bash
convert mn-symbol-transparent.png \
        -resize 16x16 favicon-16.png

convert mn-symbol-transparent.png \
        -resize 32x32 favicon-32.png

convert favicon-16.png favicon-32.png favicon.ico
```

### Apple touch icon

```bash
convert mn-symbol-centered.png -resize 180x180 apple-touch-icon.png
```

### OG image

Composición manual o vía Astro Image API. Estructura sugerida:
- Fondo: gradiente sutil teal #008080 → naranja #ff8c00 (10% opacidad)
- Logo `mnc-full-logo.png` arriba izquierda
- Tagline en DIN 2014 Narrow DemiBold blanco
- 1200x630 JPG 85% quality

---

## Notas para iteración futura

- **Vectorización profesional manual** (Ola 2): si el `favicon.svg` generado con potrace tiene imperfecciones visibles a 16x16, rehacer en Inkscape/Illustrator desde el original (TIFF/AI si existe) o contratar diseñador.
- **Variantes dark mode** (Ola 2): generar versión del logo con wordmark blanco para dark mode si se activa.
- **Animaciones del logo** (Ola 2): no necesarias. Un logo estático que carga rápido > un logo animado que retrasa el LCP.

---

**Última revisión:** 2026-05-15
