// export const {  } = process.env;

Object.entries({}).forEach(([name, value]) => {
    if (value == null || value === "") {
        throw new Error(`Missing environment variable: ${name}`);
    }
});
