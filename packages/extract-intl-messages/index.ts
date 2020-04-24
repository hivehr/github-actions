import { info, setFailed } from "@actions/core";

const main = async () => {
    info("Inside Action ");
};

if (require.main === module) {
    (async () => {
        try {
            await main();
            process.exit(0);
        } catch (err) {
            setFailed(err.message);
            throw err;
        }
    })();
}
