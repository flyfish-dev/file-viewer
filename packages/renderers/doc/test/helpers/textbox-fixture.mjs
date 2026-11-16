// Independent synthetic binary fixture builder. NOT a native-Word layout oracle.
// CFB v3 regular streams, FIB, CLX, CHPX FKP, OfficeArt, PLCs and SEPX.
import { parseFib } from "../../dist/msdoc/fib.js";
export const u16 = (n) => {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n & 65535);
  return b;
};
export const u32 = (n) => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0);
  return b;
};
export function plc(cps, entries) {
  return Buffer.concat([...cps.map(u32), ...entries]);
}
export function record(type, version, instance, payload = Buffer.alloc(0)) {
  return Buffer.concat([
    u16(instance * 16 + version),
    u16(type),
    u32(payload.length),
    payload,
  ]);
}
export function fopt(properties, type = 0xf00b) {
  properties = [...properties].sort((a, b) => a[0] - b[0]);
  return record(
    type,
    3,
    properties.length,
    Buffer.concat(
      properties
        .flatMap(([id, value, payload]) => [
          u16(id | (payload ? 0x8000 : 0)),
          u32(payload ? payload.length : value),
        ])
        .concat(properties.filter((p) => p[2]).map((p) => p[2])),
    ),
  );
}
export function shape(
  id,
  index,
  {
    flags = 0xa00,
    rotation = 0,
    clientId = index << 16,
    properties = [],
    type = 202,
  } = {},
) {
  return record(
    0xf004,
    15,
    0,
    Buffer.concat([
      record(0xf00a, 2, type, Buffer.concat([u32(id), u32(flags)])),
      fopt([[128, index << 16], [4, rotation], ...properties]),
      record(0xf00d, 0, 0, u32(clientId)),
    ]),
  );
}
export function cfb(streams) {
  const sectors = [],
    entries = [],
    fat = [];
  for (const [name, data] of Object.entries(streams)) {
    const size = Math.max(4096, Math.ceil(data.length / 512) * 512),
      start = sectors.length;
    for (let at = 0; at < size; at += 512) {
      const b = Buffer.alloc(512);
      if (at < data.length)
        data.copy(b, 0, at, Math.min(at + 512, data.length));
      sectors.push(b);
      fat.push(at + 512 < size ? sectors.length : 0xfffffffe);
    }
    entries.push({ name, start, size });
  }
  const dirId = sectors.length,
    dir = Buffer.alloc(512);
  const entry = (
    i,
    name,
    type,
    start,
    size,
    left = 0xffffffff,
    right = 0xffffffff,
    child = 0xffffffff,
  ) => {
    const off = i * 128;
    Buffer.from(name + "\0", "utf16le").copy(dir, off);
    dir.writeUInt16LE((name.length + 1) * 2, off + 64);
    dir[off + 66] = type;
    dir[off + 67] = 1;
    dir.writeUInt32LE(left, off + 68);
    dir.writeUInt32LE(right, off + 72);
    dir.writeUInt32LE(child, off + 76);
    dir.writeUInt32LE(start, off + 116);
    dir.writeUInt32LE(size, off + 120);
  };
  entry(0, "Root Entry", 5, 0xfffffffe, 0, 0xffffffff, 0xffffffff, 1);
  entries.forEach((e, i) =>
    entry(
      i + 1,
      e.name,
      2,
      e.start,
      e.size,
      i === 0 && entries.length > 1 ? 2 : 0xffffffff,
    ),
  );
  if (entries.length > 1) dir[2 * 128 + 67] = 0;
  sectors.push(dir);
  fat.push(0xfffffffe);
  const fatId = sectors.length;
  fat.push(0xfffffffd);
  const fatBytes = Buffer.alloc(512, 255);
  fat.forEach((v, i) => fatBytes.writeUInt32LE(v, i * 4));
  sectors.push(fatBytes);
  const h = Buffer.alloc(512);
  Buffer.from("d0cf11e0a1b11ae1", "hex").copy(h);
  h.writeUInt16LE(0x3e, 24);
  h.writeUInt16LE(3, 26);
  h.writeUInt16LE(0xfffe, 28);
  h.writeUInt16LE(9, 30);
  h.writeUInt16LE(6, 32);
  h.writeUInt32LE(1, 44);
  h.writeUInt32LE(dirId, 48);
  h.writeUInt32LE(4096, 56);
  h.writeUInt32LE(0xfffffffe, 60);
  h.writeUInt32LE(0xfffffffe, 68);
  h.fill(255, 76);
  h.writeUInt32LE(fatId, 76);
  return Buffer.concat([h, ...sectors]);
}
export function makeTextboxDoc(options = {}) {
  const word = Buffer.alloc(4096),
    tables = [];
  let tableSize = 0;
  word.writeUInt16LE(0xa5ec, 0);
  word.writeUInt16LE(0x00c1, 2);
  word.writeUInt16LE(0x0409, 6);
  word.writeUInt16LE(0x1204, 10);
  word.writeUInt16LE(0x00bf, 12);
  word.writeUInt16LE(14, 32);
  word.writeUInt16LE(22, 62);
  word.writeUInt16LE(93, 152);
  const ids = options.ids || [3079, 4217],
    texts = options.texts || ["Duplicate β 中文\r", "Duplicate β 中文\r"];
  const main = "\b".repeat(ids.length) + "\rMain 583\rLast 694\r",
    tx = texts.join("") + "\r",
    text = main + tx;
  word.writeUInt32LE(4096, 64);
  word.writeUInt32LE(main.length, 76);
  word.writeUInt32LE(tx.length, 100);
  Buffer.from(text, "utf16le").copy(word, 1024);
  word.writeUInt32LE(1024, 24);
  word.writeUInt32LE(1024 + text.length * 2, 28);
  const fields = parseFib(word).fibRgFcLcb._pairs;
  function put(name, bytes) {
    const i = fields.find((p) => p.name === name).index;
    word.writeUInt32LE(tableSize, 154 + i * 8);
    word.writeUInt32LE(bytes.length, 158 + i * 8);
    tables.push(bytes);
    tableSize += bytes.length;
  }
  const pcd = Buffer.concat([
    u32(0),
    u32(text.length),
    u16(0),
    u32(1024),
    u16(0),
  ]);
  put("Clx", Buffer.concat([Buffer.from([2]), u32(pcd.length), pcd]));
  const fkp = word.subarray(1536, 2048);
  fkp.writeUInt32LE(1024, 0);
  fkp.writeUInt32LE(1024 + ids.length * 2, 4);
  fkp[8] = 100;
  fkp[200] = 3;
  fkp.writeUInt16LE(0x0855, 201);
  fkp[203] = 1;
  fkp[511] = 1;
  put(
    "PlcfBteChpx",
    Buffer.concat([u32(1024), u32(1024 + ids.length * 2), u32(3)]),
  );
  const cp = [0];
  texts.forEach((t) => cp.push(cp.at(-1) + t.length));
  cp.push(tx.length);
  const txEntries = ids.map((id, i) => {
    const b = Buffer.alloc(22);
    b.writeUInt32LE(options.chainCount || 1, 0);
    b.writeUInt32LE(id, 14);
    return b;
  });
  txEntries.push(Buffer.alloc(22));
  put("PlcftxbxTxt", plc(cp, txEntries));
  const spaEntries = ids.map((id, i) => {
    const b = Buffer.alloc(26);
    b.writeUInt32LE(id, 0);
    [-333 + i * 2101, 417 + i * 913, 1437 + i * 2101, 1801 + i * 913].forEach(
      (n, j) => b.writeInt32LE(n, 4 + j * 4),
    );
    b.writeUInt16LE(0x0074, 20);
    return b;
  });
  put("PlcSpaMom", plc([...ids.map((_, i) => i), text.length + 1], spaEntries));
  const own = ids.map((id, i) =>
    shape(id, i + 1, {
      clientId: options.conflict && i === 1 ? 0x00090000 : (i + 1) << 16,
      rotation: options.rotation || 0,
      properties: options.properties || [],
    }),
  );
  const patriarch = record(
    0xf004,
    15,
    0,
    record(0xf00a, 2, 0, Buffer.concat([u32(9001), u32(5)])),
  );
  let drawing = record(
    0xf002,
    15,
    0,
    record(0xf003, 15, 0, Buffer.concat([patriarch, ...own])),
  );
  if (options.malformedArt) {
    drawing = Buffer.from(drawing);
    drawing.writeUInt32LE(drawing.length + 100, 4);
  }
  put(
    "DggInfo",
    Buffer.concat([
      record(
        0xf000,
        15,
        0,
        options.defaults ? fopt(options.defaults) : Buffer.alloc(0),
      ),
      Buffer.from([0]),
      drawing,
    ]),
  );
  const sepx = Buffer.concat(
    [
      [0xb01f, 12240],
      [0xb020, 15840],
      [0xb021, 936],
      [0xb022, 1584],
      [0x9023, 1152],
      [0x9024, 792],
    ].flatMap(([s, n]) => [u16(s), u16(n)]),
  );
  word.writeInt16LE(options.negativeSepx ? -1 : sepx.length, 2048);
  sepx.copy(word, 2050);
  const sed = Buffer.alloc(12);
  sed.writeUInt32LE(2048, 2);
  put("PlcfSed", plc([0, text.length + 1], [sed]));
  const table = Buffer.concat(tables);
  if (options.mutate)
    options.mutate({ word, table, fields: parseFib(word).fibRgFcLcb });
  return cfb({ WordDocument: word, "1Table": table });
}
