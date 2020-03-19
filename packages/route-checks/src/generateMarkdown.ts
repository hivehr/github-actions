import { readFileSync, writeFileSync } from "fs";
import Handlebars from "handlebars";
import { join } from "path";
import { walkSync } from "walk";

Handlebars.registerHelper("eachInMap", function(map: Map<any, any>, block) {
    return Array.from(map.keys()).reduce(
        (out: string, key: any) => out + block.fn({ key, value: map.get(key) }),
        ""
    );
});

const template = Handlebars.compile(
    readFileSync(join(__dirname, "templates", "markdown.handlebars")).toString()
);

enum RequestMethod {
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

interface SimpleController {
    serviceName: string;
    controllerName: string;
    routes: object;
}

interface Route {
    permissions: string;
    method: RequestMethod;
}

interface Controller {
    serviceName: string;
    controllerName: string;
    routes: Map<string, Route>;
}

const capitalize = (content: string): string =>
    content.charAt(0).toUpperCase() + content.slice(1);

const convertController = (controller: SimpleController): Controller => {
    const routesMap = new Map<string, any>();
    Array.from(Object.entries(controller.routes)).forEach(([key, value]) =>
        routesMap.set(key, value)
    );
    return { ...controller, routes: routesMap };
};

export const generateMarkdown = (dir: string): string => {
    const services = new Map<string, Controller[]>();
    walkSync(dir as string, {
        listeners: {
            file: (root, fileStats, next) => {
                const controller: SimpleController = JSON.parse(
                    readFileSync(join(root, fileStats.name)).toString()
                );
                const serviceName = capitalize(controller.serviceName);

                if (services.has(serviceName)) {
                    services.set(serviceName, [
                        ...(services.get(serviceName) as Controller[]),
                        convertController(controller)
                    ]);
                } else {
                    services.set(serviceName, [convertController(controller)]);
                }

                next();
            }
        }
    });
    return template({ services });
};

const main = (path: string): void => {
    writeFileSync(path, generateMarkdown(path));
};

if (require.main === module) {
    main(process.argv[2]);
}
