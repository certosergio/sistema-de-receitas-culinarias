#!/usr/bin/env bash
# ===========================================================================
#  setup-local.sh
# --------------------------------------------------------------------------
#  Baixa e instala o binário do PocketBase na pasta pb/ para
#  desenvolvimento local, cria a pasta pb_data e configura o .env.
#
#  Uso:
#    ./scripts/setup-local.sh
#
#  Depois de rodar este script:
#    1) Em um terminal:    ./pb/pocketbase serve --migrationsDir=server/migrations --hooksDir=server/hooks
#    2) Em outro terminal: npm run dev
#    3) Admin do PocketBase: http://localhost:8090/_/
# ===========================================================================
set -euo pipefail

# -----------------------------------------------------------------------------
#  Cores e helpers de log
# -----------------------------------------------------------------------------
if [ -t 1 ]; then
  C_RESET='\033[0m'
  C_CYAN='\033[36m'
  C_GREEN='\033[32m'
  C_YELLOW='\033[33m'
  C_RED='\033[31m'
  C_BOLD='\033[1m'
else
  C_RESET=''
  C_CYAN=''
  C_GREEN=''
  C_YELLOW=''
  C_RED=''
  C_BOLD=''
fi

info()  { printf "${C_CYAN}[i]${C_RESET} %s\n" "$*"; }
ok()    { printf "${C_GREEN}✓${C_RESET} %s\n" "$*"; }
warn()  { printf "${C_YELLOW}[!]${C_RESET} %s\n" "$*"; }
fail()  { printf "${C_RED}✗${C_RESET} %s\n" "$*" >&2; }

# Diretório raiz do projeto (pai de scripts/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

PB_DIR="${PROJECT_ROOT}/pb"
mkdir -p "$PB_DIR"

info "Diretório do projeto: ${PROJECT_ROOT}"

# -----------------------------------------------------------------------------
#  Detecta sistema operacional e arquitetura
# -----------------------------------------------------------------------------
PB_VERSION="${PB_VERSION:-}"
PB_BIN_NAME="pocketbase"

detect_platform() {
  local os arch

  os="$(uname -s)"
  arch="$(uname -m)"

  case "$os" in
    Darwin)
      os="macos"
      ;;
    Linux)
      os="linux"
      ;;
    MINGW*|MSYS*|CYGWIN*)
      os="windows"
      PB_BIN_NAME="pocketbase.exe"
      warn "Detectado Windows (Git Bash/MSYS). Recomenda-se WSL para melhor compatibilidade."
      ;;
    *)
      fail "Sistema operacional não suportado: ${os}"
      fail "Rode em macOS, Linux ou WSL (Windows)."
      exit 1
      ;;
  esac

  case "$arch" in
    x86_64|amd64)
      arch="amd64"
      ;;
    arm64|aarch64)
      arch="arm64"
      ;;
    *)
      fail "Arquitetura não suportada: ${arch}"
      exit 1
      ;;
  esac

  echo "${os}_${arch}"
}

PLATFORM="$(detect_platform)"
info "Plataforma detectada: ${PLATFORM}"

# -----------------------------------------------------------------------------
#  Descobre a versão mais recente do PocketBase via API do GitHub
# -----------------------------------------------------------------------------
if [ -z "$PB_VERSION" ]; then
  info "Consultando a versão mais recente do PocketBase no GitHub..."
  if command -v curl >/dev/null 2>&1; then
    PB_VERSION="$(curl -fsSL https://api.github.com/repos/pocketbase/pocketbase/releases/latest \
      | grep -m 1 '"tag_name"' \
      | sed -E 's/.*"tag_name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')"
  elif command -v wget >/dev/null 2>&1; then
    PB_VERSION="$(wget -qO- https://api.github.com/repos/pocketbase/pocketbase/releases/latest \
      | grep -m 1 '"tag_name"' \
      | sed -E 's/.*"tag_name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')"
  else
    fail "Nem curl nem wget estão disponíveis. Instale um dos dois e tente novamente."
    exit 1
  fi

  if [ -z "$PB_VERSION" ]; then
    warn "Não foi possível obter a versão mais recente do PocketBase (possível rate limit do GitHub)."
    warn "Usando versão fallback: 0.26.9"
    PB_VERSION="0.26.9"
  fi
