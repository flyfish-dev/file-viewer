/*!
 * @license @file-viewer/docx, derived from docx-preview
 * https://github.com/VolodymyrBaydalka/docxjs
 * Copyright Volodymyr Baydalka
 * Released under the Apache License 2.0. See LICENSE.
 * Bundled dependency notices: THIRD_PARTY_NOTICES.txt.
 */
(function () {
  'use strict';

  (() => {
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
      get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
    }) : x)(function(x) {
      if (typeof require !== "undefined") return require.apply(this, arguments);
      throw Error('Dynamic require of "' + x + '" is not supported');
    });
    var __commonJS = (cb, mod) => function __require2() {
      try {
        return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
      } catch (e) {
        throw mod = 0, e;
      }
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));

    // node_modules/@xmldom/xmldom/lib/conventions.js
    var require_conventions = __commonJS({
      "node_modules/@xmldom/xmldom/lib/conventions.js"(exports) {
        function find(list, predicate, ac) {
          if (ac === void 0) {
            ac = Array.prototype;
          }
          if (list && typeof ac.find === "function") {
            return ac.find.call(list, predicate);
          }
          for (var i = 0; i < list.length; i++) {
            if (hasOwn(list, i)) {
              var item = list[i];
              if (predicate.call(void 0, item, i, list)) {
                return item;
              }
            }
          }
        }
        function freeze(object, oc) {
          if (oc === void 0) {
            oc = Object;
          }
          if (oc && typeof oc.getOwnPropertyDescriptors === "function") {
            object = oc.create(null, oc.getOwnPropertyDescriptors(object));
          }
          return oc && typeof oc.freeze === "function" ? oc.freeze(object) : object;
        }
        function hasOwn(object, key) {
          return Object.prototype.hasOwnProperty.call(object, key);
        }
        function assign(target, source) {
          if (target === null || typeof target !== "object") {
            throw new TypeError("target is not an object");
          }
          for (var key in source) {
            if (hasOwn(source, key)) {
              target[key] = source[key];
            }
          }
          return target;
        }
        var HTML_BOOLEAN_ATTRIBUTES = freeze({
          allowfullscreen: true,
          async: true,
          autofocus: true,
          autoplay: true,
          checked: true,
          controls: true,
          default: true,
          defer: true,
          disabled: true,
          formnovalidate: true,
          hidden: true,
          ismap: true,
          itemscope: true,
          loop: true,
          multiple: true,
          muted: true,
          nomodule: true,
          novalidate: true,
          open: true,
          playsinline: true,
          readonly: true,
          required: true,
          reversed: true,
          selected: true
        });
        function isHTMLBooleanAttribute(name) {
          return hasOwn(HTML_BOOLEAN_ATTRIBUTES, name.toLowerCase());
        }
        var HTML_VOID_ELEMENTS = freeze({
          area: true,
          base: true,
          br: true,
          col: true,
          embed: true,
          hr: true,
          img: true,
          input: true,
          link: true,
          meta: true,
          param: true,
          source: true,
          track: true,
          wbr: true
        });
        function isHTMLVoidElement(tagName) {
          return hasOwn(HTML_VOID_ELEMENTS, tagName.toLowerCase());
        }
        var HTML_RAW_TEXT_ELEMENTS = freeze({
          script: false,
          style: false,
          textarea: true,
          title: true
        });
        function isHTMLRawTextElement(tagName) {
          var key = tagName.toLowerCase();
          return hasOwn(HTML_RAW_TEXT_ELEMENTS, key) && !HTML_RAW_TEXT_ELEMENTS[key];
        }
        function isHTMLEscapableRawTextElement(tagName) {
          var key = tagName.toLowerCase();
          return hasOwn(HTML_RAW_TEXT_ELEMENTS, key) && HTML_RAW_TEXT_ELEMENTS[key];
        }
        function isHTMLMimeType(mimeType) {
          return mimeType === MIME_TYPE.HTML;
        }
        function hasDefaultHTMLNamespace(mimeType) {
          return isHTMLMimeType(mimeType) || mimeType === MIME_TYPE.XML_XHTML_APPLICATION;
        }
        var MIME_TYPE = freeze({
          /**
           * `text/html`, the only mime type that triggers treating an XML document as HTML.
           *
           * @see https://www.iana.org/assignments/media-types/text/html IANA MimeType registration
           * @see https://en.wikipedia.org/wiki/HTML Wikipedia
           * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString MDN
           * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-domparser-parsefromstring
           *      WHATWG HTML Spec
           */
          HTML: "text/html",
          /**
           * `application/xml`, the standard mime type for XML documents.
           *
           * @see https://www.iana.org/assignments/media-types/application/xml IANA MimeType
           *      registration
           * @see https://tools.ietf.org/html/rfc7303#section-9.1 RFC 7303
           * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
           */
          XML_APPLICATION: "application/xml",
          /**
           * `text/xml`, an alias for `application/xml`.
           *
           * @see https://tools.ietf.org/html/rfc7303#section-9.2 RFC 7303
           * @see https://www.iana.org/assignments/media-types/text/xml IANA MimeType registration
           * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
           */
          XML_TEXT: "text/xml",
          /**
           * `application/xhtml+xml`, indicates an XML document that has the default HTML namespace,
           * but is parsed as an XML document.
           *
           * @see https://www.iana.org/assignments/media-types/application/xhtml+xml IANA MimeType
           *      registration
           * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument WHATWG DOM Spec
           * @see https://en.wikipedia.org/wiki/XHTML Wikipedia
           */
          XML_XHTML_APPLICATION: "application/xhtml+xml",
          /**
           * `image/svg+xml`,
           *
           * @see https://www.iana.org/assignments/media-types/image/svg+xml IANA MimeType registration
           * @see https://www.w3.org/TR/SVG11/ W3C SVG 1.1
           * @see https://en.wikipedia.org/wiki/Scalable_Vector_Graphics Wikipedia
           */
          XML_SVG_IMAGE: "image/svg+xml"
        });
        var _MIME_TYPES = Object.keys(MIME_TYPE).map(function(key) {
          return MIME_TYPE[key];
        });
        function isValidMimeType(mimeType) {
          return _MIME_TYPES.indexOf(mimeType) > -1;
        }
        var NAMESPACE = freeze({
          /**
           * The XHTML namespace.
           *
           * @see http://www.w3.org/1999/xhtml
           */
          HTML: "http://www.w3.org/1999/xhtml",
          /**
           * The SVG namespace.
           *
           * @see http://www.w3.org/2000/svg
           */
          SVG: "http://www.w3.org/2000/svg",
          /**
           * The `xml:` namespace.
           *
           * @see http://www.w3.org/XML/1998/namespace
           */
          XML: "http://www.w3.org/XML/1998/namespace",
          /**
           * The `xmlns:` namespace.
           *
           * @see https://www.w3.org/2000/xmlns/
           */
          XMLNS: "http://www.w3.org/2000/xmlns/"
        });
        exports.assign = assign;
        exports.find = find;
        exports.freeze = freeze;
        exports.HTML_BOOLEAN_ATTRIBUTES = HTML_BOOLEAN_ATTRIBUTES;
        exports.HTML_RAW_TEXT_ELEMENTS = HTML_RAW_TEXT_ELEMENTS;
        exports.HTML_VOID_ELEMENTS = HTML_VOID_ELEMENTS;
        exports.hasDefaultHTMLNamespace = hasDefaultHTMLNamespace;
        exports.hasOwn = hasOwn;
        exports.isHTMLBooleanAttribute = isHTMLBooleanAttribute;
        exports.isHTMLRawTextElement = isHTMLRawTextElement;
        exports.isHTMLEscapableRawTextElement = isHTMLEscapableRawTextElement;
        exports.isHTMLMimeType = isHTMLMimeType;
        exports.isHTMLVoidElement = isHTMLVoidElement;
        exports.isValidMimeType = isValidMimeType;
        exports.MIME_TYPE = MIME_TYPE;
        exports.NAMESPACE = NAMESPACE;
      }
    });

    // node_modules/@xmldom/xmldom/lib/errors.js
    var require_errors = __commonJS({
      "node_modules/@xmldom/xmldom/lib/errors.js"(exports) {
        var conventions = require_conventions();
        function extendError(constructor, writableName) {
          constructor.prototype = Object.create(Error.prototype, {
            constructor: { value: constructor },
            name: { value: constructor.name, enumerable: true, writable: writableName }
          });
        }
        var DOMExceptionName = conventions.freeze({
          /**
           * the default value as defined by the spec
           */
          Error: "Error",
          /**
           * @deprecated
           * Use RangeError instead.
           */
          IndexSizeError: "IndexSizeError",
          /**
           * @deprecated
           * Just to match the related static code, not part of the spec.
           */
          DomstringSizeError: "DomstringSizeError",
          HierarchyRequestError: "HierarchyRequestError",
          WrongDocumentError: "WrongDocumentError",
          InvalidCharacterError: "InvalidCharacterError",
          /**
           * @deprecated
           * Just to match the related static code, not part of the spec.
           */
          NoDataAllowedError: "NoDataAllowedError",
          NoModificationAllowedError: "NoModificationAllowedError",
          NotFoundError: "NotFoundError",
          NotSupportedError: "NotSupportedError",
          InUseAttributeError: "InUseAttributeError",
          InvalidStateError: "InvalidStateError",
          SyntaxError: "SyntaxError",
          InvalidModificationError: "InvalidModificationError",
          NamespaceError: "NamespaceError",
          /**
           * @deprecated
           * Use TypeError for invalid arguments,
           * "NotSupportedError" DOMException for unsupported operations,
           * and "NotAllowedError" DOMException for denied requests instead.
           */
          InvalidAccessError: "InvalidAccessError",
          /**
           * @deprecated
           * Just to match the related static code, not part of the spec.
           */
          ValidationError: "ValidationError",
          /**
           * @deprecated
           * Use TypeError instead.
           */
          TypeMismatchError: "TypeMismatchError",
          SecurityError: "SecurityError",
          NetworkError: "NetworkError",
          AbortError: "AbortError",
          /**
           * @deprecated
           * Just to match the related static code, not part of the spec.
           */
          URLMismatchError: "URLMismatchError",
          QuotaExceededError: "QuotaExceededError",
          TimeoutError: "TimeoutError",
          InvalidNodeTypeError: "InvalidNodeTypeError",
          DataCloneError: "DataCloneError",
          EncodingError: "EncodingError",
          NotReadableError: "NotReadableError",
          UnknownError: "UnknownError",
          ConstraintError: "ConstraintError",
          DataError: "DataError",
          TransactionInactiveError: "TransactionInactiveError",
          ReadOnlyError: "ReadOnlyError",
          VersionError: "VersionError",
          OperationError: "OperationError",
          NotAllowedError: "NotAllowedError",
          OptOutError: "OptOutError"
        });
        var DOMExceptionNames = Object.keys(DOMExceptionName);
        function isValidDomExceptionCode(value) {
          return typeof value === "number" && value >= 1 && value <= 25;
        }
        function endsWithError(value) {
          return typeof value === "string" && value.substring(value.length - DOMExceptionName.Error.length) === DOMExceptionName.Error;
        }
        function DOMException(messageOrCode, nameOrMessage) {
          if (isValidDomExceptionCode(messageOrCode)) {
            this.name = DOMExceptionNames[messageOrCode];
            this.message = nameOrMessage || "";
          } else {
            this.message = messageOrCode;
            this.name = endsWithError(nameOrMessage) ? nameOrMessage : DOMExceptionName.Error;
          }
          if (Error.captureStackTrace) Error.captureStackTrace(this, DOMException);
        }
        extendError(DOMException, true);
        Object.defineProperties(DOMException.prototype, {
          code: {
            enumerable: true,
            get: function() {
              var code = DOMExceptionNames.indexOf(this.name);
              if (isValidDomExceptionCode(code)) return code;
              return 0;
            }
          }
        });
        var ExceptionCode = {
          INDEX_SIZE_ERR: 1,
          DOMSTRING_SIZE_ERR: 2,
          HIERARCHY_REQUEST_ERR: 3,
          WRONG_DOCUMENT_ERR: 4,
          INVALID_CHARACTER_ERR: 5,
          NO_DATA_ALLOWED_ERR: 6,
          NO_MODIFICATION_ALLOWED_ERR: 7,
          NOT_FOUND_ERR: 8,
          NOT_SUPPORTED_ERR: 9,
          INUSE_ATTRIBUTE_ERR: 10,
          INVALID_STATE_ERR: 11,
          SYNTAX_ERR: 12,
          INVALID_MODIFICATION_ERR: 13,
          NAMESPACE_ERR: 14,
          INVALID_ACCESS_ERR: 15,
          VALIDATION_ERR: 16,
          TYPE_MISMATCH_ERR: 17,
          SECURITY_ERR: 18,
          NETWORK_ERR: 19,
          ABORT_ERR: 20,
          URL_MISMATCH_ERR: 21,
          QUOTA_EXCEEDED_ERR: 22,
          TIMEOUT_ERR: 23,
          INVALID_NODE_TYPE_ERR: 24,
          DATA_CLONE_ERR: 25
        };
        var entries = Object.entries(ExceptionCode);
        for (i = 0; i < entries.length; i++) {
          key = entries[i][0];
          DOMException[key] = entries[i][1];
        }
        var key;
        var i;
        function ParseError(message, locator, cause) {
          this.message = message;
          this.locator = locator;
          this.cause = cause;
          if (Error.captureStackTrace) Error.captureStackTrace(this, ParseError);
        }
        extendError(ParseError);
        exports.DOMException = DOMException;
        exports.DOMExceptionName = DOMExceptionName;
        exports.ExceptionCode = ExceptionCode;
        exports.ParseError = ParseError;
      }
    });

    // node_modules/@xmldom/xmldom/lib/grammar.js
    var require_grammar = __commonJS({
      "node_modules/@xmldom/xmldom/lib/grammar.js"(exports) {
        function detectUnicodeSupport(RegExpImpl) {
          try {
            if (typeof RegExpImpl !== "function") {
              RegExpImpl = RegExp;
            }
            var match = new RegExpImpl("\u{1D306}", "u").exec("\u{1D306}");
            return !!match && match[0].length === 2;
          } catch (error) {
          }
          return false;
        }
        var UNICODE_SUPPORT = detectUnicodeSupport();
        function chars(regexp) {
          if (regexp.source[0] !== "[") {
            throw new Error(regexp + " can not be used with chars");
          }
          return regexp.source.slice(1, regexp.source.lastIndexOf("]"));
        }
        function chars_without(regexp, search) {
          if (regexp.source[0] !== "[") {
            throw new Error("/" + regexp.source + "/ can not be used with chars_without");
          }
          if (!search || typeof search !== "string") {
            throw new Error(JSON.stringify(search) + " is not a valid search");
          }
          if (regexp.source.indexOf(search) === -1) {
            throw new Error('"' + search + '" is not is /' + regexp.source + "/");
          }
          if (search === "-" && regexp.source.indexOf(search) !== 1) {
            throw new Error('"' + search + '" is not at the first postion of /' + regexp.source + "/");
          }
          return new RegExp(regexp.source.replace(search, ""), UNICODE_SUPPORT ? "u" : "");
        }
        function reg(args) {
          var self2 = this;
          return new RegExp(
            Array.prototype.slice.call(arguments).map(function(part) {
              var isStr = typeof part === "string";
              if (isStr && self2 === void 0 && part === "|") {
                throw new Error("use regg instead of reg to wrap expressions with `|`!");
              }
              return isStr ? part : part.source;
            }).join(""),
            UNICODE_SUPPORT ? "u" : ""
          );
        }
        function regg(args) {
          if (arguments.length === 0) {
            throw new Error("no parameters provided");
          }
          return reg.apply(regg, ["(?:"].concat(Array.prototype.slice.call(arguments), [")"]));
        }
        var UNICODE_REPLACEMENT_CHARACTER = "\uFFFD";
        var Char = /[-\x09\x0A\x0D\x20-\x2C\x2E-\uD7FF\uE000-\uFFFD]/;
        if (UNICODE_SUPPORT) {
          Char = reg("[", chars(Char), "\\u{10000}-\\u{10FFFF}", "]");
        }
        var InvalidChar = new RegExp("[^" + chars(Char) + "]", UNICODE_SUPPORT ? "u" : "");
        var _SChar = /[\x20\x09\x0D\x0A]/;
        var SChar_s = chars(_SChar);
        var S = reg(_SChar, "+");
        var S_OPT = reg(_SChar, "*");
        var NameStartChar = /[:_a-zA-Z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
        if (UNICODE_SUPPORT) {
          NameStartChar = reg("[", chars(NameStartChar), "\\u{10000}-\\u{10FFFF}", "]");
        }
        var NameStartChar_s = chars(NameStartChar);
        var NameChar = reg("[", NameStartChar_s, chars(/[-.0-9\xB7]/), chars(/[\u0300-\u036F\u203F-\u2040]/), "]");
        var Name = reg(NameStartChar, NameChar, "*");
        var Name_exact = reg("^", Name, "$");
        var Nmtoken = reg(NameChar, "+");
        var EntityRef = reg("&", Name, ";");
        var CharRef = regg(/&#[0-9]+;|&#x[0-9a-fA-F]+;/);
        var Reference = regg(EntityRef, "|", CharRef);
        var PEReference = reg("%", Name, ";");
        var EntityValue = regg(
          reg('"', regg(/[^%&"]/, "|", PEReference, "|", Reference), "*", '"'),
          "|",
          reg("'", regg(/[^%&']/, "|", PEReference, "|", Reference), "*", "'")
        );
        var AttValue = regg('"', regg(/[^<&"]/, "|", Reference), "*", '"', "|", "'", regg(/[^<&']/, "|", Reference), "*", "'");
        var NCNameStartChar = chars_without(NameStartChar, ":");
        var NCNameChar = chars_without(NameChar, ":");
        var NCName = reg(NCNameStartChar, NCNameChar, "*");
        var NCName_exact = reg("^", NCName, "$");
        var QName = reg(NCName, regg(":", NCName), "?");
        var QName_exact = reg("^", QName, "$");
        var QName_group = reg("(", QName, ")");
        var SystemLiteral = regg(/"[^"]*"|'[^']*'/);
        var PI = reg(/^<\?/, "(", Name, ")", regg(S, "(?!", _SChar, ")(", Char, "*?)"), "?", /\?>/);
        var PubidChar = /[\x20\x0D\x0Aa-zA-Z0-9-'()+,./:=?;!*#@$_%]/;
        var PubidLiteral = regg('"', PubidChar, '*"', "|", "'", chars_without(PubidChar, "'"), "*'");
        var COMMENT_START = "<!--";
        var COMMENT_END = "-->";
        var Comment = reg(COMMENT_START, regg(chars_without(Char, "-"), "|", reg("-", chars_without(Char, "-"))), "*", COMMENT_END);
        var PCDATA = "#PCDATA";
        var Mixed = regg(
          reg(/\(/, S_OPT, PCDATA, regg(S_OPT, /\|/, S_OPT, QName), "*", S_OPT, /\)\*/),
          "|",
          reg(/\(/, S_OPT, PCDATA, S_OPT, /\)/)
        );
        var _children_quantity = /[?*+]?/;
        var children = reg(
          /\([^>]+\)/,
          _children_quantity
          /*regg(choice, '|', seq), _children_quantity*/
        );
        var contentspec = regg("EMPTY", "|", "ANY", "|", Mixed, "|", children);
        var ELEMENTDECL_START = "<!ELEMENT";
        var elementdecl = reg(ELEMENTDECL_START, S, regg(QName, "|", PEReference), S, regg(contentspec, "|", PEReference), S_OPT, ">");
        var NotationType = reg("NOTATION", S, /\(/, S_OPT, Name, regg(S_OPT, /\|/, S_OPT, Name), "*", S_OPT, /\)/);
        var Enumeration = reg(/\(/, S_OPT, Nmtoken, regg(S_OPT, /\|/, S_OPT, Nmtoken), "*", S_OPT, /\)/);
        var EnumeratedType = regg(NotationType, "|", Enumeration);
        var AttType = regg(/CDATA|ID|IDREF|IDREFS|ENTITY|ENTITIES|NMTOKEN|NMTOKENS/, "|", EnumeratedType);
        var DefaultDecl = regg(/#REQUIRED|#IMPLIED/, "|", regg(regg("#FIXED", S), "?", AttValue));
        var AttDef = regg(S, Name, S, AttType, S, DefaultDecl);
        var ATTLIST_DECL_START = "<!ATTLIST";
        var AttlistDecl = reg(ATTLIST_DECL_START, S, Name, AttDef, "*", S_OPT, ">");
        var ABOUT_LEGACY_COMPAT = "about:legacy-compat";
        var ABOUT_LEGACY_COMPAT_SystemLiteral = regg('"' + ABOUT_LEGACY_COMPAT + '"', "|", "'" + ABOUT_LEGACY_COMPAT + "'");
        var SYSTEM = "SYSTEM";
        var PUBLIC = "PUBLIC";
        var ExternalID = regg(regg(SYSTEM, S, SystemLiteral), "|", regg(PUBLIC, S, PubidLiteral, S, SystemLiteral));
        var ExternalID_match = reg(
          "^",
          regg(
            regg(SYSTEM, S, "(?<SystemLiteralOnly>", SystemLiteral, ")"),
            "|",
            regg(PUBLIC, S, "(?<PubidLiteral>", PubidLiteral, ")", S, "(?<SystemLiteral>", SystemLiteral, ")")
          )
        );
        var PubidLiteral_match = reg("^", PubidLiteral, "$");
        var SystemLiteral_match = reg("^", SystemLiteral, "$");
        var NDataDecl = regg(S, "NDATA", S, Name);
        var EntityDef = regg(EntityValue, "|", regg(ExternalID, NDataDecl, "?"));
        var ENTITY_DECL_START = "<!ENTITY";
        var GEDecl = reg(ENTITY_DECL_START, S, Name, S, EntityDef, S_OPT, ">");
        var PEDef = regg(EntityValue, "|", ExternalID);
        var PEDecl = reg(ENTITY_DECL_START, S, "%", S, Name, S, PEDef, S_OPT, ">");
        var EntityDecl = regg(GEDecl, "|", PEDecl);
        var PublicID = reg(PUBLIC, S, PubidLiteral);
        var NotationDecl = reg("<!NOTATION", S, Name, S, regg(ExternalID, "|", PublicID), S_OPT, ">");
        var Eq = reg(S_OPT, "=", S_OPT);
        var VersionNum = /1[.]\d+/;
        var VersionInfo = reg(S, "version", Eq, regg("'", VersionNum, "'", "|", '"', VersionNum, '"'));
        var EncName = /[A-Za-z][-A-Za-z0-9._]*/;
        var EncodingDecl = regg(S, "encoding", Eq, regg('"', EncName, '"', "|", "'", EncName, "'"));
        var SDDecl = regg(S, "standalone", Eq, regg("'", regg("yes", "|", "no"), "'", "|", '"', regg("yes", "|", "no"), '"'));
        var XMLDecl = reg(/^<\?xml/, VersionInfo, EncodingDecl, "?", SDDecl, "?", S_OPT, /\?>/);
        var DOCTYPE_DECL_START = "<!DOCTYPE";
        var CDATA_START = "<![CDATA[";
        var CDATA_END = "]]>";
        var CDStart = /<!\[CDATA\[/;
        var CDEnd = /\]\]>/;
        var CData = reg(Char, "*?", CDEnd);
        var CDSect = reg(CDStart, CData);
        exports.chars = chars;
        exports.chars_without = chars_without;
        exports.detectUnicodeSupport = detectUnicodeSupport;
        exports.reg = reg;
        exports.regg = regg;
        exports.ABOUT_LEGACY_COMPAT = ABOUT_LEGACY_COMPAT;
        exports.ABOUT_LEGACY_COMPAT_SystemLiteral = ABOUT_LEGACY_COMPAT_SystemLiteral;
        exports.AttlistDecl = AttlistDecl;
        exports.CDATA_START = CDATA_START;
        exports.CDATA_END = CDATA_END;
        exports.CDSect = CDSect;
        exports.Char = Char;
        exports.Comment = Comment;
        exports.COMMENT_START = COMMENT_START;
        exports.COMMENT_END = COMMENT_END;
        exports.DOCTYPE_DECL_START = DOCTYPE_DECL_START;
        exports.elementdecl = elementdecl;
        exports.EntityDecl = EntityDecl;
        exports.EntityValue = EntityValue;
        exports.ExternalID = ExternalID;
        exports.ExternalID_match = ExternalID_match;
        exports.Name = Name;
        exports.Name_exact = Name_exact;
        exports.NCName_exact = NCName_exact;
        exports.NotationDecl = NotationDecl;
        exports.Reference = Reference;
        exports.PEReference = PEReference;
        exports.PI = PI;
        exports.PUBLIC = PUBLIC;
        exports.PubidLiteral = PubidLiteral;
        exports.PubidLiteral_match = PubidLiteral_match;
        exports.QName = QName;
        exports.QName_exact = QName_exact;
        exports.QName_group = QName_group;
        exports.S = S;
        exports.SChar_s = SChar_s;
        exports.S_OPT = S_OPT;
        exports.SYSTEM = SYSTEM;
        exports.SystemLiteral = SystemLiteral;
        exports.SystemLiteral_match = SystemLiteral_match;
        exports.InvalidChar = InvalidChar;
        exports.UNICODE_REPLACEMENT_CHARACTER = UNICODE_REPLACEMENT_CHARACTER;
        exports.UNICODE_SUPPORT = UNICODE_SUPPORT;
        exports.XMLDecl = XMLDecl;
      }
    });

    // node_modules/@xmldom/xmldom/lib/dom.js
    var require_dom = __commonJS({
      "node_modules/@xmldom/xmldom/lib/dom.js"(exports) {
        var conventions = require_conventions();
        var find = conventions.find;
        var hasDefaultHTMLNamespace = conventions.hasDefaultHTMLNamespace;
        var hasOwn = conventions.hasOwn;
        var isHTMLMimeType = conventions.isHTMLMimeType;
        var isHTMLRawTextElement = conventions.isHTMLRawTextElement;
        var isHTMLVoidElement = conventions.isHTMLVoidElement;
        var MIME_TYPE = conventions.MIME_TYPE;
        var NAMESPACE = conventions.NAMESPACE;
        var PDC = /* @__PURE__ */ Symbol();
        var errors = require_errors();
        var DOMException = errors.DOMException;
        var DOMExceptionName = errors.DOMExceptionName;
        var g = require_grammar();
        function checkSymbol(symbol) {
          if (symbol !== PDC) {
            throw new TypeError("Illegal constructor");
          }
        }
        function notEmptyString(input) {
          return input !== "";
        }
        function splitOnASCIIWhitespace(input) {
          return input ? input.split(/[\t\n\f\r ]+/).filter(notEmptyString) : [];
        }
        function orderedSetReducer(current, element) {
          if (!hasOwn(current, element)) {
            current[element] = true;
          }
          return current;
        }
        function toOrderedSet(input) {
          if (!input) return [];
          var list = splitOnASCIIWhitespace(input);
          return Object.keys(list.reduce(orderedSetReducer, {}));
        }
        function arrayIncludes(list) {
          return function(element) {
            return list && list.indexOf(element) !== -1;
          };
        }
        function validateQualifiedName(qualifiedName) {
          if (!g.QName_exact.test(qualifiedName)) {
            throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'invalid character in qualified name "' + qualifiedName + '"');
          }
        }
        function validateAndExtract(namespace, qualifiedName) {
          validateQualifiedName(qualifiedName);
          namespace = namespace || null;
          var prefix = null;
          var localName = qualifiedName;
          if (qualifiedName.indexOf(":") >= 0) {
            var splitResult = qualifiedName.split(":");
            prefix = splitResult[0];
            localName = splitResult[1];
          }
          if (prefix !== null && namespace === null) {
            throw new DOMException(DOMException.NAMESPACE_ERR, "prefix is non-null and namespace is null");
          }
          if (prefix === "xml" && namespace !== conventions.NAMESPACE.XML) {
            throw new DOMException(DOMException.NAMESPACE_ERR, 'prefix is "xml" and namespace is not the XML namespace');
          }
          if ((prefix === "xmlns" || qualifiedName === "xmlns") && namespace !== conventions.NAMESPACE.XMLNS) {
            throw new DOMException(
              DOMException.NAMESPACE_ERR,
              'either qualifiedName or prefix is "xmlns" and namespace is not the XMLNS namespace'
            );
          }
          if (namespace === conventions.NAMESPACE.XMLNS && prefix !== "xmlns" && qualifiedName !== "xmlns") {
            throw new DOMException(
              DOMException.NAMESPACE_ERR,
              'namespace is the XMLNS namespace and neither qualifiedName nor prefix is "xmlns"'
            );
          }
          return [namespace, prefix, localName];
        }
        function copy(src, dest) {
          for (var p in src) {
            if (hasOwn(src, p)) {
              dest[p] = src[p];
            }
          }
        }
        function _extends(Class, Super) {
          var pt = Class.prototype;
          if (!(pt instanceof Super)) {
            let t = function() {
            };
            t.prototype = Super.prototype;
            t = new t();
            copy(pt, t);
            Class.prototype = pt = t;
          }
          if (pt.constructor != Class) {
            if (typeof Class != "function") {
              console.error("unknown Class:" + Class);
            }
            pt.constructor = Class;
          }
        }
        var NodeType = {};
        var ELEMENT_NODE = NodeType.ELEMENT_NODE = 1;
        var ATTRIBUTE_NODE = NodeType.ATTRIBUTE_NODE = 2;
        var TEXT_NODE = NodeType.TEXT_NODE = 3;
        var CDATA_SECTION_NODE = NodeType.CDATA_SECTION_NODE = 4;
        var ENTITY_REFERENCE_NODE = NodeType.ENTITY_REFERENCE_NODE = 5;
        var ENTITY_NODE = NodeType.ENTITY_NODE = 6;
        var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
        var COMMENT_NODE = NodeType.COMMENT_NODE = 8;
        var DOCUMENT_NODE = NodeType.DOCUMENT_NODE = 9;
        var DOCUMENT_TYPE_NODE = NodeType.DOCUMENT_TYPE_NODE = 10;
        var DOCUMENT_FRAGMENT_NODE = NodeType.DOCUMENT_FRAGMENT_NODE = 11;
        var NOTATION_NODE = NodeType.NOTATION_NODE = 12;
        var DocumentPosition = conventions.freeze({
          DOCUMENT_POSITION_DISCONNECTED: 1,
          DOCUMENT_POSITION_PRECEDING: 2,
          DOCUMENT_POSITION_FOLLOWING: 4,
          DOCUMENT_POSITION_CONTAINS: 8,
          DOCUMENT_POSITION_CONTAINED_BY: 16,
          DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32
        });
        function commonAncestor(a, b) {
          if (b.length < a.length) return commonAncestor(b, a);
          var c = null;
          for (var n in a) {
            if (a[n] !== b[n]) return c;
            c = a[n];
          }
          return c;
        }
        function docGUID(doc) {
          if (!doc.guid) doc.guid = Math.random();
          return doc.guid;
        }
        function NodeList() {
        }
        NodeList.prototype = {
          /**
           * The number of nodes in the list. The range of valid child node indices is 0 to length-1
           * inclusive.
           *
           * @type {number}
           */
          length: 0,
          /**
           * Returns the item at `index`. If index is greater than or equal to the number of nodes in
           * the list, this returns null.
           *
           * @param index
           * Unsigned long Index into the collection.
           * @returns {Node | null}
           * The node at position `index` in the NodeList,
           * or null if that is not a valid index.
           */
          item: function(index) {
            return index >= 0 && index < this.length ? this[index] : null;
          },
          /**
           * Returns a string representation of the NodeList.
           *
           * Accepts the same `options` object as `XMLSerializer.prototype.serializeToString`
           * (`requireWellFormed`, `splitCDATASections`, `nodeFilter`). Passing a function is treated as
           * a legacy `nodeFilter` for backward compatibility.
           *
           * @param {Object | function} [options]
           * @param {boolean} [options.requireWellFormed=false]
           * @param {boolean} [options.splitCDATASections=true]
           * @param {function} [options.nodeFilter]
           * @returns {string}
           */
          toString: function(options) {
            var opts;
            if (typeof options === "function") {
              opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: options };
            } else if (!!options) {
              opts = {
                requireWellFormed: !!options.requireWellFormed,
                splitCDATASections: options.splitCDATASections !== false,
                nodeFilter: options.nodeFilter || null
              };
            } else {
              opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: null };
            }
            for (var buf = [], i = 0; i < this.length; i++) {
              serializeToString(this[i], buf, null, opts);
            }
            return buf.join("");
          },
          /**
           * Filters the NodeList based on a predicate.
           *
           * @param {function(Node): boolean} predicate
           * - A predicate function to filter the NodeList.
           * @returns {Node[]}
           * An array of nodes that satisfy the predicate.
           * @private
           */
          filter: function(predicate) {
            return Array.prototype.filter.call(this, predicate);
          },
          /**
           * Returns the first index at which a given node can be found in the NodeList, or -1 if it is
           * not present.
           *
           * @param {Node} item
           * - The Node item to locate in the NodeList.
           * @returns {number}
           * The first index of the node in the NodeList; -1 if not found.
           * @private
           */
          indexOf: function(item) {
            return Array.prototype.indexOf.call(this, item);
          }
        };
        NodeList.prototype[Symbol.iterator] = function() {
          var me = this;
          var index = 0;
          return {
            next: function() {
              if (index < me.length) {
                return {
                  value: me[index++],
                  done: false
                };
              } else {
                return {
                  done: true
                };
              }
            },
            return: function() {
              return {
                done: true
              };
            }
          };
        };
        function LiveNodeList(node, refresh) {
          this._node = node;
          this._refresh = refresh;
          _updateLiveList(this);
        }
        function _updateLiveList(list) {
          var inc = list._node._inc || list._node.ownerDocument._inc;
          if (list._inc !== inc) {
            var ls = list._refresh(list._node);
            __set__(list, "length", ls.length);
            if (!list.$$length || ls.length < list.$$length) {
              for (var i = ls.length; i in list; i++) {
                if (hasOwn(list, i)) {
                  delete list[i];
                }
              }
            }
            copy(ls, list);
            list._inc = inc;
          }
        }
        LiveNodeList.prototype.item = function(i) {
          _updateLiveList(this);
          return this[i] || null;
        };
        _extends(LiveNodeList, NodeList);
        function NamedNodeMap() {
          this._nsIndex = /* @__PURE__ */ Object.create(null);
          this._noNsIndex = /* @__PURE__ */ Object.create(null);
        }
        function _findNodeIndex(list, node) {
          var i = 0;
          while (i < list.length) {
            if (list[i] === node) {
              return i;
            }
            i++;
          }
        }
        function _nnmBucket(map, namespaceURI, create) {
          if (!namespaceURI) {
            return map._noNsIndex;
          }
          var bucket = map._nsIndex[namespaceURI];
          if (!bucket && create) {
            bucket = map._nsIndex[namespaceURI] = /* @__PURE__ */ Object.create(null);
          }
          return bucket;
        }
        function _nnmIndexFind(map, namespaceURI, localName) {
          var bucket = _nnmBucket(map, namespaceURI, false);
          var found = bucket && bucket[localName];
          return found ? found : null;
        }
        function _nnmIndexAdd(map, attr) {
          _nnmBucket(map, attr.namespaceURI, true)[attr.localName] = attr;
        }
        function _nnmIndexRemove(map, attr) {
          var bucket = _nnmBucket(map, attr.namespaceURI, false);
          if (bucket) {
            delete bucket[attr.localName];
          }
        }
        function _addNamedNode(el, list, newAttr, oldAttr) {
          if (oldAttr) {
            list[_findNodeIndex(list, oldAttr)] = newAttr;
          } else {
            list[list.length] = newAttr;
            list.length++;
          }
          _nnmIndexAdd(list, newAttr);
          if (el) {
            newAttr.ownerElement = el;
            var doc = el.ownerDocument;
            if (doc) {
              oldAttr && _onRemoveAttribute(doc, el, oldAttr);
              _onAddAttribute(doc, el, newAttr);
            }
          }
        }
        function _removeNamedNode(el, list, attr) {
          var i = _findNodeIndex(list, attr);
          if (i >= 0) {
            var lastIndex = list.length - 1;
            while (i <= lastIndex) {
              list[i] = list[++i];
            }
            list.length = lastIndex;
            _nnmIndexRemove(list, attr);
            if (el) {
              var doc = el.ownerDocument;
              if (doc) {
                _onRemoveAttribute(doc, el, attr);
              }
              attr.ownerElement = null;
            }
          }
        }
        NamedNodeMap.prototype = {
          length: 0,
          item: NodeList.prototype.item,
          /**
           * Get an attribute by name. Note: Name is in lower case in case of HTML namespace and
           * document.
           *
           * @param {string} localName
           * The local name of the attribute.
           * @returns {Attr | null}
           * The attribute with the given local name, or null if no such attribute exists.
           * @see https://dom.spec.whatwg.org/#concept-element-attributes-get-by-name
           */
          getNamedItem: function(localName) {
            if (this._ownerElement && this._ownerElement._isInHTMLDocumentAndNamespace()) {
              localName = localName.toLowerCase();
            }
            var i = 0;
            while (i < this.length) {
              var attr = this[i];
              if (attr.nodeName === localName) {
                return attr;
              }
              i++;
            }
            return null;
          },
          /**
           * Set an attribute.
           *
           * @param {Attr} attr
           * The attribute to set.
           * @returns {Attr | null}
           * The old attribute with the same local name and namespace URI as the new one, or null if no
           * such attribute exists.
           * @throws {DOMException}
           * With code:
           * - {@link INUSE_ATTRIBUTE_ERR} - If the attribute is already an attribute of another
           * element.
           * @see https://dom.spec.whatwg.org/#concept-element-attributes-set
           */
          setNamedItem: function(attr) {
            var el = attr.ownerElement;
            if (el && el !== this._ownerElement) {
              throw new DOMException(DOMException.INUSE_ATTRIBUTE_ERR);
            }
            var oldAttr = _nnmIndexFind(this, attr.namespaceURI, attr.localName);
            if (oldAttr === attr) {
              return attr;
            }
            _addNamedNode(this._ownerElement, this, attr, oldAttr);
            return oldAttr;
          },
          /**
           * Set an attribute, replacing an existing attribute with the same local name and namespace
           * URI if one exists.
           *
           * @param {Attr} attr
           * The attribute to set.
           * @returns {Attr | null}
           * The old attribute with the same local name and namespace URI as the new one, or null if no
           * such attribute exists.
           * @throws {DOMException}
           * Throws a DOMException with the name "InUseAttributeError" if the attribute is already an
           * attribute of another element.
           * @see https://dom.spec.whatwg.org/#concept-element-attributes-set
           */
          setNamedItemNS: function(attr) {
            return this.setNamedItem(attr);
          },
          /**
           * Removes an attribute specified by the local name.
           *
           * @param {string} localName
           * The local name of the attribute to be removed.
           * @returns {Attr}
           * The attribute node that was removed.
           * @throws {DOMException}
           * With code:
           * - {@link DOMException.NOT_FOUND_ERR} if no attribute with the given name is found.
           * @see https://dom.spec.whatwg.org/#dom-namednodemap-removenameditem
           * @see https://dom.spec.whatwg.org/#concept-element-attributes-remove-by-name
           */
          removeNamedItem: function(localName) {
            var attr = this.getNamedItem(localName);
            if (!attr) {
              throw new DOMException(DOMException.NOT_FOUND_ERR, localName);
            }
            _removeNamedNode(this._ownerElement, this, attr);
            return attr;
          },
          /**
           * Removes an attribute specified by the namespace and local name.
           *
           * @param {string | null} namespaceURI
           * The namespace URI of the attribute to be removed.
           * @param {string} localName
           * The local name of the attribute to be removed.
           * @returns {Attr}
           * The attribute node that was removed.
           * @throws {DOMException}
           * With code:
           * - {@link DOMException.NOT_FOUND_ERR} if no attribute with the given namespace URI and local
           * name is found.
           * @see https://dom.spec.whatwg.org/#dom-namednodemap-removenameditemns
           * @see https://dom.spec.whatwg.org/#concept-element-attributes-remove-by-namespace
           */
          removeNamedItemNS: function(namespaceURI, localName) {
            var attr = this.getNamedItemNS(namespaceURI, localName);
            if (!attr) {
              throw new DOMException(DOMException.NOT_FOUND_ERR, namespaceURI ? namespaceURI + " : " + localName : localName);
            }
            _removeNamedNode(this._ownerElement, this, attr);
            return attr;
          },
          /**
           * Get an attribute by namespace and local name.
           *
           * @param {string | null} namespaceURI
           * The namespace URI of the attribute.
           * @param {string} localName
           * The local name of the attribute.
           * @returns {Attr | null}
           * The attribute with the given namespace URI and local name, or null if no such attribute
           * exists.
           * @see https://dom.spec.whatwg.org/#concept-element-attributes-get-by-namespace
           */
          getNamedItemNS: function(namespaceURI, localName) {
            if (!namespaceURI) {
              namespaceURI = null;
            }
            var i = 0;
            while (i < this.length) {
              var node = this[i];
              if (node.localName === localName && node.namespaceURI === namespaceURI) {
                return node;
              }
              i++;
            }
            return null;
          }
        };
        NamedNodeMap.prototype[Symbol.iterator] = function() {
          var me = this;
          var index = 0;
          return {
            next: function() {
              if (index < me.length) {
                return {
                  value: me[index++],
                  done: false
                };
              } else {
                return {
                  done: true
                };
              }
            },
            return: function() {
              return {
                done: true
              };
            }
          };
        };
        function DOMImplementation() {
        }
        DOMImplementation.prototype = {
          /**
           * Test if the DOM implementation implements a specific feature and version, as specified in
           * {@link https://www.w3.org/TR/DOM-Level-3-Core/core.html#DOMFeatures DOM Features}.
           *
           * The DOMImplementation.hasFeature() method returns a Boolean flag indicating if a given
           * feature is supported. The different implementations fairly diverged in what kind of
           * features were reported. The latest version of the spec settled to force this method to
           * always return true, where the functionality was accurate and in use.
           *
           * @deprecated
           * It is deprecated and modern browsers return true in all cases.
           * @function DOMImplementation#hasFeature
           * @param {string} feature
           * The name of the feature to test.
           * @param {string} [version]
           * This is the version number of the feature to test.
           * @returns {boolean}
           * Always returns true.
           * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/hasFeature MDN
           * @see https://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-5CED94D7 DOM Level 1 Core
           * @see https://dom.spec.whatwg.org/#dom-domimplementation-hasfeature DOM Living Standard
           * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-5CED94D7 DOM Level 3 Core
           */
          hasFeature: function(feature, version) {
            return true;
          },
          /**
           * Creates a DOM Document object of the specified type with its document element. Note that
           * based on the {@link DocumentType}
           * given to create the document, the implementation may instantiate specialized
           * {@link Document} objects that support additional features than the "Core", such as "HTML"
           * {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#DOM2HTML DOM Level 2 HTML}.
           * On the other hand, setting the {@link DocumentType} after the document was created makes
           * this very unlikely to happen. Alternatively, specialized {@link Document} creation methods,
           * such as createHTMLDocument
           * {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#DOM2HTML DOM Level 2 HTML},
           * can be used to obtain specific types of {@link Document} objects.
           *
           * __It behaves slightly different from the description in the living standard__:
           * - There is no interface/class `XMLDocument`, it returns a `Document`
           * instance (with it's `type` set to `'xml'`).
           * - `encoding`, `mode`, `origin`, `url` fields are currently not declared.
           *
           * @function DOMImplementation.createDocument
           * @param {string | null} namespaceURI
           * The
           * {@link https://www.w3.org/TR/DOM-Level-3-Core/glossary.html#dt-namespaceURI namespace URI}
           * of the document element to create or null.
           * @param {string | null} qualifiedName
           * The
           * {@link https://www.w3.org/TR/DOM-Level-3-Core/glossary.html#dt-qualifiedname qualified name}
           * of the document element to be created or null.
           * @param {DocumentType | null} [doctype=null]
           * The type of document to be created or null. When doctype is not null, its
           * {@link Node#ownerDocument} attribute is set to the document being created. Default is
           * `null`
           * @returns {Document}
           * A new {@link Document} object with its document element. If the NamespaceURI,
           * qualifiedName, and doctype are null, the returned {@link Document} is empty with no
           * document element.
           * @throws {DOMException}
           * With code:
           *
           * - `INVALID_CHARACTER_ERR`: Raised if the specified qualified name is not an XML name
           * according to {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#XML XML 1.0}.
           * - `NAMESPACE_ERR`: Raised if the qualifiedName is malformed, if the qualifiedName has a
           * prefix and the namespaceURI is null, or if the qualifiedName is null and the namespaceURI
           * is different from null, or if the qualifiedName has a prefix that is "xml" and the
           * namespaceURI is different from "{@link http://www.w3.org/XML/1998/namespace}"
           * {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#Namespaces XML Namespaces},
           * or if the DOM implementation does not support the "XML" feature but a non-null namespace
           * URI was provided, since namespaces were defined by XML.
           * - `WRONG_DOCUMENT_ERR`: Raised if doctype has already been used with a different document
           * or was created from a different implementation.
           * - `NOT_SUPPORTED_ERR`: May be raised if the implementation does not support the feature
           * "XML" and the language exposed through the Document does not support XML Namespaces (such
           * as {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#HTML40 HTML 4.01}).
           * @since DOM Level 2.
           * @see {@link #createHTMLDocument}
           * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createDocument MDN
           * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument DOM Living Standard
           * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Level-2-Core-DOM-createDocument DOM
           *      Level 3 Core
           * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#Level-2-Core-DOM-createDocument DOM
           *      Level 2 Core (initial)
           */
          createDocument: function(namespaceURI, qualifiedName, doctype) {
            var contentType = MIME_TYPE.XML_APPLICATION;
            if (namespaceURI === NAMESPACE.HTML) {
              contentType = MIME_TYPE.XML_XHTML_APPLICATION;
            } else if (namespaceURI === NAMESPACE.SVG) {
              contentType = MIME_TYPE.XML_SVG_IMAGE;
            }
            var doc = new Document(PDC, { contentType });
            doc.implementation = this;
            doc.childNodes = new NodeList();
            doc.doctype = doctype || null;
            if (doctype) {
              doc.appendChild(doctype);
            }
            if (qualifiedName) {
              var root = doc.createElementNS(namespaceURI, qualifiedName);
              doc.appendChild(root);
            }
            return doc;
          },
          /**
           * Creates an empty DocumentType node. Entity declarations and notations are not made
           * available. Entity reference expansions and default attribute additions do not occur.
           *
           * **This behavior is slightly different from the one in the specs**:
           * - `encoding`, `mode`, `origin`, `url` fields are currently not declared.
           * - `publicId` and `systemId` contain the raw data including any possible quotes,
           *   so they can always be serialized back to the original value
           * - `internalSubset` contains the raw string between `[` and `]` if present,
           *   but is not parsed or validated in any form.
           *
           * @function DOMImplementation#createDocumentType
           * @param {string} qualifiedName
           * The {@link https://www.w3.org/TR/DOM-Level-3-Core/glossary.html#dt-qualifiedname qualified
           * name} of the document type to be created.
           * @param {string} [publicId]
           * The external subset public identifier. Stored verbatim including surrounding quotes.
           * When serialized with `requireWellFormed: true`, the serializer throws `InvalidStateError`
           * if the value is non-empty and does not match the XML `PubidLiteral` production
           * (W3C DOM Parsing §3.2.1.3; XML 1.0 production [12]). Creation-time validation is not
           * enforced — deferred to a future breaking release.
           * @param {string} [systemId]
           * The external subset system identifier. Stored verbatim including surrounding quotes.
           * When serialized with `requireWellFormed: true`, the serializer throws `InvalidStateError`
           * if the value is non-empty and does not match the XML `SystemLiteral` production
           * (W3C DOM Parsing §3.2.1.3; XML 1.0 production [11]). Creation-time validation is not
           * enforced — deferred to a future breaking release.
           * @param {string} [internalSubset]
           * The internal subset or an empty string if it is not present. Stored verbatim.
           * When serialized with `requireWellFormed: true`, the serializer throws `InvalidStateError`
           * if the value contains `"]>"`. Creation-time validation is not enforced.
           * @returns {DocumentType}
           * A new {@link DocumentType} node with {@link Node#ownerDocument} set to null.
           * @throws {DOMException}
           * With code:
           *
           * - `INVALID_CHARACTER_ERR`: Raised if the specified qualified name is not an XML name
           * according to {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#XML XML 1.0}.
           * - `NAMESPACE_ERR`: Raised if the qualifiedName is malformed.
           * - `NOT_SUPPORTED_ERR`: May be raised if the implementation does not support the feature
           * "XML" and the language exposed through the Document does not support XML Namespaces (such
           * as {@link https://www.w3.org/TR/DOM-Level-3-Core/references.html#HTML40 HTML 4.01}).
           * @since DOM Level 2.
           * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createDocumentType
           *      MDN
           * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocumenttype DOM Living
           *      Standard
           * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Level-3-Core-DOM-createDocType DOM
           *      Level 3 Core
           * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#Level-2-Core-DOM-createDocType DOM
           *      Level 2 Core
           * @see https://github.com/xmldom/xmldom/blob/master/CHANGELOG.md#050
           * @see https://www.w3.org/TR/DOM-Level-2-Core/#core-ID-Core-DocType-internalSubset
           * @prettierignore
           */
          createDocumentType: function(qualifiedName, publicId, systemId, internalSubset) {
            validateQualifiedName(qualifiedName);
            var node = new DocumentType(PDC);
            node.name = qualifiedName;
            node.nodeName = qualifiedName;
            node.publicId = publicId || "";
            node.systemId = systemId || "";
            node.internalSubset = internalSubset || "";
            node.childNodes = new NodeList();
            return node;
          },
          /**
           * Returns an HTML document, that might already have a basic DOM structure.
           *
           * __It behaves slightly different from the description in the living standard__:
           * - If the first argument is `false` no initial nodes are added (steps 3-7 in the specs are
           * omitted)
           * - `encoding`, `mode`, `origin`, `url` fields are currently not declared.
           *
           * @param {string | false} [title]
           * A string containing the title to give the new HTML document.
           * @returns {Document}
           * The HTML document.
           * @since WHATWG Living Standard.
           * @see {@link #createDocument}
           * @see https://dom.spec.whatwg.org/#dom-domimplementation-createhtmldocument
           * @see https://dom.spec.whatwg.org/#html-document
           */
          createHTMLDocument: function(title) {
            var doc = new Document(PDC, { contentType: MIME_TYPE.HTML });
            doc.implementation = this;
            doc.childNodes = new NodeList();
            if (title !== false) {
              doc.doctype = this.createDocumentType("html");
              doc.doctype.ownerDocument = doc;
              doc.appendChild(doc.doctype);
              var htmlNode = doc.createElement("html");
              doc.appendChild(htmlNode);
              var headNode = doc.createElement("head");
              htmlNode.appendChild(headNode);
              if (typeof title === "string") {
                var titleNode = doc.createElement("title");
                titleNode.appendChild(doc.createTextNode(title));
                headNode.appendChild(titleNode);
              }
              htmlNode.appendChild(doc.createElement("body"));
            }
            return doc;
          }
        };
        function Node(symbol) {
          checkSymbol(symbol);
        }
        Node.prototype = {
          /**
           * The first child of this node.
           *
           * @type {Node | null}
           */
          firstChild: null,
          /**
           * The last child of this node.
           *
           * @type {Node | null}
           */
          lastChild: null,
          /**
           * The previous sibling of this node.
           *
           * @type {Node | null}
           */
          previousSibling: null,
          /**
           * The next sibling of this node.
           *
           * @type {Node | null}
           */
          nextSibling: null,
          /**
           * The parent node of this node.
           *
           * @type {Node | null}
           */
          parentNode: null,
          /**
           * The parent element of this node.
           *
           * @type {Element | null}
           */
          get parentElement() {
            return this.parentNode && this.parentNode.nodeType === this.ELEMENT_NODE ? this.parentNode : null;
          },
          /**
           * The child nodes of this node.
           *
           * @type {NodeList}
           */
          childNodes: null,
          /**
           * The document object associated with this node.
           *
           * @type {Document | null}
           */
          ownerDocument: null,
          /**
           * The value of this node.
           *
           * @type {string | null}
           */
          nodeValue: null,
          /**
           * The namespace URI of this node.
           *
           * @type {string | null}
           */
          namespaceURI: null,
          /**
           * The prefix of the namespace for this node.
           *
           * @type {string | null}
           */
          prefix: null,
          /**
           * The local part of the qualified name of this node.
           *
           * @type {string | null}
           */
          localName: null,
          /**
           * The baseURI is currently always `about:blank`,
           * since that's what happens when you create a document from scratch.
           *
           * @type {'about:blank'}
           */
          baseURI: "about:blank",
          /**
           * Is true if this node is part of a document.
           *
           * @type {boolean}
           */
          get isConnected() {
            var rootNode = this.getRootNode();
            return rootNode && rootNode.nodeType === rootNode.DOCUMENT_NODE;
          },
          /**
           * Checks whether `other` is an inclusive descendant of this node.
           *
           * @param {Node | null | undefined} other
           * The node to check.
           * @returns {boolean}
           * True if `other` is an inclusive descendant of this node; false otherwise.
           * @see https://dom.spec.whatwg.org/#dom-node-contains
           */
          contains: function(other) {
            if (!other) return false;
            var parent = other;
            do {
              if (this === parent) return true;
              parent = parent.parentNode;
            } while (parent);
            return false;
          },
          /**
           * @typedef GetRootNodeOptions
           * @property {boolean} [composed=false]
           */
          /**
           * Searches for the root node of this node.
           *
           * **This behavior is slightly different from the in the specs**:
           * - ignores `options.composed`, since `ShadowRoot`s are unsupported, always returns root.
           *
           * @param {GetRootNodeOptions} [options]
           * @returns {Node}
           * Root node.
           * @see https://dom.spec.whatwg.org/#dom-node-getrootnode
           * @see https://dom.spec.whatwg.org/#concept-shadow-including-root
           */
          getRootNode: function(options) {
            var parent = this;
            do {
              if (!parent.parentNode) {
                return parent;
              }
              parent = parent.parentNode;
            } while (parent);
          },
          /**
           * Checks whether the given node is equal to this node.
           *
           * Two nodes are equal when they have the same type, defining characteristics (for the type),
           * and the same childNodes. The comparison is iterative to avoid stack overflows on
           * deeply-nested trees. Attribute nodes of each Element pair are also pushed onto the stack
           * and compared the same way.
           *
           * @param {Node} [otherNode]
           * @returns {boolean}
           * @see https://dom.spec.whatwg.org/#concept-node-equals
           * @see ../docs/walk-dom.md.
           */
          isEqualNode: function(otherNode) {
            if (!otherNode) return false;
            var stack = [{ node: this, other: otherNode }];
            while (stack.length > 0) {
              var pair = stack.pop();
              var node = pair.node;
              var other = pair.other;
              if (node.nodeType !== other.nodeType) return false;
              switch (node.nodeType) {
                case node.DOCUMENT_TYPE_NODE:
                  if (node.name !== other.name) return false;
                  if (node.publicId !== other.publicId) return false;
                  if (node.systemId !== other.systemId) return false;
                  break;
                case node.ELEMENT_NODE:
                  if (node.namespaceURI !== other.namespaceURI) return false;
                  if (node.prefix !== other.prefix) return false;
                  if (node.localName !== other.localName) return false;
                  if (node.attributes.length !== other.attributes.length) return false;
                  for (var i = 0; i < node.attributes.length; i++) {
                    var attr = node.attributes.item(i);
                    var otherAttr = other.getAttributeNodeNS(attr.namespaceURI, attr.localName);
                    if (!otherAttr) return false;
                    stack.push({ node: attr, other: otherAttr });
                  }
                  break;
                case node.ATTRIBUTE_NODE:
                  if (node.namespaceURI !== other.namespaceURI) return false;
                  if (node.localName !== other.localName) return false;
                  if (node.value !== other.value) return false;
                  break;
                case node.PROCESSING_INSTRUCTION_NODE:
                  if (node.target !== other.target || node.data !== other.data) return false;
                  break;
                case node.TEXT_NODE:
                case node.CDATA_SECTION_NODE:
                case node.COMMENT_NODE:
                  if (node.data !== other.data) return false;
                  break;
              }
              if (node.childNodes.length !== other.childNodes.length) return false;
              for (var i = node.childNodes.length - 1; i >= 0; i--) {
                stack.push({ node: node.childNodes[i], other: other.childNodes[i] });
              }
            }
            return true;
          },
          /**
           * Checks whether or not the given node is this node.
           *
           * @param {Node} [otherNode]
           */
          isSameNode: function(otherNode) {
            return this === otherNode;
          },
          /**
           * Inserts a node before a reference node as a child of this node.
           *
           * @param {Node} newChild
           * The new child node to be inserted.
           * @param {Node | null} refChild
           * The reference node before which newChild will be inserted.
           * @returns {Node}
           * The new child node successfully inserted.
           * @throws {DOMException}
           * Throws a DOMException if inserting the node would result in a DOM tree that is not
           * well-formed, or if `child` is provided but is not a child of `parent`.
           * See {@link _insertBefore} for more details.
           * @since Modified in DOM L2
           */
          insertBefore: function(newChild, refChild) {
            return _insertBefore(this, newChild, refChild);
          },
          /**
           * Replaces an old child node with a new child node within this node.
           *
           * @param {Node} newChild
           * The new node that is to replace the old node.
           * If it already exists in the DOM, it is removed from its original position.
           * @param {Node} oldChild
           * The existing child node to be replaced.
           * @returns {Node}
           * Returns the replaced child node.
           * @throws {DOMException}
           * Throws a DOMException if replacing the node would result in a DOM tree that is not
           * well-formed, or if `oldChild` is not a child of `this`.
           * This can also occur if the pre-replacement validity assertion fails.
           * See {@link _insertBefore}, {@link Node.removeChild}, and
           * {@link assertPreReplacementValidityInDocument} for more details.
           * @see https://dom.spec.whatwg.org/#concept-node-replace
           */
          replaceChild: function(newChild, oldChild) {
            _insertBefore(this, newChild, oldChild, assertPreReplacementValidityInDocument);
            if (oldChild) {
              this.removeChild(oldChild);
            }
          },
          /**
           * Removes an existing child node from this node.
           *
           * @param {Node} oldChild
           * The child node to be removed.
           * @returns {Node}
           * Returns the removed child node.
           * @throws {DOMException}
           * Throws a DOMException if `oldChild` is not a child of `this`.
           * See {@link _removeChild} for more details.
           */
          removeChild: function(oldChild) {
            return _removeChild(this, oldChild);
          },
          /**
           * Appends a child node to this node.
           *
           * @param {Node} newChild
           * The child node to be appended to this node.
           * If it already exists in the DOM, it is removed from its original position.
           * @returns {Node}
           * Returns the appended child node.
           * @throws {DOMException}
           * Throws a DOMException if appending the node would result in a DOM tree that is not
           * well-formed, or if `newChild` is not a valid Node.
           * See {@link insertBefore} for more details.
           */
          appendChild: function(newChild) {
            return this.insertBefore(newChild, null);
          },
          /**
           * Determines whether this node has any child nodes.
           *
           * @returns {boolean}
           * Returns true if this node has any child nodes, and false otherwise.
           */
          hasChildNodes: function() {
            return this.firstChild != null;
          },
          /**
           * Creates a copy of the calling node.
           *
           * @param {boolean} deep
           * If true, the contents of the node are recursively copied.
           * If false, only the node itself (and its attributes, if it is an element) are copied.
           * @returns {Node}
           * Returns the newly created copy of the node.
           * @throws {DOMException}
           * May throw a DOMException if operations within {@link Element#setAttributeNode} or
           * {@link Node#appendChild} (which are potentially invoked in this method) do not meet their
           * specific constraints.
           * @see {@link cloneNode}
           */
          cloneNode: function(deep) {
            return cloneNode(this.ownerDocument || this, this, deep);
          },
          /**
           * Puts the specified node and all of its subtree into a "normalized" form. In a normalized
           * subtree, no text nodes in the subtree are empty and there are no adjacent text nodes.
           *
           * Specifically, this method merges any adjacent text nodes (i.e., nodes for which `nodeType`
           * is `TEXT_NODE`) into a single node with the combined data. It also removes any empty text
           * nodes.
           *
           * This method iterativly traverses all child nodes to normalize all descendent nodes within
           * the subtree.
           *
           * @throws {DOMException}
           * May throw a DOMException if operations within removeChild or appendData (which are
           * potentially invoked in this method) do not meet their specific constraints.
           * @since Modified in DOM Level 2
           * @see {@link Node.removeChild}
           * @see {@link CharacterData.appendData}
           * @see ../docs/walk-dom.md.
           */
          normalize: function() {
            walkDOM(this, null, {
              enter: function(node) {
                var child = node.firstChild;
                while (child) {
                  var next = child.nextSibling;
                  if (next !== null && next.nodeType === TEXT_NODE && child.nodeType === TEXT_NODE) {
                    var tail = [];
                    var sibling = next;
                    while (sibling !== null && sibling.nodeType === TEXT_NODE) {
                      tail.push(sibling.data);
                      sibling = sibling.nextSibling;
                    }
                    var removed = child.nextSibling;
                    while (removed !== sibling) {
                      var following = removed.nextSibling;
                      removed.parentNode = null;
                      removed.previousSibling = null;
                      removed.nextSibling = null;
                      removed = following;
                    }
                    child.nextSibling = sibling;
                    if (sibling !== null) {
                      sibling.previousSibling = child;
                    } else {
                      node.lastChild = child;
                    }
                    child.appendData(tail.join(""));
                    _onUpdateChild(node.ownerDocument, node);
                    child = sibling;
                  } else {
                    child = next;
                  }
                }
                return true;
              }
            });
          },
          /**
           * Checks whether the DOM implementation implements a specific feature and its version.
           *
           * @deprecated
           * Since `DOMImplementation.hasFeature` is deprecated and always returns true.
           * @param {string} feature
           * The package name of the feature to test. This is the same name that can be passed to the
           * method `hasFeature` on `DOMImplementation`.
           * @param {string} version
           * This is the version number of the package name to test.
           * @returns {boolean}
           * Returns true in all cases in the current implementation.
           * @since Introduced in DOM Level 2
           * @see {@link DOMImplementation.hasFeature}
           */
          isSupported: function(feature, version) {
            return this.ownerDocument.implementation.hasFeature(feature, version);
          },
          /**
           * Look up the prefix associated to the given namespace URI, starting from this node.
           * **The default namespace declarations are ignored by this method.**
           * See Namespace Prefix Lookup for details on the algorithm used by this method.
           *
           * **This behavior is different from the in the specs**:
           * - no node type specific handling
           * - uses the internal attribute _nsMap for resolving namespaces that is updated when changing attributes
           *
           * @param {string | null} namespaceURI
           * The namespace URI for which to find the associated prefix.
           * @returns {string | null}
           * The associated prefix, if found; otherwise, null.
           * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-lookupNamespacePrefix
           * @see https://www.w3.org/TR/DOM-Level-3-Core/namespaces-algorithms.html#lookupNamespacePrefixAlgo
           * @see https://dom.spec.whatwg.org/#dom-node-lookupprefix
           * @see https://github.com/xmldom/xmldom/issues/322
           * @prettierignore
           */
          lookupPrefix: function(namespaceURI) {
            var el = this;
            while (el) {
              var map = el._nsMap;
              if (map) {
                for (var n in map) {
                  if (hasOwn(map, n) && map[n] === namespaceURI) {
                    return n;
                  }
                }
              }
              el = el.nodeType == ATTRIBUTE_NODE ? el.ownerDocument : el.parentNode;
            }
            return null;
          },
          /**
           * This function is used to look up the namespace URI associated with the given prefix,
           * starting from this node.
           *
           * **This behavior is different from the in the specs**:
           * - no node type specific handling
           * - uses the internal attribute _nsMap for resolving namespaces that is updated when changing attributes
           *
           * @param {string | null} prefix
           * The prefix for which to find the associated namespace URI.
           * @returns {string | null}
           * The associated namespace URI, if found; otherwise, null.
           * @since DOM Level 3
           * @see https://dom.spec.whatwg.org/#dom-node-lookupnamespaceuri
           * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-lookupNamespaceURI
           * @prettierignore
           */
          lookupNamespaceURI: function(prefix) {
            var el = this;
            while (el) {
              var map = el._nsMap;
              if (map) {
                if (hasOwn(map, prefix)) {
                  return map[prefix];
                }
              }
              el = el.nodeType == ATTRIBUTE_NODE ? el.ownerDocument : el.parentNode;
            }
            return null;
          },
          /**
           * Determines whether the given namespace URI is the default namespace.
           *
           * The function works by looking up the prefix associated with the given namespace URI. If no
           * prefix is found (i.e., the namespace URI is not registered in the namespace map of this
           * node or any of its ancestors), it returns `true`, implying the namespace URI is considered
           * the default.
           *
           * **This behavior is different from the in the specs**:
           * - no node type specific handling
           * - uses the internal attribute _nsMap for resolving namespaces that is updated when changing attributes
           *
           * @param {string | null} namespaceURI
           * The namespace URI to be checked.
           * @returns {boolean}
           * Returns true if the given namespace URI is the default namespace, false otherwise.
           * @since DOM Level 3
           * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-isDefaultNamespace
           * @see https://dom.spec.whatwg.org/#dom-node-isdefaultnamespace
           * @prettierignore
           */
          isDefaultNamespace: function(namespaceURI) {
            var prefix = this.lookupPrefix(namespaceURI);
            return prefix == null;
          },
          /**
           * Compares the reference node with a node with regard to their position in the document and
           * according to the document order.
           *
           * @param {Node} other
           * The node to compare the reference node to.
           * @returns {number}
           * Returns how the node is positioned relatively to the reference node according to the
           * bitmask. 0 if reference node and given node are the same.
           * @since DOM Level 3
           * @see https://www.w3.org/TR/2004/REC-DOM-Level-3-Core-20040407/core.html#Node3-compare
           * @see https://dom.spec.whatwg.org/#dom-node-comparedocumentposition
           */
          compareDocumentPosition: function(other) {
            if (this === other) return 0;
            var node1 = other;
            var node2 = this;
            var attr1 = null;
            var attr2 = null;
            if (node1 instanceof Attr) {
              attr1 = node1;
              node1 = attr1.ownerElement;
            }
            if (node2 instanceof Attr) {
              attr2 = node2;
              node2 = attr2.ownerElement;
              if (attr1 && node1 && node2 === node1) {
                for (var i = 0, attr; attr = node2.attributes[i]; i++) {
                  if (attr === attr1)
                    return DocumentPosition.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + DocumentPosition.DOCUMENT_POSITION_PRECEDING;
                  if (attr === attr2)
                    return DocumentPosition.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
                }
              }
            }
            if (!node1 || !node2 || node2.ownerDocument !== node1.ownerDocument) {
              return DocumentPosition.DOCUMENT_POSITION_DISCONNECTED + DocumentPosition.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + (docGUID(node2.ownerDocument) > docGUID(node1.ownerDocument) ? DocumentPosition.DOCUMENT_POSITION_FOLLOWING : DocumentPosition.DOCUMENT_POSITION_PRECEDING);
            }
            if (attr2 && node1 === node2) {
              return DocumentPosition.DOCUMENT_POSITION_CONTAINS + DocumentPosition.DOCUMENT_POSITION_PRECEDING;
            }
            if (attr1 && node1 === node2) {
              return DocumentPosition.DOCUMENT_POSITION_CONTAINED_BY + DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
            }
            var chain1 = [];
            var ancestor1 = node1.parentNode;
            while (ancestor1) {
              if (!attr2 && ancestor1 === node2) {
                return DocumentPosition.DOCUMENT_POSITION_CONTAINED_BY + DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
              }
              chain1.push(ancestor1);
              ancestor1 = ancestor1.parentNode;
            }
            chain1.reverse();
            var chain2 = [];
            var ancestor2 = node2.parentNode;
            while (ancestor2) {
              if (!attr1 && ancestor2 === node1) {
                return DocumentPosition.DOCUMENT_POSITION_CONTAINS + DocumentPosition.DOCUMENT_POSITION_PRECEDING;
              }
              chain2.push(ancestor2);
              ancestor2 = ancestor2.parentNode;
            }
            chain2.reverse();
            var ca = commonAncestor(chain1, chain2);
            for (var n in ca.childNodes) {
              var child = ca.childNodes[n];
              if (child === node2) return DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
              if (child === node1) return DocumentPosition.DOCUMENT_POSITION_PRECEDING;
              if (chain2.indexOf(child) >= 0) return DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
              if (chain1.indexOf(child) >= 0) return DocumentPosition.DOCUMENT_POSITION_PRECEDING;
            }
            return 0;
          }
        };
        function _xmlEncoder(c) {
          return c == "<" && "&lt;" || c == ">" && "&gt;" || c == "&" && "&amp;" || c == '"' && "&quot;" || "&#" + c.charCodeAt() + ";";
        }
        copy(NodeType, Node);
        copy(NodeType, Node.prototype);
        copy(DocumentPosition, Node);
        copy(DocumentPosition, Node.prototype);
        function _visitNode(node, callback) {
          walkDOM(node, null, {
            enter: function(n) {
              return callback(n) ? walkDOM.STOP : true;
            }
          });
        }
        function walkDOM(node, context, callbacks) {
          var stack = [{ node, context, phase: walkDOM.ENTER }];
          while (stack.length > 0) {
            var frame = stack.pop();
            if (frame.phase === walkDOM.ENTER) {
              var childContext = callbacks.enter(frame.node, frame.context);
              if (childContext === walkDOM.STOP) {
                return walkDOM.STOP;
              }
              stack.push({ node: frame.node, context: childContext, phase: walkDOM.EXIT });
              if (childContext === null || childContext === void 0) {
                continue;
              }
              var child = frame.node.lastChild;
              while (child) {
                stack.push({ node: child, context: childContext, phase: walkDOM.ENTER });
                child = child.previousSibling;
              }
            } else {
              if (callbacks.exit) {
                callbacks.exit(frame.node, frame.context);
              }
            }
          }
        }
        walkDOM.STOP = /* @__PURE__ */ Symbol("walkDOM.STOP");
        walkDOM.ENTER = 0;
        walkDOM.EXIT = 1;
        function Document(symbol, options) {
          checkSymbol(symbol);
          var opt = options || {};
          this.ownerDocument = this;
          this.contentType = opt.contentType || MIME_TYPE.XML_APPLICATION;
          this.type = isHTMLMimeType(this.contentType) ? "html" : "xml";
        }
        function _onAddAttribute(doc, el, newAttr) {
          doc && doc._inc++;
          var ns2 = newAttr.namespaceURI;
          if (ns2 === NAMESPACE.XMLNS) {
            el._nsMap[newAttr.prefix ? newAttr.localName : ""] = newAttr.value;
          }
        }
        function _onRemoveAttribute(doc, el, newAttr, remove) {
          doc && doc._inc++;
          var ns2 = newAttr.namespaceURI;
          if (ns2 === NAMESPACE.XMLNS) {
            delete el._nsMap[newAttr.prefix ? newAttr.localName : ""];
          }
        }
        function _onUpdateChild(doc, parent, newChild) {
          if (doc && doc._inc) {
            doc._inc++;
            var childNodes = parent.childNodes;
            if (newChild && !newChild.nextSibling) {
              childNodes[childNodes.length++] = newChild;
            } else {
              var child = parent.firstChild;
              var i = 0;
              while (child) {
                childNodes[i++] = child;
                child = child.nextSibling;
              }
              childNodes.length = i;
              delete childNodes[childNodes.length];
            }
          }
        }
        function _removeChild(parentNode, child) {
          if (parentNode !== child.parentNode) {
            throw new DOMException(DOMException.NOT_FOUND_ERR, "child's parent is not parent");
          }
          var oldPreviousSibling = child.previousSibling;
          var oldNextSibling = child.nextSibling;
          if (oldPreviousSibling) {
            oldPreviousSibling.nextSibling = oldNextSibling;
          } else {
            parentNode.firstChild = oldNextSibling;
          }
          if (oldNextSibling) {
            oldNextSibling.previousSibling = oldPreviousSibling;
          } else {
            parentNode.lastChild = oldPreviousSibling;
          }
          _onUpdateChild(parentNode.ownerDocument, parentNode);
          child.parentNode = null;
          child.previousSibling = null;
          child.nextSibling = null;
          return child;
        }
        function hasValidParentNodeType(node) {
          return node && (node.nodeType === Node.DOCUMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE || node.nodeType === Node.ELEMENT_NODE);
        }
        function hasInsertableNodeType(node) {
          return node && (node.nodeType === Node.CDATA_SECTION_NODE || node.nodeType === Node.COMMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE || node.nodeType === Node.DOCUMENT_TYPE_NODE || node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.PROCESSING_INSTRUCTION_NODE || node.nodeType === Node.TEXT_NODE);
        }
        function isDocTypeNode(node) {
          return node && node.nodeType === Node.DOCUMENT_TYPE_NODE;
        }
        function isElementNode(node) {
          return node && node.nodeType === Node.ELEMENT_NODE;
        }
        function isTextNode(node) {
          return node && node.nodeType === Node.TEXT_NODE;
        }
        function isElementInsertionPossible(doc, child) {
          var parentChildNodes = doc.childNodes || [];
          if (find(parentChildNodes, isElementNode) || isDocTypeNode(child)) {
            return false;
          }
          var docTypeNode = find(parentChildNodes, isDocTypeNode);
          return !(child && docTypeNode && parentChildNodes.indexOf(docTypeNode) > parentChildNodes.indexOf(child));
        }
        function isElementReplacementPossible(doc, child) {
          var parentChildNodes = doc.childNodes || [];
          function hasElementChildThatIsNotChild(node) {
            return isElementNode(node) && node !== child;
          }
          if (find(parentChildNodes, hasElementChildThatIsNotChild)) {
            return false;
          }
          var docTypeNode = find(parentChildNodes, isDocTypeNode);
          return !(child && docTypeNode && parentChildNodes.indexOf(docTypeNode) > parentChildNodes.indexOf(child));
        }
        function assertPreInsertionValidity1to5(parent, node, child) {
          if (!hasValidParentNodeType(parent)) {
            throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Unexpected parent node type " + parent.nodeType);
          }
          if (child && child.parentNode !== parent) {
            throw new DOMException(DOMException.NOT_FOUND_ERR, "child not in parent");
          }
          if (
            // 4. If `node` is not a DocumentFragment, DocumentType, Element, or CharacterData node, then throw a "HierarchyRequestError" DOMException.
            !hasInsertableNodeType(node) || // 5. If either `node` is a Text node and `parent` is a document,
            // the sax parser currently adds top level text nodes, this will be fixed in 0.9.0
            // || (node.nodeType === Node.TEXT_NODE && parent.nodeType === Node.DOCUMENT_NODE)
            // or `node` is a doctype and `parent` is not a document, then throw a "HierarchyRequestError" DOMException.
            isDocTypeNode(node) && parent.nodeType !== Node.DOCUMENT_NODE
          ) {
            throw new DOMException(
              DOMException.HIERARCHY_REQUEST_ERR,
              "Unexpected node type " + node.nodeType + " for parent node type " + parent.nodeType
            );
          }
        }
        function assertPreInsertionValidityInDocument(parent, node, child) {
          var parentChildNodes = parent.childNodes || [];
          var nodeChildNodes = node.childNodes || [];
          if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            var nodeChildElements = nodeChildNodes.filter(isElementNode);
            if (nodeChildElements.length > 1 || find(nodeChildNodes, isTextNode)) {
              throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "More than one element or text in fragment");
            }
            if (nodeChildElements.length === 1 && !isElementInsertionPossible(parent, child)) {
              throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Element in fragment can not be inserted before doctype");
            }
          }
          if (isElementNode(node)) {
            if (!isElementInsertionPossible(parent, child)) {
              throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Only one element can be added and only after doctype");
            }
          }
          if (isDocTypeNode(node)) {
            if (find(parentChildNodes, isDocTypeNode)) {
              throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Only one doctype is allowed");
            }
            var parentElementChild = find(parentChildNodes, isElementNode);
            if (child && parentChildNodes.indexOf(parentElementChild) < parentChildNodes.indexOf(child)) {
              throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Doctype can only be inserted before an element");
            }
            if (!child && parentElementChild) {
              throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Doctype can not be appended since element is present");
            }
          }
        }
        function assertPreReplacementValidityInDocument(parent, node, child) {
          var parentChildNodes = parent.childNodes || [];
          var nodeChildNodes = node.childNodes || [];
          if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            var nodeChildElements = nodeChildNodes.filter(isElementNode);
            if (nodeChildElements.length > 1 || find(nodeChildNodes, isTextNode)) {
              throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "More than one element or text in fragment");
            }
            if (nodeChildElements.length === 1 && !isElementReplacementPossible(parent, child)) {
              throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Element in fragment can not be inserted before doctype");
            }
          }
          if (isElementNode(node)) {
            if (!isElementReplacementPossible(parent, child)) {
              throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Only one element can be added and only after doctype");
            }
          }
          if (isDocTypeNode(node)) {
            let hasDoctypeChildThatIsNotChild = function(node2) {
              return isDocTypeNode(node2) && node2 !== child;
            };
            if (find(parentChildNodes, hasDoctypeChildThatIsNotChild)) {
              throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Only one doctype is allowed");
            }
            var parentElementChild = find(parentChildNodes, isElementNode);
            if (child && parentChildNodes.indexOf(parentElementChild) < parentChildNodes.indexOf(child)) {
              throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "Doctype can only be inserted before an element");
            }
          }
        }
        function _insertBefore(parent, node, child, _inDocumentAssertion) {
          assertPreInsertionValidity1to5(parent, node, child);
          if (parent.nodeType === Node.DOCUMENT_NODE) {
            (_inDocumentAssertion || assertPreInsertionValidityInDocument)(parent, node, child);
          }
          var cp = node.parentNode;
          if (cp) {
            cp.removeChild(node);
          }
          if (node.nodeType === DOCUMENT_FRAGMENT_NODE) {
            var newFirst = node.firstChild;
            if (newFirst == null) {
              return node;
            }
            var newLast = node.lastChild;
          } else {
            newFirst = newLast = node;
          }
          var pre = child ? child.previousSibling : parent.lastChild;
          newFirst.previousSibling = pre;
          newLast.nextSibling = child;
          if (pre) {
            pre.nextSibling = newFirst;
          } else {
            parent.firstChild = newFirst;
          }
          if (child == null) {
            parent.lastChild = newLast;
          } else {
            child.previousSibling = newLast;
          }
          do {
            newFirst.parentNode = parent;
          } while (newFirst !== newLast && (newFirst = newFirst.nextSibling));
          _onUpdateChild(parent.ownerDocument || parent, parent, node);
          if (node.nodeType == DOCUMENT_FRAGMENT_NODE) {
            node.firstChild = node.lastChild = null;
          }
          return node;
        }
        Document.prototype = {
          /**
           * The implementation that created this document.
           *
           * @type DOMImplementation
           * @readonly
           */
          implementation: null,
          nodeName: "#document",
          nodeType: DOCUMENT_NODE,
          /**
           * The DocumentType node of the document.
           *
           * @type DocumentType
           * @readonly
           */
          doctype: null,
          documentElement: null,
          _inc: 1,
          insertBefore: function(newChild, refChild) {
            if (newChild.nodeType === DOCUMENT_FRAGMENT_NODE) {
              var child = newChild.firstChild;
              while (child) {
                var next = child.nextSibling;
                this.insertBefore(child, refChild);
                child = next;
              }
              return newChild;
            }
            _insertBefore(this, newChild, refChild);
            newChild.ownerDocument = this;
            if (this.documentElement === null && newChild.nodeType === ELEMENT_NODE) {
              this.documentElement = newChild;
            }
            return newChild;
          },
          removeChild: function(oldChild) {
            var removed = _removeChild(this, oldChild);
            if (removed === this.documentElement) {
              this.documentElement = null;
            }
            return removed;
          },
          replaceChild: function(newChild, oldChild) {
            _insertBefore(this, newChild, oldChild, assertPreReplacementValidityInDocument);
            newChild.ownerDocument = this;
            if (oldChild) {
              this.removeChild(oldChild);
            }
            if (isElementNode(newChild)) {
              this.documentElement = newChild;
            }
          },
          /**
           * Imports a node from another document into this document, creating a new copy owned by this
           * document. The source node and its subtree are not modified.
           *
           * @param {Node} importedNode
           * The node to import.
           * @param {boolean} deep
           * If true, the contents of the node are recursively imported.
           * If false, only the node itself (and its attributes, if it is an element) are imported.
           * @returns {Node}
           * Returns the newly created import of the node.
           * @see {@link importNode}
           * @see {@link https://dom.spec.whatwg.org/#dom-document-importnode}
           */
          importNode: function(importedNode, deep) {
            return importNode(this, importedNode, deep);
          },
          // Introduced in DOM Level 2:
          getElementById: function(id) {
            var rtv = null;
            _visitNode(this.documentElement, function(node) {
              if (node.nodeType == ELEMENT_NODE) {
                if (node.getAttribute("id") == id) {
                  rtv = node;
                  return true;
                }
              }
            });
            return rtv;
          },
          /**
           * Creates a new `Element` that is owned by this `Document`.
           * In HTML Documents `localName` is the lower cased `tagName`,
           * otherwise no transformation is being applied.
           * When `contentType` implies the HTML namespace, it will be set as `namespaceURI`.
           *
           * __This implementation differs from the specification:__ - The provided name is not checked
           * against the `Name` production,
           * so no related error will be thrown.
           * - There is no interface `HTMLElement`, it is always an `Element`.
           * - There is no support for a second argument to indicate using custom elements.
           *
           * @param {string} tagName
           * @returns {Element}
           * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement
           * @see https://dom.spec.whatwg.org/#dom-document-createelement
           * @see https://dom.spec.whatwg.org/#concept-create-element
           */
          createElement: function(tagName) {
            var node = new Element(PDC);
            node.ownerDocument = this;
            if (this.type === "html") {
              tagName = tagName.toLowerCase();
            }
            if (hasDefaultHTMLNamespace(this.contentType)) {
              node.namespaceURI = NAMESPACE.HTML;
            }
            node.nodeName = tagName;
            node.tagName = tagName;
            node.localName = tagName;
            node.childNodes = new NodeList();
            var attrs = node.attributes = new NamedNodeMap();
            attrs._ownerElement = node;
            return node;
          },
          /**
           * @returns {DocumentFragment}
           */
          createDocumentFragment: function() {
            var node = new DocumentFragment(PDC);
            node.ownerDocument = this;
            node.childNodes = new NodeList();
            return node;
          },
          /**
           * @param {string} data
           * @returns {Text}
           */
          createTextNode: function(data) {
            var node = new Text(PDC);
            node.ownerDocument = this;
            node.childNodes = new NodeList();
            node.appendData(data);
            return node;
          },
          /**
           * @param {string} data
           * @returns {Comment}
           * @see https://dom.spec.whatwg.org/#dom-document-createcomment
           * @see https://www.w3.org/TR/xml/#NT-Comment XML 1.0 production [15]
           * @see https://www.w3.org/TR/DOM-Parsing/#dfn-concept-serialize-xml §3.2.1.3
           *
           *      Note: no validation is performed at creation time. When the resulting document is
           *      serialized with `requireWellFormed: true`, the serializer throws `InvalidStateError`
           *      if the comment data contains `--` anywhere, ends with `-`, or contains characters
           *      outside the XML Char production (W3C DOM Parsing §3.2.1.3). Without that option the
           *      data is emitted verbatim.
           */
          createComment: function(data) {
            var node = new Comment(PDC);
            node.ownerDocument = this;
            node.childNodes = new NodeList();
            node.appendData(data);
            return node;
          },
          /**
           * Returns a new CDATASection node whose data is `data`.
           *
           * __This implementation differs from the specification:__ - calling this method on an HTML
           * document does not throw `NotSupportedError`.
           *
           * @param {string} data
           * @returns {CDATASection}
           * @throws {DOMException}
           * With code `INVALID_CHARACTER_ERR` if `data` contains `"]]>"`.
           * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/createCDATASection
           * @see https://dom.spec.whatwg.org/#dom-document-createcdatasection
           */
          createCDATASection: function(data) {
            if (data.indexOf("]]>") !== -1) {
              throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'data contains "]]>"');
            }
            var node = new CDATASection(PDC);
            node.ownerDocument = this;
            node.childNodes = new NodeList();
            node.appendData(data);
            return node;
          },
          /**
           * Returns a ProcessingInstruction node whose target is target and data is data.
           *
           * __This behavior is slightly different from the in the specs__:
           * - it does not do any input validation on the arguments and doesn't throw
           * "InvalidCharacterError".
           *
           * Note: When the resulting document is serialized with `requireWellFormed: true`, the
           * serializer throws `InvalidStateError` if `.target` is not a valid XML `NCName` (a `Name`
           * with no colon) or is an ASCII case-insensitive match for `"xml"`, or if `.data` contains
           * `?>` or characters outside the XML Char production (W3C DOM Parsing §3.2.1.7). Without that
           * option the target and data are emitted verbatim.
           *
           * @param {string} target
           * @param {string} data
           * @returns {ProcessingInstruction}
           * @see https://developer.mozilla.org/docs/Web/API/Document/createProcessingInstruction
           * @see https://dom.spec.whatwg.org/#dom-document-createprocessinginstruction
           * @see https://www.w3.org/TR/DOM-Parsing/#dfn-concept-serialize-xml §3.2.1.7
           */
          createProcessingInstruction: function(target, data) {
            var node = new ProcessingInstruction(PDC);
            node.ownerDocument = this;
            node.childNodes = new NodeList();
            node.nodeName = node.target = target;
            node.nodeValue = node.data = data;
            return node;
          },
          /**
           * Creates an `Attr` node that is owned by this document.
           * In HTML Documents `localName` is the lower cased `name`,
           * otherwise no transformation is being applied.
           *
           * __This implementation differs from the specification:__ - The provided name is not checked
           * against the `Name` production,
           * so no related error will be thrown.
           *
           * @param {string} name
           * @returns {Attr}
           * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/createAttribute
           * @see https://dom.spec.whatwg.org/#dom-document-createattribute
           */
          createAttribute: function(name) {
            if (!g.QName_exact.test(name)) {
              throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'invalid character in name "' + name + '"');
            }
            if (this.type === "html") {
              name = name.toLowerCase();
            }
            return this._createAttribute(name);
          },
          _createAttribute: function(name) {
            var node = new Attr(PDC);
            node.ownerDocument = this;
            node.childNodes = new NodeList();
            node.name = name;
            node.nodeName = name;
            node.localName = name;
            node.specified = true;
            return node;
          },
          /**
           * Creates an EntityReference object.
           * The current implementation does not fill the `childNodes` with those of the corresponding
           * `Entity`
           *
           * The `name` is validated against the XML `Name` production at creation time; an invalid name
           * throws `InvalidCharacterError`. When the resulting node is serialized with
           * `requireWellFormed: true`, the serializer re-validates `nodeName` against the XML `Name`
           * production and throws `InvalidStateError` if a later `nodeName` mutation made it invalid;
           * without that option the name is emitted verbatim.
           *
           * __This implementation differs from the specification:__ xmldom does not expand entities —
           * the parser resolves entity references inline and never constructs `EntityReference` nodes,
           * so this method is the only producer.
           *
           * @deprecated
           * In DOM Level 4.
           * @param {string} name
           * The name of the entity to reference. No namespace well-formedness checks are performed.
           * @returns {EntityReference}
           * @throws {DOMException}
           * With code `INVALID_CHARACTER_ERR` when `name` is not a valid XML `Name`.
           * @throws {DOMException}
           * with code `NOT_SUPPORTED_ERR` when the document is of type `html`
           * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-392B75AE
           */
          createEntityReference: function(name) {
            if (!g.Name_exact.test(name)) {
              throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'not a valid xml name "' + name + '"');
            }
            if (this.type === "html") {
              throw new DOMException("document is an html document", DOMExceptionName.NotSupportedError);
            }
            var node = new EntityReference(PDC);
            node.ownerDocument = this;
            node.childNodes = new NodeList();
            node.nodeName = name;
            return node;
          },
          // Introduced in DOM Level 2:
          /**
           * @param {string} namespaceURI
           * @param {string} qualifiedName
           * @returns {Element}
           */
          createElementNS: function(namespaceURI, qualifiedName) {
            var validated = validateAndExtract(namespaceURI, qualifiedName);
            var node = new Element(PDC);
            var attrs = node.attributes = new NamedNodeMap();
            node.childNodes = new NodeList();
            node.ownerDocument = this;
            node.nodeName = qualifiedName;
            node.tagName = qualifiedName;
            node.namespaceURI = validated[0];
            node.prefix = validated[1];
            node.localName = validated[2];
            attrs._ownerElement = node;
            return node;
          },
          // Introduced in DOM Level 2:
          /**
           * @param {string} namespaceURI
           * @param {string} qualifiedName
           * @returns {Attr}
           */
          createAttributeNS: function(namespaceURI, qualifiedName) {
            var validated = validateAndExtract(namespaceURI, qualifiedName);
            var node = new Attr(PDC);
            node.ownerDocument = this;
            node.childNodes = new NodeList();
            node.nodeName = qualifiedName;
            node.name = qualifiedName;
            node.specified = true;
            node.namespaceURI = validated[0];
            node.prefix = validated[1];
            node.localName = validated[2];
            return node;
          }
        };
        _extends(Document, Node);
        function Element(symbol) {
          checkSymbol(symbol);
          this._nsMap = /* @__PURE__ */ Object.create(null);
        }
        Element.prototype = {
          nodeType: ELEMENT_NODE,
          /**
           * The attributes of this element.
           *
           * @type {NamedNodeMap | null}
           */
          attributes: null,
          getQualifiedName: function() {
            return this.prefix ? this.prefix + ":" + this.localName : this.localName;
          },
          _isInHTMLDocumentAndNamespace: function() {
            return this.ownerDocument.type === "html" && this.namespaceURI === NAMESPACE.HTML;
          },
          /**
           * Implementaton of Level2 Core function hasAttributes.
           *
           * @returns {boolean}
           * True if attribute list is not empty.
           * @see https://www.w3.org/TR/DOM-Level-2-Core/#core-ID-NodeHasAttrs
           */
          hasAttributes: function() {
            return !!(this.attributes && this.attributes.length);
          },
          hasAttribute: function(name) {
            return !!this.getAttributeNode(name);
          },
          /**
           * Returns element’s first attribute whose qualified name is `name`, and `null`
           * if there is no such attribute.
           *
           * @param {string} name
           * @returns {string | null}
           */
          getAttribute: function(name) {
            var attr = this.getAttributeNode(name);
            return attr ? attr.value : null;
          },
          getAttributeNode: function(name) {
            if (this._isInHTMLDocumentAndNamespace()) {
              name = name.toLowerCase();
            }
            return this.attributes.getNamedItem(name);
          },
          /**
           * Sets the value of element’s first attribute whose qualified name is qualifiedName to value.
           *
           * @param {string} name
           * @param {string} value
           */
          setAttribute: function(name, value) {
            if (this._isInHTMLDocumentAndNamespace()) {
              name = name.toLowerCase();
            }
            var attr = this.getAttributeNode(name);
            if (attr) {
              attr.value = attr.nodeValue = "" + value;
            } else {
              attr = this.ownerDocument._createAttribute(name);
              attr.value = attr.nodeValue = "" + value;
              this.setAttributeNode(attr);
            }
          },
          removeAttribute: function(name) {
            var attr = this.getAttributeNode(name);
            attr && this.removeAttributeNode(attr);
          },
          setAttributeNode: function(newAttr) {
            return this.attributes.setNamedItem(newAttr);
          },
          setAttributeNodeNS: function(newAttr) {
            return this.attributes.setNamedItemNS(newAttr);
          },
          removeAttributeNode: function(oldAttr) {
            return this.attributes.removeNamedItem(oldAttr.nodeName);
          },
          //get real attribute name,and remove it by removeAttributeNode
          removeAttributeNS: function(namespaceURI, localName) {
            var old = this.getAttributeNodeNS(namespaceURI, localName);
            old && this.removeAttributeNode(old);
          },
          hasAttributeNS: function(namespaceURI, localName) {
            return this.getAttributeNodeNS(namespaceURI, localName) != null;
          },
          /**
           * Returns element’s attribute whose namespace is `namespaceURI` and local name is
           * `localName`,
           * or `null` if there is no such attribute.
           *
           * @param {string} namespaceURI
           * @param {string} localName
           * @returns {string | null}
           */
          getAttributeNS: function(namespaceURI, localName) {
            var attr = this.getAttributeNodeNS(namespaceURI, localName);
            return attr ? attr.value : null;
          },
          /**
           * Sets the value of element’s attribute whose namespace is `namespaceURI` and local name is
           * `localName` to value.
           *
           * @param {string} namespaceURI
           * @param {string} qualifiedName
           * @param {string} value
           * @see https://dom.spec.whatwg.org/#dom-element-setattributens
           */
          setAttributeNS: function(namespaceURI, qualifiedName, value) {
            var validated = validateAndExtract(namespaceURI, qualifiedName);
            var localName = validated[2];
            var attr = this.getAttributeNodeNS(namespaceURI, localName);
            if (attr) {
              attr.value = attr.nodeValue = "" + value;
            } else {
              attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
              attr.value = attr.nodeValue = "" + value;
              this.setAttributeNode(attr);
            }
          },
          getAttributeNodeNS: function(namespaceURI, localName) {
            return this.attributes.getNamedItemNS(namespaceURI, localName);
          },
          /**
           * Returns a LiveNodeList of all child elements which have **all** of the given class name(s).
           *
           * Returns an empty list if `classNames` is an empty string or only contains HTML white space
           * characters.
           *
           * Warning: This returns a live LiveNodeList.
           * Changes in the DOM will reflect in the array as the changes occur.
           * If an element selected by this array no longer qualifies for the selector,
           * it will automatically be removed. Be aware of this for iteration purposes.
           *
           * @param {string} classNames
           * Is a string representing the class name(s) to match; multiple class names are separated by
           * (ASCII-)whitespace.
           * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/getElementsByClassName
           * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementsByClassName
           * @see https://dom.spec.whatwg.org/#concept-getelementsbyclassname
           */
          getElementsByClassName: function(classNames) {
            var classNamesSet = toOrderedSet(classNames);
            return new LiveNodeList(this, function(base) {
              var ls = [];
              if (classNamesSet.length > 0) {
                _visitNode(base, function(node) {
                  if (node !== base && node.nodeType === ELEMENT_NODE) {
                    var nodeClassNames = node.getAttribute("class");
                    if (nodeClassNames) {
                      var matches = classNames === nodeClassNames;
                      if (!matches) {
                        var nodeClassNamesSet = toOrderedSet(nodeClassNames);
                        matches = classNamesSet.every(arrayIncludes(nodeClassNamesSet));
                      }
                      if (matches) {
                        ls.push(node);
                      }
                    }
                  }
                });
              }
              return ls;
            });
          },
          /**
           * Returns a LiveNodeList of elements with the given qualifiedName.
           * Searching for all descendants can be done by passing `*` as `qualifiedName`.
           *
           * All descendants of the specified element are searched, but not the element itself.
           * The returned list is live, which means it updates itself with the DOM tree automatically.
           * Therefore, there is no need to call `Element.getElementsByTagName()`
           * with the same element and arguments repeatedly if the DOM changes in between calls.
           *
           * When called on an HTML element in an HTML document,
           * `getElementsByTagName` lower-cases the argument before searching for it.
           * This is undesirable when trying to match camel-cased SVG elements (such as
           * `<linearGradient>`) in an HTML document.
           * Instead, use `Element.getElementsByTagNameNS()`,
           * which preserves the capitalization of the tag name.
           *
           * `Element.getElementsByTagName` is similar to `Document.getElementsByTagName()`,
           * except that it only searches for elements that are descendants of the specified element.
           *
           * @param {string} qualifiedName
           * @returns {LiveNodeList}
           * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/getElementsByTagName
           * @see https://dom.spec.whatwg.org/#concept-getelementsbytagname
           */
          getElementsByTagName: function(qualifiedName) {
            var isHTMLDocument = (this.nodeType === DOCUMENT_NODE ? this : this.ownerDocument).type === "html";
            var lowerQualifiedName = qualifiedName.toLowerCase();
            return new LiveNodeList(this, function(base) {
              var ls = [];
              _visitNode(base, function(node) {
                if (node === base || node.nodeType !== ELEMENT_NODE) {
                  return;
                }
                if (qualifiedName === "*") {
                  ls.push(node);
                } else {
                  var nodeQualifiedName = node.getQualifiedName();
                  var matchingQName = isHTMLDocument && node.namespaceURI === NAMESPACE.HTML ? lowerQualifiedName : qualifiedName;
                  if (nodeQualifiedName === matchingQName) {
                    ls.push(node);
                  }
                }
              });
              return ls;
            });
          },
          getElementsByTagNameNS: function(namespaceURI, localName) {
            return new LiveNodeList(this, function(base) {
              var ls = [];
              _visitNode(base, function(node) {
                if (node !== base && node.nodeType === ELEMENT_NODE && (namespaceURI === "*" || node.namespaceURI === namespaceURI) && (localName === "*" || node.localName == localName)) {
                  ls.push(node);
                }
              });
              return ls;
            });
          }
        };
        Document.prototype.getElementsByClassName = Element.prototype.getElementsByClassName;
        Document.prototype.getElementsByTagName = Element.prototype.getElementsByTagName;
        Document.prototype.getElementsByTagNameNS = Element.prototype.getElementsByTagNameNS;
        _extends(Element, Node);
        function Attr(symbol) {
          checkSymbol(symbol);
          this.namespaceURI = null;
          this.prefix = null;
          this.ownerElement = null;
        }
        Attr.prototype.nodeType = ATTRIBUTE_NODE;
        _extends(Attr, Node);
        function CharacterData(symbol) {
          checkSymbol(symbol);
        }
        CharacterData.prototype = {
          data: "",
          substringData: function(offset, count) {
            return this.data.substring(offset, offset + count);
          },
          appendData: function(text) {
            text = this.data + text;
            this.nodeValue = this.data = text;
            this.length = text.length;
          },
          insertData: function(offset, text) {
            this.replaceData(offset, 0, text);
          },
          deleteData: function(offset, count) {
            this.replaceData(offset, count, "");
          },
          replaceData: function(offset, count, text) {
            var start = this.data.substring(0, offset);
            var end = this.data.substring(offset + count);
            text = start + text + end;
            this.nodeValue = this.data = text;
            this.length = text.length;
          }
        };
        _extends(CharacterData, Node);
        function Text(symbol) {
          checkSymbol(symbol);
        }
        Text.prototype = {
          nodeName: "#text",
          nodeType: TEXT_NODE,
          splitText: function(offset) {
            var text = this.data;
            var newText = text.substring(offset);
            text = text.substring(0, offset);
            this.data = this.nodeValue = text;
            this.length = text.length;
            var newNode = this.ownerDocument.createTextNode(newText);
            if (this.parentNode) {
              this.parentNode.insertBefore(newNode, this.nextSibling);
            }
            return newNode;
          }
        };
        _extends(Text, CharacterData);
        function Comment(symbol) {
          checkSymbol(symbol);
        }
        Comment.prototype = {
          nodeName: "#comment",
          nodeType: COMMENT_NODE
        };
        _extends(Comment, CharacterData);
        function CDATASection(symbol) {
          checkSymbol(symbol);
        }
        CDATASection.prototype = {
          nodeName: "#cdata-section",
          nodeType: CDATA_SECTION_NODE
        };
        _extends(CDATASection, Text);
        function DocumentType(symbol) {
          checkSymbol(symbol);
        }
        DocumentType.prototype.nodeType = DOCUMENT_TYPE_NODE;
        _extends(DocumentType, Node);
        function Notation(symbol) {
          checkSymbol(symbol);
        }
        Notation.prototype.nodeType = NOTATION_NODE;
        _extends(Notation, Node);
        function Entity(symbol) {
          checkSymbol(symbol);
        }
        Entity.prototype.nodeType = ENTITY_NODE;
        _extends(Entity, Node);
        function EntityReference(symbol) {
          checkSymbol(symbol);
        }
        EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
        _extends(EntityReference, Node);
        function DocumentFragment(symbol) {
          checkSymbol(symbol);
        }
        DocumentFragment.prototype.nodeName = "#document-fragment";
        DocumentFragment.prototype.nodeType = DOCUMENT_FRAGMENT_NODE;
        _extends(DocumentFragment, Node);
        function ProcessingInstruction(symbol) {
          checkSymbol(symbol);
        }
        ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
        _extends(ProcessingInstruction, CharacterData);
        function XMLSerializer3() {
        }
        XMLSerializer3.prototype.serializeToString = function(node, options) {
          return nodeSerializeToString.call(node, options);
        };
        Node.prototype.toString = nodeSerializeToString;
        function nodeSerializeToString(options) {
          var opts;
          if (typeof options === "function") {
            opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: options };
          } else if (options != null) {
            opts = {
              requireWellFormed: !!options.requireWellFormed,
              splitCDATASections: options.splitCDATASections !== false,
              nodeFilter: options.nodeFilter || null
            };
          } else {
            opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: null };
          }
          var buf = [];
          var refNode = this.nodeType === DOCUMENT_NODE && this.documentElement || this;
          var prefix = refNode.prefix;
          var uri = refNode.namespaceURI;
          if (uri && prefix == null) {
            var prefix = refNode.lookupPrefix(uri);
            if (prefix == null) {
              var visibleNamespaces = [
                { namespace: uri, prefix: null }
                //{namespace:uri,prefix:''}
              ];
            }
          }
          serializeToString(this, buf, visibleNamespaces, opts);
          return buf.join("");
        }
        function needNamespaceDefine(node, isHTML, visibleNamespaces) {
          var prefix = node.prefix || "";
          var uri = node.namespaceURI;
          if (!uri) {
            return false;
          }
          if (prefix === "xml" && uri === NAMESPACE.XML || uri === NAMESPACE.XMLNS) {
            return false;
          }
          var i = visibleNamespaces.length;
          while (i--) {
            var ns2 = visibleNamespaces[i];
            if (ns2.prefix === prefix) {
              return ns2.namespace !== uri;
            }
          }
          return true;
        }
        function addSerializedAttribute(buf, qualifiedName, value, requireWellFormed) {
          if (requireWellFormed && !g.QName_exact.test(qualifiedName)) {
            throw new DOMException(
              'The attribute name "' + qualifiedName + '" is not a valid XML QName',
              DOMExceptionName.InvalidStateError
            );
          }
          buf.push(" ", qualifiedName, '="', value.replace(/[<>&"\t\n\r]/g, _xmlEncoder), '"');
        }
        function serializeToString(node, buf, visibleNamespaces, opts) {
          if (!visibleNamespaces) {
            visibleNamespaces = [];
          }
          var nodeFilter = opts.nodeFilter;
          var requireWellFormed = opts.requireWellFormed;
          var splitCDATASections = opts.splitCDATASections;
          var doc = node.nodeType === DOCUMENT_NODE ? node : node.ownerDocument;
          var isHTML = doc.type === "html";
          walkDOM(
            node,
            { ns: visibleNamespaces },
            {
              enter: function(n, ctx2) {
                var namespaces = ctx2.ns;
                if (nodeFilter) {
                  n = nodeFilter(n);
                  if (n) {
                    if (typeof n == "string") {
                      buf.push(n);
                      return null;
                    }
                  } else {
                    return null;
                  }
                }
                switch (n.nodeType) {
                  case ELEMENT_NODE:
                    var attrs = n.attributes;
                    var len = attrs.length;
                    var nodeName = n.tagName;
                    var prefixedNodeName = nodeName;
                    if (!isHTML && !n.prefix && n.namespaceURI) {
                      var defaultNS;
                      for (var ai = 0; ai < attrs.length; ai++) {
                        if (attrs.item(ai).name === "xmlns") {
                          defaultNS = attrs.item(ai).value;
                          break;
                        }
                      }
                      if (!defaultNS) {
                        for (var nsi = namespaces.length - 1; nsi >= 0; nsi--) {
                          var nsEntry = namespaces[nsi];
                          if (nsEntry.prefix === "" && nsEntry.namespace === n.namespaceURI) {
                            defaultNS = nsEntry.namespace;
                            break;
                          }
                        }
                      }
                      if (defaultNS !== n.namespaceURI) {
                        for (var nsi = namespaces.length - 1; nsi >= 0; nsi--) {
                          var nsEntry = namespaces[nsi];
                          if (nsEntry.namespace === n.namespaceURI) {
                            if (nsEntry.prefix) {
                              prefixedNodeName = nsEntry.prefix + ":" + nodeName;
                            }
                            break;
                          }
                        }
                      }
                    }
                    if (requireWellFormed && !g.QName_exact.test(prefixedNodeName)) {
                      throw new DOMException(
                        'The element name "' + prefixedNodeName + '" is not a valid XML QName',
                        DOMExceptionName.InvalidStateError
                      );
                    }
                    buf.push("<", prefixedNodeName);
                    var childNamespaces = namespaces.slice();
                    for (var i = 0; i < len; i++) {
                      var attr = attrs.item(i);
                      if (attr.prefix == "xmlns") {
                        childNamespaces.push({
                          prefix: attr.localName,
                          namespace: attr.value
                        });
                      } else if (attr.nodeName == "xmlns") {
                        childNamespaces.push({ prefix: "", namespace: attr.value });
                      }
                    }
                    for (var i = 0; i < len; i++) {
                      var attr = attrs.item(i);
                      if (needNamespaceDefine(attr, isHTML, childNamespaces)) {
                        var attrPrefix = attr.prefix || "";
                        var uri = attr.namespaceURI;
                        addSerializedAttribute(buf, attrPrefix ? "xmlns:" + attrPrefix : "xmlns", uri, requireWellFormed);
                        childNamespaces.push({ prefix: attrPrefix, namespace: uri });
                      }
                      var filteredAttr = nodeFilter ? nodeFilter(attr) : attr;
                      if (filteredAttr) {
                        if (typeof filteredAttr === "string") {
                          buf.push(filteredAttr);
                        } else {
                          addSerializedAttribute(buf, filteredAttr.name, filteredAttr.value, requireWellFormed);
                        }
                      }
                    }
                    if (nodeName === prefixedNodeName && needNamespaceDefine(n, isHTML, childNamespaces)) {
                      var nodePrefix = n.prefix || "";
                      var uri = n.namespaceURI;
                      addSerializedAttribute(buf, nodePrefix ? "xmlns:" + nodePrefix : "xmlns", uri, requireWellFormed);
                      childNamespaces.push({ prefix: nodePrefix, namespace: uri });
                    }
                    var canCloseTag = !n.firstChild;
                    if (canCloseTag && (isHTML || n.namespaceURI === NAMESPACE.HTML)) {
                      canCloseTag = isHTMLVoidElement(nodeName);
                    }
                    if (canCloseTag) {
                      buf.push("/>");
                      return null;
                    }
                    buf.push(">");
                    if (isHTML && isHTMLRawTextElement(nodeName)) {
                      var child = n.firstChild;
                      while (child) {
                        if (child.data) {
                          buf.push(child.data);
                        } else {
                          serializeToString(child, buf, childNamespaces.slice(), opts);
                        }
                        child = child.nextSibling;
                      }
                      buf.push("</", prefixedNodeName, ">");
                      return null;
                    }
                    return { ns: childNamespaces, tag: prefixedNodeName };
                  case DOCUMENT_NODE:
                  case DOCUMENT_FRAGMENT_NODE:
                    if (requireWellFormed && n.nodeType === DOCUMENT_NODE && n.documentElement == null) {
                      throw new DOMException("The Document has no documentElement", DOMExceptionName.InvalidStateError);
                    }
                    return { ns: namespaces };
                  case ATTRIBUTE_NODE:
                    addSerializedAttribute(buf, n.name, n.value, requireWellFormed);
                    return null;
                  case TEXT_NODE:
                    if (requireWellFormed && g.InvalidChar.test(n.data)) {
                      throw new DOMException(
                        "The Text node data contains characters outside the XML Char production",
                        DOMExceptionName.InvalidStateError
                      );
                    }
                    buf.push(n.data.replace(/[<&>]/g, _xmlEncoder));
                    return null;
                  case CDATA_SECTION_NODE:
                    if (requireWellFormed && n.data.indexOf("]]>") !== -1) {
                      throw new DOMException('The CDATASection data contains "]]>"', DOMExceptionName.InvalidStateError);
                    }
                    if (splitCDATASections) {
                      buf.push(g.CDATA_START, n.data.replace(/]]>/g, "]]]]><![CDATA[>"), g.CDATA_END);
                    } else {
                      buf.push(g.CDATA_START, n.data, g.CDATA_END);
                    }
                    return null;
                  case COMMENT_NODE:
                    if (requireWellFormed) {
                      if (g.InvalidChar.test(n.data)) {
                        throw new DOMException(
                          "The comment node data contains characters outside the XML Char production",
                          DOMExceptionName.InvalidStateError
                        );
                      }
                      if (n.data.indexOf("--") !== -1 || n.data[n.data.length - 1] === "-") {
                        throw new DOMException(
                          'The comment node data contains "--" or ends with "-"',
                          DOMExceptionName.InvalidStateError
                        );
                      }
                    }
                    buf.push(g.COMMENT_START, n.data, g.COMMENT_END);
                    return null;
                  case DOCUMENT_TYPE_NODE:
                    var pubid = n.publicId;
                    var sysid = n.systemId;
                    if (requireWellFormed) {
                      if (!g.Name_exact.test(n.name)) {
                        throw new DOMException(
                          'The doctype name "' + n.name + '" is not a valid XML Name',
                          DOMExceptionName.InvalidStateError
                        );
                      }
                      if (pubid && !g.PubidLiteral_match.test(pubid)) {
                        throw new DOMException("DocumentType publicId is not a valid PubidLiteral", DOMExceptionName.InvalidStateError);
                      }
                      if (sysid && sysid !== "." && !g.SystemLiteral_match.test(sysid)) {
                        throw new DOMException("DocumentType systemId is not a valid SystemLiteral", DOMExceptionName.InvalidStateError);
                      }
                      if (n.internalSubset && n.internalSubset.indexOf("]>") !== -1) {
                        throw new DOMException('DocumentType internalSubset contains "]>"', DOMExceptionName.InvalidStateError);
                      }
                    }
                    buf.push(g.DOCTYPE_DECL_START, " ", n.name);
                    if (pubid) {
                      buf.push(" ", g.PUBLIC, " ", pubid);
                      if (sysid && sysid !== ".") {
                        buf.push(" ", sysid);
                      }
                    } else if (sysid && sysid !== ".") {
                      buf.push(" ", g.SYSTEM, " ", sysid);
                    }
                    if (n.internalSubset) {
                      buf.push(" [", n.internalSubset, "]");
                    }
                    buf.push(">");
                    return null;
                  case PROCESSING_INSTRUCTION_NODE:
                    if (requireWellFormed) {
                      if (!g.NCName_exact.test(n.target) || n.target.toLowerCase() === "xml") {
                        throw new DOMException(
                          'The processing instruction target "' + n.target + '" is not a valid XML NCName or is reserved',
                          DOMExceptionName.InvalidStateError
                        );
                      }
                      if (g.InvalidChar.test(n.data)) {
                        throw new DOMException(
                          "The ProcessingInstruction data contains characters outside the XML Char production",
                          DOMExceptionName.InvalidStateError
                        );
                      }
                      if (n.data.indexOf("?>") !== -1) {
                        throw new DOMException('The ProcessingInstruction data contains "?>"', DOMExceptionName.InvalidStateError);
                      }
                    }
                    buf.push("<?", n.target, " ", n.data, "?>");
                    return null;
                  case ENTITY_REFERENCE_NODE:
                    if (requireWellFormed && !g.Name_exact.test(n.nodeName)) {
                      throw new DOMException(
                        'The entity reference name "' + n.nodeName + '" is not a valid XML Name',
                        DOMExceptionName.InvalidStateError
                      );
                    }
                    buf.push("&", n.nodeName, ";");
                    return null;
                  //case ENTITY_NODE:
                  //case NOTATION_NODE:
                  default:
                    buf.push("??", n.nodeName);
                    return null;
                }
              },
              exit: function(n, childCtx) {
                if (childCtx && childCtx.tag) {
                  buf.push("</", childCtx.tag, ">");
                }
              }
            }
          );
        }
        function importNode(doc, node, deep) {
          var destRoot;
          walkDOM(node, null, {
            enter: function(srcNode, destParent) {
              var destNode = srcNode.cloneNode(false);
              destNode.ownerDocument = doc;
              destNode.parentNode = null;
              if (destParent === null) {
                destRoot = destNode;
              } else {
                destParent.appendChild(destNode);
              }
              var shouldDeep = srcNode.nodeType === ATTRIBUTE_NODE || deep;
              return shouldDeep ? destNode : null;
            }
          });
          return destRoot;
        }
        function cloneNode(doc, node, deep) {
          var destRoot;
          walkDOM(node, null, {
            enter: function(srcNode, destParent) {
              var destNode = new srcNode.constructor(PDC);
              for (var n in srcNode) {
                if (hasOwn(srcNode, n)) {
                  var v = srcNode[n];
                  if (typeof v != "object") {
                    if (v != destNode[n]) {
                      destNode[n] = v;
                    }
                  }
                }
              }
              if (srcNode.childNodes) {
                destNode.childNodes = new NodeList();
              }
              destNode.ownerDocument = doc;
              var shouldDeep = deep;
              switch (destNode.nodeType) {
                case ELEMENT_NODE:
                  var attrs = srcNode.attributes;
                  var attrs2 = destNode.attributes = new NamedNodeMap();
                  var len = attrs.length;
                  attrs2._ownerElement = destNode;
                  for (var i = 0; i < len; i++) {
                    destNode.setAttributeNode(cloneNode(doc, attrs.item(i), true));
                  }
                  break;
                case ATTRIBUTE_NODE:
                  shouldDeep = true;
              }
              if (destParent !== null) {
                destParent.appendChild(destNode);
              } else {
                destRoot = destNode;
              }
              return shouldDeep ? destNode : null;
            }
          });
          return destRoot;
        }
        function __set__(object, key, value) {
          object[key] = value;
        }
        function childrenRefresh(node) {
          var ls = [];
          var child = node.firstChild;
          while (child) {
            if (child.nodeType === ELEMENT_NODE) {
              ls.push(child);
            }
            child = child.nextSibling;
          }
          return ls;
        }
        try {
          if (Object.defineProperty) {
            Object.defineProperty(LiveNodeList.prototype, "length", {
              get: function() {
                _updateLiveList(this);
                return this.$$length;
              }
            });
            Object.defineProperty(Node.prototype, "textContent", {
              get: function() {
                if (this.nodeType === ELEMENT_NODE || this.nodeType === DOCUMENT_FRAGMENT_NODE) {
                  var buf = [];
                  walkDOM(this, null, {
                    enter: function(n) {
                      if (n.nodeType === ELEMENT_NODE || n.nodeType === DOCUMENT_FRAGMENT_NODE) {
                        return true;
                      }
                      if (n.nodeType === PROCESSING_INSTRUCTION_NODE || n.nodeType === COMMENT_NODE) {
                        return null;
                      }
                      buf.push(n.nodeValue);
                    }
                  });
                  return buf.join("");
                }
                return this.nodeValue;
              },
              set: function(data) {
                switch (this.nodeType) {
                  case ELEMENT_NODE:
                  case DOCUMENT_FRAGMENT_NODE:
                    while (this.firstChild) {
                      this.removeChild(this.firstChild);
                    }
                    if (data || String(data)) {
                      this.appendChild(this.ownerDocument.createTextNode(data));
                    }
                    break;
                  default:
                    this.data = data;
                    this.value = data;
                    this.nodeValue = data;
                }
              }
            });
            Object.defineProperty(CharacterData.prototype, "data", {
              get: function() {
                return this._data != null ? this._data : "";
              },
              set: function(v) {
                this._data = v;
                this.length = typeof v === "string" ? v.length : 0;
              }
            });
            Object.defineProperty(CharacterData.prototype, "nodeValue", {
              get: function() {
                return this.data;
              },
              set: function(v) {
                this.data = v;
              },
              enumerable: true,
              configurable: true
            });
            Object.defineProperty(Element.prototype, "children", {
              get: function() {
                return new LiveNodeList(this, childrenRefresh);
              }
            });
            Object.defineProperty(Document.prototype, "children", {
              get: function() {
                return new LiveNodeList(this, childrenRefresh);
              }
            });
            Object.defineProperty(DocumentFragment.prototype, "children", {
              get: function() {
                return new LiveNodeList(this, childrenRefresh);
              }
            });
            __set__ = function(object, key, value) {
              object["$$" + key] = value;
            };
          }
        } catch (e) {
        }
        exports._updateLiveList = _updateLiveList;
        exports.Attr = Attr;
        exports.CDATASection = CDATASection;
        exports.CharacterData = CharacterData;
        exports.Comment = Comment;
        exports.Document = Document;
        exports.DocumentFragment = DocumentFragment;
        exports.DocumentType = DocumentType;
        exports.DOMImplementation = DOMImplementation;
        exports.Element = Element;
        exports.Entity = Entity;
        exports.EntityReference = EntityReference;
        exports.LiveNodeList = LiveNodeList;
        exports.NamedNodeMap = NamedNodeMap;
        exports.Node = Node;
        exports.NodeList = NodeList;
        exports.Notation = Notation;
        exports.Text = Text;
        exports.ProcessingInstruction = ProcessingInstruction;
        exports.walkDOM = walkDOM;
        exports.XMLSerializer = XMLSerializer3;
      }
    });

    // node_modules/@xmldom/xmldom/lib/entities.js
    var require_entities = __commonJS({
      "node_modules/@xmldom/xmldom/lib/entities.js"(exports) {
        var freeze = require_conventions().freeze;
        exports.XML_ENTITIES = freeze({
          amp: "&",
          apos: "'",
          gt: ">",
          lt: "<",
          quot: '"'
        });
        exports.HTML_ENTITIES = freeze({
          Aacute: "\xC1",
          aacute: "\xE1",
          Abreve: "\u0102",
          abreve: "\u0103",
          ac: "\u223E",
          acd: "\u223F",
          acE: "\u223E\u0333",
          Acirc: "\xC2",
          acirc: "\xE2",
          acute: "\xB4",
          Acy: "\u0410",
          acy: "\u0430",
          AElig: "\xC6",
          aelig: "\xE6",
          af: "\u2061",
          Afr: "\u{1D504}",
          afr: "\u{1D51E}",
          Agrave: "\xC0",
          agrave: "\xE0",
          alefsym: "\u2135",
          aleph: "\u2135",
          Alpha: "\u0391",
          alpha: "\u03B1",
          Amacr: "\u0100",
          amacr: "\u0101",
          amalg: "\u2A3F",
          AMP: "&",
          amp: "&",
          And: "\u2A53",
          and: "\u2227",
          andand: "\u2A55",
          andd: "\u2A5C",
          andslope: "\u2A58",
          andv: "\u2A5A",
          ang: "\u2220",
          ange: "\u29A4",
          angle: "\u2220",
          angmsd: "\u2221",
          angmsdaa: "\u29A8",
          angmsdab: "\u29A9",
          angmsdac: "\u29AA",
          angmsdad: "\u29AB",
          angmsdae: "\u29AC",
          angmsdaf: "\u29AD",
          angmsdag: "\u29AE",
          angmsdah: "\u29AF",
          angrt: "\u221F",
          angrtvb: "\u22BE",
          angrtvbd: "\u299D",
          angsph: "\u2222",
          angst: "\xC5",
          angzarr: "\u237C",
          Aogon: "\u0104",
          aogon: "\u0105",
          Aopf: "\u{1D538}",
          aopf: "\u{1D552}",
          ap: "\u2248",
          apacir: "\u2A6F",
          apE: "\u2A70",
          ape: "\u224A",
          apid: "\u224B",
          apos: "'",
          ApplyFunction: "\u2061",
          approx: "\u2248",
          approxeq: "\u224A",
          Aring: "\xC5",
          aring: "\xE5",
          Ascr: "\u{1D49C}",
          ascr: "\u{1D4B6}",
          Assign: "\u2254",
          ast: "*",
          asymp: "\u2248",
          asympeq: "\u224D",
          Atilde: "\xC3",
          atilde: "\xE3",
          Auml: "\xC4",
          auml: "\xE4",
          awconint: "\u2233",
          awint: "\u2A11",
          backcong: "\u224C",
          backepsilon: "\u03F6",
          backprime: "\u2035",
          backsim: "\u223D",
          backsimeq: "\u22CD",
          Backslash: "\u2216",
          Barv: "\u2AE7",
          barvee: "\u22BD",
          Barwed: "\u2306",
          barwed: "\u2305",
          barwedge: "\u2305",
          bbrk: "\u23B5",
          bbrktbrk: "\u23B6",
          bcong: "\u224C",
          Bcy: "\u0411",
          bcy: "\u0431",
          bdquo: "\u201E",
          becaus: "\u2235",
          Because: "\u2235",
          because: "\u2235",
          bemptyv: "\u29B0",
          bepsi: "\u03F6",
          bernou: "\u212C",
          Bernoullis: "\u212C",
          Beta: "\u0392",
          beta: "\u03B2",
          beth: "\u2136",
          between: "\u226C",
          Bfr: "\u{1D505}",
          bfr: "\u{1D51F}",
          bigcap: "\u22C2",
          bigcirc: "\u25EF",
          bigcup: "\u22C3",
          bigodot: "\u2A00",
          bigoplus: "\u2A01",
          bigotimes: "\u2A02",
          bigsqcup: "\u2A06",
          bigstar: "\u2605",
          bigtriangledown: "\u25BD",
          bigtriangleup: "\u25B3",
          biguplus: "\u2A04",
          bigvee: "\u22C1",
          bigwedge: "\u22C0",
          bkarow: "\u290D",
          blacklozenge: "\u29EB",
          blacksquare: "\u25AA",
          blacktriangle: "\u25B4",
          blacktriangledown: "\u25BE",
          blacktriangleleft: "\u25C2",
          blacktriangleright: "\u25B8",
          blank: "\u2423",
          blk12: "\u2592",
          blk14: "\u2591",
          blk34: "\u2593",
          block: "\u2588",
          bne: "=\u20E5",
          bnequiv: "\u2261\u20E5",
          bNot: "\u2AED",
          bnot: "\u2310",
          Bopf: "\u{1D539}",
          bopf: "\u{1D553}",
          bot: "\u22A5",
          bottom: "\u22A5",
          bowtie: "\u22C8",
          boxbox: "\u29C9",
          boxDL: "\u2557",
          boxDl: "\u2556",
          boxdL: "\u2555",
          boxdl: "\u2510",
          boxDR: "\u2554",
          boxDr: "\u2553",
          boxdR: "\u2552",
          boxdr: "\u250C",
          boxH: "\u2550",
          boxh: "\u2500",
          boxHD: "\u2566",
          boxHd: "\u2564",
          boxhD: "\u2565",
          boxhd: "\u252C",
          boxHU: "\u2569",
          boxHu: "\u2567",
          boxhU: "\u2568",
          boxhu: "\u2534",
          boxminus: "\u229F",
          boxplus: "\u229E",
          boxtimes: "\u22A0",
          boxUL: "\u255D",
          boxUl: "\u255C",
          boxuL: "\u255B",
          boxul: "\u2518",
          boxUR: "\u255A",
          boxUr: "\u2559",
          boxuR: "\u2558",
          boxur: "\u2514",
          boxV: "\u2551",
          boxv: "\u2502",
          boxVH: "\u256C",
          boxVh: "\u256B",
          boxvH: "\u256A",
          boxvh: "\u253C",
          boxVL: "\u2563",
          boxVl: "\u2562",
          boxvL: "\u2561",
          boxvl: "\u2524",
          boxVR: "\u2560",
          boxVr: "\u255F",
          boxvR: "\u255E",
          boxvr: "\u251C",
          bprime: "\u2035",
          Breve: "\u02D8",
          breve: "\u02D8",
          brvbar: "\xA6",
          Bscr: "\u212C",
          bscr: "\u{1D4B7}",
          bsemi: "\u204F",
          bsim: "\u223D",
          bsime: "\u22CD",
          bsol: "\\",
          bsolb: "\u29C5",
          bsolhsub: "\u27C8",
          bull: "\u2022",
          bullet: "\u2022",
          bump: "\u224E",
          bumpE: "\u2AAE",
          bumpe: "\u224F",
          Bumpeq: "\u224E",
          bumpeq: "\u224F",
          Cacute: "\u0106",
          cacute: "\u0107",
          Cap: "\u22D2",
          cap: "\u2229",
          capand: "\u2A44",
          capbrcup: "\u2A49",
          capcap: "\u2A4B",
          capcup: "\u2A47",
          capdot: "\u2A40",
          CapitalDifferentialD: "\u2145",
          caps: "\u2229\uFE00",
          caret: "\u2041",
          caron: "\u02C7",
          Cayleys: "\u212D",
          ccaps: "\u2A4D",
          Ccaron: "\u010C",
          ccaron: "\u010D",
          Ccedil: "\xC7",
          ccedil: "\xE7",
          Ccirc: "\u0108",
          ccirc: "\u0109",
          Cconint: "\u2230",
          ccups: "\u2A4C",
          ccupssm: "\u2A50",
          Cdot: "\u010A",
          cdot: "\u010B",
          cedil: "\xB8",
          Cedilla: "\xB8",
          cemptyv: "\u29B2",
          cent: "\xA2",
          CenterDot: "\xB7",
          centerdot: "\xB7",
          Cfr: "\u212D",
          cfr: "\u{1D520}",
          CHcy: "\u0427",
          chcy: "\u0447",
          check: "\u2713",
          checkmark: "\u2713",
          Chi: "\u03A7",
          chi: "\u03C7",
          cir: "\u25CB",
          circ: "\u02C6",
          circeq: "\u2257",
          circlearrowleft: "\u21BA",
          circlearrowright: "\u21BB",
          circledast: "\u229B",
          circledcirc: "\u229A",
          circleddash: "\u229D",
          CircleDot: "\u2299",
          circledR: "\xAE",
          circledS: "\u24C8",
          CircleMinus: "\u2296",
          CirclePlus: "\u2295",
          CircleTimes: "\u2297",
          cirE: "\u29C3",
          cire: "\u2257",
          cirfnint: "\u2A10",
          cirmid: "\u2AEF",
          cirscir: "\u29C2",
          ClockwiseContourIntegral: "\u2232",
          CloseCurlyDoubleQuote: "\u201D",
          CloseCurlyQuote: "\u2019",
          clubs: "\u2663",
          clubsuit: "\u2663",
          Colon: "\u2237",
          colon: ":",
          Colone: "\u2A74",
          colone: "\u2254",
          coloneq: "\u2254",
          comma: ",",
          commat: "@",
          comp: "\u2201",
          compfn: "\u2218",
          complement: "\u2201",
          complexes: "\u2102",
          cong: "\u2245",
          congdot: "\u2A6D",
          Congruent: "\u2261",
          Conint: "\u222F",
          conint: "\u222E",
          ContourIntegral: "\u222E",
          Copf: "\u2102",
          copf: "\u{1D554}",
          coprod: "\u2210",
          Coproduct: "\u2210",
          COPY: "\xA9",
          copy: "\xA9",
          copysr: "\u2117",
          CounterClockwiseContourIntegral: "\u2233",
          crarr: "\u21B5",
          Cross: "\u2A2F",
          cross: "\u2717",
          Cscr: "\u{1D49E}",
          cscr: "\u{1D4B8}",
          csub: "\u2ACF",
          csube: "\u2AD1",
          csup: "\u2AD0",
          csupe: "\u2AD2",
          ctdot: "\u22EF",
          cudarrl: "\u2938",
          cudarrr: "\u2935",
          cuepr: "\u22DE",
          cuesc: "\u22DF",
          cularr: "\u21B6",
          cularrp: "\u293D",
          Cup: "\u22D3",
          cup: "\u222A",
          cupbrcap: "\u2A48",
          CupCap: "\u224D",
          cupcap: "\u2A46",
          cupcup: "\u2A4A",
          cupdot: "\u228D",
          cupor: "\u2A45",
          cups: "\u222A\uFE00",
          curarr: "\u21B7",
          curarrm: "\u293C",
          curlyeqprec: "\u22DE",
          curlyeqsucc: "\u22DF",
          curlyvee: "\u22CE",
          curlywedge: "\u22CF",
          curren: "\xA4",
          curvearrowleft: "\u21B6",
          curvearrowright: "\u21B7",
          cuvee: "\u22CE",
          cuwed: "\u22CF",
          cwconint: "\u2232",
          cwint: "\u2231",
          cylcty: "\u232D",
          Dagger: "\u2021",
          dagger: "\u2020",
          daleth: "\u2138",
          Darr: "\u21A1",
          dArr: "\u21D3",
          darr: "\u2193",
          dash: "\u2010",
          Dashv: "\u2AE4",
          dashv: "\u22A3",
          dbkarow: "\u290F",
          dblac: "\u02DD",
          Dcaron: "\u010E",
          dcaron: "\u010F",
          Dcy: "\u0414",
          dcy: "\u0434",
          DD: "\u2145",
          dd: "\u2146",
          ddagger: "\u2021",
          ddarr: "\u21CA",
          DDotrahd: "\u2911",
          ddotseq: "\u2A77",
          deg: "\xB0",
          Del: "\u2207",
          Delta: "\u0394",
          delta: "\u03B4",
          demptyv: "\u29B1",
          dfisht: "\u297F",
          Dfr: "\u{1D507}",
          dfr: "\u{1D521}",
          dHar: "\u2965",
          dharl: "\u21C3",
          dharr: "\u21C2",
          DiacriticalAcute: "\xB4",
          DiacriticalDot: "\u02D9",
          DiacriticalDoubleAcute: "\u02DD",
          DiacriticalGrave: "`",
          DiacriticalTilde: "\u02DC",
          diam: "\u22C4",
          Diamond: "\u22C4",
          diamond: "\u22C4",
          diamondsuit: "\u2666",
          diams: "\u2666",
          die: "\xA8",
          DifferentialD: "\u2146",
          digamma: "\u03DD",
          disin: "\u22F2",
          div: "\xF7",
          divide: "\xF7",
          divideontimes: "\u22C7",
          divonx: "\u22C7",
          DJcy: "\u0402",
          djcy: "\u0452",
          dlcorn: "\u231E",
          dlcrop: "\u230D",
          dollar: "$",
          Dopf: "\u{1D53B}",
          dopf: "\u{1D555}",
          Dot: "\xA8",
          dot: "\u02D9",
          DotDot: "\u20DC",
          doteq: "\u2250",
          doteqdot: "\u2251",
          DotEqual: "\u2250",
          dotminus: "\u2238",
          dotplus: "\u2214",
          dotsquare: "\u22A1",
          doublebarwedge: "\u2306",
          DoubleContourIntegral: "\u222F",
          DoubleDot: "\xA8",
          DoubleDownArrow: "\u21D3",
          DoubleLeftArrow: "\u21D0",
          DoubleLeftRightArrow: "\u21D4",
          DoubleLeftTee: "\u2AE4",
          DoubleLongLeftArrow: "\u27F8",
          DoubleLongLeftRightArrow: "\u27FA",
          DoubleLongRightArrow: "\u27F9",
          DoubleRightArrow: "\u21D2",
          DoubleRightTee: "\u22A8",
          DoubleUpArrow: "\u21D1",
          DoubleUpDownArrow: "\u21D5",
          DoubleVerticalBar: "\u2225",
          DownArrow: "\u2193",
          Downarrow: "\u21D3",
          downarrow: "\u2193",
          DownArrowBar: "\u2913",
          DownArrowUpArrow: "\u21F5",
          DownBreve: "\u0311",
          downdownarrows: "\u21CA",
          downharpoonleft: "\u21C3",
          downharpoonright: "\u21C2",
          DownLeftRightVector: "\u2950",
          DownLeftTeeVector: "\u295E",
          DownLeftVector: "\u21BD",
          DownLeftVectorBar: "\u2956",
          DownRightTeeVector: "\u295F",
          DownRightVector: "\u21C1",
          DownRightVectorBar: "\u2957",
          DownTee: "\u22A4",
          DownTeeArrow: "\u21A7",
          drbkarow: "\u2910",
          drcorn: "\u231F",
          drcrop: "\u230C",
          Dscr: "\u{1D49F}",
          dscr: "\u{1D4B9}",
          DScy: "\u0405",
          dscy: "\u0455",
          dsol: "\u29F6",
          Dstrok: "\u0110",
          dstrok: "\u0111",
          dtdot: "\u22F1",
          dtri: "\u25BF",
          dtrif: "\u25BE",
          duarr: "\u21F5",
          duhar: "\u296F",
          dwangle: "\u29A6",
          DZcy: "\u040F",
          dzcy: "\u045F",
          dzigrarr: "\u27FF",
          Eacute: "\xC9",
          eacute: "\xE9",
          easter: "\u2A6E",
          Ecaron: "\u011A",
          ecaron: "\u011B",
          ecir: "\u2256",
          Ecirc: "\xCA",
          ecirc: "\xEA",
          ecolon: "\u2255",
          Ecy: "\u042D",
          ecy: "\u044D",
          eDDot: "\u2A77",
          Edot: "\u0116",
          eDot: "\u2251",
          edot: "\u0117",
          ee: "\u2147",
          efDot: "\u2252",
          Efr: "\u{1D508}",
          efr: "\u{1D522}",
          eg: "\u2A9A",
          Egrave: "\xC8",
          egrave: "\xE8",
          egs: "\u2A96",
          egsdot: "\u2A98",
          el: "\u2A99",
          Element: "\u2208",
          elinters: "\u23E7",
          ell: "\u2113",
          els: "\u2A95",
          elsdot: "\u2A97",
          Emacr: "\u0112",
          emacr: "\u0113",
          empty: "\u2205",
          emptyset: "\u2205",
          EmptySmallSquare: "\u25FB",
          emptyv: "\u2205",
          EmptyVerySmallSquare: "\u25AB",
          emsp: "\u2003",
          emsp13: "\u2004",
          emsp14: "\u2005",
          ENG: "\u014A",
          eng: "\u014B",
          ensp: "\u2002",
          Eogon: "\u0118",
          eogon: "\u0119",
          Eopf: "\u{1D53C}",
          eopf: "\u{1D556}",
          epar: "\u22D5",
          eparsl: "\u29E3",
          eplus: "\u2A71",
          epsi: "\u03B5",
          Epsilon: "\u0395",
          epsilon: "\u03B5",
          epsiv: "\u03F5",
          eqcirc: "\u2256",
          eqcolon: "\u2255",
          eqsim: "\u2242",
          eqslantgtr: "\u2A96",
          eqslantless: "\u2A95",
          Equal: "\u2A75",
          equals: "=",
          EqualTilde: "\u2242",
          equest: "\u225F",
          Equilibrium: "\u21CC",
          equiv: "\u2261",
          equivDD: "\u2A78",
          eqvparsl: "\u29E5",
          erarr: "\u2971",
          erDot: "\u2253",
          Escr: "\u2130",
          escr: "\u212F",
          esdot: "\u2250",
          Esim: "\u2A73",
          esim: "\u2242",
          Eta: "\u0397",
          eta: "\u03B7",
          ETH: "\xD0",
          eth: "\xF0",
          Euml: "\xCB",
          euml: "\xEB",
          euro: "\u20AC",
          excl: "!",
          exist: "\u2203",
          Exists: "\u2203",
          expectation: "\u2130",
          ExponentialE: "\u2147",
          exponentiale: "\u2147",
          fallingdotseq: "\u2252",
          Fcy: "\u0424",
          fcy: "\u0444",
          female: "\u2640",
          ffilig: "\uFB03",
          fflig: "\uFB00",
          ffllig: "\uFB04",
          Ffr: "\u{1D509}",
          ffr: "\u{1D523}",
          filig: "\uFB01",
          FilledSmallSquare: "\u25FC",
          FilledVerySmallSquare: "\u25AA",
          fjlig: "fj",
          flat: "\u266D",
          fllig: "\uFB02",
          fltns: "\u25B1",
          fnof: "\u0192",
          Fopf: "\u{1D53D}",
          fopf: "\u{1D557}",
          ForAll: "\u2200",
          forall: "\u2200",
          fork: "\u22D4",
          forkv: "\u2AD9",
          Fouriertrf: "\u2131",
          fpartint: "\u2A0D",
          frac12: "\xBD",
          frac13: "\u2153",
          frac14: "\xBC",
          frac15: "\u2155",
          frac16: "\u2159",
          frac18: "\u215B",
          frac23: "\u2154",
          frac25: "\u2156",
          frac34: "\xBE",
          frac35: "\u2157",
          frac38: "\u215C",
          frac45: "\u2158",
          frac56: "\u215A",
          frac58: "\u215D",
          frac78: "\u215E",
          frasl: "\u2044",
          frown: "\u2322",
          Fscr: "\u2131",
          fscr: "\u{1D4BB}",
          gacute: "\u01F5",
          Gamma: "\u0393",
          gamma: "\u03B3",
          Gammad: "\u03DC",
          gammad: "\u03DD",
          gap: "\u2A86",
          Gbreve: "\u011E",
          gbreve: "\u011F",
          Gcedil: "\u0122",
          Gcirc: "\u011C",
          gcirc: "\u011D",
          Gcy: "\u0413",
          gcy: "\u0433",
          Gdot: "\u0120",
          gdot: "\u0121",
          gE: "\u2267",
          ge: "\u2265",
          gEl: "\u2A8C",
          gel: "\u22DB",
          geq: "\u2265",
          geqq: "\u2267",
          geqslant: "\u2A7E",
          ges: "\u2A7E",
          gescc: "\u2AA9",
          gesdot: "\u2A80",
          gesdoto: "\u2A82",
          gesdotol: "\u2A84",
          gesl: "\u22DB\uFE00",
          gesles: "\u2A94",
          Gfr: "\u{1D50A}",
          gfr: "\u{1D524}",
          Gg: "\u22D9",
          gg: "\u226B",
          ggg: "\u22D9",
          gimel: "\u2137",
          GJcy: "\u0403",
          gjcy: "\u0453",
          gl: "\u2277",
          gla: "\u2AA5",
          glE: "\u2A92",
          glj: "\u2AA4",
          gnap: "\u2A8A",
          gnapprox: "\u2A8A",
          gnE: "\u2269",
          gne: "\u2A88",
          gneq: "\u2A88",
          gneqq: "\u2269",
          gnsim: "\u22E7",
          Gopf: "\u{1D53E}",
          gopf: "\u{1D558}",
          grave: "`",
          GreaterEqual: "\u2265",
          GreaterEqualLess: "\u22DB",
          GreaterFullEqual: "\u2267",
          GreaterGreater: "\u2AA2",
          GreaterLess: "\u2277",
          GreaterSlantEqual: "\u2A7E",
          GreaterTilde: "\u2273",
          Gscr: "\u{1D4A2}",
          gscr: "\u210A",
          gsim: "\u2273",
          gsime: "\u2A8E",
          gsiml: "\u2A90",
          Gt: "\u226B",
          GT: ">",
          gt: ">",
          gtcc: "\u2AA7",
          gtcir: "\u2A7A",
          gtdot: "\u22D7",
          gtlPar: "\u2995",
          gtquest: "\u2A7C",
          gtrapprox: "\u2A86",
          gtrarr: "\u2978",
          gtrdot: "\u22D7",
          gtreqless: "\u22DB",
          gtreqqless: "\u2A8C",
          gtrless: "\u2277",
          gtrsim: "\u2273",
          gvertneqq: "\u2269\uFE00",
          gvnE: "\u2269\uFE00",
          Hacek: "\u02C7",
          hairsp: "\u200A",
          half: "\xBD",
          hamilt: "\u210B",
          HARDcy: "\u042A",
          hardcy: "\u044A",
          hArr: "\u21D4",
          harr: "\u2194",
          harrcir: "\u2948",
          harrw: "\u21AD",
          Hat: "^",
          hbar: "\u210F",
          Hcirc: "\u0124",
          hcirc: "\u0125",
          hearts: "\u2665",
          heartsuit: "\u2665",
          hellip: "\u2026",
          hercon: "\u22B9",
          Hfr: "\u210C",
          hfr: "\u{1D525}",
          HilbertSpace: "\u210B",
          hksearow: "\u2925",
          hkswarow: "\u2926",
          hoarr: "\u21FF",
          homtht: "\u223B",
          hookleftarrow: "\u21A9",
          hookrightarrow: "\u21AA",
          Hopf: "\u210D",
          hopf: "\u{1D559}",
          horbar: "\u2015",
          HorizontalLine: "\u2500",
          Hscr: "\u210B",
          hscr: "\u{1D4BD}",
          hslash: "\u210F",
          Hstrok: "\u0126",
          hstrok: "\u0127",
          HumpDownHump: "\u224E",
          HumpEqual: "\u224F",
          hybull: "\u2043",
          hyphen: "\u2010",
          Iacute: "\xCD",
          iacute: "\xED",
          ic: "\u2063",
          Icirc: "\xCE",
          icirc: "\xEE",
          Icy: "\u0418",
          icy: "\u0438",
          Idot: "\u0130",
          IEcy: "\u0415",
          iecy: "\u0435",
          iexcl: "\xA1",
          iff: "\u21D4",
          Ifr: "\u2111",
          ifr: "\u{1D526}",
          Igrave: "\xCC",
          igrave: "\xEC",
          ii: "\u2148",
          iiiint: "\u2A0C",
          iiint: "\u222D",
          iinfin: "\u29DC",
          iiota: "\u2129",
          IJlig: "\u0132",
          ijlig: "\u0133",
          Im: "\u2111",
          Imacr: "\u012A",
          imacr: "\u012B",
          image: "\u2111",
          ImaginaryI: "\u2148",
          imagline: "\u2110",
          imagpart: "\u2111",
          imath: "\u0131",
          imof: "\u22B7",
          imped: "\u01B5",
          Implies: "\u21D2",
          in: "\u2208",
          incare: "\u2105",
          infin: "\u221E",
          infintie: "\u29DD",
          inodot: "\u0131",
          Int: "\u222C",
          int: "\u222B",
          intcal: "\u22BA",
          integers: "\u2124",
          Integral: "\u222B",
          intercal: "\u22BA",
          Intersection: "\u22C2",
          intlarhk: "\u2A17",
          intprod: "\u2A3C",
          InvisibleComma: "\u2063",
          InvisibleTimes: "\u2062",
          IOcy: "\u0401",
          iocy: "\u0451",
          Iogon: "\u012E",
          iogon: "\u012F",
          Iopf: "\u{1D540}",
          iopf: "\u{1D55A}",
          Iota: "\u0399",
          iota: "\u03B9",
          iprod: "\u2A3C",
          iquest: "\xBF",
          Iscr: "\u2110",
          iscr: "\u{1D4BE}",
          isin: "\u2208",
          isindot: "\u22F5",
          isinE: "\u22F9",
          isins: "\u22F4",
          isinsv: "\u22F3",
          isinv: "\u2208",
          it: "\u2062",
          Itilde: "\u0128",
          itilde: "\u0129",
          Iukcy: "\u0406",
          iukcy: "\u0456",
          Iuml: "\xCF",
          iuml: "\xEF",
          Jcirc: "\u0134",
          jcirc: "\u0135",
          Jcy: "\u0419",
          jcy: "\u0439",
          Jfr: "\u{1D50D}",
          jfr: "\u{1D527}",
          jmath: "\u0237",
          Jopf: "\u{1D541}",
          jopf: "\u{1D55B}",
          Jscr: "\u{1D4A5}",
          jscr: "\u{1D4BF}",
          Jsercy: "\u0408",
          jsercy: "\u0458",
          Jukcy: "\u0404",
          jukcy: "\u0454",
          Kappa: "\u039A",
          kappa: "\u03BA",
          kappav: "\u03F0",
          Kcedil: "\u0136",
          kcedil: "\u0137",
          Kcy: "\u041A",
          kcy: "\u043A",
          Kfr: "\u{1D50E}",
          kfr: "\u{1D528}",
          kgreen: "\u0138",
          KHcy: "\u0425",
          khcy: "\u0445",
          KJcy: "\u040C",
          kjcy: "\u045C",
          Kopf: "\u{1D542}",
          kopf: "\u{1D55C}",
          Kscr: "\u{1D4A6}",
          kscr: "\u{1D4C0}",
          lAarr: "\u21DA",
          Lacute: "\u0139",
          lacute: "\u013A",
          laemptyv: "\u29B4",
          lagran: "\u2112",
          Lambda: "\u039B",
          lambda: "\u03BB",
          Lang: "\u27EA",
          lang: "\u27E8",
          langd: "\u2991",
          langle: "\u27E8",
          lap: "\u2A85",
          Laplacetrf: "\u2112",
          laquo: "\xAB",
          Larr: "\u219E",
          lArr: "\u21D0",
          larr: "\u2190",
          larrb: "\u21E4",
          larrbfs: "\u291F",
          larrfs: "\u291D",
          larrhk: "\u21A9",
          larrlp: "\u21AB",
          larrpl: "\u2939",
          larrsim: "\u2973",
          larrtl: "\u21A2",
          lat: "\u2AAB",
          lAtail: "\u291B",
          latail: "\u2919",
          late: "\u2AAD",
          lates: "\u2AAD\uFE00",
          lBarr: "\u290E",
          lbarr: "\u290C",
          lbbrk: "\u2772",
          lbrace: "{",
          lbrack: "[",
          lbrke: "\u298B",
          lbrksld: "\u298F",
          lbrkslu: "\u298D",
          Lcaron: "\u013D",
          lcaron: "\u013E",
          Lcedil: "\u013B",
          lcedil: "\u013C",
          lceil: "\u2308",
          lcub: "{",
          Lcy: "\u041B",
          lcy: "\u043B",
          ldca: "\u2936",
          ldquo: "\u201C",
          ldquor: "\u201E",
          ldrdhar: "\u2967",
          ldrushar: "\u294B",
          ldsh: "\u21B2",
          lE: "\u2266",
          le: "\u2264",
          LeftAngleBracket: "\u27E8",
          LeftArrow: "\u2190",
          Leftarrow: "\u21D0",
          leftarrow: "\u2190",
          LeftArrowBar: "\u21E4",
          LeftArrowRightArrow: "\u21C6",
          leftarrowtail: "\u21A2",
          LeftCeiling: "\u2308",
          LeftDoubleBracket: "\u27E6",
          LeftDownTeeVector: "\u2961",
          LeftDownVector: "\u21C3",
          LeftDownVectorBar: "\u2959",
          LeftFloor: "\u230A",
          leftharpoondown: "\u21BD",
          leftharpoonup: "\u21BC",
          leftleftarrows: "\u21C7",
          LeftRightArrow: "\u2194",
          Leftrightarrow: "\u21D4",
          leftrightarrow: "\u2194",
          leftrightarrows: "\u21C6",
          leftrightharpoons: "\u21CB",
          leftrightsquigarrow: "\u21AD",
          LeftRightVector: "\u294E",
          LeftTee: "\u22A3",
          LeftTeeArrow: "\u21A4",
          LeftTeeVector: "\u295A",
          leftthreetimes: "\u22CB",
          LeftTriangle: "\u22B2",
          LeftTriangleBar: "\u29CF",
          LeftTriangleEqual: "\u22B4",
          LeftUpDownVector: "\u2951",
          LeftUpTeeVector: "\u2960",
          LeftUpVector: "\u21BF",
          LeftUpVectorBar: "\u2958",
          LeftVector: "\u21BC",
          LeftVectorBar: "\u2952",
          lEg: "\u2A8B",
          leg: "\u22DA",
          leq: "\u2264",
          leqq: "\u2266",
          leqslant: "\u2A7D",
          les: "\u2A7D",
          lescc: "\u2AA8",
          lesdot: "\u2A7F",
          lesdoto: "\u2A81",
          lesdotor: "\u2A83",
          lesg: "\u22DA\uFE00",
          lesges: "\u2A93",
          lessapprox: "\u2A85",
          lessdot: "\u22D6",
          lesseqgtr: "\u22DA",
          lesseqqgtr: "\u2A8B",
          LessEqualGreater: "\u22DA",
          LessFullEqual: "\u2266",
          LessGreater: "\u2276",
          lessgtr: "\u2276",
          LessLess: "\u2AA1",
          lesssim: "\u2272",
          LessSlantEqual: "\u2A7D",
          LessTilde: "\u2272",
          lfisht: "\u297C",
          lfloor: "\u230A",
          Lfr: "\u{1D50F}",
          lfr: "\u{1D529}",
          lg: "\u2276",
          lgE: "\u2A91",
          lHar: "\u2962",
          lhard: "\u21BD",
          lharu: "\u21BC",
          lharul: "\u296A",
          lhblk: "\u2584",
          LJcy: "\u0409",
          ljcy: "\u0459",
          Ll: "\u22D8",
          ll: "\u226A",
          llarr: "\u21C7",
          llcorner: "\u231E",
          Lleftarrow: "\u21DA",
          llhard: "\u296B",
          lltri: "\u25FA",
          Lmidot: "\u013F",
          lmidot: "\u0140",
          lmoust: "\u23B0",
          lmoustache: "\u23B0",
          lnap: "\u2A89",
          lnapprox: "\u2A89",
          lnE: "\u2268",
          lne: "\u2A87",
          lneq: "\u2A87",
          lneqq: "\u2268",
          lnsim: "\u22E6",
          loang: "\u27EC",
          loarr: "\u21FD",
          lobrk: "\u27E6",
          LongLeftArrow: "\u27F5",
          Longleftarrow: "\u27F8",
          longleftarrow: "\u27F5",
          LongLeftRightArrow: "\u27F7",
          Longleftrightarrow: "\u27FA",
          longleftrightarrow: "\u27F7",
          longmapsto: "\u27FC",
          LongRightArrow: "\u27F6",
          Longrightarrow: "\u27F9",
          longrightarrow: "\u27F6",
          looparrowleft: "\u21AB",
          looparrowright: "\u21AC",
          lopar: "\u2985",
          Lopf: "\u{1D543}",
          lopf: "\u{1D55D}",
          loplus: "\u2A2D",
          lotimes: "\u2A34",
          lowast: "\u2217",
          lowbar: "_",
          LowerLeftArrow: "\u2199",
          LowerRightArrow: "\u2198",
          loz: "\u25CA",
          lozenge: "\u25CA",
          lozf: "\u29EB",
          lpar: "(",
          lparlt: "\u2993",
          lrarr: "\u21C6",
          lrcorner: "\u231F",
          lrhar: "\u21CB",
          lrhard: "\u296D",
          lrm: "\u200E",
          lrtri: "\u22BF",
          lsaquo: "\u2039",
          Lscr: "\u2112",
          lscr: "\u{1D4C1}",
          Lsh: "\u21B0",
          lsh: "\u21B0",
          lsim: "\u2272",
          lsime: "\u2A8D",
          lsimg: "\u2A8F",
          lsqb: "[",
          lsquo: "\u2018",
          lsquor: "\u201A",
          Lstrok: "\u0141",
          lstrok: "\u0142",
          Lt: "\u226A",
          LT: "<",
          lt: "<",
          ltcc: "\u2AA6",
          ltcir: "\u2A79",
          ltdot: "\u22D6",
          lthree: "\u22CB",
          ltimes: "\u22C9",
          ltlarr: "\u2976",
          ltquest: "\u2A7B",
          ltri: "\u25C3",
          ltrie: "\u22B4",
          ltrif: "\u25C2",
          ltrPar: "\u2996",
          lurdshar: "\u294A",
          luruhar: "\u2966",
          lvertneqq: "\u2268\uFE00",
          lvnE: "\u2268\uFE00",
          macr: "\xAF",
          male: "\u2642",
          malt: "\u2720",
          maltese: "\u2720",
          Map: "\u2905",
          map: "\u21A6",
          mapsto: "\u21A6",
          mapstodown: "\u21A7",
          mapstoleft: "\u21A4",
          mapstoup: "\u21A5",
          marker: "\u25AE",
          mcomma: "\u2A29",
          Mcy: "\u041C",
          mcy: "\u043C",
          mdash: "\u2014",
          mDDot: "\u223A",
          measuredangle: "\u2221",
          MediumSpace: "\u205F",
          Mellintrf: "\u2133",
          Mfr: "\u{1D510}",
          mfr: "\u{1D52A}",
          mho: "\u2127",
          micro: "\xB5",
          mid: "\u2223",
          midast: "*",
          midcir: "\u2AF0",
          middot: "\xB7",
          minus: "\u2212",
          minusb: "\u229F",
          minusd: "\u2238",
          minusdu: "\u2A2A",
          MinusPlus: "\u2213",
          mlcp: "\u2ADB",
          mldr: "\u2026",
          mnplus: "\u2213",
          models: "\u22A7",
          Mopf: "\u{1D544}",
          mopf: "\u{1D55E}",
          mp: "\u2213",
          Mscr: "\u2133",
          mscr: "\u{1D4C2}",
          mstpos: "\u223E",
          Mu: "\u039C",
          mu: "\u03BC",
          multimap: "\u22B8",
          mumap: "\u22B8",
          nabla: "\u2207",
          Nacute: "\u0143",
          nacute: "\u0144",
          nang: "\u2220\u20D2",
          nap: "\u2249",
          napE: "\u2A70\u0338",
          napid: "\u224B\u0338",
          napos: "\u0149",
          napprox: "\u2249",
          natur: "\u266E",
          natural: "\u266E",
          naturals: "\u2115",
          nbsp: "\xA0",
          nbump: "\u224E\u0338",
          nbumpe: "\u224F\u0338",
          ncap: "\u2A43",
          Ncaron: "\u0147",
          ncaron: "\u0148",
          Ncedil: "\u0145",
          ncedil: "\u0146",
          ncong: "\u2247",
          ncongdot: "\u2A6D\u0338",
          ncup: "\u2A42",
          Ncy: "\u041D",
          ncy: "\u043D",
          ndash: "\u2013",
          ne: "\u2260",
          nearhk: "\u2924",
          neArr: "\u21D7",
          nearr: "\u2197",
          nearrow: "\u2197",
          nedot: "\u2250\u0338",
          NegativeMediumSpace: "\u200B",
          NegativeThickSpace: "\u200B",
          NegativeThinSpace: "\u200B",
          NegativeVeryThinSpace: "\u200B",
          nequiv: "\u2262",
          nesear: "\u2928",
          nesim: "\u2242\u0338",
          NestedGreaterGreater: "\u226B",
          NestedLessLess: "\u226A",
          NewLine: "\n",
          nexist: "\u2204",
          nexists: "\u2204",
          Nfr: "\u{1D511}",
          nfr: "\u{1D52B}",
          ngE: "\u2267\u0338",
          nge: "\u2271",
          ngeq: "\u2271",
          ngeqq: "\u2267\u0338",
          ngeqslant: "\u2A7E\u0338",
          nges: "\u2A7E\u0338",
          nGg: "\u22D9\u0338",
          ngsim: "\u2275",
          nGt: "\u226B\u20D2",
          ngt: "\u226F",
          ngtr: "\u226F",
          nGtv: "\u226B\u0338",
          nhArr: "\u21CE",
          nharr: "\u21AE",
          nhpar: "\u2AF2",
          ni: "\u220B",
          nis: "\u22FC",
          nisd: "\u22FA",
          niv: "\u220B",
          NJcy: "\u040A",
          njcy: "\u045A",
          nlArr: "\u21CD",
          nlarr: "\u219A",
          nldr: "\u2025",
          nlE: "\u2266\u0338",
          nle: "\u2270",
          nLeftarrow: "\u21CD",
          nleftarrow: "\u219A",
          nLeftrightarrow: "\u21CE",
          nleftrightarrow: "\u21AE",
          nleq: "\u2270",
          nleqq: "\u2266\u0338",
          nleqslant: "\u2A7D\u0338",
          nles: "\u2A7D\u0338",
          nless: "\u226E",
          nLl: "\u22D8\u0338",
          nlsim: "\u2274",
          nLt: "\u226A\u20D2",
          nlt: "\u226E",
          nltri: "\u22EA",
          nltrie: "\u22EC",
          nLtv: "\u226A\u0338",
          nmid: "\u2224",
          NoBreak: "\u2060",
          NonBreakingSpace: "\xA0",
          Nopf: "\u2115",
          nopf: "\u{1D55F}",
          Not: "\u2AEC",
          not: "\xAC",
          NotCongruent: "\u2262",
          NotCupCap: "\u226D",
          NotDoubleVerticalBar: "\u2226",
          NotElement: "\u2209",
          NotEqual: "\u2260",
          NotEqualTilde: "\u2242\u0338",
          NotExists: "\u2204",
          NotGreater: "\u226F",
          NotGreaterEqual: "\u2271",
          NotGreaterFullEqual: "\u2267\u0338",
          NotGreaterGreater: "\u226B\u0338",
          NotGreaterLess: "\u2279",
          NotGreaterSlantEqual: "\u2A7E\u0338",
          NotGreaterTilde: "\u2275",
          NotHumpDownHump: "\u224E\u0338",
          NotHumpEqual: "\u224F\u0338",
          notin: "\u2209",
          notindot: "\u22F5\u0338",
          notinE: "\u22F9\u0338",
          notinva: "\u2209",
          notinvb: "\u22F7",
          notinvc: "\u22F6",
          NotLeftTriangle: "\u22EA",
          NotLeftTriangleBar: "\u29CF\u0338",
          NotLeftTriangleEqual: "\u22EC",
          NotLess: "\u226E",
          NotLessEqual: "\u2270",
          NotLessGreater: "\u2278",
          NotLessLess: "\u226A\u0338",
          NotLessSlantEqual: "\u2A7D\u0338",
          NotLessTilde: "\u2274",
          NotNestedGreaterGreater: "\u2AA2\u0338",
          NotNestedLessLess: "\u2AA1\u0338",
          notni: "\u220C",
          notniva: "\u220C",
          notnivb: "\u22FE",
          notnivc: "\u22FD",
          NotPrecedes: "\u2280",
          NotPrecedesEqual: "\u2AAF\u0338",
          NotPrecedesSlantEqual: "\u22E0",
          NotReverseElement: "\u220C",
          NotRightTriangle: "\u22EB",
          NotRightTriangleBar: "\u29D0\u0338",
          NotRightTriangleEqual: "\u22ED",
          NotSquareSubset: "\u228F\u0338",
          NotSquareSubsetEqual: "\u22E2",
          NotSquareSuperset: "\u2290\u0338",
          NotSquareSupersetEqual: "\u22E3",
          NotSubset: "\u2282\u20D2",
          NotSubsetEqual: "\u2288",
          NotSucceeds: "\u2281",
          NotSucceedsEqual: "\u2AB0\u0338",
          NotSucceedsSlantEqual: "\u22E1",
          NotSucceedsTilde: "\u227F\u0338",
          NotSuperset: "\u2283\u20D2",
          NotSupersetEqual: "\u2289",
          NotTilde: "\u2241",
          NotTildeEqual: "\u2244",
          NotTildeFullEqual: "\u2247",
          NotTildeTilde: "\u2249",
          NotVerticalBar: "\u2224",
          npar: "\u2226",
          nparallel: "\u2226",
          nparsl: "\u2AFD\u20E5",
          npart: "\u2202\u0338",
          npolint: "\u2A14",
          npr: "\u2280",
          nprcue: "\u22E0",
          npre: "\u2AAF\u0338",
          nprec: "\u2280",
          npreceq: "\u2AAF\u0338",
          nrArr: "\u21CF",
          nrarr: "\u219B",
          nrarrc: "\u2933\u0338",
          nrarrw: "\u219D\u0338",
          nRightarrow: "\u21CF",
          nrightarrow: "\u219B",
          nrtri: "\u22EB",
          nrtrie: "\u22ED",
          nsc: "\u2281",
          nsccue: "\u22E1",
          nsce: "\u2AB0\u0338",
          Nscr: "\u{1D4A9}",
          nscr: "\u{1D4C3}",
          nshortmid: "\u2224",
          nshortparallel: "\u2226",
          nsim: "\u2241",
          nsime: "\u2244",
          nsimeq: "\u2244",
          nsmid: "\u2224",
          nspar: "\u2226",
          nsqsube: "\u22E2",
          nsqsupe: "\u22E3",
          nsub: "\u2284",
          nsubE: "\u2AC5\u0338",
          nsube: "\u2288",
          nsubset: "\u2282\u20D2",
          nsubseteq: "\u2288",
          nsubseteqq: "\u2AC5\u0338",
          nsucc: "\u2281",
          nsucceq: "\u2AB0\u0338",
          nsup: "\u2285",
          nsupE: "\u2AC6\u0338",
          nsupe: "\u2289",
          nsupset: "\u2283\u20D2",
          nsupseteq: "\u2289",
          nsupseteqq: "\u2AC6\u0338",
          ntgl: "\u2279",
          Ntilde: "\xD1",
          ntilde: "\xF1",
          ntlg: "\u2278",
          ntriangleleft: "\u22EA",
          ntrianglelefteq: "\u22EC",
          ntriangleright: "\u22EB",
          ntrianglerighteq: "\u22ED",
          Nu: "\u039D",
          nu: "\u03BD",
          num: "#",
          numero: "\u2116",
          numsp: "\u2007",
          nvap: "\u224D\u20D2",
          nVDash: "\u22AF",
          nVdash: "\u22AE",
          nvDash: "\u22AD",
          nvdash: "\u22AC",
          nvge: "\u2265\u20D2",
          nvgt: ">\u20D2",
          nvHarr: "\u2904",
          nvinfin: "\u29DE",
          nvlArr: "\u2902",
          nvle: "\u2264\u20D2",
          nvlt: "<\u20D2",
          nvltrie: "\u22B4\u20D2",
          nvrArr: "\u2903",
          nvrtrie: "\u22B5\u20D2",
          nvsim: "\u223C\u20D2",
          nwarhk: "\u2923",
          nwArr: "\u21D6",
          nwarr: "\u2196",
          nwarrow: "\u2196",
          nwnear: "\u2927",
          Oacute: "\xD3",
          oacute: "\xF3",
          oast: "\u229B",
          ocir: "\u229A",
          Ocirc: "\xD4",
          ocirc: "\xF4",
          Ocy: "\u041E",
          ocy: "\u043E",
          odash: "\u229D",
          Odblac: "\u0150",
          odblac: "\u0151",
          odiv: "\u2A38",
          odot: "\u2299",
          odsold: "\u29BC",
          OElig: "\u0152",
          oelig: "\u0153",
          ofcir: "\u29BF",
          Ofr: "\u{1D512}",
          ofr: "\u{1D52C}",
          ogon: "\u02DB",
          Ograve: "\xD2",
          ograve: "\xF2",
          ogt: "\u29C1",
          ohbar: "\u29B5",
          ohm: "\u03A9",
          oint: "\u222E",
          olarr: "\u21BA",
          olcir: "\u29BE",
          olcross: "\u29BB",
          oline: "\u203E",
          olt: "\u29C0",
          Omacr: "\u014C",
          omacr: "\u014D",
          Omega: "\u03A9",
          omega: "\u03C9",
          Omicron: "\u039F",
          omicron: "\u03BF",
          omid: "\u29B6",
          ominus: "\u2296",
          Oopf: "\u{1D546}",
          oopf: "\u{1D560}",
          opar: "\u29B7",
          OpenCurlyDoubleQuote: "\u201C",
          OpenCurlyQuote: "\u2018",
          operp: "\u29B9",
          oplus: "\u2295",
          Or: "\u2A54",
          or: "\u2228",
          orarr: "\u21BB",
          ord: "\u2A5D",
          order: "\u2134",
          orderof: "\u2134",
          ordf: "\xAA",
          ordm: "\xBA",
          origof: "\u22B6",
          oror: "\u2A56",
          orslope: "\u2A57",
          orv: "\u2A5B",
          oS: "\u24C8",
          Oscr: "\u{1D4AA}",
          oscr: "\u2134",
          Oslash: "\xD8",
          oslash: "\xF8",
          osol: "\u2298",
          Otilde: "\xD5",
          otilde: "\xF5",
          Otimes: "\u2A37",
          otimes: "\u2297",
          otimesas: "\u2A36",
          Ouml: "\xD6",
          ouml: "\xF6",
          ovbar: "\u233D",
          OverBar: "\u203E",
          OverBrace: "\u23DE",
          OverBracket: "\u23B4",
          OverParenthesis: "\u23DC",
          par: "\u2225",
          para: "\xB6",
          parallel: "\u2225",
          parsim: "\u2AF3",
          parsl: "\u2AFD",
          part: "\u2202",
          PartialD: "\u2202",
          Pcy: "\u041F",
          pcy: "\u043F",
          percnt: "%",
          period: ".",
          permil: "\u2030",
          perp: "\u22A5",
          pertenk: "\u2031",
          Pfr: "\u{1D513}",
          pfr: "\u{1D52D}",
          Phi: "\u03A6",
          phi: "\u03C6",
          phiv: "\u03D5",
          phmmat: "\u2133",
          phone: "\u260E",
          Pi: "\u03A0",
          pi: "\u03C0",
          pitchfork: "\u22D4",
          piv: "\u03D6",
          planck: "\u210F",
          planckh: "\u210E",
          plankv: "\u210F",
          plus: "+",
          plusacir: "\u2A23",
          plusb: "\u229E",
          pluscir: "\u2A22",
          plusdo: "\u2214",
          plusdu: "\u2A25",
          pluse: "\u2A72",
          PlusMinus: "\xB1",
          plusmn: "\xB1",
          plussim: "\u2A26",
          plustwo: "\u2A27",
          pm: "\xB1",
          Poincareplane: "\u210C",
          pointint: "\u2A15",
          Popf: "\u2119",
          popf: "\u{1D561}",
          pound: "\xA3",
          Pr: "\u2ABB",
          pr: "\u227A",
          prap: "\u2AB7",
          prcue: "\u227C",
          prE: "\u2AB3",
          pre: "\u2AAF",
          prec: "\u227A",
          precapprox: "\u2AB7",
          preccurlyeq: "\u227C",
          Precedes: "\u227A",
          PrecedesEqual: "\u2AAF",
          PrecedesSlantEqual: "\u227C",
          PrecedesTilde: "\u227E",
          preceq: "\u2AAF",
          precnapprox: "\u2AB9",
          precneqq: "\u2AB5",
          precnsim: "\u22E8",
          precsim: "\u227E",
          Prime: "\u2033",
          prime: "\u2032",
          primes: "\u2119",
          prnap: "\u2AB9",
          prnE: "\u2AB5",
          prnsim: "\u22E8",
          prod: "\u220F",
          Product: "\u220F",
          profalar: "\u232E",
          profline: "\u2312",
          profsurf: "\u2313",
          prop: "\u221D",
          Proportion: "\u2237",
          Proportional: "\u221D",
          propto: "\u221D",
          prsim: "\u227E",
          prurel: "\u22B0",
          Pscr: "\u{1D4AB}",
          pscr: "\u{1D4C5}",
          Psi: "\u03A8",
          psi: "\u03C8",
          puncsp: "\u2008",
          Qfr: "\u{1D514}",
          qfr: "\u{1D52E}",
          qint: "\u2A0C",
          Qopf: "\u211A",
          qopf: "\u{1D562}",
          qprime: "\u2057",
          Qscr: "\u{1D4AC}",
          qscr: "\u{1D4C6}",
          quaternions: "\u210D",
          quatint: "\u2A16",
          quest: "?",
          questeq: "\u225F",
          QUOT: '"',
          quot: '"',
          rAarr: "\u21DB",
          race: "\u223D\u0331",
          Racute: "\u0154",
          racute: "\u0155",
          radic: "\u221A",
          raemptyv: "\u29B3",
          Rang: "\u27EB",
          rang: "\u27E9",
          rangd: "\u2992",
          range: "\u29A5",
          rangle: "\u27E9",
          raquo: "\xBB",
          Rarr: "\u21A0",
          rArr: "\u21D2",
          rarr: "\u2192",
          rarrap: "\u2975",
          rarrb: "\u21E5",
          rarrbfs: "\u2920",
          rarrc: "\u2933",
          rarrfs: "\u291E",
          rarrhk: "\u21AA",
          rarrlp: "\u21AC",
          rarrpl: "\u2945",
          rarrsim: "\u2974",
          Rarrtl: "\u2916",
          rarrtl: "\u21A3",
          rarrw: "\u219D",
          rAtail: "\u291C",
          ratail: "\u291A",
          ratio: "\u2236",
          rationals: "\u211A",
          RBarr: "\u2910",
          rBarr: "\u290F",
          rbarr: "\u290D",
          rbbrk: "\u2773",
          rbrace: "}",
          rbrack: "]",
          rbrke: "\u298C",
          rbrksld: "\u298E",
          rbrkslu: "\u2990",
          Rcaron: "\u0158",
          rcaron: "\u0159",
          Rcedil: "\u0156",
          rcedil: "\u0157",
          rceil: "\u2309",
          rcub: "}",
          Rcy: "\u0420",
          rcy: "\u0440",
          rdca: "\u2937",
          rdldhar: "\u2969",
          rdquo: "\u201D",
          rdquor: "\u201D",
          rdsh: "\u21B3",
          Re: "\u211C",
          real: "\u211C",
          realine: "\u211B",
          realpart: "\u211C",
          reals: "\u211D",
          rect: "\u25AD",
          REG: "\xAE",
          reg: "\xAE",
          ReverseElement: "\u220B",
          ReverseEquilibrium: "\u21CB",
          ReverseUpEquilibrium: "\u296F",
          rfisht: "\u297D",
          rfloor: "\u230B",
          Rfr: "\u211C",
          rfr: "\u{1D52F}",
          rHar: "\u2964",
          rhard: "\u21C1",
          rharu: "\u21C0",
          rharul: "\u296C",
          Rho: "\u03A1",
          rho: "\u03C1",
          rhov: "\u03F1",
          RightAngleBracket: "\u27E9",
          RightArrow: "\u2192",
          Rightarrow: "\u21D2",
          rightarrow: "\u2192",
          RightArrowBar: "\u21E5",
          RightArrowLeftArrow: "\u21C4",
          rightarrowtail: "\u21A3",
          RightCeiling: "\u2309",
          RightDoubleBracket: "\u27E7",
          RightDownTeeVector: "\u295D",
          RightDownVector: "\u21C2",
          RightDownVectorBar: "\u2955",
          RightFloor: "\u230B",
          rightharpoondown: "\u21C1",
          rightharpoonup: "\u21C0",
          rightleftarrows: "\u21C4",
          rightleftharpoons: "\u21CC",
          rightrightarrows: "\u21C9",
          rightsquigarrow: "\u219D",
          RightTee: "\u22A2",
          RightTeeArrow: "\u21A6",
          RightTeeVector: "\u295B",
          rightthreetimes: "\u22CC",
          RightTriangle: "\u22B3",
          RightTriangleBar: "\u29D0",
          RightTriangleEqual: "\u22B5",
          RightUpDownVector: "\u294F",
          RightUpTeeVector: "\u295C",
          RightUpVector: "\u21BE",
          RightUpVectorBar: "\u2954",
          RightVector: "\u21C0",
          RightVectorBar: "\u2953",
          ring: "\u02DA",
          risingdotseq: "\u2253",
          rlarr: "\u21C4",
          rlhar: "\u21CC",
          rlm: "\u200F",
          rmoust: "\u23B1",
          rmoustache: "\u23B1",
          rnmid: "\u2AEE",
          roang: "\u27ED",
          roarr: "\u21FE",
          robrk: "\u27E7",
          ropar: "\u2986",
          Ropf: "\u211D",
          ropf: "\u{1D563}",
          roplus: "\u2A2E",
          rotimes: "\u2A35",
          RoundImplies: "\u2970",
          rpar: ")",
          rpargt: "\u2994",
          rppolint: "\u2A12",
          rrarr: "\u21C9",
          Rrightarrow: "\u21DB",
          rsaquo: "\u203A",
          Rscr: "\u211B",
          rscr: "\u{1D4C7}",
          Rsh: "\u21B1",
          rsh: "\u21B1",
          rsqb: "]",
          rsquo: "\u2019",
          rsquor: "\u2019",
          rthree: "\u22CC",
          rtimes: "\u22CA",
          rtri: "\u25B9",
          rtrie: "\u22B5",
          rtrif: "\u25B8",
          rtriltri: "\u29CE",
          RuleDelayed: "\u29F4",
          ruluhar: "\u2968",
          rx: "\u211E",
          Sacute: "\u015A",
          sacute: "\u015B",
          sbquo: "\u201A",
          Sc: "\u2ABC",
          sc: "\u227B",
          scap: "\u2AB8",
          Scaron: "\u0160",
          scaron: "\u0161",
          sccue: "\u227D",
          scE: "\u2AB4",
          sce: "\u2AB0",
          Scedil: "\u015E",
          scedil: "\u015F",
          Scirc: "\u015C",
          scirc: "\u015D",
          scnap: "\u2ABA",
          scnE: "\u2AB6",
          scnsim: "\u22E9",
          scpolint: "\u2A13",
          scsim: "\u227F",
          Scy: "\u0421",
          scy: "\u0441",
          sdot: "\u22C5",
          sdotb: "\u22A1",
          sdote: "\u2A66",
          searhk: "\u2925",
          seArr: "\u21D8",
          searr: "\u2198",
          searrow: "\u2198",
          sect: "\xA7",
          semi: ";",
          seswar: "\u2929",
          setminus: "\u2216",
          setmn: "\u2216",
          sext: "\u2736",
          Sfr: "\u{1D516}",
          sfr: "\u{1D530}",
          sfrown: "\u2322",
          sharp: "\u266F",
          SHCHcy: "\u0429",
          shchcy: "\u0449",
          SHcy: "\u0428",
          shcy: "\u0448",
          ShortDownArrow: "\u2193",
          ShortLeftArrow: "\u2190",
          shortmid: "\u2223",
          shortparallel: "\u2225",
          ShortRightArrow: "\u2192",
          ShortUpArrow: "\u2191",
          shy: "\xAD",
          Sigma: "\u03A3",
          sigma: "\u03C3",
          sigmaf: "\u03C2",
          sigmav: "\u03C2",
          sim: "\u223C",
          simdot: "\u2A6A",
          sime: "\u2243",
          simeq: "\u2243",
          simg: "\u2A9E",
          simgE: "\u2AA0",
          siml: "\u2A9D",
          simlE: "\u2A9F",
          simne: "\u2246",
          simplus: "\u2A24",
          simrarr: "\u2972",
          slarr: "\u2190",
          SmallCircle: "\u2218",
          smallsetminus: "\u2216",
          smashp: "\u2A33",
          smeparsl: "\u29E4",
          smid: "\u2223",
          smile: "\u2323",
          smt: "\u2AAA",
          smte: "\u2AAC",
          smtes: "\u2AAC\uFE00",
          SOFTcy: "\u042C",
          softcy: "\u044C",
          sol: "/",
          solb: "\u29C4",
          solbar: "\u233F",
          Sopf: "\u{1D54A}",
          sopf: "\u{1D564}",
          spades: "\u2660",
          spadesuit: "\u2660",
          spar: "\u2225",
          sqcap: "\u2293",
          sqcaps: "\u2293\uFE00",
          sqcup: "\u2294",
          sqcups: "\u2294\uFE00",
          Sqrt: "\u221A",
          sqsub: "\u228F",
          sqsube: "\u2291",
          sqsubset: "\u228F",
          sqsubseteq: "\u2291",
          sqsup: "\u2290",
          sqsupe: "\u2292",
          sqsupset: "\u2290",
          sqsupseteq: "\u2292",
          squ: "\u25A1",
          Square: "\u25A1",
          square: "\u25A1",
          SquareIntersection: "\u2293",
          SquareSubset: "\u228F",
          SquareSubsetEqual: "\u2291",
          SquareSuperset: "\u2290",
          SquareSupersetEqual: "\u2292",
          SquareUnion: "\u2294",
          squarf: "\u25AA",
          squf: "\u25AA",
          srarr: "\u2192",
          Sscr: "\u{1D4AE}",
          sscr: "\u{1D4C8}",
          ssetmn: "\u2216",
          ssmile: "\u2323",
          sstarf: "\u22C6",
          Star: "\u22C6",
          star: "\u2606",
          starf: "\u2605",
          straightepsilon: "\u03F5",
          straightphi: "\u03D5",
          strns: "\xAF",
          Sub: "\u22D0",
          sub: "\u2282",
          subdot: "\u2ABD",
          subE: "\u2AC5",
          sube: "\u2286",
          subedot: "\u2AC3",
          submult: "\u2AC1",
          subnE: "\u2ACB",
          subne: "\u228A",
          subplus: "\u2ABF",
          subrarr: "\u2979",
          Subset: "\u22D0",
          subset: "\u2282",
          subseteq: "\u2286",
          subseteqq: "\u2AC5",
          SubsetEqual: "\u2286",
          subsetneq: "\u228A",
          subsetneqq: "\u2ACB",
          subsim: "\u2AC7",
          subsub: "\u2AD5",
          subsup: "\u2AD3",
          succ: "\u227B",
          succapprox: "\u2AB8",
          succcurlyeq: "\u227D",
          Succeeds: "\u227B",
          SucceedsEqual: "\u2AB0",
          SucceedsSlantEqual: "\u227D",
          SucceedsTilde: "\u227F",
          succeq: "\u2AB0",
          succnapprox: "\u2ABA",
          succneqq: "\u2AB6",
          succnsim: "\u22E9",
          succsim: "\u227F",
          SuchThat: "\u220B",
          Sum: "\u2211",
          sum: "\u2211",
          sung: "\u266A",
          Sup: "\u22D1",
          sup: "\u2283",
          sup1: "\xB9",
          sup2: "\xB2",
          sup3: "\xB3",
          supdot: "\u2ABE",
          supdsub: "\u2AD8",
          supE: "\u2AC6",
          supe: "\u2287",
          supedot: "\u2AC4",
          Superset: "\u2283",
          SupersetEqual: "\u2287",
          suphsol: "\u27C9",
          suphsub: "\u2AD7",
          suplarr: "\u297B",
          supmult: "\u2AC2",
          supnE: "\u2ACC",
          supne: "\u228B",
          supplus: "\u2AC0",
          Supset: "\u22D1",
          supset: "\u2283",
          supseteq: "\u2287",
          supseteqq: "\u2AC6",
          supsetneq: "\u228B",
          supsetneqq: "\u2ACC",
          supsim: "\u2AC8",
          supsub: "\u2AD4",
          supsup: "\u2AD6",
          swarhk: "\u2926",
          swArr: "\u21D9",
          swarr: "\u2199",
          swarrow: "\u2199",
          swnwar: "\u292A",
          szlig: "\xDF",
          Tab: "	",
          target: "\u2316",
          Tau: "\u03A4",
          tau: "\u03C4",
          tbrk: "\u23B4",
          Tcaron: "\u0164",
          tcaron: "\u0165",
          Tcedil: "\u0162",
          tcedil: "\u0163",
          Tcy: "\u0422",
          tcy: "\u0442",
          tdot: "\u20DB",
          telrec: "\u2315",
          Tfr: "\u{1D517}",
          tfr: "\u{1D531}",
          there4: "\u2234",
          Therefore: "\u2234",
          therefore: "\u2234",
          Theta: "\u0398",
          theta: "\u03B8",
          thetasym: "\u03D1",
          thetav: "\u03D1",
          thickapprox: "\u2248",
          thicksim: "\u223C",
          ThickSpace: "\u205F\u200A",
          thinsp: "\u2009",
          ThinSpace: "\u2009",
          thkap: "\u2248",
          thksim: "\u223C",
          THORN: "\xDE",
          thorn: "\xFE",
          Tilde: "\u223C",
          tilde: "\u02DC",
          TildeEqual: "\u2243",
          TildeFullEqual: "\u2245",
          TildeTilde: "\u2248",
          times: "\xD7",
          timesb: "\u22A0",
          timesbar: "\u2A31",
          timesd: "\u2A30",
          tint: "\u222D",
          toea: "\u2928",
          top: "\u22A4",
          topbot: "\u2336",
          topcir: "\u2AF1",
          Topf: "\u{1D54B}",
          topf: "\u{1D565}",
          topfork: "\u2ADA",
          tosa: "\u2929",
          tprime: "\u2034",
          TRADE: "\u2122",
          trade: "\u2122",
          triangle: "\u25B5",
          triangledown: "\u25BF",
          triangleleft: "\u25C3",
          trianglelefteq: "\u22B4",
          triangleq: "\u225C",
          triangleright: "\u25B9",
          trianglerighteq: "\u22B5",
          tridot: "\u25EC",
          trie: "\u225C",
          triminus: "\u2A3A",
          TripleDot: "\u20DB",
          triplus: "\u2A39",
          trisb: "\u29CD",
          tritime: "\u2A3B",
          trpezium: "\u23E2",
          Tscr: "\u{1D4AF}",
          tscr: "\u{1D4C9}",
          TScy: "\u0426",
          tscy: "\u0446",
          TSHcy: "\u040B",
          tshcy: "\u045B",
          Tstrok: "\u0166",
          tstrok: "\u0167",
          twixt: "\u226C",
          twoheadleftarrow: "\u219E",
          twoheadrightarrow: "\u21A0",
          Uacute: "\xDA",
          uacute: "\xFA",
          Uarr: "\u219F",
          uArr: "\u21D1",
          uarr: "\u2191",
          Uarrocir: "\u2949",
          Ubrcy: "\u040E",
          ubrcy: "\u045E",
          Ubreve: "\u016C",
          ubreve: "\u016D",
          Ucirc: "\xDB",
          ucirc: "\xFB",
          Ucy: "\u0423",
          ucy: "\u0443",
          udarr: "\u21C5",
          Udblac: "\u0170",
          udblac: "\u0171",
          udhar: "\u296E",
          ufisht: "\u297E",
          Ufr: "\u{1D518}",
          ufr: "\u{1D532}",
          Ugrave: "\xD9",
          ugrave: "\xF9",
          uHar: "\u2963",
          uharl: "\u21BF",
          uharr: "\u21BE",
          uhblk: "\u2580",
          ulcorn: "\u231C",
          ulcorner: "\u231C",
          ulcrop: "\u230F",
          ultri: "\u25F8",
          Umacr: "\u016A",
          umacr: "\u016B",
          uml: "\xA8",
          UnderBar: "_",
          UnderBrace: "\u23DF",
          UnderBracket: "\u23B5",
          UnderParenthesis: "\u23DD",
          Union: "\u22C3",
          UnionPlus: "\u228E",
          Uogon: "\u0172",
          uogon: "\u0173",
          Uopf: "\u{1D54C}",
          uopf: "\u{1D566}",
          UpArrow: "\u2191",
          Uparrow: "\u21D1",
          uparrow: "\u2191",
          UpArrowBar: "\u2912",
          UpArrowDownArrow: "\u21C5",
          UpDownArrow: "\u2195",
          Updownarrow: "\u21D5",
          updownarrow: "\u2195",
          UpEquilibrium: "\u296E",
          upharpoonleft: "\u21BF",
          upharpoonright: "\u21BE",
          uplus: "\u228E",
          UpperLeftArrow: "\u2196",
          UpperRightArrow: "\u2197",
          Upsi: "\u03D2",
          upsi: "\u03C5",
          upsih: "\u03D2",
          Upsilon: "\u03A5",
          upsilon: "\u03C5",
          UpTee: "\u22A5",
          UpTeeArrow: "\u21A5",
          upuparrows: "\u21C8",
          urcorn: "\u231D",
          urcorner: "\u231D",
          urcrop: "\u230E",
          Uring: "\u016E",
          uring: "\u016F",
          urtri: "\u25F9",
          Uscr: "\u{1D4B0}",
          uscr: "\u{1D4CA}",
          utdot: "\u22F0",
          Utilde: "\u0168",
          utilde: "\u0169",
          utri: "\u25B5",
          utrif: "\u25B4",
          uuarr: "\u21C8",
          Uuml: "\xDC",
          uuml: "\xFC",
          uwangle: "\u29A7",
          vangrt: "\u299C",
          varepsilon: "\u03F5",
          varkappa: "\u03F0",
          varnothing: "\u2205",
          varphi: "\u03D5",
          varpi: "\u03D6",
          varpropto: "\u221D",
          vArr: "\u21D5",
          varr: "\u2195",
          varrho: "\u03F1",
          varsigma: "\u03C2",
          varsubsetneq: "\u228A\uFE00",
          varsubsetneqq: "\u2ACB\uFE00",
          varsupsetneq: "\u228B\uFE00",
          varsupsetneqq: "\u2ACC\uFE00",
          vartheta: "\u03D1",
          vartriangleleft: "\u22B2",
          vartriangleright: "\u22B3",
          Vbar: "\u2AEB",
          vBar: "\u2AE8",
          vBarv: "\u2AE9",
          Vcy: "\u0412",
          vcy: "\u0432",
          VDash: "\u22AB",
          Vdash: "\u22A9",
          vDash: "\u22A8",
          vdash: "\u22A2",
          Vdashl: "\u2AE6",
          Vee: "\u22C1",
          vee: "\u2228",
          veebar: "\u22BB",
          veeeq: "\u225A",
          vellip: "\u22EE",
          Verbar: "\u2016",
          verbar: "|",
          Vert: "\u2016",
          vert: "|",
          VerticalBar: "\u2223",
          VerticalLine: "|",
          VerticalSeparator: "\u2758",
          VerticalTilde: "\u2240",
          VeryThinSpace: "\u200A",
          Vfr: "\u{1D519}",
          vfr: "\u{1D533}",
          vltri: "\u22B2",
          vnsub: "\u2282\u20D2",
          vnsup: "\u2283\u20D2",
          Vopf: "\u{1D54D}",
          vopf: "\u{1D567}",
          vprop: "\u221D",
          vrtri: "\u22B3",
          Vscr: "\u{1D4B1}",
          vscr: "\u{1D4CB}",
          vsubnE: "\u2ACB\uFE00",
          vsubne: "\u228A\uFE00",
          vsupnE: "\u2ACC\uFE00",
          vsupne: "\u228B\uFE00",
          Vvdash: "\u22AA",
          vzigzag: "\u299A",
          Wcirc: "\u0174",
          wcirc: "\u0175",
          wedbar: "\u2A5F",
          Wedge: "\u22C0",
          wedge: "\u2227",
          wedgeq: "\u2259",
          weierp: "\u2118",
          Wfr: "\u{1D51A}",
          wfr: "\u{1D534}",
          Wopf: "\u{1D54E}",
          wopf: "\u{1D568}",
          wp: "\u2118",
          wr: "\u2240",
          wreath: "\u2240",
          Wscr: "\u{1D4B2}",
          wscr: "\u{1D4CC}",
          xcap: "\u22C2",
          xcirc: "\u25EF",
          xcup: "\u22C3",
          xdtri: "\u25BD",
          Xfr: "\u{1D51B}",
          xfr: "\u{1D535}",
          xhArr: "\u27FA",
          xharr: "\u27F7",
          Xi: "\u039E",
          xi: "\u03BE",
          xlArr: "\u27F8",
          xlarr: "\u27F5",
          xmap: "\u27FC",
          xnis: "\u22FB",
          xodot: "\u2A00",
          Xopf: "\u{1D54F}",
          xopf: "\u{1D569}",
          xoplus: "\u2A01",
          xotime: "\u2A02",
          xrArr: "\u27F9",
          xrarr: "\u27F6",
          Xscr: "\u{1D4B3}",
          xscr: "\u{1D4CD}",
          xsqcup: "\u2A06",
          xuplus: "\u2A04",
          xutri: "\u25B3",
          xvee: "\u22C1",
          xwedge: "\u22C0",
          Yacute: "\xDD",
          yacute: "\xFD",
          YAcy: "\u042F",
          yacy: "\u044F",
          Ycirc: "\u0176",
          ycirc: "\u0177",
          Ycy: "\u042B",
          ycy: "\u044B",
          yen: "\xA5",
          Yfr: "\u{1D51C}",
          yfr: "\u{1D536}",
          YIcy: "\u0407",
          yicy: "\u0457",
          Yopf: "\u{1D550}",
          yopf: "\u{1D56A}",
          Yscr: "\u{1D4B4}",
          yscr: "\u{1D4CE}",
          YUcy: "\u042E",
          yucy: "\u044E",
          Yuml: "\u0178",
          yuml: "\xFF",
          Zacute: "\u0179",
          zacute: "\u017A",
          Zcaron: "\u017D",
          zcaron: "\u017E",
          Zcy: "\u0417",
          zcy: "\u0437",
          Zdot: "\u017B",
          zdot: "\u017C",
          zeetrf: "\u2128",
          ZeroWidthSpace: "\u200B",
          Zeta: "\u0396",
          zeta: "\u03B6",
          Zfr: "\u2128",
          zfr: "\u{1D537}",
          ZHcy: "\u0416",
          zhcy: "\u0436",
          zigrarr: "\u21DD",
          Zopf: "\u2124",
          zopf: "\u{1D56B}",
          Zscr: "\u{1D4B5}",
          zscr: "\u{1D4CF}",
          zwj: "\u200D",
          zwnj: "\u200C"
        });
        exports.entityMap = exports.HTML_ENTITIES;
      }
    });

    // node_modules/@xmldom/xmldom/lib/sax.js
    var require_sax = __commonJS({
      "node_modules/@xmldom/xmldom/lib/sax.js"(exports) {
        var conventions = require_conventions();
        var g = require_grammar();
        var errors = require_errors();
        var isHTMLEscapableRawTextElement = conventions.isHTMLEscapableRawTextElement;
        var isHTMLMimeType = conventions.isHTMLMimeType;
        var isHTMLRawTextElement = conventions.isHTMLRawTextElement;
        var hasOwn = conventions.hasOwn;
        var NAMESPACE = conventions.NAMESPACE;
        var ParseError = errors.ParseError;
        var DOMException = errors.DOMException;
        var S_TAG = 0;
        var S_ATTR = 1;
        var S_ATTR_SPACE = 2;
        var S_EQ = 3;
        var S_ATTR_NOQUOT_VALUE = 4;
        var S_ATTR_END = 5;
        var S_TAG_SPACE = 6;
        var S_TAG_CLOSE = 7;
        function XMLReader() {
        }
        XMLReader.prototype = {
          parse: function(source, defaultNSMap, entityMap) {
            var domBuilder = this.domBuilder;
            domBuilder.startDocument();
            _copy(defaultNSMap, defaultNSMap = /* @__PURE__ */ Object.create(null));
            parse(source, defaultNSMap, entityMap, domBuilder, this.errorHandler);
            domBuilder.endDocument();
          }
        };
        var ENTITY_REG = /&#?\w+;?/g;
        function parse(source, defaultNSMapCopy, entityMap, domBuilder, errorHandler) {
          var isHTML = isHTMLMimeType(domBuilder.mimeType);
          if (source.indexOf(g.UNICODE_REPLACEMENT_CHARACTER) >= 0) {
            errorHandler.warning("Unicode replacement character detected, source encoding issues?");
          }
          function fixedFromCharCode(code) {
            if (code > 65535) {
              code -= 65536;
              var surrogate1 = 55296 + (code >> 10), surrogate2 = 56320 + (code & 1023);
              return String.fromCharCode(surrogate1, surrogate2);
            } else {
              return String.fromCharCode(code);
            }
          }
          function entityReplacer(a2) {
            var complete = a2[a2.length - 1] === ";" ? a2 : a2 + ";";
            if (!isHTML && complete !== a2) {
              errorHandler.error("EntityRef: expecting ;");
              return a2;
            }
            var match = g.Reference.exec(complete);
            if (!match || match[0].length !== complete.length) {
              errorHandler.error("entity not matching Reference production: " + a2);
              return a2;
            }
            var k = complete.slice(1, -1);
            if (hasOwn(entityMap, k)) {
              return entityMap[k];
            } else if (k.charAt(0) === "#") {
              return fixedFromCharCode(parseInt(k.substring(1).replace("x", "0x")));
            } else {
              errorHandler.error("entity not found:" + a2);
              return a2;
            }
          }
          function appendText(end2) {
            if (end2 > start) {
              var xt = source.substring(start, end2).replace(ENTITY_REG, entityReplacer);
              locator && position(start);
              domBuilder.characters(xt, 0, end2 - start);
              start = end2;
            }
          }
          var lineStart = 0;
          var lineEnd = 0;
          var linePattern = /\r\n?|\n|$/g;
          var locator = domBuilder.locator;
          function position(p, m) {
            while (p >= lineEnd && (m = linePattern.exec(source))) {
              lineStart = lineEnd;
              lineEnd = m.index + m[0].length;
              locator.lineNumber++;
            }
            locator.columnNumber = p - lineStart + 1;
          }
          var parseStack = [{ currentNSMap: defaultNSMapCopy }];
          var unclosedTags = [];
          var start = 0;
          while (true) {
            try {
              var tagStart = source.indexOf("<", start);
              if (tagStart < 0) {
                if (!isHTML && unclosedTags.length > 0) {
                  return errorHandler.fatalError("unclosed xml tag(s): " + unclosedTags.join(", "));
                }
                if (!source.substring(start).match(/^\s*$/)) {
                  var doc = domBuilder.doc;
                  var text = doc.createTextNode(source.substring(start));
                  if (doc.documentElement) {
                    return errorHandler.error("Extra content at the end of the document");
                  }
                  doc.appendChild(text);
                  domBuilder.currentElement = text;
                }
                return;
              }
              if (tagStart > start) {
                var fromSource = source.substring(start, tagStart);
                if (!isHTML && unclosedTags.length === 0) {
                  fromSource = fromSource.replace(new RegExp(g.S_OPT.source, "g"), "");
                  fromSource && errorHandler.error("Unexpected content outside root element: '" + fromSource + "'");
                }
                appendText(tagStart);
              }
              switch (source.charAt(tagStart + 1)) {
                case "/":
                  var end = source.indexOf(">", tagStart + 2);
                  var tagNameRaw = source.substring(tagStart + 2, end > 0 ? end : void 0);
                  if (!tagNameRaw) {
                    return errorHandler.fatalError("end tag name missing");
                  }
                  var endTagNameStrict = g.reg("^", g.QName_group, g.S_OPT, "$");
                  var tagNameMatch = end > 0 && endTagNameStrict.exec(tagNameRaw);
                  if (!tagNameMatch) {
                    var leadingTagNameMatch = end > 0 && g.reg("^", g.QName_group).exec(tagNameRaw);
                    if (isHTML && leadingTagNameMatch) {
                      errorHandler.warning('end tag name contains invalid trailing characters: "' + tagNameRaw + '"');
                      tagNameMatch = leadingTagNameMatch;
                    } else if (
                      // Backward compatibility, remove this whole `else if` arm in the next breaking release
                      // (XML then falls through to the `fatalError` below, for a clean mode split: XML fatal,
                      // HTML warning). A valid end-tag name followed by a line break and trailing content was
                      // silently accepted while `reg` still used the `m` flag; re-adding `m` here matches exactly
                      // those inputs, kept recoverable and reported.
                      leadingTagNameMatch && new RegExp(endTagNameStrict.source, endTagNameStrict.flags + "m").test(tagNameRaw)
                    ) {
                      errorHandler.error('end tag name is followed by a line break and trailing content: "' + tagNameRaw + '"');
                      tagNameMatch = leadingTagNameMatch;
                    } else {
                      return errorHandler.fatalError('end tag name contains invalid characters: "' + tagNameRaw + '"');
                    }
                  }
                  if (!domBuilder.currentElement && !domBuilder.doc.documentElement) {
                    return;
                  }
                  var currentTagName = unclosedTags[unclosedTags.length - 1] || domBuilder.currentElement.tagName || domBuilder.doc.documentElement.tagName || "";
                  if (currentTagName !== tagNameMatch[1]) {
                    var tagNameLower = tagNameMatch[1].toLowerCase();
                    if (!isHTML || currentTagName.toLowerCase() !== tagNameLower) {
                      return errorHandler.fatalError('Opening and ending tag mismatch: "' + currentTagName + '" != "' + tagNameRaw + '"');
                    }
                  }
                  var config = parseStack.pop();
                  unclosedTags.pop();
                  var localNSMap = config.localNSMap;
                  domBuilder.endElement(config.uri, config.localName, currentTagName);
                  if (localNSMap) {
                    for (var prefix in localNSMap) {
                      if (hasOwn(localNSMap, prefix)) {
                        domBuilder.endPrefixMapping(prefix);
                      }
                    }
                  }
                  end++;
                  break;
                // end element
                case "?":
                  locator && position(tagStart);
                  end = parseProcessingInstruction(source, tagStart, domBuilder, errorHandler);
                  break;
                case "!":
                  locator && position(tagStart);
                  end = parseDoctypeCommentOrCData(source, tagStart, domBuilder, errorHandler, isHTML);
                  break;
                default:
                  locator && position(tagStart);
                  var el = new ElementAttributes();
                  var currentNSMap = parseStack[parseStack.length - 1].currentNSMap;
                  var end = parseElementStartPart(source, tagStart, el, currentNSMap, entityReplacer, errorHandler, isHTML);
                  var len = el.length;
                  if (!el.closed) {
                    if (isHTML && conventions.isHTMLVoidElement(el.tagName)) {
                      el.closed = true;
                    } else {
                      unclosedTags.push(el.tagName);
                    }
                  }
                  if (locator && len) {
                    var locator2 = copyLocator(locator, {});
                    for (var i = 0; i < len; i++) {
                      var a = el[i];
                      position(a.offset);
                      a.locator = copyLocator(locator, {});
                    }
                    domBuilder.locator = locator2;
                    if (appendElement(el, domBuilder, currentNSMap)) {
                      parseStack.push(el);
                    }
                    domBuilder.locator = locator;
                  } else {
                    if (appendElement(el, domBuilder, currentNSMap)) {
                      parseStack.push(el);
                    }
                  }
                  if (isHTML && !el.closed) {
                    end = parseHtmlSpecialContent(source, end, el.tagName, entityReplacer, domBuilder);
                  } else {
                    end++;
                  }
              }
            } catch (e) {
              if (e instanceof ParseError) {
                throw e;
              } else if (e instanceof DOMException) {
                return errorHandler.fatalError("Error constructing the DOM: " + e.name + ": " + e.message, e);
              }
              errorHandler.error("element parse error: " + e);
              end = -1;
            }
            if (end > start) {
              start = end;
            } else {
              appendText(Math.max(tagStart, start) + 1);
            }
          }
        }
        function copyLocator(f, t) {
          t.lineNumber = f.lineNumber;
          t.columnNumber = f.columnNumber;
          return t;
        }
        function parseElementStartPart(source, start, el, currentNSMap, entityReplacer, errorHandler, isHTML) {
          function addAttribute(qname, value2, startIndex) {
            if (hasOwn(el.attributeNames, qname)) {
              return errorHandler.fatalError("Attribute " + qname + " redefined");
            }
            if (!isHTML && value2.indexOf("<") >= 0) {
              return errorHandler.fatalError("Unescaped '<' not allowed in attributes values");
            }
            el.addValue(
              qname,
              // @see https://www.w3.org/TR/xml/#AVNormalize
              // since the xmldom sax parser does not "interpret" DTD the following is not implemented:
              // - recursive replacement of (DTD) entity references
              // - trimming and collapsing multiple spaces into a single one for attributes that are not of type CDATA
              value2.replace(/[\t\n\r]/g, " ").replace(ENTITY_REG, entityReplacer),
              startIndex
            );
          }
          var attrName;
          var value;
          var p = ++start;
          var s = S_TAG;
          while (true) {
            var c = source.charAt(p);
            if (s === S_TAG && c === "<") {
              throw new Error("unexpected < in tag name: " + source.slice(start, p));
            }
            switch (c) {
              case "=":
                if (s === S_ATTR) {
                  attrName = source.slice(start, p);
                  s = S_EQ;
                } else if (s === S_ATTR_SPACE) {
                  s = S_EQ;
                } else {
                  throw new Error("attribute equal must after attrName");
                }
                break;
              case "'":
              case '"':
                if (s === S_EQ || s === S_ATTR) {
                  if (s === S_ATTR) {
                    errorHandler.warning('attribute value must after "="');
                    attrName = source.slice(start, p);
                  }
                  start = p + 1;
                  p = source.indexOf(c, start);
                  if (p > 0) {
                    value = source.slice(start, p);
                    addAttribute(attrName, value, start - 1);
                    s = S_ATTR_END;
                  } else {
                    throw new Error("attribute value no end '" + c + "' match");
                  }
                } else if (s == S_ATTR_NOQUOT_VALUE) {
                  value = source.slice(start, p);
                  addAttribute(attrName, value, start);
                  errorHandler.warning('attribute "' + attrName + '" missed start quot(' + c + ")!!");
                  start = p + 1;
                  s = S_ATTR_END;
                } else {
                  throw new Error('attribute value must after "="');
                }
                break;
              case "/":
                switch (s) {
                  case S_TAG:
                    el.setTagName(source.slice(start, p));
                  case S_ATTR_END:
                  case S_TAG_SPACE:
                  case S_TAG_CLOSE:
                    s = S_TAG_CLOSE;
                    el.closed = true;
                  case S_ATTR_NOQUOT_VALUE:
                  case S_ATTR:
                    break;
                  case S_ATTR_SPACE:
                    el.closed = true;
                    break;
                  //case S_EQ:
                  default:
                    throw new Error("attribute invalid close char('/')");
                }
                break;
              case "":
                errorHandler.error("unexpected end of input");
                if (s == S_TAG) {
                  el.setTagName(source.slice(start, p));
                }
                return p;
              case ">":
                switch (s) {
                  case S_TAG:
                    el.setTagName(source.slice(start, p));
                  case S_ATTR_END:
                  case S_TAG_SPACE:
                  case S_TAG_CLOSE:
                    break;
                  //normal
                  case S_ATTR_NOQUOT_VALUE:
                  //Compatible state
                  case S_ATTR:
                    value = source.slice(start, p);
                    if (value.slice(-1) === "/") {
                      el.closed = true;
                      value = value.slice(0, -1);
                    }
                  case S_ATTR_SPACE:
                    if (s === S_ATTR_SPACE) {
                      value = attrName;
                    }
                    if (s == S_ATTR_NOQUOT_VALUE) {
                      errorHandler.warning('attribute "' + value + '" missed quot(")!');
                      addAttribute(attrName, value, start);
                    } else {
                      if (!isHTML) {
                        errorHandler.warning('attribute "' + value + '" missed value!! "' + value + '" instead!!');
                      }
                      addAttribute(value, value, start);
                    }
                    break;
                  case S_EQ:
                    if (!isHTML) {
                      return errorHandler.fatalError(`AttValue: ' or " expected`);
                    }
                }
                return p;
              /*xml space '\x20' | #x9 | #xD | #xA; */
              case "\x80":
                c = " ";
              default:
                if (c <= " ") {
                  switch (s) {
                    case S_TAG:
                      el.setTagName(source.slice(start, p));
                      s = S_TAG_SPACE;
                      break;
                    case S_ATTR:
                      attrName = source.slice(start, p);
                      s = S_ATTR_SPACE;
                      break;
                    case S_ATTR_NOQUOT_VALUE:
                      var value = source.slice(start, p);
                      errorHandler.warning('attribute "' + value + '" missed quot(")!!');
                      addAttribute(attrName, value, start);
                    case S_ATTR_END:
                      s = S_TAG_SPACE;
                      break;
                  }
                } else {
                  switch (s) {
                    //case S_TAG:void();break;
                    //case S_ATTR:void();break;
                    //case S_ATTR_NOQUOT_VALUE:void();break;
                    case S_ATTR_SPACE:
                      if (!isHTML) {
                        errorHandler.warning('attribute "' + attrName + '" missed value!! "' + attrName + '" instead2!!');
                      }
                      addAttribute(attrName, attrName, start);
                      start = p;
                      s = S_ATTR;
                      break;
                    case S_ATTR_END:
                      errorHandler.warning('attribute space is required"' + attrName + '"!!');
                    case S_TAG_SPACE:
                      s = S_ATTR;
                      start = p;
                      break;
                    case S_EQ:
                      s = S_ATTR_NOQUOT_VALUE;
                      start = p;
                      break;
                    case S_TAG_CLOSE:
                      throw new Error("elements closed character '/' and '>' must be connected to");
                  }
                }
            }
            p++;
          }
        }
        function appendElement(el, domBuilder, currentNSMap) {
          var tagName = el.tagName;
          var localNSMap = null;
          var i = el.length;
          while (i--) {
            var a = el[i];
            var qName = a.qName;
            var value = a.value;
            var nsp = qName.indexOf(":");
            if (nsp > 0) {
              var prefix = a.prefix = qName.slice(0, nsp);
              var localName = qName.slice(nsp + 1);
              var nsPrefix = prefix === "xmlns" && localName;
            } else {
              localName = qName;
              prefix = null;
              nsPrefix = qName === "xmlns" && "";
            }
            a.localName = localName;
            if (nsPrefix !== false) {
              if (localNSMap == null) {
                localNSMap = /* @__PURE__ */ Object.create(null);
                currentNSMap = Object.create(currentNSMap);
              }
              currentNSMap[nsPrefix] = localNSMap[nsPrefix] = value;
              a.uri = NAMESPACE.XMLNS;
              domBuilder.startPrefixMapping(nsPrefix, value);
            }
          }
          var i = el.length;
          while (i--) {
            a = el[i];
            if (a.prefix) {
              if (a.prefix === "xml") {
                a.uri = NAMESPACE.XML;
              }
              if (a.prefix !== "xmlns") {
                a.uri = currentNSMap[a.prefix];
              }
            }
          }
          var nsp = tagName.indexOf(":");
          if (nsp > 0) {
            prefix = el.prefix = tagName.slice(0, nsp);
            localName = el.localName = tagName.slice(nsp + 1);
          } else {
            prefix = null;
            localName = el.localName = tagName;
          }
          var ns2 = el.uri = currentNSMap[prefix || ""];
          domBuilder.startElement(ns2, localName, tagName, el);
          if (el.closed) {
            domBuilder.endElement(ns2, localName, tagName);
            if (localNSMap) {
              for (prefix in localNSMap) {
                if (hasOwn(localNSMap, prefix)) {
                  domBuilder.endPrefixMapping(prefix);
                }
              }
            }
          } else {
            el.currentNSMap = currentNSMap;
            el.localNSMap = localNSMap;
            return true;
          }
        }
        function parseHtmlSpecialContent(source, elStartEnd, tagName, entityReplacer, domBuilder) {
          var isEscapableRaw = isHTMLEscapableRawTextElement(tagName);
          if (isEscapableRaw || isHTMLRawTextElement(tagName)) {
            var closeTag = new RegExp("</" + tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ">", "ig");
            closeTag.lastIndex = elStartEnd;
            var match = closeTag.exec(source);
            var elEndStart = match ? match.index : -1;
            if (elEndStart < 0) {
              return elStartEnd + 1;
            }
            var text = source.substring(elStartEnd + 1, elEndStart);
            if (isEscapableRaw) {
              text = text.replace(ENTITY_REG, entityReplacer);
            }
            domBuilder.characters(text, 0, text.length);
            return elEndStart;
          }
          return elStartEnd + 1;
        }
        function _copy(source, target) {
          for (var n in source) {
            if (hasOwn(source, n)) {
              target[n] = source[n];
            }
          }
        }
        function parseUtils(source, start) {
          var index = start;
          function char(n) {
            n = n || 0;
            return source.charAt(index + n);
          }
          function skip(n) {
            n = n || 1;
            index += n;
          }
          function skipBlanks() {
            var blanks = 0;
            while (index < source.length) {
              var c = char();
              if (c !== " " && c !== "\n" && c !== "	" && c !== "\r") {
                return blanks;
              }
              blanks++;
              skip();
            }
            return -1;
          }
          function substringFromIndex() {
            return source.substring(index);
          }
          function substringStartsWith(text) {
            return source.substring(index, index + text.length) === text;
          }
          function substringStartsWithCaseInsensitive(text) {
            return source.substring(index, index + text.length).toUpperCase() === text.toUpperCase();
          }
          function getMatch(args) {
            var expr = g.reg("^", args);
            var match = expr.exec(substringFromIndex());
            if (match) {
              skip(match[0].length);
              return match[0];
            }
            return null;
          }
          return {
            char,
            getIndex: function() {
              return index;
            },
            getMatch,
            getSource: function() {
              return source;
            },
            skip,
            skipBlanks,
            substringFromIndex,
            substringStartsWith,
            substringStartsWithCaseInsensitive
          };
        }
        function parseDoctypeInternalSubset(p, errorHandler) {
          function parsePI(p2, errorHandler2) {
            var match = g.PI.exec(p2.substringFromIndex());
            if (!match) {
              return errorHandler2.fatalError("processing instruction is not well-formed at position " + p2.getIndex());
            }
            if (match[1].toLowerCase() === "xml") {
              return errorHandler2.fatalError(
                "xml declaration is only allowed at the start of the document, but found at position " + p2.getIndex()
              );
            }
            p2.skip(match[0].length);
            return match[0];
          }
          var source = p.getSource();
          if (p.char() === "[") {
            p.skip(1);
            var intSubsetStart = p.getIndex();
            while (p.getIndex() < source.length) {
              p.skipBlanks();
              if (p.char() === "]") {
                var internalSubset = source.substring(intSubsetStart, p.getIndex());
                p.skip(1);
                return internalSubset;
              }
              var current = null;
              if (p.char() === "<" && p.char(1) === "!") {
                switch (p.char(2)) {
                  case "E":
                    if (p.char(3) === "L") {
                      current = p.getMatch(g.elementdecl);
                    } else if (p.char(3) === "N") {
                      current = p.getMatch(g.EntityDecl);
                    }
                    break;
                  case "A":
                    current = p.getMatch(g.AttlistDecl);
                    break;
                  case "N":
                    current = p.getMatch(g.NotationDecl);
                    break;
                  case "-":
                    current = p.getMatch(g.Comment);
                    break;
                }
              } else if (p.char() === "<" && p.char(1) === "?") {
                current = parsePI(p, errorHandler);
              } else if (p.char() === "%") {
                current = p.getMatch(g.PEReference);
              } else {
                return errorHandler.fatalError("Error detected in Markup declaration");
              }
              if (!current) {
                return errorHandler.fatalError("Error in internal subset at position " + p.getIndex());
              }
            }
            return errorHandler.fatalError("doctype internal subset is not well-formed, missing ]");
          }
        }
        function parseDoctypeCommentOrCData(source, start, domBuilder, errorHandler, isHTML) {
          var p = parseUtils(source, start);
          switch (isHTML ? p.char(2).toUpperCase() : p.char(2)) {
            case "-":
              var comment = p.getMatch(g.Comment);
              if (comment) {
                domBuilder.comment(comment, g.COMMENT_START.length, comment.length - g.COMMENT_START.length - g.COMMENT_END.length);
                return p.getIndex();
              } else {
                return errorHandler.fatalError("comment is not well-formed at position " + p.getIndex());
              }
            case "[":
              var cdata = p.getMatch(g.CDSect);
              if (cdata) {
                if (!isHTML && !domBuilder.currentElement) {
                  return errorHandler.fatalError("CDATA outside of element");
                }
                domBuilder.startCDATA();
                domBuilder.characters(cdata, g.CDATA_START.length, cdata.length - g.CDATA_START.length - g.CDATA_END.length);
                domBuilder.endCDATA();
                return p.getIndex();
              } else {
                return errorHandler.fatalError("Invalid CDATA starting at position " + start);
              }
            case "D": {
              if (domBuilder.doc && domBuilder.doc.documentElement) {
                return errorHandler.fatalError("Doctype not allowed inside or after documentElement at position " + p.getIndex());
              }
              if (isHTML ? !p.substringStartsWithCaseInsensitive(g.DOCTYPE_DECL_START) : !p.substringStartsWith(g.DOCTYPE_DECL_START)) {
                return errorHandler.fatalError("Expected " + g.DOCTYPE_DECL_START + " at position " + p.getIndex());
              }
              p.skip(g.DOCTYPE_DECL_START.length);
              if (p.skipBlanks() < 1) {
                return errorHandler.fatalError("Expected whitespace after " + g.DOCTYPE_DECL_START + " at position " + p.getIndex());
              }
              var doctype = {
                name: void 0,
                publicId: void 0,
                systemId: void 0,
                internalSubset: void 0
              };
              doctype.name = p.getMatch(g.Name);
              if (!doctype.name)
                return errorHandler.fatalError("doctype name missing or contains unexpected characters at position " + p.getIndex());
              if (isHTML && doctype.name.toLowerCase() !== "html") {
                errorHandler.warning("Unexpected DOCTYPE in HTML document at position " + p.getIndex());
              }
              p.skipBlanks();
              if (p.substringStartsWith(g.PUBLIC) || p.substringStartsWith(g.SYSTEM)) {
                var match = g.ExternalID_match.exec(p.substringFromIndex());
                if (!match) {
                  return errorHandler.fatalError("doctype external id is not well-formed at position " + p.getIndex());
                }
                if (match.groups.SystemLiteralOnly !== void 0) {
                  doctype.systemId = match.groups.SystemLiteralOnly;
                } else {
                  doctype.systemId = match.groups.SystemLiteral;
                  doctype.publicId = match.groups.PubidLiteral;
                }
                p.skip(match[0].length);
              } else if (isHTML && p.substringStartsWithCaseInsensitive(g.SYSTEM)) {
                p.skip(g.SYSTEM.length);
                if (p.skipBlanks() < 1) {
                  return errorHandler.fatalError("Expected whitespace after " + g.SYSTEM + " at position " + p.getIndex());
                }
                doctype.systemId = p.getMatch(g.ABOUT_LEGACY_COMPAT_SystemLiteral);
                if (!doctype.systemId) {
                  return errorHandler.fatalError(
                    "Expected " + g.ABOUT_LEGACY_COMPAT + " in single or double quotes after " + g.SYSTEM + " at position " + p.getIndex()
                  );
                }
              }
              if (isHTML && doctype.systemId && !g.ABOUT_LEGACY_COMPAT_SystemLiteral.test(doctype.systemId)) {
                errorHandler.warning("Unexpected doctype.systemId in HTML document at position " + p.getIndex());
              }
              if (!isHTML) {
                p.skipBlanks();
                doctype.internalSubset = parseDoctypeInternalSubset(p, errorHandler);
              }
              p.skipBlanks();
              if (p.char() !== ">") {
                return errorHandler.fatalError("doctype not terminated with > at position " + p.getIndex());
              }
              p.skip(1);
              domBuilder.startDTD(doctype.name, doctype.publicId, doctype.systemId, doctype.internalSubset);
              domBuilder.endDTD();
              return p.getIndex();
            }
            default:
              return errorHandler.fatalError('Not well-formed XML starting with "<!" at position ' + start);
          }
        }
        function parseProcessingInstruction(source, start, domBuilder, errorHandler) {
          var match = source.substring(start).match(g.PI);
          if (!match) {
            return errorHandler.fatalError("Invalid processing instruction starting at position " + start);
          }
          if (match[1].toLowerCase() === "xml") {
            if (start > 0) {
              return errorHandler.fatalError(
                "processing instruction at position " + start + " is an xml declaration which is only at the start of the document"
              );
            }
            if (!g.XMLDecl.test(source.substring(start))) {
              return errorHandler.fatalError("xml declaration is not well-formed");
            }
          }
          domBuilder.processingInstruction(match[1], match[2]);
          return start + match[0].length;
        }
        function ElementAttributes() {
          this.attributeNames = /* @__PURE__ */ Object.create(null);
        }
        ElementAttributes.prototype = {
          setTagName: function(tagName) {
            if (!g.QName_exact.test(tagName)) {
              throw new Error("invalid tagName:" + tagName);
            }
            this.tagName = tagName;
          },
          addValue: function(qName, value, offset) {
            if (!g.QName_exact.test(qName)) {
              throw new Error("invalid attribute:" + qName);
            }
            this.attributeNames[qName] = this.length;
            this[this.length++] = { qName, value, offset };
          },
          length: 0,
          getLocalName: function(i) {
            return this[i].localName;
          },
          getLocator: function(i) {
            return this[i].locator;
          },
          getQName: function(i) {
            return this[i].qName;
          },
          getURI: function(i) {
            return this[i].uri;
          },
          getValue: function(i) {
            return this[i].value;
          }
          //	,getIndex:function(uri, localName)){
          //		if(localName){
          //
          //		}else{
          //			var qName = uri
          //		}
          //	},
          //	getValue:function(){return this.getValue(this.getIndex.apply(this,arguments))},
          //	getType:function(uri,localName){}
          //	getType:function(i){},
        };
        exports.XMLReader = XMLReader;
        exports.parseUtils = parseUtils;
        exports.parseDoctypeCommentOrCData = parseDoctypeCommentOrCData;
      }
    });

    // node_modules/@xmldom/xmldom/lib/dom-parser.js
    var require_dom_parser = __commonJS({
      "node_modules/@xmldom/xmldom/lib/dom-parser.js"(exports) {
        var conventions = require_conventions();
        var dom = require_dom();
        var errors = require_errors();
        var entities = require_entities();
        var sax = require_sax();
        var DOMImplementation = dom.DOMImplementation;
        var hasDefaultHTMLNamespace = conventions.hasDefaultHTMLNamespace;
        var isHTMLMimeType = conventions.isHTMLMimeType;
        var isValidMimeType = conventions.isValidMimeType;
        var MIME_TYPE = conventions.MIME_TYPE;
        var NAMESPACE = conventions.NAMESPACE;
        var ParseError = errors.ParseError;
        var XMLReader = sax.XMLReader;
        function normalizeLineEndings(input) {
          return input.replace(/\r[\n\u0085]/g, "\n").replace(/[\r\u0085\u2028\u2029]/g, "\n");
        }
        function DOMParser3(options) {
          options = options || {};
          if (options.locator === void 0) {
            options.locator = true;
          }
          this.assign = options.assign || conventions.assign;
          this.domHandler = options.domHandler || DOMHandler;
          this.onError = options.onError || options.errorHandler;
          if (options.errorHandler && typeof options.errorHandler !== "function") {
            throw new TypeError("errorHandler object is no longer supported, switch to onError!");
          } else if (options.errorHandler) {
            options.errorHandler("warning", "The `errorHandler` option has been deprecated, use `onError` instead!", this);
          }
          this.normalizeLineEndings = options.normalizeLineEndings || normalizeLineEndings;
          this.locator = !!options.locator;
          this.xmlns = this.assign(/* @__PURE__ */ Object.create(null), options.xmlns);
        }
        DOMParser3.prototype.parseFromString = function(source, mimeType) {
          if (!isValidMimeType(mimeType)) {
            throw new TypeError('DOMParser.parseFromString: the provided mimeType "' + mimeType + '" is not valid.');
          }
          var defaultNSMap = this.assign(/* @__PURE__ */ Object.create(null), this.xmlns);
          var entityMap = entities.XML_ENTITIES;
          var defaultNamespace = defaultNSMap[""] || null;
          if (hasDefaultHTMLNamespace(mimeType)) {
            entityMap = entities.HTML_ENTITIES;
            defaultNamespace = NAMESPACE.HTML;
          } else if (mimeType === MIME_TYPE.XML_SVG_IMAGE) {
            defaultNamespace = NAMESPACE.SVG;
          }
          defaultNSMap[""] = defaultNamespace;
          defaultNSMap.xml = defaultNSMap.xml || NAMESPACE.XML;
          var domBuilder = new this.domHandler({
            mimeType,
            defaultNamespace,
            onError: this.onError
          });
          var locator = this.locator ? {} : void 0;
          if (this.locator) {
            domBuilder.setDocumentLocator(locator);
          }
          var sax2 = new XMLReader();
          sax2.errorHandler = domBuilder;
          sax2.domBuilder = domBuilder;
          var isXml = !conventions.isHTMLMimeType(mimeType);
          if (isXml && typeof source !== "string") {
            sax2.errorHandler.fatalError("source is not a string");
          }
          sax2.parse(this.normalizeLineEndings(String(source)), defaultNSMap, entityMap);
          if (!domBuilder.doc.documentElement) {
            sax2.errorHandler.fatalError("missing root element");
          }
          return domBuilder.doc;
        };
        function DOMHandler(options) {
          var opt = options || {};
          this.mimeType = opt.mimeType || MIME_TYPE.XML_APPLICATION;
          this.defaultNamespace = opt.defaultNamespace || null;
          this.cdata = false;
          this.currentElement = void 0;
          this.doc = void 0;
          this.locator = void 0;
          this.onError = opt.onError;
        }
        function position(locator, node) {
          node.lineNumber = locator.lineNumber;
          node.columnNumber = locator.columnNumber;
        }
        DOMHandler.prototype = {
          /**
           * Either creates an XML or an HTML document and stores it under `this.doc`.
           * If it is an XML document, `this.defaultNamespace` is used to create it,
           * and it will not contain any `childNodes`.
           * If it is an HTML document, it will be created without any `childNodes`.
           *
           * @see http://www.saxproject.org/apidoc/org/xml/sax/ContentHandler.html
           */
          startDocument: function() {
            var impl = new DOMImplementation();
            this.doc = isHTMLMimeType(this.mimeType) ? impl.createHTMLDocument(false) : impl.createDocument(this.defaultNamespace, "");
          },
          startElement: function(namespaceURI, localName, qName, attrs) {
            var doc = this.doc;
            var el = doc.createElementNS(namespaceURI, qName || localName);
            var len = attrs.length;
            appendElement(this, el);
            this.currentElement = el;
            this.locator && position(this.locator, el);
            for (var i = 0; i < len; i++) {
              var namespaceURI = attrs.getURI(i);
              var value = attrs.getValue(i);
              var qName = attrs.getQName(i);
              var attr = doc.createAttributeNS(namespaceURI, qName);
              this.locator && position(attrs.getLocator(i), attr);
              attr.value = attr.nodeValue = value;
              el.setAttributeNode(attr);
            }
          },
          endElement: function(namespaceURI, localName, qName) {
            this.currentElement = this.currentElement.parentNode;
          },
          startPrefixMapping: function(prefix, uri) {
          },
          endPrefixMapping: function(prefix) {
          },
          processingInstruction: function(target, data) {
            var ins = this.doc.createProcessingInstruction(target, data);
            this.locator && position(this.locator, ins);
            appendElement(this, ins);
          },
          ignorableWhitespace: function(ch, start, length) {
          },
          characters: function(chars, start, length) {
            chars = _toString.apply(this, arguments);
            if (chars) {
              if (this.cdata) {
                var charNode = this.doc.createCDATASection(chars);
              } else {
                var charNode = this.doc.createTextNode(chars);
              }
              if (this.currentElement) {
                this.currentElement.appendChild(charNode);
              } else if (/^\s*$/.test(chars)) {
                this.doc.appendChild(charNode);
              }
              this.locator && position(this.locator, charNode);
            }
          },
          skippedEntity: function(name) {
          },
          endDocument: function() {
            this.doc.normalize();
          },
          /**
           * Stores the locator to be able to set the `columnNumber` and `lineNumber`
           * on the created DOM nodes.
           *
           * @param {Locator} locator
           */
          setDocumentLocator: function(locator) {
            if (locator) {
              locator.lineNumber = 0;
            }
            this.locator = locator;
          },
          //LexicalHandler
          comment: function(chars, start, length) {
            chars = _toString.apply(this, arguments);
            var comm = this.doc.createComment(chars);
            this.locator && position(this.locator, comm);
            appendElement(this, comm);
          },
          startCDATA: function() {
            this.cdata = true;
          },
          endCDATA: function() {
            this.cdata = false;
          },
          startDTD: function(name, publicId, systemId, internalSubset) {
            var impl = this.doc.implementation;
            if (impl && impl.createDocumentType) {
              var dt = impl.createDocumentType(name, publicId, systemId, internalSubset);
              this.locator && position(this.locator, dt);
              appendElement(this, dt);
              this.doc.doctype = dt;
            }
          },
          reportError: function(level, message) {
            if (typeof this.onError === "function") {
              try {
                this.onError(level, message, this);
              } catch (e) {
                throw new ParseError("Reporting " + level + ' "' + message + '" caused ' + e, this.locator);
              }
            } else {
              console.error("[xmldom " + level + "]	" + message, _locator(this.locator));
            }
          },
          /**
           * @see http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
           */
          warning: function(message) {
            this.reportError("warning", message);
          },
          error: function(message) {
            this.reportError("error", message);
          },
          /**
           * This function reports a fatal error and throws a ParseError.
           *
           * @param {string} message
           * - The message to be used for reporting and throwing the error.
           * @param {Error} [cause]
           * The error that caused this fatal error, preserved as the thrown `ParseError`'s `cause`.
           * @returns {never}
           * This function always throws an error and never returns a value.
           * @throws {ParseError}
           * Always throws a ParseError with the provided message.
           */
          fatalError: function(message, cause) {
            this.reportError("fatalError", message);
            throw new ParseError(message, this.locator, cause);
          }
        };
        function _locator(l) {
          if (l) {
            return "\n@#[line:" + l.lineNumber + ",col:" + l.columnNumber + "]";
          }
        }
        function _toString(chars, start, length) {
          if (typeof chars == "string") {
            return chars.substr(start, length);
          } else {
            if (chars.length >= start + length || start) {
              return new java.lang.String(chars, start, length) + "";
            }
            return chars;
          }
        }
        "endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(
          /\w+/g,
          function(key) {
            DOMHandler.prototype[key] = function() {
              return null;
            };
          }
        );
        function appendElement(handler, node) {
          if (!handler.currentElement) {
            handler.doc.appendChild(node);
          } else {
            handler.currentElement.appendChild(node);
          }
        }
        function onErrorStopParsing(level) {
          if (level === "error") throw "onErrorStopParsing";
        }
        function onWarningStopParsing() {
          throw "onWarningStopParsing";
        }
        exports.__DOMHandler = DOMHandler;
        exports.DOMParser = DOMParser3;
        exports.normalizeLineEndings = normalizeLineEndings;
        exports.onErrorStopParsing = onErrorStopParsing;
        exports.onWarningStopParsing = onWarningStopParsing;
      }
    });

    // node_modules/@xmldom/xmldom/lib/index.js
    var require_lib = __commonJS({
      "node_modules/@xmldom/xmldom/lib/index.js"(exports) {
        var conventions = require_conventions();
        exports.assign = conventions.assign;
        exports.hasDefaultHTMLNamespace = conventions.hasDefaultHTMLNamespace;
        exports.isHTMLMimeType = conventions.isHTMLMimeType;
        exports.isValidMimeType = conventions.isValidMimeType;
        exports.MIME_TYPE = conventions.MIME_TYPE;
        exports.NAMESPACE = conventions.NAMESPACE;
        var errors = require_errors();
        exports.DOMException = errors.DOMException;
        exports.DOMExceptionName = errors.DOMExceptionName;
        exports.ExceptionCode = errors.ExceptionCode;
        exports.ParseError = errors.ParseError;
        var dom = require_dom();
        exports.Attr = dom.Attr;
        exports.CDATASection = dom.CDATASection;
        exports.CharacterData = dom.CharacterData;
        exports.Comment = dom.Comment;
        exports.Document = dom.Document;
        exports.DocumentFragment = dom.DocumentFragment;
        exports.DocumentType = dom.DocumentType;
        exports.DOMImplementation = dom.DOMImplementation;
        exports.Element = dom.Element;
        exports.Entity = dom.Entity;
        exports.EntityReference = dom.EntityReference;
        exports.LiveNodeList = dom.LiveNodeList;
        exports.NamedNodeMap = dom.NamedNodeMap;
        exports.Node = dom.Node;
        exports.NodeList = dom.NodeList;
        exports.Notation = dom.Notation;
        exports.ProcessingInstruction = dom.ProcessingInstruction;
        exports.Text = dom.Text;
        exports.XMLSerializer = dom.XMLSerializer;
        var domParser = require_dom_parser();
        exports.DOMParser = domParser.DOMParser;
        exports.normalizeLineEndings = domParser.normalizeLineEndings;
        exports.onErrorStopParsing = domParser.onErrorStopParsing;
        exports.onWarningStopParsing = domParser.onWarningStopParsing;
      }
    });

    // node_modules/jszip/dist/jszip.min.js
    var require_jszip_min = __commonJS({
      "node_modules/jszip/dist/jszip.min.js"(exports, module) {
        !(function(e) {
          if ("object" == typeof exports && "undefined" != typeof module) module.exports = e();
          else if ("function" == typeof define && define.amd) define([], e);
          else {
            ("undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof self ? self : this).JSZip = e();
          }
        })(function() {
          return (function s(a, o, h) {
            function u(r, e2) {
              if (!o[r]) {
                if (!a[r]) {
                  var t = "function" == typeof __require && __require;
                  if (!e2 && t) return t(r, true);
                  if (l) return l(r, true);
                  var n = new Error("Cannot find module '" + r + "'");
                  throw n.code = "MODULE_NOT_FOUND", n;
                }
                var i = o[r] = { exports: {} };
                a[r][0].call(i.exports, function(e3) {
                  var t2 = a[r][1][e3];
                  return u(t2 || e3);
                }, i, i.exports, s, a, o, h);
              }
              return o[r].exports;
            }
            for (var l = "function" == typeof __require && __require, e = 0; e < h.length; e++) u(h[e]);
            return u;
          })({ 1: [function(e, t, r) {
            var d = e("./utils"), c = e("./support"), p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            r.encode = function(e2) {
              for (var t2, r2, n, i, s, a, o, h = [], u = 0, l = e2.length, f = l, c2 = "string" !== d.getTypeOf(e2); u < e2.length; ) f = l - u, n = c2 ? (t2 = e2[u++], r2 = u < l ? e2[u++] : 0, u < l ? e2[u++] : 0) : (t2 = e2.charCodeAt(u++), r2 = u < l ? e2.charCodeAt(u++) : 0, u < l ? e2.charCodeAt(u++) : 0), i = t2 >> 2, s = (3 & t2) << 4 | r2 >> 4, a = 1 < f ? (15 & r2) << 2 | n >> 6 : 64, o = 2 < f ? 63 & n : 64, h.push(p.charAt(i) + p.charAt(s) + p.charAt(a) + p.charAt(o));
              return h.join("");
            }, r.decode = function(e2) {
              var t2, r2, n, i, s, a, o = 0, h = 0, u = "data:";
              if (e2.substr(0, u.length) === u) throw new Error("Invalid base64 input, it looks like a data url.");
              var l, f = 3 * (e2 = e2.replace(/[^A-Za-z0-9+/=]/g, "")).length / 4;
              if (e2.charAt(e2.length - 1) === p.charAt(64) && f--, e2.charAt(e2.length - 2) === p.charAt(64) && f--, f % 1 != 0) throw new Error("Invalid base64 input, bad content length.");
              for (l = c.uint8array ? new Uint8Array(0 | f) : new Array(0 | f); o < e2.length; ) t2 = p.indexOf(e2.charAt(o++)) << 2 | (i = p.indexOf(e2.charAt(o++))) >> 4, r2 = (15 & i) << 4 | (s = p.indexOf(e2.charAt(o++))) >> 2, n = (3 & s) << 6 | (a = p.indexOf(e2.charAt(o++))), l[h++] = t2, 64 !== s && (l[h++] = r2), 64 !== a && (l[h++] = n);
              return l;
            };
          }, { "./support": 30, "./utils": 32 }], 2: [function(e, t, r) {
            var n = e("./external"), i = e("./stream/DataWorker"), s = e("./stream/Crc32Probe"), a = e("./stream/DataLengthProbe");
            function o(e2, t2, r2, n2, i2) {
              this.compressedSize = e2, this.uncompressedSize = t2, this.crc32 = r2, this.compression = n2, this.compressedContent = i2;
            }
            o.prototype = { getContentWorker: function() {
              var e2 = new i(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")), t2 = this;
              return e2.on("end", function() {
                if (this.streamInfo.data_length !== t2.uncompressedSize) throw new Error("Bug : uncompressed data size mismatch");
              }), e2;
            }, getCompressedWorker: function() {
              return new i(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
            } }, o.createWorkerFrom = function(e2, t2, r2) {
              return e2.pipe(new s()).pipe(new a("uncompressedSize")).pipe(t2.compressWorker(r2)).pipe(new a("compressedSize")).withStreamInfo("compression", t2);
            }, t.exports = o;
          }, { "./external": 6, "./stream/Crc32Probe": 25, "./stream/DataLengthProbe": 26, "./stream/DataWorker": 27 }], 3: [function(e, t, r) {
            var n = e("./stream/GenericWorker");
            r.STORE = { magic: "\0\0", compressWorker: function() {
              return new n("STORE compression");
            }, uncompressWorker: function() {
              return new n("STORE decompression");
            } }, r.DEFLATE = e("./flate");
          }, { "./flate": 7, "./stream/GenericWorker": 28 }], 4: [function(e, t, r) {
            var n = e("./utils");
            var o = (function() {
              for (var e2, t2 = [], r2 = 0; r2 < 256; r2++) {
                e2 = r2;
                for (var n2 = 0; n2 < 8; n2++) e2 = 1 & e2 ? 3988292384 ^ e2 >>> 1 : e2 >>> 1;
                t2[r2] = e2;
              }
              return t2;
            })();
            t.exports = function(e2, t2) {
              return void 0 !== e2 && e2.length ? "string" !== n.getTypeOf(e2) ? (function(e3, t3, r2, n2) {
                var i = o, s = n2 + r2;
                e3 ^= -1;
                for (var a = n2; a < s; a++) e3 = e3 >>> 8 ^ i[255 & (e3 ^ t3[a])];
                return -1 ^ e3;
              })(0 | t2, e2, e2.length, 0) : (function(e3, t3, r2, n2) {
                var i = o, s = n2 + r2;
                e3 ^= -1;
                for (var a = n2; a < s; a++) e3 = e3 >>> 8 ^ i[255 & (e3 ^ t3.charCodeAt(a))];
                return -1 ^ e3;
              })(0 | t2, e2, e2.length, 0) : 0;
            };
          }, { "./utils": 32 }], 5: [function(e, t, r) {
            r.base64 = false, r.binary = false, r.dir = false, r.createFolders = true, r.date = null, r.compression = null, r.compressionOptions = null, r.comment = null, r.unixPermissions = null, r.dosPermissions = null;
          }, {}], 6: [function(e, t, r) {
            var n = null;
            n = "undefined" != typeof Promise ? Promise : e("lie"), t.exports = { Promise: n };
          }, { lie: 37 }], 7: [function(e, t, r) {
            var n = "undefined" != typeof Uint8Array && "undefined" != typeof Uint16Array && "undefined" != typeof Uint32Array, i = e("pako"), s = e("./utils"), a = e("./stream/GenericWorker"), o = n ? "uint8array" : "array";
            function h(e2, t2) {
              a.call(this, "FlateWorker/" + e2), this._pako = null, this._pakoAction = e2, this._pakoOptions = t2, this.meta = {};
            }
            r.magic = "\b\0", s.inherits(h, a), h.prototype.processChunk = function(e2) {
              this.meta = e2.meta, null === this._pako && this._createPako(), this._pako.push(s.transformTo(o, e2.data), false);
            }, h.prototype.flush = function() {
              a.prototype.flush.call(this), null === this._pako && this._createPako(), this._pako.push([], true);
            }, h.prototype.cleanUp = function() {
              a.prototype.cleanUp.call(this), this._pako = null;
            }, h.prototype._createPako = function() {
              this._pako = new i[this._pakoAction]({ raw: true, level: this._pakoOptions.level || -1 });
              var t2 = this;
              this._pako.onData = function(e2) {
                t2.push({ data: e2, meta: t2.meta });
              };
            }, r.compressWorker = function(e2) {
              return new h("Deflate", e2);
            }, r.uncompressWorker = function() {
              return new h("Inflate", {});
            };
          }, { "./stream/GenericWorker": 28, "./utils": 32, pako: 38 }], 8: [function(e, t, r) {
            function A(e2, t2) {
              var r2, n2 = "";
              for (r2 = 0; r2 < t2; r2++) n2 += String.fromCharCode(255 & e2), e2 >>>= 8;
              return n2;
            }
            function n(e2, t2, r2, n2, i2, s2) {
              var a, o, h = e2.file, u = e2.compression, l = s2 !== O.utf8encode, f = I.transformTo("string", s2(h.name)), c = I.transformTo("string", O.utf8encode(h.name)), d = h.comment, p = I.transformTo("string", s2(d)), m = I.transformTo("string", O.utf8encode(d)), _ = c.length !== h.name.length, g = m.length !== d.length, b = "", v = "", y = "", w = h.dir, k = h.date, x = { crc32: 0, compressedSize: 0, uncompressedSize: 0 };
              t2 && !r2 || (x.crc32 = e2.crc32, x.compressedSize = e2.compressedSize, x.uncompressedSize = e2.uncompressedSize);
              var S = 0;
              t2 && (S |= 8), l || !_ && !g || (S |= 2048);
              var z = 0, C = 0;
              w && (z |= 16), "UNIX" === i2 ? (C = 798, z |= (function(e3, t3) {
                var r3 = e3;
                return e3 || (r3 = t3 ? 16893 : 33204), (65535 & r3) << 16;
              })(h.unixPermissions, w)) : (C = 20, z |= (function(e3) {
                return 63 & (e3 || 0);
              })(h.dosPermissions)), a = k.getUTCHours(), a <<= 6, a |= k.getUTCMinutes(), a <<= 5, a |= k.getUTCSeconds() / 2, o = k.getUTCFullYear() - 1980, o <<= 4, o |= k.getUTCMonth() + 1, o <<= 5, o |= k.getUTCDate(), _ && (v = A(1, 1) + A(B(f), 4) + c, b += "up" + A(v.length, 2) + v), g && (y = A(1, 1) + A(B(p), 4) + m, b += "uc" + A(y.length, 2) + y);
              var E = "";
              return E += "\n\0", E += A(S, 2), E += u.magic, E += A(a, 2), E += A(o, 2), E += A(x.crc32, 4), E += A(x.compressedSize, 4), E += A(x.uncompressedSize, 4), E += A(f.length, 2), E += A(b.length, 2), { fileRecord: R.LOCAL_FILE_HEADER + E + f + b, dirRecord: R.CENTRAL_FILE_HEADER + A(C, 2) + E + A(p.length, 2) + "\0\0\0\0" + A(z, 4) + A(n2, 4) + f + b + p };
            }
            var I = e("../utils"), i = e("../stream/GenericWorker"), O = e("../utf8"), B = e("../crc32"), R = e("../signature");
            function s(e2, t2, r2, n2) {
              i.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = t2, this.zipPlatform = r2, this.encodeFileName = n2, this.streamFiles = e2, this.accumulate = false, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
            }
            I.inherits(s, i), s.prototype.push = function(e2) {
              var t2 = e2.meta.percent || 0, r2 = this.entriesCount, n2 = this._sources.length;
              this.accumulate ? this.contentBuffer.push(e2) : (this.bytesWritten += e2.data.length, i.prototype.push.call(this, { data: e2.data, meta: { currentFile: this.currentFile, percent: r2 ? (t2 + 100 * (r2 - n2 - 1)) / r2 : 100 } }));
            }, s.prototype.openedSource = function(e2) {
              this.currentSourceOffset = this.bytesWritten, this.currentFile = e2.file.name;
              var t2 = this.streamFiles && !e2.file.dir;
              if (t2) {
                var r2 = n(e2, t2, false, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
                this.push({ data: r2.fileRecord, meta: { percent: 0 } });
              } else this.accumulate = true;
            }, s.prototype.closedSource = function(e2) {
              this.accumulate = false;
              var t2 = this.streamFiles && !e2.file.dir, r2 = n(e2, t2, true, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
              if (this.dirRecords.push(r2.dirRecord), t2) this.push({ data: (function(e3) {
                return R.DATA_DESCRIPTOR + A(e3.crc32, 4) + A(e3.compressedSize, 4) + A(e3.uncompressedSize, 4);
              })(e2), meta: { percent: 100 } });
              else for (this.push({ data: r2.fileRecord, meta: { percent: 0 } }); this.contentBuffer.length; ) this.push(this.contentBuffer.shift());
              this.currentFile = null;
            }, s.prototype.flush = function() {
              for (var e2 = this.bytesWritten, t2 = 0; t2 < this.dirRecords.length; t2++) this.push({ data: this.dirRecords[t2], meta: { percent: 100 } });
              var r2 = this.bytesWritten - e2, n2 = (function(e3, t3, r3, n3, i2) {
                var s2 = I.transformTo("string", i2(n3));
                return R.CENTRAL_DIRECTORY_END + "\0\0\0\0" + A(e3, 2) + A(e3, 2) + A(t3, 4) + A(r3, 4) + A(s2.length, 2) + s2;
              })(this.dirRecords.length, r2, e2, this.zipComment, this.encodeFileName);
              this.push({ data: n2, meta: { percent: 100 } });
            }, s.prototype.prepareNextSource = function() {
              this.previous = this._sources.shift(), this.openedSource(this.previous.streamInfo), this.isPaused ? this.previous.pause() : this.previous.resume();
            }, s.prototype.registerPrevious = function(e2) {
              this._sources.push(e2);
              var t2 = this;
              return e2.on("data", function(e3) {
                t2.processChunk(e3);
              }), e2.on("end", function() {
                t2.closedSource(t2.previous.streamInfo), t2._sources.length ? t2.prepareNextSource() : t2.end();
              }), e2.on("error", function(e3) {
                t2.error(e3);
              }), this;
            }, s.prototype.resume = function() {
              return !!i.prototype.resume.call(this) && (!this.previous && this._sources.length ? (this.prepareNextSource(), true) : this.previous || this._sources.length || this.generatedError ? void 0 : (this.end(), true));
            }, s.prototype.error = function(e2) {
              var t2 = this._sources;
              if (!i.prototype.error.call(this, e2)) return false;
              for (var r2 = 0; r2 < t2.length; r2++) try {
                t2[r2].error(e2);
              } catch (e3) {
              }
              return true;
            }, s.prototype.lock = function() {
              i.prototype.lock.call(this);
              for (var e2 = this._sources, t2 = 0; t2 < e2.length; t2++) e2[t2].lock();
            }, t.exports = s;
          }, { "../crc32": 4, "../signature": 23, "../stream/GenericWorker": 28, "../utf8": 31, "../utils": 32 }], 9: [function(e, t, r) {
            var u = e("../compressions"), n = e("./ZipFileWorker");
            r.generateWorker = function(e2, a, t2) {
              var o = new n(a.streamFiles, t2, a.platform, a.encodeFileName), h = 0;
              try {
                e2.forEach(function(e3, t3) {
                  h++;
                  var r2 = (function(e4, t4) {
                    var r3 = e4 || t4, n3 = u[r3];
                    if (!n3) throw new Error(r3 + " is not a valid compression method !");
                    return n3;
                  })(t3.options.compression, a.compression), n2 = t3.options.compressionOptions || a.compressionOptions || {}, i = t3.dir, s = t3.date;
                  t3._compressWorker(r2, n2).withStreamInfo("file", { name: e3, dir: i, date: s, comment: t3.comment || "", unixPermissions: t3.unixPermissions, dosPermissions: t3.dosPermissions }).pipe(o);
                }), o.entriesCount = h;
              } catch (e3) {
                o.error(e3);
              }
              return o;
            };
          }, { "../compressions": 3, "./ZipFileWorker": 8 }], 10: [function(e, t, r) {
            function n() {
              if (!(this instanceof n)) return new n();
              if (arguments.length) throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
              this.files = /* @__PURE__ */ Object.create(null), this.comment = null, this.root = "", this.clone = function() {
                var e2 = new n();
                for (var t2 in this) "function" != typeof this[t2] && (e2[t2] = this[t2]);
                return e2;
              };
            }
            (n.prototype = e("./object")).loadAsync = e("./load"), n.support = e("./support"), n.defaults = e("./defaults"), n.version = "3.10.2", n.loadAsync = function(e2, t2) {
              return new n().loadAsync(e2, t2);
            }, n.external = e("./external"), t.exports = n;
          }, { "./defaults": 5, "./external": 6, "./load": 11, "./object": 15, "./support": 30 }], 11: [function(e, t, r) {
            var u = e("./utils"), i = e("./external"), n = e("./utf8"), s = e("./zipEntries"), a = e("./stream/Crc32Probe"), l = e("./nodejsUtils");
            function f(n2) {
              return new i.Promise(function(e2, t2) {
                var r2 = n2.decompressed.getContentWorker().pipe(new a());
                r2.on("error", function(e3) {
                  t2(e3);
                }).on("end", function() {
                  r2.streamInfo.crc32 !== n2.decompressed.crc32 ? t2(new Error("Corrupted zip : CRC32 mismatch")) : e2();
                }).resume();
              });
            }
            t.exports = function(e2, o) {
              var h = this;
              return o = u.extend(o || {}, { base64: false, checkCRC32: false, optimizedBinaryString: false, createFolders: false, decodeFileName: n.utf8decode }), l.isNode && l.isStream(e2) ? i.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")) : u.prepareContent("the loaded zip file", e2, true, o.optimizedBinaryString, o.base64).then(function(e3) {
                var t2 = new s(o);
                return t2.load(e3), t2;
              }).then(function(e3) {
                var t2 = [i.Promise.resolve(e3)], r2 = e3.files;
                if (o.checkCRC32) for (var n2 = 0; n2 < r2.length; n2++) t2.push(f(r2[n2]));
                return i.Promise.all(t2);
              }).then(function(e3) {
                for (var t2 = e3.shift(), r2 = t2.files, n2 = 0; n2 < r2.length; n2++) {
                  var i2 = r2[n2], s2 = i2.fileNameStr, a2 = u.resolve(i2.fileNameStr);
                  h.file(a2, i2.decompressed, { binary: true, optimizedBinaryString: true, date: i2.date, dir: i2.dir, comment: i2.fileCommentStr.length ? i2.fileCommentStr : null, unixPermissions: i2.unixPermissions, dosPermissions: i2.dosPermissions, createFolders: o.createFolders }), i2.dir || (h.file(a2).unsafeOriginalName = s2);
                }
                return t2.zipComment.length && (h.comment = t2.zipComment), h;
              });
            };
          }, { "./external": 6, "./nodejsUtils": 14, "./stream/Crc32Probe": 25, "./utf8": 31, "./utils": 32, "./zipEntries": 33 }], 12: [function(e, t, r) {
            var n = e("../utils"), i = e("../stream/GenericWorker");
            function s(e2, t2) {
              i.call(this, "Nodejs stream input adapter for " + e2), this._upstreamEnded = false, this._bindStream(t2);
            }
            n.inherits(s, i), s.prototype._bindStream = function(e2) {
              var t2 = this;
              (this._stream = e2).pause(), e2.on("data", function(e3) {
                t2.push({ data: e3, meta: { percent: 0 } });
              }).on("error", function(e3) {
                t2.isPaused ? this.generatedError = e3 : t2.error(e3);
              }).on("end", function() {
                t2.isPaused ? t2._upstreamEnded = true : t2.end();
              });
            }, s.prototype.pause = function() {
              return !!i.prototype.pause.call(this) && (this._stream.pause(), true);
            }, s.prototype.resume = function() {
              return !!i.prototype.resume.call(this) && (this._upstreamEnded ? this.end() : this._stream.resume(), true);
            }, t.exports = s;
          }, { "../stream/GenericWorker": 28, "../utils": 32 }], 13: [function(e, t, r) {
            var i = e("readable-stream").Readable;
            function n(e2, t2, r2) {
              i.call(this, t2), this._helper = e2;
              var n2 = this;
              e2.on("data", function(e3, t3) {
                n2.push(e3) || n2._helper.pause(), r2 && r2(t3);
              }).on("error", function(e3) {
                n2.emit("error", e3);
              }).on("end", function() {
                n2.push(null);
              });
            }
            e("../utils").inherits(n, i), n.prototype._read = function() {
              this._helper.resume();
            }, t.exports = n;
          }, { "../utils": 32, "readable-stream": 16 }], 14: [function(e, t, r) {
            t.exports = { isNode: "undefined" != typeof Buffer, newBufferFrom: function(e2, t2) {
              if (Buffer.from && Buffer.from !== Uint8Array.from) return Buffer.from(e2, t2);
              if ("number" == typeof e2) throw new Error('The "data" argument must not be a number');
              return new Buffer(e2, t2);
            }, allocBuffer: function(e2) {
              if (Buffer.alloc) return Buffer.alloc(e2);
              var t2 = new Buffer(e2);
              return t2.fill(0), t2;
            }, isBuffer: function(e2) {
              return Buffer.isBuffer(e2);
            }, isStream: function(e2) {
              return e2 && "function" == typeof e2.on && "function" == typeof e2.pause && "function" == typeof e2.resume;
            } };
          }, {}], 15: [function(e, t, r) {
            function s(e2, t2, r2) {
              var n2, i2 = u.getTypeOf(t2), s2 = u.extend(r2 || {}, f);
              s2.date = s2.date || /* @__PURE__ */ new Date(), null !== s2.compression && (s2.compression = s2.compression.toUpperCase()), "string" == typeof s2.unixPermissions && (s2.unixPermissions = parseInt(s2.unixPermissions, 8)), s2.unixPermissions && 16384 & s2.unixPermissions && (s2.dir = true), s2.dosPermissions && 16 & s2.dosPermissions && (s2.dir = true), s2.dir && (e2 = g(e2)), s2.createFolders && (n2 = _(e2)) && b.call(this, n2, true);
              var a2 = "string" === i2 && false === s2.binary && false === s2.base64;
              r2 && void 0 !== r2.binary || (s2.binary = !a2), (t2 instanceof c && 0 === t2.uncompressedSize || s2.dir || !t2 || 0 === t2.length) && (s2.base64 = false, s2.binary = true, t2 = "", s2.compression = "STORE", i2 = "string");
              var o2 = null;
              o2 = t2 instanceof c || t2 instanceof l ? t2 : p.isNode && p.isStream(t2) ? new m(e2, t2) : u.prepareContent(e2, t2, s2.binary, s2.optimizedBinaryString, s2.base64);
              var h2 = new d(e2, o2, s2);
              this.files[e2] = h2;
            }
            var i = e("./utf8"), u = e("./utils"), l = e("./stream/GenericWorker"), a = e("./stream/StreamHelper"), f = e("./defaults"), c = e("./compressedObject"), d = e("./zipObject"), o = e("./generate"), p = e("./nodejsUtils"), m = e("./nodejs/NodejsStreamInputAdapter"), _ = function(e2) {
              "/" === e2.slice(-1) && (e2 = e2.substring(0, e2.length - 1));
              var t2 = e2.lastIndexOf("/");
              return 0 < t2 ? e2.substring(0, t2) : "";
            }, g = function(e2) {
              return "/" !== e2.slice(-1) && (e2 += "/"), e2;
            }, b = function(e2, t2) {
              return t2 = void 0 !== t2 ? t2 : f.createFolders, e2 = g(e2), this.files[e2] || s.call(this, e2, null, { dir: true, createFolders: t2 }), this.files[e2];
            };
            function h(e2) {
              return "[object RegExp]" === Object.prototype.toString.call(e2);
            }
            var n = { load: function() {
              throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
            }, forEach: function(e2) {
              var t2, r2, n2;
              for (t2 in this.files) n2 = this.files[t2], (r2 = t2.slice(this.root.length, t2.length)) && t2.slice(0, this.root.length) === this.root && e2(r2, n2);
            }, filter: function(r2) {
              var n2 = [];
              return this.forEach(function(e2, t2) {
                r2(e2, t2) && n2.push(t2);
              }), n2;
            }, file: function(e2, t2, r2) {
              if (1 !== arguments.length) return e2 = this.root + e2, s.call(this, e2, t2, r2), this;
              if (h(e2)) {
                var n2 = e2;
                return this.filter(function(e3, t3) {
                  return !t3.dir && n2.test(e3);
                });
              }
              var i2 = this.files[this.root + e2];
              return i2 && !i2.dir ? i2 : null;
            }, folder: function(r2) {
              if (!r2) return this;
              if (h(r2)) return this.filter(function(e3, t3) {
                return t3.dir && r2.test(e3);
              });
              var e2 = this.root + r2, t2 = b.call(this, e2), n2 = this.clone();
              return n2.root = t2.name, n2;
            }, remove: function(r2) {
              r2 = this.root + r2;
              var e2 = this.files[r2];
              if (e2 || ("/" !== r2.slice(-1) && (r2 += "/"), e2 = this.files[r2]), e2 && !e2.dir) delete this.files[r2];
              else for (var t2 = this.filter(function(e3, t3) {
                return t3.name.slice(0, r2.length) === r2;
              }), n2 = 0; n2 < t2.length; n2++) delete this.files[t2[n2].name];
              return this;
            }, generate: function() {
              throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
            }, generateInternalStream: function(e2) {
              var t2, r2 = {};
              try {
                if ((r2 = u.extend(e2 || {}, { streamFiles: false, compression: "STORE", compressionOptions: null, type: "", platform: "DOS", comment: null, mimeType: "application/zip", encodeFileName: i.utf8encode })).type = r2.type.toLowerCase(), r2.compression = r2.compression.toUpperCase(), "binarystring" === r2.type && (r2.type = "string"), !r2.type) throw new Error("No output type specified.");
                u.checkSupport(r2.type), "darwin" !== r2.platform && "freebsd" !== r2.platform && "linux" !== r2.platform && "sunos" !== r2.platform || (r2.platform = "UNIX"), "win32" === r2.platform && (r2.platform = "DOS");
                var n2 = r2.comment || this.comment || "";
                t2 = o.generateWorker(this, r2, n2);
              } catch (e3) {
                (t2 = new l("error")).error(e3);
              }
              return new a(t2, r2.type || "string", r2.mimeType);
            }, generateAsync: function(e2, t2) {
              return this.generateInternalStream(e2).accumulate(t2);
            }, generateNodeStream: function(e2, t2) {
              return (e2 = e2 || {}).type || (e2.type = "nodebuffer"), this.generateInternalStream(e2).toNodejsStream(t2);
            } };
            t.exports = n;
          }, { "./compressedObject": 2, "./defaults": 5, "./generate": 9, "./nodejs/NodejsStreamInputAdapter": 12, "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31, "./utils": 32, "./zipObject": 35 }], 16: [function(e, t, r) {
            t.exports = e("stream");
          }, { stream: void 0 }], 17: [function(e, t, r) {
            var n = e("./DataReader");
            function i(e2) {
              n.call(this, e2);
              for (var t2 = 0; t2 < this.data.length; t2++) e2[t2] = 255 & e2[t2];
            }
            e("../utils").inherits(i, n), i.prototype.byteAt = function(e2) {
              return this.data[this.zero + e2];
            }, i.prototype.lastIndexOfSignature = function(e2) {
              for (var t2 = e2.charCodeAt(0), r2 = e2.charCodeAt(1), n2 = e2.charCodeAt(2), i2 = e2.charCodeAt(3), s = this.length - 4; 0 <= s; --s) if (this.data[s] === t2 && this.data[s + 1] === r2 && this.data[s + 2] === n2 && this.data[s + 3] === i2) return s - this.zero;
              return -1;
            }, i.prototype.readAndCheckSignature = function(e2) {
              var t2 = e2.charCodeAt(0), r2 = e2.charCodeAt(1), n2 = e2.charCodeAt(2), i2 = e2.charCodeAt(3), s = this.readData(4);
              return t2 === s[0] && r2 === s[1] && n2 === s[2] && i2 === s[3];
            }, i.prototype.readData = function(e2) {
              if (this.checkOffset(e2), 0 === e2) return [];
              var t2 = this.data.slice(this.zero + this.index, this.zero + this.index + e2);
              return this.index += e2, t2;
            }, t.exports = i;
          }, { "../utils": 32, "./DataReader": 18 }], 18: [function(e, t, r) {
            var n = e("../utils");
            function i(e2) {
              this.data = e2, this.length = e2.length, this.index = 0, this.zero = 0;
            }
            i.prototype = { checkOffset: function(e2) {
              this.checkIndex(this.index + e2);
            }, checkIndex: function(e2) {
              if (this.length < this.zero + e2 || e2 < 0) throw new Error("End of data reached (data length = " + this.length + ", asked index = " + e2 + "). Corrupted zip ?");
            }, setIndex: function(e2) {
              this.checkIndex(e2), this.index = e2;
            }, skip: function(e2) {
              this.setIndex(this.index + e2);
            }, byteAt: function() {
            }, readInt: function(e2) {
              var t2, r2 = 0;
              for (this.checkOffset(e2), t2 = this.index + e2 - 1; t2 >= this.index; t2--) r2 = (r2 << 8) + this.byteAt(t2);
              return this.index += e2, r2;
            }, readString: function(e2) {
              return n.transformTo("string", this.readData(e2));
            }, readData: function() {
            }, lastIndexOfSignature: function() {
            }, readAndCheckSignature: function() {
            }, readDate: function() {
              var e2 = this.readInt(4);
              return new Date(Date.UTC(1980 + (e2 >> 25 & 127), (e2 >> 21 & 15) - 1, e2 >> 16 & 31, e2 >> 11 & 31, e2 >> 5 & 63, (31 & e2) << 1));
            } }, t.exports = i;
          }, { "../utils": 32 }], 19: [function(e, t, r) {
            var n = e("./Uint8ArrayReader");
            function i(e2) {
              n.call(this, e2);
            }
            e("../utils").inherits(i, n), i.prototype.readData = function(e2) {
              this.checkOffset(e2);
              var t2 = this.data.slice(this.zero + this.index, this.zero + this.index + e2);
              return this.index += e2, t2;
            }, t.exports = i;
          }, { "../utils": 32, "./Uint8ArrayReader": 21 }], 20: [function(e, t, r) {
            var n = e("./DataReader");
            function i(e2) {
              n.call(this, e2);
            }
            e("../utils").inherits(i, n), i.prototype.byteAt = function(e2) {
              return this.data.charCodeAt(this.zero + e2);
            }, i.prototype.lastIndexOfSignature = function(e2) {
              return this.data.lastIndexOf(e2) - this.zero;
            }, i.prototype.readAndCheckSignature = function(e2) {
              return e2 === this.readData(4);
            }, i.prototype.readData = function(e2) {
              this.checkOffset(e2);
              var t2 = this.data.slice(this.zero + this.index, this.zero + this.index + e2);
              return this.index += e2, t2;
            }, t.exports = i;
          }, { "../utils": 32, "./DataReader": 18 }], 21: [function(e, t, r) {
            var n = e("./ArrayReader");
            function i(e2) {
              n.call(this, e2);
            }
            e("../utils").inherits(i, n), i.prototype.readData = function(e2) {
              if (this.checkOffset(e2), 0 === e2) return new Uint8Array(0);
              var t2 = this.data.subarray(this.zero + this.index, this.zero + this.index + e2);
              return this.index += e2, t2;
            }, t.exports = i;
          }, { "../utils": 32, "./ArrayReader": 17 }], 22: [function(e, t, r) {
            var n = e("../utils"), i = e("../support"), s = e("./ArrayReader"), a = e("./StringReader"), o = e("./NodeBufferReader"), h = e("./Uint8ArrayReader");
            t.exports = function(e2) {
              var t2 = n.getTypeOf(e2);
              return n.checkSupport(t2), "string" !== t2 || i.uint8array ? "nodebuffer" === t2 ? new o(e2) : i.uint8array ? new h(n.transformTo("uint8array", e2)) : new s(n.transformTo("array", e2)) : new a(e2);
            };
          }, { "../support": 30, "../utils": 32, "./ArrayReader": 17, "./NodeBufferReader": 19, "./StringReader": 20, "./Uint8ArrayReader": 21 }], 23: [function(e, t, r) {
            r.LOCAL_FILE_HEADER = "PK", r.CENTRAL_FILE_HEADER = "PK", r.CENTRAL_DIRECTORY_END = "PK", r.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07", r.ZIP64_CENTRAL_DIRECTORY_END = "PK", r.DATA_DESCRIPTOR = "PK\x07\b";
          }, {}], 24: [function(e, t, r) {
            var n = e("./GenericWorker"), i = e("../utils");
            function s(e2) {
              n.call(this, "ConvertWorker to " + e2), this.destType = e2;
            }
            i.inherits(s, n), s.prototype.processChunk = function(e2) {
              this.push({ data: i.transformTo(this.destType, e2.data), meta: e2.meta });
            }, t.exports = s;
          }, { "../utils": 32, "./GenericWorker": 28 }], 25: [function(e, t, r) {
            var n = e("./GenericWorker"), i = e("../crc32");
            function s() {
              n.call(this, "Crc32Probe"), this.withStreamInfo("crc32", 0);
            }
            e("../utils").inherits(s, n), s.prototype.processChunk = function(e2) {
              this.streamInfo.crc32 = i(e2.data, this.streamInfo.crc32 || 0), this.push(e2);
            }, t.exports = s;
          }, { "../crc32": 4, "../utils": 32, "./GenericWorker": 28 }], 26: [function(e, t, r) {
            var n = e("../utils"), i = e("./GenericWorker");
            function s(e2) {
              i.call(this, "DataLengthProbe for " + e2), this.propName = e2, this.withStreamInfo(e2, 0);
            }
            n.inherits(s, i), s.prototype.processChunk = function(e2) {
              if (e2) {
                var t2 = this.streamInfo[this.propName] || 0;
                this.streamInfo[this.propName] = t2 + e2.data.length;
              }
              i.prototype.processChunk.call(this, e2);
            }, t.exports = s;
          }, { "../utils": 32, "./GenericWorker": 28 }], 27: [function(e, t, r) {
            var n = e("../utils"), i = e("./GenericWorker");
            function s(e2) {
              i.call(this, "DataWorker");
              var t2 = this;
              this.dataIsReady = false, this.index = 0, this.max = 0, this.data = null, this.type = "", this._tickScheduled = false, e2.then(function(e3) {
                t2.dataIsReady = true, t2.data = e3, t2.max = e3 && e3.length || 0, t2.type = n.getTypeOf(e3), t2.isPaused || t2._tickAndRepeat();
              }, function(e3) {
                t2.error(e3);
              });
            }
            n.inherits(s, i), s.prototype.cleanUp = function() {
              i.prototype.cleanUp.call(this), this.data = null;
            }, s.prototype.resume = function() {
              return !!i.prototype.resume.call(this) && (!this._tickScheduled && this.dataIsReady && (this._tickScheduled = true, n.delay(this._tickAndRepeat, [], this)), true);
            }, s.prototype._tickAndRepeat = function() {
              this._tickScheduled = false, this.isPaused || this.isFinished || (this._tick(), this.isFinished || (n.delay(this._tickAndRepeat, [], this), this._tickScheduled = true));
            }, s.prototype._tick = function() {
              if (this.isPaused || this.isFinished) return false;
              var e2 = null, t2 = Math.min(this.max, this.index + 16384);
              if (this.index >= this.max) return this.end();
              switch (this.type) {
                case "string":
                  e2 = this.data.substring(this.index, t2);
                  break;
                case "uint8array":
                  e2 = this.data.subarray(this.index, t2);
                  break;
                case "array":
                case "nodebuffer":
                  e2 = this.data.slice(this.index, t2);
              }
              return this.index = t2, this.push({ data: e2, meta: { percent: this.max ? this.index / this.max * 100 : 0 } });
            }, t.exports = s;
          }, { "../utils": 32, "./GenericWorker": 28 }], 28: [function(e, t, r) {
            function n(e2) {
              this.name = e2 || "default", this.streamInfo = {}, this.generatedError = null, this.extraStreamInfo = {}, this.isPaused = true, this.isFinished = false, this.isLocked = false, this._listeners = { data: [], end: [], error: [] }, this.previous = null;
            }
            n.prototype = { push: function(e2) {
              this.emit("data", e2);
            }, end: function() {
              if (this.isFinished) return false;
              this.flush();
              try {
                this.emit("end"), this.cleanUp(), this.isFinished = true;
              } catch (e2) {
                this.emit("error", e2);
              }
              return true;
            }, error: function(e2) {
              return !this.isFinished && (this.isPaused ? this.generatedError = e2 : (this.isFinished = true, this.emit("error", e2), this.previous && this.previous.error(e2), this.cleanUp()), true);
            }, on: function(e2, t2) {
              return this._listeners[e2].push(t2), this;
            }, cleanUp: function() {
              this.streamInfo = this.generatedError = this.extraStreamInfo = null, this._listeners = [];
            }, emit: function(e2, t2) {
              if (this._listeners[e2]) for (var r2 = 0; r2 < this._listeners[e2].length; r2++) this._listeners[e2][r2].call(this, t2);
            }, pipe: function(e2) {
              return e2.registerPrevious(this);
            }, registerPrevious: function(e2) {
              if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
              this.streamInfo = e2.streamInfo, this.mergeStreamInfo(), this.previous = e2;
              var t2 = this;
              return e2.on("data", function(e3) {
                t2.processChunk(e3);
              }), e2.on("end", function() {
                t2.end();
              }), e2.on("error", function(e3) {
                t2.error(e3);
              }), this;
            }, pause: function() {
              return !this.isPaused && !this.isFinished && (this.isPaused = true, this.previous && this.previous.pause(), true);
            }, resume: function() {
              if (!this.isPaused || this.isFinished) return false;
              var e2 = this.isPaused = false;
              return this.generatedError && (this.error(this.generatedError), e2 = true), this.previous && this.previous.resume(), !e2;
            }, flush: function() {
            }, processChunk: function(e2) {
              this.push(e2);
            }, withStreamInfo: function(e2, t2) {
              return this.extraStreamInfo[e2] = t2, this.mergeStreamInfo(), this;
            }, mergeStreamInfo: function() {
              for (var e2 in this.extraStreamInfo) Object.prototype.hasOwnProperty.call(this.extraStreamInfo, e2) && (this.streamInfo[e2] = this.extraStreamInfo[e2]);
            }, lock: function() {
              if (this.isLocked) throw new Error("The stream '" + this + "' has already been used.");
              this.isLocked = true, this.previous && this.previous.lock();
            }, toString: function() {
              var e2 = "Worker " + this.name;
              return this.previous ? this.previous + " -> " + e2 : e2;
            } }, t.exports = n;
          }, {}], 29: [function(e, t, r) {
            var h = e("../utils"), i = e("./ConvertWorker"), s = e("./GenericWorker"), u = e("../base64"), n = e("../support"), a = e("../external"), o = null;
            if (n.nodestream) try {
              o = e("../nodejs/NodejsStreamOutputAdapter");
            } catch (e2) {
            }
            function l(e2, o2) {
              return new a.Promise(function(t2, r2) {
                var n2 = [], i2 = e2._internalType, s2 = e2._outputType, a2 = e2._mimeType;
                e2.on("data", function(e3, t3) {
                  n2.push(e3), o2 && o2(t3);
                }).on("error", function(e3) {
                  n2 = [], r2(e3);
                }).on("end", function() {
                  try {
                    var e3 = (function(e4, t3, r3) {
                      switch (e4) {
                        case "blob":
                          return h.newBlob(h.transformTo("arraybuffer", t3), r3);
                        case "base64":
                          return u.encode(t3);
                        default:
                          return h.transformTo(e4, t3);
                      }
                    })(s2, (function(e4, t3) {
                      var r3, n3 = 0, i3 = null, s3 = 0;
                      for (r3 = 0; r3 < t3.length; r3++) s3 += t3[r3].length;
                      switch (e4) {
                        case "string":
                          return t3.join("");
                        case "array":
                          return Array.prototype.concat.apply([], t3);
                        case "uint8array":
                          for (i3 = new Uint8Array(s3), r3 = 0; r3 < t3.length; r3++) i3.set(t3[r3], n3), n3 += t3[r3].length;
                          return i3;
                        case "nodebuffer":
                          return Buffer.concat(t3);
                        default:
                          throw new Error("concat : unsupported type '" + e4 + "'");
                      }
                    })(i2, n2), a2);
                    t2(e3);
                  } catch (e4) {
                    r2(e4);
                  }
                  n2 = [];
                }).resume();
              });
            }
            function f(e2, t2, r2) {
              var n2 = t2;
              switch (t2) {
                case "blob":
                case "arraybuffer":
                  n2 = "uint8array";
                  break;
                case "base64":
                  n2 = "string";
              }
              try {
                this._internalType = n2, this._outputType = t2, this._mimeType = r2, h.checkSupport(n2), this._worker = e2.pipe(new i(n2)), e2.lock();
              } catch (e3) {
                this._worker = new s("error"), this._worker.error(e3);
              }
            }
            f.prototype = { accumulate: function(e2) {
              return l(this, e2);
            }, on: function(e2, t2) {
              var r2 = this;
              return "data" === e2 ? this._worker.on(e2, function(e3) {
                t2.call(r2, e3.data, e3.meta);
              }) : this._worker.on(e2, function() {
                h.delay(t2, arguments, r2);
              }), this;
            }, resume: function() {
              return h.delay(this._worker.resume, [], this._worker), this;
            }, pause: function() {
              return this._worker.pause(), this;
            }, toNodejsStream: function(e2) {
              if (h.checkSupport("nodestream"), "nodebuffer" !== this._outputType) throw new Error(this._outputType + " is not supported by this method");
              return new o(this, { objectMode: "nodebuffer" !== this._outputType }, e2);
            } }, t.exports = f;
          }, { "../base64": 1, "../external": 6, "../nodejs/NodejsStreamOutputAdapter": 13, "../support": 30, "../utils": 32, "./ConvertWorker": 24, "./GenericWorker": 28 }], 30: [function(e, t, r) {
            if (r.base64 = true, r.array = true, r.string = true, r.arraybuffer = "undefined" != typeof ArrayBuffer && "undefined" != typeof Uint8Array, r.nodebuffer = "undefined" != typeof Buffer, r.uint8array = "undefined" != typeof Uint8Array, "undefined" == typeof ArrayBuffer) r.blob = false;
            else {
              var n = new ArrayBuffer(0);
              try {
                r.blob = 0 === new Blob([n], { type: "application/zip" }).size;
              } catch (e2) {
                try {
                  var i = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
                  i.append(n), r.blob = 0 === i.getBlob("application/zip").size;
                } catch (e3) {
                  r.blob = false;
                }
              }
            }
            try {
              r.nodestream = !!e("readable-stream").Readable;
            } catch (e2) {
              r.nodestream = false;
            }
          }, { "readable-stream": 16 }], 31: [function(e, t, s) {
            for (var o = e("./utils"), h = e("./support"), r = e("./nodejsUtils"), n = e("./stream/GenericWorker"), u = new Array(256), i = 0; i < 256; i++) u[i] = 252 <= i ? 6 : 248 <= i ? 5 : 240 <= i ? 4 : 224 <= i ? 3 : 192 <= i ? 2 : 1;
            u[254] = u[254] = 1;
            function a() {
              n.call(this, "utf-8 decode"), this.leftOver = null;
            }
            function l() {
              n.call(this, "utf-8 encode");
            }
            s.utf8encode = function(e2) {
              return h.nodebuffer ? r.newBufferFrom(e2, "utf-8") : (function(e3) {
                var t2, r2, n2, i2, s2, a2 = e3.length, o2 = 0;
                for (i2 = 0; i2 < a2; i2++) 55296 == (64512 & (r2 = e3.charCodeAt(i2))) && i2 + 1 < a2 && 56320 == (64512 & (n2 = e3.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), o2 += r2 < 128 ? 1 : r2 < 2048 ? 2 : r2 < 65536 ? 3 : 4;
                for (t2 = h.uint8array ? new Uint8Array(o2) : new Array(o2), i2 = s2 = 0; s2 < o2; i2++) 55296 == (64512 & (r2 = e3.charCodeAt(i2))) && i2 + 1 < a2 && 56320 == (64512 & (n2 = e3.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), r2 < 128 ? t2[s2++] = r2 : (r2 < 2048 ? t2[s2++] = 192 | r2 >>> 6 : (r2 < 65536 ? t2[s2++] = 224 | r2 >>> 12 : (t2[s2++] = 240 | r2 >>> 18, t2[s2++] = 128 | r2 >>> 12 & 63), t2[s2++] = 128 | r2 >>> 6 & 63), t2[s2++] = 128 | 63 & r2);
                return t2;
              })(e2);
            }, s.utf8decode = function(e2) {
              return h.nodebuffer ? o.transformTo("nodebuffer", e2).toString("utf-8") : (function(e3) {
                var t2, r2, n2, i2, s2 = e3.length, a2 = new Array(2 * s2);
                for (t2 = r2 = 0; t2 < s2; ) if ((n2 = e3[t2++]) < 128) a2[r2++] = n2;
                else if (4 < (i2 = u[n2])) a2[r2++] = 65533, t2 += i2 - 1;
                else {
                  for (n2 &= 2 === i2 ? 31 : 3 === i2 ? 15 : 7; 1 < i2 && t2 < s2; ) n2 = n2 << 6 | 63 & e3[t2++], i2--;
                  1 < i2 ? a2[r2++] = 65533 : n2 < 65536 ? a2[r2++] = n2 : (n2 -= 65536, a2[r2++] = 55296 | n2 >> 10 & 1023, a2[r2++] = 56320 | 1023 & n2);
                }
                return a2.length !== r2 && (a2.subarray ? a2 = a2.subarray(0, r2) : a2.length = r2), o.applyFromCharCode(a2);
              })(e2 = o.transformTo(h.uint8array ? "uint8array" : "array", e2));
            }, o.inherits(a, n), a.prototype.processChunk = function(e2) {
              var t2 = o.transformTo(h.uint8array ? "uint8array" : "array", e2.data);
              if (this.leftOver && this.leftOver.length) {
                if (h.uint8array) {
                  var r2 = t2;
                  (t2 = new Uint8Array(r2.length + this.leftOver.length)).set(this.leftOver, 0), t2.set(r2, this.leftOver.length);
                } else t2 = this.leftOver.concat(t2);
                this.leftOver = null;
              }
              var n2 = (function(e3, t3) {
                var r3;
                for ((t3 = t3 || e3.length) > e3.length && (t3 = e3.length), r3 = t3 - 1; 0 <= r3 && 128 == (192 & e3[r3]); ) r3--;
                return r3 < 0 ? t3 : 0 === r3 ? t3 : r3 + u[e3[r3]] > t3 ? r3 : t3;
              })(t2), i2 = t2;
              n2 !== t2.length && (h.uint8array ? (i2 = t2.subarray(0, n2), this.leftOver = t2.subarray(n2, t2.length)) : (i2 = t2.slice(0, n2), this.leftOver = t2.slice(n2, t2.length))), this.push({ data: s.utf8decode(i2), meta: e2.meta });
            }, a.prototype.flush = function() {
              this.leftOver && this.leftOver.length && (this.push({ data: s.utf8decode(this.leftOver), meta: {} }), this.leftOver = null);
            }, s.Utf8DecodeWorker = a, o.inherits(l, n), l.prototype.processChunk = function(e2) {
              this.push({ data: s.utf8encode(e2.data), meta: e2.meta });
            }, s.Utf8EncodeWorker = l;
          }, { "./nodejsUtils": 14, "./stream/GenericWorker": 28, "./support": 30, "./utils": 32 }], 32: [function(e, t, a) {
            var o = e("./support"), h = e("./base64"), r = e("./nodejsUtils"), u = e("./external");
            function n(e2) {
              return e2;
            }
            function l(e2, t2) {
              for (var r2 = 0; r2 < e2.length; ++r2) t2[r2] = 255 & e2.charCodeAt(r2);
              return t2;
            }
            e("setimmediate"), a.newBlob = function(t2, r2) {
              a.checkSupport("blob");
              try {
                return new Blob([t2], { type: r2 });
              } catch (e2) {
                try {
                  var n2 = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
                  return n2.append(t2), n2.getBlob(r2);
                } catch (e3) {
                  throw new Error("Bug : can't construct the Blob.");
                }
              }
            };
            var i = { stringifyByChunk: function(e2, t2, r2) {
              var n2 = [], i2 = 0, s2 = e2.length;
              if (s2 <= r2) return String.fromCharCode.apply(null, e2);
              for (; i2 < s2; ) "array" === t2 || "nodebuffer" === t2 ? n2.push(String.fromCharCode.apply(null, e2.slice(i2, Math.min(i2 + r2, s2)))) : n2.push(String.fromCharCode.apply(null, e2.subarray(i2, Math.min(i2 + r2, s2)))), i2 += r2;
              return n2.join("");
            }, stringifyByChar: function(e2) {
              for (var t2 = "", r2 = 0; r2 < e2.length; r2++) t2 += String.fromCharCode(e2[r2]);
              return t2;
            }, applyCanBeUsed: { uint8array: (function() {
              try {
                return o.uint8array && 1 === String.fromCharCode.apply(null, new Uint8Array(1)).length;
              } catch (e2) {
                return false;
              }
            })(), nodebuffer: (function() {
              try {
                return o.nodebuffer && 1 === String.fromCharCode.apply(null, r.allocBuffer(1)).length;
              } catch (e2) {
                return false;
              }
            })() } };
            function s(e2) {
              var t2 = 65536, r2 = a.getTypeOf(e2), n2 = true;
              if ("uint8array" === r2 ? n2 = i.applyCanBeUsed.uint8array : "nodebuffer" === r2 && (n2 = i.applyCanBeUsed.nodebuffer), n2) for (; 1 < t2; ) try {
                return i.stringifyByChunk(e2, r2, t2);
              } catch (e3) {
                t2 = Math.floor(t2 / 2);
              }
              return i.stringifyByChar(e2);
            }
            function f(e2, t2) {
              for (var r2 = 0; r2 < e2.length; r2++) t2[r2] = e2[r2];
              return t2;
            }
            a.applyFromCharCode = s;
            var c = {};
            c.string = { string: n, array: function(e2) {
              return l(e2, new Array(e2.length));
            }, arraybuffer: function(e2) {
              return c.string.uint8array(e2).buffer;
            }, uint8array: function(e2) {
              return l(e2, new Uint8Array(e2.length));
            }, nodebuffer: function(e2) {
              return l(e2, r.allocBuffer(e2.length));
            } }, c.array = { string: s, array: n, arraybuffer: function(e2) {
              return new Uint8Array(e2).buffer;
            }, uint8array: function(e2) {
              return new Uint8Array(e2);
            }, nodebuffer: function(e2) {
              return r.newBufferFrom(e2);
            } }, c.arraybuffer = { string: function(e2) {
              return s(new Uint8Array(e2));
            }, array: function(e2) {
              return f(new Uint8Array(e2), new Array(e2.byteLength));
            }, arraybuffer: n, uint8array: function(e2) {
              return new Uint8Array(e2);
            }, nodebuffer: function(e2) {
              return r.newBufferFrom(new Uint8Array(e2));
            } }, c.uint8array = { string: s, array: function(e2) {
              return f(e2, new Array(e2.length));
            }, arraybuffer: function(e2) {
              return e2.buffer;
            }, uint8array: n, nodebuffer: function(e2) {
              return r.newBufferFrom(e2);
            } }, c.nodebuffer = { string: s, array: function(e2) {
              return f(e2, new Array(e2.length));
            }, arraybuffer: function(e2) {
              return c.nodebuffer.uint8array(e2).buffer;
            }, uint8array: function(e2) {
              return f(e2, new Uint8Array(e2.length));
            }, nodebuffer: n }, a.transformTo = function(e2, t2) {
              if (t2 = t2 || "", !e2) return t2;
              a.checkSupport(e2);
              var r2 = a.getTypeOf(t2);
              return c[r2][e2](t2);
            }, a.resolve = function(e2) {
              for (var t2 = e2.split("/"), r2 = [], n2 = 0; n2 < t2.length; n2++) {
                var i2 = t2[n2];
                "." === i2 || "" === i2 && 0 !== n2 && n2 !== t2.length - 1 || (".." === i2 ? r2.pop() : r2.push(i2));
              }
              return r2.join("/");
            }, a.getTypeOf = function(e2) {
              if ("string" == typeof e2) return "string";
              var t2 = Object.prototype.toString.call(e2);
              return "[object Array]" === t2 ? "array" : o.nodebuffer && r.isBuffer(e2) ? "nodebuffer" : o.uint8array && "[object Uint8Array]" === t2 ? "uint8array" : o.arraybuffer && "[object ArrayBuffer]" === t2 ? "arraybuffer" : void 0;
            }, a.checkSupport = function(e2) {
              if (!o[e2.toLowerCase()]) throw new Error(e2 + " is not supported by this platform");
            }, a.MAX_VALUE_16BITS = 65535, a.MAX_VALUE_32BITS = -1, a.pretty = function(e2) {
              var t2, r2, n2 = "";
              for (r2 = 0; r2 < (e2 || "").length; r2++) n2 += "\\x" + ((t2 = e2.charCodeAt(r2)) < 16 ? "0" : "") + t2.toString(16).toUpperCase();
              return n2;
            }, a.delay = function(e2, t2, r2) {
              setImmediate(function() {
                e2.apply(r2 || null, t2 || []);
              });
            }, a.inherits = function(e2, t2) {
              function r2() {
              }
              r2.prototype = t2.prototype, e2.prototype = new r2();
            }, a.extend = function() {
              var e2, t2, r2 = {};
              for (e2 = 0; e2 < arguments.length; e2++) for (t2 in arguments[e2]) Object.prototype.hasOwnProperty.call(arguments[e2], t2) && void 0 === r2[t2] && (r2[t2] = arguments[e2][t2]);
              return r2;
            }, a.prepareContent = function(r2, e2, n2, i2, s2) {
              return u.Promise.resolve(e2).then(function(n3) {
                return o.blob && (n3 instanceof Blob || -1 !== ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(n3))) ? void 0 !== Blob.prototype.arrayBuffer ? n3.arrayBuffer() : "undefined" != typeof FileReader ? new u.Promise(function(t2, r3) {
                  var e3 = new FileReader();
                  e3.onload = function(e4) {
                    t2(e4.target.result);
                  }, e3.onerror = function(e4) {
                    r3(e4.target.error);
                  }, e3.readAsArrayBuffer(n3);
                }) : u.Promise.reject(new Error(r2 + " is a Blob, but we have no way of reading it.")) : n3;
              }).then(function(e3) {
                var t2 = a.getTypeOf(e3);
                return t2 ? ("arraybuffer" === t2 ? e3 = a.transformTo("uint8array", e3) : "string" === t2 && (s2 ? e3 = h.decode(e3) : n2 && true !== i2 && (e3 = (function(e4) {
                  return l(e4, o.uint8array ? new Uint8Array(e4.length) : new Array(e4.length));
                })(e3))), e3) : u.Promise.reject(new Error("Can't read the data of '" + r2 + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"));
              });
            };
          }, { "./base64": 1, "./external": 6, "./nodejsUtils": 14, "./support": 30, setimmediate: 54 }], 33: [function(e, t, r) {
            var n = e("./reader/readerFor"), i = e("./utils"), s = e("./signature"), a = e("./zipEntry"), o = e("./support");
            function h(e2) {
              this.files = [], this.loadOptions = e2;
            }
            h.prototype = { checkSignature: function(e2) {
              if (!this.reader.readAndCheckSignature(e2)) {
                this.reader.index -= 4;
                var t2 = this.reader.readString(4);
                throw new Error("Corrupted zip or bug: unexpected signature (" + i.pretty(t2) + ", expected " + i.pretty(e2) + ")");
              }
            }, isSignature: function(e2, t2) {
              var r2 = this.reader.index;
              this.reader.setIndex(e2);
              var n2 = this.reader.readString(4) === t2;
              return this.reader.setIndex(r2), n2;
            }, readBlockEndOfCentral: function() {
              this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
              var e2 = this.reader.readData(this.zipCommentLength), t2 = o.uint8array ? "uint8array" : "array", r2 = i.transformTo(t2, e2);
              this.zipComment = this.loadOptions.decodeFileName(r2);
            }, readBlockZip64EndOfCentral: function() {
              this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
              for (var e2, t2, r2, n2 = this.zip64EndOfCentralSize - 44; 0 < n2; ) e2 = this.reader.readInt(2), t2 = this.reader.readInt(4), r2 = this.reader.readData(t2), this.zip64ExtensibleData[e2] = { id: e2, length: t2, value: r2 };
            }, readBlockZip64EndOfCentralLocator: function() {
              if (this.diskWithZip64CentralDirStart = this.reader.readInt(4), this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8), this.disksCount = this.reader.readInt(4), 1 < this.disksCount) throw new Error("Multi-volumes zip are not supported");
            }, readLocalFiles: function() {
              var e2, t2;
              for (e2 = 0; e2 < this.files.length; e2++) t2 = this.files[e2], this.reader.setIndex(t2.localHeaderOffset), this.checkSignature(s.LOCAL_FILE_HEADER), t2.readLocalPart(this.reader), t2.handleUTF8(), t2.processAttributes();
            }, readCentralDir: function() {
              var e2;
              for (this.reader.setIndex(this.centralDirOffset); this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER); ) (e2 = new a({ zip64: this.zip64 }, this.loadOptions)).readCentralPart(this.reader), this.files.push(e2);
              if (this.centralDirRecords !== this.files.length && 0 !== this.centralDirRecords && 0 === this.files.length) throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
            }, readEndOfCentral: function() {
              var e2 = this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);
              if (e2 < 0) throw !this.isSignature(0, s.LOCAL_FILE_HEADER) ? new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html") : new Error("Corrupted zip: can't find end of central directory");
              this.reader.setIndex(e2);
              var t2 = e2;
              if (this.checkSignature(s.CENTRAL_DIRECTORY_END), this.readBlockEndOfCentral(), this.diskNumber === i.MAX_VALUE_16BITS || this.diskWithCentralDirStart === i.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === i.MAX_VALUE_16BITS || this.centralDirRecords === i.MAX_VALUE_16BITS || this.centralDirSize === i.MAX_VALUE_32BITS || this.centralDirOffset === i.MAX_VALUE_32BITS) {
                if (this.zip64 = true, (e2 = this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR)) < 0) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
                if (this.reader.setIndex(e2), this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR), this.readBlockZip64EndOfCentralLocator(), !this.isSignature(this.relativeOffsetEndOfZip64CentralDir, s.ZIP64_CENTRAL_DIRECTORY_END) && (this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END), this.relativeOffsetEndOfZip64CentralDir < 0)) throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
                this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir), this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END), this.readBlockZip64EndOfCentral();
              }
              var r2 = this.centralDirOffset + this.centralDirSize;
              this.zip64 && (r2 += 20, r2 += 12 + this.zip64EndOfCentralSize);
              var n2 = t2 - r2;
              if (0 < n2) this.isSignature(t2, s.CENTRAL_FILE_HEADER) || (this.reader.zero = n2);
              else if (n2 < 0) throw new Error("Corrupted zip: missing " + Math.abs(n2) + " bytes.");
            }, prepareReader: function(e2) {
              this.reader = n(e2);
            }, load: function(e2) {
              this.prepareReader(e2), this.readEndOfCentral(), this.readCentralDir(), this.readLocalFiles();
            } }, t.exports = h;
          }, { "./reader/readerFor": 22, "./signature": 23, "./support": 30, "./utils": 32, "./zipEntry": 34 }], 34: [function(e, t, r) {
            var n = e("./reader/readerFor"), s = e("./utils"), i = e("./compressedObject"), a = e("./crc32"), o = e("./utf8"), h = e("./compressions"), u = e("./support");
            function l(e2, t2) {
              this.options = e2, this.loadOptions = t2;
            }
            l.prototype = { isEncrypted: function() {
              return 1 == (1 & this.bitFlag);
            }, useUTF8: function() {
              return 2048 == (2048 & this.bitFlag);
            }, readLocalPart: function(e2) {
              var t2, r2;
              if (e2.skip(22), this.fileNameLength = e2.readInt(2), r2 = e2.readInt(2), this.fileName = e2.readData(this.fileNameLength), e2.skip(r2), -1 === this.compressedSize || -1 === this.uncompressedSize) throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
              if (null === (t2 = (function(e3) {
                for (var t3 in h) if (Object.prototype.hasOwnProperty.call(h, t3) && h[t3].magic === e3) return h[t3];
                return null;
              })(this.compressionMethod))) throw new Error("Corrupted zip : compression " + s.pretty(this.compressionMethod) + " unknown (inner file : " + s.transformTo("string", this.fileName) + ")");
              this.decompressed = new i(this.compressedSize, this.uncompressedSize, this.crc32, t2, e2.readData(this.compressedSize));
            }, readCentralPart: function(e2) {
              this.versionMadeBy = e2.readInt(2), e2.skip(2), this.bitFlag = e2.readInt(2), this.compressionMethod = e2.readString(2), this.date = e2.readDate(), this.crc32 = e2.readInt(4), this.compressedSize = e2.readInt(4), this.uncompressedSize = e2.readInt(4);
              var t2 = e2.readInt(2);
              if (this.extraFieldsLength = e2.readInt(2), this.fileCommentLength = e2.readInt(2), this.diskNumberStart = e2.readInt(2), this.internalFileAttributes = e2.readInt(2), this.externalFileAttributes = e2.readInt(4), this.localHeaderOffset = e2.readInt(4), this.isEncrypted()) throw new Error("Encrypted zip are not supported");
              e2.skip(t2), this.readExtraFields(e2), this.parseZIP64ExtraField(e2), this.fileComment = e2.readData(this.fileCommentLength);
            }, processAttributes: function() {
              this.unixPermissions = null, this.dosPermissions = null;
              var e2 = this.versionMadeBy >> 8;
              this.dir = !!(16 & this.externalFileAttributes), 0 == e2 && (this.dosPermissions = 63 & this.externalFileAttributes), 3 == e2 && (this.unixPermissions = this.externalFileAttributes >> 16 & 65535), this.dir || "/" !== this.fileNameStr.slice(-1) || (this.dir = true);
            }, parseZIP64ExtraField: function() {
              if (this.extraFields[1]) {
                var e2 = n(this.extraFields[1].value);
                this.uncompressedSize === s.MAX_VALUE_32BITS && (this.uncompressedSize = e2.readInt(8)), this.compressedSize === s.MAX_VALUE_32BITS && (this.compressedSize = e2.readInt(8)), this.localHeaderOffset === s.MAX_VALUE_32BITS && (this.localHeaderOffset = e2.readInt(8)), this.diskNumberStart === s.MAX_VALUE_32BITS && (this.diskNumberStart = e2.readInt(4));
              }
            }, readExtraFields: function(e2) {
              var t2, r2, n2, i2 = e2.index + this.extraFieldsLength;
              for (this.extraFields || (this.extraFields = {}); e2.index + 4 < i2; ) t2 = e2.readInt(2), r2 = e2.readInt(2), n2 = e2.readData(r2), this.extraFields[t2] = { id: t2, length: r2, value: n2 };
              e2.setIndex(i2);
            }, handleUTF8: function() {
              var e2 = u.uint8array ? "uint8array" : "array";
              if (this.useUTF8()) this.fileNameStr = o.utf8decode(this.fileName), this.fileCommentStr = o.utf8decode(this.fileComment);
              else {
                var t2 = this.findExtraFieldUnicodePath();
                if (null !== t2) this.fileNameStr = t2;
                else {
                  var r2 = s.transformTo(e2, this.fileName);
                  this.fileNameStr = this.loadOptions.decodeFileName(r2);
                }
                var n2 = this.findExtraFieldUnicodeComment();
                if (null !== n2) this.fileCommentStr = n2;
                else {
                  var i2 = s.transformTo(e2, this.fileComment);
                  this.fileCommentStr = this.loadOptions.decodeFileName(i2);
                }
              }
            }, findExtraFieldUnicodePath: function() {
              var e2 = this.extraFields[28789];
              if (e2) {
                var t2 = n(e2.value);
                return 1 !== t2.readInt(1) ? null : a(this.fileName) !== t2.readInt(4) ? null : o.utf8decode(t2.readData(e2.length - 5));
              }
              return null;
            }, findExtraFieldUnicodeComment: function() {
              var e2 = this.extraFields[25461];
              if (e2) {
                var t2 = n(e2.value);
                return 1 !== t2.readInt(1) ? null : a(this.fileComment) !== t2.readInt(4) ? null : o.utf8decode(t2.readData(e2.length - 5));
              }
              return null;
            } }, t.exports = l;
          }, { "./compressedObject": 2, "./compressions": 3, "./crc32": 4, "./reader/readerFor": 22, "./support": 30, "./utf8": 31, "./utils": 32 }], 35: [function(e, t, r) {
            function n(e2, t2, r2) {
              this.name = e2, this.dir = r2.dir, this.date = r2.date, this.comment = r2.comment, this.unixPermissions = r2.unixPermissions, this.dosPermissions = r2.dosPermissions, this._data = t2, this._dataBinary = r2.binary, this.options = { compression: r2.compression, compressionOptions: r2.compressionOptions };
            }
            var s = e("./stream/StreamHelper"), i = e("./stream/DataWorker"), a = e("./utf8"), o = e("./compressedObject"), h = e("./stream/GenericWorker");
            n.prototype = { internalStream: function(e2) {
              var t2 = null, r2 = "string";
              try {
                if (!e2) throw new Error("No output type specified.");
                var n2 = "string" === (r2 = e2.toLowerCase()) || "text" === r2;
                "binarystring" !== r2 && "text" !== r2 || (r2 = "string"), t2 = this._decompressWorker();
                var i2 = !this._dataBinary;
                i2 && !n2 && (t2 = t2.pipe(new a.Utf8EncodeWorker())), !i2 && n2 && (t2 = t2.pipe(new a.Utf8DecodeWorker()));
              } catch (e3) {
                (t2 = new h("error")).error(e3);
              }
              return new s(t2, r2, "");
            }, async: function(e2, t2) {
              return this.internalStream(e2).accumulate(t2);
            }, nodeStream: function(e2, t2) {
              return this.internalStream(e2 || "nodebuffer").toNodejsStream(t2);
            }, _compressWorker: function(e2, t2) {
              if (this._data instanceof o && this._data.compression.magic === e2.magic) return this._data.getCompressedWorker();
              var r2 = this._decompressWorker();
              return this._dataBinary || (r2 = r2.pipe(new a.Utf8EncodeWorker())), o.createWorkerFrom(r2, e2, t2);
            }, _decompressWorker: function() {
              return this._data instanceof o ? this._data.getContentWorker() : this._data instanceof h ? this._data : new i(this._data);
            } };
            for (var u = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"], l = function() {
              throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
            }, f = 0; f < u.length; f++) n.prototype[u[f]] = l;
            t.exports = n;
          }, { "./compressedObject": 2, "./stream/DataWorker": 27, "./stream/GenericWorker": 28, "./stream/StreamHelper": 29, "./utf8": 31 }], 36: [function(e, l, t) {
            (function(t2) {
              var r, n, e2 = t2.MutationObserver || t2.WebKitMutationObserver;
              if (e2) {
                var i = 0, s = new e2(u), a = t2.document.createTextNode("");
                s.observe(a, { characterData: true }), r = function() {
                  a.data = i = ++i % 2;
                };
              } else if (t2.setImmediate || void 0 === t2.MessageChannel) r = "document" in t2 && "onreadystatechange" in t2.document.createElement("script") ? function() {
                var e3 = t2.document.createElement("script");
                e3.onreadystatechange = function() {
                  u(), e3.onreadystatechange = null, e3.parentNode.removeChild(e3), e3 = null;
                }, t2.document.documentElement.appendChild(e3);
              } : function() {
                setTimeout(u, 0);
              };
              else {
                var o = new t2.MessageChannel();
                o.port1.onmessage = u, r = function() {
                  o.port2.postMessage(0);
                };
              }
              var h = [];
              function u() {
                var e3, t3;
                n = true;
                for (var r2 = h.length; r2; ) {
                  for (t3 = h, h = [], e3 = -1; ++e3 < r2; ) t3[e3]();
                  r2 = h.length;
                }
                n = false;
              }
              l.exports = function(e3) {
                1 !== h.push(e3) || n || r();
              };
            }).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
          }, {}], 37: [function(e, t, r) {
            var i = e("immediate");
            function u() {
            }
            var l = {}, s = ["REJECTED"], a = ["FULFILLED"], n = ["PENDING"];
            function o(e2) {
              if ("function" != typeof e2) throw new TypeError("resolver must be a function");
              this.state = n, this.queue = [], this.outcome = void 0, e2 !== u && d(this, e2);
            }
            function h(e2, t2, r2) {
              this.promise = e2, "function" == typeof t2 && (this.onFulfilled = t2, this.callFulfilled = this.otherCallFulfilled), "function" == typeof r2 && (this.onRejected = r2, this.callRejected = this.otherCallRejected);
            }
            function f(t2, r2, n2) {
              i(function() {
                var e2;
                try {
                  e2 = r2(n2);
                } catch (e3) {
                  return l.reject(t2, e3);
                }
                e2 === t2 ? l.reject(t2, new TypeError("Cannot resolve promise with itself")) : l.resolve(t2, e2);
              });
            }
            function c(e2) {
              var t2 = e2 && e2.then;
              if (e2 && ("object" == typeof e2 || "function" == typeof e2) && "function" == typeof t2) return function() {
                t2.apply(e2, arguments);
              };
            }
            function d(t2, e2) {
              var r2 = false;
              function n2(e3) {
                r2 || (r2 = true, l.reject(t2, e3));
              }
              function i2(e3) {
                r2 || (r2 = true, l.resolve(t2, e3));
              }
              var s2 = p(function() {
                e2(i2, n2);
              });
              "error" === s2.status && n2(s2.value);
            }
            function p(e2, t2) {
              var r2 = {};
              try {
                r2.value = e2(t2), r2.status = "success";
              } catch (e3) {
                r2.status = "error", r2.value = e3;
              }
              return r2;
            }
            (t.exports = o).prototype.finally = function(t2) {
              if ("function" != typeof t2) return this;
              var r2 = this.constructor;
              return this.then(function(e2) {
                return r2.resolve(t2()).then(function() {
                  return e2;
                });
              }, function(e2) {
                return r2.resolve(t2()).then(function() {
                  throw e2;
                });
              });
            }, o.prototype.catch = function(e2) {
              return this.then(null, e2);
            }, o.prototype.then = function(e2, t2) {
              if ("function" != typeof e2 && this.state === a || "function" != typeof t2 && this.state === s) return this;
              var r2 = new this.constructor(u);
              this.state !== n ? f(r2, this.state === a ? e2 : t2, this.outcome) : this.queue.push(new h(r2, e2, t2));
              return r2;
            }, h.prototype.callFulfilled = function(e2) {
              l.resolve(this.promise, e2);
            }, h.prototype.otherCallFulfilled = function(e2) {
              f(this.promise, this.onFulfilled, e2);
            }, h.prototype.callRejected = function(e2) {
              l.reject(this.promise, e2);
            }, h.prototype.otherCallRejected = function(e2) {
              f(this.promise, this.onRejected, e2);
            }, l.resolve = function(e2, t2) {
              var r2 = p(c, t2);
              if ("error" === r2.status) return l.reject(e2, r2.value);
              var n2 = r2.value;
              if (n2) d(e2, n2);
              else {
                e2.state = a, e2.outcome = t2;
                for (var i2 = -1, s2 = e2.queue.length; ++i2 < s2; ) e2.queue[i2].callFulfilled(t2);
              }
              return e2;
            }, l.reject = function(e2, t2) {
              e2.state = s, e2.outcome = t2;
              for (var r2 = -1, n2 = e2.queue.length; ++r2 < n2; ) e2.queue[r2].callRejected(t2);
              return e2;
            }, o.resolve = function(e2) {
              if (e2 instanceof this) return e2;
              return l.resolve(new this(u), e2);
            }, o.reject = function(e2) {
              var t2 = new this(u);
              return l.reject(t2, e2);
            }, o.all = function(e2) {
              var r2 = this;
              if ("[object Array]" !== Object.prototype.toString.call(e2)) return this.reject(new TypeError("must be an array"));
              var n2 = e2.length, i2 = false;
              if (!n2) return this.resolve([]);
              var s2 = new Array(n2), a2 = 0, t2 = -1, o2 = new this(u);
              for (; ++t2 < n2; ) h2(e2[t2], t2);
              return o2;
              function h2(e3, t3) {
                r2.resolve(e3).then(function(e4) {
                  s2[t3] = e4, ++a2 !== n2 || i2 || (i2 = true, l.resolve(o2, s2));
                }, function(e4) {
                  i2 || (i2 = true, l.reject(o2, e4));
                });
              }
            }, o.race = function(e2) {
              var t2 = this;
              if ("[object Array]" !== Object.prototype.toString.call(e2)) return this.reject(new TypeError("must be an array"));
              var r2 = e2.length, n2 = false;
              if (!r2) return this.resolve([]);
              var i2 = -1, s2 = new this(u);
              for (; ++i2 < r2; ) a2 = e2[i2], t2.resolve(a2).then(function(e3) {
                n2 || (n2 = true, l.resolve(s2, e3));
              }, function(e3) {
                n2 || (n2 = true, l.reject(s2, e3));
              });
              var a2;
              return s2;
            };
          }, { immediate: 36 }], 38: [function(e, t, r) {
            var n = {};
            (0, e("./lib/utils/common").assign)(n, e("./lib/deflate"), e("./lib/inflate"), e("./lib/zlib/constants")), t.exports = n;
          }, { "./lib/deflate": 39, "./lib/inflate": 40, "./lib/utils/common": 41, "./lib/zlib/constants": 44 }], 39: [function(e, t, r) {
            var a = e("./zlib/deflate"), o = e("./utils/common"), h = e("./utils/strings"), i = e("./zlib/messages"), s = e("./zlib/zstream"), u = Object.prototype.toString, l = 0, f = -1, c = 0, d = 8;
            function p(e2) {
              if (!(this instanceof p)) return new p(e2);
              this.options = o.assign({ level: f, method: d, chunkSize: 16384, windowBits: 15, memLevel: 8, strategy: c, to: "" }, e2 || {});
              var t2 = this.options;
              t2.raw && 0 < t2.windowBits ? t2.windowBits = -t2.windowBits : t2.gzip && 0 < t2.windowBits && t2.windowBits < 16 && (t2.windowBits += 16), this.err = 0, this.msg = "", this.ended = false, this.chunks = [], this.strm = new s(), this.strm.avail_out = 0;
              var r2 = a.deflateInit2(this.strm, t2.level, t2.method, t2.windowBits, t2.memLevel, t2.strategy);
              if (r2 !== l) throw new Error(i[r2]);
              if (t2.header && a.deflateSetHeader(this.strm, t2.header), t2.dictionary) {
                var n2;
                if (n2 = "string" == typeof t2.dictionary ? h.string2buf(t2.dictionary) : "[object ArrayBuffer]" === u.call(t2.dictionary) ? new Uint8Array(t2.dictionary) : t2.dictionary, (r2 = a.deflateSetDictionary(this.strm, n2)) !== l) throw new Error(i[r2]);
                this._dict_set = true;
              }
            }
            function n(e2, t2) {
              var r2 = new p(t2);
              if (r2.push(e2, true), r2.err) throw r2.msg || i[r2.err];
              return r2.result;
            }
            p.prototype.push = function(e2, t2) {
              var r2, n2, i2 = this.strm, s2 = this.options.chunkSize;
              if (this.ended) return false;
              n2 = t2 === ~~t2 ? t2 : true === t2 ? 4 : 0, "string" == typeof e2 ? i2.input = h.string2buf(e2) : "[object ArrayBuffer]" === u.call(e2) ? i2.input = new Uint8Array(e2) : i2.input = e2, i2.next_in = 0, i2.avail_in = i2.input.length;
              do {
                if (0 === i2.avail_out && (i2.output = new o.Buf8(s2), i2.next_out = 0, i2.avail_out = s2), 1 !== (r2 = a.deflate(i2, n2)) && r2 !== l) return this.onEnd(r2), !(this.ended = true);
                0 !== i2.avail_out && (0 !== i2.avail_in || 4 !== n2 && 2 !== n2) || ("string" === this.options.to ? this.onData(h.buf2binstring(o.shrinkBuf(i2.output, i2.next_out))) : this.onData(o.shrinkBuf(i2.output, i2.next_out)));
              } while ((0 < i2.avail_in || 0 === i2.avail_out) && 1 !== r2);
              return 4 === n2 ? (r2 = a.deflateEnd(this.strm), this.onEnd(r2), this.ended = true, r2 === l) : 2 !== n2 || (this.onEnd(l), !(i2.avail_out = 0));
            }, p.prototype.onData = function(e2) {
              this.chunks.push(e2);
            }, p.prototype.onEnd = function(e2) {
              e2 === l && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = o.flattenChunks(this.chunks)), this.chunks = [], this.err = e2, this.msg = this.strm.msg;
            }, r.Deflate = p, r.deflate = n, r.deflateRaw = function(e2, t2) {
              return (t2 = t2 || {}).raw = true, n(e2, t2);
            }, r.gzip = function(e2, t2) {
              return (t2 = t2 || {}).gzip = true, n(e2, t2);
            };
          }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/deflate": 46, "./zlib/messages": 51, "./zlib/zstream": 53 }], 40: [function(e, t, r) {
            var c = e("./zlib/inflate"), d = e("./utils/common"), p = e("./utils/strings"), m = e("./zlib/constants"), n = e("./zlib/messages"), i = e("./zlib/zstream"), s = e("./zlib/gzheader"), _ = Object.prototype.toString;
            function a(e2) {
              if (!(this instanceof a)) return new a(e2);
              this.options = d.assign({ chunkSize: 16384, windowBits: 0, to: "" }, e2 || {});
              var t2 = this.options;
              t2.raw && 0 <= t2.windowBits && t2.windowBits < 16 && (t2.windowBits = -t2.windowBits, 0 === t2.windowBits && (t2.windowBits = -15)), !(0 <= t2.windowBits && t2.windowBits < 16) || e2 && e2.windowBits || (t2.windowBits += 32), 15 < t2.windowBits && t2.windowBits < 48 && 0 == (15 & t2.windowBits) && (t2.windowBits |= 15), this.err = 0, this.msg = "", this.ended = false, this.chunks = [], this.strm = new i(), this.strm.avail_out = 0;
              var r2 = c.inflateInit2(this.strm, t2.windowBits);
              if (r2 !== m.Z_OK) throw new Error(n[r2]);
              this.header = new s(), c.inflateGetHeader(this.strm, this.header);
            }
            function o(e2, t2) {
              var r2 = new a(t2);
              if (r2.push(e2, true), r2.err) throw r2.msg || n[r2.err];
              return r2.result;
            }
            a.prototype.push = function(e2, t2) {
              var r2, n2, i2, s2, a2, o2, h = this.strm, u = this.options.chunkSize, l = this.options.dictionary, f = false;
              if (this.ended) return false;
              n2 = t2 === ~~t2 ? t2 : true === t2 ? m.Z_FINISH : m.Z_NO_FLUSH, "string" == typeof e2 ? h.input = p.binstring2buf(e2) : "[object ArrayBuffer]" === _.call(e2) ? h.input = new Uint8Array(e2) : h.input = e2, h.next_in = 0, h.avail_in = h.input.length;
              do {
                if (0 === h.avail_out && (h.output = new d.Buf8(u), h.next_out = 0, h.avail_out = u), (r2 = c.inflate(h, m.Z_NO_FLUSH)) === m.Z_NEED_DICT && l && (o2 = "string" == typeof l ? p.string2buf(l) : "[object ArrayBuffer]" === _.call(l) ? new Uint8Array(l) : l, r2 = c.inflateSetDictionary(this.strm, o2)), r2 === m.Z_BUF_ERROR && true === f && (r2 = m.Z_OK, f = false), r2 !== m.Z_STREAM_END && r2 !== m.Z_OK) return this.onEnd(r2), !(this.ended = true);
                h.next_out && (0 !== h.avail_out && r2 !== m.Z_STREAM_END && (0 !== h.avail_in || n2 !== m.Z_FINISH && n2 !== m.Z_SYNC_FLUSH) || ("string" === this.options.to ? (i2 = p.utf8border(h.output, h.next_out), s2 = h.next_out - i2, a2 = p.buf2string(h.output, i2), h.next_out = s2, h.avail_out = u - s2, s2 && d.arraySet(h.output, h.output, i2, s2, 0), this.onData(a2)) : this.onData(d.shrinkBuf(h.output, h.next_out)))), 0 === h.avail_in && 0 === h.avail_out && (f = true);
              } while ((0 < h.avail_in || 0 === h.avail_out) && r2 !== m.Z_STREAM_END);
              return r2 === m.Z_STREAM_END && (n2 = m.Z_FINISH), n2 === m.Z_FINISH ? (r2 = c.inflateEnd(this.strm), this.onEnd(r2), this.ended = true, r2 === m.Z_OK) : n2 !== m.Z_SYNC_FLUSH || (this.onEnd(m.Z_OK), !(h.avail_out = 0));
            }, a.prototype.onData = function(e2) {
              this.chunks.push(e2);
            }, a.prototype.onEnd = function(e2) {
              e2 === m.Z_OK && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = d.flattenChunks(this.chunks)), this.chunks = [], this.err = e2, this.msg = this.strm.msg;
            }, r.Inflate = a, r.inflate = o, r.inflateRaw = function(e2, t2) {
              return (t2 = t2 || {}).raw = true, o(e2, t2);
            }, r.ungzip = o;
          }, { "./utils/common": 41, "./utils/strings": 42, "./zlib/constants": 44, "./zlib/gzheader": 47, "./zlib/inflate": 49, "./zlib/messages": 51, "./zlib/zstream": 53 }], 41: [function(e, t, r) {
            var n = "undefined" != typeof Uint8Array && "undefined" != typeof Uint16Array && "undefined" != typeof Int32Array;
            r.assign = function(e2) {
              for (var t2 = Array.prototype.slice.call(arguments, 1); t2.length; ) {
                var r2 = t2.shift();
                if (r2) {
                  if ("object" != typeof r2) throw new TypeError(r2 + "must be non-object");
                  for (var n2 in r2) r2.hasOwnProperty(n2) && (e2[n2] = r2[n2]);
                }
              }
              return e2;
            }, r.shrinkBuf = function(e2, t2) {
              return e2.length === t2 ? e2 : e2.subarray ? e2.subarray(0, t2) : (e2.length = t2, e2);
            };
            var i = { arraySet: function(e2, t2, r2, n2, i2) {
              if (t2.subarray && e2.subarray) e2.set(t2.subarray(r2, r2 + n2), i2);
              else for (var s2 = 0; s2 < n2; s2++) e2[i2 + s2] = t2[r2 + s2];
            }, flattenChunks: function(e2) {
              var t2, r2, n2, i2, s2, a;
              for (t2 = n2 = 0, r2 = e2.length; t2 < r2; t2++) n2 += e2[t2].length;
              for (a = new Uint8Array(n2), t2 = i2 = 0, r2 = e2.length; t2 < r2; t2++) s2 = e2[t2], a.set(s2, i2), i2 += s2.length;
              return a;
            } }, s = { arraySet: function(e2, t2, r2, n2, i2) {
              for (var s2 = 0; s2 < n2; s2++) e2[i2 + s2] = t2[r2 + s2];
            }, flattenChunks: function(e2) {
              return [].concat.apply([], e2);
            } };
            r.setTyped = function(e2) {
              e2 ? (r.Buf8 = Uint8Array, r.Buf16 = Uint16Array, r.Buf32 = Int32Array, r.assign(r, i)) : (r.Buf8 = Array, r.Buf16 = Array, r.Buf32 = Array, r.assign(r, s));
            }, r.setTyped(n);
          }, {}], 42: [function(e, t, r) {
            var h = e("./common"), i = true, s = true;
            try {
              String.fromCharCode.apply(null, [0]);
            } catch (e2) {
              i = false;
            }
            try {
              String.fromCharCode.apply(null, new Uint8Array(1));
            } catch (e2) {
              s = false;
            }
            for (var u = new h.Buf8(256), n = 0; n < 256; n++) u[n] = 252 <= n ? 6 : 248 <= n ? 5 : 240 <= n ? 4 : 224 <= n ? 3 : 192 <= n ? 2 : 1;
            function l(e2, t2) {
              if (t2 < 65537 && (e2.subarray && s || !e2.subarray && i)) return String.fromCharCode.apply(null, h.shrinkBuf(e2, t2));
              for (var r2 = "", n2 = 0; n2 < t2; n2++) r2 += String.fromCharCode(e2[n2]);
              return r2;
            }
            u[254] = u[254] = 1, r.string2buf = function(e2) {
              var t2, r2, n2, i2, s2, a = e2.length, o = 0;
              for (i2 = 0; i2 < a; i2++) 55296 == (64512 & (r2 = e2.charCodeAt(i2))) && i2 + 1 < a && 56320 == (64512 & (n2 = e2.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), o += r2 < 128 ? 1 : r2 < 2048 ? 2 : r2 < 65536 ? 3 : 4;
              for (t2 = new h.Buf8(o), i2 = s2 = 0; s2 < o; i2++) 55296 == (64512 & (r2 = e2.charCodeAt(i2))) && i2 + 1 < a && 56320 == (64512 & (n2 = e2.charCodeAt(i2 + 1))) && (r2 = 65536 + (r2 - 55296 << 10) + (n2 - 56320), i2++), r2 < 128 ? t2[s2++] = r2 : (r2 < 2048 ? t2[s2++] = 192 | r2 >>> 6 : (r2 < 65536 ? t2[s2++] = 224 | r2 >>> 12 : (t2[s2++] = 240 | r2 >>> 18, t2[s2++] = 128 | r2 >>> 12 & 63), t2[s2++] = 128 | r2 >>> 6 & 63), t2[s2++] = 128 | 63 & r2);
              return t2;
            }, r.buf2binstring = function(e2) {
              return l(e2, e2.length);
            }, r.binstring2buf = function(e2) {
              for (var t2 = new h.Buf8(e2.length), r2 = 0, n2 = t2.length; r2 < n2; r2++) t2[r2] = e2.charCodeAt(r2);
              return t2;
            }, r.buf2string = function(e2, t2) {
              var r2, n2, i2, s2, a = t2 || e2.length, o = new Array(2 * a);
              for (r2 = n2 = 0; r2 < a; ) if ((i2 = e2[r2++]) < 128) o[n2++] = i2;
              else if (4 < (s2 = u[i2])) o[n2++] = 65533, r2 += s2 - 1;
              else {
                for (i2 &= 2 === s2 ? 31 : 3 === s2 ? 15 : 7; 1 < s2 && r2 < a; ) i2 = i2 << 6 | 63 & e2[r2++], s2--;
                1 < s2 ? o[n2++] = 65533 : i2 < 65536 ? o[n2++] = i2 : (i2 -= 65536, o[n2++] = 55296 | i2 >> 10 & 1023, o[n2++] = 56320 | 1023 & i2);
              }
              return l(o, n2);
            }, r.utf8border = function(e2, t2) {
              var r2;
              for ((t2 = t2 || e2.length) > e2.length && (t2 = e2.length), r2 = t2 - 1; 0 <= r2 && 128 == (192 & e2[r2]); ) r2--;
              return r2 < 0 ? t2 : 0 === r2 ? t2 : r2 + u[e2[r2]] > t2 ? r2 : t2;
            };
          }, { "./common": 41 }], 43: [function(e, t, r) {
            t.exports = function(e2, t2, r2, n) {
              for (var i = 65535 & e2 | 0, s = e2 >>> 16 & 65535 | 0, a = 0; 0 !== r2; ) {
                for (r2 -= a = 2e3 < r2 ? 2e3 : r2; s = s + (i = i + t2[n++] | 0) | 0, --a; ) ;
                i %= 65521, s %= 65521;
              }
              return i | s << 16 | 0;
            };
          }, {}], 44: [function(e, t, r) {
            t.exports = { Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_SYNC_FLUSH: 2, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_BLOCK: 5, Z_TREES: 6, Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_BUF_ERROR: -5, Z_NO_COMPRESSION: 0, Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1, Z_FILTERED: 1, Z_HUFFMAN_ONLY: 2, Z_RLE: 3, Z_FIXED: 4, Z_DEFAULT_STRATEGY: 0, Z_BINARY: 0, Z_TEXT: 1, Z_UNKNOWN: 2, Z_DEFLATED: 8 };
          }, {}], 45: [function(e, t, r) {
            var o = (function() {
              for (var e2, t2 = [], r2 = 0; r2 < 256; r2++) {
                e2 = r2;
                for (var n = 0; n < 8; n++) e2 = 1 & e2 ? 3988292384 ^ e2 >>> 1 : e2 >>> 1;
                t2[r2] = e2;
              }
              return t2;
            })();
            t.exports = function(e2, t2, r2, n) {
              var i = o, s = n + r2;
              e2 ^= -1;
              for (var a = n; a < s; a++) e2 = e2 >>> 8 ^ i[255 & (e2 ^ t2[a])];
              return -1 ^ e2;
            };
          }, {}], 46: [function(e, t, r) {
            var h, c = e("../utils/common"), u = e("./trees"), d = e("./adler32"), p = e("./crc32"), n = e("./messages"), l = 0, f = 4, m = 0, _ = -2, g = -1, b = 4, i = 2, v = 8, y = 9, s = 286, a = 30, o = 19, w = 2 * s + 1, k = 15, x = 3, S = 258, z = S + x + 1, C = 42, E = 113, A = 1, I = 2, O = 3, B = 4;
            function R(e2, t2) {
              return e2.msg = n[t2], t2;
            }
            function T(e2) {
              return (e2 << 1) - (4 < e2 ? 9 : 0);
            }
            function D(e2) {
              for (var t2 = e2.length; 0 <= --t2; ) e2[t2] = 0;
            }
            function F(e2) {
              var t2 = e2.state, r2 = t2.pending;
              r2 > e2.avail_out && (r2 = e2.avail_out), 0 !== r2 && (c.arraySet(e2.output, t2.pending_buf, t2.pending_out, r2, e2.next_out), e2.next_out += r2, t2.pending_out += r2, e2.total_out += r2, e2.avail_out -= r2, t2.pending -= r2, 0 === t2.pending && (t2.pending_out = 0));
            }
            function N(e2, t2) {
              u._tr_flush_block(e2, 0 <= e2.block_start ? e2.block_start : -1, e2.strstart - e2.block_start, t2), e2.block_start = e2.strstart, F(e2.strm);
            }
            function U(e2, t2) {
              e2.pending_buf[e2.pending++] = t2;
            }
            function P(e2, t2) {
              e2.pending_buf[e2.pending++] = t2 >>> 8 & 255, e2.pending_buf[e2.pending++] = 255 & t2;
            }
            function L(e2, t2) {
              var r2, n2, i2 = e2.max_chain_length, s2 = e2.strstart, a2 = e2.prev_length, o2 = e2.nice_match, h2 = e2.strstart > e2.w_size - z ? e2.strstart - (e2.w_size - z) : 0, u2 = e2.window, l2 = e2.w_mask, f2 = e2.prev, c2 = e2.strstart + S, d2 = u2[s2 + a2 - 1], p2 = u2[s2 + a2];
              e2.prev_length >= e2.good_match && (i2 >>= 2), o2 > e2.lookahead && (o2 = e2.lookahead);
              do {
                if (u2[(r2 = t2) + a2] === p2 && u2[r2 + a2 - 1] === d2 && u2[r2] === u2[s2] && u2[++r2] === u2[s2 + 1]) {
                  s2 += 2, r2++;
                  do {
                  } while (u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && u2[++s2] === u2[++r2] && s2 < c2);
                  if (n2 = S - (c2 - s2), s2 = c2 - S, a2 < n2) {
                    if (e2.match_start = t2, o2 <= (a2 = n2)) break;
                    d2 = u2[s2 + a2 - 1], p2 = u2[s2 + a2];
                  }
                }
              } while ((t2 = f2[t2 & l2]) > h2 && 0 != --i2);
              return a2 <= e2.lookahead ? a2 : e2.lookahead;
            }
            function j(e2) {
              var t2, r2, n2, i2, s2, a2, o2, h2, u2, l2, f2 = e2.w_size;
              do {
                if (i2 = e2.window_size - e2.lookahead - e2.strstart, e2.strstart >= f2 + (f2 - z)) {
                  for (c.arraySet(e2.window, e2.window, f2, f2, 0), e2.match_start -= f2, e2.strstart -= f2, e2.block_start -= f2, t2 = r2 = e2.hash_size; n2 = e2.head[--t2], e2.head[t2] = f2 <= n2 ? n2 - f2 : 0, --r2; ) ;
                  for (t2 = r2 = f2; n2 = e2.prev[--t2], e2.prev[t2] = f2 <= n2 ? n2 - f2 : 0, --r2; ) ;
                  i2 += f2;
                }
                if (0 === e2.strm.avail_in) break;
                if (a2 = e2.strm, o2 = e2.window, h2 = e2.strstart + e2.lookahead, u2 = i2, l2 = void 0, l2 = a2.avail_in, u2 < l2 && (l2 = u2), r2 = 0 === l2 ? 0 : (a2.avail_in -= l2, c.arraySet(o2, a2.input, a2.next_in, l2, h2), 1 === a2.state.wrap ? a2.adler = d(a2.adler, o2, l2, h2) : 2 === a2.state.wrap && (a2.adler = p(a2.adler, o2, l2, h2)), a2.next_in += l2, a2.total_in += l2, l2), e2.lookahead += r2, e2.lookahead + e2.insert >= x) for (s2 = e2.strstart - e2.insert, e2.ins_h = e2.window[s2], e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[s2 + 1]) & e2.hash_mask; e2.insert && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[s2 + x - 1]) & e2.hash_mask, e2.prev[s2 & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = s2, s2++, e2.insert--, !(e2.lookahead + e2.insert < x)); ) ;
              } while (e2.lookahead < z && 0 !== e2.strm.avail_in);
            }
            function Z(e2, t2) {
              for (var r2, n2; ; ) {
                if (e2.lookahead < z) {
                  if (j(e2), e2.lookahead < z && t2 === l) return A;
                  if (0 === e2.lookahead) break;
                }
                if (r2 = 0, e2.lookahead >= x && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart), 0 !== r2 && e2.strstart - r2 <= e2.w_size - z && (e2.match_length = L(e2, r2)), e2.match_length >= x) if (n2 = u._tr_tally(e2, e2.strstart - e2.match_start, e2.match_length - x), e2.lookahead -= e2.match_length, e2.match_length <= e2.max_lazy_match && e2.lookahead >= x) {
                  for (e2.match_length--; e2.strstart++, e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart, 0 != --e2.match_length; ) ;
                  e2.strstart++;
                } else e2.strstart += e2.match_length, e2.match_length = 0, e2.ins_h = e2.window[e2.strstart], e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + 1]) & e2.hash_mask;
                else n2 = u._tr_tally(e2, 0, e2.window[e2.strstart]), e2.lookahead--, e2.strstart++;
                if (n2 && (N(e2, false), 0 === e2.strm.avail_out)) return A;
              }
              return e2.insert = e2.strstart < x - 1 ? e2.strstart : x - 1, t2 === f ? (N(e2, true), 0 === e2.strm.avail_out ? O : B) : e2.last_lit && (N(e2, false), 0 === e2.strm.avail_out) ? A : I;
            }
            function W(e2, t2) {
              for (var r2, n2, i2; ; ) {
                if (e2.lookahead < z) {
                  if (j(e2), e2.lookahead < z && t2 === l) return A;
                  if (0 === e2.lookahead) break;
                }
                if (r2 = 0, e2.lookahead >= x && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart), e2.prev_length = e2.match_length, e2.prev_match = e2.match_start, e2.match_length = x - 1, 0 !== r2 && e2.prev_length < e2.max_lazy_match && e2.strstart - r2 <= e2.w_size - z && (e2.match_length = L(e2, r2), e2.match_length <= 5 && (1 === e2.strategy || e2.match_length === x && 4096 < e2.strstart - e2.match_start) && (e2.match_length = x - 1)), e2.prev_length >= x && e2.match_length <= e2.prev_length) {
                  for (i2 = e2.strstart + e2.lookahead - x, n2 = u._tr_tally(e2, e2.strstart - 1 - e2.prev_match, e2.prev_length - x), e2.lookahead -= e2.prev_length - 1, e2.prev_length -= 2; ++e2.strstart <= i2 && (e2.ins_h = (e2.ins_h << e2.hash_shift ^ e2.window[e2.strstart + x - 1]) & e2.hash_mask, r2 = e2.prev[e2.strstart & e2.w_mask] = e2.head[e2.ins_h], e2.head[e2.ins_h] = e2.strstart), 0 != --e2.prev_length; ) ;
                  if (e2.match_available = 0, e2.match_length = x - 1, e2.strstart++, n2 && (N(e2, false), 0 === e2.strm.avail_out)) return A;
                } else if (e2.match_available) {
                  if ((n2 = u._tr_tally(e2, 0, e2.window[e2.strstart - 1])) && N(e2, false), e2.strstart++, e2.lookahead--, 0 === e2.strm.avail_out) return A;
                } else e2.match_available = 1, e2.strstart++, e2.lookahead--;
              }
              return e2.match_available && (n2 = u._tr_tally(e2, 0, e2.window[e2.strstart - 1]), e2.match_available = 0), e2.insert = e2.strstart < x - 1 ? e2.strstart : x - 1, t2 === f ? (N(e2, true), 0 === e2.strm.avail_out ? O : B) : e2.last_lit && (N(e2, false), 0 === e2.strm.avail_out) ? A : I;
            }
            function M(e2, t2, r2, n2, i2) {
              this.good_length = e2, this.max_lazy = t2, this.nice_length = r2, this.max_chain = n2, this.func = i2;
            }
            function H() {
              this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = v, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new c.Buf16(2 * w), this.dyn_dtree = new c.Buf16(2 * (2 * a + 1)), this.bl_tree = new c.Buf16(2 * (2 * o + 1)), D(this.dyn_ltree), D(this.dyn_dtree), D(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new c.Buf16(k + 1), this.heap = new c.Buf16(2 * s + 1), D(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new c.Buf16(2 * s + 1), D(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
            }
            function G(e2) {
              var t2;
              return e2 && e2.state ? (e2.total_in = e2.total_out = 0, e2.data_type = i, (t2 = e2.state).pending = 0, t2.pending_out = 0, t2.wrap < 0 && (t2.wrap = -t2.wrap), t2.status = t2.wrap ? C : E, e2.adler = 2 === t2.wrap ? 0 : 1, t2.last_flush = l, u._tr_init(t2), m) : R(e2, _);
            }
            function K(e2) {
              var t2 = G(e2);
              return t2 === m && (function(e3) {
                e3.window_size = 2 * e3.w_size, D(e3.head), e3.max_lazy_match = h[e3.level].max_lazy, e3.good_match = h[e3.level].good_length, e3.nice_match = h[e3.level].nice_length, e3.max_chain_length = h[e3.level].max_chain, e3.strstart = 0, e3.block_start = 0, e3.lookahead = 0, e3.insert = 0, e3.match_length = e3.prev_length = x - 1, e3.match_available = 0, e3.ins_h = 0;
              })(e2.state), t2;
            }
            function Y(e2, t2, r2, n2, i2, s2) {
              if (!e2) return _;
              var a2 = 1;
              if (t2 === g && (t2 = 6), n2 < 0 ? (a2 = 0, n2 = -n2) : 15 < n2 && (a2 = 2, n2 -= 16), i2 < 1 || y < i2 || r2 !== v || n2 < 8 || 15 < n2 || t2 < 0 || 9 < t2 || s2 < 0 || b < s2) return R(e2, _);
              8 === n2 && (n2 = 9);
              var o2 = new H();
              return (e2.state = o2).strm = e2, o2.wrap = a2, o2.gzhead = null, o2.w_bits = n2, o2.w_size = 1 << o2.w_bits, o2.w_mask = o2.w_size - 1, o2.hash_bits = i2 + 7, o2.hash_size = 1 << o2.hash_bits, o2.hash_mask = o2.hash_size - 1, o2.hash_shift = ~~((o2.hash_bits + x - 1) / x), o2.window = new c.Buf8(2 * o2.w_size), o2.head = new c.Buf16(o2.hash_size), o2.prev = new c.Buf16(o2.w_size), o2.lit_bufsize = 1 << i2 + 6, o2.pending_buf_size = 4 * o2.lit_bufsize, o2.pending_buf = new c.Buf8(o2.pending_buf_size), o2.d_buf = 1 * o2.lit_bufsize, o2.l_buf = 3 * o2.lit_bufsize, o2.level = t2, o2.strategy = s2, o2.method = r2, K(e2);
            }
            h = [new M(0, 0, 0, 0, function(e2, t2) {
              var r2 = 65535;
              for (r2 > e2.pending_buf_size - 5 && (r2 = e2.pending_buf_size - 5); ; ) {
                if (e2.lookahead <= 1) {
                  if (j(e2), 0 === e2.lookahead && t2 === l) return A;
                  if (0 === e2.lookahead) break;
                }
                e2.strstart += e2.lookahead, e2.lookahead = 0;
                var n2 = e2.block_start + r2;
                if ((0 === e2.strstart || e2.strstart >= n2) && (e2.lookahead = e2.strstart - n2, e2.strstart = n2, N(e2, false), 0 === e2.strm.avail_out)) return A;
                if (e2.strstart - e2.block_start >= e2.w_size - z && (N(e2, false), 0 === e2.strm.avail_out)) return A;
              }
              return e2.insert = 0, t2 === f ? (N(e2, true), 0 === e2.strm.avail_out ? O : B) : (e2.strstart > e2.block_start && (N(e2, false), e2.strm.avail_out), A);
            }), new M(4, 4, 8, 4, Z), new M(4, 5, 16, 8, Z), new M(4, 6, 32, 32, Z), new M(4, 4, 16, 16, W), new M(8, 16, 32, 32, W), new M(8, 16, 128, 128, W), new M(8, 32, 128, 256, W), new M(32, 128, 258, 1024, W), new M(32, 258, 258, 4096, W)], r.deflateInit = function(e2, t2) {
              return Y(e2, t2, v, 15, 8, 0);
            }, r.deflateInit2 = Y, r.deflateReset = K, r.deflateResetKeep = G, r.deflateSetHeader = function(e2, t2) {
              return e2 && e2.state ? 2 !== e2.state.wrap ? _ : (e2.state.gzhead = t2, m) : _;
            }, r.deflate = function(e2, t2) {
              var r2, n2, i2, s2;
              if (!e2 || !e2.state || 5 < t2 || t2 < 0) return e2 ? R(e2, _) : _;
              if (n2 = e2.state, !e2.output || !e2.input && 0 !== e2.avail_in || 666 === n2.status && t2 !== f) return R(e2, 0 === e2.avail_out ? -5 : _);
              if (n2.strm = e2, r2 = n2.last_flush, n2.last_flush = t2, n2.status === C) if (2 === n2.wrap) e2.adler = 0, U(n2, 31), U(n2, 139), U(n2, 8), n2.gzhead ? (U(n2, (n2.gzhead.text ? 1 : 0) + (n2.gzhead.hcrc ? 2 : 0) + (n2.gzhead.extra ? 4 : 0) + (n2.gzhead.name ? 8 : 0) + (n2.gzhead.comment ? 16 : 0)), U(n2, 255 & n2.gzhead.time), U(n2, n2.gzhead.time >> 8 & 255), U(n2, n2.gzhead.time >> 16 & 255), U(n2, n2.gzhead.time >> 24 & 255), U(n2, 9 === n2.level ? 2 : 2 <= n2.strategy || n2.level < 2 ? 4 : 0), U(n2, 255 & n2.gzhead.os), n2.gzhead.extra && n2.gzhead.extra.length && (U(n2, 255 & n2.gzhead.extra.length), U(n2, n2.gzhead.extra.length >> 8 & 255)), n2.gzhead.hcrc && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending, 0)), n2.gzindex = 0, n2.status = 69) : (U(n2, 0), U(n2, 0), U(n2, 0), U(n2, 0), U(n2, 0), U(n2, 9 === n2.level ? 2 : 2 <= n2.strategy || n2.level < 2 ? 4 : 0), U(n2, 3), n2.status = E);
              else {
                var a2 = v + (n2.w_bits - 8 << 4) << 8;
                a2 |= (2 <= n2.strategy || n2.level < 2 ? 0 : n2.level < 6 ? 1 : 6 === n2.level ? 2 : 3) << 6, 0 !== n2.strstart && (a2 |= 32), a2 += 31 - a2 % 31, n2.status = E, P(n2, a2), 0 !== n2.strstart && (P(n2, e2.adler >>> 16), P(n2, 65535 & e2.adler)), e2.adler = 1;
              }
              if (69 === n2.status) if (n2.gzhead.extra) {
                for (i2 = n2.pending; n2.gzindex < (65535 & n2.gzhead.extra.length) && (n2.pending !== n2.pending_buf_size || (n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), F(e2), i2 = n2.pending, n2.pending !== n2.pending_buf_size)); ) U(n2, 255 & n2.gzhead.extra[n2.gzindex]), n2.gzindex++;
                n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), n2.gzindex === n2.gzhead.extra.length && (n2.gzindex = 0, n2.status = 73);
              } else n2.status = 73;
              if (73 === n2.status) if (n2.gzhead.name) {
                i2 = n2.pending;
                do {
                  if (n2.pending === n2.pending_buf_size && (n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), F(e2), i2 = n2.pending, n2.pending === n2.pending_buf_size)) {
                    s2 = 1;
                    break;
                  }
                  s2 = n2.gzindex < n2.gzhead.name.length ? 255 & n2.gzhead.name.charCodeAt(n2.gzindex++) : 0, U(n2, s2);
                } while (0 !== s2);
                n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), 0 === s2 && (n2.gzindex = 0, n2.status = 91);
              } else n2.status = 91;
              if (91 === n2.status) if (n2.gzhead.comment) {
                i2 = n2.pending;
                do {
                  if (n2.pending === n2.pending_buf_size && (n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), F(e2), i2 = n2.pending, n2.pending === n2.pending_buf_size)) {
                    s2 = 1;
                    break;
                  }
                  s2 = n2.gzindex < n2.gzhead.comment.length ? 255 & n2.gzhead.comment.charCodeAt(n2.gzindex++) : 0, U(n2, s2);
                } while (0 !== s2);
                n2.gzhead.hcrc && n2.pending > i2 && (e2.adler = p(e2.adler, n2.pending_buf, n2.pending - i2, i2)), 0 === s2 && (n2.status = 103);
              } else n2.status = 103;
              if (103 === n2.status && (n2.gzhead.hcrc ? (n2.pending + 2 > n2.pending_buf_size && F(e2), n2.pending + 2 <= n2.pending_buf_size && (U(n2, 255 & e2.adler), U(n2, e2.adler >> 8 & 255), e2.adler = 0, n2.status = E)) : n2.status = E), 0 !== n2.pending) {
                if (F(e2), 0 === e2.avail_out) return n2.last_flush = -1, m;
              } else if (0 === e2.avail_in && T(t2) <= T(r2) && t2 !== f) return R(e2, -5);
              if (666 === n2.status && 0 !== e2.avail_in) return R(e2, -5);
              if (0 !== e2.avail_in || 0 !== n2.lookahead || t2 !== l && 666 !== n2.status) {
                var o2 = 2 === n2.strategy ? (function(e3, t3) {
                  for (var r3; ; ) {
                    if (0 === e3.lookahead && (j(e3), 0 === e3.lookahead)) {
                      if (t3 === l) return A;
                      break;
                    }
                    if (e3.match_length = 0, r3 = u._tr_tally(e3, 0, e3.window[e3.strstart]), e3.lookahead--, e3.strstart++, r3 && (N(e3, false), 0 === e3.strm.avail_out)) return A;
                  }
                  return e3.insert = 0, t3 === f ? (N(e3, true), 0 === e3.strm.avail_out ? O : B) : e3.last_lit && (N(e3, false), 0 === e3.strm.avail_out) ? A : I;
                })(n2, t2) : 3 === n2.strategy ? (function(e3, t3) {
                  for (var r3, n3, i3, s3, a3 = e3.window; ; ) {
                    if (e3.lookahead <= S) {
                      if (j(e3), e3.lookahead <= S && t3 === l) return A;
                      if (0 === e3.lookahead) break;
                    }
                    if (e3.match_length = 0, e3.lookahead >= x && 0 < e3.strstart && (n3 = a3[i3 = e3.strstart - 1]) === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3]) {
                      s3 = e3.strstart + S;
                      do {
                      } while (n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && n3 === a3[++i3] && i3 < s3);
                      e3.match_length = S - (s3 - i3), e3.match_length > e3.lookahead && (e3.match_length = e3.lookahead);
                    }
                    if (e3.match_length >= x ? (r3 = u._tr_tally(e3, 1, e3.match_length - x), e3.lookahead -= e3.match_length, e3.strstart += e3.match_length, e3.match_length = 0) : (r3 = u._tr_tally(e3, 0, e3.window[e3.strstart]), e3.lookahead--, e3.strstart++), r3 && (N(e3, false), 0 === e3.strm.avail_out)) return A;
                  }
                  return e3.insert = 0, t3 === f ? (N(e3, true), 0 === e3.strm.avail_out ? O : B) : e3.last_lit && (N(e3, false), 0 === e3.strm.avail_out) ? A : I;
                })(n2, t2) : h[n2.level].func(n2, t2);
                if (o2 !== O && o2 !== B || (n2.status = 666), o2 === A || o2 === O) return 0 === e2.avail_out && (n2.last_flush = -1), m;
                if (o2 === I && (1 === t2 ? u._tr_align(n2) : 5 !== t2 && (u._tr_stored_block(n2, 0, 0, false), 3 === t2 && (D(n2.head), 0 === n2.lookahead && (n2.strstart = 0, n2.block_start = 0, n2.insert = 0))), F(e2), 0 === e2.avail_out)) return n2.last_flush = -1, m;
              }
              return t2 !== f ? m : n2.wrap <= 0 ? 1 : (2 === n2.wrap ? (U(n2, 255 & e2.adler), U(n2, e2.adler >> 8 & 255), U(n2, e2.adler >> 16 & 255), U(n2, e2.adler >> 24 & 255), U(n2, 255 & e2.total_in), U(n2, e2.total_in >> 8 & 255), U(n2, e2.total_in >> 16 & 255), U(n2, e2.total_in >> 24 & 255)) : (P(n2, e2.adler >>> 16), P(n2, 65535 & e2.adler)), F(e2), 0 < n2.wrap && (n2.wrap = -n2.wrap), 0 !== n2.pending ? m : 1);
            }, r.deflateEnd = function(e2) {
              var t2;
              return e2 && e2.state ? (t2 = e2.state.status) !== C && 69 !== t2 && 73 !== t2 && 91 !== t2 && 103 !== t2 && t2 !== E && 666 !== t2 ? R(e2, _) : (e2.state = null, t2 === E ? R(e2, -3) : m) : _;
            }, r.deflateSetDictionary = function(e2, t2) {
              var r2, n2, i2, s2, a2, o2, h2, u2, l2 = t2.length;
              if (!e2 || !e2.state) return _;
              if (2 === (s2 = (r2 = e2.state).wrap) || 1 === s2 && r2.status !== C || r2.lookahead) return _;
              for (1 === s2 && (e2.adler = d(e2.adler, t2, l2, 0)), r2.wrap = 0, l2 >= r2.w_size && (0 === s2 && (D(r2.head), r2.strstart = 0, r2.block_start = 0, r2.insert = 0), u2 = new c.Buf8(r2.w_size), c.arraySet(u2, t2, l2 - r2.w_size, r2.w_size, 0), t2 = u2, l2 = r2.w_size), a2 = e2.avail_in, o2 = e2.next_in, h2 = e2.input, e2.avail_in = l2, e2.next_in = 0, e2.input = t2, j(r2); r2.lookahead >= x; ) {
                for (n2 = r2.strstart, i2 = r2.lookahead - (x - 1); r2.ins_h = (r2.ins_h << r2.hash_shift ^ r2.window[n2 + x - 1]) & r2.hash_mask, r2.prev[n2 & r2.w_mask] = r2.head[r2.ins_h], r2.head[r2.ins_h] = n2, n2++, --i2; ) ;
                r2.strstart = n2, r2.lookahead = x - 1, j(r2);
              }
              return r2.strstart += r2.lookahead, r2.block_start = r2.strstart, r2.insert = r2.lookahead, r2.lookahead = 0, r2.match_length = r2.prev_length = x - 1, r2.match_available = 0, e2.next_in = o2, e2.input = h2, e2.avail_in = a2, r2.wrap = s2, m;
            }, r.deflateInfo = "pako deflate (from Nodeca project)";
          }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./messages": 51, "./trees": 52 }], 47: [function(e, t, r) {
            t.exports = function() {
              this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = false;
            };
          }, {}], 48: [function(e, t, r) {
            t.exports = function(e2, t2) {
              var r2, n, i, s, a, o, h, u, l, f, c, d, p, m, _, g, b, v, y, w, k, x, S, z, C;
              r2 = e2.state, n = e2.next_in, z = e2.input, i = n + (e2.avail_in - 5), s = e2.next_out, C = e2.output, a = s - (t2 - e2.avail_out), o = s + (e2.avail_out - 257), h = r2.dmax, u = r2.wsize, l = r2.whave, f = r2.wnext, c = r2.window, d = r2.hold, p = r2.bits, m = r2.lencode, _ = r2.distcode, g = (1 << r2.lenbits) - 1, b = (1 << r2.distbits) - 1;
              e: do {
                p < 15 && (d += z[n++] << p, p += 8, d += z[n++] << p, p += 8), v = m[d & g];
                t: for (; ; ) {
                  if (d >>>= y = v >>> 24, p -= y, 0 === (y = v >>> 16 & 255)) C[s++] = 65535 & v;
                  else {
                    if (!(16 & y)) {
                      if (0 == (64 & y)) {
                        v = m[(65535 & v) + (d & (1 << y) - 1)];
                        continue t;
                      }
                      if (32 & y) {
                        r2.mode = 12;
                        break e;
                      }
                      e2.msg = "invalid literal/length code", r2.mode = 30;
                      break e;
                    }
                    w = 65535 & v, (y &= 15) && (p < y && (d += z[n++] << p, p += 8), w += d & (1 << y) - 1, d >>>= y, p -= y), p < 15 && (d += z[n++] << p, p += 8, d += z[n++] << p, p += 8), v = _[d & b];
                    r: for (; ; ) {
                      if (d >>>= y = v >>> 24, p -= y, !(16 & (y = v >>> 16 & 255))) {
                        if (0 == (64 & y)) {
                          v = _[(65535 & v) + (d & (1 << y) - 1)];
                          continue r;
                        }
                        e2.msg = "invalid distance code", r2.mode = 30;
                        break e;
                      }
                      if (k = 65535 & v, p < (y &= 15) && (d += z[n++] << p, (p += 8) < y && (d += z[n++] << p, p += 8)), h < (k += d & (1 << y) - 1)) {
                        e2.msg = "invalid distance too far back", r2.mode = 30;
                        break e;
                      }
                      if (d >>>= y, p -= y, (y = s - a) < k) {
                        if (l < (y = k - y) && r2.sane) {
                          e2.msg = "invalid distance too far back", r2.mode = 30;
                          break e;
                        }
                        if (S = c, (x = 0) === f) {
                          if (x += u - y, y < w) {
                            for (w -= y; C[s++] = c[x++], --y; ) ;
                            x = s - k, S = C;
                          }
                        } else if (f < y) {
                          if (x += u + f - y, (y -= f) < w) {
                            for (w -= y; C[s++] = c[x++], --y; ) ;
                            if (x = 0, f < w) {
                              for (w -= y = f; C[s++] = c[x++], --y; ) ;
                              x = s - k, S = C;
                            }
                          }
                        } else if (x += f - y, y < w) {
                          for (w -= y; C[s++] = c[x++], --y; ) ;
                          x = s - k, S = C;
                        }
                        for (; 2 < w; ) C[s++] = S[x++], C[s++] = S[x++], C[s++] = S[x++], w -= 3;
                        w && (C[s++] = S[x++], 1 < w && (C[s++] = S[x++]));
                      } else {
                        for (x = s - k; C[s++] = C[x++], C[s++] = C[x++], C[s++] = C[x++], 2 < (w -= 3); ) ;
                        w && (C[s++] = C[x++], 1 < w && (C[s++] = C[x++]));
                      }
                      break;
                    }
                  }
                  break;
                }
              } while (n < i && s < o);
              n -= w = p >> 3, d &= (1 << (p -= w << 3)) - 1, e2.next_in = n, e2.next_out = s, e2.avail_in = n < i ? i - n + 5 : 5 - (n - i), e2.avail_out = s < o ? o - s + 257 : 257 - (s - o), r2.hold = d, r2.bits = p;
            };
          }, {}], 49: [function(e, t, r) {
            var I = e("../utils/common"), O = e("./adler32"), B = e("./crc32"), R = e("./inffast"), T = e("./inftrees"), D = 1, F = 2, N = 0, U = -2, P = 1, n = 852, i = 592;
            function L(e2) {
              return (e2 >>> 24 & 255) + (e2 >>> 8 & 65280) + ((65280 & e2) << 8) + ((255 & e2) << 24);
            }
            function s() {
              this.mode = 0, this.last = false, this.wrap = 0, this.havedict = false, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new I.Buf16(320), this.work = new I.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
            }
            function a(e2) {
              var t2;
              return e2 && e2.state ? (t2 = e2.state, e2.total_in = e2.total_out = t2.total = 0, e2.msg = "", t2.wrap && (e2.adler = 1 & t2.wrap), t2.mode = P, t2.last = 0, t2.havedict = 0, t2.dmax = 32768, t2.head = null, t2.hold = 0, t2.bits = 0, t2.lencode = t2.lendyn = new I.Buf32(n), t2.distcode = t2.distdyn = new I.Buf32(i), t2.sane = 1, t2.back = -1, N) : U;
            }
            function o(e2) {
              var t2;
              return e2 && e2.state ? ((t2 = e2.state).wsize = 0, t2.whave = 0, t2.wnext = 0, a(e2)) : U;
            }
            function h(e2, t2) {
              var r2, n2;
              return e2 && e2.state ? (n2 = e2.state, t2 < 0 ? (r2 = 0, t2 = -t2) : (r2 = 1 + (t2 >> 4), t2 < 48 && (t2 &= 15)), t2 && (t2 < 8 || 15 < t2) ? U : (null !== n2.window && n2.wbits !== t2 && (n2.window = null), n2.wrap = r2, n2.wbits = t2, o(e2))) : U;
            }
            function u(e2, t2) {
              var r2, n2;
              return e2 ? (n2 = new s(), (e2.state = n2).window = null, (r2 = h(e2, t2)) !== N && (e2.state = null), r2) : U;
            }
            var l, f, c = true;
            function j(e2) {
              if (c) {
                var t2;
                for (l = new I.Buf32(512), f = new I.Buf32(32), t2 = 0; t2 < 144; ) e2.lens[t2++] = 8;
                for (; t2 < 256; ) e2.lens[t2++] = 9;
                for (; t2 < 280; ) e2.lens[t2++] = 7;
                for (; t2 < 288; ) e2.lens[t2++] = 8;
                for (T(D, e2.lens, 0, 288, l, 0, e2.work, { bits: 9 }), t2 = 0; t2 < 32; ) e2.lens[t2++] = 5;
                T(F, e2.lens, 0, 32, f, 0, e2.work, { bits: 5 }), c = false;
              }
              e2.lencode = l, e2.lenbits = 9, e2.distcode = f, e2.distbits = 5;
            }
            function Z(e2, t2, r2, n2) {
              var i2, s2 = e2.state;
              return null === s2.window && (s2.wsize = 1 << s2.wbits, s2.wnext = 0, s2.whave = 0, s2.window = new I.Buf8(s2.wsize)), n2 >= s2.wsize ? (I.arraySet(s2.window, t2, r2 - s2.wsize, s2.wsize, 0), s2.wnext = 0, s2.whave = s2.wsize) : (n2 < (i2 = s2.wsize - s2.wnext) && (i2 = n2), I.arraySet(s2.window, t2, r2 - n2, i2, s2.wnext), (n2 -= i2) ? (I.arraySet(s2.window, t2, r2 - n2, n2, 0), s2.wnext = n2, s2.whave = s2.wsize) : (s2.wnext += i2, s2.wnext === s2.wsize && (s2.wnext = 0), s2.whave < s2.wsize && (s2.whave += i2))), 0;
            }
            r.inflateReset = o, r.inflateReset2 = h, r.inflateResetKeep = a, r.inflateInit = function(e2) {
              return u(e2, 15);
            }, r.inflateInit2 = u, r.inflate = function(e2, t2) {
              var r2, n2, i2, s2, a2, o2, h2, u2, l2, f2, c2, d, p, m, _, g, b, v, y, w, k, x, S, z, C = 0, E = new I.Buf8(4), A = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
              if (!e2 || !e2.state || !e2.output || !e2.input && 0 !== e2.avail_in) return U;
              12 === (r2 = e2.state).mode && (r2.mode = 13), a2 = e2.next_out, i2 = e2.output, h2 = e2.avail_out, s2 = e2.next_in, n2 = e2.input, o2 = e2.avail_in, u2 = r2.hold, l2 = r2.bits, f2 = o2, c2 = h2, x = N;
              e: for (; ; ) switch (r2.mode) {
                case P:
                  if (0 === r2.wrap) {
                    r2.mode = 13;
                    break;
                  }
                  for (; l2 < 16; ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  if (2 & r2.wrap && 35615 === u2) {
                    E[r2.check = 0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0), l2 = u2 = 0, r2.mode = 2;
                    break;
                  }
                  if (r2.flags = 0, r2.head && (r2.head.done = false), !(1 & r2.wrap) || (((255 & u2) << 8) + (u2 >> 8)) % 31) {
                    e2.msg = "incorrect header check", r2.mode = 30;
                    break;
                  }
                  if (8 != (15 & u2)) {
                    e2.msg = "unknown compression method", r2.mode = 30;
                    break;
                  }
                  if (l2 -= 4, k = 8 + (15 & (u2 >>>= 4)), 0 === r2.wbits) r2.wbits = k;
                  else if (k > r2.wbits) {
                    e2.msg = "invalid window size", r2.mode = 30;
                    break;
                  }
                  r2.dmax = 1 << k, e2.adler = r2.check = 1, r2.mode = 512 & u2 ? 10 : 12, l2 = u2 = 0;
                  break;
                case 2:
                  for (; l2 < 16; ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  if (r2.flags = u2, 8 != (255 & r2.flags)) {
                    e2.msg = "unknown compression method", r2.mode = 30;
                    break;
                  }
                  if (57344 & r2.flags) {
                    e2.msg = "unknown header flags set", r2.mode = 30;
                    break;
                  }
                  r2.head && (r2.head.text = u2 >> 8 & 1), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0)), l2 = u2 = 0, r2.mode = 3;
                case 3:
                  for (; l2 < 32; ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  r2.head && (r2.head.time = u2), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, E[2] = u2 >>> 16 & 255, E[3] = u2 >>> 24 & 255, r2.check = B(r2.check, E, 4, 0)), l2 = u2 = 0, r2.mode = 4;
                case 4:
                  for (; l2 < 16; ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  r2.head && (r2.head.xflags = 255 & u2, r2.head.os = u2 >> 8), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0)), l2 = u2 = 0, r2.mode = 5;
                case 5:
                  if (1024 & r2.flags) {
                    for (; l2 < 16; ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    r2.length = u2, r2.head && (r2.head.extra_len = u2), 512 & r2.flags && (E[0] = 255 & u2, E[1] = u2 >>> 8 & 255, r2.check = B(r2.check, E, 2, 0)), l2 = u2 = 0;
                  } else r2.head && (r2.head.extra = null);
                  r2.mode = 6;
                case 6:
                  if (1024 & r2.flags && (o2 < (d = r2.length) && (d = o2), d && (r2.head && (k = r2.head.extra_len - r2.length, r2.head.extra || (r2.head.extra = new Array(r2.head.extra_len)), I.arraySet(r2.head.extra, n2, s2, d, k)), 512 & r2.flags && (r2.check = B(r2.check, n2, d, s2)), o2 -= d, s2 += d, r2.length -= d), r2.length)) break e;
                  r2.length = 0, r2.mode = 7;
                case 7:
                  if (2048 & r2.flags) {
                    if (0 === o2) break e;
                    for (d = 0; k = n2[s2 + d++], r2.head && k && r2.length < 65536 && (r2.head.name += String.fromCharCode(k)), k && d < o2; ) ;
                    if (512 & r2.flags && (r2.check = B(r2.check, n2, d, s2)), o2 -= d, s2 += d, k) break e;
                  } else r2.head && (r2.head.name = null);
                  r2.length = 0, r2.mode = 8;
                case 8:
                  if (4096 & r2.flags) {
                    if (0 === o2) break e;
                    for (d = 0; k = n2[s2 + d++], r2.head && k && r2.length < 65536 && (r2.head.comment += String.fromCharCode(k)), k && d < o2; ) ;
                    if (512 & r2.flags && (r2.check = B(r2.check, n2, d, s2)), o2 -= d, s2 += d, k) break e;
                  } else r2.head && (r2.head.comment = null);
                  r2.mode = 9;
                case 9:
                  if (512 & r2.flags) {
                    for (; l2 < 16; ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    if (u2 !== (65535 & r2.check)) {
                      e2.msg = "header crc mismatch", r2.mode = 30;
                      break;
                    }
                    l2 = u2 = 0;
                  }
                  r2.head && (r2.head.hcrc = r2.flags >> 9 & 1, r2.head.done = true), e2.adler = r2.check = 0, r2.mode = 12;
                  break;
                case 10:
                  for (; l2 < 32; ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  e2.adler = r2.check = L(u2), l2 = u2 = 0, r2.mode = 11;
                case 11:
                  if (0 === r2.havedict) return e2.next_out = a2, e2.avail_out = h2, e2.next_in = s2, e2.avail_in = o2, r2.hold = u2, r2.bits = l2, 2;
                  e2.adler = r2.check = 1, r2.mode = 12;
                case 12:
                  if (5 === t2 || 6 === t2) break e;
                case 13:
                  if (r2.last) {
                    u2 >>>= 7 & l2, l2 -= 7 & l2, r2.mode = 27;
                    break;
                  }
                  for (; l2 < 3; ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  switch (r2.last = 1 & u2, l2 -= 1, 3 & (u2 >>>= 1)) {
                    case 0:
                      r2.mode = 14;
                      break;
                    case 1:
                      if (j(r2), r2.mode = 20, 6 !== t2) break;
                      u2 >>>= 2, l2 -= 2;
                      break e;
                    case 2:
                      r2.mode = 17;
                      break;
                    case 3:
                      e2.msg = "invalid block type", r2.mode = 30;
                  }
                  u2 >>>= 2, l2 -= 2;
                  break;
                case 14:
                  for (u2 >>>= 7 & l2, l2 -= 7 & l2; l2 < 32; ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  if ((65535 & u2) != (u2 >>> 16 ^ 65535)) {
                    e2.msg = "invalid stored block lengths", r2.mode = 30;
                    break;
                  }
                  if (r2.length = 65535 & u2, l2 = u2 = 0, r2.mode = 15, 6 === t2) break e;
                case 15:
                  r2.mode = 16;
                case 16:
                  if (d = r2.length) {
                    if (o2 < d && (d = o2), h2 < d && (d = h2), 0 === d) break e;
                    I.arraySet(i2, n2, s2, d, a2), o2 -= d, s2 += d, h2 -= d, a2 += d, r2.length -= d;
                    break;
                  }
                  r2.mode = 12;
                  break;
                case 17:
                  for (; l2 < 14; ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  if (r2.nlen = 257 + (31 & u2), u2 >>>= 5, l2 -= 5, r2.ndist = 1 + (31 & u2), u2 >>>= 5, l2 -= 5, r2.ncode = 4 + (15 & u2), u2 >>>= 4, l2 -= 4, 286 < r2.nlen || 30 < r2.ndist) {
                    e2.msg = "too many length or distance symbols", r2.mode = 30;
                    break;
                  }
                  r2.have = 0, r2.mode = 18;
                case 18:
                  for (; r2.have < r2.ncode; ) {
                    for (; l2 < 3; ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    r2.lens[A[r2.have++]] = 7 & u2, u2 >>>= 3, l2 -= 3;
                  }
                  for (; r2.have < 19; ) r2.lens[A[r2.have++]] = 0;
                  if (r2.lencode = r2.lendyn, r2.lenbits = 7, S = { bits: r2.lenbits }, x = T(0, r2.lens, 0, 19, r2.lencode, 0, r2.work, S), r2.lenbits = S.bits, x) {
                    e2.msg = "invalid code lengths set", r2.mode = 30;
                    break;
                  }
                  r2.have = 0, r2.mode = 19;
                case 19:
                  for (; r2.have < r2.nlen + r2.ndist; ) {
                    for (; g = (C = r2.lencode[u2 & (1 << r2.lenbits) - 1]) >>> 16 & 255, b = 65535 & C, !((_ = C >>> 24) <= l2); ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    if (b < 16) u2 >>>= _, l2 -= _, r2.lens[r2.have++] = b;
                    else {
                      if (16 === b) {
                        for (z = _ + 2; l2 < z; ) {
                          if (0 === o2) break e;
                          o2--, u2 += n2[s2++] << l2, l2 += 8;
                        }
                        if (u2 >>>= _, l2 -= _, 0 === r2.have) {
                          e2.msg = "invalid bit length repeat", r2.mode = 30;
                          break;
                        }
                        k = r2.lens[r2.have - 1], d = 3 + (3 & u2), u2 >>>= 2, l2 -= 2;
                      } else if (17 === b) {
                        for (z = _ + 3; l2 < z; ) {
                          if (0 === o2) break e;
                          o2--, u2 += n2[s2++] << l2, l2 += 8;
                        }
                        l2 -= _, k = 0, d = 3 + (7 & (u2 >>>= _)), u2 >>>= 3, l2 -= 3;
                      } else {
                        for (z = _ + 7; l2 < z; ) {
                          if (0 === o2) break e;
                          o2--, u2 += n2[s2++] << l2, l2 += 8;
                        }
                        l2 -= _, k = 0, d = 11 + (127 & (u2 >>>= _)), u2 >>>= 7, l2 -= 7;
                      }
                      if (r2.have + d > r2.nlen + r2.ndist) {
                        e2.msg = "invalid bit length repeat", r2.mode = 30;
                        break;
                      }
                      for (; d--; ) r2.lens[r2.have++] = k;
                    }
                  }
                  if (30 === r2.mode) break;
                  if (0 === r2.lens[256]) {
                    e2.msg = "invalid code -- missing end-of-block", r2.mode = 30;
                    break;
                  }
                  if (r2.lenbits = 9, S = { bits: r2.lenbits }, x = T(D, r2.lens, 0, r2.nlen, r2.lencode, 0, r2.work, S), r2.lenbits = S.bits, x) {
                    e2.msg = "invalid literal/lengths set", r2.mode = 30;
                    break;
                  }
                  if (r2.distbits = 6, r2.distcode = r2.distdyn, S = { bits: r2.distbits }, x = T(F, r2.lens, r2.nlen, r2.ndist, r2.distcode, 0, r2.work, S), r2.distbits = S.bits, x) {
                    e2.msg = "invalid distances set", r2.mode = 30;
                    break;
                  }
                  if (r2.mode = 20, 6 === t2) break e;
                case 20:
                  r2.mode = 21;
                case 21:
                  if (6 <= o2 && 258 <= h2) {
                    e2.next_out = a2, e2.avail_out = h2, e2.next_in = s2, e2.avail_in = o2, r2.hold = u2, r2.bits = l2, R(e2, c2), a2 = e2.next_out, i2 = e2.output, h2 = e2.avail_out, s2 = e2.next_in, n2 = e2.input, o2 = e2.avail_in, u2 = r2.hold, l2 = r2.bits, 12 === r2.mode && (r2.back = -1);
                    break;
                  }
                  for (r2.back = 0; g = (C = r2.lencode[u2 & (1 << r2.lenbits) - 1]) >>> 16 & 255, b = 65535 & C, !((_ = C >>> 24) <= l2); ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  if (g && 0 == (240 & g)) {
                    for (v = _, y = g, w = b; g = (C = r2.lencode[w + ((u2 & (1 << v + y) - 1) >> v)]) >>> 16 & 255, b = 65535 & C, !(v + (_ = C >>> 24) <= l2); ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    u2 >>>= v, l2 -= v, r2.back += v;
                  }
                  if (u2 >>>= _, l2 -= _, r2.back += _, r2.length = b, 0 === g) {
                    r2.mode = 26;
                    break;
                  }
                  if (32 & g) {
                    r2.back = -1, r2.mode = 12;
                    break;
                  }
                  if (64 & g) {
                    e2.msg = "invalid literal/length code", r2.mode = 30;
                    break;
                  }
                  r2.extra = 15 & g, r2.mode = 22;
                case 22:
                  if (r2.extra) {
                    for (z = r2.extra; l2 < z; ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    r2.length += u2 & (1 << r2.extra) - 1, u2 >>>= r2.extra, l2 -= r2.extra, r2.back += r2.extra;
                  }
                  r2.was = r2.length, r2.mode = 23;
                case 23:
                  for (; g = (C = r2.distcode[u2 & (1 << r2.distbits) - 1]) >>> 16 & 255, b = 65535 & C, !((_ = C >>> 24) <= l2); ) {
                    if (0 === o2) break e;
                    o2--, u2 += n2[s2++] << l2, l2 += 8;
                  }
                  if (0 == (240 & g)) {
                    for (v = _, y = g, w = b; g = (C = r2.distcode[w + ((u2 & (1 << v + y) - 1) >> v)]) >>> 16 & 255, b = 65535 & C, !(v + (_ = C >>> 24) <= l2); ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    u2 >>>= v, l2 -= v, r2.back += v;
                  }
                  if (u2 >>>= _, l2 -= _, r2.back += _, 64 & g) {
                    e2.msg = "invalid distance code", r2.mode = 30;
                    break;
                  }
                  r2.offset = b, r2.extra = 15 & g, r2.mode = 24;
                case 24:
                  if (r2.extra) {
                    for (z = r2.extra; l2 < z; ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    r2.offset += u2 & (1 << r2.extra) - 1, u2 >>>= r2.extra, l2 -= r2.extra, r2.back += r2.extra;
                  }
                  if (r2.offset > r2.dmax) {
                    e2.msg = "invalid distance too far back", r2.mode = 30;
                    break;
                  }
                  r2.mode = 25;
                case 25:
                  if (0 === h2) break e;
                  if (d = c2 - h2, r2.offset > d) {
                    if ((d = r2.offset - d) > r2.whave && r2.sane) {
                      e2.msg = "invalid distance too far back", r2.mode = 30;
                      break;
                    }
                    p = d > r2.wnext ? (d -= r2.wnext, r2.wsize - d) : r2.wnext - d, d > r2.length && (d = r2.length), m = r2.window;
                  } else m = i2, p = a2 - r2.offset, d = r2.length;
                  for (h2 < d && (d = h2), h2 -= d, r2.length -= d; i2[a2++] = m[p++], --d; ) ;
                  0 === r2.length && (r2.mode = 21);
                  break;
                case 26:
                  if (0 === h2) break e;
                  i2[a2++] = r2.length, h2--, r2.mode = 21;
                  break;
                case 27:
                  if (r2.wrap) {
                    for (; l2 < 32; ) {
                      if (0 === o2) break e;
                      o2--, u2 |= n2[s2++] << l2, l2 += 8;
                    }
                    if (c2 -= h2, e2.total_out += c2, r2.total += c2, c2 && (e2.adler = r2.check = r2.flags ? B(r2.check, i2, c2, a2 - c2) : O(r2.check, i2, c2, a2 - c2)), c2 = h2, (r2.flags ? u2 : L(u2)) !== r2.check) {
                      e2.msg = "incorrect data check", r2.mode = 30;
                      break;
                    }
                    l2 = u2 = 0;
                  }
                  r2.mode = 28;
                case 28:
                  if (r2.wrap && r2.flags) {
                    for (; l2 < 32; ) {
                      if (0 === o2) break e;
                      o2--, u2 += n2[s2++] << l2, l2 += 8;
                    }
                    if (u2 !== (4294967295 & r2.total)) {
                      e2.msg = "incorrect length check", r2.mode = 30;
                      break;
                    }
                    l2 = u2 = 0;
                  }
                  r2.mode = 29;
                case 29:
                  x = 1;
                  break e;
                case 30:
                  x = -3;
                  break e;
                case 31:
                  return -4;
                case 32:
                default:
                  return U;
              }
              return e2.next_out = a2, e2.avail_out = h2, e2.next_in = s2, e2.avail_in = o2, r2.hold = u2, r2.bits = l2, (r2.wsize || c2 !== e2.avail_out && r2.mode < 30 && (r2.mode < 27 || 4 !== t2)) && Z(e2, e2.output, e2.next_out, c2 - e2.avail_out) ? (r2.mode = 31, -4) : (f2 -= e2.avail_in, c2 -= e2.avail_out, e2.total_in += f2, e2.total_out += c2, r2.total += c2, r2.wrap && c2 && (e2.adler = r2.check = r2.flags ? B(r2.check, i2, c2, e2.next_out - c2) : O(r2.check, i2, c2, e2.next_out - c2)), e2.data_type = r2.bits + (r2.last ? 64 : 0) + (12 === r2.mode ? 128 : 0) + (20 === r2.mode || 15 === r2.mode ? 256 : 0), (0 == f2 && 0 === c2 || 4 === t2) && x === N && (x = -5), x);
            }, r.inflateEnd = function(e2) {
              if (!e2 || !e2.state) return U;
              var t2 = e2.state;
              return t2.window && (t2.window = null), e2.state = null, N;
            }, r.inflateGetHeader = function(e2, t2) {
              var r2;
              return e2 && e2.state ? 0 == (2 & (r2 = e2.state).wrap) ? U : ((r2.head = t2).done = false, N) : U;
            }, r.inflateSetDictionary = function(e2, t2) {
              var r2, n2 = t2.length;
              return e2 && e2.state ? 0 !== (r2 = e2.state).wrap && 11 !== r2.mode ? U : 11 === r2.mode && O(1, t2, n2, 0) !== r2.check ? -3 : Z(e2, t2, n2, n2) ? (r2.mode = 31, -4) : (r2.havedict = 1, N) : U;
            }, r.inflateInfo = "pako inflate (from Nodeca project)";
          }, { "../utils/common": 41, "./adler32": 43, "./crc32": 45, "./inffast": 48, "./inftrees": 50 }], 50: [function(e, t, r) {
            var D = e("../utils/common"), F = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0], N = [16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78], U = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0], P = [16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64];
            t.exports = function(e2, t2, r2, n, i, s, a, o) {
              var h, u, l, f, c, d, p, m, _, g = o.bits, b = 0, v = 0, y = 0, w = 0, k = 0, x = 0, S = 0, z = 0, C = 0, E = 0, A = null, I = 0, O = new D.Buf16(16), B = new D.Buf16(16), R = null, T = 0;
              for (b = 0; b <= 15; b++) O[b] = 0;
              for (v = 0; v < n; v++) O[t2[r2 + v]]++;
              for (k = g, w = 15; 1 <= w && 0 === O[w]; w--) ;
              if (w < k && (k = w), 0 === w) return i[s++] = 20971520, i[s++] = 20971520, o.bits = 1, 0;
              for (y = 1; y < w && 0 === O[y]; y++) ;
              for (k < y && (k = y), b = z = 1; b <= 15; b++) if (z <<= 1, (z -= O[b]) < 0) return -1;
              if (0 < z && (0 === e2 || 1 !== w)) return -1;
              for (B[1] = 0, b = 1; b < 15; b++) B[b + 1] = B[b] + O[b];
              for (v = 0; v < n; v++) 0 !== t2[r2 + v] && (a[B[t2[r2 + v]]++] = v);
              if (d = 0 === e2 ? (A = R = a, 19) : 1 === e2 ? (A = F, I -= 257, R = N, T -= 257, 256) : (A = U, R = P, -1), b = y, c = s, S = v = E = 0, l = -1, f = (C = 1 << (x = k)) - 1, 1 === e2 && 852 < C || 2 === e2 && 592 < C) return 1;
              for (; ; ) {
                for (p = b - S, _ = a[v] < d ? (m = 0, a[v]) : a[v] > d ? (m = R[T + a[v]], A[I + a[v]]) : (m = 96, 0), h = 1 << b - S, y = u = 1 << x; i[c + (E >> S) + (u -= h)] = p << 24 | m << 16 | _ | 0, 0 !== u; ) ;
                for (h = 1 << b - 1; E & h; ) h >>= 1;
                if (0 !== h ? (E &= h - 1, E += h) : E = 0, v++, 0 == --O[b]) {
                  if (b === w) break;
                  b = t2[r2 + a[v]];
                }
                if (k < b && (E & f) !== l) {
                  for (0 === S && (S = k), c += y, z = 1 << (x = b - S); x + S < w && !((z -= O[x + S]) <= 0); ) x++, z <<= 1;
                  if (C += 1 << x, 1 === e2 && 852 < C || 2 === e2 && 592 < C) return 1;
                  i[l = E & f] = k << 24 | x << 16 | c - s | 0;
                }
              }
              return 0 !== E && (i[c + E] = b - S << 24 | 64 << 16 | 0), o.bits = k, 0;
            };
          }, { "../utils/common": 41 }], 51: [function(e, t, r) {
            t.exports = { 2: "need dictionary", 1: "stream end", 0: "", "-1": "file error", "-2": "stream error", "-3": "data error", "-4": "insufficient memory", "-5": "buffer error", "-6": "incompatible version" };
          }, {}], 52: [function(e, t, r) {
            var i = e("../utils/common"), o = 0, h = 1;
            function n(e2) {
              for (var t2 = e2.length; 0 <= --t2; ) e2[t2] = 0;
            }
            var s = 0, a = 29, u = 256, l = u + 1 + a, f = 30, c = 19, _ = 2 * l + 1, g = 15, d = 16, p = 7, m = 256, b = 16, v = 17, y = 18, w = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0], k = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13], x = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7], S = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], z = new Array(2 * (l + 2));
            n(z);
            var C = new Array(2 * f);
            n(C);
            var E = new Array(512);
            n(E);
            var A = new Array(256);
            n(A);
            var I = new Array(a);
            n(I);
            var O, B, R, T = new Array(f);
            function D(e2, t2, r2, n2, i2) {
              this.static_tree = e2, this.extra_bits = t2, this.extra_base = r2, this.elems = n2, this.max_length = i2, this.has_stree = e2 && e2.length;
            }
            function F(e2, t2) {
              this.dyn_tree = e2, this.max_code = 0, this.stat_desc = t2;
            }
            function N(e2) {
              return e2 < 256 ? E[e2] : E[256 + (e2 >>> 7)];
            }
            function U(e2, t2) {
              e2.pending_buf[e2.pending++] = 255 & t2, e2.pending_buf[e2.pending++] = t2 >>> 8 & 255;
            }
            function P(e2, t2, r2) {
              e2.bi_valid > d - r2 ? (e2.bi_buf |= t2 << e2.bi_valid & 65535, U(e2, e2.bi_buf), e2.bi_buf = t2 >> d - e2.bi_valid, e2.bi_valid += r2 - d) : (e2.bi_buf |= t2 << e2.bi_valid & 65535, e2.bi_valid += r2);
            }
            function L(e2, t2, r2) {
              P(e2, r2[2 * t2], r2[2 * t2 + 1]);
            }
            function j(e2, t2) {
              for (var r2 = 0; r2 |= 1 & e2, e2 >>>= 1, r2 <<= 1, 0 < --t2; ) ;
              return r2 >>> 1;
            }
            function Z(e2, t2, r2) {
              var n2, i2, s2 = new Array(g + 1), a2 = 0;
              for (n2 = 1; n2 <= g; n2++) s2[n2] = a2 = a2 + r2[n2 - 1] << 1;
              for (i2 = 0; i2 <= t2; i2++) {
                var o2 = e2[2 * i2 + 1];
                0 !== o2 && (e2[2 * i2] = j(s2[o2]++, o2));
              }
            }
            function W(e2) {
              var t2;
              for (t2 = 0; t2 < l; t2++) e2.dyn_ltree[2 * t2] = 0;
              for (t2 = 0; t2 < f; t2++) e2.dyn_dtree[2 * t2] = 0;
              for (t2 = 0; t2 < c; t2++) e2.bl_tree[2 * t2] = 0;
              e2.dyn_ltree[2 * m] = 1, e2.opt_len = e2.static_len = 0, e2.last_lit = e2.matches = 0;
            }
            function M(e2) {
              8 < e2.bi_valid ? U(e2, e2.bi_buf) : 0 < e2.bi_valid && (e2.pending_buf[e2.pending++] = e2.bi_buf), e2.bi_buf = 0, e2.bi_valid = 0;
            }
            function H(e2, t2, r2, n2) {
              var i2 = 2 * t2, s2 = 2 * r2;
              return e2[i2] < e2[s2] || e2[i2] === e2[s2] && n2[t2] <= n2[r2];
            }
            function G(e2, t2, r2) {
              for (var n2 = e2.heap[r2], i2 = r2 << 1; i2 <= e2.heap_len && (i2 < e2.heap_len && H(t2, e2.heap[i2 + 1], e2.heap[i2], e2.depth) && i2++, !H(t2, n2, e2.heap[i2], e2.depth)); ) e2.heap[r2] = e2.heap[i2], r2 = i2, i2 <<= 1;
              e2.heap[r2] = n2;
            }
            function K(e2, t2, r2) {
              var n2, i2, s2, a2, o2 = 0;
              if (0 !== e2.last_lit) for (; n2 = e2.pending_buf[e2.d_buf + 2 * o2] << 8 | e2.pending_buf[e2.d_buf + 2 * o2 + 1], i2 = e2.pending_buf[e2.l_buf + o2], o2++, 0 === n2 ? L(e2, i2, t2) : (L(e2, (s2 = A[i2]) + u + 1, t2), 0 !== (a2 = w[s2]) && P(e2, i2 -= I[s2], a2), L(e2, s2 = N(--n2), r2), 0 !== (a2 = k[s2]) && P(e2, n2 -= T[s2], a2)), o2 < e2.last_lit; ) ;
              L(e2, m, t2);
            }
            function Y(e2, t2) {
              var r2, n2, i2, s2 = t2.dyn_tree, a2 = t2.stat_desc.static_tree, o2 = t2.stat_desc.has_stree, h2 = t2.stat_desc.elems, u2 = -1;
              for (e2.heap_len = 0, e2.heap_max = _, r2 = 0; r2 < h2; r2++) 0 !== s2[2 * r2] ? (e2.heap[++e2.heap_len] = u2 = r2, e2.depth[r2] = 0) : s2[2 * r2 + 1] = 0;
              for (; e2.heap_len < 2; ) s2[2 * (i2 = e2.heap[++e2.heap_len] = u2 < 2 ? ++u2 : 0)] = 1, e2.depth[i2] = 0, e2.opt_len--, o2 && (e2.static_len -= a2[2 * i2 + 1]);
              for (t2.max_code = u2, r2 = e2.heap_len >> 1; 1 <= r2; r2--) G(e2, s2, r2);
              for (i2 = h2; r2 = e2.heap[1], e2.heap[1] = e2.heap[e2.heap_len--], G(e2, s2, 1), n2 = e2.heap[1], e2.heap[--e2.heap_max] = r2, e2.heap[--e2.heap_max] = n2, s2[2 * i2] = s2[2 * r2] + s2[2 * n2], e2.depth[i2] = (e2.depth[r2] >= e2.depth[n2] ? e2.depth[r2] : e2.depth[n2]) + 1, s2[2 * r2 + 1] = s2[2 * n2 + 1] = i2, e2.heap[1] = i2++, G(e2, s2, 1), 2 <= e2.heap_len; ) ;
              e2.heap[--e2.heap_max] = e2.heap[1], (function(e3, t3) {
                var r3, n3, i3, s3, a3, o3, h3 = t3.dyn_tree, u3 = t3.max_code, l2 = t3.stat_desc.static_tree, f2 = t3.stat_desc.has_stree, c2 = t3.stat_desc.extra_bits, d2 = t3.stat_desc.extra_base, p2 = t3.stat_desc.max_length, m2 = 0;
                for (s3 = 0; s3 <= g; s3++) e3.bl_count[s3] = 0;
                for (h3[2 * e3.heap[e3.heap_max] + 1] = 0, r3 = e3.heap_max + 1; r3 < _; r3++) p2 < (s3 = h3[2 * h3[2 * (n3 = e3.heap[r3]) + 1] + 1] + 1) && (s3 = p2, m2++), h3[2 * n3 + 1] = s3, u3 < n3 || (e3.bl_count[s3]++, a3 = 0, d2 <= n3 && (a3 = c2[n3 - d2]), o3 = h3[2 * n3], e3.opt_len += o3 * (s3 + a3), f2 && (e3.static_len += o3 * (l2[2 * n3 + 1] + a3)));
                if (0 !== m2) {
                  do {
                    for (s3 = p2 - 1; 0 === e3.bl_count[s3]; ) s3--;
                    e3.bl_count[s3]--, e3.bl_count[s3 + 1] += 2, e3.bl_count[p2]--, m2 -= 2;
                  } while (0 < m2);
                  for (s3 = p2; 0 !== s3; s3--) for (n3 = e3.bl_count[s3]; 0 !== n3; ) u3 < (i3 = e3.heap[--r3]) || (h3[2 * i3 + 1] !== s3 && (e3.opt_len += (s3 - h3[2 * i3 + 1]) * h3[2 * i3], h3[2 * i3 + 1] = s3), n3--);
                }
              })(e2, t2), Z(s2, u2, e2.bl_count);
            }
            function X(e2, t2, r2) {
              var n2, i2, s2 = -1, a2 = t2[1], o2 = 0, h2 = 7, u2 = 4;
              for (0 === a2 && (h2 = 138, u2 = 3), t2[2 * (r2 + 1) + 1] = 65535, n2 = 0; n2 <= r2; n2++) i2 = a2, a2 = t2[2 * (n2 + 1) + 1], ++o2 < h2 && i2 === a2 || (o2 < u2 ? e2.bl_tree[2 * i2] += o2 : 0 !== i2 ? (i2 !== s2 && e2.bl_tree[2 * i2]++, e2.bl_tree[2 * b]++) : o2 <= 10 ? e2.bl_tree[2 * v]++ : e2.bl_tree[2 * y]++, s2 = i2, u2 = (o2 = 0) === a2 ? (h2 = 138, 3) : i2 === a2 ? (h2 = 6, 3) : (h2 = 7, 4));
            }
            function V(e2, t2, r2) {
              var n2, i2, s2 = -1, a2 = t2[1], o2 = 0, h2 = 7, u2 = 4;
              for (0 === a2 && (h2 = 138, u2 = 3), n2 = 0; n2 <= r2; n2++) if (i2 = a2, a2 = t2[2 * (n2 + 1) + 1], !(++o2 < h2 && i2 === a2)) {
                if (o2 < u2) for (; L(e2, i2, e2.bl_tree), 0 != --o2; ) ;
                else 0 !== i2 ? (i2 !== s2 && (L(e2, i2, e2.bl_tree), o2--), L(e2, b, e2.bl_tree), P(e2, o2 - 3, 2)) : o2 <= 10 ? (L(e2, v, e2.bl_tree), P(e2, o2 - 3, 3)) : (L(e2, y, e2.bl_tree), P(e2, o2 - 11, 7));
                s2 = i2, u2 = (o2 = 0) === a2 ? (h2 = 138, 3) : i2 === a2 ? (h2 = 6, 3) : (h2 = 7, 4);
              }
            }
            n(T);
            var q = false;
            function J(e2, t2, r2, n2) {
              P(e2, (s << 1) + (n2 ? 1 : 0), 3), (function(e3, t3, r3, n3) {
                M(e3), (U(e3, r3), U(e3, ~r3)), i.arraySet(e3.pending_buf, e3.window, t3, r3, e3.pending), e3.pending += r3;
              })(e2, t2, r2);
            }
            r._tr_init = function(e2) {
              q || ((function() {
                var e3, t2, r2, n2, i2, s2 = new Array(g + 1);
                for (n2 = r2 = 0; n2 < a - 1; n2++) for (I[n2] = r2, e3 = 0; e3 < 1 << w[n2]; e3++) A[r2++] = n2;
                for (A[r2 - 1] = n2, n2 = i2 = 0; n2 < 16; n2++) for (T[n2] = i2, e3 = 0; e3 < 1 << k[n2]; e3++) E[i2++] = n2;
                for (i2 >>= 7; n2 < f; n2++) for (T[n2] = i2 << 7, e3 = 0; e3 < 1 << k[n2] - 7; e3++) E[256 + i2++] = n2;
                for (t2 = 0; t2 <= g; t2++) s2[t2] = 0;
                for (e3 = 0; e3 <= 143; ) z[2 * e3 + 1] = 8, e3++, s2[8]++;
                for (; e3 <= 255; ) z[2 * e3 + 1] = 9, e3++, s2[9]++;
                for (; e3 <= 279; ) z[2 * e3 + 1] = 7, e3++, s2[7]++;
                for (; e3 <= 287; ) z[2 * e3 + 1] = 8, e3++, s2[8]++;
                for (Z(z, l + 1, s2), e3 = 0; e3 < f; e3++) C[2 * e3 + 1] = 5, C[2 * e3] = j(e3, 5);
                O = new D(z, w, u + 1, l, g), B = new D(C, k, 0, f, g), R = new D(new Array(0), x, 0, c, p);
              })(), q = true), e2.l_desc = new F(e2.dyn_ltree, O), e2.d_desc = new F(e2.dyn_dtree, B), e2.bl_desc = new F(e2.bl_tree, R), e2.bi_buf = 0, e2.bi_valid = 0, W(e2);
            }, r._tr_stored_block = J, r._tr_flush_block = function(e2, t2, r2, n2) {
              var i2, s2, a2 = 0;
              0 < e2.level ? (2 === e2.strm.data_type && (e2.strm.data_type = (function(e3) {
                var t3, r3 = 4093624447;
                for (t3 = 0; t3 <= 31; t3++, r3 >>>= 1) if (1 & r3 && 0 !== e3.dyn_ltree[2 * t3]) return o;
                if (0 !== e3.dyn_ltree[18] || 0 !== e3.dyn_ltree[20] || 0 !== e3.dyn_ltree[26]) return h;
                for (t3 = 32; t3 < u; t3++) if (0 !== e3.dyn_ltree[2 * t3]) return h;
                return o;
              })(e2)), Y(e2, e2.l_desc), Y(e2, e2.d_desc), a2 = (function(e3) {
                var t3;
                for (X(e3, e3.dyn_ltree, e3.l_desc.max_code), X(e3, e3.dyn_dtree, e3.d_desc.max_code), Y(e3, e3.bl_desc), t3 = c - 1; 3 <= t3 && 0 === e3.bl_tree[2 * S[t3] + 1]; t3--) ;
                return e3.opt_len += 3 * (t3 + 1) + 5 + 5 + 4, t3;
              })(e2), i2 = e2.opt_len + 3 + 7 >>> 3, (s2 = e2.static_len + 3 + 7 >>> 3) <= i2 && (i2 = s2)) : i2 = s2 = r2 + 5, r2 + 4 <= i2 && -1 !== t2 ? J(e2, t2, r2, n2) : 4 === e2.strategy || s2 === i2 ? (P(e2, 2 + (n2 ? 1 : 0), 3), K(e2, z, C)) : (P(e2, 4 + (n2 ? 1 : 0), 3), (function(e3, t3, r3, n3) {
                var i3;
                for (P(e3, t3 - 257, 5), P(e3, r3 - 1, 5), P(e3, n3 - 4, 4), i3 = 0; i3 < n3; i3++) P(e3, e3.bl_tree[2 * S[i3] + 1], 3);
                V(e3, e3.dyn_ltree, t3 - 1), V(e3, e3.dyn_dtree, r3 - 1);
              })(e2, e2.l_desc.max_code + 1, e2.d_desc.max_code + 1, a2 + 1), K(e2, e2.dyn_ltree, e2.dyn_dtree)), W(e2), n2 && M(e2);
            }, r._tr_tally = function(e2, t2, r2) {
              return e2.pending_buf[e2.d_buf + 2 * e2.last_lit] = t2 >>> 8 & 255, e2.pending_buf[e2.d_buf + 2 * e2.last_lit + 1] = 255 & t2, e2.pending_buf[e2.l_buf + e2.last_lit] = 255 & r2, e2.last_lit++, 0 === t2 ? e2.dyn_ltree[2 * r2]++ : (e2.matches++, t2--, e2.dyn_ltree[2 * (A[r2] + u + 1)]++, e2.dyn_dtree[2 * N(t2)]++), e2.last_lit === e2.lit_bufsize - 1;
            }, r._tr_align = function(e2) {
              P(e2, 2, 3), L(e2, m, z), (function(e3) {
                16 === e3.bi_valid ? (U(e3, e3.bi_buf), e3.bi_buf = 0, e3.bi_valid = 0) : 8 <= e3.bi_valid && (e3.pending_buf[e3.pending++] = 255 & e3.bi_buf, e3.bi_buf >>= 8, e3.bi_valid -= 8);
              })(e2);
            };
          }, { "../utils/common": 41 }], 53: [function(e, t, r) {
            t.exports = function() {
              this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
            };
          }, {}], 54: [function(e, t, r) {
            (function(e2) {
              !(function(r2, n) {
                if (!r2.setImmediate) {
                  var i, s, t2, a, o = 1, h = {}, u = false, l = r2.document, e3 = Object.getPrototypeOf && Object.getPrototypeOf(r2);
                  e3 = e3 && e3.setTimeout ? e3 : r2, i = "[object process]" === {}.toString.call(r2.process) ? function(e4) {
                    process.nextTick(function() {
                      c(e4);
                    });
                  } : (function() {
                    if (r2.postMessage && !r2.importScripts) {
                      var e4 = true, t3 = r2.onmessage;
                      return r2.onmessage = function() {
                        e4 = false;
                      }, r2.postMessage("", "*"), r2.onmessage = t3, e4;
                    }
                  })() ? (a = "setImmediate$" + Math.random() + "$", r2.addEventListener ? r2.addEventListener("message", d, false) : r2.attachEvent("onmessage", d), function(e4) {
                    r2.postMessage(a + e4, "*");
                  }) : r2.MessageChannel ? ((t2 = new MessageChannel()).port1.onmessage = function(e4) {
                    c(e4.data);
                  }, function(e4) {
                    t2.port2.postMessage(e4);
                  }) : l && "onreadystatechange" in l.createElement("script") ? (s = l.documentElement, function(e4) {
                    var t3 = l.createElement("script");
                    t3.onreadystatechange = function() {
                      c(e4), t3.onreadystatechange = null, s.removeChild(t3), t3 = null;
                    }, s.appendChild(t3);
                  }) : function(e4) {
                    setTimeout(c, 0, e4);
                  }, e3.setImmediate = function(e4) {
                    "function" != typeof e4 && (e4 = new Function("" + e4));
                    for (var t3 = new Array(arguments.length - 1), r3 = 0; r3 < t3.length; r3++) t3[r3] = arguments[r3 + 1];
                    var n2 = { callback: e4, args: t3 };
                    return h[o] = n2, i(o), o++;
                  }, e3.clearImmediate = f;
                }
                function f(e4) {
                  delete h[e4];
                }
                function c(e4) {
                  if (u) setTimeout(c, 0, e4);
                  else {
                    var t3 = h[e4];
                    if (t3) {
                      u = true;
                      try {
                        !(function(e5) {
                          var t4 = e5.callback, r3 = e5.args;
                          switch (r3.length) {
                            case 0:
                              t4();
                              break;
                            case 1:
                              t4(r3[0]);
                              break;
                            case 2:
                              t4(r3[0], r3[1]);
                              break;
                            case 3:
                              t4(r3[0], r3[1], r3[2]);
                              break;
                            default:
                              t4.apply(n, r3);
                          }
                        })(t3);
                      } finally {
                        f(e4), u = false;
                      }
                    }
                  }
                }
                function d(e4) {
                  e4.source === r2 && "string" == typeof e4.data && 0 === e4.data.indexOf(a) && c(+e4.data.slice(a.length));
                }
              })("undefined" == typeof self ? void 0 === e2 ? this : e2 : self);
            }).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
          }, {}] }, {}, [10])(10);
        });
      }
    });

    // src/docx-preview-worker.ts
    var import_xmldom = __toESM(require_lib());

    // src/utils.ts
    function encloseFontFamily(fontFamily) {
      let value = String(fontFamily ?? "").trim();
      if (value.startsWith("'") && value.endsWith("'") || value.startsWith('"') && value.endsWith('"'))
        value = value.slice(1, -1);
      if (/^(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong)$/i.test(value))
        return value;
      if (/^[^\u0000-\u0020\u007f-\u009f'"\\;:{}()[\]<>/,]+$/u.test(value))
        return value;
      const escaped = value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/[\u0000-\u001f\u007f-\u009f]/g, (character) => character === "\0" ? "\uFFFD" : `\\${character.codePointAt(0).toString(16)} `);
      return `'${escaped}'`;
    }
    function isEastAsianFontFamily(typeface) {
      const font = String(typeface ?? "").normalize("NFKC").toLowerCase();
      return /simsun|nsimsun|宋体|宋體|songti|shusong|书宋|書宋|fangsong|仿宋|mincho|明朝|明體|mingliu|pmingliu|batang|명조|kaiti|楷体|楷體|stkaiti|simhei|黑体|黑體|heiti|dengxian|等线|等線|yahei|fangzheng|方正|fz(?:fs|kt|ht|ss|xbs)|ゴシック|(?:^|\s)(?:ms|yu)\s+p?gothic|meiryo|メイリオ|malgun|맑은/.test(font);
    }
    function eastAsianFontFamilyStack(typeface, script = "") {
      const font = String(typeface ?? "").trim();
      if (!font)
        return [];
      const lower = font.normalize("NFKC").toLowerCase();
      const namedJapaneseFont = /mincho|明朝|ゴシック|(?:^|\s)(?:ms|yu)\s+p?gothic|meiryo|メイリオ/.test(lower);
      const inferredScript = ["Hans", "Hant", "Jpan", "Hang"].includes(script) ? script : namedJapaneseFont ? "Jpan" : script;
      const families = [encloseFontFamily(font)];
      const fangzheng = fangzhengFontFamilyAliases(font);
      const serif = /simsun|nsimsun|宋体|宋體|songti|shusong|书宋|書宋|fangsong|仿宋|fz(?:fs|ss|xbs)|小标宋|小標宋|mincho|明朝|明體|mingliu|pmingliu|batang|명조/.test(lower);
      const kai = /kaiti|楷体|楷體|stkaiti|fzkt|kai/.test(lower);
      const sans = /simhei|黑体|黑體|heiti|fzht|dengxian|等线|等線|yahei|gothic|ゴシック|malgun|맑은/.test(lower);
      if (fangzheng.length)
        families.push(...fangzheng.map(encloseFontFamily));
      if (serif) {
        if (inferredScript == "Hant")
          families.push("'Songti TC'", "'Microsoft JhengHei'", "'Noto Serif CJK TC'", "serif");
        else if (inferredScript == "Jpan")
          families.push("'Yu Mincho'", "'Hiragino Mincho ProN'", "'Noto Serif CJK JP'", "serif");
        else if (inferredScript == "Hang")
          families.push("Batang", "AppleMyungjo", "'Noto Serif CJK KR'", "serif");
        else
          families.push("'Songti SC'", "'Noto Serif CJK SC'", "serif");
      } else if (kai) {
        families.push("'Kaiti SC'", "STKaiti", "'Noto Serif CJK SC'", "serif");
      } else if (sans) {
        if (inferredScript == "Hant")
          families.push("'Microsoft JhengHei'", "'PingFang TC'", "'Noto Sans CJK TC'", "sans-serif");
        else if (inferredScript == "Jpan")
          families.push("'Yu Gothic'", "Meiryo", "'Noto Sans CJK JP'", "sans-serif");
        else if (inferredScript == "Hang")
          families.push("'Malgun Gothic'", "'Apple SD Gothic Neo'", "'Noto Sans CJK KR'", "sans-serif");
        else
          families.push("'Microsoft YaHei'", "'PingFang SC'", "'Noto Sans CJK SC'", "sans-serif");
      } else if (inferredScript == "Hant") {
        families.push("'PingFang TC'", "'Noto Sans CJK TC'", "sans-serif");
      } else if (inferredScript == "Jpan") {
        families.push("'Yu Gothic'", "Meiryo", "'Noto Sans CJK JP'", "sans-serif");
      } else if (inferredScript == "Hang") {
        families.push("'Apple SD Gothic Neo'", "'Noto Sans CJK KR'", "sans-serif");
      } else {
        families.push("'PingFang SC'", "'Noto Sans CJK SC'", "sans-serif");
      }
      return [...new Set(families)];
    }
    function fangzhengFontFamilyAliases(typeface) {
      const value = String(typeface ?? "").normalize("NFKC").toLowerCase().replace(/[\s_-]+/g, "");
      const groups = [
        [/方正仿宋|fangzhengfangsong|fzfangsong|fzfs/, ["\u65B9\u6B63\u4EFF\u5B8B", "\u65B9\u6B63\u4EFF\u5B8B\u7B80\u4F53", "\u65B9\u6B63\u4EFF\u5B8B_GBK", "FZFangSong-Z02", "FZFSK--GBK1-0"]],
        [/方正楷体|fangzhengkai|fzkai|fzkt/, ["\u65B9\u6B63\u6977\u4F53", "\u65B9\u6B63\u6977\u4F53\u7B80\u4F53", "\u65B9\u6B63\u6977\u4F53_GBK", "FZKai-Z03", "FZKTK--GBK1-0"]],
        [/方正黑体|fangzhenghei|fzhei|fzht/, ["\u65B9\u6B63\u9ED1\u4F53", "\u65B9\u6B63\u9ED1\u4F53\u7B80\u4F53", "FZHei-B01", "FZHTK--GBK1-0"]],
        [/方正书宋|fangzhengshusong|fzshusong|fzss/, ["\u65B9\u6B63\u4E66\u5B8B", "\u65B9\u6B63\u4E66\u5B8B\u7B80\u4F53", "FZShuSong-Z01", "FZSSK--GBK1-0"]],
        [/方正小标宋|fangzhengxiaobiaosong|fzxiaobiaosong|fzxbs/, ["\u65B9\u6B63\u5C0F\u6807\u5B8B\u7B80\u4F53", "\u65B9\u6B63\u5C0F\u6807\u5B8B", "FZXiaoBiaoSong-B05", "FZXBSJW--GB1-0"]]
      ];
      return groups.find(([pattern]) => pattern.test(value))?.[1] ?? [];
    }
    function splitPath(path) {
      let si = path.lastIndexOf("/") + 1;
      let folder = si == 0 ? "" : path.substring(0, si);
      let fileName = si == 0 ? path : path.substring(si);
      return [folder, fileName];
    }
    function resolvePath(path, base) {
      try {
        const prefix = "http://docx/";
        const url = new URL(path, prefix + base).toString();
        return url.substring(prefix.length);
      } catch {
        return `${base}${path}`;
      }
    }
    function keyBy(array, by) {
      return array.reduce((a, x) => {
        a[by(x)] = x;
        return a;
      }, {});
    }
    function blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject();
        reader.readAsDataURL(blob);
      });
    }
    function parseCssRules(text) {
      const result = {};
      for (const rule of (text ?? "").split(";")) {
        const index = rule.indexOf(":");
        if (index <= 0)
          continue;
        const key = rule.substring(0, index).trim();
        const val = rule.substring(index + 1).trim();
        if (key)
          result[key] = val;
      }
      return result;
    }
    function clamp(val, min, max) {
      return min > val ? min : max < val ? max : val;
    }

    // src/document/common.ts
    var ns = {
      wordml: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      drawingml: "http://schemas.openxmlformats.org/drawingml/2006/main",
      picture: "http://schemas.openxmlformats.org/drawingml/2006/picture",
      wordprocessingCanvas: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
      wordprocessingGroup: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
      wordprocessingShape: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape"};
    var LengthUsage = {
      Dxa: { mul: 0.05, unit: "pt" },
      //twips
      SignedDxa: { mul: 0.05, unit: "pt" },
      //twips, can be negative
      Emu: { mul: 1 / 12700, unit: "pt" },
      FontSize: { mul: 0.5, unit: "pt" },
      SignedHalfPoint: { mul: 0.5, unit: "pt" },
      Border: { mul: 0.125, unit: "pt", min: 0.25, max: 12 },
      //NOTE: http://officeopenxml.com/WPtextBorders.php
      Point: { mul: 1, unit: "pt" },
      Percent: { mul: 0.02, unit: "%" }};
    function convertLength(val, usage = LengthUsage.Dxa) {
      if (val == null || val === "" || /.+(p[xt]|[%])$/i.test(val)) {
        return val;
      }
      var parsed = parseFloat(val);
      if (Number.isNaN(parsed)) {
        return null;
      }
      var num = parsed * usage.mul;
      if (usage.min != null && usage.max != null)
        num = clamp(num, usage.min, usage.max);
      return `${num.toFixed(2)}${usage.unit}`;
    }
    function convertBoolean(v, defaultValue = false) {
      switch (v) {
        case "1":
          return true;
        case "0":
          return false;
        case "on":
          return true;
        case "off":
          return false;
        case "true":
          return true;
        case "false":
          return false;
        default:
          return defaultValue;
      }
    }
    function parseCommonProperty(elem, props, xml) {
      if (elem.namespaceURI != ns.wordml)
        return false;
      switch (elem.localName) {
        case "color":
          props.color = xml.attr(elem, "val");
          break;
        case "sz":
          props.fontSize = xml.lengthAttr(elem, "val", LengthUsage.FontSize);
          break;
        case "szCs":
          props.complexFontSize = xml.lengthAttr(elem, "val", LengthUsage.FontSize);
          break;
        default:
          return false;
      }
      return true;
    }

    // src/security/trusted-types.ts
    var policyCache = /* @__PURE__ */ new Map();
    var pendingHtml = /* @__PURE__ */ new Map();
    var XML_POLICY_NAME = "file-viewer-docx-xml-parser";
    function trustedHtmlForSink(policyName, value) {
      const factory = globalThis.trustedTypes;
      if (!factory)
        return value;
      let policy = policyCache.get(policyName);
      if (!policy) {
        policy = factory.createPolicy(policyName, {
          createHTML(candidate) {
            if (candidate !== pendingHtml.get(policyName))
              throw new TypeError(`Rejected HTML outside the ${policyName} boundary`);
            return candidate;
          }
        });
        policyCache.set(policyName, policy);
      }
      pendingHtml.set(policyName, value);
      try {
        return policy.createHTML(value);
      } finally {
        pendingHtml.delete(policyName);
      }
    }
    function trustedXmlForParsing(xml) {
      if (typeof document === "undefined")
        return xml;
      return trustedHtmlForSink(XML_POLICY_NAME, xml);
    }

    // src/parser/xml-parser.ts
    var runtime = {
      parse: (source) => new DOMParser().parseFromString(source, "application/xml"),
      serialize: (node) => new XMLSerializer().serializeToString(node)
    };
    function setXmlRuntime(value) {
      runtime = value;
    }
    function parseXmlString(xmlString, trimXmlDeclaration = false) {
      if (trimXmlDeclaration)
        xmlString = xmlString.replace(/<[?].*[?]>/, "");
      xmlString = removeUTF8BOM(xmlString);
      const result = runtime.parse(trustedXmlForParsing(xmlString));
      const errorText = hasXmlParserError(result);
      if (errorText)
        throw new Error(errorText);
      return result;
    }
    function hasXmlParserError(doc) {
      return doc.getElementsByTagName("parsererror")[0]?.textContent;
    }
    function removeUTF8BOM(data) {
      return data.charCodeAt(0) === 65279 ? data.substring(1) : data;
    }
    function serializeXmlString(elem) {
      return runtime.serialize(elem);
    }
    var XmlParser = class {
      elements(elem, localName = null) {
        const result = [];
        for (let i = 0, l = elem.childNodes.length; i < l; i++) {
          let c = elem.childNodes.item(i);
          if (c.nodeType == 1 && (localName == null || c.localName == localName))
            result.push(c);
        }
        return result;
      }
      element(elem, localName) {
        for (let i = 0, l = elem.childNodes.length; i < l; i++) {
          let c = elem.childNodes.item(i);
          if (c.nodeType == 1 && c.localName == localName)
            return c;
        }
        return null;
      }
      elementAttr(elem, localName, attrLocalName) {
        var el = this.element(elem, localName);
        return el ? this.attr(el, attrLocalName) : void 0;
      }
      attrs(elem) {
        return Array.from(elem.attributes);
      }
      attr(elem, localName) {
        if (elem?.localName == "blip" && (localName == "embed" || localName == "link")) {
          const preferred = this.descendantAttr(elem, "svgBlip", localName);
          if (preferred != null)
            return preferred;
        }
        if (elem?.localName == "cnfStyle" && localName == "val") {
          const direct = this.rawAttr(elem, localName);
          if (direct != null)
            return direct;
          return this.cnfStyleValue(elem);
        }
        return this.rawAttr(elem, localName);
      }
      rawAttr(elem, localName) {
        for (let i = 0, l = elem.attributes.length; i < l; i++) {
          let a = elem.attributes.item(i);
          if (a.localName == localName)
            return a.value;
        }
        return null;
      }
      descendantAttr(elem, descendantLocalName, attrLocalName) {
        for (const child of this.elements(elem)) {
          if (child.localName == descendantLocalName) {
            const value = this.rawAttr(child, attrLocalName);
            if (value != null)
              return value;
          }
          const nested = this.descendantAttr(child, descendantLocalName, attrLocalName);
          if (nested != null)
            return nested;
        }
        return null;
      }
      cnfStyleValue(elem) {
        const attrs = [
          "firstRow",
          "lastRow",
          "firstColumn",
          "lastColumn",
          "oddVBand",
          "evenVBand",
          "oddHBand",
          "evenHBand",
          "firstRowLastColumn",
          "firstRowFirstColumn",
          "lastRowLastColumn",
          "lastRowFirstColumn"
        ];
        return attrs.map((name) => convertBoolean(this.rawAttr(elem, name), false) ? "1" : "0").join("");
      }
      intAttr(node, attrName, defaultValue = null) {
        var val = this.attr(node, attrName);
        return val != null && val !== "" ? parseInt(val, 10) : defaultValue;
      }
      hexAttr(node, attrName, defaultValue = null) {
        var val = this.attr(node, attrName);
        return val != null && val !== "" ? parseInt(val, 16) : defaultValue;
      }
      floatAttr(node, attrName, defaultValue = null) {
        var val = this.attr(node, attrName);
        return val != null && val !== "" ? parseFloat(val) : defaultValue;
      }
      boolAttr(node, attrName, defaultValue = null) {
        return convertBoolean(this.attr(node, attrName), defaultValue);
      }
      lengthAttr(node, attrName, usage = LengthUsage.Dxa) {
        return convertLength(this.attr(node, attrName), usage);
      }
    };
    var globalXmlParser = new XmlParser();
    var xml_parser_default = globalXmlParser;

    // src/common/relationship.ts
    var unsafeExternalResourceCharacters = /[\u0000-\u001f\u007f]/;
    var localDataImage = /^data:image\/[a-z0-9.+-]+(?:;[^,]*)?,/i;
    function isExternalRelationship(rel) {
      return rel?.targetMode?.trim().toLowerCase() === "external";
    }
    function resolveExternalResourceTarget(rel, policy = "block") {
      if (!isExternalRelationship(rel))
        return null;
      const target = `${rel?.target ?? ""}`.trim();
      if (!target || unsafeExternalResourceCharacters.test(target))
        return null;
      let url;
      try {
        url = new URL(target);
      } catch {
        return null;
      }
      switch (url.protocol.toLowerCase()) {
        case "data:":
          return localDataImage.test(target) ? target : null;
        case "blob:":
          return target;
        case "http:":
        case "https:":
          return policy === "allow" ? url.href : null;
        default:
          return null;
      }
    }
    function parseRelationships(root, xml) {
      return xml.elements(root).map((e) => ({
        id: xml.attr(e, "Id"),
        type: xml.attr(e, "Type"),
        target: xml.attr(e, "Target"),
        targetMode: xml.attr(e, "TargetMode")
      }));
    }

    // src/common/part.ts
    var Part = class {
      constructor(_package, path) {
        this._package = _package;
        this.path = path;
      }
      async load() {
        this.rels = await this._package.loadRelationships(this.path);
        const xmlText = await this._package.load(this.path);
        const xmlDoc = this._package.parseXmlDocument(xmlText);
        if (this._package.options.keepOrigin) {
          this._xmlDocument = xmlDoc;
        }
        this.parseXml(xmlDoc.firstElementChild ?? xmlDoc.documentElement);
      }
      save() {
        this._package.update(this.path, serializeXmlString(this._xmlDocument));
      }
      parseXml(root) {
      }
    };

    // src/font-table/fonts.ts
    var embedFontTypeMap = {
      embedRegular: "regular",
      embedBold: "bold",
      embedItalic: "italic",
      embedBoldItalic: "boldItalic"
    };
    function parseFonts(root, xml) {
      return xml.elements(root).map((el) => parseFont(el, xml));
    }
    function parseFont(elem, xml) {
      let result = {
        name: xml.attr(elem, "name"),
        embedFontRefs: []
      };
      for (let el of xml.elements(elem)) {
        switch (el.localName) {
          case "family":
            result.family = xml.attr(el, "val");
            break;
          case "altName":
            result.altName = xml.attr(el, "val");
            break;
          case "embedRegular":
          case "embedBold":
          case "embedItalic":
          case "embedBoldItalic":
            result.embedFontRefs.push(parseEmbedFontRef(el, xml));
            break;
        }
      }
      return result;
    }
    function parseEmbedFontRef(elem, xml) {
      return {
        id: xml.attr(elem, "id"),
        key: xml.attr(elem, "fontKey"),
        type: embedFontTypeMap[elem.localName]
      };
    }

    // src/font-table/font-table.ts
    var FontTablePart = class extends Part {
      parseXml(root) {
        this.fonts = parseFonts(root, this._package.xmlParser);
      }
    };

    // src/common/open-xml-package.ts
    var import_jszip = __toESM(require_jszip_min());

    // src/common/content-types.ts
    function parseContentTypes(root, xml) {
      return xml.elements(root).map((e) => ({
        extension: xml.attr(e, "Extension"),
        partName: xml.attr(e, "PartName"),
        contentType: xml.attr(e, "ContentType")
      }));
    }

    // src/common/open-xml-package.ts
    var OpenXmlPackage = class _OpenXmlPackage {
      constructor(_zip, options) {
        this._zip = _zip;
        this.options = options;
        this.xmlParser = new XmlParser();
      }
      get(path) {
        const p = normalizePath(path);
        return this._zip.files[p] ?? this._zip.files[p.replace(/\//g, "\\")];
      }
      update(path, content) {
        this._zip.file(path, content);
      }
      static async load(input, options) {
        const zip = await (options.zipLoader ? options.zipLoader(input) : import_jszip.default.loadAsync(input));
        return new _OpenXmlPackage(zip, options);
      }
      save(type = "blob") {
        return this._zip.generateAsync({ type });
      }
      load(path, type = "string") {
        return this.get(path)?.async(type) ?? Promise.resolve(null);
      }
      async loadRelationships(path = null) {
        let relsPath = `_rels/.rels`;
        if (path != null) {
          const [f, fn] = splitPath(path);
          relsPath = `${f}_rels/${fn}.rels`;
        }
        const txt = await this.load(relsPath);
        return txt ? parseRelationships(rootElement(this.parseXmlDocument(txt)), this.xmlParser) : null;
      }
      async loadContentTypes() {
        const txt = await this.load("[Content_Types].xml");
        return txt ? parseContentTypes(rootElement(this.parseXmlDocument(txt)), this.xmlParser) : [];
      }
      /** @internal */
      parseXmlDocument(txt) {
        return parseXmlString(txt, this.options.trimXmlDeclaration);
      }
    };
    function rootElement(doc) {
      return doc.firstElementChild ?? doc.documentElement;
    }
    function normalizePath(path) {
      return path.startsWith("/") ? path.substr(1) : path;
    }

    // src/document/document-part.ts
    var DocumentPart = class extends Part {
      constructor(pkg, path, parser) {
        super(pkg, path);
        this._documentParser = parser;
      }
      parseXml(root) {
        this.body = this._documentParser.parseDocumentFile(root);
      }
    };

    // src/document/border.ts
    function parseBorder(elem, xml) {
      return {
        type: xml.attr(elem, "val"),
        color: xml.attr(elem, "color"),
        size: xml.lengthAttr(elem, "sz", LengthUsage.Border),
        offset: xml.lengthAttr(elem, "space", LengthUsage.Point),
        frame: xml.boolAttr(elem, "frame"),
        shadow: xml.boolAttr(elem, "shadow")
      };
    }
    function parseBorders(elem, xml) {
      var result = {};
      for (let e of xml.elements(elem)) {
        switch (e.localName) {
          case "left":
            result.left = parseBorder(e, xml);
            break;
          case "top":
            result.top = parseBorder(e, xml);
            break;
          case "right":
            result.right = parseBorder(e, xml);
            break;
          case "bottom":
            result.bottom = parseBorder(e, xml);
            break;
        }
      }
      return result;
    }

    // src/notes/properties.ts
    function parseNoteProperties(element, xml) {
      const result = { defaultNoteIds: [] };
      for (const child of xml.elements(element)) {
        switch (child.localName) {
          case "numFmt":
            result.numberingFormat = result.nummeringFormat = xml.attr(child, "val");
            break;
          case "numStart":
            const start = xml.intAttr(child, "val", null);
            if (Number.isSafeInteger(start) && start >= 0) result.start = start;
            break;
          case "numRestart":
            const restart = xml.attr(child, "val");
            if (["continuous", "eachSect", "eachPage"].includes(restart)) result.restart = restart;
            break;
          case "footnote":
          case "endnote":
            result.defaultNoteIds.push(xml.attr(child, "id"));
            break;
        }
      }
      return result;
    }

    // src/document/section.ts
    var defaultPageLayoutTwips = {
      width: "11906",
      height: "16838",
      marginTop: "1440",
      marginRight: "1440",
      marginBottom: "1440",
      marginLeft: "1440",
      header: "720",
      footer: "720",
      gutter: "0"
    };
    function defaultPageSize(orientation = null) {
      const landscape = orientation === "landscape";
      return {
        width: convertLength(landscape ? defaultPageLayoutTwips.height : defaultPageLayoutTwips.width),
        height: convertLength(landscape ? defaultPageLayoutTwips.width : defaultPageLayoutTwips.height),
        orientation
      };
    }
    function defaultPageMargins() {
      return {
        top: convertLength(defaultPageLayoutTwips.marginTop),
        right: convertLength(defaultPageLayoutTwips.marginRight),
        bottom: convertLength(defaultPageLayoutTwips.marginBottom),
        left: convertLength(defaultPageLayoutTwips.marginLeft),
        header: convertLength(defaultPageLayoutTwips.header),
        footer: convertLength(defaultPageLayoutTwips.footer),
        gutter: convertLength(defaultPageLayoutTwips.gutter)
      };
    }
    function parseSectionProperties(elem = null, xml = xml_parser_default) {
      const pageSizeElement = elem ? xml.element(elem, "pgSz") : null;
      const orientation = pageSizeElement ? xml.attr(pageSizeElement, "orient") : null;
      const pageSizeDefaults = defaultPageSize(orientation);
      const pageMarginDefaults = defaultPageMargins();
      var section = {
        pageSize: pageSizeDefaults,
        pageMargins: pageMarginDefaults
      };
      if (!elem)
        return section;
      for (let e of xml.elements(elem)) {
        switch (e.localName) {
          case "pgSz":
            section.pageSize = {
              width: xml.lengthAttr(e, "w") ?? pageSizeDefaults.width,
              height: xml.lengthAttr(e, "h") ?? pageSizeDefaults.height,
              orientation
            };
            break;
          case "type":
            section.type = xml.attr(e, "val");
            break;
          case "pgMar":
            section.pageMargins = {
              left: xml.lengthAttr(e, "left") ?? pageMarginDefaults.left,
              right: xml.lengthAttr(e, "right") ?? pageMarginDefaults.right,
              top: xml.lengthAttr(e, "top") ?? pageMarginDefaults.top,
              bottom: xml.lengthAttr(e, "bottom") ?? pageMarginDefaults.bottom,
              header: xml.lengthAttr(e, "header") ?? pageMarginDefaults.header,
              footer: xml.lengthAttr(e, "footer") ?? pageMarginDefaults.footer,
              gutter: xml.lengthAttr(e, "gutter") ?? pageMarginDefaults.gutter
            };
            break;
          case "cols":
            section.columns = parseColumns(e, xml);
            break;
          case "headerReference":
            (section.headerRefs ?? (section.headerRefs = [])).push(parseFooterHeaderReference(e, xml));
            break;
          case "footerReference":
            (section.footerRefs ?? (section.footerRefs = [])).push(parseFooterHeaderReference(e, xml));
            break;
          case "titlePg":
            section.titlePage = xml.boolAttr(e, "val", true);
            break;
          case "pgBorders":
            section.pageBorders = parseBorders(e, xml);
            break;
          case "pgNumType":
            section.pageNumber = parsePageNumber(e, xml);
            break;
          case "footnotePr":
            section.footnoteProps = parseNoteProperties(e, xml);
            break;
          case "endnotePr":
            section.endnoteProps = parseNoteProperties(e, xml);
            break;
          case "docGrid":
            section.docGrid = parseDocumentGrid(e, xml);
            break;
        }
      }
      return section;
    }
    function parseColumns(elem, xml) {
      return {
        numberOfColumns: xml.intAttr(elem, "num"),
        space: xml.lengthAttr(elem, "space"),
        separator: xml.boolAttr(elem, "sep"),
        equalWidth: xml.boolAttr(elem, "equalWidth", true),
        columns: xml.elements(elem, "col").map((e) => ({
          width: xml.lengthAttr(e, "w"),
          space: xml.lengthAttr(e, "space")
        }))
      };
    }
    function parsePageNumber(elem, xml) {
      return {
        chapSep: xml.attr(elem, "chapSep"),
        chapStyle: xml.attr(elem, "chapStyle"),
        format: xml.attr(elem, "fmt"),
        start: xml.intAttr(elem, "start")
      };
    }
    function parseDocumentGrid(elem, xml) {
      const charSpaceRaw = xml.intAttr(elem, "charSpace", null);
      const charSpacePoints = charSpaceRaw == null ? null : charSpaceRaw / 4096;
      return {
        type: xml.attr(elem, "type"),
        linePitch: xml.lengthAttr(elem, "linePitch"),
        charSpace: charSpacePoints == null ? null : `${charSpacePoints.toFixed(4)}pt`,
        charSpaceRaw
      };
    }
    function parseFooterHeaderReference(elem, xml) {
      return {
        id: xml.attr(elem, "id"),
        type: xml.attr(elem, "type")
      };
    }

    // src/document/line-spacing.ts
    function parseLineSpacing(elem, xml) {
      return {
        before: xml.lengthAttr(elem, "before"),
        after: xml.lengthAttr(elem, "after"),
        line: xml.intAttr(elem, "line"),
        lineRule: xml.attr(elem, "lineRule")
      };
    }

    // src/document/run.ts
    function parseRunProperties(elem, xml) {
      let result = {};
      for (let el of xml.elements(elem)) {
        parseRunProperty(el, result, xml);
      }
      return result;
    }
    function parseRunProperty(elem, props, xml) {
      if (parseCommonProperty(elem, props, xml))
        return true;
      return false;
    }

    // src/document/paragraph.ts
    function parseParagraphProperties(elem, xml) {
      let result = {};
      for (let el of xml.elements(elem)) {
        parseParagraphProperty(el, result, xml);
      }
      return result;
    }
    function parseParagraphProperty(elem, props, xml) {
      if (elem.namespaceURI != ns.wordml)
        return false;
      if (parseCommonProperty(elem, props, xml))
        return true;
      switch (elem.localName) {
        case "tabs":
          props.tabs = parseTabs(elem, xml);
          break;
        case "sectPr":
          props.sectionProps = parseSectionProperties(elem, xml);
          break;
        case "numPr":
          props.numbering = parseNumbering(elem, xml);
          break;
        case "spacing":
          props.lineSpacing = parseLineSpacing(elem, xml);
          return false;
        case "textAlignment":
          props.textAlignment = xml.attr(elem, "val");
          return false;
        case "keepLines":
          props.keepLines = xml.boolAttr(elem, "val", true);
          break;
        case "keepNext":
          props.keepNext = xml.boolAttr(elem, "val", true);
          break;
        case "pageBreakBefore":
          props.pageBreakBefore = xml.boolAttr(elem, "val", true);
          break;
        case "widowControl":
          props.widowControl = xml.boolAttr(elem, "val", true);
          break;
        case "outlineLvl":
          props.outlineLevel = xml.intAttr(elem, "val");
          break;
        case "pStyle":
          props.styleName = xml.attr(elem, "val");
          break;
        case "rPr":
          props.runProps = parseRunProperties(elem, xml);
          break;
        default:
          return false;
      }
      return true;
    }
    function parseTabs(elem, xml) {
      return xml.elements(elem, "tab").map((e) => ({
        position: xml.lengthAttr(e, "pos"),
        leader: xml.attr(e, "leader"),
        style: xml.attr(e, "val")
      }));
    }
    function parseNumbering(elem, xml) {
      var result = {};
      for (let e of xml.elements(elem)) {
        switch (e.localName) {
          case "numId":
            result.id = xml.attr(e, "val");
            break;
          case "ilvl":
            result.level = xml.intAttr(e, "val");
            break;
        }
      }
      return result;
    }

    // src/numbering/numbering.ts
    function parseNumberingPart(elem, xml) {
      let result = {
        numberings: [],
        abstractNumberings: [],
        bulletPictures: []
      };
      for (let e of xml.elements(elem)) {
        switch (e.localName) {
          case "num":
            result.numberings.push(parseNumbering2(e, xml));
            break;
          case "abstractNum":
            result.abstractNumberings.push(parseAbstractNumbering(e, xml));
            break;
          case "numPicBullet":
            result.bulletPictures.push(parseNumberingBulletPicture(e, xml));
            break;
        }
      }
      return result;
    }
    function parseNumbering2(elem, xml) {
      let result = {
        id: xml.attr(elem, "numId"),
        overrides: []
      };
      for (let e of xml.elements(elem)) {
        switch (e.localName) {
          case "abstractNumId":
            result.abstractId = xml.attr(e, "val");
            break;
          case "lvlOverride":
            result.overrides.push(parseNumberingLevelOverrride(e, xml));
            break;
        }
      }
      return result;
    }
    function parseAbstractNumbering(elem, xml) {
      let result = {
        id: xml.attr(elem, "abstractNumId"),
        levels: []
      };
      for (let e of xml.elements(elem)) {
        switch (e.localName) {
          case "name":
            result.name = xml.attr(e, "val");
            break;
          case "multiLevelType":
            result.multiLevelType = xml.attr(e, "val");
            break;
          case "numStyleLink":
            result.numberingStyleLink = xml.attr(e, "val");
            break;
          case "styleLink":
            result.styleLink = xml.attr(e, "val");
            break;
          case "lvl":
            result.levels.push(parseNumberingLevel(e, xml));
            break;
        }
      }
      return result;
    }
    function parseNumberingLevel(elem, xml) {
      let result = {
        level: xml.intAttr(elem, "ilvl")
      };
      for (let e of xml.elements(elem)) {
        switch (e.localName) {
          case "start":
            result.start = xml.attr(e, "val");
            break;
          case "lvlRestart":
            result.restart = xml.intAttr(e, "val");
            break;
          case "numFmt":
            result.format = xml.attr(e, "val");
            break;
          case "lvlText":
            result.text = xml.attr(e, "val");
            break;
          case "lvlJc":
            result.justification = xml.attr(e, "val");
            break;
          case "lvlPicBulletId":
            result.bulletPictureId = xml.attr(e, "val");
            break;
          case "pStyle":
            result.paragraphStyle = xml.attr(e, "val");
            break;
          case "pPr":
            result.paragraphProps = parseParagraphProperties(e, xml);
            break;
          case "rPr":
            result.runProps = parseRunProperties(e, xml);
            break;
        }
      }
      return result;
    }
    function parseNumberingLevelOverrride(elem, xml) {
      let result = {
        level: xml.intAttr(elem, "ilvl")
      };
      for (let e of xml.elements(elem)) {
        switch (e.localName) {
          case "startOverride":
            result.start = xml.intAttr(e, "val");
            break;
          case "lvl":
            result.numberingLevel = parseNumberingLevel(e, xml);
            break;
        }
      }
      return result;
    }
    function parseNumberingBulletPicture(elem, xml) {
      var id = xml.attr(elem, "numPicBulletId");
      var pict = xml.element(elem, "pict");
      var shape = pict && xml.element(pict, "shape");
      var imagedata = shape && xml.element(shape, "imagedata");
      if (imagedata) {
        return {
          id,
          referenceId: xml.attr(imagedata, "id"),
          style: xml.attr(shape, "style")
        };
      }
      var drawing = xml.element(elem, "drawing");
      var blip = drawing && findDescendant(drawing, "blip", xml);
      return blip ? {
        id,
        referenceId: xml.attr(blip, "embed") ?? xml.attr(blip, "link"),
        style: null
      } : null;
    }
    function findDescendant(elem, localName, xml) {
      for (const child of xml.elements(elem)) {
        if (child.localName == localName)
          return child;
        const nested = findDescendant(child, localName, xml);
        if (nested)
          return nested;
      }
      return null;
    }

    // src/numbering/numbering-part.ts
    var NumberingPart = class extends Part {
      constructor(pkg, path, parser) {
        super(pkg, path);
        this._documentParser = parser;
      }
      parseXml(root) {
        Object.assign(this, parseNumberingPart(root, this._package.xmlParser));
        this.domNumberings = this._documentParser.parseNumberingFile(root);
      }
    };

    // src/styles/styles-part.ts
    var StylesPart = class extends Part {
      constructor(pkg, path, parser) {
        super(pkg, path);
        this._documentParser = parser;
      }
      parseXml(root) {
        this.styles = this._documentParser.parseStylesFile(root);
      }
    };

    // src/document/dom.ts
    var OpenXmlElementBase = class {
      constructor() {
        this.children = [];
        this.cssStyle = {};
      }
    };

    // src/header-footer/elements.ts
    var WmlHeader = class extends OpenXmlElementBase {
      constructor() {
        super(...arguments);
        this.type = "header" /* Header */;
      }
    };
    var WmlFooter = class extends OpenXmlElementBase {
      constructor() {
        super(...arguments);
        this.type = "footer" /* Footer */;
      }
    };

    // src/header-footer/parts.ts
    var BaseHeaderFooterPart = class extends Part {
      constructor(pkg, path, parser) {
        super(pkg, path);
        this._documentParser = parser;
      }
      parseXml(root) {
        this.rootElement = this.createRootElement();
        this.rootElement.children = this._documentParser.parseBodyElements(root);
      }
    };
    var HeaderPart = class extends BaseHeaderFooterPart {
      createRootElement() {
        return new WmlHeader();
      }
    };
    var FooterPart = class extends BaseHeaderFooterPart {
      createRootElement() {
        return new WmlFooter();
      }
    };

    // src/document-props/extended-props.ts
    function parseExtendedProps(root, xmlParser) {
      const result = {};
      for (let el of xmlParser.elements(root)) {
        switch (el.localName) {
          case "Template":
            result.template = el.textContent;
            break;
          case "Pages":
            result.pages = safeParseToInt(el.textContent);
            break;
          case "Words":
            result.words = safeParseToInt(el.textContent);
            break;
          case "Characters":
            result.characters = safeParseToInt(el.textContent);
            break;
          case "Application":
            result.application = el.textContent;
            break;
          case "Lines":
            result.lines = safeParseToInt(el.textContent);
            break;
          case "Paragraphs":
            result.paragraphs = safeParseToInt(el.textContent);
            break;
          case "Company":
            result.company = el.textContent;
            break;
          case "AppVersion":
            result.appVersion = el.textContent;
            break;
        }
      }
      return result;
    }
    function safeParseToInt(value) {
      if (typeof value === "undefined")
        return;
      return parseInt(value);
    }

    // src/document-props/extended-props-part.ts
    var ExtendedPropsPart = class extends Part {
      parseXml(root) {
        this.props = parseExtendedProps(root, this._package.xmlParser);
      }
    };

    // src/document-props/core-props.ts
    function parseCoreProps(root, xmlParser) {
      const result = {};
      for (let el of xmlParser.elements(root)) {
        switch (el.localName) {
          case "title":
            result.title = el.textContent;
            break;
          case "description":
            result.description = el.textContent;
            break;
          case "subject":
            result.subject = el.textContent;
            break;
          case "creator":
            result.creator = el.textContent;
            break;
          case "keywords":
            result.keywords = el.textContent;
            break;
          case "language":
            result.language = el.textContent;
            break;
          case "lastModifiedBy":
            result.lastModifiedBy = el.textContent;
            break;
          case "revision":
            el.textContent && (result.revision = parseInt(el.textContent));
            break;
        }
      }
      return result;
    }

    // src/document-props/core-props-part.ts
    var CorePropsPart = class extends Part {
      parseXml(root) {
        this.props = parseCoreProps(root, this._package.xmlParser);
      }
    };

    // src/theme/theme.ts
    var DmlTheme = class {
    };
    function themeScriptForLanguage(language) {
      const value = String(language ?? "").trim().replace(/_/g, "-").toLowerCase();
      const primary = value.split("-")[0];
      if (primary == "zh") {
        if (/(?:^|-)hant(?:-|$)|-(?:tw|hk|mo)(?:-|$)/.test(value))
          return "Hant";
        return "Hans";
      }
      const scripts = {
        ja: "Jpan",
        ko: "Hang",
        ar: "Arab",
        fa: "Arab",
        ur: "Arab",
        he: "Hebr",
        yi: "Hebr",
        th: "Thai",
        vi: "Viet",
        hi: "Deva",
        bn: "Beng",
        gu: "Gujr",
        kn: "Knda",
        pa: "Guru",
        ta: "Taml",
        te: "Telu",
        ml: "Mlym",
        or: "Orya",
        si: "Sinh",
        km: "Khmr",
        lo: "Laoo",
        my: "Mymr",
        mn: "Mong"
      };
      return scripts[primary] ?? "";
    }
    function parseTheme(elem, xml) {
      var result = new DmlTheme();
      var themeElements = xml.element(elem, "themeElements");
      for (let el of xml.elements(themeElements)) {
        switch (el.localName) {
          case "clrScheme":
            result.colorScheme = parseColorScheme(el, xml);
            break;
          case "fontScheme":
            result.fontScheme = parseFontScheme(el, xml);
            break;
        }
      }
      return result;
    }
    function parseColorScheme(elem, xml) {
      var result = {
        name: xml.attr(elem, "name"),
        colors: {}
      };
      for (let el of xml.elements(elem)) {
        var srgbClr = xml.element(el, "srgbClr");
        var sysClr = xml.element(el, "sysClr");
        if (srgbClr) {
          result.colors[el.localName] = xml.attr(srgbClr, "val");
        } else if (sysClr) {
          result.colors[el.localName] = xml.attr(sysClr, "lastClr");
        }
      }
      return result;
    }
    function parseFontScheme(elem, xml) {
      var result = {
        name: xml.attr(elem, "name")
      };
      for (let el of xml.elements(elem)) {
        switch (el.localName) {
          case "majorFont":
            result.majorFont = parseFontInfo(el, xml);
            break;
          case "minorFont":
            result.minorFont = parseFontInfo(el, xml);
            break;
        }
      }
      return result;
    }
    function parseFontInfo(elem, xml) {
      const scriptTypefaces = {};
      for (const font of xml.elements(elem).filter((x) => x.localName == "font")) {
        const script = xml.attr(font, "script");
        const typeface = xml.attr(font, "typeface");
        if (script && typeface)
          scriptTypefaces[script] = typeface;
      }
      return {
        latinTypeface: xml.elementAttr(elem, "latin", "typeface"),
        eaTypeface: xml.elementAttr(elem, "ea", "typeface"),
        csTypeface: xml.elementAttr(elem, "cs", "typeface"),
        scriptTypefaces
      };
    }

    // src/theme/theme-part.ts
    var ThemePart = class extends Part {
      constructor(pkg, path) {
        super(pkg, path);
      }
      parseXml(root) {
        this.theme = parseTheme(root, this._package.xmlParser);
      }
    };

    // src/notes/elements.ts
    var WmlBaseNote = class {
    };
    var WmlFootnote = class extends WmlBaseNote {
      constructor() {
        super(...arguments);
        this.type = "footnote" /* Footnote */;
      }
    };
    var WmlEndnote = class extends WmlBaseNote {
      constructor() {
        super(...arguments);
        this.type = "endnote" /* Endnote */;
      }
    };

    // src/notes/parts.ts
    var BaseNotePart = class extends Part {
      constructor(pkg, path, parser) {
        super(pkg, path);
        this._documentParser = parser;
      }
    };
    var FootnotesPart = class extends BaseNotePart {
      constructor(pkg, path, parser) {
        super(pkg, path, parser);
      }
      parseXml(root) {
        this.notes = this._documentParser.parseNotes(root, "footnote", WmlFootnote);
      }
    };
    var EndnotesPart = class extends BaseNotePart {
      constructor(pkg, path, parser) {
        super(pkg, path, parser);
      }
      parseXml(root) {
        this.notes = this._documentParser.parseNotes(root, "endnote", WmlEndnote);
      }
    };

    // src/settings/settings.ts
    function parseSettings(elem, xml) {
      var result = {};
      for (let el of xml.elements(elem)) {
        switch (el.localName) {
          case "defaultTabStop":
            result.defaultTabStop = xml.lengthAttr(el, "val");
            break;
          case "footnotePr":
            result.footnoteProps = parseNoteProperties(el, xml);
            break;
          case "endnotePr":
            result.endnoteProps = parseNoteProperties(el, xml);
            break;
          case "autoHyphenation":
            result.autoHyphenation = xml.boolAttr(el, "val");
            break;
          case "kinsoku":
            result.kinsoku = xml.boolAttr(el, "val", true);
            break;
          case "overflowPunct":
            result.overflowPunctuation = xml.boolAttr(el, "val", true);
            break;
          case "topLinePunct":
            result.topLinePunctuation = xml.boolAttr(el, "val", true);
            break;
          case "autoSpaceDE":
            result.autoSpaceDE = xml.boolAttr(el, "val", true);
            break;
          case "autoSpaceDN":
            result.autoSpaceDN = xml.boolAttr(el, "val", true);
            break;
          case "noLineBreaksAfter":
            result.noLineBreaksAfter = xml.attr(el, "val") || el.textContent || "";
            break;
          case "noLineBreaksBefore":
            result.noLineBreaksBefore = xml.attr(el, "val") || el.textContent || "";
            break;
          case "evenAndOddHeaders":
            result.evenAndOddHeaders = xml.boolAttr(el, "val", true);
            break;
          case "splitPgBreakAndParaMark":
            result.splitPageBreakAndParagraphMark = xml.boolAttr(el, "val", true);
            break;
          case "compat":
            for (const c of xml.elements(el)) {
              if (c.localName == "adjustLineHeightInTable")
                result.adjustLineHeightInTable = xml.boolAttr(c, "val", true);
              else if (c.localName == "doNotUseHTMLParagraphAutoSpacing")
                result.doNotUseHTMLParagraphAutoSpacing = xml.boolAttr(c, "val", true);
            }
            break;
        }
      }
      return result;
    }

    // src/settings/settings-part.ts
    var SettingsPart = class extends Part {
      constructor(pkg, path) {
        super(pkg, path);
      }
      parseXml(root) {
        this.settings = parseSettings(root, this._package.xmlParser);
      }
    };

    // src/document-props/custom-props.ts
    function parseCustomProps(root, xml) {
      return xml.elements(root, "property").map((e) => {
        const firstChild = e.firstChild;
        return {
          formatId: xml.attr(e, "fmtid"),
          name: xml.attr(e, "name"),
          type: firstChild.nodeName,
          value: firstChild.textContent
        };
      });
    }

    // src/document-props/custom-props-part.ts
    var CustomPropsPart = class extends Part {
      parseXml(root) {
        this.props = parseCustomProps(root, this._package.xmlParser);
      }
    };

    // src/comments/comments-part.ts
    var CommentsPart = class extends Part {
      constructor(pkg, path, parser) {
        super(pkg, path);
        this._documentParser = parser;
      }
      parseXml(root) {
        this.comments = this._documentParser.parseComments(root);
        this.commentMap = keyBy(this.comments, (x) => x.id);
      }
    };

    // src/comments/comments-extended-part.ts
    var CommentsExtendedPart = class extends Part {
      constructor(pkg, path) {
        super(pkg, path);
        this.comments = [];
      }
      parseXml(root) {
        const xml = this._package.xmlParser;
        for (let el of xml.elements(root, "commentEx")) {
          this.comments.push({
            paraId: xml.attr(el, "paraId"),
            paraIdParent: xml.attr(el, "paraIdParent"),
            done: xml.boolAttr(el, "done")
          });
        }
        this.commentMap = keyBy(this.comments, (x) => x.paraId);
      }
    };

    // src/metafile/emf-to-svg.ts
    var EMR = {
      HEADER: 1,
      POLYBEZIER: 2,
      POLYGON: 3,
      POLYLINE: 4,
      POLYBEZIERTO: 5,
      POLYLINETO: 6,
      POLYPOLYLINE: 7,
      POLYPOLYGON: 8,
      SETWINDOWEXTEX: 9,
      SETWINDOWORGEX: 10,
      SETVIEWPORTEXTEX: 11,
      SETVIEWPORTORGEX: 12,
      EOF: 14,
      SETPIXELV: 15,
      SETBKMODE: 18,
      SETPOLYFILLMODE: 19,
      SETTEXTALIGN: 22,
      SETTEXTCOLOR: 24,
      SETBKCOLOR: 25,
      MOVETOEX: 27,
      SCALEVIEWPORTEXTEX: 31,
      SCALEWINDOWEXTEX: 32,
      SAVEDC: 33,
      RESTOREDC: 34,
      SETWORLDTRANSFORM: 35,
      MODIFYWORLDTRANSFORM: 36,
      SELECTOBJECT: 37,
      CREATEPEN: 38,
      CREATEBRUSHINDIRECT: 39,
      DELETEOBJECT: 40,
      ELLIPSE: 42,
      RECTANGLE: 43,
      ROUNDRECT: 44,
      ARC: 45,
      CHORD: 46,
      PIE: 47,
      LINETO: 54,
      ARCTO: 55,
      POLYDRAW: 56,
      BEGINPATH: 59,
      ENDPATH: 60,
      CLOSEFIGURE: 61,
      FILLPATH: 62,
      STROKEANDFILLPATH: 63,
      STROKEPATH: 64,
      BITBLT: 76,
      STRETCHBLT: 77,
      STRETCHDIBITS: 81,
      EXTCREATEFONTINDIRECTW: 82,
      EXTTEXTOUTA: 83,
      EXTTEXTOUTW: 84,
      POLYBEZIER16: 85,
      POLYGON16: 86,
      POLYLINE16: 87,
      POLYBEZIERTO16: 88,
      POLYLINETO16: 89,
      POLYPOLYLINE16: 90,
      POLYPOLYGON16: 91,
      POLYDRAW16: 92,
      EXTCREATEPEN: 95,
      POLYTEXTOUTA: 96,
      POLYTEXTOUTW: 97,
      SMALLTEXTOUT: 108,
      ALPHABLEND: 114,
      TRANSPARENTBLT: 116
    };
    var STOCK_OBJECTS = {
      0: { type: "brush", color: "#ffffff" },
      1: { type: "brush", color: "#c0c0c0" },
      2: { type: "brush", color: "#808080" },
      3: { type: "brush", color: "#404040" },
      4: { type: "brush", color: "#000000" },
      5: { type: "brush", color: "none", nullBrush: true },
      6: { type: "pen", color: "#ffffff", width: 1 },
      7: { type: "pen", color: "#000000", width: 1 },
      8: { type: "pen", color: "none", width: 0, nullPen: true },
      18: { type: "brush", color: "#ffffff" },
      19: { type: "pen", color: "#000000", width: 1 }
    };
    var IDENTITY = { m11: 1, m12: 0, m21: 0, m22: 1, dx: 0, dy: 0 };
    function isEmfBinary(data) {
      if (!data || data.length < 48)
        return false;
      const view = toDataView(data);
      return view.getUint32(0, true) == EMR.HEADER && view.getUint32(40, true) == 1179469088;
    }
    function convertEmfToSvgDataUrl(data, options) {
      const svg = convertEmfToSvg(data, options);
      return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
    }
    function convertEmfToSvg(data, options = {}) {
      if (!isEmfBinary(data))
        return null;
      const view = toDataView(data);
      const headerSize = view.getUint32(4, true);
      const bounds = readRectL(view, 8);
      const frame = readRectL(view, 24);
      const declaredRecords = view.byteLength >= 52 ? view.getUint32(48, true) : 0;
      const width = Math.max(1, bounds.right - bounds.left);
      const height = Math.max(1, bounds.bottom - bounds.top);
      const physicalWidth = Math.max(1, frame.right - frame.left) / 100;
      const physicalHeight = Math.max(1, frame.bottom - frame.top) / 100;
      const state = initialState();
      const stack = [];
      const objects = {};
      const elements = [];
      let offset = Math.max(8, headerSize || 108);
      let records = 1;
      let pathData = "";
      let inPath = false;
      let shapeCount = 0;
      const maxRecords = options.maxRecords ?? Math.max(1e4, declaredRecords + 100);
      const maxShapes = options.maxShapes ?? 5e4;
      const emit = (markup) => {
        if (!markup || shapeCount >= maxShapes)
          return;
        elements.push(markup);
        shapeCount++;
      };
      const appendPath = (segment) => {
        if (!segment)
          return;
        pathData += (pathData ? " " : "") + segment;
      };
      while (offset + 8 <= view.byteLength && records++ <= maxRecords) {
        const type = view.getUint32(offset, true);
        const size = view.getUint32(offset + 4, true);
        if (size < 8 || offset + size > view.byteLength)
          break;
        switch (type) {
          case EMR.EOF:
            offset += size;
            records = maxRecords + 1;
            break;
          case EMR.SETWINDOWEXTEX:
            state.windowExt = readSizeL(view, offset + 8);
            break;
          case EMR.SETWINDOWORGEX:
            state.windowOrg = readPointL(view, offset + 8);
            break;
          case EMR.SETVIEWPORTEXTEX:
            state.viewportExt = readSizeL(view, offset + 8);
            break;
          case EMR.SETVIEWPORTORGEX:
            state.viewportOrg = readPointL(view, offset + 8);
            break;
          case EMR.SCALEWINDOWEXTEX:
            if (state.windowExt)
              state.windowExt = scaleExt(view, offset, state.windowExt);
            break;
          case EMR.SCALEVIEWPORTEXTEX:
            if (state.viewportExt)
              state.viewportExt = scaleExt(view, offset, state.viewportExt);
            break;
          case EMR.SETWORLDTRANSFORM:
            state.world = readXForm(view, offset + 8);
            break;
          case EMR.MODIFYWORLDTRANSFORM: {
            const xf = readXForm(view, offset + 8);
            const mode = view.getUint32(offset + 32, true);
            if (mode == 1)
              state.world = cloneMatrix(IDENTITY);
            else if (mode == 2)
              state.world = multiplyMatrix(xf, state.world);
            else if (mode == 3)
              state.world = multiplyMatrix(state.world, xf);
            else if (mode == 4)
              state.world = xf;
            break;
          }
          case EMR.SAVEDC:
            stack.push(cloneState(state));
            break;
          case EMR.RESTOREDC: {
            const relative = view.getInt32(offset + 8, true);
            if (relative < 0) {
              for (let i = 0; i < Math.min(-relative, stack.length); i++)
                Object.assign(state, stack.pop());
            } else if (relative > 0 && relative <= stack.length) {
              const restored = stack[relative - 1];
              stack.length = relative - 1;
              Object.assign(state, cloneState(restored));
            }
            break;
          }
          case EMR.SETBKMODE:
            state.bkMode = view.getUint32(offset + 8, true);
            break;
          case EMR.SETPOLYFILLMODE:
            state.polyFillMode = view.getUint32(offset + 8, true);
            break;
          case EMR.SETTEXTALIGN:
            state.textAlign = view.getUint32(offset + 8, true);
            break;
          case EMR.SETTEXTCOLOR:
            state.textColor = colorRefToCss(view.getUint32(offset + 8, true));
            break;
          case EMR.SETBKCOLOR:
            state.bkColor = colorRefToCss(view.getUint32(offset + 8, true));
            break;
          case EMR.CREATEPEN: {
            const handle = view.getUint32(offset + 8, true);
            const style = view.getUint32(offset + 12, true);
            const width2 = Math.abs(view.getInt32(offset + 16, true));
            const color = colorRefToCss(view.getUint32(offset + 24, true));
            objects[handle] = { type: "pen", color, width: width2 || 1, nullPen: (style & 15) == 5 };
            break;
          }
          case EMR.EXTCREATEPEN: {
            const handle = view.getUint32(offset + 8, true);
            const style = view.getUint32(offset + 28, true);
            const width2 = Math.abs(view.getInt32(offset + 32, true));
            const brushStyle = view.getUint32(offset + 36, true);
            const color = colorRefToCss(view.getUint32(offset + 40, true));
            objects[handle] = { type: "pen", color, width: width2 || 1, nullPen: (style & 15) == 5 || brushStyle == 1 };
            break;
          }
          case EMR.CREATEBRUSHINDIRECT: {
            const handle = view.getUint32(offset + 8, true);
            const style = view.getUint32(offset + 12, true);
            const color = colorRefToCss(view.getUint32(offset + 16, true));
            objects[handle] = { type: "brush", color, nullBrush: style == 1 };
            break;
          }
          case EMR.EXTCREATEFONTINDIRECTW: {
            const handle = view.getUint32(offset + 8, true);
            objects[handle] = parseFont2(view, offset + 12, size - 12);
            break;
          }
          case EMR.SELECTOBJECT: {
            const handle = view.getUint32(offset + 8, true);
            const obj = handle & 2147483648 ? STOCK_OBJECTS[handle & 2147483647] : objects[handle];
            if (obj?.type == "pen") state.pen = clonePen(obj);
            else if (obj?.type == "brush") state.brush = cloneBrush(obj);
            else if (obj?.type == "font") state.font = { ...obj };
            break;
          }
          case EMR.DELETEOBJECT:
            delete objects[view.getUint32(offset + 8, true)];
            break;
          case EMR.BEGINPATH:
            inPath = true;
            pathData = "";
            break;
          case EMR.ENDPATH:
            inPath = false;
            break;
          case EMR.CLOSEFIGURE:
            appendPath("Z");
            break;
          case EMR.MOVETOEX: {
            const p = transformPoint(state, readPointL(view, offset + 8));
            state.currentPoint = p;
            if (inPath)
              appendPath(`M ${fmt(p.x)} ${fmt(p.y)}`);
            break;
          }
          case EMR.LINETO: {
            const p = transformPoint(state, readPointL(view, offset + 8));
            if (inPath) {
              appendPath(`L ${fmt(p.x)} ${fmt(p.y)}`);
            } else {
              emit(`<path d="M ${fmt(state.currentPoint.x)} ${fmt(state.currentPoint.y)} L ${fmt(p.x)} ${fmt(p.y)}" ${paintAttrs(state, false, true)}/>`);
            }
            state.currentPoint = p;
            break;
          }
          case EMR.POLYLINE:
          case EMR.POLYGON:
            emitPoly32(view, offset, type == EMR.POLYGON, false, inPath, state, appendPath, emit);
            break;
          case EMR.POLYLINETO:
            emitPoly32(view, offset, false, true, inPath, state, appendPath, emit);
            break;
          case EMR.POLYLINE16:
          case EMR.POLYGON16:
            emitPoly16(view, offset, type == EMR.POLYGON16, false, inPath, state, appendPath, emit);
            break;
          case EMR.POLYLINETO16:
            emitPoly16(view, offset, false, true, inPath, state, appendPath, emit);
            break;
          case EMR.POLYBEZIER:
            emitBezier(view, offset, false, false, inPath, state, appendPath, emit);
            break;
          case EMR.POLYBEZIERTO:
            emitBezier(view, offset, false, true, inPath, state, appendPath, emit);
            break;
          case EMR.POLYBEZIER16:
            emitBezier(view, offset, true, false, inPath, state, appendPath, emit);
            break;
          case EMR.POLYBEZIERTO16:
            emitBezier(view, offset, true, true, inPath, state, appendPath, emit);
            break;
          case EMR.POLYPOLYLINE:
          case EMR.POLYPOLYGON:
            emitPolyPoly(view, offset, type == EMR.POLYPOLYGON, false, inPath, state, appendPath, emit);
            break;
          case EMR.POLYPOLYLINE16:
          case EMR.POLYPOLYGON16:
            emitPolyPoly(view, offset, type == EMR.POLYPOLYGON16, true, inPath, state, appendPath, emit);
            break;
          case EMR.POLYDRAW:
            emitPolyDraw(view, offset, false, inPath, state, appendPath, emit);
            break;
          case EMR.POLYDRAW16:
            emitPolyDraw(view, offset, true, inPath, state, appendPath, emit);
            break;
          case EMR.RECTANGLE:
            emitRect(view, offset, state, emit, false);
            break;
          case EMR.ELLIPSE:
            emitEllipse(view, offset, state, emit);
            break;
          case EMR.ROUNDRECT:
            emitRect(view, offset, state, emit, true);
            break;
          case EMR.ARC:
          case EMR.ARCTO:
          case EMR.CHORD:
          case EMR.PIE:
            emitArcLike(view, offset, type, inPath, state, appendPath, emit);
            break;
          case EMR.FILLPATH:
            emitPath(pathData, state, emit, true, false);
            pathData = "";
            break;
          case EMR.STROKEPATH:
            emitPath(pathData, state, emit, false, true);
            pathData = "";
            break;
          case EMR.STROKEANDFILLPATH:
            emitPath(pathData, state, emit, true, true);
            pathData = "";
            break;
          case EMR.EXTTEXTOUTA:
          case EMR.EXTTEXTOUTW:
            emitExtTextOut(view, offset, size, state, emit, type == EMR.EXTTEXTOUTW);
            break;
          case EMR.POLYTEXTOUTA:
          case EMR.POLYTEXTOUTW:
            emitPolyTextOut(view, offset, size, state, emit, type == EMR.POLYTEXTOUTW);
            break;
          case EMR.SMALLTEXTOUT:
            emitSmallTextOut(view, offset, size, state, emit);
            break;
          case EMR.SETPIXELV:
            emitPixel(view, offset, state, emit);
            break;
          case EMR.BITBLT:
          case EMR.STRETCHBLT:
          case EMR.STRETCHDIBITS:
          case EMR.ALPHABLEND:
          case EMR.TRANSPARENTBLT:
            emitBitmapRecord(view, offset, size, type, state, emit);
            break;
        }
        offset += size;
      }
      if (pathData)
        emitPath(pathData, state, emit, true, true);
      if (!elements.length) {
        const rasterFallback = emitEmbeddedRasterFallback(data, bounds);
        if (rasterFallback.length)
          elements.push(...rasterFallback);
      }
      if (!elements.length)
        return emptySvg(width, height, bounds, physicalWidth, physicalHeight, "Unsupported EMF image");
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(physicalWidth)}mm" height="${fmt(physicalHeight)}mm" viewBox="${fmt(bounds.left)} ${fmt(bounds.top)} ${fmt(width)} ${fmt(height)}" preserveAspectRatio="xMidYMid meet" data-docx-metafile="emf">${elements.join("")}</svg>`;
    }
    function initialState() {
      return {
        world: cloneMatrix(IDENTITY),
        windowOrg: { x: 0, y: 0 },
        windowExt: null,
        viewportOrg: { x: 0, y: 0 },
        viewportExt: null,
        pen: { type: "pen", color: "#000000", width: 1 },
        brush: { type: "brush", color: "#ffffff", nullBrush: true },
        font: null,
        textColor: "#000000",
        bkColor: "#ffffff",
        bkMode: 1,
        polyFillMode: 1,
        textAlign: 0,
        currentPoint: { x: 0, y: 0 }
      };
    }
    function cloneState(state) {
      return {
        world: cloneMatrix(state.world),
        windowOrg: { ...state.windowOrg },
        windowExt: state.windowExt ? { ...state.windowExt } : null,
        viewportOrg: { ...state.viewportOrg },
        viewportExt: state.viewportExt ? { ...state.viewportExt } : null,
        pen: clonePen(state.pen),
        brush: cloneBrush(state.brush),
        font: state.font ? { ...state.font } : null,
        textColor: state.textColor,
        bkColor: state.bkColor,
        bkMode: state.bkMode,
        polyFillMode: state.polyFillMode,
        textAlign: state.textAlign,
        currentPoint: { ...state.currentPoint }
      };
    }
    function clonePen(pen) {
      return { ...pen };
    }
    function cloneBrush(brush) {
      return { ...brush };
    }
    function cloneMatrix(m) {
      return { ...m };
    }
    function toDataView(data) {
      return new DataView(data.buffer, data.byteOffset, data.byteLength);
    }
    function readRectL(view, offset) {
      return {
        left: view.getInt32(offset, true),
        top: view.getInt32(offset + 4, true),
        right: view.getInt32(offset + 8, true),
        bottom: view.getInt32(offset + 12, true)
      };
    }
    function readPointL(view, offset) {
      return { x: view.getInt32(offset, true), y: view.getInt32(offset + 4, true) };
    }
    function readSizeL(view, offset) {
      return readPointL(view, offset);
    }
    function readPointS(view, offset) {
      return { x: view.getInt16(offset, true), y: view.getInt16(offset + 2, true) };
    }
    function readXForm(view, offset) {
      return {
        m11: view.getFloat32(offset, true),
        m12: view.getFloat32(offset + 4, true),
        m21: view.getFloat32(offset + 8, true),
        m22: view.getFloat32(offset + 12, true),
        dx: view.getFloat32(offset + 16, true),
        dy: view.getFloat32(offset + 20, true)
      };
    }
    function multiplyMatrix(a, b) {
      return {
        m11: a.m11 * b.m11 + a.m12 * b.m21,
        m12: a.m11 * b.m12 + a.m12 * b.m22,
        m21: a.m21 * b.m11 + a.m22 * b.m21,
        m22: a.m21 * b.m12 + a.m22 * b.m22,
        dx: a.dx * b.m11 + a.dy * b.m21 + b.dx,
        dy: a.dx * b.m12 + a.dy * b.m22 + b.dy
      };
    }
    function transformPoint(state, p) {
      const world = state.world;
      let x = p.x * world.m11 + p.y * world.m21 + world.dx;
      let y = p.x * world.m12 + p.y * world.m22 + world.dy;
      if (state.windowExt && state.viewportExt && state.windowExt.x && state.windowExt.y) {
        x = (x - state.windowOrg.x) * state.viewportExt.x / state.windowExt.x + state.viewportOrg.x;
        y = (y - state.windowOrg.y) * state.viewportExt.y / state.windowExt.y + state.viewportOrg.y;
      }
      return { x, y };
    }
    function approximateScale(state) {
      let sx = Math.hypot(state.world.m11, state.world.m12);
      let sy = Math.hypot(state.world.m21, state.world.m22);
      if (state.windowExt && state.viewportExt && state.windowExt.x && state.windowExt.y) {
        sx *= Math.abs(state.viewportExt.x / state.windowExt.x);
        sy *= Math.abs(state.viewportExt.y / state.windowExt.y);
      }
      const scale = (sx + sy) / 2;
      return Number.isFinite(scale) && scale > 0 ? scale : 1;
    }
    function scaleExt(view, offset, current) {
      const xNum = view.getInt32(offset + 8, true);
      const xDen = view.getInt32(offset + 12, true);
      const yNum = view.getInt32(offset + 16, true);
      const yDen = view.getInt32(offset + 20, true);
      return {
        x: xDen ? current.x * xNum / xDen : current.x,
        y: yDen ? current.y * yNum / yDen : current.y
      };
    }
    function colorRefToCss(color) {
      const r = color & 255;
      const g = color >> 8 & 255;
      const b = color >> 16 & 255;
      return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
    }
    function hex2(value) {
      return Math.max(0, Math.min(255, value | 0)).toString(16).padStart(2, "0");
    }
    function fmt(value) {
      if (!Number.isFinite(value))
        return "0";
      const rounded = Math.round(value * 1e3) / 1e3;
      return `${rounded}`;
    }
    function esc(value) {
      return `${value ?? ""}`.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function paintAttrs(state, fill, stroke) {
      const attrs = [];
      if (fill && !state.brush.nullBrush) {
        attrs.push(`fill="${state.brush.color}"`);
        attrs.push(`fill-rule="${state.polyFillMode == 2 ? "nonzero" : "evenodd"}"`);
      } else {
        attrs.push(`fill="none"`);
      }
      if (stroke && !state.pen.nullPen) {
        const scale = approximateScale(state);
        const strokeWidth = state.pen.width == 0 ? 1 : Math.max(0.35, state.pen.width * scale);
        attrs.push(`stroke="${state.pen.color}"`);
        attrs.push(`stroke-width="${fmt(strokeWidth)}"`);
        attrs.push(`stroke-linecap="square"`);
        attrs.push(`stroke-linejoin="miter"`);
      } else {
        attrs.push(`stroke="none"`);
      }
      return attrs.join(" ");
    }
    function emitPath(pathData, state, emit, fill, stroke) {
      if (!pathData)
        return;
      emit(`<path d="${pathData}" ${paintAttrs(state, fill, stroke)}/>`);
    }
    function emitPoly16(view, offset, closed, toCurrent, inPath, state, appendPath, emit) {
      const count = view.getUint32(offset + 24, true);
      if (!count || offset + 28 + count * 4 > view.byteLength)
        return;
      const points = [];
      for (let i = 0; i < count; i++)
        points.push(transformPoint(state, readPointS(view, offset + 28 + i * 4)));
      emitPolyline(points, closed, toCurrent, inPath, state, appendPath, emit);
    }
    function emitPoly32(view, offset, closed, toCurrent, inPath, state, appendPath, emit) {
      const count = view.getUint32(offset + 24, true);
      if (!count || offset + 28 + count * 8 > view.byteLength)
        return;
      const points = [];
      for (let i = 0; i < count; i++)
        points.push(transformPoint(state, readPointL(view, offset + 28 + i * 8)));
      emitPolyline(points, closed, toCurrent, inPath, state, appendPath, emit);
    }
    function emitPolyline(points, closed, toCurrent, inPath, state, appendPath, emit) {
      if (!points.length)
        return;
      let d = inPath && toCurrent ? "" : toCurrent ? `M ${fmt(state.currentPoint.x)} ${fmt(state.currentPoint.y)}` : `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
      const start = toCurrent ? 0 : 1;
      for (let i = start; i < points.length; i++)
        d += ` L ${fmt(points[i].x)} ${fmt(points[i].y)}`;
      if (closed)
        d += " Z";
      state.currentPoint = points[points.length - 1];
      if (inPath)
        appendPath(d.trim());
      else
        emit(`<path d="${d.trim()}" ${paintAttrs(state, closed, true)}/>`);
    }
    function emitBezier(view, offset, shortPoints, toCurrent, inPath, state, appendPath, emit) {
      const count = view.getUint32(offset + 24, true);
      const pointSize = shortPoints ? 4 : 8;
      if (!count || offset + 28 + count * pointSize > view.byteLength)
        return;
      const points = [];
      for (let i = 0; i < count; i++) {
        const p = shortPoints ? readPointS(view, offset + 28 + i * pointSize) : readPointL(view, offset + 28 + i * pointSize);
        points.push(transformPoint(state, p));
      }
      let d = inPath && toCurrent ? "" : toCurrent ? `M ${fmt(state.currentPoint.x)} ${fmt(state.currentPoint.y)}` : `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
      let last = toCurrent ? state.currentPoint : points[0];
      const start = toCurrent ? 0 : 1;
      for (let i = start; i + 2 < points.length; i += 3) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2];
        d += ` C ${fmt(p1.x)} ${fmt(p1.y)} ${fmt(p2.x)} ${fmt(p2.y)} ${fmt(p3.x)} ${fmt(p3.y)}`;
        last = p3;
      }
      state.currentPoint = last;
      if (inPath)
        appendPath(d.trim());
      else
        emit(`<path d="${d.trim()}" ${paintAttrs(state, false, true)}/>`);
    }
    function emitPolyPoly(view, offset, closed, shortPoints, inPath, state, appendPath, emit) {
      const polys = view.getUint32(offset + 24, true);
      const totalPoints = view.getUint32(offset + 28, true);
      const countsOffset = offset + 32;
      const pointsOffset = countsOffset + polys * 4;
      const pointSize = shortPoints ? 4 : 8;
      if (!polys || !totalPoints || pointsOffset + totalPoints * pointSize > view.byteLength)
        return;
      let pointIndex = 0;
      for (let i = 0; i < polys; i++) {
        const count = view.getUint32(countsOffset + i * 4, true);
        if (!count || pointIndex + count > totalPoints)
          break;
        const points = [];
        for (let j = 0; j < count; j++) {
          const pointOffset = pointsOffset + (pointIndex + j) * pointSize;
          const p = shortPoints ? readPointS(view, pointOffset) : readPointL(view, pointOffset);
          points.push(transformPoint(state, p));
        }
        emitPolyline(points, closed, false, inPath, state, appendPath, emit);
        pointIndex += count;
      }
    }
    function emitPolyDraw(view, offset, shortPoints, inPath, state, appendPath, emit) {
      const count = view.getUint32(offset + 24, true);
      const pointSize = shortPoints ? 4 : 8;
      const pointsOffset = offset + 28;
      const typesOffset = pointsOffset + count * pointSize;
      if (!count || typesOffset + count > view.byteLength)
        return;
      const points = [];
      for (let i2 = 0; i2 < count; i2++) {
        const pointOffset = pointsOffset + i2 * pointSize;
        const p = shortPoints ? readPointS(view, pointOffset) : readPointL(view, pointOffset);
        points.push(transformPoint(state, p));
      }
      let d = "";
      let i = 0;
      while (i < count) {
        const t = view.getUint8(typesOffset + i);
        const op = t & 6;
        if (op == 6) {
          d += ` M ${fmt(points[i].x)} ${fmt(points[i].y)}`;
          state.currentPoint = points[i];
          i++;
        } else if (op == 2) {
          d += ` L ${fmt(points[i].x)} ${fmt(points[i].y)}`;
          state.currentPoint = points[i];
          i++;
        } else if (op == 4 && i + 2 < count) {
          d += ` C ${fmt(points[i].x)} ${fmt(points[i].y)} ${fmt(points[i + 1].x)} ${fmt(points[i + 1].y)} ${fmt(points[i + 2].x)} ${fmt(points[i + 2].y)}`;
          state.currentPoint = points[i + 2];
          i += 3;
        } else {
          i++;
        }
        if (t & 1)
          d += " Z";
      }
      d = d.trim();
      if (!d)
        return;
      if (inPath)
        appendPath(d);
      else
        emit(`<path d="${d}" ${paintAttrs(state, false, true)}/>`);
    }
    function emitRect(view, offset, state, emit, rounded) {
      const r = readRectL(view, offset + 8);
      const p1 = transformPoint(state, { x: r.left, y: r.top });
      const p2 = transformPoint(state, { x: r.right, y: r.bottom });
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      const radius = rounded ? ` rx="${fmt(Math.min(w, h) / 8)}" ry="${fmt(Math.min(w, h) / 8)}"` : "";
      emit(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}"${radius} ${paintAttrs(state, true, true)}/>`);
    }
    function emitEllipse(view, offset, state, emit) {
      const r = readRectL(view, offset + 8);
      const p1 = transformPoint(state, { x: r.left, y: r.top });
      const p2 = transformPoint(state, { x: r.right, y: r.bottom });
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const rx = Math.abs(p2.x - p1.x) / 2;
      const ry = Math.abs(p2.y - p1.y) / 2;
      emit(`<ellipse cx="${fmt(cx)}" cy="${fmt(cy)}" rx="${fmt(rx)}" ry="${fmt(ry)}" ${paintAttrs(state, true, true)}/>`);
    }
    function emitArcLike(view, offset, type, inPath, state, appendPath, emit) {
      const r = readRectL(view, offset + 8);
      const startRef = readPointL(view, offset + 24);
      const endRef = readPointL(view, offset + 32);
      const cx = (r.left + r.right) / 2;
      const cy = (r.top + r.bottom) / 2;
      const rxRaw = Math.abs(r.right - r.left) / 2;
      const ryRaw = Math.abs(r.bottom - r.top) / 2;
      if (!rxRaw || !ryRaw)
        return;
      const startAngle = Math.atan2(startRef.y - cy, startRef.x - cx);
      let endAngle = Math.atan2(endRef.y - cy, endRef.x - cx);
      let delta = endAngle - startAngle;
      if (delta <= 0)
        delta += Math.PI * 2;
      const largeArc = delta > Math.PI ? 1 : 0;
      const pStart = transformPoint(state, { x: cx + Math.cos(startAngle) * rxRaw, y: cy + Math.sin(startAngle) * ryRaw });
      const pEnd = transformPoint(state, { x: cx + Math.cos(endAngle) * rxRaw, y: cy + Math.sin(endAngle) * ryRaw });
      const pCenter = transformPoint(state, { x: cx, y: cy });
      const pRx = transformPoint(state, { x: cx + rxRaw, y: cy });
      const pRy = transformPoint(state, { x: cx, y: cy + ryRaw });
      const rx = Math.max(0.01, Math.abs(pRx.x - pCenter.x) || Math.abs(pRy.x - pCenter.x));
      const ry = Math.max(0.01, Math.abs(pRy.y - pCenter.y) || Math.abs(pRx.y - pCenter.y));
      const arc = `A ${fmt(rx)} ${fmt(ry)} 0 ${largeArc} 1 ${fmt(pEnd.x)} ${fmt(pEnd.y)}`;
      let d = `M ${fmt(pStart.x)} ${fmt(pStart.y)} ${arc}`;
      let fill = false;
      let stroke = true;
      if (type == EMR.CHORD) {
        d += " Z";
        fill = true;
      } else if (type == EMR.PIE) {
        d += ` L ${fmt(pCenter.x)} ${fmt(pCenter.y)} Z`;
        fill = true;
      }
      if (type == EMR.ARCTO)
        state.currentPoint = pEnd;
      if (inPath)
        appendPath(d);
      else
        emit(`<path d="${d}" ${paintAttrs(state, fill, stroke)}/>`);
    }
    function parseFont2(view, offset, available) {
      const height = available >= 4 ? view.getInt32(offset, true) : 12;
      const weight = available >= 20 ? view.getInt32(offset + 16, true) : 400;
      const italic = available >= 21 ? view.getUint8(offset + 20) != 0 : false;
      const underline = available >= 22 ? view.getUint8(offset + 21) != 0 : false;
      let family = "";
      const faceOffset = offset + 28;
      const faceBytes = Math.max(0, Math.min(64, available - 28));
      for (let i = 0; i + 1 < faceBytes; i += 2) {
        const code = view.getUint16(faceOffset + i, true);
        if (!code)
          break;
        family += String.fromCharCode(code);
      }
      return { type: "font", family, size: Math.abs(height) || 12, weight, italic, underline };
    }
    function emitExtTextOut(view, offset, size, state, emit, unicode) {
      if (size < 76)
        return;
      const ref = transformPoint(state, readPointL(view, offset + 36));
      const chars = view.getUint32(offset + 44, true);
      const offString = view.getUint32(offset + 48, true);
      if (!chars || offString <= 0)
        return;
      const bytesPerChar = unicode ? 2 : 1;
      if (offString + chars * bytesPerChar > size)
        return;
      const text = unicode ? decodeUtf16(view, offset + offString, chars) : decodeAnsi(new Uint8Array(view.buffer, view.byteOffset + offset + offString, chars));
      emitText(text, ref, state, emit);
    }
    function emitPolyTextOut(view, offset, size, state, emit, unicode) {
      if (size < 40)
        return;
      const count = view.getUint32(offset + 36, true);
      let textOffset = offset + 40;
      for (let i = 0; i < count && textOffset + 40 <= offset + size; i++, textOffset += 40) {
        const ref = transformPoint(state, readPointL(view, textOffset));
        const chars = view.getUint32(textOffset + 8, true);
        const offString = view.getUint32(textOffset + 12, true);
        const bytesPerChar = unicode ? 2 : 1;
        if (!chars || !offString || offString + chars * bytesPerChar > size)
          continue;
        const text = unicode ? decodeUtf16(view, offset + offString, chars) : decodeAnsi(new Uint8Array(view.buffer, view.byteOffset + offset + offString, chars));
        emitText(text, ref, state, emit);
      }
    }
    function emitSmallTextOut(view, offset, size, state, emit) {
      if (size < 36)
        return;
      const ref = transformPoint(state, readPointL(view, offset + 8));
      const chars = view.getUint32(offset + 16, true);
      const flags = view.getUint32(offset + 20, true);
      const textOffset = flags & 512 ? 40 : 28;
      if (!chars || textOffset + chars > size)
        return;
      const text = decodeAnsi(new Uint8Array(view.buffer, view.byteOffset + offset + textOffset, chars));
      emitText(text, ref, state, emit);
    }
    function decodeUtf16(view, offset, chars) {
      let text = "";
      for (let i = 0; i < chars; i++) {
        const code = view.getUint16(offset + i * 2, true);
        if (code)
          text += String.fromCharCode(code);
      }
      return text;
    }
    function decodeAnsi(bytes) {
      if (!bytes.length)
        return "";
      const decoder = globalThis.TextDecoder;
      if (decoder) {
        try {
          return new decoder("gb18030").decode(bytes).replace(/\0+$/g, "");
        } catch {
          try {
            return new decoder("windows-1252").decode(bytes).replace(/\0+$/g, "");
          } catch {
          }
        }
      }
      let text = "";
      for (const b of bytes) {
        if (b)
          text += String.fromCharCode(b);
      }
      return text;
    }
    function textAttrs(state, ref) {
      const font = state.font;
      const fontSize = Math.max(1, (font?.size ?? 12) * approximateScale(state));
      const attrs = [
        `x="${fmt(ref.x)}"`,
        `y="${fmt(ref.y)}"`,
        `fill="${state.textColor}"`,
        `font-size="${fmt(fontSize)}"`,
        font?.family ? `font-family="${esc(font.family)}"` : "",
        font?.weight ? `font-weight="${font.weight >= 600 ? "bold" : "normal"}"` : "",
        font?.italic ? `font-style="italic"` : "",
        font?.underline ? `text-decoration="underline"` : "",
        textAnchorAttr(state),
        baselineAttr(state)
      ].filter(Boolean).join(" ");
      return attrs;
    }
    function textAnchorAttr(state) {
      const horizontal = state.textAlign & 6;
      if (horizontal == 6)
        return `text-anchor="middle"`;
      if (horizontal == 2)
        return `text-anchor="end"`;
      return "";
    }
    function baselineAttr(state) {
      const vertical = state.textAlign & 24;
      if (vertical == 0)
        return `dominant-baseline="text-before-edge"`;
      if (vertical == 8)
        return `dominant-baseline="text-after-edge"`;
      return "";
    }
    function emitText(text, ref, state, emit) {
      if (!text)
        return;
      emit(`<text ${textAttrs(state, ref)}>${esc(text)}</text>`);
    }
    function emitPixel(view, offset, state, emit) {
      if (offset + 20 > view.byteLength)
        return;
      const p = transformPoint(state, readPointL(view, offset + 8));
      const color = colorRefToCss(view.getUint32(offset + 16, true));
      emit(`<rect x="${fmt(p.x)}" y="${fmt(p.y)}" width="1" height="1" fill="${color}" stroke="none"/>`);
    }
    function emitBitmapRecord(view, offset, size, type, state, emit) {
      let xDest = 0;
      let yDest = 0;
      let cxDest = 0;
      let cyDest = 0;
      let offBmi = 0;
      let cbBmi = 0;
      let offBits = 0;
      let cbBits = 0;
      if (type == EMR.STRETCHDIBITS) {
        if (size < 80)
          return;
        xDest = view.getInt32(offset + 24, true);
        yDest = view.getInt32(offset + 28, true);
        offBmi = view.getUint32(offset + 48, true);
        cbBmi = view.getUint32(offset + 52, true);
        offBits = view.getUint32(offset + 56, true);
        cbBits = view.getUint32(offset + 60, true);
        cxDest = view.getInt32(offset + 72, true);
        cyDest = view.getInt32(offset + 76, true);
      } else {
        if (size < 100)
          return;
        xDest = view.getInt32(offset + 24, true);
        yDest = view.getInt32(offset + 28, true);
        cxDest = view.getInt32(offset + 32, true);
        cyDest = view.getInt32(offset + 36, true);
        offBmi = view.getUint32(offset + 84, true);
        cbBmi = view.getUint32(offset + 88, true);
        offBits = view.getUint32(offset + 92, true);
        cbBits = view.getUint32(offset + 96, true);
      }
      if (!offBmi || !cbBmi || !offBits || !cbBits || offBmi + cbBmi > size || offBits + cbBits > size)
        return;
      const imageUrl = dibToImageDataUrl(view, offset, offBmi, cbBmi, offBits, cbBits);
      if (!imageUrl)
        return;
      const p1 = transformPoint(state, { x: xDest, y: yDest });
      const p2 = transformPoint(state, { x: xDest + cxDest, y: yDest + cyDest });
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      emit(`<image x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" href="${imageUrl}" preserveAspectRatio="none"/>`);
    }
    function dibToImageDataUrl(view, recordOffset, offBmi, cbBmi, offBits, cbBits) {
      const bmiStart = recordOffset + offBmi;
      const bitsStart = recordOffset + offBits;
      if (cbBmi < 4 || bmiStart + cbBmi > view.byteLength || bitsStart + cbBits > view.byteLength)
        return null;
      const headerSize = view.getUint32(bmiStart, true);
      const compression = headerSize >= 40 && cbBmi >= 20 ? view.getUint32(bmiStart + 16, true) : 0;
      const bits = new Uint8Array(view.buffer, view.byteOffset + bitsStart, cbBits);
      if (compression == 4)
        return `data:image/jpeg;base64,${base64(bits)}`;
      if (compression == 5)
        return `data:image/png;base64,${base64(bits)}`;
      const dib = new Uint8Array(cbBmi + cbBits);
      dib.set(new Uint8Array(view.buffer, view.byteOffset + bmiStart, cbBmi), 0);
      dib.set(bits, cbBmi);
      return dibToBmpDataUrl(dib, cbBmi);
    }
    function dibToBmpDataUrl(dib, headerBytes) {
      if (!dib?.length || headerBytes <= 0 || headerBytes > dib.length)
        return null;
      const fileHeaderSize = 14;
      const fileSize = fileHeaderSize + dib.length;
      const pixelOffset = fileHeaderSize + headerBytes;
      const out = new Uint8Array(fileSize);
      out[0] = 66;
      out[1] = 77;
      writeU32(out, 2, fileSize);
      writeU32(out, 10, pixelOffset);
      out.set(dib, fileHeaderSize);
      return `data:image/bmp;base64,${base64(out)}`;
    }
    function emitEmbeddedRasterFallback(data, bounds) {
      const url = findEmbeddedRasterDataUrl(data);
      if (!url)
        return [];
      const width = Math.max(1, bounds.right - bounds.left);
      const height = Math.max(1, bounds.bottom - bounds.top);
      return [`<image x="${fmt(bounds.left)}" y="${fmt(bounds.top)}" width="${fmt(width)}" height="${fmt(height)}" href="${url}" preserveAspectRatio="xMidYMid meet"/>`];
    }
    function findEmbeddedRasterDataUrl(data) {
      const png = findPng(data);
      if (png)
        return `data:image/png;base64,${base64(png)}`;
      const jpeg = findJpeg(data);
      if (jpeg)
        return `data:image/jpeg;base64,${base64(jpeg)}`;
      const bmp = findBmp(data);
      if (bmp)
        return `data:image/bmp;base64,${base64(bmp)}`;
      return null;
    }
    function findPng(data) {
      const sig = [137, 80, 78, 71, 13, 10, 26, 10];
      for (let i = 0; i + sig.length + 12 <= data.length; i++) {
        if (!startsWith(data, sig, i))
          continue;
        let p = i + 8;
        while (p + 12 <= data.length) {
          const len = readU32BE(data, p);
          const type = String.fromCharCode(data[p + 4], data[p + 5], data[p + 6], data[p + 7]);
          p += 12 + len;
          if (p > data.length)
            break;
          if (type == "IEND")
            return data.subarray(i, p);
        }
      }
      return null;
    }
    function findJpeg(data) {
      for (let i = 0; i + 4 < data.length; i++) {
        if (data[i] != 255 || data[i + 1] != 216 || data[i + 2] != 255)
          continue;
        for (let j = i + 4; j + 1 < data.length; j++) {
          if (data[j] == 255 && data[j + 1] == 217)
            return data.subarray(i, j + 2);
        }
      }
      return null;
    }
    function findBmp(data) {
      for (let i = 0; i + 14 < data.length; i++) {
        if (data[i] != 66 || data[i + 1] != 77)
          continue;
        const fileSize = readU32LE(data, i + 2);
        if (fileSize > 14 && i + fileSize <= data.length)
          return data.subarray(i, i + fileSize);
      }
      return null;
    }
    function startsWith(data, sig, offset) {
      for (let i = 0; i < sig.length; i++) {
        if (data[offset + i] != sig[i])
          return false;
      }
      return true;
    }
    function readU32BE(data, offset) {
      return (data[offset] << 24 | data[offset + 1] << 16 | data[offset + 2] << 8 | data[offset + 3]) >>> 0;
    }
    function readU32LE(data, offset) {
      return (data[offset] | data[offset + 1] << 8 | data[offset + 2] << 16 | data[offset + 3] << 24) >>> 0;
    }
    function writeU32(out, offset, value) {
      out[offset] = value & 255;
      out[offset + 1] = value >> 8 & 255;
      out[offset + 2] = value >> 16 & 255;
      out[offset + 3] = value >> 24 & 255;
    }
    function base64(bytes) {
      let binary = "";
      const chunk = 32768;
      for (let i = 0; i < bytes.length; i += chunk)
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      if (typeof btoa == "function")
        return btoa(binary);
      const buffer = globalThis.Buffer;
      if (buffer)
        return buffer.from(bytes).toString("base64");
      return binary;
    }
    function emptySvg(width, height, bounds, physicalWidth, physicalHeight, message) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(physicalWidth)}mm" height="${fmt(physicalHeight)}mm" viewBox="${fmt(bounds.left)} ${fmt(bounds.top)} ${fmt(width)} ${fmt(height)}" preserveAspectRatio="xMidYMid meet" data-docx-metafile="emf"><rect x="${fmt(bounds.left)}" y="${fmt(bounds.top)}" width="${fmt(width)}" height="${fmt(height)}" fill="none" stroke="#999" stroke-width="1"/><text x="${fmt(bounds.left + width / 2)}" y="${fmt(bounds.top + height / 2)}" text-anchor="middle" font-size="12" fill="#666">${esc(message)}</text></svg>`;
    }

    // src/metafile/wmf-to-svg.ts
    var PLACEABLE_KEY = 2596720087;
    var META = {
      EOF: 0,
      SETBKMODE: 258,
      SETBKCOLOR: 513,
      SETTEXTCOLOR: 521,
      SETTEXTALIGN: 302,
      SETWINDOWORG: 523,
      SETWINDOWEXT: 524,
      SETVIEWPORTORG: 525,
      SETVIEWPORTEXT: 526,
      MOVETO: 532,
      LINETO: 531,
      POLYLINE: 805,
      POLYGON: 804,
      RECTANGLE: 1051,
      ELLIPSE: 1048,
      CREATEPENINDIRECT: 762,
      CREATEBRUSHINDIRECT: 764,
      CREATEFONTINDIRECT: 763,
      SELECTOBJECT: 301,
      DELETEOBJECT: 496,
      TEXTOUT: 1313,
      EXTTEXTOUT: 2610
    };
    var STOCK_OBJECTS2 = {
      0: { type: "brush", color: "#ffffff" },
      1: { type: "brush", color: "#c0c0c0" },
      2: { type: "brush", color: "#808080" },
      3: { type: "brush", color: "#404040" },
      4: { type: "brush", color: "#000000" },
      5: { type: "brush", color: "none", nullBrush: true },
      6: { type: "pen", color: "#ffffff", width: 1 },
      7: { type: "pen", color: "#000000", width: 1 },
      8: { type: "pen", color: "none", width: 0, nullPen: true },
      18: { type: "brush", color: "#ffffff" },
      19: { type: "pen", color: "#000000", width: 1 }
    };
    function isWmfBinary(data) {
      if (!data || data.length < 22)
        return false;
      const view = toDataView2(data);
      if (view.getUint32(0, true) == PLACEABLE_KEY)
        return true;
      return data.length >= 18 && view.getUint16(0, true) == 1 && view.getUint16(2, true) == 9;
    }
    function convertWmfToSvgDataUrl(data, options) {
      const svg = convertWmfToSvg(data, options);
      return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
    }
    function convertWmfToSvg(data, options = {}) {
      if (!isWmfBinary(data))
        return null;
      const view = toDataView2(data);
      let offset = 0;
      let bounds = { left: 0, top: 0, right: 1e3, bottom: 1e3 };
      let physicalWidth = 100;
      let physicalHeight = 100;
      if (view.getUint32(0, true) == PLACEABLE_KEY && view.byteLength >= 22) {
        bounds = {
          left: view.getInt16(6, true),
          top: view.getInt16(8, true),
          right: view.getInt16(10, true),
          bottom: view.getInt16(12, true)
        };
        const inch = Math.max(1, view.getUint16(14, true) || 1440);
        physicalWidth = Math.max(1, bounds.right - bounds.left) / inch * 25.4;
        physicalHeight = Math.max(1, bounds.bottom - bounds.top) / inch * 25.4;
        offset = 22;
      }
      if (offset + 18 > view.byteLength)
        return null;
      const fileSizeWords = view.getUint32(offset + 6, true);
      const objectCount = Math.max(1, view.getUint16(offset + 10, true) || 16);
      const declaredBytes = fileSizeWords > 0 ? fileSizeWords * 2 : view.byteLength;
      offset += 18;
      const width = Math.max(1, bounds.right - bounds.left);
      const height = Math.max(1, bounds.bottom - bounds.top);
      const state = initialState2(bounds);
      const objects = new Array(objectCount).fill(null);
      const elements = [];
      let shapeCount = 0;
      let records = 0;
      const maxRecords = options.maxRecords ?? 1e4;
      const maxShapes = options.maxShapes ?? 5e4;
      const endLimit = Math.min(view.byteLength, declaredBytes);
      const emit = (markup) => {
        if (!markup || shapeCount >= maxShapes)
          return;
        elements.push(markup);
        shapeCount++;
      };
      while (offset + 6 <= endLimit && records++ < maxRecords) {
        const sizeWords = view.getUint32(offset, true);
        const fn = view.getUint16(offset + 4, true);
        const end = offset + sizeWords * 2;
        if (sizeWords < 3 || end > view.byteLength)
          break;
        const params = offset + 6;
        switch (fn) {
          case META.EOF:
            offset = endLimit;
            break;
          case META.SETBKMODE:
            state.bkMode = readInt16(view, params);
            break;
          case META.SETBKCOLOR:
            state.bkColor = colorRefToCss2(readUint32Safe(view, params));
            break;
          case META.SETTEXTCOLOR:
            state.textColor = colorRefToCss2(readUint32Safe(view, params));
            break;
          case META.SETTEXTALIGN:
            state.textAlign = readUint16(view, params);
            break;
          case META.SETWINDOWORG:
            state.windowOrg = readPointYX(view, params);
            break;
          case META.SETWINDOWEXT:
            state.windowExt = readPointYX(view, params);
            if (!physicalWidth || !physicalHeight) {
              physicalWidth = Math.max(1, Math.abs(state.windowExt.x)) / 100;
              physicalHeight = Math.max(1, Math.abs(state.windowExt.y)) / 100;
            }
            break;
          case META.SETVIEWPORTORG:
            state.viewportOrg = readPointYX(view, params);
            break;
          case META.SETVIEWPORTEXT:
            state.viewportExt = readPointYX(view, params);
            break;
          case META.CREATEPENINDIRECT:
            storeObject(objects, parsePen(view, params, end));
            break;
          case META.CREATEBRUSHINDIRECT:
            storeObject(objects, parseBrush(view, params, end));
            break;
          case META.CREATEFONTINDIRECT:
            storeObject(objects, parseFont3(view, params, end));
            break;
          case META.SELECTOBJECT: {
            const handle = readUint16(view, params);
            const obj = handle >= 32768 ? STOCK_OBJECTS2[handle & 32767] : objects[handle];
            if (obj?.type == "pen") state.pen = { ...obj };
            else if (obj?.type == "brush") state.brush = { ...obj };
            else if (obj?.type == "font") state.font = { ...obj };
            break;
          }
          case META.DELETEOBJECT: {
            const handle = readUint16(view, params);
            if (handle < objects.length)
              objects[handle] = null;
            break;
          }
          case META.MOVETO:
            state.currentPoint = transformPoint2(state, readPointYX(view, params));
            break;
          case META.LINETO: {
            const p = transformPoint2(state, readPointYX(view, params));
            emit(`<path d="M ${fmt2(state.currentPoint.x)} ${fmt2(state.currentPoint.y)} L ${fmt2(p.x)} ${fmt2(p.y)}" ${strokeAttrs(state)}/>`);
            state.currentPoint = p;
            break;
          }
          case META.POLYLINE:
          case META.POLYGON:
            emitPolyline2(view, params, end, fn == META.POLYGON, state, emit);
            break;
          case META.RECTANGLE:
            emitRect2(view, params, state, emit, false);
            break;
          case META.ELLIPSE:
            emitRect2(view, params, state, emit, true);
            break;
          case META.TEXTOUT:
            emitTextOut(view, params, end, state, emit);
            break;
          case META.EXTTEXTOUT:
            emitExtTextOut2(view, params, end, state, emit);
            break;
        }
        offset = end;
      }
      if (!elements.length)
        return emptySvg2(width, height, bounds, physicalWidth, physicalHeight, "Unsupported WMF image");
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt2(physicalWidth)}mm" height="${fmt2(physicalHeight)}mm" viewBox="${fmt2(bounds.left)} ${fmt2(bounds.top)} ${fmt2(width)} ${fmt2(height)}" preserveAspectRatio="xMidYMid meet" data-docx-metafile="wmf">${elements.join("")}</svg>`;
    }
    function initialState2(bounds) {
      return {
        windowOrg: { x: bounds.left, y: bounds.top },
        windowExt: { x: Math.max(1, bounds.right - bounds.left), y: Math.max(1, bounds.bottom - bounds.top) },
        viewportOrg: { x: 0, y: 0 },
        viewportExt: null,
        currentPoint: { x: 0, y: 0 },
        pen: { type: "pen", color: "#000000", width: 1 },
        brush: { type: "brush", color: "#ffffff", nullBrush: true },
        font: { type: "font", family: "Times New Roman", size: 12, weight: 400, italic: false, underline: false, strike: false, charset: 0 },
        textColor: "#000000",
        bkColor: "#ffffff",
        bkMode: 1,
        textAlign: 0
      };
    }
    function transformPoint2(state, p) {
      const viewportExt = state.viewportExt ?? state.windowExt;
      const sx = safeRatio(viewportExt.x, state.windowExt.x);
      const sy = safeRatio(viewportExt.y, state.windowExt.y);
      return {
        x: state.viewportOrg.x + (p.x - state.windowOrg.x) * sx,
        y: state.viewportOrg.y + (p.y - state.windowOrg.y) * sy
      };
    }
    function transformScalarX(state, value) {
      const viewportExt = state.viewportExt ?? state.windowExt;
      return Math.abs(value * safeRatio(viewportExt.x, state.windowExt.x));
    }
    function transformScalarY(state, value) {
      const viewportExt = state.viewportExt ?? state.windowExt;
      return Math.abs(value * safeRatio(viewportExt.y, state.windowExt.y));
    }
    function safeRatio(a, b) {
      return b ? a / b : 1;
    }
    function parsePen(view, offset, end) {
      const style = readUint16(view, offset);
      const widthX = offset + 4 < end ? Math.abs(readInt16(view, offset + 2)) : 1;
      const widthY = offset + 6 < end ? Math.abs(readInt16(view, offset + 4)) : 0;
      const color = offset + 10 <= end ? colorRefToCss2(readUint32Safe(view, offset + 6)) : "#000000";
      return { type: "pen", color, width: Math.max(1, widthX, widthY), nullPen: (style & 15) == 5 };
    }
    function parseBrush(view, offset, end) {
      const style = readUint16(view, offset);
      const color = offset + 6 <= end ? colorRefToCss2(readUint32Safe(view, offset + 2)) : "#ffffff";
      return { type: "brush", color, nullBrush: style == 1 || style == 5 };
    }
    function parseFont3(view, offset, end) {
      const height = readInt16(view, offset);
      const width = readInt16(view, offset + 2);
      const weight = readInt16(view, offset + 8) || 400;
      const italic = readByte(view, offset + 10) != 0;
      const underline = readByte(view, offset + 11) != 0;
      const strike = readByte(view, offset + 12) != 0;
      const charset = readByte(view, offset + 13);
      const face = readNullTerminated(view, offset + 18, Math.max(0, Math.min(32, end - offset - 18)));
      return {
        type: "font",
        family: normalizeFontFamily(face) || "Times New Roman",
        size: Math.max(1, Math.abs(height || width || 12)),
        weight,
        italic,
        underline,
        strike,
        charset
      };
    }
    function emitPolyline2(view, offset, end, closed, state, emit) {
      const count = readUint16(view, offset);
      let pos = offset + 2;
      const points = [];
      for (let i = 0; i < count && pos + 4 <= end; i++, pos += 4)
        points.push(transformPoint2(state, { x: readInt16(view, pos), y: readInt16(view, pos + 2) }));
      if (!points.length)
        return;
      const d = points.map((p, i) => `${i == 0 ? "M" : "L"} ${fmt2(p.x)} ${fmt2(p.y)}`).join(" ") + (closed ? " Z" : "");
      emit(`<path d="${d}" ${closed ? paintAttrs2(state) : strokeAttrs(state)}/>`);
      state.currentPoint = points[points.length - 1];
    }
    function emitRect2(view, offset, state, emit, ellipse) {
      const bottomRight = transformPoint2(state, readPointYX(view, offset));
      const topLeft = transformPoint2(state, readPointYX(view, offset + 4));
      const x = Math.min(topLeft.x, bottomRight.x);
      const y = Math.min(topLeft.y, bottomRight.y);
      const width = Math.abs(bottomRight.x - topLeft.x);
      const height = Math.abs(bottomRight.y - topLeft.y);
      if (ellipse) {
        emit(`<ellipse cx="${fmt2(x + width / 2)}" cy="${fmt2(y + height / 2)}" rx="${fmt2(width / 2)}" ry="${fmt2(height / 2)}" ${paintAttrs2(state)}/>`);
      } else {
        emit(`<rect x="${fmt2(x)}" y="${fmt2(y)}" width="${fmt2(width)}" height="${fmt2(height)}" ${paintAttrs2(state)}/>`);
      }
    }
    function emitTextOut(view, offset, end, state, emit) {
      const count = readUint16(view, offset);
      const stringOffset = offset + 2;
      const alignedStringEnd = stringOffset + count + count % 2;
      if (alignedStringEnd + 4 > end)
        return;
      const text = decodeText(view, stringOffset, count, state.font.charset);
      const y = readInt16(view, alignedStringEnd);
      const x = readInt16(view, alignedStringEnd + 2);
      emitText2(text, resolveTextPoint(state, { x, y }), null, state, emit);
      advanceCurrentPoint(text, null, state);
    }
    function emitExtTextOut2(view, offset, end, state, emit) {
      const y = readInt16(view, offset);
      const x = readInt16(view, offset + 2);
      const count = readUint16(view, offset + 4);
      const options = readUint16(view, offset + 6);
      let pos = offset + 8;
      if (options & 6)
        pos += 8;
      if (pos + count > end)
        return;
      const text = decodeText(view, pos, count, state.font.charset);
      pos += count + count % 2;
      const dx = [];
      while (pos + 2 <= end && dx.length < count) {
        dx.push(readInt16(view, pos));
        pos += 2;
      }
      emitText2(text, resolveTextPoint(state, { x, y }), dx.length ? dx : null, state, emit);
      advanceCurrentPoint(text, dx.length ? dx : null, state);
    }
    function resolveTextPoint(state, declared) {
      if (state.textAlign & 1)
        return { ...state.currentPoint };
      return transformPoint2(state, declared);
    }
    function advanceCurrentPoint(text, dx, state) {
      if (!(state.textAlign & 1))
        return;
      const logicalAdvance = dx?.length ? dx.reduce((sum, value) => sum + value, 0) : text.length * state.font.size * 0.5;
      state.currentPoint = {
        x: state.currentPoint.x + transformScalarX(state, logicalAdvance),
        y: state.currentPoint.y
      };
    }
    function emitText2(text, point, dx, state, emit) {
      if (!text)
        return;
      const font = state.font;
      const size = Math.max(1, transformScalarY(state, font.size));
      const style = [
        `font-family:${quoteFont(font.family)}`,
        `font-size:${fmt2(size)}px`,
        `font-weight:${font.weight >= 600 ? "700" : font.weight}`,
        `font-style:${font.italic ? "italic" : "normal"}`
      ];
      const decorations = [];
      if (font.underline) decorations.push("underline");
      if (font.strike) decorations.push("line-through");
      if (decorations.length) style.push(`text-decoration:${decorations.join(" ")}`);
      const attrs = [
        `x="${fmt2(point.x)}"`,
        `y="${fmt2(point.y)}"`,
        `fill="${escAttr(state.textColor)}"`,
        `style="${escAttr(style.join(";"))}"`,
        `dominant-baseline="${(state.textAlign & 24) == 24 ? "alphabetic" : "text-before-edge"}"`,
        textAnchorAttr2(state.textAlign)
      ].filter(Boolean).join(" ");
      if (!dx || dx.length == 0) {
        emit(`<text ${attrs}>${esc2(text)}</text>`);
        return;
      }
      let x = point.x;
      const chars = Array.from(text);
      const tspans = chars.map((ch, i) => {
        const t = `<tspan x="${fmt2(x)}">${esc2(ch)}</tspan>`;
        x += transformScalarX(state, dx[i] ?? 0);
        return t;
      }).join("");
      emit(`<text ${attrs}>${tspans}</text>`);
    }
    function storeObject(objects, obj) {
      let index = objects.findIndex((x) => x == null);
      if (index < 0) {
        objects.push(obj);
        return;
      }
      objects[index] = obj;
    }
    function paintAttrs2(state) {
      return `${fillAttr(state)} ${strokeAttrs(state)}`;
    }
    function fillAttr(state) {
      if (state.brush?.nullBrush)
        return `fill="none"`;
      return `fill="${escAttr(state.brush?.color ?? "#ffffff")}"`;
    }
    function strokeAttrs(state) {
      if (state.pen?.nullPen)
        return `stroke="none"`;
      return `fill="none" stroke="${escAttr(state.pen?.color ?? "#000000")}" stroke-width="${fmt2(Math.max(0.5, transformScalarX(state, state.pen?.width ?? 1)))}"`;
    }
    function textAnchorAttr2(textAlign) {
      if (textAlign & 6)
        return `text-anchor="end"`;
      if (textAlign & 2)
        return `text-anchor="middle"`;
      return "";
    }
    function decodeText(view, offset, count, charset) {
      const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, Math.max(0, Math.min(count, view.byteLength - offset)));
      const preferred = charset == 2 ? "symbol" : charset == 134 ? "gb18030" : "windows-1252";
      try {
        return new TextDecoder(preferred).decode(bytes).replace(/\0+$/g, "");
      } catch {
        let result = "";
        for (const b of bytes)
          result += String.fromCharCode(b);
        return result.replace(/\0+$/g, "");
      }
    }
    function readPointYX(view, offset) {
      return { y: readInt16(view, offset), x: readInt16(view, offset + 2) };
    }
    function readByte(view, offset) {
      return offset < view.byteLength ? view.getUint8(offset) : 0;
    }
    function readUint16(view, offset) {
      return offset + 2 <= view.byteLength ? view.getUint16(offset, true) : 0;
    }
    function readInt16(view, offset) {
      return offset + 2 <= view.byteLength ? view.getInt16(offset, true) : 0;
    }
    function readUint32Safe(view, offset) {
      return offset + 4 <= view.byteLength ? view.getUint32(offset, true) : 0;
    }
    function readNullTerminated(view, offset, maxLength) {
      let result = "";
      for (let i = 0; i < maxLength && offset + i < view.byteLength; i++) {
        const b = view.getUint8(offset + i);
        if (b == 0)
          break;
        result += String.fromCharCode(b);
      }
      return result;
    }
    function normalizeFontFamily(name) {
      return (name ?? "").replace(/[^\x20-\x7e]/g, "").trim();
    }
    function quoteFont(name) {
      const safe = (name || "Times New Roman").replace(/["\\]/g, "");
      return /[\s,]/.test(safe) ? `"${safe}"` : safe;
    }
    function colorRefToCss2(value) {
      const r = value & 255;
      const g = value >> 8 & 255;
      const b = value >> 16 & 255;
      return `#${hex(r)}${hex(g)}${hex(b)}`;
    }
    function hex(v) {
      return Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
    }
    function toDataView2(data) {
      return new DataView(data.buffer, data.byteOffset, data.byteLength);
    }
    function fmt2(value) {
      if (!Number.isFinite(value))
        return "0";
      const rounded = Math.round(value * 1e3) / 1e3;
      return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
    }
    function esc2(value) {
      return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function escAttr(value) {
      return esc2(value).replace(/"/g, "&quot;");
    }
    function emptySvg2(width, height, bounds, physicalWidth, physicalHeight, message) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt2(physicalWidth)}mm" height="${fmt2(physicalHeight)}mm" viewBox="${fmt2(bounds.left)} ${fmt2(bounds.top)} ${fmt2(width)} ${fmt2(height)}" preserveAspectRatio="xMidYMid meet" data-docx-metafile="wmf"><rect x="${fmt2(bounds.left)}" y="${fmt2(bounds.top)}" width="${fmt2(width)}" height="${fmt2(height)}" fill="none" stroke="#999" stroke-width="1"/><text x="${fmt2(bounds.left + width / 2)}" y="${fmt2(bounds.top + height / 2)}" text-anchor="middle" font-size="12" fill="#666">${esc2(message)}</text></svg>`;
    }

    // src/word-document.ts
    var topLevelRels = [
      { type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" /* OfficeDocument */, target: "word/document.xml" },
      { type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" /* ExtendedProperties */, target: "docProps/app.xml" },
      { type: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" /* CoreProperties */, target: "docProps/core.xml" },
      { type: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/custom-properties" /* CustomProperties */, target: "docProps/custom.xml" }
    ];
    var WordDocument = class _WordDocument {
      constructor() {
        this.parts = [];
        this.partsMap = {};
        this.contentTypes = [];
        this._snapshotAssetDataUrls = null;
        this._snapshotTextParts = null;
      }
      /** 从 Worker 快照恢复 WordDocument，主要服务于 parseAsyncInWorker。 */
      static fromSnapshot(snapshot, options) {
        const d = new _WordDocument();
        d._options = options;
        d.rels = snapshot.rels ?? [];
        d.contentTypes = snapshot.contentTypes ?? [];
        d.parts = [];
        d.partsMap = {};
        d._snapshotAssetDataUrls = snapshot.assetDataUrls ?? {};
        d._snapshotTextParts = snapshot.textParts ?? {};
        d._package = {
          load: (path) => Promise.resolve(d._snapshotTextParts?.[normalizeSnapshotPath(path)] ?? null),
          parseXmlDocument: (txt) => parseXmlString(txt, options?.trimXmlDeclaration ?? true),
          get: (path) => d._snapshotTextParts?.[normalizeSnapshotPath(path)] != null ? {} : null
        };
        for (const partSnapshot of snapshot.parts ?? []) {
          const part = d.restoreSnapshotPart(partSnapshot);
          if (!part)
            continue;
          d.parts.push(part);
          d.partsMap[part.path] = part;
        }
        return d;
      }
      /** 打开 DOCX/ZIP 包并加载顶层关系指向的核心 part。 */
      static async load(blob, parser, options) {
        var d = new _WordDocument();
        d._options = options;
        d._parser = parser;
        d._package = await OpenXmlPackage.load(blob, options);
        d.rels = await d._package.loadRelationships();
        d.contentTypes = await d._package.loadContentTypes();
        await Promise.all(topLevelRels.map((rel) => {
          const r = d.rels.find((x) => x.type === rel.type) ?? rel;
          return d.loadRelationshipPart(r.target, r.type);
        }));
        return d;
      }
      restoreSnapshotPart(snapshot) {
        const part = {
          path: snapshot.path,
          rels: snapshot.rels ?? []
        };
        Object.assign(part, snapshot.data ?? {});
        switch (snapshot.kind) {
          case "document":
            this.documentPart = part;
            break;
          case "fontTable":
            this.fontTablePart = part;
            break;
          case "numbering":
            this.numberingPart = part;
            break;
          case "styles":
            this.stylesPart = part;
            break;
          case "theme":
            this.themePart = part;
            break;
          case "footnotes":
            this.footnotesPart = part;
            break;
          case "endnotes":
            this.endnotesPart = part;
            break;
          case "coreProps":
            this.corePropsPart = part;
            break;
          case "extendedProps":
            this.extendedPropsPart = part;
            break;
          case "settings":
            this.settingsPart = part;
            break;
          case "comments":
            part.commentMap = keyBy(part.comments ?? [], (x) => x.id);
            this.commentsPart = part;
            break;
          case "commentsExtended":
            part.commentMap = keyBy(part.comments ?? [], (x) => x.paraId);
            this.commentsExtendedPart = part;
            break;
        }
        return part;
      }
      async createSnapshot() {
        const snapshot = {
          rels: this.rels ?? [],
          contentTypes: this.contentTypes ?? [],
          parts: this.parts.map((p) => this.snapshotPart(p)).filter(Boolean),
          assetDataUrls: {},
          textParts: {}
        };
        await this.preloadSnapshotRelationshipTargets(snapshot);
        return snapshot;
      }
      snapshotPart(part) {
        const anyPart = part;
        let kind = "part";
        let data = {};
        if (part === this.documentPart) {
          kind = "document";
          data = { body: anyPart.body };
        } else if (part === this.fontTablePart) {
          kind = "fontTable";
          data = { fonts: anyPart.fonts };
        } else if (part === this.numberingPart) {
          kind = "numbering";
          data = { numberings: anyPart.numberings, abstractNumberings: anyPart.abstractNumberings, bulletPictures: anyPart.bulletPictures, domNumberings: anyPart.domNumberings };
        } else if (part === this.stylesPart) {
          kind = "styles";
          data = { styles: anyPart.styles };
        } else if (part === this.themePart) {
          kind = "theme";
          data = { theme: anyPart.theme };
        } else if (part === this.footnotesPart) {
          kind = "footnotes";
          data = { notes: anyPart.notes };
        } else if (part === this.endnotesPart) {
          kind = "endnotes";
          data = { notes: anyPart.notes };
        } else if (part === this.corePropsPart) {
          kind = "coreProps";
          data = { props: anyPart.props };
        } else if (part === this.extendedPropsPart) {
          kind = "extendedProps";
          data = { props: anyPart.props };
        } else if (part === this.settingsPart) {
          kind = "settings";
          data = { settings: anyPart.settings };
        } else if (part === this.commentsPart) {
          kind = "comments";
          data = { comments: anyPart.comments };
        } else if (part === this.commentsExtendedPart) {
          kind = "commentsExtended";
          data = { comments: anyPart.comments };
        } else if (anyPart.rootElement) {
          kind = anyPart.rootElement.type === "header" ? "header" : "footer";
          data = { rootElement: anyPart.rootElement };
        } else return null;
        return { kind, path: part.path, rels: part.rels ?? [], data };
      }
      async preloadSnapshotRelationshipTargets(snapshot) {
        const seen = /* @__PURE__ */ new Set();
        const collect = (part) => {
          for (const rel of part?.rels ?? []) {
            if (!rel || isExternalRelationship(rel))
              continue;
            const path = normalizeSnapshotPath(this.resolveRelationshipTarget(part, rel));
            if (!path || seen.has(path))
              continue;
            seen.add(path);
          }
        };
        for (const part of this.parts)
          collect(part);
        for (const path of seen) {
          if (this.partsMap[path])
            continue;
          const lower = path.toLowerCase();
          const isXmlLike = /\.(xml|rels|html?|txt)$/i.test(lower);
          try {
            if (isXmlLike) {
              const text = await this._package.load(path, "string");
              if (text != null)
                snapshot.textParts[path] = text;
            } else {
              const url = await this.loadPackageAssetDataUrl(path);
              if (url)
                snapshot.assetDataUrls[path] = url;
            }
          } catch (e) {
            if (this._options?.debug)
              console.warn(`docx-preview: unable to preload relationship target ${path}`, e);
          }
        }
      }
      blobWithContentType(blob, path) {
        if (!blob)
          return null;
        const contentType = this.contentTypeForPath(path);
        if (contentType)
          return new Blob([blob], { type: contentType });
        return blob;
      }
      save(type = "blob") {
        return this._package.save(type);
      }
      async loadRelationshipPart(path, type) {
        if (this.partsMap[path])
          return this.partsMap[path];
        if (!this._package.get(path))
          return null;
        let part = null;
        switch (type) {
          case "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" /* OfficeDocument */:
            this.documentPart = part = new DocumentPart(this._package, path, this._parser);
            break;
          case "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" /* FontTable */:
            this.fontTablePart = part = new FontTablePart(this._package, path);
            break;
          case "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" /* Numbering */:
            this.numberingPart = part = new NumberingPart(this._package, path, this._parser);
            break;
          case "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" /* Styles */:
            this.stylesPart = part = new StylesPart(this._package, path, this._parser);
            break;
          case "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" /* Theme */:
            this.themePart = part = new ThemePart(this._package, path);
            break;
          case "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" /* Footnotes */:
            this.footnotesPart = part = new FootnotesPart(this._package, path, this._parser);
            break;
          case "http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes" /* Endnotes */:
            this.endnotesPart = part = new EndnotesPart(this._package, path, this._parser);
            break;
          case "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" /* Footer */:
            part = new FooterPart(this._package, path, this._parser);
            break;
          case "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" /* Header */:
            part = new HeaderPart(this._package, path, this._parser);
            break;
          case "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" /* CoreProperties */:
            this.corePropsPart = part = new CorePropsPart(this._package, path);
            break;
          case "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" /* ExtendedProperties */:
            this.extendedPropsPart = part = new ExtendedPropsPart(this._package, path);
            break;
          case "http://schemas.openxmlformats.org/package/2006/relationships/metadata/custom-properties" /* CustomProperties */:
            part = new CustomPropsPart(this._package, path);
            break;
          case "http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" /* Settings */:
            this.settingsPart = part = new SettingsPart(this._package, path);
            break;
          case "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" /* Comments */:
            this.commentsPart = part = new CommentsPart(this._package, path, this._parser);
            break;
          case "http://schemas.microsoft.com/office/2011/relationships/commentsExtended" /* CommentsExtended */:
            this.commentsExtendedPart = part = new CommentsExtendedPart(this._package, path);
            break;
        }
        if (part == null)
          return Promise.resolve(null);
        this.partsMap[path] = part;
        this.parts.push(part);
        await part.load();
        if (part.rels?.length > 0) {
          const [folder] = splitPath(part.path);
          await Promise.all(part.rels.filter((rel) => !isExternalRelationship(rel)).map((rel) => this.loadRelationshipPart(resolvePath(rel.target, folder), rel.type)));
        }
        return part;
      }
      async loadRelationshipXml(id, part) {
        const sourcePart = part ?? this.documentPart;
        const rel = this.getRelById(sourcePart, id);
        if (!rel || isExternalRelationship(rel))
          return null;
        const path = this.resolveRelationshipTarget(sourcePart, rel);
        const normalizedPath = normalizeSnapshotPath(path);
        const xmlText = normalizedPath ? this._snapshotTextParts?.[normalizedPath] ?? await this._package.load(normalizedPath, "string") : null;
        return xmlText ? this._package.parseXmlDocument(xmlText) : null;
      }
      async loadRelationshipText(id, part) {
        const sourcePart = part ?? this.documentPart;
        const rel = this.getRelById(sourcePart, id);
        if (!rel || isExternalRelationship(rel))
          return null;
        const path = normalizeSnapshotPath(this.resolveRelationshipTarget(sourcePart, rel));
        return path ? Promise.resolve(this._snapshotTextParts?.[path] ?? this._package.load(path, "string")) : Promise.resolve(null);
      }
      async loadRelationshipBlobUrl(id, part, externalResourcePolicy = this._options?.externalResourcePolicy ?? "block") {
        const sourcePart = part ?? this.documentPart;
        const rel = this.getRelById(sourcePart, id);
        if (!rel)
          return null;
        if (isExternalRelationship(rel))
          return resolveExternalResourceTarget(rel, externalResourcePolicy);
        const path = normalizeSnapshotPath(this.resolveRelationshipTarget(sourcePart, rel));
        return path ? this.loadPackageAssetUrl(path) : null;
      }
      async loadDocumentImage(id, part, externalResourcePolicy = this._options?.externalResourcePolicy ?? "block") {
        const sourcePart = part ?? this.documentPart;
        const rel = this.getRelById(sourcePart, id);
        if (!rel)
          return null;
        if (isExternalRelationship(rel))
          return resolveExternalResourceTarget(rel, externalResourcePolicy);
        const path = normalizeSnapshotPath(this.resolveRelationshipTarget(sourcePart, rel));
        return path ? this.loadPackageAssetUrl(path) : null;
      }
      async loadNumberingImage(id) {
        const path = normalizeSnapshotPath(this.getPathById(this.numberingPart, id));
        return path ? this.loadPackageAssetUrl(path) : null;
      }
      async loadFont(id, key) {
        const path = normalizeSnapshotPath(this.getPathById(this.fontTablePart, id));
        if (!path) return null;
        if (this._snapshotAssetDataUrls?.[path]) return this._snapshotAssetDataUrls[path];
        const x = await this._package.load(path, "uint8array");
        return x ? this.blobToURL(new Blob([deobfuscate(x, key)]), path) : x;
      }
      async loadAltChunk(id, part) {
        const sourcePart = part ?? this.documentPart;
        const rel = this.getRelById(sourcePart, id);
        if (!rel || isExternalRelationship(rel))
          return Promise.resolve(null);
        const path = normalizeSnapshotPath(this.resolveRelationshipTarget(sourcePart, rel));
        return path ? Promise.resolve(this._snapshotTextParts?.[path] ?? this._package.load(path, "string")) : Promise.resolve(null);
      }
      blobToURL(blob, path) {
        if (!blob)
          return null;
        blob = this.blobWithContentType(blob, path);
        if (this._options.useBase64URL) {
          return blobToBase64(blob);
        }
        return URL.createObjectURL(blob);
      }
      async loadPackageAssetUrl(path) {
        const normalizedPath = normalizeSnapshotPath(path);
        if (!normalizedPath)
          return null;
        if (this._snapshotAssetDataUrls?.[normalizedPath])
          return this._snapshotAssetDataUrls[normalizedPath];
        if (this.isConvertibleMetafileAsset(normalizedPath)) {
          const data = await this._package.load(normalizedPath, "uint8array");
          if (!data)
            return null;
          const converted = this.convertMetafileAsset(data, normalizedPath);
          if (converted)
            return converted;
          return this.blobToURL(new Blob([data], { type: this.contentTypeForPath(normalizedPath) || this.defaultMetafileContentType(normalizedPath) }), normalizedPath);
        }
        return this.blobToURL(await this._package.load(normalizedPath, "blob"), normalizedPath);
      }
      async loadPackageAssetDataUrl(path) {
        const normalizedPath = normalizeSnapshotPath(path);
        if (!normalizedPath)
          return null;
        if (this.isConvertibleMetafileAsset(normalizedPath)) {
          const data = await this._package.load(normalizedPath, "uint8array");
          if (!data)
            return null;
          const converted = this.convertMetafileAsset(data, normalizedPath);
          if (converted)
            return converted;
          const fallback = data ? new Blob([data], { type: this.contentTypeForPath(normalizedPath) || this.defaultMetafileContentType(normalizedPath) }) : null;
          return fallback ? blobToBase64(fallback) : null;
        }
        const blob = await this._package.load(normalizedPath, "blob");
        const typedBlob = this.blobWithContentType(blob, normalizedPath);
        return typedBlob ? blobToBase64(typedBlob) : null;
      }
      convertMetafileAsset(data, path) {
        if (!data)
          return null;
        try {
          if (isEmfBinary(data))
            return convertEmfToSvgDataUrl(data);
          if (isWmfBinary(data))
            return convertWmfToSvgDataUrl(data);
        } catch (e) {
          if (this._options?.debug)
            console.warn(`docx-preview: unable to convert metafile asset ${path}`, e);
          return null;
        }
        return null;
      }
      isConvertibleMetafileAsset(path) {
        const contentType = this.contentTypeForPath(path).toLowerCase();
        return /\.(emf|wmf)$/i.test(path ?? "") || contentType == "image/x-emf" || contentType == "image/emf" || contentType == "image/x-wmf" || contentType == "image/wmf";
      }
      defaultMetafileContentType(path) {
        return /\.wmf$/i.test(path ?? "") ? "image/x-wmf" : "image/x-emf";
      }
      contentTypeForPath(path) {
        const normalizedPath = normalizeSnapshotPath(path ?? "");
        const lowerPath = normalizedPath.toLowerCase();
        for (const ct of this.contentTypes ?? []) {
          if (ct.partName && normalizeSnapshotPath(ct.partName).toLowerCase() == lowerPath)
            return ct.contentType ?? "";
        }
        const match = /\.([^.\/]+)$/.exec(lowerPath);
        const extension = match?.[1] ?? "";
        if (!extension)
          return "";
        const contentType = (this.contentTypes ?? []).find((ct) => ct.extension?.toLowerCase() == extension);
        return contentType?.contentType ?? "";
      }
      findPartByRelId(id, basePart = null) {
        var rel = this.getRelById(basePart, id);
        const path = rel && !isExternalRelationship(rel) ? this.resolveRelationshipTarget(basePart, rel) : null;
        return path ? this.partsMap[path] : null;
      }
      getRelById(part, id) {
        return (part?.rels ?? this.rels ?? []).find((x) => x.id == id);
      }
      getPathById(part, id) {
        const rel = this.getRelById(part, id);
        return rel && !isExternalRelationship(rel) ? this.resolveRelationshipTarget(part, rel) : null;
      }
      /** 解析 relationship target 为规范化包内路径。 */
      resolveRelationshipTarget(part, rel) {
        const [folder] = part ? splitPath(part.path) : [""];
        return normalizeSnapshotPath(resolvePath(rel.target, folder));
      }
    };
    function normalizeSnapshotPath(path) {
      if (!path)
        return path;
      return path.startsWith("/") ? path.substring(1) : path;
    }
    function deobfuscate(data, guidKey) {
      const len = 16;
      const trimmed = guidKey.replace(/{|}|-/g, "");
      const numbers = new Array(len);
      for (let i = 0; i < len; i++)
        numbers[len - i - 1] = parseInt(trimmed.substring(i * 2, i * 2 + 2), 16);
      for (let i = 0; i < 32; i++)
        data[i] = data[i] ^ numbers[i % len];
      return data;
    }

    // src/document/bookmarks.ts
    function parseBookmarkStart(elem, xml) {
      return {
        type: "bookmarkStart" /* BookmarkStart */,
        id: xml.attr(elem, "id"),
        name: xml.attr(elem, "name"),
        colFirst: xml.intAttr(elem, "colFirst"),
        colLast: xml.intAttr(elem, "colLast")
      };
    }
    function parseBookmarkEnd(elem, xml) {
      return {
        type: "bookmarkEnd" /* BookmarkEnd */,
        id: xml.attr(elem, "id")
      };
    }

    // src/vml/vml.ts
    var VmlElement = class extends OpenXmlElementBase {
      constructor() {
        super(...arguments);
        this.type = "vmlElement" /* VmlElement */;
        this.attrs = {};
      }
    };
    function parseVmlElement(elem, parser) {
      var result = new VmlElement();
      switch (elem.localName) {
        case "group":
          result.tagName = "g";
          result.isGroup = true;
          break;
        case "roundrect":
          result.roundRectArc = 0.2;
        case "rect":
          result.tagName = "rect";
          Object.assign(result.attrs, { width: "100%", height: "100%" });
          break;
        case "oval":
          result.tagName = "ellipse";
          Object.assign(result.attrs, { cx: "50%", cy: "50%", rx: "50%", ry: "50%" });
          break;
        case "line":
          result.tagName = "line";
          break;
        case "shape":
          result.tagName = "g";
          break;
        case "textbox":
          result.tagName = "foreignObject";
          result.textInset = ["0.1in", "0.05in", "0.1in", "0.05in"];
          Object.assign(result.attrs, { width: "100%", height: "100%" });
          break;
        default:
          return null;
      }
      for (const at of xml_parser_default.attrs(elem)) {
        switch (at.localName) {
          case "style":
            result.cssStyleText = at.value;
            result.cssStyle = parseCssRules(at.value);
            break;
          case "coordorigin":
            result.coordOrigin = parseNumericPoint(at.value);
            break;
          case "coordsize":
            result.coordSize = parseNumericPoint(at.value);
            break;
          case "arcsize":
            if (result.roundRectArc != null)
              result.roundRectArc = parseRoundRectArc(at.value);
            break;
          case "inset":
            if (result.textInset) {
              const values2 = at.value.trim().split(/\s*,\s*|\s+/);
              result.textInset = result.textInset.map((fallback, index) => values2[index] || fallback);
            }
            break;
          case "id":
            result.attrs.id = at.value;
            break;
          case "fillcolor":
            result.attrs.fill = at.value;
            break;
          case "strokecolor":
            result.attrs.stroke = at.value;
            break;
          case "strokeweight":
            result.attrs["stroke-width"] = convertLength(at.value, LengthUsage.Point) ?? at.value;
            break;
          case "filled":
            if (at.value == "f" || at.value == "false")
              result.attrs.fill = "none";
            break;
          case "stroked":
            if (at.value == "f" || at.value == "false")
              result.attrs.stroke = "none";
            break;
          case "path":
            result.tagName = "path";
            result.attrs.d = convertPath(at.value);
            break;
          case "from":
            const [x1, y1] = parsePoint(at.value);
            Object.assign(result.attrs, { x1, y1 });
            break;
          case "to":
            const [x2, y2] = parsePoint(at.value);
            Object.assign(result.attrs, { x2, y2 });
            break;
        }
      }
      for (const el of xml_parser_default.elements(elem)) {
        switch (el.localName) {
          case "stroke":
            Object.assign(result.attrs, parseStroke(el));
            break;
          case "fill":
            Object.assign(result.attrs, parseFill(el));
            break;
          case "imagedata":
            const imageId = xml_parser_default.attr(el, "id") ?? xml_parser_default.attr(el, "relid") ?? xml_parser_default.attr(el, "pict");
            if (imageId) {
              result.tagName = "image";
              Object.assign(result.attrs, vmlImageAttrs(el));
              result.imageHref = {
                id: imageId,
                title: xml_parser_default.attr(el, "title")
              };
            }
            break;
          case "txbxContent":
            result.children.push(...parser.parseBodyElements(el));
            break;
          default:
            const child = parseVmlElement(el, parser);
            child && result.children.push(child);
            break;
        }
      }
      const rotation = result.cssStyle?.rotation?.trim();
      if (rotation && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:fd|deg)?$/i.test(rotation)) {
        const angle = parseFloat(rotation) / (/fd$/i.test(rotation) ? 65536 : 1);
        if (Number.isFinite(angle))
          result.rotation = angle;
      }
      if (result.cssStyle?.position == "absolute") {
        const horizontal = result.cssStyle["mso-position-horizontal-relative"] ?? "paragraph";
        const vertical = result.cssStyle["mso-position-vertical-relative"] ?? "paragraph";
        const horizontalAlign = result.cssStyle["mso-position-horizontal"];
        const verticalAlign = result.cssStyle["mso-position-vertical"];
        result.props = {
          anchorPosition: {
            layoutInCell: !/^(f|false|0|off)$/i.test(xml_parser_default.attr(elem, "allowincell") ?? ""),
            horizontal: {
              relative: horizontal == "text" ? "column" : horizontal,
              align: horizontalAlign,
              alignSpecified: !!horizontalAlign && horizontalAlign != "absolute"
            },
            vertical: {
              relative: vertical == "text" ? "paragraph" : vertical,
              align: verticalAlign,
              alignSpecified: !!verticalAlign && verticalAlign != "absolute"
            }
          }
        };
      }
      return result;
    }
    function parseRoundRectArc(value) {
      const source = value.trim();
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:%|f)?$/i.test(source))
        return 0.2;
      const fraction = parseFloat(source) / (/%$/.test(source) ? 100 : /f$/i.test(source) ? 65536 : 1);
      return Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0.2;
    }
    function vmlImageAttrs(el) {
      const cropLeft = parseVmlFraction(xml_parser_default.attr(el, "cropleft"));
      const cropTop = parseVmlFraction(xml_parser_default.attr(el, "croptop"));
      const cropRight = parseVmlFraction(xml_parser_default.attr(el, "cropright"));
      const cropBottom = parseVmlFraction(xml_parser_default.attr(el, "cropbottom"));
      const cropWidth = Math.max(1e-4, 1 - cropLeft - cropRight);
      const cropHeight = Math.max(1e-4, 1 - cropTop - cropBottom);
      const attrs = {
        x: percent(-cropLeft / cropWidth),
        y: percent(-cropTop / cropHeight),
        width: percent(1 / cropWidth),
        height: percent(1 / cropHeight)
      };
      if (cropLeft || cropTop || cropRight || cropBottom)
        attrs.preserveAspectRatio = "none";
      return attrs;
    }
    function parseVmlFraction(value) {
      if (!value)
        return 0;
      const raw = String(value).trim();
      if (!raw)
        return 0;
      let result;
      if (/^-?\d+(\.\d+)?f$/i.test(raw)) {
        result = parseFloat(raw.slice(0, -1)) / 65536;
      } else if (raw.endsWith("%")) {
        result = parseFloat(raw) / 100;
      } else {
        result = parseFloat(raw);
      }
      if (!Number.isFinite(result))
        return 0;
      return Math.max(0, Math.min(0.9999, result));
    }
    function percent(value) {
      return `${Math.round(value * 1e5) / 1e3}%`;
    }
    function parseStroke(el) {
      const result = {};
      const color = xml_parser_default.attr(el, "color");
      const weight = xml_parser_default.attr(el, "weight");
      const on = xml_parser_default.attr(el, "on");
      if (on == "f" || on == "false")
        result.stroke = "none";
      else if (color)
        result.stroke = color;
      if (weight)
        result["stroke-width"] = convertLength(weight, LengthUsage.Point) ?? weight;
      else
        result["stroke-width"] = "1px";
      return result;
    }
    function parseFill(el) {
      const result = {};
      const color = xml_parser_default.attr(el, "color") ?? xml_parser_default.attr(el, "color2");
      const on = xml_parser_default.attr(el, "on");
      const opacity = xml_parser_default.attr(el, "opacity");
      if (on == "f" || on == "false")
        result.fill = "none";
      else if (color)
        result.fill = color;
      if (opacity)
        result["fill-opacity"] = opacity.endsWith("%") ? `${parseFloat(opacity) / 100}` : opacity;
      return result;
    }
    function parsePoint(val) {
      return val.trim().split(/[\s,]+/);
    }
    function parseNumericPoint(val) {
      const [x, y] = parsePoint(val).map((value) => Number(value));
      return [
        Number.isFinite(x) ? x : 0,
        Number.isFinite(y) ? y : 0
      ];
    }
    function convertPath(path) {
      return path.replace(/([mlxe])|([-\d]+)|([,])/g, (m) => {
        if (/[-\d]/.test(m)) return m;
        if (/[ml,]/.test(m)) return m;
        if (m == "x") return "z";
        return "";
      });
    }

    // src/comments/elements.ts
    var WmlComment = class extends OpenXmlElementBase {
      constructor() {
        super(...arguments);
        this.type = "comment" /* Comment */;
      }
    };
    var WmlCommentReference = class extends OpenXmlElementBase {
      constructor(id) {
        super();
        this.id = id;
        this.type = "commentReference" /* CommentReference */;
      }
    };
    var WmlCommentRangeStart = class extends OpenXmlElementBase {
      constructor(id) {
        super();
        this.id = id;
        this.type = "commentRangeStart" /* CommentRangeStart */;
      }
    };
    var WmlCommentRangeEnd = class extends OpenXmlElementBase {
      constructor(id) {
        super();
        this.id = id;
        this.type = "commentRangeEnd" /* CommentRangeEnd */;
      }
    };

    // src/display-address.ts
    function createParagraphAddressResolver() {
      const paths = /* @__PURE__ */ new WeakMap();
      const indexed = /* @__PURE__ */ new WeakSet();
      function path(node) {
        const cached = paths.get(node);
        if (cached) return cached;
        const parent = node.parentNode?.nodeType === 1 ? node.parentNode : null;
        if (!parent) {
          const value = `/${node.nodeName}`;
          paths.set(node, value);
          return value;
        }
        const prefix = path(parent);
        if (!indexed.has(parent)) {
          const groups = /* @__PURE__ */ new Map();
          for (const child of Array.from(parent.childNodes)) {
            if (child.nodeType !== 1) continue;
            const element = child;
            const key = `${element.namespaceURI}|${element.localName}`;
            const siblings = groups.get(key) ?? [];
            siblings.push(element);
            groups.set(key, siblings);
          }
          for (const siblings of groups.values()) siblings.forEach((sibling, index) => {
            paths.set(sibling, `${prefix}/${sibling.nodeName}${siblings.length > 1 ? `[${index + 1}]` : ""}`);
          });
          indexed.add(parent);
        }
        return paths.get(node);
      }
      return (node) => {
        if (node.localName !== "p" || node.namespaceURI !== "http://schemas.openxmlformats.org/wordprocessingml/2006/main") return void 0;
        const id = node.getAttributeNS("http://schemas.microsoft.com/office/word/2010/wordml", "paraId");
        return id ? `p:${id}` : `xpath:${path(node)}`;
      };
    }

    // src/document/paragraph-spacing.ts
    var WORD_PARAGRAPH_LINE_UNIT_PT = 12;
    function paragraphSpacingDeclaration(points, lines) {
      const lineValue = Number.isFinite(lines) && lines >= 0 ? `${(lines * WORD_PARAGRAPH_LINE_UNIT_PT / 100).toFixed(2)}pt` : null;
      const validPoints = /^(?:\d+(?:\.\d*)?|\.\d+)pt$/i.test(points ?? "");
      return { lines: lineValue, fallback: lines === 0 && validPoints ? points : lineValue ?? points };
    }
    var WORD_HTML_AUTO_SPACING_PT = 14;

    // src/document-parser.ts
    var autos = {
      shd: "inherit",
      color: "var(--docx-auto-color, black)",
      borderColor: "var(--docx-auto-color, black)",
      highlight: "transparent"
    };
    var supportedNamespaceURIs = [
      ns.wordprocessingShape,
      ns.wordprocessingCanvas,
      ns.wordprocessingGroup,
      ns.drawingml,
      ns.picture
    ];
    var mmlTagMap = {
      "oMath": "mmlMath" /* MmlMath */,
      "oMathPara": "mmlMathParagraph" /* MmlMathParagraph */,
      "f": "mmlFraction" /* MmlFraction */,
      "func": "mmlFunction" /* MmlFunction */,
      "fName": "mmlFunctionName" /* MmlFunctionName */,
      "num": "mmlNumerator" /* MmlNumerator */,
      "den": "mmlDenominator" /* MmlDenominator */,
      "rad": "mmlRadical" /* MmlRadical */,
      "deg": "mmlDegree" /* MmlDegree */,
      "e": "mmlBase" /* MmlBase */,
      "sSup": "mmlSuperscript" /* MmlSuperscript */,
      "sSub": "mmlSubscript" /* MmlSubscript */,
      "sPre": "mmlPreSubSuper" /* MmlPreSubSuper */,
      "sup": "mmlSuperArgument" /* MmlSuperArgument */,
      "sub": "mmlSubArgument" /* MmlSubArgument */,
      "d": "mmlDelimiter" /* MmlDelimiter */,
      "nary": "mmlNary" /* MmlNary */,
      "eqArr": "mmlEquationArray" /* MmlEquationArray */,
      "lim": "mmlLimit" /* MmlLimit */,
      "limLow": "mmlLimitLower" /* MmlLimitLower */,
      "limUpp": "mmlLimitUpper" /* MmlLimitUpper */,
      "sSubSup": "mmlSubSuperscript" /* MmlSubSuperscript */,
      "phant": "mmlPhantom" /* MmlPhantom */,
      "borderBox": "mmlBorderBox" /* MmlBorderBox */,
      "acc": "mmlAccent" /* MmlAccent */,
      "m": "mmlMatrix" /* MmlMatrix */,
      "mr": "mmlMatrixRow" /* MmlMatrixRow */,
      "box": "mmlBox" /* MmlBox */,
      "bar": "mmlBar" /* MmlBar */,
      "groupChr": "mmlGroupChar" /* MmlGroupChar */
    };
    var DocumentParser = class {
      constructor(options) {
        this.paragraphAddress = createParagraphAddressResolver();
        this.options = {
          ignoreWidth: false,
          debug: false,
          hideWebHiddenContent: false,
          ...options
        };
      }
      parseNotes(xmlDoc, elemName, elemClass) {
        var result = [];
        for (let el of xml_parser_default.elements(xmlDoc, elemName)) {
          const node = new elemClass();
          node.id = xml_parser_default.attr(el, "id");
          node.noteType = xml_parser_default.attr(el, "type");
          node.children = this.parseBodyElements(el);
          result.push(node);
        }
        return result;
      }
      parseComments(xmlDoc) {
        var result = [];
        for (let el of xml_parser_default.elements(xmlDoc, "comment")) {
          const item = new WmlComment();
          item.id = xml_parser_default.attr(el, "id");
          item.author = xml_parser_default.attr(el, "author");
          item.initials = xml_parser_default.attr(el, "initials");
          item.date = xml_parser_default.attr(el, "date");
          item.children = this.parseBodyElements(el);
          result.push(item);
        }
        return result;
      }
      /** 解析主文档 word/document.xml，输出包含正文和节属性的根节点。 */
      parseDocumentFile(xmlDoc) {
        var xbody = xml_parser_default.element(xmlDoc, "body");
        var background = xml_parser_default.element(xmlDoc, "background");
        var sectPr = xml_parser_default.element(xbody, "sectPr");
        const fill = background?.getElementsByTagNameNS("urn:schemas-microsoft-com:vml", "fill")?.[0];
        const imageId = fill?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
        return {
          type: "document" /* Document */,
          children: this.parseBodyElements(xbody),
          props: parseSectionProperties(sectPr, xml_parser_default),
          cssStyle: background ? this.parseBackground(background) : {},
          backgroundImage: imageId ? { id: imageId, type: fill.getAttribute("type") || "tile" } : void 0
        };
      }
      parseBackground(elem) {
        var result = {};
        var color = xmlUtil.colorAttr(elem, "color", null, autos.shd);
        if (color) {
          result["background-color"] = color;
        }
        return result;
      }
      /** 解析 body/header/footer/comment 等容器内的块级元素。 */
      parseBodyElements(element) {
        var children = [];
        for (const elem of xml_parser_default.elements(element)) {
          switch (elem.localName) {
            case "p":
              children.push(this.parseParagraph(elem));
              break;
            case "altChunk":
              children.push(this.parseAltChunk(elem));
              break;
            case "tbl":
              children.push(this.parseTable(elem));
              break;
            case "sdt":
              children.push(...this.parseSdt(elem, (e) => this.parseBodyElements(e)));
              break;
            case "ins":
              children.push(this.parseRevision("inserted" /* Inserted */, elem, (e) => ({ children: this.parseBodyElements(e) }), "insert"));
              break;
            case "del":
              children.push(this.parseRevision("deleted" /* Deleted */, elem, (e) => ({ children: this.parseBodyElements(e) }), "delete"));
              break;
            case "moveFrom":
              children.push(this.parseRevision("deleted" /* Deleted */, elem, (e) => ({ children: this.parseBodyElements(e) }), "move-from"));
              break;
            case "moveTo":
              children.push(this.parseRevision("inserted" /* Inserted */, elem, (e) => ({ children: this.parseBodyElements(e) }), "move-to"));
              break;
          }
        }
        return children;
      }
      /** 解析 styles.xml 中的样式定义，并保留继承关系供渲染阶段合并。 */
      parseStylesFile(xstyles) {
        var result = [];
        for (const n of xml_parser_default.elements(xstyles)) {
          switch (n.localName) {
            case "style":
              result.push(this.parseStyle(n));
              break;
            case "docDefaults":
              result.push(this.parseDefaultStyles(n));
              break;
          }
        }
        return result;
      }
      parseDefaultStyles(node) {
        var result = {
          id: null,
          name: null,
          target: null,
          basedOn: null,
          styles: []
        };
        for (const c of xml_parser_default.elements(node)) {
          switch (c.localName) {
            case "rPrDefault":
              var rPr = xml_parser_default.element(c, "rPr");
              if (rPr)
                result.styles.push({
                  target: "span",
                  values: this.parseDefaultProperties(rPr, {})
                });
              break;
            case "pPrDefault":
              var pPr = xml_parser_default.element(c, "pPr");
              if (pPr)
                result.styles.push({
                  target: "p",
                  values: this.parseDefaultProperties(pPr, {})
                });
              break;
          }
        }
        return result;
      }
      parseStyle(node) {
        var result = {
          id: xml_parser_default.attr(node, "styleId"),
          isDefault: xml_parser_default.boolAttr(node, "default"),
          name: null,
          target: null,
          basedOn: null,
          styles: [],
          linked: null
        };
        switch (xml_parser_default.attr(node, "type")) {
          case "paragraph":
            result.target = "p";
            break;
          case "table":
            result.target = "table";
            break;
          case "character":
            result.target = "span";
            break;
        }
        for (const n of xml_parser_default.elements(node)) {
          switch (n.localName) {
            case "basedOn":
              result.basedOn = xml_parser_default.attr(n, "val");
              break;
            case "name":
              result.name = xml_parser_default.attr(n, "val");
              break;
            case "link":
              result.linked = xml_parser_default.attr(n, "val");
              break;
            case "next":
              result.next = xml_parser_default.attr(n, "val");
              break;
            case "aliases":
              result.aliases = xml_parser_default.attr(n, "val").split(",");
              break;
            case "pPr":
              result.styles.push({
                target: "p",
                values: this.parseDefaultProperties(n, {})
              });
              result.paragraphProps = parseParagraphProperties(n, xml_parser_default);
              break;
            case "rPr":
              result.styles.push({
                target: "span",
                values: this.parseDefaultProperties(n, {})
              });
              result.runProps = parseRunProperties(n, xml_parser_default);
              break;
            case "tblPr":
            case "tcPr":
              result.styles.push({
                target: "td",
                //TODO: maybe move to processor
                values: this.parseDefaultProperties(n, {})
              });
              break;
            case "tblStylePr":
              for (let s of this.parseTableStyle(n))
                result.styles.push(s);
              break;
            case "rsid":
            case "qFormat":
            case "hidden":
            case "semiHidden":
            case "unhideWhenUsed":
            case "autoRedefine":
            case "uiPriority":
              break;
            default:
              this.options.debug && console.warn(`DOCX: Unknown style element: ${n.localName}`);
          }
        }
        return result;
      }
      parseTableStyle(node) {
        var result = [];
        var type = xml_parser_default.attr(node, "type");
        var selector = "";
        var modificator = "";
        switch (type) {
          case "firstRow":
            modificator = ".first-row";
            selector = "tr.first-row td";
            break;
          case "lastRow":
            modificator = ".last-row";
            selector = "tr.last-row td";
            break;
          case "firstCol":
            modificator = ".first-col";
            selector = "td.first-col";
            break;
          case "lastCol":
            modificator = ".last-col";
            selector = "td.last-col";
            break;
          case "band1Vert":
            modificator = ":not(.no-vband)";
            selector = "td.odd-col";
            break;
          case "band2Vert":
            modificator = ":not(.no-vband)";
            selector = "td.even-col";
            break;
          case "band1Horz":
            modificator = ":not(.no-hband)";
            selector = "tr.odd-row";
            break;
          case "band2Horz":
            modificator = ":not(.no-hband)";
            selector = "tr.even-row";
            break;
          default:
            return [];
        }
        for (const n of xml_parser_default.elements(node)) {
          switch (n.localName) {
            case "pPr":
              result.push({
                target: `${selector} p`,
                mod: modificator,
                values: this.parseDefaultProperties(n, {})
              });
              break;
            case "rPr":
              result.push({
                target: `${selector} span`,
                mod: modificator,
                values: this.parseDefaultProperties(n, {})
              });
              break;
            case "tblPr":
            case "tcPr":
              result.push({
                target: selector,
                //TODO: maybe move to processor
                mod: modificator,
                values: this.parseDefaultProperties(n, {})
              });
              break;
          }
        }
        return result;
      }
      parseNumberingFile(node) {
        const result = [];
        const bullets = [];
        const abstractLevels = {};
        const abstractNodes = [];
        const numberNodes = [];
        for (const n of xml_parser_default.elements(node)) {
          switch (n.localName) {
            case "numPicBullet":
              bullets.push(this.parseNumberingPicBullet(n));
              break;
            case "abstractNum":
              abstractNodes.push(n);
              break;
            case "num":
              numberNodes.push(n);
              break;
          }
        }
        for (const n of abstractNodes) {
          abstractLevels[xml_parser_default.attr(n, "abstractNumId")] = this.parseAbstractNumbering(n, bullets);
        }
        for (const n of numberNodes) {
          const numId = xml_parser_default.attr(n, "numId");
          const abstractNumId = xml_parser_default.elementAttr(n, "abstractNumId", "val");
          const levels = (abstractLevels[abstractNumId] ?? []).map((x) => this.cloneNumberingLevel(x, numId));
          for (const override of xml_parser_default.elements(n, "lvlOverride")) {
            const level = xml_parser_default.intAttr(override, "ilvl");
            const levelNode = xml_parser_default.element(override, "lvl");
            const startOverride = xml_parser_default.element(override, "startOverride");
            let target = levels.find((x) => x.level == level);
            if (levelNode) {
              target = this.parseNumberingLevel(numId, levelNode, bullets);
              const index = levels.findIndex((x) => x.level == level);
              if (index >= 0)
                levels[index] = target;
              else
                levels.push(target);
            }
            if (startOverride && target)
              target.start = xml_parser_default.intAttr(startOverride, "val", target.start);
          }
          result.push(...levels);
        }
        return result;
      }
      cloneNumberingLevel(level, id) {
        return {
          ...level,
          id,
          pStyle: { ...level.pStyle },
          rStyle: { ...level.rStyle },
          bullet: level.bullet ? { ...level.bullet } : null
        };
      }
      parseNumberingPicBullet(elem) {
        const id = xml_parser_default.intAttr(elem, "numPicBulletId");
        const pict = xml_parser_default.element(elem, "pict");
        const shape = pict && xml_parser_default.element(pict, "shape");
        const imagedata = shape && xml_parser_default.element(shape, "imagedata");
        if (imagedata) {
          return {
            id,
            src: xml_parser_default.attr(imagedata, "id"),
            style: xml_parser_default.attr(shape, "style")
          };
        }
        const drawing = xml_parser_default.element(elem, "drawing");
        const blip = drawing ? this.findDescendant(drawing, "blip") : null;
        if (blip) {
          const extent = drawing ? this.findDescendant(drawing, "extent") : null;
          const style = [];
          if (extent) {
            const width = xml_parser_default.lengthAttr(extent, "cx", LengthUsage.Emu);
            const height = xml_parser_default.lengthAttr(extent, "cy", LengthUsage.Emu);
            if (width)
              style.push(`width:${width};`);
            if (height)
              style.push(`height:${height};`);
          }
          return {
            id,
            src: xml_parser_default.attr(blip, "embed") ?? xml_parser_default.attr(blip, "link"),
            style: style.join("") || void 0
          };
        }
        return null;
      }
      parseAbstractNumbering(node, bullets) {
        var result = [];
        var id = xml_parser_default.attr(node, "abstractNumId");
        for (const n of xml_parser_default.elements(node)) {
          switch (n.localName) {
            case "lvl":
              result.push(this.parseNumberingLevel(id, n, bullets));
              break;
          }
        }
        return result;
      }
      parseNumberingLevel(id, node, bullets) {
        var result = {
          id,
          level: xml_parser_default.intAttr(node, "ilvl"),
          start: 1,
          pStyleName: void 0,
          pStyle: {},
          rStyle: {},
          suff: "tab"
        };
        for (const n of xml_parser_default.elements(node)) {
          switch (n.localName) {
            case "start":
              result.start = xml_parser_default.intAttr(n, "val");
              break;
            case "pPr":
              this.parseDefaultProperties(n, result.pStyle);
              break;
            case "rPr":
              this.parseDefaultProperties(n, result.rStyle);
              break;
            case "lvlPicBulletId":
              var bulletId = xml_parser_default.intAttr(n, "val");
              result.bullet = bullets.find((x) => x?.id == bulletId);
              break;
            case "lvlText":
              result.levelText = xml_parser_default.attr(n, "val");
              break;
            case "pStyle":
              result.pStyleName = xml_parser_default.attr(n, "val");
              break;
            case "numFmt":
              result.format = xml_parser_default.attr(n, "val");
              break;
            case "lvlRestart":
              result.restart = xml_parser_default.intAttr(n, "val");
              break;
            case "suff":
              result.suff = xml_parser_default.attr(n, "val");
              break;
          }
        }
        return result;
      }
      parseSdt(node, parser) {
        const sdtContent = xml_parser_default.element(node, "sdtContent");
        return sdtContent ? parser(sdtContent) : [];
      }
      parseInserted(node, parentParser) {
        return this.parseRevision("inserted" /* Inserted */, node, parentParser);
      }
      parseDeleted(node, parentParser) {
        return this.parseRevision("deleted" /* Deleted */, node, parentParser);
      }
      parseRevision(type, node, parentParser, kind = type == "inserted" /* Inserted */ ? "insert" : "delete") {
        return {
          type,
          children: parentParser(node)?.children ?? [],
          props: {
            revision: {
              id: xml_parser_default.attr(node, "id"),
              author: xml_parser_default.attr(node, "author"),
              date: xml_parser_default.attr(node, "date"),
              kind
            }
          }
        };
      }
      parseAltChunk(node) {
        return { type: "altChunk" /* AltChunk */, children: [], id: xml_parser_default.attr(node, "id") };
      }
      /** 解析单个段落，合并 pPr、run、超链接、书签、批注和复杂字段。 */
      parseParagraph(node) {
        var result = { type: "paragraph" /* Paragraph */, children: [] };
        if (this.options.exposeDisplayTargets) result.displayAddress = this.paragraphAddress(node);
        for (let el of xml_parser_default.elements(node)) {
          switch (el.localName) {
            case "pPr":
              this.parseParagraphProperties(el, result);
              break;
            case "r":
              result.children.push(this.parseRun(el, result));
              break;
            case "hyperlink":
              result.children.push(this.parseHyperlink(el, result));
              break;
            case "fldSimple":
              result.children.push(this.parseSimpleField(el, result));
              break;
            case "smartTag":
              result.children.push(this.parseSmartTag(el, result));
              break;
            case "bookmarkStart":
              result.children.push(parseBookmarkStart(el, xml_parser_default));
              break;
            case "bookmarkEnd":
              result.children.push(parseBookmarkEnd(el, xml_parser_default));
              break;
            case "commentRangeStart":
              result.children.push(new WmlCommentRangeStart(xml_parser_default.attr(el, "id")));
              break;
            case "commentRangeEnd":
              result.children.push(new WmlCommentRangeEnd(xml_parser_default.attr(el, "id")));
              break;
            case "oMath":
            case "oMathPara": {
              const math = this.parseMathElement(el);
              if (math)
                result.children.push(math);
              break;
            }
            case "sdt":
              result.children.push(...this.parseSdt(el, (e) => this.parseParagraph(e).children));
              break;
            case "ins":
              result.children.push(this.parseInserted(el, (e) => this.parseParagraph(e)));
              break;
            case "del":
              result.children.push(this.parseDeleted(el, (e) => this.parseParagraph(e)));
              break;
            case "moveFrom":
              result.children.push(this.parseRevision("deleted" /* Deleted */, el, (e) => this.parseParagraph(e), "move-from"));
              break;
            case "moveTo":
              result.children.push(this.parseRevision("inserted" /* Inserted */, el, (e) => this.parseParagraph(e), "move-to"));
              break;
          }
        }
        return result;
      }
      parseParagraphProperties(elem, paragraph) {
        this.parseDefaultProperties(elem, paragraph.cssStyle = {}, null, (c) => {
          if (c.localName == "rPr") {
            const paragraphMarkRevisions = xml_parser_default.elements(c).filter((item) => item.localName == "ins" || item.localName == "del").map((item) => this.revisionMetadata(item, item.localName == "del" ? "delete" : "insert"));
            if (paragraphMarkRevisions.length) {
              paragraph.props = {
                ...paragraph.props ?? {},
                paragraphMarkRevisions: [...paragraph.props?.paragraphMarkRevisions ?? [], ...paragraphMarkRevisions]
              };
            }
            if (paragraphMarkRevisions.some((item) => item.kind == "delete"))
              paragraph.props = { ...paragraph.props ?? {}, deletedParagraphMark: true };
            const background = paragraph.cssStyle["background-color"];
            this.parseDefaultProperties(c, paragraph.cssStyle);
            if (background == null)
              delete paragraph.cssStyle["background-color"];
            else
              paragraph.cssStyle["background-color"] = background;
            parseParagraphProperty(c, paragraph, xml_parser_default);
            return true;
          }
          if (c.localName == "pPrChange") {
            this.addFormatRevision(paragraph, c, "paragraph-format", elem);
            return true;
          }
          if (parseParagraphProperty(c, paragraph, xml_parser_default))
            return true;
          switch (c.localName) {
            case "pStyle":
              paragraph.styleName = xml_parser_default.attr(c, "val");
              break;
            case "cnfStyle":
              paragraph.className = values.classNameOfCnfStyle(c);
              break;
            case "framePr":
              this.parseFrame(c, paragraph);
              break;
            default:
              return false;
          }
          return true;
        });
      }
      parseFrame(node, paragraph) {
        const dropCap = xml_parser_default.attr(node, "dropCap");
        paragraph.frame = {
          dropCap,
          width: xml_parser_default.lengthAttr(node, "w"),
          height: xml_parser_default.lengthAttr(node, "h"),
          horizontalPosition: xml_parser_default.lengthAttr(node, "x"),
          verticalPosition: xml_parser_default.lengthAttr(node, "y"),
          horizontalAnchor: xml_parser_default.attr(node, "hAnchor"),
          verticalAnchor: xml_parser_default.attr(node, "vAnchor"),
          horizontalAlignment: xml_parser_default.attr(node, "xAlign"),
          verticalAlignment: xml_parser_default.attr(node, "yAlign"),
          horizontalSpace: xml_parser_default.lengthAttr(node, "hSpace"),
          verticalSpace: xml_parser_default.lengthAttr(node, "vSpace"),
          heightRule: xml_parser_default.attr(node, "hRule"),
          wrap: xml_parser_default.attr(node, "wrap"),
          lines: xml_parser_default.intAttr(node, "lines")
        };
        if (dropCap == "drop")
          paragraph.cssStyle["float"] = "left";
      }
      parseHyperlink(node, parent) {
        var result = { type: "hyperlink" /* Hyperlink */, parent, children: [] };
        result.anchor = xml_parser_default.attr(node, "anchor");
        result.id = xml_parser_default.attr(node, "id");
        for (const c of xml_parser_default.elements(node)) {
          switch (c.localName) {
            case "r":
              result.children.push(this.parseRun(c, result));
              break;
          }
        }
        return result;
      }
      parseSmartTag(node, parent) {
        var result = { type: "smartTag" /* SmartTag */, parent, children: [] };
        var uri = xml_parser_default.attr(node, "uri");
        var element = xml_parser_default.attr(node, "element");
        if (uri)
          result.uri = uri;
        if (element)
          result.element = element;
        for (const c of xml_parser_default.elements(node)) {
          switch (c.localName) {
            case "r":
              result.children.push(this.parseRun(c, result));
              break;
            case "smartTag":
              result.children.push(this.parseSmartTag(c, result));
              break;
          }
        }
        return result;
      }
      parseSimpleField(node, parent) {
        const result = {
          type: "simpleField" /* SimpleField */,
          parent,
          children: [],
          instruction: xml_parser_default.attr(node, "instr"),
          lock: xml_parser_default.boolAttr(node, "lock", false),
          dirty: xml_parser_default.boolAttr(node, "dirty", false)
        };
        for (const c of xml_parser_default.elements(node)) {
          switch (c.localName) {
            case "r":
              result.children.push(this.parseRun(c, result));
              break;
            case "hyperlink":
              result.children.push(this.parseHyperlink(c, result));
              break;
            case "smartTag":
              result.children.push(this.parseSmartTag(c, result));
              break;
            case "bookmarkStart":
              result.children.push(parseBookmarkStart(c, xml_parser_default));
              break;
            case "bookmarkEnd":
              result.children.push(parseBookmarkEnd(c, xml_parser_default));
              break;
            case "commentRangeStart":
              result.children.push(new WmlCommentRangeStart(xml_parser_default.attr(c, "id")));
              break;
            case "commentRangeEnd":
              result.children.push(new WmlCommentRangeEnd(xml_parser_default.attr(c, "id")));
              break;
            case "sdt":
              result.children.push(...this.parseSdt(c, (e) => this.parseParagraph(e).children));
              break;
            case "ins":
              result.children.push(this.parseInserted(c, (e) => this.parseParagraph(e)));
              break;
            case "del":
              result.children.push(this.parseDeleted(c, (e) => this.parseParagraph(e)));
              break;
            case "moveFrom":
              result.children.push(this.parseRevision("deleted" /* Deleted */, c, (e) => this.parseParagraph(e), "move-from"));
              break;
            case "moveTo":
              result.children.push(this.parseRevision("inserted" /* Inserted */, c, (e) => this.parseParagraph(e), "move-to"));
              break;
          }
        }
        return result;
      }
      /** 解析文本 run，将文本、制表符、换行、图片、字段和 run 属性收集到同一节点下。 */
      parseRun(node, parent) {
        var result = { type: "run" /* Run */, parent, children: [] };
        for (let c of xml_parser_default.elements(node)) {
          c = this.checkAlternateContent(c);
          if (!c)
            continue;
          switch (c.localName) {
            case "t":
              result.children.push({
                type: "text" /* Text */,
                text: c.textContent
              });
              break;
            case "delText":
              result.children.push({
                type: "deletedText" /* DeletedText */,
                text: c.textContent
              });
              break;
            case "commentReference":
              result.children.push(new WmlCommentReference(xml_parser_default.attr(c, "id")));
              break;
            case "fldSimple":
              result.children.push(this.parseSimpleField(c, result));
              break;
            case "instrText":
              result.fieldRun = true;
              result.children.push({
                type: "instruction" /* Instruction */,
                text: c.textContent
              });
              break;
            case "fldChar":
              result.fieldRun = true;
              result.children.push({
                type: "complexField" /* ComplexField */,
                charType: xml_parser_default.attr(c, "fldCharType"),
                lock: xml_parser_default.boolAttr(c, "lock", false),
                dirty: xml_parser_default.boolAttr(c, "dirty", false)
              });
              break;
            case "noBreakHyphen":
              result.children.push({ type: "noBreakHyphen" /* NoBreakHyphen */ });
              break;
            case "softHyphen":
              result.children.push({ type: "softHyphen" /* SoftHyphen */ });
              break;
            case "cr":
              result.children.push({
                type: "break" /* Break */,
                break: "line"
              });
              break;
            case "ptab":
              result.children.push({ type: "positionalTab" /* PositionalTab */ });
              break;
            case "br":
              result.children.push({
                type: "break" /* Break */,
                break: xml_parser_default.attr(c, "type") || "textWrapping"
              });
              break;
            case "lastRenderedPageBreak":
              result.children.push({
                type: "break" /* Break */,
                break: "lastRenderedPageBreak"
              });
              break;
            case "sym":
              result.children.push({
                type: "symbol" /* Symbol */,
                font: encloseFontFamily(xml_parser_default.attr(c, "font")),
                char: xml_parser_default.hexAttr(c, "char")
              });
              break;
            case "tab":
              result.children.push({ type: "tab" /* Tab */ });
              break;
            case "footnoteReference":
              result.children.push({
                type: "footnoteReference" /* FootnoteReference */,
                id: xml_parser_default.attr(c, "id"),
                customMarkFollows: xml_parser_default.boolAttr(c, "customMarkFollows", false)
              });
              break;
            case "endnoteReference":
              result.children.push({
                type: "endnoteReference" /* EndnoteReference */,
                id: xml_parser_default.attr(c, "id"),
                customMarkFollows: xml_parser_default.boolAttr(c, "customMarkFollows", false)
              });
              break;
            case "drawing":
              let d = this.parseDrawing(c);
              if (d)
                result.children.push(d);
              break;
            case "pict":
              result.children.push(this.parseVmlPicture(c));
              break;
            case "object":
              result.children.push(this.parseVmlPicture(c));
              break;
            case "ruby":
              result.children.push(this.parseRuby(c));
              break;
            case "rPr":
              this.parseRunProperties(c, result);
              break;
          }
        }
        return result;
      }
      parseRuby(elem) {
        const result = { type: "ruby" /* Ruby */, children: [] };
        for (const child of xml_parser_default.elements(elem)) {
          switch (child.localName) {
            case "rubyPr":
              for (const prop of xml_parser_default.elements(child)) {
                switch (prop.localName) {
                  case "rubyAlign":
                    result.align = xml_parser_default.attr(prop, "val");
                    break;
                }
              }
              break;
            case "rt":
              result.children.push(this.parseRubyContent(child, "rubyText" /* RubyText */));
              break;
            case "rubyBase":
              result.children.push(this.parseRubyContent(child, "rubyBase" /* RubyBase */));
              break;
          }
        }
        return result;
      }
      parseRubyContent(elem, type) {
        const result = { type, children: [] };
        for (const child of xml_parser_default.elements(elem)) {
          if (child.localName == "r")
            result.children.push(this.parseRun(child, result));
          else if (type == "rubyText" /* RubyText */ && child.localName == "rPr") {
            const hps = xml_parser_default.element(child, "hps");
            const hpsVal = hps ? xml_parser_default.intAttr(hps, "val", null) : null;
            if (hpsVal != null)
              result.cssStyle = { ...result.cssStyle ?? {}, fontSize: `${hpsVal / 2}pt` };
          }
        }
        return result;
      }
      parseMathElement(elem) {
        const propsTag = `${elem.localName}Pr`;
        const result = { type: mmlTagMap[elem.localName], children: [] };
        let hiddenRevision = false;
        const appendChild = (el) => {
          const childType = mmlTagMap[el.localName];
          if (childType) {
            const child = this.parseMathElement(el);
            if (child) {
              child.parent = result;
              result.children.push(child);
            } else {
              hiddenRevision = true;
            }
          } else if (el.localName == "r") {
            var run = this.parseRun(el, result);
            run.type = "mmlRun" /* MmlRun */;
            result.children.push(run);
          } else if (el.localName == propsTag) {
            result.props = this.parseMathProperies(el);
          } else if (el.localName == "ins") {
            for (const child of xml_parser_default.elements(el))
              appendChild(child);
          } else if (el.localName == "del") {
            if (this.options.renderChanges || this.options.reviewMode != null) {
              for (const child of xml_parser_default.elements(el))
                appendChild(child);
            } else {
              hiddenRevision = true;
            }
          }
        };
        for (const el of xml_parser_default.elements(elem))
          appendChild(el);
        if (hiddenRevision && !this.hasVisibleMathContent(result))
          return null;
        return result;
      }
      hasVisibleMathContent(elem) {
        for (const child of elem.children ?? []) {
          switch (child.type) {
            case "text" /* Text */:
              if (child.text?.length)
                return true;
              break;
            case "deletedText" /* DeletedText */:
              if ((this.options.renderChanges || this.options.reviewMode != null) && child.text?.length)
                return true;
              break;
            case "symbol" /* Symbol */:
            case "tab" /* Tab */:
            case "positionalTab" /* PositionalTab */:
            case "noBreakHyphen" /* NoBreakHyphen */:
            case "break" /* Break */:
              return true;
          }
          if (this.hasVisibleMathContent(child))
            return true;
        }
        return false;
      }
      parseMathProperies(elem) {
        const result = {};
        for (const el of xml_parser_default.elements(elem)) {
          switch (el.localName) {
            case "chr":
              result.char = xml_parser_default.attr(el, "val");
              break;
            case "vertJc":
              result.verticalJustification = xml_parser_default.attr(el, "val");
              break;
            case "pos":
              result.position = xml_parser_default.attr(el, "val");
              break;
            case "degHide":
              result.hideDegree = xml_parser_default.boolAttr(el, "val");
              break;
            case "begChr":
              result.beginChar = xml_parser_default.attr(el, "val");
              break;
            case "endChr":
              result.endChar = xml_parser_default.attr(el, "val");
              break;
            case "limLoc":
              result.limitLocation = xml_parser_default.attr(el, "val");
              break;
            case "grow":
              result.grow = xml_parser_default.boolAttr(el, "val");
              break;
            case "sepChr":
              result.separatorChar = xml_parser_default.attr(el, "val");
              break;
          }
        }
        return result;
      }
      parseRunProperties(elem, run) {
        this.parseDefaultProperties(elem, run.cssStyle = {}, null, (c) => {
          switch (c.localName) {
            case "rStyle":
              run.styleName = xml_parser_default.attr(c, "val");
              break;
            case "vertAlign":
              run.verticalAlign = values.valueOfVertAlign(c, true);
              break;
            case "rPrChange":
              this.addFormatRevision(run, c, "run-format", elem);
              break;
            default:
              return false;
          }
          return true;
        });
      }
      parseVmlPicture(elem) {
        const result = { type: "vmlPicture" /* VmlPicture */, children: [] };
        for (const el of xml_parser_default.elements(elem)) {
          const child = parseVmlElement(el, this);
          child && result.children.push(child);
        }
        return result;
      }
      checkAlternateContent(elem) {
        if (elem.localName != "AlternateContent")
          return elem;
        for (const choice of xml_parser_default.elements(elem).filter((x) => x.localName == "Choice")) {
          const requires = (xml_parser_default.attr(choice, "Requires") ?? "").split(/\s+/).filter(Boolean);
          const supported = requires.length > 0 && requires.every((prefix) => supportedNamespaceURIs.includes(elem.lookupNamespaceURI(prefix)));
          if (supported) {
            const selected = xml_parser_default.elements(choice)[0];
            if (selected)
              return selected;
          }
        }
        const fallback = xml_parser_default.element(elem, "Fallback");
        return fallback ? xml_parser_default.elements(fallback)[0] : null;
      }
      /** 解析 DrawingML 图片/形状/图表/SmartArt，并处理浮动定位与环绕方式。 */
      parseDrawing(node) {
        for (var n of xml_parser_default.elements(node)) {
          switch (n.localName) {
            case "inline":
            case "anchor":
              return this.parseDrawingWrapper(n);
          }
        }
      }
      parseDrawingWrapper(node) {
        var _a;
        var result = { type: "drawing" /* Drawing */, children: [], cssStyle: {}, props: {} };
        var isAnchor = node.localName == "anchor";
        const wrapDistances = {
          left: xml_parser_default.lengthAttr(node, "distL", LengthUsage.Emu),
          top: xml_parser_default.lengthAttr(node, "distT", LengthUsage.Emu),
          right: xml_parser_default.lengthAttr(node, "distR", LengthUsage.Emu),
          bottom: xml_parser_default.lengthAttr(node, "distB", LengthUsage.Emu)
        };
        const addMargin = (prop, value) => {
          if (value)
            result.cssStyle[prop] = values.addSize(result.cssStyle[prop], value);
        };
        let wrapType = null;
        let wrapText = null;
        let wrapPolygon = null;
        let simplePos = xml_parser_default.boolAttr(node, "simplePos", false);
        let behindDoc = xml_parser_default.boolAttr(node, "behindDoc", false);
        let relativeHeight = xml_parser_default.intAttr(node, "relativeHeight", null);
        if (relativeHeight != null)
          result.cssStyle["z-index"] = `${Math.max(1, Math.round(relativeHeight / 1e3))}`;
        if (behindDoc)
          result.cssStyle["z-index"] = "0";
        let posX = { relative: "page", align: "left", offset: "0" };
        let posY = { relative: "page", align: "top", offset: "0" };
        let posXAlignSpecified = false;
        let posYAlignSpecified = false;
        let posXOffsetSpecified = false;
        let posYOffsetSpecified = false;
        for (var n of xml_parser_default.elements(node)) {
          switch (n.localName) {
            case "simplePos":
              if (simplePos) {
                posX.offset = xml_parser_default.lengthAttr(n, "x", LengthUsage.Emu);
                posY.offset = xml_parser_default.lengthAttr(n, "y", LengthUsage.Emu);
                posXOffsetSpecified = posX.offset != null;
                posYOffsetSpecified = posY.offset != null;
              }
              break;
            case "extent":
              result.cssStyle["width"] = xml_parser_default.lengthAttr(n, "cx", LengthUsage.Emu);
              result.cssStyle["height"] = xml_parser_default.lengthAttr(n, "cy", LengthUsage.Emu);
              break;
            case "effectExtent":
              addMargin("margin-left", xml_parser_default.lengthAttr(n, "l", LengthUsage.Emu));
              addMargin("margin-top", xml_parser_default.lengthAttr(n, "t", LengthUsage.Emu));
              addMargin("margin-right", xml_parser_default.lengthAttr(n, "r", LengthUsage.Emu));
              addMargin("margin-bottom", xml_parser_default.lengthAttr(n, "b", LengthUsage.Emu));
              break;
            case "docPr":
              result.props.title = xml_parser_default.attr(n, "title") ?? xml_parser_default.attr(n, "name");
              result.props.alt = xml_parser_default.attr(n, "descr") ?? result.props.title;
              break;
            case "positionH":
            case "positionV":
              if (!simplePos) {
                let isHorizontalPosition = n.localName == "positionH";
                let pos = isHorizontalPosition ? posX : posY;
                var alignNode = xml_parser_default.element(n, "align");
                var offsetNode = xml_parser_default.element(n, "posOffset");
                pos.relative = xml_parser_default.attr(n, "relativeFrom") ?? pos.relative;
                if (alignNode) {
                  pos.align = alignNode.textContent;
                  if (isHorizontalPosition)
                    posXAlignSpecified = true;
                  else
                    posYAlignSpecified = true;
                }
                if (offsetNode) {
                  pos.offset = convertLength(offsetNode.textContent, LengthUsage.Emu);
                  if (isHorizontalPosition)
                    posXOffsetSpecified = pos.offset != null;
                  else
                    posYOffsetSpecified = pos.offset != null;
                }
              }
              break;
            case "wrapTopAndBottom":
              wrapType = "wrapTopAndBottom";
              break;
            case "wrapNone":
              wrapType = "wrapNone";
              break;
            case "wrapSquare":
              wrapType = "wrapSquare";
              wrapText = xml_parser_default.attr(n, "wrapText");
              break;
            case "wrapTight":
              wrapType = "wrapTight";
              wrapText = xml_parser_default.attr(n, "wrapText");
              wrapPolygon = this.parseWrapPolygon(n);
              break;
            case "wrapThrough":
              wrapType = "wrapThrough";
              wrapText = xml_parser_default.attr(n, "wrapText");
              wrapPolygon = this.parseWrapPolygon(n);
              break;
            case "graphic":
              var g = this.parseGraphic(n);
              if (g) {
                if (g.type == "image" /* Image */) {
                  g.alt ?? (g.alt = result.props.alt);
                  g.title ?? (g.title = result.props.title);
                } else if (g.type == "shape" /* Shape */) {
                  g.alt ?? (g.alt = result.props.alt);
                  g.title ?? (g.title = result.props.title);
                } else if (g.type == "chart" /* Chart */) {
                  g.alt ?? (g.alt = result.props.alt);
                  g.title ?? (g.title = result.props.title);
                } else if (g.type == "smartArt" /* SmartArt */) {
                  g.alt ?? (g.alt = result.props.alt);
                  g.title ?? (g.title = result.props.title);
                } else if (g.type == "ink" /* Ink */) {
                  g.alt ?? (g.alt = result.props.alt);
                  g.title ?? (g.title = result.props.title);
                }
                result.children.push(g);
              }
              break;
          }
        }
        result.props.anchorPosition = {
          horizontal: { ...posX, offsetSpecified: posXOffsetSpecified, alignSpecified: posXAlignSpecified },
          vertical: { ...posY, offsetSpecified: posYOffsetSpecified, alignSpecified: posYAlignSpecified },
          wrapType,
          layoutInCell: xml_parser_default.boolAttr(node, "layoutInCell", true),
          simplePos
        };
        if (wrapType != "wrapNone") {
          addMargin("margin-left", wrapDistances.left);
          addMargin("margin-top", wrapDistances.top);
          addMargin("margin-right", wrapDistances.right);
          addMargin("margin-bottom", wrapDistances.bottom);
        }
        const applyHorizontalAlignment = () => {
          switch (posX.align) {
            case "center":
              result.cssStyle["margin-left"] = "auto";
              result.cssStyle["margin-right"] = "auto";
              break;
            case "right":
              result.cssStyle["margin-left"] = "auto";
              break;
          }
        };
        const applyHorizontalPosition = () => {
          if (posXAlignSpecified)
            applyHorizontalAlignment();
          else if (posXOffsetSpecified && posX.offset)
            result.cssStyle["margin-inline-start"] = values.addSize(result.cssStyle["margin-inline-start"], posX.offset);
        };
        const applyVerticalPositionOffset = () => {
          if (posYOffsetSpecified && posY.offset)
            result.cssStyle["margin-top"] = values.addSize(result.cssStyle["margin-top"], posY.offset);
        };
        if (wrapType == "wrapTopAndBottom") {
          result.cssStyle["display"] = "block";
          result.cssStyle["clear"] = "both";
          applyHorizontalPosition();
          applyVerticalPositionOffset();
        } else if (wrapType == "wrapNone") {
          result.cssStyle["display"] = "block";
          result.cssStyle["position"] = isAnchor ? "absolute" : "relative";
          if (posX.offset)
            result.cssStyle["left"] = posX.offset;
          if (posY.offset)
            result.cssStyle["top"] = posY.offset;
        } else if (wrapType == "wrapSquare" || wrapType == "wrapTight" || wrapType == "wrapThrough") {
          if (wrapPolygon) {
            result.cssStyle["shape-outside"] = wrapPolygon;
            (_a = result.cssStyle)["clip-path"] ?? (_a["clip-path"] = wrapPolygon);
          }
          if (wrapText == "left") {
            result.cssStyle["float"] = "right";
          } else if (wrapText == "right") {
            result.cssStyle["float"] = "left";
          } else if (posX.align == "left" || posX.align == "right") {
            result.cssStyle["float"] = posX.align;
          } else {
            result.cssStyle["display"] = "block";
            applyHorizontalAlignment();
          }
        } else if (isAnchor && (posX.align == "left" || posX.align == "right")) {
          result.cssStyle["float"] = posX.align;
        } else {
          result.cssStyle["vertical-align"] = "text-bottom";
        }
        return this.applyDrawingFloatOffsets(result, node);
      }
      /** Map explicit column/paragraph offsets onto the float exclusion box. */
      applyDrawingFloatOffsets(drawing, wrapper) {
        const style = drawing.cssStyle;
        const anchor = drawing.props?.anchorPosition;
        if (!style?.float || !anchor) return drawing;
        const hasOffset = (direction) => {
          if (anchor.simplePos) return true;
          const position = xml_parser_default.element(wrapper, `position${direction}`);
          return !!position && !!xml_parser_default.element(position, "posOffset");
        };
        const length = /^-?\d+(?:\.\d+)?(?:pt|px|in|cm|mm)?$/;
        const horizontal = anchor.horizontal, vertical = anchor.vertical;
        if (hasOffset("H") && horizontal?.relative == "column" && length.test(horizontal.offset ?? "") && length.test(style.width ?? "")) {
          style["--docx-float-column-position"] = horizontal.offset;
          style["--docx-float-origin-offset"] = "0px";
          if (style.float == "right")
            style["margin-right"] = `calc(100% - ${horizontal.offset} - ${style.width} - var(--docx-float-origin-offset, 0px))`;
          else if (style.float == "left")
            style["margin-left"] = `calc(${horizontal.offset} + var(--docx-float-origin-offset, 0px))`;
        }
        if (hasOffset("V") && vertical?.relative == "paragraph" && length.test(vertical.offset ?? ""))
          style["margin-top"] = vertical.offset;
        return drawing;
      }
      parseWrapPolygon(elem) {
        const polygon = xml_parser_default.element(elem, "wrapPolygon");
        if (!polygon)
          return null;
        const points = [];
        const addPoint = (pt) => {
          const x = xml_parser_default.lengthAttr(pt, "x", LengthUsage.Emu);
          const y = xml_parser_default.lengthAttr(pt, "y", LengthUsage.Emu);
          if (x && y)
            points.push(`${x} ${y}`);
        };
        for (const n of xml_parser_default.elements(polygon)) {
          if (n.localName == "start" || n.localName == "lineTo")
            addPoint(n);
        }
        return points.length >= 3 ? `polygon(${points.join(", ")})` : null;
      }
      parseGraphic(elem) {
        var graphicData = xml_parser_default.element(elem, "graphicData");
        if (!graphicData)
          return null;
        for (let n of xml_parser_default.elements(graphicData)) {
          switch (n.localName) {
            case "pic":
              return this.parsePicture(n);
            case "wpc":
            case "wgp":
            case "grpSp":
              return this.parseDrawingContainer(n);
            case "wsp":
            case "sp":
            case "cxnSp":
              return this.parseWordprocessingShape(n);
            case "chart":
              return this.parseChartReference(n);
            case "relIds":
              return this.parseSmartArtReference(n);
            case "diagram":
              return this.parseSmartArtReference(n);
            case "contentPart":
            case "ink":
              return this.parseInkReference(n);
          }
        }
        const contentPart = this.findDescendant(graphicData, "contentPart");
        if (contentPart)
          return this.parseInkReference(contentPart);
        return null;
      }
      parseDrawingContainer(elem, parentTransform) {
        const result = {
          type: "shape" /* Shape */,
          children: [],
          cssStyle: {
            "display": "inline-block",
            "position": "relative",
            "width": "100%",
            "height": "100%",
            "overflow": "visible",
            "box-sizing": "border-box"
          },
          props: { dmlContainer: true }
        };
        const transform = this.parseDmlGroupTransform(elem, parentTransform);
        for (const child of xml_parser_default.elements(elem)) {
          switch (child.localName) {
            case "wsp":
            case "sp":
            case "cxnSp":
              const shape = this.parseDmlPositionedShape(child, transform);
              if (shape)
                result.children.push(shape);
              break;
            case "pic":
              const picture = this.parseDmlPositionedPicture(child, transform);
              if (picture)
                result.children.push(picture);
              break;
            case "grpSp":
            case "wgp":
              const group = this.parseDrawingContainer(child, transform);
              if (group)
                result.children.push(group);
              break;
          }
        }
        return result;
      }
      parseDmlGroupTransform(elem, parentTransform) {
        const groupProps = xml_parser_default.element(elem, "grpSpPr");
        const xfrm = groupProps ? xml_parser_default.element(groupProps, "xfrm") : xml_parser_default.element(elem, "xfrm");
        const off = xfrm ? xml_parser_default.element(xfrm, "off") : null;
        const ext = xfrm ? xml_parser_default.element(xfrm, "ext") : null;
        const chOff = xfrm ? xml_parser_default.element(xfrm, "chOff") : null;
        const chExt = xfrm ? xml_parser_default.element(xfrm, "chExt") : null;
        const extCx = ext ? xml_parser_default.floatAttr(ext, "cx", null) : null;
        const extCy = ext ? xml_parser_default.floatAttr(ext, "cy", null) : null;
        const chExtCx = chExt ? xml_parser_default.floatAttr(chExt, "cx", null) : null;
        const chExtCy = chExt ? xml_parser_default.floatAttr(chExt, "cy", null) : null;
        const parentScaleX = parentTransform?.scaleX ?? 1;
        const parentScaleY = parentTransform?.scaleY ?? 1;
        const groupOffX = off ? xml_parser_default.floatAttr(off, "x", 0) : 0;
        const groupOffY = off ? xml_parser_default.floatAttr(off, "y", 0) : 0;
        const originX = parentTransform ? parentTransform.originX + (groupOffX - parentTransform.offsetX) * parentScaleX : 0;
        const originY = parentTransform ? parentTransform.originY + (groupOffY - parentTransform.offsetY) * parentScaleY : 0;
        return {
          originX,
          originY,
          offsetX: chOff ? xml_parser_default.floatAttr(chOff, "x", 0) : 0,
          offsetY: chOff ? xml_parser_default.floatAttr(chOff, "y", 0) : 0,
          scaleX: parentScaleX * (extCx && chExtCx ? extCx / chExtCx : 1),
          scaleY: parentScaleY * (extCy && chExtCy ? extCy / chExtCy : 1)
        };
      }
      parseDmlPositionedPicture(elem, transform) {
        const result = this.parsePicture(elem);
        const spPr = xml_parser_default.element(elem, "spPr");
        if (!result || !spPr)
          return result;
        const bounds = this.parseDmlShapeBounds(spPr, transform);
        result.cssStyle["position"] = "absolute";
        result.cssStyle["left"] = this.pt(bounds.left);
        result.cssStyle["top"] = this.pt(bounds.top);
        result.cssStyle["width"] = this.pt(bounds.width);
        result.cssStyle["height"] = this.pt(bounds.height);
        return result;
      }
      parseDmlPositionedShape(elem, transform) {
        const spPr = xml_parser_default.element(elem, "spPr");
        if (!spPr)
          return null;
        const bounds = this.parseDmlShapeBounds(spPr, transform);
        const textChildren = [];
        let bodyPr = null;
        let hasTextBody = false;
        for (const n of xml_parser_default.elements(elem)) {
          switch (n.localName) {
            case "txbx":
            case "textBox":
              hasTextBody = true;
              for (const txbxContent of xml_parser_default.elements(n, "txbxContent"))
                textChildren.push(...this.parseBodyElements(txbxContent));
              break;
            case "bodyPr":
              bodyPr = n;
              break;
          }
        }
        bodyPr ?? (bodyPr = xml_parser_default.element(elem, "bodyPr"));
        const cssStyle = {
          "position": "absolute",
          "left": this.pt(bounds.left),
          "top": this.pt(bounds.top),
          "width": this.pt(bounds.width),
          "height": this.pt(bounds.height),
          "box-sizing": "border-box",
          "overflow": "hidden"
        };
        const cNvPr = xml_parser_default.element(elem, "cNvPr");
        const geom = xml_parser_default.element(spPr, "custGeom");
        const prstGeom = xml_parser_default.element(spPr, "prstGeom");
        const fillStyle = this.parseDmlFillStyle(spPr);
        const lineStyle = this.parseDmlLineStyle(xml_parser_default.element(spPr, "ln"));
        const roundedRadius = !geom ? this.parseDmlRoundRectRadius(spPr, bounds.width, bounds.height, transform) : null;
        if (roundedRadius != null)
          cssStyle["border-radius"] = roundedRadius;
        if (geom) {
          const path = this.parseDmlCustomGeometry(geom);
          return {
            type: "shape" /* Shape */,
            children: [],
            cssStyle: { ...cssStyle, "overflow": "visible" },
            props: {
              dmlSvg: true,
              viewBox: path?.viewBox ?? "0 0 1 1",
              pathD: path?.d ?? "",
              fill: fillStyle.fill ?? "none",
              stroke: lineStyle.stroke ?? "none",
              strokeWidth: lineStyle.strokeWidth ?? "0",
              strokeDasharray: lineStyle.strokeDasharray
            },
            title: cNvPr ? xml_parser_default.attr(cNvPr, "title") ?? xml_parser_default.attr(cNvPr, "name") : null,
            alt: cNvPr ? xml_parser_default.attr(cNvPr, "descr") : null
          };
        }
        if (fillStyle.backgroundColor)
          cssStyle["background-color"] = fillStyle.backgroundColor;
        if (fillStyle.backgroundImage)
          cssStyle["background-image"] = fillStyle.backgroundImage;
        if (lineStyle.stroke && lineStyle.stroke != "none")
          cssStyle["border"] = `${lineStyle.strokeWidth || "0.75pt"} ${lineStyle.borderType || "solid"} ${lineStyle.stroke}`;
        else
          cssStyle["border"] = "none";
        const textBoxProps = hasTextBody ? this.parseDmlTextBoxProperties(bodyPr) : null;
        return {
          type: "shape" /* Shape */,
          children: textChildren,
          cssStyle,
          props: { dmlShape: true, presetGeometry: prstGeom ? xml_parser_default.attr(prstGeom, "prst") : null, ...textBoxProps },
          title: cNvPr ? xml_parser_default.attr(cNvPr, "title") ?? xml_parser_default.attr(cNvPr, "name") : null,
          alt: cNvPr ? xml_parser_default.attr(cNvPr, "descr") : null
        };
      }
      parseDmlRoundRectRadius(spPr, width, height, transform) {
        const preset = xml_parser_default.element(spPr, "prstGeom");
        if (!preset || xml_parser_default.attr(preset, "prst") != "roundRect")
          return null;
        const guides = xml_parser_default.element(preset, "avLst");
        const adjustment = (guides ? xml_parser_default.elements(guides, "gd") : []).find((guide) => xml_parser_default.attr(guide, "name") == "adj");
        const formula = adjustment ? xml_parser_default.attr(adjustment, "fmla") : "";
        const value = /^val\s+[+-]?(?:\d+(?:\.\d*)?|\.\d+)\s*$/.test(formula ?? "") ? Number(formula.trim().split(/\s+/)[1]) : 16667;
        const fraction = Math.max(0, Math.min(5e4, value)) / 1e5;
        const scaleX = Math.abs(transform?.scaleX ?? 1);
        const scaleY = Math.abs(transform?.scaleY ?? 1);
        const radius = Number.isFinite(scaleX) && Number.isFinite(scaleY) && scaleX > 0 && scaleY > 0 ? Math.min(width / scaleX, height / scaleY) * fraction : 0;
        return `${this.pt(Number.isFinite(radius * scaleX) ? radius * scaleX : 0)} / ${this.pt(Number.isFinite(radius * scaleY) ? radius * scaleY : 0)}`;
      }
      parseDmlShapeBounds(spPr, transform) {
        const xfrm = xml_parser_default.element(spPr, "xfrm");
        const off = xfrm ? xml_parser_default.element(xfrm, "off") : null;
        const ext = xfrm ? xml_parser_default.element(xfrm, "ext") : null;
        const scaleX = transform?.scaleX ?? 1;
        const scaleY = transform?.scaleY ?? 1;
        const baseX = transform?.offsetX ?? 0;
        const baseY = transform?.offsetY ?? 0;
        const originX = transform?.originX ?? 0;
        const originY = transform?.originY ?? 0;
        const x = off ? xml_parser_default.floatAttr(off, "x", 0) : 0;
        const y = off ? xml_parser_default.floatAttr(off, "y", 0) : 0;
        const cx = ext ? xml_parser_default.floatAttr(ext, "cx", 0) : 0;
        const cy = ext ? xml_parser_default.floatAttr(ext, "cy", 0) : 0;
        return {
          left: this.emuToPt(originX + (x - baseX) * scaleX),
          top: this.emuToPt(originY + (y - baseY) * scaleY),
          width: Math.max(0, this.emuToPt(cx * scaleX)),
          height: Math.max(0, this.emuToPt(cy * scaleY))
        };
      }
      parseDmlFillStyle(spPr) {
        if (xml_parser_default.element(spPr, "noFill"))
          return { fill: "none", backgroundColor: "transparent" };
        const solidFill = xml_parser_default.element(spPr, "solidFill");
        if (solidFill) {
          const color = this.parseDmlColor(solidFill) ?? "transparent";
          return { fill: color, backgroundColor: color };
        }
        const pattFill = xml_parser_default.element(spPr, "pattFill");
        if (pattFill) {
          const fg = this.parseDmlColor(xml_parser_default.element(pattFill, "fgClr")) ?? "currentColor";
          const bg = this.parseDmlColor(xml_parser_default.element(pattFill, "bgClr")) ?? "transparent";
          const prst = xml_parser_default.attr(pattFill, "prst");
          const angle = prst && prst.toLowerCase().includes("horz") ? "0deg" : "90deg";
          return {
            fill: bg,
            backgroundColor: bg,
            backgroundImage: `repeating-linear-gradient(${angle}, ${fg} 0, ${fg} 0.75pt, ${bg} 0.75pt, ${bg} 3pt)`
          };
        }
        return { fill: "none", backgroundColor: "transparent" };
      }
      parseDmlLineStyle(line) {
        if (!line || xml_parser_default.element(line, "noFill"))
          return { stroke: "none", strokeWidth: "0", borderType: "none" };
        const stroke = this.parseDmlColor(xml_parser_default.element(line, "solidFill")) ?? "black";
        const width = xml_parser_default.attr(line, "w") ? this.pt(this.emuToPt(xml_parser_default.floatAttr(line, "w", 0))) : "0.75pt";
        const dash = xml_parser_default.elementAttr(line, "prstDash", "val");
        let strokeDasharray = null;
        let borderType = "solid";
        if (dash && dash != "solid") {
          borderType = "dashed";
          strokeDasharray = dash == "dot" ? "1 2" : "4 3";
        }
        return { stroke, strokeWidth: width, borderType, strokeDasharray };
      }
      parseDmlCustomGeometry(geom) {
        const pathList = xml_parser_default.element(geom, "pathLst");
        const paths = pathList ? xml_parser_default.elements(pathList, "path") : [];
        let d = "";
        let viewWidth = 1;
        let viewHeight = 1;
        for (const path of paths) {
          const width = xml_parser_default.floatAttr(path, "w", viewWidth);
          const height = xml_parser_default.floatAttr(path, "h", viewHeight);
          viewWidth = Math.max(viewWidth, width || 1);
          viewHeight = Math.max(viewHeight, height || 1);
          d += this.parseDmlPathData(path, width || 1, height || 1);
        }
        return { d: d.trim(), viewBox: `0 0 ${viewWidth} ${viewHeight}` };
      }
      parseDmlPathData(path, width, height) {
        const parts = [];
        const point = (el) => {
          const pt = xml_parser_default.element(el, "pt");
          return pt ? `${this.dmlCoord(xml_parser_default.attr(pt, "x"), width, height)} ${this.dmlCoord(xml_parser_default.attr(pt, "y"), width, height)}` : "0 0";
        };
        for (const child of xml_parser_default.elements(path)) {
          switch (child.localName) {
            case "moveTo":
              parts.push(`M ${point(child)}`);
              break;
            case "lnTo":
              parts.push(`L ${point(child)}`);
              break;
            case "cubicBezTo":
              const cubic = xml_parser_default.elements(child, "pt").map((pt) => `${this.dmlCoord(xml_parser_default.attr(pt, "x"), width, height)} ${this.dmlCoord(xml_parser_default.attr(pt, "y"), width, height)}`);
              if (cubic.length == 3)
                parts.push(`C ${cubic.join(" ")}`);
              break;
            case "quadBezTo":
              const quad = xml_parser_default.elements(child, "pt").map((pt) => `${this.dmlCoord(xml_parser_default.attr(pt, "x"), width, height)} ${this.dmlCoord(xml_parser_default.attr(pt, "y"), width, height)}`);
              if (quad.length == 2)
                parts.push(`Q ${quad.join(" ")}`);
              break;
            case "close":
              parts.push("Z");
              break;
          }
        }
        return parts.join(" ") + " ";
      }
      dmlCoord(value, width, height) {
        if (value == "w" || value == "r")
          return width;
        if (value == "h" || value == "b")
          return height;
        if (value == "l" || value == "t")
          return 0;
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      dmlVerticalAlign(bodyPr) {
        switch (bodyPr ? xml_parser_default.attr(bodyPr, "anchor") : null) {
          case "ctr":
            return "center";
          case "b":
            return "flex-end";
          default:
            return "flex-start";
        }
      }
      applyDmlTextInsets(bodyPr, cssStyle) {
        if (!bodyPr)
          return;
        const map = { lIns: "padding-left", tIns: "padding-top", rIns: "padding-right", bIns: "padding-bottom" };
        for (const [attr, prop] of Object.entries(map)) {
          const value = xml_parser_default.attr(bodyPr, attr);
          if (value != null)
            cssStyle[prop] = this.pt(this.emuToPt(parseFloat(value)));
        }
      }
      parseDmlTextBoxProperties(bodyPr) {
        const textInsetStyle = {};
        this.applyDmlTextInsets(bodyPr, textInsetStyle);
        return {
          dmlTextBox: true,
          textInsets: textInsetStyle,
          textCompatibleLineSpacing: bodyPr ? xml_parser_default.boolAttr(bodyPr, "compatLnSpc", false) : false,
          textVerticalAlign: this.dmlVerticalAlign(bodyPr)
        };
      }
      emuToPt(value) {
        return (Number.isFinite(value) ? value : 0) / 12700;
      }
      pt(value) {
        return `${Math.round(value * 100) / 100}pt`;
      }
      parseChartReference(elem) {
        return {
          type: "chart" /* Chart */,
          id: xml_parser_default.attr(elem, "id"),
          cssStyle: {
            "width": "100%",
            "height": "100%"
          }
        };
      }
      parseSmartArtReference(elem) {
        const relIds = elem.localName == "relIds" ? elem : this.findDescendant(elem, "relIds");
        return {
          type: "smartArt" /* SmartArt */,
          dataId: relIds ? xml_parser_default.attr(relIds, "dm") : xml_parser_default.attr(elem, "dm"),
          layoutId: relIds ? xml_parser_default.attr(relIds, "lo") : xml_parser_default.attr(elem, "lo"),
          styleId: relIds ? xml_parser_default.attr(relIds, "qs") : xml_parser_default.attr(elem, "qs"),
          colorId: relIds ? xml_parser_default.attr(relIds, "cs") : xml_parser_default.attr(elem, "cs"),
          cssStyle: {
            "width": "100%",
            "height": "100%"
          }
        };
      }
      parseInkReference(elem) {
        return {
          type: "ink" /* Ink */,
          id: xml_parser_default.attr(elem, "id"),
          cssStyle: {
            "width": "100%",
            "height": "100%"
          }
        };
      }
      parseGraphicPlaceholder(label) {
        return {
          type: "shape" /* Shape */,
          children: [{ type: "text" /* Text */, text: `[${label}]` }],
          cssStyle: {
            "display": "inline-flex",
            "align-items": "center",
            "justify-content": "center",
            "border": "1px solid #999",
            "background-color": "#f8f8f8",
            "color": "#555",
            "min-width": "2in",
            "min-height": "1in"
          }
        };
      }
      parseWordprocessingShape(elem) {
        const result = {
          type: "shape" /* Shape */,
          children: [],
          cssStyle: {
            "display": "inline-block",
            "position": "relative",
            "box-sizing": "border-box",
            "overflow": "hidden"
          }
        };
        const cNvPr = this.findDescendant(elem, "cNvPr");
        let bodyPr = null;
        let hasTextBody = false;
        if (cNvPr) {
          result.title = xml_parser_default.attr(cNvPr, "title") ?? xml_parser_default.attr(cNvPr, "name");
          result.alt = xml_parser_default.attr(cNvPr, "descr") ?? result.title;
        }
        for (const n of xml_parser_default.elements(elem)) {
          switch (n.localName) {
            case "spPr":
              this.parseDmlShapeProperties(n, result.cssStyle);
              break;
            case "txbx":
            case "textBox":
              hasTextBody = true;
              for (const txbxContent of xml_parser_default.elements(n, "txbxContent"))
                result.children.push(...this.parseBodyElements(txbxContent));
              break;
            case "bodyPr":
              bodyPr = n;
              break;
          }
        }
        if (hasTextBody)
          result.props = { ...result.props ?? {}, ...this.parseDmlTextBoxProperties(bodyPr) };
        return result;
      }
      parseDmlShapeProperties(elem, style) {
        const xfrm = xml_parser_default.element(elem, "xfrm");
        const bounds = this.parseDmlShapeBounds(elem);
        const roundedRadius = this.parseDmlRoundRectRadius(elem, bounds.width, bounds.height);
        if (roundedRadius != null)
          style["border-radius"] = roundedRadius;
        if (xfrm) {
          for (const n of xml_parser_default.elements(xfrm)) {
            switch (n.localName) {
              case "ext":
                style["width"] = xml_parser_default.lengthAttr(n, "cx", LengthUsage.Emu);
                style["height"] = xml_parser_default.lengthAttr(n, "cy", LengthUsage.Emu);
                break;
            }
          }
        }
        const solidFill = xml_parser_default.element(elem, "solidFill");
        const noFill = xml_parser_default.element(elem, "noFill");
        const line = xml_parser_default.element(elem, "ln");
        if (solidFill)
          style["background-color"] = this.parseDmlColor(solidFill) ?? style["background-color"];
        else if (noFill)
          style["background-color"] = "transparent";
        if (line && xml_parser_default.element(line, "noFill")) {
          style["border"] = "none";
        } else if (line) {
          const lineColor = this.parseDmlColor(xml_parser_default.element(line, "solidFill")) ?? "black";
          const lineWidth = xml_parser_default.lengthAttr(line, "w", LengthUsage.Emu) ?? "1px";
          const dash = xml_parser_default.elementAttr(line, "prstDash", "val");
          const borderType = dash && dash != "solid" ? "dashed" : "solid";
          style["border"] = `${lineWidth} ${borderType} ${lineColor}`;
        }
      }
      parseDmlColor(elem) {
        if (!elem)
          return null;
        const srgbClr = xml_parser_default.element(elem, "srgbClr");
        const schemeClr = xml_parser_default.element(elem, "schemeClr");
        const prstClr = xml_parser_default.element(elem, "prstClr");
        const sysClr = xml_parser_default.element(elem, "sysClr");
        if (srgbClr)
          return this.applyDmlColorTransforms(srgbClr, `#${xml_parser_default.attr(srgbClr, "val")}`);
        if (schemeClr) {
          const scheme = this.resolveDmlSchemeColor(xml_parser_default.attr(schemeClr, "val"));
          const fallback = this.dmlSchemeColorFallback(scheme);
          return this.applyDmlColorTransforms(schemeClr, `var(--docx-${scheme}-color${fallback ? `, ${fallback}` : ""})`);
        }
        if (sysClr)
          return this.applyDmlColorTransforms(sysClr, `#${xml_parser_default.attr(sysClr, "lastClr") ?? xml_parser_default.attr(sysClr, "val")}`);
        return prstClr ? this.applyDmlColorTransforms(prstClr, xml_parser_default.attr(prstClr, "val")) : null;
      }
      resolveDmlSchemeColor(value) {
        switch (value) {
          case "bg1":
            return "lt1";
          case "tx1":
            return "dk1";
          case "bg2":
            return "lt2";
          case "tx2":
            return "dk2";
          default:
            return value;
        }
      }
      dmlSchemeColorFallback(value) {
        return themeSchemeColorFallback(value);
      }
      applyDmlColorTransforms(elem, color) {
        const lumMod = xml_parser_default.elementAttr(elem, "lumMod", "val");
        const lumOff = xml_parser_default.elementAttr(elem, "lumOff", "val");
        if (lumMod != null) {
          const percent2 = Math.max(0, Math.min(100, parseFloat(lumMod) / 1e3));
          if (Number.isFinite(percent2) && percent2 < 100)
            color = `color-mix(in srgb, ${color} ${percent2}%, black)`;
        }
        if (lumOff != null) {
          const percent2 = Math.max(0, Math.min(100, parseFloat(lumOff) / 1e3));
          if (Number.isFinite(percent2) && percent2 > 0)
            color = `color-mix(in srgb, ${color} ${100 - percent2}%, white)`;
        }
        return color;
      }
      findDescendant(elem, localName) {
        for (const child of xml_parser_default.elements(elem)) {
          if (child.localName == localName)
            return child;
          const nested = this.findDescendant(child, localName);
          if (nested)
            return nested;
        }
        return null;
      }
      parsePicture(elem) {
        var result = { type: "image" /* Image */, src: "", cssStyle: {} };
        var blipFill = xml_parser_default.element(elem, "blipFill");
        var blip = blipFill ? xml_parser_default.element(blipFill, "blip") : null;
        var srcRect = blipFill ? xml_parser_default.element(blipFill, "srcRect") : null;
        result.src = blip ? xml_parser_default.attr(blip, "embed") ?? xml_parser_default.attr(blip, "link") : "";
        const cNvPr = this.findDescendant(elem, "cNvPr");
        if (cNvPr) {
          result.title = xml_parser_default.attr(cNvPr, "title") ?? xml_parser_default.attr(cNvPr, "name");
          result.alt = xml_parser_default.attr(cNvPr, "descr") ?? result.title;
        }
        if (srcRect) {
          result.srcRect = [
            xml_parser_default.intAttr(srcRect, "l", 0) / 1e5,
            xml_parser_default.intAttr(srcRect, "t", 0) / 1e5,
            xml_parser_default.intAttr(srcRect, "r", 0) / 1e5,
            xml_parser_default.intAttr(srcRect, "b", 0) / 1e5
          ];
        }
        var spPr = xml_parser_default.element(elem, "spPr");
        var xfrm = spPr ? xml_parser_default.element(spPr, "xfrm") : null;
        var transforms = [];
        result.cssStyle["display"] = "block";
        result.cssStyle["position"] = "relative";
        result.cssStyle["object-fit"] = "contain";
        if (xfrm) {
          result.rotation = xml_parser_default.intAttr(xfrm, "rot", 0) / 6e4;
          if (xml_parser_default.boolAttr(xfrm, "flipH", false))
            transforms.push("scaleX(-1)");
          if (xml_parser_default.boolAttr(xfrm, "flipV", false))
            transforms.push("scaleY(-1)");
          for (var n of xml_parser_default.elements(xfrm)) {
            switch (n.localName) {
              case "ext":
                result.cssStyle["width"] = xml_parser_default.lengthAttr(n, "cx", LengthUsage.Emu);
                result.cssStyle["height"] = xml_parser_default.lengthAttr(n, "cy", LengthUsage.Emu);
                break;
            }
          }
        }
        if (transforms.length > 0)
          result.cssStyle["transform"] = transforms.join(" ");
        if (!result.cssStyle["width"])
          result.cssStyle["width"] = "100%";
        if (!result.cssStyle["height"])
          result.cssStyle["height"] = "100%";
        return result;
      }
      /** 解析表格结构，包含 tblPr、tblGrid、tr、tc、合并单元格和嵌套内容。 */
      parseTable(node) {
        var result = { type: "table" /* Table */, children: [] };
        for (const c of xml_parser_default.elements(node)) {
          switch (c.localName) {
            case "tr":
              result.children.push(this.parseTableRow(c));
              break;
            case "tblGrid":
              result.columns = this.parseTableColumns(c);
              break;
            case "tblPr":
              this.parseTableProperties(c, result);
              break;
          }
        }
        return result;
      }
      parseTableColumns(node) {
        var result = [];
        for (const n of xml_parser_default.elements(node)) {
          switch (n.localName) {
            case "gridCol":
              result.push({ width: xml_parser_default.lengthAttr(n, "w") });
              break;
          }
        }
        return result;
      }
      parseTableProperties(elem, table) {
        table.cssStyle = {};
        table.cellStyle = {};
        let tableIndent = null;
        this.parseDefaultProperties(elem, table.cssStyle, table.cellStyle, (c) => {
          switch (c.localName) {
            case "tblStyle":
              table.styleName = xml_parser_default.attr(c, "val");
              break;
            case "tblLook":
              table.className = values.classNameOftblLook(c);
              break;
            case "tblInd":
              tableIndent = this.parseTableIndentation(c);
              break;
            case "tblpPr":
              this.parseTablePosition(c, table);
              break;
            case "tblStyleColBandSize":
              table.colBandSize = xml_parser_default.intAttr(c, "val");
              break;
            case "tblStyleRowBandSize":
              table.rowBandSize = xml_parser_default.intAttr(c, "val");
              break;
            case "tblPrChange":
              this.addFormatRevision(table, c, "table-format", elem);
              break;
            case "hidden":
              if (xml_parser_default.boolAttr(c, "val", true))
                table.cssStyle["display"] = "none";
              break;
            default:
              return false;
          }
          return true;
        });
        const tableJustification = table.cssStyle["text-align"];
        switch (tableJustification) {
          case "center":
            delete table.cssStyle["text-align"];
            table.cssStyle["margin-left"] = "auto";
            table.cssStyle["margin-right"] = "auto";
            break;
          case "right":
            delete table.cssStyle["text-align"];
            table.cssStyle["margin-left"] = "auto";
            break;
          default:
            delete table.cssStyle["text-align"];
            if (tableIndent)
              table.cssStyle["margin-inline-start"] = values.addSize(table.cssStyle["margin-inline-start"], tableIndent);
            break;
        }
      }
      parseTableIndentation(node) {
        const type = xml_parser_default.attr(node, "type");
        if (type == "pct" || type == "auto")
          return null;
        return xml_parser_default.lengthAttr(node, "w", LengthUsage.SignedDxa);
      }
      parseTablePosition(node, table) {
        var topFromText = xml_parser_default.lengthAttr(node, "topFromText");
        var bottomFromText = xml_parser_default.lengthAttr(node, "bottomFromText");
        var rightFromText = xml_parser_default.lengthAttr(node, "rightFromText");
        var leftFromText = xml_parser_default.lengthAttr(node, "leftFromText");
        table.cssStyle["float"] = "left";
        table.cssStyle["margin-bottom"] = values.addSize(table.cssStyle["margin-bottom"], bottomFromText);
        table.cssStyle["margin-left"] = values.addSize(table.cssStyle["margin-left"], leftFromText);
        table.cssStyle["margin-right"] = values.addSize(table.cssStyle["margin-right"], rightFromText);
        table.cssStyle["margin-top"] = values.addSize(table.cssStyle["margin-top"], topFromText);
      }
      parseTableRow(node) {
        var result = { type: "row" /* Row */, children: [] };
        for (const c of xml_parser_default.elements(node)) {
          switch (c.localName) {
            case "tc":
              result.children.push(this.parseTableCell(c));
              break;
            case "trPr":
            case "tblPrEx":
              this.parseTableRowProperties(c, result);
              break;
          }
        }
        result.children = this.normalizeHorizontalMerges(result.children);
        return result;
      }
      /**
       * Older producers such as Apache POI may emit the deprecated hMerge form
       * instead of gridSpan. Normalize each valid restart/continue run so every
       * later table-layout stage sees the same grid model.
       */
      normalizeHorizontalMerges(cells) {
        const result = [];
        for (let index = 0; index < cells.length; index++) {
          const cell = cells[index];
          if (cell.horizontalMerge != "restart") {
            result.push(cell);
            continue;
          }
          let span = cell.span ?? 1;
          let next = index + 1;
          while (next < cells.length && cells[next].horizontalMerge == "continue") {
            span += cells[next].span ?? 1;
            next++;
          }
          if (next > index + 1) {
            cell.span = span;
            index = next - 1;
          }
          result.push(cell);
        }
        return result;
      }
      parseTableRowProperties(elem, row) {
        const rowStyle = {};
        row.cssStyle = this.parseDefaultProperties(elem, rowStyle, null, (c) => {
          switch (c.localName) {
            case "cnfStyle":
              row.className = values.classNameOfCnfStyle(c);
              break;
            case "tblHeader":
              row.isHeader = xml_parser_default.boolAttr(c, "val", true);
              break;
            case "gridBefore":
              row.gridBefore = xml_parser_default.intAttr(c, "val");
              break;
            case "gridAfter":
              row.gridAfter = xml_parser_default.intAttr(c, "val");
              break;
            case "cantSplit":
              if (xml_parser_default.boolAttr(c, "val", true))
                rowStyle["break-inside"] = "avoid";
              break;
            case "hidden":
              if (xml_parser_default.boolAttr(c, "val", true))
                rowStyle["display"] = "none";
              break;
            case "ins":
              this.addStructuralRevision(row, c, "insert");
              break;
            case "del":
              this.addStructuralRevision(row, c, "delete");
              break;
            case "trPrChange":
              this.addFormatRevision(row, c, "row-format", elem);
              break;
            default:
              return false;
          }
          return true;
        });
      }
      parseTableCell(node) {
        var result = { type: "cell" /* Cell */, children: [] };
        for (const c of xml_parser_default.elements(node)) {
          switch (c.localName) {
            case "tbl":
              result.children.push(this.parseTable(c));
              break;
            case "p":
              result.children.push(this.parseParagraph(c));
              break;
            case "tcPr":
              this.parseTableCellProperties(c, result);
              break;
          }
        }
        return result;
      }
      parseTableCellProperties(elem, cell) {
        cell.cssStyle = this.parseDefaultProperties(elem, {}, null, (c) => {
          switch (c.localName) {
            case "gridSpan":
              cell.span = xml_parser_default.intAttr(c, "val", null);
              break;
            case "hMerge":
              cell.horizontalMerge = xml_parser_default.attr(c, "val") ?? "continue";
              break;
            case "vMerge":
              cell.verticalMerge = xml_parser_default.attr(c, "val") ?? "continue";
              break;
            case "cnfStyle":
              cell.className = values.classNameOfCnfStyle(c);
              break;
            case "tcPrChange":
              this.addFormatRevision(cell, c, "cell-format", elem);
              break;
            default:
              return false;
          }
          return true;
        });
        const cellBorders = xml_parser_default.element(elem, "tcBorders");
        if (cellBorders) {
          const diagonalBorders = {};
          for (const border of xml_parser_default.elements(cellBorders)) {
            if (border.localName === "tl2br" || border.localName === "tr2bl")
              diagonalBorders[border.localName] = values.valueOfBorder(border);
          }
          if (Object.keys(diagonalBorders).length)
            cell.props = { ...cell.props, diagonalBorders };
        }
        this.parseTableCellVerticalText(elem, cell);
      }
      addStructuralRevision(element, node, kind) {
        element.props = { ...element.props ?? {}, revision: this.revisionMetadata(node, kind) };
      }
      addFormatRevision(element, node, kind, currentPropertiesNode) {
        const oldPropertiesNode = xml_parser_default.elements(node)[0];
        const before = this.captureFormatProperties(oldPropertiesNode);
        const after = this.captureFormatProperties(currentPropertiesNode);
        const propertyNames = [.../* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])].sort();
        const formatChanges = propertyNames.filter((property) => before[property] !== after[property]).map((property) => ({ property, before: before[property], after: after[property] }));
        const revision = { ...this.revisionMetadata(node, kind), formatChanges };
        const formatRevisions = [...element.props?.formatRevisions ?? [], revision];
        element.props = { ...element.props ?? {}, formatRevisions };
      }
      captureFormatProperties(node) {
        const result = {};
        if (!node)
          return result;
        for (const property of xml_parser_default.elements(node)) {
          if (/PrChange$/.test(property.localName))
            continue;
          result[property.localName] = this.serializeFormatProperty(property);
        }
        return result;
      }
      serializeFormatProperty(node) {
        const attributes = Array.from(node.attributes ?? []).map((attribute) => [attribute.localName || attribute.name, attribute.value]).sort(([left], [right]) => left.localeCompare(right)).map(([name, value]) => `${name}=${value}`);
        const children = xml_parser_default.elements(node).map((child) => `${child.localName}{${this.serializeFormatProperty(child)}}`);
        return [...attributes, ...children].join("|") || "true";
      }
      revisionMetadata(node, kind) {
        return {
          id: xml_parser_default.attr(node, "id"),
          author: xml_parser_default.attr(node, "author"),
          date: xml_parser_default.attr(node, "date"),
          kind
        };
      }
      parseTableCellVerticalText(elem, cell) {
        const directionMap = {
          "btLr": {
            writingMode: "vertical-rl",
            transform: "rotate(180deg)"
          },
          "lrTb": {
            writingMode: "vertical-lr",
            transform: "none"
          },
          "tbRl": {
            writingMode: "vertical-rl",
            transform: "none"
          }
        };
        for (const c of xml_parser_default.elements(elem)) {
          if (c.localName === "textDirection") {
            const direction = xml_parser_default.attr(c, "val");
            const style = directionMap[direction] || { writingMode: "horizontal-tb" };
            cell.cssStyle["writing-mode"] = style.writingMode;
            cell.cssStyle["transform"] = style.transform;
          }
        }
      }
      parseDefaultProperties(elem, style = null, childStyle = null, handler = null) {
        style = style || {};
        const language = xml_parser_default.element(elem, "lang");
        const languages = {
          latin: language ? xml_parser_default.attr(language, "val") : "",
          eastAsia: language ? xml_parser_default.attr(language, "eastAsia") : "",
          bidi: language ? xml_parser_default.attr(language, "bidi") : ""
        };
        for (const c of xml_parser_default.elements(elem)) {
          if (handler?.(c))
            continue;
          switch (c.localName) {
            case "jc":
              style["text-align"] = values.valueOfJc(c);
              break;
            case "textAlignment":
              style["vertical-align"] = values.valueOfTextAlignment(c);
              break;
            case "autoSpaceDE":
            case "autoSpaceDN":
              style[c.localName == "autoSpaceDE" ? "--docx-auto-space-de" : "--docx-auto-space-dn"] = `${xml_parser_default.boolAttr(c, "val", true)}`;
              break;
            case "color":
              style["color"] = xmlUtil.colorAttr(c, "val", null, autos.color);
              break;
            case "sz":
              style["font-size"] = style["min-height"] = xml_parser_default.lengthAttr(c, "val", LengthUsage.FontSize);
              break;
            case "szCs":
              style["--docx-complex-font-size"] = xml_parser_default.lengthAttr(c, "val", LengthUsage.FontSize);
              break;
            case "cs":
              style["--docx-complex-script"] = `${xml_parser_default.boolAttr(c, "val", true)}`;
              break;
            case "shd":
              style["background-color"] = xmlUtil.colorAttr(c, "fill", null, autos.shd);
              break;
            case "highlight":
              style["background-color"] = xmlUtil.colorAttr(c, "val", null, autos.highlight);
              break;
            case "vertAlign":
              style["vertical-align"] = values.valueOfVertAlign(c);
              break;
            case "position":
              style["vertical-align"] = xml_parser_default.lengthAttr(c, "val", LengthUsage.SignedHalfPoint);
              break;
            case "w":
            case "scale":
              const textScale = xml_parser_default.intAttr(c, "val", 100);
              if (Number.isFinite(textScale) && textScale > 0 && textScale <= 600)
                style["--docx-text-scale"] = `${textScale / 100}`;
              break;
            case "tcW":
              if (this.options.ignoreWidth)
                break;
            case "tblW":
              style["width"] = values.valueOfSize(c, "w");
              break;
            case "trHeight":
              this.parseTrHeight(c, style);
              break;
            case "strike":
              style["text-decoration"] = xml_parser_default.boolAttr(c, "val", true) ? "line-through" : "none";
              break;
            case "dstrike":
              if (xml_parser_default.boolAttr(c, "val", true)) {
                style["text-decoration-line"] = "line-through";
                style["text-decoration-style"] = "double";
              } else {
                style["text-decoration"] = "none";
              }
              break;
            case "b":
              style["font-weight"] = xml_parser_default.boolAttr(c, "val", true) ? "bold" : "normal";
              break;
            case "i":
              style["font-style"] = xml_parser_default.boolAttr(c, "val", true) ? "italic" : "normal";
              break;
            case "bCs":
              style["--docx-bidi-font-weight"] = xml_parser_default.boolAttr(c, "val", true) ? "bold" : "normal";
              if (style["direction"] == "rtl")
                style["font-weight"] = style["--docx-bidi-font-weight"];
              break;
            case "iCs":
              style["--docx-bidi-font-style"] = xml_parser_default.boolAttr(c, "val", true) ? "italic" : "normal";
              if (style["direction"] == "rtl")
                style["font-style"] = style["--docx-bidi-font-style"];
              break;
            case "caps":
              style["text-transform"] = xml_parser_default.boolAttr(c, "val", true) ? "uppercase" : "none";
              break;
            case "smallCaps":
              style["font-variant"] = xml_parser_default.boolAttr(c, "val", true) ? "small-caps" : "none";
              break;
            case "rtl":
              style["--docx-rtl-run"] = `${xml_parser_default.boolAttr(c, "val", true)}`;
              if (xml_parser_default.boolAttr(c, "val", true)) {
                style["direction"] = "rtl";
                style["unicode-bidi"] = "embed";
                if (style["--docx-bidi-font-weight"])
                  style["font-weight"] = style["--docx-bidi-font-weight"];
                if (style["--docx-bidi-font-style"])
                  style["font-style"] = style["--docx-bidi-font-style"];
              }
              break;
            case "outline":
              if (xml_parser_default.boolAttr(c, "val", true))
                style["-webkit-text-stroke"] = "0.5px currentColor";
              break;
            case "shadow":
              if (xml_parser_default.boolAttr(c, "val", true))
                style["text-shadow"] = "1px 1px 0 currentColor";
              break;
            case "emboss":
              if (xml_parser_default.boolAttr(c, "val", true))
                style["text-shadow"] = "-1px -1px 0 rgba(255,255,255,.75), 1px 1px 0 rgba(0,0,0,.35)";
              break;
            case "imprint":
              if (xml_parser_default.boolAttr(c, "val", true))
                style["text-shadow"] = "1px 1px 0 rgba(255,255,255,.75), -1px -1px 0 rgba(0,0,0,.35)";
              break;
            case "em":
              style["text-emphasis-style"] = values.valueOfEmphasisMark(c);
              break;
            case "u":
              this.parseUnderline(c, style);
              break;
            case "ind":
            case "tblInd":
              this.parseIndentation(c, style);
              break;
            case "rFonts":
              this.parseFont(c, style, languages);
              break;
            case "tblBorders":
              this.parseBorderProperties(c, childStyle || style);
              break;
            case "tblCellSpacing":
              style["border-spacing"] = values.valueOfMargin(c);
              style["border-collapse"] = "separate";
              break;
            case "pBdr":
              this.parseBorderProperties(c, style);
              break;
            case "bdr":
              style["border"] = values.valueOfBorder(c);
              break;
            case "tcBorders":
              this.parseBorderProperties(c, style);
              break;
            case "vanish":
              if (xml_parser_default.boolAttr(c, "val", true))
                style["display"] = "none";
              break;
            case "kern":
              style["font-kerning"] = xml_parser_default.intAttr(c, "val", 0) > 0 ? "normal" : "none";
              break;
            case "noWrap":
              style["white-space"] = xml_parser_default.boolAttr(c, "val", true) ? "nowrap" : "normal";
              break;
            case "snapToGrid":
              style["--docx-snap-to-grid"] = xml_parser_default.boolAttr(c, "val", true) ? "1" : "0";
              break;
            case "fitText":
              this.parseFitText(c, style);
              break;
            case "eastAsianLayout":
              this.parseEastAsianLayout(c, style);
              break;
            case "tblCellMar":
            case "tcMar":
              this.parseMarginProperties(c, childStyle || style);
              break;
            case "tblLayout":
              style["table-layout"] = values.valueOfTblLayout(c);
              break;
            case "vAlign":
              style["vertical-align"] = values.valueOfTextAlignment(c);
              break;
            case "spacing":
              if (elem.localName == "pPr")
                this.parseSpacing(c, style);
              else if (elem.localName == "rPr")
                style["letter-spacing"] = xml_parser_default.lengthAttr(c, "val", LengthUsage.SignedDxa);
              break;
            case "wordWrap":
              if (xml_parser_default.boolAttr(c, "val"))
                style["overflow-wrap"] = "break-word";
              break;
            case "suppressAutoHyphens":
              style["hyphens"] = xml_parser_default.boolAttr(c, "val", true) ? "none" : "auto";
              break;
            case "lang":
              style["$lang"] = xml_parser_default.attr(c, "val");
              style["$lang-eastAsia"] = xml_parser_default.attr(c, "eastAsia");
              style["$lang-bidi"] = xml_parser_default.attr(c, "bidi");
              break;
            case "rtl":
            case "bidi":
              if (xml_parser_default.boolAttr(c, "val", true))
                style["direction"] = "rtl";
              break;
            case "pageBreakBefore":
              if (xml_parser_default.boolAttr(c, "val", true))
                style["break-before"] = "page";
              break;
            case "keepLines":
              if (xml_parser_default.boolAttr(c, "val", true))
                style["break-inside"] = "avoid";
              break;
            case "keepNext":
              if (xml_parser_default.boolAttr(c, "val", true))
                style["break-after"] = "avoid";
              break;
            case "widowControl":
              if (xml_parser_default.boolAttr(c, "val", true)) {
                style["orphans"] = "2";
                style["widows"] = "2";
              }
              break;
            case "webHidden":
              if (this.options.hideWebHiddenContent && xml_parser_default.boolAttr(c, "val", true))
                style["display"] = "none";
              break;
            case "specVanish":
              if (xml_parser_default.boolAttr(c, "val", true))
                style["display"] = "none";
              break;
            case "contextualSpacing":
              style["--docx-contextual-spacing"] = `${xml_parser_default.boolAttr(c, "val", true)}`;
              break;
            case "tabs":
            //ignore - tabs is parsed by other parser
            case "outlineLvl":
            //TODO
            case "tblStyleColBandSize":
            //TODO
            case "tblStyleRowBandSize":
            //TODO
            case "suppressLineNumbers":
            //TODO - maybe ignore
            case "noProof":
              break;
            default:
              if (this.options.debug)
                console.warn(`DOCX: Unknown document element: ${elem.localName}.${c.localName}`);
              break;
          }
        }
        return style;
      }
      parseFitText(node, style) {
        const width = xml_parser_default.lengthAttr(node, "val");
        if (width) {
          style["display"] = "inline-block";
          style["width"] = width;
          style["text-align"] = "justify";
          style["text-align-last"] = "justify";
        }
      }
      parseEastAsianLayout(node, style) {
        if (xml_parser_default.boolAttr(node, "combine", false))
          style["text-combine-upright"] = "all";
        if (xml_parser_default.boolAttr(node, "vert", false))
          style["writing-mode"] = "vertical-rl";
        if (xml_parser_default.boolAttr(node, "vertCompress", false))
          style["font-stretch"] = "condensed";
      }
      parseUnderline(node, style) {
        var val = xml_parser_default.attr(node, "val");
        if (val == null)
          return;
        switch (val) {
          case "dash":
          case "dashDotDotHeavy":
          case "dashDotHeavy":
          case "dashedHeavy":
          case "dashLong":
          case "dashLongHeavy":
          case "dotDash":
          case "dotDotDash":
            style["text-decoration"] = "underline dashed";
            break;
          case "dotted":
          case "dottedHeavy":
            style["text-decoration"] = "underline dotted";
            break;
          case "double":
            style["text-decoration"] = "underline double";
            break;
          case "single":
          case "thick":
            style["text-decoration"] = "underline";
            break;
          case "wave":
          case "wavyDouble":
          case "wavyHeavy":
            style["text-decoration"] = "underline wavy";
            break;
          case "words":
            style["text-decoration"] = "underline";
            break;
          case "none":
            style["text-decoration"] = "none";
            break;
        }
        var col = xmlUtil.colorAttr(node, "color");
        if (col)
          style["text-decoration-color"] = col;
      }
      parseFont(node, style, languages = {}) {
        var ascii = xml_parser_default.attr(node, "ascii");
        var hAnsi = xml_parser_default.attr(node, "hAnsi");
        var eastAsia = xml_parser_default.attr(node, "eastAsia");
        var cs = xml_parser_default.attr(node, "cs");
        var asciiTheme = values.themeValue(node, "asciiTheme");
        var hAnsiTheme = values.themeValue(node, "hAnsiTheme");
        var eastAsiaTheme = this.scriptThemeFontValue(values.themeValue(node, "eastAsiaTheme"), languages.eastAsia);
        var csTheme = this.scriptThemeFontValue(values.themeValue(node, "cstheme") ?? values.themeValue(node, "csTheme"), languages.bidi);
        const eastAsiaScript = themeScriptForLanguage(languages.eastAsia);
        const expandDirectFont = (font, script = "") => isEastAsianFontFamily(font) ? eastAsianFontFamilyStack(font, script) : [encloseFontFamily(font)];
        var fonts = [ascii, hAnsi].filter((x) => x).flatMap((x) => expandDirectFont(x, eastAsiaScript));
        fonts.push(...[asciiTheme, hAnsiTheme].filter((x) => x).map((x) => x.startsWith("var(") ? x : encloseFontFamily(x)));
        const latinFonts = fonts.slice();
        if (eastAsia) {
          fonts.push(...eastAsianFontFamilyStack(eastAsia, eastAsiaScript));
        }
        if (eastAsiaTheme) {
          fonts.push(eastAsiaTheme.startsWith("var(") ? eastAsiaTheme : encloseFontFamily(eastAsiaTheme));
        }
        if (cs)
          fonts.push(...expandDirectFont(cs, themeScriptForLanguage(languages.bidi)));
        if (csTheme)
          fonts.push(csTheme.startsWith("var(") ? csTheme : encloseFontFamily(csTheme));
        if (fonts.length > 0) {
          const currentFonts = (style["font-family"] ?? "").split(",").map((x) => x.trim()).filter((x) => x);
          style["font-family"] = [.../* @__PURE__ */ new Set([...currentFonts, ...fonts])].join(", ");
          if (latinFonts.length)
            style["--docx-latin-font-family"] = [...new Set(latinFonts)].join(", ");
          style["--docx-partial-eastasia-font"] = !latinFonts.length && (eastAsia || eastAsiaTheme) && !cs && !csTheme ? "true" : "false";
        }
        const slots = {
          ascii: [ascii, asciiTheme],
          hansi: [hAnsi, hAnsiTheme],
          eastasia: [eastAsia, eastAsiaTheme],
          complex: [cs, csTheme]
        };
        for (const [slot, [direct, themed]] of Object.entries(slots)) {
          const selected = themed || direct;
          if (!selected) continue;
          const family = selected.startsWith("var(") ? selected : expandDirectFont(selected, slot == "complex" ? themeScriptForLanguage(languages.bidi) : eastAsiaScript).join(", ");
          style[`--docx-font-${slot}`] = family;
        }
      }
      scriptThemeFontValue(value, language) {
        if (!value)
          return value;
        const script = themeScriptForLanguage(language);
        const match = /^var\((--docx-(?:major|minor)(?:EastAsia|Bidi|Cs)-font)\)$/.exec(value);
        if (!script || !match)
          return value;
        return `var(${match[1]}-${script}, ${value})`;
      }
      parseIndentation(node, style) {
        var firstLine = xml_parser_default.lengthAttr(node, "firstLine");
        var hanging = xml_parser_default.lengthAttr(node, "hanging");
        var left = xml_parser_default.lengthAttr(node, "left");
        var start = xml_parser_default.lengthAttr(node, "start");
        var right = xml_parser_default.lengthAttr(node, "right");
        var end = xml_parser_default.lengthAttr(node, "end");
        if (firstLine) {
          style["text-indent"] = firstLine;
          style["--docx-text-indent"] = firstLine;
        }
        if (hanging) {
          style["text-indent"] = `-${hanging}`;
          style["--docx-text-indent"] = `-${hanging}`;
          style["--docx-hanging-indent"] = hanging;
        }
        if (left || start) {
          style["margin-inline-start"] = left || start;
          style["--docx-margin-inline-start"] = left || start;
        }
        if (right || end) {
          style["margin-inline-end"] = right || end;
          style["--docx-margin-inline-end"] = right || end;
        }
      }
      parseSpacing(node, style) {
        var before = xml_parser_default.lengthAttr(node, "before");
        var after = xml_parser_default.lengthAttr(node, "after");
        var beforeLines = xml_parser_default.intAttr(node, "beforeLines", null);
        var afterLines = xml_parser_default.intAttr(node, "afterLines", null);
        var beforeAuto = xml_parser_default.boolAttr(node, "beforeAutospacing", false);
        var afterAuto = xml_parser_default.boolAttr(node, "afterAutospacing", false);
        var line = xml_parser_default.intAttr(node, "line", null);
        var lineRule = xml_parser_default.attr(node, "lineRule");
        for (const [side, margin, points, lines, auto] of [
          ["before", "margin-top", before, beforeLines, beforeAuto],
          ["after", "margin-bottom", after, afterLines, afterAuto]
        ]) {
          const prefix = `--docx-spacing-${side}`;
          const { lines: lineValue, fallback } = paragraphSpacingDeclaration(points, lines);
          const autoSpecified = xml_parser_default.attr(node, `${side}Autospacing`) != null;
          if (points != null) style[`${prefix}-points`] = points;
          if (lineValue != null) style[`${prefix}-lines`] = lineValue;
          if (fallback != null) style[`${prefix}-fallback`] = fallback;
          if (autoSpecified) style[`${prefix}-auto`] = `${auto}`;
          if (auto) style[margin] = `${WORD_HTML_AUTO_SPACING_PT}pt`;
          else if (fallback != null) style[margin] = fallback;
          else if (autoSpecified) style[margin] = "0pt";
        }
        if (line !== null) {
          switch (lineRule ?? "auto") {
            case "auto":
              style["line-height"] = `${(line / 240).toFixed(2)}`;
              break;
            case "atLeast":
              style["line-height"] = `max(1.2em, ${(line / 20).toFixed(2)}pt)`;
              style["min-height"] = `max(1.2em, ${(line / 20).toFixed(2)}pt)`;
              break;
            case "exact":
            case "exactly":
              style["line-height"] = style["min-height"] = `${(line / 20).toFixed(2)}pt`;
              break;
            default:
              style["line-height"] = `${(line / 240).toFixed(2)}`;
              break;
          }
        }
      }
      parseMarginProperties(node, output) {
        for (const c of xml_parser_default.elements(node)) {
          switch (c.localName) {
            case "left":
            case "start":
              output["padding-left"] = values.valueOfMargin(c);
              break;
            case "right":
            case "end":
              output["padding-right"] = values.valueOfMargin(c);
              break;
            case "top":
              output["padding-top"] = values.valueOfMargin(c);
              break;
            case "bottom":
              output["padding-bottom"] = values.valueOfMargin(c);
              break;
          }
        }
      }
      parseTrHeight(node, output) {
        switch (xml_parser_default.attr(node, "hRule")) {
          case "exact":
            output["height"] = xml_parser_default.lengthAttr(node, "val");
            break;
          case "atLeast":
          default:
            output["height"] = xml_parser_default.lengthAttr(node, "val");
            break;
        }
      }
      parseBorderProperties(node, output) {
        for (const c of xml_parser_default.elements(node)) {
          const border = values.valueOfBorder(c);
          switch (c.localName) {
            case "start":
            case "left":
              output["border-left"] = border;
              break;
            case "end":
            case "right":
              output["border-right"] = border;
              break;
            case "top":
              output["border-top"] = border;
              break;
            case "bottom":
              output["border-bottom"] = border;
              break;
            case "insideH":
              output["border-top"] ?? (output["border-top"] = border);
              output["border-bottom"] ?? (output["border-bottom"] = border);
              break;
            case "insideV":
              output["border-left"] ?? (output["border-left"] = border);
              output["border-right"] ?? (output["border-right"] = border);
              break;
          }
        }
      }
    };
    var knownColors = ["black", "blue", "cyan", "darkBlue", "darkCyan", "darkGray", "darkGreen", "darkMagenta", "darkRed", "darkYellow", "green", "lightGray", "magenta", "none", "red", "white", "yellow"];
    var wmlThemeColorAliases = {
      dark1: "dk1",
      light1: "lt1",
      dark2: "dk2",
      light2: "lt2",
      text1: "dk1",
      background1: "lt1",
      text2: "dk2",
      background2: "lt2",
      hyperlink: "hlink",
      followedHyperlink: "folHlink"
    };
    function resolveWmlThemeColor(value) {
      return wmlThemeColorAliases[value] ?? value;
    }
    function themeSchemeColorFallback(value) {
      switch (value) {
        case "dk1":
          return "#000000";
        case "lt1":
          return "#FFFFFF";
        case "dk2":
          return "#44546A";
        case "lt2":
          return "#E7E6E6";
        case "accent1":
          return "#4472C4";
        case "accent2":
          return "#ED7D31";
        case "accent3":
          return "#A5A5A5";
        case "accent4":
          return "#FFC000";
        case "accent5":
          return "#5B9BD5";
        case "accent6":
          return "#70AD47";
        case "hlink":
          return "#0563C1";
        case "folHlink":
          return "#954F72";
        default:
          return null;
      }
    }
    var xmlUtil = class {
      static colorAttr(node, attrName, defValue = null, autoColor = autos.color) {
        var v = xml_parser_default.attr(node, attrName);
        if (v) {
          if (v == "auto") {
            return autoColor;
          } else if (knownColors.includes(v)) {
            return v;
          }
          return `#${v}`;
        }
        var themeColor = xml_parser_default.attr(node, "themeColor");
        if (themeColor) {
          const scheme = resolveWmlThemeColor(themeColor);
          const fallback = themeSchemeColorFallback(scheme);
          return `var(--docx-${scheme}-color${fallback ? `, ${fallback}` : ""})`;
        }
        return defValue;
      }
    };
    var values = class _values {
      static themeValue(c, attr) {
        var val = xml_parser_default.attr(c, attr);
        return val ? `var(--docx-${val}-font)` : null;
      }
      static valueOfSize(c, attr) {
        var type = LengthUsage.Dxa;
        switch (xml_parser_default.attr(c, "type")) {
          case "dxa":
            break;
          case "pct":
            type = LengthUsage.Percent;
            break;
          case "auto":
            return "auto";
        }
        return xml_parser_default.lengthAttr(c, attr, type);
      }
      static valueOfMargin(c) {
        return xml_parser_default.lengthAttr(c, "w");
      }
      static valueOfBorder(c) {
        var type = _values.parseBorderType(xml_parser_default.attr(c, "val"));
        if (type == "none")
          return "none";
        var color = xmlUtil.colorAttr(c, "color", autos.borderColor, autos.borderColor);
        var size = xml_parser_default.lengthAttr(c, "sz", LengthUsage.Border) ?? "1pt";
        return `${size} ${type} ${color == "auto" ? autos.borderColor : color}`;
      }
      static parseBorderType(type) {
        switch (type) {
          case "single":
            return "solid";
          case "dashDotStroked":
            return "solid";
          case "dashed":
            return "dashed";
          case "dashSmallGap":
            return "dashed";
          case "dotDash":
            return "dotted";
          case "dotDotDash":
            return "dotted";
          case "dotted":
            return "dotted";
          case "double":
            return "double";
          case "doubleWave":
            return "double";
          case "inset":
            return "inset";
          case "nil":
            return "none";
          case "none":
            return "none";
          case "outset":
            return "outset";
          case "thick":
            return "solid";
          case "thickThinLargeGap":
            return "solid";
          case "thickThinMediumGap":
            return "solid";
          case "thickThinSmallGap":
            return "solid";
          case "thinThickLargeGap":
            return "solid";
          case "thinThickMediumGap":
            return "solid";
          case "thinThickSmallGap":
            return "solid";
          case "thinThickThinLargeGap":
            return "solid";
          case "thinThickThinMediumGap":
            return "solid";
          case "thinThickThinSmallGap":
            return "solid";
          case "threeDEmboss":
            return "solid";
          case "threeDEngrave":
            return "solid";
          case "triple":
            return "double";
          case "wave":
            return "solid";
        }
        return "solid";
      }
      static valueOfTblLayout(c) {
        var type = xml_parser_default.attr(c, "type") ?? xml_parser_default.attr(c, "val");
        return type == "fixed" ? "fixed" : "auto";
      }
      static classNameOfCnfStyle(c) {
        const val = xml_parser_default.attr(c, "val");
        const classes = [
          "first-row",
          "last-row",
          "first-col",
          "last-col",
          "odd-col",
          "even-col",
          "odd-row",
          "even-row",
          "ne-cell",
          "nw-cell",
          "se-cell",
          "sw-cell"
        ];
        return classes.filter((_, i) => val[i] == "1").join(" ");
      }
      static valueOfJc(c) {
        var type = xml_parser_default.attr(c, "val");
        switch (type) {
          case "start":
          case "left":
            return "left";
          case "center":
            return "center";
          case "end":
          case "right":
            return "right";
          case "both":
            return "justify";
        }
        return type;
      }
      static valueOfVertAlign(c, asTagName = false) {
        var type = xml_parser_default.attr(c, "val");
        switch (type) {
          case "subscript":
            return "sub";
          case "superscript":
            return asTagName ? "sup" : "super";
        }
        return asTagName ? null : type;
      }
      static valueOfEmphasisMark(c) {
        var type = xml_parser_default.attr(c, "val");
        switch (type) {
          case "none":
            return "none";
          case "comma":
            return '"\uFE50"';
          case "circle":
            return "circle";
          case "dot":
          case "underDot":
          default:
            return "dot";
        }
      }
      static valueOfTextAlignment(c) {
        var type = xml_parser_default.attr(c, "val");
        switch (type) {
          case "auto":
          case "baseline":
            return "baseline";
          case "top":
            return "top";
          case "center":
            return "middle";
          case "bottom":
            return "bottom";
        }
        return type;
      }
      static addSize(a, b) {
        if (!a || a == "0.00pt" || a == "0px") return b;
        if (!b || b == "0.00pt" || b == "0px") return a;
        return `calc(${a} + ${b})`;
      }
      static classNameOftblLook(c) {
        const val = xml_parser_default.hexAttr(c, "val", 0);
        let className = "";
        if (xml_parser_default.boolAttr(c, "firstRow") || val & 32) className += " first-row";
        if (xml_parser_default.boolAttr(c, "lastRow") || val & 64) className += " last-row";
        if (xml_parser_default.boolAttr(c, "firstColumn") || val & 128) className += " first-col";
        if (xml_parser_default.boolAttr(c, "lastColumn") || val & 256) className += " last-col";
        if (xml_parser_default.boolAttr(c, "noHBand") || val & 512) className += " no-hband";
        if (xml_parser_default.boolAttr(c, "noVBand") || val & 1024) className += " no-vband";
        return className.trim();
      }
    };

    // src/input-validation.ts
    var EMPTY_DOCX_ERROR_MESSAGE = "\u6587\u4EF6\u4E3A\u7A7A\u6216\u5C1A\u672A\u4FDD\u5B58\uFF0C\u65E0\u6CD5\u4F5C\u4E3A Word \u6587\u6863\u6253\u5F00\u3002\u8BF7\u5728 WPS/Word \u4E2D\u4FDD\u5B58\u540E\u91CD\u65B0\u4E0A\u4F20\u3002";
    function assertNonEmptyDocxInput(input) {
      const size = binaryInputSize(input);
      if (size === 0)
        throw new Error(EMPTY_DOCX_ERROR_MESSAGE);
    }
    function binaryInputSize(input) {
      if (input == null)
        return 0;
      if (typeof Blob != "undefined" && input instanceof Blob)
        return input.size;
      if (typeof ArrayBuffer != "undefined") {
        if (input instanceof ArrayBuffer)
          return input.byteLength;
        if (ArrayBuffer.isView(input))
          return input.byteLength;
      }
      if (typeof input.size == "number")
        return input.size;
      if (typeof input.byteLength == "number")
        return input.byteLength;
      if (typeof input.length == "number")
        return input.length;
      return null;
    }

    // src/docx-preview-worker.ts
    setXmlRuntime({
      parse: (source) => {
        if (/<!DOCTYPE|<!ENTITY/i.test(String(source)))
          throw new Error("DTD declarations are not allowed in document XML.");
        return new import_xmldom.DOMParser({
          onError: (level, message) => {
            if (level !== "warning")
              throw new Error(message);
          }
        }).parseFromString(source, "application/xml");
      },
      serialize: (node) => new import_xmldom.XMLSerializer().serializeToString(node)
    });
    var ctx = self;
    function selectedZipLoader(url) {
      if (url === void 0)
        return void 0;
      if (typeof url !== "string" || !url.trim())
        throw new Error("The Worker library URL must be a non-empty string.");
      const workerLocation = new URL(ctx.location.href);
      const libraryUrl = new URL(url, workerLocation);
      const libraryOriginUrl = libraryUrl.protocol === "blob:" ? new URL(libraryUrl.pathname) : libraryUrl;
      if (!["http:", "https:", "blob:"].includes(libraryUrl.protocol) || workerLocation.origin === "null" || libraryUrl.origin !== workerLocation.origin || libraryOriginUrl.username || libraryOriginUrl.password)
        throw new Error("The Worker library must use a same-origin HTTP(S) or Blob URL without credentials.");
      delete ctx.JSZip;
      ctx.importScripts(libraryUrl.href);
      const jszip = ctx.JSZip;
      if (!jszip || typeof jszip.loadAsync !== "function")
        throw new Error("The selected Worker JSZip script did not provide JSZip.loadAsync");
      return (input) => jszip.loadAsync(input);
    }
    function post(id, type, payload = {}) {
      ctx.postMessage({ id, type, ...payload });
    }
    ctx.onmessage = async (ev) => {
      const msg = ev.data;
      if (!msg || msg.type !== "parse")
        return;
      const id = msg.id;
      try {
        const options = {
          ...msg.options,
          useWorker: false,
          h: void 0,
          progress: void 0,
          zipLoader: selectedZipLoader(msg.jsZipUrl)
        };
        assertNonEmptyDocxInput(msg.data);
        post(id, "progress", { current: 1, total: 3, message: "Loading package relationships" });
        const document2 = await WordDocument.load(msg.data, new DocumentParser(options), options);
        post(id, "progress", { current: 2, total: 3, message: "Serializing parsed document model" });
        const snapshot = await document2.createSnapshot();
        post(id, "progress", { current: 3, total: 3, message: "Worker parse complete" });
        post(id, "parsed", { snapshot });
      } catch (error) {
        post(id, "error", {
          error: {
            message: error?.message ?? `${error}`,
            stack: error?.stack
          }
        });
      }
    };
  })();
  /*! Bundled license information:

  jszip/dist/jszip.min.js:
    (*!
    
    JSZip v3.10.2 - A JavaScript class for generating and reading zip files
    <http://stuartk.com/jszip>
    
    (c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
    Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/main/LICENSE.markdown.
    
    JSZip uses the library pako released under the MIT license :
    https://github.com/nodeca/pako/blob/main/LICENSE
    *)
  */

})();
