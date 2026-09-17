import { build } from 'esbuild';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const dist = path.join(root, 'dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(path.join(dist, 'build'), { recursive: true });

await build({
  entryPoints: [path.join(root, 'src', 'background.ts')],
  bundle: true,
  outfile: path.join(dist, 'build', 'background.js'),
  format: 'iife',
  target: 'es2022',
  sourcemap: false,
  logLevel: 'info',
});

for (const target of ['chrome', 'firefox']) {
  const out = path.join(dist, target);
  mkdirSync(out, { recursive: true });
  copyFileSync(path.join(dist, 'build', 'background.js'), path.join(out, 'background.js'));
  copyFileSync(path.join(root, 'manifests', `${target}.json`), path.join(out, 'manifest.json'));
  console.log(`[extension] built ${target} -> extensions/anywhere/dist/${target}/`);
}