fi

# Remove um possível 'v' inicial (ex.: v0.26.9 -> 0.26.9)
PB_VERSION="${PB_VERSION#v}"
ok "Versão do PocketBase: ${PB_VERSION}"

# -----------------------------------------------------------------------------
#  Baixa o binário (zip) caso ainda não exista localmente
# -----------------------------------------------------------------------------
ZIP_NAME="pocketbase_${PB_VERSION}_${PLATFORM}.zip"
DOWNLOAD_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${ZIP_NAME}"
# Tenta 3 formas de criar um diretório temporário antes de desistir
TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t pb_setup 2>/dev/null)" \
  || { TMP_DIR="/tmp/pb_setup_$$"; mkdir -p "$TMP_DIR"; } \
  || true

if [ -z "$TMP_DIR" ] || [ ! -d "$TMP_DIR" ]; then
  fail "Não foi possível criar um diretório temporário para o download."
  fail "Verifique as permissões de /tmp ou defina TMPDIR manualmente."
  exit 1
fi
ZIP_PATH="${TMP_DIR}/${ZIP_NAME}"

info "Baixando: ${DOWNLOAD_URL}"
if command -v curl >/dev/null 2>&1; then
  curl -fL -o "$ZIP_PATH" "$DOWNLOAD_URL"
else
  wget -qO "$ZIP_PATH" "$DOWNLOAD_URL"
fi

if [ ! -s "$ZIP_PATH" ]; then
  fail "Falha ao baixar o arquivo ${ZIP_NAME}."
  rm -rf "$TMP_DIR"
  exit 1
fi
ok "Download concluído."

# -----------------------------------------------------------------------------
#  Extrai o binário para a pasta pb/
# -----------------------------------------------------------------------------
info "Extraindo binário..."
if ! command -v unzip >/dev/null 2>&1; then
  fail "Comando 'unzip' não encontrado. Instale-o (ex.: 'apt install unzip' ou 'brew install unzip')."
  rm -rf "$TMP_DIR"
  exit 1
fi

unzip -o -q "$ZIP_PATH" -d "$TMP_DIR"

# Move o binário para pb/
if [ -f "${TMP_DIR}/${PB_BIN_NAME}" ]; then
  mv -f "${TMP_DIR}/${PB_BIN_NAME}" "${PB_DIR}/${PB_BIN_NAME}"
  chmod +x "${PB_DIR}/${PB_BIN_NAME}"
  ok "Binário instalado em: ${PB_DIR}/${PB_BIN_NAME}"
else
  fail "Binário '${PB_BIN_NAME}' não encontrado dentro do zip."
  fail "Conteúdo extraído:"
  ls -la "$TMP_DIR" | sed 's/^/      /' >&2 || true
  rm -rf "$TMP_DIR"
  exit 1
fi

rm -rf "$TMP_DIR"

# -----------------------------------------------------------------------------
#  Cria o diretório pb_data se não existir
# -----------------------------------------------------------------------------
PB_DATA_DIR="${PROJECT_ROOT}/pb_data"
if [ ! -d "$PB_DATA_DIR" ]; then
  mkdir -p "$PB_DATA_DIR"
  ok "Diretório criado: pb_data/"
else
  info "Diretório pb_data/ já existe (preservando dados)."
fi

# -----------------------------------------------------------------------------
#  Configura o .env (cria a partir do .env.example ou ajusta o existente)
#  Garante que VITE_POCKETBASE_URL aponte para http://localhost:8090,
#  preservando a URL anterior (produção) como comentário. Idempotente.
# -----------------------------------------------------------------------------
ENV_FILE="${PROJECT_ROOT}/.env"
ENV_EXAMPLE="${PROJECT_ROOT}/.env.example"
LOCAL_URL="http://localhost:8090"
LOCAL_HEADER="# Para desenvolvimento local, use: VITE_POCKETBASE_URL=http://localhost:8090"

