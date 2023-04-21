/* global process */

import express from 'express';

import { default as api06Routes } from './src/routes/api06.mjs';
import { default as capabilities} from './src/routes/capabilities.mjs';
import { default as authRoutes, requireAuth } from './src/routes/auth.mjs';
import addRoutes from './src/addRoutes.mjs';
import xmlBody from './src/xmlBody.mjs';

// Constants
const PORT = process.env['NODE_SERVER_PORT'];
const HOST = '0.0.0.0';

// App
const app = express();

// To parse body from the HTTP Request
// app.use(bodyParser.raw());
// TODO: Move this
import { xml2js } from 'xml-js';

// Attach a `rawBody` property to the request object based on the content-type (xml or JSON)
xmlBody(app);

// Add the routes
addRoutes(app, authRoutes, requireAuth, '/oauth');
addRoutes(app, api06Routes, requireAuth, '/api/0.6');
addRoutes(app, capabilities, requireAuth, '/api');

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
