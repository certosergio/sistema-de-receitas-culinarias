migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const recipesId = app.findCollectionByNameOrId('recipes').id

    // 1. favorites collection — user <-> recipe (unique pair)
    const favoritesCollection = new Collection({
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
          collectionId: usersId,
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
    app.save(favoritesCollection)

    // 2. collections collection — user-owned named collections
    const collectionsCollection = new Collection({
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
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true, min: 1 },
        { name: 'description', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_collections_user ON collections (user)',
        'CREATE INDEX idx_collections_created ON collections (created DESC)',
      ],
    })
    app.save(collectionsCollection)

    // 3. collection_recipes — join between collections and recipes (unique pair)
    const collectionsId = app.findCollectionByNameOrId('collections').id
    const collectionRecipesCollection = new Collection({
      name: 'collection_recipes',
      type: 'base',
      // Aligned with collections ownership: only the owner of the parent collection may act.
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
    app.save(collectionRecipesCollection)
  },
  (app) => {
    try {
      const cr = app.findCollectionByNameOrId('collection_recipes')
      app.delete(cr)
    } catch (_) {}
    try {
      const c = app.findCollectionByNameOrId('collections')
      app.delete(c)
    } catch (_) {}
    try {
      const f = app.findCollectionByNameOrId('favorites')
      app.delete(f)
    } catch (_) {}
  },
)
