FROM node:12.16.1-alpine

LABEL "name"="Transition JIRA Issue"
LABEL "maintainer"="Hive HR <engineering@hive.hr>"
LABEL "version"="1.0.0"

LABEL "com.github.actions.name"="Transition JIRA Issue"
LABEL "com.github.actions.description"="Transitions a JIRA issue to a given transition name, with optional status checks"
LABEL "com.github.actions.branding.icon"="check-square"
LABEL "com.github.actions.branding.color"="blue"

LABEL "com.github.actions.inputs.key.description"="JIRA issue key to transition"
LABEL "com.github.actions.inputs.key.required"="true"
LABEL "com.github.actions.inputs.to.description"="Status to transition to (id or name)"
LABEL "com.github.actions.inputs.to.required"="true"
LABEL "com.github.actions.inputs.from.description"="Comma separated statuses that this issue must be in for the transition to happen (ids or names)"
LABEL "com.github.actions.inputs.from.required"="true"

WORKDIR /app
COPY package.json yarn.lock .yarnrc ./
COPY .yarn .yarn
RUN time yarn install--frozen-lockfile --no-cache --production=false
COPY . .

ENTRYPOINT /bin/sh -c "cd /app && yarn run start"
