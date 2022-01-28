import { debug, getInput, info, setFailed, setOutput } from "@actions/core";
import Jira from "jira-connector";
import { JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN } from "./env";

const toString = (value: any) => {
    if (value == null) {
        return "";
    }

    return String(value);
};

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
    const issueKey = getFirstMatchingGroup(
        pattern,
        getInput("string")
    ).toLowerCase();

    const client = jiraFactory();

    // Retrieve issue by key
    let issue: any;
    try {
        info(`Retrieving JIRA issue '${issueKey}'...`);
        issue = await client.issue.getIssue({
            issueKey
        });
    } catch (e: any) {
        throw new Error(JSON.parse(e).body.errorMessages[0]);
    }

    // Generate outputs
	const parentIssue = issue.fields.parent;
    const outputs = {
		projectKey: issue.fields.project?.key,

        key: issue.key,
		type: issue.fields.issuetype.name,
		isSubTask: issue.fields.issuetype?.subtask,
        summary: issue.fields.summary,
        status: issue.fields.status?.name,
        labels: issue.fields.labels,
        components: issue.fields.components?.map((c: any) => c.name) ?? [],
		creator: issue.fields.creator?.emailAddress,
		assignee: issue.fields.assignee?.emailAddress,
		reporter: issue.fields.reporter?.emailAddress,
        timeSpent: issue.fields.timetracking?.timeSpentSeconds ?? 0,
		url: `https://${JIRA_BASE_URL}/browse/${issue.key}`,

		parentKey: parentIssue?.key,
		parentType: parentIssue?.fields.issuetype?.name,
		parentSummary: parentIssue?.fields?.summary,
		parentStatus: parentIssue?.name,
		parentUrl: parentIssue?.key != null ?
			`https://${JIRA_BASE_URL}/browse/${parentIssue.key}` :
			undefined
    };
    info("Outputs:\n" + JSON.stringify(outputs, null, 2));

    // Set outputs
    Object.entries(outputs).forEach(([key, value]) =>
        setOutput(key, value != null ? toString(value) : "")
    );
};

if (require.main === module) {
    (async () => {
        try {
            await main();
            process.exit(0);
        } catch (err: any) {
            setFailed(err.message);
            throw err;
        }
    })();
}
