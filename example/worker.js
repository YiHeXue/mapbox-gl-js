importScripts("./contour/zlib.js");
importScripts("./contour/png.js");
importScripts("./contour/pbf.js");
importScripts("./contour/vtpbf.js");
importScripts("./contour/heighttile.js");
importScripts("./contour/isolines.js");
importScripts("./contour/demmanager.js");
importScripts("./contour/processor.js");

var processor = new Processor();

self.onmessage = async function(event) {
	var message = event.data;
	await processor.process(message);
}
