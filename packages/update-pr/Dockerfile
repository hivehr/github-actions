FROM node:12-alpine

LABEL "name"="Update PR"
LABEL "maintainer"="Hive HR <engineering@hive.hr>"
LABEL "version"="1.0.0"

LABEL "com.github.actions.name"="Get JIRA Issue"
LABEL "com.github.actions.description"="Retrieve a JIRA issues information"
LABEL "com.github.actions.branding.icon"="check-square"
LABEL "com.github.actions.branding.color"="blue"

LABEL "com.github.actions.inputs.repo-token.description"="The GITHUB_TOKEN secret"
LABEL "com.github.actions.inputs.title.description"="Title to update the PR to"
LABEL "com.github.actions.inputs.addLabels.description"="Labels to add to the PR"
LABEL "com.github.actions.inputs.removeLabels.description"="Labels to remove from the PR"

WORKDIR /app
COPY package.json yarn.lock .yarnrc ./
COPY .yarn .yarn
RUN time yarn install --immutable --immutable-cache --inline-builds
COPY . .

ENTRYPOINT /bin/sh -c "cd /app && yarn run start"
