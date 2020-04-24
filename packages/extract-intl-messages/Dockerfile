FROM node:12.16.1-alpine

LABEL "name"="Extract Intl Messages"
LABEL "maintainer"="Hive HR <engineering@hive.hr>"
LABEL "version"="1.0.0"

LABEL "com.github.actions.name"="Extract Intl Messages"
LABEL "com.github.actions.description"="Extracts intl messages"
LABEL "com.github.actions.branding.icon"="check-square"
LABEL "com.github.actions.branding.color"="blue"

LABEL "com.github.actions.inputs.path.description"="Babel path"
LABEL "com.github.actions.inputs.path.required"="true"

WORKDIR /app

COPY package.json yarn.lock .yarnrc ./
COPY .yarn .yarn
RUN time yarn install --frozen-lockfile --no-cache --production=false

ENTRYPOINT /bin/sh -c "cd /app && yarn start"
