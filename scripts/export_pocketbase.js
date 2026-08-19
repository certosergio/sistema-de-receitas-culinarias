#!/usr/bin/env node
/**
 * export_pocketbase.js
 * --------------------------------------------------------------------------
 * Exporta o SCHEMA e todos os DADOS de uma instância PocketBase (Skip Cloud)
 * para uma pasta `pocketbase_export/` pronta para importação local.
 *
 * Saída gerada em ./pocketbase_export/ :
 *   ├─ schema.json            — schema completo de todas as coleções
 *   │                           (compatível com PUT /api/collections/import)
 *   ├─ data/<collection>.json  — array de registros de cada coleção
 *   ├─ exported.json           — bundle único (schema + dados) para o importador
 *   ├─ import_pocketbase.js    — script de importação local (standalone)
 *   ├─ import.sh               — atalho para rodar o importador
 *   └─ README.md               — instruções de uso
 *
 * PRÉ-REQUISITOS
 *   - Node.js 18+ (usa fetch global; SEM dependências extras)
 *
 * USO
 *   # Lê URL do .env (VITE_POCKETBASE_URL) e credenciais de argumentos:
 *   node scripts/export_pocketbase.js --email=admin@example.com --password=secret
 *
 *   # Tudo via argumentos:
 *   node scripts/export_pocketbase.js \
 *     --url=https://minha-instancia.goskip.dev \
 *     --email=admin@example.com \
 *     --password=secret
 *
 *   # Usando um token de superusuário já existente (pula auth-with-password):
 *   node scripts/export_pocketbase.js --token=eyJhbGciOi...
 *
 *   # Sobrescrever a pasta de saída:
 *   node scripts/export_pocketbase.js --out=./backup_2026 --email=... --password=...
 *
 * CREDENCIAIS (ordem de precedência: arg > .env > env do shell)
 *   URL      : --url  | VITE_POCKETBASE_URL | POCKETBASE_URL
 *   Email    : --email | PB_ADMIN_EMAIL      | POCKETBASE_ADMIN_EMAIL
 *   Senha    : --password | PB_ADMIN_PASSWORD | POCKETBASE_ADMIN_PASSWORD
 *   Token   : --token | PB_SUPERUSER_TOKEN   (alternativa a email/senha)
 *
 * NOTAS
 *   - Coleções de sistema (_superusers, _externalAuths, _mfas, _otps,
 *     _authOrigins) são ignoradas. A coleção `users` (auth, não-sistema) É
 *     exportada.
 *   - Campos de arquivo (cover, avatar, ...) são exportados apenas como o
 *     NOME do arquivo — o binário não é baixado. Re-upload manual após importar.
 *   - Senhas de usuários (auth) não são exportadas (hash unidirecional, e a
 *     API não as retorna). O importador atribui senha padrão "Skip@Pass".
 * --------------------------------------------------------------------------
 */

import { mkdir, writeFile, readFile, cp } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { env, argv, cwd, exit } from 'node:process'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const PB_SYSTEM_COLLECTIONS = new Set([
  '_superusers',
  '_admins',
  '_externalAuths',
  '_mfas',
  '_otps',
  '_authOrigins',
])

const PER_PAGE = 500 // máximo de registros por página na API do PocketBase

// ---------------------------------------------------------------------------
// Helpers de UI
// ---------------------------------------------------------------------------

function log(...parts) {
  // eslint-disable-next-line no-console
  console.log(...parts)
}
function info(...parts) {
  // eslint-disable-next-line no-console
  console.log('\x1b[36m[i]\x1b[0m', ...parts)
}
function ok(...parts) {
  // eslint-disable-next-line no-console
  console.log('\x1b[32m✓\x1b[0m', ...parts)
}
function warn(...parts) {
  // eslint-disable-next-line no-console
  console.warn('\x1b[33m[!]\x1b[0m', ...parts)
}
function fail(...parts) {
  // eslint-disable-next-line no-console
  console.error('\x1b[31m✗\x1b[0m', ...parts)
}

