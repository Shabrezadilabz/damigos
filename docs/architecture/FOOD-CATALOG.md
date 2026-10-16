# Food catalog (menu thumbnails)

Global `food_catalog` table maps canonical dish names → image URLs. CRM and guest APIs match imported menu item names against this catalog before falling back to keyword heuristics.

## Load data

```powershell
npm run db:migrate
npm run db:seed-food-catalog
```

Optional JSON merge:

```powershell
copy packages\db\data\food-catalog.custom.json.example packages\db\data\food-catalog.custom.json
# edit custom.json
npm run db:seed-food-catalog
```

Or import any JSON file:

```powershell
npm run db:import-food-catalog -- .\my-dishes.json
```

JSON shape:

```json
{
  "items": [
    {
      "name": "Chicken Dum Biryani",
      "cuisine": "indian",
      "category": "biryani",
      "isVeg": false,
      "imageKey": "biryaniNonVeg",
      "aliases": ["dum biryani"]
    }
  ]
}
```

Use `imageUrl` for a custom HTTPS photo, or `imageKey` from `packages/db/src/data/food-catalog-images.ts`.

## Hive Flux for unmatched menu items

After menu import, generate unique photos for rows with no catalog hit:

```powershell
npm run food-catalog:flux -- --limit 20
npm run food-catalog:flux -- --restaurant-id <uuid> --dry-run
```

Requires `HIVE_API_KEY` in root `.env`. Creates/updates `food_catalog` rows under cuisine `generated` and links `menu_items.food_catalog_id`.

## Code

- Schema: `packages/db/src/schema/index.ts` (`foodCatalog`)
- Matcher: `packages/db/src/food-catalog-match.ts`
- Seed sources: `food-catalog-entries.ts`, `food-catalog-bulk-entries.ts`, `packages/db/data/*.json`
