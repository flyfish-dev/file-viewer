import JSZip from 'jszip';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export const spacingCases=[
 ['before="240" after="120" beforeLines="-2147483648" afterLines="-1"','12.00pt','6.00pt'],
 ['beforeLines="-2" afterLines="-2147483648"',null,null],
 ['before="240" after="120" beforeLines="0" afterLines="0"','0.00em','0.00em'],
 ['before="240" after="120" beforeLines="150" afterLines="225"','1.50em','2.25em'],
 ['before="240" after="120" beforeLines="150" afterLines="225" beforeAutospacing="1" afterAutospacing="true"','auto','auto'],
 ['before="240" after="120" beforeLines="NaN" afterLines="Infinity"','12.00pt','6.00pt'],
 ['before="0" after="120" beforeLines="-5" afterLines="75"','0.00pt','0.75em'],
 ['before="240" after="0" beforeLines="75" afterLines="-5"','0.75em','0.00pt'],
];
const p=(text,properties='')=>`<w:p><w:pPr>${properties}</w:pPr><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
const section=(columns='<w:cols w:num="1" w:space="360"/>')=>`<w:sectPr><w:headerReference w:type="default" r:id="h"/><w:footerReference w:type="default" r:id="f"/><w:pgSz w:w="7200" w:h="8640"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="180" w:footer="180"/>${columns}</w:sectPr>`;
export async function makeParagraphFlowFixture(kind='flow') {
 const z=new JSZip();const add=(name,content)=>z.file(name,content,{date:new Date('2000-01-01T00:00:00Z')});
 add('[Content_Types].xml',`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);
 add('_rels/.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="main" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`);
 add('word/_rels/document.xml.rels',`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="styles" Type="${R}/styles" Target="styles.xml"/><Relationship Id="h" Type="${R}/header" Target="header1.xml"/><Relationship Id="f" Type="${R}/footer" Target="footer1.xml"/></Relationships>`);
 add('word/styles.xml',`<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`);
 add('word/header1.xml',`<w:hdr xmlns:w="${W}">${p('FLOW HEADER')}</w:hdr>`);
 add('word/footer1.xml',`<w:ftr xmlns:w="${W}">${p('FLOW FOOTER')}<w:p><w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`);
 let body='',columns;
 if(kind==='spacing')body=spacingCases.map(([attrs],i)=>p(`Spacing case ${i}`,`<w:spacing ${attrs}/><w:ind w:hanging="360"/>`)).join('');
 else {
  const count=kind==='flow'?140:kind==='table'?36:28;
  for(let i=0;i<count;i++) {
   const props=`<w:spacing w:before="30" w:after="70"/>${kind==='keep'&&i%4!==3?'<w:keepNext/>':''}${i%7===0?'<w:widowControl/>':''}`;
   body+=p(`Block ${String(i).padStart(3,'0')} - neutral paragraph content. ${i%3===0?'Words repeated across a line to exercise ordinary wrapping and widow handling. ':''}`,props);
   if(kind==='table'&&i%9===4)body+=`<w:tbl><w:tblPr><w:tblW w:w="5760" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="2880"/><w:gridCol w:w="2880"/></w:tblGrid>${Array.from({length:10},(_,r)=>`<w:tr>${r===0?'<w:trPr><w:tblHeader/></w:trPr>':''}<w:tc>${p(`Cell ${i}-${r}-a`)}</w:tc><w:tc>${p(`Cell ${i}-${r}-b`)}</w:tc></w:tr>`).join('')}</w:tbl>`;
   if(kind==='breaks'&&i%8===4)body+=p(`Break ${i}`,'<w:pageBreakBefore/>');
  }
  if(kind==='columns')columns='<w:cols w:num="2" w:space="360"/>';
  if(kind==='explicit-column')columns='<w:cols w:num="1" w:equalWidth="0"><w:col w:w="3600" w:space="360"/></w:cols>';
 }
 add('word/document.xml',`<w:document xmlns:w="${W}" xmlns:r="${R}"><w:body>${body}${section(columns)}</w:body></w:document>`);
 return z.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
