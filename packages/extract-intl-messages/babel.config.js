module.exports = {
    presets: [
        [
            "@babel/preset-env",
            {
                useBuiltIns: "entry",
                corejs: "3.0.1",
                modules: false, // Don't transpile to CommonJS (This is default behaviour)
            },
        ],
        [
            "@babel/preset-typescript",
            {
                allowNamespaces: true,
            },
        ],
        "@babel/preset-react",
    ],
    plugins: [
        [
            "react-intl",
            {
                messagesDir: "./build/intl/messages",
            },
        ],
        "@babel/plugin-proposal-class-properties",
    ],
};
