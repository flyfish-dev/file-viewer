// Deterministic, generated Office packages; no external documents or assets.
const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export const spacingCases=[
 ['before="120" after="240" beforeLines="-2147483648" afterLines="-2147483648"','6pt','12pt'],
 ['before="0" after="0" beforeLines="-2147483648" afterLines="-2147483648"','0pt','0pt'],
 ['before="120" after="240" beforeLines="150" afterLines="25"','1.5em','0.25em'],
 ['before="120" after="240" beforeLines="0" afterLines="0"','0em','0em'],
 ['before="120" after="240" beforeLines="NaN" afterLines="Infinity"','6pt','12pt'],
 ['before="120" after="240" beforeLines="150" afterLines="25" beforeAutospacing="1" afterAutospacing="1"','auto','auto'],
 ['beforeLines="-2147483648" afterLines="-2147483648"','',''],
 ['before="60" after="100"','3pt','5pt'],
];
const p=(text,props='')=>`<w:p>${props?`<w:pPr>${props}</w:pPr>`:''}<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr><w:t>${text}</w:t></w:r></w:p>`;
export async function makeFlowDocument(JSZip,{kind='flow',columns='<w:cols w:num="1"/>',count=60}={}){
 const zip=new JSZip();
 const body=kind==='spacing'?spacingCases.map(([attrs],i)=>p('GAP-'+i,`<w:spacing ${attrs.replace(/(\w+)="/g,'w:$1="')}/>`)).join(''):
 Array.from({length:count},(_,i)=>p(`FLOW-${String(i).padStart(3,'0')} Neutral paragraph for deterministic pagination and content preservation.`, `<w:spacing w:before="0" w:after="80"/>${i%9===0?'<w:keepNext/>':''}`)).join('')+
 `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>${Array.from({length:8},(_,i)=>`<w:tr><w:tc>${p('CELL-'+i+'-A')}</w:tc><w:tc>${p('CELL-'+i+'-B')}</w:tc></w:tr>`).join('')}</w:tbl>`;
 zip.file('[Content_Types].xml',`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);
 zip.file('_rels/.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="document" Type="${rel}/officeDocument" Target="word/document.xml"/></Relationships>`);
 zip.file('word/_rels/document.xml.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="footer" Type="${rel}/footer" Target="footer1.xml"/></Relationships>`);
 zip.file('word/footer1.xml',`<w:ftr xmlns:w="${ns}">${p('NEUTRAL FOOTER')}</w:ftr>`);
 zip.file('word/document.xml',`<w:document xmlns:w="${ns}" xmlns:r="${rel}"><w:body>${body}<w:sectPr><w:footerReference w:type="default" r:id="footer"/><w:pgSz w:w="8640" w:h="10080"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360"/>${columns}</w:sectPr></w:body></w:document>`);
 for(const file of Object.values(zip.files))file.date=new Date('2020-01-01T00:00:00Z');
 return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
