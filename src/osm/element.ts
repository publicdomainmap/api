/* global process */
import { js2xml } from 'xml-js';

// Filters keys out of an Object
const filterKeys = (obj, fn) => Object
  .keys(obj).filter(key => fn(key))
  .reduce((accumulator, key) => ({...accumulator, [key]: obj[key]}),{});

const assignValues = (valueTypes, values, assignTo) => {
  Object.keys(valueTypes).map(key => {
    // if (values[key] !== undefined && values[key] !== null && typeof values[key] === valueTypes[key].name.toLowerCase() && Array.isArray(values[key]) ===  Array.isArray(valueTypes[key])) {
    if (values[key] !== undefined && values[key] !== null) {
      // Convert bigints that are too big for ints into strings
      if (valueTypes[key].name.toLowerCase() === 'bigint') {
        // Try to represent it as a number if it's feasible
        assignTo[key] = Number.isSafeInteger(parseInt(values[key],10)) ? parseInt(values[key],10) : values[key].toString();
      } else if (valueTypes[key].name.toLowerCase() === 'number' && typeof values[key] !== 'number') {
        // Try to convert to number
        assignTo[key] = parseFloat(values[key], 10);
      } else {
        // Assume? it's the right type TODO: better typing!
        assignTo[key] = values[key];
      }
    }
  });
};

export const Element = class {
  constructor(values) {
    const valueTypes = {
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
      'min_lat': Number,
      'min_lon': Number,
      'max_lat': Number,
      'max_lon': Number
    };
    assignValues(valueTypes, values, this);
    if (this.type === 'relation' && this.members) {
      // Each member should be checked and cleaned
      this.members = this.members.map(member => new Member(member));
    }
  }

  toXmlJs() {
    // Formats an object that can be converted with js2xml
    let compactXmlJs = {'_attributes': filterKeys(this, key => ['type', 'tags'].indexOf(key) === -1 & typeof this[key] !== 'object')};

    // Tags
    if (this.tags) {
      compactXmlJs.tag = Object.keys(this.tags).map(key => ({'_attributes': {'k': key, 'v': this.tags[key]}}));
    }

    // Nodes
    if (this.nodes) {
      compactXmlJs.node = this.node.map(node => ({'ref': node}));
    }

    // Members
    if (this.members) {
      compactXmlJs.member = this.members.map(member => member.toString());
    }
    return compactXmlJs;
  }
};

const Member = class {
  constructor(values) {
    const valueTypes = {
      'type': String,
      'ref': BigInt,
      'role': String
    };
    assignValues(valueTypes, values, this);
  }

  toJs() {
    return {...this};
  }

  toString() {
    return JSON.stringify(this.toJs());
  }
};

const UserInfo = class {
  constructor(values) {
    const valueTypes = {
      'type': String,
      'id': BigInt,
      'description': String,
      'contributor-terms': Object,
      'img': String,
      'roles': Array,
      'changesets': Number,
      'traces': Number,
      'blocks': Object,
      'home': Object,
      'languages': Array,
      'messages': Object
    };
    assignValues(valueTypes, values, this);
  }

  toJs() {
    return {...this};
  }

  toString() {
    return JSON.stringify(this.toJs());
  }

  toXmlJs() {
    // Formats an object that can be converted with js2xml
    const addAttributes = (field, attributes) => {
      return  {'_attributes': filterKeys(field, key => attributes.indexOf(key) > -1)};
    };

    let compactXmlJs = addAttributes(this, ['id', 'display_name', 'account_created']);
    compactXmlJs['description'] = this.description;
    compactXmlJs['contributor-terms'] = addAttributes(this['contributor-terms'], ['agreed','pd']);
    compactXmlJs['img'] = {'_attributes': {'href': this.img}};
    compactXmlJs['roles'] = this.roles;
    compactXmlJs['changesets'] = {'_attributes': {'count': this.changesets}};
    compactXmlJs['traces'] = {'_attributes': {'count': this.traces}};
    compactXmlJs['blocks'] = this.blocks;
    compactXmlJs['home'] = addAttributes(this.home, ['lat', 'lon', 'zoom']);
    compactXmlJs['languages'] = compactXmlJs['languages'] && {'lang': this.languages}; 
    compactXmlJs['messages'] = this.messages;

    return compactXmlJs;
  }
};


