/**
 * Migration 0022_bootstrap_schema.js
 *
 * Bootstrap idempotente de todas as coleções do sistema:
 * - categories
 * - techniques
 * - recipes
 * - favorites
 * - collections
 * - collection_recipes
 * - selected_recipes
 *
 * Garante que em ambientes locais (onde o banco começa vazio) todas as
 * coleções sejam criadas com seus campos, regras de acesso e índices
 * idênticos aos de produção (Skip Cloud / schema.json).
 *
 * Se a coleção já existir (como na nuvem), a criação é ignorada de forma
 * segura e idempotente sem causar erros.
 */
migrate(
  (app) => {
    function collectionExists(name) {
      try {
        app.findCollectionByNameOrId(name)
        return true
      } catch (_) {
        return false
      }
    }

    // 1. categories
    if (!collectionExists('categories')) {
      const categoriesCol = new Collection({
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
      app.save(categoriesCol)
    }

    // 2. techniques
    if (!collectionExists('techniques')) {
      const techniquesCol = new Collection({
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
      app.save(techniquesCol)
    }

    // Resolvendo IDs de coleção para relações
    const categoriesId = app.findCollectionByNameOrId('categories').id
    const techniquesId = app.findCollectionByNameOrId('techniques').id

    // 3. recipes
    if (!collectionExists('recipes')) {
      const recipesCol = new Collection({
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
          { name: 'cover', type: 'file', required: false, maxSelect: 1 },
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
            maxSelect: 8,
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
          { name: 'contains_gluten', type: 'bool', required: false },
          { name: 'contains_dairy', type: 'bool', required: false },
          { name: 'contains_eggs', type: 'bool', required: false },
          { name: 'contains_fish', type: 'bool', required: false },
          { name: 'contains_honey', type: 'bool', required: false },
          { name: 'contains_ave', type: 'bool', required: false },
          { name: 'contains_camarao', type: 'bool', required: false },
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
      app.save(recipesCol)
    }

    const recipesId = app.findCollectionByNameOrId('recipes').id

    // 4. favorites
    if (!collectionExists('favorites')) {
      const favoritesCol = new Collection({
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
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'recipe',
            type: 'relation',
            required: true,
            collectionId: recipesId,
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
      app.save(favoritesCol)
    }

    // 5. collections
    if (!collectionExists('collections')) {
      const collectionsCol = new Collection({
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
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'share_token', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_collections_user ON collections (user)',
          'CREATE INDEX idx_collections_created ON collections (created DESC)',
        ],
      })
      app.save(collectionsCol)
    }

    const collectionsId = app.findCollectionByNameOrId('collections').id

    // 6. collection_recipes
    if (!collectionExists('collection_recipes')) {
      const collectionRecipesCol = new Collection({
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
            collectionId: collectionsId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'recipe',
            type: 'relation',
            required: true,
            collectionId: recipesId,
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
      app.save(collectionRecipesCol)
    }

    // 7. selected_recipes
    if (!collectionExists('selected_recipes')) {
      const selectedRecipesCol = new Collection({
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
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'recipe',
            type: 'relation',
            required: true,
            collectionId: recipesId,
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
      app.save(selectedRecipesCol)
    }
  },
  (app) => {
    const collectionsToRemove = [
      'selected_recipes',
      'collection_recipes',
      'collections',
      'favorites',
      'recipes',
      'techniques',
      'categories',
    ]

    for (const name of collectionsToRemove) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
