
import ResponseObject from './responseObject';

export interface ElementType {
    type: string;
    id: number;
    visible: boolean;
    lat: number;
    lon: number;
    timestamp: string;
    version: number;
    changeset: number;
    user: string;
    uid: number;
    nodes: BigInt[] | null;
    tags: { [key: string]: string } | null;
    members: Member[] | null;
    created_at: string | null;
    open: boolean | null;
    comments_count: number | null;
    closed_at: string | null;
    changes_count: number | null;
    minlat: number | null;
    minlon: number | null;
    maxlat: number | null;
    maxlon: number | null;
};

export default class Element extends ResponseObject {
    static types = {
        'type': String,
        'id': BigInt,
        'visible': Boolean,
        'lat': Number,
        'lon': Number,
        'timestamp': String,
        'version': BigInt,
        'changeset': BigInt,
        'user': String,
        'uid': BigInt,
        'nodes': Array,
        'tags': Object,
        'members': Array,
        'created_at': String,
        'open': Boolean,
        'comments_count': Number,
        'changes_count': Number,
        'closed_at': String,
        'minlat': Number,
        'minlon': Number,
        'maxlat': Number,
        'maxlon': Number
    };
    types = Element.types;

    constructor(values: Partial<ElementType>) {
        super(values, Element.types);
    }

    toJSON() {
        // Members
        let { members, nodes, ...data } = (this.data as ElementType);
        if (nodes) {
            let jsNodes = nodes.map(node => this.convertValue(node, BigInt));
            (data as any).nodes = jsNodes;
        }
        if (members) {
            let jsMembers = members.map((member: Member) => member.toJs());
            (data as any).members = jsMembers;
        }
        return Object.assign({}, data);
    }

    toXmlJs() {
        // Formats an object that can be converted with js2xml
        let compactXmlJs: {
            _attributes: { [key: string]: string }
            tag?: { _attributes: { k: string; v: any; }; }[],
            node?: string,
            member?: string
        } = {
            '_attributes': this.filterKeys(this.data, key => ['type', 'tags'].indexOf(key) === -1 && typeof (this.data as any)[key] !== 'object'),
        };

        let { tags, nodes, members } = this.data;

        // Tags
        if (tags) {
            compactXmlJs.tag = Object.entries(tags).map(([k, v]) => ({ '_attributes': { k, v } }));
        }

        // Nodes
        if (nodes) {
            compactXmlJs.node = nodes.map((node: string) => ({ 'ref': node }));
        }

        // Members
        if (members) {
            compactXmlJs.member = members.map((member: Member) => member.toJs());
        }
        return compactXmlJs;
    }
};

export type MemberType = {
    type: string,
    ref: BigInt,
    role: string
};
export class Member extends ResponseObject {
    static types = {
        'type': String,
        'ref': BigInt,
        'role': String
    };
    types = Member.types;

    constructor(values: Partial<MemberType>) {
        super(values, Member.types);
    }

    toJs() {
        return { ...this.data };
    }

};