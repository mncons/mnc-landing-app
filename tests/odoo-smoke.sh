#!/usr/bin/env bash
# tests/odoo-smoke.sh — Smoke test contra Odoo Enterprise online.
# Valida credentials del super-user MN, lista los IDs reales de
# tags / team / UTM source / user, y opcionalmente crea un Lead de prueba.
#
# Output: YAML listo para pegar a 'wrangler secret put' (o como referencia
# para configurar wrangler.toml en lote 2.B).
#
# Pre-requisitos:
#   - python3 (con xmlrpc.client en stdlib — viene por defecto)
#   - workers/lead-to-odoo/.dev.vars con ODOO_URL, ODOO_DB, ODOO_USER, ODOO_API_KEY
#     (formato KEY=value sin export; NO commitear, gitignored)
#
# Uso:
#   ./tests/odoo-smoke.sh
#   ./tests/odoo-smoke.sh --create-test-lead
#   ./tests/odoo-smoke.sh --env-file path/to/.env
#
# Exit codes:
#   0   éxito (IDs encontrados, opcionalmente Lead creado)
#   1   error de configuración (env vars faltantes, python3 no disponible)
#   2   autenticación falló (ODOO_USER / ODOO_API_KEY / ODOO_DB inválidos)
#   3   tags / team / source faltan en Odoo (configuración incompleta)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/workers/lead-to-odoo/.dev.vars"
CREATE_LEAD=0

usage() {
  cat <<'USAGE'
Uso:
  tests/odoo-smoke.sh [--create-test-lead] [--env-file PATH]

Flags:
  --create-test-lead   Crea un Lead "SMOKE TEST · {ts}" con tag smoke-test.
                       Verificalo en Odoo y borralo después del smoke 2.D.
  --env-file PATH      Override del path de .dev.vars
                       (default: workers/lead-to-odoo/.dev.vars).
  -h, --help           Esta ayuda.

Variables requeridas (en .dev.vars o exportadas):
  ODOO_URL       https://mnaranjo.odoo.com
  ODOO_DB        mnaranjo
  ODOO_USER      info@mnconsultoria.org   (login del super-user MN)
  ODOO_API_KEY   <key generada en Mi Perfil → Cuenta → API Keys>

Pre-requisito sistema: python3 (con xmlrpc.client stdlib).
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --create-test-lead) CREATE_LEAD=1 ;;
    --env-file)         shift; ENV_FILE="${1:-}"; [ -z "$ENV_FILE" ] && { echo "ERROR: --env-file requiere un path" >&2; exit 1; } ;;
    -h|--help)          usage; exit 0 ;;
    *) echo "ERROR: argumento desconocido: $1" >&2; usage >&2; exit 1 ;;
  esac
  shift
done

# Cargar .dev.vars si existe (formato KEY=value, sin comillas)
if [ -f "$ENV_FILE" ]; then
  echo "# Cargando $ENV_FILE" >&2
  # set -a exporta todas las vars asignadas; -e ya está activo
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "# Sin $ENV_FILE — usando variables del entorno actual" >&2
fi

# Validar env vars obligatorias
for v in ODOO_URL ODOO_DB ODOO_USER ODOO_API_KEY; do
  if [ -z "${!v:-}" ]; then
    echo "ERROR: variable $v no está definida." >&2
    echo "       Crear $ENV_FILE con ODOO_URL/ODOO_DB/ODOO_USER/ODOO_API_KEY" >&2
    echo "       o exportarlas al shell antes de correr este script." >&2
    exit 1
  fi
done

# Verificar python3 disponible
command -v python3 >/dev/null || { echo "ERROR: python3 no encontrado en PATH." >&2; exit 1; }

# Exportar para el subprocess python
export CREATE_LEAD

python3 <<'PYEOF'
import os
import sys
import json
import xmlrpc.client
from datetime import datetime, timezone

url = os.environ['ODOO_URL'].rstrip('/')
db  = os.environ['ODOO_DB']
user = os.environ['ODOO_USER']
key  = os.environ['ODOO_API_KEY']
create_lead = os.environ.get('CREATE_LEAD') == '1'

# ---- 1. Autenticación ----
try:
    common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common", allow_none=True)
    uid = common.authenticate(db, user, key, {})
except Exception as exc:
    print(f"ERROR: no se pudo contactar {url}/xmlrpc/2/common", file=sys.stderr)
    print(f"       Excepción: {exc}", file=sys.stderr)
    sys.exit(2)

if not uid:
    print("ERROR: authenticate() devolvió False/None — credentials inválidas.", file=sys.stderr)
    print(f"       Revisar ODOO_USER={user}, ODOO_DB={db}, y ODOO_API_KEY (sin espacios al pegar).", file=sys.stderr)
    sys.exit(2)

print(f"# OK autenticación · uid = {uid}", file=sys.stderr)

models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object", allow_none=True)

