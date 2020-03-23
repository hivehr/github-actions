const { join } = require("path");

module.exports = function(api) {
    api.cache(true);
    return {
        plugins: [
            "@babel/transform-typescript",
            [
                join(__dirname, "./babel-plugin-express-routes"),
                {
                    outPath: `${process.env.GITHUB_WORKSPACE || "."}/${process
                        .env.INPUT_OUT_PATH || ""}`,
                    orStatementRegexString: `${process.env
                        .INPUT_OR_STATEMENT_REGEX || "or"} `,
                    controllerNameRegexString: `${process.env
                        .INPUT_CONTROLLER_NAME_REGEX || "router"}`,
                    requireScopesRegexString: `${process.env
                        .INPUT_REQUIRE_SCOPES_REGEX || "requireScopes"}`,
                    maxDepth: 10
                }
            ]
        ]
    };
};
