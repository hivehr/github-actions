const { join } = require("path");

module.exports = function(api) {
    api.cache(true);
    return {
        plugins: [
            "@babel/transform-typescript",
            [
                join(__dirname, "./babel-plugin-express-routes"),
                {
                    outPath: `${process.env.GITHUB_WORKSPACE || "."}/${
                        process.env.OUT_PATH
                    }`,
                    maxDepth: 10
                }
            ]
        ]
    };
};
