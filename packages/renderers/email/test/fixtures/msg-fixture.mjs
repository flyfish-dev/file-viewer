// License-safe fixtures authored for File Viewer. All identities use example.test.
// A real CFB v3/v4 writer, including MiniFAT, DIFAT and red-black directory trees.
// No Outlook installation, personal email or renamed text file is involved.
const FREE = 0xffffffff, END = 0xfffffffe, FAT = 0xfffffffd, DIFAT = 0xfffffffc;
const u16 = value => new Uint8Array(Buffer.from(value + '\0', 'utf16le'));
const utf8 = value => new TextEncoder().encode(value);
const concat = arrays => { const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0)); let p = 0; for (const a of arrays) { out.set(a, p); p += a.length; } return out; };
const dataView = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
export const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAIklEQVR4nGOUaQhnoAZgooopowaNGjRq0KhBowaNGkQRAAAoaAEj5Rf7BgAAAABJRU5ErkJggg==', 'base64'));

export function writeCompoundFile(streams, version = 3) {
  const sectorSize = version === 4 ? 4096 : 512, words = sectorSize / 4;
  const nodes = [{ name: 'Root Entry', type: 5, children: [], left: FREE, right: FREE, child: FREE, color: 1, parent: FREE }];
  const paths = new Map([['', 0]]);
  const directory = path => {
    if (paths.has(path)) return paths.get(path);
    const slash = path.lastIndexOf('/'), parent = directory(path.slice(0, Math.max(0, slash)));
    const name = path.slice(slash + 1), id = nodes.length;
    nodes.push({ name, type: 1, children: [], left: FREE, right: FREE, child: FREE, color: 1, parent: FREE });
    nodes[parent].children.push(id); paths.set(path, id); return id;
  };
  for (const [path, data] of Object.entries(streams)) {
    const slash = path.lastIndexOf('/'), parent = directory(slash < 0 ? '' : path.slice(0, slash));
    const id = nodes.length;
    nodes.push({ name: path.slice(slash + 1), type: 2, data, left: FREE, right: FREE, child: FREE, color: 0, parent: FREE });
    nodes[parent].children.push(id);
  }
  const less = (a, b) => a.name.length !== b.name.length ? a.name.length < b.name.length : a.name.toUpperCase() < b.name.toUpperCase();
  // Standard red-black insertion, with a separate sibling tree for each storage.
  for (const owner of nodes.filter(n => n.type !== 2)) {
    let root = FREE;
    const rotate = (x, left) => {
      const a = left ? 'right' : 'left', b = left ? 'left' : 'right', y = nodes[x][a];
      nodes[x][a] = nodes[y][b];
      if (nodes[y][b] !== FREE) nodes[nodes[y][b]].parent = x;
      nodes[y].parent = nodes[x].parent;
      if (nodes[x].parent === FREE) root = y;
      else nodes[nodes[x].parent][nodes[nodes[x].parent].left === x ? 'left' : 'right'] = y;
      nodes[y][b] = x; nodes[x].parent = y;
    };
    for (const id of owner.children) {
      let parent = FREE, next = root;
      while (next !== FREE) { parent = next; next = nodes[next][less(nodes[id], nodes[next]) ? 'left' : 'right']; }
      nodes[id].parent = parent; nodes[id].color = 0;
      if (parent === FREE) root = id; else nodes[parent][less(nodes[id], nodes[parent]) ? 'left' : 'right'] = id;
      let z = id;
      while (nodes[z].parent !== FREE && nodes[nodes[z].parent].color === 0) {
        let p = nodes[z].parent, g = nodes[p].parent;
        const left = nodes[g].left === p, uncle = nodes[g][left ? 'right' : 'left'];
        if (uncle !== FREE && nodes[uncle].color === 0) { nodes[p].color = nodes[uncle].color = 1; nodes[g].color = 0; z = g; }
        else {
          if (nodes[p][left ? 'right' : 'left'] === z) { z = p; rotate(z, left); p = nodes[z].parent; g = nodes[p].parent; }
          nodes[p].color = 1; nodes[g].color = 0; rotate(g, !left);
        }
      }
      nodes[root].color = 1;
    }
    owner.child = root;
  }
  const mini = [], miniFat = [];
  for (const node of nodes) {
    if (node.type !== 2) continue;
    node.size = node.data.length; node.start = END;
    if (!node.size || node.size >= 4096) continue;
    node.start = mini.length;
    for (let p = 0; p < node.size; p += 64) {
      const block = new Uint8Array(64); block.set(node.data.subarray(p, p + 64));
      miniFat.push(p + 64 < node.size ? mini.length + 1 : END); mini.push(block);
    }
  }
  const sectors = [], chains = [];
  const allocate = data => {
    if (!data.length) return END;
    const first = sectors.length, ids = [];
    for (let p = 0; p < data.length; p += sectorSize) {
      const block = new Uint8Array(sectorSize); block.set(data.subarray(p, p + sectorSize));
      ids.push(sectors.length); sectors.push(block);
    }
    chains.push(ids); return first;
  };
  for (const node of nodes) if (node.type === 2 && node.size >= 4096) node.start = allocate(node.data);
  const miniBytes = concat(mini);
  nodes[0].size = miniBytes.length; nodes[0].start = allocate(miniBytes);
  const miniTable = new Uint8Array(Math.ceil(miniFat.length / words) * sectorSize).fill(255);
  miniFat.forEach((value, index) => dataView(miniTable).setUint32(index * 4, value, true));
  const firstMiniFat = allocate(miniTable);
  const dirBytes = new Uint8Array(Math.ceil(nodes.length * 128 / sectorSize) * sectorSize), dv = dataView(dirBytes);
  nodes.forEach((node, id) => {
    const start = id * 128, name = u16(node.name);
    if (name.length > 64) throw new Error('CFB fixture name too long');
    dirBytes.set(name, start); dv.setUint16(start + 64, name.length, true); dv.setUint8(start + 66, node.type); dv.setUint8(start + 67, node.color);
    for (const [offset, value] of [[68, node.left], [72, node.right], [76, node.child], [116, node.start ?? END]]) dv.setUint32(start + offset, value, true);
    dv.setBigUint64(start + 120, BigInt(node.size || 0), true);
    if (!id) dirBytes.set([0x0b, 0x0d, 0x02, 0, 0, 0, 0, 0, 0xc0, 0, 0, 0, 0, 0, 0, 0x46], start + 80);
  });
  const firstDirectory = allocate(dirBytes), dataCount = sectors.length;
  let fatCount = 1, difatCount = 0;
  for (;;) {
    const f = Math.ceil((dataCount + fatCount + difatCount) / words), d = Math.ceil(Math.max(0, f - 109) / (words - 1));
    if (f === fatCount && d === difatCount) break;
    fatCount = f; difatCount = d;
  }
  const fatIds = Array.from({ length: fatCount }, (_, i) => dataCount + i);
  const difatIds = Array.from({ length: difatCount }, (_, i) => dataCount + fatCount + i);
  const fatBytes = new Uint8Array(fatCount * sectorSize).fill(255), fv = dataView(fatBytes);
  for (const ids of chains) ids.forEach((id, i) => fv.setUint32(id * 4, ids[i + 1] ?? END, true));
  fatIds.forEach(id => fv.setUint32(id * 4, FAT, true)); difatIds.forEach(id => fv.setUint32(id * 4, DIFAT, true));
  for (let i = 0; i < fatCount; i++) sectors.push(fatBytes.slice(i * sectorSize, (i + 1) * sectorSize));
  for (let i = 0; i < difatCount; i++) {
    const block = new Uint8Array(sectorSize).fill(255), v = dataView(block);
    for (let j = 0; j < words - 1; j++) v.setUint32(j * 4, fatIds[109 + i * (words - 1) + j] ?? FREE, true);
    v.setUint32(sectorSize - 4, difatIds[i + 1] ?? END, true); sectors.push(block);
  }
  const header = new Uint8Array(sectorSize), hv = dataView(header);
  header.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  for (const [offset, value] of [[24, 0x3e], [26, version], [28, 0xfffe], [30, version === 4 ? 12 : 9], [32, 6]]) hv.setUint16(offset, value, true);
  for (const [offset, value] of [[40, version === 4 ? dirBytes.length / sectorSize : 0], [44, fatCount], [48, firstDirectory], [56, 4096], [60, firstMiniFat], [64, miniTable.length / sectorSize], [68, difatIds[0] ?? END], [72, difatCount]]) hv.setUint32(offset, value, true);
  for (let i = 0; i < 109; i++) hv.setUint32(76 + i * 4, fatIds[i] ?? FREE, true);
  return concat([header, ...sectors]).buffer;
}

