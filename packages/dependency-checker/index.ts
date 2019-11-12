import { getInput, setFailed } from "@actions/core";
import { context, GitHub } from "@actions/github";
import execa from "execa";

const getRemotes = async () => {
  // 1. Add Universe as remote.
  console.log("Running git remote -v");

  const { stdout } = await execa.command(`git remote  -v`, {
    shell: true
  });
  console.log("REMOTES:::::", stdout);
};

const addUniverseRemote = async () => {
  // 1. Add Universe as remote.
  console.log(
    "Running git remote add b https://github.com/hivehr/universe.git"
  );

  await execa.command(
    `git remote add b https://github.com/hivehr/universe.git`,
    {
      shell: true
    }
  );
  console.log("Running git remote update");

  // 2. Update remote
  await execa.command(`git remote update`, {
    shell: true
  });

  return;
};
const removeUniverseRemote = async () => {
  // 1. Add Universe as remote.
  console.log("Running git remote rm b");

  await execa.command(`git remote rm b`, {
    shell: true
  });

  return;
};

const getDiff = async () => {
  console.log("GITHUB_BASE_REF", process.env.GITHUB_BASE_REF);
  console.log("GITHUB_HEAD_REF", process.env.GITHUB_HEAD_REF);

  await getRemotes();

  // 1. Add Universe Remote to make diff work
  await addUniverseRemote();
  console.log(
    `Running git diff remotes/b/${process.env.GITHUB_BASE_REF} remotes/b/${process.env.GITHUB_HEAD_REF}`
  );
  // 2. Get Diff
  const { stdout } = await execa.command(
    `git diff remotes/b/${process.env.GITHUB_BASE_REF} remotes/b/${process.env.GITHUB_HEAD_REF}`,
    {
      shell: true
    }
  );

  console.log(stdout);

  // 3. Remove remote
  await removeUniverseRemote();
};

async function main() {
  // const {
  //   repo: { owner, repo },
  //   payload: { pull_request }
  // } = context;

  // 1. Setup GitHub client with the given GITHUB_TOKEN
  // const client = new GitHub(getInput("repo-token"));

  await getDiff();

  // 2. Check if any package.json files have changes
  // const files = await client.pulls.listFiles({
  //   owner,
  //   repo,
  //   pull_number: pull_request!.number
  // });

  // 3. Identify package.json files with changes
  // const packageJsonFiles = files.filter(
  //   ({ filename, changes }) => filename === "package.json"
  // );

  // 4. If no changes - exit early
  // if (packageJsonFiles.length === 0) {
  //   return;
  // }

  // 5. Get a list of all the commits on the PR. (Do we care about this?)
  // const commits = await client.pulls.listCommits({
  //   owner,
  //   repo,
  //   pull_number: pull_request!.number
  // });

  // console.log(commits);

  // // 6. Locate the latest commit. (Do we care about this?)
  // const lastCommit = commits[commits.length - 1];

  // 7. Add a comment to the latest commit (Do we just add a comment to the PR instead?)
  // await client.pulls.createComment({
  //   owner,
  //   repo,
  //   pull_number: pull_request!.number,
  //   commit_id: lastCommit.sha,
  //   position: 1,
  //   path: "./package.json",
  //   body: `Dependencys have changed\s\s`
  //   // ${JSON.stringify(packageJsonFiles, null, 2)}`
  // });
}

if (require.main === module) {
  (async () => {
    try {
      await main();
      process.exit(0);
    } catch (err) {
      setFailed(err.message);
      process.exit(1);
    }
  })();
}
