import { transformFileSync } from "@babel/core";
import fs from "fs";
import { join, resolve } from "path";
import rimraf from "rimraf";

const TESTS_DIR = __dirname;
const BASE_DIR = join(TESTS_DIR, "..");
const FIXTURES_DIR = join(
    TESTS_DIR,
    "fixtures",
    "packages",
    "service",
    "src",
    "routes"
);
const OUT_DIR = join(TESTS_DIR, "routes");

const transform = (filePath: string) =>
    transformFileSync(filePath, {
        presets: ["@babel/typescript"],
        plugins: [
            [
                BASE_DIR,
                {
                    outPath: OUT_DIR,
                    maxDepth: 10
                }
            ]
        ]
    });

const verifyFile = (fileName: string) => {
    const filePath = join(FIXTURES_DIR, `${fileName}.ts`);
    transform(filePath);

    const resultFile = join(OUT_DIR, `service_${fileName}.json`);
    expect(fs.readFileSync(resultFile).toString()).toMatchSnapshot();
};

describe("Permissions", () => {
    afterAll(() => {
        rimraf.sync(OUT_DIR);
    });

    it("requireScope with single arg", () =>
        verifyFile("require_scope_with_single_arg"));

    it("requireScope with array arg", () =>
        verifyFile("require_scope_with_array_arg"));

    it("requireScope with single arg and 'or' with single arg", () =>
        verifyFile("require_scope_with_single_arg_and_or_with_single_arg"));

    it("requireScope with single arg and 'or' with array arg", () =>
        verifyFile("require_scope_with_single_arg_and_or_with_array_arg"));

    it("requireScope with array arg and 'or' with array arg", () =>
        verifyFile("require_scope_with_array_arg_and_or_with_array_arg"));

    it("route with no permissions required", () =>
        verifyFile("no_permissions_required"));

    it("require scope with single rag and two ors with single arg", () =>
        verifyFile(
            "require_scope_with_single_rag_and_two_ors_with_single_arg"
        ));

    it("test all request methods", () =>
        verifyFile("test_all_request_methods"));
});
