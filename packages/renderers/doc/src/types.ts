export type BinaryInput = ArrayBuffer | Uint8Array | ArrayBufferView;

export interface MsDocWarning {
  message: string;
  [key: string]: unknown;
}

export interface BinaryInputLike {
  byteLength: number;
}

export interface CFBEntry {
  id: number;
  name: string;
  objectType: number;
  colorFlag: number;
  leftSiblingId: number;
  rightSiblingId: number;
  childId: number;
  clsid: Uint8Array;
  stateBits: number;
  creationTime: number;
  modifiedTime: number;
  startSector: number;
  streamSize: number;
  children: number[];
  parentId: number | null;
  path?: string;
}

export interface ParsedCFB {
  bytes: Uint8Array;
  majorVersion: number;
  sectorSize: number;
  miniSectorSize: number;
  numDirSectors: number;
  numFatSectors: number;
  firstDirSector: number;
  transactionSignature: number;
  miniStreamCutoffSize: number;
  warnings: MsDocWarning[];
  entries: CFBEntry[];
  root: CFBEntry;
  pathMap: Map<string, CFBEntry>;
  getEntry(path: string): CFBEntry | null;
  getStream(identifier: string | CFBEntry): Uint8Array | null;
  listChildren(path: string | CFBEntry): CFBEntry[];
  findByName(name: string, startPath?: string): CFBEntry | null;
}

export interface FibBase {
  wIdent: number;
  nFib: number;
  lid: number;
  pnNext: number;
  flags: number;
  envFlags: number;
  fDot: boolean;
  fGlsy: boolean;
  fComplex: boolean;
  fHasPic: boolean;
  cQuickSaves: number;
  fEncrypted: boolean;
  fWhichTblStm: number;
  fReadOnlyRecommended: boolean;
  fWriteReservation: boolean;
  fExtChar: boolean;
  fLoadOverride: boolean;
  fFarEast: boolean;
  fObfuscated: boolean;
  nFibBack: number;
  lKey: number;
  envr: number;
  fMac: boolean;
  fEmptySpecial: boolean;
  fLoadOverridePage: boolean;
}

export interface FibRgLw {
  raw: number[];
  cbMac: number;
  ccpText: number;
  ccpFtn: number;
  ccpHdd: number;
  ccpMcr: number;
  ccpAtn: number;
  ccpEdn: number;
  ccpTxbx: number;
  ccpHdrTxbx: number;
}

export interface FibFcLcbPair {
  name: string;
  fc: number;
  lcb: number;
  index: number;
}

export interface FibRgFcLcb {
  _pairs: FibFcLcbPair[];
  [key: string]: number | FibFcLcbPair[] | undefined;
}

export interface ParsedFib {
  base: FibBase;
  csw: number;
  cslw: number;
  cbRgFcLcb: number;
  cswNew: number;
  nFibNew: number;
  fibRgWBytes: Uint8Array;
  fibRgLwBytes: Uint8Array;
  fibRgFcLcbBytes: Uint8Array;
  fibRgCswNewBytes: Uint8Array;
  fibRgLw: FibRgLw;
  fibRgFcLcb: FibRgFcLcb;
}

export interface PieceDescriptor {
  index: number;
  descriptor: number;
  fNoParaLast: boolean;
  fRaw: boolean;
  prm: number;
  compressed: boolean;
  fcRaw: number;
  fc: number;
  cpStart: number;
  cpEnd: number;
  actualByteStart: number;
  byteLength: number;
  actualByteEnd: number;
}

export interface PieceTable {
  cps: number[];
  pieces: PieceDescriptor[];
}

export interface ParsedClx {
  prcs: Array<{ type: number; cbGrpprl: number; bytes: Uint8Array }>;
  pcdt: { lcb: number; pieceTable: PieceTable };
}

export interface CpFileOffsetInfo {
  piece: PieceDescriptor;
  offset: number;
  compressed: boolean;
}

export type PropertyKind = 'char' | 'para' | 'table' | 'unknown';

