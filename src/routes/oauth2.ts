import type { Request, Response } from 'express';
import { Route } from '../addRoutes';
import passport from 'passport';

export const authRoutes: Route[] = [{
    path: '/auth',
    method: 'get',
    auth: passport.authenticate('oauth2'),
    fn: (req: Request, res: Response) => {
        // The request will be redirected to the OAuth provider for authentication, so this
        // function will not be called.
    }
}, {
    path: '/auth/callback',
    method: 'get',
    auth: passport.authenticate('oauth2', { failureRedirect: '/login' }),
    fn: (req: Request, res: Response) => {
        // Successful authentication, redirect home.
        res.redirect('/');
    }
}];