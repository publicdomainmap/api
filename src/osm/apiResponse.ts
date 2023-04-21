import { Response } from 'express';
import { OsmResponse } from './osmResponse';

interface ApiResponseOptions {
    [key: string]: any;
}

export const apiResponse = (
    res: Response,
    requestedFormat: string | undefined,
    rows: any[],
    options: ApiResponseOptions
): void => {
    requestedFormat = requestedFormat || 'xml';
    try {
        const result = new OsmResponse(rows, options);
        const formats = {
            xml: 'toXML',
            json: 'toJSON',
        };
        const format = formats[requestedFormat as ('xml' | 'json')];
        res.type(requestedFormat);
        res.send(result[format as ('toXML' | 'toJSON')]());
    } catch (e) {
        apiError(res, e as Error);
    }
};

export const apiError = (
    res: Response,
    error: string | Record<string, any>,
    code?: number
): void => {
    code = code || 500;
    if (process.env['NODE_ENV'] === 'development') {
        if (typeof error !== 'object') {
            error = { message: error };
        }
        error.message = error.message || { ...error };
        res.status(code).json({ error: error.message, trace: error.stack });
    } else {
        res.status(code).json({ error });
    }
};
