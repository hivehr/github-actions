FROM node:12.16.1-alpine

LABEL "name"="Get JIRA Issue"
LABEL "maintainer"="Hive HR <engineering@hive.hr>"
LABEL "version"="1.0.0"

LABEL "com.github.actions.name"="Get JIRA Issue"
LABEL "com.github.actions.description"="Retrieve a JIRA issues information"
LABEL "com.github.actions.branding.icon"="check-square"
LABEL "com.github.actions.branding.color"="blue"

LABEL "com.github.actions.inputs.string.description"="String to match against"
LABEL "com.github.actions.inputs.string.required"="true"
LABEL "com.github.actions.inputs.pattern.description"="Regular Expression to match against"
LABEL "com.github.actions.inputs.pattern.required"="true"

LABEL "com.github.actions.outputs.key.description"="JIRA issue key"
LABEL "com.github.actions.outputs.summary.description"="JIRA issue summary"
LABEL "com.github.actions.outputs.status.description"="JIRA issue status"
LABEL "com.github.actions.outputs.projectKey.description"="JIRA issue project key"
LABEL "com.github.actions.outputs.timeSpent.description"="Time spent (in seconds) on JIRA issue using built-in time tracking."
LABEL "com.github.actions.outputs.labels.description"="JIRA issue labels, comma delimited"
LABEL "com.github.actions.outputs.creator.description"="JIRA issue creators email"
LABEL "com.github.actions.outputs.url.description"="JIRA issue URL"

WORKDIR /app

COPY package.json yarn.lock .yarnrc ./
COPY .yarn .yarn
RUN time yarn install --frozen-lockfile --no-cache --production=false

COPY . .
RUN yarn lint && yarn build

ENTRYPOINT /bin/sh -c "cd /app && yarn start"
