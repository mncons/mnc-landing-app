import { LeadPayloadEnriched } from "./schema";
import { log } from "./logger";
import { checkRateLimit } from "./rate-limit";
import {
  configFromEnv,
  createLead,
  OdooFault,
  OdooTimeoutError,
  type CreateLeadInput,
} from "./odoo-client";

interface Env {
  // ---- Secrets ----
  LEAD_INTERNAL_SECRET: string;
  ODOO_URL: string;
  ODOO_DB: string;
  ODOO_USER: string;
  ODOO_API_KEY: string;
  TAG_WEB: string;
  TAG_DOMAIN: string;
  TAG_SMOKE: string;
  TAG_SECTORS: string; // JSON: {"horeca":7,"agroindustria":8,...,"manufactura":14}
  TEAM_WEB: string;
  UTM_SOURCE_WEB: string;
  USER_SUPER_MN: string;

  // ---- Vars públicas (wrangler.toml [vars]) ----
  ALLOWED_ORIGINS: string;
  RATE_LIMIT_MAX: string;
  RATE_LIMIT_WINDOW_SECONDS: string;
  ODOO_TIMEOUT_MS: string;
  ODOO_MAX_RETRIES: string;
  LOG_LEVEL: string;

  // ---- KV ----
  RATE_LIMIT: KVNamespace;
}

