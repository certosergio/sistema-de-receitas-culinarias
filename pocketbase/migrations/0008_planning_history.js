// Adds a `planning_history` collection that stores immutable snapshots of a
// user's weekly meal plan so past weeks can be reviewed (read-only) later.
// One record per user + week_start; re-archiving the same week updates the
// snapshot in place (upsert) rather than creating duplicates.
migrate(
  (app) => {
    const usersId = '_pb_users_auth_'

    const planningHistory = new Collection({
      name: 'planning_history',
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
          // Monday of the archived week (YYYY-MM-DD, lexicographically sortable).
          name: 'week_start',
          type: 'text',
          required: true,
          min: 10,
          max: 10,
        },
        {
          // Sunday of the archived week (YYYY-MM-DD).
          name: 'week_end',
          type: 'text',
          required: true,
          min: 10,
          max: 10,
        },
        {
          // Full JSON snapshot of the week: meal plans (with expanded recipe
          // data) and day notes. Keeps archived weeks self-contained even if
          // the underlying recipes/notes are later changed or deleted.
          name: 'plan_data',
          type: 'json',
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_planning_history_user_week ON planning_history (user, week_start)',
        'CREATE INDEX idx_planning_history_user ON planning_history (user)',
        'CREATE INDEX idx_planning_history_week_start ON planning_history (week_start)',
      ],
    })
    app.save(planningHistory)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('planning_history')
      app.delete(col)
    } catch (_) {}
  },
)