def query(model, method, args, kwargs=None):
    try:
        return models.execute_kw(db, uid, key, model, method, args, kwargs or {})
    except xmlrpc.client.Fault as fault:
        print(f"ERROR XML-RPC al llamar {model}.{method}: {fault.faultString}", file=sys.stderr)
        sys.exit(2)

# ---- 2. Tags ----
expected_tags = [
    'web',
    'mnconsultoria.org',
    'smoke-test',
    'sector-horeca',
    'sector-agroindustria',
    'sector-retail',
    'sector-servicios-profesionales',
    'sector-agencias',
    'sector-bpm',
    'sector-marketplace',
]
tags = query('crm.tag', 'search_read',
             [[('name', 'in', expected_tags)]],
             {'fields': ['id', 'name']})
tag_by_name = {t['name']: t['id'] for t in tags}
missing_tags = [t for t in expected_tags if t not in tag_by_name]

# ---- 3. Sales team ----
teams = query('crm.team', 'search_read',
              [[('name', '=', 'Web')]],
              {'fields': ['id', 'name']})

# ---- 4. UTM source ----
sources = query('utm.source', 'search_read',
                [[('name', 'ilike', 'Web')]],
                {'fields': ['id', 'name']})

# ---- 5. User super-user MN ----
users = query('res.users', 'search_read',
              [[('login', '=', user)]],
              {'fields': ['id', 'login', 'name']})

# ---- Output YAML a stdout (lo que el user pega al chat) ----
print()
print("# === IDs encontrados — pegá esta salida al chat ===")
print()

print("# Tags simples")
print(f"TAG_WEB:     \"{tag_by_name.get('web', 'MISSING')}\"")
print(f"TAG_DOMAIN:  \"{tag_by_name.get('mnconsultoria.org', 'MISSING')}\"")
print(f"TAG_SMOKE:   \"{tag_by_name.get('smoke-test', 'MISSING')}\"")
print()

print("# Tags por sector (1 secret JSON)")
sectors_map = {
    name.replace('sector-', ''): tag_by_name.get(name)
    for name in expected_tags
    if name.startswith('sector-')
}
print(f"TAG_SECTORS: '{json.dumps(sectors_map, separators=(',', ':'))}'")
print()

print("# Sales team")
print(f"TEAM_WEB: \"{teams[0]['id'] if teams else 'MISSING'}\"")
print()

print("# UTM source")
src_match = None
for s in sources:
    if 'mnconsultoria' in s['name'].lower():
        src_match = s
        break
print(f"UTM_SOURCE_WEB: \"{src_match['id'] if src_match else 'MISSING'}\"")
if src_match is None and sources:
    print(f"# (UTM sources con 'Web' en el nombre encontrados: {[s['name'] for s in sources]})")
print()

print("# Owner default")
print(f"USER_SUPER_MN: \"{users[0]['id'] if users else 'MISSING'}\"")
print(f"# (login: {users[0]['login'] if users else 'MISSING'})")
print()

# ---- Reporte de configuración incompleta ----
if missing_tags or not teams or not src_match or not users:
    print(file=sys.stderr)
    print("# !!! CONFIGURACIÓN INCOMPLETA — volvé a ODOO_SETUP.md:", file=sys.stderr)
    if missing_tags:
        print(f"#     Tags faltantes ({len(missing_tags)}): {missing_tags} — Paso 1", file=sys.stderr)
    if not teams:
        print(f"#     Sales team 'Web' no existe — Paso 2", file=sys.stderr)
    if not src_match:
        print(f"#     UTM source 'Web — mnconsultoria.org' no existe — Paso 3", file=sys.stderr)
    if not users:
        print(f"#     User con login '{user}' no existe — revisar ODOO_USER", file=sys.stderr)
    sys.exit(3)

# ---- Smoke lead opcional ----
if create_lead:
    ts = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
    payload = {
        'name':         f'SMOKE TEST · {ts}',
        'contact_name': 'Smoke',
        'email_from':   'smoke@example.com',
        'description':  f'Smoke test ejecutado el {ts}. Generado por tests/odoo-smoke.sh --create-test-lead. Borrar después del smoke 2.D.',
        'tag_ids':      [[6, 0, [tag_by_name['smoke-test'], tag_by_name['web']]]],
    }
    if teams:
        payload['team_id'] = teams[0]['id']
    if src_match:
        payload['source_id'] = src_match['id']
    if users:
        payload['user_id'] = users[0]['id']

    new_id = query('crm.lead', 'create', [payload])
    print(file=sys.stderr)
    print(f"# === Smoke Lead creado: ID = {new_id} ===", file=sys.stderr)
    print(f"# Verificar en: {url}/web#id={new_id}&model=crm.lead&view_type=form", file=sys.stderr)
    print(f"# Filtrable en CRM con tag 'smoke-test'.", file=sys.stderr)
    print(f"# Borrar manualmente después del smoke completo de 2.D.", file=sys.stderr)
PYEOF
