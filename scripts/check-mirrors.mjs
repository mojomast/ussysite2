import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const mirrorPairs = [
  ['docs/ARCHITECTURE.md', 'web/out/docs/ARCHITECTURE.md'],
  ['docs/CHANGELOG.md', 'web/out/docs/CHANGELOG.md'],
  ['docs/GAMEPLAY.md', 'web/out/docs/GAMEPLAY.md'],
  ['index.css', 'web/out/index.css'],
  ['index.html', 'web/out/index.html'],
  ['js/economy', 'web/out/js/economy'],
  ['js/engine', 'web/out/js/engine'],
  ['js/input.js', 'web/out/js/input.js'],
  ['js/main.js', 'web/out/js/main.js'],
  ['js/ui', 'web/out/js/ui'],
  ['js/flight/runtime.js', 'web/out/js/flight/runtime.js'],
  ['js/flight/state.js', 'web/out/js/flight/state.js'],
  ['js/flight/missions.js', 'web/out/js/flight/missions.js'],
  ['js/flight/hud.js', 'web/out/js/flight/hud.js'],
  ['js/flight/autopilot.js', 'web/out/js/flight/autopilot.js'],
  ['js/flight/planets.js', 'web/out/js/flight/planets.js'],
  ['js/flight/starfield.js', 'web/out/js/flight/starfield.js'],
  ['js/flight/navgraph.js', 'web/out/js/flight/navgraph.js'],
];

async function pathType(relativePath) {
  try {
    const info = await stat(path.join(root, relativePath));
    if (info.isDirectory()) return 'directory';
    if (info.isFile()) return 'file';
    return 'other';
  } catch (error) {
    if (error.code === 'ENOENT') return 'missing';
    throw error;
  }
}

async function collectFiles(relativeDir) {
  const files = [];

  async function walk(currentDir, prefix) {
    const entries = await readdir(path.join(root, currentDir), { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      const relativeEntryPath = path.join(prefix, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath, relativeEntryPath);
      } else if (entry.isFile()) {
        files.push(relativeEntryPath.split(path.sep).join('/'));
      }
    }
  }

  await walk(relativeDir, '');
  return files;
}

async function filesMatch(left, right) {
  const [leftBytes, rightBytes] = await Promise.all([
    readFile(path.join(root, left)),
    readFile(path.join(root, right)),
  ]);
  return leftBytes.equals(rightBytes);
}

async function checkFilePair(left, right) {
  const [leftType, rightType] = await Promise.all([pathType(left), pathType(right)]);
  if (leftType !== 'file' || rightType !== 'file') {
    return [`${left} <-> ${right} (${leftType} vs ${rightType})`];
  }

  return (await filesMatch(left, right)) ? [] : [`${left} <-> ${right}`];
}

async function checkDirectoryPair(left, right) {
  const [leftType, rightType] = await Promise.all([pathType(left), pathType(right)]);
  if (leftType !== 'directory' || rightType !== 'directory') {
    return [`${left} <-> ${right} (${leftType} vs ${rightType})`];
  }

  const [leftFiles, rightFiles] = await Promise.all([collectFiles(left), collectFiles(right)]);
  const allFiles = [...new Set([...leftFiles, ...rightFiles])].sort((a, b) => a.localeCompare(b));
  const drifted = [];

  for (const file of allFiles) {
    const leftFile = path.posix.join(left, file);
    const rightFile = path.posix.join(right, file);
    const leftHasFile = leftFiles.includes(file);
    const rightHasFile = rightFiles.includes(file);

    if (!leftHasFile || !rightHasFile) {
      drifted.push(`${leftFile} <-> ${rightFile} (${leftHasFile ? 'file' : 'missing'} vs ${rightHasFile ? 'file' : 'missing'})`);
    } else if (!(await filesMatch(leftFile, rightFile))) {
      drifted.push(`${leftFile} <-> ${rightFile}`);
    }
  }

  return drifted;
}

const driftedPairs = [];

for (const [left, right] of mirrorPairs) {
  const leftType = await pathType(left);
  const rightType = await pathType(right);
  const results = leftType === 'directory' || rightType === 'directory'
    ? await checkDirectoryPair(left, right)
    : await checkFilePair(left, right);
  driftedPairs.push(...results);
}

if (driftedPairs.length > 0) {
  console.error('Mirror drift detected:');
  for (const pair of driftedPairs) {
    console.error(`- ${pair}`);
  }
  process.exitCode = 1;
} else {
  console.log('Mirror check passed.');
}
