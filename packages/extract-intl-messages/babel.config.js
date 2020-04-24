module.exports = {
    presets: [
        "@babel/preset-env",
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
