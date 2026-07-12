#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = process.cwd();
const debounceMs = 2500;
const ignoredDirs = new Set(['.git', 'node_modules', '.vscode', 'playwright-report', 'test-results']);
let debounceTimer = null;

function run(command) {
  return execSync(command, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function isIgnoredPath(targetPath) {
  const relativePath = path.relative(rootDir, targetPath);
  if (!relativePath || relativePath === '.') {
    return false;
  }

  const parts = relativePath.split(path.sep);
  return parts.some((part) => ignoredDirs.has(part));
}

function watchDir(dirPath) {
  if (!fs.existsSync(dirPath) || isIgnoredPath(dirPath)) {
    return;
  }

  try {
    fs.watch(dirPath, { persistent: true }, () => {
      scheduleRun();
    });
  } catch (error) {
    // Ignore watchers that cannot be created on some paths.
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (ignoredDirs.has(entry.name)) {
      continue;
    }

    watchDir(path.join(dirPath, entry.name));
  }
}

function scheduleRun() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    processChanges();
  }, debounceMs);
}

function commitAndPush() {
  try {
    const status = run('git status --porcelain');
    if (!status) {
      console.log('No file changes detected.');
      return;
    }

    console.log('Changes detected. Staging and committing...');
    run('git add -A');

    const message = `chore: auto-save ${new Date().toISOString()}`;
    try {
      run(`git commit -m "${message.replace(/"/g, '\\"')}"`);
      console.log('Commit created.');
    } catch (error) {
      console.log('Nothing new to commit.');
      return;
    }

    try {
      run('git remote get-url origin');
    } catch (error) {
      console.log('No origin remote configured. Set one with: git remote add origin <repo-url>');
      return;
    }

    console.log('Pushing changes...');
    run('git push origin HEAD');
    console.log('Push successful.');

    try {
      const branch = run('git branch --show-current').trim() || 'master';
      run(`gh pr list --head ${branch} --state open --json number >/dev/null 2>&1`);
      console.log('A pull request already exists for this branch.');
    } catch (error) {
      try {
        run(`gh pr create --head ${branch} --title "Auto-save changes" --body "Automated PR created by the workspace watcher."`);
        console.log('Pull request created.');
      } catch (prError) {
        console.log('GitHub CLI is not authenticated or PR creation failed.');
      }
    }
  } catch (error) {
    console.error('Automation failed:');
    console.error(error.message);
  }
}

function processChanges() {
  try {
    run('git rev-parse --is-inside-work-tree');
  } catch (error) {
    console.error('This folder is not a Git repository.');
    process.exit(1);
  }

  commitAndPush();
}

console.log(`Watching ${rootDir} for changes. Press Ctrl+C to stop.`);
watchDir(rootDir);
