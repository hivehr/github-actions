import { debug, getInput, setFailed, info } from "@actions/core";
import Jira from "jira-connector";
import { JIRA_API_TOKEN, JIRA_BASE_URL, JIRA_USER_EMAIL } from "./env";
import { attempt } from "lodash";

interface Transition {
    id: string;
    name: string;
}

const jiraFactory = () =>
    new Jira({
        host: JIRA_BASE_URL!,
        strictSSL: true,
        basic_auth: {
            email: JIRA_USER_EMAIL,
            api_token: JIRA_API_TOKEN
        }
    });

const request = <T extends (...args: any[]) => any>(
    method: T
): ReturnType<T> => {
    try {
        return method();
    } catch (e) {
        debug(e);
        throw new Error(JSON.parse(e).body.errorMessages[0]);
    }
};

const assign = async (client: Jira, issueKey: string, assignee?: string) => {
    if (assignee == null || assignee === "") {
        return;
    }

    const result = await request(() =>
        client.user.search({
            username: assignee
        })
    );

    if (result == null || result.length < 1) {
        throw new Error(
            `Could not find assignee with username/email '${assignee}'`
        );
    }

    if (result.length > 1) {
        throw new Error(
            `Found multiple assignees with username/email '${assignee}'`
        );
    }

    const accountId = result[0].accountId;
    console.log(`Located assiggnee '${assignee}' account ID: '${accountId}'`);

    debug(JSON.stringify(result[0], null, 2));

    await request(() =>
        client.issue.assignIssue({
            issueKey,
            accountId
        })
    );

    console.log(`Successfully assigned issue '${issueKey}' to '${assignee}'`);
};

const transition = async (
    client: Jira,
    issueKey: string,
    toStatus: string,
    fromStatus?: string
) => {
    // Retrieve issue by key
    info(`Retrieving JIRA issue '${issueKey}'...`);
    const issue = await request(() =>
        client.issue.getIssue({
            issueKey
        })
    );
    debug(JSON.stringify(issue, null, 2));

    // From can be multiple values, separated by a comma
    const fromStatuses =
        typeof fromStatus === "string" && fromStatus !== ""
            ? fromStatus.split(",")
            : undefined;

    // Ensure we're in one of the correct statuses given
    if (fromStatuses != null && fromStatuses.length > 0) {
        const currentStatus = issue.fields.status;
        const validStatus = fromStatuses.find(
            a => currentStatus.id === a || currentStatus.name === a
        );

        if (!validStatus) {
            throw new Error(
                `JIRA issue ${issueKey} is not in one of the required statuses (${fromStatuses.join(
                    ", "
                )}) for this transition`
            );
        }
    }

    // Get a list of all valid transitions
    const transitions: Transition[] = (
        await request(() =>
            client.issue.getTransitions({
                issueKey
            })
        )
    ).transitions;

    // Find the transition related to the given input
    const toTransition = transitions.find(
        transition =>
            transition.id === toStatus ||
            transition.name.toLowerCase() === toStatus.toLowerCase()
    );

    if (!toTransition) {
        console.log(
            "Transition not available from this state. Possible transitions: ",
            transitions.map(id => id)
        );

        debug(JSON.stringify(transitions, null, 2));
        return;
    }

    debug(`Transitioning to: ${JSON.stringify(toTransition, null, 4)}`);

    const result = await request(() =>
        client.issue.transitionIssue({
            issueKey,
            transition: {
                id: toTransition.id
            }
        })
    );

    console.log(`Sucessfully transitioned to '${toTransition.name}'`);
    debug(result);
};

const main = async () => {
    const client = jiraFactory();
    const issueKey = getInput("key");

    await transition(client, issueKey, getInput("to"), getInput("from"));
    await assign(client, issueKey, getInput("assignee"));
};

if (require.main === module) {
    (async () => {
        try {
            await main();
            process.exit(0);
        } catch (err) {
            setFailed(err.message);
            throw err;
        }
    })();
}
