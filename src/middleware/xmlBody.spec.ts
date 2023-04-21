import express, { Express, Response, Request } from 'express';
import request from 'supertest';
import xmlBody, { ExtendedRequest } from './xmlBody';

describe('xmlBody middleware', () => {
    let app: Express;

    beforeEach(() => {
        app = express();
        app.use(xmlBody);

        app.post('/test', (req: Request, res: Response) => {
            // Middleware that sends a JSON response with rawBody
            const { rawBody, rawXML, rawJSON } = (req as any as ExtendedRequest);
            res.status(200).json({ rawBody, rawXML, rawJSON });
            /*
                  rawBody: '<test>data</test>',
      rawXML: '<test>data</test>',
      rawJSON: { test: { _text: 'data' } },
      */
        });
    });

    it('should attach rawBody to the request object', async () => {
        const xmlData = '<test>data</test>';

        const res = await request(app)
            .post('/test')
            .set('Content-Type', 'text/xml')
            .send(xmlData);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('rawBody');
        expect(res.body.rawBody).toBe(xmlData);

        expect(res.body).toHaveProperty('rawXML');
        expect(res.body.rawXML).toBe(xmlData);

        expect(res.body).toHaveProperty('rawJSON');
        expect(res.body.rawJSON).toEqual({ test: { _text: 'data' } });
    });

});
