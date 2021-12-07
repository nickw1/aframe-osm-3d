const GoogleProjection = require('jsfreemaplib').GoogleProjection;

module.exports = AFRAME.registerComponent('osm3d', {
    schema: {
        url: {
            type: 'string'
        },
        emitRawData: {
            type: 'boolean'
        },
        renderRoads: {
            type: 'boolean',
            default: true
        }
    },

    init: function() {
        this.el.addEventListener('terrarium-dem-loaded', async(e)=> {
            const data = await this.loadAndApplyDem(this.data.url, e.detail.demData);
            this.system.tile = {
                x: e.detail.tile.x,
                y: e.detail.tile.y
            };

            this.el.emit('osm-data-loaded', {
                renderedWays: data.renderedWays,
                pois: data.pois,
                rawData: this.data.emitRawData ? this.getCurrentRawData() : null
            });
        });
    },

    loadAndApplyDem: async function(url, demData) {
        const pois = [], renderedWays = [];
        let key;

        for(let i=0; i<demData.length; i++) {
            const osmDataJson = await this.system.loadData(url, demData[i].tile);
            if(osmDataJson != null) {
                this.system.z = demData[i].tile.z; // assume zoom never changes
                key = `${demData[i].tile.z}/${demData[i].tile.x}/${demData[i].tile.y}`;
                const features = await this._applyDem(osmDataJson, demData[i]);
                pois.push(...features.pois);
                renderedWays.push(...features.renderedWays);
                this.system.rawData[key] = {
                    ways : features.rawWays,
                    pois : features.pois
                };
            }
        }

        return {
            renderedWays: renderedWays,
            pois: pois
        }; 
    },

    _applyDem: async function(osmDataJson, dem) {
        const features = await this.system.loadOsm(osmDataJson,`${dem.tile.z}/${dem.tile.x}/${dem.tile.y}`, dem.dem), renderedWays = [];
        let id;
        features.ways.forEach ( f=> {
            const mesh = new THREE.Mesh(f.geometry, new THREE.MeshBasicMaterial ( { color: f.properties.color } ));
            if(this.data.renderRoads == true) {
                this.el.setObject3D(f.properties.id, mesh);
            }
            renderedWays.push(mesh);
        } );
        return {
            renderedWays: renderedWays,
            rawWays: features.rawWays,
            pois: features.pois
        };
    },

    getCurrentRawData: function(lon, lat) {
        if(this.system.tile) {

            const data = {
                ways: [],
                pois: []    
            };

            let key, loadedTiles = []; 
            for(let x = this.system.tile.x - 1; x <= this.system.tile.x + 1; x++) {
                for(let y = this.system.tile.y - 1; y <= this.system.tile.y + 1; y++) {
                    key = `${this.system.z}/${x}/${y}`;
                    if(this.system.rawData[key]) {
                        loadedTiles.push(this.system.rawData[key]);
                    }
                }
            }


            loadedTiles.forEach (tile => {
                console.log('Adding data for tile');
                data.ways.push(...tile.ways);
                data.pois.push(...tile.pois);
            });
    
            return data;
        }
        return null;
    },
});

////////////////////////////////////////////////////////////////////////////////

