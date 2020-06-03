all:
	cat terrarium-dem.js osm3d.js demtiler.js | browserify - > aframe-osm-3d.js
