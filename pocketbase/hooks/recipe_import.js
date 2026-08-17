// Recipe import proxy using $app.onBeforeServe().add()
// POST /api/import-recipe  { url }  (auth required)
//
// We use onBeforeServe (PocketBase's native request-interception mechanism)
// instead of routerAdd, because routerAdd was silently never firing for this
// hook while the equivalent onBeforeServe registration is the documented way
// to intercept arbitrary HTTP requests.
//
// NOTE on PocketBase JSVM scoping: the callback passed to onBeforeServe runs
// in a SEPARATE VM pool from the one that registers it, so top-level function
// / variable declarations are NOT visible inside the callback. All handler
// logic is therefore inlined inside the callback.

console.log('[recipe_import] v2 hook carregado — usando onBeforeServe')

$app.onBeforeServe().add(function (e) {
  // Only handle POST /api/import-recipe — pass through everything else.
  const url = e.request && e.request.url ? e.request.url.path : ''
  const method = (e.request && e.request.method) || ''
  if (!(method === 'POST' && url === '/api/import-recipe')) return

  console.log('[recipe_import] v2 requisição recebida')

  // ----- AUTH: parse JWT from Authorization header -----
  let authRecord = null
  try {
    // Try the header object's .get() first, then fall back to a plain map.
    let authHeader = ''
    try {
      if (e.request.header && typeof e.request.header.get === 'function') {
        authHeader = e.request.header.get('Authorization') || ''
      }
    } catch (_) {
      authHeader = ''
    }
    if (!authHeader && e.request.headers) {
      authHeader = e.request.headers['Authorization'] || e.request.headers['authorization'] || ''
    }
    if (authHeader.indexOf('Bearer ') === 0) {
      const token = authHeader.slice(7).trim()
      const parts = token.split('.')
      if (parts.length >= 2) {
        let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        while (b64.length % 4 !== 0) b64 += '='

        // Pure-JS base64 decode (goja has no atob / $security.base64Decode in hooks).
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
        const lookup = {}
        for (let i = 0; i < chars.length; i++) lookup[chars.charAt(i)] = i

        let jsonStr = ''
        const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '')
        for (let i = 0; i < clean.length; i += 4) {
          const c1 = lookup[clean.charAt(i)] || 0
          const c2 = lookup[clean.charAt(i + 1)] || 0
          const c3 = lookup[clean.charAt(i + 2)]
          const c4 = lookup[clean.charAt(i + 3)]
          jsonStr += String.fromCharCode((c1 << 2) | (c2 >> 4))
          if (clean.charAt(i + 2) !== '=') {
            jsonStr += String.fromCharCode(((c2 & 15) << 4) | ((c3 || 0) >> 2))
          }
          if (clean.charAt(i + 3) !== '=') {
            jsonStr += String.fromCharCode(((c3 & 3) << 6) | (c4 || 0))
          }
        }

        const payload = JSON.parse(jsonStr)
        if (payload && payload.id && payload.type === 'auth') {
          try {
            authRecord = $app.findRecordById('users', payload.id)
          } catch (_) {
            authRecord = null
          }
        }
      }
    }
  } catch (_) {
    authRecord = null
  }

  if (!authRecord) {
    e.response.json(401, { error: 'Autenticação necessária.' })
    return true
  }

  // ----- BODY: read raw body -----
  let body = {}
  try {
    if (e.request.body) {
      try {
        body = e.request.body.json()
      } catch (_) {
        // Fallback: parse the raw body string manually.
        try {
          const raw = e.request.body.string ? e.request.body.string() : ''
          body = raw ? JSON.parse(raw) : {}
        } catch (__) {
          body = {}
        }
      }
    }
  } catch (_) {
    body = {}
  }

  const rawUrl = typeof body.url === 'string' ? body.url.trim() : ''
  if (!rawUrl) {
    e.response.json(400, { error: 'Informe a URL da receita.' })
    return true
  }

  if (!/^https?:\/\//i.test(rawUrl)) {
    e.response.json(400, { error: 'A URL deve começar com http:// ou https://' })
    return true
  }

  // ----- FETCH the remote page -----
  let html = ''
  try {
    const resp = $http.send({
      url: rawUrl,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BibliotecaCulinariaBot/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      timeout: 20,
    })
    if (resp && resp.statusCode >= 200 && resp.statusCode < 400) {
      html = resp.body || ''
    } else {
      e.response.json(502, {
        error:
          'O site retornou um erro (' +
          (resp ? resp.statusCode : 'sem resposta') +
          '). Tente colar o texto da receita manualmente.',
      })
      return true
    }
  } catch (err) {
    e.response.json(502, {
      error: 'Não foi possível acessar a URL informada.',
      detail: String(err),
    })
    return true
  }

  if (!html || html.length < 50) {
    e.response.json(422, {
      error: 'A página não retornou conteúdo utilizável. Cole o texto da receita manualmente.',
    })
    return true
  }

  // ----- Extract data (same extraction logic as the previous routerAdd version) -----

  // <title>
  let pageTitle = ''
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (titleMatch && titleMatch[1]) {
    pageTitle = titleMatch[1].replace(/\s+/g, ' ').trim()
  }

  // JSON-LD — use String.match(global) + iterate the array (avoids goja's
  // stateful .exec() quirks with global regexes).
  const jsonLdBlocks = []
  const ldMatches = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )
  if (ldMatches) {
    for (let i = 0; i < ldMatches.length; i++) {
      const block = ldMatches[i]
      const inner = block.match(/>([\s\S]*?)<\/script>/i)
      const raw = inner ? (inner[1] || '').trim() : ''
      if (!raw) continue
      try {
        jsonLdBlocks.push(JSON.parse(raw))
      } catch (_) {
        // ignore malformed JSON-LD
      }
    }
  }

  // Open Graph / meta tags — also use match(global) instead of exec loop.
  const meta = {}
  const metaMatches = html.match(/<meta\s+[^>]*?>/gi)
  if (metaMatches) {
    for (let i = 0; i < metaMatches.length; i++) {
      const tag = metaMatches[i]
      const propMatch =
        tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i) ||
        tag.match(/(?:property|name)\s*=\s*([^\s>]+)/i)
      const contentMatch =
        tag.match(/content\s*=\s*["']([^"']*)["']/i) || tag.match(/content\s*=\s*([^\s>]+)/i)
      if (propMatch && contentMatch) {
        const key = propMatch[1].toLowerCase()
        if (!meta[key]) meta[key] = contentMatch[1]
      }
    }
  }

  // Clean text dump
  let text = html
  text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ')
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
  text = text.replace(/<header[\s\S]*?<\/header>/gi, ' ')
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
  text = text.replace(/<form[\s\S]*?<\/form>/gi, ' ')
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/(p|div|li|h[1-6]|tr|ul|ol|section|article|td|th)>/gi, '\n')
  text = text.replace(/<li[^>]*>/gi, '\n• ')
  text = text.replace(/<[^>]+>/g, ' ')
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&aacute;/g, 'á')
  text = text.replace(/&eacute;/g, 'é')
  text = text.replace(/&iacute;/g, 'í')
  text = text.replace(/&oacute;/g, 'ó')
  text = text.replace(/&uacute;/g, 'ú')
  text = text.replace(/&atilde;/g, 'ã')
  text = text.replace(/&otilde;/g, 'õ')
  text = text.replace(/&ccedil;/g, 'ç')
  const textLines = text.split('\n')
  const cleanedLines = []
  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i].replace(/[ \t]+/g, ' ').trim()
    if (line.length > 0) cleanedLines.push(line)
  }
  text = cleanedLines.join('\n')
  if (text.length > 60000) text = text.slice(0, 60000)

  e.response.json(200, {
    url: rawUrl,
    pageTitle: pageTitle,
    jsonLd: jsonLdBlocks,
    meta: meta,
    text: text,
  })
  return true
})
