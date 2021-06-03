/* global process */
import { default as pg } from 'pg';

const pool = new pg.Pool({
  host: process.env['PGHOST'],
  user: process.env['OSM_POSTGRES_USER'],
  database: process.env['OSM_POSTGRES_DB'],
  password: process.env['OSM_POSTGRES_PASSWORD'],
  port: parseInt(process.env['PGPORT'] || '5432', 10)
});

const query = async function(sql, values) {
  const client = await pool.connect();
  console.log('SQL', sql, values);
  let returnValue = null;
  try {
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
    returnValue = res;
  } catch(e) {
    // TODO return error
    console.error('error', e);
  } finally {
    // Make sure to release the client before any error handling,
    // just in case the error handling itself throws an error.
    client.release();
  }
  return returnValue;
};

export default query;