export interface DecodedProperty<TValue = unknown> {
  kind: PropertyKind;
  name: string;
  value: TValue;
  code?: number;
  operandBytes?: Uint8Array;
  raw?: number | Uint8Array;
}

export interface StyleBase {
  sti?: number;
  flags1?: number;
  stk: number;
  istdBase: number;
  cupx: number;
  istdNext: number;
  bchUpe?: number;
  grfstd?: number;
}

export interface StyleDefinition {
  istd: number;
  name: string;
  stdfBase: StyleBase;
  paraProps: DecodedProperty[];
  charProps: DecodedProperty[];
  tableProps: DecodedProperty[];
  empty: boolean;
}

export interface ResolvedStyle {
  styleIds: number[];
  paraProps: DecodedProperty[];
  charProps: DecodedProperty[];
  tableProps: DecodedProperty[];
}

export interface StyleCollection {
  header: {
    cbStshi: number;
    cstd: number;
    cbSTDBaseInFile: number;
    ftcAsci: number;
    ftcFE: number;
    ftcOther: number;
  } | null;
  styles: Map<number, StyleDefinition>;
  resolveStyle(istd: number | null | undefined): ResolvedStyle;
}

export interface FontInfo {
  index: number;
  cbFfnM1: number;
  ffid: number;
  weight: number;
  charset: number;
  ixchSzAlt: number;
  panose: Uint8Array;
  fontSignature: Uint8Array;
  name: string;
  altName: string;
}

export interface FontsCollection {
  header: { cData: number; cbExtra: number } | null;
  fonts: FontInfo[];
  byIndex(index: number | null | undefined): FontInfo | null;
}

export interface BorderSpec {
  borderType?: number;
  lineWidth?: number;
  color?: number;
  colorRef?: number;
  frame?: boolean;
  nil?: boolean;
  shadow?: boolean;
  space?: number;
  [key: string]: unknown;
}

export interface TableBorders {
  top?: BorderSpec;
  left?: BorderSpec;
  bottom?: BorderSpec;
  right?: BorderSpec;
  horizontalInside?: BorderSpec;
  verticalInside?: BorderSpec;
}

export interface ShadingSpec {
  foregroundColorIndex?: number;
  backgroundColorIndex?: number;
  foregroundColorRef?: number;
  backgroundColorRef?: number;
  pattern: number;
  auto?: boolean;
  nil?: boolean;
  legacy?: boolean;
}

export interface HighlightInfo {
  index: number;
  color?: string;
}

export interface SymbolInfo {
  fontId?: number;
  charCode?: number;
  [key: string]: unknown;
}

export interface CharState {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  underline: number;
  fontSizeHalfPoints?: number;
  fontFamilyId?: number;
  fontFamily?: string;
  colorIndex?: number;
  highlight?: HighlightInfo | number;
  spacing: number;
  positionHalfPoints: number;
  scale: number;
  hidden: boolean;
  smallCaps: boolean;
  caps: boolean;
  outline: boolean;
  shadow: boolean;
  emboss: boolean;
  imprint: boolean;
  rtl: boolean;
  pictureOffset?: number;
  data: boolean;
  ole2: boolean;
  object: boolean;
  special: boolean;
  plain?: boolean;
  charStyleId?: number;
  boldBi?: boolean;
  italicBi?: boolean;
  doubleStrike?: boolean;
  symbol?: SymbolInfo;
  [key: string]: unknown;
}

export interface ParaBorders {
  top?: BorderSpec;
  left?: BorderSpec;
  bottom?: BorderSpec;
  right?: BorderSpec;
  between?: BorderSpec;
  bar?: BorderSpec;
}

