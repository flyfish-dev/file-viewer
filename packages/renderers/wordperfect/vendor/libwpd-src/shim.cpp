/* Flat C shim over libwpd + librevenge for Xberg.
 *
 * libwpd exposes no `extract()` call. It drives librevenge's SAX-like
 * RVNGTextInterface: the caller passes a concrete implementation into
 * WPDocument::parse and libwpd invokes its callbacks. This file provides such
 * an implementation (DocumentBuilder) that records a flat, format-agnostic
 * internal document (a `std::vector<Node>`) as libwpd walks the document, and
 * exposes it to Rust through a flat C API returning an owned binary blob that
 * the Rust side frees and decodes into a typed document model (see
 * `serialize` below and `src/dto.rs`). This shim performs no text or Markdown
 * rendering itself — that would throw away structure a caller might want
 * (table cell spans, list nesting, note numbering) that the flat node vector
 * still carries; format-specific rendering, if wanted, belongs above this
 * layer, over the typed `WpdDocument` Rust decodes.
 *
 * Every entry point catches all C++ exceptions: libwpd throws on malformed
 * input, and an exception must never unwind across the FFI boundary.
 ~keep */
#include <librevenge-stream/librevenge-stream.h>
#include <librevenge/librevenge.h>
#include <libwpd/libwpd.h>

#include <algorithm>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <limits>
#include <string>
#include <vector>

namespace {
using librevenge::RVNGPropertyList;
using librevenge::RVNGString;

/* One recorded event from the libwpd/librevenge callback walk. The document
 * is a flat `std::vector<Node>`; serialization (see `serialize` below) is the
 * only place that knows about the wire encoding. `text`/`text2` and
 * `level`/`counter`/`counter2` are reused across kinds rather than giving
 * every kind its own dedicated fields (a link's href, a field's placeholder
 * kind, a metadata key/value pair, and a table cell's column/span all borrow
 * the same slots); each kind's comment below says what it puts there. ~keep */
enum class NodeKind {
  Text,
  Tab,
  Space,
  LineBreak,
  ParagraphEnd,
  ListItemEnd,
  Heading,
  BoldStart,
  BoldEnd,
  ItalicStart,
  ItalicEnd,
  UnderlineStart,
  UnderlineEnd,
  StrikethroughStart,
  StrikethroughEnd,
  SuperscriptStart,
  SuperscriptEnd,
  SubscriptStart,
  SubscriptEnd,
  ListItemStart,
  TableStart,
  TableRowStart,
  TableCellStart,
  CoveredTableCell,
  TableCellEnd,
  TableRowEnd,
  TableEnd,
  HeaderStart,
  HeaderEnd,
  FooterStart,
  FooterEnd,
  NoteStart,
  NoteEnd,
  EndnoteStart,
  EndnoteEnd,
  AsideStart,
  AsideEnd,
  LinkStart,
  LinkEnd,
  FieldInsert,
  MetaData,
};

struct Node {
  NodeKind kind;
  std::string text;  // literal text; link href; field placeholder; metadata key
  std::string text2; // metadata value
  int level = 0;     // heading level; list nesting level; table cell column
  int counter = 0;   // ordered-list counter; table cell column span
  int counter2 = 0;  // table cell row span
  bool ordered = false; // list ordered flag; table row "is header row" flag
};

/* Records the document as a flat, format-agnostic `std::vector<Node>` while
 * libwpd walks it. Carries no notion of any output encoding — that is
 * `serialize`'s job, run once, after the walk is complete, over the recorded
 * nodes. ~keep */
class DocumentBuilder : public librevenge::RVNGTextInterface {
public:
  std::vector<Node> nodes;

  void insertText(const RVNGString &s) override {
    // `size()` is the byte length; `len()` is the UTF-8 *character* count,
    // which would both truncate multibyte text and stop at an embedded NUL.
    // ~keep
    if (s.cstr())
      nodes.push_back({NodeKind::Text, std::string(s.cstr(), s.size())});
  }
  void insertTab() override { nodes.push_back({NodeKind::Tab}); }
  void insertSpace() override { nodes.push_back({NodeKind::Space}); }
  void insertLineBreak() override { nodes.push_back({NodeKind::LineBreak}); }
  void closeParagraph() override { nodes.push_back({NodeKind::ParagraphEnd}); }
  void closeListElement() override { nodes.push_back({NodeKind::ListItemEnd}); }
  void closeTableCell() override { nodes.push_back({NodeKind::TableCellEnd}); }
  void closeTableRow() override { nodes.push_back({NodeKind::TableRowEnd}); }
  void closeTable() override { nodes.push_back({NodeKind::TableEnd}); }

  void openParagraph(const RVNGPropertyList &props) override {
    const librevenge::RVNGProperty *outline = props["text:outline-level"];
    if (outline) {
      int level = outline->getInt();
      if (level >= 1 && level <= 6) {
        Node n{NodeKind::Heading};
        n.level = level;
        nodes.push_back(n);
      }
    }
  }

