/* global process */

import { default as Elements } from './elements.mjs';
/**
 * Responds to an API request with the given rows of data in the requested format.
 * @param {Object} res - The Express.js response object.
 * @param {string} requestedFormat - The format requested for the response (default is 'xml').
 * @param {Array} rows - An array of data to include in the response.
 * @param {Object} options - An object containing options for the response.
 */
export const apiResponse = (res, requestedFormat, rows, options) => {
  // Default to XML format if no format was requested
  requestedFormat = (requestedFormat || 'xml');
  try {
    // Convert the data to an Elements object
    const result = new Elements(rows, options);
    // Map format names to method names on the Elements object
    const formats = {
      'xml': 'toXML',
      'json': 'toJSON'
    };
    // Get the method name for the requested format
    const format = formats[requestedFormat];
    // Set the response type and send the data in the requested format
    res.type(requestedFormat);
    res.send(result[format]());
  } catch(e) {
    // If an error occurred, send an API error response
    apiError(res, e);
  }
};

/**
 * Sends an API error response to the client
 *
 * @param {object} res - The response object of the API
 * @param {object|string} error - The error object or error message to send
 * @param {number} [code=500] - The HTTP status code of the error response
 */
export const apiError = (res, error, code) => {
  code = code || 500;
  // In development mode, log the error details and include stack trace in response
  if (process.env['NODE_ENV'] === 'development') {
    if (typeof error !== 'object') {
      error = {'message': error};
    }
    error.message = error.message || {...error};
    console.log('error', error);
    res.status(code).json({'error': error.message, 'trace': error.stack});
  } else {
    // In production mode, only send the error message
    res.status(code).json({'error': error});
  }
};
