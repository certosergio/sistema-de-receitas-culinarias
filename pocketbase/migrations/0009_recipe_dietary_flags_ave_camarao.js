// Adds two new animal-origin dietary flags to the `recipes` collection:
//   contains_ave (Ave) and contains_camarao (Camarão)
// Like the existing flags (migration 0006), these are optional bool fields
// (absent = false). Recipes marked with either of them are NOT vegan, so the
// client-side `isVegan` helper treats them as animal-origin flags.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('recipes')

    if (!col.fields.getByName('contains_ave')) {
      col.fields.add(new BoolField({ name: 'contains_ave' }))
    }
    if (!col.fields.getByName('contains_camarao')) {
      col.fields.add(new BoolField({ name: 'contains_camarao' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('recipes')
    ;['contains_ave', 'contains_camarao'].forEach((name) => {
      const f = col.fields.getByName(name)
      if (f) col.fields.remove(f)
    })
    app.save(col)
  },
)
