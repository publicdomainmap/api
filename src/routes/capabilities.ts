import { Request, Response } from 'express';
import { Route } from '../addRoutes';
import { apiResponse } from '../osm/apiResponse';
import ResponseObject from '../osm/responseObject';

interface ApiData {
    version?: { minimum: string; maximum: string };
    area?: { maximum: string };
    note_area?: { maximum: string };
    tracepoints?: { per_page: string };
    waynodes?: { maximum: string };
    changesets?: { maximum: string };
    timeout?: { seconds: string };
    status?: { database: string; api: string; gpx: string };
}

export class Api extends ResponseObject {
    static types = {
        version: Object,
        area: Object,
        note_area: Object,
        tracepoints: Object,
        waynodes: Object,
        changesets: Object,
        timeout: Object,
        status: Object
    }

    constructor(data: ApiData) {
        super(data, Api.types);
        this.type = 'api';
    }

    toXmlJs() {
        return Object.entries(this.data)
            .filter(([key]) => key !== 'type')
            .reduce((a, [key, value]) => ({ ...a, [key]: { _attributes: value } }), {}) as any;
    }
}

export default [
    {
        path: '/capabilities.:format?',
        method: 'get',
        fn: (req: Request, res: Response) => {
            const apiInfo = new Api({
                version: { minimum: '0.6', maximum: '0.6' },
                area: { maximum: '0.25' },
                note_area: { maximum: '25' },
                tracepoints: { per_page: '50000' },
                waynodes: { maximum: '2000' },
                changesets: { maximum: '10000' },
                timeout: { seconds: '300' },
                status: { database: 'online', api: 'online', gpx: 'offline' },
            });
            apiResponse(res, req.params.format, [apiInfo], { rowType: 'element' });
        },
    },
] as Array<Route>;