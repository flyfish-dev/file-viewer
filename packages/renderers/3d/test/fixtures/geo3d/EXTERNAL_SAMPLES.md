# External Geo3D validation samples

The committed fixtures in this directory are synthetic and cover deterministic
routing/parser/security regressions. Real compressed point-cloud validation uses
the following public datasets without copying their large Git LFS payloads into
this repository.

## PDAL data — CC BY 4.0

Repository: `PDAL/data`  
License: Creative Commons Attribution 4.0 International  
License source: `https://github.com/PDAL/data/blob/main/LICENSE`

- LAZ:
  `https://github.com/PDAL/data/raw/refs/heads/main/autzen/autzen-classified.laz`
- COPC:
  `https://github.com/PDAL/data/raw/refs/heads/main/autzen/autzen-classified.copc.laz`

The COPC URL is also used by PDAL's own documentation as a remote COPC example.
When these samples are used in browser integration tests, retain PDAL/data
attribution and do not redistribute them under the File Viewer Apache-2.0
license.

## Why these are not vendored

The source repository stores these point clouds through Git LFS. Committing the
small pointer files would create misleading "fixtures" that are not valid LAZ or
COPC datasets. Browser/integration validation should download the real payload
explicitly in an opt-in network test or use an organization-hosted mirror that
preserves the CC BY 4.0 attribution.