export interface ParaState {
  styleId: number;
  alignment: number;
  spacingBefore: number;
  spacingAfter: number;
  lineSpacing: number;
  leftIndent: number;
  rightIndent: number;
  firstLineIndent: number;
  keepLines: boolean;
  keepNext: boolean;
  pageBreakBefore: boolean;
  widowControl: boolean;
  inTable: boolean;
  tableRowEnd: boolean;
  innerTableCell: boolean;
  innerTableRowEnd: boolean;
  itap: number;
  dtap: number;
  listLevel?: number;
  listId?: number;
  rtlPara: boolean;
  adjustRight: boolean;
  frameLeft?: number;
  frameTop?: number;
  frameWidth?: number;
  frameHeight?: number;
  framePosition?: number;
  frameWrap?: number;
  borders: ParaBorders;
  shading?: unknown;
  [key: string]: unknown;
}

export interface Tcgrf {
  horzMerge?: number;
  vertMerge?: number;
  vertAlign?: number;
  fitText?: boolean;
  noWrap?: boolean;
  hideMark?: boolean;
  textFlow?: number;
  ftsWidth?: number;
  [key: string]: unknown;
}

export interface TableCellDefinition {
  wWidth?: number;
  tcgrf?: Tcgrf;
  borders?: Record<string, BorderSpec>;
  [key: string]: unknown;
}

export interface TDefTableOperand {
  rgdxaCenter?: number[];
  cells: TableCellDefinition[];
  [key: string]: unknown;
}

export interface ItcRange {
  first: number;
  lim: number;
}

export interface RangeWidthOperand {
  cb?: number;
  range: ItcRange;
  sides?: number;
  width?: number;
  wWidth?: number;
  ftsWidth?: number;
}

export interface RangeBorderOperand {
  cb?: number;
  range: ItcRange;
  border: BorderSpec;
  bordersToApply: number;
  extra?: Uint8Array;
}

export interface RangeValueOperand {
  cb?: number;
  range: ItcRange;
  value: number | boolean | unknown;
  extra?: Uint8Array;
}

export interface TableWidthOperand {
  ftsWidth?: number;
  width?: number;
  wWidth?: number;
}

export interface TInsertOperand {
  itcFirst?: number;
  ctc?: number;
  dxaCol?: number;
  [key: string]: unknown;
}

export interface TableState {
  styleId?: number;
  alignment: number;
  leftIndent: number;
  gapHalf: number;
  cantSplit: boolean;
  header: boolean;
  rowHeight: number;
  rtl: boolean;
  positionCode?: number;
  absLeft?: number;
  absTop?: number;
  distanceLeft?: number;
  distanceTop?: number;
  tableWidth?: TableWidthOperand;
  autoFit?: unknown;
  widthBefore?: unknown;
  widthAfter?: unknown;
  borders: TableBorders;
  defTable?: TDefTableOperand;
  operations: DecodedProperty[];
  [key: string]: unknown;
}

export interface TableCellMeta {
  index: number;
  width?: number;
  ftsWidth?: number;
  borders?: Record<string, BorderSpec>;
  merge?: number;
  vertMerge?: number;
  vertAlign?: number;
  fitText?: boolean;
  noWrap?: boolean;
  hideMark?: boolean;
  textFlow?: number;
  rightBoundary?: number;
  leftBoundary?: number;
  shading?: ShadingSpec;
  paddingTwips?: Partial<Record<'top' | 'left' | 'bottom' | 'right', number>>;
  spacingTwips?: Partial<Record<'top' | 'left' | 'bottom' | 'right', number>>;
}

export interface CharSegment {
  cpStart: number;
  cpEnd: number;
  text: string;
  state: CharState;
}

export interface ParagraphRange {
  cpStart: number;
  cpEnd: number;
  terminator: string;
  styleId: number;
  properties: DecodedProperty[];
}

export interface FieldInstructionHyperlink {
  type: 'hyperlink';
  href: string;
}

export interface FieldInstructionIncludePicture {
  type: 'includePicture';
  target: string;
}

export interface FieldInstructionRaw {
  type: 'embed' | 'link' | 'unknown';
  raw: string;
}

export type FieldInstruction = FieldInstructionHyperlink | FieldInstructionIncludePicture | FieldInstructionRaw;

