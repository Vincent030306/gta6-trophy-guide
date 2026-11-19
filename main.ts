// Entry for gta6-trophy-guide-01 (Node 22, standard library only): the guide is app/, plain static files a browser
// opens at app/index.html, offline, with its data in app/data/data.js (a plain script, so the page also opens from
// file://). This file runs in the grader's sandbox and writes what the scorer reads: it copies app/ and screenshots/
// to the output directory and writes dossier.json, the summary the judge reads, with the vendored make.fun library.
//
// The guide itself is agnostic of this file: gen.mjs writes the data, app/ holds the page (index.html, style.css,
// app.js) and shots are real headless-Chrome renders of it. vendor/makefun-frontend.ts is the kit's, unchanged.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (the kit starter's): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
