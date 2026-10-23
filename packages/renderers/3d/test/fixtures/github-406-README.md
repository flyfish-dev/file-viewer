# LAS CRS regression fixtures

`github-406-crs-geokeys-only.las` and `github-406-crs-wkt.las` are the
reporter's synthetic LAS 1.2 / point-format 0 pair from
https://github.com/flyfish-dev/file-viewer/issues/406. They contain the same
1,728 points. The GeoKeyDirectory declares EPSG:2177; the matching WKT names
ETRS89 / Poland CS2000 zone 6 without an AUTHORITY code.
The reporter confirms the files contain no personal data and are safe to
redistribute for regression testing.

Original public attachments:
- https://github.com/user-attachments/files/33821696/crs-geokeys-only.las.txt
- https://github.com/user-attachments/files/33821695/crs-wkt.las.txt

The `.txt` suffix was only an attachment transport workaround; these files
have the LASF binary signature. The unrelated real LAZ sample mentioned in
the issue is not included, and these tests do not claim to reproduce its
LAZ decoding or infer its CRS from a citation alone.
