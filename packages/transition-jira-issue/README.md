# get-jira-issue

## Overview

Takes `string` and `pattern` inputs and attempts to find a JIRA issue associated with the given string, writing it's details as outputs if found.

## Inputs

```bash
string      # String to match the below pattern against e.g. HRW-123: My name
pattern     # RegExp pattern whose first capture group matches against the JIRA issue key e.g. (HRW-[0-9]+)
```

### Outputs

```bash
key         # JIRA Issue key e.g. HRW-123
summary     # Summary of the JIRA issue (it's title)
status      # Display friendly status of the JIRa issue (e.g. To Do)
projectKey  # Project key of the JIRA issue (e.g. HRW)
creator     # Email address of the JIRA issues creator
url         # Direct URL to the JIRA issues details, relative to the JIRA_BASE_URL env var
```

## Environment variables

```bash
JIRA_BASE_URL       # Base URL of the JIRA instance e.g. hivehr.atlassian.net
JIRA_API_TOKEN      # API Token to authenticate against
JIRA_USER_EMAIL     # Email address related to the API token
```

NB: **All of the above are required**
