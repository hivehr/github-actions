import { debug, getInput, info, setFailed, setOutput } from "@actions/core";
import Jira from "jira-connector";

const { JIRA_API_TOKEN, JIRA_BASE_URL, JIRA_USER_EMAIL } = process.env;

const jiraFactory = () =>
    new Jira({
        host: JIRA_BASE_URL!,
        strictSSL: true,
        basic_auth: {
            email: JIRA_USER_EMAIL,
            api_token: JIRA_API_TOKEN
        }
    });

const getFirstMatchingGroup = (pattern: RegExp, title: string) => {
    const parts = pattern.exec(title);
    if (parts == null) {
        throw new Error(`No valid JIRA issue information found`);
    }

    return parts[1];
};

const main = async () => {
    // Parse the given input pattern into a RegExp instance
    const patternInput = getInput("pattern");
    const pattern = new RegExp(patternInput);

    // Match against the input title
    const issueKey = getFirstMatchingGroup(pattern, getInput("string"));

    const client = jiraFactory();

    // Retrieve issue by key
    let issue: any;
    try {
        info(`Retrieving JIRA issue '${issueKey}'...`);
        issue = await client.issue.getIssue({
            issueKey
        });
        debug(JSON.stringify(issue));
    } catch (e) {
        throw new Error(JSON.parse(e).body.errorMessages[0]);
    }

    // Set outputs
    setOutput("key", issue.key);
    setOutput("summary", issue.fields.summary);
    setOutput("status", issue.fields.status.name);
    setOutput("projectKey", issue.fields.project.key);
    setOutput("creator", issue.fields.creator.emailAddress);
    setOutput("url", `https://${JIRA_BASE_URL}/browse/${issue.key}`);
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
