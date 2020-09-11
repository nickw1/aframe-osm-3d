aframe-osm-3d
=============

Two A-Frame components for working with 3D OpenStreetMap data.

`terrarium-dem` will download DEM data in Terrarium PNG format from the
given URL. When a DEM XYZ tile is downloaded, a `terrarium-dem-loaded` event 
will be emitted, containing in its `detail`:

- `tile`: a `Tile` object from [jsfreemaplib](https://gitlab.com/nickw1/jsfreemaplib). 
- `demData`: a nine-member array containing the DEM data itself for this tile *and for the eight surrounding tiles*. This is a `DEM` object from [jsfreemaplib](https://gitlab.com/nickw1/jsfreemaplib).

`osm3d` will generate rendered 3D polyline meshes of OSM ways, as well as raw
OSM way and POI data with elevation added, using the data emitted from the
`terrarium-dem` component (as described above), or anywhere else. It emits
an `osm-data-loaded` event on completion, containing:

- `renderedWays`: an array of rendered OSM ways as meshes, represented as world
coordinates based on Spherical Mercator but with the sign of `z` reversed to
fit in with the WebGL coordinate system.

- `pois`: an array of POI features in GeoJSON feature format, i.e. with
`geometry` and `properties`. As no rendered object is created, the coordinates
are in unprojected, WGS84 lon/lat.

- `rawData`: only emitted if the `emitRawData` is true (false by default).
Contains all raw data downloaded from the API in GeoJSOn format and in WGS84 (no rendered meshes), for *not just the current tile but the eight surrounding*. This is useful, for instance, in route-finding applications. It's used by the
[Hikar web app](https://github.com/nickw1/hikar.js) 


jsfreemaplib versions compatibility
-----------------------------------

Note that `aframe-osm-3d` depends on [jsfreemaplib](https://gitlab.com/nickw1/jsfreemaplib). Matching versions must be used:

- `aframe-osm-3d` version 0.1.x requires `jsfreemaplib` version 0.2.x.
- `aframe-osm-3d` version 0.2.x - 0.4.x requires `jsfreemaplib` version 0.3.x.


CHANGES version 0.4.0
---------------------

`osm3d` now assumes that the GeoJSON API will provide data in WGS84 lon/lat,
for better standards compliance. Does the projection to Spherical Mercator
internally.

Also, now only the rendered way meshes are projected into Spherical Mercator.
The POIs, *and* the raw data, are both now in WGS84 lon/lat.

CHANGES version 0.3.0
---------------------

The `osm-data-loaded` now emits the actual rendered way meshes in the
`renderedWays` property of the event (rather than the way IDs). This is 
rather cleaner. Do note that this is a breaking change and you will need to
update your `osm-data-loaded` event handler accordingly.