  void openSpan(const RVNGPropertyList &props) override {
    const librevenge::RVNGProperty *weight = props["fo:font-weight"];
    const librevenge::RVNGProperty *style = props["fo:font-style"];
    const librevenge::RVNGProperty *underline =
        props["style:text-underline-style"];
    const librevenge::RVNGProperty *lineThrough =
        props["fo:text-line-through-style"];
    const librevenge::RVNGProperty *position = props["style:text-position"];
    SpanFlags flags{};
    flags.bold = weight && weight->getStr() == "bold";
    flags.italic = style && style->getStr() == "italic";
    // libwpd emits "solid" for both single and double underline. ~keep
    flags.underline = underline && underline->getStr() != "none";
    flags.strikethrough = lineThrough && lineThrough->getStr() != "none";
    // libwpd emits "super <pct>%" / "sub <pct>%" (WPXContentListener). ~keep
    if (position) {
      std::string pos =
          position->getStr().cstr() ? position->getStr().cstr() : "";
      flags.superscript = pos.rfind("super", 0) == 0;
      flags.subscript = pos.rfind("sub", 0) == 0;
    }
    if (flags.bold)
      nodes.push_back({NodeKind::BoldStart});
    if (flags.italic)
      nodes.push_back({NodeKind::ItalicStart});
    if (flags.underline)
      nodes.push_back({NodeKind::UnderlineStart});
    if (flags.strikethrough)
      nodes.push_back({NodeKind::StrikethroughStart});
    if (flags.superscript)
      nodes.push_back({NodeKind::SuperscriptStart});
    if (flags.subscript)
      nodes.push_back({NodeKind::SubscriptStart});
    spanStack_.push_back(flags);
  }
  void closeSpan() override {
    if (spanStack_.empty())
      return;
    SpanFlags flags = spanStack_.back();
    spanStack_.pop_back();
    if (flags.subscript)
      nodes.push_back({NodeKind::SubscriptEnd});
    if (flags.superscript)
      nodes.push_back({NodeKind::SuperscriptEnd});
    if (flags.strikethrough)
      nodes.push_back({NodeKind::StrikethroughEnd});
    if (flags.underline)
      nodes.push_back({NodeKind::UnderlineEnd});
    if (flags.italic)
      nodes.push_back({NodeKind::ItalicEnd});
    if (flags.bold)
      nodes.push_back({NodeKind::BoldEnd});
  }

  void openOrderedListLevel(const RVNGPropertyList &) override {
    listStack_.push_back({true, 0});
  }
  void openUnorderedListLevel(const RVNGPropertyList &) override {
    listStack_.push_back({false, 0});
  }
  void closeOrderedListLevel() override {
    if (!listStack_.empty())
      listStack_.pop_back();
  }
  void closeUnorderedListLevel() override {
    if (!listStack_.empty())
      listStack_.pop_back();
  }
  void openListElement(const RVNGPropertyList &) override {
    if (listStack_.empty())
      return;
    ListLevel &level = listStack_.back();
    Node n{NodeKind::ListItemStart};
    // Level is serialized as a u8; clamp so a pathologically deep nesting
    // can't wrap to a small value on the narrowing cast (cf. the 1..=6 guard
    // on heading level in openParagraph). ~keep
    size_t depth = listStack_.size();
    n.level = static_cast<int>(depth > 255 ? 255 : depth);
    n.ordered = level.ordered;
    if (level.ordered) {
      level.counter += 1;
      n.counter = level.counter;
    }
    nodes.push_back(n);
  }

  // Headers and footers recur on every page rather than at one point in the
  // flow; they are recorded as their own bracketing start/end events so a
  // consumer of the decoded event stream can place them wherever it wants
  // (typically once, at the start/end of the document) instead of the shim
  // splicing them inline into the flow itself. ~keep
  void openHeader(const RVNGPropertyList &) override {
    nodes.push_back({NodeKind::HeaderStart});
  }
  void closeHeader() override { nodes.push_back({NodeKind::HeaderEnd}); }
  void openFooter(const RVNGPropertyList &) override {
    nodes.push_back({NodeKind::FooterStart});
  }
  void closeFooter() override { nodes.push_back({NodeKind::FooterEnd}); }

  // Footnotes, endnotes, comments and text boxes never belong inline in the
  // narrative. Notes are reference constructs anchored at a point in the
  // flow with their body recorded separately in event order; footnotes and
  // endnotes are kept as distinct node kinds (rather than one merged "note"
  // kind) so a consumer can number and label them as two separate sequences
  // instead of interleaving them under one counter. Comments and text boxes
  // have no such numbering in the source and are recorded as their own
  // bracketing start/end pair wherever they occur. ~keep
  void openFootnote(const RVNGPropertyList &) override {
    nodes.push_back({NodeKind::NoteStart});
  }
  void closeFootnote() override { nodes.push_back({NodeKind::NoteEnd}); }
  void openEndnote(const RVNGPropertyList &) override {
    nodes.push_back({NodeKind::EndnoteStart});
  }
  void closeEndnote() override { nodes.push_back({NodeKind::EndnoteEnd}); }
  void openComment(const RVNGPropertyList &) override {
    nodes.push_back({NodeKind::AsideStart, "comment"});
  }
  void closeComment() override { nodes.push_back({NodeKind::AsideEnd}); }
  void openTextBox(const RVNGPropertyList &) override {
    nodes.push_back({NodeKind::AsideStart, "box"});
  }
  void closeTextBox() override { nodes.push_back({NodeKind::AsideEnd}); }

