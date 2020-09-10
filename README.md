aframe-osm-3d
=============

Two A-Frame components for working with 3D OpenStreetMap data.

`terrarium-dem` will download DEM data in Terrarium PNG format from the
given URL.

`osm3d` will generate OSM 3D vector data, using data sent from the
`terrarium-dem` component, or anywhere else.

jsfreemaplib versions compatibility
-----------------------------------

Note that `aframe-osm-3d` depends on [jsfreemaplib](https://gitlab.com/nickw1/jsfreemaplib). Matching versions must be used:

- `aframe-osm-3d` version 0.1.x requires `jsfreemaplib` version 0.2.x.
- `aframe-osm-3d` version 0.2.x or 0.3.x requires `jsfreemaplib` version 0.3.x.

CHANGES version 0.3.x
---------------------

The `osm-data-loaded` now emits the actual rendered way meshes in the
`renderedWays` property of the event (rather than the way IDs). This is 
rather cleaner. Do note that this is a breaking change and you will need to
update your `osm-data-loaded` event handler accordingly.
