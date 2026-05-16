// Rate limit por IP basado en KV. Key = "rl:" + sha256(ip), TTL = ventana.
// La hash evita guardar IPs como plaintext en KV (defensa: KV es leíble
// por cualquiera con acceso al dashboard; no exponer PII directa).

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfter: number };

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

export async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = `rl:${await sha256Hex(ip)}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) || 0 : 0;

  if (count >= max) {
    return { ok: false, retryAfter: windowSeconds };
  }

  // Race condition aceptada: si dos requests llegan exactamente a la vez con
  // count = max-1, ambos pasan el check y el contador queda en max+1. KV
  // strong consistency no es posible aquí sin Durable Objects (overkill Ola 1).
  // El impacto real es despreciable: el next request sí va a ver count >= max
  // y se rechaza. Mitigación más fuerte sería migrar a Durable Object si
  // detectamos abuso real en Ola 2.
  await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return { ok: true, remaining: max - count - 1 };
}
