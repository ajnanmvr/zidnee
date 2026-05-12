#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative, sep } from 'path';

const repoRoot = process.cwd();
const distRoot = join(repoRoot, 'dist');

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.isFile() && full.endsWith('.js')) processFile(full);
  }
}

function processFile(file) {
  let src = readFileSync(file, 'utf8');
  const importAliasRegex = /(["'`])@\/(.+?)\1/g;
  let changed = false;
  src = src.replace(importAliasRegex, (m, quote, pathAfter) => {
    const target = join(distRoot, 'src', pathAfter.replace(/\\.ts$|\\.js$/,''));
    // try with .js
    const targetJs = target.endsWith('.js') ? target : target + '.js';
    const rel = relative(dirname(file), targetJs).split(sep).join('/');
    const fixed = `${quote}${rel.startsWith('.') ? rel : './' + rel}${quote}`;
    changed = true;
    return fixed;
  });
  if (changed) writeFileSync(file, src, 'utf8');
}

walk(distRoot);
console.log('fixed aliases in dist');
