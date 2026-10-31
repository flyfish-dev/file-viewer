/** Record identifiers from Microsoft [MS-PPT] 2.13 and [MS-ODRAW]. */
export const RT = {
    Document: 1000, DocumentAtom: 1001, EndDocumentAtom: 1002, Slide: 1006, SlideAtom: 1007,
    Notes: 1008, NotesAtom: 1009, Environment: 1010, SlidePersistAtom: 1011, MainMaster: 1016,
    SSSlideInfoAtom: 1017, SlideViewInfo: 1018, VBAInfo: 1023, DocInfoList: 2000,
    PPDrawingGroup: 1035, PPDrawing: 1036, List: 2000, FontCollection: 2005,
    TextHeaderAtom: 3999, TextCharsAtom: 4000, StyleTextPropAtom: 4001, TextMasterStyleAtom: 4003,
    TextCharFormatAtom: 4004, TextParagraphFormatAtom: 4005, TextRulerAtom: 4006, TextBookmarkAtom: 4007,
    TextBytesAtom: 4008, TextSpecInfoAtom: 4010, DefaultRulerAtom: 4011, FontEntityAtom: 4023,
    CString: 4026, ExternalObjectList: 1033, ExternalObjectRefAtom: 3009,
    SlideListWithText: 4080, UserEditAtom: 4085, CurrentUserAtom: 4086, DateTimeMCAtom: 4087,
    HeadersFooters: 4057, HeadersFootersAtom: 4058, ColorSchemeAtom: 2032,
    PersistDirectoryAtom: 6002, PersistDirectoryFullBlock: 6001, OfficeArtClientTextBox: 0xF00D,
    OfficeArtDggContainer: 0xF000, OfficeArtBStoreContainer: 0xF001, OfficeArtDgContainer: 0xF002,
    OfficeArtSpgrContainer: 0xF003, OfficeArtSpContainer: 0xF004, OfficeArtFSPGR: 0xF009,
    OfficeArtFSP: 0xF00A, OfficeArtFOPT: 0xF00B, OfficeArtClientAnchor: 0xF010,
    OfficeArtChildAnchor: 0xF00F, OfficeArtClientData: 0xF011, OfficeArtFBSE: 0xF007,
    OfficeArtSecondaryFOPT: 0xF121, OfficeArtTertiaryFOPT: 0xF122,
    OutlineTextRefAtom: 3998, OEPlaceholderAtom: 3011,
};
export const DEFAULT_LIMITS = Object.freeze({ maxFileBytes: 256 * 1024 * 1024, maxStreamBytes: 256 * 1024 * 1024, maxRecords: 1_000_000, maxDepth: 64, maxSlides: 10_000, maxShapes: 200_000, maxAssetBytes: 128 * 1024 * 1024, maxTextLength: 16 * 1024 * 1024 });
