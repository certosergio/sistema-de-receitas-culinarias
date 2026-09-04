#!/usr/bin/env bash
# ===========================================================================
#  setup-local.sh
# --------------------------------------------------------------------------
#  Baixa e instala o binário do PocketBase na pasta pb/ para
#  desenvolvimento local, cria a pasta pb_data e configura o .env.
#
#  Uso:
#    bash scripts/setup-local.sh
#    # ou
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

# Garante a existência do diretório pb/ ANTES de qualquer download ou operação
PB_DIR="${PROJECT_ROOT}/pb"
mkdir -p "$PB_DIR"

info "Diretório do projeto: ${PROJECT_ROOT}"
info "Diretório de destino: ${PB_DIR}"

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
#  Descobre a versão mais recente do PocketBase via API do GitHub (com fallback)
# -----------------------------------------------------------------------------
FALLBACK_PB_VERSION="0.26.9"

if [ -z "$PB_VERSION" ]; then
  info "Consultando a versão mais recente do PocketBase no GitHub..."
  GITHUB_API_URL="https://api.github.com/repos/pocketbase/pocketbase/releases/latest"
  API_RESPONSE=""

  if command -v curl >/dev/null 2>&1; then
    # curl com -L, timeout razoável e sem silenciar erros fatais
    API_RESPONSE="$(curl -fL --connect-timeout 5 --max-time 15 "$GITHUB_API_URL" 2>/dev/null || true)"
  elif command -v wget >/dev/null 2>&1; then
    API_RESPONSE="$(wget -qO- --timeout=15 "$GITHUB_API_URL" 2>/dev/null || true)"
  fi

  if [ -n "$API_RESPONSE" ]; then
    PB_VERSION="$(echo "$API_RESPONSE" \
      | grep -m 1 '"tag_name"' \
      | sed -E 's/.*"tag_name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/' || true)"
  fi

  if [ -z "$PB_VERSION" ]; then
    warn "Não foi possível obter a versão mais recente do PocketBase via API do GitHub (possível rate limit ou sem internet)."
    warn "Usando versão fixa conhecida (fallback): ${FALLBACK_PB_VERSION}"
    PB_VERSION="${FALLBACK_PB_VERSION}"
  fi
fi

# Remove um possível 'v' inicial (ex.: v0.26.9 -> 0.26.9)
PB_VERSION="${PB_VERSION#v}"
ok "Versão do PocketBase selecionada: ${PB_VERSION}"

# -----------------------------------------------------------------------------
#  Garante permissão de escrita em pb/ antes de baixar
# -----------------------------------------------------------------------------
WRITE_TEST_FILE="${PB_DIR}/.write_test_$$"
if ! touch "$WRITE_TEST_FILE" 2>/dev/null; then
  fail "Sem permissão de escrita no diretório ${PB_DIR}."
  fail "Verifique as permissões do diretório e execute novamente."
  exit 1
fi
rm -f "$WRITE_TEST_FILE"

# -----------------------------------------------------------------------------
#  Baixa o arquivo zip diretamente no diretório do projeto pb/
#  Evita problemas com mktemp inválido/vazio ou tmpfs restrito no macOS/Linux
# -----------------------------------------------------------------------------
ZIP_NAME="pocketbase_${PB_VERSION}_${PLATFORM}.zip"
ZIP_PATH="${PB_DIR}/${ZIP_NAME}"
DOWNLOAD_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${ZIP_NAME}"

info "Baixando PocketBase de: ${DOWNLOAD_URL}"
info "Destino temporário do zip: ${ZIP_PATH}"

# Garante limpeza do zip se o script for interrompido
cleanup_zip() {
  rm -f "$ZIP_PATH"
}
trap cleanup_zip EXIT

if command -v curl >/dev/null 2>&1; then
  # curl com -L (seguir redirects), sem -s (para exibir progresso e erros caso falhe)
  if ! curl -L --fail --output "$ZIP_PATH" "$DOWNLOAD_URL"; then
    fail "Falha no download via curl do arquivo ${ZIP_NAME} a partir de ${DOWNLOAD_URL}."
    exit 1
  fi
elif command -v wget >/dev/null 2>&1; then
  if ! wget -O "$ZIP_PATH" "$DOWNLOAD_URL"; then
    fail "Falha no download via wget do arquivo ${ZIP_NAME} a partir de ${DOWNLOAD_URL}."
    exit 1
  fi
else
  fail "Nem curl nem wget estão disponíveis no sistema. Instale um dos dois e tente novamente."
  exit 1
fi

if [ ! -s "$ZIP_PATH" ]; then
  fail "O arquivo baixado ${ZIP_NAME} está vazio ou não existe."
  exit 1
