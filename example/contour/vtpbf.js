/*
Adapted from vt-pbf https://github.com/mapbox/vt-pbf

The MIT License (MIT)

Copyright (c) 2015 Anand Thakker

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var GeomType;
(function (GeomType) {
    GeomType[GeomType["UNKNOWN"] = 0] = "UNKNOWN";
    GeomType[GeomType["POINT"] = 1] = "POINT";
    GeomType[GeomType["LINESTRING"] = 2] = "LINESTRING";
    GeomType[GeomType["POLYGON"] = 3] = "POLYGON";
})(GeomType || (GeomType = {}));
/**
 * Enodes and serializes a mapbox vector tile as an array of bytes.
 */
function encodeVectorTile(tile) {
    const pbf = new Pbf();
    for (const id in tile.layers) {
        const layer = tile.layers[id];
        if (!layer.extent) {
            layer.extent = tile.extent;
        }
        pbf.writeMessage(3, writeLayer, Object.assign(Object.assign({}, layer), { id }));
    }
    return pbf.finish();
}
function writeLayer(layer, pbf) {
    if (!pbf)
        throw new Error("pbf undefined");
    pbf.writeVarintField(15, 2);
    pbf.writeStringField(1, layer.id || "");
    pbf.writeVarintField(5, layer.extent || 4096);
    const context = {
        keys: [],
        values: [],
        keycache: {},
        valuecache: {},
    };
    for (const feature of layer.features) {
        context.feature = feature;
        pbf.writeMessage(2, writeFeature, context);
    }
    for (const key of context.keys) {
        pbf.writeStringField(3, key);
    }
    for (const value of context.values) {
        pbf.writeMessage(4, writeValue, value);
    }
}
function writeFeature(context, pbf) {
    const feature = context.feature;
    if (!feature || !pbf)
        throw new Error();
    pbf.writeMessage(2, writeProperties, context);
    pbf.writeVarintField(3, feature.type);
    pbf.writeMessage(4, writeGeometry, feature);
}
function writeProperties(context, pbf) {
    const feature = context.feature;
    if (!feature || !pbf)
        throw new Error();
    const keys = context.keys;
    const values = context.values;
    const keycache = context.keycache;
    const valuecache = context.valuecache;
    for (const key in feature.properties) {
        let value = feature.properties[key];
        let keyIndex = keycache[key];
        if (value === null)
            continue; // don't encode null value properties
        if (typeof keyIndex === "undefined") {
            keys.push(key);
            keyIndex = keys.length - 1;
            keycache[key] = keyIndex;
        }
        pbf.writeVarint(keyIndex);
        const type = typeof value;
        if (type !== "string" && type !== "boolean" && type !== "number") {
            value = JSON.stringify(value);
        }
        const valueKey = `${type}:${value}`;
        let valueIndex = valuecache[valueKey];
        if (typeof valueIndex === "undefined") {
            values.push(value);
            valueIndex = values.length - 1;
            valuecache[valueKey] = valueIndex;
        }
        pbf.writeVarint(valueIndex);
    }
}
function command(cmd, length) {
    return (length << 3) + (cmd & 0x7);
}
function zigzag(num) {
    return (num << 1) ^ (num >> 31);
}
function writeGeometry(feature, pbf) {
    if (!pbf)
        throw new Error();
    const geometry = feature.geometry;
    const type = feature.type;
    let x = 0;
    let y = 0;
    for (const ring of geometry) {
        let count = 1;
        if (type === GeomType.POINT) {
            count = ring.length / 2;
        }
        pbf.writeVarint(command(1, count)); // moveto
        // do not write polygon closing path as lineto
        const length = ring.length / 2;
        const lineCount = type === GeomType.POLYGON ? length - 1 : length;
        for (let i = 0; i < lineCount; i++) {
            if (i === 1 && type !== 1) {
                pbf.writeVarint(command(2, lineCount - 1)); // lineto
            }
            const dx = ring[i * 2] - x;
            const dy = ring[i * 2 + 1] - y;
            pbf.writeVarint(zigzag(dx));
            pbf.writeVarint(zigzag(dy));
            x += dx;
            y += dy;
        }
        if (type === GeomType.POLYGON) {
            pbf.writeVarint(command(7, 1)); // closepath
        }
    }
}
function writeValue(value, pbf) {
    if (!pbf)
        throw new Error();
    if (typeof value === "string") {
        pbf.writeStringField(1, value);
    }
    else if (typeof value === "boolean") {
        pbf.writeBooleanField(7, value);
    }
    else if (typeof value === "number") {
        if (value % 1 !== 0) {
            pbf.writeDoubleField(3, value);
        }
        else if (value < 0) {
            pbf.writeSVarintField(6, value);
        }
        else {
            pbf.writeVarintField(5, value);
        }
    }
}

const perf = typeof performance !== "undefined" ? performance : undefined;
const timeOrigin = perf
    ? perf.timeOrigin || new Date().getTime() - perf.now()
    : new Date().getTime();
function getResourceTiming(url) {
    var _a;
    return JSON.parse(JSON.stringify(((_a = perf === null || perf === void 0 ? void 0 : perf.getEntriesByName) === null || _a === void 0 ? void 0 : _a.call(perf, url)) || []));
}
function now() {
    return perf ? perf.now() : new Date().getTime();
}
function flatten(input) {
    const result = [];
    for (const list of input) {
        result.push(...list);
    }
    return result;
}


