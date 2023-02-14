// This function is a middleware function that attaches a `rawBody` property to the request object and parses the raw request body based on the content-type

/**
 * Middleware function that attaches a `rawBody` property to the request object and parses the raw request body based on the content-type.
 *
 * @param app - Express app object.
 *
 * @returns {void}
 */

const xmlBody = (app) => {
  app.use(function(req, res, next) {
    // Initialize an empty string to hold the raw request body
    req.rawBody = '';
    // When data is received in the request body, append it to the `rawBody` string
    req.on('data', function(chunk) { 
      req.rawBody += chunk;
    });

    // When the request body has been fully received, check the content-type and parse the raw body if it is in XML format
    req.on('end', function() {
      if (req.headers['content-type'] === 'text/xml') {

        // If the request body is in XML format, store the raw XML in the `rawXML` property of the request object
        req.rawXML = req.rawBody;

        // Try to parse the raw XML into a JavaScript object using the `xml2js` library, and store the result in the `rawJSON` property of the request object
        try {
          req.rawJSON = xml2js(req.rawBody, {'compact': true});
        } catch(e) {

          // If there is an error parsing the XML, set `rawJSON` to an empty object
          req.rawJSON = {};
        }
      }

      // Call the next middleware function in the chain
      next();
    });
  });
}

export default xmlBody;
