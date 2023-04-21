import { QueryResult } from "pg";

export type GetUserType = QueryResult<{
  id: number, user: 'user', 'display_name': string, 'creation_time': string, 'description': string,
  "contributor-terms": any, img: string, roles: any, changesets: number, traces: number,
  blocks: any, home: any, languages: any, messages: any
}>

export interface GetChangesetType {
  id: string;
  created_at: string;
  open: boolean;
  comments_count: number;
  changes_count: number;
  closed_at: string;
  minlat: number;
  minlon: number;
  maxlat: number;
  maxlon: number;
  uid: string;
  user: string;
  tags: { 'k': string, 'v': string }[];
};

export default {
  addSession: 'INSERT INTO oauth.sessions (created_time, request_token, request_token_secret) VALUES (now(), $1::text, $2::text)',
  removeOldSessions: 'DELETE FROM oauth.sessions WHERE created_time < NOW() - INTERVAL \'2 days\'',
  createUser: `INSERT INTO users
        (email, id, pass_crypt, creation_time, display_name, data_public, home_lat, home_lon, home_zoom, pass_salt, consider_pd, changesets_count, traces_count, status) VALUES (
          $1::text || '@pdmap.org',
          $1::bigint,
          $10,
          to_timestamp($2, 'YYYY-MM-DD "T"HH24:MI:SS'),
          $3,
          true,
          $4,
          $5,
          $6,
          $11,
          $7,
          $8,
          $9,
          'active'
          ) ON CONFLICT (id) DO UPDATE SET display_name = $3, consider_pd = $7;`,
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
          `,
  getChangesets: `
          SELECT 
          changesets.id,
          changesets.created_at,
          closed_at IS NULL AS "open",
          (SELECT COUNT(*) FROM changeset_comments WHERE changeset_comments.changeset_id = changesets.id) AS "comments_count",
          changesets.num_changes AS "changes_count",
          min_lat as minlat,
          min_lon as minlon,
          max_lat as maxlat,
          max_lon as maxlon,
          changesets.user_id AS uid,
          users.display_name AS user,
          (
              SELECT JSONB_AGG(JSONB_BUILD_OBJECT(k, v)) 
              FROM changeset_tags 
              WHERE changeset_tags.changeset_id = changesets.id
          ) AS tags 
        FROM changesets 
        JOIN users ON changesets.user_id = users.id
        `,
  userLoginAttributes: `SELECT id, to_char(creation_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as creation_time, pass_salt, pass_crypt FROM users WHERE display_name = $1;`
};