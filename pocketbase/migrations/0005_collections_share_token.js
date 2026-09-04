migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('collections')

    if (!col.fields.getByName('share_token')) {
      col.fields.add(new TextField({ name: 'share_token', required: false }))
    }

    // Unique only among non-empty tokens — multiple collections may share an
    // empty value when sharing is disabled (SQLite partial unique index).
    col.addIndex('idx_collections_share_token', true, 'share_token', "share_token != ''")

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('collections')
    try {
      col.removeIndex('idx_collections_share_token')
    } catch (_) {}
    const f = col.fields.getByName('share_token')
    if (f) col.fields.remove(f)
    app.save(col)
  },
)
