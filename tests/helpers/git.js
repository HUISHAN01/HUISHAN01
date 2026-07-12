/**
 * Git helper function
 * Automates git workflow: stage, commit, push, and create PR
 */
const { execSync } = require('child_process');

async function gitCommitAndPush(message, branchName = 'feature/automation') {
  try {
    // Stage all changes
    console.log('Staging changes...');
    execSync('git add .', { stdio: 'inherit' });

    // Create commit
    console.log(`Committing: ${message}`);
    execSync(`git commit -m "${message}"`, { stdio: 'inherit' });

    // Create/switch to feature branch
    console.log(`Switching to branch: ${branchName}`);
    execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });

    // Push to remote
    console.log('Pushing to remote...');
    execSync(`git push origin ${branchName}`, { stdio: 'inherit' });

    console.log('✅ Changes pushed! Now create a PR on GitHub or run:');
    console.log(`gh pr create --title "${message}" --body "Test automation changes"`);
  } catch (error) {
    console.error('❌ Git operation failed:', error.message);
    throw error;
  }
}

async function gitCreatePR(title, body = 'Automation test changes') {
  try {
    console.log(`Creating PR: ${title}`);
    execSync(`gh pr create --title "${title}" --body "${body}"`, { stdio: 'inherit' });
    console.log('✅ PR created successfully!');
  } catch (error) {
    console.error('❌ Failed to create PR. Make sure GitHub CLI (gh) is installed:', error.message);
    throw error;
  }
}

module.exports = { gitCommitAndPush, gitCreatePR };
