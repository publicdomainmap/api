/* global process */

import { default as Elements } from './elements.mjs';

export const apiResponse = (res, requestedFormat, rows, options) => {
  requestedFormat = (requestedFormat || 'xml');
  try {
    const result = new Elements(rows, options);
    const formats = {
      'xml': 'toXML',
      'json': 'toJSON'
    };
    const format = formats[requestedFormat || 'xml'];
    res.type(requestedFormat);
    res.send(result[format]());
  } catch(e) {
    apiError(res, e);
  }
};

export const apiError = (res, error, code) => {
  code = code || 500;
  if (process.env['NODE_ENV'] === 'development') {
    if (typeof error !== 'object') {
      error = {'message': error};
    }
    error.message = error.message || {...error};
    console.log('error', error);
    res.status(code).json({'error': error.message, 'trace': error.stack});
  } else {
    res.status(code).json({'error': error});
  }
};
