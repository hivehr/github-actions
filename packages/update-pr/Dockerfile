FROM node:12.16.1-alpine

LABEL "name"="Update GitHub PR"
LABEL "maintainer"="Hive HR <engineering@hive.hr>"
LABEL "version"="1.0.0"

LABEL "com.github.actions.name"="Update GitHub PR"
LABEL "com.github.actions.description"="Retrieve a JIRA issues information"
LABEL "com.github.actions.branding.icon"="check-square"
LABEL "com.github.actions.branding.color"="blue"

LABEL "com.github.actions.inputs.repo-token.description"="The GITHUB_TOKEN secret"
LABEL "com.github.actions.inputs.title.description"="Title to update the PR to"
LABEL "com.github.actions.inputs.addLabels.description"="Labels to add to the PR"
LABEL "com.github.actions.inputs.removeLabels.description"="Labels to remove from the PR"
LABEL "com.github.actions.inputs.body.description"="Text to set the PR to (superceeds prefixBody and suffixBody)"
LABEL "com.github.actions.inputs.prefixBody.description"="Text to prefix the current PR body with"
LABEL "com.github.actions.inputs.suffixBody.description"="Text to suffix the current PR body with"

WORKDIR /app

COPY package.json yarn.lock .yarnrc ./
COPY .yarn .yarn
RUN time yarn install --frozen-lockfile --no-cache --production=false

COPY . .
RUN yarn lint && yarn build

ENTRYPOINT /bin/sh -c "cd /app && yarn start"
