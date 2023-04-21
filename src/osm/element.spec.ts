import Element, { ElementType, Member, MemberType } from './element';
import { libertyBellBuildingPart, libertyBellBuildingRelation, libertyBellJson } from '../test-data/osmTestObjects';

describe('Element', () => {
    const values: Partial<ElementType> = {
        type: 'way',
        id: 1,
        visible: true,
        lat: 12.34,
        lon: 56.78,
        timestamp: '2023-03-26T00:00:00Z',
        version: 1,
        changeset: 1,
        user: 'testUser',
        uid: 1,
        nodes: [BigInt(1), BigInt(2)],
        tags: { key: 'value' },
    };

    it('constructor should initialize data with provided values', () => {
        const element = new Element(values);
        expect(element.data).toEqual(values);
    });

    it('toXmlJs should return a properly formatted object', () => {
        const element = new Element(values);
        const xmlJsObject = element.toXmlJs();
        expect(xmlJsObject).toBeDefined();
        expect(xmlJsObject._attributes).toBeDefined();
        expect(xmlJsObject.tag).toBeDefined();
        expect(xmlJsObject.node).toEqual([{
            "ref": BigInt(1),
        }, {
            "ref": BigInt(2),
        }
        ]);
        expect(xmlJsObject.member).toBeUndefined();
    });
});

describe('Member', () => {
    const values: Partial<MemberType> = {
        type: 'node',
        ref: BigInt(1),
        role: 'someRole',
    };

    it('constructor should initialize data with provided values', () => {
        const member = new Member(values);
        expect(member.data).toEqual({
            type: 'node',
            ref: 1,
            role: 'someRole',
        });
    });

    it('toJs should return a copy of the data', () => {
        const member = new Member(values);
        const jsData = member.toJs();
        expect(jsData).toEqual({
            type: 'node',
            ref: 1,
            role: 'someRole',
        });
    });

});

// Test Real Elements
describe('Element With Real Data', () => {
    it('Test with Node', () => {
        const element = new Element(libertyBellJson);
        expect(element.toJSON()).toEqual(libertyBellJson);
        expect(element.toXmlJs()).toEqual({
            _attributes: {
                id: libertyBellJson.id,
                lat: libertyBellJson.lat,
                lon: libertyBellJson.lon,
                timestamp: libertyBellJson.timestamp,
                version: libertyBellJson.version,
                changeset: libertyBellJson.changeset,
                user: libertyBellJson.user,
                uid: libertyBellJson.uid
            },
            tag: Object.entries(libertyBellJson.tags || {}).map(([k, v]) => ({
                _attributes: { k, v }
            }))
        })
    });

    it('Test with Way', () => {
        const element = new Element(libertyBellBuildingPart);
        expect(element.toJSON()).toEqual({ ...libertyBellBuildingPart, nodes: libertyBellBuildingPart.nodes?.map(v => Number(v)) });
        expect(element.toXmlJs()).toEqual({
            _attributes: {
                id: libertyBellBuildingPart.id,
                timestamp: libertyBellBuildingPart.timestamp,
                version: libertyBellBuildingPart.version,
                changeset: libertyBellBuildingPart.changeset,
                user: libertyBellBuildingPart.user,
                uid: libertyBellBuildingPart.uid
            },
            tag: Object.entries(libertyBellBuildingPart.tags || {}).map(([k, v]) => ({
                _attributes: { k, v }
            })),
            node: libertyBellBuildingPart.nodes?.map(ref => ({ ref }))
        })
    });

    it('Test with relation', () => {
        const element = new Element(libertyBellBuildingRelation);
        expect(element.toJSON()).toEqual({
            ...libertyBellBuildingRelation,
            members: libertyBellBuildingRelation.members?.map(m => m.toJSON())
        });
        expect(element.toXmlJs()).toEqual({
            _attributes: {
                id: libertyBellBuildingRelation.id,
                timestamp: libertyBellBuildingRelation.timestamp,
                version: libertyBellBuildingRelation.version,
                changeset: libertyBellBuildingRelation.changeset,
                user: libertyBellBuildingRelation.user,
                uid: libertyBellBuildingRelation.uid
            },
            tag: Object.entries(libertyBellBuildingRelation.tags || {}).map(([k, v]) => ({
                _attributes: { k, v }
            })),
            member: libertyBellBuildingRelation.members?.map(m => m.data)
        })
    });

});