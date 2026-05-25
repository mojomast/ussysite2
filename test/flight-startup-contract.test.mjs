import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('main lazily imports flight runtime after launch code', async () => {
  const source = await readFile(new URL('../js/main.js', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /^import\s+.*['"]\.\/flight\/runtime\.js['"]/m);
  assert.match(source, /import\('\.\/flight\/runtime\.js'\)/);
  assert.match(source, /DOMContentLoaded/);
});

test('index uses classic Three runtime without addon imports', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /three\.min\.js/);
  assert.doesNotMatch(html, /three\/addons/);
  assert.match(html, /id="flight-loading-overlay"/);
});
