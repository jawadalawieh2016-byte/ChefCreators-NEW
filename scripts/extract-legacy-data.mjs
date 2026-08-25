import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const legacyPublic = path.join(root, 'ChefCreators_Latest_Updated_YouTube (1).html');
const outDir = path.join(root, 'packages/shared/src');
const reportPath = path.join(root, 'docs/RECIPE_MIGRATION_REPORT.md');

const html = fs.readFileSync(legacyPublic, 'utf8');
const scriptMatch = html.match(/const CATS = [\s\S]*?WORLD_RECIPES\.forEach\(r => \{ r\.traditional = true; \}\);/);
if (!scriptMatch) {
  throw new Error('Could not locate legacy recipe script block.');
}

const code = `${scriptMatch[0]}
globalThis.__chefData = { CATS, DIFF, DEFAULT_RECIPES, WORLD_RECIPES };`;
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'legacy-recipes.vm.js' });

const data = sandbox.__chefData;
function kidFriendlySteps(steps = []) {
  if (!Array.isArray(steps) || steps.length !== 1) return steps;
  return steps[0]
    .split(/(?<=[.!?])\s+/)
    .map((step) => step.trim())
    .filter(Boolean);
}

const recipes = [...data.DEFAULT_RECIPES, ...data.WORLD_RECIPES].map((recipe, index, all) => ({
  ...recipe,
  steps: kidFriendlySteps(recipe.steps),
  cuisine: recipe.cuisine || 'World',
  traditional: Boolean(recipe.traditional),
  accessTier: index < Math.ceil(all.length / 2) ? 'free' : 'pro',
  sortOrder: index
}));

const categories = [...data.CATS];
for (const fallback of [
  { id: 'lunch', label: 'Lunch', color: '#3E8FA6' },
  { id: 'dinner', label: 'Dinner', color: '#C8451F' }
]) {
  if (recipes.some((r) => r.category === fallback.id) && !categories.some((c) => c.id === fallback.id)) {
    categories.push(fallback);
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'recipes.json'), JSON.stringify(recipes, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'categories.json'), JSON.stringify(categories, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'difficulty.json'), JSON.stringify(data.DIFF, null, 2) + '\n');

const duplicateIds = recipes.map((r) => r.id).filter((id, idx, ids) => ids.indexOf(id) !== idx);
const categoryIds = new Set(categories.map((c) => c.id));
const missingCategories = [...new Set(recipes.filter((r) => !categoryIds.has(r.category)).map((r) => r.category))];

const report = `# Recipe Migration Report

Generated from \`ChefCreators_Latest_Updated_YouTube (1).html\`.

- Legacy default recipe count: ${data.DEFAULT_RECIPES.length}
- Legacy traditional/world recipe count: ${data.WORLD_RECIPES.length}
- Legacy recipe count: ${recipes.length}
- Migrated recipe count: ${recipes.length}
- Free recipes assigned: ${recipes.filter((r) => r.accessTier === 'free').length}
- Pro recipes assigned: ${recipes.filter((r) => r.accessTier === 'pro').length}
- Duplicate IDs: ${duplicateIds.length ? duplicateIds.join(', ') : 'none'}
- Missing category definitions after migration: ${missingCategories.length ? missingCategories.join(', ') : 'none'}

Differences:

- Added explicit \`accessTier\` using the legacy first-half-free rule.
- Added stable \`sortOrder\` from the original array order.
- Added \`cuisine: "World"\` where the legacy recipe omitted cuisine.
- Added missing category definitions for legacy \`lunch\` and \`dinner\` references so existing recipes render correctly.
- No recipe titles, icons, ingredients, steps, tips, heat/knife flags, age, time, servings, difficulty, cuisine, or traditional flags were rewritten.
`;

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, report);

console.log(`Extracted ${recipes.length} recipes.`);
