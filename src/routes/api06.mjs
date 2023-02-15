import { default as sql } from '../sql/api06.mjs';
import { default as query } from '../db.mjs';
import { default as osmChange } from '../osm/osmChange.mjs';
import { default as capabilities } from './capabilities.mjs';
import  { apiResponse, apiError } from '../osm/apiResponse.mjs';

const routes = [{
    // Get node by id
    'path': '/node/:id.:format?',
    'type': 'get',
    'fn': (req, res) => {
      // Query the database for the node with the given id
      let dbResult, dbError;
      query(sql.getNode, [req.params.id])
        .then(result => dbResult = result)
        .catch(error => dbError = error)
        .finally(() => {
          // Respond with either an error or the result of the query
          if (dbResult && dbResult.rows) {
            apiResponse(res, req.params.format, dbResult.rows);
          } else {
            apiError(res, dbError || dbResult || 'Unknown Error');
          }
        });
    }
  },
  {
    // Get nodes by list of ids
    'path': '/nodes.:format?',
    'type': 'get',
    'fn': (req, res) => {
      // Query the database for the nodes with the given ids
      let dbResult, dbError;
      query(sql.getNodes, [req.query.nodes && req.query.nodes.split(',')])
        .then(result => dbResult = result)
        .catch(error => dbError = error)
        .finally(() => {
          // Respond with either an error or the result of the query
          if (dbResult && dbResult.rows) {
            apiResponse(res, req.params.format, dbResult.rows);
          } else {
            apiError(res, dbError || dbResult || 'Unknown Error');
          }
        });
    }
  },
  {
    // Get the most recent 100 changesets for a userid
    // https://wiki.openstreetmap.org/wiki/API_v0.6#Query:_GET_/api/0.6/changesets
    'path': '/changesets.:format?',
    'type': 'get',
    'fn': (req, res) => {
      // Query the database for the most recent 100 changesets for the given user id
      let dbResult, dbError;
      query(sql.getChangesets, [parseInt(req.query.user, 10), 100])
        .then(result => dbResult = result)
        .catch(error => dbError = error)
        .finally(() => {
          // Respond with either an error or the result of the query
          if (dbResult && dbResult.rows) {
            apiResponse(res, req.params.format, dbResult.rows, {});
          } else {
            apiError(res, dbError || dbResult || 'Unknown Error');
          }
        });
    }
  },   {
    // Route for getting map data
    // https://wiki.openstreetmap.org/wiki/API_v0.6#Retrieving_map_data_by_bounding_box:_GET_/api/0.6/map
    'path': '/map.:format?',
    'type': 'get',
    'fn': (req, res) => {
      // Extract bounding box coordinates from the query string
      let bbox = req.query.bbox.split(',');

      // Query the database for map data
      let dbResult, dbError;
      query(sql.getMap, [...bbox])
        .then(result => dbResult = result)
        .catch(error =>  dbError = error)
        .finally(() => {
          // Send response with map data or error
          if (dbResult && dbResult.rows) {
            apiResponse(res, req.params.format, dbResult.rows, {});
          } else {
            apiError(res, dbError || dbResult || 'Unknown Error');
          }
        });
    }
  },
  {
    // Route for getting user details
    'path': '/user/details.:format?',
    'auth': true,
    'type': 'get',
    'fn': (req, res) => {
      // Query the database for user details
      let dbResult, dbError;
      query(sql.getUser, [req.auth && req.auth.userId])
        .then(result => dbResult = result)
        .catch(error =>  dbError = error)
        .finally(() => {
          // Send response with user details or error
          if (dbResult && dbResult.rows && dbResult.rows.length) {
            apiResponse(res, req.params.format, dbResult.rows, {});
          } else {
            let code = '401'; 
            apiError(res, dbError || dbResult || 'Unknown Error', code);
          }
        });
    }
  },
  {
    // Route for uploading changeset data
    'path': '/changeset/:id/upload',
    'auth': true,
    'type': 'post',
    'fn': async (req, res) => {
      if (req.auth && req.auth.userId !== undefined) {
        // Generate OSM diff and send response
        let osmDiff;
        try {
          osmDiff = await osmChange(req.rawJSON, req.auth.userId, req.params.id, query);
          apiResponse(res, req.params.format, osmDiff, {rowType: 'element', 'rootTag': 'diffResult'});
        } catch(e) {
          apiError(res, e || 'Unknown Error', '500');
        }
      } else {
        apiError(res, 'Unauthorized', '401');
      }
    }
  },{
  // Route for creating a changeset
  // https://wiki.openstreetmap.org/wiki/API_v0.6#Create:_PUT_/api/0.6/changeset/create
  'path': '/changeset/create',
  'type': 'put',
  'auth': true, // require authentication
  'fn': async (req, res) => {
    if (req.auth && req.auth.userId !== undefined && req.rawJSON && req.rawJSON.osm && req.rawJSON.osm.changeset) {
      const userId = req.auth.userId.toString();
      const tags = req.rawJSON.osm.changeset.tag;
      let dbResult, dbError;
      try {
        dbResult = await query(sql.createChangeset, [userId]);
        let tagInserts = tags.map(tag => query(sql.addChangesetTag, [userId, tag._attibutes.k, tag._attibutes.v]));
        await Promise.all(tagInserts);
      } catch(e) {
        dbError = e;
        dbResult = null;
      }
      // Create a new changeset in the database and insert tags
      query(sql.createChangeset, [userId])
        .then(result => dbResult = result)
        .catch(error =>  dbError = error)
        .finally(() => {
          if (dbResult && dbResult.rows) {
            res.send(dbResult.rows[0].id.toString());
          } else {
            apiError(res, dbError || dbResult || 'Unknown Error');
          }
        });
    } else {
      apiError(res, (req.auth && req.auth.usedId) ? 'Unknown Error' : 'Unauthorized');
    }
  }
},{
  // Route for closing a changeset
  // https://wiki.openstreetmap.org/wiki/API_v0.6#Close:_PUT_/api/0.6/changeset/#id/close
  'path': '/changeset/:id/close',
  'type': 'put',
  'auth': true, // require authentication
  'fn': async (req, res) => {
    let dbResult;
    if (req.auth && req.auth.userId !== undefined) { // check if user is authenticated
      const userId = req.auth.userId.toString();
      try {
        // Check if the changeset is valid and owned by the authenticated user, then close it
        dbResult = await query('SELECT count(*) FROM changesets WHERE id = $1 AND user_id = $2 AND created_at = closed_at', [req.params.id, userId]);
        if (dbResult.rows[0].count > 0) {
          await query('UPDATE changesets SET closed_at = now() WHERE id = $1 AND user_id = $2',  [req.params.id, userId]);
          res.send(req.params.id);
        } else {
          res.status(400).send('Invalid Changeset');
        }
      } catch(e) {
        res.status(500).send('Internal error');
      }
    } else {
      res.status(401).send('Not Authorized');
    }
  },
...capabilities];

export default routes;
