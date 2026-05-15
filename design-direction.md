# design-direction.md — MNC Consultoría

> Fuente: brief de Marlon Naranjo, 2026-05-15. Aplica sobre Astro 6 + Tailwind v4.
> No incluye componentes HTML. Es el documento de dirección que alimenta `tailwind.config.ts` y `globals.css`.

---

## Resumen ejecutivo

Tres líneas para anclar todo lo que sigue:

1. **Aesthetic rector: "Editorial técnico"** — un híbrido entre página de Stripe Press (peso editorial, jerarquía clara, mucho aire), una ficha técnica DIN (medidas claras, sin adornos) y una propuesta consultiva impresa para una directiva colombiana (formal sin ser frío, decisiones evidentes).
2. **Sistema sobrio, no minimalista**. Hay generosidad de espacio y precisión tipográfica, pero NO es minimalismo blanco-vacío. Hay puntos de fricción visual deliberados: el naranja MNARANJO como acento único, fechas y números remarcados, separadores horizontales finos y semánticos.
3. **Restricción como sello**. Una sola sombra, máximo dos radii, una sola curva de animación, una sola tipografía variable en cuatro pesos. La disciplina es la firma — la audiencia (CTO MiPyME 50+, directiva BPM) reconoce seriedad por sustracción.

## Concepto rector

> **"Una ficha técnica que respira."**

DIN 2014 Narrow nació en la industria alemana de los años 30 como tipografía para señalización ferroviaria y normas técnicas. Esa herencia industrial — geometría racional, alta legibilidad en condiciones difíciles, cero ornamento — es exactamente la voz que necesita MNC Consultoría hablando a dueños de MiPyMEs y CTOs colombianos: "esto es serio, esto se mide, esto se cumple". Pero el documento no es seco. Tiene aire vertical generoso (96–128 px entre secciones), un acento naranja MNARANJO que aparece pocas veces y por eso golpea, y una grilla editorial de 12 columnas que permite que un párrafo de texto técnico conviva con una tabla de precios y una cita destacada.

**No es Linear** (radii grandes, gradientes, dark-first). **No es Stripe** (tipografía serif clásica, paleta neutra). **No es 37signals** (chrome browser-only, ASCII chunky). Es: **un manual técnico bonito**.

**Anti-referencia operativa**: si alguna decisión empuja hacia "startup AI 2024" (gradientes púrpura→azul, glass cards, mega-radius, hero con orbe 3D), se descarta sin discusión.

---

## 1. Spacing scale

### Decisión

**Base 4 px. Escala explícita de 14 valores. Sin half-steps.**

| Token | px | Tailwind class | Uso primario |
|---|---|---|---|
| `--space-0` | 0 | `gap-0 p-0` | reset |
| `--space-1` | 4 | `gap-1 p-1` | borde a label, kbd a tecla |
| `--space-2` | 8 | `gap-2 p-2` | icono a texto, chip interno |
| `--space-3` | 12 | `gap-3 p-3` | botón inline, badges |
| `--space-4` | 16 | `gap-4 p-4` | card pequeño, form-row gap |
| `--space-5` | 20 | `gap-5 p-5` | card mediano padding |
| `--space-6` | 24 | `gap-6 p-6` | **card padding default** |
| `--space-8` | 32 | `gap-8 p-8` | card grande, section header gap |
| `--space-10` | 40 | `gap-10 p-10` | grupo de cards, list section |
| `--space-12` | 48 | `gap-12 p-12` | bloque grande / form full |
| `--space-16` | 64 | `gap-16 py-16` | **section vertical mínimo (mobile)** |
| `--space-20` | 80 | `gap-20 py-20` | section vertical estándar |
| `--space-24` | 96 | `gap-24 py-24` | **section vertical desktop default** |
| `--space-32` | 128 | `gap-32 py-32` | Hero vertical, separador mayor |

### Razón

Base 4 px (no 8 px) por dos motivos concretos:

