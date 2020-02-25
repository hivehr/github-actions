#!/usr/bin/env node

/* eslint-disable max-len, flowtype/require-valid-file-annotation, flowtype/require-return-type */
/* global packageInformationStores, null, $$SETUP_STATIC_TABLES */

// Used for the resolveUnqualified part of the resolution (ie resolving folder/index.js & file extensions)
// Deconstructed so that they aren't affected by any fs monkeypatching occuring later during the execution
const {statSync, lstatSync, readlinkSync, readFileSync, existsSync, realpathSync} = require('fs');

const Module = require('module');
const path = require('path');
const StringDecoder = require('string_decoder');

const ignorePattern = null ? new RegExp(null) : null;

const pnpFile = path.resolve(__dirname, __filename);
const builtinModules = new Set(Module.builtinModules || Object.keys(process.binding('natives')));

const topLevelLocator = {name: null, reference: null};
const blacklistedLocator = {name: NaN, reference: NaN};

// Used for compatibility purposes - cf setupCompatibilityLayer
const patchedModules = [];
const fallbackLocators = [topLevelLocator];

// Matches backslashes of Windows paths
const backwardSlashRegExp = /\\/g;

// Matches if the path must point to a directory (ie ends with /)
const isDirRegExp = /\/$/;

// Matches if the path starts with a valid path qualifier (./, ../, /)
// eslint-disable-next-line no-unused-vars
const isStrictRegExp = /^\.{0,2}\//;

// Splits a require request into its components, or return null if the request is a file path
const pathRegExp = /^(?![a-zA-Z]:[\\\/]|\\\\|\.{0,2}(?:\/|$))((?:@[^\/]+\/)?[^\/]+)\/?(.*|)$/;

// Keep a reference around ("module" is a common name in this context, so better rename it to something more significant)
const pnpModule = module;

/**
 * Used to disable the resolution hooks (for when we want to fallback to the previous resolution - we then need
 * a way to "reset" the environment temporarily)
 */

let enableNativeHooks = true;

/**
 * Simple helper function that assign an error code to an error, so that it can more easily be caught and used
 * by third-parties.
 */

function makeError(code, message, data = {}) {
  const error = new Error(message);
  return Object.assign(error, {code, data});
}

/**
 * Ensures that the returned locator isn't a blacklisted one.
 *
 * Blacklisted packages are packages that cannot be used because their dependencies cannot be deduced. This only
 * happens with peer dependencies, which effectively have different sets of dependencies depending on their parents.
 *
 * In order to deambiguate those different sets of dependencies, the Yarn implementation of PnP will generate a
 * symlink for each combination of <package name>/<package version>/<dependent package> it will find, and will
 * blacklist the target of those symlinks. By doing this, we ensure that files loaded through a specific path
 * will always have the same set of dependencies, provided the symlinks are correctly preserved.
 *
 * Unfortunately, some tools do not preserve them, and when it happens PnP isn't able anymore to deduce the set of
 * dependencies based on the path of the file that makes the require calls. But since we've blacklisted those paths,
 * we're able to print a more helpful error message that points out that a third-party package is doing something
 * incompatible!
 */

// eslint-disable-next-line no-unused-vars
function blacklistCheck(locator) {
  if (locator === blacklistedLocator) {
    throw makeError(
      `BLACKLISTED`,
      [
        `A package has been resolved through a blacklisted path - this is usually caused by one of your tools calling`,
        `"realpath" on the return value of "require.resolve". Since the returned values use symlinks to disambiguate`,
        `peer dependencies, they must be passed untransformed to "require".`,
      ].join(` `)
    );
  }

  return locator;
}

