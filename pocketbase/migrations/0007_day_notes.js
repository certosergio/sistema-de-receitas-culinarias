// Adds a `day_notes` collection for free-form per-day observations in the
// weekly planner (one note per user + date). Kept separate from `meal_plans`
// because notes describe the day as a whole, not a single meal slot.
migrate(
  (app) => {
    const usersId = '_pb_users_auth_'

    const dayNotes = new Collection({
      name: 'day_notes',
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
          name: 'notes',
          type: 'text',
          required: false,
          max: 4000,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_day_notes_user_date ON day_notes (user, date)',
        'CREATE INDEX idx_day_notes_user ON day_notes (user)',
        'CREATE INDEX idx_day_notes_date ON day_notes (date)',
      ],
    })
    app.save(dayNotes)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('day_notes')
      app.delete(col)
    } catch (_) {}
  },
)
