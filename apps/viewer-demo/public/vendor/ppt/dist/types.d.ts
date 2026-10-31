/** Public model: page positions and absolute lengths use CSS pixels at 96 dpi.
 * Group child anchors/path coordinates remain local until their explicit mapping. */
export type BinaryInput = ArrayBuffer | ArrayBufferView;
export interface Diagnostic {
    code: string;
    severity: 'info' | 'warning' | 'error';
    message: string;
    offset?: number;
    slideId?: number;
    shapeId?: number;
    details?: Record<string, unknown>;
}
export interface ParseLimits {
    maxFileBytes: number;
    maxStreamBytes: number;
    maxRecords: number;
    maxDepth: number;
    maxSlides: number;
    maxShapes: number;
    maxAssetBytes: number;
    maxTextLength: number;
}
export interface ParseOptions {
    strict?: boolean;
    limits?: Partial<ParseLimits>; /** Used only to decrypt a password-protected input, never retained on the document. */
    password?: string;
}
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface Size {
    width: number;
    height: number;
}
export interface Insets {
    left: number;
    top: number;
    right: number;
    bottom: number;
}
export interface GradientStop {
    position: number;
    color: string;
    colorIndex?: number;
    opacity?: number;
}
export interface Paint {
    kind: 'none' | 'solid' | 'gradient' | 'image';
    color?: string;
    colorIndex?: number;
    opacity?: number;
    angle?: number;
    stops?: GradientStop[];
    assetId?: string;
    imageStyle?: 'pattern' | 'texture' | 'picture';
    backColor?: string;
    backColorIndex?: number;
    backOpacity?: number;
    tileWidth?: number;
    tileHeight?: number;
    gradientType?: 'linear' | 'radial' | 'rectangular' | 'shape';
    gradientCenter?: {
        x: number;
        y: number;
    };
    gradientRect?: Insets;
    rotateWithShape?: boolean;
    gradientScaled?: boolean;
}
export interface Stroke {
    color: string;
    colorIndex?: number;
    width: number;
    opacity?: number;
    dash?: number[];
    startArrow?: string;
    endArrow?: string;
    cap?: 'round' | 'square' | 'butt';
}
/** Separate OfficeArt paint operations, delimited by msopathEnd. */
export interface PptPathPart {
    path: string;
    noFill: boolean;
    noLine: boolean;
}
/** Offset shadow distances are CSS pixels in the drawing axes, independent of shape rotation. */
export interface Shadow {
    type: 0 | 1 | 2 | 3 | 4 | 5;
    color: string;
    colorIndex?: number;
    opacity: number;
    offsetX: number;
    offsetY: number;
    blur: number;
    secondOffsetX?: number;
    secondOffsetY?: number;
    highlightColor?: string;
    highlightColorIndex?: number;
    originX?: number;
    originY?: number;
    matrix?: [number, number, number, number];
    perspective?: {
        x: number;
        y: number;
        weight: number;
    };
    obscured?: boolean;
}
export interface TextStyle {
    fontId?: number;
    eastAsianFontId?: number;
    ansiFontId?: number;
    symbolFontId?: number;
    eastAsianFontFamily?: string;
    ansiFontFamily?: string;
    symbolFontFamily?: string;
    colorIndex?: number;
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    shadow?: boolean;
    emboss?: boolean;
    baseline?: number;
    language?: number;
    alternateLanguage?: number;
    letterSpacing?: number;
    hyperlink?: string;
}
export interface TextRun {
    text: string;
    style: TextStyle;
    sourceStart?: number;
    sourceEnd?: number;
}
/** spaceBeforePercent, spaceAfterPercent and bullet.sizePercent are ratios: 0.5 means 50%. */
export interface ParagraphStyle {
    alignment?: 'left' | 'center' | 'right' | 'justify' | 'distributed';
    marginLeft?: number;
    indent?: number;
    firstLinePosition?: number;
    spaceBefore?: number;
    spaceAfter?: number;
    spaceBeforePercent?: number;
    spaceAfterPercent?: number;
    defaultTabSize?: number;
    tabStops?: {
        position: number;
        alignment: 'left' | 'center' | 'right' | 'decimal';
        origin?: 'paragraph' | 'textFrame';
    }[];
    bulletEnabled?: boolean;
    fontAlignment?: number;
    wrapFlags?: number;
    wrapFlagsMask?: number;
    lineHeight?: number;
    lineHeightPoints?: number;
    bullet?: {
        text: string;
        fontFamily?: string;
        fontId?: number;
        color?: string;
        colorIndex?: number;
        size?: number;
        sizePercent?: number;
        useFont?: boolean;
        useColor?: boolean;
        useSize?: boolean;
    };
    direction?: 'ltr' | 'rtl';
}
export interface Paragraph {
    runs: TextRun[];
    style: ParagraphStyle;
    level: number;
}
/** A single stored UTF-16 metacharacter, resolved in the displayed slide's context. */
export interface TextField {
    position: number;
    type: 'slideNumber' | 'dateTime' | 'genericDate' | 'header' | 'footer';
    format?: number | string;
}
export interface TextFrame {
    paragraphs: Paragraph[];
    margins: Insets;
    verticalAlignment: 'top' | 'middle' | 'bottom';
    wrap: boolean;
    direction?: 'horizontal' | 'vertical' | 'vertical270';
    textType?: number;
    sourceText?: string;
    fields?: TextField[];
    autofit?: 'none' | 'shrink' | 'resize';
    fontScale?: number;
    lineSpacingScale?: number;
}
export interface PptHeaderFooter {
    showDate: boolean;
    useCurrentDate: boolean;
    useUserDate: boolean;
    showSlideNumber: boolean;
    showHeader: boolean;
    showFooter: boolean;
    format: number;
    userDate?: string;
    header?: string;
    footer?: string;
}
export interface PptFont {
    id: number;
    name: string;
    charset?: number;
}
export interface PptAsset {
    id: string;
    mimeType: string;
    bytes: Uint8Array;
    width?: number;
    height?: number;
    sourceOffset?: number;
    unsupported?: boolean;
}
export interface ShapeSource {
    offset: number;
    recordType: number;
    shapeType?: number;
    properties?: Record<string, number>;
    unsupportedProperties?: number[];
}
export interface PptWordArt {
    text: string;
    fontFamily: string;
    fontSize: number;
    spacing: number;
    bold?: boolean;
    italic?: boolean;
    alignment: 'left' | 'center' | 'right' | 'justify';
    warpPreset: number;
    adjustments: number[];
    vertical?: boolean;
}
export interface PptExtrusion {
    depth: number;
    forward: number;
    rotationX: number;
    rotationY: number;
    skewAngle: number;
    skewAmount: number;
    color: string;
    colorIndex?: number;
    ambient: number;
    diffuse: number;
    metallic: boolean;
    parallel: boolean;
    /** Perspective camera coordinates in pixels, relative to the saved shape origin. */
    camera?: {
        x: number;
        y: number;
        z: number;
    };
    /** Perspective origin displacement from shape center, in fractions of width/height. */
    origin?: {
        x: number;
        y: number;
    };
}
export interface PptShape {
    id: number;
    kind: 'shape' | 'image' | 'group' | 'unsupported';
    name?: string;
    bounds: Rect;
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    preset?: number;
    path?: string;
    pathParts?: PptPathPart[];
    pathBounds?: Rect;
    fill: Paint;
    line?: Stroke;
    shadow?: Shadow;
    text?: TextFrame;
    children?: PptShape[];
    groupBounds?: Rect;
    image?: {
        assetId: string;
        crop?: Insets;
        brightness?: number;
        contrast?: number;
    };
    placeholder?: {
        type: number;
        position: number;
    };
    hidden?: boolean;
    source?: ShapeSource;
    wordArt?: PptWordArt;
    extrusion?: PptExtrusion;
    hyperlink?: string;
    media?: {
        mediaId: number;
        kind: 'audio' | 'video';
        assetId?: string;
        posterAssetId?: string;
        loop?: boolean;
    };
}
export interface PptAnimationEffect {
    targetShapeId: number;
    kind: 'appear' | 'fade' | 'fly' | 'zoom';
    phase: 'entrance' | 'exit' | 'emphasis';
    trigger: 'click' | 'withPrevious' | 'afterPrevious';
    durationMs: number;
    delayMs?: number;
    direction?: 'left' | 'right' | 'up' | 'down';
    fromScale?: number;
    toScale?: number;
}
export interface PptSlide {
    id: number;
    persistId: number;
    index: number;
    name?: string;
    size: Size;
    masterId?: number;
    shapes: PptShape[];
    background: Paint;
    notes?: TextFrame[];
    hidden?: boolean;
    showMasterShapes?: boolean;
    colorScheme?: number[];
    headersFooters?: PptHeaderFooter;
    displayNumber?: number;
    layoutType?: number;
    suppressHeaderFooter?: boolean;
    transition?: {
        type: number;
        direction?: number;
        duration?: number;
        autoAdvanceAfterMs?: number;
        manualAdvance?: boolean;
        soundId?: number;
        soundEnabled?: boolean;
        loopSound?: boolean;
    };
    timeline?: {
        effects: PptAnimationEffect[];
    };
    unsupportedRecordTypes?: number[];
}
export interface ParseStats {
    inputBytes: number;
    streamBytes: number;
    recordCount: number;
    shapeCount: number;
    parseTimeMs: number;
    assetBytes: number;
}
export interface PptHyperlink {
    id: number;
    friendlyName?: string;
    target: string;
    location?: string;
    href?: string;
    blocked: boolean;
    sourceOffset: number;
}
export interface PptSound {
    id: number;
    name: string;
    extension?: string;
    builtinId?: number;
    assetId?: string;
    byteLength: number;
    sourceOffset: number;
}
export interface PptMedia {
    id: number;
    kind: 'audio' | 'video';
    sourceRecordType: number;
    path?: string;
    soundId?: number;
    durationMs?: number;
    loop: boolean;
    rewind: boolean;
    narration: boolean;
    sourceOffset: number;
}
export interface PptOleObject {
    assetId?: string;
    id: number;
    type: number;
    subType: number;
    drawAspect: number;
    storagePersistId: number;
    menuName?: string;
    progId?: string;
    clipboardName?: string;
    sourceOffset: number;
}
export interface PptComment {
    index: number;
    author: string;
    initials: string;
    text: string;
    createdAt?: string;
    position: {
        x: number;
        y: number;
    };
    slideId?: number;
    sourceOffset: number;
}
export interface PptDocumentExtras {
    hyperlinks: PptHyperlink[];
    sounds: PptSound[];
    media: PptMedia[];
    oleObjects: PptOleObject[];
    comments: PptComment[];
    animationRecordTypes: number[];
}
export interface PptDocument {
    extras?: PptDocumentExtras;
    format: 'ppt';
    version: string;
    size: Size;
    slides: PptSlide[];
    masters: PptSlide[];
    fonts: PptFont[];
    assets: PptAsset[];
    diagnostics: Diagnostic[];
    metadata: {
        title?: string;
        author?: string;
        subject?: string;
        firstSlideNumber?: number;
        omitTitlePlace?: boolean;
        slideCount: number;
        source: string;
    };
    stats: ParseStats;
}
export interface RecordNode {
    type: number;
    version: number;
    instance: number;
    offset: number;
    dataOffset: number;
    length: number;
    end: number;
    children: RecordNode[];
}
export interface TextContext {
    hyperlinkTargets?: Map<number, string>;
    bytes: Uint8Array;
    fonts: PptFont[];
    colors: number[];
    diagnostics: Diagnostic[];
    limits: ParseLimits;
    defaultStyle?: TextStyle;
    masterStyles?: Map<number, {
        paragraph: ParagraphStyle;
        character: TextStyle;
    }[]>;
}
export interface DrawingContext extends TextContext {
    assets: PptAsset[];
    pictureIds: Map<number, string>;
    slideTexts: TextFrame[];
    masterShapes?: PptShape[];
    drawingDefaults?: Record<string, number>;
    shapeCount: {
        value: number;
    };
    recordCount?: {
        value: number;
    };
}
export interface TextMeasure {
    width: number;
    ascent: number;
    descent: number; /** Normal baseline advance in CSS pixels, independent of glyph bounds. */
    lineHeight?: number;
}
export interface TextMeasurer {
    measure(text: string, style: TextStyle): TextMeasure;
    clear?(): void;
}
export interface RenderOptions {
    assetUrl?: (asset: PptAsset) => string | undefined;
    showUnsupported?: boolean;
    includeMaster?: boolean;
    className?: string;
    fieldDate?: Date;
    fieldLocale?: string;
    textLayout?: 'browser' | 'measured';
    textOutput?: 'html' | 'svg';
    textMeasurer?: TextMeasurer; /** Disable interactive HTML media controls for static SVG/Canvas snapshots. */
    mediaControls?: boolean;
}
export interface RenderResult {
    html: string;
    css: string;
    warnings: Diagnostic[];
}
export interface WorkerProgress {
    phase: 'parse' | 'complete';
    elapsedMs: number;
    slideCount?: number;
}
export interface ViewerOptions {
    worker?: boolean;
    workerUrl?: string | URL;
    parseOptions?: ParseOptions;
    renderOptions?: RenderOptions;
    onProgress?: (progress: WorkerProgress) => void;
    onSlideChange?: (index: number) => void;
    onPlaybackChange?: (state: PptPlaybackState) => void;
    onError?: (error: Error) => void;
}
export interface PptPlaybackState {
    enabled: boolean;
    playing: boolean;
    effectIndex: number;
    effectCount: number;
}
export interface PptViewer {
    load(input: Blob | BinaryInput): Promise<PptDocument>;
    goTo(index: number): void;
    next(): void;
    previous(): void;
    play(): void;
    pause(): void;
    advance(): void;
    setPlaybackEnabled(enabled: boolean): void;
    clear(): void;
    destroy(): void;
    readonly value: PptDocument | null;
    readonly slideIndex: number;
    readonly playbackState: PptPlaybackState;
}
