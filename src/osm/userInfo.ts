import ResponseObject from "./responseObject";

type UserInfoAttributes = {
    type?: string;
    id?: bigint;
    account_created: String,
    display_name: string;
    description?: string;
    'contributor-terms'?: Record<string, unknown>;
    img?: string;
    roles?: Array<string>;
    changesets?: number;
    traces?: number;
    blocks?: Record<string, unknown>;
    home?: Record<string, unknown>;
    languages?: Array<string>;
    messages?: Record<string, unknown>;
};

export default class UserInfo extends ResponseObject {
    static types = {
        type: String,
        id: BigInt,
        account_created: String,
        display_name: String,
        description: String,
        'contributor-terms': Object,
        img: String,
        roles: Array,
        changesets: Number,
        traces: Number,
        blocks: Object,
        home: Object,
        languages: Array,
        messages: Object
    }
    types = UserInfo.types;

    constructor(values: UserInfoAttributes) {
        super(values, UserInfo.types);
    }

    toJSON(): { [key: string]: any; } {
        return { ...this.data };
    }

    toXmlJs(): any {
        const addAttributes = (field: Record<string, any>, attributes: Array<string>): Record<string, unknown> => {
            return { _attributes: this.filterKeys(field, (key) => attributes.indexOf(key) > -1) };
        };
        const { data } = this;

        let compactXmlJs: Record<string, any> = addAttributes(data, ['id', 'display_name', 'account_created']);
        compactXmlJs['description'] = data.description;
        compactXmlJs['contributor-terms'] = addAttributes(data['contributor-terms'] as any, ['agreed', 'pd']);
        compactXmlJs['img'] = { _attributes: { href: data.img } };
        compactXmlJs['roles'] = data.roles;
        compactXmlJs['changesets'] = { _attributes: { count: data.changesets } };
        compactXmlJs['traces'] = { _attributes: { count: data.traces } };
        compactXmlJs['blocks'] = data.blocks;
        compactXmlJs['home'] = addAttributes(data.home as any, ['lat', 'lon', 'zoom']);
        compactXmlJs['languages'] = compactXmlJs['languages'] && { lang: data.languages };
        compactXmlJs['messages'] = data.messages;

        return compactXmlJs;
    }
}