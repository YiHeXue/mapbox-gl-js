
function Processor() {

}

Object.assign(Processor.prototype, {

	process: async function (message) {
        if (message.fid == "processContour") {
            await this.processContour(message);
        }
	},

    processContour: async function (message) {
        var url = message.url;
        var key = message.key;

        var manager = new LocalDemManager();
        var arrayBuffer = await manager.fetchContourTile(key.z, key.x, key.y);

        var transferableObjects = [];
        transferableObjects.push(arrayBuffer);
        postMessage({result: message, buffer: transferableObjects}, transferableObjects);

        // var url = "https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}?access_token=MLY|4142433049200173|72206abe5035850d6743b23a49c41333";
        // url = url.replace(/{z}/, key.z.toString());
        // url = url.replace(/{y}/, key.y.toString());
        // url = url.replace(/{x}/, key.x.toString());
        //
        // var _this = this;
        // var xhr = new XMLHttpRequest();
        // xhr.responseType = "arraybuffer";
        // xhr.onload = function() {
        //     var response = null;
        //     if (this.status === 200) {
        //         response = this.response;
        //     }
        //     var transferableObjects = [];
        //     if (response != null) {
        //         transferableObjects.push(response);
        //     }
        //     postMessage({result: message, buffer: transferableObjects}, transferableObjects);
        // }
        // xhr.open("GET", url, true);
        // xhr.send(null);
    },

} );

