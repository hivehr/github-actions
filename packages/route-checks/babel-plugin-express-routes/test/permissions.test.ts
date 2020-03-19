import child_process from "child_process";
import { promisify } from "util";
import rimraf from "rimraf";
import fs from "fs";

const exec = promisify(child_process.exec);

const verifyFile = async (fileName: string) => {
  const result = await exec(
    `yarn babel --config-file ${process.cwd()}/test.babel.config.js --extensions .ts ${process.cwd()}/test/packages/service/src/routes/${fileName}.ts`
  );
  expect(result.stderr).toEqual("");
  expect(
    fs
      .readFileSync(`${process.cwd()}/routes/service_${fileName}.json`)
      .toString()
  ).toMatchSnapshot();
};
describe("Permissions", () => {
  afterAll(() => {
    rimraf.sync(`${__dirname}/../routes/`);
  });

  it("requireScope with single arg", async () => {
    await verifyFile("require_scope_with_single_arg");
  });

  it("requireScope with array arg", async () => {
    await verifyFile("require_scope_with_array_arg");
  });

  it("requireScope with single arg and 'or' with single arg", async () => {
    await verifyFile("require_scope_with_single_arg_and_or_with_single_arg");
  });

  it("requireScope with single arg and 'or' with array arg", async () => {
    await verifyFile("require_scope_with_single_arg_and_or_with_array_arg");
  });

  it("requireScope with array arg and 'or' with array arg", async () => {
    await verifyFile("require_scope_with_array_arg_and_or_with_array_arg");
  });

  it("route with no permissions required", async () => {
    await verifyFile("no_permissions_required");
  });

  it("require scope with single rag and two ors with single arg", async () => {
    await verifyFile(
      "require_scope_with_single_rag_and_two_ors_with_single_arg"
    );
  });

  it("test all request methods", async () => {
    await verifyFile("test_all_request_methods")
  })
});
