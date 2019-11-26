import { debug, getInput, setFailed } from "@actions/core";
import Jira from "jira-connector";
import { JIRA_API_TOKEN, JIRA_BASE_URL, JIRA_USER_EMAIL } from "./env";

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

const main = async () => {
    const issueKey = getInput("key");
    const to = getInput("to");
    const from = getInput("from");

    // From can be multiple values, separated by a comma
    const fromStatuses =
        typeof from === "string" && from !== "" ? from.split(",") : [];

    const client = jiraFactory();

    // Retrieve issue by key
    let issue: any;
    try {
        // info(`Retrieving JIRA issue '${issueKey}'...`);
        issue = await client.issue.getIssue({
            issueKey
        });
        // debug(JSON.stringify(issue, null, 2));
    } catch (e) {
        throw new Error(JSON.parse(e).body.errorMessages[0]);
    }

    // Ensure we're in one of the correct statuses given
    if (fromStatuses.length > 0) {
        const currentStatus = issue.fields.status;
        const validStatus = fromStatuses.find(
            a => currentStatus.id === a || currentStatus.name === a
        );

        if (!validStatus) {
            console.log(
                `JIRA issue ${issueKey} is not in one of the required statuses (${fromStatuses.join(
                    ", "
                )}) for this transition`
            );
            return;
        }
    }

    let transitions: Transition[];
    try {
        transitions = (await client.issue.getTransitions({
            issueKey
        })).transitions;
        console.log(JSON.stringify(transitions, null, 2));
    }
    catch (e) {
        throw new Error(JSON.parse(e).body.errorMessages[0]);
    }

    const toTransition = transitions.find(
        transition =>
            transition.id === to ||
            transition.name.toLowerCase() === to.toLowerCase()
    );

    if (!toTransition) {
        console.log("Transition not available from this state. Possible transitions: ", transitions.map((id) => id));
        return;
    }

    debug(`Transitioning to: ${JSON.stringify(toTransition, null, 4)}`);

    try {
        const result = await client.issue.transitionIssue({
            issueKey,
            transition: {
                id: toTransition.id
            }
        });
        debug(result);
    }
    catch (e) {
        throw new Error(JSON.parse(e).body.errorMessages[0]);
    }

    console.log(`Sucessfully transitioned to '${toTransition.name}'`);
};

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
