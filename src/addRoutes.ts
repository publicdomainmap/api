import cors from 'cors';

/**
 * This function takes an Express app object,
 * an array of route objects, 
 * an authentication function,
 * and a prefix string. 
 *
 * It iterates through each route object and adds any specified middleware functions.
 * including authentication and CORS middleware.
 * It then adds the route function to the app with the middleware functions.
 * The function uses the forEach method to iterate through the array of routes,
 * and it uses if/else statements to handle "use" functions and routes with paths.
 *
 * This function returns void, as it modifies the app object in place.
 */

/**
 * Adds routes to an Express app, including middleware functions and authentication checks.
 *
 * @param {Object} app - The Express app to add routes to.
 * @param {Array<Object>} routes - An array of route objects, each containing a type, path, and function to execute.
 * @param {Function} authCommand - The authentication function to use, if specified in a route object.
 * @param {string} prefix - A prefix to add to each route path, if specified.
 *
 * @returns {void}
 */
const addRoutes = (app, routes, authCommand, prefix) => {

  // Iterate through each route and add it to the app
  routes.forEach((route) => {

    // Set prefix to an empty string if it is not provided
    prefix = prefix || '';

    if (!route.path) {
      // If the route does not have a path, it is a "use" function
      app[route.type](route.fn);
    } else {
      // If the route has a path, add middleware functions and the route function

      // Create an empty array to hold the middleware functions for this route
      let middlewareFunctions = [];

      // If the route has an auth function, add it to the middleware functions array
      if (route.auth) {
        if (typeof route.auth === 'function') {
          middlewareFunctions.push(route.auth);
        } else {
          middlewareFunctions.push(authCommand);
        }
      }

      // If the route does not have a CORS option specified, add the default CORS middleware function
      if (route.cors === undefined) {
        middlewareFunctions.push(cors());
        app.options(route.path, cors());
      }

      // Define a function to run the middleware functions in sequence
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

      // Add the route function with the middleware functions to the app
      app[route.type](prefix + route.path, runMiddleware, route.fn);
    }
  });
};

export default addRoutes;