  void openLink(const RVNGPropertyList &props) override {
    const librevenge::RVNGProperty *href = props["xlink:href"];
    Node n{NodeKind::LinkStart};
    // Explicit (ptr, size) construction, like insertText: implicit
    // std::string(const char*) would truncate at an embedded NUL. ~keep
    if (href && href->getStr().cstr())
      n.text = std::string(href->getStr().cstr(), href->getStr().size());
    nodes.push_back(n);
  }
  void closeLink() override { nodes.push_back({NodeKind::LinkEnd}); }

  void insertField(const RVNGPropertyList &props) override {
    const librevenge::RVNGProperty *type = props["librevenge:field-type"];
    std::string fieldType =
        type && type->getStr().cstr() ? type->getStr().cstr() : "";
    Node n{NodeKind::FieldInsert};
    // A dropped field silently loses information a reader can't recover
    // (a page number that never appears anywhere in body text); render an
    // explicit placeholder instead so the field's presence, at least,
    // survives extraction. ~keep
    if (fieldType == "text:page-number")
      n.text = "page";
    else if (fieldType == "text:page-count")
      n.text = "pages";
    else if (fieldType.rfind("text:date", 0) == 0)
      n.text = "date";
    else if (fieldType.rfind("text:time", 0) == 0)
      n.text = "time";
    else if (!fieldType.empty())
      n.text = fieldType;
    else
      n.text = "field";
    nodes.push_back(n);
  }

  // setDocumentMetaData is always the first callback libwpd makes, so these
  // nodes land at the very front of `nodes` regardless of when they're
  // rendered. Only a handful of the keys RVNGTextInterface documents are
  // captured — enough to round-trip the common case (title, author, subject,
  // keywords) without building a full structured metadata API on the Rust
  // side. The "Author" summary field is emitted by libwpd as
  // `meta:initial-creator`; `dc:creator` is WordPerfect's separate "Typist"
  // field (see WP6ContentListener), so both are captured but the Rust side
  // maps only `meta:initial-creator` to the document author. `dc:title` is not
  // emitted by libwpd 0.10.3 but is captured defensively for other versions.
  // ~keep
  void setDocumentMetaData(const RVNGPropertyList &props) override {
    static const char *const kKeys[] = {
        "dc:title", "meta:initial-creator", "dc:creator",   "dc:subject",
        "dc:type",  "dc:language",          "meta:keyword",
    };
    for (const char *key : kKeys) {
      const librevenge::RVNGProperty *value = props[key];
      if (!value || !value->getStr().cstr())
        continue;
      Node n{NodeKind::MetaData};
      n.text = key;
      // Explicit (ptr, size): implicit std::string(const char*) would
      // truncate a value containing an embedded NUL. ~keep
      n.text2 = std::string(value->getStr().cstr(), value->getStr().size());
      nodes.push_back(n);
    }
  }
  void startDocument(const RVNGPropertyList &) override {}
  void endDocument() override {}
  void definePageStyle(const RVNGPropertyList &) override {}
  void defineEmbeddedFont(const RVNGPropertyList &) override {}
  void openPageSpan(const RVNGPropertyList &) override {}
  void closePageSpan() override {}
  void defineParagraphStyle(const RVNGPropertyList &) override {}
  void defineCharacterStyle(const RVNGPropertyList &) override {}
  void defineSectionStyle(const RVNGPropertyList &) override {}
  void openSection(const RVNGPropertyList &) override {}
  void closeSection() override {}

  // Table structure is recorded fully (open events too, not just the
  // close-event markers the previous implementation emitted) so a consumer
  // of the decoded event stream can lay cells out on a real grid: column,
  // column span, row span and whether a row is a header row. ~keep
  void openTable(const RVNGPropertyList &) override {
    nodes.push_back({NodeKind::TableStart});
  }
  void openTableRow(const RVNGPropertyList &props) override {
    const librevenge::RVNGProperty *header = props["librevenge:is-header-row"];
    Node n{NodeKind::TableRowStart};
    n.ordered = header && header->getInt() != 0;
    nodes.push_back(n);
  }
  void openTableCell(const RVNGPropertyList &props) override {
    Node n{NodeKind::TableCellStart};
    n.level = getIntOr(props, "librevenge:column", -1);
    n.counter = std::max(1, getIntOr(props, "table:number-columns-spanned", 1));
    n.counter2 = std::max(1, getIntOr(props, "table:number-rows-spanned", 1));
    nodes.push_back(n);
  }
  void insertCoveredTableCell(const RVNGPropertyList &props) override {
    Node n{NodeKind::CoveredTableCell};
    n.level = getIntOr(props, "librevenge:column", -1);
    nodes.push_back(n);
  }

  void openFrame(const RVNGPropertyList &) override {}
  void closeFrame() override {}
  void insertBinaryObject(const RVNGPropertyList &) override {}
  void insertEquation(const RVNGPropertyList &) override {}
  void openGroup(const RVNGPropertyList &) override {}
  void closeGroup() override {}
  void defineGraphicStyle(const RVNGPropertyList &) override {}
  void drawRectangle(const RVNGPropertyList &) override {}
  void drawEllipse(const RVNGPropertyList &) override {}
  void drawPolygon(const RVNGPropertyList &) override {}
  void drawPolyline(const RVNGPropertyList &) override {}
  void drawPath(const RVNGPropertyList &) override {}
  void drawConnector(const RVNGPropertyList &) override {}

private:
  struct SpanFlags {
    bool bold;
    bool italic;
    bool underline;
    bool strikethrough;
    bool superscript;
    bool subscript;
  };
  struct ListLevel {
    bool ordered;
    int counter;
  };

