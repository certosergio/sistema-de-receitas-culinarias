// Removes the weekly meal planner collections: meal_plans, day_notes and
// planning_history. The planner feature has been retired in favour of
// Collections; these tables (and their data) are no longer needed.
migrate(
  (app) => {
    const names = ['meal_plans', 'day_notes', 'planning_history']
    for (const name of names) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {
        // Already absent — nothing to do.
      }
    }
  },
  (app) => {
    // No-op: the collections were created by now-removed earlier migrations
    // (0004_meal_plans, 0007_day_notes, 0008_planning_history) and we do not
    // recreate them on rollback.
  },
)
