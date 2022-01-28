FROM node:17.4.0-alpine

LABEL "name"="Check Routes"
LABEL "maintainer"="Hive HR <engineering@hive.hr>"
LABEL "version"="1.0.0"

LABEL "com.github.actions.inputs.pattern.description"="Glob pattern to search for route files (relative to github workspace)"
LABEL "com.github.actions.inputs.pattern.required"="true"

LABEL "com.github.actions.inputs.out_path.description"="Location to store the generated files (relative to github workspace)"
LABEL "com.github.actions.inputs.out_path.required"="true"

LABEL "com.github.actions.inputs.or_statement_regex.description"="Regex string to match or statement on a permission"
LABEL "com.github.actions.inputs.outor_statement_regex_path.required"="false"

LABEL "com.github.actions.inputs.controller_name_regex.description"="Regex string to match controller names"
LABEL "com.github.actions.inputs.controller_name_regex.required"="false"

LABEL "com.github.actions.inputs.require_scopes_regex.description"="Regex string to match the require_scopes string"
LABEL "com.github.actions.inputs.require_scopes_regex.required"="false"

LABEL "com.github.actions.inputs.template_path.description"="Location of template handlebars file. This can use all default handlebars handlers and the eachInMap handler"
LABEL "com.github.actions.inputs.template_path.required"="false"

WORKDIR /app
COPY . .

WORKDIR /app/babel-plugin-express-routes
RUN time yarn install --frozen-lockfile --no-cache --production=false
RUN yarn build && yarn test

WORKDIR /app
RUN time yarn install --frozen-lockfile --no-cache --production=false
RUN yarn build

ENTRYPOINT ["/app/entrypoint.sh"]