// ---------------------------------------------------------------------------
// Arg parsing + .env
// ---------------------------------------------------------------------------

function parseArgs(av) {
  const args = {}
  for (const token of av.slice(2)) {
    const m = token.match(/^--([^=]+)=(.*)$/)
    if (m) args[m[1]] = m[2]
    else if (token.startsWith('--')) args[token.slice(2)] = true
  }
  return args
}

function loadDotEnv(dir) {
  // Carregador .env MÍNIMO e sem dependências.
  const envPath = join(dir, '.env')
  if (!existsSync(envPath)) return
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key && !(key in env)) env[key] = value
  }
}

// ---------------------------------------------------------------------------
// HTTP / PocketBase
// ---------------------------------------------------------------------------

function normalizeUrl(u) {
  return (u || '').replace(/\/+$/, '')
}

async function authWithPassword(baseUrl, email, password) {
  const url = `${normalizeUrl(baseUrl)}/api/collections/_superusers/auth-with-password`
  info('Autenticando como admin (email/senha)...')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Autenticação admin falhou (${res.status}).\n${text}\n` +
        'Verifique as credenciais (email/senha do superusuário) ou use --token.',
    )
  }
  const data = await res.json()
  return data.token
}

function authHeaders(token) {
  return token ? { Authorization: token } : {}
}

async function fetchJson(baseUrl, token, path) {
  const url = `${normalizeUrl(baseUrl)}${path}`
  const res = await fetch(url, { headers: authHeaders(token) })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GET ${path} -> HTTP ${res.status}\n${text}`)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Passo 1 — listar e exportar o schema de todas as coleções
// ---------------------------------------------------------------------------

async function fetchAllCollections(baseUrl, token) {
  info('Listando coleções (paginação)...')
  const all = []
  let page = 1
  for (;;) {
    const data = await fetchJson(
      baseUrl,
      token,
      `/api/collections?page=${page}&perPage=${PER_PAGE}`,
    )
    all.push(...(data.items || []))
    const totalPages = data.totalPages || 1
    if (page >= totalPages) break
    page++
  }
  return all
}

function isExportableCollection(c) {
  if (!c) return false
  if (c.system === true) return false
  if (PB_SYSTEM_COLLECTIONS.has(c.name)) return false
  if (c.name && c.name.startsWith('_')) return false
  return true
}

// ---------------------------------------------------------------------------
// Passo 2 — exportar todos os registros de uma coleção
// ---------------------------------------------------------------------------

async function fetchAllRecords(baseUrl, token, collectionName) {
  const records = []
  let page = 1
  for (;;) {
    const path =
      `/api/collections/${encodeURIComponent(collectionName)}/records` +
      `?page=${page}&perPage=${PER_PAGE}`
    const data = await fetchJson(baseUrl, token, path)
    records.push(...(data.items || []))
    const totalPages = data.totalPages || 1
    if (page % 5 === 0) {
      info(`   ${collectionName}: ${records.length}/${data.totalItems ?? records.length} registros`)
    }
    if (page >= totalPages) break
    page++
  }
  return records
}

// ---------------------------------------------------------------------------
// Geração de arquivos auxiliares no bundle de exportação
// ---------------------------------------------------------------------------

const IMPORT_SH = `#!/usr/bin/env bash
# Atalho para importar o bundle exportado em um PocketBase LOCAL.
# Uso:
#   ./import.sh                                    # defaults do .env local
#   ./import.sh --url=http://127.0.0.1:8090 --email=a@b.com --password=x
set -euo pipefail
DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
exec node "\${DIR}/import_pocketbase.js" "\${@}" --dir="\${DIR}"
`

