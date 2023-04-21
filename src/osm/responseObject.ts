import { Member } from "./element";

type KeyTypeObject = {
  [key: string]: (value: any) => any;
};

export default class ResponseObject {
  data: { [key: string]: any } = {};
  types: KeyTypeObject = {};
  type: string = ''

  constructor(data: { [key: string]: any }, keyTypeObject?: KeyTypeObject) {
    const typeLookup = keyTypeObject || this.types;
    this.type = data.type;

    Object.entries(data).forEach(([key, value]) => {
      if (Object.prototype.hasOwnProperty.call(data, key) && typeLookup[key]) {
        this.setValue(key, value, typeLookup[key])
      }
    });
  }

  convertValue(value: any, type: (value: any) => any): any {
    // Convert bigints that are too big for ints into strings
    if ((type as any).name.toLowerCase() === 'bigint') {
      const minSafeInteger = Number.MIN_SAFE_INTEGER;
      const maxSafeInteger = Number.MAX_SAFE_INTEGER;

      if (value >= BigInt(minSafeInteger) && value <= BigInt(maxSafeInteger)) {
        return Number(value);
      } else {
        return value.toString();
      }
    } else if ((type as any).name.toLowerCase() === 'number' && typeof value !== 'number') {
      // Try to convert to number
      return parseFloat(value);
    } else {
      // Assume? it's the right type TODO: better guessing!
      return value;
    }
  }

  toJSON(): { [key: string]: any } {
    return { ...this.data };
  }

  static filterKeys(obj: Object, fn: (v: any) => boolean) {
    return Object
      .entries(obj || {}).filter(([key]) => fn(key))
      .reduce((accumulator, [key, value]) => ({ ...accumulator, [key]: value }), {});
  }
  filterKeys = ResponseObject.filterKeys;

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

    // Tags
    if (this.data.tags) {
      compactXmlJs.tag = Object.entries((this.data as any).tags).map(([k, v]) => ({ '_attributes': { k, v } }));
    }

    // Nodes
    if (this.data.nodes) {
      compactXmlJs.node = (this.data as any).nodes.map((node: string) => ({ 'ref': node }));
    }

    // Members
    if (this.data.members) {
      compactXmlJs.member = (this.data as any).members.map((member: Member) => member.toString());
    }

    return compactXmlJs;
  };

  getValue(key: string): any {
    return this.data[key];
  }

  setValue(key: string, value: any, type: (value: any) => any): void {
    this.data[key] = this.convertValue(value, type);
  }
};

export class Bound extends ResponseObject {
  static types = {
    'minlat': Number,
    'minlon': Number,
    'maxlat': Number,
    'maxlon': Number
  }
  types = Bound.types;
  constructor(data: { [key: string]: any }) {
    // Keep the bounds within the WGS84 min/max
    const boundedData = {
      'minlat': Math.max(data.minlat, -90),
      'minlon': Math.max(data.minlon, -180),
      'maxlat': Math.min(data.maxlat, 90),
      'maxlon': Math.min(data.maxlon, 180),
    };
    super(boundedData, Bound.types);
  }
};