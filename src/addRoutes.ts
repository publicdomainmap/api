import { Application, NextFunction, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import xmlBody from './middleware/xmlBody';

/**
 * This function takes an Express app object,
 * an array of route objects, 
 * an authentication function,
 * and a prefix string. 
 *
 * It iterates through each route object and adds any specified middleware functions.
 * including authentication and CORS middleware.
 * It then adds the route function to the app with the middleware functions.
 * The function uses the forEach method to iterate through the array of routes,
 * and it uses if/else statements to handle "use" functions and routes with paths.
 *
 * This function returns void, as it modifies the app object in place.
 */

type routeMethods = 'get' | 'post' | 'put' | 'delete';

export interface Route {
    method: routeMethods | routeMethods[];
    path: string;
    fn: (req: Request, res: Response, next?: NextFunction) => void;
    auth?: (req: Request, res: Response, next?: NextFunction) => void;
    xmlBody?: ((req: Request, res: Response, next?: NextFunction) => void) | false;
    cors?: CorsOptions | false;
}

/**
 * Adds routes to an Express app, including middleware functions and authentication checks.
 *
 * @param {Object} app - The Express app to add routes to.
 * @param {Array<Object>} routes - An array of route objects, each containing a type, path, and function to execute.
 * @param {string} prefix - A prefix to add to each route path, if specified.
 *
 * @returns {void}
 */
const addRoutes = (
    app: Application,
    routes: Route[],
    prefix?: string
): void => {
    const expandedRoutes = routes.flatMap(route => Array.isArray(route.method) ? route.method.map(method => ({ ...route, method })) : route) as Array<Route & { method: routeMethods }>;
    expandedRoutes.forEach((route) => {
        prefix = prefix || '';

        if (!route.path) {
            (app as any)[route.method](route.fn);
        } else {
            let middlewareFunctions: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

            if (route.auth && typeof route.auth === 'function') {
                middlewareFunctions.push(route.auth);
            }

            if (route.cors === undefined) {
                middlewareFunctions.push(cors());
                (app.options as any)(route.path, cors());
            }

            if (route.xmlBody !== false) {
                if (typeof route.xmlBody === 'function') {
                    middlewareFunctions.push(route.xmlBody);
                } else {
                    middlewareFunctions.push(xmlBody);
                }
            }

            let runMiddleware = (req: Request, res: Response, next: NextFunction) => {
                if (middlewareFunctions.length) {
                    let idx = 0;
                    let callback = function () {
                        idx++;
                        if (idx <= middlewareFunctions.length) {
                            return middlewareFunctions[idx - 1](req, res, callback);
                        } else {
                            next();
                        }
                    };
                    callback();
                } else {
                    next();
                }
            };

            const wrapFn = (req: Request, res: Response, next?: NextFunction) => {
                //console.log('Req:', req.method, req.originalUrl);
                return route.fn(req, res, next);
            }
            (app as any)[route.method](prefix + route.path, runMiddleware, wrapFn);
        }
    });
};

export default addRoutes;