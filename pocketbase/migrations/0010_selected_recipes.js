migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const recipesId = app.findCollectionByNameOrId('recipes').id

    // selected_recipes — a user's personal selection of recipes (unique pair).
    const selectedRecipesCollection = new Collection({
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
        'CREATE UNIQUE INDEX idx_selected_recipes_user_recipe ON selected_recipes (user, recipe)',
        'CREATE INDEX idx_selected_recipes_user ON selected_recipes (user)',
        'CREATE INDEX idx_selected_recipes_recipe ON selected_recipes (recipe)',
      ],
    })
    app.save(selectedRecipesCollection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('selected_recipes')
      app.delete(col)
    } catch (_) {}
  },
)
