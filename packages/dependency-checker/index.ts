import { getInput, setFailed } from "@actions/core";
import { context, GitHub } from "@actions/github";
import { exec } from "child_process";

async function main() {
  const {
    repo: { owner, repo },
    payload: { pull_request }
  } = context;

  // 1. Setup GitHub client with the given GITHUB_TOKEN
  const client = new GitHub(getInput("repo-token"));
  console.log("GITHUB_BASE_REF", process.env.GITHUB_BASE_REF);
  console.log("GITHUB_HEAD_REF", process.env.GITHUB_HEAD_REF);

  exec(
    `git diff ${process.env.GITHUB_BASE_REF} ${process.env.GITHUB_HEAD_REF}`,
    (err, stdout, stderr) => {
      if (err) {
        // node couldn't execute the command
        return;
      }

      // the *entire* stdout and stderr (buffered)
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
    }
  );

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
  const commits = await client.pulls.listCommits({
    owner,
    repo,
    pull_number: pull_request!.number
  });

  console.log(commits);

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
