import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const repoLicense = resolve(root, '../../LICENSE');
if (existsSync(repoLicense)) copyFileSync(repoLicense, resolve(root, 'dist/LICENSE'));
