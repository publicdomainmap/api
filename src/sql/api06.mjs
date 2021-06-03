const sql = {
  getNode:'SELECT * FROM api_current_nodes WHERE id = $1',
  getNodes:'SELECT * FROM api_current_nodes WHERE id = ANY ($1)',
  getMap: 'SELECT * FROM api_map($1,$2,$3,$4)',
  createChangeset: `
    INSERT INTO changesets
      (id, user_id, created_at, min_lat, max_lat, min_lon, max_lon, closed_at, num_changes)
    VALUES
      (nextval('changesets_id_seq'), $1, now(), -900000000, 900000000, -1800000000, 1800000000, now(), 0)
    RETURNING id;
  `,
  addChangesetTag: `INSERT INTO changeset_tags (changeset_id, k, v) VALUES ($1, $2, $3)
    ON CONFLICT (changeset_id, k) DO UPDATE SET v = $3;`,
  getUser: `
  SELECT
    id AS id,
    'user' AS type,
    display_name AS display_name,
    creation_time AS account_created,
    description AS description,
    json_build_object('agreed', terms_seen, 'pd', consider_pd) AS "contributor-terms",
    'https://upload.wikimedia.org/wikipedia/commons/b/b0/Openstreetmap_logo.svg' AS img,
    json_build_array() AS roles,
    changesets_count AS changesets,
    traces_count AS traces,
    json_build_array() AS blocks,
    json_build_object('lat', home_lat, 'lon', home_lon, 'zoom', home_zoom) AS home,
    (json_build_array(regexp_split_to_array(languages,',')))->0 AS languages,
    json_build_array() AS messages
  FROM 
    users    
  WHERE
    users.id = $1
  `
};

export default sql;
