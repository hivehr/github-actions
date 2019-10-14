import { getInput, debug, setFailed } from "@actions/core";
import { GitHub, context } from "@actions/github";

async function main() {
    const inputs = {
        title: getInput("title")
    };

    debug(`title: ${inputs.title}`);

    const client = new GitHub(getInput("repo-token"));

    await client.pulls.update({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: context.payload.pull_request!.number,
        title: inputs.title
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
