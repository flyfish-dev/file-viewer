# Draw.io / diagrams.net offline viewer assets

Source: https://github.com/jgraph/drawio
Version: v30.2.5
Commit: 7976c02e1b10b1687c028d82782f9f5d90a885d6
License: Apache-2.0, with the upstream icon/stencil restrictions documented by
the draw.io project.

Included paths from `src/main/webapp`:

- `js/viewer-static.min.js` -> `viewer-static.min.js`
- `styles/`
- `shapes/`
- `stencils/`
- `img/`
- `mxgraph/`
- `math4/es5/`

The viewer script contains public diagrams.net defaults for secondary assets.
File Viewer sets those globals before loading the script so enterprise and
offline deployments resolve every viewer asset from local `vendor/drawio/`.

The upstream file also contains diagrams.net's public Dropbox OAuth client
identifier. It is not a Dropbox access token or client secret. Secret scanning
therefore allowlists only the `dropbox-api-token` rule on this exact pinned file
and its deterministic tracked copies; every other rule and path remains active.
