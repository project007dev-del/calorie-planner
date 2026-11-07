import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { BUILTIN_FOODS } from '../js/foods.js';
import { foodVisualKind, foodVisual } from '../js/food-visuals.js';

test('all built-in food illustrations exist in one small offline SVG asset', async () => {
  const bytes = await readFile(new URL('../icons/foods.svg', import.meta.url));
  const ids = new Set([...bytes.toString().matchAll(/<symbol id="([a-z_]+)"/g)].map((m) => m[1]));
  for (const food of BUILTIN_FOODS) {
    const kind = foodVisualKind(food);
    assert.ok(ids.has(kind), `${food.id} needs an illustration`);
    assert.notEqual(kind, 'plate', `${food.id} should have a specific built-in illustration`);
  }
  assert.ok(bytes.length < 8192, 'keep the complete food illustration sheet below 8 KiB');
  assert.ok(gzipSync(bytes).length < 3072, 'keep its compressed payload below 3 KiB');
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes("'./icons/foods.svg'"));
});

test('custom and deleted foods get safe fallbacks without changing any food data', () => {
  const food = { id: 'my_food', name: 'My lunch', category: 'veg', raw: { kcal: 80 } };
  const before = structuredClone(food);
  assert.equal(foodVisualKind(food), 'leaf');
  assert.equal(foodVisualKind({ id: 'deleted_food' }), 'plate');
  assert.equal(foodVisualKind({ id: 'constructor', category: '__proto__' }), 'plate');
  assert.equal(foodVisualKind({ id: 'entry123', foodId: 'chicken_breast' }), 'chicken');
  const html = foodVisual({ id: '\"><script>', category: 'unknown' }, '\" onclick="x');
  assert.ok(html.includes('icons/foods.svg#plate'));
  assert.ok(!html.includes('onclick') && !html.includes('<script>'));
  foodVisual(food);
  assert.deepEqual(food, before);
});
