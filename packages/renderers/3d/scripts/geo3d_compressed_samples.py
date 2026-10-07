#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Deterministic LAS/LAZ/COPC fixtures, not a general-purpose COPC converter.

Only the synthetic LAS 1.4 / PDRF 7 grid from generate-geo3d-samples.py is
accepted. lazrs does real LAZ compression; this module writes the COPC 1.0
container, spatial hierarchy and independently addressable chunks.
Specification: https://copc.io/ (info VLR and hierarchy EVLR).
No download, dependency installation or external network access occurs here.
"""
from __future__ import annotations

import io
import math
from pathlib import Path
import struct

import lazrs
import numpy as np

RECORD_SIZE = 36
STREAMING_GRID_SIZE = 24
REQUIRED = ['terrain.laz', 'terrain.copc.laz', 'streaming.copc.laz']


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def vlr(user: bytes, record_id: int, body: bytes) -> bytes:
    return struct.pack('<H16sHH32s', 0, user, record_id, len(body), b'Geo3D fixture') + body


def parse(data: bytes) -> dict:
    require(len(data) >= 375 and data[:4] == b'LASF', 'Invalid LAS signature/header')
    require(data[24:26] == b'\x01\x04', 'Expected LAS 1.4')
    header_size, offset, count = struct.unpack_from('<HII', data, 94)
    require(header_size == 375 and 375 <= offset <= len(data), 'Invalid point-data offset')
    fmt, size = struct.unpack_from('<BH', data, 104)
    require(fmt & 63 == 7 and size == RECORD_SIZE, 'Expected PDRF 7 / 36-byte records')
    records = {}
    cursor = header_size
    order = []
    for _ in range(count):
        require(cursor + 54 <= offset, 'Truncated VLR header')
        _, user, rid, length, _ = struct.unpack_from('<H16sHH32s', data, cursor)
        cursor += 54
        require(cursor + length <= offset, 'Truncated VLR body')
        key = (user.rstrip(b'\0'), rid)
        require(key not in records, 'Duplicate VLR')
        records[key] = data[cursor:cursor + length]
        order.append(key)
        cursor += length
    require(cursor == offset, 'Unexpected padding in synthetic fixture')
    return dict(offset=offset, count=struct.unpack_from('<Q', data, 247)[0],
                compressed=bool(fmt & 128), records=records, order=order,
                scales=np.array(struct.unpack_from('<3d', data, 131)),
                offsets=np.array(struct.unpack_from('<3d', data, 155)))


def points_xyz(raw: bytes, header: dict) -> np.ndarray:
    integer = np.ndarray((len(raw) // RECORD_SIZE, 3), dtype='<i4', buffer=raw,
                         strides=(RECORD_SIZE, 4)).copy()
    return integer * header['scales'] + header['offsets']


def canonical_records(raw: bytes) -> list[bytes]:
    require(len(raw) % RECORD_SIZE == 0, 'Invalid record buffer length')
    return sorted(bytes(raw[i:i + RECORD_SIZE]) for i in range(0, len(raw), RECORD_SIZE))


def write_compressed(source: Path, target: Path, *, copc: bool, depth: int = 2) -> dict:
    data = source.read_bytes()
    header = parse(data)
    require(not header['compressed'], 'Expected uncompressed synthetic source')
    raw = data[header['offset']:]
    require(len(raw) == header['count'] * RECORD_SIZE, 'Source record length mismatch')
    n = math.isqrt(header['count'])
    require(n * n == header['count'] and 2 <= n <= 254, 'Expected a 2..254 square grid')
    require(0 <= depth <= 6, 'Invalid fixture octree depth')
    integers = np.ndarray((header['count'], 2), dtype='<i4', buffer=raw, strides=(RECORD_SIZE, 4))
    indexes = np.arange(header['count'])
    require(bool(np.array_equal(integers[:, 0], (indexes % n) * 100) and
                 np.array_equal(integers[:, 1], (indexes // n) * 100)), 'Not the synthetic grid')
    xyz = points_xyz(raw, header)
    center = (xyz.min(axis=0) + xyz.max(axis=0)) / 2
    half = 2 ** math.ceil(math.log2(float(np.ptp(xyz, axis=0).max()) + .01)) / 2
    keys: dict[tuple[int, int, int, int], list[int]] = {}
    for i, point in enumerate(xyz):
        level = 0
        if copc:
            ix, iy = i % n, i // n
            while level < depth and (ix % (1 << (depth - level)) or iy % (1 << (depth - level))):
                level += 1
        coord = np.floor((point - (center - half)) / (2 * half) * (1 << level)).astype(int)
        key = (level, *map(int, coord)) if copc else (0, 0, 0, 0)
        keys.setdefault(key, []).append(i)
    chunks = [(key, b''.join(raw[i * RECORD_SIZE:(i + 1) * RECORD_SIZE] for i in indexes))
              for key, indexes in sorted(keys.items())]
    codec = lazrs.LazVlr.new_for_compression(7, 0, copc)
    wkt = header['records'][(b'LASF_Projection', 2112)]
    records = ([vlr(b'copc', 1, bytes(160))] if copc else []) + [
        vlr(b'laszip encoded', 22204, codec.record_data()), vlr(b'LASF_Projection', 2112, wkt)]
    prefix = bytearray(data[:375])
    prefix[104] = 7 | 128
    struct.pack_into('<II', prefix, 96, 375 + sum(map(len, records)), len(records))
    struct.pack_into('<QI', prefix, 235, 0, 0)
    stream = io.BytesIO()
    stream.write(prefix)
    for record in records:
        stream.write(record)
    point_offset = stream.tell()
    encoder = lazrs.LasZipCompressor(stream, codec)
    for i, (_, chunk) in enumerate(chunks):
        encoder.compress_many(chunk)
        if i + 1 < len(chunks):
            encoder.finish_current_chunk()
    encoder.done()
    point_end = stream.tell()
    stream.seek(point_offset)
    table = lazrs.read_chunk_table(stream, codec)
    if copc:
        require(len(table) == len(chunks), 'Unexpected LAZ chunk table length')
    stream.seek(point_end)
    if copc:
        entries = {}
        offset = point_offset + 8  # int64 chunk-table offset precedes first chunk
        for (key, chunk), (count, size) in zip(chunks, table):
            require(count == len(chunk) // RECORD_SIZE, 'Chunk count mismatch')
            entries[key] = (offset, size, count)
            offset += size
            parent = key
            while parent[0]:
                parent = (parent[0] - 1, parent[1] // 2, parent[2] // 2, parent[3] // 2)
                entries.setdefault(parent, (0, 0, 0))
        root = (0, 0, 0, 0)
        children = sorted(key for key in entries if key[0] == 1)
        root_size = 32 * (1 + len(children))
        evlr_offset = stream.tell()
        root_offset = evlr_offset + 60
        child_offset = root_offset + root_size
        root_entries = [(root, entries[root])]
        child_pages = []
        for child in children:
            subtree = [(key, val) for key, val in sorted(entries.items()) if key[0] >= 1 and
                       tuple(v >> (key[0] - 1) for v in key[1:]) == child[1:]]
            page = b''.join(struct.pack('<4iQii', *key, *val) for key, val in subtree)
            root_entries.append((child, (child_offset, len(page), -1)))
            child_pages.append(page)
            child_offset += len(page)
        root_page = b''.join(struct.pack('<4iQii', *key, *val) for key, val in root_entries)
        hierarchy = root_page + b''.join(child_pages)
        stream.write(struct.pack('<H16sHQ32s', 0, b'copc', 1000, len(hierarchy), b'COPC hierarchy'))
        stream.write(hierarchy)
        final = bytearray(stream.getvalue())
        gps = [struct.unpack_from('<d', raw, i * RECORD_SIZE + 22)[0] for i in range(header['count'])]
        info = struct.pack('<5dQQ2d11Q', *center, half, float(1 << depth), root_offset, root_size,
                           min(gps), max(gps), *([0] * 11))
        final[429:589] = info
        struct.pack_into('<QI', final, 235, evlr_offset, 1)
    else:
        final = bytearray(stream.getvalue())
    target.write_bytes(final)
    return {'points':header['count'], 'chunks':len(table), 'bytes':len(final)}


def hierarchy(data: bytes) -> dict:
    header = parse(data)
    require(header['compressed'] and header['order'][0] == (b'copc', 1), 'Missing first COPC info VLR')
    info = header['records'][(b'copc', 1)]
    require(len(info) == 160 and info[72:] == bytes(88), 'Invalid COPC info/reserved bytes')
    center_x, center_y, center_z, half, spacing, root_offset, root_size, gps_min, gps_max = struct.unpack_from('<5dQQ2d', info)
    require(half > 0 and spacing > 0 and gps_min <= gps_max, 'Invalid COPC geometry/time')
    evlr_offset, evlr_count = struct.unpack_from('<QI', data, 235)
    require(evlr_count == 1 and header['offset'] < evlr_offset <= len(data) - 60, 'Missing COPC hierarchy EVLR')
    _, user, rid, size, _ = struct.unpack_from('<H16sHQ32s', data, evlr_offset)
    require(user.rstrip(b'\0') == b'copc' and rid == 1000, 'Incorrect hierarchy EVLR')
    low, high = evlr_offset + 60, evlr_offset + 60 + size
    require(high == len(data), 'Hierarchy EVLR length mismatch')
    nodes, pages = {}, set()
    def visit(offset: int, length: int) -> None:
        require((offset, length) not in pages, 'Cyclic/repeated hierarchy page')
        require(low <= offset < offset + length <= high and length % 32 == 0, 'Hierarchy page out of bounds')
        pages.add((offset, length))
        for pos in range(offset, offset + length, 32):
            level, x, y, z, start, size, count = struct.unpack_from('<4iQii', data, pos)
            key = (level, x, y, z)
            require(0 <= level <= 16 and all(0 <= v < 1 << level for v in (x, y, z)), 'Invalid voxel key')
            if count == -1:
                visit(start, size)
            else:
                require(count >= 0 and key not in nodes, 'Invalid or duplicate hierarchy node')
                require((count == 0 and start == size == 0) or
                        (count > 0 and size > 0 and header['offset'] + 8 <= start < start + size <= evlr_offset),
                        'Point chunk out of bounds')
                nodes[key] = (start, size, count)
    visit(root_offset, root_size)
    for key in nodes:
        if key[0]:
            require((key[0] - 1, key[1] // 2, key[2] // 2, key[3] // 2) in nodes, 'Missing parent node')
    require(sum(count for _, _, count in nodes.values()) == header['count'], 'Hierarchy point total mismatch')
    ranges = sorted((start, size, count) for start, size, count in nodes.values() if count)
    for a, b in zip(ranges, ranges[1:]):
        require(a[0] + a[1] == b[0], 'Overlapping/noncontiguous chunks')
    codec = lazrs.LazVlr(header['records'][(b'laszip encoded', 22204)])
    require(codec.uses_variable_size_chunks(), 'COPC must use variable-sized chunks')
    stream = io.BytesIO(data)
    stream.seek(header['offset'])
    table = lazrs.read_chunk_table(stream, codec)
    require(table == [(count, size) for _, size, count in ranges], 'Hierarchy/LAZ table mismatch')
    return dict(header=header, nodes=nodes, pages=pages, center=np.array([center_x, center_y, center_z]),
                half=half, spacing=spacing, root_offset=root_offset, root_size=root_size)


def verify_compressed(path: Path, source: Path) -> dict:
    data, original = path.read_bytes(), source.read_bytes()
    head, source_head = parse(data), parse(original)
    expected = original[source_head['offset']:]
    require(head['compressed'] and head['count'] == source_head['count'], 'Compressed point metadata mismatch')
    require(head['records'][(b'LASF_Projection', 2112)] == source_head['records'][(b'LASF_Projection', 2112)], 'CRS was changed')
    require(data[131:227] == original[131:227], 'Scale/offset/bounds were changed')
    record_data = head['records'][(b'laszip encoded', 22204)]
    stream = io.BytesIO(data)
    stream.seek(head['offset'])
    decoder = lazrs.LasZipDecompressor(stream, record_data)
    decoded = bytearray(head['count'] * RECORD_SIZE)
    decoder.decompress_many(decoded)
    require(canonical_records(decoded) == canonical_records(expected), 'Decoded records differ from source')
    # COPC access is by hierarchy byte ranges, not the generic lazrs seek().
    # lazrs 0.8.2 seek uses point_idx % chunk.point_count for variable chunks;
    # that is not the intra-chunk index after differently-sized preceding chunks.
    is_copc = (b'copc', 1) in head['records']
    for index in ([] if is_copc else sorted({0, head['count'] // 2, head['count'] - 1})):
        decoder.seek(index)
        record = bytearray(RECORD_SIZE)
        decoder.decompress_many(record)
        require(record == decoded[index * RECORD_SIZE:(index + 1) * RECORD_SIZE], 'LAZ random access failed')
    report = dict(pointsDecoded=head['count'], allRecordBytesPreserved=True, crs='EPSG:32632',
                  codec='lazrs', sequentialRead=True, randomPointSeek=not is_copc, bytes=len(data))
    if (b'copc', 1) in head['records']:
        tree = hierarchy(data)
        independent = []
        for key, (offset, size, count) in tree['nodes'].items():
            if count == 0:
                continue
            points = bytearray(count * RECORD_SIZE)
            lazrs.decompress_points_with_chunk_table(data[offset:offset + size], record_data, points, [(count, size)])
            xyz = points_xyz(points, head)
            width = 2 * tree['half'] / (1 << key[0])
            low = tree['center'] - tree['half'] + np.array(key[1:]) * width
            require(bool(np.all(xyz >= low - 1e-8) and np.all(xyz <= low + width + 1e-8)), 'Point outside its octree node')
            gps = [struct.unpack_from('<d', points, i * RECORD_SIZE + 22)[0] for i in range(count)]
            require(gps == sorted(gps), 'Unsorted GPS time inside chunk')
            independent.extend(canonical_records(points))
        require(sorted(independent) == canonical_records(expected), 'Independent chunk decoding lost/duplicated points')
        report.update(chunks=sum(count > 0 for _, _, count in tree['nodes'].values()),
                      hierarchyPages=len(tree['pages']), octreeLevels=sorted({k[0] for k in tree['nodes']}),
                      allChunksDecodedSeparately=True, nodeBoundsChecked=True, chunkTableChecked=True,
                      randomAccess='direct hierarchy byte ranges')
    return report


def verify_http_ranges(path: Path, source: Path) -> dict:
    """Local HTTP 206 test: discover and decode a root and a deeper node.

    This tests the fixture's actual byte layout, not File Viewer/Giro3D and
    not browser CORS enforcement. No server is reachable outside loopback.
    """
    import http.client
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
    import re
    import threading

    data = path.read_bytes()
    requests = []
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args: object) -> None:
            pass

        def do_GET(self) -> None:
            match = re.fullmatch(r'bytes=(\d+)-(\d+)', self.headers.get('Range', ''))
            if self.path != '/sample.copc.laz':
                self.send_error(404)
                return
            if not match or not (0 <= int(match[1]) <= int(match[2]) < len(data)):
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{len(data)}')
                self.send_header('Content-Length', '0')
                self.end_headers()
                return
            start, end = map(int, match.groups())
            body = data[start:end + 1]
            self.send_response(206)
            self.send_header('Content-Type', 'application/octet-stream')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Content-Range', f'bytes {start}-{end}/{len(data)}')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length')
            self.end_headers()
            requests.append(dict(start=start, endInclusive=end, bytes=len(body), status=206))
            self.wfile.write(body)

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    connection = http.client.HTTPConnection('127.0.0.1', server.server_port, timeout=10)
    total = None
    def get_range(start: int, size: int) -> bytes:
        nonlocal total
        connection.request('GET', '/sample.copc.laz', headers={'Range':f'bytes={start}-{start + size - 1}'})
        response = connection.getresponse()
        body = response.read()
        require(response.status == 206, 'Server did not honor Range with HTTP 206')
        require(len(body) == size and response.getheader('Content-Length') == str(size), 'Incorrect range body size')
        content_range = response.getheader('Content-Range', '')
        match = re.fullmatch(r'bytes (\d+)-(\d+)/(\d+)', content_range)
        require(match is not None and int(match[1]) == start and int(match[2]) == start + size - 1, 'Incorrect Content-Range')
        if total is None:
            total = int(match[3])
        require(int(match[3]) == total and size < total, 'Full-file fetch or inconsistent total')
        require(response.getheader('Accept-Ranges') == 'bytes', 'Missing Accept-Ranges')
        require(response.getheader('Access-Control-Allow-Origin') == '*', 'Missing CORS origin header')
        exposed = response.getheader('Access-Control-Expose-Headers', '').lower()
        require('content-range' in exposed and 'accept-ranges' in exposed, 'Range headers not exposed')
        return body

    try:
        first = get_range(0, 589)
        require(first[:4] == b'LASF' and first[377:381] == b'copc', 'COPC not recognized without extension')
        point_offset = struct.unpack_from('<I', first, 96)[0]
        prefix = first + get_range(589, point_offset - 589)
        header = parse(prefix)
        record_data = header['records'][(b'laszip encoded', 22204)]
        root_offset, root_size = struct.unpack_from('<QQ', first, 469)
        root_page = get_range(root_offset, root_size)
        entries = [struct.unpack_from('<4iQii', root_page, offset) for offset in range(0, root_size, 32)]
        root = next(entry for entry in entries if entry[:4] == (0, 0, 0, 0) and entry[6] > 0)
        pointer = next(entry for entry in entries if entry[6] == -1)
        child_page = get_range(pointer[4], pointer[5])
        children = [struct.unpack_from('<4iQii', child_page, offset) for offset in range(0, len(child_page), 32)]
        child = next(entry for entry in children if entry[0] > 1 and entry[6] > 0)
        selected = []
        for entry in [root, child]:
            chunk = get_range(entry[4], entry[5])
            decoded = bytearray(entry[6] * RECORD_SIZE)
            lazrs.decompress_points_with_chunk_table(chunk, record_data, decoded, [(entry[6], entry[5])])
            selected.extend(canonical_records(decoded))
        original = source.read_bytes()
        original_header = parse(original)
        expected = set(canonical_records(original[original_header['offset']:]))
        require(len(selected) == len(set(selected)) and set(selected) <= expected, 'Range-decoded records differ from ground truth')
        transferred = sum(request['bytes'] for request in requests)
        require(0 < len(selected) < header['count'], 'Expected a partial point selection')
        require(total is not None and total > 8192 and transferred < total / 4, 'Fixture did not exercise bounded partial access')
        connection.request('GET', '/sample.copc.laz', headers={'Range':f'bytes={total}-{total + 10}'})
        response = connection.getresponse()
        response.read()
        require(response.status == 416, 'Out-of-bounds range was not rejected')
        return dict(status='passed', scope='Local fixture HTTP test; not browser/renderer integration',
                    fileBytes=total, transferredBytes=transferred,
                    transferredPercent=round(100 * transferred / total, 3),
                    pointsDecoded=len(selected), totalPoints=header['count'],
                    ranges=requests, rootAndDeeperNodeDecoded=True, fullFileRequests=0,
                    exposedRangeHeaders=True, invalidRangeStatus=416,
                    fixtureContentSniffWithoutFilename=True)
    finally:
        connection.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
