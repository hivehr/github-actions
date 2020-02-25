import { debug, getInput, info, setFailed, setOutput } from "@actions/core";
import Jira from "jira-connector";
import { JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN } from "./env";

const getOrDefault = (obj: any, key: string, defaultValue: any) =>
    obj != null && obj[key] != null ? obj[key] : defaultValue;

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
        throw new Error(
            `No valid JIRA issue found in '${title}' that matches '${pattern.source}'. Did you forget to name it correctly?`
        );
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
        debug(JSON.stringify(issue, null, 2));
    } catch (e) {
        throw new Error(JSON.parse(e).body.errorMessages[0]);
    }

    // Set outputs
    setOutput("key", issue.key ?? "");
    setOutput("summary", issue.fields.summary ?? "");
    setOutput("status", issue.fields.status.name ?? "");
    setOutput("projectKey", issue.fields.project.key ?? "");
    setOutput("labels", issue.fields.labels.join(",") ?? "");
    setOutput("creator", issue.fields.creator.emailAddress ?? "");
    setOutput(
        "timeSpent",
        getOrDefault(issue.fields.timetracking, "timeSpentSeconds", "0")
    );
    setOutput("url", `https://${JIRA_BASE_URL}/browse/${issue.key}`);
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
