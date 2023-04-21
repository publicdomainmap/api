import query from '../db';
import sqlStatements from '../util/sql';
import { OAuth } from 'oauth';
import { Request, Response, NextFunction } from 'express';
import { xml2js } from 'xml-js';
import http from 'http';
import https from 'https';
import { QueryResult } from 'pg';
import { createHash } from 'crypto';
import { InternalPassword } from '../util/internalPassword';

interface AuthTags {
    oauth_token?: string;
    [key: string]: string | undefined;
}

export interface Auth {
    oauth_token: string | null;
    oauth_token_secret: string | null;
    oauth_access_token: string | null;
    oauth_access_token_secret: string | null;
    username: string;
    userId: BigInt;
}

export interface UserData {
    home: {
        lat: string;
        lon: string;
        zoom: string;
    };
    _attributes: {
        id: string;
        account_created: string;
        display_name: string;
    };
    'contributor-terms': {
        _attributes: {
            pd: boolean;
        };
    };
    changesets: {
        _attributes: {
            count: number;
        };
    };
    traces: {
        _attributes: {
            count: number;
        };
    };
    user?: {
        _attributes: {
            display_name: string;
            id: string;
        };
    };
};

/**
 * Configuration object for OAuth.
 * 
 * @typedef {Object} Config
 * @property {string} protocol - The protocol for the OAuth server (taken from the environment variable `NODE_OAUTH_PROTOCOL`)
 * @property {string} server - The OAuth server (taken from the environment variable `NODE_OAUTH_SERVER`)
 * @property {string} consumerKey - The consumer key for the OAuth server (taken from the environment variable `NODE_OAUTH_CONSUMER_KEY`)
 * @property {string} consumerSecret - The consumer secret for the OAuth server (taken from the environment variable `NODE_OAUTH_CONSUMER_SECRET`)
 */
export const config = {
    protocol: process.env['NODE_OAUTH_PROTOCOL'],
    server: process.env['NODE_OAUTH_SERVER'],
    consumerKey: process.env['NODE_OAUTH_CONSUMER_KEY'],
    consumerSecret: process.env['NODE_OAUTH_CONSUMER_SECRET']
};

