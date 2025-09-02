const script = `
#/bin/bash -e
# Checkout $INPUT_BRANCH branch under .$INPUT_BRANCH

if ! git config --get-regexp user.
then
  git config user.email "$INPUT_GIT_AUTHOR_EMAIL"
  git config user.name "$INPUT_GIT_AUTHOR_NAME"
fi

if ! grep -Fxq ".$INPUT_BRANCH/" .gitignore
then
  echo "Please make sure .$INPUT_BRANCH/ is present in .gitignore"
  exit 1
fi


if git fetch origin "$INPUT_BRANCH"
then
  # $INPUT_BRANCH branch already exists
  git worktree add -b "$INPUT_BRANCH" "./.$INPUT_BRANCH" "origin/$INPUT_BRANCH"
else
  # $INPUT_BRANCH branch doesn't exist yet
  echo "Creating $INPUT_BRANCH branch..."
  git worktree add --detach "./.$INPUT_BRANCH/"
  cd "./.$INPUT_BRANCH/"
  git checkout --orphan "$INPUT_BRANCH"
  git reset --hard
  cd ..
fi
`;
const { spawn } = require('child_process');

const branch = process.env.INPUT_BRANCH || 'state';
const backup = process.env.INPUT_BACKUP || '100';
const authorEmail = process.env.INPUT_GIT_AUTHOR_EMAIL || '';
const authorName = process.env.INPUT_GIT_AUTHOR_NAME || '';

if (!/^[A-Za-z0-9-]+$/.test(branch)) {
  console.error('Invalid INPUT_BRANCH');
  process.exit(1);
}
if (!/^[0-9]+$/.test(backup)) {
  console.error('Invalid INPUT_BACKUP');
  process.exit(1);
}
if (authorEmail && !/^[A-Za-z0-9@._+-]+$/.test(authorEmail)) {
  console.error('Invalid INPUT_GIT_AUTHOR_EMAIL');
  process.exit(1);
}
if (authorName && !/^[A-Za-z0-9 _.-]+$/.test(authorName)) {
  console.error('Invalid INPUT_GIT_AUTHOR_NAME');
  process.exit(1);
}

process.env.INPUT_BRANCH = branch;
process.env.INPUT_BACKUP = backup;
process.env.INPUT_GIT_AUTHOR_EMAIL = authorEmail;
process.env.INPUT_GIT_AUTHOR_NAME = authorName;

const run = spawn('bash', ['-e'], { env: process.env });

run.stdin.write(script);
run.stdin.end();

run.stdout.on('data', (data) => {
  process.stdout.write(data);
});
run.stderr.on('data', (data) => {
  process.stderr.write(data);
});
run.on('close', (code) => {
  if (code !== 0) {
    process.exit(code);
  }
});
run.on('error', (error) => {
  console.error(`spawn error: ${error}`);
  process.exit(1);
});
