import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NativePreferenceMirror, initializeNative, isNativeRuntime } from '../js/native.js';

function cache(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
function preferences(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    get: async ({ key }) => ({ value: values.get(key) ?? null }),
    set: async ({ key, value }) => { values.set(key, value); },
    remove: async ({ key }) => { values.delete(key); },
  };
}

test('native startup restores persisted data and theme before the web working copy is read', async () => {
  const native = preferences({ 'planner.v1': '{"days":{"2026-11-07":{}}}', 'planner.theme': 'sand' });
  const web = cache({ 'planner.v1': '{"days":{}}' });
  await new NativePreferenceMirror(native, web).hydrate(['planner.v1', 'planner.theme']);
  assert.equal(web.getItem('planner.v1'), native.values.get('planner.v1'));
  assert.equal(web.getItem('planner.theme'), 'sand');
});

test('first native startup preserves an existing WebView copy when no native preference exists', async () => {
  const native = preferences();
  const web = cache({ 'planner.v1': '{"days":{"2026-11-07":{}}}' });
  await new NativePreferenceMirror(native, web).hydrate(['planner.v1', 'planner.theme']);
  assert.equal(native.values.get('planner.v1'), web.getItem('planner.v1'));
  assert.equal(native.values.has('planner.theme'), false);
});

test('a failed native read stops startup without replacing the working copy', async () => {
  const web = cache({ one: 'local-one', two: 'local-two' });
  const native = preferences({ one: 'native-one' });
  native.get = async ({ key }) => { if (key === 'two') throw new Error('device read failed'); return { value: 'native-one' }; };
  await assert.rejects(new NativePreferenceMirror(native, web).hydrate(['one', 'two']), /device read failed/);
  assert.equal(web.getItem('one'), 'local-one');
  assert.equal(web.getItem('two'), 'local-two');
});

test('slow earlier saves cannot overwrite newer logs', async () => {
  const native = preferences();
  const mirror = new NativePreferenceMirror(native, cache());
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const writes = [];
  native.set = async ({ key, value }) => {
    writes.push(value);
    if (value === 'older') await gate;
    native.values.set(key, value);
  };
  const first = mirror.write('planner.v1', 'older');
  const last = mirror.write('planner.v1', 'newer');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(writes, ['older']);
  release();
  await Promise.all([first, last, mirror.flush()]);
  assert.equal(native.values.get('planner.v1'), 'newer');
});

test('failed writes report failure and a later save can recover; theme removal persists', async () => {
  const native = preferences({ 'planner.theme': 'sand' });
  const mirror = new NativePreferenceMirror(native, cache());
  native.set = async () => { throw new Error('device full'); };
  await assert.rejects(mirror.write('planner.v1', 'first'), /device full/);
  native.set = async ({ key, value }) => { native.values.set(key, value); };
  await mirror.write('planner.v1', 'recovered');
  await mirror.write('planner.theme', null);
  await mirror.flush();
  assert.equal(native.values.get('planner.v1'), 'recovered');
  assert.equal(native.values.has('planner.theme'), false);
});

test('the browser can start without loading any native plugin', async () => {
  assert.equal(isNativeRuntime(), false);
  await initializeNative();
});
