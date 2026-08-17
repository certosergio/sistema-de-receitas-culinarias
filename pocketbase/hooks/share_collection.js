// Public share endpoint for a collection, resolved by share_token.
// GET /api/share/:token  -> { collection, recipes }  (no auth required)
routerAdd('GET', '/api/share/:token', (e) => {
  const token = e.requestInfo().pathParam('token') || ''

  let collection = null
  try {
    collection = $app.findFirstRecordByData('collections', 'share_token', token)
  } catch (_) {
    return e.json(404, { error: 'Coleção não encontrada' })
  }
  if (!collection) {
    return e.json(404, { error: 'Coleção não encontrada' })
  }
  if (!token) {
    return e.json(404, { error: 'Coleção não encontrada' })
  }

  // Author of the collection.
  let authorName = 'Chef do Acervo'
  try {
    const u = $app.findRecordById('users', collection.get('user') || '')
    if (u) {
      authorName = u.getString('name') || u.getString('email') || authorName
    }
  } catch (_) {}

  const collectionOut = {
    id: collection.get('id'),
    name: collection.get('name') || '',
    description: collection.get('description') || '',
    author: authorName,
    created: collection.get('created') || '',
  }

  // Recipes linked to the collection, newest first.
  let rows = []
  try {
    rows = $app.findRecordsByFilter('collection_recipes', 'collection = {:cid}', '-created', 0, 0, {
      cid: collectionOut.id,
    })
  } catch (_) {
    rows = []
  }

  const recipes = []
  for (let i = 0; i < rows.length; i++) {
    const recipeId = rows[i].get('recipe')
    if (!recipeId) continue
    try {
      const r = $app.findRecordById('recipes', recipeId)
      if (!r) continue

      let categoryName = ''
      const catId = r.get('category') || ''
      if (catId) {
        try {
          const c = $app.findRecordById('categories', catId)
          if (c) categoryName = c.get('name') || ''
        } catch (_) {}
      }

      let techniqueName = ''
      const techId = r.get('technique') || ''
      if (techId) {
        try {
          const t = $app.findRecordById('techniques', techId)
          if (t) techniqueName = t.get('name') || ''
        } catch (_) {}
      }

      const coverName = r.get('cover') || ''
      // Relative path to the file; the frontend resolves it against the
      // PocketBase base URL. The cover field is not protected, so /api/files
      // serves it publicly without auth.
      const coverUrl = coverName ? '/api/files/recipes/' + r.get('id') + '/' + coverName : ''

      recipes.push({
        id: r.get('id'),
        title: r.get('title') || '',
        summary: r.get('summary') || '',
        category: categoryName,
        technique: techniqueName,
        cover: coverUrl,
        difficulty: r.get('difficulty') || '',
        yield_quantity: r.get('yield_quantity') || 0,
        yield_unit: r.get('yield_unit') || '',
        portions: r.get('portions') || '',
        prep_minutes: r.get('prep_minutes') || 0,
        cook_minutes: r.get('cook_minutes') || 0,
        total_minutes: r.get('total_minutes') || 0,
        cost: r.get('cost') || 0,
        calories: r.get('calories') || 0,
        protein: r.get('protein') || 0,
        carbs: r.get('carbs') || 0,
        fat: r.get('fat') || 0,
        ingredients: r.get('ingredients') || [],
        method: r.get('method') || [],
        tips: r.get('tips') || '',
        // Dietary restriction flags (migration 0006) — exposed so the public
        // share page can render the same indicators as the rest of the app.
        contains_gluten: r.get('contains_gluten') || false,
        contains_dairy: r.get('contains_dairy') || false,
        contains_eggs: r.get('contains_eggs') || false,
        contains_fish: r.get('contains_fish') || false,
        contains_honey: r.get('contains_honey') || false,
        contains_ave: r.get('contains_ave') || false,
        contains_camarao: r.get('contains_camarao') || false,
      })
    } catch (_) {}
  }

  return e.json(200, {
    collection: collectionOut,
    recipes: recipes,
  })
})
