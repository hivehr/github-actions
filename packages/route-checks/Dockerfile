FROM node:12.16.1-alpine

LABEL "name"="Check Routes"
LABEL "maintainer"="Hive HR <engineering@hive.hr>"
LABEL "version"="1.0.0"

LABEL "com.github.actions.inputs.routes_doc_path.description"="Location in the repo to store the generated .md file"
LABEL "com.github.actions.inputs.routes_doc_path.required"="true"

LABEL "com.github.actions.inputs.route_path.description"="Location in the repo to check for route files"
LABEL "com.github.actions.inputs.route_path.required"="true"

WORKDIR /app

COPY . .

WORKDIR /app/babel-plugin-express-routes

RUN time yarn install --frozen-lockfile --no-cache --production=false
RUN yarn build && yarn test

WORKDIR /app

RUN time yarn install --frozen-lockfile --no-cache --production=false
RUN yarn build

ENTRYPOINT ["/app/entrypoint.sh"]
