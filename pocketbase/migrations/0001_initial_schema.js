migrate(
  (app) => {
    // 1. Categories collection
    const categoriesCollection = new Collection({
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
        { name: 'description', type: 'text', required: false },
        { name: 'color', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_categories_slug ON categories (slug)'],
    })
    app.save(categoriesCollection)

    // 2. Techniques collection
    const techniquesCollection = new Collection({
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
        { name: 'description', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_techniques_slug ON techniques (slug)'],
    })
    app.save(techniquesCollection)

    const categoriesId = app.findCollectionByNameOrId('categories').id
    const techniquesId = app.findCollectionByNameOrId('techniques').id

    // 3. Recipes collection
    const recipesCollection = new Collection({
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
        { name: 'summary', type: 'text', required: false },
        {
          name: 'category',
          type: 'relation',
          required: false,
          collectionId: categoriesId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'technique',
          type: 'relation',
          required: false,
          collectionId: techniquesId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'cover',
          type: 'file',
          required: false,
          maxSelect: 1,
          maxSize: 2097152,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
        {
          name: 'difficulty',
          type: 'select',
          required: false,
          values: ['Fácil', 'Médio', 'Difícil'],
          maxSelect: 1,
        },
        { name: 'yield_quantity', type: 'number', required: false },
        {
          name: 'yield_unit',
          type: 'select',
          required: false,
          values: ['porções', 'unidades', 'fatias', 'xícaras', 'kg', 'g', 'L', 'ml'],
          maxSelect: 1,
        },
        { name: 'portions', type: 'text', required: false },
        { name: 'prep_minutes', type: 'number', required: false },
        { name: 'cook_minutes', type: 'number', required: false },
        { name: 'total_minutes', type: 'number', required: false },
        { name: 'cost', type: 'number', required: false },
        { name: 'calories', type: 'number', required: false },
        { name: 'protein', type: 'number', required: false },
        { name: 'carbs', type: 'number', required: false },
        { name: 'fat', type: 'number', required: false },
        { name: 'ingredients', type: 'json', required: false },
        { name: 'method', type: 'json', required: false },
        { name: 'tips', type: 'text', required: false },
        {
          name: 'author',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
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
    app.save(recipesCollection)
  },
  (app) => {
    try {
      const recipes = app.findCollectionByNameOrId('recipes')
      app.delete(recipes)
    } catch (_) {}
    try {
      const techniques = app.findCollectionByNameOrId('techniques')
      app.delete(techniques)
    } catch (_) {}
    try {
      const categories = app.findCollectionByNameOrId('categories')
      app.delete(categories)
    } catch (_) {}
  },
)
