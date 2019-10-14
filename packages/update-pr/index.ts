import { getInput, debug, setFailed } from "@actions/core";
import { GitHub, context } from "@actions/github";

const {
    repo: { owner, repo },
    payload: { pull_request }
} = context;

const parseTitle = (oldTitle: string, title: string) => {
    if (title == null || title === "") {
        return undefined;
    }

    // Take care not to remove an WIP: prefixes
    if (oldTitle.startsWith("WIP")) {
        return `WIP: ${title}`;
    }

    return title;
};

async function main() {
    const client = new GitHub(getInput("repo-token"));

    // Parse new title
    const title = parseTitle(pull_request!.title, getInput("title"));
    debug(`title: ${title}`);

    await client.pulls.update({
        owner,
        repo,
        title,
        number: pull_request!.number
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
