// A native-only bundle. GitHub Pages continues to use source ES modules.
import { build } from 'esbuild';
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'www');
if (dirname(output) !== resolve(root) || output !== resolve(root, 'www')) throw new Error('Unexpected build directory');
await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'js'), { recursive: true });
for (const name of ['index.html', 'manifest.webmanifest', 'css', 'icons']) {
  await cp(join(root, name), join(output, name), { recursive: true });
}
await build({
  entryPoints: [join(root, 'js/bootstrap.js')], outfile: join(output, 'js/bootstrap.js'),
  bundle: true, format: 'esm', platform: 'browser', target: 'chrome110', minify: true, sourcemap: false,
});
const config = JSON.parse(await readFile(join(root, 'capacitor.config.json'), 'utf8'));
if (config.server?.url) throw new Error('Native builds must bundle assets, not point to a development server');
console.log('Native web assets built in www/');
