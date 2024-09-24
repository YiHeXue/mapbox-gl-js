/**
 * Caches, decodes, and processes raster tiles in the current thread.
 */
class LocalDemManager {
    constructor() {
        this.demUrlPattern = "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png";
        this.maxzoom = 13;
        this.tileMap = {};
    }

    decodeParsedImage(width, height, encoding, input) {
        const decoder = encoding === "mapbox"
            ? (r, g, b) => -10000 + (r * 256 * 256 + g * 256 + b) * 0.1
            : (r, g, b) => r * 256 + g + b / 256 - 32768;
        const data = new Float32Array(width * height);
        for (let i = 0; i < input.length; i += 4) {
            data[i / 4] = decoder(input[i], input[i + 1], input[i + 2]);
        }
        return { width, height, data };
    }

    async fetchAndParseTile(z, x, y) {
        const url = this.demUrlPattern
            .replace("{z}", z.toString())
            .replace("{x}", x.toString())
            .replace("{y}", y.toString());

        var tile = this.tileMap[url];
        if (tile == null) {
            var request = new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.responseType = "arraybuffer";
                xhr.onload = function() {
                    var response = null;
                    if (this.status === 200) {
                        response = new Uint8Array(this.response);
                    }
                    resolve(response);
                }
                xhr.open("GET", url, true);
                xhr.send(null);
            });
            const response = await request;
            if (response != null) {
                let image = new PNG(response);
                if (image != null) {
                    var pixels3 = image.decodePixels();

                    var pixels = [];
                    for (let i = 0; i < pixels3.length / 3; i++) {
                        pixels[4 * i + 0] = pixels3[3 * i + 0];
                        pixels[4 * i + 1] = pixels3[3 * i + 1];
                        pixels[4 * i + 2] = pixels3[3 * i + 2];
                        pixels[4 * i + 3] = 255;
                    }

                    tile = this.decodeParsedImage(image.width, image.height, "1343", pixels);
                    this.tileMap[url] = tile;
                }
            }
        }
        return tile;
    }

    async fetchDem(z, x, y, options) {
        const zoom = Math.min(z - (options.overzoom || 0), this.maxzoom);
        const subZ = z - zoom;
        const div = 1 << subZ;
        const newX = Math.floor(x / div);
        const newY = Math.floor(y / div);
        const tile = await this.fetchAndParseTile(zoom, newX, newY);
        return HeightTile.fromRawDem(tile).split(subZ, x % div, y % div);
    }
    async fetchContourTile(z, x, y) {

        const options = {
            contourLayer : "contours",
            elevationKey : "ele",
            levelKey : "level",
            levels : [100, 500],
            multiplier : 3.28084};

        const { levels,
            multiplier = 1,
            buffer = 1,
            extent = 4096,
            contourLayer = "contours",
            elevationKey = "ele",
            levelKey = "level",
            subsampleBelow = 100,
        } = options;
        // no levels means less than min zoom with levels specified
        if (!levels || levels.length === 0) {
            return Promise.resolve({ arrayBuffer: new ArrayBuffer(0) });
        }

        const max = 1 << z;
        const neighborPromises = [];
        for (let iy = y - 1; iy <= y + 1; iy++) {
            for (let ix = x - 1; ix <= x + 1; ix++) {
                neighborPromises.push(iy < 0 || iy >= max
                    ? undefined
                    : this.fetchDem(z, (ix + max) % max, iy, options));
            }
        }
        const neighbors = await Promise.all(neighborPromises);
        let virtualTile = HeightTile.combineNeighbors(neighbors);
        if (!virtualTile) {
            return { arrayBuffer: new Uint8Array().buffer };
        }
        if (virtualTile.width >= subsampleBelow) {
            virtualTile = virtualTile.materialize(2);
        }
        else {
            while (virtualTile.width < subsampleBelow) {
                virtualTile = virtualTile.subsamplePixelCenters(2).materialize(2);
            }
        }
        virtualTile = virtualTile
            .averagePixelCentersToGrid()
            .scaleElevation(multiplier)
            .materialize(1);
        const isolines = generateIsolines(levels[0], virtualTile, extent, buffer);
        const result = encodeVectorTile({
            extent,
            layers: {
                [contourLayer]: {
                    features: Object.entries(isolines).map(([eleString, geom]) => {
                        const ele = Number(eleString);
                        return {
                            type: GeomType.LINESTRING,
                            geometry: geom,
                            properties: {
                                [elevationKey]: ele,
                                [levelKey]: Math.max(...levels.map((l, i) => (ele % l === 0 ? i : 0))),
                            },
                        };
                    }),
                },
            },
        });
        return result.buffer;
    }
}

