const GoogleProjection = require('jsfreemaplib').GoogleProjection;

module.exports = AFRAME.registerComponent('osm3d', {
    schema: {
        url: {
            type: 'string'
        },
    },

    init: function() {
        this.el.addEventListener('terrarium-dem-loaded', async(e)=> {
            const data = await this.loadAndApplyDem(this.data.url, e.detail.demData);
            this.el.emit('osm-data-loaded', {
                objectIds: data.newObjectIds,
                pois: data.pois
            });
        });
    },

    loadAndApplyDem: async function(url, demData) {
        this.newObjectIds = [];
        const pois = [];
        for(let i=0; i<demData.length; i++) {
            const osmDataJson = await this.system.loadData(url, demData[i].tile);
            if(osmDataJson != null) {
                const features = await this._applyDem(osmDataJson, demData[i]);
                pois.push(...features.pois);
            }
        }

        return {
            newObjectIds: this.newObjectIds,
            pois: pois
        }; 
    },

    _applyDem: async function(osmDataJson, dem) {
        const features = await this.system.loadOsm(osmDataJson,`${dem.tile.z}/${dem.tile.x}/${dem.tile.y}`, dem.dem);
        features.ways.forEach ( f=> {
            const mesh = new THREE.Mesh(f.geometry, new THREE.MeshBasicMaterial ( { color: f.properties.color } ));
            this.el.setObject3D(f.properties.id, mesh);
            this.newObjectIds.push(f.properties.id);
        });
        return features;
    }
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
    },

    loadOsm: async function(osmDataJson, tileid, dem=null) {
		console.log('osmDataJson');
		console.log(osmDataJson);
        const features = { ways: [], pois: [] };
        osmDataJson.features.forEach  ( (f,i)=> {
            const line = [];
            if(f.geometry.type=='LineString' && f.geometry.coordinates.length >= 2) {
                f.geometry.coordinates.forEach (coord=> {
            
                    const h = dem? dem.getHeight(coord[0], coord[1]) : 0;
                    if (h >= 0) {
                        line.push([coord[0], h, -coord[1]]);
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
                }
            } else if(f.geometry.type == 'Point') {
                const h = dem ? dem.getHeight(f.geometry.coordinates[0], f.geometry.coordinates[1]) : 0;
                if(h >= 0) {
                    const lonLat = this.sphMerc.unproject(f.geometry.coordinates); 
                    features.pois.push({
                        geometry: [
                            f.geometry.coordinates[0],
                            h,
                            f.geometry.coordinates[1]
                        ],
                        properties: Object.assign({}, f.properties)
                    });    
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
        realVertices.push( vertices[k][0] + dxperp);
        realVertices.push(vertices[k][1]);
        realVertices.push( vertices[k][2] + dzperp);

    
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

