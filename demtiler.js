const Tiler = require('jsfreemaplib').Tiler;
const PNG = require('pngjs').PNG;

class DemTiler extends Tiler {

    constructor(url) {
        super(url);
    }

    async readTile(url) {
        return new Promise ( (resolve, reject) => {
            const arrbuf = fetch(url).then(res => res.arrayBuffer()).then
                (arrbuf => {
                    const png = new PNG();
                
                    png.parse(arrbuf, (err, data) => {
                        if(err) reject(err);
                        let i;
                        const elevs = [];
                        for(let y = 0; y < png.height; y++) {
                            for(let x = 0; x < png.width; x++) {
                                i = (y * png.width + x) << 2;
                                elevs.push(Math.round((png.data[i] * 256 + png.data[i+1] + png.data[i+2] / 256) - 32768));
                            }
                        }
                        resolve( { w: png.width,
                                   h: png.height,
                                   elevs: elevs } );

                    });
                });
            }); 
    }
}

module.exports = DemTiler;
