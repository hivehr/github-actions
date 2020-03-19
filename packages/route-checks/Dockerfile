FROM node:12.16.1-alpine

LABEL "name"="Check Routes"
LABEL "maintainer"="Hive HR <engineering@hive.hr>"
LABEL "version"="1.0.0"
LABEL "com.github.actions.inputs.pattern.description"="Glob pattern to search for route files (relative to github workspace)"
LABEL "com.github.actions.inputs.pattern.required"="true"
LABEL "com.github.actions.inputs.out_path.description"="Location to store the generated files (relative to github workspace)"
LABEL "com.github.actions.inputs.out_path.required"="true"

WORKDIR /app
COPY . .

WORKDIR /app/babel-plugin-express-routes
RUN time yarn install --frozen-lockfile --no-cache --production=false
RUN yarn build && yarn test

WORKDIR /app
RUN time yarn install --frozen-lockfile --no-cache --production=false
RUN yarn build

ENTRYPOINT ["/app/entrypoint.sh"]