1. **DIN 2014 Narrow** es condensada y necesita interlineado y micro-espacios finos (4, 12, 20) que en una grilla de 8 quedarían forzados a 8/16/24 y romperían el ritmo vertical. La grilla de 4 da más control sobre la altura de líneas y el padding interno de chips/badges donde 8 px es demasiado y 4 demasiado poco.
2. **Audiencia 40–60+**: tamaño de fuente base 17–18 px (no 16 px), line-height generoso, espacios entre filas de tabla cómodos. La grilla 4 nos permite alcanzar esos `1.6` y `1.7` de line-height sin terminar en valores impares.

### Aplicación (Tailwind v4)

En `globals.css`:

```css
@theme {
  --spacing: 0.25rem;   /* 4 px base — habilita p-1=4 p-2=8 p-6=24 p-24=96 etc. */
}
```

Tailwind v4 con `--spacing` declarado lee automáticamente cualquier `p-N`, `gap-N`, `m-N`, `space-x-N` como `N × 4px`. No hace falta enumerar token por token. La tabla de arriba es contractual (qué tokens usar dónde), no de declaración.

**Reglas de aplicación** (no improvisar):

- **Card padding**: `p-6` (24 px) default · `p-8` (32 px) para hero cards o pricing.
- **Section padding vertical**: `py-16` mobile · `py-24` md+ · `py-32` sólo Hero y CTA final.
- **Section padding horizontal**: `px-4` mobile · `px-6` sm · `px-8` md · `px-12` lg+. Container hace el resto.
- **Gap inter-section** (entre `<section>` consecutivas en una página): NO gap. Cada sección administra su propio `py-N`. Los separadores visuales son borders o cambios de background.
- **Grid gap dentro de section**: `gap-6` para grids de 2–3 cards, `gap-8` para 4 cards, `gap-12` para layout asimétrico hero.
- **Form vertical gap**: `gap-4` (16 px) entre filas · `gap-2` (8 px) entre label e input.
- **List vertical gap**: `gap-3` (12 px) listas densas, `gap-6` (24 px) listas con bullets gráficos.

---

## 2. Border radius

### Decisión

**Sólo 2 valores. `radius-1 = 2 px` y `radius-2 = 4 px`. Sin radius-full salvo avatares.**

| Token | px | Tailwind class | Uso |
|---|---|---|---|
| `--radius-0` | 0 | `rounded-none` | imágenes, hero, separadores, banners full-bleed |
| `--radius-1` | 2 | `rounded-sm` | inputs, selects, textareas, checkboxes, code inline |
| `--radius-2` | 4 | `rounded` | botones, cards, badges, tooltips, alerts |
| `--radius-full` | 9999 | `rounded-full` | avatares, dots de status, indicador GoatCounter |

### Razón

DIN 2014 Narrow es una sans **geométrica de esquinas vivas**. Border-radius grande (8 px+) entra en conflicto visual con la tipografía y empuja el conjunto hacia "consumer SaaS 2024". Borders 2/4 mantienen la sensación industrial sin ser brutalistas (0 px en todo se siente hostil para CTOs de 50 años acostumbrados a UIs corporativas Material).

**Las imágenes NO llevan radius**. Una foto de equipo o un screenshot de Odoo se presentan tal cual, como en un libro de Stripe Press. Esto es un sello: la mayoría de landings hoy redondea todo. Nosotros no.

Los avatares circulares son la única excepción a la regla "sin radius mayor a 4 px", y aplican exclusivamente a fotos de personas y dots de status (verde activo, gris archivado, naranja en progreso).

### Aplicación (Tailwind v4)

En `globals.css`:

```css
@theme {
  --radius-sm: 2px;
  --radius:    4px;
  --radius-md: 4px;  /* alias, no crece */
  --radius-lg: 4px;  /* alias, no crece */
  --radius-xl: 4px;  /* alias, no crece — bloquear escalado */
  --radius-2xl: 4px; /* idem */
  --radius-3xl: 4px; /* idem */
}
```

Aliasamos los radii grandes de Tailwind a 4 px para que cualquier copy-paste accidental desde otra UI no rompa la disciplina (`rounded-2xl` no se vuelve enorme). El único radius "real" extra es `rounded-full`, que sobrevive.

