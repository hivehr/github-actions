import { info, getInput, setFailed } from "@actions/core";
import { context, GitHub } from "@actions/github";

const parseTitle = (title: string, oldTitle: string) => {
    if (title == null || title === "") {
        return undefined;
    }

    // Take care not to remove an WIP: prefixes
    if (oldTitle.startsWith("WIP")) {
        return `WIP: ${title}`;
    }

    return title;
};

const parseBody = (
    body: string,
    prefix: string,
    suffix: string,
    currentBody = ""
) => {
    if (body != null && body !== "") {
        return body;
    }

    let newBody = currentBody;

    if (prefix != null && prefix !== "" && !newBody.startsWith(prefix)) {
        newBody = prefix + newBody;
    }
    if (suffix != null && suffix !== "" && !newBody.endsWith(suffix)) {
        newBody += suffix;
    }

    return newBody;
};

const parseLabels = (
    addLabels: string,
    removeLabels: string,
    currentLabels: string[],
    delimiter = ","
) => {
    if (
        (addLabels == null || addLabels === "") &&
        (removeLabels == null || removeLabels === "")
    ) {
        return undefined;
    }

    const labels = new Set([...currentLabels, ...addLabels.split(delimiter)]);
    removeLabels.split(delimiter).forEach(l => labels.delete(l));

    return Array.from(labels);
};

const parseInputs = (pull_request: any) => ({
    title: parseTitle(getInput("title"), pull_request!.title),

    body: parseBody(
        getInput("body"),
        getInput("prefixBody"),
        getInput("suffixBody"),
        pull_request!.body
    ),

    labels: parseLabels(
        getInput("addLabels"),
        getInput("removeLabels"),
        pull_request!.labels.map(({ name }: any) => name)
    )
});

async function main() {
    const {
        repo: { owner, repo },
        payload: { pull_request }
    } = context;

    // Grab and parse inputs
    const inputs = parseInputs(pull_request);
    info(`Updating PR: ${JSON.stringify(inputs)}`);

    // Setup GitHub client with the given GITHUB_TOKEN
    const client = new GitHub(getInput("repo-token"));

    // Update PR with given inputs
    await client.pulls.update({
        owner,
        repo,
        title: inputs.title,
        body: inputs.body,
        pull_number: pull_request!.number
    });

    // Update related PR issue with given labels
    const { labels } = inputs;
    if (labels != null) {
        await client.issues.update({
            owner,
            repo,
            labels,
            issue_number: pull_request!.number
        });
    }
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
