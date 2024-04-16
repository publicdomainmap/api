import query from '../db';
import sqlStatements, { GetUserType } from '../util/sql';
import { xml2js } from 'xml-js';
import https from 'https';
import { InternalPassword } from '../util/internalPassword';
import passport from 'passport';
import session from 'express-session';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';

const {
    OPENSTREETMAP_CLIENT_ID,
    OPENSTREETMAP_CLIENT_SECRET,
    OPENSTREETMAP_CALLBACK_URL,
    OPENSTREETMAP_SESSION_SECRET,
    OPENSTREETMAP_TOKEN_URL,
    OPENSTREETMAP_AUTHORIZATION_URL,
    OPENSTREETMAP_API_URL
} = process.env as Record<string, string>;

const requiredSecrets = [
    'OPENSTREETMAP_CLIENT_ID',
    'OPENSTREETMAP_CLIENT_SECRET',
    'OPENSTREETMAP_CALLBACK_URL',
    'OPENSTREETMAP_SESSION_SECRET',
    'OPENSTREETMAP_AUTHORIZATION_URL',
    'OPENSTREETMAP_TOKEN_URL',
    'OPENSTREETMAP_API_URL'
];

const missingSecrets = requiredSecrets.filter(secret => !process.env[secret]);

if (missingSecrets.length > 0) {
    throw new Error(`The following secrets are not set: ${missingSecrets.join(', ')}`);
}

const oauth2Config = {
    authorizationURL: OPENSTREETMAP_AUTHORIZATION_URL,
    tokenURL: OPENSTREETMAP_TOKEN_URL,
    clientID: OPENSTREETMAP_CLIENT_ID,
    clientSecret: OPENSTREETMAP_CLIENT_SECRET,
    callbackURL: OPENSTREETMAP_CALLBACK_URL,
    scope: ['read_prefs', 'openid']
};

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
    user: {
        _attributes: {
            display_name: string;
            id: string;
        };
    };
};

export const tools = {

    verifyUser: async (accessToken: string, refreshToken: string, profile: any, cb: Function) => {
        try {
            const { user } = await tools.getUserInfo(accessToken);
            cb(null, user._attributes.id); // Pass the profile info to the callback
        } catch (error) {
            cb(error);
        }
    },

    getUserInfo: async function (accessToken: string): Promise<UserData> {
        // Try to get the user capabilities from the main server
        const options = {
            host: OPENSTREETMAP_API_URL,
            port: 443,
            path: '/api/0.6/user/details.xml',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        };

        const userData = await new Promise<{ 'osm': { 'user': UserData } }>((resolve) => {
            https.get(options, res => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    const json = xml2js(data, { 'compact': true });
                    resolve(json as { 'osm': { 'user': UserData } });
                });
            });
        });

        return userData.osm.user;
    },

    addUser: async function (userData: UserData): Promise<boolean> {
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
            return true;
        } catch (e) {
            return false; // todo false on fail
        }
    }
};

export const requireAuth = passport.authenticate('oauth2', { failureRedirect: '/login' })

passport.serializeUser((user: any, done) => {
    const userData = user as UserData;
    // Serialize by user ID
    tools.addUser(userData).then(() => {
        done(null, BigInt(userData._attributes.id));
    }).catch((e) => {
        done(e);
    });
});

passport.deserializeUser(async (userId: bigint, done: Function) => {
    try {
        // Attempt to query user details using the provided user ID
        const userResult = await query(sqlStatements.getUser, [userId]) as GetUserType;

        // Check if the user was found
        if (userResult && userResult.rows && userResult.rows.length > 0) {
            // User found, attempt to query additional login attributes
            const loginAttributesResult: any = await query(sqlStatements.userLoginAttributes, [userId]);

            // Combine user details and login attributes into one object
            // Assuming 'rows' exists and contains our needed user data
            const userDetails = {
                ...loginAttributesResult.rows[0],
                ...userResult.rows[0],
            } as GetUserType & { pass_crypt: string, pass_salt: string };

            // Pass the combined user details object to Passport
            done(null, userDetails);
        } else {
            // No user found, pass an error to done
            throw new Error('User not found');
        }
    } catch (error) {
        // Handle any errors that occurred during the process
        console.error('Error in deserializeUser:', error);
        done(error);
    }
});

export const authRoutes = [
    session({ secret: OPENSTREETMAP_SESSION_SECRET, resave: false, saveUninitialized: true }),
    passport.initialize(),
    passport.session(),
    new OAuth2Strategy(oauth2Config, tools.verifyUser)
];