**Reglas duras**:

- Botón primario y secundario: `rounded` (4 px).
- Inputs y `select`: `rounded-sm` (2 px) — sutil "ficha técnica".
- Cards: `rounded` (4 px) cuando llevan border; `rounded-none` cuando son full-bleed o están dentro de otra card.
- Imágenes y video: `rounded-none` SIEMPRE. Si la foto necesita "respirar", usar margin o background-color del contenedor, no radius.
- Badges, tags, chips: `rounded` (4 px). No pill (`rounded-full`).
- Code inline: `rounded-sm` (2 px) con padding `px-1.5 py-0.5`.

---

## 3. Elevation / sombras

### Decisión

**Un único nivel de sombra. Cards no llevan sombra: llevan border.**

| Token | Valor | Uso |
|---|---|---|
| `--shadow-0` | none | default · cards estáticos · imágenes · secciones |
| `--shadow-1` | `0 1px 0 rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.06)` | sticky nav al hacer scroll · dropdowns · popovers · tooltips · DiagnosticoGate modal-card en estado submitting |

### Razón

Una landing B2B Colombiana para directivos 40+ no necesita "depth" para parecer real. Los elementos se diferencian por **borde, fondo y tipografía**, no por sombra. Una sola sombra muy sutil (1 px de offset + 1 px de borde reforzado) se reserva para indicar que algo **flota sobre el documento** (nav sticky tras scroll, dropdown abierto). El resto del documento es plano y técnico, como un PDF de auditoría.

Cards usan **1 px de border** `--color-border` (`#eeeeee` o equivalente neutral) en lugar de sombra. Esta elección es **diferenciador #1** del aesthetic: la mayoría de SaaS hoy abusa de `box-shadow: 0 4px 24px rgba(...)`. Nosotros no.

### Aplicación (Tailwind v4)

En `globals.css`:

```css
@theme {
  --shadow-none: none;
  --shadow-sm:   0 1px 0 rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.06);
  --shadow:      0 1px 0 rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.06);
  --shadow-md:   0 1px 0 rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.06); /* alias */
  --shadow-lg:   0 1px 0 rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.06); /* alias */
  --shadow-xl:   0 1px 0 rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.06); /* alias */
  --shadow-2xl:  0 1px 0 rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.06); /* alias */
}
```

Aliasamos los `shadow-md/lg/xl` al mismo valor para que ningún componente accidentalmente escale a sombras enormes.

**Reglas duras**:

- Cards en grid de verticales / herramientas / casos: `border border-[--color-border] shadow-none`.
- Nav sticky: `shadow-none` al inicio · `shadow` cuando `scrollY > 8 px` (toggle vía script o IntersectionObserver).
- Dropdowns y menús: `shadow`.
- Modales: NO shadow. Usar `bg-surface-dark/60` como overlay + `bg-surface-elevated` centrado, separado por un `ring-1 ring-border`.
- Botones: NO shadow nunca. Estado hover cambia color, no profundidad.

---

## 4. Animation philosophy

### Decisión

**Una curva, tres duraciones, tres patrones. Cero scroll-triggered, cero parallax.**

**Curva única**: `cubic-bezier(0.22, 1, 0.36, 1)` — alias `ease-out-quart`. Comienza rápida y descansa al final. Es la curva más usada en sistemas editoriales (Linear, Vercel, Stripe) precisamente porque se siente "decidida sin ser brusca".

**Tres duraciones**:

| Token | ms | Uso |
|---|---|---|
| `--motion-fast` | 120 | hover de color/background, focus rings, checkbox marca, dropdown open |
| `--motion-base` | 240 | entrada Hero, page transition cross-fade, badge swap, accordion open |
| `--motion-slow` | 400 | reservada · sólo para entrada en cascada del Hero (3 elementos × 80 ms stagger) y para la animación de éxito de submit del DiagnosticoGate |

**Tres patrones autorizados**:

1. **Hero entry** (sólo en la página `/`): título + subtítulo + CTA fade-in + translate-y de 8 px, con stagger de 80 ms entre los 3 elementos. Total 400 ms. Se ejecuta una sola vez al cargar la página (`prefers-reduced-motion: reduce` la desactiva por completo).
2. **Hover**: cambio de color/background/border-color en 120 ms. Ningún `transform`, ningún `scale`. Los botones cambian background y opcionalmente subrayan el texto; no se elevan, no se agrandan.
3. **Page transition**: `astro:view-transitions` con `transition-name: root` y cross-fade de 240 ms entre páginas. Excepción: navegación interna por anclas (`#proyectos-en-desarrollo`) usa scroll smooth, no transition.

**Lo que NO existe**:

- Scroll-triggered animations de cualquier tipo (no GSAP, no Intersection scroll-link, no parallax).
- Letras que aparecen una por una.
- Logos que rotan.
- Botones que rebotan en hover.
- Cualquier animación que dure más de 400 ms (excepto la animación de éxito del Gate).
- Cualquier curva que no sea `ease-out-quart`.

### Razón

La audiencia (CTOs 40–60, directiva BPM/agroindustria) lee la página como leería una propuesta consultiva: en orden, sin distracciones. Cada animación que no sirve a esa lectura es ruido. Conservamos exclusivamente las que **resuelven un problema de feedback**: confirmar foco, confirmar éxito, indicar transición entre secciones del flujo.

**Accesibilidad**: con `prefers-reduced-motion: reduce`, las tres duraciones colapsan a 0 ms y el Hero stagger se desactiva. Esto es no-negociable.

### Aplicación (Tailwind v4)

En `globals.css`:

```css
@theme {
  --ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-fast: 120ms;
  --duration-base: 240ms;
  --duration-slow: 400ms;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
}
```

Utilidades Tailwind: `transition-colors duration-[--duration-fast] ease-[--ease-out-quart]`. Para el Hero stagger, usar `animation-delay` inline o data-attribute (`data-stagger="0|1|2"` con CSS `animation-delay: calc(var(--i) * 80ms)`).

---

## 5. Grid + breakpoints

### Decisión

**Cinco breakpoints (Tailwind defaults). Container max 1280 px. Grilla 12 columnas con gap 24 px, fluida desde lg en adelante.**

| Breakpoint | min-width | Container max | Padding-X | Columnas activas |
|---|---|---|---|---|
| (base) | 0 | 100% | 16 px (`px-4`) | 4 col / stack |
| `sm` | 640 px | 100% | 24 px (`px-6`) | 4–6 col |
| `md` | 768 px | 100% | 32 px (`px-8`) | 8 col |
| `lg` | 1024 px | 1024 px | 32 px (`px-8`) | 12 col grilla completa |
| `xl` | 1280 px | 1280 px | 48 px (`px-12`) | 12 col grilla completa |

**No usamos `2xl` (1536 px)**. La razón está abajo. Cuatro breakpoints en uso real + el base.

### Razón

1. **Cuatro breakpoints en lugar de cinco**: 1536 px+ pertenece a monitores wide de devs. La audiencia primaria (decisores MiPyME) está mayoritariamente en mobile (60 %), laptop 1366×768 (25 %) y monitor externo 1080p–1440p (15 %). Forzar el container a quedarse en 1280 px en monitores grandes evita líneas de texto inhumanas (más de ~80 caracteres por línea es ilegible en cuerpo) y mantiene la composición editorial.
2. **Grilla 12 columnas con gap 24 px**: estándar editorial; soporta layout asimétrico 8+4 (texto + sidebar callout) o 7+5 (foto + caption), no sólo 6+6 trivial.
3. **Padding lateral progresivo**: empieza apretado en mobile (16 px) y crece a 48 px en xl. Esto mantiene el cuerpo de texto centrado y respirando incluso cuando el viewport es ancho.
4. **Stack en mobile, no scroll horizontal**: cualquier tabla / matriz que no entre en 360 px hace overflow-x-auto con scroll-snap, NO se reduce a microtipografía.

### Aplicación (Tailwind v4)

En `globals.css`:

```css
@theme {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  /* --breakpoint-2xl deliberadamente NO declarado — Tailwind v4 lo desactiva si no existe */

  --container-2xl: 1280px; /* clamp container even if 2xl is requested */
  --container-xl:  1280px;
  --container-lg:  1024px;
  --container-md:  768px;
}
```

Container utility: `<div class="mx-auto w-full max-w-screen-xl px-4 sm:px-6 md:px-8 xl:px-12">`. Esto se encapsula en un componente `Container.astro` reusable.

**Layouts canónicos del repo**:

| Sección | Estructura | Notas |
|---|---|---|
| Hero | `grid lg:grid-cols-12 gap-8` · contenido en `col-span-12 lg:col-span-7` | foto / asset en `col-span-5` a la derecha en lg+ |
| Verticales (cards) | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6` | 3 cols en lg, 2 en sm, stack en mobile |
| Pricing outcomes | `grid grid-cols-1 md:grid-cols-3 gap-6` md+ · stack en mobile | card central destacada con borde más fuerte |
| Sobre / texto largo | `mx-auto max-w-prose` (≈ 65ch) | sin grid; columna única editorial |
| Casos | `grid grid-cols-1 lg:grid-cols-2 gap-8` | 2 col en lg, stack antes |
| Diagnóstico gate | container `max-w-3xl` (768 px) centrado | flujo lineal, no necesita grid |
| Footer | `grid grid-cols-2 md:grid-cols-4 gap-6` | links + legal + GitHub + redes |

---

## Anti-decisiones explícitas

Lista cerrada de qué **NO** vamos a hacer. Si en cualquier momento la implementación se acerca a uno de estos puntos, se descarta:

1. **No gradientes**. Excepto el fondo del Hero que puede llevar un gradiente teal muy sutil (`from-surface to-surface-elevated`), ninguna sección, botón, card o background lleva gradiente. Especialmente prohibido: gradientes diagonales púrpura→azul, naranja→rosa, teal→cyan.
2. **No glassmorphism**. Ningún `backdrop-blur-*`, ningún `bg-white/30`, ningún elemento "vidrio esmerilado". El estilo es opaco y editorial.
3. **No mega-radius**. Border-radius máximo 4 px, excepto avatares (`rounded-full`).
4. **No floating-action-button**. No hay botones flotantes sticky de "Chat con nosotros" estilo Intercom. El chat es un placeholder estático en el footer hasta Ola 2.
5. **No iconos de colores random**. Lucide en monocromo (`stroke-current text-primary` o `text-text-muted`). Excepción: el icono de "alerta" o "éxito" puede usar `text-accent` o `text-emerald-600` cuando aporta jerarquía.
6. **No fotos stock genéricas**. Solo fotos reales del equipo o screenshots reales de Odoo / Verticales. Si no hay foto real, no hay foto.
7. **No emojis**. En todo el repo: cero emojis. Para indicar estado se usan dots de color o iconos Lucide. Esto es brand-level no-negociable.
8. **No scroll-jacking**. La página scrollea como un documento. No hay "scroll horizontal de cards", no hay "el hero se queda pegado mientras hace zoom".
9. **No tooltips para todo**. Tooltips se reservan para abreviaturas técnicas (NIT, MiPyME, etc.) y siglas. NO para botones (label propio) ni para imágenes (alt text).
10. **No "AI orb" de hero**. Cualquier asset 3D, esfera holográfica, partículas, líneas conectadas en gradiente, está vetado.
11. **No copy startup-bro**. Nada de "supercharge", "10x your business", "AI-powered everything". Verbos concretos en español neutro: "auditamos", "automatizamos", "implementamos", "auditamos en 48 horas".
12. **No dark mode en Ola 1**. La paleta y los tokens están diseñados para light mode. Dark mode entra en Ola 2 con auditoría aparte. No agregar `dark:` utilities ahora aunque "no cuesten".
13. **No skeleton loaders animados**. Para estados de carga (Worker /api/lead, Bucket B gate submit) usar un spinner sobrio o cambio de copy del botón ("Enviando…"). Los skeletons grises pulsantes se sienten 2022.
14. **No carousels**. Si hay 3 testimonios, son 3 cards visibles. Si son 6, son 6. No hay slider/carousel.
15. **No emoji-flag para idioma**. Cuando entre EN i18n (Ola 2), el switch dice "ES / EN" no "🇨🇴 / 🇺🇸".

---

## Cómo se traduce a `tailwind.config.ts` y `globals.css`

Esta sección es la entrada explícita al **Paso 7** del plan (tokens). Resumen para implementar:

**`globals.css` — bloque `@theme`** (Tailwind v4):

```css
@import "tailwindcss";

