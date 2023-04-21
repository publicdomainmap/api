import { Request, Response } from 'express';
import { Route } from '../addRoutes';
import { tools, config, requireAuth, Auth } from '../middleware/requireAuth'

export const authRoutes: Route[] = [{
    path: '/access_token',
    method: 'post',
    auth: requireAuth as any,
    fn: async (req: Request, res: Response) => {
        const authReq = (req as Request & { auth?: Auth });

        if (authReq.auth) {
            res.send([
                'oauth_token=', authReq.auth.oauth_token,
                '&oauth_token_secret=', authReq.auth.oauth_token_secret,
                '&username=', authReq.auth.username,
                '&userId=', authReq.auth.userId,
            ].join(''));
        } else {
            res.json(['unauthorized']);
        }
    },
},
{
    path: '/request_token',
    method: 'post',
    fn: async (req: Request, res: Response) => {
        try {
            const [token, tokenSecret] = (await new Promise((resolve, reject) => {
                tools.osmAuth.getOAuthRequestToken(
                    ((err: { statusCode: number; data?: any; }, token: string, token_secret: string) =>
                        err ? reject(err) : resolve([token, token_secret])
                    ))
            })) as [string, string];
            await tools.addToken(token, tokenSecret);
            res.send(['oauth_token=', token, '&oauth_token_secret=', tokenSecret].join(''));
        } catch (e) {
            res.json({ error: e });
        }
    },
},
{
    path: '/authorize',
    method: 'get',
    fn: (req: Request, res: Response) => res.redirect(config.protocol + '://' + config.server + req.originalUrl),
}];
