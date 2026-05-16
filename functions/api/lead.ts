// functions/api/lead.ts
//
// Cloudflare Pages Function (BFF edge). Recibe POST /api/lead del browser,
// valida el payload con Zod (schema compartido), verifica Turnstile token
// server-side, y forwardea al Worker `lead-to-odoo` con un internal secret.
//
// Tipos PagesFunction manuales (cero deps externos) para no contaminar
// el tsconfig global de Astro con @cloudflare/workers-types.
//
// Flujo:
//   1. OPTIONS preflight       → 204 + CORS headers
//   2. CORS Origin allowlist   → 403 cors si Origin no está en lista
//   3. Parse JSON              → 400 invalid_json si malformado
//   4. Zod schema validation   → 400 invalid_payload | 400 consent_required
//   5. Honeypot indistinguible → 200 {ok:true, ref:null} (Ajuste A)
//   6. Turnstile siteverify    → 400 turnstile_failed | skip si dev local
//   7. Forward al Worker       → propaga status, body re-mapeado
//
// Logging: JSON estructurado sin PII (lista negra de keys). Workers
// Observability captura console.* automáticamente cuando la Pages Function
// se deploya en CF Pages.
//
// Ver MIGRATION_LOG.md decisión #10 (sub-lote 2.C).

import { LeadPayload } from "../../src/lib/lead-schema";

// ============================================================================
// Types — manuales para evitar dep externo
// ============================================================================

interface Env {
  // Compartidos con Worker (mismos valores)
  LEAD_INTERNAL_SECRET: string;
  LEAD_WORKER_URL: string; // ej: https://mnc-lead-to-odoo.<acct>.workers.dev

  // Turnstile (opcional en dev local — si está ausente, skipea siteverify)
  TURNSTILE_SECRET_KEY?: string;

  // Vars públicas (definidas en .dev.vars o wrangler.toml de Pages)
  ALLOWED_ORIGINS: string;
}

interface PagesFunctionContext<E = unknown> {
  request: Request;
  env: E;
  next: () => Promise<Response>;
  waitUntil: (promise: Promise<unknown>) => void;
}

type PagesFunction<E = unknown> = (
  context: PagesFunctionContext<E>,
) => Response | Promise<Response>;

// ============================================================================
// Helpers
// ============================================================================

