migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const recipesCol = app.findCollectionByNameOrId('recipes')
    const ingredientsCol = app.findCollectionByNameOrId('ingredients')

    if (!app.hasTable('recipe_ingredients')) {
      const collection = new Collection({
        name: 'recipe_ingredients',
        type: 'base',
        listRule: "@request.auth.id != '' && user = @request.auth.id",
        viewRule: "@request.auth.id != '' && user = @request.auth.id",
        createRule: "@request.auth.id != '' && user = @request.auth.id",
        updateRule: "@request.auth.id != '' && user = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          {
            name: 'recipe_id',
            type: 'relation',
            required: true,
            collectionId: recipesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'ingredient_id',
            type: 'relation',
            required: true,
            collectionId: ingredientsCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'quantidade',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            name: 'observacao',
            type: 'text',
          },
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: usersCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients (recipe_id)',
          'CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients (ingredient_id)',
          'CREATE INDEX idx_recipe_ingredients_user ON recipe_ingredients (user)',
        ],
      })
      app.save(collection)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('recipe_ingredients')
      app.delete(col)
    } catch (_) {}
  },
)
