import { ElementType, Member } from "../osm/element";

export const libertyBellBuildingRelation: Partial<ElementType> = {

    "type": "relation", "id": 9102228, "timestamp": "2018-12-13T05:56:28Z", "version": 1, "changeset": 65430720, "user": "quincylvania", "uid": 4515353,
    "members": [
        { "type": "way", "ref": 654640053, "role": "outer" }, { "type": "way", "ref": 654640054, "role": "inner" },
        { "type": "way", "ref": 654640056, "role": "inner" }, { "type": "way", "ref": 654640055, "role": "inner" }
    ].map(v => (new Member({ ...v, ref: BigInt(v.ref) }))),
    "tags": { "area": "yes", "highway": "pedestrian", "type": "multipolygon" }

};

export const libertyBellBuildingPart: Partial<ElementType> = {
    "type": "way", "id": 335799893, "timestamp": "2015-03-31T18:54:46Z", "version": 1,
    "changeset": 29886442, "user": "eugenebata", "uid": 624003,
    "nodes": [3429163936, 3429163939, 3429163940, 3429163937, 482340888, 482340886, 3429163943, 3429163938, 3429163936].map(v => BigInt(v)),
    "tags": { "building:levels": "2", "building:part": "yes", "roof:shape": "hipped" }
};


export const libertyBellJson: Partial<ElementType> = {
    "type": "node", "id": 1207480649, "lat": 39.9494654, "lon": -75.1502823, "timestamp": "2020-06-05T01:41:49Z", "version": 6,
    "changeset": 86214366, "user": "quincylvania", "uid": 4515353,
    "tags": {
        "addr:city": "Philadelphia", "addr:state": "PA",
        "historic": "bell", "name": "Liberty Bell",
        "name:de": "Freiheitsglocke", "tourism": "attraction",
        "wheelchair": "yes",
        "wikidata": "Q390306", "wikipedia": "en:Liberty Bell"
    }
};

export const libertyBellBuildingChangeset: Partial<ElementType> = {
    "type": "changeset", "id": 65430720, "created_at": "2018-12-13T05:56:22Z",
    "closed_at": "2018-12-13T05:56:32Z", "open": false, "user": "quincylvania", "uid": 4515353,
    "minlat": 39.9471116, "minlon": -75.1511003, "maxlat": 39.9546440, "maxlon": -75.1460185,
    "comments_count": 0, "changes_count": 299,
    "tags": {
        "comment": "Updates around Independence Mall, PA",
        "created_by": "iD 2.12.1",
        "host": "https://www.openstreetmap.org/edit",
        "locale": "en-US",
        "source": "aerial imagery;local knowledge",
        "imagery_used": "Bing aerial imagery;Esri World Imagery (Clarity) Beta;Bing Streetside;Mapillary Images;OpenStreetCam Images",
        "changesets_count": "959"
    }
};