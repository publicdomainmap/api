import cors from 'cors';

/// API GETS AND POSTS
const addRoutes = (app, routes, authCommand, prefix) => routes.forEach((route) => {
  prefix = prefix || '';

  if (!route.path) {
    // It's a use function
    app[route.type](route.fn);
  } else {
    // Add in the middleware functions (we start with a dummy one)
    let middlewareFunctions = [];
    if (route.auth) {
      if (typeof route.auth === 'function') {
        middlewareFunctions.push(route.auth);
      } else {
        middlewareFunctions.push(authCommand);
      }
    }
    if (route.cors) {
      middlewareFunctions.push(cors());
      app.options(route.path, cors());
    }
    let runMiddleware = (req, res, next) => {
      if (middlewareFunctions.length) {
        let idx = 0;
        let callback = function() {
          idx++;
          if (idx <= middlewareFunctions.length) {
            return middlewareFunctions[idx-1](req, res, callback);
          } else {
            next();
          }
        };
        callback();
      } else {
        next();
      }
    };
    app[route.type](prefix + route.path, runMiddleware, route.fn);
  }
});

export default addRoutes;