fi
ok "Download concluído com sucesso."

# -----------------------------------------------------------------------------
#  Extrai o binário na pasta pb/
# -----------------------------------------------------------------------------
info "Extraindo binário em ${PB_DIR}..."
if ! command -v unzip >/dev/null 2>&1; then
  fail "Comando 'unzip' não encontrado. Instale-o (ex.: 'brew install unzip' no macOS ou 'apt install unzip' no Linux)."
  exit 1
fi

if ! unzip -o -q "$ZIP_PATH" -d "$PB_DIR"; then
  fail "Falha ao descompactar o arquivo ${ZIP_PATH}."
  exit 1
fi

# Remove arquivos auxiliares que o zip do PocketBase traz (LICENSE.md, CHANGELOG.md), se existirem
rm -f "${PB_DIR}/LICENSE.md" "${PB_DIR}/CHANGELOG.md" 2>/dev/null || true

# Remove o arquivo ZIP após extrair com sucesso
rm -f "$ZIP_PATH"
trap - EXIT

# -----------------------------------------------------------------------------
#  Valida que o binário baixado existe e é executável
# -----------------------------------------------------------------------------
TARGET_BIN="${PB_DIR}/${PB_BIN_NAME}"

if [ ! -f "$TARGET_BIN" ]; then
  fail "Binário '${PB_BIN_NAME}' não foi encontrado em ${PB_DIR} após extração."
  fail "Conteúdo atual de ${PB_DIR}:"
  ls -la "$PB_DIR" | sed 's/^/      /' >&2 || true
  exit 1
fi

chmod +x "$TARGET_BIN"

if [ ! -x "$TARGET_BIN" ]; then
  fail "Não foi possível dar permissão de execução ao binário: ${TARGET_BIN}"
  exit 1
fi

ok "Binário validado e executável: ${TARGET_BIN}"

# Teste rápido de versão se possível (PocketBase suporta flag --version ou -v ou simplesmente existe)
if "$TARGET_BIN" --version >/dev/null 2>&1; then
  INSTALLED_VERSION="$("$TARGET_BIN" --version 2>&1 || true)"
  ok "Binário PocketBase funcional (${INSTALLED_VERSION})"
fi

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
#  Garante que pb/, pb_data/ e o binário estejam no .gitignore
# ----------------------------------------------------------------------------
GITIGNORE="${PROJECT_ROOT}/.gitignore"
ensure_gitignore() {
  local entry="$1"
  [ -f "$GITIGNORE" ] || printf "# PocketBase local\n" > "$GITIGNORE"
  grep -q "^${entry}\$" "$GITIGNORE" 2>/dev/null && return 0
  printf "%s\n" "$entry" >> "$GITIGNORE"
}
ensure_gitignore "pb/"
ensure_gitignore "/pb/"
ensure_gitignore "pb_data/"
ensure_gitignore "/pb_data/"
ensure_gitignore "pocketbase"
ensure_gitignore "pocketbase.exe"
ok ".gitignore verificado (pb/, pb_data/ e binário pocketbase)"

# -----------------------------------------------------------------------------
#  Instruções finais
# -----------------------------------------------------------------------------
cat <<EOF

${C_BOLD}${C_GREEN}Tudo pronto!${C_RESET} O PocketBase ${PB_VERSION} (${PLATFORM}) está instalado com sucesso em ${TARGET_BIN}.

${C_BOLD}Como rodar o ambiente local${C_RESET}

  1) Inicie o PocketBase (em um terminal):
       ${C_CYAN}./pb/pocketbase serve --migrationsDir=server/migrations --hooksDir=server/hooks${C_RESET}

  2) Inicie o frontend (em outro terminal):
       ${C_CYAN}npm run dev${C_RESET}

  3) Acesse o painel de admin do PocketBase:
       ${C_CYAN}http://localhost:8090/_/${C_RESET}

     Na primeira execução, crie uma conta de superusuário pelo admin UI se desejar.

${C_BOLD}Variável de ambiente configurada${C_RESET}
  VITE_POCKETBASE_URL=${LOCAL_URL}

  Se você alternar entre o ambiente local e o de produção (Skip Cloud),
  edite o .env e troque a URL conforme necessário.

${C_BOLD}Observações${C_RESET}
  - Executável do PocketBase: ${C_CYAN}./pb/pocketbase${C_RESET}
  - Os dados locais ficam em ${PROJECT_ROOT}/pb_data/
  - Para parar o PocketBase: pressione Ctrl+C no terminal onde ele está rodando
  - Para atualizar o binário no futuro: execute novamente ${C_CYAN}bash scripts/setup-local.sh${C_RESET}

EOF
