/* global process */
import { default as oauth } from 'oauth';
import { default as query } from '../db.mjs';
import { default as sqlStatements } from '../sql/auth.mjs';
import { xml2js } from 'xml-js';
import { default as https } from 'https';
import { default as http } from 'http';

// const config = {
//   protocol: process.env['NODE_OAUTH_PROTOCOL'],
//   server: process.env['NODE_OAUTH_SERVER'],
//   consumerKey: process.env['NODE_OAUTH_CONSUMER_KEY'],
//   consumerSecret: process.env['NODE_OAUTH_CONSUMER_SECRET']
// };
const config = {
  protocol: process.env['NODE_OAUTH_PROTOCOL'],
  server: 'api06.dev.openstreetmap.org',
  consumerKey: 'uqwVDaXN8FOh1fgnkbugoZFP0pHr8ILWKS8yMpp1',
  consumerSecret: 'AgrpoHJwTJBhEBbLu7xxI2DE6rjJPdMxp9Qt7gtv'
};


const awaitify = (fn, ctx) => {
  return function () {
    return new Promise((res, rej) => {
      let args = [...arguments];
      args.push(function () {
        let subargs =  [...arguments];
        return subargs[0] ? rej(subargs[0]) : res(subargs.slice(1));
      });
      fn.apply(ctx || this, args);
    });
  };
};