export interface PicfSummary {
  pictureOffset: number;
  lcb: number;
  cbHeader: number;
  mm?: number;
  xExt?: number;
  yExt?: number;
  dxaGoalTwips?: number;
  dyaGoalTwips?: number;
  scaleXPermille?: number;
  scaleYPermille?: number;
  displayWidthTwips?: number;
  displayHeightTwips?: number;
}

export interface OfficeArtBlipMeta {
  recType?: number;
  recInstance?: number;
  fbseBlipType?: number;
  fbseMime?: string | null;
  fbseTag?: number;
  fbseSize?: number;
  fbseRefCount?: number;
  fbseDelayOffset?: number;
  fbseName?: string;
  fbseDelayStream?: string;
  blipIndex?: number;
  sourceShapeId?: number;
}

/** PICF / OfficeArt BLIP / linked-picture metadata used by the HTML renderer. */
export interface ImageAssetMeta extends PicfSummary, OfficeArtBlipMeta {
  linkedPath?: string;
  sourceKind?: 'embedded' | 'linked' | 'fallback';
  localExternal?: boolean;
  browserRenderable?: boolean;
  metafileCompressed?: boolean;
  metafileCompression?: number;
  metafileFilter?: number;
  metafileUncompressedSize?: number;
  metafileCompressedSize?: number;
  metafileOriginalByteLength?: number;
  metafileDecompressed?: boolean;
  vectorConverted?: boolean;
  vectorSourceMime?: string;
  vectorWidth?: number;
  vectorHeight?: number;
  vectorRecordCount?: number;
  fbseIndex?: number;
  dggOffset?: number;
  blipIndex?: number;
  sourceShapeId?: number;
}

export interface AttachmentAssetMeta {
  stream?: string;
  label?: string;
  originalPath?: string;
  tempPath?: string;
  dataSize?: number;
  sourceKind?: 'ole10-native' | 'package' | 'content' | 'unknown';
  [key: string]: unknown;
}

export interface ImageAsset {
  id: string;
  type: 'image';
  mime: string;
  bytes: Uint8Array;
  dataUrl: string;
  sourceUrl?: string;
  displayable?: boolean;
  meta?: ImageAssetMeta;
}

export interface AttachmentAsset {
  id: string;
  type: 'attachment';
  name: string;
  mime: string;
  bytes: Uint8Array;
  dataUrl: string;
  meta?: AttachmentAssetMeta;
}

export type MsDocAsset = ImageAsset | AttachmentAsset;

export interface ObjectPoolInfo {
  entry: CFBEntry;
  streams: CFBEntry[];
  displayName: string;
  attachment: AttachmentAsset | null;
  objectData: Uint8Array | null;
}

export interface TextInlineNode {
  type: 'text';
  text: string;
  style: CharState;
  href?: string;
}

export interface ImageInlineNode {
  type: 'image';
  asset: ImageAsset;
  style: CharState;
  href?: string;
}

export interface AttachmentInlineNode {
  type: 'attachment';
  asset: AttachmentAsset;
  style: CharState;
  href?: string;
}

export interface LineBreakInlineNode {
  type: 'lineBreak';
}

export interface PageBreakInlineNode {
  type: 'pageBreak';
}

export type InlineNode = TextInlineNode | ImageInlineNode | AttachmentInlineNode | LineBreakInlineNode | PageBreakInlineNode;

export interface ParagraphBlock {
  type: 'paragraph';
  id: string;
  styleId: number;
  styleName: string;
  paraState: ParaState;
  inlines: InlineNode[];
  text: string;
}

export interface TableCellBlock {
  id: string;
  paragraphs: ParagraphBlock[];
  meta: TableCellMeta | null;
  colIndex?: number;
  colspan?: number;
  rowspan?: number;
  hidden?: boolean;
}

export interface TableRowBlock {
  id: string;
  cells: TableCellBlock[];
  state: TableState;
  gridWidthTwips: number;
}

export interface TableBlock {
  type: 'table';
  id: string;
  depth: number;
  rows: TableRowBlock[];
  state: TableState;
  gridWidthTwips: number;
}

export interface AttachmentsBlock {
  type: 'attachments';
  id: string;
  items: AttachmentAsset[];
}

