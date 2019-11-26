export const { JIRA_ISSUE_ID, JIRA_API_TOKEN, JIRA_BASE_URL, JIRA_USER_EMAIL } = process.env;

Object.entries({
    JIRA_API_TOKEN,
    JIRA_BASE_URL,
    JIRA_USER_EMAIL
}).forEach(([name, value]) => {
    if (value == null || value === "") {
        throw new Error(`Missing environment variable: ${name}`);
    }
});