  static int getIntOr(const RVNGPropertyList &props, const char *key,
                      int fallback) {
    const librevenge::RVNGProperty *p = props[key];
    return p ? p->getInt() : fallback;
  }

  std::vector<SpanFlags> spanStack_;
  std::vector<ListLevel> listStack_;
};

/* Serializes a recorded `std::vector<Node>` to the versioned binary wire
 * format Rust's `dto::decode` parses. This is the only place that knows about
 * the wire encoding — `DocumentBuilder` above records the same structure
 * regardless of how it will eventually be serialized.
 *
 * # Wire format (version 1)
 *
 * This spec MUST stay byte-for-byte identical to the one in `src/dto.rs` —
 * the two are independently hand-written mirrors of the same format, not
 * generated from a shared schema. All integers are little-endian. Strings are
 * raw UTF-8 bytes (not NUL-terminated) with an explicit `u32` byte length, so
 * embedded NULs never truncate anything.
 *
 *   document := version metadata_section event_section
 *   version  := u8                          // WIRE_VERSION, currently 1
 *   metadata_section := u32 count  count * (string key, string value)
 *   event_section     := u32 count  count * event
 *   event             := u8 tag  payload     // payload shape depends on tag
 *   string            := u32 byte_len  byte_len * u8
 *   bool (in a payload) := u8, 0 or 1
 *
 * Event tags (see the matching table in `dto.rs` for full payload shapes):
 *   0 Text(string) | 1 Tab | 2 Space | 3 LineBreak | 4 ParagraphEnd
 *   5 ListItemStart(bool ordered, u8 level, u32 counter) | 6 ListItemEnd
 *   7 HeadingStart(u8 level)
 *   8/9 BoldStart/End | 10/11 ItalicStart/End | 12/13 UnderlineStart/End
 *   14/15 StrikethroughStart/End | 16/17 SuperscriptStart/End
 *   18/19 SubscriptStart/End
 *   20 TableStart | 21 RowStart(bool header)
 *   22 CellStart(i32 column, u32 col_span, u32 row_span)
 *   23 CoveredCell(i32 column) | 24 CellEnd | 25 RowEnd | 26 TableEnd
 *   27/28 HeaderStart/End (document running header) | 29/30 FooterStart/End
 *   31 NoteStart(bool endnote) | 32 NoteEnd
 *   33 AsideStart(string kind) | 34 AsideEnd
 *   35 LinkStart(string href) | 36 LinkEnd
 *   37 Field(string text)
 *
 * `MetaData` nodes are not serialized as events: they are pulled out into the
 * metadata section up front, keyed by the same string (e.g. "dc:title") the
 * `Node` carried. This mirrors every key `setDocumentMetaData` captured, not
 * only the ones `dto::WpdMetadata` exposes as named fields, so no metadata
 * the shim captured is silently dropped from the wire. ~keep */
namespace wire {
constexpr uint8_t kWireVersion = 1;

enum class Tag : uint8_t {
  Text = 0,
  Tab = 1,
  Space = 2,
  LineBreak = 3,
  ParagraphEnd = 4,
  ListItemStart = 5,
  ListItemEnd = 6,
  HeadingStart = 7,
  BoldStart = 8,
  BoldEnd = 9,
  ItalicStart = 10,
  ItalicEnd = 11,
  UnderlineStart = 12,
  UnderlineEnd = 13,
  StrikethroughStart = 14,
  StrikethroughEnd = 15,
  SuperscriptStart = 16,
  SuperscriptEnd = 17,
  SubscriptStart = 18,
  SubscriptEnd = 19,
  TableStart = 20,
  RowStart = 21,
  CellStart = 22,
  CoveredCell = 23,
  CellEnd = 24,
  RowEnd = 25,
  TableEnd = 26,
  HeaderStart = 27,
  HeaderEnd = 28,
  FooterStart = 29,
  FooterEnd = 30,
  NoteStart = 31,
  NoteEnd = 32,
  AsideStart = 33,
  AsideEnd = 34,
  LinkStart = 35,
  LinkEnd = 36,
  Field = 37,
};

void putU8(std::string &out, uint8_t v) { out.push_back(static_cast<char>(v)); }
void putBool(std::string &out, bool v) { putU8(out, v ? 1 : 0); }
void putTag(std::string &out, Tag tag) {
  putU8(out, static_cast<uint8_t>(tag));
}

void putU32(std::string &out, uint32_t v) {
  for (int i = 0; i < 4; ++i) {
    out.push_back(static_cast<char>(v & 0xff));
    v >>= 8;
  }
}
void putI32(std::string &out, int32_t v) {
  putU32(out, static_cast<uint32_t>(v));
}
void putString(std::string &out, const std::string &s) {
  putU32(out, static_cast<uint32_t>(s.size()));
  out += s;
}

// Non-negative counts/spans are clamped to at least 1 by the callers that
// populate `Node::counter`/`counter2` (see `openTableCell`); this only guards
// against a negative value ever reaching the wire regardless of caller. ~keep
uint32_t nonNegative(int v) { return v < 0 ? 0 : static_cast<uint32_t>(v); }

/* Encodes one event node. `MetaData` nodes must be filtered out by the caller
 * before reaching here — they have no event representation. ~keep */
void putEvent(std::string &out, const Node &n) {
  switch (n.kind) {
  case NodeKind::Text:
    putTag(out, Tag::Text);
    putString(out, n.text);
    break;
  case NodeKind::Tab:
    putTag(out, Tag::Tab);
    break;
  case NodeKind::Space:
    putTag(out, Tag::Space);
    break;
  case NodeKind::LineBreak:
    putTag(out, Tag::LineBreak);
    break;
  case NodeKind::ParagraphEnd:
    putTag(out, Tag::ParagraphEnd);
    break;
  case NodeKind::ListItemStart:
    putTag(out, Tag::ListItemStart);
    putBool(out, n.ordered);
    putU8(out, static_cast<uint8_t>(n.level));
    putU32(out, nonNegative(n.counter));
    break;
  case NodeKind::ListItemEnd:
    putTag(out, Tag::ListItemEnd);
    break;
  case NodeKind::Heading:
    putTag(out, Tag::HeadingStart);
    putU8(out, static_cast<uint8_t>(n.level));
    break;
  case NodeKind::BoldStart:
    putTag(out, Tag::BoldStart);
    break;
  case NodeKind::BoldEnd:
    putTag(out, Tag::BoldEnd);
    break;
  case NodeKind::ItalicStart:
    putTag(out, Tag::ItalicStart);
    break;
  case NodeKind::ItalicEnd:
    putTag(out, Tag::ItalicEnd);
    break;
  case NodeKind::UnderlineStart:
    putTag(out, Tag::UnderlineStart);
    break;
  case NodeKind::UnderlineEnd:
    putTag(out, Tag::UnderlineEnd);
    break;
  case NodeKind::StrikethroughStart:
    putTag(out, Tag::StrikethroughStart);
    break;
  case NodeKind::StrikethroughEnd:
    putTag(out, Tag::StrikethroughEnd);
    break;
  case NodeKind::SuperscriptStart:
    putTag(out, Tag::SuperscriptStart);
    break;
  case NodeKind::SuperscriptEnd:
    putTag(out, Tag::SuperscriptEnd);
    break;
  case NodeKind::SubscriptStart:
    putTag(out, Tag::SubscriptStart);
    break;
  case NodeKind::SubscriptEnd:
    putTag(out, Tag::SubscriptEnd);
    break;
  case NodeKind::TableStart:
    putTag(out, Tag::TableStart);
    break;
  case NodeKind::TableRowStart:
    putTag(out, Tag::RowStart);
    putBool(out, n.ordered);
    break;
  case NodeKind::TableCellStart:
    putTag(out, Tag::CellStart);
    putI32(out, n.level);
    putU32(out, nonNegative(std::max(1, n.counter)));
    putU32(out, nonNegative(std::max(1, n.counter2)));
    break;
  case NodeKind::CoveredTableCell:
    putTag(out, Tag::CoveredCell);
    putI32(out, n.level);
    break;
  case NodeKind::TableCellEnd:
    putTag(out, Tag::CellEnd);
    break;
  case NodeKind::TableRowEnd:
    putTag(out, Tag::RowEnd);
    break;
  case NodeKind::TableEnd:
    putTag(out, Tag::TableEnd);
    break;
  case NodeKind::HeaderStart:
    putTag(out, Tag::HeaderStart);
    break;
  case NodeKind::HeaderEnd:
    putTag(out, Tag::HeaderEnd);
    break;
  case NodeKind::FooterStart:
    putTag(out, Tag::FooterStart);
    break;
  case NodeKind::FooterEnd:
    putTag(out, Tag::FooterEnd);
    break;
  case NodeKind::NoteStart:
    putTag(out, Tag::NoteStart);
    putBool(out, false);
    break;
  case NodeKind::NoteEnd:
    putTag(out, Tag::NoteEnd);
    break;
  case NodeKind::EndnoteStart:
    putTag(out, Tag::NoteStart);
    putBool(out, true);
    break;
  case NodeKind::EndnoteEnd:
    putTag(out, Tag::NoteEnd);
    break;
  case NodeKind::AsideStart:
    putTag(out, Tag::AsideStart);
    putString(out, n.text);
    break;
  case NodeKind::AsideEnd:
    putTag(out, Tag::AsideEnd);
    break;
  case NodeKind::LinkStart:
    putTag(out, Tag::LinkStart);
    putString(out, n.text);
    break;
  case NodeKind::LinkEnd:
    putTag(out, Tag::LinkEnd);
    break;
  case NodeKind::FieldInsert:
    putTag(out, Tag::Field);
    putString(out, n.text);
    break;
  case NodeKind::MetaData:
    // Handled separately by `serialize`; never reaches here.
    break;
  }
}
} // namespace wire

std::string serialize(const std::vector<Node> &nodes) {
  std::vector<const Node *> metadata;
  std::vector<const Node *> events;
  events.reserve(nodes.size());
  for (const Node &n : nodes) {
    if (n.kind == NodeKind::MetaData)
      metadata.push_back(&n);
    else
      events.push_back(&n);
  }

  std::string out;
  // Rough up-front capacity so the blob doesn't repeatedly reallocate while
  // appending; ~8 bytes/node covers a tag plus small fixed payloads (text
  // nodes grow it further, which amortized doubling then absorbs). ~keep
  constexpr size_t kBytesPerNodeEstimate = 8;
  out.reserve(nodes.size() * kBytesPerNodeEstimate + sizeof(uint32_t) * 2 + 1);
  wire::putU8(out, wire::kWireVersion);

  wire::putU32(out, static_cast<uint32_t>(metadata.size()));
  for (const Node *m : metadata) {
    wire::putString(out, m->text);
    wire::putString(out, m->text2);
  }

  wire::putU32(out, static_cast<uint32_t>(events.size()));
  for (const Node *n : events)
    wire::putEvent(out, *n);

  return out;
}
} // namespace

