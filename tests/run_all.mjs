/* global process */

import https from 'https';
import http from 'http';
import test from 'tape';
import { xml2js } from 'xml-js';

const osmHost = 'https://api.openstreetmap.org/api/0.6';
const pdHost = 'http://localhost:' + process.env['NODE_SERVER_PORT'] + '/api/0.6';

const getXml = (host, path) => new Promise((resolve, reject) => {
  const library = host.match('https://') ? https : http;
  const req = library.request(host + path,
    res => {
      let data = '';
      res.on('data', d => {
        data += d;
      });
      res.on('end', () => {
        resolve(data);
      });
    });
  req.on('error', reject);
  req.end();
});

const parse = (data, format) => {
  let json = {};
  if (format === 'json') {
    json = JSON.parse(data);
  } else if (format === 'xml') {
    json = xml2js(data);
  }

  // Clean Objects
  const removeAttrs = ['generator', 'copyright', 'attribution', 'license', 'changeset', 'user', 'uid'];
  const clean = (obj) => Object.keys(obj).filter(key => removeAttrs.indexOf(key) === -1).map(key => {
    let subObj = obj[key];
    if (typeof subObj === 'object' && Array.isArray(subObj)) {
      // Array order doesn't matter for this application
      subObj = subObj.sort((a,b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : 1);
      subObj = subObj.map(subSubObj => clean(subSubObj));
    } else if (typeof subObj === 'object' && subObj) {
      subObj = clean(subObj);
    } 
    return [key, subObj];
  }).reduce((a,v) => {
    a[v[0]] = v[1];
    return a;
  }, {});

  json = clean(json);
  return json;
};


// These tests only work if the API and OSM have the same data in them, so these do not work in production!
const testRequest = async (request, format) => {
  const osmResult = parse(await getXml(osmHost, request), format);
  const pdResult = parse(await getXml(pdHost, request), format);
  return [osmResult, pdResult];
};

const paths = [
  {
    'path': '/node/75390099.json',
    'format': 'json'
  },
  {
    'path': '/node/75390099',
    'format': 'xml'
  }

];

const main = async () => {
  const results = paths.map(path => {
    let testName = 'testing: ' + (path.name || 'path: (' + path.path + ') - ') + 'format: ' + path.format;
    test(testName,  async function (t) {
      const result = await testRequest(path.path, path.format);
      console.log('O', JSON.stringify(result[1]));
      console.log('N', JSON.stringify(result[0]));
      t.deepEqual(result[1], result[0], 'Elements Match');
    });
  });
  return results;
};

main();
