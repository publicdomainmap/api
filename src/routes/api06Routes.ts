import { Request, Response } from 'express';
import query from '../db';
import { Auth, requireAuth } from '../middleware/requireAuth';
import { Route } from '../addRoutes';
import sqlStatements, { GetChangesetType, GetUserType } from '../util/sql';
import { apiError, apiResponse } from '../osm/apiResponse';
import { request as httpRequest } from 'http';
import { URL, URLSearchParams } from 'url';
import { QueryResult } from 'pg';
import capabilities from './capabilities';
import { InternalPassword } from '../util/internalPassword';
const cgimapServer = 'http://nginx:8080'

export type ChangesetQueryParams = {
    bbox?: string; // Format: min_lon,min_lat,max_lon,max_lat (W,S,E,N)
    user?: string; // Format: #uid
    display_name?: string; // Format: #name
    time?: string; // Format: T1 or T1,T2 (See note for time format)
    open?: boolean | string; // Only finds changesets that are still open but excludes changesets that are closed or have reached the element limit for a changeset (10.000 at the moment[2])
    closed?: boolean | string; // Only finds changesets that are closed or have reached the element limit
    changesets?: string; // Finds changesets with the specified ids (since 2013-12-05)
};

export const readQueryParams = (queryParams: ChangesetQueryParams) => {
    let whereObj: { [key: string]: { 'operator': '<' | '>' | '=' | 'IS NULL' | 'IS NOT NULL' | 'IN', value?: string | number | Array<number> } } = {};
    if (queryParams.bbox) {
        const [min_lon, min_lat, max_lon, max_lat] = queryParams.bbox.split(',');
        whereObj['changesets.min_lon'] = { 'operator': '<', 'value': max_lon }
        whereObj['changesets.max_lon'] = { 'operator': '>', 'value': min_lon }
        whereObj['changesets.min_lat'] = { 'operator': '<', 'value': max_lat }
        whereObj['changesets.max_lat'] = { 'operator': '>', 'value': min_lat }
    }
    if (queryParams.user) {
        whereObj['changesets.user_id'] = { 'operator': '=', value: queryParams.user };
    }
    if (queryParams.display_name) {
        whereObj['users.display_name'] = { 'operator': '=', value: queryParams.display_name };
    }
    if (queryParams.open === true || queryParams.open === 'true') {
        whereObj['changesets.closed_at'] = { 'operator': 'IS NULL' };
    }
    if (queryParams.closed === true || queryParams.closed === 'true') {
        whereObj['changesets.closed_at'] = { 'operator': 'IS NOT NULL' };
    }
    if (queryParams.changesets) {
        whereObj['changesets.id'] = { 'operator': 'IN', value: queryParams.changesets.split(',').map(v => parseInt(v)) };
    }

    let whereClause = 'WHERE ';
    let whereValues: Array<string | number> = [];
    Object.entries(whereObj).forEach(([key, { operator, value }], idx, arr) => {
        whereClause += ` ${key.split('.').map(v => `"${v}"`).join('.')} ${operator} `;
        if (value) {
            if (Array.isArray(value)) {
                whereClause += `(`
                value.forEach((v, i, a) => {
                    const idx = whereValues.push(v);
                    whereClause += `$${idx}`;
                    whereClause += a.length > i + 1 ? ', ' : '';
                })
                whereClause += `) `
            } else {
                const idx = whereValues.push(value);
                whereClause += `$${idx} `
            }
        }
        if (arr.length > idx + 1) whereClause += ' AND ';
    });
    // Clear it out if there are no requests
    if (whereClause === 'WHERE ') whereClause = '';
    return { whereClause, whereValues };
}

export default [
    ...capabilities, // Needed for JOSM
    {
        path: '/user/details.:format?',
        auth: requireAuth,
        method: 'get',
        fn: (req: Request, res: Response) => {
            const auth = (req as Request & { auth?: Auth }).auth;
            const unauthorizedCode = 401;

            let dbResult: QueryResult<GetUserType> | null, dbError: any;

            if (auth && auth.userId !== undefined) {
                query(sqlStatements.getUser, [auth && auth.userId])
                    .then(result => (dbResult = result))
                    .catch(error => (dbError = error))
                    .finally(() => {
                        if (dbResult && dbResult.rows && dbResult.rows.length) {
                            apiResponse(res, req.params.format, dbResult.rows, {});
                        } else {
                            apiError(res, dbError || dbResult || 'Unknown Error', unauthorizedCode);
                        }
                    });
            } else {
                apiError(res, 'Not Authorized', unauthorizedCode);
            }
        },
    }, {
        // Get the most recent 100 changesets for a userid
        // https://wiki.openstreetmap.org/wiki/API_v0.6#Query:_GET_/api/0.6/changesets
        path: '/changesets.:format?',
        method: 'get',
        fn: (req: Request, res: Response) => {
            // Query the database for the most recent 100 changesets for the given user id
            let dbResult: QueryResult<GetChangesetType> | null, dbError: any;
            const queryParams = (req.query || {}) as ChangesetQueryParams;
            let whereObj: { [k: string]: { 'operator': string, 'value'?: string | number | number[] } } = {};

            const { whereClause, whereValues } = readQueryParams(queryParams);

            query(sqlStatements.getChangesets + ' ' + whereClause, whereValues)
                .then(result => dbResult = result)
                .catch(error => dbError = error)
                .finally(() => {
                    // Respond with either an error or the result of the query
                    if (dbResult && dbResult.rows) {
                        apiResponse(res, req.params.format, dbResult.rows, {});
                    } else {
                        apiError(res, dbError || dbResult || 'Unknown Error');
                    }
                });
        }
    },
    {
        path: '*',
        auth: requireAuth,
        method: ['get', 'post', 'delete', 'put'],
        xmlBody: false,
        fn: async (req: Request, res: Response) => {
            const auth = (req as Request & { auth?: Auth }).auth;

            const url = new URL(`${cgimapServer}${req.path}`);
            const searchParams = new URLSearchParams();
            Object.entries(req.query).forEach(([k, v]) => searchParams.set(k, v as string));
            url.search = searchParams.toString();

            const newHeaders = { ...req.headers };

            if (auth && auth.username) {
                // our auth won't work, so we need to give it the fake one one
                const password = new InternalPassword(auth.username);

                // Update the user password in the db
                await password.isLoaded();
                newHeaders.authorization = password.basicAuth;
            }

            const requestOptions = {
                method: req.method,
                headers: newHeaders,
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
            };

            const proxyRequest = httpRequest(requestOptions, (proxyResponse) => {
                res.status(proxyResponse.statusCode || 500);
                res.set(proxyResponse.headers);
                proxyResponse.pipe(res);
            });

            proxyRequest.on('error', (error) => {
                console.error(`Error forwarding request: ${error.message}`);
                apiError(res, `API Error: ${error.message}`, 500);
            });

            if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
                req.pipe(proxyRequest);
            } else {
                proxyRequest.end();
            }
        }
    },
] as Array<Route>;
