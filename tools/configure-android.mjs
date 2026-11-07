import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const parts = version.split('.').map(Number);
if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 99)) throw new Error('Android needs a numeric major.minor.patch version');
const versionCode = parts[0] * 10000 + parts[1] * 100 + parts[2];
const gradlePath = join(root, 'android/app/build.gradle');
const gradle = await readFile(gradlePath, 'utf8');
if (!/versionCode \d+/.test(gradle) || !/versionName "[^"]+"/.test(gradle)) throw new Error('Android version fields were not found');
await writeFile(gradlePath, gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`).replace(/versionName "[^"]+"/, `versionName "${version}"`));
for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
    await copyFile(join(root, 'icons/icon-512.png'), join(root, `android/app/src/main/res/mipmap-${density}`, name));
  }
}
console.log(`Android version ${version} (${versionCode}); planner launcher icons applied`);
