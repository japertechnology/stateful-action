const script = `
#/bin/bash -e
# Commit changes on $INPUT_BRANCH branch and squash old commits

cd "./.$INPUT_BRANCH/"

git add .

if ! git commit -m "$INPUT_BRANCH update"
then
  echo "$INPUT_BRANCH didn't change"
else
  # Push new commit
  git push origin "$INPUT_BRANCH"

  # Squash all the commits except last $INPUT_BACKUP
  export N=$(($(git rev-list --count "$INPUT_BRANCH" --) - $INPUT_BACKUP))
  if (( $N > 0 ))
  then
    echo "Squashing $N commits"
    EDITOR="sed -i '1,100 ! s/^pick/fixup/'" git rebase -i --root "$INPUT_BRANCH" --keep-empty
    git push -f origin "$INPUT_BRANCH"
  fi
fi

# Cleanup
cd ..
git worktree remove "./.$INPUT_BRANCH"
git branch -D "$INPUT_BRANCH"

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
