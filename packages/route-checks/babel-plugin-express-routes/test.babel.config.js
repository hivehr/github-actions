module.exports = function(api) {
    api.cache(true);
    return {
        presets: ["@babel/typescript"],
        plugins: [
            [
                __dirname,
                {
                    maxDepth: 10
                }
            ]
        ]
    };
};
