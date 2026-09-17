import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, '..', 'src');
const dist = path.join(here, '..', 'dist');

mkdirSync(dist, { recursive: true });
copyFileSync(path.join(src, 'index.html'), path.join(dist, 'index.html'));
console.log('[app] copied index.html -> dist/');