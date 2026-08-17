// Recipe import proxy.
// POST /api/import-recipe  { url }  (auth required)
// Fetches the page server-side (bypasses browser CORS), extracts the
// <title>, JSON-LD schema.org/Recipe blocks, Open Graph meta and a
// cleaned plain-text dump, then returns them to the client for parsing.
//
// We only fetch + extract raw strings here — every heuristic that turns
// the dump into structured recipe fields lives client-side so the user
// can review and edit it before saving.
routerAdd(
  'POST',
  '/api/import-recipe',
  (e) => {
    const body = e.requestInfo().data || {}
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : ''
    if (!rawUrl) {
      return e.json(400, { error: 'Informe a URL da receita.' })
    }

    // Basic URL sanity check — must be http(s).
    if (!/^https?:\/\//i.test(rawUrl)) {
      return e.json(400, { error: 'A URL deve começar com http:// ou https://' })
    }

    let res
    try {
      res = $http.send({
        url: rawUrl,
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; BibliotecaCulinariaBot/1.0; +https://biblioteca-culinaria.app)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
        timeout: 20,
      })
    } catch (err) {
      return e.json(502, {
        error: 'Não foi possível acessar a URL informada.',
        detail: String(err),
      })
    }

    if (!res || res.statusCode < 200 || res.statusCode >= 400) {
      return e.json(502, {
        error:
          'O site retornou um erro (' +
          (res ? res.statusCode : 'sem resposta') +
          '). Tente colar o texto da receita manualmente.',
      })
    }

    const html = res.body || ''
    if (!html || html.length < 50) {
      return e.json(422, {
        error: 'A página não retornou conteúdo utilizável. Cole o texto da receita manualmente.',
      })
    }

    // --- Extract <title> ---
    let pageTitle = ''
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (titleMatch && titleMatch[1]) {
      pageTitle = titleMatch[1].replace(/\s+/g, ' ').trim()
    }

    // --- Extract all JSON-LD blocks ---
    const jsonLdBlocks = []
    const ldRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    let ldMatch
    while ((ldMatch = ldRegex.exec(html)) !== null) {
      const raw = (ldMatch[1] || '').trim()
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw)
        jsonLdBlocks.push(parsed)
      } catch (_) {
        // ignore malformed JSON-LD
      }
    }

    // --- Extract Open Graph / meta tags ---
    const meta = {}
    const metaRegex = /<meta\s+[^>]*?>/gi
    let metaMatch
    while ((metaMatch = metaRegex.exec(html)) !== null) {
      const tag = metaMatch[0]
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

    // --- Build a cleaned plain-text dump ---
    // Pull <script>/<style>/<noscript> out, convert <br>/</p>/</li> to
    // newlines, then strip the remaining tags and collapse whitespace.
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
    // Decode the few HTML entities we care about.
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&aacute;/g, 'á')
      .replace(/&eacute;/g, 'é')
      .replace(/&iacute;/g, 'í')
      .replace(/&oacute;/g, 'ó')
      .replace(/&uacute;/g, 'ú')
      .replace(/&atilde;/g, 'ã')
      .replace(/&otilde;/g, 'õ')
      .replace(/&ccedil;/g, 'ç')
    // Collapse runs of spaces but keep line breaks.
    text = text
      .split('\n')
      .map((l) => l.replace(/[ \t]+/g, ' ').trim())
      .filter((l) => l.length > 0)
      .join('\n')
    // Hard cap so the client never gets a multi-MB blob.
    if (text.length > 60000) text = text.slice(0, 60000)

    return e.json(200, {
      url: rawUrl,
      pageTitle,
      jsonLd: jsonLdBlocks,
      meta,
      text,
    })
  },
  (e) => {
    const info = e.requestInfo()
    const authRecord = info.authRecord
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação necessária.' })
    }
    return undefined
  },
)