# 1) Garante que o .env exista (copia do .env.example ou cria um vazio)
if [ ! -f "$ENV_FILE" ] && [ -f "$ENV_EXAMPLE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  ok "Criado .env a partir de .env.example"
elif [ ! -f "$ENV_FILE" ]; then
  : > "$ENV_FILE"
  ok "Criado .env vazio"
fi

# 2) Captura a URL atualmente ativa (para preservar como comentário)
OLD_URL="$(grep -E '^VITE_POCKETBASE_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2- || true)"

# 3) Remove linhas antigas (ativa + comentários de produção/local) e reescreve
#    o bloco de desenvolvimento local de forma idempotente.
awk '!/^VITE_POCKETBASE_URL=/ && !/^# Para desenvolvimento local/ && !/^# URL de produção/' \
  "$ENV_FILE" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "$ENV_FILE"

{
  echo "${LOCAL_HEADER}"
  if [ -n "$OLD_URL" ] && [ "$OLD_URL" != "$LOCAL_URL" ]; then
    echo "# URL de produção (Skip Cloud): VITE_POCKETBASE_URL=${OLD_URL}"
  fi
  echo "VITE_POCKETBASE_URL=${LOCAL_URL}"
} >> "$ENV_FILE"

ok ".env ajustado: VITE_POCKETBASE_URL=${LOCAL_URL}"
[ -n "$OLD_URL" ] && [ "$OLD_URL" != "$LOCAL_URL" ] \
  && info "URL anterior preservada como comentário: ${OLD_URL}"

# ----------------------------------------------------------------------------
#  Garante que pb_data/ e o binário estejam no .gitignore
# ----------------------------------------------------------------------------
GITIGNORE="${PROJECT_ROOT}/.gitignore"
ensure_gitignore() {
  local entry="$1"
  [ -f "$GITIGNORE" ] || printf "# PocketBase local\n" > "$GITIGNORE"
  grep -q "^${entry}\$" "$GITIGNORE" 2>/dev/null && return 0
  printf "%s\n" "$entry" >> "$GITIGNORE"
}
ensure_gitignore "/pb/"
ensure_gitignore "pb_data/"
ensure_gitignore "/pb_data/"
ensure_gitignore "pocketbase"
ensure_gitignore "pocketbase.exe"
ok ".gitignore verificado (/pb/, pb_data/ e binário pocketbase)"

# -----------------------------------------------------------------------------
#  Instruções finais
# -----------------------------------------------------------------------------
cat <<EOF

${C_BOLD}${C_GREEN}Tudo pronto!${C_RESET} O PocketBase ${PB_VERSION} (${PLATFORM}) está instalado.

${C_BOLD}Como rodar o ambiente local${C_RESET}

  1) Inicie o PocketBase (em um terminal):
       ${C_CYAN}./pb/pocketbase serve --migrationsDir=server/migrations --hooksDir=server/hooks${C_RESET}

  2) Inicie o frontend (em outro terminal):
       ${C_CYAN}npm run dev${C_RESET}

  3) Acesse o painel de admin do PocketBase:
       ${C_CYAN}http://localhost:8090/_/${C_RESET}

     Na primeira execução, crie uma conta de superusuário pelo admin UI.

${C_BOLD}Variável de ambiente${C_RESET}
  VITE_POCKETBASE_URL=${LOCAL_URL}

  Se você alternar entre o ambiente local e o de produção (Skip Cloud),
  edite o .env e troque a URL conforme necessário.

${C_BOLD}Observações${C_RESET}
  - Os dados locais ficam em ${PROJECT_ROOT}/pb_data/
  - Para parar o PocketBase: Ctrl+C no terminal onde ele está rodando
  - Para atualizar o binário no futuro: rode novamente ${C_CYAN}./scripts/setup-local.sh${C_RESET}

EOF
