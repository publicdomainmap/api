import express from 'express';
import addRoutes from './addRoutes';
import api06Routes from './routes/api06Routes';
import capabilities from './routes/capabilities';
import { authRoutes } from './routes/oauth';

// Constants
const PORT = process.env['NODE_SERVER_PORT'];
const HOST = '0.0.0.0';

// App
const app = express();

// Add the routes
addRoutes(app, authRoutes, '/oauth');
addRoutes(app, api06Routes, '/api/0.6');
addRoutes(app, capabilities, '/api');

app.listen(PORT, () => console.log(`Running on http://${HOST}:${PORT}`));
