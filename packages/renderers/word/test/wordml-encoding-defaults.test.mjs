import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import JSZip from 'jszip'
import { decodeWordMlBytes, convertWordMlToDocx } from '../dist/wordMl.js'
import { resolveFileViewerWordContainer } from '../dist/index.js'
const W='http://schemas.microsoft.com/office/word/2003/wordml'
const O='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const wrap=content=>`<w:wordDocument xmlns:w="${W}">${content}</w:wordDocument>`
const body='<w:body><w:p><w:r><w:t xml:space="preserve">  Test &amp; text  </w:t></w:r></w:p></w:body>'
const utf8=s=>new TextEncoder().encode(s).buffer
const buf=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)
const defaults='<w:fonts><w:defaultFonts w:ascii="Arial" w:h-ansi="Calibri" w:fareast="SimSun" w:cs="Tahoma"/></w:fonts><w:docPr><w:defaultTabStop w:val="720"/></w:docPr>'
async function convert(b) {
 const dom=new JSDOM('<div id="host"></div>')
 try{return await JSZip.loadAsync(await convertWordMlToDocx(b,dom.window.document.querySelector('#host')))}
 finally{dom.window.close()}
}
function doc(s){return new JSDOM(s,{contentType:'application/xml'})}
for(const [label, bytes, text] of [
 ['GBK',[0xd6,0xd0,0xce,0xc4],'中文'],
 ['windows-1252',[0x63,0x61,0x66,0xe9,0x20,0x80],'café €'],
 ['ISO-8859-1',[0x63,0x61,0x66,0xe9],'café'],
 ['Shift_JIS',[0x93,0xfa,0x96,0x7b],'日本'],
]){
 test(`WordML honors ${label} before XML parsing and container routing`,async()=>{
  const source=Buffer.concat([Buffer.from(`<?xml version="1.0" encoding="${label}"?>`+wrap(body.replace('  Test &amp; text  ','MARK')).split('MARK')[0]),Buffer.from(bytes),Buffer.from(wrap(body).split('  Test &amp; text  ')[1])])
  assert.equal(resolveFileViewerWordContainer(buf(source)),'wordml')
  assert.ok(decodeWordMlBytes(buf(source)).includes(text))
  const file=await convert(buf(source));assert.ok((await file.file('word/document.xml').async('string')).includes(text))
 })
}
for(const endian of ['le','be']) for(const bom of [false,true]){
 test(`UTF-16 ${endian} signature is retained with ${bom?'BOM':'no BOM'}`,()=>{
  const xml='<?xml version="1.0" encoding="UTF-16"?>'+wrap(body.replace('Test','中文'))
  const data=Buffer.from((bom?'\ufeff':'')+xml,'utf16le');if(endian==='be')data.swap16()
  assert.equal(decodeWordMlBytes(buf(data)),xml)
 })
}
test('UTF-8 BOM and aliases are recognized without replacing multibyte text',()=>{
 const xml='<?xml version="1.0" encoding="utf8"?>'+wrap(body.replace('Test','中文'))
 assert.equal(decodeWordMlBytes(utf8('\ufeff'+xml)),xml)
})
test('invalid bytes, unsupported declared encodings and signature conflicts fail rather than corrupt text',async()=>{
 for(const data of [
  Buffer.from('<?xml version="1.0" encoding="x-unknown"?>'+wrap(body)),
  Buffer.concat([Buffer.from('<?xml version="1.0" encoding="UTF-8"?>'),Buffer.from([0xff]),Buffer.from(wrap(body))]),
  Buffer.from('\ufeff<?xml version="1.0" encoding="GBK"?>'+wrap(body),'utf8'),
  Buffer.from('\ufeff<?xml version="1.0" encoding="utf-16be"?>'+wrap(body),'utf16le'),
 ]){assert.throws(()=>decodeWordMlBytes(buf(data)),/encoding/);await assert.rejects(convert(buf(data)),/encoding/)}
})
test('encoding-like content outside the initial XML declaration never changes decoding',()=>{
 const source=wrap(body.replace('Test','encoding="GBK" 中文'))
 assert.equal(decodeWordMlBytes(utf8(source)),source)
})
test('document default fonts are represented by OOXML run defaults even without a styles part',async()=>{
 const file=await convert(utf8(wrap(defaults+body)))
 const styles=doc(await file.file('word/styles.xml').async('string'))
 try{
  const fonts=styles.window.document.getElementsByTagNameNS(O,'rFonts')
  assert.equal(fonts.length,1);assert.equal(fonts[0].parentElement.localName,'rPr');assert.equal(fonts[0].parentElement.parentElement.localName,'rPrDefault')
  for(const [key,value] of Object.entries({ascii:'Arial',hAnsi:'Calibri',eastAsia:'SimSun',cs:'Tahoma'}))assert.equal(fonts[0].getAttributeNS(O,key),value)
 }finally{styles.window.close()}
 const settings=await file.file('word/settings.xml').async('string')
 assert.ok(!(await file.file('word/fontTable.xml').async('string')).includes('defaultFonts'));assert.ok(!settings.includes('defaultFonts'));assert.ok(settings.includes('defaultTabStop'))
 assert.match(await file.file('word/_rels/document.xml.rels').async('string'),/styles.xml/)
 assert.match(await file.file('[Content_Types].xml').async('string'),/wordprocessingml.styles\+xml/)
})
test('named styles and direct fonts override defaults without being overwritten',async()=>{
 const s='<w:styles><w:style w:type="paragraph" w:default="on" w:styleId="Normal"><w:rPr><w:rFonts w:ascii="Courier New" w:fareast="SimHei"/></w:rPr></w:style></w:styles>'
 const file=await convert(utf8(wrap(s+defaults+body.replace('<w:r>','<w:r><w:rPr><w:rFonts w:ascii="Georgia"/></w:rPr>'))))
 const d=doc(await file.file('word/styles.xml').async('string'))
 try{assert.equal(d.window.document.documentElement.firstElementChild.localName,'docDefaults');const style=d.window.document.getElementsByTagNameNS(O,'style')[0];assert.equal(style.getElementsByTagNameNS(O,'rFonts')[0].getAttributeNS(O,'ascii'),'Courier New')}
 finally{d.window.close()}
 assert.match(await file.file('word/document.xml').async('string'),/w:ascii="Georgia"/)
})
test('absent defaults do not fabricate a styles part; missing script fonts remain absent',async()=>{
 let file=await convert(utf8(wrap(body)));assert.equal(file.file('word/styles.xml'),null)
 file=await convert(utf8(wrap('<w:fonts><w:defaultFonts w:ascii="A &amp; B"/></w:fonts>'+body)))
 const d=doc(await file.file('word/styles.xml').async('string'))
 try{const f=d.window.document.getElementsByTagNameNS(O,'rFonts')[0];assert.equal(f.getAttributeNS(O,'ascii'),'A & B');assert.equal(f.hasAttributeNS(O,'eastAsia'),false)}
 finally{d.window.close()}
})
