/**
 * Public shared collection endpoint: GET /api/share/{token}
 * Unauthenticated endpoint that returns the collection and its recipes.
 */
routerAdd('GET', '/api/share/{token}', (e) => {
  const token = e.request.pathValue('token')
  if (!token || token.trim() === '') {
    return e.json(400, { message: 'Token inválido ou não fornecido.' })
  }

  let collectionRecord
  try {
    collectionRecord = $app.findFirstRecordByData('collections', 'share_token', token)
  } catch (_) {
    return e.json(404, { message: 'Coleção não encontrada ou link expirado.' })
  }

  // Get author name if available
  let authorName = 'Chef do Acervo'
  const userId = collectionRecord.getString('user')
  if (userId) {
    try {
      const authorRecord = $app.findRecordById('users', userId)
      const name = authorRecord.getString('name')
      if (name && name.trim()) {
        authorName = name.trim()
      }
    } catch (_) {}
  }

  // Find recipes in this collection
  let collectionRecipes = []
  try {
    collectionRecipes = $app.findRecordsByFilter(
      'collection_recipes',
      "collection = '" + collectionRecord.id + "'",
      'created',
      500,
      0,
    )
  } catch (_) {}

  const recipes = []
  for (let i = 0; i < collectionRecipes.length; i++) {
    const cr = collectionRecipes[i]
    const recipeId = cr.getString('recipe')
    if (!recipeId) continue

    try {
      const rec = $app.findRecordById('recipes', recipeId)

      // Category name
      let categoryName = ''
      const catId = rec.getString('category')
      if (catId) {
        try {
          const cat = $app.findRecordById('categories', catId)
          categoryName = cat.getString('name') || ''
        } catch (_) {}
      }

      // Technique name
      let techniqueName = ''
      const techId = rec.getString('technique')
      if (techId) {
        try {
          const tech = $app.findRecordById('techniques', techId)
          techniqueName = tech.getString('name') || ''
        } catch (_) {}
      }

      // Ingredients & method JSON parsing
      let ingredients = []
      const rawIngredients = rec.get('ingredients')
      if (rawIngredients) {
        if (typeof rawIngredients === 'string') {
          try {
            ingredients = JSON.parse(rawIngredients)
          } catch (_) {}
        } else if (Array.isArray(rawIngredients)) {
          ingredients = rawIngredients
        }
      }

      let method = []
      const rawMethod = rec.get('method')
      if (rawMethod) {
        if (typeof rawMethod === 'string') {
          try {
            method = JSON.parse(rawMethod)
          } catch (_) {}
        } else if (Array.isArray(rawMethod)) {
          method = rawMethod
        }
      }

      // Cover URL path: /api/files/recipes/{id}/{filename}
      let coverUrl = ''
      const coverFile = rec.getString('cover')
      if (coverFile) {
        coverUrl = '/api/files/' + rec.collection().name + '/' + rec.id + '/' + coverFile
      }

      recipes.push({
        id: rec.id,
        title: rec.getString('title'),
        summary: rec.getString('summary'),
        category: categoryName,
        technique: techniqueName,
        cover: coverUrl,
        difficulty: rec.getString('difficulty'),
        yield_quantity: rec.getInt('yield_quantity'),
        yield_unit: rec.getString('yield_unit'),
        portions: rec.getString('portions'),
        prep_minutes: rec.getInt('prep_minutes'),
        cook_minutes: rec.getInt('cook_minutes'),
        total_minutes: rec.getInt('total_minutes'),
        cost: rec.getFloat('cost'),
        calories: rec.getInt('calories'),
        protein: rec.getFloat('protein'),
        carbs: rec.getFloat('carbs'),
        fat: rec.getFloat('fat'),
        ingredients: ingredients,
        method: method,
        tips: rec.getString('tips'),
        contains_gluten: rec.getBool('contains_gluten'),
        contains_dairy: rec.getBool('contains_dairy'),
        contains_eggs: rec.getBool('contains_eggs'),
        contains_fish: rec.getBool('contains_fish'),
        contains_honey: rec.getBool('contains_honey'),
        contains_ave: rec.getBool('contains_ave'),
        contains_camarao: rec.getBool('contains_camarao'),
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