let packageInformationStores = new Map([
  ["@actions/core", new Map([
    ["1.1.3", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@actions-core-1.1.3-543b0e7ca0e53dccc5dca4811a4fac59c1b35f5c-integrity/node_modules/@actions/core/"),
      packageDependencies: new Map([
        ["@actions/core", "1.1.3"],
      ]),
    }],
  ])],
  ["@actions/github", new Map([
    ["1.1.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@actions-github-1.1.0-06f34e6b0cf07eb2b3641de3e680dbfae6bcd400-integrity/node_modules/@actions/github/"),
      packageDependencies: new Map([
        ["@octokit/graphql", "2.1.3"],
        ["@octokit/rest", "16.43.1"],
        ["@actions/github", "1.1.0"],
      ]),
    }],
  ])],
  ["@octokit/graphql", new Map([
    ["2.1.3", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@octokit-graphql-2.1.3-60c058a0ed5fa242eca6f938908d95fd1a2f4b92-integrity/node_modules/@octokit/graphql/"),
      packageDependencies: new Map([
        ["@octokit/request", "5.3.2"],
        ["universal-user-agent", "2.1.0"],
        ["@octokit/graphql", "2.1.3"],
      ]),
    }],
  ])],
  ["@octokit/request", new Map([
    ["5.3.2", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@octokit-request-5.3.2-1ca8b90a407772a1ee1ab758e7e0aced213b9883-integrity/node_modules/@octokit/request/"),
      packageDependencies: new Map([
        ["@octokit/endpoint", "5.5.3"],
        ["@octokit/request-error", "1.2.1"],
        ["@octokit/types", "2.2.0"],
        ["deprecation", "2.3.1"],
        ["is-plain-object", "3.0.0"],
        ["node-fetch", "2.6.0"],
        ["once", "1.4.0"],
        ["universal-user-agent", "5.0.0"],
        ["@octokit/request", "5.3.2"],
      ]),
    }],
  ])],
  ["@octokit/endpoint", new Map([
    ["5.5.3", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@octokit-endpoint-5.5.3-0397d1baaca687a4c8454ba424a627699d97c978-integrity/node_modules/@octokit/endpoint/"),
      packageDependencies: new Map([
        ["@octokit/types", "2.2.0"],
        ["is-plain-object", "3.0.0"],
        ["universal-user-agent", "5.0.0"],
        ["@octokit/endpoint", "5.5.3"],
      ]),
    }],
  ])],
  ["@octokit/types", new Map([
    ["2.2.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@octokit-types-2.2.0-ddb0a90cf3e9624ae97e09d16f21f4c4a682d3be-integrity/node_modules/@octokit/types/"),
      packageDependencies: new Map([
        ["@types/node", "13.7.4"],
        ["@octokit/types", "2.2.0"],
      ]),
    }],
  ])],
  ["@types/node", new Map([
    ["13.7.4", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@types-node-13.7.4-76c3cb3a12909510f52e5dc04a6298cdf9504ffd-integrity/node_modules/@types/node/"),
      packageDependencies: new Map([
        ["@types/node", "13.7.4"],
      ]),
    }],
    ["12.7.12", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@types-node-12.7.12-7c6c571cc2f3f3ac4a59a5f2bd48f5bdbc8653cc-integrity/node_modules/@types/node/"),
      packageDependencies: new Map([
        ["@types/node", "12.7.12"],
      ]),
    }],
  ])],
  ["is-plain-object", new Map([
    ["3.0.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-is-plain-object-3.0.0-47bfc5da1b5d50d64110806c199359482e75a928-integrity/node_modules/is-plain-object/"),
      packageDependencies: new Map([
        ["isobject", "4.0.0"],
        ["is-plain-object", "3.0.0"],
      ]),
    }],
  ])],
  ["isobject", new Map([
    ["4.0.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-isobject-4.0.0-3f1c9155e73b192022a80819bacd0343711697b0-integrity/node_modules/isobject/"),
      packageDependencies: new Map([
        ["isobject", "4.0.0"],
      ]),
    }],
  ])],
  ["universal-user-agent", new Map([
    ["5.0.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-universal-user-agent-5.0.0-a3182aa758069bf0e79952570ca757de3579c1d9-integrity/node_modules/universal-user-agent/"),
      packageDependencies: new Map([
        ["os-name", "3.1.0"],
        ["universal-user-agent", "5.0.0"],
      ]),
    }],
    ["2.1.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-universal-user-agent-2.1.0-5abfbcc036a1ba490cb941f8fd68c46d3669e8e4-integrity/node_modules/universal-user-agent/"),
      packageDependencies: new Map([
        ["os-name", "3.1.0"],
        ["universal-user-agent", "2.1.0"],
      ]),
    }],
    ["4.0.1", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-universal-user-agent-4.0.1-fd8d6cb773a679a709e967ef8288a31fcc03e557-integrity/node_modules/universal-user-agent/"),
      packageDependencies: new Map([
        ["os-name", "3.1.0"],
        ["universal-user-agent", "4.0.1"],
      ]),
    }],
  ])],
  ["os-name", new Map([
    ["3.1.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-os-name-3.1.0-dec19d966296e1cd62d701a5a66ee1ddeae70801-integrity/node_modules/os-name/"),
      packageDependencies: new Map([
        ["macos-release", "2.3.0"],
        ["windows-release", "3.2.0"],
        ["os-name", "3.1.0"],
      ]),
    }],
  ])],
  ["macos-release", new Map([
    ["2.3.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-macos-release-2.3.0-eb1930b036c0800adebccd5f17bc4c12de8bb71f-integrity/node_modules/macos-release/"),
      packageDependencies: new Map([
        ["macos-release", "2.3.0"],
      ]),
    }],
  ])],
  ["windows-release", new Map([
    ["3.2.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-windows-release-3.2.0-8122dad5afc303d833422380680a79cdfa91785f-integrity/node_modules/windows-release/"),
      packageDependencies: new Map([
        ["execa", "1.0.0"],
        ["windows-release", "3.2.0"],
      ]),
    }],
  ])],
  ["execa", new Map([
    ["1.0.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-execa-1.0.0-c6236a5bb4df6d6f15e88e7f017798216749ddd8-integrity/node_modules/execa/"),
      packageDependencies: new Map([
        ["cross-spawn", "6.0.5"],
        ["get-stream", "4.1.0"],
        ["is-stream", "1.1.0"],
        ["npm-run-path", "2.0.2"],
        ["p-finally", "1.0.0"],
        ["signal-exit", "3.0.2"],
        ["strip-eof", "1.0.0"],
        ["execa", "1.0.0"],
      ]),
    }],
  ])],
  ["cross-spawn", new Map([
    ["6.0.5", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-cross-spawn-6.0.5-4a5ec7c64dfae22c3a14124dbacdee846d80cbc4-integrity/node_modules/cross-spawn/"),
      packageDependencies: new Map([
        ["nice-try", "1.0.5"],
        ["path-key", "2.0.1"],
        ["semver", "5.7.1"],
        ["shebang-command", "1.2.0"],
        ["which", "1.3.1"],
        ["cross-spawn", "6.0.5"],
      ]),
    }],
  ])],
  ["nice-try", new Map([
    ["1.0.5", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-nice-try-1.0.5-a3378a7696ce7d223e88fc9b764bd7ef1089e366-integrity/node_modules/nice-try/"),
      packageDependencies: new Map([
        ["nice-try", "1.0.5"],
      ]),
    }],
  ])],
  ["path-key", new Map([
    ["2.0.1", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-path-key-2.0.1-411cadb574c5a140d3a4b1910d40d80cc9f40b40-integrity/node_modules/path-key/"),
      packageDependencies: new Map([
        ["path-key", "2.0.1"],
      ]),
    }],
  ])],
  ["semver", new Map([
    ["5.7.1", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-semver-5.7.1-a954f931aeba508d307bbf069eff0c01c96116f7-integrity/node_modules/semver/"),
      packageDependencies: new Map([
        ["semver", "5.7.1"],
      ]),
    }],
  ])],
  ["shebang-command", new Map([
    ["1.2.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-shebang-command-1.2.0-44aac65b695b03398968c39f363fee5deafdf1ea-integrity/node_modules/shebang-command/"),
      packageDependencies: new Map([
        ["shebang-regex", "1.0.0"],
        ["shebang-command", "1.2.0"],
      ]),
    }],
  ])],
  ["shebang-regex", new Map([
    ["1.0.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-shebang-regex-1.0.0-da42f49740c0b42db2ca9728571cb190c98efea3-integrity/node_modules/shebang-regex/"),
      packageDependencies: new Map([
        ["shebang-regex", "1.0.0"],
      ]),
    }],
  ])],
  ["which", new Map([
    ["1.3.1", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-which-1.3.1-a45043d54f5805316da8d62f9f50918d3da70b0a-integrity/node_modules/which/"),
      packageDependencies: new Map([
        ["isexe", "2.0.0"],
        ["which", "1.3.1"],
      ]),
    }],
  ])],
  ["isexe", new Map([
    ["2.0.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-isexe-2.0.0-e8fbf374dc556ff8947a10dcb0572d633f2cfa10-integrity/node_modules/isexe/"),
      packageDependencies: new Map([
        ["isexe", "2.0.0"],
      ]),
    }],
  ])],
  ["get-stream", new Map([
    ["4.1.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-get-stream-4.1.0-c1b255575f3dc21d59bfc79cd3d2b46b1c3a54b5-integrity/node_modules/get-stream/"),
      packageDependencies: new Map([
        ["pump", "3.0.0"],
        ["get-stream", "4.1.0"],
      ]),
    }],
  ])],
  ["pump", new Map([
    ["3.0.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-pump-3.0.0-b4a2116815bde2f4e1ea602354e8c75565107a64-integrity/node_modules/pump/"),
      packageDependencies: new Map([
        ["end-of-stream", "1.4.4"],
        ["once", "1.4.0"],
        ["pump", "3.0.0"],
      ]),
    }],
  ])],
  ["end-of-stream", new Map([
    ["1.4.4", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-end-of-stream-1.4.4-5ae64a5f45057baf3626ec14da0ca5e4b2431eb0-integrity/node_modules/end-of-stream/"),
      packageDependencies: new Map([
        ["once", "1.4.0"],
        ["end-of-stream", "1.4.4"],
      ]),
    }],
  ])],
  ["once", new Map([
    ["1.4.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-once-1.4.0-583b1aa775961d4b113ac17d9c50baef9dd76bd1-integrity/node_modules/once/"),
      packageDependencies: new Map([
        ["wrappy", "1.0.2"],
        ["once", "1.4.0"],
      ]),
    }],
  ])],
  ["wrappy", new Map([
    ["1.0.2", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-wrappy-1.0.2-b5243d8f3ec1aa35f1364605bc0d1036e30ab69f-integrity/node_modules/wrappy/"),
      packageDependencies: new Map([
        ["wrappy", "1.0.2"],
      ]),
    }],
  ])],
  ["is-stream", new Map([
    ["1.1.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-is-stream-1.1.0-12d4a3dd4e68e0b79ceb8dbc84173ae80d91ca44-integrity/node_modules/is-stream/"),
      packageDependencies: new Map([
        ["is-stream", "1.1.0"],
      ]),
    }],
  ])],
  ["npm-run-path", new Map([
    ["2.0.2", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-npm-run-path-2.0.2-35a9232dfa35d7067b4cb2ddf2357b1871536c5f-integrity/node_modules/npm-run-path/"),
      packageDependencies: new Map([
        ["path-key", "2.0.1"],
        ["npm-run-path", "2.0.2"],
      ]),
    }],
  ])],
  ["p-finally", new Map([
    ["1.0.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-p-finally-1.0.0-3fbcfb15b899a44123b34b6dcc18b724336a2cae-integrity/node_modules/p-finally/"),
      packageDependencies: new Map([
        ["p-finally", "1.0.0"],
      ]),
    }],
  ])],
  ["signal-exit", new Map([
    ["3.0.2", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-signal-exit-3.0.2-b5fdc08f1287ea1178628e415e25132b73646c6d-integrity/node_modules/signal-exit/"),
      packageDependencies: new Map([
        ["signal-exit", "3.0.2"],
      ]),
    }],
  ])],
  ["strip-eof", new Map([
    ["1.0.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-strip-eof-1.0.0-bb43ff5598a6eb05d89b59fcd129c983313606bf-integrity/node_modules/strip-eof/"),
      packageDependencies: new Map([
        ["strip-eof", "1.0.0"],
      ]),
    }],
  ])],
  ["@octokit/request-error", new Map([
    ["1.2.1", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@octokit-request-error-1.2.1-ede0714c773f32347576c25649dc013ae6b31801-integrity/node_modules/@octokit/request-error/"),
      packageDependencies: new Map([
        ["@octokit/types", "2.2.0"],
        ["deprecation", "2.3.1"],
        ["once", "1.4.0"],
        ["@octokit/request-error", "1.2.1"],
      ]),
    }],
  ])],
  ["deprecation", new Map([
    ["2.3.1", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-deprecation-2.3.1-6368cbdb40abf3373b525ac87e4a260c3a700919-integrity/node_modules/deprecation/"),
      packageDependencies: new Map([
        ["deprecation", "2.3.1"],
      ]),
    }],
  ])],
  ["node-fetch", new Map([
    ["2.6.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-node-fetch-2.6.0-e633456386d4aa55863f676a7ab0daa8fdecb0fd-integrity/node_modules/node-fetch/"),
      packageDependencies: new Map([
        ["node-fetch", "2.6.0"],
      ]),
    }],
  ])],
  ["@octokit/rest", new Map([
    ["16.43.1", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@octokit-rest-16.43.1-3b11e7d1b1ac2bbeeb23b08a17df0b20947eda6b-integrity/node_modules/@octokit/rest/"),
      packageDependencies: new Map([
        ["@octokit/auth-token", "2.4.0"],
        ["@octokit/plugin-paginate-rest", "1.1.2"],
        ["@octokit/plugin-request-log", "1.0.0"],
        ["@octokit/plugin-rest-endpoint-methods", "2.4.0"],
        ["@octokit/request", "5.3.2"],
        ["@octokit/request-error", "1.2.1"],
        ["atob-lite", "2.0.0"],
        ["before-after-hook", "2.1.0"],
        ["btoa-lite", "1.0.0"],
        ["deprecation", "2.3.1"],
        ["lodash.get", "4.4.2"],
        ["lodash.set", "4.3.2"],
        ["lodash.uniq", "4.5.0"],
        ["octokit-pagination-methods", "1.1.0"],
        ["once", "1.4.0"],
        ["universal-user-agent", "4.0.1"],
        ["@octokit/rest", "16.43.1"],
      ]),
    }],
  ])],
  ["@octokit/auth-token", new Map([
    ["2.4.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@octokit-auth-token-2.4.0-b64178975218b99e4dfe948253f0673cbbb59d9f-integrity/node_modules/@octokit/auth-token/"),
      packageDependencies: new Map([
        ["@octokit/types", "2.2.0"],
        ["@octokit/auth-token", "2.4.0"],
      ]),
    }],
  ])],
  ["@octokit/plugin-paginate-rest", new Map([
    ["1.1.2", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@octokit-plugin-paginate-rest-1.1.2-004170acf8c2be535aba26727867d692f7b488fc-integrity/node_modules/@octokit/plugin-paginate-rest/"),
      packageDependencies: new Map([
        ["@octokit/types", "2.2.0"],
        ["@octokit/plugin-paginate-rest", "1.1.2"],
      ]),
    }],
  ])],
  ["@octokit/plugin-request-log", new Map([
    ["1.0.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@octokit-plugin-request-log-1.0.0-eef87a431300f6148c39a7f75f8cfeb218b2547e-integrity/node_modules/@octokit/plugin-request-log/"),
      packageDependencies: new Map([
        ["@octokit/plugin-request-log", "1.0.0"],
      ]),
    }],
  ])],
  ["@octokit/plugin-rest-endpoint-methods", new Map([
    ["2.4.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@octokit-plugin-rest-endpoint-methods-2.4.0-3288ecf5481f68c494dd0602fc15407a59faf61e-integrity/node_modules/@octokit/plugin-rest-endpoint-methods/"),
      packageDependencies: new Map([
        ["@octokit/types", "2.2.0"],
        ["deprecation", "2.3.1"],
        ["@octokit/plugin-rest-endpoint-methods", "2.4.0"],
      ]),
    }],
  ])],
  ["atob-lite", new Map([
    ["2.0.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-atob-lite-2.0.0-0fef5ad46f1bd7a8502c65727f0367d5ee43d696-integrity/node_modules/atob-lite/"),
      packageDependencies: new Map([
        ["atob-lite", "2.0.0"],
      ]),
    }],
  ])],
  ["before-after-hook", new Map([
    ["2.1.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-before-after-hook-2.1.0-b6c03487f44e24200dd30ca5e6a1979c5d2fb635-integrity/node_modules/before-after-hook/"),
      packageDependencies: new Map([
        ["before-after-hook", "2.1.0"],
      ]),
    }],
  ])],
  ["btoa-lite", new Map([
    ["1.0.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-btoa-lite-1.0.0-337766da15801210fdd956c22e9c6891ab9d0337-integrity/node_modules/btoa-lite/"),
      packageDependencies: new Map([
        ["btoa-lite", "1.0.0"],
      ]),
    }],
  ])],
  ["lodash.get", new Map([
    ["4.4.2", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-lodash-get-4.4.2-2d177f652fa31e939b4438d5341499dfa3825e99-integrity/node_modules/lodash.get/"),
      packageDependencies: new Map([
        ["lodash.get", "4.4.2"],
      ]),
    }],
  ])],
  ["lodash.set", new Map([
    ["4.3.2", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-lodash-set-4.3.2-d8757b1da807dde24816b0d6a84bea1a76230b23-integrity/node_modules/lodash.set/"),
      packageDependencies: new Map([
        ["lodash.set", "4.3.2"],
      ]),
    }],
  ])],
  ["lodash.uniq", new Map([
    ["4.5.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-lodash-uniq-4.5.0-d0225373aeb652adc1bc82e4945339a842754773-integrity/node_modules/lodash.uniq/"),
      packageDependencies: new Map([
        ["lodash.uniq", "4.5.0"],
      ]),
    }],
  ])],
  ["octokit-pagination-methods", new Map([
    ["1.1.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-octokit-pagination-methods-1.1.0-cf472edc9d551055f9ef73f6e42b4dbb4c80bea4-integrity/node_modules/octokit-pagination-methods/"),
      packageDependencies: new Map([
        ["octokit-pagination-methods", "1.1.0"],
      ]),
    }],
  ])],
  ["@yarnpkg/pnpify", new Map([
    ["2.0.0-rc.7", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@yarnpkg-pnpify-2.0.0-rc.7-0427e3d9f881db39176de3e52c59b40685552106-integrity/node_modules/@yarnpkg/pnpify/"),
      packageDependencies: new Map([
        ["typescript", "3.6.4"],
        ["@yarnpkg/fslib", "2.0.0-rc.5"],
        ["cross-spawn", "6.0.5"],
        ["json5", "2.1.1"],
        ["@yarnpkg/pnpify", "2.0.0-rc.7"],
      ]),
    }],
  ])],
  ["@yarnpkg/fslib", new Map([
    ["2.0.0-rc.5", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@yarnpkg-fslib-2.0.0-rc.5-e781f036bcef47fd7cc93da5bc9b66ccfd667107-integrity/node_modules/@yarnpkg/fslib/"),
      packageDependencies: new Map([
        ["@yarnpkg/libzip", "2.0.0-rc.3"],
        ["tmp", "0.0.33"],
        ["@yarnpkg/fslib", "2.0.0-rc.5"],
      ]),
    }],
  ])],
  ["@yarnpkg/libzip", new Map([
    ["2.0.0-rc.3", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-@yarnpkg-libzip-2.0.0-rc.3-1295d8744360bc3002acbb3683094fd1bd89b1c5-integrity/node_modules/@yarnpkg/libzip/"),
      packageDependencies: new Map([
        ["@yarnpkg/libzip", "2.0.0-rc.3"],
      ]),
    }],
  ])],
  ["tmp", new Map([
    ["0.0.33", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-tmp-0.0.33-6d34335889768d21b2bcda0aa277ced3b1bfadf9-integrity/node_modules/tmp/"),
      packageDependencies: new Map([
        ["os-tmpdir", "1.0.2"],
        ["tmp", "0.0.33"],
      ]),
    }],
  ])],
  ["os-tmpdir", new Map([
    ["1.0.2", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-os-tmpdir-1.0.2-bbe67406c79aa85c5cfec766fe5734555dfa1274-integrity/node_modules/os-tmpdir/"),
      packageDependencies: new Map([
        ["os-tmpdir", "1.0.2"],
      ]),
    }],
  ])],
  ["json5", new Map([
    ["2.1.1", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-json5-2.1.1-81b6cb04e9ba496f1c7005d07b4368a2638f90b6-integrity/node_modules/json5/"),
      packageDependencies: new Map([
        ["minimist", "1.2.0"],
        ["json5", "2.1.1"],
      ]),
    }],
  ])],
  ["minimist", new Map([
    ["1.2.0", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-minimist-1.2.0-a35008b20f41383eec1fb914f4cd5df79a264284-integrity/node_modules/minimist/"),
      packageDependencies: new Map([
        ["minimist", "1.2.0"],
      ]),
    }],
  ])],
  ["ts-node", new Map([
    ["8.4.1", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-ts-node-8.4.1-270b0dba16e8723c9fa4f9b4775d3810fd994b4f-integrity/node_modules/ts-node/"),
      packageDependencies: new Map([
        ["typescript", "3.6.4"],
        ["arg", "4.1.3"],
        ["diff", "4.0.2"],
        ["make-error", "1.3.6"],
        ["source-map-support", "0.5.16"],
        ["yn", "3.1.1"],
        ["ts-node", "8.4.1"],
      ]),
    }],
  ])],
  ["arg", new Map([
    ["4.1.3", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-arg-4.1.3-269fc7ad5b8e42cb63c896d5666017261c144089-integrity/node_modules/arg/"),
      packageDependencies: new Map([
        ["arg", "4.1.3"],
      ]),
    }],
  ])],
  ["diff", new Map([
    ["4.0.2", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-diff-4.0.2-60f3aecb89d5fae520c11aa19efc2bb982aade7d-integrity/node_modules/diff/"),
      packageDependencies: new Map([
        ["diff", "4.0.2"],
      ]),
    }],
  ])],
  ["make-error", new Map([
    ["1.3.6", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-make-error-1.3.6-2eb2e37ea9b67c4891f684a1394799af484cf7a2-integrity/node_modules/make-error/"),
      packageDependencies: new Map([
        ["make-error", "1.3.6"],
      ]),
    }],
  ])],
  ["source-map-support", new Map([
    ["0.5.16", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-source-map-support-0.5.16-0ae069e7fe3ba7538c64c98515e35339eac5a042-integrity/node_modules/source-map-support/"),
      packageDependencies: new Map([
        ["buffer-from", "1.1.1"],
        ["source-map", "0.6.1"],
        ["source-map-support", "0.5.16"],
      ]),
    }],
  ])],
  ["buffer-from", new Map([
    ["1.1.1", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-buffer-from-1.1.1-32713bc028f75c02fdb710d7c7bcec1f2c6070ef-integrity/node_modules/buffer-from/"),
      packageDependencies: new Map([
        ["buffer-from", "1.1.1"],
      ]),
    }],
  ])],
  ["source-map", new Map([
    ["0.6.1", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-source-map-0.6.1-74722af32e9614e9c287a8d0bbde48b5e2f1a263-integrity/node_modules/source-map/"),
      packageDependencies: new Map([
        ["source-map", "0.6.1"],
      ]),
    }],
  ])],
  ["yn", new Map([
    ["3.1.1", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-yn-3.1.1-1e87401a09d767c1d5eab26a6e4c185182d2eb50-integrity/node_modules/yn/"),
      packageDependencies: new Map([
        ["yn", "3.1.1"],
      ]),
    }],
  ])],
  ["typescript", new Map([
    ["3.6.4", {
      packageLocation: path.resolve(__dirname, "../../../../Library/Caches/Yarn/v6/npm-typescript-3.6.4-b18752bb3792bc1a0281335f7f6ebf1bbfc5b91d-integrity/node_modules/typescript/"),
      packageDependencies: new Map([
        ["typescript", "3.6.4"],
      ]),
    }],
  ])],
  [null, new Map([
    [null, {
      packageLocation: path.resolve(__dirname, "./"),
      packageDependencies: new Map([
        ["@actions/core", "1.1.3"],
        ["@actions/github", "1.1.0"],
        ["@types/node", "12.7.12"],
        ["@yarnpkg/pnpify", "2.0.0-rc.7"],
        ["ts-node", "8.4.1"],
        ["typescript", "3.6.4"],
      ]),
    }],
  ])],
]);