AFRAME.registerSystem('osm3d', {

    init: function() {
        this.tilesLoaded = [];
        this.drawProps = { 'footway' : {  color:'#00ff00' },
            'path' : {  color: '#00ff00'},
            'steps' : { color: '#00ff00' },
            'bridleway' : {  color: '#ffc000'},
            'byway' : { color: '#ff0000' },
            'track' :  { color: '#ff8080' },
            'cycleway' : { color: '#0000ff' },
            'residential' : { },
            'unclassified' : { },
            'tertiary' :  {  },
            'secondary' : { },
            'primary' : { },
            'trunk' : { },
            'motorway' : { }
        };
        this.sphMerc = new GoogleProjection();
        this.rawData = {
            ways: { },
            pois: { }
        };
    },

    loadOsm: async function(osmDataJson, tileid, dem=null) {
        const features = { ways: [], pois: [], rawWays: [] };
        osmDataJson.features.forEach  ( (f,i)=> {
            const line = [];
            if(f.geometry.type=='LineString' && f.geometry.coordinates.length >= 2) {
                f.geometry.coordinates.forEach (coord=> {
                    const projCoord = this.sphMerc.project(coord[0], coord[1]);
                    const h = dem ? dem.getHeight(projCoord[0], projCoord[1]) : 0;
                    coord[2] = h; // raw geojson will contain elevations
                    if (h > Number.NEGATIVE_INFINITY) {
                        line.push([projCoord[0], h, -projCoord[1]]);
                    }
               });
                    
                
                if(line.length >= 2) {
                    const g = this._makeWayGeom(line, 
                        (this.drawProps[f.properties.highway] ? 
                            (this.drawProps[f.properties.highway].width || 5) :
                         5));

                   const color = this.drawProps[f.properties.highway] ?
                    (this.drawProps[f.properties.highway].color||'#ffffff'):
                    '#ffffff';
                   features.ways.push({
                       geometry: g, 
                       properties: {
                           id: `${tileid}:${f.properties.osm_id}`,
                           color: color
                       }
                   }); 
                   features.rawWays.push(f);
                }
            } else if(f.geometry.type == 'Point') {
                const projCoord = this.sphMerc.project(f.geometry.coordinates[0], f.geometry.coordinates[1]);
                const h = dem ? dem.getHeight(projCoord[0], projCoord[1]) : 0;
                if(h > Number.NEGATIVE_INFINITY) {
                    f.geometry.coordinates[2] = h;
                    features.pois.push(f);
                }
            }  
        }); 
        return features;
    },

    loadData: async function(url, tile) {
        const tileIndex = `${tile.z}/${tile.x}/${tile.y}`;
        if(this.tilesLoaded.indexOf(tileIndex) == -1) {
            const realUrl = url.replace('{x}', tile.x)
                                .replace('{y}', tile.y)
                                .replace('{z}', tile.z);
            const response = await fetch(realUrl);
            const osmDataJson = await response.json();
            this.tilesLoaded.push(tileIndex);
            return osmDataJson;
        }
        return null;
    },


    _makeWayGeom(vertices, width=1) {
        const faces = [];
        let dx, dz, len, dxperp, dzperp, nextVtxProvisional=[], thisVtxProvisional;
        const k = vertices.length-1;
        const realVertices = [];
        for(let i=0; i<k; i++) {
            dx = vertices[i+1][0] - vertices[i][0];
            dz = vertices[i+1][2] - vertices[i][2];
            dy = vertices[i+1][1] - vertices[i][1];
            len = Math.sqrt(dx*dx + dy*dy + dz*dz);
            dxperp = -(dz * (width/2)) / len;
            dzperp = dx * (width/2) / len;
            thisVtxProvisional = [
                vertices[i][0]-dxperp,
                vertices[i][1],
                vertices[i][2]-dzperp,
                vertices[i][0]+dxperp,
                vertices[i][1],
                vertices[i][2]+dzperp,
            ];
            if(i > 0) {
                // Ensure the vertex positions are influenced not just by this 
                // segment but also the previous segment
                thisVtxProvisional.forEach ((vtx,j)=> {
                    vtx = (vtx + nextVtxProvisional[j]) / 2;
                });
            }
            realVertices.push(...thisVtxProvisional);
            nextVtxProvisional = [
                vertices[i+1][0]-dxperp,
                vertices[i+1][1],
                vertices[i+1][2]-dzperp,
                vertices[i+1][0]+dxperp,
                vertices[i+1][1],
                vertices[i+1][2]+dzperp,
            ];
        }
        realVertices.push(vertices[k][0] - dxperp);
        realVertices.push(vertices[k][1]);
        realVertices.push(vertices[k][2] - dzperp);
        realVertices.push(vertices[k][0] + dxperp);
        realVertices.push(vertices[k][1]);
        realVertices.push(vertices[k][2] + dzperp);

    
        let indices = [];
        for(let i=0; i<k; i++)     {
            indices.push(i*2, i*2+1, i*2+2);
            indices.push(i*2+1, i*2+3, i*2+2);
        }

        let geom = new THREE.BufferGeometry();
        let bufVertices = new Float32Array(realVertices);
        geom.setIndex(indices);
        geom.setAttribute('position', new THREE.BufferAttribute(bufVertices,3));
        geom.computeBoundingBox();
        return geom;
    }

});

