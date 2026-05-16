// Cliente XML-RPC manual para Odoo. NO usamos librería externa:
//   - Las opciones existentes (xmlrpc, fast-xml-parser) traen deps Node que
//     wrangler no resuelve sin compatibility_flags = ["nodejs_compat"].
//   - El subset de XML-RPC que necesitamos es trivial: methodCall con
//     params básicos (string, int, boolean, array, struct).
//   - Mantenemos cero deps Node = bundle más pequeño = cold start más rápido.
//
// Operaciones soportadas:
//   /xmlrpc/2/common.authenticate(db, user, apiKey, {}) -> uid (int) | False
//   /xmlrpc/2/object.execute_kw(db, uid, apiKey, model, method, args)
//     en particular: crm.lead.create([{...fields...}]) -> int (lead_id)
//
// Política Odoo i18n (MIGRATION_LOG #8.1): TODOS los nombres técnicos
// (modelo, método, valores comparables) van en INGLÉS. El caller (index.ts)
// resuelve nombres antes de pasar al cliente.

export interface OdooConfig {
  url: string;          // https://mnconsultoria.odoo.com (sin trailing slash)
  db: string;           // "mnconsultoria"
  user: string;         // "info@mnconsultoria.org"
  apiKey: string;       // API key "Landing" — ver MIGRATION_LOG #8
  timeoutMs: number;    // default 8000 (env ODOO_TIMEOUT_MS)
  maxRetries: number;   // default 2 (env ODOO_MAX_RETRIES)
}

export class OdooFault extends Error {
  constructor(public faultCode: number, public faultString: string) {
    super(`Odoo XML-RPC fault ${faultCode}: ${faultString}`);
    this.name = "OdooFault";
  }
}

