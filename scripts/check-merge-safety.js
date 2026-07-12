#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = process.cwd();

function run(command) {
  return execSync(command, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function branchExists(ref) {
  try {
    run(`git rev-parse --verify ${ref}`);
    return true;
  } catch (error) {
    return false;
  }
}

function getBaseBranch() {
  const candidates = ['origin/main', 'main', 'origin/master', 'master'];
  for (const candidate of candidates) {
    if (branchExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

function collectChangedFiles(baseRef) {
  const mergeBase = run(`git merge-base ${baseRef} HEAD`);
  const files = run(`git diff --name-only ${mergeBase}...HEAD`)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return { mergeBase, files };
}

function collectMainChangedFiles(baseRef, mergeBase) {
  const files = run(`git diff --name-only ${mergeBase}...${baseRef}`)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return files;
}

function findConflictMarkers(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  return /^(<<<<<<<|=======|>>>>>>>)\s/m.test(contents);
}

try {
  run('git rev-parse --is-inside-work-tree');
} catch (error) {
  console.error('This folder is not a Git repository.');
  process.exit(1);
}

const currentBranch = run('git branch --show-current') || 'HEAD';
const baseBranch = getBaseBranch();

if (!baseBranch) {
  console.error('Could not find a main or master branch to compare against.');
  process.exit(1);
}

const { mergeBase, files: branchFiles } = collectChangedFiles(baseBranch);
const mainFiles = collectMainChangedFiles(baseBranch, mergeBase);
const overlaps = branchFiles.filter((file) => mainFiles.includes(file));
const conflictMarkerFiles = branchFiles.filter((file) => findConflictMarkers(path.join(rootDir, file)));

console.log(`Current branch: ${currentBranch}`);
console.log(`Base branch: ${baseBranch}`);
console.log(`Merge base: ${mergeBase}`);
console.log(`Files changed on this branch: ${branchFiles.length}`);
console.log(`Files changed on ${baseBranch}: ${mainFiles.length}`);

if (!branchFiles.length) {
  console.log('No branch-only file changes detected.');
  process.exit(0);
}

if (overlaps.length) {
  console.error('Potential merge conflict risk: these files were changed on both your branch and the base branch.');
  overlaps.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

if (conflictMarkerFiles.length) {
  console.error('Conflict markers were found in the following files:');
  conflictMarkerFiles.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log('No overlapping file changes detected. This branch looks merge-safe against the current base branch.');