const Bound = class {
  constructor(values) {
    const valueTypes = {
      'minlat': Number,
      'minlon': Number,
      'maxlat': Number,
      'maxlon': Number
    };
    assignValues(valueTypes, values, this);
  }
};

export const OsmResponse = class {
  constructor(rows, options) {
    options = options || {};
    this.version = '0.6',
    this.generator = 'Public Domain OpenStreetMap',
    this.copyright= process.env['API_COPYRIGHT'];
    this.attribution= process.env['API_COPYRIGHT_ATTR'],
    this.license= process.env['API_COPYRIGHT_LINK'],

    this._visible = !!options.visible;
    this._bounds = !!options.bounds;
    this._rootTag = options.rootTag || 'osm';
    this._rowType = options.rowType || 'rows';

    // Add elements
    if (this._rowType === 'rows' && rows.length > 0) {
      // TODO support more types?
      this.elements = rows.map(row => row.type === 'user' ? new UserInfo(row) : new Element(row));
    } else if (this._rowType === 'element') {
      this.elements = rows;
    }

    // Add Bounds
    if (this._bounds) {
      let bounds = {
        'minlat': Infinity,
        'minlon': Infinity,
        'maxlat': -Infinity,
        'maxlon': -Infinity
      };

      this.elements.forEach(element => {
        if (element.hasOwnAttribute('lat') && element.hasOwnAttribute('lon')) {
          bounds.minlat = element.lat < bounds.minlat || bounds.minlat;
          bounds.minlon = element.lat < bounds.minlon || bounds.minlon;
          bounds.maxlat = element.lat > bounds.maxlat || bounds.maxlat;
          bounds.maxlon = element.lon > bounds.maxlon || bounds.maxlon;
        }
      });

      this.bounds = new Bound(bounds);
    }

  }

  jsonResponse() {
    return JSON.parse(JSON.stringify(
      filterKeys(this, key => !key.match(/^_/))
    ));
  }


  toJSON() {
    let jsonResponse = this.jsonResponse();

    if (jsonResponse.elements && !this._visible) {
      // Remove the visible key from the elements
      jsonResponse.elements = jsonResponse.elements
        .map(element => filterKeys(element, key => key !== 'visible'));
    }

    return jsonResponse;
  }

  toXML() {
    const attributeKeys = ['version', 'generator', 'copyright', 'attribution', 'license'];

    const jsonResponse = this.jsonResponse();
    let xmlResponse = {
      '_declaration':{
        '_attributes':{
          'version':'1.0',
          'encoding':'UTF-8'
        }
      },
      [this._rootTag]: {
        '_attributes': filterKeys(jsonResponse, key => attributeKeys.indexOf(key) > -1)
      }
    };
    let xmlRespTag = xmlResponse[this._rootTag];

    // Elements
    if (this.elements) {
      this.elements.forEach(element => xmlRespTag[element.type] = [...xmlRespTag[element.type]||[], element.toXmlJs()]);
    }

    // Bounds
    if (this.bounds) {
      xmlRespTag.bounds = this.bounds;
    }

    let xml = js2xml(xmlResponse, {compact: true, spaces: 1, attributesFn: (attributes) => {
      // The attributes were not getting sanitized correctly, so this fixes it
      // It desanitizes first to avoid double sanitization
      return Object.keys(attributes).map(key => [key, typeof attributes[key] === 'string' ? attributes[key].replace(/&amp;/g, '&').replace(/&/g, '&amp;') : attributes[key]]).reduce((acc, v) => ({...acc, [v[0]]: v[1]}),{});
    }});
    return xml;
  }

};
 
export default OsmResponse;
