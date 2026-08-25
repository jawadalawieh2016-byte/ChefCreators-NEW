# Recipe Migration Report

Generated from `ChefCreators_Latest_Updated_YouTube (1).html`.

- Legacy default recipe count: 24
- Legacy traditional/world recipe count: 115
- Legacy recipe count: 139
- Migrated recipe count: 139
- Free recipes assigned: 70
- Pro recipes assigned: 69
- Duplicate IDs: none
- Missing category definitions after migration: none

Differences:

- Added explicit `accessTier` using the legacy first-half-free rule.
- Added stable `sortOrder` from the original array order.
- Added `cuisine: "World"` where the legacy recipe omitted cuisine.
- Added missing category definitions for legacy `lunch` and `dinner` references so existing recipes render correctly.
- No recipe titles, icons, ingredients, steps, tips, heat/knife flags, age, time, servings, difficulty, cuisine, or traditional flags were rewritten.
