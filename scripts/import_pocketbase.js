#!/usr/bin/env node
/**
 * import_pocketbase.js
 * --------------------------------------------------------------------------
 * Importador standalone para um PocketBase LOCAL.
 *
 * Lê o bundle `pocketbase_export/exported.json` gerado por
 * `scripts/export_pocketbase.js` e aplica:
 *   1. O schema de todas as coleções (via PUT /api/collections/import)
 *   2. Os registros de cada coleção (via POST .../records com id fixo)
 *
 * PRÉ-REQUISITOS
 *   - Node.js 18+ (usa fetch global; sem dependências extras)
 *   - Um PocketBase local rodando, por exemplo:
 *       pocketbase serve --http=127.0.0.1:8090 --dir=./pb_data
 *   - Pelo menos um superusuário criado no admin local
 *       (acesse http://127.0.0.1:8090/_/ e crie a conta de admin)
 *
 * USO
 *   # Usa defaults (lê .env na pasta atual):
 *   node import_pocketbase.js
 *
 *   # Tudo via argumentos:
 *   node import_pocketbase.js \
 *     --url=http://127.0.0.1:8090 \
 *     --email=admin@example.com \
 *     --password=secret \
 *     --dir=./pocketbase_export
 *
 *   # A URL do Skip Cloud é IGNORADA — este script só importa para LOCAL.
 *
 * Observações:
 *   - O campo `id` é enviado em cada POST de registro para preservar os
 *     IDs originais (as relações entre coleções dependem disso).
 *   - Campos de arquivo (`cover`, `avatar`, ...) são exportados apenas como
 *     NOME do arquivo — o binário não vem no JSON. O registro é criado com o
 *     nome do arquivo no campo, mas o arquivo físico não é restaurado. Use o
 *     Admin UI local para re-uploadar as imagens, se necessário.
 *   - Para coleções `auth` (ex.: `users`), a senha NÃO pode ser exportada
 *     (é hash unidirecional). É enviada uma senha padrão "Skip@Pass" para
 *     cada usuário importado — altere após importar.
 *   - A importação de schema é idempotente: coleções que já existirem com o
 *     mesmo `id`/`name` são atualizadas em vez de duplicadas.
 * --------------------------------------------------------------------------
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { env } from 'node:process'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_PASSWORD = 'Skip@Pass' // senha atribuída a usuários importados
const PB_SYSTEM_COLLECTIONS = new Set([
  '_superusers',
  '_admins', // legado
  '_externalAuths',
  '_mfas',
  '_otps',
  '_authOrigins',
])

function parseArgs(argv) {
  const args = {}
  for (const token of argv.slice(2)) {
    const m = token.match(/^--([^=]+)=(.*)$/)
    if (m) args[m[1]] = m[2]
    else if (token.startsWith('--')) args[token.slice(2)] = true
  }
  return args
}

function log(...parts) {
  // eslint-disable-next-line no-console
  console.log(...parts)
}

function warn(...parts) {
  // eslint-disable-next-line no-console
  console.warn('\x1b[33m[warn]\x1b[0m', ...parts)
}

function ok(...parts) {
  // eslint-disable-next-line no-console
  console.log('\x1b[32m✓\x1b[0m', ...parts)
}

function fail(...parts) {
  // eslint-disable-next-line no-console
  console.error('\x1b[31m✗\x1b[0m', ...parts)
}

function envFallback(name) {
  // Lê de process.env (carregado do .env local via dotenv-like manual)
  return env[name]
}

function loadDotEnv(dir) {
  // Carregador .env MÍNIMO — não dependemos de pacotes externos.
  // Suporta: KEY=value, # comentários, aspas simples/duplas.
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

function readJson(path) {
  if (!existsSync(path)) {
    fail(`Arquivo não encontrado: ${path}`)
    process.exit(1)
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    fail(`Falha ao ler JSON de ${path}:`, e.message)
    process.exit(1)
  }
}

async function pbAuth(baseUrl, email, password) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/collections/_superusers/auth-with-password`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Autenticação admin falhou (${res.status}) em ${url}.\n${text}\n` +
        'Verifique email/senha do superusuário no admin local ' +
        '(http://127.0.0.1:8090/_/).',
    )
  }
  const data = await res.json()
  return data.token
}

async function pbFetch(baseUrl, token, path, init = {}) {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`
  const headers = {
    ...(init.headers || {}),
  }
  if (token) headers.Authorization = token
  if (init.body && typeof init.body === 'object' && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(init.body)
  }
  const res = await fetch(url, { ...init, headers })
  return res
}

// ---------------------------------------------------------------------------
// Passo 1 — importar schema (todas as coleções de uma vez)
// ---------------------------------------------------------------------------

async function importSchema(baseUrl, token, schemaPayload) {
  log('\n📦 [1/2] Importando schema das coleções...')
  // PUT /api/collections/import aceita { collections: [...] , deleteMissing }
  // deleteMissing=false => apenas cria/atualiza as coleções do payload.
  const res = await pbFetch(baseUrl, token, '/api/collections/import', {
    method: 'PUT',
    body: { collections: schemaPayload.collections, deleteMissing: false },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    fail('Falha ao importar schema:')
    // eslint-disable-next-line no-console
    console.error(text || `HTTP ${res.status}`)
    process.exit(1)
  }
  ok(
    `Schema importado: ${schemaPayload.collections.length} coleção(ões) -> ` +
      `${schemaPayload.collections.map((c) => c.name).join(', ')}`,
  )
}

// ---------------------------------------------------------------------------
// Passo 2 — importar registros de cada coleção
// ---------------------------------------------------------------------------

async function importRecords(baseUrl, token, collection, records) {
  const name = collection.name
  const isAuth = collection.type === 'auth'
  log(`\n💾 [2/2] Importando registros: ${name} (${records.length} registro(s))`)
  if (!records.length) {
    ok(`${name}: sem registros para importar`)
    return { name, imported: 0, errors: [] }
  }

  const fieldNames = (collection.fields || [])
    .filter((f) => !f.system && f.name !== 'id')
    .map((f) => f.name)

  const errors = []
  let imported = 0

  for (let i = 0; i < records.length; i++) {
    const rec = records[i]
    const body = {}

    // Inclui o id original para preservar relações
    if (rec.id) body.id = rec.id

    for (const field of fieldNames) {
      if (field in rec) {
        body[field] = rec[field]
      }
    }

    // auth: senha não pode ser exportada (hash unidirecional).
    // Atribuímos uma senha padrão para que o registro fique utilizável.
    if (isAuth) {
      body.password = DEFAULT_PASSWORD
      body.passwordConfirm = DEFAULT_PASSWORD
    }

    // Campos file: o export traz apenas o NOME do arquivo (sem o binário).
    // POST com JSON aceita o nome, mas o arquivo físico não é restaurado.
    // Omitimos o valor aqui para evitar criar referência a arquivo inexistente,
    // a menos que o campo seja apenas texto — file é tratado abaixo.
    for (const field of collection.fields || []) {
      if (field.type === 'file' && field.name in body) {
        // mantemos o nome do arquivo — ficará como referência; re-upload manual
      }
    }

    const res = await pbFetch(
      baseUrl,
      token,
      `/api/collections/${encodeURIComponent(name)}/records`,
      { method: 'POST', body },
    )

    if (res.ok) {
      imported++
      if (imported % 10 === 0 || i === records.length - 1) {
        log(`   ${name}: ${imported}/${records.length}`)
      }
    } else {
      const text = await res.text().catch(() => '')
      errors.push({ id: rec.id, status: res.status, body: text })
      if (errors.length <= 3) {
        warn(`   ${name}[${rec.id || i}] falhou (${res.status}): ${text.slice(0, 200)}`)
      }
    }
  }

  ok(
    `${name}: ${imported}/${records.length} registro(s) importado(s)` +
      (errors.length ? ` (${errors.length} falhas)` : ''),
  )
  return { name, imported, errors }
}

// ---------------------------------------------------------------------------
// Orquestra
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv)

  // Carrega .env da pasta atual (NÃO usa o .env do projeto — este é um script
  // autônomo distribuído junto do bundle de exportação).
  const cwd = args.dir ? resolve(args.dir) : process.cwd()
  loadDotEnv(cwd)

  const baseUrl =
    args.url || envFallback('PB_URL') || envFallback('POCKETBASE_URL') || 'http://127.0.0.1:8090'
  const email = args.email || envFallback('PB_ADMIN_EMAIL') || envFallback('POCKETBASE_ADMIN_EMAIL')
  const password =
    args.password || envFallback('PB_ADMIN_PASSWORD') || envFallback('POCKETBASE_ADMIN_PASSWORD')
  // Resolve o bundle: --file > ./exported.json > ./pocketbase_export/exported.json
  const bundlePath = args.file
    ? resolve(args.file)
    : existsSync(join(cwd, 'exported.json'))
      ? join(cwd, 'exported.json')
      : join(cwd, 'pocketbase_export', 'exported.json')

  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('  PocketBase — Importador local (a partir de exported.json)')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log(`  URL alvo : ${baseUrl}`)
  log(`  Admin    : ${email || '(não informado)'}`)
  log(`  Bundle   : ${bundlePath}`)
  log('──────────────────────────────────────────────────────')

  if (!email || !password) {
    fail(
      'Credenciais admin ausentes.\n' +
        'Forneça via argumentos (--email=... --password=...) ou via .env ' +
        '(PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD).',
    )
    process.exit(1)
  }

  if (!existsSync(bundlePath)) {
    fail(`Bundle de exportação não encontrado: ${bundlePath}`)
    fail('Rode primeiro o exportador (export_pocketbase.js) no ambiente de origem.')
    process.exit(1)
  }

  const bundle = readJson(bundlePath)
  const schema = bundle.schema
  const data = bundle.data || {}

  // Filtra coleções de sistema que possam ter vindo no schema
  schema.collections = (schema.collections || []).filter((c) => !PB_SYSTEM_COLLECTIONS.has(c.name))

  log(`\n🔐 Autenticando como admin em ${baseUrl}...`)
  let token
  try {
    token = await pbAuth(baseUrl, email, password)
  } catch (e) {
    fail(e.message)
    process.exit(1)
  }
  ok('Autenticado como admin.')

  // 1. Schema
  await importSchema(baseUrl, token, schema)

  // 2. Dados — respeita a ordem do schema (coleções pai antes das filhas)
  const summary = []
  for (const col of schema.collections) {
    const records = data[col.name] || []
    const result = await importRecords(baseUrl, token, col, records)
    summary.push(result)
  }

  // Resumo final
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('  Resumo da importação')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  let totalImported = 0
  let totalErrors = 0
  for (const s of summary) {
    log(
      `  ${s.name.padEnd(22)} ${String(s.imported).padStart(6)} importados${s.errors.length ? ` | ${s.errors.length} falhas` : ''}`,
    )
    totalImported += s.imported
    totalErrors += s.errors.length
  }
  log('──────────────────────────────────────────────────────')
  log(
    `  Total: ${totalImported} registro(s) importado(s)${totalErrors ? `, ${totalErrors} falha(s)` : ''}`,
  )

  if (totalErrors) {
    warn(
      `Houve ${totalErrors} falha(s) durante a importação (provavelmente ` +
        'registros com referências a arquivos ausentes ou constraints). ' +
        'Veja os warnings acima.',
    )
    process.exit(2)
  }

  ok('\nImportação concluída com sucesso. ✔')
}

main().catch((e) => {
  fail('Erro inesperado:', e?.stack || e?.message || e)
  process.exit(1)
})