const README_MD = `# Exportação do PocketBase

Esta pasta contém um snapshot do schema e dos dados de uma instância
PocketBase (originada do Skip Cloud), pronta para importação em uma instância
**local** do PocketBase.

## Conteúdo

| Arquivo | Descrição |
|---|---|
| \`schema.json\` | Schema completo de todas as coleções (campos, regras, índices). Compatível com \`PUT /api/collections/import\`. |
| \`data/<coleção>.json\` | Array com todos os registros de cada coleção. |
| \`exported.json\` | Bundle único (schema + dados) lido pelo importador. |
| \`import_pocketbase.js\` | Script de importação standalone (Node.js 18+, sem dependências). |
| \`import.sh\` | Atalho de shell para rodar o importador. |

## Pré-requisitos (no ambiente LOCAL de destino)

- Node.js 18+
- PocketBase local rodando, ex.:
  \`\`\`bash
  pocketbase serve --http=127.0.0.1:8090 --dir=./pb_data
  \`\`\`
- Um superusuário criado no admin local (http://127.0.0.1:8090/_/)

## Como importar

\`\`\`bash
# 1. (opcional) crie um .env nesta pasta com as credenciais locais:
#    PB_ADMIN_EMAIL=admin@example.com
#    PB_ADMIN_PASSWORD=sua-senha
#    PB_URL=http://127.0.0.1:8090

# 2. Rode o importador:
./import.sh

# ou, passando tudo via argumentos:
./import.sh --url=http://127.0.0.1:8090 --email=admin@example.com --password=sua-senha

# ou, chamando o node diretamente:
node import_pocketbase.js --url=http://127.0.0.1:8090 --email=admin@example.com --password=sua-senha
\`\`\`

## O que é importado

1. **Schema** — todas as coleções são criadas/atualizadas numa única chamada
   \`PUT /api/collections/import\` (idempotente; coleções que já existirem
   com o mesmo ID são atualizadas).
2. **Registros** — cada registro é recriado via POST preservando o \`id\`
   original (para manter as relações entre coleções).

## Limitações conhecidas

- **Arquivos (imagens):** campos do tipo \`file\` (ex.: \`cover\`, \`avatar\`)
  são exportados apenas como o **nome** do arquivo — o binário não é baixado.
  Após importar, faça re-upload das imagens pelo Admin UI local.
- **Senhas de usuários:** a API não retorna hashes de senha, então os
  registros da coleção \`users\` (auth) são importados com a senha padrão
  **\`Skip@Pass\`**. Altere as senhas após importar.
- **Coleções de sistema** (\`_superusers\`, \`_externalAuths\`, \`_mfas\`,
  \`_otps\`, \`_authOrigins\`) **não** são exportadas.
- A coleção \`users\` é exportada e, ao importar, **atualiza** a coleção
  \`users\` local padrão (mesmo ID \`_pb_users_auth_\`).
`

