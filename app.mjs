/* global process */

import express from 'express';

import { default as api06Routes } from './src/routes/api06.mjs';
import { default as capabilities} from './src/routes/capabilities.mjs';
import { default as authRoutes, requireAuth } from './src/routes/auth.mjs';
import addRoutes from './src/addRoutes.mjs';

// Constants
const PORT = process.env['NODE_SERVER_PORT'];
const HOST = '0.0.0.0';

// App
const app = express();

// To parse body from the HTTP Request
// app.use(bodyParser.raw());
// TODO: Move this
import { xml2js } from 'xml-js';
app.use(function(req, res, next) {
  req.rawBody = '';

  req.on('data', function(chunk) { 
    req.rawBody += chunk;
  });

  req.on('end', function() {
    if (req.headers['content-type'] === 'text/xml') {
      req.rawXML = req.rawBody;
      try {
        req.rawJSON = xml2js(req.rawBody, {'compact': true});
      } catch(e) {
        req.rawJSON = {};
      }
    }
    next();
  });
});

// Add the routes
addRoutes(app, authRoutes, requireAuth, '/oauth');
addRoutes(app, api06Routes, requireAuth, '/api/0.6');
addRoutes(app, capabilities, requireAuth, '/api');

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
