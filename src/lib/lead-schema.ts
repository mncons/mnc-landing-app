// Schema base del payload Lead — fuente única de verdad.
// Importado por:
//   - functions/api/lead.ts                 (Pages Function · BFF edge)
//   - workers/lead-to-odoo/src/schema.ts    (Worker · re-export + extends con
//                                            LeadPayloadEnriched que agrega
//                                            ip/ua/ts del request original)
//
// Cualquier cambio acá impacta ambos lados. Tras editar, correr:
//   1) (root)  pnpm astro check        — valida tipos Astro + functions
//   2) (Worker) pnpm typecheck         — valida re-export en el Worker
//
// Ver MIGRATION_LOG.md decisión #10 (sub-lote 2.C).

import { z } from "zod";

// 8 sectores reales (manufactura agregado tras setup Odoo 2.A.1).
// Mantener sincronizado con TAG_SECTORS env del Worker.
export const SECTORS = [
  "horeca",
  "agroindustria",
  "retail",
  "servicios-profesionales",
  "agencias",
  "bpm",
  "marketplace",
  "manufactura",
] as const;
export type Sector = (typeof SECTORS)[number];

// Sources permitidos. Regex permisiva (no enum cerrado) para que el
// inventario del front pueda crecer sin tocar el schema. Validación:
// lowercase + dígitos + guiones, 1..64 chars. Ver MIGRATION_LOG #9.10.
const SOURCE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

// ============================================================================
// Helpers de campo (exportados para que el Worker arme LeadPayloadEnriched)
// ============================================================================

export const trimmedString = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

export const optionalCappedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

// ============================================================================
// Payload base — lo que el cliente envía al endpoint /api/lead
// ============================================================================

export const LeadPayload = z.object({
  nombre: trimmedString(2, 80),
  email: z.string().trim().email().max(254),
  empresa: trimmedString(1, 120),
  sector: z.enum(SECTORS),
  mensaje: trimmedString(10, 1000),
  telefono: optionalCappedString(40),
  consent_privacidad: z.literal(true, {
    errorMap: () => ({ message: "consent_required" }),
  }),
  source: z
    .string()
    .trim()
    .regex(SOURCE_PATTERN, "source must match /^[a-z0-9][a-z0-9-]{0,63}$/")
    .default("contacto"),

  // Honeypot: campo "website" inyectado visualmente oculto en el form (2.D).
  // Humanos no lo tocan; queda "". Si llega NO vacío, BFF y Worker responden
  // 200 {ok:true, ref:null} indistinguible del éxito (Ajuste A plan lote 2).
  website: z.string().default(""),

  // UTM + referrer — capturados por el form al mount desde
  // window.location.search + document.referrer (Ajuste C plan lote 2).
  utm_source: optionalCappedString(200),
  utm_medium: optionalCappedString(200),
  utm_campaign: optionalCappedString(200),
  referrer: optionalCappedString(200),

  // Turnstile token — generado por el widget en el cliente (2.D), validado
  // server-side por la Pages Function (2.C) contra siteverify ANTES de
  // forwardear al Worker. Opcional en el schema: si TURNSTILE_SECRET_KEY
  // está ausente en env (dev local), la PF skipea la verificación con log
  // warn. Ver functions/api/lead.ts.
  turnstile_token: z.string().trim().max(2048).optional(),
});

export type LeadPayload = z.infer<typeof LeadPayload>;
export type LeadPayloadInput = z.input<typeof LeadPayload>;