export class OdooTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Odoo request timeout after ${timeoutMs}ms`);
    this.name = "OdooTimeoutError";
  }
}

// uid cache vive en globalThis del isolate. Cloudflare Workers reutilizan
// el isolate entre requests (~15-30 min de vida), evitamos re-auth en cada
// invocación. Si la key se rota o la sesión muere, el siguiente call
// fallará y forzaremos re-auth invalidando el cache.
let cachedAuth: { uid: number; expiresAt: number } | null = null;
const UID_CACHE_MS = 15 * 60 * 1000; // 15 min

// ============================================================================
// XML-RPC marshalling
// ============================================================================

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function marshal(value: unknown): string {
  if (value === null || value === undefined || value === false) {
    return "<value><boolean>0</boolean></value>";
  }
  if (value === true) {
    return "<value><boolean>1</boolean></value>";
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return `<value><int>${value}</int></value>`;
    }
    return `<value><double>${value}</double></value>`;
  }
  if (typeof value === "string") {
    return `<value><string>${escapeXml(value)}</string></value>`;
  }
  if (Array.isArray(value)) {
    const items = value.map(marshal).join("");
    return `<value><array><data>${items}</data></array></value>`;
  }
  if (typeof value === "object") {
    const members = Object.entries(value as Record<string, unknown>)
      .map(
        ([k, v]) =>
          `<member><name>${escapeXml(k)}</name>${marshal(v)}</member>`,
      )
      .join("");
    return `<value><struct>${members}</struct></value>`;
  }
  throw new Error(`Cannot marshal value of type ${typeof value}`);
}

function buildRequest(methodName: string, params: unknown[]): string {
  const paramXml = params.map((p) => `<param>${marshal(p)}</param>`).join("");
  return (
    `<?xml version="1.0"?>` +
    `<methodCall>` +
    `<methodName>${escapeXml(methodName)}</methodName>` +
    `<params>${paramXml}</params>` +
    `</methodCall>`
  );
}

// ============================================================================
// XML-RPC response parsing (subset suficiente para Ola 1)
// ============================================================================

function parseValueInner(inner: string): unknown {
  const trimmed = inner.trim();

  // <int>N</int> or <i4>N</i4>
  let m = trimmed.match(/^<(?:int|i4)>(-?\d+)<\/(?:int|i4)>$/);
  if (m) return parseInt(m[1]!, 10);

  // <boolean>0|1</boolean>
  m = trimmed.match(/^<boolean>([01])<\/boolean>$/);
  if (m) return m[1] === "1";

  // <string>...</string>
  m = trimmed.match(/^<string>([\s\S]*)<\/string>$/);
  if (m) return unescapeXml(m[1]!);

  // <double>...</double>
  m = trimmed.match(/^<double>(-?\d+(?:\.\d+)?)<\/double>$/);
  if (m) return parseFloat(m[1]!);

  // Plain (no wrapper) — Odoo a veces devuelve strings sin tag.
  if (!/^</.test(trimmed)) return unescapeXml(trimmed);

  // Para 2.B no necesitamos array/struct en respuestas (crm.lead.create
  // devuelve un <int>). Si futuras llamadas lo requieren, ampliar acá.
  return trimmed;
}

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseResponse(xml: string): unknown {
  // Fault primero
  const faultMatch = xml.match(/<fault>([\s\S]*?)<\/fault>/);
  if (faultMatch) {
    const fc = faultMatch[1]!.match(
      /<name>faultCode<\/name>\s*<value>\s*(?:<int>)?(-?\d+)(?:<\/int>)?\s*<\/value>/,
    );
    const fs = faultMatch[1]!.match(
      /<name>faultString<\/name>\s*<value>\s*(?:<string>)?([\s\S]*?)(?:<\/string>)?\s*<\/value>/,
    );
    const code = fc ? parseInt(fc[1]!, 10) : -1;
    const message = fs ? unescapeXml(fs[1]!.trim()) : "Unknown XML-RPC fault";
    throw new OdooFault(code, message);
  }

  // Caso normal: <methodResponse><params><param><value>...</value></param></params></methodResponse>
  const paramMatch = xml.match(
    /<params>\s*<param>\s*<value>([\s\S]*?)<\/value>\s*<\/param>\s*<\/params>/,
  );
  if (!paramMatch) {
    throw new Error("Malformed XML-RPC response: no <params><param><value>");
  }
  return parseValueInner(paramMatch[1]!);
}

// ============================================================================
// HTTP transport con timeout via AbortController
// ============================================================================

async function xmlRpcCall(
  cfg: OdooConfig,
  endpoint: "common" | "object",
  methodName: string,
  params: unknown[],
): Promise<unknown> {
  const url = `${cfg.url}/xmlrpc/2/${endpoint}`;
  const body = buildRequest(methodName, params);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "User-Agent": "mnc-lead-to-odoo/0.1",
        Accept: "text/xml",
      },
      body,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new OdooTimeoutError(cfg.timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`Odoo HTTP ${res.status} on ${endpoint}.${methodName}`);
  }

  const text = await res.text();
  return parseResponse(text);
}

// ============================================================================
// Public API
// ============================================================================

async function authenticate(cfg: OdooConfig): Promise<number> {
  const now = Date.now();
  if (cachedAuth && cachedAuth.expiresAt > now) {
    return cachedAuth.uid;
  }
  const result = await xmlRpcCall(cfg, "common", "authenticate", [
    cfg.db,
    cfg.user,
    cfg.apiKey,
    {}, // user_agent_env (vacío)
  ]);
  if (typeof result !== "number" || result === 0) {
    throw new Error(
      "Odoo authenticate returned non-positive uid (credentials invalid?)",
    );
  }
  cachedAuth = { uid: result, expiresAt: now + UID_CACHE_MS };
  return result;
}

export interface CreateLeadInput {
  // El caller (index.ts) resuelve estos nombres con valores en español/CO.
  // Los nombres técnicos de campos Odoo SÍ son los oficiales (en inglés).
  name: string;             // "Pedro Pérez — Empresa SAS"
  contact_name: string;     // "Pedro Pérez"
  email_from: string;       // "pedro@empresa.com"
  phone: string | false;    // string o false (Odoo Convention)
  partner_name: string;     // "Empresa SAS"
  description: string;      // mensaje + UTM/referrer anexados
  tag_ids: number[];        // [TAG_WEB, TAG_DOMAIN, TAG_SECTOR_X]
  team_id: number;          // TEAM_WEB = 2 (Website)
  source_id: number;        // UTM_SOURCE_WEB = 20
  user_id: number;          // USER_SUPER_MN = 2
  lang: string;             // "es_CO" — código de res.lang, NO traducido
}

export async function createLead(
  cfg: OdooConfig,
  input: CreateLeadInput,
): Promise<number> {
  // tag_ids con sintaxis especial Odoo:
  //   [6, 0, [id1, id2, ...]] = "replace the recordset with this set"
  // Empaquetado dentro de un array más porque tag_ids es one2many.
  const leadDict: Record<string, unknown> = {
    name: input.name,
    contact_name: input.contact_name,
    email_from: input.email_from,
    phone: input.phone,
    partner_name: input.partner_name,
    description: input.description,
    tag_ids: [[6, 0, input.tag_ids]],
    team_id: input.team_id,
    source_id: input.source_id,
    user_id: input.user_id,
    lang: input.lang,
  };

  // Retry exponencial ante 5xx HTTP transitorios o timeout. Faults
  // XML-RPC (4xx-equivalente: schema error, permission error) NO se
  // reintentan — son determinísticos, retry no ayudaría.
  const delays = [250, 1000];

  let lastError: unknown;
  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const uid = await authenticate(cfg);
      const result = await xmlRpcCall(cfg, "object", "execute_kw", [
        cfg.db,
        uid,
        cfg.apiKey,
        "crm.lead",
        "create",
        [leadDict],
      ]);
      if (typeof result !== "number") {
        throw new Error(
          `crm.lead.create returned non-numeric: ${typeof result}`,
        );
      }
      return result;
    } catch (err) {
      lastError = err;

      // Faults: no retry, propagar inmediato.
      if (err instanceof OdooFault) {
        throw err;
      }

      // Última iteración: propagar.
      if (attempt >= cfg.maxRetries) {
        throw err;
      }

      // 5xx/timeout/network: backoff y retry. Invalidar uid cache porque
      // la sesión puede estar muerta.
      cachedAuth = null;
      const delay = delays[attempt] ?? delays[delays.length - 1]!;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export function configFromEnv(env: {
  ODOO_URL: string;
  ODOO_DB: string;
  ODOO_USER: string;
  ODOO_API_KEY: string;
  ODOO_TIMEOUT_MS?: string;
  ODOO_MAX_RETRIES?: string;
}): OdooConfig {
  return {
    url: env.ODOO_URL.replace(/\/$/, ""),
    db: env.ODOO_DB,
    user: env.ODOO_USER,
    apiKey: env.ODOO_API_KEY,
    timeoutMs: parseInt(env.ODOO_TIMEOUT_MS ?? "8000", 10),
    maxRetries: parseInt(env.ODOO_MAX_RETRIES ?? "2", 10),
  };
}
