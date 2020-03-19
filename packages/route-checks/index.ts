import { promisify } from "util";
import child_process from "child_process";
import fs from "fs";
import { generateMd } from "./createReadMe";
const exec = promisify(child_process.exec);
import github from "@actions/github";
import core from "@actions/core";

interface User {
    login: string;
}

interface Repository {
    owner: User;
    name: string;
}

interface Commit {
    sha: string;
    ref: string;
}

interface PullRequest {
    head: Commit;
}

interface Event {
    action: string;
    repository: Repository;
    pull_request: PullRequest;
    number: number;
}
const run = async (event: Event) => {
    // Run app through babel plugin
    try {
        await exec(`yarn checkRoutes`);
        //No changes made
    } catch (e) {
        const md = generateMd("./routes");
        const owner = event.repository.owner.login;
        const repo = event.repository.name;
        const mostRecentCommitSHA = event.pull_request.head.sha;

        const gh = new github.GitHub(core.getInput("GITHUB_TOKEN"));

        const routeFiles = fs.readdirSync("./routes");
        let fileBlobs = await Promise.all(
            routeFiles.map(async routeFile => {
                const blob = await gh.git.createBlob({
                    owner,
                    repo,
                    content: fs.readFileSync(routeFile).toString(),
                    encoding: "utf-8"
                });

                return {
                    path: routeFile,
                    type: "blob",
                    mode: "100644",
                    sha: blob.data.sha
                };
            })
        );

        const mdFileBlob = await gh.git.createBlob({
            owner,
            repo,
            content: md,
            encoding: "utf-8"
        });

        fileBlobs = [
            ...fileBlobs,
            {
                path: "/doc/Routes.md",
                type: "blob",
                mode: "100644",
                sha: mdFileBlob.data.sha
            }
        ];

        const latestCommit = await gh.git.getCommit({
            owner,
            repo,
            commit_sha: mostRecentCommitSHA
        });

        const baseTree = latestCommit.data.tree.sha;

        const newTree = await gh.git.createTree({
            owner,
            repo,
            base_tree: baseTree,
            tree: fileBlobs as any[]
        });

        const commit = await gh.git.createCommit({
            owner,
            repo,
            message: "Updated the documentation on the route files",
            tree: newTree.data.sha,
            parents: [mostRecentCommitSHA]
        });

        await gh.git.updateRef({
            owner,
            repo,
            ref: `heads/${event.pull_request.head.ref}`,
            sha: commit.data.sha
        });

        await gh.issues.createComment({
            owner,
            repo,
            number: event.number,
            body: fs
                .readFileSync(`${process.cwd()}/templates/pr_comment.md`)
                .toString()
        });
    }
};

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_EVENT_NAME = process.env.GITHUB_EVENT_NAME;

if (!GITHUB_TOKEN) {
    console.log("::error:: You must enable the GITHUB_TOKEN secret");
    process.exit(1);
}

const main = async () => {
    // Bail out if the event that executed the action wasn’t a pull_request
    if (GITHUB_EVENT_NAME !== "pull_request") {
        console.log("::error:: This action only runs for pushes to PRs");
        process.exit(78);
    }

    // Bail out if the pull_request event wasn't synchronize or opened
    const event = JSON.parse(
        fs.readFileSync(process.env.GITHUB_EVENT_PATH || "").toString()
    );
    if (event.action !== "synchronize" && event.action !== "opened") {
        console.log(
            "::error:: Check run has action",
            event.action,
            ". Wants: synchronize or opened"
        );
        process.exit(78);
    }

    await run(event);
};

main();
