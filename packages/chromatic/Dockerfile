FROM node:17.4.0-alpine

LABEL "name"="Chromatic"
LABEL "maintainer"="Hive HR <engineering@hive.hr>"
LABEL "version"="1.0.0"
LABEL "com.github.actions.inputs.projectToken.description"="Chromatic project token"
LABEL "com.github.actions.inputs.projectToken.required"="true"
LABEL "com.github.actions.inputs.appCode.description"="Description goes here"
LABEL "com.github.actions.inputs.appCode.required"="false"
LABEL "com.github.actions.inputs.buildScriptName.description"="Description goes here"
LABEL "com.github.actions.inputs.buildScriptName.required"="false"
LABEL "com.github.actions.inputs.scriptName.description"="Description goes here"
LABEL "com.github.actions.inputs.scriptName.required"="false"
LABEL "com.github.actions.inputs.exec.description"="Description goes here"
LABEL "com.github.actions.inputs.exec.required"="false"
LABEL "com.github.actions.inputs.doNotStart.description"="Description goes here"
LABEL "com.github.actions.inputs.doNotStart.required"="false"
LABEL "com.github.actions.inputs.storybookPort.description"="Description goes here"
LABEL "com.github.actions.inputs.storybookPort.required"="false"
LABEL "com.github.actions.inputs.storybookUrl.description"="Description goes here"
LABEL "com.github.actions.inputs.storybookUrl.required"="false"
LABEL "com.github.actions.inputs.storybookBuildDir.description"="Description goes here"
LABEL "com.github.actions.inputs.storybookBuildDir.required"="false"
LABEL "com.github.actions.inputs.storybookHttps.description"="Description goes here"
LABEL "com.github.actions.inputs.storybookHttps.required"="false"
LABEL "com.github.actions.inputs.storybookCert.description"="Description goes here"
LABEL "com.github.actions.inputs.storybookCert.required"="false"
LABEL "com.github.actions.inputs.storybookKey.description"="Description goes here"
LABEL "com.github.actions.inputs.storybookKey.required"="false"
LABEL "com.github.actions.inputs.storybookCa.description"="Description goes here"
LABEL "com.github.actions.inputs.storybookCa.required"="false"
LABEL "com.github.actions.inputs.autoAcceptChanges.description"="Description goes here"
LABEL "com.github.actions.inputs.autoAcceptChanges.required"="false"
LABEL "com.github.actions.inputs.allowConsoleErrors.description"="Description goes here"
LABEL "com.github.actions.inputs.allowConsoleErrors.required"="false"
LABEL "com.github.actions.inputs.exitZeroOnChanges.description"="Description goes here"
LABEL "com.github.actions.inputs.exitZeroOnChanges.required"="false"
LABEL "com.github.actions.inputs.exitOnceUploaded.description"="Description goes here"
LABEL "com.github.actions.inputs.exitOnceUploaded.required"="false"
LABEL "com.github.actions.inputs.ignoreLastBuildOnBranch.description"="Description goes here"
LABEL "com.github.actions.inputs.ignoreLastBuildOnBranch.required"="false"

RUN apk add --no-cache git

WORKDIR /app

COPY module/package.json module/yarn.lock ./
COPY .yarn .yarn
RUN time yarn install --frozen-lockfile --no-cache --production=false

COPY module/ .
RUN yarn build

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
