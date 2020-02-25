FROM alpine:3.9.5
ARG VERSION=0.11.2

LABEL "name"="terraform-lint"
LABEL "maintainer"="Hive HR <engineering@hive.hr>"
LABEL "version"="0.10.0"

LABEL "com.github.actions.name"="tflint"
LABEL "com.github.actions.description"="Lints terraform files in your repository"
LABEL "com.github.actions.icon"="box"
LABEL "com.github.actions.color"="orange"

RUN apk add --no-cache bash=4.4.19-r1 ca-certificates=20190108-r0 unzip=6.0-r4 curl=7.64.0-r3
RUN rm -rf /var/cache/apk/*
RUN cd tmp && \
    curl -OL https://github.com/wata727/tflint/releases/download/v${VERSION}/tflint_linux_amd64.zip && \
    curl -OL https://github.com/wata727/tflint/releases/download/v${VERSION}/checksums.txt && \
    grep tflint_linux_amd64.zip checksums.txt | sha256sum -c && \
    unzip tflint_linux_amd64.zip -d /usr/local/bin && \
    rm tflint_linux_amd64.zip checksums.txt

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
