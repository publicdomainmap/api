import type { Request, Response } from 'express';
import { AuthorizationCode } from 'simple-oauth2';
import { Route } from '../addRoutes';

// Initialize OAuth2 Client with OpenStreetMap's OAuth2 details
const client = new AuthorizationCode({
    client: {
        id: process.env.CLIENT_ID as string, // Set CLIENT_ID in your environment variables
        secret: process.env.CLIENT_SECRET as string, // Set CLIENT_SECRET in your environment variables
    },
    auth: {
        tokenHost: 'https://www.openstreetmap.org',
        tokenPath: '/oauth2/token',
        authorizePath: '/oauth2/authorize',
    }
});

export const authRoutes: Route[] = [{
    path: '/auth',
    method: 'get',
    fn: (_, res: Response) => {
        const authorizationUri = client.authorizeURL({
            redirect_uri: 'http://localhost:3000/oauth2callback',
            scope: 'read_prefs write_prefs', // Scopes to request access to the user's account
            state: 'randomstring', // A random string to protect against CSRF attacks
        });

        res.redirect(authorizationUri);
    }
}, {
    path: '/oauth2callback',
    method: 'get',
    fn: (req: Request, res: Response) => {
        const { code } = req.query;
        const options = {
            code: code as string,
            redirect_uri: 'http://localhost:3000/callback',
        };

        client.getToken(options)
            .then((result) => {
                console.log('The access token is: ', result.token);
                res.redirect('/success');
            })
            .catch((error) => {
                console.error('Access Token Error', error.message);
                res.status(500).json('Authentication failed');
            });
    }
}];