// AUTH
//
// Auth section
export const requireAuth = async (req, res, next) => {
  const auth = req.headers.authorization || '';
  const authTags = auth
    .replace(/"/g,'')
    .split(/[\s,]/g)
    .filter(v => v.indexOf('=')>-1)
    .map(v => v.split('='))
    .reduce((a,v) => ({...a, [v[0]]: v[1]}),{});

  if (authTags.oauth_token) {
    try {
      let [tokenSecret, oauthAccessToken, oauthAccessTokenSecret] = await tools.getTokenSecret(authTags.oauth_token);
      if (!oauthAccessToken && !oauthAccessTokenSecret) {
        [oauthAccessToken, oauthAccessTokenSecret] = await awaitify(tools.osmAuth.getOAuthAccessToken, tools.osmAuth)(authTags.oauth_token, tokenSecret);
      }
      // Get the user info
      const [username, userid] = await tools.getUserInfo(authTags.oauth_token, tokenSecret, oauthAccessToken, oauthAccessTokenSecret);
      req.auth = {
        'oauth_token': authTags.oauth_token,
        'oauth_token_secret': tokenSecret,
        'oauth_access_token': oauthAccessToken,
        'oauth_access_token_secret': oauthAccessTokenSecret,
        'username': username,
        'userId': userid
      };
    } catch(e) {
      console.log('auth error', e, e.stack);
    } finally {
      next();
    }
  } else if (typeof auth === 'string' && auth.split(' ')[0] === 'Basic') {
    try {
      console.log('AUTH', typeof auth);
      const [username, userid] = await tools.getBasicUserInfo(auth);
      req.auth = {
        'oauth_token': null,
        'oauth_token_secret': null,
        'oauth_access_token': null,
        'oauth_access_token_secret': null,
        'username': username,
        'userId': userid
      };
    } finally {
      next();
    }
  } else {
    next();
  }
};
//

const tools = {
  'getTokenSecret': async (token) => {
    const sql = 'SELECT request_token_secret, access_token, access_token_secret FROM oauth.sessions WHERE request_token = $1';
    const values = [token];
    const result = await query(sql, values);
    return result.rows[0] && [result.rows[0].request_token_secret, result.rows[0].access_token, result.rows[0].access_token_secret];
  },
  'osmAuth': new oauth.OAuth(
    config.protocol + '://' + config.server + '/oauth/request_token',
    config.protocol + '://' + config.server + '/oauth/access_token',
    config.consumerKey,
    config.consumerSecret,
    '1.0',
    null,
    'HMAC-SHA1'
  ),
  'getBasicUserInfo': async (auth) => {
    // Try to get the user capabilities from the main server
    const options = {
      host: config.server,
      port: config.protocol === 'https' ?  443 : 80,
      path: '/api/0.6/user/details.xml',
      method: 'GET',
      headers: { 'Authorization': auth }
    };
    let userData = await new Promise((resolve) => {
      (config.protocol === 'https' ? https : http).get(options, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; }); 
        res.on('end', () => {
          let json;
          try {
            console.log('DATAR', data);
            json = xml2js(data, {'compact': true});
          } finally {
            resolve(json);
          }
        });
      }); 
    });

    await tools.addUser('Basic', userData.osm.user);
    return ([userData.osm.user._attributes.display_name, userData.osm.user._attributes.id]);
  },
  'getUserInfo': async (token, tokenSecret, accessToken, accessTokenSecret) => {
    const sql = `SELECT sessions.user_id, users.display_name
      FROM oauth.sessions JOIN public.users ON sessions.user_id = users.id
      WHERE sessions.access_token=$1 AND sessions.access_token_secret=$2`;
    const result = await query(sql, [accessToken, accessTokenSecret]);
    if (result.rows[0] && result.rows[0].user_id) {
      // User Exists!
      return ({'name': result.rows[0].display_name, 'id': result.rows[0].user_id});
    } else {
      // If the user doesn't exist, pull the user information from the external server
      const userDataXML = await awaitify(tools.osmAuth.get, tools.osmAuth)(
        config.protocol + '://' + config.server + '/api/0.6/user/details',
        accessToken,
        accessTokenSecret);
      const userData = xml2js(userDataXML[0], {'compact': true});

      await tools.addUser([token, tokenSecret, accessToken, accessTokenSecret], userData.osm.user);

      return ([userData.osm.user._attributes.display_name, userData.osm.user._attributes.id]);
    }
  },
  'addToken': async (token, tokenSecret) => {
    await query(sqlStatements.addSession, [token, tokenSecret]);
    query(sqlStatements.removeOldSessions);
    return true;
  },
  'addUser': async (tokens, userData) => {
    // Not all users have a home, so default their location to the white house
    userData.home = userData.home || {
      'lat': '38.893889',
      'lon': '-77.0425',
      'zoom': '3'
    };

    const newUserValues = [
      userData._attributes.id,
      userData._attributes.account_created,
      userData._attributes.display_name,
      userData.home.lat,
      userData.home.lon,
      userData.home.zoom,
      userData['contributor-terms']._attributes.pd,
      userData.changesets._attributes.count,
      userData.traces._attributes.count
    ];

    try {
      await query(sqlStatements.createUser, newUserValues);

      if (tokens !== 'Basic') {
        await query(`UPDATE oauth.sessions SET
          access_token = $3,
          access_token_secret = $4,
          user_id = $5
        WHERE
          request_token = $1 AND
          request_token_secret = $2;`, [...tokens, userData.id]);
      }

      return true;
    } catch(e) {
      return false; // todo false on fail
    }
  }
};


const routes = [{
  'path': '/access_token',
  'type': 'post',
  'auth': requireAuth,
  'fn': async (req, res) => {
    if (req.auth) {
      res.send([
        'oauth_token=', req.auth.oauth_token,
        '&oauth_token_secret=', req.auth.oauth_token_secret,
        '&username=', req.auth.username,
        '&userId=', req.auth.userId
      ].join(''));
    } else {
      res.json(['unauthorized']);
    }
  }
}, {
  'path': '/request_token',
  'type': 'post',
  'fn': async (req, res) => {
    try {
      const [token, tokenSecret] = await awaitify(tools.osmAuth.getOAuthRequestToken, tools.osmAuth)();
      await tools.addToken(token, tokenSecret);
      res.send(['oauth_token=', token, '&oauth_token_secret=', tokenSecret].join(''));
    } catch(e) {
      res.json({'error': e});
    }
  }
}, {
  'path': '/authorize',
  'type': 'get',
  'fn': (req, res) => res.redirect(config.protocol + '://' + config.server + req.originalUrl)
}
];

export default routes;
