module.exports = function(api) {
    api.cache(true);
    return {
        plugins: [
            "@babel/transform-typescript",
            [
                require.resolve("./babel-plugin-express-routes"),
                {
                    outPath: `${process.env.GITHUB_WORKSPACE || "."}/${process.env.INPUT_DOCS_ROUTE_PATH}`,
                    maxDepth: 10
                }
            ]
        ]
    };
};
