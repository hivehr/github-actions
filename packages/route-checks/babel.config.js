module.exports = function(api) {
    api.cache(true);
    return {
        plugins: [
            "@babel/transform-typescript",
            [
                require.resolve("./babel-plugin-express-routes"),
                {
                    outPath: `${process.env.GITHUB_WORKSPACE || "."}/routes`,
                    maxDepth: 10
                }
            ]
        ]
    };
};
