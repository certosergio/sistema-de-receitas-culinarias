// Adds dietary restriction flags to the `recipes` collection:
//   contains_gluten, contains_dairy, contains_eggs, contains_fish, contains_honey
// "Vegana" is NOT stored — it is derived client-side (no animal-origin flags set).
// Bool flags are intentionally optional (not required) so absent = false.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('recipes')

    if (!col.fields.getByName('contains_gluten')) {
      col.fields.add(new BoolField({ name: 'contains_gluten' }))
    }
    if (!col.fields.getByName('contains_dairy')) {
      col.fields.add(new BoolField({ name: 'contains_dairy' }))
    }
    if (!col.fields.getByName('contains_eggs')) {
      col.fields.add(new BoolField({ name: 'contains_eggs' }))
    }
    if (!col.fields.getByName('contains_fish')) {
      col.fields.add(new BoolField({ name: 'contains_fish' }))
    }
    if (!col.fields.getByName('contains_honey')) {
      col.fields.add(new BoolField({ name: 'contains_honey' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('recipes')
    ;[
      'contains_gluten',
      'contains_dairy',
      'contains_eggs',
      'contains_fish',
      'contains_honey',
    ].forEach((name) => {
      const f = col.fields.getByName(name)
      if (f) col.fields.remove(f)
    })
    app.save(col)
  },
)
