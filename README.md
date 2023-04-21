
# 🗺️🌐 PublicDomainMap API

This API provides access to the PublicDomainMap database by providing its own Authentication wrapper over [OpenStreetMap's CGIMap](https://github.com/zerebubuth/openstreetmap-cgimap). The API also provides two endpoints that are needed, but not found in CGIMap. This supports a subset of the endpoints from the [OpenStreetMap 0.6 API](https://wiki.openstreetmap.org/wiki/API_v0.6).

## 🔐 Authentication

The PublicDomainMap API uses oauth version 1.0 from OpenStreetMap.org for authentication. For all other endpoints, PublicDomainMap uses [OpenStreetMap's CGIMap](https://github.com/zerebubuth/openstreetmap-cgimap) this is controlled by the express application.

## 🚀 Authenticated Endpoints
Most endpoints are forward to CGIMap, which does most of the work, this just adds the auth endpoints and user details and capabilities, which CGIMap does not include.

### 🛕 Authenticated Endpoints
The PublicdomainMap API is only used for authenication

| Path | Type |  Description| 
| ----- | ------ | -------|
 |  /user/details.:format? |  get  | Query the database for  user details and send a response with  user details or error |

### 🛣️ Other Endpoints
Basic unauthenticated endpoints are included for completeness, but are not accessible in the production version.

| Path | Type | Description| 
| ----- | ------ | -------|
 |  /capabilities.:format? |  get  | This API call is meant to provide information about the capabilities and limitations of the current API. (Note this supports JSON, where the OSM API's version does not)

## 🧪 Testing
Tests are included, currently using [jest](https://www.npmjs.com/package/jest). Just run `npm test`

## 📝 Improvements
I would like to improve this project in a number of ways:
- [x] Migrate tests to [Jest](https://jestjs.io/)
- [x] Migrate Code from MJS to TS
- [ ] OAUTH2 Support
- [x] Fix issues with JOSM, which uses more of the API than iD
- [ ] Set up automated testing and deploying directly from Github
- [ ] Many more ideas in the [issues](https://github.com/publicdomainmap/api/issues)

## 🏗️ Built With

-   [Node.js](https://nodejs.org/) - The runtime environment for the server
-   [Express.js](https://expressjs.com/) - The web framework used to build the API
-   [PostgreSQL](https://www.postgresql.org/) - The database used to store the data