export type MsDocBlock = ParagraphBlock | TableBlock | AttachmentsBlock;

export interface ParagraphModel {
  id: string;
  cpStart: number;
  cpEnd: number;
  terminator: string;
  text: string;
  rawProperties: DecodedProperty[];
  styleId: number;
  styleName: string;
  paraProps: DecodedProperty[];
  paraState: ParaState;
  tableProps: DecodedProperty[];
  tableState: TableState;
  segments: CharSegment[];
  inlines: InlineNode[];
}

export interface MsDocParseOptions {
  maxPictureBytes?: number;
  [key: string]: unknown;
}

export interface MsDocRenderOptions {
  css?: string;
  /** External links are blocked by default; internal document bookmarks remain active. */
  externalLinkPolicy?: 'allow' | 'block';
  /** Linked image resources are blocked by default; embedded data/blob images remain available. */
  externalResourcePolicy?: 'allow' | 'block';
}

export interface MsDocMeta {
  fib: {
    wIdent: number;
    nFib: number;
    fWhichTblStm: number;
    fComplex: boolean;
    fEncrypted: boolean;
    ccpText: number;
  };
  counts: {
    paragraphs: number;
    blocks: number;
    assets: number;
    styles: number;
    fonts: number;
  };
}

export interface MsDocStyleSummary {
  istd: number;
  name: string;
  type?: number;
  basedOn?: number;
  next?: number;
}

export interface MsDocParseResult {
  kind: 'msdoc';
  version: number;
  warnings: MsDocWarning[];
  meta: MsDocMeta;
  fonts: FontInfo[];
  styles: MsDocStyleSummary[];
  blocks: MsDocBlock[];
  assets: MsDocAsset[];
}

export interface MsDocRenderResult {
  html: string;
  css: string;
  warnings: MsDocWarning[];
  meta: MsDocMeta;
  assets: MsDocAsset[];
  parsed: MsDocParseResult;
}

export interface MsDocParseToHtmlOptions {
  workerClient?: MsDocWorkerClientLike;
  parseOptions?: MsDocParseOptions;
  renderOptions?: MsDocRenderOptions;
}

export interface MsDocViewerConfig {
  workerClient?: MsDocWorkerClientLike;
  parseOptions?: MsDocParseOptions;
  renderOptions?: MsDocRenderOptions;
}

export interface MsDocViewerLoadOptions {
  workerClient?: MsDocWorkerClientLike;
  parseOptions?: MsDocParseOptions;
  renderOptions?: MsDocRenderOptions;
}

export interface MsDocViewer {
  load(input: ViewerInput, options?: MsDocViewerLoadOptions): Promise<MsDocRenderResult>;
  mount(rendered: MsDocRenderResult): HTMLElement;
  clear(): void;
  destroy(): void;
  readonly value: MsDocRenderResult | null;
}

export type ViewerInput = ArrayBuffer | ArrayBufferView | Blob | string;

export type WorkerRequestType = 'parse' | 'render' | 'parseToHtml';

export interface WorkerRequestMap {
  parse: { buffer: ArrayBuffer; options?: MsDocParseOptions };
  render: { parsed: MsDocParseResult; options?: MsDocRenderOptions };
  parseToHtml: { buffer: ArrayBuffer; options?: MsDocParseToHtmlOptions };
}

export interface WorkerResponse<T> {
  id: number;
  ok: boolean;
  result?: T;
  error?: string;
}

export interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  removeEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  terminate(): void;
}

export interface MsDocWorkerClientLike {
  parse(input: ArrayBuffer | ArrayBufferView, options?: MsDocParseOptions): Promise<MsDocParseResult>;
  render(parsed: MsDocParseResult, options?: MsDocRenderOptions): Promise<MsDocRenderResult>;
  parseToHtml(input: ArrayBuffer | ArrayBufferView, options?: MsDocParseToHtmlOptions): Promise<MsDocRenderResult>;
  destroy(): void;
}

export type CssStyleObject = Record<string, string | number | undefined>;