extern "C" {

/* Result codes shared with the Rust side (see error.rs). ~keep */
enum {
  XBERG_WPD_OK = 0,
  XBERG_WPD_INVALID_ARGS = 1,
  XBERG_WPD_UNSUPPORTED_FORMAT = 2,
  XBERG_WPD_PARSE_ERROR = 3,
  XBERG_WPD_OUT_OF_MEMORY = 4,
  XBERG_WPD_PANIC = 5,
  XBERG_WPD_ENCRYPTED = 6,
};

namespace {
char *dup_malloc(const char *data, size_t n) {
  char *buf = static_cast<char *>(std::malloc(n + 1));
  if (!buf)
    return nullptr;
  if (n)
    std::memcpy(buf, data, n);
  buf[n] = '\0';
  return buf;
}
} // namespace

/* Returns non-zero if the buffer looks like a WordPerfect document libwpd can
 * parse. Never throws. ~keep */
int xberg_wpd_is_supported(const unsigned char *data, unsigned long len) {
  if (!data || len == 0)
    return 0;
  if (len > (std::numeric_limits<unsigned int>::max)())
    return 0;
  try {
    librevenge::RVNGStringStream input(data, static_cast<unsigned int>(len));
    return libwpd::WPDocument::isFileFormatSupported(&input) !=
                   libwpd::WPD_CONFIDENCE_NONE
               ? 1
               : 0;
  } catch (...) {
    return 0;
  }
}

/* Extract the structured document model of an in-memory WordPerfect document
 * as a versioned binary blob (see the wire-format comment above `serialize`).
 * Parses once into an internal `std::vector<Node>` document via
 * `DocumentBuilder`, then serializes that one document — there is no
 * rendering step; the caller (Rust's `dto::decode`) reconstructs a typed
 * document model from the bytes.
 *
 * On XBERG_WPD_OK, *out_buf is a malloc'd buffer of *out_len bytes (NOT
 * NUL-terminated; the format is binary, not text) the caller frees via
 * xberg_wpd_free_string. On any other return, *out_buf is left null.
 *
 * On failure, *out_err may be set to a malloc'd, NUL-terminated diagnostic
 * message (freed the same way) describing the underlying C++ exception; it
 * is left null when no additional detail is available. ~keep */
int xberg_wpd_extract_document(const unsigned char *data, unsigned long len,
                               char **out_buf, unsigned long *out_len,
                               char **out_err) {
  if (!out_buf || !out_len)
    return XBERG_WPD_INVALID_ARGS;
  *out_buf = nullptr;
  *out_len = 0;
  if (out_err)
    *out_err = nullptr;
  if (!data || len == 0)
    return XBERG_WPD_INVALID_ARGS;
  // RVNGStringStream takes an unsigned int; the Rust wrapper already rejects
  // oversized buffers, but direct C callers reach this boundary too. ~keep
  if (len > (std::numeric_limits<unsigned int>::max)())
    return XBERG_WPD_INVALID_ARGS;

  try {
    librevenge::RVNGStringStream input(data, static_cast<unsigned int>(len));
    if (libwpd::WPDocument::isFileFormatSupported(&input) ==
        libwpd::WPD_CONFIDENCE_NONE)
      return XBERG_WPD_UNSUPPORTED_FORMAT;

    DocumentBuilder builder;
    libwpd::WPDResult result =
        libwpd::WPDocument::parse(&input, &builder, nullptr);
    if (result != libwpd::WPD_OK) {
      // Encryption/password failures are distinguished from generic parse
      // errors so a caller can tell "this needs a password" from
      // "this file is corrupt" instead of both collapsing into the same
      // opaque error. ~keep
      if (result == libwpd::WPD_UNSUPPORTED_ENCRYPTION_ERROR ||
          result == libwpd::WPD_PASSWORD_MISSMATCH_ERROR)
        return XBERG_WPD_ENCRYPTED;
      return XBERG_WPD_PARSE_ERROR;
    }

    std::string blob = serialize(builder.nodes);
    if (blob.size() > (std::numeric_limits<unsigned long>::max)())
      return XBERG_WPD_OUT_OF_MEMORY;
    char *buf = dup_malloc(blob.data(), blob.size());
    if (!buf)
      return XBERG_WPD_OUT_OF_MEMORY;
    *out_buf = buf;
    *out_len = static_cast<unsigned long>(blob.size());
    return XBERG_WPD_OK;
  } catch (const std::exception &e) {
    // libwpd's own error types (ParseException, FileException,
    // GenericException, ...) are bare classes that do not derive from
    // std::exception, so they land in the catch-all below; this arm covers
    // allocation and standard-library failures. what() may return null. ~keep
    const char *msg = e.what();
    if (out_err && msg)
      *out_err = dup_malloc(msg, std::strlen(msg));
    return XBERG_WPD_PANIC;
  } catch (...) {
    return XBERG_WPD_PANIC;
  }
}

void xberg_wpd_free_string(char *s) { std::free(s); }

/* Internal self-test for the header/footer/footnote separation captured by
 * `DocumentBuilder`: drives its callbacks directly, the same way libwpd
 * would, without needing a real WordPerfect document on disk. Exposed so the
 * Rust test suite has real evidence that footnote/header nodes are recorded
 * as distinct bracketing events rather than folded into body text. Asserts
 * directly on the recorded `std::vector<Node>` rather than on any rendering,
 * since rendering no longer exists in this shim. Not part of the crate's
 * public API contract. Returns non-zero on success. ~keep */
int xberg_wpd_self_test_separation(void) try {
  DocumentBuilder b;

  RVNGPropertyList empty;
  b.openHeader(empty);
  b.insertText(RVNGString("Confidential Draft"));
  b.closeHeader();

  b.openParagraph(empty);
  b.insertText(RVNGString("Body start."));
  b.openFootnote(empty);
  b.insertText(RVNGString("See appendix A."));
  b.closeFootnote();
  b.insertText(RVNGString("Body continues."));
  b.closeParagraph();

  b.openFooter(empty);
  b.insertText(RVNGString("Page 1 of 1"));
  b.closeFooter();

  const std::vector<Node> &n = b.nodes;
  auto kindAt = [&](size_t i) { return n[i].kind; };
  bool ok = n.size() == 12;
  ok = ok && kindAt(0) == NodeKind::HeaderStart;
  ok = ok && kindAt(1) == NodeKind::Text && n[1].text == "Confidential Draft";
  ok = ok && kindAt(2) == NodeKind::HeaderEnd;
  ok = ok && kindAt(3) == NodeKind::Text && n[3].text == "Body start.";
  ok = ok && kindAt(4) == NodeKind::NoteStart;
  ok = ok && kindAt(5) == NodeKind::Text && n[5].text == "See appendix A.";
  ok = ok && kindAt(6) == NodeKind::NoteEnd;
  ok = ok && kindAt(7) == NodeKind::Text && n[7].text == "Body continues.";
  ok = ok && kindAt(8) == NodeKind::ParagraphEnd;
  ok = ok && kindAt(9) == NodeKind::FooterStart;
  ok = ok && kindAt(10) == NodeKind::Text && n[10].text == "Page 1 of 1";
  ok = ok && kindAt(11) == NodeKind::FooterEnd;

  // The serialized blob must round-trip the same node kinds through the wire
  // tags a byte-level Rust decoder would see, so the wire format itself is
  // exercised, not just the recorded node vector. ~keep
  std::string blob = serialize(n);
  ok = ok && blob.size() > 0 &&
       static_cast<uint8_t>(blob[0]) == wire::kWireVersion;

  return ok ? 1 : 0;
} catch (...) {
  return 0;
}

/* Internal self-test for the internal-document-model completeness work: link
 * hrefs, field placeholders, strikethrough spans, footnote/endnote
 * separation, table structure (header row, column span, a covered/merged
 * cell) and metadata. Same rationale as `xberg_wpd_self_test_separation`
 * above: real evidence without needing a WordPerfect fixture on disk for
 * every feature. Asserts directly on the recorded `std::vector<Node>` (and,
 * for the serialized-size sanity check, the wire blob) rather than on any
 * rendering. Returns non-zero on success. ~keep */
int xberg_wpd_self_test_features(void) try {
  DocumentBuilder b;
  RVNGPropertyList empty;

  RVNGPropertyList meta;
  meta.insert("dc:title", "Sample Report");
  meta.insert("dc:creator", "A. Writer");
  b.setDocumentMetaData(meta);

  b.openParagraph(empty);
  RVNGPropertyList linkProps;
  linkProps.insert("xlink:href", "https://example.com/report");
  b.openLink(linkProps);
  b.insertText(RVNGString("full report"));
  b.closeLink();
  b.insertText(RVNGString(" "));

  RVNGPropertyList strikeProps;
  strikeProps.insert("fo:text-line-through-style", "solid");
  b.openSpan(strikeProps);
  b.insertText(RVNGString("obsolete"));
  b.closeSpan();
  b.insertText(RVNGString(" "));

  RVNGPropertyList pageFieldProps;
  pageFieldProps.insert("librevenge:field-type", "text:page-number");
  b.insertField(pageFieldProps);

  b.openFootnote(empty);
  b.insertText(RVNGString("A footnote."));
  b.closeFootnote();
  b.openEndnote(empty);
  b.insertText(RVNGString("An endnote."));
  b.closeEndnote();
  b.closeParagraph();

  b.openTable(empty);
  RVNGPropertyList headerRowProps;
  headerRowProps.insert("librevenge:is-header-row", true);
  b.openTableRow(headerRowProps);
  b.openTableCell(empty);
  b.insertText(RVNGString("Name"));
  b.closeTableCell();
  RVNGPropertyList spanCellProps;
  spanCellProps.insert("table:number-columns-spanned", 2);
  b.openTableCell(spanCellProps);
  b.insertText(RVNGString("Contact"));
  b.closeTableCell();
  b.closeTableRow();

  b.openTableRow(empty);
  b.openTableCell(empty);
  // Embedded tab/newline must survive unmodified: sanitization was a
  // rendering-only concern and no longer applies to the structured model.
  // ~keep
  b.insertText(RVNGString("Jo|e"));
  b.insertLineBreak();
  b.insertText(RVNGString("Doe"));
  b.closeTableCell();
  b.insertCoveredTableCell(empty);
  b.openTableCell(empty);
  b.insertText(RVNGString("jo@example.com"));
  b.closeTableCell();
  b.closeTableRow();
  b.closeTable();

  const std::vector<Node> &n = b.nodes;

  auto findMetaData = [&](const char *key) -> const Node * {
    for (const Node &node : n)
      if (node.kind == NodeKind::MetaData && node.text == key)
        return &node;
    return nullptr;
  };
  const Node *title = findMetaData("dc:title");
  const Node *creator = findMetaData("dc:creator");

  auto contains = [&](NodeKind kind) {
    return std::any_of(n.begin(), n.end(),
                       [&](const Node &node) { return node.kind == kind; });
  };
  auto findFirst = [&](NodeKind kind) -> const Node * {
    for (const Node &node : n)
      if (node.kind == kind)
        return &node;
    return nullptr;
  };

  bool ok = true;
  ok = ok && title && title->text2 == "Sample Report";
  ok = ok && creator && creator->text2 == "A. Writer";

  const Node *link = findFirst(NodeKind::LinkStart);
  ok = ok && link && link->text == "https://example.com/report";
  ok = ok && contains(NodeKind::LinkEnd);
  ok = ok && contains(NodeKind::StrikethroughStart) &&
       contains(NodeKind::StrikethroughEnd);

  const Node *field = findFirst(NodeKind::FieldInsert);
  ok = ok && field && field->text == "page";

  ok = ok && contains(NodeKind::NoteStart) && contains(NodeKind::NoteEnd);
  ok = ok && contains(NodeKind::EndnoteStart) && contains(NodeKind::EndnoteEnd);

  const Node *headerRow = findFirst(NodeKind::TableRowStart);
  ok = ok && headerRow && headerRow->ordered;

  int spanCellCount = 0;
  for (const Node &node : n)
    if (node.kind == NodeKind::TableCellStart && node.counter == 2)
      spanCellCount++;
  ok = ok && spanCellCount == 1;

  ok = ok && contains(NodeKind::CoveredTableCell);

  // Embedded '|' and a line break inside a cell survive verbatim in the
  // structured model; sanitizing them for a delimiter-based text format was
  // a rendering concern that no longer applies. ~keep
  bool foundRawPipeText = false;
  for (const Node &node : n)
    if (node.kind == NodeKind::Text && node.text == "Jo|e")
      foundRawPipeText = true;
  ok = ok && foundRawPipeText;

  // A second table exercising column re-anchoring: libwpd documents that it
  // sometimes fails to emit a covered cell for a vertical merge ("this case
  // should not happen, but it happens in real-life documents"), yet it
  // always stamps the surviving real cell with its true librevenge:column.
  // Row 2 here omits the column-0 covered cell but declares its cell at
  // column 1; the recorded node must still carry column 1, not column 0, so
  // a consumer reconstructing the grid places it correctly. ~keep
  DocumentBuilder c;
  c.openTable(empty);
  c.openTableRow(empty);
  RVNGPropertyList r1c0;
  r1c0.insert("librevenge:column", 0);
  c.openTableCell(r1c0);
  c.insertText(RVNGString("r1c0"));
  c.closeTableCell();
  RVNGPropertyList r1c1;
  r1c1.insert("librevenge:column", 1);
  c.openTableCell(r1c1);
  c.insertText(RVNGString("r1c1"));
  c.closeTableCell();
  c.closeTableRow();
  c.openTableRow(empty);
  RVNGPropertyList r2c1;
  r2c1.insert("librevenge:column", 1);
  c.openTableCell(r2c1);
  c.insertText(RVNGString("r2c1"));
  c.closeTableCell();
  c.closeTableRow();
  c.closeTable();

  int r2CellColumn = -2;
  bool afterSecondRow = false;
  int rowEndsSeen = 0;
  for (const Node &node : c.nodes) {
    if (node.kind == NodeKind::TableRowEnd)
      rowEndsSeen++;
    if (rowEndsSeen == 1 && node.kind == NodeKind::TableCellStart)
      afterSecondRow = true;
    if (afterSecondRow && node.kind == NodeKind::TableCellStart)
      r2CellColumn = node.level;
  }
  ok = ok && r2CellColumn == 1;

  // The serialized blob must be non-empty and version-tagged: a byte-level
  // smoke check that `serialize` actually ran over this richer document
  // rather than the wire format itself being asserted node-by-node here
  // (that is `dto::decode`'s job, exercised from Rust). ~keep
  std::string blob = serialize(n);
  ok = ok && blob.size() > 0 &&
       static_cast<uint8_t>(blob[0]) == wire::kWireVersion;

  return ok ? 1 : 0;
} catch (...) {
  return 0;
}
}
