import { Express, Request, Response, NextFunction } from 'express';
import { xml2js } from 'xml-js';

export interface ExtendedRequest extends Request {
    rawBody: string;
    rawXML?: string;
    rawJSON?: object;
}

const xmlBody = (req: Request, res: Response, next: NextFunction) => {
    let extendedReq = req as ExtendedRequest;
    // Initialize an empty string to hold the raw request body
    extendedReq.rawBody = '';

    // When data is received in the request body, append it to the `rawBody` string
    req.on('data', (chunk) => {
        extendedReq.rawBody += chunk;
    });

    // When the request body has been fully received, check the content-type and parse the raw body if it is in XML format
    req.on('end', () => {
        if (req.headers['content-type'] === 'text/xml') {
            // If the request body is in XML format, store the raw XML in the `rawXML` property of the request object
            extendedReq.rawXML = extendedReq.rawBody;

            // Try to parse the raw XML into a JavaScript object using the `xml2js` library, and store the result in the `rawJSON` property of the request object
            try {
                extendedReq.rawJSON = xml2js(extendedReq.rawBody, { compact: true });
            } catch (e) {
                // If there is an error parsing the XML, set `rawJSON` to an empty object
                extendedReq.rawJSON = {};
            }
        }

        // Call the next middleware function in the chain
        next();
    });
};

export default xmlBody;
