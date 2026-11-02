import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFString, StandardFonts, rgb } = require('pdf-lib');

/** A deterministic, entirely generated PDF; no external input or assets. */
export async function createAnnotationFixture() {
  const pdf = await PDFDocument.create();
  pdf.setTitle('PDF annotation regression fixture');
  pdf.setAuthor('File Viewer tests');
  pdf.setCreator('File Viewer tests');
  pdf.setProducer('File Viewer tests');
  pdf.setCreationDate(new Date('2020-01-01T00:00:00Z'));
  pdf.setModificationDate(new Date('2020-01-01T00:00:00Z'));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([720, 540]);
  const destination = pdf.addPage([720, 540]);
  const { context } = pdf;
  const string = value => PDFString.of(value);
  page.drawText('PDF ANNOTATION FIXTURE', { x: 70, y: 496, size: 22, font });
  page.drawText('Generated text, comments, navigation and a form field.', { x: 70, y: 474, size: 12, font });
  destination.drawText('INTERNAL LINK DESTINATION', { x: 70, y: 480, size: 22, font });

  const freeText = (text, rect, size, flags = 4) => {
    const width = rect[2] - rect[0], height = rect[3] - rect[1];
    const lines = text.split('\n'), lineHeight = size * 1.25;
    assert.ok(lines.every(line => font.widthOfTextAtSize(line, size) <= width - 8), 'Annotation lines fit their authored box');
    assert.ok((lines.length - 1) * lineHeight + size + 8 <= height, 'Annotation lines fit vertically');
    const appearance = context.register(context.flateStream([
      'q 1 0.95 0.75 rg', `0 0 ${width} ${height} re f`,
      `BT /Helv ${size} Tf 0 0 0 rg 4 ${height - size - 4} Td`,
      ...lines.flatMap((line, i) => [...(i ? [`0 -${lineHeight} Td`] : []), `${font.encodeText(line)} Tj`]),
      'ET Q',
    ].join('\n'), {
      Type: 'XObject', Subtype: 'Form', FormType: 1, BBox: [0, 0, width, height],
      Resources: { Font: { Helv: font.ref } },
    }));
    return context.register(context.obj({
      Type: 'Annot', Subtype: 'FreeText', Rect: rect, F: flags,
      Contents: string(text), T: string('Fixture author'),
      DA: string(`/Helv ${size} Tf 0 0 0 rg`), C: [1, 1, 0],
      AP: { N: appearance },
    }));
  };
  const labels = [
    freeText([
      'Annotation label: a longer synthetic note.',
      'Check the first line of the generated content.',
      'Keep the next paragraph readable at every zoom.',
      'The annotation must stay inside its own box.',
    ].join('\n'), [70, 400, 410, 452], 8, 68),
    freeText([
      'Small annotation: compact text in three lines.',
      'Long HTML duplicates must not cover nearby text.',
      'The final line should remain inside this box.',
    ].join('\n'), [70, 332, 380, 362], 6),
  ];
  page.drawText('BODY LINE A: this paragraph must remain readable below the note.', { x: 70, y: 388, size: 10, font });
  page.drawText('BODY LINE B: the next line must not be covered by oversized text.', { x: 70, y: 374, size: 10, font });
  page.drawText('BODY LINE C: ordinary content continues below the smaller note.', { x: 70, y: 320, size: 10, font });
  page.drawText('BODY LINE D: preserve this line when zooming out or hovering.', { x: 70, y: 306, size: 10, font });

  page.drawText('Highlighted text with a review comment', { x: 70, y: 278, size: 14, font });
  const highlight = context.register(context.obj({
    Type: 'Annot', Subtype: 'Highlight', Rect: [68, 274, 370, 294],
    QuadPoints: [68, 294, 370, 294, 68, 274, 370, 274], C: [1, 1, 0], F: 4,
    T: string('Fixture reviewer'),
    Contents: string([
      'A generated review comment with enough words to wrap onto several lines at every tested zoom level.',
      'First review point: the authored annotation stays inside its box and the nearby body paragraphs remain readable.',
      'Second review point: the complete comment remains visible, including its middle lines and this longer explanation of the expected behavior.',
      'Third review point: hover opens the comment, moving away closes it, and clicking pins it until it is dismissed.',
      'End of synthetic comment: this final sentence must remain visible.',
    ].join('\n')),
  }));
  const popup = context.register(context.obj({
    Type: 'Annot', Subtype: 'Popup', Rect: [380, 274, 650, 420],
    Parent: highlight, Open: false,
  }));
  context.lookup(highlight).set(PDFName.of('Popup'), popup);

  page.drawText('Go to the second page', { x: 70, y: 230, size: 14, font, color: rgb(0, 0.2, 0.7) });
  const link = context.register(context.obj({
    Type: 'Annot', Subtype: 'Link', Rect: [68, 226, 260, 248],
    Border: [0, 0, 0], Dest: [destination.ref, PDFName.of('Fit')],
  }));
  page.node.set(PDFName.of('Annots'), context.obj([...labels, highlight, popup, link]));

  page.drawText('Editable form field:', { x: 70, y: 188, size: 12, font });
  const form = pdf.getForm();
  const field = form.createTextField('fixture-value');
  field.setText('Initial value');
  field.addToPage(page, { x: 70, y: 148, width: 240, height: 26, font });
  form.updateFieldAppearances(font);
  page.drawText('All labels and metadata are synthetic.', { x: 70, y: 84, size: 12, font });
  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeFile(new URL('./annotations.pdf', import.meta.url), await createAnnotationFixture());
}
