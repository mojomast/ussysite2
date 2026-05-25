import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('main lazily imports flight runtime after launch code', async () => {
  const source = await readFile(new URL('../js/main.js', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /^import\s+.*['"]\.\/flight\/runtime\.js['"]/m);
  assert.match(source, /import\('\.\/flight\/runtime\.js'\)/);
  assert.match(source, /launchBuffer === 'ussy'/);
});

test('index uses ESM Three singleton bootstrap only', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /three\.min\.js/);
  assert.match(html, /import \* as THREE from 'three';/);
  assert.match(html, /globalThis\.THREE = THREE;/);
  assert.match(html, /id="flight-loading-overlay"/);
});
