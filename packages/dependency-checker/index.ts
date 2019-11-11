import { getInput, setFailed } from "@actions/core";
import { context, GitHub } from "@actions/github";

async function main() {
  const {
    repo: { owner, repo },
    payload: { pull_request }
  } = context;

  // Setup GitHub client with the given GITHUB_TOKEN
  const client = new GitHub(getInput("repo-token"));

  // 1. Get a list of all the commits on the PR.
  const commits = await client.pulls.listCommits({
    owner,
    repo,
    pull_number: pull_request!.number
  });

  // 2. Locate the latest commit
  const lastCommit = commits[commits.length - 1];

  // 3. Add a comment to the latest commit
  await client.pulls.createComment({
    owner,
    repo,
    pull_number: pull_request!.number,
    commit_id: lastCommit.sha,
    path: "./package.json",
    body: "This is an example comment"
  });
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