function buildCorsHeaders(
  origin: string | null,
  allowed: string[],
): Record<string, string> {
  // D8 (plan lote 2): subdomain específico (mnc-landing-app.pages.dev),
  // NO wildcard *.pages.dev.
  const matched = origin && allowed.includes(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": matched,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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

// ---- Logger reducido (versión más simple que workers/lead-to-odoo/src/logger.ts)
const PII_KEYS = new Set([
  "nombre",
  "email",
  "telefono",
  "phone",
  "mensaje",
  "description",
  "contact_name",
  "partner_name",
  "ip",
  "ua",
  "user_agent",
  "LEAD_INTERNAL_SECRET",
  "TURNSTILE_SECRET_KEY",
  "Authorization",
  "authorization",
  "Cookie",
  "cookie",
  "turnstile_token",
]);

function log(
  record: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info",
): void {
  const sanitized: Record<string, unknown> = {
    level,
    ts: new Date().toISOString(),
    service: "mnc-pages-fn-lead",
  };
  for (const [k, v] of Object.entries(record)) {
    if (PII_KEYS.has(k)) continue;
    sanitized[k] = v;
  }
  const line = JSON.stringify(sanitized);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// ---- Turnstile siteverify
// https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

interface TurnstileVerifyResult {
  success: boolean;
  hostname?: string;
  challenge_ts?: string;
  action?: string;
  cdata?: string;
  "error-codes"?: string[];
}

async function verifyTurnstile(
  secretKey: string,
  token: string,
  ip: string,
): Promise<TurnstileVerifyResult> {
  const form = new FormData();
  form.append("secret", secretKey);
  form.append("response", token);
  if (ip && ip !== "unknown") form.append("remoteip", ip);

  let res: Response;
  try {
    res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form },
    );
  } catch {
    return { success: false, "error-codes": ["network_error"] };
  }
  if (!res.ok) {
    return { success: false, "error-codes": [`http_${res.status}`] };
  }
  return (await res.json()) as TurnstileVerifyResult;
}

// ============================================================================
// Handlers
// ============================================================================

export const onRequestOptions: PagesFunction<Env> = (context) => {
  const origin = context.request.headers.get("Origin");
  const allowedOrigins = (context.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(origin, allowedOrigins),
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const start = Date.now();
  const { request, env } = context;
  const origin = request.headers.get("Origin");
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const cors = buildCorsHeaders(origin, allowedOrigins);

  // ---- 0. Config check (fail-fast si secrets faltan) ----
  if (!env.LEAD_WORKER_URL || !env.LEAD_INTERNAL_SECRET) {
    log(
      {
        event: "config_error",
        status: 500,
        missing: !env.LEAD_WORKER_URL ? "LEAD_WORKER_URL" : "LEAD_INTERNAL_SECRET",
      },
      "error",
    );
    return jsonResponse({ error: "config_error" }, 500, cors);
  }

  // ---- 1. CORS deny ----
  if (origin && !allowedOrigins.includes(origin)) {
    log({ event: "cors_rejected", status: 403, origin }, "warn");
    return jsonResponse({ error: "cors" }, 403, cors);
  }

  // ---- 2. Parse JSON ----
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    log({ event: "lead_invalid_json", status: 400 }, "warn");
    return jsonResponse({ error: "invalid_json" }, 400, cors);
  }

  // ---- 3. Zod validation ----
  const parsed = LeadPayload.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    // Caso especial: si el único issue es consent_privacidad, devolvemos
    // un error code dedicado para que el UI pueda mostrar un copy específico.
    const consentOnly =
      issues.length === 1 && issues[0]!.path[0] === "consent_privacidad";
    if (consentOnly) {
      log(
        { event: "lead_consent_required", status: 400 },
        "warn",
      );
      return jsonResponse({ error: "consent_required" }, 400, cors);
    }
    log(
      {
        event: "lead_invalid",
        status: 400,
        issues_count: issues.length,
        codes: issues.map((i) => i.code).join(","),
      },
      "warn",
    );
    return jsonResponse(
      {
        error: "invalid_payload",
        fields: issues.map((i) => ({
          path: i.path.join(".") || "(root)",
          code: i.code,
          message: i.message,
        })),
      },
      400,
      cors,
    );
  }
  const payload = parsed.data;

  // ---- 4. Honeypot (Ajuste A: indistinguible del éxito) ----
  if (payload.website !== "") {
    log(
      { event: "honeypot_triggered", status: 200, sector: payload.sector },
      "warn",
    );
    return jsonResponse({ ok: true, ref: null }, 200, cors);
  }

  // ---- 5. Turnstile siteverify (skipea si no hay secret key — dev local) ----
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";

  if (env.TURNSTILE_SECRET_KEY) {
    if (!payload.turnstile_token) {
      log(
        {
          event: "turnstile_missing_token",
          status: 400,
          sector: payload.sector,
        },
        "warn",
      );
      return jsonResponse(
        { error: "turnstile_failed", reason: "missing_token" },
        400,
        cors,
      );
    }
    const result = await verifyTurnstile(
      env.TURNSTILE_SECRET_KEY,
      payload.turnstile_token,
      ip,
    );
    if (!result.success) {
      log(
        {
          event: "turnstile_failed",
          status: 400,
          sector: payload.sector,
          codes: (result["error-codes"] ?? []).join(","),
        },
        "warn",
      );
      return jsonResponse(
        { error: "turnstile_failed", reason: "invalid_token" },
        400,
        cors,
      );
    }
  } else {
    log(
      {
        event: "turnstile_skipped_dev",
        reason: "TURNSTILE_SECRET_KEY absent in env",
      },
      "warn",
    );
  }

  // ---- 6. Forward al Worker con payload enriquecido ----
  const ua = request.headers.get("User-Agent") ?? "";
  // El Worker no necesita el turnstile_token (la PF ya validó). Lo extraemos
  // del enriched para mantener el payload del Worker mínimo.
  const { turnstile_token: _t, ...payloadWithoutToken } = payload;
  void _t;
  const enriched = {
    ...payloadWithoutToken,
    ip,
    ua: ua.slice(0, 512),
    ts: Date.now(),
  };

  let workerRes: Response;
  try {
    workerRes = await fetch(env.LEAD_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": env.LEAD_INTERNAL_SECRET,
        "CF-Connecting-IP": ip,
      },
      body: JSON.stringify(enriched),
    });
  } catch (err) {
    log(
      {
        event: "lead_worker_unreachable",
        status: 502,
        error: err instanceof Error ? err.message : "unknown",
      },
      "error",
    );
    return jsonResponse({ error: "worker_unreachable" }, 502, cors);
  }

  const workerBodyText = await workerRes.text();
  let workerBody: Record<string, unknown>;
  try {
    workerBody = JSON.parse(workerBodyText) as Record<string, unknown>;
  } catch {
    log(
      {
        event: "lead_worker_invalid_response",
        status: 502,
        worker_status: workerRes.status,
      },
      "error",
    );
    return jsonResponse({ error: "worker_invalid_response" }, 502, cors);
  }

  const latency = Date.now() - start;
  const refValue =
    typeof workerBody.ref === "string" || workerBody.ref === null
      ? (workerBody.ref as string | null)
      : null;

  log(
    {
      event: workerRes.ok ? "lead_forwarded" : "lead_worker_error",
      status: workerRes.status,
      worker_status: workerRes.status,
      sector: payload.sector,
      source: payload.source,
      latency_ms: latency,
      ref: refValue,
    },
    workerRes.ok ? "info" : "error",
  );

  // Propagar status + body del Worker al cliente. CORS headers se mantienen.
  return jsonResponse(workerBody, workerRes.status, cors);
};
