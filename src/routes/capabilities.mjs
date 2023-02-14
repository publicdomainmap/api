import {apiResponse} from '../osm/apiResponse.mjs';

const Api = class {
  /**
   * Create an API.
   * @param {Object} data - An object containing the API data.
   */
  constructor(data) {
    // Set the API type and copy the data properties to the instance
    this.type = 'api';
    Object.keys(data).forEach(key => this[key] = data[key]);
  }

  /**
   * Convert the API to an XML object using xml2js.
   * @returns {Object} An object representation of the API, suitable for conversion to XML.
   */
  toXmlJs() {
    // Filter out the "type" property, and format the remaining properties as XML attributes
    return Object.keys(this)
      .filter(key => key !== 'type')
      .reduce((a,v)=>({...a,[v]: {'_attributes': this[v]}}),{});
  }
};

export default [{
  'path': '/capabilities.:format?',
  'type': 'get',
  'fn': (req, res) => {
    // TODO: Use values from env instead of hardcoded values that do nothing
    // TODO: openstreetmap-cgimap should also be configurable from the env variables
    const apiInfo = new Api ({
      'version': {'minimum': '0.6', 'maximum': '0.6'},
      'area': {'maximum': '0.25'},
      'note_area': {'maximum': '25'},
      'tracepoints': {'per_page': '50000'},
      'waynodes': {'maximum': '2000'},
      'changesets': {'maximum': '10000'},
      'timeout': {'seconds': '300'},
      'status': {'database': 'online', 'api': 'online', 'gpx': 'offline'}
    });
    apiResponse(res, req.params.format, [apiInfo], {'rowType': 'element'}); 
  }
}];
