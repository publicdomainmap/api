import UserInfo from "./userInfo";
import { js2xml } from "xml-js";
import ResponseObject, { Bound } from "./responseObject";
import Element from "./element";
import { Api } from "../routes/capabilities";

export class OsmResponse {
    data: {
        version: string;
        generator: string;
        copyright: string | undefined;
        attribution: string | undefined;
        license: string | undefined;
        elements?: (Element | UserInfo | Api)[];
        bounds?: Bound;
    };
    _visible: boolean;
    _bounds: boolean;
    _rootTag: string;
    _rowType: string;

    constructor(rows: any[], options?: Record<string, any>) { //TODO type for options
        options = options || {};
        this.data = {
            version: '0.6',
            generator: 'Public Domain OpenStreetMap', //TODO env var
            copyright: process.env['API_COPYRIGHT'],
            attribution: process.env['API_COPYRIGHT_ATTR'],
            license: process.env['API_COPYRIGHT_LINK']
        };

        this._visible = !!options.visible;
        this._bounds = !!options.bounds;
        this._rootTag = options.rootTag || 'osm';
        this._rowType = options.rowType || 'rows';

        if (this._rowType === 'rows' && rows.length > 0) {
            this.data.elements = rows.map(row => (row.type === 'user' ? new UserInfo(row) : new Element(row)));
        } else if (this._rowType === 'element') {
            this.data.elements = rows;
        }

        if (this._bounds) {
            let bounds = {
                minlat: Infinity,
                minlon: Infinity,
                maxlat: -Infinity,
                maxlon: -Infinity,
            };

            (this.data.elements || []).forEach(element => {
                const { data } = element;
                if (data.hasOwnProperty('lat') && (data as any).hasOwnProperty('lon')) {
                    // Nodes
                    bounds.minlat = Math.min(data.lat, bounds.minlat);
                    bounds.minlon = Math.min(data.lon, bounds.minlon);
                    bounds.maxlat = Math.max(data.lat, bounds.maxlat);
                    bounds.maxlon = Math.max(data.lon, bounds.maxlon);
                } else if (
                    // Changesets
                    data.hasOwnProperty('minlat') && data.hasOwnProperty('maxlat') &&
                    data.hasOwnProperty('minlon') && data.hasOwnProperty('maxlon')) {
                    bounds.minlat = Math.min(data.minlat, bounds.minlat);
                    bounds.minlon = Math.min(data.minlon, bounds.minlon);
                    bounds.maxlat = Math.max(data.maxlat, bounds.maxlat);
                    bounds.maxlon = Math.max(data.maxlon, bounds.maxlon);
                }
            });

            this.data.bounds = new Bound(bounds);
        }
    }

    removeUndefineds(obj: any): any {
        return Object.fromEntries(
            Object.entries(obj).filter(([_, v]) => v !== undefined)
        );
    }

    toJSON(): any {
        const { elements, bounds, ...response } = this.data;
        let jsElements: any[] = [];
        let jsBounds: typeof Bound.types | undefined;

        if (elements && !this._visible) {
            jsElements = elements
                .map(element => ResponseObject.filterKeys(element.data, key => key !== 'visible'));
        }
        if (bounds) {
            jsBounds = bounds.data as typeof Bound.types;
        }

        return this.removeUndefineds({ ...response, bounds: jsBounds, elements: jsElements });
    }

    toXML(): string {
        const attributeKeys = ['version', 'generator', 'copyright', 'attribution', 'license'];

        let xmlResponse: any = {
            _declaration: {
                _attributes: {
                    version: '1.0',
                    encoding: 'UTF-8',
                },
            },
            [this._rootTag]: {
                _attributes: ResponseObject.filterKeys(this.data, key => attributeKeys.indexOf(key) > -1),
            },
        };
        let xmlRespTag = xmlResponse[this._rootTag];

        const { elements, bounds } = this.data;
        if (elements) {
            elements.forEach(element => (xmlRespTag[element.type] = [...xmlRespTag[element.type] || [], element.toXmlJs()]));
        }

        if (this._bounds && bounds) {
            xmlRespTag.bounds = bounds.data;
        }

        let xml = js2xml(xmlResponse, {
            compact: true,
            spaces: 1,
            attributesFn: (attributes) => {
                return Object.entries(attributes)
                    .map(([key, value]) => ([
                        key,
                        typeof value === 'string'
                            ? value.replace(/&amp;/g, '&').replace(/&/g, '&amp;')
                            : value,
                    ]))
                    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
            },
        });
        return xml;
    }

}