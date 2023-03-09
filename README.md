
# 🗺️🌐 PublicDomainMap API

This API manipulate the OpenStreetMap database. The API is RESTful, meaning that it follows the principles of Representational State Transfer (REST) architectural style.

## 🔐 Authentication

The PublicDomainMap API uses oauth version 1 from OpenStreetMap.org for authentication. For all other endpoints, PublicDomainMap uses[OpenStreetMap's CGIMap](https://github.com/zerebubuth/openstreetmap-cgimap) this is controlled by the [NGINX config](https://github.com/publicdomainmap/publicdomainmap/blob/5e15717d60e357873cda2426f40728a024af97c7/nginx/conf.d/app.conf#L71).

## 🛕 Authenticated Endpoints
The PublicdomainMap API is only used for Authenticated Endpoints, and it only implements the following:

| Path | Type |  Description| 
| ----- | ------ | -------|
 |  /user/details.:format? |  get  | Query the database for  user details and send a response with  user details or error |
|  /changeset/:id/upload | post | Generate OSM diff and send a response |
|  /changeset/create  | put |  Create a new changeset in the database and  insert tags |
|  /changeset/:id/close  | put |  Check if the changeset is valid and owned by the authenticated user, then  close it and send a response with either the changeset id or an error |

## 🛣️ Other Endpoints
Basic unauthenticated endpoints are included for completeness, but are not accessible in the production version.

| Path | Type | Description| 
| ----- | ------ | -------|
|  /node/:id.:format? |  get  | Query the database for the node with the given id and respond with either an error or the result  of the query |  
|  /nodes.:format? |  get  | Query the database for the nodes with the given ids and respond with either an error or the result  of the query | 
 |  /changesets.:format? |  get  | Query the database for the most recent 100 changesets for the given user id and respond with either an error or the result  of the query | 
 |  /map.:format? |  get  | Extract bounding box coordinates from the query string and query the database for map data, then send a response with the map data or error |

## 🧪 Testing
A limited set of tests are included, currently using [tape](https://www.npmjs.com/package/tape). These tests are planned to be improved.

## 📝 Improvements
I would like to improve this project in a number of ways:
* Migrate tests to [Jest](https://jestjs.io/)
* Migrate Code from MJS to TS
* OAUTH2 Support
* Fix issues with JOSM, which uses more of the API than iD
* Set up automated testing and deploying directly from Github
* Many more ideas in the [issues](https://github.com/publicdomainmap/api/issues)

## 🏗️ Built With

-   [Node.js](https://nodejs.org/) - The runtime environment for the server
-   [Express.js](https://expressjs.com/) - The web framework used to build the API
-   [PostgreSQL](https://www.postgresql.org/) - The database used to store the data
