import { z } from "zod";

// 8 sectores reales (manufactura agregado en sub-lote 2.A.1 tras setup
// Odoo real). Mantener sincronizado con TAG_SECTORS env del Worker.
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

// Sources permitidos. Regex permisiva en lugar de enum cerrado: agregar una
// herramienta nueva en el front no debe requerir cambiar el schema del
// Worker. Validación: lowercase alfa-numérica con guiones, 1..64 chars.
const SOURCE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

// Helper: string requerido con trim, min y max.
const trimmedString = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

// Helper: string opcional con cap, vacío se mapea a undefined.
const optionalCappedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

// Payload del cliente. La Pages Function (2.C) re-valida con el mismo schema
// antes de forwardear; el Worker re-valida también server-side como defensa
// en profundidad.
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

  // Honeypot. Bots tipo greedy llenan todos los inputs visibles del DOM.
  // El field "website" se inyecta visualmente oculto (CSS absolute -9999px
  // tabindex=-1 aria-hidden) en el form de 2.D. Humanos no lo tocan; queda "".
  // Si llega NO vacío, retornamos {ok:true, ref:null} indistinguible del éxito
  // (Ajuste A del plan lote 2). Ver index.ts.
  website: z.string().default(""),

  // UTM + referrer (Ajuste C del plan lote 2). El form (2.D) los captura
  // desde location.search y document.referrer al mount.
  utm_source: optionalCappedString(200),
  utm_medium: optionalCappedString(200),
  utm_campaign: optionalCappedString(200),
  referrer: optionalCappedString(200),
});
export type LeadPayload = z.infer<typeof LeadPayload>;

// Schema enriquecido tras forward desde Pages Function. La PF anexa ip + ua +
// ts antes de pegarle al Worker. El Worker acepta estos como opcionales
// (defensa: si un atacante pega directo al Worker, NO los va a poder
// inyectar de forma confiable y nuestra rate-limit los recalcula de
// CF-Connecting-IP de cualquier modo).
export const LeadPayloadEnriched = LeadPayload.extend({
  ip: optionalCappedString(64),
  ua: optionalCappedString(512),
  ts: z.number().int().optional(),
});
export type LeadPayloadEnriched = z.infer<typeof LeadPayloadEnriched>;