@theme {
  /* Color tokens — ya definidos en colors-legacy.txt + brand-notes-v2.md */
  --color-primary:          #008080;
  --color-primary-hover:    #006666;
  --color-primary-300:      #5eead4;
  --color-primary-600:      #0d9488;
  --color-primary-700:      #0f766e;
  --color-accent:           #ff8c00;
  --color-accent-hover:     #e67a00;
  --color-accent-400:       #fb923c;
  --color-accent-500:       #f97316;
  --color-text:             #333333;
  --color-text-muted:       #666666;
  --color-surface:          #f8f8f8;
  --color-surface-elevated: #ffffff;
  --color-surface-dark:     #111827;
  --color-border:           #eeeeee;

  /* Spacing — base 4 px */
  --spacing: 0.25rem;

  /* Radii — solo 2/4 px efectivos */
  --radius-sm:  2px;
  --radius:     4px;
  --radius-md:  4px;
  --radius-lg:  4px;
  --radius-xl:  4px;
  --radius-2xl: 4px;
  --radius-3xl: 4px;

  /* Shadows — una sola sombra real */
  --shadow-none: none;
  --shadow-sm:   0 1px 0 rgba(15,23,42,0.05), 0 0 0 1px rgba(15,23,42,0.06);
  --shadow:      0 1px 0 rgba(15,23,42,0.05), 0 0 0 1px rgba(15,23,42,0.06);
  --shadow-md:   var(--shadow);
  --shadow-lg:   var(--shadow);
  --shadow-xl:   var(--shadow);
  --shadow-2xl:  var(--shadow);

  /* Motion */
  --ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-fast:  120ms;
  --duration-base:  240ms;
  --duration-slow:  400ms;

  /* Breakpoints — sin 2xl */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --container-xl:  1280px;
  --container-2xl: 1280px;

  /* Typography */
  --font-sans: "DIN 2014 Narrow", "Roboto Condensed", "Arial Narrow", system-ui, sans-serif;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
}

/* @font-face para los 4 pesos DIN 2014 Narrow viene en el Paso 7. */
```

**`tailwind.config.ts`**: Tailwind v4 lee `@theme` desde CSS, así que el config queda mínimo (sólo `content` globs si es necesario). En Astro 6 + `@tailwindcss/vite`, ni siquiera hace falta el config TS; el plugin Vite recoge `globals.css` automáticamente.

---

## Checklist antes de codear (Paso 7 del plan)

- [ ] `globals.css` con bloque `@theme` completo (tokens de arriba).
- [ ] 4 declaraciones `@font-face` para DIN 2014 Narrow (pesos 200/300/400/700) apuntando a `/brand/fonts/din-2014-narrow-{200,300,400,700}.woff2` con `font-display: swap` y `unicode-range` latin + latin-ext + puntuación MNC.
- [ ] Import de `globals.css` en `src/layouts/Page.astro` (o `Base.astro`) — un único punto de entrada.
- [ ] Componente `Container.astro` con el padding progresivo.
- [ ] Componente `Section.astro` con `py-16 md:py-24` default + override por prop `tone="hero" | "cta"`.
- [ ] Página `index.astro` con un test de fuente: `<p class="font-sans text-primary">…</p>` que debe resolver `#008080` y la familia DIN correctamente en DevTools.

---

**Fin del documento.** Esperar aprobación de Marlon antes de generar `tailwind.config.ts` y `globals.css` reales (Paso 7).
