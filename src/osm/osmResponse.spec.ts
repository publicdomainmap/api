import { OsmResponse } from './osmResponse';
import Element from './element';
import UserInfo from './userInfo';
import { libertyBellBuildingChangeset, libertyBellBuildingPart, libertyBellBuildingRelation, libertyBellJson } from '../test-data/osmTestObjects';
import { Bound } from './responseObject';
import { xml2js } from 'xml-js';

// Dummy Data
describe('OsmResponse with test data', () => {
  const elementData = {
    type: 'node',
    id: 1,
    lat: 12.34,
    lon: 56.78
  };

  const userInfoData = {
    type: 'user',
    uid: 1,
    display_name: 'testUser'
  };

  it('constructor should initialize with provided data', () => {
    const osmResponse = new OsmResponse([elementData, userInfoData]);
    const { data } = osmResponse;
    expect(data.version).toEqual('0.6');
    expect(data.generator).toEqual('Public Domain OpenStreetMap');
    expect(data.elements).toBeDefined();
    expect(data.elements?.length).toEqual(2);
    expect(data.elements?.[0]).toBeInstanceOf(Element);
    expect(data.elements?.[1]).toBeInstanceOf(UserInfo);
  });

  it('toJSON should return a filtered response object', () => {
    const osmResponse = new OsmResponse([elementData]);
    const jsonResponse = osmResponse.toJSON();
    expect(jsonResponse.version).toBeDefined();
    expect(jsonResponse.generator).toBeDefined();
    expect(jsonResponse.elements[0].id).toEqual(1);
    expect(jsonResponse.elements[0].lat).toEqual(12.34);
    expect(jsonResponse.elements[0].lon).toEqual(56.78);
    expect(jsonResponse.elements[0].type).toEqual('node');
  });

  it('toJSON should return a valid JSON object', () => {
    const osmResponse = new OsmResponse([elementData]);
    const jsonObject = osmResponse.toJSON();
    expect(jsonObject.version).toBeDefined();
    expect(jsonObject.generator).toBeDefined();
  });

  it('toXML should return a valid XML string', () => {
    const osmResponse = new OsmResponse([userInfoData]);
    const xmlString = osmResponse.toXML();
    expect(typeof xmlString).toEqual('string');
    expect(xmlString).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xmlString).toContain('<osm');
    expect(xmlString).toContain('</osm>');
  });

  it('bounds should be calculated correctly when _bounds is true', () => {
    const osmResponse = new OsmResponse([elementData], { bounds: true });
    const { bounds } = osmResponse.data;
    expect(bounds).toBeDefined();
    expect(bounds).toBeInstanceOf(Bound);
    expect(bounds?.data.minlat).toEqual(12.34);
    expect(bounds?.data.minlon).toEqual(56.78);
    expect(bounds?.data.maxlat).toEqual(12.34);
    expect(bounds?.data.maxlon).toEqual(56.78);
  });
});

// Real OSM Data
describe('OsmResponse with real data', () => {
  const elements = [
    libertyBellJson,
    libertyBellBuildingPart,
    libertyBellBuildingRelation
  ]

  it('General data should be correct', () => {
    const osmResponse = new OsmResponse(elements);
    const { data } = osmResponse;
    expect(data.version).toEqual('0.6');
    expect(data.generator).toEqual('Public Domain OpenStreetMap');
    expect(data.elements).toBeDefined();
    expect(data.elements?.length).toEqual(3);
    expect(data.elements?.[0]).toBeInstanceOf(Element);
    expect(data.elements?.[1]).toBeInstanceOf(Element);
    expect(data.elements?.[2]).toBeInstanceOf(Element);
  });

  it('toJSON should return a valid JSON object', () => {
    const osmResponse = new OsmResponse(elements);
    const jsonObject = osmResponse.toJSON();
    expect(jsonObject.version).toEqual('0.6');
    expect(jsonObject.generator).toEqual('Public Domain OpenStreetMap');
    expect(jsonObject.elements[0].type).toEqual('node');
    expect(jsonObject.elements[1].type).toEqual('way');
    expect(jsonObject.elements[2].type).toEqual('relation');
  });

  it('bounds should be calculated correctly when _bounds is true', () => {
    const osmResponse = new OsmResponse(elements, { bounds: true });
    const { bounds } = osmResponse.data;
    expect(bounds).toBeDefined();
    expect(bounds).toBeInstanceOf(Bound);
    expect(bounds?.data.minlat).toEqual(39.9494654);
    expect(bounds?.data.minlon).toEqual(-75.1502823);
    expect(bounds?.data.maxlat).toEqual(39.9494654);
    expect(bounds?.data.maxlon).toEqual(-75.1502823);
  });

  /*it('should support XML and JSON data properly', () => {
    const osmResponse = new OsmResponse([...elements, ...elements], { bounds: true });
    const xmlJs = xml2js(osmResponse.toXML(), { 'compact': true });
    console.log(xmlJs);
    console.log(osmResponse.toJSON());
    console.log(osmResponse.toXML());
  });*/

  it('should work with a changeset', () => {
    const osmResponse = new OsmResponse([libertyBellBuildingChangeset], { bounds: true });
    const { data } = osmResponse;
    const { bounds } = data;
    expect(data.version).toEqual('0.6');
    expect(data.generator).toEqual('Public Domain OpenStreetMap');
    expect(data.elements).toBeDefined();
    expect(data.elements?.length).toEqual(1);
    expect(bounds?.data.minlat).toEqual(libertyBellBuildingChangeset.minlat);
    expect(bounds?.data.minlon).toEqual(libertyBellBuildingChangeset.minlon);
    expect(bounds?.data.maxlat).toEqual(libertyBellBuildingChangeset.maxlat);
    expect(bounds?.data.maxlon).toEqual(libertyBellBuildingChangeset.maxlon);
  });

  it('should work with a changeset', () => {
    const osmResponse = new OsmResponse([libertyBellBuildingChangeset]);
    const xmlJs = xml2js(osmResponse.toXML(), { 'compact': true });
    const { changeset } = (xmlJs as any).osm;
    expect(changeset).toEqual({
      _attributes: {
        id: String(libertyBellBuildingChangeset.id),
        created_at: String(libertyBellBuildingChangeset.created_at),
        closed_at: String(libertyBellBuildingChangeset.closed_at),
        open: String(libertyBellBuildingChangeset.open),
        user: String(libertyBellBuildingChangeset.user),
        uid: String(libertyBellBuildingChangeset.uid),
        minlat: String(libertyBellBuildingChangeset.minlat),
        minlon: String(libertyBellBuildingChangeset.minlon),
        maxlat: String(libertyBellBuildingChangeset.maxlat),
        maxlon: String(libertyBellBuildingChangeset.maxlon),
        comments_count: String(libertyBellBuildingChangeset.comments_count),
        changes_count: String(libertyBellBuildingChangeset.changes_count)
      },
      tag: Object.entries(libertyBellBuildingChangeset.tags || {}).map(([k, v]) => ({
        _attributes: { k, v: String(v) }
      }))
    })

  });
});
