/* global process */
import { default as pg } from 'pg';

const pool = new pg.Pool({
  host: process.env['PGHOST'],
  user: process.env['OSM_POSTGRES_USER'],
  database: process.env['OSM_POSTGRES_DB'],
  password: process.env['OSM_POSTGRES_PASSWORD'],
  port: parseInt(process.env['PGPORT'] || '5432', 10)
});

/**
 * Execute a SQL query against the database.
 * @param {string} sql - The SQL query to execute.
 * @param {Array} values - The values to use as parameters in the query.
 * @returns {Promise} A Promise that resolves to the query result, or null if there was an error.
 */
const query = async function(sql, values) {
  // Get a connection from the pool
  const client = await pool.connect();
  console.log('SQL', sql, values);
  let returnValue = null;
  try {
    // Execute the query
    const res = await client.query(sql, values);
    // Convert BigInt strings to JavaScript BigInts
    res.rows = res.rows.map(row => {
      Object.keys(row).forEach(key => {
        if (res.fields.filter(field => field['name'] === key)[0].dataTypeID === 20) {
          row[key] = BigInt(row[key]);
        }
      });
      return row;
    });
    // Set the return value to the query result
    returnValue = res;
  } catch(e) {
    // TODO: Handle the error better than this!
    console.error('error', e);
  } finally {
    // Release the connection back to the pool
    client.release();
  }
  // Return the query result, or null if there was an error
  return returnValue;
};
export default query;
