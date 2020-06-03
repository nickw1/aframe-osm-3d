aframe-osm-3d
=============

Two A-Frame components for working with 3D OpenStreetMap data.

`terrarium-dem` will download DEM data in Terrarium PNG format from the
given URL.

`osm3d` will generate OSM 3D vector data, using data sent from the
`terrarium-dem` component, or anywhere else.

Installation instructions
-------------------------

Dependencies needed from NPM:
* `pngjs`
* `jsfreemaplib`

Use 

`npm install pngjs jsfreemaplib` 

to install the dependencies and then

`make`

to make a browserified bundle, `aframe-osm-3d.js`, which can then be included 
in your project.
