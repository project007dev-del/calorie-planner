import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { allExercises } from '../js/plan.js';
import { EXERCISE_GUIDES } from '../js/exercise-guides.js';

test('every library exercise has a legible diagram available in the offline shell', async () => {
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const images = new Set();
  for (const exercise of allExercises()) {
    const guide = EXERCISE_GUIDES[exercise.id];
    assert.ok(guide?.description, `${exercise.id} needs a movement guide`);
    const data = await readFile(new URL(`../${guide.image}`, import.meta.url));
    assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a', `${exercise.id} must be a PNG`);
    assert.ok(data.readUInt32BE(16) >= 900 && data.readUInt32BE(20) >= 360, 'diagrams must be large enough to enlarge');
    assert.ok(sw.includes(`'./${guide.image}'`), `${exercise.id} must work offline`);
    images.add(guide.image);
  }
  assert.equal(images.size, allExercises().length);
  assert.ok(EXERCISE_GUIDES.arms_superset.extraImage, 'the superset must also show the curl');
});
