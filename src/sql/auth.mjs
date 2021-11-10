export default {
  addSession: 'INSERT INTO oauth.sessions (created_time, request_token, request_token_secret) VALUES (now(), $1::text, $2::text)',
  removeOldSessions: 'DELETE FROM oauth.sessions WHERE created_time < NOW() - INTERVAL \'2 days\'',
  createUser: `INSERT INTO users (email, id, pass_crypt, creation_time, display_name, data_public, home_lat, home_lon, home_zoom, pass_salt,
        consider_pd, changesets_count, traces_count) VALUES (
        floor(random() * power(10,10) + 1)::bigint || '@example.com', $1, '0', to_timestamp($2, 'YYYY-MM-DD "T"HH24:MI:SS'), $3, true, $4, $5, $6, '0',
        $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET display_name = $3, consider_pd = $7;`
};
