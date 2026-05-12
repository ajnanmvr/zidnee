#!/usr/bin/env node
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');
let found = false;
let matches = [];

function walk(dir) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && full.endsWith('.js')) {
        const content = readFileSync(full, 'utf8');
        if (content.includes('@/')) {
          found = true;
          matches.push(full);
        }
      }
    }
  } catch (e) {}
}

walk(distDir);

if (found) {
  console.error('❌ ERROR: Path aliases (@/) found in dist/. Must use relative imports:');
  matches.forEach(f => console.error(`  ${f}`));
  process.exit(1);
}

console.log('✓ No path aliases in dist/');
process.exit(0);