export function rtfEnvelope(rtf, compressed = false) {
  const raw = typeof rtf === 'string' ? Uint8Array.from(Buffer.from(rtf, 'latin1')) : rtf;
  let payload = raw;
  if (compressed) {
    const groups = [];
    for (let p = 0; p < raw.length; p += 8) {
      const literals = raw.slice(p, p + 8);
      if (literals.length === 8) groups.push(Uint8Array.of(0), literals);
      else {
        const ref = (207 + raw.length) & 4095;
        groups.push(Uint8Array.of(1 << literals.length), literals, Uint8Array.of(ref >>> 4, (ref & 15) << 4));
      }
    }
    if (raw.length % 8 === 0) { const ref = (207 + raw.length) & 4095; groups.push(Uint8Array.of(1, ref >>> 4, (ref & 15) << 4)); }
    payload = concat(groups);
  }
  const bytes = new Uint8Array(16 + payload.length), v = dataView(bytes);
  v.setUint32(0, bytes.length - 4, true); v.setUint32(4, raw.length, true); v.setUint32(8, compressed ? 0x75465a4c : 0x414c454d, true);
  let crc = 0;
  if (compressed) for (const byte of payload) { crc ^= byte; for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  v.setUint32(12, crc >>> 0, true); bytes.set(payload, 16); return bytes;
}

export function createMsgFixture(options = {}) {
  const streams = {};
  const properties = (path, headerSize, entries, recipientCount = 0, attachmentCount = 0) => {
    const data = new Uint8Array(headerSize + entries.length * 16), v = dataView(data);
    if (headerSize >= 24) for (const [offset, value] of [[8, recipientCount], [12, attachmentCount], [16, recipientCount], [20, attachmentCount]]) v.setUint32(offset, value, true);
    entries.forEach(([tag, value], index) => {
      const p = headerSize + index * 16; v.setUint32(p, tag, true); v.setUint32(p + 4, 6, true);
      const type = tag & 0xffff;
      if (type === 3) v.setUint32(p + 8, value, true);
      else if (type === 0xb) v.setUint16(p + 8, Number(value), true);
      else if (type === 0x40) v.setBigUint64(p + 8, BigInt(value), true);
      else if (type !== 0xd) {
        const bytes = type === 0x1f ? u16(value) : typeof value === 'string' ? utf8(value) : value;
        streams[path + '__substg1.0_' + tag.toString(16).padStart(8, '0').toUpperCase()] = bytes;
        v.setUint32(p + 8, bytes.length, true);
      }
    });
    streams[path + '__properties_version1.0'] = data;
  };
  const message = (path, inner = false) => {
    const ansi = !inner && options.ansi;
    const subject = inner ? 'Nested message' : options.subject || 'MSG preview — 中文 日本語';
    const body = inner ? 'Nested Outlook body' : options.text ?? 'Plain text body — 中文';
    const recipients = inner ? [] : [['Alice', 'alice@example.test', 1], ['Carol', 'carol@example.test', 2], ['Bob', 'bob@example.test', 3]];
    const attachments = inner || options.attachments === false ? [] : [
      { name: 'inline.png', mime: 'image/png', cid: 'logo@example.test', content: PNG },
      { name: 'report.txt', mime: 'text/plain', content: utf8('Attachment bytes\n') },
      { name: 'Nested message', inner: true },
    ];
    if (!inner && options.largeAttachment) attachments.push({ name: 'large.bin', mime: 'application/octet-stream', content: new Uint8Array(options.largeAttachment) });
    const entries = [[0x001a001f, 'IPM.Note'], [0x0c1a001f, 'Sender'], [0x0c1f001f, '/O=TEST/OU=EXCHANGE/CN=SENDER'], [0x5d01001f, 'sender@example.test'], [0x3ffd0003, ansi ? 936 : 65001], [0x3fde0003, options.internetCodepage || 65001], [0x00390040, BigInt(Date.UTC(2026, 8, 18) + 11644473600000) * 10000n]];
    if (ansi) {
      entries.push([0x0037001e, Uint8Array.of(0xd6, 0xd0, 0xce, 0xc4, 0)], [0x1000001e, Uint8Array.of(0xd6, 0xd0, 0xce, 0xc4, 0)]);
    } else { entries.push([0x0037001f, subject]); if (body) entries.push([0x1000001f, body]); }
    if (!inner && options.html !== false) {
      const html = options.html || '<html><body><h1>MSG preview — 中文 日本語</h1><p>HTML body, not comma-separated bytes.</p><table border="1"><tr><td>HTML table</td><td>Preserved</td></tr></table><img src="cid:logo@example.test" alt="Embedded image"></body></html>';
      entries.push([options.unicodeHtml ? 0x1013001f : 0x10130102, options.unicodeHtml ? html : typeof html === 'string' ? utf8(html) : html]);
    }
    if (!inner && options.rtf) entries.push([0x10090102, rtfEnvelope(options.rtf, options.compressedRtf)]);
    if (!inner && options.headers !== false) entries.push([0x007d001f, 'From: sender@example.test\r\nTo: alice@example.test\r\nSubject: Outlook fixture\r\n']);
    properties(path, inner ? 24 : 32, entries, recipients.length, attachments.length);
    recipients.forEach(([name, email, type], index) => properties(`${path}__recip_version1.0_#${index.toString(16).padStart(8, '0')}/`, 8, [[0x3001001f, name], [0x3003001f, '/O=TEST/OU=EXCHANGE/CN=' + name], [0x39fe001f, email], [0x0c150003, type]]));
    attachments.forEach((a, index) => {
      const folder = `${path}__attach_version1.0_#${index.toString(16).padStart(8, '0')}/`;
      const props = [[0x37050003, a.inner ? 5 : 1], [0x3001001f, a.name], [0x3707001f, a.name]];
      if (a.inner) { props.push([0x3701000d, null]); message(folder + '__substg1.0_3701000D/', true); }
      else { props.push([0x37010102, a.content], [0x370e001f, a.mime], [0x0e200003, a.content.length]); if (a.cid) props.push([0x3712001f, a.cid], [0x7ffe000b, true]); }
      properties(folder, 8, props);
    });
  };
  message('');
  for (const tag of ['00020102', '00030102', '00040102']) streams['__nameid_version1.0/__substg1.0_' + tag] = new Uint8Array();
  return writeCompoundFile(streams, options.version || 3);
}