/**
 * Middleware that requires authentication for a route.
 *
 * @function
 * @async
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = (req as Request & { auth?: Auth });
    const auth = req.headers.authorization || '';
    const authTags: AuthTags = auth
        .replace(/"/g, '')
        .split(/[\s,]/g)
        .filter((v) => v.indexOf('=') > -1)
        .map((v) => v.split('='))
        .reduce((a, v) => ({ ...a, [v[0]]: v[1] }), {});

    if (authTags.oauth_token) {
        try {
            const tokenInfo = await tools.getTokenSecret(authTags.oauth_token);
            let [tokenSecret, oauthAccessToken, oauthAccessTokenSecret] = tokenInfo ? tokenInfo : [];
            if (!oauthAccessToken && !oauthAccessTokenSecret && tokenSecret) {
                const result = await new Promise((res, rej) => tools.osmAuth.getOAuthAccessToken(
                    authTags.oauth_token as string,
                    tokenSecret as string,
                    (err: { statusCode: number; data?: any; }, token: string, token_secret: string,) => {
                        err ? rej(err) : res([token, token_secret]);
                    }
                ));
                //const result = await tools.osmAuth.getOAuthAccessToken(authTags.oauth_token, tokenSecret);
                if (result) {
                    oauthAccessToken = (result as any)[0];
                    oauthAccessTokenSecret = (result as any)[1];
                }
            }
            // Get the user info
            const [username, userid] = await tools.getUserInfo(authTags.oauth_token, tokenSecret as string, oauthAccessToken as string, oauthAccessTokenSecret as string);
            authReq.auth = {
                oauth_token: authTags.oauth_token,
                oauth_token_secret: tokenSecret as string,
                oauth_access_token: oauthAccessToken as string,
                oauth_access_token_secret: oauthAccessTokenSecret as string,
                username: username,
                userId: userid
            };
        } catch (e) {
            console.error('auth error', e, (e as Error).stack);
        } finally {
            next();
        }
    } else if (typeof auth === 'string' && auth.split(' ')[0] === 'Basic') {
        try {
            const [username, userid] = await tools.getBasicUserInfo(auth);
            authReq.auth = {
                oauth_token: null,
                oauth_token_secret: null,
                oauth_access_token: null,
                oauth_access_token_secret: null,
                username: username,
                userId: userid
            };
        } finally {
            next();
        }
    } else {
        next();
    }
};

export const tools = {
    /**
 * getTokenSecret retrieves the request_token_secret, access_token, and access_token_secret for a given request token from the database.
 * @async
 * @param {string} token - request token
 * @returns {Promise<[string, string, string] | undefined>} Array containing the request_token_secret, access_token, and access_token_secret.
 */
    getTokenSecret: async function (token: string): Promise<[string, string, string] | undefined> {
        const sql = 'SELECT request_token_secret, access_token, access_token_secret FROM oauth.sessions WHERE request_token = $1';
        const values = [token];
        const result = await query(sql, values);
        const row = result?.rows[0];

        return row ? [row.request_token_secret, row.access_token, row.access_token_secret] : undefined;
    },
    /**
     * osmAuth is an instance of the OAuth object for authentication with OpenStreetMap.
     */
    osmAuth: new OAuth(
        `${config.protocol}://${config.server}/oauth/request_token`,
        `${config.protocol}://${config.server}/oauth/access_token`,
        config.consumerKey as string,
        config.consumerSecret as string,
        '1.0',
        null,
        'HMAC-SHA1'
    ),

    /**
     * getBasicUserInfo retrieves user information from the OpenStreetMap server using basic authentication.
     * @async
     * @param {string} auth - Authorization header value
     * @returns {Promise<[string, BigInt]>} Array containing the display_name and id of the user.
     */
    getBasicUserInfo: async function (auth: string): Promise<[string, BigInt]> {
        // Try to get the user capabilities from the main server
        const options = {
            host: config.server,
            port: config.protocol === 'https' ? 443 : 80,
            path: '/api/0.6/user/details.xml',
            method: 'GET',
            headers: { 'Authorization': auth }
        };

        const userData = await new Promise<{ 'osm': { 'user': UserData } }>((resolve) => {
            (config.protocol === 'https' ? https : http).get(options, res => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    const json = xml2js(data, { 'compact': true });
                    resolve(json as { 'osm': { 'user': UserData } });
                });
            });
        });

        await tools.addUser('Basic', userData.osm.user);
        return [userData.osm.user._attributes.display_name, BigInt(userData.osm.user._attributes.id)];
    },

    getUserInfo: async function (token: string, tokenSecret: string, accessToken: string, accessTokenSecret: string): Promise<[string, BigInt]> {
        const sql = `SELECT sessions.user_id, users.display_name
      FROM oauth.sessions JOIN public.users ON sessions.user_id = users.id
      WHERE sessions.access_token=$1 AND sessions.access_token_secret=$2`;

        const result = await query(sql, [accessToken, accessTokenSecret]);

        if (result?.rows[0] && result.rows[0].user_id) {

            return [result.rows[0].display_name, result.rows[0].user_id];
        } else {
            // If the user doesn't exist, pull the user information from the external server
            const userDataXML: string = await new Promise((res, rej) => tools.osmAuth.get(
                `${config.protocol}://${config.server}/api/0.6/user/details`,
                accessToken,
                accessTokenSecret,
                ((err: { statusCode: number; data?: any; }, result?: string | Buffer | undefined) => {
                    err ? rej(err) : res(result as string);
                })
            ));

            const userData = xml2js(userDataXML, { 'compact': true }) as any;

            await tools.addUser([token, tokenSecret, accessToken, accessTokenSecret], userData.osm.user);

            return [userData.osm.user._attributes.display_name, userData.osm.user._attributes.id];
        }
    },

    addToken: async function (token: string, tokenSecret: string): Promise<boolean> {
        await query(sqlStatements.addSession, [token, tokenSecret]);
        query(sqlStatements.removeOldSessions);
        return true;
    },

    /**
     * addUser adds a new user to the database.
     * @async
     * @param {string[] | 'Basic'} tokens - Array containing the tokens or the string 'Basic'
     * @param {UserData} userData - User data object
     * @returns {Promise<boolean>} Returns true if the user is added successfully, false otherwise
     */
    addUser: async function (tokens: string[] | 'Basic', userData: UserData): Promise<boolean> {
        // Not all users have a home, so default their location to the white house
        userData.home = userData.home || {
            'lat': '38.893889',
            'lon': '-77.0425',
            'zoom': '3'
        };

        const password = new InternalPassword(userData._attributes.display_name, userData._attributes);
        await password.isLoaded();

        const newUserValues = [
            BigInt(userData._attributes.id),
            userData._attributes.account_created,
            userData._attributes.display_name,
            userData.home.lat,
            userData.home.lon,
            userData.home.zoom,
            userData['contributor-terms']._attributes.pd,
            userData.changesets._attributes.count,
            userData.traces._attributes.count,
            password.crypt,
            password.salt
        ];

        try {
            await query(sqlStatements.createUser, newUserValues);

            if (tokens !== 'Basic') {
                await query(`UPDATE oauth.sessions SET
          access_token = $3,
          access_token_secret = $4,
          user_id = $5
        WHERE
          request_token = $1 AND
          request_token_secret = $2;`, [...tokens, userData._attributes.id]);
            }

            return true;
        } catch (e) {
            return false; // todo false on fail
        }
    }
}