// Comparación constant-time del internal secret. Mitiga timing attacks
// (aunque la latencia de fetch en Workers es ruidosa, mejor sí que no).
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function buildCorsHeaders(
  origin: string | null,
  allowed: string[],
): Record<string, string> {
  // D8 (plan lote 2): allowlist específico (subdomain
  // mnc-landing-app.pages.dev, NO wildcard *.pages.dev).
  const matched = origin && allowed.includes(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": matched,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Internal-Secret",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

export default {
  async fetch(req: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const start = Date.now();
    const origin = req.headers.get("Origin");
    const allowedOrigins = env.ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const cors = buildCorsHeaders(origin, allowedOrigins);

    // ---- 1. OPTIONS preflight ----
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // ---- 2. Method allowlist ----
    if (req.method !== "POST") {
      log({ event: "method_rejected", status: 405, method: req.method }, "warn");
      return jsonResponse({ error: "method_not_allowed" }, 405, cors);
    }

    // ---- 3. CORS deny ----
    // Si hay Origin y no está en allowlist, rechazamos.
    // Origin null (server-to-server, curl directo): permitido si pasa el
    // internal secret check de abajo.
    if (origin && !allowedOrigins.includes(origin)) {
      log({ event: "cors_rejected", status: 403, origin }, "warn");
      return jsonResponse({ error: "cors" }, 403, cors);
    }

    // ---- 4. Internal secret (handshake con Pages Function 2.C) ----
    const provided = req.headers.get("X-Internal-Secret") ?? "";
    if (!constantTimeEqual(provided, env.LEAD_INTERNAL_SECRET)) {
      log({ event: "internal_secret_mismatch", status: 403 }, "warn");
      return jsonResponse({ error: "forbidden" }, 403, cors);
    }

    // ---- 5. Rate limit por IP (sha256(ip) en KV) ----
    const ip =
      req.headers.get("CF-Connecting-IP") ??
      req.headers.get("X-Forwarded-For") ??
      "unknown";
    const rl = await checkRateLimit(
      env.RATE_LIMIT,
      ip,
      parseInt(env.RATE_LIMIT_MAX, 10),
      parseInt(env.RATE_LIMIT_WINDOW_SECONDS, 10),
    );
    if (!rl.ok) {
      log({ event: "rate_limited", status: 429, retry_after: rl.retryAfter }, "warn");
      return jsonResponse(
        { error: "rate_limited", retry_after: rl.retryAfter },
        429,
        { ...cors, "Retry-After": String(rl.retryAfter) },
      );
    }

    // ---- 6. Parse JSON ----
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      log({ event: "payload_invalid_json", status: 400 }, "warn");
      return jsonResponse({ error: "invalid_json" }, 400, cors);
    }

    // ---- 7. Validar schema (Zod) ----
    const parsed = LeadPayloadEnriched.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: i.path.join(".") || "(root)",
        code: i.code,
        message: i.message,
      }));
      log(
        {
          event: "payload_validation_failed",
          status: 400,
          issues_count: issues.length,
          // No incluimos issues[].message si pudiera contener PII.
          // Aquí los códigos Zod son seguros (invalid_string, too_small, etc.).
          codes: issues.map((i) => i.code).join(","),
        },
        "warn",
      );
      return jsonResponse(
        { error: "invalid_payload", fields: issues },
        400,
        cors,
      );
    }
    const payload = parsed.data;

    // ---- 8. Honeypot (Ajuste A: indistinguible del éxito) ----
    if (payload.website !== "") {
      log(
        { event: "honeypot_triggered", status: 200, sector: payload.sector },
        "warn",
      );
      return jsonResponse({ ok: true, ref: null }, 200, cors);
    }

    // ---- 9. Resolver tag de sector desde TAG_SECTORS (JSON) ----
    let tagSectorsMap: Record<string, number>;
    try {
      tagSectorsMap = JSON.parse(env.TAG_SECTORS) as Record<string, number>;
    } catch {
      log(
        {
          event: "config_error",
          status: 500,
          error: "TAG_SECTORS is not valid JSON",
        },
        "error",
      );
      return jsonResponse({ error: "config_error" }, 500, cors);
    }
    const sectorTagId = tagSectorsMap[payload.sector];
    if (typeof sectorTagId !== "number") {
      log(
        {
          event: "config_error",
          status: 500,
          sector: payload.sector,
          error: "sector not in TAG_SECTORS map",
        },
        "error",
      );
      return jsonResponse({ error: "config_error" }, 500, cors);
    }

    // ---- 10. Description con UTM/referrer anexados (Ajuste C) ----
    const utmBits = [
      payload.utm_source && `utm_source=${payload.utm_source}`,
      payload.utm_medium && `utm_medium=${payload.utm_medium}`,
      payload.utm_campaign && `utm_campaign=${payload.utm_campaign}`,
      payload.referrer && `referrer=${payload.referrer}`,
    ].filter(Boolean) as string[];

    const description =
      payload.mensaje +
      "\n\n[source: " +
      payload.source +
      (utmBits.length > 0 ? ", " + utmBits.join(", ") : "") +
      "]";

    // ---- 11. Llamar Odoo ----
    const leadInput: CreateLeadInput = {
      name: `${payload.nombre} — ${payload.empresa}`,
      contact_name: payload.nombre,
      email_from: payload.email,
      phone: payload.telefono ?? false,
      partner_name: payload.empresa,
      description,
      tag_ids: [
        parseInt(env.TAG_WEB, 10),
        parseInt(env.TAG_DOMAIN, 10),
        sectorTagId,
      ],
      team_id: parseInt(env.TEAM_WEB, 10),
      source_id: parseInt(env.UTM_SOURCE_WEB, 10),
      user_id: parseInt(env.USER_SUPER_MN, 10),
      lang: "es_CO",
    };

    try {
      const leadId = await createLead(configFromEnv(env), leadInput);
      const latency = Date.now() - start;
      const ref = `LEAD-${leadId}`;
      log({
        event: "lead_created",
        status: 200,
        ref,
        sector: payload.sector,
        source: payload.source,
        latency_ms: latency,
      });
      return jsonResponse({ ok: true, lead_id: leadId, ref }, 200, cors);
    } catch (err) {
      const latency = Date.now() - start;

      if (err instanceof OdooFault) {
        // 4xx-equivalente del lado Odoo (permiso, schema, etc.).
        // Sanitizamos faultString al cliente: solo primeros 200 chars como hint.
        log(
          {
            event: "odoo_fault",
            status: 502,
            sector: payload.sector,
            source: payload.source,
            latency_ms: latency,
            fault_code: err.faultCode,
            // faultString puede contener trazas server-side; lo logueamos
            // crudo (no es PII del lead) pero filtramos lo que devolvemos.
            error: err.faultString.substring(0, 500),
          },
          "warn",
        );
        return jsonResponse(
          {
            error: "odoo_rejected",
            ref: null,
            hint: err.faultString.substring(0, 200),
          },
          502,
          cors,
        );
      }

      if (err instanceof OdooTimeoutError) {
        log(
          {
            event: "odoo_timeout",
            status: 504,
            sector: payload.sector,
            source: payload.source,
            latency_ms: latency,
          },
          "error",
        );
        return jsonResponse({ error: "odoo_timeout", ref: null }, 504, cors);
      }

      log(
        {
          event: "odoo_error",
          status: 502,
          sector: payload.sector,
          source: payload.source,
          latency_ms: latency,
          error: err instanceof Error ? err.message : "unknown",
        },
        "error",
      );
      return jsonResponse({ error: "odoo_unavailable", ref: null }, 502, cors);
    }
  },
} satisfies ExportedHandler<Env>;
