module.exports = function(api) {
    api.cache(true);
    return {
        presets: ["@babel/typescript"],
        plugins: [
            [require.resolve(process.cwd()), {
            maxDepth: 10
        }]
    ]
    };
};