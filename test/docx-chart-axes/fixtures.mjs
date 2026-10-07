import { makeEngineDocument } from "../docx-engine-compatibility/fixtures.mjs";
const c = "http://schemas.openxmlformats.org/drawingml/2006/chart";
const a = "http://schemas.openxmlformats.org/drawingml/2006/main";
const cache = (name, values) =>
  `<c:${name}><c:ptCount val="${values.length}"/>${values.flatMap((value, i) => (value == null ? [] : [`<c:pt idx="${i}"><c:v>${value}</c:v></c:pt>`])).join("")}</c:${name}>`;
const title = (text) =>
  `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p>${text.map((s) => `<a:r><a:t>${s}</a:t></a:r>`).join("")}</a:p></c:rich></c:tx></c:title>`;
function chart({
  dates,
  values,
  reverse = false,
  epoch = false,
  hidden = false,
  months = false,
}) {
  return `<c:chartSpace xmlns:c="${c}" xmlns:a="${a}">${epoch ? "<c:date1904/>" : ""}<c:chart>${epoch ? title(["Timeline"]) : ""}<c:plotArea><c:lineChart><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Series</c:v></c:tx><c:cat><c:numRef>${cache("numCache", dates)}</c:numRef></c:cat><c:val><c:numRef>${cache("numCache", values)}</c:numRef></c:val></c:ser><c:axId val="1"/><c:axId val="2"/></c:lineChart><c:dateAx><c:axId val="1"/><c:scaling><c:orientation val="${reverse ? "maxMin" : "minMax"}"/></c:scaling><c:delete val="${hidden ? 1 : 0}"/><c:axPos val="b"/>${title(["(", "days", ")"])}<c:numFmt formatCode="yyyy/mm/dd" sourceLinked="0"/><c:crossAx val="2"/><c:baseTimeUnit val="days"/>${months ? '<c:majorUnit val="1"/><c:majorTimeUnit val="months"/>' : ""}</c:dateAx><c:valAx><c:axId val="2"/><c:scaling><c:orientation val="${reverse ? "maxMin" : "minMax"}"/><c:max val="10"/><c:min val="-10"/></c:scaling><c:axPos val="l"/>${title(["(", "units", ")"])}<c:crossAx val="1"/><c:crossesAt val="-2"/><c:majorUnit val="5"/></c:valAx></c:plotArea></c:chart></c:chartSpace>`;
}
export async function makeAxesDocument(JSZip) {
  const zip = await JSZip.loadAsync(await makeEngineDocument(JSZip));
  const charts = [
    chart({ dates: [44927, 44928, 44937, 44938], values: [-4, -2, null, 6] }),
    chart({
      dates: [0, 1, 4, 7],
      values: [-6, 0, 15, 4],
      reverse: true,
      epoch: true,
    }),
    chart({ dates: [44957, 44958, 45046], values: [1, 2, 3], months: true }),
    chart({ dates: [44927, 44928], values: [1, 2], hidden: true }),
  ];
  const primary = chart({
    dates: [44927, 44928, 44937, 44938],
    values: [2, 4, 6, 8],
  })
    .replaceAll("lineChart", "barChart")
    .replace(
      "<c:barChart>",
      '<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/>',
    )
    .replaceAll("dateAx", "catAx");
  const secondary = chart({
    dates: [44927, 44928, 44937, 44938],
    values: [0.2, 0.4, null, -0.5],
    hidden: true,
  })
    .replaceAll('val="1"', 'val="3"')
    .replaceAll('val="2"', 'val="4"')
    .replace('c:axPos val="l"', 'c:axPos val="r"')
    .replace('<c:max val="10"/>', '<c:max val="1"/>')
    .replace('<c:min val="-10"/>', '<c:min val="-1"/>')
    .replace(
      '<c:majorUnit val="5"/>',
      '<c:majorUnit val="0.5"/><c:numFmt formatCode="0%"/>',
    );
  charts.push(
    primary.replace(
      "</c:plotArea>",
      secondary.split("<c:plotArea>")[1].split("</c:plotArea>")[0] +
        "</c:plotArea>",
    ),
  );
  let doc = await zip.file("word/document.xml").async("string");
  const extra = doc.match(
    /<w:p><w:r><w:drawing><wp:inline>[\s\S]*?r:id="chart4"[\s\S]*?<\/w:p>/,
  )[0];
  // Copy just the fourth chart paragraph, not the earlier paragraphs in the match.
  const para = extra
    .slice(extra.lastIndexOf("<w:p>"))
    .replaceAll("chart4", "chart5")
    .replaceAll('id="4"', 'id="5"');
  zip.file("word/document.xml", doc.replace("<w:sectPr>", para + "<w:sectPr>"));
  zip.file(
    "word/_rels/document.xml.rels",
    (await zip.file("word/_rels/document.xml.rels").async("string")).replace(
      "</Relationships>",
      '<Relationship Id="chart5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="chart5.xml"/></Relationships>',
    ),
  );
  zip.file(
    "[Content_Types].xml",
    (await zip.file("[Content_Types].xml").async("string")).replace(
      "</Types>",
      '<Override PartName="/word/chart5.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>',
    ),
  );
  charts.forEach((xml, i) => zip.file(`word/chart${i + 1}.xml`, xml));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
