migrate(
  (app) => {
    const usersCollection = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. ingredient_categories
    if (!app.hasTable('ingredient_categories')) {
      const ingredientCategories = new Collection({
        name: 'ingredient_categories',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'slug', type: 'text', required: true },
          { name: 'description', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_ingredient_categories_slug ON ingredient_categories (slug)',
        ],
      })
      app.save(ingredientCategories)
    }

    // 2. ingredients
    if (!app.hasTable('ingredients')) {
      const ingredientCategoriesCol = app.findCollectionByNameOrId('ingredient_categories')

      const ingredients = new Collection({
        name: 'ingredients',
        type: 'base',
        listRule: "@request.auth.id != '' && user = @request.auth.id",
        viewRule: "@request.auth.id != '' && user = @request.auth.id",
        createRule: "@request.auth.id != '' && user = @request.auth.id",
        updateRule: "@request.auth.id != '' && user = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          {
            name: 'categoria_id',
            type: 'relation',
            required: true,
            collectionId: ingredientCategoriesCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'codigo', type: 'text', required: true },
          { name: 'nome', type: 'text', required: true },
          { name: 'unidade', type: 'text' },
          { name: 'quantidade_unitaria', type: 'number' },
          { name: 'custo_unitario', type: 'number' },
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: usersCollection.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_ingredients_codigo ON ingredients (codigo)',
          'CREATE INDEX idx_ingredients_categoria ON ingredients (categoria_id)',
          'CREATE INDEX idx_ingredients_user ON ingredients (user)',
          'CREATE INDEX idx_ingredients_nome ON ingredients (nome)',
        ],
      })
      app.save(ingredients)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('ingredients')
      app.delete(col)
    } catch (_) {}

    try {
      const col = app.findCollectionByNameOrId('ingredient_categories')
      app.delete(col)
    } catch (_) {}
  },
)
