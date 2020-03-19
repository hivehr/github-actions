FROM node:12.16.1-alpine

LABEL "name"="Check Routes"
LABEL "maintainer"="Hive HR <engineering@hive.hr>"
LABEL "version"="1.0.0"

WORKDIR /app

#Build Babel plugin

COPY ./babel-plugin-express-routes/package.json ./babel-plugin-express-routes/yarn.lock ./plugin/
RUN time yarn --cwd ./plugin install --frozen-lockfile --no-cache --production=false

COPY babel-plugin-express-routes plugin
RUN yarn --cwd ./plugin build && yarn --cwd ./plugin test 

RUN cd ..

#Build action
COPY package.json yarn.lock ./

RUN time yarn install --frozen-lockfile --no-cache --production=false

COPY . .
RUN yarn lint && yarn build

ENTRYPOINT /bin/sh -c "cd /app && yarn start"