// ---------------------------------------------------------------------------
// Orquestra
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(argv)

  // Carrega .env do projeto (apenas LEITURA — nunca escreve no .env).
  loadDotEnv(cwd())

  const baseUrl = args.url || env.VITE_POCKETBASE_URL || env.POCKETBASE_URL || env.PB_INSTANCE_URL
  const email = args.email || env.PB_ADMIN_EMAIL || env.POCKETBASE_ADMIN_EMAIL
  const password = args.password || env.PB_ADMIN_PASSWORD || env.POCKETBASE_ADMIN_PASSWORD
  const tokenArg = args.token || env.PB_SUPERUSER_TOKEN || env.PB_TOKEN
  const outDir = resolve(args.out || './pocketbase_export')

  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('  PocketBase — Exportador (schema + dados)')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log(`  Origem (URL): ${baseUrl || '(não informada)'}`)
  log(`  Admin email : ${email || '(usando token)'}`)
  log(`  Saída       : ${outDir}`)
  log('──────────────────────────────────────────────────────')

  if (!baseUrl) {
    fail(
      'URL do PocketBase ausente.\n' +
        'Forneça via --url=... ou defina VITE_POCKETBASE_URL no .env.',
    )
    exit(1)
  }

  if (!tokenArg && (!email || !password)) {
    fail(
      'Credenciais admin ausentes.\n' +
        'Forneça --email e --password (ou --token), ou defina ' +
        'PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD no .env.',
    )
    exit(1)
  }

  // 1. Autentica
  let token = tokenArg
  if (!token) {
    try {
      token = await authWithPassword(baseUrl, email, password)
    } catch (e) {
      fail(e.message)
      exit(1)
    }
  } else {
    info('Usando token de superusuário fornecido.')
  }
  ok('Autenticado.')

  // 2. Lista coleções
  const allCollections = await fetchAllCollections(baseUrl, token)
  const exportable = allCollections.filter(isExportableCollection)
  const skipped = allCollections.filter((c) => !isExportableCollection(c))
  ok(`Coleções encontradas: ${allCollections.length} | exportáveis: ${exportable.length}`)
  if (skipped.length) {
    info(`Ignoradas (sistema): ${skipped.map((c) => c.name).join(', ')}`)
  }

  // 3. Prepara pasta de saída
  await mkdir(join(outDir, 'data'), { recursive: true })

  // 4. Salva schema.json
  const schemaPayload = {
    exportedAt: new Date().toISOString(),
    source: normalizeUrl(baseUrl),
    collections: exportable,
  }
  await writeFile(join(outDir, 'schema.json'), JSON.stringify(schemaPayload, null, 2), 'utf8')
  ok(`schema.json salvo (${exportable.length} coleções).`)

  // 5. Exporta registros de cada coleção
  const dataMap = {}
  const summary = []
  for (let i = 0; i < exportable.length; i++) {
    const col = exportable[i]
    const name = col.name
    log(`\n[${i + 1}/${exportable.length}] Exportando registros: ${name} ` + `(${col.type})`)
    let records = []
    try {
      records = await fetchAllRecords(baseUrl, token, name)
    } catch (e) {
      warn(`Falha ao exportar registros de "${name}": ${e.message}`)
      records = []
    }
    const safeName = name.replace(/[^\w.-]/g, '_')
    await writeFile(
      join(outDir, 'data', `${safeName}.json`),
      JSON.stringify(records, null, 2),
      'utf8',
    )
    ok(`${name}: ${records.length} registro(s) -> data/${safeName}.json`)
    dataMap[name] = records
    summary.push({ name, count: records.length })
  }

  // 6. Bundle único exported.json
  const bundle = {
    exportedAt: new Date().toISOString(),
    source: normalizeUrl(baseUrl),
    schema: { collections: exportable },
    data: dataMap,
  }
  await writeFile(join(outDir, 'exported.json'), JSON.stringify(bundle, null, 2), 'utf8')
  ok('exported.json (bundle) salvo.')

  // 7. Copia o importador standalone para dentro da pasta de saída
  const here = dirname(fileURLToPath(import.meta.url))
  const importerSrc = join(here, 'import_pocketbase.js')
  if (existsSync(importerSrc)) {
    await cp(importerSrc, join(outDir, 'import_pocketbase.js'), { force: true })
    ok('import_pocketbase.js copiado para a pasta de saída.')
  } else {
    warn('import_pocketbase.js não encontrado ao lado do exportador — não copiado.')
    warn('Você precisará copiá-lo manualmente para importar.')
  }

  // 8. import.sh + README.md
  await writeFile(join(outDir, 'import.sh'), IMPORT_SH, 'utf8')
  await writeFile(join(outDir, 'README.md'), README_MD, 'utf8')
  ok('import.sh e README.md gerados.')

  // 9. Resumo
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('  Resumo da exportação')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  let total = 0
  for (const s of summary) {
    log(`  ${s.name.padEnd(22)} ${String(s.count).padStart(6)} registros`)
    total += s.count
  }
  log('──────────────────────────────────────────────────────')
  log(`  Total: ${total} registro(s) em ${summary.length} coleção(ões)`)
  log(`  Pasta: ${outDir}`)
  log('\nPara importar localmente:')
  log(`  cd ${outDir} && ./import.sh`)
  ok('Exportação concluída. ✔')
}

main().catch((e) => {
  fail('Erro inesperado:', e?.stack || e?.message || e)
  exit(1)
})
