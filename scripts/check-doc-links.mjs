import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const target = process.argv[2];
if (!target) {
  console.error('usage: node check-doc-links.mjs <markdown-file>');
  process.exit(2);
}

const text = readFileSync(target, 'utf8');
const dir = dirname(target);
const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;
const broken = [];
let match;
while ((match = linkRe.exec(text)) !== null) {
  const href = match[1];
  if (/^https?:\/\//.test(href) || href.startsWith('#')) continue;
  const clean = href.split('#')[0];
  if (!clean) continue;
  const resolved = resolve(dir, clean);
  if (!existsSync(resolved)) broken.push(href);
}

if (broken.length > 0) {
  console.error(`${broken.length} broken link(s) in ${target}:`);
  for (const b of broken) console.error(`  - ${b}`);
  process.exit(1);
}
console.log(`OK: all links in ${target} resolve.`);
process.exit(0);
