from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
from xml.sax.saxutils import escape

DEST = Path(__file__).resolve().parent / 'excel-comments.xlsx'
DEST.parent.mkdir(parents=True, exist_ok=True)
S = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
P = 'http://schemas.openxmlformats.org/package/2006/relationships'
T = 'http://schemas.microsoft.com/office/spreadsheetml/2018/threadedcomments'

def cell(ref, value, style=0):
    return f'<c r="{ref}" t="inlineStr" s="{style}"><is><t>{escape(value)}</t></is></c>'

def sheet(rows, merges=''):
    data = ''.join(f'<row r="{index}" ht="28" customHeight="1">{"".join(cells)}</row>' for index, cells in rows)
    return f'<worksheet xmlns="{S}"><dimension ref="A1:D{max(index for index, _ in rows)}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="24"/><cols><col min="1" max="1" width="29" customWidth="1"/><col min="2" max="2" width="22" customWidth="1"/><col min="3" max="3" width="23" customWidth="1"/><col min="4" max="4" width="32" customWidth="1"/></cols><sheetData>{data}</sheetData>{merges}</worksheet>'

def rels(items):
    return f'<Relationships xmlns="{P}">' + ''.join(f'<Relationship Id="{i}" Type="{typ}" Target="{target}"/>' for i, typ, target in items) + '</Relationships>'

