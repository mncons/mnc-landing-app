// Logger JSON estructurado. Workers Observability captura console.* y los
// envía al dashboard cuando `[observability] enabled = true` está en
// wrangler.toml. Nivel se mapea a console.{log|warn|error}.
//
// Política PII: cero datos personales en logs. El sanitize() filtra una
// lista negra defensiva. Si un campo nuevo con PII se agrega, hay que
// sumarlo a PII_KEYS o no pasarlo a log().

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogRecord {
  event: string;
  status?: number;
  ref?: string | null;
  sector?: string;
  source?: string;
  latency_ms?: number;
  retries?: number;
  retry_after?: number;
  error?: string;
  // Campos arbitrarios adicionales (issues count, method, origin, etc.).
  // El sanitize filtra PII por nombre de key.
  [k: string]: unknown;
}

// Lista negra de keys que NUNCA deben aparecer en logs. Defensa frente a
// código futuro que use spread (...) sin pensarlo dos veces.
const PII_KEYS = new Set([
  // Campos del payload del lead
  "nombre",
  "email",
  "email_from",
  "telefono",
  "phone",
  "mensaje",
  "description",
  "contact_name",
  "partner_name",
  // Identificadores de red
  "ip",
  "ua",
  "user_agent",
  // Secrets / headers sensibles
  "ODOO_API_KEY",
  "LEAD_INTERNAL_SECRET",
  "X-Internal-Secret",
  "x-internal-secret",
  "Authorization",
  "authorization",
  "Cookie",
  "cookie",
]);

function sanitize(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (PII_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

export function log(record: LogRecord, level: LogLevel = "info"): void {
  const line = JSON.stringify({
    level,
    ts: new Date().toISOString(),
    service: "mnc-lead-to-odoo",
    ...sanitize(record),
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}
