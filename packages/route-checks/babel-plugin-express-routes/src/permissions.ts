import babel from "@babel/core";
import path from "path";
import fs from "fs-extra";

const calculateOrGroup = (t: typeof babel.types, arg: babel.Node): string => {
    if (t.isArrayExpression(arg)) {
        return arg.elements.map((node: any) => node.value).join(" && ");
    } else if (t.isStringLiteral(arg)) {
        return arg.value;
    } else {
        throw new Error("Invalid argument to permission method");
    }
};

const isOrStatement = (
    callee: babel.Node,
    orSatementRegex: RegExp,
    types: typeof babel.types
): boolean =>
    types.isMemberExpression(callee) &&
    types.isIdentifier(callee.property) &&
    orSatementRegex.test(callee.property.name); // TODO regex

export enum RequestMethod {
    get = "get",
    head = "head",
    post = "post",
    put = "put",
    delete = "delete",
    connect = "connect",
    options = "options",
    trace = "trace",
    patch = "patch"
}
export interface Route {
    permissions: string;
    method: RequestMethod;
}
export interface PluginOpts {
    outPath: string;
    maxDepth: number;
    orStatementRegexString: string;
    controllerNameRegexString: string;
    requireScopesRegexString: string;
}

export interface Controller {
    serviceName: string;
    controllerName: string;
    routes: object;
}

export default function({
    types: t
}: {
    types: typeof babel.types;
}): babel.PluginObj<{
    permissions: Map<string, Route>;
    file: any;
    opts: PluginOpts;
    orStatementRegex: RegExp;
    controllerNameRegex: RegExp;
    requireScopesRegex: RegExp;
}> {
    return {
        pre() {
            this.permissions = new Map<string, Route>();
            this.orStatementRegex = new RegExp(
                this.opts.orStatementRegexString || "or"
            );
            this.controllerNameRegex = new RegExp(
                this.opts.controllerNameRegexString || "router"
            );
            this.requireScopesRegex = new RegExp(
                this.opts.requireScopesRegexString || "requireScopes"
            );
        },
        visitor: {
            CallExpression(path): void {
                if (
                    t.isMemberExpression(path.node.callee) &&
                    t.isIdentifier(path.node.callee.object) &&
                    this.controllerNameRegex.test(
                        path.node.callee.object.name
                    ) && // TODO: Make regex
                    Object.values(RequestMethod).includes(
                        path.node.callee.property.name
                    )
                ) {
                    const method = path.node.callee.property.name;
                    const orGroups: string[] = [];
                    let pathName;

                    if (t.isStringLiteral(path.node.arguments[0])) {
                        pathName = path.node.arguments[0].value;
                    }

                    if (t.isCallExpression(path.node.arguments[1])) {
                        let e = false;
                        const arg = path.node.arguments[1];
                        let callExpression: babel.types.CallExpression = arg;

                        if (
                            t.isIdentifier(arg.callee) &&
                            this.requireScopesRegex.test(arg.callee.name)
                        ) {
                            // just requireScopes, no "or" chaining
                            orGroups.push(
                                calculateOrGroup(t, arg.arguments[0])
                            );
                            e = true;
                        }

                        if (t.isMemberExpression(arg.callee)) {
                            let callee = arg.callee;

                            let depth = 0;
                            while (
                                e === false &&
                                depth < (this.opts.maxDepth || 3)
                            ) {
                                if (
                                    isOrStatement(
                                        callee,
                                        this.orStatementRegex,
                                        t
                                    )
                                ) {
                                    // is or statement
                                    orGroups.push(
                                        calculateOrGroup(
                                            t,
                                            callExpression.arguments[0]
                                        )
                                    );

                                    if (t.isCallExpression(callee.object)) {
                                        callExpression = callee.object;
                                        if (
                                            t.isMemberExpression(
                                                callee.object.callee
                                            )
                                        ) {
                                            // Check if is chained Or e.g: requireScopes().or().or();
                                            callee = callee.object.callee;
                                        } else {
                                            orGroups.push(
                                                calculateOrGroup(
                                                    t,
                                                    callExpression.arguments[0]
                                                )
                                            );
                                            e = true;
                                        }
                                    } else {
                                        throw Error(
                                            "Callee Object was not Call Expression"
                                        );
                                    }
                                }
                                depth++;
                            }

                            if (depth === this.opts.maxDepth) {
                                console.dir(path.node, { depth: 3 });
                                throw new Error("Max Depth Exceeded");
                            }
                        }
                    } else {
                        orGroups.push("No permissions required");
                    }

                    if (pathName) {
                        this.permissions.set(pathName, {
                            permissions: "(" + orGroups.join(") || (") + ")",
                            method
                        });
                    } else {
                        throw new Error("Route path not resolved");
                    }
                }
            }
        },
        post() {
            if (this.permissions.size > 0) {
                // write to disk.
                const filename = this.file.opts.filename;
                console.log(filename);
                const controllerName = path.basename(
                    filename,
                    path.extname(filename)
                );
                const relativePath = path.relative(process.cwd(), filename);
                const folders: string[] = relativePath.split(path.sep);
                const srcIndex = folders.findIndex(f => f === "src");
                if (!srcIndex) {
                    throw new Error("Src Location Not Found");
                }
                const serviceName = folders[srcIndex - 1]; //index based on one step before src.
                console.log(relativePath);
                const { outPath = "./routes/" } = this.opts;
                const endPath = path.join(
                    outPath,
                    `${serviceName}_${controllerName}.json`
                );

                const ServiceController: Controller = {
                    serviceName,
                    controllerName,
                    routes: mapToObj(this.permissions)
                };
                fs.mkdirpSync(path.dirname(endPath));
                fs.writeFileSync(
                    endPath,
                    JSON.stringify(ServiceController, null, 2)
                );
            }
        }
    };
}

const mapToObj = (map: Map<string, any>) =>
    Array.from(map).reduce(
        (obj, [key, value]) => ({ ...obj, [key]: value }),
        {}
    );