parts = {
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/comments1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml"/><Override PartName="/xl/threadedComments/thread1.xml" ContentType="application/vnd.ms-excel.threadedcomments+xml"/><Override PartName="/xl/threadedComments/thread2.xml" ContentType="application/vnd.ms-excel.threadedcomments+xml"/><Override PartName="/xl/persons/person.xml" ContentType="application/vnd.ms-excel.person+xml"/></Types>',
    '_rels/.rels': rels([('rId1', R + '/officeDocument', 'xl/workbook.xml')]),
    'xl/workbook.xml': f'<workbook xmlns="{S}" xmlns:r="{R}"><sheets><sheet name="Release plan" sheetId="1" r:id="rId1"/><sheet name="仕様" sheetId="2" r:id="rId2"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': rels([('rId1', R + '/worksheet', 'worksheets/sheet1.xml'), ('rId2', R + '/worksheet', 'worksheets/sheet2.xml'), ('rId3', R + '/styles', 'styles.xml'), ('rId4', 'http://schemas.microsoft.com/office/2017/10/relationships/person', 'persons/person.xml')]),
    'xl/styles.xml': f'<styleSheet xmlns="{S}"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF166534"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/></cellXfs></styleSheet>',
    'xl/worksheets/sheet1.xml': sheet([(1, [cell('A1', 'Release readiness review', 1)]), (3, [cell('A3', 'Scenario'), cell('B3', 'Owner'), cell('C3', 'Decision'), cell('D3', 'Evidence')]), (4, [cell('A4', 'Login and session expiry'), cell('B4', 'Alex'), cell('C4', 'Ready'), cell('D4', 'Review the attached note')]), (5, [cell('A5', 'Checkout confirmation'), cell('B5', 'Mina'), cell('C5', 'Needs review')]), (6, [cell('A6', 'Retry behavior')]), (650, [cell('A650', 'Virtualized row comment'), cell('D650', 'Scroll target')])], '<mergeCells count="1"><mergeCell ref="A1:D1"/></mergeCells>'),
    'xl/worksheets/sheet2.xml': sheet([(1, [cell('A1', '仕様レビュー', 1)]), (3, [cell('A3', '項目'), cell('B3', '判定')]), (4, [cell('A4', 'エラー文言'), cell('B4', '確認済み')])], '<mergeCells count="1"><mergeCell ref="A1:D1"/></mergeCells>'),
    'xl/worksheets/_rels/sheet1.xml.rels': rels([('c1', R + '/comments', '../comments1.xml'), ('t1', 'http://schemas.microsoft.com/office/2017/10/relationships/threadedComment', '../threadedComments/thread1.xml')]),
    'xl/worksheets/_rels/sheet2.xml.rels': rels([('t2', 'http://schemas.microsoft.com/office/2017/10/relationships/threadedComment', '../threadedComments/thread2.xml')]),
    'xl/comments1.xml': f'<comments xmlns="{S}"><authors><author>Alex</author><author>Mina</author></authors><commentList><comment ref="A1" authorId="0"><text><t>Generated sample for read-only preview. Original workbook stays unchanged.</t></text></comment><comment ref="D4" authorId="1"><text><t>Check session expiry after 30 minutes.\nInclude the reauthentication path.</t></text></comment><comment ref="B6" authorId="0"><text><t>This note belongs to an otherwise empty cell.</t></text></comment><comment ref="D650" authorId="1"><text><t>Comment outside the first 500-row window.</t></text></comment><comment ref="C5" authorId="0"><text><t>Compatibility text for the threaded comment; do not show twice.</t></text></comment></commentList></comments>',
    'xl/persons/person.xml': f'<personList xmlns="{T}"><person displayName="Alex" id="{{11111111-1111-1111-1111-111111111111}}" userId="alex@example.test" providerId="None"/><person displayName="Mina" id="{{22222222-2222-2222-2222-222222222222}}" userId="mina@example.test" providerId="None"/></personList>',
    'xl/threadedComments/thread1.xml': f'<ThreadedComments xmlns="{T}"><threadedComment ref="C5" dT="2026-11-10T09:00:00Z" personId="{{11111111-1111-1111-1111-111111111111}}" id="{{aaaaaaaa-1111-1111-1111-111111111111}}"><text>Should checkout wait for the confirmation email?</text></threadedComment><threadedComment ref="C5" dT="2026-11-10T09:05:00Z" personId="{{22222222-2222-2222-2222-222222222222}}" id="{{bbbbbbbb-1111-1111-1111-111111111111}}" parentId="{{aaaaaaaa-1111-1111-1111-111111111111}}"><text>はい。確認メールの到着も検証してください。</text></threadedComment></ThreadedComments>',
    'xl/threadedComments/thread2.xml': f'<ThreadedComments xmlns="{T}"><threadedComment ref="B4" dT="2026-11-10T10:00:00Z" personId="{{22222222-2222-2222-2222-222222222222}}" id="{{cccccccc-1111-1111-1111-111111111111}}" done="1"><text>エラーメッセージの日本語を確認してください。</text></threadedComment><threadedComment ref="B4" dT="2026-11-10T10:10:00Z" personId="{{11111111-1111-1111-1111-111111111111}}" id="{{dddddddd-1111-1111-1111-111111111111}}" parentId="{{cccccccc-1111-1111-1111-111111111111}}"><text>確認済みです。修正は不要です。</text></threadedComment></ThreadedComments>',
}
def write_fixture(path, overrides=None):
    with ZipFile(path, 'w', ZIP_DEFLATED) as archive:
        for name, content in {**parts, **(overrides or {})}.items():
            info = ZipInfo(name, (2026, 11, 10, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            archive.writestr(info, content)

write_fixture(DEST)
write_fixture(DEST.with_name('excel-comments-text.xlsx'), {
    'xl/comments1.xml': parts['xl/comments1.xml'].replace('Check session expiry after 30 minutes.\nInclude the reauthentication path.', 'first_x000D_second').replace('<t>first_x000D_second</t>', '<t>first_x000D_second</t><rPh sb="0" eb="5"><t>furigana</t></rPh>'),
    'xl/threadedComments/thread1.xml': parts['xl/threadedComments/thread1.xml'].replace('Should checkout wait for the confirmation email?', 'first_x000A_second_x005F_x000A_literal'),
})
write_fixture(DEST.with_name('excel-comments-partial.xlsx'), {
    'xl/worksheets/_rels/sheet2.xml.rels': parts['xl/worksheets/_rels/sheet2.xml.rels'].replace('thread2.xml', 'missing.xml'),
})
chain = ''.join(f'<threadedComment ref="A{index + 10}" personId="{{11111111-1111-1111-1111-111111111111}}" id="chain-{index}"' + (f' parentId="chain-{index - 1}"' if index else '') + '><text>source comment</text></threadedComment>' for index in range(1000))
write_fixture(DEST.with_name('excel-comments-parents.xlsx'), {
    'xl/threadedComments/thread1.xml': parts['xl/threadedComments/thread1.xml'].replace('</ThreadedComments>', chain + '</ThreadedComments>'),
})
print(DEST)
