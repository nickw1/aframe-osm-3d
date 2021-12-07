aframe-osm-3d
=============

Two A-Frame components for working with 3D OpenStreetMap data.

terrarium-dem
-------------

`terrarium-dem` will download DEM data in Terrarium PNG format from a 
given URL, and optionally render it as a terrain mesh. It accepts the following
properties:
- `url` : The URL which provides the Terrarium DEM data. May contain \{x\}, \{y\} and \{z\} placeholders.
- `zoom` : The (XYZ) zoom to use, defining the tiling system.
- `lat` : the latitude to download.
- `lon` : the longitude to download.
- `render` : do we render the DEM as a 3D mesh? (boolean). If not, only the
raw elevation data will be emitted, which can the be used by other components,
such as `osm3d` (below), to add elevation to geodata.
- `color` and `opacity` : define the material properties of the mesh. Note
that the Lambert material is used for the mesh; in tests this has given the
best result.

 When the DEM data is downloaded, a `terrarium-dem-loaded` event 
will be emitted, containing in its `detail`:

- `tile`: a `Tile` object from [jsfreemaplib](https://gitlab.com/nickw1/jsfreemaplib). 
- `demData`: a nine-member array containing the DEM data itself for this tile *and for the eight surrounding tiles*. This is a `DEM` object from [jsfreemaplib](https://gitlab.com/nickw1/jsfreemaplib).

In addition, a `terrarium-start-update` event will be emitted as soon as the
data download begins, which can be used, for example, to display a status
message elsewhere in the application. (Note that data for a given longitude and
latitude will not be downloaded if that DEM tile has already been downloaded)

osm3d
-----

`osm3d` will generate rendered 3D polyline meshes of OSM ways, as well as raw
OSM way and POI data with elevation added, using the data emitted from the
`terrarium-dem` component (as described above), or anywhere else. It takes
two properties:
- `url` : the URL to download the OSM data from. May contain \{x\}, \{y\} and \{z\} placeholders.
- `emitRawData` : do we emit raw data? (boolean, see below).

It emits an `osm-data-loaded` event on completion, containing:

- `renderedWays`: an array of rendered OSM ways as meshes, represented as world
coordinates based on Spherical Mercator but with the sign of `z` reversed to
fit in with the WebGL coordinate system.

- `pois`: an array of POI features in GeoJSON feature format, i.e. with
`geometry` and `properties`. As no rendered object is created, the coordinates
are in unprojected, WGS84 lon/lat.

- `rawData`: only emitted if the `emitRawData` is true (false by default).
Contains all raw data downloaded from the API in GeoJSON format and in WGS84 (no rendered meshes), for *not just the current tile but the eight surrounding*. This is useful, for instance, in route-finding applications. It's used by the
[Hikar web app](https://github.com/nickw1/hikar.js) 


By default, `osm3d` will respond to a `terrarium-dem-loaded` event and 
calculate elevations of the OSM data using the DEM data within the event.
So `osm3d` works well with `terrarium-dem`, though you can, if you wish,
use `osm3d` with your own DEM provider, as long as it emits a 
`terrarium-dem-loaded` event.

jsfreemaplib versions compatibility
-----------------------------------

Note that `aframe-osm-3d` depends on [jsfreemaplib](https://gitlab.com/nickw1/jsfreemaplib). Matching versions must be used:

- `aframe-osm-3d` version 0.1.x requires `jsfreemaplib` version 0.2.x.
- `aframe-osm-3d` version 0.2.x - 0.4.x require `jsfreemaplib` version 0.3.x.
- `aframe-osm-3d` version 0.5.x requires `jsfreemaplib` version 0.4.x.

CHANGES version 0.5.2
---------------------

`renderRoads` property (`true` by default) can be set to `false` if you do not want roads to be rendered automatically.

CHANGES version 0.5.0
---------------------

- Use near-standard GeoJSON format for `pois` emitted from `osm3d`, i.e. with a
`geometry` property containing `coordinates`. The elevation is included in
the `coordinates` array now as the *third member*, not the second.

- Allow for below-sea-level elevations, using changes in `jsfreemaplib` 0.4.x.

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
