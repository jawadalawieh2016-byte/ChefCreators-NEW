import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'ChefCreators_Latest_Updated_YouTube (1).html'), 'utf8');
const scriptMatch = html.match(/const CATS = [\s\S]*?WORLD_RECIPES\.forEach\(r => \{ r\.traditional = true; \}\);/);
assert.ok(scriptMatch, 'legacy recipe script block exists');

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${scriptMatch[0]}\nglobalThis.__chefData = { DEFAULT_RECIPES, WORLD_RECIPES };`, sandbox);

function kidFriendlySteps(steps = []) {
  if (!Array.isArray(steps) || steps.length !== 1) return steps;
  return steps[0]
    .split(/(?<=[.!?])\s+/)
    .map((step) => step.trim())
    .filter(Boolean);
}

const legacy = [...sandbox.__chefData.DEFAULT_RECIPES, ...sandbox.__chefData.WORLD_RECIPES].map((r) => ({
  ...r,
  steps: kidFriendlySteps(r.steps),
  cuisine: r.cuisine || 'World',
  traditional: Boolean(r.traditional)
}));
const migrated = JSON.parse(fs.readFileSync(path.join(root, 'packages/shared/src/recipes.json'), 'utf8'));

assert.equal(migrated.length, legacy.length, 'recipe count');
for (let i = 0; i < legacy.length; i += 1) {
  const a = legacy[i];
  const b = migrated[i];
  for (const field of ['id', 'title', 'icon', 'category', 'cuisine', 'difficulty', 'age', 'time', 'servings', 'tips', 'needsHeat', 'needsKnife', 'traditional']) {
    assert.deepEqual(b[field], a[field], `${a.id}.${field}`);
  }
  assert.deepEqual(b.ingredients, a.ingredients, `${a.id}.ingredients`);
  assert.deepEqual(b.steps, a.steps, `${a.id}.steps`);
  assert.equal(b.sortOrder, i, `${a.id}.sortOrder`);
  assert.ok(['free', 'pro'].includes(b.accessTier), `${a.id}.accessTier`);
}

console.log(`Recipe migration verified: ${migrated.length} recipes, no content loss.`);
