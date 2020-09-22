const Tile = require('jsfreemaplib').Tile;
const DEM = require('jsfreemaplib').DEM;
const DemTiler = require('jsfreemaplib/demtiler');
const GoogleProjection = require('jsfreemaplib').GoogleProjection;

module.exports = AFRAME.registerComponent ('terrarium-dem', {

    schema: {
        url: {
            type: 'string'
        },
        zoom: {
            type:'int'
        },
        lat: {
            type: 'number',
            default: 181
        },
        lon: {
            type: 'number',
            default: 91
        },
        color: {
            type: 'color',
            default: '#00c000'
        },
        opacity: {
            type: 'number',
            default: 1.0
        },
        render: {
            type: 'boolean',
            default: false
        }
    },

    init: function() {
        this.system.initTiler(this.data.url, this.data.zoom);
        this.system.initRenderProps({ 
            render: this.data.render, 
            color: this.data.color, 
            opacity: this.data.opacity
        });
    },

    update: function() {
        this._setPosition();
    },

     _setPosition: async function() {

         if(this.data.lon >= -180 && this.data.lon <= 180 && this.data.lat >= -90 && this.data.lat <= 90) {
            const tile = this.system.tiler.sphMerc.getTileFromLonLat(this.data.lon, this.data.lat, this.data.zoom);
             if(tile.x != this.system.curTile.x || tile.y != this.system.curTile.y) {
                 this.el.emit('terrarium-start-update');

                 const demData = await this.system.updateLonLat(this.data.lon, this.data.lat);
                 this.el.emit('terrarium-dem-loaded', { 
                     demData: demData,
                     lat: this.data.lat,
                     lon: this.data.lon,
                     tile: tile
                 }); 

                 this.system.curTile = {
                     x: tile.x,
                     y: tile.y
                 };
            }

             const sphMercPos = this.system.tiler.lonLatToSphMerc(this.data.lon, this.data.lat, this.data.zoom);
             this.el.emit('elevation-available', {
                elevation: this.system._getElevationFromSphMerc(sphMercPos, this.data.zoom)
            });
        }
    }
});


////////////////////////////////////////////////////////////////////////////////


AFRAME.registerSystem('terrarium-dem', {
    init: function() {
        this.tilesLoaded = [];
        this.tiler = new DemTiler();
        this.render = false;
        this.curTile = { x: -1, y: -1 };
    },

    initTiler: function(url, zoom) {
        this.tiler.url = url;
        this.tiler.setZoom(zoom);
    },    

    initRenderProps: function(renderProps) {
        this.render = renderProps.render;
        this.color = renderProps.color;
        this.opacity = renderProps.opacity;
    },    

    updateLonLat: async function(lon, lat) {
         const sphMerc = this.tiler.lonLatToSphMerc(lon,lat);
         return await this._updateSphMerc(sphMerc);
     },

    _updateSphMerc: async function(sphMerc) {
         const dems = [];
         const newData = await this.tiler.update(sphMerc);
         newData.forEach ( data=> { 
             const dem = this._loadTerrariumData(data);
               if(dem != null) {
                   dems.push(dem);
               }
           });     
           return dems;
    },

    _loadTerrariumData: function(data) {
         let demData = null;    
         if(data !== null) {
             const geom = this._createDemGeometry(data);
             geom.computeFaceNormals();
             geom.computeVertexNormals();
             if(this.render === true) {
                const mesh = new THREE.Mesh(geom, new THREE.MeshLambertMaterial({
                    color: this.color,
                    opacity: this.opacity,
                    transparent: this.opacity < 1.0
                }));
                const demEl = document.createElement("a-entity");
                demEl.setObject3D('mesh', mesh);
                this.el.appendChild(demEl);
             }
             const dem = data.data;
             demData = { dem: dem, tile: data.tile };
         }
         return demData;
    },

    _createDemGeometry: function(data) {
         const dem = data.data;
         const topRight = data.tile.getTopRight();
         const bottomLeft = dem.bottomLeft;
         const centre = [(topRight[0] + bottomLeft[0]) / 2, 
               (topRight[1] + bottomLeft[1]) /2];
         const xSpacing = data.xSpacing;
         const ySpacing = data.ySpacing;
         const geom = new THREE.PlaneBufferGeometry(topRight[0] - bottomLeft[0], topRight[1] - bottomLeft[1], dem.ptWidth - 1,  dem.ptHeight - 1);
         const array = geom.getAttribute("position").array;
         let i;
         for (let row=0; row<dem.ptHeight; row++) {
             for(let col=0; col<dem.ptWidth; col++) {
                i = row*dem.ptWidth + col;
                 array[i*3+2] = -(centre[1] + array[i*3+1]); 
                 array[i*3+1] = dem.elevs[i];
                 array[i*3] += centre[0];
             }        
         }

         return geom; 
     },

     _getElevationFromSphMerc: function(sphMercPos, z) {    
         const tile = this.tiler.getTile(sphMercPos, z);
         if(this.tiler.indexedTiles[`${tile.z}/${tile.x}/${tile.y}`]) {
             const scaled = [ sphMercPos[0], sphMercPos[1]  ];
             return this.tiler.indexedTiles[`${tile.z}/${tile.x}/${tile.y}`].getHeight (scaled[0], scaled[1]);
         }
         return -1;
     }
});
