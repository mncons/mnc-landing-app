// Schema del Worker: re-exporta el schema base compartido + extiende con
// LeadPayloadEnriched (ip/ua/ts) que solo el Worker recibe tras forward
// desde la Pages Function (2.C).
//
// Fuente única de verdad: src/lib/lead-schema.ts en raíz del proyecto.
// Cualquier cambio al payload base debe hacerse ahí.
// Ver MIGRATION_LOG.md decisión #10.

import { z } from "zod";
import {
  LeadPayload,
  optionalCappedString,
} from "../../../src/lib/lead-schema";

// Re-export del shared para que el Worker pueda importar desde un solo
// lugar (src/schema.ts) en lugar de cruzar al lib compartido.
export {
  LeadPayload,
  SECTORS,
  type Sector,
  type LeadPayload as LeadPayloadType,
} from "../../../src/lib/lead-schema";

// ============================================================================
// LeadPayloadEnriched — solo el Worker lo conoce
// ============================================================================
//
// La Pages Function (BFF edge) anexa ip + ua + ts antes de forwardear al
// Worker. El Worker valida que estos campos sean opcionales (defensa:
// si un atacante pega directo al Worker bypassando la PF, puede no
// enviarlos; la rate-limit del Worker recalcula la IP desde
// CF-Connecting-IP de cualquier modo).

export const LeadPayloadEnriched = LeadPayload.extend({
  ip: optionalCappedString(64),
  ua: optionalCappedString(512),
  ts: z.number().int().optional(),
});

export type LeadPayloadEnriched = z.infer<typeof LeadPayloadEnriched>;
