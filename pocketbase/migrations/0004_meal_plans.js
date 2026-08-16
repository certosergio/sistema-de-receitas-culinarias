migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const recipesId = app.findCollectionByNameOrId('recipes').id

    const mealPlans = new Collection({
      name: 'meal_plans',
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
          // ISO date string YYYY-MM-DD (text keeps lexicographic sorting simple).
          name: 'date',
          type: 'text',
          required: true,
          min: 10,
          max: 10,
        },
        {
          name: 'meal_type',
          type: 'select',
          required: true,
          values: ['cafe_da_manha', 'almoco', 'jantar'],
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
        'CREATE UNIQUE INDEX idx_meal_plans_slot ON meal_plans (user, date, meal_type)',
        'CREATE INDEX idx_meal_plans_user ON meal_plans (user)',
        'CREATE INDEX idx_meal_plans_date ON meal_plans (date)',
        'CREATE INDEX idx_meal_plans_recipe ON meal_plans (recipe)',
      ],
    })
    app.save(mealPlans)
  },
  (app) => {
    try {
      const mp = app.findCollectionByNameOrId('meal_plans')
      app.delete(mp)
    } catch (_) {}
  },
)