let locatorsByLocations = new Map([
  ["../../../../Library/Caches/Yarn/v6/npm-@actions-core-1.1.3-543b0e7ca0e53dccc5dca4811a4fac59c1b35f5c-integrity/node_modules/@actions/core/", {"name":"@actions/core","reference":"1.1.3"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@actions-github-1.1.0-06f34e6b0cf07eb2b3641de3e680dbfae6bcd400-integrity/node_modules/@actions/github/", {"name":"@actions/github","reference":"1.1.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@octokit-graphql-2.1.3-60c058a0ed5fa242eca6f938908d95fd1a2f4b92-integrity/node_modules/@octokit/graphql/", {"name":"@octokit/graphql","reference":"2.1.3"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@octokit-request-5.3.2-1ca8b90a407772a1ee1ab758e7e0aced213b9883-integrity/node_modules/@octokit/request/", {"name":"@octokit/request","reference":"5.3.2"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@octokit-endpoint-5.5.3-0397d1baaca687a4c8454ba424a627699d97c978-integrity/node_modules/@octokit/endpoint/", {"name":"@octokit/endpoint","reference":"5.5.3"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@octokit-types-2.2.0-ddb0a90cf3e9624ae97e09d16f21f4c4a682d3be-integrity/node_modules/@octokit/types/", {"name":"@octokit/types","reference":"2.2.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@types-node-13.7.4-76c3cb3a12909510f52e5dc04a6298cdf9504ffd-integrity/node_modules/@types/node/", {"name":"@types/node","reference":"13.7.4"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@types-node-12.7.12-7c6c571cc2f3f3ac4a59a5f2bd48f5bdbc8653cc-integrity/node_modules/@types/node/", {"name":"@types/node","reference":"12.7.12"}],
  ["../../../../Library/Caches/Yarn/v6/npm-is-plain-object-3.0.0-47bfc5da1b5d50d64110806c199359482e75a928-integrity/node_modules/is-plain-object/", {"name":"is-plain-object","reference":"3.0.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-isobject-4.0.0-3f1c9155e73b192022a80819bacd0343711697b0-integrity/node_modules/isobject/", {"name":"isobject","reference":"4.0.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-universal-user-agent-5.0.0-a3182aa758069bf0e79952570ca757de3579c1d9-integrity/node_modules/universal-user-agent/", {"name":"universal-user-agent","reference":"5.0.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-universal-user-agent-2.1.0-5abfbcc036a1ba490cb941f8fd68c46d3669e8e4-integrity/node_modules/universal-user-agent/", {"name":"universal-user-agent","reference":"2.1.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-universal-user-agent-4.0.1-fd8d6cb773a679a709e967ef8288a31fcc03e557-integrity/node_modules/universal-user-agent/", {"name":"universal-user-agent","reference":"4.0.1"}],
  ["../../../../Library/Caches/Yarn/v6/npm-os-name-3.1.0-dec19d966296e1cd62d701a5a66ee1ddeae70801-integrity/node_modules/os-name/", {"name":"os-name","reference":"3.1.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-macos-release-2.3.0-eb1930b036c0800adebccd5f17bc4c12de8bb71f-integrity/node_modules/macos-release/", {"name":"macos-release","reference":"2.3.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-windows-release-3.2.0-8122dad5afc303d833422380680a79cdfa91785f-integrity/node_modules/windows-release/", {"name":"windows-release","reference":"3.2.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-execa-1.0.0-c6236a5bb4df6d6f15e88e7f017798216749ddd8-integrity/node_modules/execa/", {"name":"execa","reference":"1.0.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-cross-spawn-6.0.5-4a5ec7c64dfae22c3a14124dbacdee846d80cbc4-integrity/node_modules/cross-spawn/", {"name":"cross-spawn","reference":"6.0.5"}],
  ["../../../../Library/Caches/Yarn/v6/npm-nice-try-1.0.5-a3378a7696ce7d223e88fc9b764bd7ef1089e366-integrity/node_modules/nice-try/", {"name":"nice-try","reference":"1.0.5"}],
  ["../../../../Library/Caches/Yarn/v6/npm-path-key-2.0.1-411cadb574c5a140d3a4b1910d40d80cc9f40b40-integrity/node_modules/path-key/", {"name":"path-key","reference":"2.0.1"}],
  ["../../../../Library/Caches/Yarn/v6/npm-semver-5.7.1-a954f931aeba508d307bbf069eff0c01c96116f7-integrity/node_modules/semver/", {"name":"semver","reference":"5.7.1"}],
  ["../../../../Library/Caches/Yarn/v6/npm-shebang-command-1.2.0-44aac65b695b03398968c39f363fee5deafdf1ea-integrity/node_modules/shebang-command/", {"name":"shebang-command","reference":"1.2.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-shebang-regex-1.0.0-da42f49740c0b42db2ca9728571cb190c98efea3-integrity/node_modules/shebang-regex/", {"name":"shebang-regex","reference":"1.0.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-which-1.3.1-a45043d54f5805316da8d62f9f50918d3da70b0a-integrity/node_modules/which/", {"name":"which","reference":"1.3.1"}],
  ["../../../../Library/Caches/Yarn/v6/npm-isexe-2.0.0-e8fbf374dc556ff8947a10dcb0572d633f2cfa10-integrity/node_modules/isexe/", {"name":"isexe","reference":"2.0.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-get-stream-4.1.0-c1b255575f3dc21d59bfc79cd3d2b46b1c3a54b5-integrity/node_modules/get-stream/", {"name":"get-stream","reference":"4.1.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-pump-3.0.0-b4a2116815bde2f4e1ea602354e8c75565107a64-integrity/node_modules/pump/", {"name":"pump","reference":"3.0.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-end-of-stream-1.4.4-5ae64a5f45057baf3626ec14da0ca5e4b2431eb0-integrity/node_modules/end-of-stream/", {"name":"end-of-stream","reference":"1.4.4"}],
  ["../../../../Library/Caches/Yarn/v6/npm-once-1.4.0-583b1aa775961d4b113ac17d9c50baef9dd76bd1-integrity/node_modules/once/", {"name":"once","reference":"1.4.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-wrappy-1.0.2-b5243d8f3ec1aa35f1364605bc0d1036e30ab69f-integrity/node_modules/wrappy/", {"name":"wrappy","reference":"1.0.2"}],
  ["../../../../Library/Caches/Yarn/v6/npm-is-stream-1.1.0-12d4a3dd4e68e0b79ceb8dbc84173ae80d91ca44-integrity/node_modules/is-stream/", {"name":"is-stream","reference":"1.1.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-npm-run-path-2.0.2-35a9232dfa35d7067b4cb2ddf2357b1871536c5f-integrity/node_modules/npm-run-path/", {"name":"npm-run-path","reference":"2.0.2"}],
  ["../../../../Library/Caches/Yarn/v6/npm-p-finally-1.0.0-3fbcfb15b899a44123b34b6dcc18b724336a2cae-integrity/node_modules/p-finally/", {"name":"p-finally","reference":"1.0.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-signal-exit-3.0.2-b5fdc08f1287ea1178628e415e25132b73646c6d-integrity/node_modules/signal-exit/", {"name":"signal-exit","reference":"3.0.2"}],
  ["../../../../Library/Caches/Yarn/v6/npm-strip-eof-1.0.0-bb43ff5598a6eb05d89b59fcd129c983313606bf-integrity/node_modules/strip-eof/", {"name":"strip-eof","reference":"1.0.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@octokit-request-error-1.2.1-ede0714c773f32347576c25649dc013ae6b31801-integrity/node_modules/@octokit/request-error/", {"name":"@octokit/request-error","reference":"1.2.1"}],
  ["../../../../Library/Caches/Yarn/v6/npm-deprecation-2.3.1-6368cbdb40abf3373b525ac87e4a260c3a700919-integrity/node_modules/deprecation/", {"name":"deprecation","reference":"2.3.1"}],
  ["../../../../Library/Caches/Yarn/v6/npm-node-fetch-2.6.0-e633456386d4aa55863f676a7ab0daa8fdecb0fd-integrity/node_modules/node-fetch/", {"name":"node-fetch","reference":"2.6.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@octokit-rest-16.43.1-3b11e7d1b1ac2bbeeb23b08a17df0b20947eda6b-integrity/node_modules/@octokit/rest/", {"name":"@octokit/rest","reference":"16.43.1"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@octokit-auth-token-2.4.0-b64178975218b99e4dfe948253f0673cbbb59d9f-integrity/node_modules/@octokit/auth-token/", {"name":"@octokit/auth-token","reference":"2.4.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@octokit-plugin-paginate-rest-1.1.2-004170acf8c2be535aba26727867d692f7b488fc-integrity/node_modules/@octokit/plugin-paginate-rest/", {"name":"@octokit/plugin-paginate-rest","reference":"1.1.2"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@octokit-plugin-request-log-1.0.0-eef87a431300f6148c39a7f75f8cfeb218b2547e-integrity/node_modules/@octokit/plugin-request-log/", {"name":"@octokit/plugin-request-log","reference":"1.0.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@octokit-plugin-rest-endpoint-methods-2.4.0-3288ecf5481f68c494dd0602fc15407a59faf61e-integrity/node_modules/@octokit/plugin-rest-endpoint-methods/", {"name":"@octokit/plugin-rest-endpoint-methods","reference":"2.4.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-atob-lite-2.0.0-0fef5ad46f1bd7a8502c65727f0367d5ee43d696-integrity/node_modules/atob-lite/", {"name":"atob-lite","reference":"2.0.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-before-after-hook-2.1.0-b6c03487f44e24200dd30ca5e6a1979c5d2fb635-integrity/node_modules/before-after-hook/", {"name":"before-after-hook","reference":"2.1.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-btoa-lite-1.0.0-337766da15801210fdd956c22e9c6891ab9d0337-integrity/node_modules/btoa-lite/", {"name":"btoa-lite","reference":"1.0.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-lodash-get-4.4.2-2d177f652fa31e939b4438d5341499dfa3825e99-integrity/node_modules/lodash.get/", {"name":"lodash.get","reference":"4.4.2"}],
  ["../../../../Library/Caches/Yarn/v6/npm-lodash-set-4.3.2-d8757b1da807dde24816b0d6a84bea1a76230b23-integrity/node_modules/lodash.set/", {"name":"lodash.set","reference":"4.3.2"}],
  ["../../../../Library/Caches/Yarn/v6/npm-lodash-uniq-4.5.0-d0225373aeb652adc1bc82e4945339a842754773-integrity/node_modules/lodash.uniq/", {"name":"lodash.uniq","reference":"4.5.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-octokit-pagination-methods-1.1.0-cf472edc9d551055f9ef73f6e42b4dbb4c80bea4-integrity/node_modules/octokit-pagination-methods/", {"name":"octokit-pagination-methods","reference":"1.1.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@yarnpkg-pnpify-2.0.0-rc.7-0427e3d9f881db39176de3e52c59b40685552106-integrity/node_modules/@yarnpkg/pnpify/", {"name":"@yarnpkg/pnpify","reference":"2.0.0-rc.7"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@yarnpkg-fslib-2.0.0-rc.5-e781f036bcef47fd7cc93da5bc9b66ccfd667107-integrity/node_modules/@yarnpkg/fslib/", {"name":"@yarnpkg/fslib","reference":"2.0.0-rc.5"}],
  ["../../../../Library/Caches/Yarn/v6/npm-@yarnpkg-libzip-2.0.0-rc.3-1295d8744360bc3002acbb3683094fd1bd89b1c5-integrity/node_modules/@yarnpkg/libzip/", {"name":"@yarnpkg/libzip","reference":"2.0.0-rc.3"}],
  ["../../../../Library/Caches/Yarn/v6/npm-tmp-0.0.33-6d34335889768d21b2bcda0aa277ced3b1bfadf9-integrity/node_modules/tmp/", {"name":"tmp","reference":"0.0.33"}],
  ["../../../../Library/Caches/Yarn/v6/npm-os-tmpdir-1.0.2-bbe67406c79aa85c5cfec766fe5734555dfa1274-integrity/node_modules/os-tmpdir/", {"name":"os-tmpdir","reference":"1.0.2"}],
  ["../../../../Library/Caches/Yarn/v6/npm-json5-2.1.1-81b6cb04e9ba496f1c7005d07b4368a2638f90b6-integrity/node_modules/json5/", {"name":"json5","reference":"2.1.1"}],
  ["../../../../Library/Caches/Yarn/v6/npm-minimist-1.2.0-a35008b20f41383eec1fb914f4cd5df79a264284-integrity/node_modules/minimist/", {"name":"minimist","reference":"1.2.0"}],
  ["../../../../Library/Caches/Yarn/v6/npm-ts-node-8.4.1-270b0dba16e8723c9fa4f9b4775d3810fd994b4f-integrity/node_modules/ts-node/", {"name":"ts-node","reference":"8.4.1"}],
  ["../../../../Library/Caches/Yarn/v6/npm-arg-4.1.3-269fc7ad5b8e42cb63c896d5666017261c144089-integrity/node_modules/arg/", {"name":"arg","reference":"4.1.3"}],
  ["../../../../Library/Caches/Yarn/v6/npm-diff-4.0.2-60f3aecb89d5fae520c11aa19efc2bb982aade7d-integrity/node_modules/diff/", {"name":"diff","reference":"4.0.2"}],
  ["../../../../Library/Caches/Yarn/v6/npm-make-error-1.3.6-2eb2e37ea9b67c4891f684a1394799af484cf7a2-integrity/node_modules/make-error/", {"name":"make-error","reference":"1.3.6"}],
  ["../../../../Library/Caches/Yarn/v6/npm-source-map-support-0.5.16-0ae069e7fe3ba7538c64c98515e35339eac5a042-integrity/node_modules/source-map-support/", {"name":"source-map-support","reference":"0.5.16"}],
  ["../../../../Library/Caches/Yarn/v6/npm-buffer-from-1.1.1-32713bc028f75c02fdb710d7c7bcec1f2c6070ef-integrity/node_modules/buffer-from/", {"name":"buffer-from","reference":"1.1.1"}],
  ["../../../../Library/Caches/Yarn/v6/npm-source-map-0.6.1-74722af32e9614e9c287a8d0bbde48b5e2f1a263-integrity/node_modules/source-map/", {"name":"source-map","reference":"0.6.1"}],
  ["../../../../Library/Caches/Yarn/v6/npm-yn-3.1.1-1e87401a09d767c1d5eab26a6e4c185182d2eb50-integrity/node_modules/yn/", {"name":"yn","reference":"3.1.1"}],
  ["../../../../Library/Caches/Yarn/v6/npm-typescript-3.6.4-b18752bb3792bc1a0281335f7f6ebf1bbfc5b91d-integrity/node_modules/typescript/", {"name":"typescript","reference":"3.6.4"}],
  ["./", topLevelLocator],
]);
exports.findPackageLocator = function findPackageLocator(location) {
  let relativeLocation = normalizePath(path.relative(__dirname, location));

  if (!relativeLocation.match(isStrictRegExp))
    relativeLocation = `./${relativeLocation}`;

  if (location.match(isDirRegExp) && relativeLocation.charAt(relativeLocation.length - 1) !== '/')
    relativeLocation = `${relativeLocation}/`;

  let match;

  if (relativeLocation.length >= 185 && relativeLocation[184] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 185)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 169 && relativeLocation[168] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 169)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 165 && relativeLocation[164] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 165)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 163 && relativeLocation[162] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 163)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 155 && relativeLocation[154] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 155)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 151 && relativeLocation[150] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 151)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 149 && relativeLocation[148] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 149)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 148 && relativeLocation[147] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 148)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 146 && relativeLocation[145] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 146)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 145 && relativeLocation[144] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 145)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 144 && relativeLocation[143] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 144)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 143 && relativeLocation[142] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 143)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 141 && relativeLocation[140] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 141)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 139 && relativeLocation[138] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 139)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 137 && relativeLocation[136] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 137)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 135 && relativeLocation[134] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 135)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 134 && relativeLocation[133] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 134)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 133 && relativeLocation[132] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 133)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 131 && relativeLocation[130] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 131)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 129 && relativeLocation[128] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 129)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 127 && relativeLocation[126] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 127)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 125 && relativeLocation[124] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 125)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 123 && relativeLocation[122] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 123)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 121 && relativeLocation[120] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 121)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 119 && relativeLocation[118] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 119)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 118 && relativeLocation[117] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 118)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 117 && relativeLocation[116] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 117)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 115 && relativeLocation[114] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 115)))
      return blacklistCheck(match);

  if (relativeLocation.length >= 2 && relativeLocation[1] === '/')
    if (match = locatorsByLocations.get(relativeLocation.substr(0, 2)))
      return blacklistCheck(match);

  return null;
};


/**
 * Returns the module that should be used to resolve require calls. It's usually the direct parent, except if we're
 * inside an eval expression.
 */

function getIssuerModule(parent) {
  let issuer = parent;

  while (issuer && (issuer.id === '[eval]' || issuer.id === '<repl>' || !issuer.filename)) {
    issuer = issuer.parent;
  }

  return issuer;
}

/**
 * Returns information about a package in a safe way (will throw if they cannot be retrieved)
 */

function getPackageInformationSafe(packageLocator) {
  const packageInformation = exports.getPackageInformation(packageLocator);

  if (!packageInformation) {
    throw makeError(
      `INTERNAL`,
      `Couldn't find a matching entry in the dependency tree for the specified parent (this is probably an internal error)`
    );
  }

  return packageInformation;
}

/**
 * Implements the node resolution for folder access and extension selection
 */

function applyNodeExtensionResolution(unqualifiedPath, {extensions}) {
  // We use this "infinite while" so that we can restart the process as long as we hit package folders
  while (true) {
    let stat;

    try {
      stat = statSync(unqualifiedPath);
    } catch (error) {}

    // If the file exists and is a file, we can stop right there

    if (stat && !stat.isDirectory()) {
      // If the very last component of the resolved path is a symlink to a file, we then resolve it to a file. We only
      // do this first the last component, and not the rest of the path! This allows us to support the case of bin
      // symlinks, where a symlink in "/xyz/pkg-name/.bin/bin-name" will point somewhere else (like "/xyz/pkg-name/index.js").
      // In such a case, we want relative requires to be resolved relative to "/xyz/pkg-name/" rather than "/xyz/pkg-name/.bin/".
      //
      // Also note that the reason we must use readlink on the last component (instead of realpath on the whole path)
      // is that we must preserve the other symlinks, in particular those used by pnp to deambiguate packages using
      // peer dependencies. For example, "/xyz/.pnp/local/pnp-01234569/.bin/bin-name" should see its relative requires
      // be resolved relative to "/xyz/.pnp/local/pnp-0123456789/" rather than "/xyz/pkg-with-peers/", because otherwise
      // we would lose the information that would tell us what are the dependencies of pkg-with-peers relative to its
      // ancestors.

      if (lstatSync(unqualifiedPath).isSymbolicLink()) {
        unqualifiedPath = path.normalize(path.resolve(path.dirname(unqualifiedPath), readlinkSync(unqualifiedPath)));
      }

      return unqualifiedPath;
    }

    // If the file is a directory, we must check if it contains a package.json with a "main" entry

    if (stat && stat.isDirectory()) {
      let pkgJson;

      try {
        pkgJson = JSON.parse(readFileSync(`${unqualifiedPath}/package.json`, 'utf-8'));
      } catch (error) {}

      let nextUnqualifiedPath;

      if (pkgJson && pkgJson.main) {
        nextUnqualifiedPath = path.resolve(unqualifiedPath, pkgJson.main);
      }

      // If the "main" field changed the path, we start again from this new location

      if (nextUnqualifiedPath && nextUnqualifiedPath !== unqualifiedPath) {
        const resolution = applyNodeExtensionResolution(nextUnqualifiedPath, {extensions});

        if (resolution !== null) {
          return resolution;
        }
      }
    }

    // Otherwise we check if we find a file that match one of the supported extensions

    const qualifiedPath = extensions
      .map(extension => {
        return `${unqualifiedPath}${extension}`;
      })
      .find(candidateFile => {
        return existsSync(candidateFile);
      });

    if (qualifiedPath) {
      return qualifiedPath;
    }

    // Otherwise, we check if the path is a folder - in such a case, we try to use its index

    if (stat && stat.isDirectory()) {
      const indexPath = extensions
        .map(extension => {
          return `${unqualifiedPath}/index${extension}`;
        })
        .find(candidateFile => {
          return existsSync(candidateFile);
        });

      if (indexPath) {
        return indexPath;
      }
    }

    // Otherwise there's nothing else we can do :(

    return null;
  }
}

/**
 * This function creates fake modules that can be used with the _resolveFilename function.
 * Ideally it would be nice to be able to avoid this, since it causes useless allocations
 * and cannot be cached efficiently (we recompute the nodeModulePaths every time).
 *
 * Fortunately, this should only affect the fallback, and there hopefully shouldn't be a
 * lot of them.
 */

function makeFakeModule(path) {
  const fakeModule = new Module(path, false);
  fakeModule.filename = path;
  fakeModule.paths = Module._nodeModulePaths(path);
  return fakeModule;
}

/**
 * Normalize path to posix format.
 */

function normalizePath(fsPath) {
  fsPath = path.normalize(fsPath);

  if (process.platform === 'win32') {
    fsPath = fsPath.replace(backwardSlashRegExp, '/');
  }

  return fsPath;
}

/**
 * Forward the resolution to the next resolver (usually the native one)
 */

function callNativeResolution(request, issuer) {
  if (issuer.endsWith('/')) {
    issuer += 'internal.js';
  }

  try {
    enableNativeHooks = false;

    // Since we would need to create a fake module anyway (to call _resolveLookupPath that
    // would give us the paths to give to _resolveFilename), we can as well not use
    // the {paths} option at all, since it internally makes _resolveFilename create another
    // fake module anyway.
    return Module._resolveFilename(request, makeFakeModule(issuer), false);
  } finally {
    enableNativeHooks = true;
  }
}

/**
 * This key indicates which version of the standard is implemented by this resolver. The `std` key is the
 * Plug'n'Play standard, and any other key are third-party extensions. Third-party extensions are not allowed
 * to override the standard, and can only offer new methods.
 *
 * If an new version of the Plug'n'Play standard is released and some extensions conflict with newly added
 * functions, they'll just have to fix the conflicts and bump their own version number.
 */

exports.VERSIONS = {std: 1};

/**
 * Useful when used together with getPackageInformation to fetch information about the top-level package.
 */

exports.topLevel = {name: null, reference: null};

/**
 * Gets the package information for a given locator. Returns null if they cannot be retrieved.
 */

exports.getPackageInformation = function getPackageInformation({name, reference}) {
  const packageInformationStore = packageInformationStores.get(name);

  if (!packageInformationStore) {
    return null;
  }

  const packageInformation = packageInformationStore.get(reference);

  if (!packageInformation) {
    return null;
  }

  return packageInformation;
};

/**
 * Transforms a request (what's typically passed as argument to the require function) into an unqualified path.
 * This path is called "unqualified" because it only changes the package name to the package location on the disk,
 * which means that the end result still cannot be directly accessed (for example, it doesn't try to resolve the
 * file extension, or to resolve directories to their "index.js" content). Use the "resolveUnqualified" function
 * to convert them to fully-qualified paths, or just use "resolveRequest" that do both operations in one go.
 *
 * Note that it is extremely important that the `issuer` path ends with a forward slash if the issuer is to be
 * treated as a folder (ie. "/tmp/foo/" rather than "/tmp/foo" if "foo" is a directory). Otherwise relative
 * imports won't be computed correctly (they'll get resolved relative to "/tmp/" instead of "/tmp/foo/").
 */

exports.resolveToUnqualified = function resolveToUnqualified(request, issuer, {considerBuiltins = true} = {}) {
  // The 'pnpapi' request is reserved and will always return the path to the PnP file, from everywhere

  if (request === `pnpapi`) {
    return pnpFile;
  }

  // Bailout if the request is a native module

  if (considerBuiltins && builtinModules.has(request)) {
    return null;
  }

  // We allow disabling the pnp resolution for some subpaths. This is because some projects, often legacy,
  // contain multiple levels of dependencies (ie. a yarn.lock inside a subfolder of a yarn.lock). This is
  // typically solved using workspaces, but not all of them have been converted already.

  if (ignorePattern && ignorePattern.test(normalizePath(issuer))) {
    const result = callNativeResolution(request, issuer);

    if (result === false) {
      throw makeError(
        `BUILTIN_NODE_RESOLUTION_FAIL`,
        `The builtin node resolution algorithm was unable to resolve the module referenced by "${request}" and requested from "${issuer}" (it didn't go through the pnp resolver because the issuer was explicitely ignored by the regexp "null")`,
        {
          request,
          issuer,
        }
      );
    }

    return result;
  }

  let unqualifiedPath;

  // If the request is a relative or absolute path, we just return it normalized

  const dependencyNameMatch = request.match(pathRegExp);

  if (!dependencyNameMatch) {
    if (path.isAbsolute(request)) {
      unqualifiedPath = path.normalize(request);
    } else if (issuer.match(isDirRegExp)) {
      unqualifiedPath = path.normalize(path.resolve(issuer, request));
    } else {
      unqualifiedPath = path.normalize(path.resolve(path.dirname(issuer), request));
    }
  }

  // Things are more hairy if it's a package require - we then need to figure out which package is needed, and in
  // particular the exact version for the given location on the dependency tree

  if (dependencyNameMatch) {
    const [, dependencyName, subPath] = dependencyNameMatch;

    const issuerLocator = exports.findPackageLocator(issuer);

    // If the issuer file doesn't seem to be owned by a package managed through pnp, then we resort to using the next
    // resolution algorithm in the chain, usually the native Node resolution one

    if (!issuerLocator) {
      const result = callNativeResolution(request, issuer);

      if (result === false) {
        throw makeError(
          `BUILTIN_NODE_RESOLUTION_FAIL`,
          `The builtin node resolution algorithm was unable to resolve the module referenced by "${request}" and requested from "${issuer}" (it didn't go through the pnp resolver because the issuer doesn't seem to be part of the Yarn-managed dependency tree)`,
          {
            request,
            issuer,
          }
        );
      }

      return result;
    }

    const issuerInformation = getPackageInformationSafe(issuerLocator);

    // We obtain the dependency reference in regard to the package that request it

    let dependencyReference = issuerInformation.packageDependencies.get(dependencyName);

    // If we can't find it, we check if we can potentially load it from the packages that have been defined as potential fallbacks.
    // It's a bit of a hack, but it improves compatibility with the existing Node ecosystem. Hopefully we should eventually be able
    // to kill this logic and become stricter once pnp gets enough traction and the affected packages fix themselves.

    if (issuerLocator !== topLevelLocator) {
      for (let t = 0, T = fallbackLocators.length; dependencyReference === undefined && t < T; ++t) {
        const fallbackInformation = getPackageInformationSafe(fallbackLocators[t]);
        dependencyReference = fallbackInformation.packageDependencies.get(dependencyName);
      }
    }

    // If we can't find the path, and if the package making the request is the top-level, we can offer nicer error messages

    if (!dependencyReference) {
      if (dependencyReference === null) {
        if (issuerLocator === topLevelLocator) {
          throw makeError(
            `MISSING_PEER_DEPENDENCY`,
            `You seem to be requiring a peer dependency ("${dependencyName}"), but it is not installed (which might be because you're the top-level package)`,
            {request, issuer, dependencyName}
          );
        } else {
          throw makeError(
            `MISSING_PEER_DEPENDENCY`,
            `Package "${issuerLocator.name}@${issuerLocator.reference}" is trying to access a peer dependency ("${dependencyName}") that should be provided by its direct ancestor but isn't`,
            {request, issuer, issuerLocator: Object.assign({}, issuerLocator), dependencyName}
          );
        }
      } else {
        if (issuerLocator === topLevelLocator) {
          throw makeError(
            `UNDECLARED_DEPENDENCY`,
            `You cannot require a package ("${dependencyName}") that is not declared in your dependencies (via "${issuer}")`,
            {request, issuer, dependencyName}
          );
        } else {
          const candidates = Array.from(issuerInformation.packageDependencies.keys());
          throw makeError(
            `UNDECLARED_DEPENDENCY`,
            `Package "${issuerLocator.name}@${issuerLocator.reference}" (via "${issuer}") is trying to require the package "${dependencyName}" (via "${request}") without it being listed in its dependencies (${candidates.join(
              `, `
            )})`,
            {request, issuer, issuerLocator: Object.assign({}, issuerLocator), dependencyName, candidates}
          );
        }
      }
    }

    // We need to check that the package exists on the filesystem, because it might not have been installed

    const dependencyLocator = {name: dependencyName, reference: dependencyReference};
    const dependencyInformation = exports.getPackageInformation(dependencyLocator);
    const dependencyLocation = path.resolve(__dirname, dependencyInformation.packageLocation);

    if (!dependencyLocation) {
      throw makeError(
        `MISSING_DEPENDENCY`,
        `Package "${dependencyLocator.name}@${dependencyLocator.reference}" is a valid dependency, but hasn't been installed and thus cannot be required (it might be caused if you install a partial tree, such as on production environments)`,
        {request, issuer, dependencyLocator: Object.assign({}, dependencyLocator)}
      );
    }

    // Now that we know which package we should resolve to, we only have to find out the file location

    if (subPath) {
      unqualifiedPath = path.resolve(dependencyLocation, subPath);
    } else {
      unqualifiedPath = dependencyLocation;
    }
  }

  return path.normalize(unqualifiedPath);
};

/**
 * Transforms an unqualified path into a qualified path by using the Node resolution algorithm (which automatically
 * appends ".js" / ".json", and transforms directory accesses into "index.js").
 */

exports.resolveUnqualified = function resolveUnqualified(
  unqualifiedPath,
  {extensions = Object.keys(Module._extensions)} = {}
) {
  const qualifiedPath = applyNodeExtensionResolution(unqualifiedPath, {extensions});

  if (qualifiedPath) {
    return path.normalize(qualifiedPath);
  } else {
    throw makeError(
      `QUALIFIED_PATH_RESOLUTION_FAILED`,
      `Couldn't find a suitable Node resolution for unqualified path "${unqualifiedPath}"`,
      {unqualifiedPath}
    );
  }
};

/**
 * Transforms a request into a fully qualified path.
 *
 * Note that it is extremely important that the `issuer` path ends with a forward slash if the issuer is to be
 * treated as a folder (ie. "/tmp/foo/" rather than "/tmp/foo" if "foo" is a directory). Otherwise relative
 * imports won't be computed correctly (they'll get resolved relative to "/tmp/" instead of "/tmp/foo/").
 */

exports.resolveRequest = function resolveRequest(request, issuer, {considerBuiltins, extensions} = {}) {
  let unqualifiedPath;

  try {
    unqualifiedPath = exports.resolveToUnqualified(request, issuer, {considerBuiltins});
  } catch (originalError) {
    // If we get a BUILTIN_NODE_RESOLUTION_FAIL error there, it means that we've had to use the builtin node
    // resolution, which usually shouldn't happen. It might be because the user is trying to require something
    // from a path loaded through a symlink (which is not possible, because we need something normalized to
    // figure out which package is making the require call), so we try to make the same request using a fully
    // resolved issuer and throws a better and more actionable error if it works.
    if (originalError.code === `BUILTIN_NODE_RESOLUTION_FAIL`) {
      let realIssuer;

      try {
        realIssuer = realpathSync(issuer);
      } catch (error) {}

      if (realIssuer) {
        if (issuer.endsWith(`/`)) {
          realIssuer = realIssuer.replace(/\/?$/, `/`);
        }

        try {
          exports.resolveToUnqualified(request, realIssuer, {considerBuiltins});
        } catch (error) {
          // If an error was thrown, the problem doesn't seem to come from a path not being normalized, so we
          // can just throw the original error which was legit.
          throw originalError;
        }

        // If we reach this stage, it means that resolveToUnqualified didn't fail when using the fully resolved
        // file path, which is very likely caused by a module being invoked through Node with a path not being
        // correctly normalized (ie you should use "node $(realpath script.js)" instead of "node script.js").
        throw makeError(
          `SYMLINKED_PATH_DETECTED`,
          `A pnp module ("${request}") has been required from what seems to be a symlinked path ("${issuer}"). This is not possible, you must ensure that your modules are invoked through their fully resolved path on the filesystem (in this case "${realIssuer}").`,
          {
            request,
            issuer,
            realIssuer,
          }
        );
      }
    }
    throw originalError;
  }

  if (unqualifiedPath === null) {
    return null;
  }

  try {
    return exports.resolveUnqualified(unqualifiedPath, {extensions});
  } catch (resolutionError) {
    if (resolutionError.code === 'QUALIFIED_PATH_RESOLUTION_FAILED') {
      Object.assign(resolutionError.data, {request, issuer});
    }
    throw resolutionError;
  }
};

/**
 * Setups the hook into the Node environment.
 *
 * From this point on, any call to `require()` will go through the "resolveRequest" function, and the result will
 * be used as path of the file to load.
 */

exports.setup = function setup() {
  // A small note: we don't replace the cache here (and instead use the native one). This is an effort to not
  // break code similar to "delete require.cache[require.resolve(FOO)]", where FOO is a package located outside
  // of the Yarn dependency tree. In this case, we defer the load to the native loader. If we were to replace the
  // cache by our own, the native loader would populate its own cache, which wouldn't be exposed anymore, so the
  // delete call would be broken.

  const originalModuleLoad = Module._load;

  Module._load = function(request, parent, isMain) {
    if (!enableNativeHooks) {
      return originalModuleLoad.call(Module, request, parent, isMain);
    }

    // Builtins are managed by the regular Node loader

    if (builtinModules.has(request)) {
      try {
        enableNativeHooks = false;
        return originalModuleLoad.call(Module, request, parent, isMain);
      } finally {
        enableNativeHooks = true;
      }
    }

    // The 'pnpapi' name is reserved to return the PnP api currently in use by the program

    if (request === `pnpapi`) {
      return pnpModule.exports;
    }

    // Request `Module._resolveFilename` (ie. `resolveRequest`) to tell us which file we should load

    const modulePath = Module._resolveFilename(request, parent, isMain);

    // Check if the module has already been created for the given file

    const cacheEntry = Module._cache[modulePath];

    if (cacheEntry) {
      return cacheEntry.exports;
    }

    // Create a new module and store it into the cache

    const module = new Module(modulePath, parent);
    Module._cache[modulePath] = module;

    // The main module is exposed as global variable

    if (isMain) {
      process.mainModule = module;
      module.id = '.';
    }

    // Try to load the module, and remove it from the cache if it fails

    let hasThrown = true;

    try {
      module.load(modulePath);
      hasThrown = false;
    } finally {
      if (hasThrown) {
        delete Module._cache[modulePath];
      }
    }

    // Some modules might have to be patched for compatibility purposes

    for (const [filter, patchFn] of patchedModules) {
      if (filter.test(request)) {
        module.exports = patchFn(exports.findPackageLocator(parent.filename), module.exports);
      }
    }

    return module.exports;
  };

  const originalModuleResolveFilename = Module._resolveFilename;

  Module._resolveFilename = function(request, parent, isMain, options) {
    if (!enableNativeHooks) {
      return originalModuleResolveFilename.call(Module, request, parent, isMain, options);
    }

    let issuers;

    if (options) {
      const optionNames = new Set(Object.keys(options));
      optionNames.delete('paths');

      if (optionNames.size > 0) {
        throw makeError(
          `UNSUPPORTED`,
          `Some options passed to require() aren't supported by PnP yet (${Array.from(optionNames).join(', ')})`
        );
      }

      if (options.paths) {
        issuers = options.paths.map(entry => `${path.normalize(entry)}/`);
      }
    }

    if (!issuers) {
      const issuerModule = getIssuerModule(parent);
      const issuer = issuerModule ? issuerModule.filename : `${process.cwd()}/`;

      issuers = [issuer];
    }

    let firstError;

    for (const issuer of issuers) {
      let resolution;

      try {
        resolution = exports.resolveRequest(request, issuer);
      } catch (error) {
        firstError = firstError || error;
        continue;
      }

      return resolution !== null ? resolution : request;
    }

    throw firstError;
  };

  const originalFindPath = Module._findPath;

  Module._findPath = function(request, paths, isMain) {
    if (!enableNativeHooks) {
      return originalFindPath.call(Module, request, paths, isMain);
    }

    for (const path of paths || []) {
      let resolution;

      try {
        resolution = exports.resolveRequest(request, path);
      } catch (error) {
        continue;
      }

      if (resolution) {
        return resolution;
      }
    }

    return false;
  };

  process.versions.pnp = String(exports.VERSIONS.std);
};

exports.setupCompatibilityLayer = () => {
  // ESLint currently doesn't have any portable way for shared configs to specify their own
  // plugins that should be used (https://github.com/eslint/eslint/issues/10125). This will
  // likely get fixed at some point, but it'll take time and in the meantime we'll just add
  // additional fallback entries for common shared configs.

  for (const name of [`react-scripts`]) {
    const packageInformationStore = packageInformationStores.get(name);
    if (packageInformationStore) {
      for (const reference of packageInformationStore.keys()) {
        fallbackLocators.push({name, reference});
      }
    }
  }

  // Modern versions of `resolve` support a specific entry point that custom resolvers can use
  // to inject a specific resolution logic without having to patch the whole package.
  //
  // Cf: https://github.com/browserify/resolve/pull/174

  patchedModules.push([
    /^\.\/normalize-options\.js$/,
    (issuer, normalizeOptions) => {
      if (!issuer || issuer.name !== 'resolve') {
        return normalizeOptions;
      }

      return (request, opts) => {
        opts = opts || {};

        if (opts.forceNodeResolution) {
          return opts;
        }

        opts.preserveSymlinks = true;
        opts.paths = function(request, basedir, getNodeModulesDir, opts) {
          // Extract the name of the package being requested (1=full name, 2=scope name, 3=local name)
          const parts = request.match(/^((?:(@[^\/]+)\/)?([^\/]+))/);

          // make sure that basedir ends with a slash
          if (basedir.charAt(basedir.length - 1) !== '/') {
            basedir = path.join(basedir, '/');
          }
          // This is guaranteed to return the path to the "package.json" file from the given package
          const manifestPath = exports.resolveToUnqualified(`${parts[1]}/package.json`, basedir);

          // The first dirname strips the package.json, the second strips the local named folder
          let nodeModules = path.dirname(path.dirname(manifestPath));

          // Strips the scope named folder if needed
          if (parts[2]) {
            nodeModules = path.dirname(nodeModules);
          }

          return [nodeModules];
        };

        return opts;
      };
    },
  ]);
};

if (module.parent && module.parent.id === 'internal/preload') {
  exports.setupCompatibilityLayer();

  exports.setup();
}

if (process.mainModule === module) {
  exports.setupCompatibilityLayer();

  const reportError = (code, message, data) => {
    process.stdout.write(`${JSON.stringify([{code, message, data}, null])}\n`);
  };

  const reportSuccess = resolution => {
    process.stdout.write(`${JSON.stringify([null, resolution])}\n`);
  };

  const processResolution = (request, issuer) => {
    try {
      reportSuccess(exports.resolveRequest(request, issuer));
    } catch (error) {
      reportError(error.code, error.message, error.data);
    }
  };

  const processRequest = data => {
    try {
      const [request, issuer] = JSON.parse(data);
      processResolution(request, issuer);
    } catch (error) {
      reportError(`INVALID_JSON`, error.message, error.data);
    }
  };

  if (process.argv.length > 2) {
    if (process.argv.length !== 4) {
      process.stderr.write(`Usage: ${process.argv[0]} ${process.argv[1]} <request> <issuer>\n`);
      process.exitCode = 64; /* EX_USAGE */
    } else {
      processResolution(process.argv[2], process.argv[3]);
    }
  } else {
    let buffer = '';
    const decoder = new StringDecoder.StringDecoder();

    process.stdin.on('data', chunk => {
      buffer += decoder.write(chunk);

      do {
        const index = buffer.indexOf('\n');
        if (index === -1) {
          break;
        }

        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);

        processRequest(line);
      } while (true);
    });
  }
}
