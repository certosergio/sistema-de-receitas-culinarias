migrate(
  (app) => {
    // Helper to safely find or create a collection
    const usersCollection = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. categories
    if (!app.hasTable('categories')) {
      const categories = new Collection({
        name: 'categories',
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
          { name: 'color', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_categories_slug ON categories (slug)'],
      })
      app.save(categories)
    }

    // 2. techniques
    if (!app.hasTable('techniques')) {
      const techniques = new Collection({
        name: 'techniques',
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
        indexes: ['CREATE UNIQUE INDEX idx_techniques_slug ON techniques (slug)'],
      })
      app.save(techniques)
    }

    // 3. recipes
    if (!app.hasTable('recipes')) {
      const categoriesCol = app.findCollectionByNameOrId('categories')
      const techniquesCol = app.findCollectionByNameOrId('techniques')

      const recipes = new Collection({
        name: 'recipes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'slug', type: 'text', required: true },
          { name: 'summary', type: 'text' },
          { name: 'category', type: 'relation', collectionId: categoriesCol.id, maxSelect: 1 },
          { name: 'technique', type: 'relation', collectionId: techniquesCol.id, maxSelect: 1 },
          { name: 'cover', type: 'file', maxSelect: 1, maxSize: 10485760 },
          {
            name: 'difficulty',
            type: 'select',
            values: ['Fácil', 'Médio', 'Difícil'],
            maxSelect: 1,
          },
          { name: 'yield_quantity', type: 'number' },
          {
            name: 'yield_unit',
            type: 'select',
            values: ['porções', 'unidades', 'fatias', 'xícaras', 'kg', 'g', 'L', 'ml'],
            maxSelect: 1,
          },
          { name: 'portions', type: 'text' },
          { name: 'prep_minutes', type: 'number' },
          { name: 'cook_minutes', type: 'number' },
          { name: 'total_minutes', type: 'number' },
          { name: 'cost', type: 'number' },
          { name: 'calories', type: 'number' },
          { name: 'protein', type: 'number' },
          { name: 'carbs', type: 'number' },
          { name: 'fat', type: 'number' },
          { name: 'ingredients', type: 'json' },
          { name: 'method', type: 'json' },
          { name: 'tips', type: 'text' },
          { name: 'author', type: 'relation', collectionId: usersCollection.id, maxSelect: 1 },
          { name: 'contains_gluten', type: 'bool' },
          { name: 'contains_dairy', type: 'bool' },
          { name: 'contains_eggs', type: 'bool' },
          { name: 'contains_fish', type: 'bool' },
          { name: 'contains_honey', type: 'bool' },
          { name: 'contains_ave', type: 'bool' },
          { name: 'contains_camarao', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_recipes_slug ON recipes (slug)',
          'CREATE INDEX idx_recipes_category ON recipes (category)',
          'CREATE INDEX idx_recipes_technique ON recipes (technique)',
          'CREATE INDEX idx_recipes_author ON recipes (author)',
          'CREATE INDEX idx_recipes_title ON recipes (title)',
          'CREATE INDEX idx_recipes_difficulty ON recipes (difficulty)',
          'CREATE INDEX idx_recipes_total_minutes ON recipes (total_minutes)',
          'CREATE INDEX idx_recipes_created ON recipes (created DESC)',
        ],
      })
      app.save(recipes)
    }

    // 4. favorites
    if (!app.hasTable('favorites')) {
      const recipesCol = app.findCollectionByNameOrId('recipes')

      const favorites = new Collection({
        name: 'favorites',
        type: 'base',
        listRule: "@request.auth.id != '' && user = @request.auth.id",
        viewRule: "@request.auth.id != '' && user = @request.auth.id",
        createRule: "@request.auth.id != '' && user = @request.auth.id",
        updateRule: "@request.auth.id != '' && user = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: usersCollection.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'recipe',
            type: 'relation',
            required: true,
            collectionId: recipesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_favorites_user_recipe ON favorites (user, recipe)',
          'CREATE INDEX idx_favorites_user ON favorites (user)',
          'CREATE INDEX idx_favorites_recipe ON favorites (recipe)',
        ],
      })
      app.save(favorites)
    }

    // 5. collections
    if (!app.hasTable('collections')) {
      const collections = new Collection({
        name: 'collections',
        type: 'base',
        listRule: "@request.auth.id != '' && user = @request.auth.id",
        viewRule: "@request.auth.id != '' && user = @request.auth.id",
        createRule: "@request.auth.id != '' && user = @request.auth.id",
        updateRule: "@request.auth.id != '' && user = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: usersCollection.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text' },
          { name: 'share_token', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_collections_user ON collections (user)',
          'CREATE INDEX idx_collections_created ON collections (created DESC)',
          "CREATE UNIQUE INDEX idx_collections_share_token ON collections (share_token) WHERE share_token != ''",
        ],
      })
      app.save(collections)
    }

    // 6. collection_recipes
    if (!app.hasTable('collection_recipes')) {
      const collectionsCol = app.findCollectionByNameOrId('collections')
      const recipesCol = app.findCollectionByNameOrId('recipes')

      const collectionRecipes = new Collection({
        name: 'collection_recipes',
        type: 'base',
        listRule: "@request.auth.id != '' && collection.user = @request.auth.id",
        viewRule: "@request.auth.id != '' && collection.user = @request.auth.id",
        createRule: "@request.auth.id != '' && collection.user = @request.auth.id",
        updateRule: "@request.auth.id != '' && collection.user = @request.auth.id",
        deleteRule: "@request.auth.id != '' && collection.user = @request.auth.id",
        fields: [
          {
            name: 'collection',
            type: 'relation',
            required: true,
            collectionId: collectionsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'recipe',
            type: 'relation',
            required: true,
            collectionId: recipesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_collection_recipes_pair ON collection_recipes (collection, recipe)',
          'CREATE INDEX idx_collection_recipes_collection ON collection_recipes (collection)',
          'CREATE INDEX idx_collection_recipes_recipe ON collection_recipes (recipe)',
        ],
      })
      app.save(collectionRecipes)
    }

    // 7. selected_recipes
    if (!app.hasTable('selected_recipes')) {
      const recipesCol = app.findCollectionByNameOrId('recipes')

      const selectedRecipes = new Collection({
        name: 'selected_recipes',
        type: 'base',
        listRule: "@request.auth.id != '' && user = @request.auth.id",
        viewRule: "@request.auth.id != '' && user = @request.auth.id",
        createRule: "@request.auth.id != '' && user = @request.auth.id",
        updateRule: "@request.auth.id != '' && user = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: usersCollection.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'recipe',
            type: 'relation',
            required: true,
            collectionId: recipesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_selected_recipes_user_recipe ON selected_recipes (user, recipe)',
          'CREATE INDEX idx_selected_recipes_user ON selected_recipes (user)',
          'CREATE INDEX idx_selected_recipes_recipe ON selected_recipes (recipe)',
        ],
      })
      app.save(selectedRecipes)
    }
  },
  (app) => {
    const tables = [
      'selected_recipes',
      'collection_recipes',
      'collections',
      'favorites',
      'recipes',
      'techniques',
      'categories',
    ]
    for (const name of tables) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
