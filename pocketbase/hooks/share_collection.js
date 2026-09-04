/**
 * Public route to fetch a shared collection and its recipes by share_token.
 * Unauthenticated visitors can view the collection name, description, author,
 * and the list of recipes belonging to the collection.
 */

routerAdd('GET', '/api/share/{token}', (e) => {
  const token = e.request.pathValue('token')
  if (!token || token.trim() === '') {
    return e.json(400, { error: 'Token de compartilhamento não informado.' })
  }

  // 1. Find the collection with this share_token
  let collectionRecord
  try {
    collectionRecord = $app.findFirstRecordByData('collections', 'share_token', token.trim())
  } catch (_) {
    return e.json(404, { error: 'Coleção não encontrada ou link expirado.' })
  }

  // 2. Fetch author info (optional, best-effort)
  let authorName = 'Chef do Acervo'
  try {
    const userId = collectionRecord.getString('user')
    if (userId) {
      const userRecord = $app.findRecordById('users', userId)
      authorName = userRecord.getString('name') || userRecord.getString('email') || authorName
    }
  } catch (_) {}

  // 3. Find collection_recipes entries for this collection
  let pairs = []
  try {
    pairs = $app.findRecordsByFilter(
      'collection_recipes',
      'collection = {:colId}',
      '-created',
      500,
      0,
      { colId: collectionRecord.id },
    )
  } catch (_) {}

  // 4. Fetch the full recipes
  const recipes = []
  for (let i = 0; i < pairs.length; i++) {
    const recipeId = pairs[i].getString('recipe')
    if (!recipeId) continue
    try {
      const r = $app.findRecordById('recipes', recipeId)

      // Resolve category & technique names if present
      let categoryName = ''
      const catId = r.getString('category')
      if (catId) {
        try {
          const catRecord = $app.findRecordById('categories', catId)
          categoryName = catRecord.getString('name')
        } catch (_) {}
      }

      let techniqueName = ''
      const techId = r.getString('technique')
      if (techId) {
        try {
          const techRecord = $app.findRecordById('techniques', techId)
          techniqueName = techRecord.getString('name')
        } catch (_) {}
      }

      let ingredients = []
      try {
        const rawIng = r.get('ingredients')
        if (Array.isArray(rawIng)) {
          ingredients = rawIng
        } else if (typeof rawIng === 'string') {
          ingredients = JSON.parse(rawIng)
        }
      } catch (_) {}

      let method = []
      try {
        const rawMethod = r.get('method')
        if (Array.isArray(rawMethod)) {
          method = rawMethod
        } else if (typeof rawMethod === 'string') {
          method = JSON.parse(rawMethod)
        }
      } catch (_) {}

      const coverFile = r.getString('cover')
      let coverUrl = ''
      if (coverFile) {
        coverUrl = '/api/files/' + r.collection().id + '/' + r.id + '/' + coverFile
      }

      recipes.push({
        id: r.id,
        title: r.getString('title'),
        slug: r.getString('slug'),
        summary: r.getString('summary'),
        category: categoryName,
        technique: techniqueName,
        cover: coverUrl,
        difficulty: r.getString('difficulty'),
        yield_quantity: r.getInt('yield_quantity'),
        yield_unit: r.getString('yield_unit'),
        portions: r.getString('portions'),
        prep_minutes: r.getInt('prep_minutes'),
        cook_minutes: r.getInt('cook_minutes'),
        total_minutes: r.getInt('total_minutes'),
        cost: r.getFloat('cost'),
        calories: r.getInt('calories'),
        protein: r.getFloat('protein'),
        carbs: r.getFloat('carbs'),
        fat: r.getFloat('fat'),
        ingredients: ingredients,
        method: method,
        tips: r.getString('tips'),
        created: r.getString('created'),
        contains_gluten: r.getBool('contains_gluten'),
        contains_dairy: r.getBool('contains_dairy'),
        contains_eggs: r.getBool('contains_eggs'),
        contains_fish: r.getBool('contains_fish'),
        contains_honey: r.getBool('contains_honey'),
        contains_ave: r.getBool('contains_ave'),
        contains_camarao: r.getBool('contains_camarao'),
      })
    } catch (_) {}
  }

  return e.json(200, {
    collection: {
      id: collectionRecord.id,
      name: collectionRecord.getString('name'),
      description: collectionRecord.getString('description'),
      author: authorName,
      created: collectionRecord.getString('created'),
    },
    recipes: recipes,
  })
})
