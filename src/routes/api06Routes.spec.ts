// Dummy variables
process.env.OPENSTREETMAP_CLIENT_ID='DUMMY VALUE';
process.env.OPENSTREETMAP_CLIENT_SECRET='DUMMY VALUE';
process.env.OPENSTREETMAP_CALLBACK_URL='DUMMY VALUE';
process.env.OPENSTREETMAP_SESSION_SECRET='DUMMY VALUE';
process.env.OPENSTREETMAP_TOKEN_URL='DUMMY VALUE';
process.env.OPENSTREETMAP_AUTHORIZATION_URL='DUMMY VALUE';
process.env.OPENSTREETMAP_API_URL='DUMMY VALUE';

import { readQueryParams } from './api06Routes'; // Update the import to point to your actual function file

describe('buildWhereClauseAndValues', () => {
    it('Should handle empty query parameters', () => {
        const queryParams = {};
        const result = readQueryParams(queryParams);
        expect(result.whereClause).toBe('');
        expect(result.whereValues).toEqual([]);
    });

    it('Should handle bbox query parameter', () => {
        const queryParams = { bbox: '-180,-90,180,90' };
        const result = readQueryParams(queryParams);
        expect(result.whereClause).toBe(
            'WHERE  "changesets"."min_lon" < $1  AND  "changesets"."max_lon" > $2  AND  "changesets"."min_lat" < $3  AND  "changesets"."max_lat" > $4 '
        );
        expect(result.whereValues).toEqual(['180', '-180', '90', '-90']);
    });

    it('Should handle changesets query parameter', () => {
        const queryParams = { changesets: '1,2,3' };
        const result = readQueryParams(queryParams);
        expect(result.whereClause).toBe(
            'WHERE  "changesets"."id" IN ($1, $2, $3) '
        );
        expect(result.whereValues).toEqual([1, 2, 3]);
    });

    it('Should handle user and display_name query parameters', () => {
        const queryParams = { user: '876', };
        const result = readQueryParams(queryParams);
        expect(result.whereClause).toBe(
            'WHERE  "changesets"."user_id" = $1 '
        );
        expect(result.whereValues).toEqual(["876"]);
    });


    it('Should handle user and display_name query parameters', () => {
        const queryParams = { display_name: 'testuser' };
        const result = readQueryParams(queryParams);
        expect(result.whereClause).toBe(
            'WHERE  "users"."display_name" = $1 '
        );
        expect(result.whereValues).toEqual(['testuser']);
    });


});