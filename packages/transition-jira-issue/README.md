# transition-jira-issue

## Overview

Takes an issue `key` and a `to` transition name, and transitions the related JIRA to that transition. Optionally we can also pass `from` status(es) to limit the transition, and an `assignee` if we wish to assign the issue to a user after transitioning

## Inputs

```bash
key      	# Issue key name e.g. HRW-123
to     	 	# Transition name to transition the issue to
from     	# Transition name to limit the transition from specific statuses
assignee    # Optional email address or username of the user to assign the issue to after transitioning
```

## Environment variables

```bash
JIRA_BASE_URL       # Base URL of the JIRA instance e.g. hivehr.atlassian.net
JIRA_API_TOKEN      # API Token to authenticate against
JIRA_USER_EMAIL     # Email address related to the API token
```

NB: **All of the above are required**
