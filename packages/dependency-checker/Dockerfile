FROM node:12-alpine

LABEL "name"="Dependency Checker"
LABEL "maintainer"="Hive HR <engineering@hive.hr>"
LABEL "version"="1.0.0"

LABEL "com.github.actions.name"="Dependency Checker"
LABEL "com.github.actions.description"="Checks for changes in dependencies"
LABEL "com.github.actions.branding.icon"="check-square"
LABEL "com.github.actions.branding.color"="blue"

LABEL "com.github.actions.inputs.repo-token.description"="The GITHUB_TOKEN secret"

WORKDIR /app
COPY package.json yarn.lock .yarnrc ./
COPY .yarn .yarn
RUN time yarn install --immutable --immutable-cache --inline-builds
COPY . .

ENTRYPOINT /bin/sh -c "cd /app && yarn run start"
