/*!
 * @license @file-viewer/docx, derived from docx-preview
 * https://github.com/VolodymyrBaydalka/docxjs
 * Copyright Volodymyr Baydalka
 * Released under the Apache License 2.0. See LICENSE.
 * Bundled dependency notices: THIRD_PARTY_NOTICES.txt.
 */
(function () {
	'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var lib = {};

	var conventions = {};

	var hasRequiredConventions;

	function requireConventions () {
		if (hasRequiredConventions) return conventions;
		hasRequiredConventions = 1;

		/**
		 * Ponyfill for `Array.prototype.find` which is only available in ES6 runtimes.
		 *
		 * Works with anything that has a `length` property and index access properties,
		 * including NodeList.
		 *
		 * @param {T[] | { length: number; [number]: T }} list
		 * @param {function (item: T, index: number, list:T[]):boolean} predicate
		 * @param {Partial<Pick<ArrayConstructor['prototype'], 'find'>>?} ac
		 * Allows injecting a custom implementation in tests (`Array.prototype` by default).
		 * @returns {T | undefined}
		 * @template {unknown} T
		 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
		 * @see https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.find
		 */
		function find(list, predicate, ac) {
			if (ac === undefined) {
				ac = Array.prototype;
			}
			if (list && typeof ac.find === 'function') {
				return ac.find.call(list, predicate);
			}
			for (var i = 0; i < list.length; i++) {
				if (hasOwn(list, i)) {
					var item = list[i];
					if (predicate.call(undefined, item, i, list)) {
						return item;
					}
				}
			}
		}

		/**
		 * "Shallow freezes" an object to render it immutable.
		 * Uses `Object.freeze` if available,
		 * otherwise the immutability is only in the type.
		 *
		 * Is used to create "enum like" objects.
		 *
		 * If `Object.getOwnPropertyDescriptors` is available,
		 * a new object with all properties of object but without any prototype is created and returned
		 * after freezing it.
		 *
		 * @param {T} object
		 * The object to freeze.
		 * @param {Pick<ObjectConstructor, 'create' | 'freeze' | 'getOwnPropertyDescriptors'>} [oc=Object]
		 * `Object` by default,
		 * allows to inject custom object constructor for tests.
		 * @returns {Readonly<T>}
		 * @template {Object} T
		 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
		 * @prettierignore
		 */
		function freeze(object, oc) {
			if (oc === undefined) {
				oc = Object;
			}
			if (oc && typeof oc.getOwnPropertyDescriptors === 'function') {
				object = oc.create(null, oc.getOwnPropertyDescriptors(object));
			}
			return oc && typeof oc.freeze === 'function' ? oc.freeze(object) : object;
		}

		/**
		 * Implementation for `Object.hasOwn` but ES5 compatible.
		 *
		 * @param {any} object
		 * @param {string | number} key
		 * @returns {boolean}
		 */
		function hasOwn(object, key) {
			return Object.prototype.hasOwnProperty.call(object, key);
		}

		/**
		 * Since xmldom can not rely on `Object.assign`,
		 * it uses/provides a simplified version that is sufficient for its needs.
		 *
		 * @param {Object} target
		 * @param {Object | null | undefined} source
		 * @returns {Object}
		 * The target with the merged/overridden properties.
		 * @throws {TypeError}
		 * If target is not an object.
		 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
		 * @see https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.assign
		 */
		function assign(target, source) {
			if (target === null || typeof target !== 'object') {
				throw new TypeError('target is not an object');
			}
			for (var key in source) {
				if (hasOwn(source, key)) {
					target[key] = source[key];
				}
			}
			return target;
		}

		/**
		 * A number of attributes are boolean attributes.
		 * The presence of a boolean attribute on an element represents the `true` value,
		 * and the absence of the attribute represents the `false` value.
		 *
		 * If the attribute is present, its value must either be the empty string, or a value that is
		 * an ASCII case-insensitive match for the attribute's canonical name,
		 * with no leading or trailing whitespace.
		 *
		 * Note: The values `"true"` and `"false"` are not allowed on boolean attributes.
		 * To represent a `false` value, the attribute has to be omitted altogether.
		 *
		 * @see https://html.spec.whatwg.org/#boolean-attributes
		 * @see https://html.spec.whatwg.org/#attributes-3
		 */
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
			selected: true,
		});

		/**
		 * Check if `name` is matching one of the HTML boolean attribute names.
		 * This method doesn't check if such attributes are allowed in the context of the current
		 * document/parsing.
		 *
		 * @param {string} name
		 * @returns {boolean}
		 * @see {@link HTML_BOOLEAN_ATTRIBUTES}
		 * @see https://html.spec.whatwg.org/#boolean-attributes
		 * @see https://html.spec.whatwg.org/#attributes-3
		 */
		function isHTMLBooleanAttribute(name) {
			return hasOwn(HTML_BOOLEAN_ATTRIBUTES, name.toLowerCase());
		}

		/**
		 * Void elements only have a start tag; end tags must not be specified for void elements.
		 * These elements should be written as self-closing like this: `<area />`.
		 * This should not be confused with optional tags that HTML allows to omit the end tag for
		 * (like `li`, `tr` and others), which can have content after them,
		 * so they can not be written as self-closing.
		 * xmldom does not have any logic for optional end tags cases,
		 * and will report them as a warning.
		 * Content that would go into the unopened element,
		 * will instead be added as a sibling text node.
		 *
		 * @type {Readonly<{
		 * 	area: boolean;
		 * 	col: boolean;
		 * 	img: boolean;
		 * 	wbr: boolean;
		 * 	link: boolean;
		 * 	hr: boolean;
		 * 	source: boolean;
		 * 	br: boolean;
		 * 	input: boolean;
		 * 	param: boolean;
		 * 	meta: boolean;
		 * 	embed: boolean;
		 * 	track: boolean;
		 * 	base: boolean;
		 * }>}
		 * @see https://html.spec.whatwg.org/#void-elements
		 * @see https://html.spec.whatwg.org/#optional-tags
		 */
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
			wbr: true,
		});

		/**
		 * Check if `tagName` is matching one of the HTML void element names.
		 * This method doesn't check if such tags are allowed in the context of the current
		 * document/parsing.
		 *
		 * @param {string} tagName
		 * @returns {boolean}
		 * @see {@link HTML_VOID_ELEMENTS}
		 * @see https://html.spec.whatwg.org/#void-elements
		 */
		function isHTMLVoidElement(tagName) {
			return hasOwn(HTML_VOID_ELEMENTS, tagName.toLowerCase());
		}

		/**
		 * Tag names that are raw text elements according to HTML spec.
		 * The value denotes whether they are escapable or not.
		 *
		 * @see {@link isHTMLEscapableRawTextElement}
		 * @see {@link isHTMLRawTextElement}
		 * @see https://html.spec.whatwg.org/#raw-text-elements
		 * @see https://html.spec.whatwg.org/#escapable-raw-text-elements
		 */
		var HTML_RAW_TEXT_ELEMENTS = freeze({
			script: false,
			style: false,
			textarea: true,
			title: true,
		});

		/**
		 * Check if `tagName` is matching one of the HTML raw text element names.
		 * This method doesn't check if such tags are allowed in the context of the current
		 * document/parsing.
		 *
		 * @param {string} tagName
		 * @returns {boolean}
		 * @see {@link isHTMLEscapableRawTextElement}
		 * @see {@link HTML_RAW_TEXT_ELEMENTS}
		 * @see https://html.spec.whatwg.org/#raw-text-elements
		 * @see https://html.spec.whatwg.org/#escapable-raw-text-elements
		 */
		function isHTMLRawTextElement(tagName) {
			var key = tagName.toLowerCase();
			return hasOwn(HTML_RAW_TEXT_ELEMENTS, key) && !HTML_RAW_TEXT_ELEMENTS[key];
		}
		/**
		 * Check if `tagName` is matching one of the HTML escapable raw text element names.
		 * This method doesn't check if such tags are allowed in the context of the current
		 * document/parsing.
		 *
		 * @param {string} tagName
		 * @returns {boolean}
		 * @see {@link isHTMLRawTextElement}
		 * @see {@link HTML_RAW_TEXT_ELEMENTS}
		 * @see https://html.spec.whatwg.org/#raw-text-elements
		 * @see https://html.spec.whatwg.org/#escapable-raw-text-elements
		 */
		function isHTMLEscapableRawTextElement(tagName) {
			var key = tagName.toLowerCase();
			return hasOwn(HTML_RAW_TEXT_ELEMENTS, key) && HTML_RAW_TEXT_ELEMENTS[key];
		}
		/**
		 * Only returns true if `value` matches MIME_TYPE.HTML, which indicates an HTML document.
		 *
		 * @param {string} mimeType
		 * @returns {mimeType is 'text/html'}
		 * @see https://www.iana.org/assignments/media-types/text/html
		 * @see https://en.wikipedia.org/wiki/HTML
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString
		 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-domparser-parsefromstring
		 */
		function isHTMLMimeType(mimeType) {
			return mimeType === MIME_TYPE.HTML;
		}
		/**
		 * For both the `text/html` and the `application/xhtml+xml` namespace the spec defines that the
		 * HTML namespace is provided as the default.
		 *
		 * @param {string} mimeType
		 * @returns {boolean}
		 * @see https://dom.spec.whatwg.org/#dom-document-createelement
		 * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument
		 * @see https://dom.spec.whatwg.org/#dom-domimplementation-createhtmldocument
		 */
		function hasDefaultHTMLNamespace(mimeType) {
			return isHTMLMimeType(mimeType) || mimeType === MIME_TYPE.XML_XHTML_APPLICATION;
		}

		/**
		 * All mime types that are allowed as input to `DOMParser.parseFromString`
		 *
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString#Argument02
		 *      MDN
		 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#domparsersupportedtype
		 *      WHATWG HTML Spec
		 * @see {@link DOMParser.prototype.parseFromString}
		 */
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
			HTML: 'text/html',

			/**
			 * `application/xml`, the standard mime type for XML documents.
			 *
			 * @see https://www.iana.org/assignments/media-types/application/xml IANA MimeType
			 *      registration
			 * @see https://tools.ietf.org/html/rfc7303#section-9.1 RFC 7303
			 * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
			 */
			XML_APPLICATION: 'application/xml',

			/**
			 * `text/xml`, an alias for `application/xml`.
			 *
			 * @see https://tools.ietf.org/html/rfc7303#section-9.2 RFC 7303
			 * @see https://www.iana.org/assignments/media-types/text/xml IANA MimeType registration
			 * @see https://en.wikipedia.org/wiki/XML_and_MIME Wikipedia
			 */
			XML_TEXT: 'text/xml',

			/**
			 * `application/xhtml+xml`, indicates an XML document that has the default HTML namespace,
			 * but is parsed as an XML document.
			 *
			 * @see https://www.iana.org/assignments/media-types/application/xhtml+xml IANA MimeType
			 *      registration
			 * @see https://dom.spec.whatwg.org/#dom-domimplementation-createdocument WHATWG DOM Spec
			 * @see https://en.wikipedia.org/wiki/XHTML Wikipedia
			 */
			XML_XHTML_APPLICATION: 'application/xhtml+xml',

			/**
			 * `image/svg+xml`,
			 *
			 * @see https://www.iana.org/assignments/media-types/image/svg+xml IANA MimeType registration
			 * @see https://www.w3.org/TR/SVG11/ W3C SVG 1.1
			 * @see https://en.wikipedia.org/wiki/Scalable_Vector_Graphics Wikipedia
			 */
			XML_SVG_IMAGE: 'image/svg+xml',
		});
		/**
		 * @typedef {'application/xhtml+xml' | 'application/xml' | 'image/svg+xml' | 'text/html' | 'text/xml'}
		 * MimeType
		 */
		/**
		 * @type {MimeType[]}
		 * @private
		 * Basically `Object.values`, which is not available in ES5.
		 */
		var _MIME_TYPES = Object.keys(MIME_TYPE).map(function (key) {
			return MIME_TYPE[key];
		});

		/**
		 * Only returns true if `mimeType` is one of the allowed values for
		 * `DOMParser.parseFromString`.
		 *
		 * @param {string} mimeType
		 * @returns {mimeType is 'application/xhtml+xml' | 'application/xml' | 'image/svg+xml' |  'text/html' | 'text/xml'}
		 *
		 */
		function isValidMimeType(mimeType) {
			return _MIME_TYPES.indexOf(mimeType) > -1;
		}
		/**
		 * Namespaces that are used in this code base.
		 *
		 * @see http://www.w3.org/TR/REC-xml-names
		 */
		var NAMESPACE = freeze({
			/**
			 * The XHTML namespace.
			 *
			 * @see http://www.w3.org/1999/xhtml
			 */
			HTML: 'http://www.w3.org/1999/xhtml',

			/**
			 * The SVG namespace.
			 *
			 * @see http://www.w3.org/2000/svg
			 */
			SVG: 'http://www.w3.org/2000/svg',

			/**
			 * The `xml:` namespace.
			 *
			 * @see http://www.w3.org/XML/1998/namespace
			 */
			XML: 'http://www.w3.org/XML/1998/namespace',

			/**
			 * The `xmlns:` namespace.
			 *
			 * @see https://www.w3.org/2000/xmlns/
			 */
			XMLNS: 'http://www.w3.org/2000/xmlns/',
		});

		conventions.assign = assign;
		conventions.find = find;
		conventions.freeze = freeze;
		conventions.HTML_BOOLEAN_ATTRIBUTES = HTML_BOOLEAN_ATTRIBUTES;
		conventions.HTML_RAW_TEXT_ELEMENTS = HTML_RAW_TEXT_ELEMENTS;
		conventions.HTML_VOID_ELEMENTS = HTML_VOID_ELEMENTS;
		conventions.hasDefaultHTMLNamespace = hasDefaultHTMLNamespace;
		conventions.hasOwn = hasOwn;
		conventions.isHTMLBooleanAttribute = isHTMLBooleanAttribute;
		conventions.isHTMLRawTextElement = isHTMLRawTextElement;
		conventions.isHTMLEscapableRawTextElement = isHTMLEscapableRawTextElement;
		conventions.isHTMLMimeType = isHTMLMimeType;
		conventions.isHTMLVoidElement = isHTMLVoidElement;
		conventions.isValidMimeType = isValidMimeType;
		conventions.MIME_TYPE = MIME_TYPE;
		conventions.NAMESPACE = NAMESPACE;
		return conventions;
	}

	var errors = {};

	var hasRequiredErrors;

	function requireErrors () {
		if (hasRequiredErrors) return errors;
		hasRequiredErrors = 1;

		var conventions = requireConventions();

		function extendError(constructor, writableName) {
			constructor.prototype = Object.create(Error.prototype, {
				constructor: { value: constructor },
				name: { value: constructor.name, enumerable: true, writable: writableName },
			});
		}

		var DOMExceptionName = conventions.freeze({
			/**
			 * the default value as defined by the spec
			 */
			Error: 'Error',
			/**
			 * @deprecated
			 * Use RangeError instead.
			 */
			IndexSizeError: 'IndexSizeError',
			/**
			 * @deprecated
			 * Just to match the related static code, not part of the spec.
			 */
			DomstringSizeError: 'DomstringSizeError',
			HierarchyRequestError: 'HierarchyRequestError',
			WrongDocumentError: 'WrongDocumentError',
			InvalidCharacterError: 'InvalidCharacterError',
			/**
			 * @deprecated
			 * Just to match the related static code, not part of the spec.
			 */
			NoDataAllowedError: 'NoDataAllowedError',
			NoModificationAllowedError: 'NoModificationAllowedError',
			NotFoundError: 'NotFoundError',
			NotSupportedError: 'NotSupportedError',
			InUseAttributeError: 'InUseAttributeError',
			InvalidStateError: 'InvalidStateError',
			SyntaxError: 'SyntaxError',
			InvalidModificationError: 'InvalidModificationError',
			NamespaceError: 'NamespaceError',
			/**
			 * @deprecated
			 * Use TypeError for invalid arguments,
			 * "NotSupportedError" DOMException for unsupported operations,
			 * and "NotAllowedError" DOMException for denied requests instead.
			 */
			InvalidAccessError: 'InvalidAccessError',
			/**
			 * @deprecated
			 * Just to match the related static code, not part of the spec.
			 */
			ValidationError: 'ValidationError',
			/**
			 * @deprecated
			 * Use TypeError instead.
			 */
			TypeMismatchError: 'TypeMismatchError',
			SecurityError: 'SecurityError',
			NetworkError: 'NetworkError',
			AbortError: 'AbortError',
			/**
			 * @deprecated
			 * Just to match the related static code, not part of the spec.
			 */
			URLMismatchError: 'URLMismatchError',
			QuotaExceededError: 'QuotaExceededError',
			TimeoutError: 'TimeoutError',
			InvalidNodeTypeError: 'InvalidNodeTypeError',
			DataCloneError: 'DataCloneError',
			EncodingError: 'EncodingError',
			NotReadableError: 'NotReadableError',
			UnknownError: 'UnknownError',
			ConstraintError: 'ConstraintError',
			DataError: 'DataError',
			TransactionInactiveError: 'TransactionInactiveError',
			ReadOnlyError: 'ReadOnlyError',
			VersionError: 'VersionError',
			OperationError: 'OperationError',
			NotAllowedError: 'NotAllowedError',
			OptOutError: 'OptOutError',
		});
		var DOMExceptionNames = Object.keys(DOMExceptionName);

		function isValidDomExceptionCode(value) {
			return typeof value === 'number' && value >= 1 && value <= 25;
		}
		function endsWithError(value) {
			return typeof value === 'string' && value.substring(value.length - DOMExceptionName.Error.length) === DOMExceptionName.Error;
		}
		/**
		 * DOM operations only raise exceptions in "exceptional" circumstances, i.e., when an operation
		 * is impossible to perform (either for logical reasons, because data is lost, or because the
		 * implementation has become unstable). In general, DOM methods return specific error values in
		 * ordinary processing situations, such as out-of-bound errors when using NodeList.
		 *
		 * Implementations should raise other exceptions under other circumstances. For example,
		 * implementations should raise an implementation-dependent exception if a null argument is
		 * passed when null was not expected.
		 *
		 * This implementation supports the following usages:
		 * 1. according to the living standard (both arguments are optional):
		 * ```
		 * new DOMException("message (can be empty)", DOMExceptionNames.HierarchyRequestError)
		 * ```
		 * 2. according to previous xmldom implementation (only the first argument is required):
		 * ```
		 * new DOMException(DOMException.HIERARCHY_REQUEST_ERR, "optional message")
		 * ```
		 * both result in the proper name being set.
		 *
		 * @class DOMException
		 * @param {number | string} messageOrCode
		 * The reason why an operation is not acceptable.
		 * If it is a number, it is used to determine the `name`, see
		 * {@link https://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-258A00AF ExceptionCode}
		 * @param {string | keyof typeof DOMExceptionName | Error} [nameOrMessage]
		 * The `name` to use for the error.
		 * If `messageOrCode` is a number, this arguments is used as the `message` instead.
		 * @augments Error
		 * @see https://webidl.spec.whatwg.org/#idl-DOMException
		 * @see https://webidl.spec.whatwg.org/#dfn-error-names-table
		 * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-17189187
		 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/ecma-script-binding.html
		 * @see http://www.w3.org/TR/REC-DOM-Level-1/ecma-script-language-binding.html
		 */
		function DOMException(messageOrCode, nameOrMessage) {
			// support old way of passing arguments: first argument is a valid number
			if (isValidDomExceptionCode(messageOrCode)) {
				this.name = DOMExceptionNames[messageOrCode];
				this.message = nameOrMessage || '';
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
				get: function () {
					var code = DOMExceptionNames.indexOf(this.name);
					if (isValidDomExceptionCode(code)) return code;
					return 0;
				},
			},
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
			DATA_CLONE_ERR: 25,
		};

		var entries = Object.entries(ExceptionCode);
		for (var i = 0; i < entries.length; i++) {
			var key = entries[i][0];
			DOMException[key] = entries[i][1];
		}

		/**
		 * Creates an error that will not be caught by XMLReader aka the SAX parser.
		 *
		 * @class
		 * @param {string} message
		 * @param {any} [locator]
		 * @param {Error} [cause]
		 * The error that caused this one, e.g. a `DOMException` thrown while building the DOM.
		 */
		function ParseError(message, locator, cause) {
			this.message = message;
			this.locator = locator;
			this.cause = cause;
			if (Error.captureStackTrace) Error.captureStackTrace(this, ParseError);
		}
		extendError(ParseError);

		errors.DOMException = DOMException;
		errors.DOMExceptionName = DOMExceptionName;
		errors.ExceptionCode = ExceptionCode;
		errors.ParseError = ParseError;
		return errors;
	}

	var dom = {};

	var grammar = {};

	var hasRequiredGrammar;

	function requireGrammar () {
		if (hasRequiredGrammar) return grammar;
		hasRequiredGrammar = 1;

		/**
		 * Detects relevant unicode support for regular expressions in the runtime.
		 * Should the runtime not accepts the flag `u` or unicode ranges,
		 * character classes without unicode handling will be used.
		 *
		 * @param {typeof RegExp} [RegExpImpl=RegExp]
		 * For testing: the RegExp class.
		 * @returns {boolean}
		 * @see https://node.green/#ES2015-syntax-RegExp--y--and--u--flags
		 */
		function detectUnicodeSupport(RegExpImpl) {
			try {
				if (typeof RegExpImpl !== 'function') {
					RegExpImpl = RegExp;
				}
				// eslint-disable-next-line es5/no-unicode-regex,es5/no-unicode-code-point-escape
				var match = new RegExpImpl('\u{1d306}', 'u').exec('𝌆');
				return !!match && match[0].length === 2;
			} catch (error) {}
			return false;
		}
		var UNICODE_SUPPORT = detectUnicodeSupport();

		/**
		 * Removes `[`, `]` and any trailing quantifiers from the source of a RegExp.
		 *
		 * @param {RegExp} regexp
		 */
		function chars(regexp) {
			if (regexp.source[0] !== '[') {
				throw new Error(regexp + ' can not be used with chars');
			}
			return regexp.source.slice(1, regexp.source.lastIndexOf(']'));
		}

		/**
		 * Creates a new character list regular expression,
		 * by removing `search` from the source of `regexp`.
		 *
		 * @param {RegExp} regexp
		 * @param {string} search
		 * The character(s) to remove.
		 * @returns {RegExp}
		 */
		function chars_without(regexp, search) {
			if (regexp.source[0] !== '[') {
				throw new Error('/' + regexp.source + '/ can not be used with chars_without');
			}
			if (!search || typeof search !== 'string') {
				throw new Error(JSON.stringify(search) + ' is not a valid search');
			}
			if (regexp.source.indexOf(search) === -1) {
				throw new Error('"' + search + '" is not is /' + regexp.source + '/');
			}
			if (search === '-' && regexp.source.indexOf(search) !== 1) {
				throw new Error('"' + search + '" is not at the first postion of /' + regexp.source + '/');
			}
			return new RegExp(regexp.source.replace(search, ''), UNICODE_SUPPORT ? 'u' : '');
		}

		/**
		 * Combines and Regular expressions correctly by using `RegExp.source`.
		 *
		 * @param {...(RegExp | string)[]} args
		 * @returns {RegExp}
		 */
		function reg(args) {
			var self = this;
			return new RegExp(
				Array.prototype.slice
					.call(arguments)
					.map(function (part) {
						var isStr = typeof part === 'string';
						if (isStr && self === undefined && part === '|') {
							throw new Error('use regg instead of reg to wrap expressions with `|`!');
						}
						return isStr ? part : part.source;
					})
					.join(''),
				UNICODE_SUPPORT ? 'u' : ''
			);
		}

		/**
		 * Like `reg` but wraps the expression in `(?:`,`)` to create a non tracking group.
		 *
		 * @param {...(RegExp | string)[]} args
		 * @returns {RegExp}
		 */
		function regg(args) {
			if (arguments.length === 0) {
				throw new Error('no parameters provided');
			}
			return reg.apply(regg, ['(?:'].concat(Array.prototype.slice.call(arguments), [')']));
		}

		// /**
		//  * Append ^ to the beginning of the expression.
		//  * @param {...(RegExp | string)[]} args
		//  * @returns {RegExp}
		//  */
		// function reg_start(args) {
		// 	if (arguments.length === 0) {
		// 		throw new Error('no parameters provided');
		// 	}
		// 	return reg.apply(reg_start, ['^'].concat(Array.prototype.slice.call(arguments)));
		// }

		// https://www.w3.org/TR/xml/#document
		// `[1] document ::= prolog element Misc*`
		// https://www.w3.org/TR/xml11/#NT-document
		// `[1] document ::= ( prolog element Misc* ) - ( Char* RestrictedChar Char* )`

		/**
		 * A character usually appearing in wrongly converted strings.
		 *
		 * @type {string}
		 * @see https://en.wikipedia.org/wiki/Specials_(Unicode_block)#Replacement_character
		 * @see https://nodejs.dev/en/api/v18/buffer/#buffers-and-character-encodings
		 * @see https://www.unicode.org/faq/utf_bom.html#BOM
		 * @readonly
		 */
		var UNICODE_REPLACEMENT_CHARACTER = '\uFFFD';
		// https://www.w3.org/TR/xml/#NT-Char
		// any Unicode character, excluding the surrogate blocks, FFFE, and FFFF.
		// `[2] Char ::= #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]`
		// https://www.w3.org/TR/xml11/#NT-Char
		// `[2] Char ::= [#x1-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]`
		// https://www.w3.org/TR/xml11/#NT-RestrictedChar
		// `[2a] RestrictedChar ::= [#x1-#x8] | [#xB-#xC] | [#xE-#x1F] | [#x7F-#x84] | [#x86-#x9F]`
		// https://www.w3.org/TR/xml11/#charsets
		var Char = /[-\x09\x0A\x0D\x20-\x2C\x2E-\uD7FF\uE000-\uFFFD]/; // without \u10000-\uEFFFF
		if (UNICODE_SUPPORT) {
			// eslint-disable-next-line es5/no-unicode-code-point-escape
			Char = reg('[', chars(Char), '\\u{10000}-\\u{10FFFF}', ']');
		}
		// Negation of Char: matches any character that is NOT a valid XML 1.0 Char.
		// Derived directly from the Char character class above (after the unicode-support extension).
		// XML 1.0 Char production [2]: #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
		// @see https://www.w3.org/TR/xml/#NT-Char
		var InvalidChar = new RegExp('[^' + chars(Char) + ']', UNICODE_SUPPORT ? 'u' : '');

		var _SChar = /[\x20\x09\x0D\x0A]/;
		var SChar_s = chars(_SChar);
		// https://www.w3.org/TR/xml11/#NT-S
		// `[3] S ::= (#x20 | #x9 | #xD | #xA)+`
		var S = reg(_SChar, '+');
		// optional whitespace described as `S?` in the grammar,
		// simplified to 0-n occurrences of the character class
		// instead of 0-1 occurrences of a non-capturing group around S
		var S_OPT = reg(_SChar, '*');

		// https://www.w3.org/TR/xml11/#NT-NameStartChar
		// `[4] NameStartChar ::= ":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]`
		var NameStartChar =
			/[:_a-zA-Z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/; // without \u10000-\uEFFFF
		if (UNICODE_SUPPORT) {
			// eslint-disable-next-line es5/no-unicode-code-point-escape
			NameStartChar = reg('[', chars(NameStartChar), '\\u{10000}-\\u{10FFFF}', ']');
		}
		var NameStartChar_s = chars(NameStartChar);

		// https://www.w3.org/TR/xml11/#NT-NameChar
		// `[4a] NameChar ::= NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]`
		var NameChar = reg('[', NameStartChar_s, chars(/[-.0-9\xB7]/), chars(/[\u0300-\u036F\u203F-\u2040]/), ']');
		// https://www.w3.org/TR/xml11/#NT-Name
		// `[5] Name ::= NameStartChar (NameChar)*`
		var Name = reg(NameStartChar, NameChar, '*');
		// Full-string anchored matcher for requireWellFormed serializer checks
		// https://w3c.github.io/DOM-Parsing/#xml-serializing-a-document-node
		var Name_exact = reg('^', Name, '$');
		/*
		https://www.w3.org/TR/xml11/#NT-Names
		`[6] Names ::= Name (#x20 Name)*`
		*/

		// https://www.w3.org/TR/xml11/#NT-Nmtoken
		// `[7] Nmtoken ::= (NameChar)+`
		var Nmtoken = reg(NameChar, '+');
		/*
		https://www.w3.org/TR/xml11/#NT-Nmtokens
		`[8] Nmtokens ::= Nmtoken (#x20 Nmtoken)*`
		var Nmtokens = reg(Nmtoken, regg(/\x20/, Nmtoken), '*');
		*/

		// https://www.w3.org/TR/xml11/#NT-EntityRef
		// `[68] EntityRef ::= '&' Name ';'` [WFC: Entity Declared] [VC: Entity Declared] [WFC: Parsed Entity] [WFC: No Recursion]
		var EntityRef = reg('&', Name, ';');
		// https://www.w3.org/TR/xml11/#NT-CharRef
		// `[66] CharRef ::= '&#' [0-9]+ ';' | '&#x' [0-9a-fA-F]+ ';'` [WFC: Legal Character]
		var CharRef = regg(/&#[0-9]+;|&#x[0-9a-fA-F]+;/);

		/*
		https://www.w3.org/TR/xml11/#NT-Reference
		- `[67] Reference ::= EntityRef | CharRef`
		- `[66] CharRef ::= '&#' [0-9]+ ';' | '&#x' [0-9a-fA-F]+ ';'` [WFC: Legal Character]
		- `[68] EntityRef ::= '&' Name ';'` [WFC: Entity Declared] [VC: Entity Declared] [WFC: Parsed Entity] [WFC: No Recursion]
		*/
		var Reference = regg(EntityRef, '|', CharRef);

		// https://www.w3.org/TR/xml11/#NT-PEReference
		// `[69] PEReference ::= '%' Name ';'`
		// [VC: Entity Declared] [WFC: No Recursion] [WFC: In DTD]
		var PEReference = reg('%', Name, ';');

		// https://www.w3.org/TR/xml11/#NT-EntityValue
		// `[9] EntityValue ::= '"' ([^%&"] | PEReference | Reference)* '"' | "'" ([^%&'] | PEReference | Reference)* "'"`
		var EntityValue = regg(
			reg('"', regg(/[^%&"]/, '|', PEReference, '|', Reference), '*', '"'),
			'|',
			reg("'", regg(/[^%&']/, '|', PEReference, '|', Reference), '*', "'")
		);

		// https://www.w3.org/TR/xml11/#NT-AttValue
		// `[10] AttValue ::= '"' ([^<&"] | Reference)* '"' | "'" ([^<&'] | Reference)* "'"`
		var AttValue = regg('"', regg(/[^<&"]/, '|', Reference), '*', '"', '|', "'", regg(/[^<&']/, '|', Reference), '*', "'");

		// https://www.w3.org/TR/xml-names/#ns-decl
		// https://www.w3.org/TR/xml-names/#ns-qualnames
		// NameStartChar without ":"
		var NCNameStartChar = chars_without(NameStartChar, ':');
		// https://www.w3.org/TR/xml-names/#orphans
		// `[5] NCNameChar ::= NameChar - ':'`
		// An XML NameChar, minus the ":"
		var NCNameChar = chars_without(NameChar, ':');
		// https://www.w3.org/TR/xml-names/#NT-NCName
		// `[4] NCName ::= Name - (Char* ':' Char*)`
		// An XML Name, minus the ":"
		var NCName = reg(NCNameStartChar, NCNameChar, '*');
		// Full-string anchored matcher for requireWellFormed serializer checks
		// https://w3c.github.io/DOM-Parsing/#xml-serializing-a-document-node
		var NCName_exact = reg('^', NCName, '$');

		/**
		https://www.w3.org/TR/xml-names/#ns-qualnames

		```
		[7] QName ::= PrefixedName | UnprefixedName
						  === (NCName ':' NCName) | NCName
						  === NCName (':' NCName)?
		[8] PrefixedName ::= Prefix ':' LocalPart
										 === NCName ':' NCName
		[9] UnprefixedName ::= LocalPart
											 === NCName
		[10] Prefix ::= NCName
		[11] LocalPart ::= NCName
		```
		*/
		var QName = reg(NCName, regg(':', NCName), '?');
		var QName_exact = reg('^', QName, '$');
		var QName_group = reg('(', QName, ')');

		// https://www.w3.org/TR/xml11/#NT-SystemLiteral
		// `[11] SystemLiteral ::= ('"' [^"]* '"') | ("'" [^']* "'")`
		var SystemLiteral = regg(/"[^"]*"|'[^']*'/);

		/*
		 https://www.w3.org/TR/xml11/#NT-PI
		 ```
		 [17] PITarget    ::= Name - (('X' | 'x') ('M' | 'm') ('L' | 'l'))
		 [16] PI    ::= '<?' PITarget (S (Char* - (Char* '?>' Char*)))? '?>'
		 ```
		 target /xml/i is not excluded!
		*/
		// The `(?!S)` after the leading `S+` asserts the data starts with a non-whitespace
		// character (greedy `S+` already consumes all separating whitespace), pruning the
		// `S+`/`Char*?` whitespace overlap that otherwise makes an unterminated PI (no `?>`)
		// backtrack quadratically. The lookahead is non-capturing, so the data stays group 2.
		var PI = reg(/^<\?/, '(', Name, ')', regg(S, '(?!', _SChar, ')(', Char, '*?)'), '?', /\?>/);

		// https://www.w3.org/TR/xml11/#NT-PubidChar
		// `[13] PubidChar ::= #x20 | #xD | #xA | [a-zA-Z0-9] | [-'()+,./:=?;!*#@$_%]`
		var PubidChar = /[\x20\x0D\x0Aa-zA-Z0-9-'()+,./:=?;!*#@$_%]/;

		// https://www.w3.org/TR/xml11/#NT-PubidLiteral
		// `[12] PubidLiteral ::= '"' PubidChar* '"' | "'" (PubidChar - "'")* "'"`
		var PubidLiteral = regg('"', PubidChar, '*"', '|', "'", chars_without(PubidChar, "'"), "*'");

		// https://www.w3.org/TR/xml11/#NT-CharData
		// `[14] CharData    ::= [^<&]* - ([^<&]* ']]>' [^<&]*)`

		var COMMENT_START = '<!--';
		var COMMENT_END = '-->';
		// https://www.w3.org/TR/xml11/#NT-Comment
		// `[15] Comment ::= '<!--' ((Char - '-') | ('-' (Char - '-')))* '-->'`
		var Comment = reg(COMMENT_START, regg(chars_without(Char, '-'), '|', reg('-', chars_without(Char, '-'))), '*', COMMENT_END);

		var PCDATA = '#PCDATA';
		// https://www.w3.org/TR/xml11/#NT-Mixed
		// `[51] Mixed ::= '(' S? '#PCDATA' (S? '|' S? Name)* S? ')*' | '(' S? '#PCDATA' S? ')'`
		// https://www.w3.org/TR/xml-names/#NT-Mixed
		// `[51] Mixed ::= '(' S? '#PCDATA' (S? '|' S? QName)* S? ')*' | '(' S? '#PCDATA' S? ')'`
		// [VC: Proper Group/PE Nesting] [VC: No Duplicate Types]
		var Mixed = regg(
			reg(/\(/, S_OPT, PCDATA, regg(S_OPT, /\|/, S_OPT, QName), '*', S_OPT, /\)\*/),
			'|',
			reg(/\(/, S_OPT, PCDATA, S_OPT, /\)/)
		);

		var _children_quantity = /[?*+]?/;
		/*
		 `[49] choice ::= '(' S? cp ( S? '|' S? cp )+ S? ')'` [VC: Proper Group/PE Nesting]
		 `[50] seq ::= '(' S? cp ( S? ',' S? cp )* S? ')'` [VC: Proper Group/PE Nesting]
		 simplification to solve circular referencing, but doesn't check validity constraint "Proper Group/PE Nesting"
		 var _choice_or_seq = reg('[', NameChar_s, SChar_s, chars(_children_quantity), '()|,]*');
		 ```
		 [48] cp ::= (Name | choice | seq) ('?' | '*' | '+')?
		         === (Name | '(' S? cp ( S? '|' S? cp )+ S? ')' | '(' S? cp ( S? ',' S? cp )* S? ')') ('?' | '*' | '+')?
		         !== (Name | [_choice_or_seq]*) ('?' | '*' | '+')?
		 ```
		 simplification to solve circular referencing, but doesn't check validity constraint "Proper Group/PE Nesting"
		 var cp = reg(regg(Name, '|', _choice_or_seq), _children_quantity);
		*/
		/*
		Inefficient regular expression (High)
		This part of the regular expression may cause exponential backtracking on strings starting with '(|' and containing many repetitions of '|'.
		https://github.com/xmldom/xmldom/security/code-scanning/91
		var choice = regg(/\(/, S_OPT, cp, regg(S_OPT, /\|/, S_OPT, cp), '+', S_OPT, /\)/);
		*/
		/*
		Inefficient regular expression (High)
		This part of the regular expression may cause exponential backtracking on strings starting with '(,' and containing many repetitions of ','.
		https://github.com/xmldom/xmldom/security/code-scanning/92
		var seq = regg(/\(/, S_OPT, cp, regg(S_OPT, /,/, S_OPT, cp), '*', S_OPT, /\)/);
		*/

		// `[47] children ::= (choice | seq) ('?' | '*' | '+')?`
		// simplification to solve circular referencing, but doesn't check validity constraint "Proper Group/PE Nesting"
		var children = reg(/\([^>]+\)/, _children_quantity /*regg(choice, '|', seq), _children_quantity*/);

		// https://www.w3.org/TR/xml11/#NT-contentspec
		// `[46] contentspec ::= 'EMPTY' | 'ANY' | Mixed | children`
		var contentspec = regg('EMPTY', '|', 'ANY', '|', Mixed, '|', children);

		var ELEMENTDECL_START = '<!ELEMENT';
		// https://www.w3.org/TR/xml11/#NT-elementdecl
		// `[45] elementdecl ::= '<!ELEMENT' S Name S contentspec S? '>'`
		// https://www.w3.org/TR/xml-names/#NT-elementdecl
		// `[17] elementdecl ::= '<!ELEMENT' S QName S contentspec S? '>'`
		// because of https://www.w3.org/TR/xml11/#NT-PEReference
		// since xmldom is not supporting replacements of PEReferences in the DTD
		// this also supports PEReference in the possible places
		var elementdecl = reg(ELEMENTDECL_START, S, regg(QName, '|', PEReference), S, regg(contentspec, '|', PEReference), S_OPT, '>');

		// https://www.w3.org/TR/xml11/#NT-NotationType
		// `[58] NotationType ::= 'NOTATION' S '(' S? Name (S? '|' S? Name)* S? ')'`
		// [VC: Notation Attributes] [VC: One Notation Per Element Type] [VC: No Notation on Empty Element] [VC: No Duplicate Tokens]
		var NotationType = reg('NOTATION', S, /\(/, S_OPT, Name, regg(S_OPT, /\|/, S_OPT, Name), '*', S_OPT, /\)/);
		// https://www.w3.org/TR/xml11/#NT-Enumeration
		// `[59] Enumeration ::= '(' S? Nmtoken (S? '|' S? Nmtoken)* S? ')'`
		// [VC: Enumeration] [VC: No Duplicate Tokens]
		var Enumeration = reg(/\(/, S_OPT, Nmtoken, regg(S_OPT, /\|/, S_OPT, Nmtoken), '*', S_OPT, /\)/);

		// https://www.w3.org/TR/xml11/#NT-EnumeratedType
		// `[57] EnumeratedType ::= NotationType | Enumeration`
		var EnumeratedType = regg(NotationType, '|', Enumeration);

		/*
		```
		[55] StringType ::= 'CDATA'
		[56] TokenizedType ::= 'ID' [VC: ID] [VC: One ID per Element Type] [VC: ID Attribute Default]
		   | 'IDREF' [VC: IDREF]
		   | 'IDREFS' [VC: IDREF]
			 | 'ENTITY' [VC: Entity Name]
			 | 'ENTITIES' [VC: Entity Name]
			 | 'NMTOKEN' [VC: Name Token]
			 | 'NMTOKENS' [VC: Name Token]
		 [54] AttType ::= StringType | TokenizedType | EnumeratedType
		```*/
		var AttType = regg(/CDATA|ID|IDREF|IDREFS|ENTITY|ENTITIES|NMTOKEN|NMTOKENS/, '|', EnumeratedType);

		// `[60] DefaultDecl ::= '#REQUIRED' | '#IMPLIED' | (('#FIXED' S)? AttValue)`
		// [WFC: No < in Attribute Values] [WFC: No External Entity References]
		// [VC: Fixed Attribute Default] [VC: Required Attribute] [VC: Attribute Default Value Syntactically Correct]
		var DefaultDecl = regg(/#REQUIRED|#IMPLIED/, '|', regg(regg('#FIXED', S), '?', AttValue));

		// https://www.w3.org/TR/xml11/#NT-AttDef
		// [53] AttDef ::= S Name S AttType S DefaultDecl
		// https://www.w3.org/TR/xml-names/#NT-AttDef
		// [1] NSAttName ::= PrefixedAttName | DefaultAttName
		// [2] PrefixedAttName ::= 'xmlns:' NCName [NSC: Reserved Prefixes and Namespace Names]
		// [3] DefaultAttName ::= 'xmlns'
		// [21] AttDef ::= S (QName | NSAttName) S AttType S DefaultDecl
		// 						 === S Name S AttType S DefaultDecl
		// xmldom is not distinguishing between QName and NSAttName on this level
		// to support XML without namespaces in DTD we can not restrict it to QName
		var AttDef = regg(S, Name, S, AttType, S, DefaultDecl);

		var ATTLIST_DECL_START = '<!ATTLIST';
		// https://www.w3.org/TR/xml11/#NT-AttlistDecl
		// `[52] AttlistDecl ::= '<!ATTLIST' S Name AttDef* S? '>'`
		// https://www.w3.org/TR/xml-names/#NT-AttlistDecl
		// `[20] AttlistDecl ::= '<!ATTLIST' S QName AttDef* S? '>'`
		// to support XML without namespaces in DTD we can not restrict it to QName
		var AttlistDecl = reg(ATTLIST_DECL_START, S, Name, AttDef, '*', S_OPT, '>');

		// https://html.spec.whatwg.org/multipage/urls-and-fetching.html#about:legacy-compat
		var ABOUT_LEGACY_COMPAT = 'about:legacy-compat';
		var ABOUT_LEGACY_COMPAT_SystemLiteral = regg('"' + ABOUT_LEGACY_COMPAT + '"', '|', "'" + ABOUT_LEGACY_COMPAT + "'");
		var SYSTEM = 'SYSTEM';
		var PUBLIC = 'PUBLIC';
		// https://www.w3.org/TR/xml11/#NT-ExternalID
		// `[75] ExternalID ::= 'SYSTEM' S SystemLiteral | 'PUBLIC' S PubidLiteral S SystemLiteral`
		var ExternalID = regg(regg(SYSTEM, S, SystemLiteral), '|', regg(PUBLIC, S, PubidLiteral, S, SystemLiteral));
		var ExternalID_match = reg(
			'^',
			regg(
				regg(SYSTEM, S, '(?<SystemLiteralOnly>', SystemLiteral, ')'),
				'|',
				regg(PUBLIC, S, '(?<PubidLiteral>', PubidLiteral, ')', S, '(?<SystemLiteral>', SystemLiteral, ')')
			)
		);
		// Full-string anchored matcher for requireWellFormed serializer checks
		// https://w3c.github.io/DOM-Parsing/#xml-serializing-a-document-node
		var PubidLiteral_match = reg('^', PubidLiteral, '$');
		// Full-string anchored matcher for requireWellFormed serializer checks
		// https://w3c.github.io/DOM-Parsing/#xml-serializing-a-document-node
		var SystemLiteral_match = reg('^', SystemLiteral, '$');

		// https://www.w3.org/TR/xml11/#NT-NDataDecl
		// `[76] NDataDecl ::= S 'NDATA' S Name` [VC: Notation Declared]
		var NDataDecl = regg(S, 'NDATA', S, Name);

		// https://www.w3.org/TR/xml11/#NT-EntityDef
		// `[73] EntityDef ::= EntityValue | (ExternalID NDataDecl?)`
		var EntityDef = regg(EntityValue, '|', regg(ExternalID, NDataDecl, '?'));

		var ENTITY_DECL_START = '<!ENTITY';
		// https://www.w3.org/TR/xml11/#NT-GEDecl
		// `[71] GEDecl ::= '<!ENTITY' S Name S EntityDef S? '>'`
		var GEDecl = reg(ENTITY_DECL_START, S, Name, S, EntityDef, S_OPT, '>');
		// https://www.w3.org/TR/xml11/#NT-PEDef
		// `[74] PEDef ::= EntityValue | ExternalID`
		var PEDef = regg(EntityValue, '|', ExternalID);
		// https://www.w3.org/TR/xml11/#NT-PEDecl
		// `[72] PEDecl ::= '<!ENTITY' S '%' S Name S PEDef S? '>'`
		var PEDecl = reg(ENTITY_DECL_START, S, '%', S, Name, S, PEDef, S_OPT, '>');
		// https://www.w3.org/TR/xml11/#NT-EntityDecl
		// `[70] EntityDecl ::= GEDecl | PEDecl`
		var EntityDecl = regg(GEDecl, '|', PEDecl);

		// https://www.w3.org/TR/xml11/#NT-PublicID
		// `[83] PublicID    ::= 'PUBLIC' S PubidLiteral`
		var PublicID = reg(PUBLIC, S, PubidLiteral);
		// https://www.w3.org/TR/xml11/#NT-NotationDecl
		// `[82] NotationDecl    ::= '<!NOTATION' S Name S (ExternalID | PublicID) S? '>'` [VC: Unique Notation Name]
		var NotationDecl = reg('<!NOTATION', S, Name, S, regg(ExternalID, '|', PublicID), S_OPT, '>');

		// https://www.w3.org/TR/xml11/#NT-Eq
		// `[25] Eq ::= S? '=' S?`
		var Eq = reg(S_OPT, '=', S_OPT);
		// https://www.w3.org/TR/xml/#NT-VersionNum
		// `[26] VersionNum ::= '1.' [0-9]+`
		// https://www.w3.org/TR/xml11/#NT-VersionNum
		// `[26] VersionNum ::= '1.1'`
		var VersionNum = /1[.]\d+/;
		// https://www.w3.org/TR/xml11/#NT-VersionInfo
		// `[24] VersionInfo ::= S 'version' Eq ("'" VersionNum "'" | '"' VersionNum '"')`
		var VersionInfo = reg(S, 'version', Eq, regg("'", VersionNum, "'", '|', '"', VersionNum, '"'));
		// https://www.w3.org/TR/xml11/#NT-EncName
		// `[81] EncName ::= [A-Za-z] ([A-Za-z0-9._] | '-')*`
		var EncName = /[A-Za-z][-A-Za-z0-9._]*/;
		// https://www.w3.org/TR/xml11/#NT-EncDecl
		// `[80] EncodingDecl ::= S 'encoding' Eq ('"' EncName '"' | "'" EncName "'" )`
		var EncodingDecl = regg(S, 'encoding', Eq, regg('"', EncName, '"', '|', "'", EncName, "'"));
		// https://www.w3.org/TR/xml11/#NT-SDDecl
		// `[32] SDDecl ::= S 'standalone' Eq (("'" ('yes' | 'no') "'") | ('"' ('yes' | 'no') '"'))`
		var SDDecl = regg(S, 'standalone', Eq, regg("'", regg('yes', '|', 'no'), "'", '|', '"', regg('yes', '|', 'no'), '"'));
		// https://www.w3.org/TR/xml11/#NT-XMLDecl
		// [23] XMLDecl ::= '<?xml' VersionInfo EncodingDecl? SDDecl? S? '?>'
		var XMLDecl = reg(/^<\?xml/, VersionInfo, EncodingDecl, '?', SDDecl, '?', S_OPT, /\?>/);

		/*
		 https://www.w3.org/TR/xml/#NT-markupdecl
		 https://www.w3.org/TR/xml11/#NT-markupdecl
		 `[29] markupdecl ::= elementdecl | AttlistDecl | EntityDecl | NotationDecl | PI | Comment`
		 var markupdecl = regg(elementdecl, '|', AttlistDecl, '|', EntityDecl, '|', NotationDecl, '|', PI_unsafe, '|', Comment);
		*/
		/*
		 https://www.w3.org/TR/xml-names/#NT-doctypedecl
		`[28a] DeclSep   ::= PEReference | S`
		 https://www.w3.org/TR/xml11/#NT-intSubset
		```
		 [28b] intSubset ::= (markupdecl | DeclSep)*
		                 === (markupdecl | PEReference | S)*
		```
		 [WFC: PE Between Declarations]
		 var intSubset = reg(regg(markupdecl, '|', PEReference, '|', S), '*');
		*/
		var DOCTYPE_DECL_START = '<!DOCTYPE';
		/*
		 https://www.w3.org/TR/xml11/#NT-doctypedecl
		 `[28] doctypedecl ::= '<!DOCTYPE' S Name (S ExternalID)? S? ('[' intSubset ']' S?)? '>'`
		 https://www.afterwardsw3.org/TR/xml-names/#NT-doctypedecl
		 `[16] doctypedecl ::= '<!DOCTYPE' S QName (S ExternalID)? S? ('[' (markupdecl | PEReference | S)* ']' S?)? '>'`
		 var doctypedecl = reg('<!DOCTYPE', S, Name, regg(S, ExternalID), '?', S_OPT, regg(/\[/, intSubset, /]/, S_OPT), '?', '>');
		*/

		var CDATA_START = '<![CDATA[';
		var CDATA_END = ']]>';
		var CDStart = /<!\[CDATA\[/;
		var CDEnd = /\]\]>/;
		var CData = reg(Char, '*?', CDEnd);
		/*
		 https://www.w3.org/TR/xml/#dt-cdsection
		 `[18]   	CDSect	   ::=   	CDStart CData CDEnd`
		 `[19]   	CDStart	   ::=   	'<![CDATA['`
		 `[20]   	CData	   ::=   	(Char* - (Char* ']]>' Char*))`
		 `[21]   	CDEnd	   ::=   	']]>'`
		*/
		var CDSect = reg(CDStart, CData);

		// unit tested
		grammar.chars = chars;
		grammar.chars_without = chars_without;
		grammar.detectUnicodeSupport = detectUnicodeSupport;
		grammar.reg = reg;
		grammar.regg = regg;
		grammar.ABOUT_LEGACY_COMPAT = ABOUT_LEGACY_COMPAT;
		grammar.ABOUT_LEGACY_COMPAT_SystemLiteral = ABOUT_LEGACY_COMPAT_SystemLiteral;
		grammar.AttlistDecl = AttlistDecl;
		grammar.CDATA_START = CDATA_START;
		grammar.CDATA_END = CDATA_END;
		grammar.CDSect = CDSect;
		grammar.Char = Char;
		grammar.Comment = Comment;
		grammar.COMMENT_START = COMMENT_START;
		grammar.COMMENT_END = COMMENT_END;
		grammar.DOCTYPE_DECL_START = DOCTYPE_DECL_START;
		grammar.elementdecl = elementdecl;
		grammar.EntityDecl = EntityDecl;
		grammar.EntityValue = EntityValue;
		grammar.ExternalID = ExternalID;
		grammar.ExternalID_match = ExternalID_match;
		grammar.Name = Name;
		grammar.Name_exact = Name_exact;
		grammar.NCName_exact = NCName_exact;
		grammar.NotationDecl = NotationDecl;
		grammar.Reference = Reference;
		grammar.PEReference = PEReference;
		grammar.PI = PI;
		grammar.PUBLIC = PUBLIC;
		grammar.PubidLiteral = PubidLiteral;
		grammar.PubidLiteral_match = PubidLiteral_match;
		grammar.QName = QName;
		grammar.QName_exact = QName_exact;
		grammar.QName_group = QName_group;
		grammar.S = S;
		grammar.SChar_s = SChar_s;
		grammar.S_OPT = S_OPT;
		grammar.SYSTEM = SYSTEM;
		grammar.SystemLiteral = SystemLiteral;
		grammar.SystemLiteral_match = SystemLiteral_match;
		grammar.InvalidChar = InvalidChar;
		grammar.UNICODE_REPLACEMENT_CHARACTER = UNICODE_REPLACEMENT_CHARACTER;
		grammar.UNICODE_SUPPORT = UNICODE_SUPPORT;
		grammar.XMLDecl = XMLDecl;
		return grammar;
	}

	var hasRequiredDom;

	function requireDom () {
		if (hasRequiredDom) return dom;
		hasRequiredDom = 1;

		var conventions = requireConventions();
		var find = conventions.find;
		var hasDefaultHTMLNamespace = conventions.hasDefaultHTMLNamespace;
		var hasOwn = conventions.hasOwn;
		var isHTMLMimeType = conventions.isHTMLMimeType;
		var isHTMLRawTextElement = conventions.isHTMLRawTextElement;
		var isHTMLVoidElement = conventions.isHTMLVoidElement;
		var MIME_TYPE = conventions.MIME_TYPE;
		var NAMESPACE = conventions.NAMESPACE;

		/**
		 * Private DOM Constructor symbol
		 *
		 * Internal symbol used for construction of all classes whose constructors should be private.
		 * Currently used for checks in `Node`, `Document`, `Element`, `Attr`, `CharacterData`, `Text`, `Comment`,
		 * `CDATASection`, `DocumentType`, `Notation`, `Entity`, `EntityReference`, `DocumentFragment`, `ProcessingInstruction`
		 * so the constructor can't be used from outside the module.
		 */
		var PDC = Symbol();

		var errors = requireErrors();
		var DOMException = errors.DOMException;
		var DOMExceptionName = errors.DOMExceptionName;

		var g = requireGrammar();

		/**
		 * Checks if the given symbol equals the Private DOM Constructor symbol (PDC)
		 * and throws an Illegal constructor exception when the symbols don't match.
		 * This ensures that the constructor remains private and can't be used outside this module.
		 */
		function checkSymbol(symbol) {
			if (symbol !== PDC) {
				throw new TypeError('Illegal constructor');
			}
		}

		/**
		 * A prerequisite for `[].filter`, to drop elements that are empty.
		 *
		 * @param {string} input
		 * The string to be checked.
		 * @returns {boolean}
		 * Returns `true` if the input string is not empty, `false` otherwise.
		 */
		function notEmptyString(input) {
			return input !== '';
		}
		/**
		 * Splits a string on ASCII whitespace characters (U+0009 TAB, U+000A LF, U+000C FF, U+000D CR,
		 * U+0020 SPACE).
		 * It follows the definition from the infra specification from WHATWG.
		 *
		 * @param {string} input
		 * The string to be split.
		 * @returns {string[]}
		 * An array of the split strings. The array can be empty if the input string is empty or only
		 * contains whitespace characters.
		 * @see {@link https://infra.spec.whatwg.org/#split-on-ascii-whitespace}
		 * @see {@link https://infra.spec.whatwg.org/#ascii-whitespace}
		 */
		function splitOnASCIIWhitespace(input) {
			// U+0009 TAB, U+000A LF, U+000C FF, U+000D CR, U+0020 SPACE
			return input ? input.split(/[\t\n\f\r ]+/).filter(notEmptyString) : [];
		}

		/**
		 * Adds element as a key to current if it is not already present.
		 *
		 * @param {Record<string, boolean | undefined>} current
		 * The current record object to which the element will be added as a key.
		 * The object's keys are string types and values are either boolean or undefined.
		 * @param {string} element
		 * The string to be added as a key to the current record.
		 * @returns {Record<string, boolean | undefined>}
		 * The updated record object after the addition of the new element.
		 */
		function orderedSetReducer(current, element) {
			if (!hasOwn(current, element)) {
				current[element] = true;
			}
			return current;
		}

		/**
		 * Converts a string into an ordered set by splitting the input on ASCII whitespace and
		 * ensuring uniqueness of elements.
		 * This follows the definition of an ordered set from the infra specification by WHATWG.
		 *
		 * @param {string} input
		 * The input string to be transformed into an ordered set.
		 * @returns {string[]}
		 * An array of unique strings obtained from the input, preserving the original order.
		 * The array can be empty if the input string is empty or only contains whitespace characters.
		 * @see {@link https://infra.spec.whatwg.org/#ordered-set}
		 */
		function toOrderedSet(input) {
			if (!input) return [];
			var list = splitOnASCIIWhitespace(input);
			return Object.keys(list.reduce(orderedSetReducer, {}));
		}

		/**
		 * Uses `list.indexOf` to implement a function that behaves like `Array.prototype.includes`.
		 * This function is used in environments where `Array.prototype.includes` may not be available.
		 *
		 * @param {any[]} list
		 * The array in which to search for the element.
		 * @returns {function(any): boolean}
		 * A function that accepts an element and returns a boolean indicating whether the element is
		 * included in the provided list.
		 */
		function arrayIncludes(list) {
			return function (element) {
				return list && list.indexOf(element) !== -1;
			};
		}

		/**
		 * Validates a qualified name based on the criteria provided in the DOM specification by
		 * WHATWG.
		 *
		 * @param {string} qualifiedName
		 * The qualified name to be validated.
		 * @throws {DOMException}
		 * With code {@link DOMException.INVALID_CHARACTER_ERR} if the qualified name contains an
		 * invalid character.
		 * @see {@link https://dom.spec.whatwg.org/#validate}
		 */
		function validateQualifiedName(qualifiedName) {
			if (!g.QName_exact.test(qualifiedName)) {
				throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'invalid character in qualified name "' + qualifiedName + '"');
			}
		}

		/**
		 * Validates a qualified name and the namespace associated with it,
		 * based on the criteria provided in the DOM specification by WHATWG.
		 *
		 * @param {string | null} namespace
		 * The namespace to be validated. It can be a string or null.
		 * @param {string} qualifiedName
		 * The qualified name to be validated.
		 * @returns {[namespace: string | null, prefix: string | null, localName: string]}
		 * Returns a tuple with the namespace,
		 * prefix and local name of the qualified name.
		 * @throws {DOMException}
		 * Throws a DOMException if the qualified name or the namespace is not valid.
		 * @see {@link https://dom.spec.whatwg.org/#validate-and-extract}
		 */
		function validateAndExtract(namespace, qualifiedName) {
			validateQualifiedName(qualifiedName);
			namespace = namespace || null;
			/**
			 * @type {string | null}
			 */
			var prefix = null;
			var localName = qualifiedName;
			if (qualifiedName.indexOf(':') >= 0) {
				var splitResult = qualifiedName.split(':');
				prefix = splitResult[0];
				localName = splitResult[1];
			}
			if (prefix !== null && namespace === null) {
				throw new DOMException(DOMException.NAMESPACE_ERR, 'prefix is non-null and namespace is null');
			}
			if (prefix === 'xml' && namespace !== conventions.NAMESPACE.XML) {
				throw new DOMException(DOMException.NAMESPACE_ERR, 'prefix is "xml" and namespace is not the XML namespace');
			}
			if ((prefix === 'xmlns' || qualifiedName === 'xmlns') && namespace !== conventions.NAMESPACE.XMLNS) {
				throw new DOMException(
					DOMException.NAMESPACE_ERR,
					'either qualifiedName or prefix is "xmlns" and namespace is not the XMLNS namespace'
				);
			}
			if (namespace === conventions.NAMESPACE.XMLNS && prefix !== 'xmlns' && qualifiedName !== 'xmlns') {
				throw new DOMException(
					DOMException.NAMESPACE_ERR,
					'namespace is the XMLNS namespace and neither qualifiedName nor prefix is "xmlns"'
				);
			}
			return [namespace, prefix, localName];
		}

		/**
		 * Copies properties from one object to another.
		 * It only copies the object's own (not inherited) properties.
		 *
		 * @param {Object} src
		 * The source object from which properties are copied.
		 * @param {Object} dest
		 * The destination object to which properties are copied.
		 */
		function copy(src, dest) {
			for (var p in src) {
				if (hasOwn(src, p)) {
					dest[p] = src[p];
				}
			}
		}

		/**
		 * Extends a class with the properties and methods of a super class.
		 * It uses a form of prototypal inheritance, and establishes the `constructor` property
		 * correctly(?).
		 *
		 * It is not clear to the current maintainers if this implementation is making sense,
		 * since it creates an intermediate prototype function,
		 * which all properties of `Super` are copied onto using `_copy`.
		 *
		 * @param {Object} Class
		 * The class that is to be extended.
		 * @param {Object} Super
		 * The super class from which properties and methods are inherited.
		 * @private
		 */
		function _extends(Class, Super) {
			var pt = Class.prototype;
			if (!(pt instanceof Super)) {
				function t() {}
				t.prototype = Super.prototype;
				t = new t();
				copy(pt, t);
				Class.prototype = pt = t;
			}
			if (pt.constructor != Class) {
				if (typeof Class != 'function') {
					console.error('unknown Class:' + Class);
				}
				pt.constructor = Class;
			}
		}

		var NodeType = {};
		var ELEMENT_NODE = (NodeType.ELEMENT_NODE = 1);
		var ATTRIBUTE_NODE = (NodeType.ATTRIBUTE_NODE = 2);
		var TEXT_NODE = (NodeType.TEXT_NODE = 3);
		var CDATA_SECTION_NODE = (NodeType.CDATA_SECTION_NODE = 4);
		var ENTITY_REFERENCE_NODE = (NodeType.ENTITY_REFERENCE_NODE = 5);
		var ENTITY_NODE = (NodeType.ENTITY_NODE = 6);
		var PROCESSING_INSTRUCTION_NODE = (NodeType.PROCESSING_INSTRUCTION_NODE = 7);
		var COMMENT_NODE = (NodeType.COMMENT_NODE = 8);
		var DOCUMENT_NODE = (NodeType.DOCUMENT_NODE = 9);
		var DOCUMENT_TYPE_NODE = (NodeType.DOCUMENT_TYPE_NODE = 10);
		var DOCUMENT_FRAGMENT_NODE = (NodeType.DOCUMENT_FRAGMENT_NODE = 11);
		var NOTATION_NODE = (NodeType.NOTATION_NODE = 12);

		var DocumentPosition = conventions.freeze({
			DOCUMENT_POSITION_DISCONNECTED: 1,
			DOCUMENT_POSITION_PRECEDING: 2,
			DOCUMENT_POSITION_FOLLOWING: 4,
			DOCUMENT_POSITION_CONTAINS: 8,
			DOCUMENT_POSITION_CONTAINED_BY: 16,
			DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32,
		});

		//helper functions for compareDocumentPosition
		/**
		 * Finds the common ancestor in two parent chains.
		 *
		 * @param {Node[]} a
		 * The first parent chain.
		 * @param {Node[]} b
		 * The second parent chain.
		 * @returns {Node}
		 * The common ancestor node if it exists. If there is no common ancestor, the function will
		 * return `null`.
		 */
		function commonAncestor(a, b) {
			if (b.length < a.length) return commonAncestor(b, a);
			var c = null;
			for (var n in a) {
				if (a[n] !== b[n]) return c;
				c = a[n];
			}
			return c;
		}

		/**
		 * Assigns a unique identifier to a document to ensure consistency while comparing unrelated
		 * nodes.
		 *
		 * @param {Document} doc
		 * The document to which a unique identifier is to be assigned.
		 * @returns {string}
		 * The unique identifier of the document. If the document already had a unique identifier, the
		 * function will return the existing one.
		 */
		function docGUID(doc) {
			if (!doc.guid) doc.guid = Math.random();
			return doc.guid;
		}
		//-- end of helper functions

		/**
		 * The NodeList interface provides the abstraction of an ordered collection of nodes,
		 * without defining or constraining how this collection is implemented.
		 * NodeList objects in the DOM are live.
		 * The items in the NodeList are accessible via an integral index, starting from 0.
		 * You can also access the items of the NodeList with a `for...of` loop.
		 *
		 * @class NodeList
		 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-536297177
		 * @constructs NodeList
		 */
		function NodeList() {}
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
			item: function (index) {
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
			toString: function (options) {
				var opts;
				if (typeof options === 'function') {
					opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: options };
				} else if (!!options) {
					opts = {
						requireWellFormed: !!options.requireWellFormed,
						splitCDATASections: options.splitCDATASections !== false,
						nodeFilter: options.nodeFilter || null,
					};
				} else {
					opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: null };
				}
				for (var buf = [], i = 0; i < this.length; i++) {
					serializeToString(this[i], buf, null, opts);
				}
				return buf.join('');
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
			filter: function (predicate) {
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
			indexOf: function (item) {
				return Array.prototype.indexOf.call(this, item);
			},
		};
		NodeList.prototype[Symbol.iterator] = function () {
			var me = this;
			var index = 0;

			return {
				next: function () {
					if (index < me.length) {
						return {
							value: me[index++],
							done: false,
						};
					} else {
						return {
							done: true,
						};
					}
				},
				return: function () {
					return {
						done: true,
					};
				},
			};
		};

		/**
		 * Represents a live collection of nodes that is automatically updated when its associated
		 * document changes.
		 *
		 * @class LiveNodeList
		 * @param {Node} node
		 * The associated node.
		 * @param {function} refresh
		 * The function to refresh the live node list.
		 * @augments NodeList
		 * @constructs LiveNodeList
		 */
		function LiveNodeList(node, refresh) {
			this._node = node;
			this._refresh = refresh;
			_updateLiveList(this);
		}
		/**
		 * Updates the live node list.
		 *
		 * @param {LiveNodeList} list
		 * The live node list to update.
		 * @private
		 */
		function _updateLiveList(list) {
			var inc = list._node._inc || list._node.ownerDocument._inc;
			if (list._inc !== inc) {
				var ls = list._refresh(list._node);
				__set__(list, 'length', ls.length);
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
		/**
		 * Returns the node at position `index` in the LiveNodeList, or null if that is not a valid
		 * index.
		 *
		 * @param {number} i
		 * Index into the collection.
		 * @returns {Node | null}
		 * The node at position `index` in the LiveNodeList, or null if that is not a valid index.
		 */
		LiveNodeList.prototype.item = function (i) {
			_updateLiveList(this);
			return this[i] || null;
		};

		_extends(LiveNodeList, NodeList);

		/**
		 * Objects implementing the NamedNodeMap interface are used to represent collections of nodes
		 * that can be accessed by name.
		 * Note that NamedNodeMap does not inherit from NodeList;
		 * NamedNodeMaps are not maintained in any particular order.
		 * Objects contained in an object implementing NamedNodeMap may also be accessed by an ordinal
		 * index,
		 * but this is simply to allow convenient enumeration of the contents of a NamedNodeMap,
		 * and does not imply that the DOM specifies an order to these Nodes.
		 * NamedNodeMap objects in the DOM are live.
		 * used for attributes or DocumentType entities
		 *
		 * This implementation only supports property indices, but does not support named properties,
		 * as specified in the living standard.
		 *
		 * @class NamedNodeMap
		 * @see https://dom.spec.whatwg.org/#interface-namednodemap
		 * @see https://webidl.spec.whatwg.org/#dfn-supported-property-names
		 * @constructs NamedNodeMap
		 */
		/**
		 * A live collection of an element's attributes, keyed by name.
		 *
		 * The numbered entries and `length` are the sole authority for attribute order.
		 * A separate two-level null-prototype membership index (`namespaceURI` ->
		 * `localName` -> `Attr`, with the null/empty namespace held in its own bucket)
		 * lets the parse-time de-duplication in `setNamedItem` resolve an existing
		 * attribute in O(1) instead of scanning the list, so building an element with M
		 * attributes costs O(M) rather than O(M^2). The index never reorders attributes.
		 */
		function NamedNodeMap() {
			// namespaceURI (non-empty string) -> (localName -> Attr)
			this._nsIndex = Object.create(null);
			// localName -> Attr, for the null / empty-string namespace
			this._noNsIndex = Object.create(null);
		}
		/**
		 * Returns the index of a node within the list.
		 *
		 * @param {Array} list
		 * The list of nodes.
		 * @param {Node} node
		 * The node to find.
		 * @returns {number}
		 * The index of the node within the list, or -1 if not found.
		 * @private
		 */
		function _findNodeIndex(list, node) {
			var i = 0;
			while (i < list.length) {
				if (list[i] === node) {
					return i;
				}
				i++;
			}
		}
		/**
		 * Returns the second-level index bucket (`localName` -> `Attr`) for a namespace,
		 * replicating `getNamedItemNS`'s falsy-namespace normalization: `null`,
		 * `undefined` and `''` all resolve to the dedicated null-namespace bucket, kept separate from
		 * any real URI (so a namespace URI equal to the string `"null"`
		 * cannot collide with the null namespace). Both levels are null-prototype objects, so an
		 * attribute named `__proto__` or `constructor` is an ordinary key.
		 *
		 * @param {NamedNodeMap} map
		 * @param {string | null | undefined} namespaceURI
		 * @param {boolean} create
		 * Create the bucket if it does not exist yet.
		 * @returns {Object | undefined}
		 * @private
		 */
		function _nnmBucket(map, namespaceURI, create) {
			if (!namespaceURI) {
				return map._noNsIndex;
			}
			var bucket = map._nsIndex[namespaceURI];
			if (!bucket && create) {
				bucket = map._nsIndex[namespaceURI] = Object.create(null);
			}
			return bucket;
		}
		/**
		 * Looks up an attribute by namespace and local name through the membership index.
		 *
		 * @param {NamedNodeMap} map
		 * @param {string | null | undefined} namespaceURI
		 * @param {string} localName
		 * @returns {Attr | null}
		 * The matching attribute, or `null` when absent.
		 * @private
		 */
		function _nnmIndexFind(map, namespaceURI, localName) {
			var bucket = _nnmBucket(map, namespaceURI, false);
			var found = bucket && bucket[localName];
			return found ? found : null;
		}
		/**
		 * Records `attr` in the membership index under its namespace and local name,
		 * replacing any previous attribute with the same key.
		 *
		 * @param {NamedNodeMap} map
		 * @param {Attr} attr
		 * @private
		 */
		function _nnmIndexAdd(map, attr) {
			_nnmBucket(map, attr.namespaceURI, true)[attr.localName] = attr;
		}
		/**
		 * Removes `attr` from the membership index.
		 *
		 * @param {NamedNodeMap} map
		 * @param {Attr} attr
		 * @private
		 */
		function _nnmIndexRemove(map, attr) {
			var bucket = _nnmBucket(map, attr.namespaceURI, false);
			if (bucket) {
				delete bucket[attr.localName];
			}
		}
		/**
		 * Adds a new attribute to the list and updates the owner element of the attribute.
		 *
		 * @param {Element} el
		 * The element which will become the owner of the new attribute.
		 * @param {NamedNodeMap} list
		 * The list to which the new attribute will be added.
		 * @param {Attr} newAttr
		 * The new attribute to be added.
		 * @param {Attr} oldAttr
		 * The old attribute to be replaced, or null if no attribute is to be replaced.
		 * @returns {void}
		 * @private
		 */
		function _addNamedNode(el, list, newAttr, oldAttr) {
			if (oldAttr) {
				list[_findNodeIndex(list, oldAttr)] = newAttr;
			} else {
				list[list.length] = newAttr;
				list.length++;
			}
			// Keep the membership index in sync with the ordered list. On replacement
			// `oldAttr` shares `newAttr`'s (namespace, localName) key, so this overwrites
			// its entry; on append it adds a new one.
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
		/**
		 * Removes an attribute from the list and updates the owner element of the attribute.
		 *
		 * @param {Element} el
		 * The element which is the current owner of the attribute.
		 * @param {NamedNodeMap} list
		 * The list from which the attribute will be removed.
		 * @param {Attr} attr
		 * The attribute to be removed.
		 * @returns {void}
		 * @private
		 */
		function _removeNamedNode(el, list, attr) {
			//console.log('remove attr:'+attr)
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
			getNamedItem: function (localName) {
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
			setNamedItem: function (attr) {
				var el = attr.ownerElement;
				if (el && el !== this._ownerElement) {
					throw new DOMException(DOMException.INUSE_ATTRIBUTE_ERR);
				}
				// Resolve any existing attribute with the same (namespace, localName)
				// through the O(1) membership index rather than an O(M) scan — this is the
				// parse-dedup hot path (`setAttributeNode` per attribute during parse).
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
			setNamedItemNS: function (attr) {
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
			removeNamedItem: function (localName) {
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
			removeNamedItemNS: function (namespaceURI, localName) {
				var attr = this.getNamedItemNS(namespaceURI, localName);
				if (!attr) {
					throw new DOMException(DOMException.NOT_FOUND_ERR, namespaceURI ? namespaceURI + ' : ' + localName : localName);
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
			getNamedItemNS: function (namespaceURI, localName) {
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
			},
		};
		NamedNodeMap.prototype[Symbol.iterator] = function () {
			var me = this;
			var index = 0;

			return {
				next: function () {
					if (index < me.length) {
						return {
							value: me[index++],
							done: false,
						};
					} else {
						return {
							done: true,
						};
					}
				},
				return: function () {
					return {
						done: true,
					};
				},
			};
		};

		/**
		 * The DOMImplementation interface provides a number of methods for performing operations that
		 * are independent of any particular instance of the document object model.
		 *
		 * The DOMImplementation interface represents an object providing methods which are not
		 * dependent on any particular document.
		 * Such an object is returned by the `Document.implementation` property.
		 *
		 * **The individual methods describe the differences compared to the specs**.
		 *
		 * @class DOMImplementation
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation MDN
		 * @see https://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-102161490 DOM Level 1 Core
		 *      (Initial)
		 * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-102161490 DOM Level 2 Core
		 * @see https://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-102161490 DOM Level 3 Core
		 * @see https://dom.spec.whatwg.org/#domimplementation DOM Living Standard
		 * @constructs DOMImplementation
		 */
		function DOMImplementation() {}

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
			hasFeature: function (feature, version) {
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
			createDocument: function (namespaceURI, qualifiedName, doctype) {
				var contentType = MIME_TYPE.XML_APPLICATION;
				if (namespaceURI === NAMESPACE.HTML) {
					contentType = MIME_TYPE.XML_XHTML_APPLICATION;
				} else if (namespaceURI === NAMESPACE.SVG) {
					contentType = MIME_TYPE.XML_SVG_IMAGE;
				}
				var doc = new Document(PDC, { contentType: contentType });
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
			createDocumentType: function (qualifiedName, publicId, systemId, internalSubset) {
				validateQualifiedName(qualifiedName);
				var node = new DocumentType(PDC);
				node.name = qualifiedName;
				node.nodeName = qualifiedName;
				node.publicId = publicId || '';
				node.systemId = systemId || '';
				node.internalSubset = internalSubset || '';
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
			createHTMLDocument: function (title) {
				var doc = new Document(PDC, { contentType: MIME_TYPE.HTML });
				doc.implementation = this;
				doc.childNodes = new NodeList();
				if (title !== false) {
					doc.doctype = this.createDocumentType('html');
					doc.doctype.ownerDocument = doc;
					doc.appendChild(doc.doctype);
					var htmlNode = doc.createElement('html');
					doc.appendChild(htmlNode);
					var headNode = doc.createElement('head');
					htmlNode.appendChild(headNode);
					if (typeof title === 'string') {
						var titleNode = doc.createElement('title');
						titleNode.appendChild(doc.createTextNode(title));
						headNode.appendChild(titleNode);
					}
					htmlNode.appendChild(doc.createElement('body'));
				}
				return doc;
			},
		};

		/**
		 * The DOM Node interface is an abstract base class upon which many other DOM API objects are
		 * based, thus letting those object types to be used similarly and often interchangeably. As an
		 * abstract class, there is no such thing as a plain Node object. All objects that implement
		 * Node functionality are based on one of its subclasses. Most notable are Document, Element,
		 * and DocumentFragment.
		 *
		 * In addition, every kind of DOM node is represented by an interface based on Node. These
		 * include Attr, CharacterData (which Text, Comment, CDATASection and ProcessingInstruction are
		 * all based on), and DocumentType.
		 *
		 * In some cases, a particular feature of the base Node interface may not apply to one of its
		 * child interfaces; in that case, the inheriting node may return null or throw an exception,
		 * depending on circumstances. For example, attempting to add children to a node type that
		 * cannot have children will throw an exception.
		 *
		 * **This behavior is slightly different from the in the specs**:
		 * - unimplemented interfaces: `EventTarget`
		 *
		 * @class
		 * @abstract
		 * @param {Symbol} symbol
		 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-1950641247
		 * @see https://dom.spec.whatwg.org/#node
		 * @prettierignore
		 */
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
			baseURI: 'about:blank',
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
			contains: function (other) {
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
			getRootNode: function (options) {
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
			isEqualNode: function (otherNode) {
				if (!otherNode) return false;

				// Use an explicit {node, other} pair stack to avoid call-stack overflow on deep trees.
				// walkDOM cannot be used here — parallel two-tree traversal requires pairing
				// corresponding nodes at each step across both trees simultaneously.
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

					// Push children in reverse order so index 0 is processed first (LIFO).
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
			isSameNode: function (otherNode) {
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
			insertBefore: function (newChild, refChild) {
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
			replaceChild: function (newChild, oldChild) {
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
			removeChild: function (oldChild) {
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
			appendChild: function (newChild) {
				return this.insertBefore(newChild, null);
			},
			/**
			 * Determines whether this node has any child nodes.
			 *
			 * @returns {boolean}
			 * Returns true if this node has any child nodes, and false otherwise.
			 */
			hasChildNodes: function () {
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
			cloneNode: function (deep) {
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
			normalize: function () {
				walkDOM(this, null, {
					enter: function (node) {
						// Merge adjacent text children of node before walkDOM schedules them.
						// walkDOM reads lastChild/previousSibling after enter returns, so the
						// surviving post-merge children are what it descends into.
						var child = node.firstChild;
						while (child) {
							var next = child.nextSibling;
							if (next !== null && next.nodeType === TEXT_NODE && child.nodeType === TEXT_NODE) {
								// Merge the whole run of adjacent text nodes at once: gather the
								// following text siblings' data, unlink them in a single pass, and
								// re-index the child list a single time. Per-sibling `removeChild`
								// (each an O(K) re-index) plus per-sibling `appendData` (each an O(K)
								// string rebuild) is O(K^2) over a long run of single-character text
								// nodes; this keeps it O(K). The first text node of the run survives
								// and carries the concatenated data, preserving node identity and
								// locator semantics.
								var tail = [];
								var sibling = next;
								while (sibling !== null && sibling.nodeType === TEXT_NODE) {
									tail.push(sibling.data);
									sibling = sibling.nextSibling;
								}
								// `sibling` is now the first non-text node after the run, or null.
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
								child.appendData(tail.join('')); // single O(K) string rebuild
								_onUpdateChild(node.ownerDocument, node); // single O(K) re-index
								child = sibling;
							} else {
								child = next;
							}
						}
						return true; // descend into surviving children
					},
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
			isSupported: function (feature, version) {
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
			lookupPrefix: function (namespaceURI) {
				var el = this;
				while (el) {
					var map = el._nsMap;
					//console.dir(map)
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
			lookupNamespaceURI: function (prefix) {
				var el = this;
				while (el) {
					var map = el._nsMap;
					//console.dir(map)
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
			isDefaultNamespace: function (namespaceURI) {
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
			compareDocumentPosition: function (other) {
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
						for (var i = 0, attr; (attr = node2.attributes[i]); i++) {
							if (attr === attr1)
								return DocumentPosition.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + DocumentPosition.DOCUMENT_POSITION_PRECEDING;
							if (attr === attr2)
								return DocumentPosition.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + DocumentPosition.DOCUMENT_POSITION_FOLLOWING;
						}
					}
				}
				if (!node1 || !node2 || node2.ownerDocument !== node1.ownerDocument) {
					return (
						DocumentPosition.DOCUMENT_POSITION_DISCONNECTED +
						DocumentPosition.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC +
						(docGUID(node2.ownerDocument) > docGUID(node1.ownerDocument)
							? DocumentPosition.DOCUMENT_POSITION_FOLLOWING
							: DocumentPosition.DOCUMENT_POSITION_PRECEDING)
					);
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
			},
		};

		/**
		 * Encodes special XML characters to their corresponding entities.
		 *
		 * @param {string} c
		 * The character to be encoded.
		 * @returns {string}
		 * The encoded character.
		 * @private
		 */
		function _xmlEncoder(c) {
			return (
				(c == '<' && '&lt;') || (c == '>' && '&gt;') || (c == '&' && '&amp;') || (c == '"' && '&quot;') || '&#' + c.charCodeAt() + ';'
			);
		}

		copy(NodeType, Node);
		copy(NodeType, Node.prototype);
		copy(DocumentPosition, Node);
		copy(DocumentPosition, Node.prototype);

		/**
		 * Visits every node in the subtree rooted at `node` in depth-first pre-order.
		 *
		 * Delegates to {@link walkDOM} for traversal. The `callback` is called on each node;
		 * if it returns a truthy value, traversal stops immediately.
		 *
		 * @param {Node} node
		 * Root of the subtree to visit.
		 * @param {function(Node): *} callback
		 * Called for each node. A truthy return value stops traversal early.
		 */
		function _visitNode(node, callback) {
			walkDOM(node, null, {
				enter: function (n) {
					return callback(n) ? walkDOM.STOP : true;
				},
			});
		}

		/**
		 * Depth-first pre/post-order DOM tree walker.
		 *
		 * Visits every node in the subtree rooted at `node`. For each node:
		 *
		 * 1. Calls `callbacks.enter(node, context)` before descending into the node's children. The
		 * return value becomes the `context` passed to each child's `enter` call and to the matching
		 * `exit` call.
		 * 2. If `enter` returns `null` or `undefined`, the node's children are skipped;
		 * sibling traversal continues normally.
		 * 3. If `enter` returns `walkDOM.STOP`, the entire traversal is aborted immediately — no
		 * further `enter` or `exit` calls are made.
		 * 4. `lastChild` and `previousSibling` are read **after** `enter` returns, so `enter` may
		 * safely modify the node's own child list before the walker descends. Modifying siblings of
		 * the current node or any other part of the tree produces unpredictable results: nodes already
		 * queued on the stack are visited regardless of DOM changes, and newly inserted nodes outside
		 * the current child list are never visited.
		 * 5. Calls `callbacks.exit(node, context)` (if provided) after all of a node's children have
		 * been visited, passing the same `context` that `enter`
		 * returned for that node.
		 *
		 * This implementation uses an explicit stack and does not recurse — it is safe on arbitrarily
		 * deep trees.
		 *
		 * @param {Node} node
		 * Root of the subtree to walk.
		 * @param {*} context
		 * Initial context value passed to the root node's `enter`.
		 * @param {{ enter: function(Node, *): *, exit?: function(Node, *): void }} callbacks
		 * @returns {void | walkDOM.STOP}
		 * @see ../docs/walk-dom.md.
		 */
		function walkDOM(node, context, callbacks) {
			// Each stack frame is {node, context, phase}:
			//   walkDOM.ENTER — call enter, then push children
			//   walkDOM.EXIT  — call exit
			var stack = [{ node: node, context: context, phase: walkDOM.ENTER }];
			while (stack.length > 0) {
				var frame = stack.pop();
				if (frame.phase === walkDOM.ENTER) {
					var childContext = callbacks.enter(frame.node, frame.context);
					if (childContext === walkDOM.STOP) {
						return walkDOM.STOP;
					}
					// Push exit frame before children so it fires after all children are processed (Last In First Out)
					stack.push({ node: frame.node, context: childContext, phase: walkDOM.EXIT });
					if (childContext === null || childContext === undefined) {
						continue; // skip children
					}
					// lastChild is read after enter returns, so enter may modify the child list.
					var child = frame.node.lastChild;
					// Traverse from lastChild backwards so that pushing onto the stack
					// naturally yields firstChild on top (processed first).
					while (child) {
						stack.push({ node: child, context: childContext, phase: walkDOM.ENTER });
						child = child.previousSibling;
					}
				} else {
					// frame.phase === walkDOM.EXIT
					if (callbacks.exit) {
						callbacks.exit(frame.node, frame.context);
					}
				}
			}
		}

		/**
		 * Sentinel value returned from a `walkDOM` `enter` callback to abort the entire traversal
		 * immediately.
		 *
		 * @type {symbol}
		 */
		walkDOM.STOP = Symbol('walkDOM.STOP');
		/**
		 * Phase constant for a stack frame that has not yet been visited.
		 * The `enter` callback is called and children are scheduled.
		 *
		 * @type {number}
		 */
		walkDOM.ENTER = 0;
		/**
		 * Phase constant for a stack frame whose subtree has been fully visited.
		 * The `exit` callback is called.
		 *
		 * @type {number}
		 */
		walkDOM.EXIT = 1;

		/**
		 * @typedef DocumentOptions
		 * @property {string} [contentType=MIME_TYPE.XML_APPLICATION]
		 */
		/**
		 * The Document interface describes the common properties and methods for any kind of document.
		 *
		 * It should usually be created using `new DOMImplementation().createDocument(...)`
		 * or `new DOMImplementation().createHTMLDocument(...)`.
		 *
		 * The constructor is considered a private API and offers to initially set the `contentType`
		 * property via it's options parameter.
		 *
		 * @class
		 * @param {Symbol} symbol
		 * @param {DocumentOptions} [options]
		 * @augments Node
		 * @private
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document
		 * @see https://dom.spec.whatwg.org/#interface-document
		 */
		function Document(symbol, options) {
			checkSymbol(symbol);

			var opt = options || {};
			this.ownerDocument = this;
			/**
			 * The mime type of the document is determined at creation time and can not be modified.
			 *
			 * @type {string}
			 * @see https://dom.spec.whatwg.org/#concept-document-content-type
			 * @see {@link DOMImplementation}
			 * @see {@link MIME_TYPE}
			 * @readonly
			 */
			this.contentType = opt.contentType || MIME_TYPE.XML_APPLICATION;
			/**
			 * @type {'html' | 'xml'}
			 * @see https://dom.spec.whatwg.org/#concept-document-type
			 * @see {@link DOMImplementation}
			 * @readonly
			 */
			this.type = isHTMLMimeType(this.contentType) ? 'html' : 'xml';
		}

		/**
		 * Updates the namespace mapping of an element when a new attribute is added.
		 *
		 * @param {Document} doc
		 * The document that the element belongs to.
		 * @param {Element} el
		 * The element to which the attribute is being added.
		 * @param {Attr} newAttr
		 * The new attribute being added.
		 * @private
		 */
		function _onAddAttribute(doc, el, newAttr) {
			doc && doc._inc++;
			var ns = newAttr.namespaceURI;
			if (ns === NAMESPACE.XMLNS) {
				//update namespace
				el._nsMap[newAttr.prefix ? newAttr.localName : ''] = newAttr.value;
			}
		}

		/**
		 * Updates the namespace mapping of an element when an attribute is removed.
		 *
		 * @param {Document} doc
		 * The document that the element belongs to.
		 * @param {Element} el
		 * The element from which the attribute is being removed.
		 * @param {Attr} newAttr
		 * The attribute being removed.
		 * @param {boolean} remove
		 * Indicates whether the attribute is to be removed.
		 * @private
		 */
		function _onRemoveAttribute(doc, el, newAttr, remove) {
			doc && doc._inc++;
			var ns = newAttr.namespaceURI;
			if (ns === NAMESPACE.XMLNS) {
				//update namespace
				delete el._nsMap[newAttr.prefix ? newAttr.localName : ''];
			}
		}

		/**
		 * Updates `parent.childNodes`, adjusting the indexed items and its `length`.
		 * If `newChild` is provided and has no nextSibling, it will be appended.
		 * Otherwise, it's assumed that an item has been removed or inserted,
		 * and `parent.firstNode` and its `.nextSibling` to re-indexing all child nodes of `parent`.
		 *
		 * @param {Document} doc
		 * The parent document of `el`.
		 * @param {Node} parent
		 * The parent node whose childNodes list needs to be updated.
		 * @param {Node} [newChild]
		 * The new child node to be appended. If not provided, the function assumes a node has been
		 * removed.
		 * @private
		 */
		function _onUpdateChild(doc, parent, newChild) {
			if (doc && doc._inc) {
				doc._inc++;
				var childNodes = parent.childNodes;
				// assumes nextSibling and previousSibling were already configured upfront
				if (newChild && !newChild.nextSibling) {
					// if an item has been appended, we only need to update the last index and the length
					childNodes[childNodes.length++] = newChild;
				} else {
					// otherwise we need to reindex all items,
					// which can take a while when processing nodes with a lot of children
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

		/**
		 * Removes the connections between `parentNode` and `child`
		 * and any existing `child.previousSibling` or `child.nextSibling`.
		 *
		 * @param {Node} parentNode
		 * The parent node from which the child node is to be removed.
		 * @param {Node} child
		 * The child node to be removed from the parentNode.
		 * @returns {Node}
		 * Returns the child node that was removed.
		 * @throws {DOMException}
		 * With code:
		 * - {@link DOMException.NOT_FOUND_ERR} If the parentNode is not the parent of the child node.
		 * @private
		 * @see https://github.com/xmldom/xmldom/issues/135
		 * @see https://github.com/xmldom/xmldom/issues/145
		 */
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

		/**
		 * Returns `true` if `node` can be a parent for insertion.
		 *
		 * @param {Node} node
		 * @returns {boolean}
		 */
		function hasValidParentNodeType(node) {
			return (
				node &&
				(node.nodeType === Node.DOCUMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE || node.nodeType === Node.ELEMENT_NODE)
			);
		}

		/**
		 * Returns `true` if `node` can be inserted according to it's `nodeType`.
		 *
		 * @param {Node} node
		 * @returns {boolean}
		 */
		function hasInsertableNodeType(node) {
			return (
				node &&
				(node.nodeType === Node.CDATA_SECTION_NODE ||
					node.nodeType === Node.COMMENT_NODE ||
					node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ||
					node.nodeType === Node.DOCUMENT_TYPE_NODE ||
					node.nodeType === Node.ELEMENT_NODE ||
					node.nodeType === Node.PROCESSING_INSTRUCTION_NODE ||
					node.nodeType === Node.TEXT_NODE)
			);
		}

		/**
		 * Returns true if `node` is a DOCTYPE node.
		 *
		 * @param {Node} node
		 * @returns {boolean}
		 */
		function isDocTypeNode(node) {
			return node && node.nodeType === Node.DOCUMENT_TYPE_NODE;
		}

		/**
		 * Returns true if the node is an element.
		 *
		 * @param {Node} node
		 * @returns {boolean}
		 */
		function isElementNode(node) {
			return node && node.nodeType === Node.ELEMENT_NODE;
		}
		/**
		 * Returns true if `node` is a text node.
		 *
		 * @param {Node} node
		 * @returns {boolean}
		 */
		function isTextNode(node) {
			return node && node.nodeType === Node.TEXT_NODE;
		}

		/**
		 * Check if en element node can be inserted before `child`, or at the end if child is falsy,
		 * according to the presence and position of a doctype node on the same level.
		 *
		 * @param {Document} doc
		 * The document node.
		 * @param {Node} child
		 * The node that would become the nextSibling if the element would be inserted.
		 * @returns {boolean}
		 * `true` if an element can be inserted before child.
		 * @private
		 */
		function isElementInsertionPossible(doc, child) {
			var parentChildNodes = doc.childNodes || [];
			if (find(parentChildNodes, isElementNode) || isDocTypeNode(child)) {
				return false;
			}
			var docTypeNode = find(parentChildNodes, isDocTypeNode);
			return !(child && docTypeNode && parentChildNodes.indexOf(docTypeNode) > parentChildNodes.indexOf(child));
		}

		/**
		 * Check if en element node can be inserted before `child`, or at the end if child is falsy,
		 * according to the presence and position of a doctype node on the same level.
		 *
		 * @param {Node} doc
		 * The document node.
		 * @param {Node} child
		 * The node that would become the nextSibling if the element would be inserted.
		 * @returns {boolean}
		 * `true` if an element can be inserted before child.
		 * @private
		 */
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

		/**
		 * Asserts pre-insertion validity of a node into a parent before a child.
		 * Throws errors for invalid node combinations that would result in an ill-formed DOM.
		 *
		 * @param {Node} parent
		 * The parent node to insert `node` into.
		 * @param {Node} node
		 * The node to insert.
		 * @param {Node | null} child
		 * The node that should become the `nextSibling` of `node`. If null, no sibling is considered.
		 * @throws {DOMException}
		 * With code:
		 * - {@link DOMException.HIERARCHY_REQUEST_ERR} If `parent` is not a Document,
		 * DocumentFragment, or Element node.
		 * - {@link DOMException.HIERARCHY_REQUEST_ERR} If `node` is a host-including inclusive
		 * ancestor of `parent`. (Currently not implemented)
		 * - {@link DOMException.NOT_FOUND_ERR} If `child` is non-null and its `parent` is not
		 * `parent`.
		 * - {@link DOMException.HIERARCHY_REQUEST_ERR} If `node` is not a DocumentFragment,
		 * DocumentType, Element, or CharacterData node.
		 * - {@link DOMException.HIERARCHY_REQUEST_ERR} If either `node` is a Text node and `parent` is
		 * a document, or if `node` is a doctype and `parent` is not a document.
		 * @private
		 * @see https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
		 * @see https://dom.spec.whatwg.org/#concept-node-replace
		 */
		function assertPreInsertionValidity1to5(parent, node, child) {
			// 1. If `parent` is not a Document, DocumentFragment, or Element node, then throw a "HierarchyRequestError" DOMException.
			if (!hasValidParentNodeType(parent)) {
				throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, 'Unexpected parent node type ' + parent.nodeType);
			}
			// 2. If `node` is a host-including inclusive ancestor of `parent`, then throw a "HierarchyRequestError" DOMException.
			// not implemented!
			// 3. If `child` is non-null and its parent is not `parent`, then throw a "NotFoundError" DOMException.
			if (child && child.parentNode !== parent) {
				throw new DOMException(DOMException.NOT_FOUND_ERR, 'child not in parent');
			}
			if (
				// 4. If `node` is not a DocumentFragment, DocumentType, Element, or CharacterData node, then throw a "HierarchyRequestError" DOMException.
				!hasInsertableNodeType(node) ||
				// 5. If either `node` is a Text node and `parent` is a document,
				// the sax parser currently adds top level text nodes, this will be fixed in 0.9.0
				// || (node.nodeType === Node.TEXT_NODE && parent.nodeType === Node.DOCUMENT_NODE)
				// or `node` is a doctype and `parent` is not a document, then throw a "HierarchyRequestError" DOMException.
				(isDocTypeNode(node) && parent.nodeType !== Node.DOCUMENT_NODE)
			) {
				throw new DOMException(
					DOMException.HIERARCHY_REQUEST_ERR,
					'Unexpected node type ' + node.nodeType + ' for parent node type ' + parent.nodeType
				);
			}
		}

		/**
		 * Asserts pre-insertion validity of a node into a document before a child.
		 * Throws errors for invalid node combinations that would result in an ill-formed DOM.
		 *
		 * @param {Document} parent
		 * The parent node to insert `node` into.
		 * @param {Node} node
		 * The node to insert.
		 * @param {Node | undefined} child
		 * The node that should become the `nextSibling` of `node`. If undefined, no sibling is
		 * considered.
		 * @returns {Node}
		 * @throws {DOMException}
		 * With code:
		 * - {@link DOMException.HIERARCHY_REQUEST_ERR} If `node` is a DocumentFragment with more than
		 * one element child or has a Text node child.
		 * - {@link DOMException.HIERARCHY_REQUEST_ERR} If `node` is a DocumentFragment with one
		 * element child and either `parent` has an element child, `child` is a doctype, or `child` is
		 * non-null and a doctype is following `child`.
		 * - {@link DOMException.HIERARCHY_REQUEST_ERR} If `node` is an Element and `parent` has an
		 * element child, `child` is a doctype, or `child` is non-null and a doctype is following
		 * `child`.
		 * - {@link DOMException.HIERARCHY_REQUEST_ERR} If `node` is a DocumentType and `parent` has a
		 * doctype child, `child` is non-null and an element is preceding `child`, or `child` is null
		 * and `parent` has an element child.
		 * @private
		 * @see https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
		 * @see https://dom.spec.whatwg.org/#concept-node-replace
		 */
		function assertPreInsertionValidityInDocument(parent, node, child) {
			var parentChildNodes = parent.childNodes || [];
			var nodeChildNodes = node.childNodes || [];

			// DocumentFragment
			if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
				var nodeChildElements = nodeChildNodes.filter(isElementNode);
				// If node has more than one element child or has a Text node child.
				if (nodeChildElements.length > 1 || find(nodeChildNodes, isTextNode)) {
					throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, 'More than one element or text in fragment');
				}
				// Otherwise, if `node` has one element child and either `parent` has an element child,
				// `child` is a doctype, or `child` is non-null and a doctype is following `child`.
				if (nodeChildElements.length === 1 && !isElementInsertionPossible(parent, child)) {
					throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, 'Element in fragment can not be inserted before doctype');
				}
			}
			// Element
			if (isElementNode(node)) {
				// `parent` has an element child, `child` is a doctype,
				// or `child` is non-null and a doctype is following `child`.
				if (!isElementInsertionPossible(parent, child)) {
					throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, 'Only one element can be added and only after doctype');
				}
			}
			// DocumentType
			if (isDocTypeNode(node)) {
				// `parent` has a doctype child,
				if (find(parentChildNodes, isDocTypeNode)) {
					throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, 'Only one doctype is allowed');
				}
				var parentElementChild = find(parentChildNodes, isElementNode);
				// `child` is non-null and an element is preceding `child`,
				if (child && parentChildNodes.indexOf(parentElementChild) < parentChildNodes.indexOf(child)) {
					throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, 'Doctype can only be inserted before an element');
				}
				// or `child` is null and `parent` has an element child.
				if (!child && parentElementChild) {
					throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, 'Doctype can not be appended since element is present');
				}
			}
		}

		/**
		 * @param {Document} parent
		 * The parent node to insert `node` into.
		 * @param {Node} node
		 * The node to insert.
		 * @param {Node | undefined} child
		 * the node that should become the `nextSibling` of `node`
		 * @returns {Node}
		 * @throws {DOMException}
		 * For several node combinations that would create a DOM that is not well-formed.
		 * @throws {DOMException}
		 * If `child` is provided but is not a child of `parent`.
		 * @private
		 * @see https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
		 * @see https://dom.spec.whatwg.org/#concept-node-replace
		 */
		function assertPreReplacementValidityInDocument(parent, node, child) {
			var parentChildNodes = parent.childNodes || [];
			var nodeChildNodes = node.childNodes || [];

			// DocumentFragment
			if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
				var nodeChildElements = nodeChildNodes.filter(isElementNode);
				// If `node` has more than one element child or has a Text node child.
				if (nodeChildElements.length > 1 || find(nodeChildNodes, isTextNode)) {
					throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, 'More than one element or text in fragment');
				}
				// Otherwise, if `node` has one element child and either `parent` has an element child that is not `child` or a doctype is following `child`.
				if (nodeChildElements.length === 1 && !isElementReplacementPossible(parent, child)) {
					throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, 'Element in fragment can not be inserted before doctype');
				}
			}
			// Element
			if (isElementNode(node)) {
				// `parent` has an element child that is not `child` or a doctype is following `child`.
				if (!isElementReplacementPossible(parent, child)) {
					throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, 'Only one element can be added and only after doctype');
				}
			}
			// DocumentType
			if (isDocTypeNode(node)) {
				function hasDoctypeChildThatIsNotChild(node) {
					return isDocTypeNode(node) && node !== child;
				}

				// `parent` has a doctype child that is not `child`,
				if (find(parentChildNodes, hasDoctypeChildThatIsNotChild)) {
					throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, 'Only one doctype is allowed');
				}
				var parentElementChild = find(parentChildNodes, isElementNode);
				// or an element is preceding `child`.
				if (child && parentChildNodes.indexOf(parentElementChild) < parentChildNodes.indexOf(child)) {
					throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR, 'Doctype can only be inserted before an element');
				}
			}
		}

		/**
		 * Inserts a node into a parent node before a child node.
		 *
		 * @param {Node} parent
		 * The parent node to insert the node into.
		 * @param {Node} node
		 * The node to insert into the parent.
		 * @param {Node | null} child
		 * The node that should become the next sibling of the node.
		 * If null, the function inserts the node at the end of the children of the parent node.
		 * @param {Function} [_inDocumentAssertion]
		 * An optional function to check pre-insertion validity if parent is a document node.
		 * Defaults to {@link assertPreInsertionValidityInDocument}
		 * @returns {Node}
		 * Returns the inserted node.
		 * @throws {DOMException}
		 * Throws a DOMException if inserting the node would result in a DOM tree that is not
		 * well-formed. See {@link assertPreInsertionValidity1to5},
		 * {@link assertPreInsertionValidityInDocument}.
		 * @throws {DOMException}
		 * Throws a DOMException if child is provided but is not a child of the parent. See
		 * {@link Node.removeChild}
		 * @private
		 * @see https://dom.spec.whatwg.org/#concept-node-ensure-pre-insertion-validity
		 */
		function _insertBefore(parent, node, child, _inDocumentAssertion) {
			// To ensure pre-insertion validity of a node into a parent before a child, run these steps:
			assertPreInsertionValidity1to5(parent, node, child);

			// If parent is a document, and any of the statements below, switched on the interface node implements,
			// are true, then throw a "HierarchyRequestError" DOMException.
			if (parent.nodeType === Node.DOCUMENT_NODE) {
				(_inDocumentAssertion || assertPreInsertionValidityInDocument)(parent, node, child);
			}

			var cp = node.parentNode;
			if (cp) {
				cp.removeChild(node); //remove and update
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
			nodeName: '#document',
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

			insertBefore: function (newChild, refChild) {
				//raises
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
			removeChild: function (oldChild) {
				var removed = _removeChild(this, oldChild);
				if (removed === this.documentElement) {
					this.documentElement = null;
				}
				return removed;
			},
			replaceChild: function (newChild, oldChild) {
				//raises
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
			importNode: function (importedNode, deep) {
				return importNode(this, importedNode, deep);
			},
			// Introduced in DOM Level 2:
			getElementById: function (id) {
				var rtv = null;
				_visitNode(this.documentElement, function (node) {
					if (node.nodeType == ELEMENT_NODE) {
						if (node.getAttribute('id') == id) {
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
			createElement: function (tagName) {
				var node = new Element(PDC);
				node.ownerDocument = this;
				if (this.type === 'html') {
					tagName = tagName.toLowerCase();
				}
				if (hasDefaultHTMLNamespace(this.contentType)) {
					node.namespaceURI = NAMESPACE.HTML;
				}
				node.nodeName = tagName;
				node.tagName = tagName;
				node.localName = tagName;
				node.childNodes = new NodeList();
				var attrs = (node.attributes = new NamedNodeMap());
				attrs._ownerElement = node;
				return node;
			},
			/**
			 * @returns {DocumentFragment}
			 */
			createDocumentFragment: function () {
				var node = new DocumentFragment(PDC);
				node.ownerDocument = this;
				node.childNodes = new NodeList();
				return node;
			},
			/**
			 * @param {string} data
			 * @returns {Text}
			 */
			createTextNode: function (data) {
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
			createComment: function (data) {
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
			createCDATASection: function (data) {
				if (data.indexOf(']]>') !== -1) {
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
			createProcessingInstruction: function (target, data) {
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
			createAttribute: function (name) {
				if (!g.QName_exact.test(name)) {
					throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'invalid character in name "' + name + '"');
				}
				if (this.type === 'html') {
					name = name.toLowerCase();
				}
				return this._createAttribute(name);
			},
			_createAttribute: function (name) {
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
			createEntityReference: function (name) {
				if (!g.Name_exact.test(name)) {
					throw new DOMException(DOMException.INVALID_CHARACTER_ERR, 'not a valid xml name "' + name + '"');
				}
				if (this.type === 'html') {
					throw new DOMException('document is an html document', DOMExceptionName.NotSupportedError);
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
			createElementNS: function (namespaceURI, qualifiedName) {
				var validated = validateAndExtract(namespaceURI, qualifiedName);
				var node = new Element(PDC);
				var attrs = (node.attributes = new NamedNodeMap());
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
			createAttributeNS: function (namespaceURI, qualifiedName) {
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
			},
		};
		_extends(Document, Node);

		function Element(symbol) {
			checkSymbol(symbol);

			this._nsMap = Object.create(null);
		}
		Element.prototype = {
			nodeType: ELEMENT_NODE,
			/**
			 * The attributes of this element.
			 *
			 * @type {NamedNodeMap | null}
			 */
			attributes: null,
			getQualifiedName: function () {
				return this.prefix ? this.prefix + ':' + this.localName : this.localName;
			},
			_isInHTMLDocumentAndNamespace: function () {
				return this.ownerDocument.type === 'html' && this.namespaceURI === NAMESPACE.HTML;
			},
			/**
			 * Implementaton of Level2 Core function hasAttributes.
			 *
			 * @returns {boolean}
			 * True if attribute list is not empty.
			 * @see https://www.w3.org/TR/DOM-Level-2-Core/#core-ID-NodeHasAttrs
			 */
			hasAttributes: function () {
				return !!(this.attributes && this.attributes.length);
			},
			hasAttribute: function (name) {
				return !!this.getAttributeNode(name);
			},
			/**
			 * Returns element’s first attribute whose qualified name is `name`, and `null`
			 * if there is no such attribute.
			 *
			 * @param {string} name
			 * @returns {string | null}
			 */
			getAttribute: function (name) {
				var attr = this.getAttributeNode(name);
				return attr ? attr.value : null;
			},
			getAttributeNode: function (name) {
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
			setAttribute: function (name, value) {
				if (this._isInHTMLDocumentAndNamespace()) {
					name = name.toLowerCase();
				}
				var attr = this.getAttributeNode(name);
				if (attr) {
					attr.value = attr.nodeValue = '' + value;
				} else {
					attr = this.ownerDocument._createAttribute(name);
					attr.value = attr.nodeValue = '' + value;
					this.setAttributeNode(attr);
				}
			},
			removeAttribute: function (name) {
				var attr = this.getAttributeNode(name);
				attr && this.removeAttributeNode(attr);
			},
			setAttributeNode: function (newAttr) {
				return this.attributes.setNamedItem(newAttr);
			},
			setAttributeNodeNS: function (newAttr) {
				return this.attributes.setNamedItemNS(newAttr);
			},
			removeAttributeNode: function (oldAttr) {
				//console.log(this == oldAttr.ownerElement)
				return this.attributes.removeNamedItem(oldAttr.nodeName);
			},
			//get real attribute name,and remove it by removeAttributeNode
			removeAttributeNS: function (namespaceURI, localName) {
				var old = this.getAttributeNodeNS(namespaceURI, localName);
				old && this.removeAttributeNode(old);
			},

			hasAttributeNS: function (namespaceURI, localName) {
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
			getAttributeNS: function (namespaceURI, localName) {
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
			setAttributeNS: function (namespaceURI, qualifiedName, value) {
				var validated = validateAndExtract(namespaceURI, qualifiedName);
				var localName = validated[2];
				var attr = this.getAttributeNodeNS(namespaceURI, localName);
				if (attr) {
					attr.value = attr.nodeValue = '' + value;
				} else {
					attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
					attr.value = attr.nodeValue = '' + value;
					this.setAttributeNode(attr);
				}
			},
			getAttributeNodeNS: function (namespaceURI, localName) {
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
			getElementsByClassName: function (classNames) {
				var classNamesSet = toOrderedSet(classNames);
				return new LiveNodeList(this, function (base) {
					var ls = [];
					if (classNamesSet.length > 0) {
						_visitNode(base, function (node) {
							if (node !== base && node.nodeType === ELEMENT_NODE) {
								var nodeClassNames = node.getAttribute('class');
								// can be null if the attribute does not exist
								if (nodeClassNames) {
									// before splitting and iterating just compare them for the most common case
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
			getElementsByTagName: function (qualifiedName) {
				var isHTMLDocument = (this.nodeType === DOCUMENT_NODE ? this : this.ownerDocument).type === 'html';
				var lowerQualifiedName = qualifiedName.toLowerCase();
				return new LiveNodeList(this, function (base) {
					var ls = [];
					_visitNode(base, function (node) {
						if (node === base || node.nodeType !== ELEMENT_NODE) {
							return;
						}
						if (qualifiedName === '*') {
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
			getElementsByTagNameNS: function (namespaceURI, localName) {
				return new LiveNodeList(this, function (base) {
					var ls = [];
					_visitNode(base, function (node) {
						if (
							node !== base &&
							node.nodeType === ELEMENT_NODE &&
							(namespaceURI === '*' || node.namespaceURI === namespaceURI) &&
							(localName === '*' || node.localName == localName)
						) {
							ls.push(node);
						}
					});
					return ls;
				});
			},
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
			data: '',
			substringData: function (offset, count) {
				return this.data.substring(offset, offset + count);
			},
			appendData: function (text) {
				text = this.data + text;
				this.nodeValue = this.data = text;
				this.length = text.length;
			},
			insertData: function (offset, text) {
				this.replaceData(offset, 0, text);
			},
			deleteData: function (offset, count) {
				this.replaceData(offset, count, '');
			},
			replaceData: function (offset, count, text) {
				var start = this.data.substring(0, offset);
				var end = this.data.substring(offset + count);
				text = start + text + end;
				this.nodeValue = this.data = text;
				this.length = text.length;
			},
		};
		_extends(CharacterData, Node);
		function Text(symbol) {
			checkSymbol(symbol);
		}
		Text.prototype = {
			nodeName: '#text',
			nodeType: TEXT_NODE,
			splitText: function (offset) {
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
			},
		};
		_extends(Text, CharacterData);
		function Comment(symbol) {
			checkSymbol(symbol);
		}
		Comment.prototype = {
			nodeName: '#comment',
			nodeType: COMMENT_NODE,
		};
		_extends(Comment, CharacterData);

		function CDATASection(symbol) {
			checkSymbol(symbol);
		}
		CDATASection.prototype = {
			nodeName: '#cdata-section',
			nodeType: CDATA_SECTION_NODE,
		};
		_extends(CDATASection, Text);

		/**
		 * @class DocumentType
		 * @augments Node
		 * @property {string} name
		 * The doctype name, stored verbatim. Declared `readonly` by the WHATWG DOM spec; xmldom does
		 * not enforce this constraint — direct property writes succeed and the written value is
		 * serialized verbatim. When serialized with `requireWellFormed: true`, the serializer
		 * validates the value against the XML `Name` production and throws `InvalidStateError` if it
		 * does not match.
		 * @property {string} publicId
		 * The external subset public identifier, stored verbatim (including surrounding quotes).
		 * Declared `readonly` by the WHATWG DOM spec; xmldom does not enforce this constraint —
		 * direct property writes succeed and the written value is serialized verbatim.
		 * When serialized with `requireWellFormed: true`, the serializer validates the value against
		 * the XML `PubidLiteral` production and throws `InvalidStateError` if it does not match.
		 * @property {string} systemId
		 * The external subset system identifier, stored verbatim (including surrounding quotes).
		 * Declared `readonly` by the WHATWG DOM spec; xmldom does not enforce this constraint —
		 * direct property writes succeed and the written value is serialized verbatim.
		 * When serialized with `requireWellFormed: true`, the serializer validates the value against
		 * the XML `SystemLiteral` production and throws `InvalidStateError` if it does not match.
		 * @property {string} internalSubset
		 * The internal subset string (the raw content between `[` and `]`), or an empty string.
		 * Declared `readonly` by the WHATWG DOM spec; xmldom does not enforce this constraint —
		 * direct property writes succeed and the written value is serialized verbatim.
		 * When serialized with `requireWellFormed: true`, the serializer throws `InvalidStateError`
		 * if the value contains `"]>"`.
		 * @see https://developer.mozilla.org/docs/Web/API/DocumentType MDN
		 * @see https://dom.spec.whatwg.org/#interface-documenttype WHATWG DOM
		 * @prettierignore
		 */
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

		/**
		 * Represents an EntityReference node, serialized as `&nodeName;`.
		 *
		 * `nodeName` is the referenced entity's name, stored verbatim. When serialized with
		 * `requireWellFormed: true`, the serializer validates `nodeName` against the XML `Name`
		 * production and throws `InvalidStateError` if it does not match; without that option the name
		 * is emitted verbatim between `&` and `;`.
		 *
		 * __This implementation differs from the specification:__ xmldom does not expand entities —
		 * the parser resolves entity references inline and never constructs `EntityReference` nodes,
		 * so the only producer is {@link Document#createEntityReference}.
		 *
		 * @class
		 * @see https://www.w3.org/TR/xml/#NT-Name
		 */
		function EntityReference(symbol) {
			checkSymbol(symbol);
		}
		EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
		_extends(EntityReference, Node);

		function DocumentFragment(symbol) {
			checkSymbol(symbol);
		}
		DocumentFragment.prototype.nodeName = '#document-fragment';
		DocumentFragment.prototype.nodeType = DOCUMENT_FRAGMENT_NODE;
		_extends(DocumentFragment, Node);

		function ProcessingInstruction(symbol) {
			checkSymbol(symbol);
		}
		ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
		_extends(ProcessingInstruction, CharacterData);
		function XMLSerializer() {}
		/**
		 * Returns the result of serializing `node` to XML.
		 *
		 * When `options.requireWellFormed` is `true`, the serializer throws `InvalidStateError` for
		 * content that would produce ill-formed XML (e.g. CDATASection data containing `"]]>"`, Text
		 * data containing characters outside the XML Char production, or a Document with no
		 * `documentElement`).
		 *
		 * When `options.splitCDATASections` is `false`, CDATASection data is emitted verbatim even
		 * when it contains `"]]>"`. When `true` (the default), `"]]>"` sequences are split across
		 * concatenated CDATA sections — this behavior is **deprecated** and will be removed in the
		 * next breaking release. Callers should migrate to `{ requireWellFormed: true }`, which throws
		 * `InvalidStateError` instead of transforming.
		 *
		 * __This implementation differs from the specification:__ - CDATASection serialization is not
		 * specified by W3C DOM Parsing or WHATWG DOM Parsing (see
		 * {@link https://github.com/w3c/DOM-Parsing/issues/38 w3c/DOM-Parsing#38}).
		 * When `splitCDATASections` is `true` (the default), `"]]>"` sequences in CDATASection data
		 * are split across concatenated CDATA sections — this mechanism is derived from DOM Level 3
		 * Core and is **deprecated**. The split mechanics will be removed in the next breaking
		 * release. Callers that rely on this behavior should migrate to `{ requireWellFormed: true }`.
		 * - W3C DOM Parsing §3.2.1.1 requires well-formedness checks on Element `localName`s,
		 * prefixes,
		 * and attribute serialization (duplicate attributes, namespace declarations, attribute value
		 * characters) when `requireWellFormed` is `true`. Element and attribute qualified names (which
		 * cover the namespace prefix) are validated against the XML `QName` production; the remaining
		 * §3.2.1.1 checks (duplicate attributes, namespace-declaration consistency) and creation-time
		 * name validation are **not implemented** in this release — see the tracking issue filed
		 * against the next breaking milestone.
		 *
		 * @param {Node} node
		 * @param {Object | function} [options]
		 * Options object, or a legacy nodeFilter function (backward compatible).
		 * @param {boolean} [options.requireWellFormed=false]
		 * When `true`, throws `InvalidStateError` for content that would produce ill-formed XML.
		 * @param {boolean} [options.splitCDATASections=true]
		 * When `true` (default), splits `"]]>"` sequences in CDATASection data across concatenated
		 * CDATA sections. **Deprecated** — will be removed in the next breaking release.
		 * @param {function} [options.nodeFilter]
		 * A filter function applied to each node before serialization.
		 * @returns {string}
		 * @throws {DOMException}
		 * With name `InvalidStateError` when `requireWellFormed` is `true` and any of the following
		 * conditions hold:
		 * - an Element's qualified name (including any namespace prefix) is not a valid XML QName
		 * - an attribute's qualified name (including a synthesized `xmlns:` namespace declaration) is
		 * not a valid XML QName
		 * - CDATASection data contains `"]]>"`
		 * - Text data contains characters outside the XML Char production
		 * - a Comment node's data contains `--` anywhere or ends with `-`
		 * - a ProcessingInstruction's target is not a valid XML `NCName` (a `Name` with no colon) or is
		 * an ASCII case-insensitive match for `"xml"`, or its data contains `?>` or characters outside
		 * the XML Char production
		 * - a DocumentType's `name` is not a valid XML `Name` (XML 1.0 production [5])
		 * - a DocumentType's `publicId` is non-empty and does not match the XML `PubidLiteral`
		 * production (W3C DOM Parsing §3.2.1.3; XML 1.0 production [12])
		 * - a DocumentType's `systemId` is non-empty and does not match the XML `SystemLiteral`
		 * production (W3C DOM Parsing §3.2.1.3; XML 1.0 production [11])
		 * - a DocumentType's `internalSubset` contains `"]>"`
		 * - an EntityReference's `nodeName` is not a valid XML `Name` (XML 1.0 production [5])
		 * - the Document has no `documentElement`
		 * @see https://developer.mozilla.org/docs/Web/API/XMLSerializer/serializeToString
		 * @see https://html.spec.whatwg.org/#dom-xmlserializer-serializetostring
		 * @see https://github.com/w3c/DOM-Parsing/issues/84
		 * @prettierignore
		 */
		XMLSerializer.prototype.serializeToString = function (node, options) {
			return nodeSerializeToString.call(node, options);
		};
		Node.prototype.toString = nodeSerializeToString;
		function nodeSerializeToString(options) {
			// Normalize the user-supplied options into a single internal opts object so that the
			// internal serializer always works with a consistent shape rather than positional flags.
			var opts;
			if (typeof options === 'function') {
				opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: options };
			} else if (options != null) {
				opts = {
					requireWellFormed: !!options.requireWellFormed,
					splitCDATASections: options.splitCDATASections !== false,
					nodeFilter: options.nodeFilter || null,
				};
			} else {
				opts = { requireWellFormed: false, splitCDATASections: true, nodeFilter: null };
			}
			var buf = [];
			var refNode = (this.nodeType === DOCUMENT_NODE && this.documentElement) || this;
			var prefix = refNode.prefix;
			var uri = refNode.namespaceURI;

			if (uri && prefix == null) {
				var prefix = refNode.lookupPrefix(uri);
				if (prefix == null) {
					var visibleNamespaces = [
						{ namespace: uri, prefix: null },
						//{namespace:uri,prefix:''}
					];
				}
			}
			serializeToString(this, buf, visibleNamespaces, opts);
			return buf.join('');
		}

		function needNamespaceDefine(node, isHTML, visibleNamespaces) {
			var prefix = node.prefix || '';
			var uri = node.namespaceURI;
			// According to [Namespaces in XML 1.0](https://www.w3.org/TR/REC-xml-names/#ns-using) ,
			// and more specifically https://www.w3.org/TR/REC-xml-names/#nsc-NoPrefixUndecl :
			// > In a namespace declaration for a prefix [...], the attribute value MUST NOT be empty.
			// in a similar manner [Namespaces in XML 1.1](https://www.w3.org/TR/xml-names11/#ns-using)
			// and more specifically https://www.w3.org/TR/xml-names11/#nsc-NSDeclared :
			// > [...] Furthermore, the attribute value [...] must not be an empty string.
			// so serializing empty namespace value like xmlns:ds="" would produce an invalid XML document.
			if (!uri) {
				return false;
			}
			if ((prefix === 'xml' && uri === NAMESPACE.XML) || uri === NAMESPACE.XMLNS) {
				return false;
			}

			var i = visibleNamespaces.length;
			while (i--) {
				var ns = visibleNamespaces[i];
				// get namespace prefix
				if (ns.prefix === prefix) {
					return ns.namespace !== uri;
				}
			}
			return true;
		}
		/**
		 * Literal whitespace other than space that appear in attribute values are serialized as
		 * their entity references, so they will be preserved.
		 * (In contrast to whitespace literals in the input which are normalized to spaces).
		 *
		 * Well-formed constraint: No < in Attribute Values:
		 * > The replacement text of any entity referred to directly or indirectly
		 * > in an attribute value must not contain a <.
		 *
		 * @see https://www.w3.org/TR/xml11/#CleanAttrVals
		 * @see https://www.w3.org/TR/xml11/#NT-AttValue
		 * @see https://www.w3.org/TR/xml11/#AVNormalize
		 * @see https://w3c.github.io/DOM-Parsing/#serializing-an-element-s-attributes
		 * @prettierignore
		 */
		function addSerializedAttribute(buf, qualifiedName, value, requireWellFormed) {
			if (requireWellFormed && !g.QName_exact.test(qualifiedName)) {
				throw new DOMException(
					'The attribute name "' + qualifiedName + '" is not a valid XML QName',
					DOMExceptionName.InvalidStateError
				);
			}
			buf.push(' ', qualifiedName, '="', value.replace(/[<>&"\t\n\r]/g, _xmlEncoder), '"');
		}

		function serializeToString(node, buf, visibleNamespaces, opts) {
			if (!visibleNamespaces) {
				visibleNamespaces = [];
			}
			var nodeFilter = opts.nodeFilter;
			var requireWellFormed = opts.requireWellFormed;
			var splitCDATASections = opts.splitCDATASections;
			var doc = node.nodeType === DOCUMENT_NODE ? node : node.ownerDocument;
			var isHTML = doc.type === 'html';

			walkDOM(
				node,
				{ ns: visibleNamespaces },
				{
					enter: function (n, ctx) {
						var namespaces = ctx.ns;

						if (nodeFilter) {
							n = nodeFilter(n);
							if (n) {
								if (typeof n == 'string') {
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
									// lookup current default ns from `xmlns` attribute
									for (var ai = 0; ai < attrs.length; ai++) {
										if (attrs.item(ai).name === 'xmlns') {
											defaultNS = attrs.item(ai).value;
											break;
										}
									}
									if (!defaultNS) {
										// lookup current default ns in visibleNamespaces
										for (var nsi = namespaces.length - 1; nsi >= 0; nsi--) {
											var nsEntry = namespaces[nsi];
											if (nsEntry.prefix === '' && nsEntry.namespace === n.namespaceURI) {
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
													prefixedNodeName = nsEntry.prefix + ':' + nodeName;
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

								buf.push('<', prefixedNodeName);

								// Build a fresh namespace snapshot for this element's children.
								// The slice prevents sibling elements from inheriting each other's declarations.
								var childNamespaces = namespaces.slice();

								for (var i = 0; i < len; i++) {
									// add namespaces for attributes
									var attr = attrs.item(i);
									if (attr.prefix == 'xmlns') {
										childNamespaces.push({
											prefix: attr.localName,
											namespace: attr.value,
										});
									} else if (attr.nodeName == 'xmlns') {
										childNamespaces.push({ prefix: '', namespace: attr.value });
									}
								}

								for (var i = 0; i < len; i++) {
									var attr = attrs.item(i);
									if (needNamespaceDefine(attr, isHTML, childNamespaces)) {
										var attrPrefix = attr.prefix || '';
										var uri = attr.namespaceURI;
										addSerializedAttribute(buf, attrPrefix ? 'xmlns:' + attrPrefix : 'xmlns', uri, requireWellFormed);
										childNamespaces.push({ prefix: attrPrefix, namespace: uri });
									}
									// Apply nodeFilter and serialize the attribute.
									var filteredAttr = nodeFilter ? nodeFilter(attr) : attr;
									if (filteredAttr) {
										if (typeof filteredAttr === 'string') {
											buf.push(filteredAttr);
										} else {
											addSerializedAttribute(buf, filteredAttr.name, filteredAttr.value, requireWellFormed);
										}
									}
								}

								// add namespace for current node
								if (nodeName === prefixedNodeName && needNamespaceDefine(n, isHTML, childNamespaces)) {
									var nodePrefix = n.prefix || '';
									var uri = n.namespaceURI;
									addSerializedAttribute(buf, nodePrefix ? 'xmlns:' + nodePrefix : 'xmlns', uri, requireWellFormed);
									childNamespaces.push({ prefix: nodePrefix, namespace: uri });
								}

								// in XML elements can be closed when they have no children
								var canCloseTag = !n.firstChild;
								if (canCloseTag && (isHTML || n.namespaceURI === NAMESPACE.HTML)) {
									// in HTML (doc or ns) only void elements can be closed right away
									canCloseTag = isHTMLVoidElement(nodeName);
								}
								if (canCloseTag) {
									buf.push('/>');
									// Self-closing: no children and no closing tag needed from exit.
									return null;
								}

								buf.push('>');

								// HTML raw text elements: serialize children as raw data without further descent.
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
									buf.push('</', prefixedNodeName, '>');
									// Children handled manually above; prevent walkDOM from also traversing them.
									return null;
								}

								// Return child context so walkDOM descends; exit will emit the closing tag.
								return { ns: childNamespaces, tag: prefixedNodeName };
							case DOCUMENT_NODE:
							case DOCUMENT_FRAGMENT_NODE:
								if (requireWellFormed && n.nodeType === DOCUMENT_NODE && n.documentElement == null) {
									throw new DOMException('The Document has no documentElement', DOMExceptionName.InvalidStateError);
								}
								// Pass namespaces through; each child element will slice independently.
								return { ns: namespaces };
							case ATTRIBUTE_NODE:
								addSerializedAttribute(buf, n.name, n.value, requireWellFormed);
								return null;
							case TEXT_NODE:
								/*
								 * The ampersand character (&) and the left angle bracket (<) must not appear in their literal form,
								 * except when used as markup delimiters, or within a comment, a processing instruction,
								 * or a CDATA section.
								 * If they are needed elsewhere, they must be escaped using either numeric character
								 * references or the strings `&amp;` and `&lt;` respectively.
								 * The right angle bracket (>) may be represented using the string " &gt; ",
								 * and must, for compatibility, be escaped using either `&gt;`,
								 * or a character reference when it appears in the string `]]>` in content,
								 * when that string is not marking the end of a CDATA section.
								 *
								 * In the content of elements, character data is any string of characters which does not
								 * contain the start-delimiter of any markup and does not include the CDATA-section-close
								 * delimiter, `]]>`.
								 *
								 * @see https://www.w3.org/TR/xml/#NT-CharData
								 * @see https://w3c.github.io/DOM-Parsing/#xml-serializing-a-text-node
								 */
								if (requireWellFormed && g.InvalidChar.test(n.data)) {
									throw new DOMException(
										'The Text node data contains characters outside the XML Char production',
										DOMExceptionName.InvalidStateError
									);
								}
								buf.push(n.data.replace(/[<&>]/g, _xmlEncoder));
								return null;
							case CDATA_SECTION_NODE:
								if (requireWellFormed && n.data.indexOf(']]>') !== -1) {
									throw new DOMException('The CDATASection data contains "]]>"', DOMExceptionName.InvalidStateError);
								}
								if (splitCDATASections) {
									buf.push(g.CDATA_START, n.data.replace(/]]>/g, ']]]]><![CDATA[>'), g.CDATA_END);
								} else {
									buf.push(g.CDATA_START, n.data, g.CDATA_END);
								}
								return null;
							case COMMENT_NODE:
								if (requireWellFormed) {
									if (g.InvalidChar.test(n.data)) {
										throw new DOMException(
											'The comment node data contains characters outside the XML Char production',
											DOMExceptionName.InvalidStateError
										);
									}
									if (n.data.indexOf('--') !== -1 || n.data[n.data.length - 1] === '-') {
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
										throw new DOMException('DocumentType publicId is not a valid PubidLiteral', DOMExceptionName.InvalidStateError);
									}
									if (sysid && sysid !== '.' && !g.SystemLiteral_match.test(sysid)) {
										throw new DOMException('DocumentType systemId is not a valid SystemLiteral', DOMExceptionName.InvalidStateError);
									}
									if (n.internalSubset && n.internalSubset.indexOf(']>') !== -1) {
										throw new DOMException('DocumentType internalSubset contains "]>"', DOMExceptionName.InvalidStateError);
									}
								}
								buf.push(g.DOCTYPE_DECL_START, ' ', n.name);
								if (pubid) {
									buf.push(' ', g.PUBLIC, ' ', pubid);
									if (sysid && sysid !== '.') {
										buf.push(' ', sysid);
									}
								} else if (sysid && sysid !== '.') {
									buf.push(' ', g.SYSTEM, ' ', sysid);
								}
								if (n.internalSubset) {
									buf.push(' [', n.internalSubset, ']');
								}
								buf.push('>');
								return null;
							case PROCESSING_INSTRUCTION_NODE:
								if (requireWellFormed) {
									if (!g.NCName_exact.test(n.target) || n.target.toLowerCase() === 'xml') {
										throw new DOMException(
											'The processing instruction target "' + n.target + '" is not a valid XML NCName or is reserved',
											DOMExceptionName.InvalidStateError
										);
									}
									if (g.InvalidChar.test(n.data)) {
										throw new DOMException(
											'The ProcessingInstruction data contains characters outside the XML Char production',
											DOMExceptionName.InvalidStateError
										);
									}
									if (n.data.indexOf('?>') !== -1) {
										throw new DOMException('The ProcessingInstruction data contains "?>"', DOMExceptionName.InvalidStateError);
									}
								}
								buf.push('<?', n.target, ' ', n.data, '?>');
								return null;
							case ENTITY_REFERENCE_NODE:
								if (requireWellFormed && !g.Name_exact.test(n.nodeName)) {
									throw new DOMException(
										'The entity reference name "' + n.nodeName + '" is not a valid XML Name',
										DOMExceptionName.InvalidStateError
									);
								}
								buf.push('&', n.nodeName, ';');
								return null;
							//case ENTITY_NODE:
							//case NOTATION_NODE:
							default:
								buf.push('??', n.nodeName);
								return null;
						}
					},
					exit: function (n, childCtx) {
						// Emit the closing tag for elements that were opened (not self-closed, not raw text).
						if (childCtx && childCtx.tag) {
							buf.push('</', childCtx.tag, '>');
						}
					},
				}
			);
		}
		/**
		 * Imports a node from a different document into `doc`, creating a new copy.
		 * Delegates to {@link walkDOM} for traversal. Each node in the subtree is shallow-cloned,
		 * stamped with `doc` as its `ownerDocument`, and detached (`parentNode` set to `null`).
		 * Children are imported recursively when `deep` is `true`; for {@link Attr} nodes `deep` is
		 * always forced to `true`
		 * because an attribute's value lives in a child text node.
		 *
		 * @param {Document} doc
		 * The document that will own the imported node.
		 * @param {Node} node
		 * The node to import.
		 * @param {boolean} deep
		 * If `true`, descendants are imported recursively.
		 * @returns {Node}
		 * The newly imported node, now owned by `doc`.
		 */
		function importNode(doc, node, deep) {
			var destRoot;
			walkDOM(node, null, {
				enter: function (srcNode, destParent) {
					// Shallow-clone the node and stamp it into the target document.
					var destNode = srcNode.cloneNode(false);
					destNode.ownerDocument = doc;
					destNode.parentNode = null;
					// capture as the root of the imported subtree or attach to parent.
					if (destParent === null) {
						destRoot = destNode;
					} else {
						destParent.appendChild(destNode);
					}
					// ATTRIBUTE_NODE must always be imported deeply: its value lives in a child text node.
					var shouldDeep = srcNode.nodeType === ATTRIBUTE_NODE || deep;
					return shouldDeep ? destNode : null;
				},
			});
			return destRoot;
		}

		/**
		 * Creates a copy of a node from an existing one.
		 *
		 * @param {Document} doc
		 * The Document object representing the document that the new node will belong to.
		 * @param {Node} node
		 * The node to clone.
		 * @param {boolean} deep
		 * If true, the contents of the node are recursively copied.
		 * If false, only the node itself (and its attributes, if it is an element) are copied.
		 * @returns {Node}
		 * Returns the newly created copy of the node.
		 * @throws {DOMException}
		 * May throw a DOMException if operations within setAttributeNode or appendChild (which are
		 * potentially invoked in this function) do not meet their specific constraints.
		 */
		function cloneNode(doc, node, deep) {
			var destRoot;
			walkDOM(node, null, {
				enter: function (srcNode, destParent) {
					// 1. Create a blank node of the same type and copy all scalar own properties.
					var destNode = new srcNode.constructor(PDC);
					for (var n in srcNode) {
						if (hasOwn(srcNode, n)) {
							var v = srcNode[n];
							if (typeof v != 'object') {
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
					// 2. Handle node-type-specific setup.
					//    Attributes are not DOM children, so they are cloned inline here
					//    rather than by walkDOM descent.
					//    ATTRIBUTE_NODE forces deep=true so its own children are walked.
					var shouldDeep = deep;
					switch (destNode.nodeType) {
						case ELEMENT_NODE:
							var attrs = srcNode.attributes;
							var attrs2 = (destNode.attributes = new NamedNodeMap());
							var len = attrs.length;
							attrs2._ownerElement = destNode;
							for (var i = 0; i < len; i++) {
								destNode.setAttributeNode(cloneNode(doc, attrs.item(i), true));
							}
							break;
						case ATTRIBUTE_NODE:
							shouldDeep = true;
					}
					// 3. Attach to parent, or capture as the root of the cloned subtree.
					if (destParent !== null) {
						destParent.appendChild(destNode);
					} else {
						destRoot = destNode;
					}
					// 4. Return destNode as the context for children (causes walkDOM to descend),
					//    or null to skip children (shallow clone).
					return shouldDeep ? destNode : null;
				},
			});
			return destRoot;
		}

		function __set__(object, key, value) {
			object[key] = value;
		}

		// Returns a new array of direct Element children.
		// Passed to LiveNodeList to implement ParentNode.children.
		// https://dom.spec.whatwg.org/#dom-parentnode-children
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

		//do dynamic
		try {
			if (Object.defineProperty) {
				Object.defineProperty(LiveNodeList.prototype, 'length', {
					get: function () {
						_updateLiveList(this);
						return this.$$length;
					},
				});

				/**
				 * The text content of this node and its descendants.
				 *
				 * For {@link Element} and {@link DocumentFragment} nodes, returns the concatenation of the
				 * `nodeValue` of every descendant text node, excluding processing instruction and comment
				 * nodes. For all other node types, returns `nodeValue`.
				 *
				 * Setting `textContent` on an element or document fragment replaces all child nodes with a
				 * single text node; on other nodes it sets `data`, `value`, and `nodeValue` directly.
				 *
				 * @type {string | null}
				 * @see {@link https://dom.spec.whatwg.org/#dom-node-textcontent}
				 */
				Object.defineProperty(Node.prototype, 'textContent', {
					get: function () {
						if (this.nodeType === ELEMENT_NODE || this.nodeType === DOCUMENT_FRAGMENT_NODE) {
							var buf = [];
							walkDOM(this, null, {
								enter: function (n) {
									if (n.nodeType === ELEMENT_NODE || n.nodeType === DOCUMENT_FRAGMENT_NODE) {
										return true; // enter children
									}
									if (n.nodeType === PROCESSING_INSTRUCTION_NODE || n.nodeType === COMMENT_NODE) {
										return null; // excluded from text content
									}
									buf.push(n.nodeValue);
								},
							});
							return buf.join('');
						}
						return this.nodeValue;
					},

					set: function (data) {
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
					},
				});

				Object.defineProperty(CharacterData.prototype, 'data', {
					get: function () {
						return this._data != null ? this._data : '';
					},
					set: function (v) {
						this._data = v;
						this.length = typeof v === 'string' ? v.length : 0;
					},
				});

				Object.defineProperty(CharacterData.prototype, 'nodeValue', {
					get: function () {
						return this.data;
					},
					set: function (v) {
						this.data = v;
					},
					enumerable: true,
					configurable: true,
				});

				Object.defineProperty(Element.prototype, 'children', {
					get: function () {
						return new LiveNodeList(this, childrenRefresh);
					},
				});
				Object.defineProperty(Document.prototype, 'children', {
					get: function () {
						return new LiveNodeList(this, childrenRefresh);
					},
				});
				Object.defineProperty(DocumentFragment.prototype, 'children', {
					get: function () {
						return new LiveNodeList(this, childrenRefresh);
					},
				});

				__set__ = function (object, key, value) {
					//console.log(value)
					object['$$' + key] = value;
				};
			}
		} catch (e) {
			//ie8
		}

		dom._updateLiveList = _updateLiveList;
		dom.Attr = Attr;
		dom.CDATASection = CDATASection;
		dom.CharacterData = CharacterData;
		dom.Comment = Comment;
		dom.Document = Document;
		dom.DocumentFragment = DocumentFragment;
		dom.DocumentType = DocumentType;
		dom.DOMImplementation = DOMImplementation;
		dom.Element = Element;
		dom.Entity = Entity;
		dom.EntityReference = EntityReference;
		dom.LiveNodeList = LiveNodeList;
		dom.NamedNodeMap = NamedNodeMap;
		dom.Node = Node;
		dom.NodeList = NodeList;
		dom.Notation = Notation;
		dom.Text = Text;
		dom.ProcessingInstruction = ProcessingInstruction;
		dom.walkDOM = walkDOM;
		dom.XMLSerializer = XMLSerializer;
		return dom;
	}

	var domParser = {};

	var entities = {};

	var hasRequiredEntities;

	function requireEntities () {
		if (hasRequiredEntities) return entities;
		hasRequiredEntities = 1;
		(function (exports) {

			var freeze = requireConventions().freeze;

			/**
			 * The entities that are predefined in every XML document.
			 *
			 * @see https://www.w3.org/TR/2006/REC-xml11-20060816/#sec-predefined-ent W3C XML 1.1
			 * @see https://www.w3.org/TR/2008/REC-xml-20081126/#sec-predefined-ent W3C XML 1.0
			 * @see https://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references#Predefined_entities_in_XML
			 *      Wikipedia
			 */
			exports.XML_ENTITIES = freeze({
				amp: '&',
				apos: "'",
				gt: '>',
				lt: '<',
				quot: '"',
			});

			/**
			 * A map of all entities that are detected in an HTML document.
			 * They contain all entries from `XML_ENTITIES`.
			 *
			 * @see {@link XML_ENTITIES}
			 * @see {@link DOMParser.parseFromString}
			 * @see {@link DOMImplementation.prototype.createHTMLDocument}
			 * @see https://html.spec.whatwg.org/#named-character-references WHATWG HTML(5)
			 *      Spec
			 * @see https://html.spec.whatwg.org/entities.json JSON
			 * @see https://www.w3.org/TR/xml-entity-names/ W3C XML Entity Names
			 * @see https://www.w3.org/TR/html4/sgml/entities.html W3C HTML4/SGML
			 * @see https://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references#Character_entity_references_in_HTML
			 *      Wikipedia (HTML)
			 * @see https://en.wikipedia.org/wiki/List_of_XML_and_HTML_character_entity_references#Entities_representing_special_characters_in_XHTML
			 *      Wikpedia (XHTML)
			 */
			exports.HTML_ENTITIES = freeze({
				Aacute: '\u00C1',
				aacute: '\u00E1',
				Abreve: '\u0102',
				abreve: '\u0103',
				ac: '\u223E',
				acd: '\u223F',
				acE: '\u223E\u0333',
				Acirc: '\u00C2',
				acirc: '\u00E2',
				acute: '\u00B4',
				Acy: '\u0410',
				acy: '\u0430',
				AElig: '\u00C6',
				aelig: '\u00E6',
				af: '\u2061',
				Afr: '\uD835\uDD04',
				afr: '\uD835\uDD1E',
				Agrave: '\u00C0',
				agrave: '\u00E0',
				alefsym: '\u2135',
				aleph: '\u2135',
				Alpha: '\u0391',
				alpha: '\u03B1',
				Amacr: '\u0100',
				amacr: '\u0101',
				amalg: '\u2A3F',
				AMP: '\u0026',
				amp: '\u0026',
				And: '\u2A53',
				and: '\u2227',
				andand: '\u2A55',
				andd: '\u2A5C',
				andslope: '\u2A58',
				andv: '\u2A5A',
				ang: '\u2220',
				ange: '\u29A4',
				angle: '\u2220',
				angmsd: '\u2221',
				angmsdaa: '\u29A8',
				angmsdab: '\u29A9',
				angmsdac: '\u29AA',
				angmsdad: '\u29AB',
				angmsdae: '\u29AC',
				angmsdaf: '\u29AD',
				angmsdag: '\u29AE',
				angmsdah: '\u29AF',
				angrt: '\u221F',
				angrtvb: '\u22BE',
				angrtvbd: '\u299D',
				angsph: '\u2222',
				angst: '\u00C5',
				angzarr: '\u237C',
				Aogon: '\u0104',
				aogon: '\u0105',
				Aopf: '\uD835\uDD38',
				aopf: '\uD835\uDD52',
				ap: '\u2248',
				apacir: '\u2A6F',
				apE: '\u2A70',
				ape: '\u224A',
				apid: '\u224B',
				apos: '\u0027',
				ApplyFunction: '\u2061',
				approx: '\u2248',
				approxeq: '\u224A',
				Aring: '\u00C5',
				aring: '\u00E5',
				Ascr: '\uD835\uDC9C',
				ascr: '\uD835\uDCB6',
				Assign: '\u2254',
				ast: '\u002A',
				asymp: '\u2248',
				asympeq: '\u224D',
				Atilde: '\u00C3',
				atilde: '\u00E3',
				Auml: '\u00C4',
				auml: '\u00E4',
				awconint: '\u2233',
				awint: '\u2A11',
				backcong: '\u224C',
				backepsilon: '\u03F6',
				backprime: '\u2035',
				backsim: '\u223D',
				backsimeq: '\u22CD',
				Backslash: '\u2216',
				Barv: '\u2AE7',
				barvee: '\u22BD',
				Barwed: '\u2306',
				barwed: '\u2305',
				barwedge: '\u2305',
				bbrk: '\u23B5',
				bbrktbrk: '\u23B6',
				bcong: '\u224C',
				Bcy: '\u0411',
				bcy: '\u0431',
				bdquo: '\u201E',
				becaus: '\u2235',
				Because: '\u2235',
				because: '\u2235',
				bemptyv: '\u29B0',
				bepsi: '\u03F6',
				bernou: '\u212C',
				Bernoullis: '\u212C',
				Beta: '\u0392',
				beta: '\u03B2',
				beth: '\u2136',
				between: '\u226C',
				Bfr: '\uD835\uDD05',
				bfr: '\uD835\uDD1F',
				bigcap: '\u22C2',
				bigcirc: '\u25EF',
				bigcup: '\u22C3',
				bigodot: '\u2A00',
				bigoplus: '\u2A01',
				bigotimes: '\u2A02',
				bigsqcup: '\u2A06',
				bigstar: '\u2605',
				bigtriangledown: '\u25BD',
				bigtriangleup: '\u25B3',
				biguplus: '\u2A04',
				bigvee: '\u22C1',
				bigwedge: '\u22C0',
				bkarow: '\u290D',
				blacklozenge: '\u29EB',
				blacksquare: '\u25AA',
				blacktriangle: '\u25B4',
				blacktriangledown: '\u25BE',
				blacktriangleleft: '\u25C2',
				blacktriangleright: '\u25B8',
				blank: '\u2423',
				blk12: '\u2592',
				blk14: '\u2591',
				blk34: '\u2593',
				block: '\u2588',
				bne: '\u003D\u20E5',
				bnequiv: '\u2261\u20E5',
				bNot: '\u2AED',
				bnot: '\u2310',
				Bopf: '\uD835\uDD39',
				bopf: '\uD835\uDD53',
				bot: '\u22A5',
				bottom: '\u22A5',
				bowtie: '\u22C8',
				boxbox: '\u29C9',
				boxDL: '\u2557',
				boxDl: '\u2556',
				boxdL: '\u2555',
				boxdl: '\u2510',
				boxDR: '\u2554',
				boxDr: '\u2553',
				boxdR: '\u2552',
				boxdr: '\u250C',
				boxH: '\u2550',
				boxh: '\u2500',
				boxHD: '\u2566',
				boxHd: '\u2564',
				boxhD: '\u2565',
				boxhd: '\u252C',
				boxHU: '\u2569',
				boxHu: '\u2567',
				boxhU: '\u2568',
				boxhu: '\u2534',
				boxminus: '\u229F',
				boxplus: '\u229E',
				boxtimes: '\u22A0',
				boxUL: '\u255D',
				boxUl: '\u255C',
				boxuL: '\u255B',
				boxul: '\u2518',
				boxUR: '\u255A',
				boxUr: '\u2559',
				boxuR: '\u2558',
				boxur: '\u2514',
				boxV: '\u2551',
				boxv: '\u2502',
				boxVH: '\u256C',
				boxVh: '\u256B',
				boxvH: '\u256A',
				boxvh: '\u253C',
				boxVL: '\u2563',
				boxVl: '\u2562',
				boxvL: '\u2561',
				boxvl: '\u2524',
				boxVR: '\u2560',
				boxVr: '\u255F',
				boxvR: '\u255E',
				boxvr: '\u251C',
				bprime: '\u2035',
				Breve: '\u02D8',
				breve: '\u02D8',
				brvbar: '\u00A6',
				Bscr: '\u212C',
				bscr: '\uD835\uDCB7',
				bsemi: '\u204F',
				bsim: '\u223D',
				bsime: '\u22CD',
				bsol: '\u005C',
				bsolb: '\u29C5',
				bsolhsub: '\u27C8',
				bull: '\u2022',
				bullet: '\u2022',
				bump: '\u224E',
				bumpE: '\u2AAE',
				bumpe: '\u224F',
				Bumpeq: '\u224E',
				bumpeq: '\u224F',
				Cacute: '\u0106',
				cacute: '\u0107',
				Cap: '\u22D2',
				cap: '\u2229',
				capand: '\u2A44',
				capbrcup: '\u2A49',
				capcap: '\u2A4B',
				capcup: '\u2A47',
				capdot: '\u2A40',
				CapitalDifferentialD: '\u2145',
				caps: '\u2229\uFE00',
				caret: '\u2041',
				caron: '\u02C7',
				Cayleys: '\u212D',
				ccaps: '\u2A4D',
				Ccaron: '\u010C',
				ccaron: '\u010D',
				Ccedil: '\u00C7',
				ccedil: '\u00E7',
				Ccirc: '\u0108',
				ccirc: '\u0109',
				Cconint: '\u2230',
				ccups: '\u2A4C',
				ccupssm: '\u2A50',
				Cdot: '\u010A',
				cdot: '\u010B',
				cedil: '\u00B8',
				Cedilla: '\u00B8',
				cemptyv: '\u29B2',
				cent: '\u00A2',
				CenterDot: '\u00B7',
				centerdot: '\u00B7',
				Cfr: '\u212D',
				cfr: '\uD835\uDD20',
				CHcy: '\u0427',
				chcy: '\u0447',
				check: '\u2713',
				checkmark: '\u2713',
				Chi: '\u03A7',
				chi: '\u03C7',
				cir: '\u25CB',
				circ: '\u02C6',
				circeq: '\u2257',
				circlearrowleft: '\u21BA',
				circlearrowright: '\u21BB',
				circledast: '\u229B',
				circledcirc: '\u229A',
				circleddash: '\u229D',
				CircleDot: '\u2299',
				circledR: '\u00AE',
				circledS: '\u24C8',
				CircleMinus: '\u2296',
				CirclePlus: '\u2295',
				CircleTimes: '\u2297',
				cirE: '\u29C3',
				cire: '\u2257',
				cirfnint: '\u2A10',
				cirmid: '\u2AEF',
				cirscir: '\u29C2',
				ClockwiseContourIntegral: '\u2232',
				CloseCurlyDoubleQuote: '\u201D',
				CloseCurlyQuote: '\u2019',
				clubs: '\u2663',
				clubsuit: '\u2663',
				Colon: '\u2237',
				colon: '\u003A',
				Colone: '\u2A74',
				colone: '\u2254',
				coloneq: '\u2254',
				comma: '\u002C',
				commat: '\u0040',
				comp: '\u2201',
				compfn: '\u2218',
				complement: '\u2201',
				complexes: '\u2102',
				cong: '\u2245',
				congdot: '\u2A6D',
				Congruent: '\u2261',
				Conint: '\u222F',
				conint: '\u222E',
				ContourIntegral: '\u222E',
				Copf: '\u2102',
				copf: '\uD835\uDD54',
				coprod: '\u2210',
				Coproduct: '\u2210',
				COPY: '\u00A9',
				copy: '\u00A9',
				copysr: '\u2117',
				CounterClockwiseContourIntegral: '\u2233',
				crarr: '\u21B5',
				Cross: '\u2A2F',
				cross: '\u2717',
				Cscr: '\uD835\uDC9E',
				cscr: '\uD835\uDCB8',
				csub: '\u2ACF',
				csube: '\u2AD1',
				csup: '\u2AD0',
				csupe: '\u2AD2',
				ctdot: '\u22EF',
				cudarrl: '\u2938',
				cudarrr: '\u2935',
				cuepr: '\u22DE',
				cuesc: '\u22DF',
				cularr: '\u21B6',
				cularrp: '\u293D',
				Cup: '\u22D3',
				cup: '\u222A',
				cupbrcap: '\u2A48',
				CupCap: '\u224D',
				cupcap: '\u2A46',
				cupcup: '\u2A4A',
				cupdot: '\u228D',
				cupor: '\u2A45',
				cups: '\u222A\uFE00',
				curarr: '\u21B7',
				curarrm: '\u293C',
				curlyeqprec: '\u22DE',
				curlyeqsucc: '\u22DF',
				curlyvee: '\u22CE',
				curlywedge: '\u22CF',
				curren: '\u00A4',
				curvearrowleft: '\u21B6',
				curvearrowright: '\u21B7',
				cuvee: '\u22CE',
				cuwed: '\u22CF',
				cwconint: '\u2232',
				cwint: '\u2231',
				cylcty: '\u232D',
				Dagger: '\u2021',
				dagger: '\u2020',
				daleth: '\u2138',
				Darr: '\u21A1',
				dArr: '\u21D3',
				darr: '\u2193',
				dash: '\u2010',
				Dashv: '\u2AE4',
				dashv: '\u22A3',
				dbkarow: '\u290F',
				dblac: '\u02DD',
				Dcaron: '\u010E',
				dcaron: '\u010F',
				Dcy: '\u0414',
				dcy: '\u0434',
				DD: '\u2145',
				dd: '\u2146',
				ddagger: '\u2021',
				ddarr: '\u21CA',
				DDotrahd: '\u2911',
				ddotseq: '\u2A77',
				deg: '\u00B0',
				Del: '\u2207',
				Delta: '\u0394',
				delta: '\u03B4',
				demptyv: '\u29B1',
				dfisht: '\u297F',
				Dfr: '\uD835\uDD07',
				dfr: '\uD835\uDD21',
				dHar: '\u2965',
				dharl: '\u21C3',
				dharr: '\u21C2',
				DiacriticalAcute: '\u00B4',
				DiacriticalDot: '\u02D9',
				DiacriticalDoubleAcute: '\u02DD',
				DiacriticalGrave: '\u0060',
				DiacriticalTilde: '\u02DC',
				diam: '\u22C4',
				Diamond: '\u22C4',
				diamond: '\u22C4',
				diamondsuit: '\u2666',
				diams: '\u2666',
				die: '\u00A8',
				DifferentialD: '\u2146',
				digamma: '\u03DD',
				disin: '\u22F2',
				div: '\u00F7',
				divide: '\u00F7',
				divideontimes: '\u22C7',
				divonx: '\u22C7',
				DJcy: '\u0402',
				djcy: '\u0452',
				dlcorn: '\u231E',
				dlcrop: '\u230D',
				dollar: '\u0024',
				Dopf: '\uD835\uDD3B',
				dopf: '\uD835\uDD55',
				Dot: '\u00A8',
				dot: '\u02D9',
				DotDot: '\u20DC',
				doteq: '\u2250',
				doteqdot: '\u2251',
				DotEqual: '\u2250',
				dotminus: '\u2238',
				dotplus: '\u2214',
				dotsquare: '\u22A1',
				doublebarwedge: '\u2306',
				DoubleContourIntegral: '\u222F',
				DoubleDot: '\u00A8',
				DoubleDownArrow: '\u21D3',
				DoubleLeftArrow: '\u21D0',
				DoubleLeftRightArrow: '\u21D4',
				DoubleLeftTee: '\u2AE4',
				DoubleLongLeftArrow: '\u27F8',
				DoubleLongLeftRightArrow: '\u27FA',
				DoubleLongRightArrow: '\u27F9',
				DoubleRightArrow: '\u21D2',
				DoubleRightTee: '\u22A8',
				DoubleUpArrow: '\u21D1',
				DoubleUpDownArrow: '\u21D5',
				DoubleVerticalBar: '\u2225',
				DownArrow: '\u2193',
				Downarrow: '\u21D3',
				downarrow: '\u2193',
				DownArrowBar: '\u2913',
				DownArrowUpArrow: '\u21F5',
				DownBreve: '\u0311',
				downdownarrows: '\u21CA',
				downharpoonleft: '\u21C3',
				downharpoonright: '\u21C2',
				DownLeftRightVector: '\u2950',
				DownLeftTeeVector: '\u295E',
				DownLeftVector: '\u21BD',
				DownLeftVectorBar: '\u2956',
				DownRightTeeVector: '\u295F',
				DownRightVector: '\u21C1',
				DownRightVectorBar: '\u2957',
				DownTee: '\u22A4',
				DownTeeArrow: '\u21A7',
				drbkarow: '\u2910',
				drcorn: '\u231F',
				drcrop: '\u230C',
				Dscr: '\uD835\uDC9F',
				dscr: '\uD835\uDCB9',
				DScy: '\u0405',
				dscy: '\u0455',
				dsol: '\u29F6',
				Dstrok: '\u0110',
				dstrok: '\u0111',
				dtdot: '\u22F1',
				dtri: '\u25BF',
				dtrif: '\u25BE',
				duarr: '\u21F5',
				duhar: '\u296F',
				dwangle: '\u29A6',
				DZcy: '\u040F',
				dzcy: '\u045F',
				dzigrarr: '\u27FF',
				Eacute: '\u00C9',
				eacute: '\u00E9',
				easter: '\u2A6E',
				Ecaron: '\u011A',
				ecaron: '\u011B',
				ecir: '\u2256',
				Ecirc: '\u00CA',
				ecirc: '\u00EA',
				ecolon: '\u2255',
				Ecy: '\u042D',
				ecy: '\u044D',
				eDDot: '\u2A77',
				Edot: '\u0116',
				eDot: '\u2251',
				edot: '\u0117',
				ee: '\u2147',
				efDot: '\u2252',
				Efr: '\uD835\uDD08',
				efr: '\uD835\uDD22',
				eg: '\u2A9A',
				Egrave: '\u00C8',
				egrave: '\u00E8',
				egs: '\u2A96',
				egsdot: '\u2A98',
				el: '\u2A99',
				Element: '\u2208',
				elinters: '\u23E7',
				ell: '\u2113',
				els: '\u2A95',
				elsdot: '\u2A97',
				Emacr: '\u0112',
				emacr: '\u0113',
				empty: '\u2205',
				emptyset: '\u2205',
				EmptySmallSquare: '\u25FB',
				emptyv: '\u2205',
				EmptyVerySmallSquare: '\u25AB',
				emsp: '\u2003',
				emsp13: '\u2004',
				emsp14: '\u2005',
				ENG: '\u014A',
				eng: '\u014B',
				ensp: '\u2002',
				Eogon: '\u0118',
				eogon: '\u0119',
				Eopf: '\uD835\uDD3C',
				eopf: '\uD835\uDD56',
				epar: '\u22D5',
				eparsl: '\u29E3',
				eplus: '\u2A71',
				epsi: '\u03B5',
				Epsilon: '\u0395',
				epsilon: '\u03B5',
				epsiv: '\u03F5',
				eqcirc: '\u2256',
				eqcolon: '\u2255',
				eqsim: '\u2242',
				eqslantgtr: '\u2A96',
				eqslantless: '\u2A95',
				Equal: '\u2A75',
				equals: '\u003D',
				EqualTilde: '\u2242',
				equest: '\u225F',
				Equilibrium: '\u21CC',
				equiv: '\u2261',
				equivDD: '\u2A78',
				eqvparsl: '\u29E5',
				erarr: '\u2971',
				erDot: '\u2253',
				Escr: '\u2130',
				escr: '\u212F',
				esdot: '\u2250',
				Esim: '\u2A73',
				esim: '\u2242',
				Eta: '\u0397',
				eta: '\u03B7',
				ETH: '\u00D0',
				eth: '\u00F0',
				Euml: '\u00CB',
				euml: '\u00EB',
				euro: '\u20AC',
				excl: '\u0021',
				exist: '\u2203',
				Exists: '\u2203',
				expectation: '\u2130',
				ExponentialE: '\u2147',
				exponentiale: '\u2147',
				fallingdotseq: '\u2252',
				Fcy: '\u0424',
				fcy: '\u0444',
				female: '\u2640',
				ffilig: '\uFB03',
				fflig: '\uFB00',
				ffllig: '\uFB04',
				Ffr: '\uD835\uDD09',
				ffr: '\uD835\uDD23',
				filig: '\uFB01',
				FilledSmallSquare: '\u25FC',
				FilledVerySmallSquare: '\u25AA',
				fjlig: '\u0066\u006A',
				flat: '\u266D',
				fllig: '\uFB02',
				fltns: '\u25B1',
				fnof: '\u0192',
				Fopf: '\uD835\uDD3D',
				fopf: '\uD835\uDD57',
				ForAll: '\u2200',
				forall: '\u2200',
				fork: '\u22D4',
				forkv: '\u2AD9',
				Fouriertrf: '\u2131',
				fpartint: '\u2A0D',
				frac12: '\u00BD',
				frac13: '\u2153',
				frac14: '\u00BC',
				frac15: '\u2155',
				frac16: '\u2159',
				frac18: '\u215B',
				frac23: '\u2154',
				frac25: '\u2156',
				frac34: '\u00BE',
				frac35: '\u2157',
				frac38: '\u215C',
				frac45: '\u2158',
				frac56: '\u215A',
				frac58: '\u215D',
				frac78: '\u215E',
				frasl: '\u2044',
				frown: '\u2322',
				Fscr: '\u2131',
				fscr: '\uD835\uDCBB',
				gacute: '\u01F5',
				Gamma: '\u0393',
				gamma: '\u03B3',
				Gammad: '\u03DC',
				gammad: '\u03DD',
				gap: '\u2A86',
				Gbreve: '\u011E',
				gbreve: '\u011F',
				Gcedil: '\u0122',
				Gcirc: '\u011C',
				gcirc: '\u011D',
				Gcy: '\u0413',
				gcy: '\u0433',
				Gdot: '\u0120',
				gdot: '\u0121',
				gE: '\u2267',
				ge: '\u2265',
				gEl: '\u2A8C',
				gel: '\u22DB',
				geq: '\u2265',
				geqq: '\u2267',
				geqslant: '\u2A7E',
				ges: '\u2A7E',
				gescc: '\u2AA9',
				gesdot: '\u2A80',
				gesdoto: '\u2A82',
				gesdotol: '\u2A84',
				gesl: '\u22DB\uFE00',
				gesles: '\u2A94',
				Gfr: '\uD835\uDD0A',
				gfr: '\uD835\uDD24',
				Gg: '\u22D9',
				gg: '\u226B',
				ggg: '\u22D9',
				gimel: '\u2137',
				GJcy: '\u0403',
				gjcy: '\u0453',
				gl: '\u2277',
				gla: '\u2AA5',
				glE: '\u2A92',
				glj: '\u2AA4',
				gnap: '\u2A8A',
				gnapprox: '\u2A8A',
				gnE: '\u2269',
				gne: '\u2A88',
				gneq: '\u2A88',
				gneqq: '\u2269',
				gnsim: '\u22E7',
				Gopf: '\uD835\uDD3E',
				gopf: '\uD835\uDD58',
				grave: '\u0060',
				GreaterEqual: '\u2265',
				GreaterEqualLess: '\u22DB',
				GreaterFullEqual: '\u2267',
				GreaterGreater: '\u2AA2',
				GreaterLess: '\u2277',
				GreaterSlantEqual: '\u2A7E',
				GreaterTilde: '\u2273',
				Gscr: '\uD835\uDCA2',
				gscr: '\u210A',
				gsim: '\u2273',
				gsime: '\u2A8E',
				gsiml: '\u2A90',
				Gt: '\u226B',
				GT: '\u003E',
				gt: '\u003E',
				gtcc: '\u2AA7',
				gtcir: '\u2A7A',
				gtdot: '\u22D7',
				gtlPar: '\u2995',
				gtquest: '\u2A7C',
				gtrapprox: '\u2A86',
				gtrarr: '\u2978',
				gtrdot: '\u22D7',
				gtreqless: '\u22DB',
				gtreqqless: '\u2A8C',
				gtrless: '\u2277',
				gtrsim: '\u2273',
				gvertneqq: '\u2269\uFE00',
				gvnE: '\u2269\uFE00',
				Hacek: '\u02C7',
				hairsp: '\u200A',
				half: '\u00BD',
				hamilt: '\u210B',
				HARDcy: '\u042A',
				hardcy: '\u044A',
				hArr: '\u21D4',
				harr: '\u2194',
				harrcir: '\u2948',
				harrw: '\u21AD',
				Hat: '\u005E',
				hbar: '\u210F',
				Hcirc: '\u0124',
				hcirc: '\u0125',
				hearts: '\u2665',
				heartsuit: '\u2665',
				hellip: '\u2026',
				hercon: '\u22B9',
				Hfr: '\u210C',
				hfr: '\uD835\uDD25',
				HilbertSpace: '\u210B',
				hksearow: '\u2925',
				hkswarow: '\u2926',
				hoarr: '\u21FF',
				homtht: '\u223B',
				hookleftarrow: '\u21A9',
				hookrightarrow: '\u21AA',
				Hopf: '\u210D',
				hopf: '\uD835\uDD59',
				horbar: '\u2015',
				HorizontalLine: '\u2500',
				Hscr: '\u210B',
				hscr: '\uD835\uDCBD',
				hslash: '\u210F',
				Hstrok: '\u0126',
				hstrok: '\u0127',
				HumpDownHump: '\u224E',
				HumpEqual: '\u224F',
				hybull: '\u2043',
				hyphen: '\u2010',
				Iacute: '\u00CD',
				iacute: '\u00ED',
				ic: '\u2063',
				Icirc: '\u00CE',
				icirc: '\u00EE',
				Icy: '\u0418',
				icy: '\u0438',
				Idot: '\u0130',
				IEcy: '\u0415',
				iecy: '\u0435',
				iexcl: '\u00A1',
				iff: '\u21D4',
				Ifr: '\u2111',
				ifr: '\uD835\uDD26',
				Igrave: '\u00CC',
				igrave: '\u00EC',
				ii: '\u2148',
				iiiint: '\u2A0C',
				iiint: '\u222D',
				iinfin: '\u29DC',
				iiota: '\u2129',
				IJlig: '\u0132',
				ijlig: '\u0133',
				Im: '\u2111',
				Imacr: '\u012A',
				imacr: '\u012B',
				image: '\u2111',
				ImaginaryI: '\u2148',
				imagline: '\u2110',
				imagpart: '\u2111',
				imath: '\u0131',
				imof: '\u22B7',
				imped: '\u01B5',
				Implies: '\u21D2',
				in: '\u2208',
				incare: '\u2105',
				infin: '\u221E',
				infintie: '\u29DD',
				inodot: '\u0131',
				Int: '\u222C',
				int: '\u222B',
				intcal: '\u22BA',
				integers: '\u2124',
				Integral: '\u222B',
				intercal: '\u22BA',
				Intersection: '\u22C2',
				intlarhk: '\u2A17',
				intprod: '\u2A3C',
				InvisibleComma: '\u2063',
				InvisibleTimes: '\u2062',
				IOcy: '\u0401',
				iocy: '\u0451',
				Iogon: '\u012E',
				iogon: '\u012F',
				Iopf: '\uD835\uDD40',
				iopf: '\uD835\uDD5A',
				Iota: '\u0399',
				iota: '\u03B9',
				iprod: '\u2A3C',
				iquest: '\u00BF',
				Iscr: '\u2110',
				iscr: '\uD835\uDCBE',
				isin: '\u2208',
				isindot: '\u22F5',
				isinE: '\u22F9',
				isins: '\u22F4',
				isinsv: '\u22F3',
				isinv: '\u2208',
				it: '\u2062',
				Itilde: '\u0128',
				itilde: '\u0129',
				Iukcy: '\u0406',
				iukcy: '\u0456',
				Iuml: '\u00CF',
				iuml: '\u00EF',
				Jcirc: '\u0134',
				jcirc: '\u0135',
				Jcy: '\u0419',
				jcy: '\u0439',
				Jfr: '\uD835\uDD0D',
				jfr: '\uD835\uDD27',
				jmath: '\u0237',
				Jopf: '\uD835\uDD41',
				jopf: '\uD835\uDD5B',
				Jscr: '\uD835\uDCA5',
				jscr: '\uD835\uDCBF',
				Jsercy: '\u0408',
				jsercy: '\u0458',
				Jukcy: '\u0404',
				jukcy: '\u0454',
				Kappa: '\u039A',
				kappa: '\u03BA',
				kappav: '\u03F0',
				Kcedil: '\u0136',
				kcedil: '\u0137',
				Kcy: '\u041A',
				kcy: '\u043A',
				Kfr: '\uD835\uDD0E',
				kfr: '\uD835\uDD28',
				kgreen: '\u0138',
				KHcy: '\u0425',
				khcy: '\u0445',
				KJcy: '\u040C',
				kjcy: '\u045C',
				Kopf: '\uD835\uDD42',
				kopf: '\uD835\uDD5C',
				Kscr: '\uD835\uDCA6',
				kscr: '\uD835\uDCC0',
				lAarr: '\u21DA',
				Lacute: '\u0139',
				lacute: '\u013A',
				laemptyv: '\u29B4',
				lagran: '\u2112',
				Lambda: '\u039B',
				lambda: '\u03BB',
				Lang: '\u27EA',
				lang: '\u27E8',
				langd: '\u2991',
				langle: '\u27E8',
				lap: '\u2A85',
				Laplacetrf: '\u2112',
				laquo: '\u00AB',
				Larr: '\u219E',
				lArr: '\u21D0',
				larr: '\u2190',
				larrb: '\u21E4',
				larrbfs: '\u291F',
				larrfs: '\u291D',
				larrhk: '\u21A9',
				larrlp: '\u21AB',
				larrpl: '\u2939',
				larrsim: '\u2973',
				larrtl: '\u21A2',
				lat: '\u2AAB',
				lAtail: '\u291B',
				latail: '\u2919',
				late: '\u2AAD',
				lates: '\u2AAD\uFE00',
				lBarr: '\u290E',
				lbarr: '\u290C',
				lbbrk: '\u2772',
				lbrace: '\u007B',
				lbrack: '\u005B',
				lbrke: '\u298B',
				lbrksld: '\u298F',
				lbrkslu: '\u298D',
				Lcaron: '\u013D',
				lcaron: '\u013E',
				Lcedil: '\u013B',
				lcedil: '\u013C',
				lceil: '\u2308',
				lcub: '\u007B',
				Lcy: '\u041B',
				lcy: '\u043B',
				ldca: '\u2936',
				ldquo: '\u201C',
				ldquor: '\u201E',
				ldrdhar: '\u2967',
				ldrushar: '\u294B',
				ldsh: '\u21B2',
				lE: '\u2266',
				le: '\u2264',
				LeftAngleBracket: '\u27E8',
				LeftArrow: '\u2190',
				Leftarrow: '\u21D0',
				leftarrow: '\u2190',
				LeftArrowBar: '\u21E4',
				LeftArrowRightArrow: '\u21C6',
				leftarrowtail: '\u21A2',
				LeftCeiling: '\u2308',
				LeftDoubleBracket: '\u27E6',
				LeftDownTeeVector: '\u2961',
				LeftDownVector: '\u21C3',
				LeftDownVectorBar: '\u2959',
				LeftFloor: '\u230A',
				leftharpoondown: '\u21BD',
				leftharpoonup: '\u21BC',
				leftleftarrows: '\u21C7',
				LeftRightArrow: '\u2194',
				Leftrightarrow: '\u21D4',
				leftrightarrow: '\u2194',
				leftrightarrows: '\u21C6',
				leftrightharpoons: '\u21CB',
				leftrightsquigarrow: '\u21AD',
				LeftRightVector: '\u294E',
				LeftTee: '\u22A3',
				LeftTeeArrow: '\u21A4',
				LeftTeeVector: '\u295A',
				leftthreetimes: '\u22CB',
				LeftTriangle: '\u22B2',
				LeftTriangleBar: '\u29CF',
				LeftTriangleEqual: '\u22B4',
				LeftUpDownVector: '\u2951',
				LeftUpTeeVector: '\u2960',
				LeftUpVector: '\u21BF',
				LeftUpVectorBar: '\u2958',
				LeftVector: '\u21BC',
				LeftVectorBar: '\u2952',
				lEg: '\u2A8B',
				leg: '\u22DA',
				leq: '\u2264',
				leqq: '\u2266',
				leqslant: '\u2A7D',
				les: '\u2A7D',
				lescc: '\u2AA8',
				lesdot: '\u2A7F',
				lesdoto: '\u2A81',
				lesdotor: '\u2A83',
				lesg: '\u22DA\uFE00',
				lesges: '\u2A93',
				lessapprox: '\u2A85',
				lessdot: '\u22D6',
				lesseqgtr: '\u22DA',
				lesseqqgtr: '\u2A8B',
				LessEqualGreater: '\u22DA',
				LessFullEqual: '\u2266',
				LessGreater: '\u2276',
				lessgtr: '\u2276',
				LessLess: '\u2AA1',
				lesssim: '\u2272',
				LessSlantEqual: '\u2A7D',
				LessTilde: '\u2272',
				lfisht: '\u297C',
				lfloor: '\u230A',
				Lfr: '\uD835\uDD0F',
				lfr: '\uD835\uDD29',
				lg: '\u2276',
				lgE: '\u2A91',
				lHar: '\u2962',
				lhard: '\u21BD',
				lharu: '\u21BC',
				lharul: '\u296A',
				lhblk: '\u2584',
				LJcy: '\u0409',
				ljcy: '\u0459',
				Ll: '\u22D8',
				ll: '\u226A',
				llarr: '\u21C7',
				llcorner: '\u231E',
				Lleftarrow: '\u21DA',
				llhard: '\u296B',
				lltri: '\u25FA',
				Lmidot: '\u013F',
				lmidot: '\u0140',
				lmoust: '\u23B0',
				lmoustache: '\u23B0',
				lnap: '\u2A89',
				lnapprox: '\u2A89',
				lnE: '\u2268',
				lne: '\u2A87',
				lneq: '\u2A87',
				lneqq: '\u2268',
				lnsim: '\u22E6',
				loang: '\u27EC',
				loarr: '\u21FD',
				lobrk: '\u27E6',
				LongLeftArrow: '\u27F5',
				Longleftarrow: '\u27F8',
				longleftarrow: '\u27F5',
				LongLeftRightArrow: '\u27F7',
				Longleftrightarrow: '\u27FA',
				longleftrightarrow: '\u27F7',
				longmapsto: '\u27FC',
				LongRightArrow: '\u27F6',
				Longrightarrow: '\u27F9',
				longrightarrow: '\u27F6',
				looparrowleft: '\u21AB',
				looparrowright: '\u21AC',
				lopar: '\u2985',
				Lopf: '\uD835\uDD43',
				lopf: '\uD835\uDD5D',
				loplus: '\u2A2D',
				lotimes: '\u2A34',
				lowast: '\u2217',
				lowbar: '\u005F',
				LowerLeftArrow: '\u2199',
				LowerRightArrow: '\u2198',
				loz: '\u25CA',
				lozenge: '\u25CA',
				lozf: '\u29EB',
				lpar: '\u0028',
				lparlt: '\u2993',
				lrarr: '\u21C6',
				lrcorner: '\u231F',
				lrhar: '\u21CB',
				lrhard: '\u296D',
				lrm: '\u200E',
				lrtri: '\u22BF',
				lsaquo: '\u2039',
				Lscr: '\u2112',
				lscr: '\uD835\uDCC1',
				Lsh: '\u21B0',
				lsh: '\u21B0',
				lsim: '\u2272',
				lsime: '\u2A8D',
				lsimg: '\u2A8F',
				lsqb: '\u005B',
				lsquo: '\u2018',
				lsquor: '\u201A',
				Lstrok: '\u0141',
				lstrok: '\u0142',
				Lt: '\u226A',
				LT: '\u003C',
				lt: '\u003C',
				ltcc: '\u2AA6',
				ltcir: '\u2A79',
				ltdot: '\u22D6',
				lthree: '\u22CB',
				ltimes: '\u22C9',
				ltlarr: '\u2976',
				ltquest: '\u2A7B',
				ltri: '\u25C3',
				ltrie: '\u22B4',
				ltrif: '\u25C2',
				ltrPar: '\u2996',
				lurdshar: '\u294A',
				luruhar: '\u2966',
				lvertneqq: '\u2268\uFE00',
				lvnE: '\u2268\uFE00',
				macr: '\u00AF',
				male: '\u2642',
				malt: '\u2720',
				maltese: '\u2720',
				Map: '\u2905',
				map: '\u21A6',
				mapsto: '\u21A6',
				mapstodown: '\u21A7',
				mapstoleft: '\u21A4',
				mapstoup: '\u21A5',
				marker: '\u25AE',
				mcomma: '\u2A29',
				Mcy: '\u041C',
				mcy: '\u043C',
				mdash: '\u2014',
				mDDot: '\u223A',
				measuredangle: '\u2221',
				MediumSpace: '\u205F',
				Mellintrf: '\u2133',
				Mfr: '\uD835\uDD10',
				mfr: '\uD835\uDD2A',
				mho: '\u2127',
				micro: '\u00B5',
				mid: '\u2223',
				midast: '\u002A',
				midcir: '\u2AF0',
				middot: '\u00B7',
				minus: '\u2212',
				minusb: '\u229F',
				minusd: '\u2238',
				minusdu: '\u2A2A',
				MinusPlus: '\u2213',
				mlcp: '\u2ADB',
				mldr: '\u2026',
				mnplus: '\u2213',
				models: '\u22A7',
				Mopf: '\uD835\uDD44',
				mopf: '\uD835\uDD5E',
				mp: '\u2213',
				Mscr: '\u2133',
				mscr: '\uD835\uDCC2',
				mstpos: '\u223E',
				Mu: '\u039C',
				mu: '\u03BC',
				multimap: '\u22B8',
				mumap: '\u22B8',
				nabla: '\u2207',
				Nacute: '\u0143',
				nacute: '\u0144',
				nang: '\u2220\u20D2',
				nap: '\u2249',
				napE: '\u2A70\u0338',
				napid: '\u224B\u0338',
				napos: '\u0149',
				napprox: '\u2249',
				natur: '\u266E',
				natural: '\u266E',
				naturals: '\u2115',
				nbsp: '\u00A0',
				nbump: '\u224E\u0338',
				nbumpe: '\u224F\u0338',
				ncap: '\u2A43',
				Ncaron: '\u0147',
				ncaron: '\u0148',
				Ncedil: '\u0145',
				ncedil: '\u0146',
				ncong: '\u2247',
				ncongdot: '\u2A6D\u0338',
				ncup: '\u2A42',
				Ncy: '\u041D',
				ncy: '\u043D',
				ndash: '\u2013',
				ne: '\u2260',
				nearhk: '\u2924',
				neArr: '\u21D7',
				nearr: '\u2197',
				nearrow: '\u2197',
				nedot: '\u2250\u0338',
				NegativeMediumSpace: '\u200B',
				NegativeThickSpace: '\u200B',
				NegativeThinSpace: '\u200B',
				NegativeVeryThinSpace: '\u200B',
				nequiv: '\u2262',
				nesear: '\u2928',
				nesim: '\u2242\u0338',
				NestedGreaterGreater: '\u226B',
				NestedLessLess: '\u226A',
				NewLine: '\u000A',
				nexist: '\u2204',
				nexists: '\u2204',
				Nfr: '\uD835\uDD11',
				nfr: '\uD835\uDD2B',
				ngE: '\u2267\u0338',
				nge: '\u2271',
				ngeq: '\u2271',
				ngeqq: '\u2267\u0338',
				ngeqslant: '\u2A7E\u0338',
				nges: '\u2A7E\u0338',
				nGg: '\u22D9\u0338',
				ngsim: '\u2275',
				nGt: '\u226B\u20D2',
				ngt: '\u226F',
				ngtr: '\u226F',
				nGtv: '\u226B\u0338',
				nhArr: '\u21CE',
				nharr: '\u21AE',
				nhpar: '\u2AF2',
				ni: '\u220B',
				nis: '\u22FC',
				nisd: '\u22FA',
				niv: '\u220B',
				NJcy: '\u040A',
				njcy: '\u045A',
				nlArr: '\u21CD',
				nlarr: '\u219A',
				nldr: '\u2025',
				nlE: '\u2266\u0338',
				nle: '\u2270',
				nLeftarrow: '\u21CD',
				nleftarrow: '\u219A',
				nLeftrightarrow: '\u21CE',
				nleftrightarrow: '\u21AE',
				nleq: '\u2270',
				nleqq: '\u2266\u0338',
				nleqslant: '\u2A7D\u0338',
				nles: '\u2A7D\u0338',
				nless: '\u226E',
				nLl: '\u22D8\u0338',
				nlsim: '\u2274',
				nLt: '\u226A\u20D2',
				nlt: '\u226E',
				nltri: '\u22EA',
				nltrie: '\u22EC',
				nLtv: '\u226A\u0338',
				nmid: '\u2224',
				NoBreak: '\u2060',
				NonBreakingSpace: '\u00A0',
				Nopf: '\u2115',
				nopf: '\uD835\uDD5F',
				Not: '\u2AEC',
				not: '\u00AC',
				NotCongruent: '\u2262',
				NotCupCap: '\u226D',
				NotDoubleVerticalBar: '\u2226',
				NotElement: '\u2209',
				NotEqual: '\u2260',
				NotEqualTilde: '\u2242\u0338',
				NotExists: '\u2204',
				NotGreater: '\u226F',
				NotGreaterEqual: '\u2271',
				NotGreaterFullEqual: '\u2267\u0338',
				NotGreaterGreater: '\u226B\u0338',
				NotGreaterLess: '\u2279',
				NotGreaterSlantEqual: '\u2A7E\u0338',
				NotGreaterTilde: '\u2275',
				NotHumpDownHump: '\u224E\u0338',
				NotHumpEqual: '\u224F\u0338',
				notin: '\u2209',
				notindot: '\u22F5\u0338',
				notinE: '\u22F9\u0338',
				notinva: '\u2209',
				notinvb: '\u22F7',
				notinvc: '\u22F6',
				NotLeftTriangle: '\u22EA',
				NotLeftTriangleBar: '\u29CF\u0338',
				NotLeftTriangleEqual: '\u22EC',
				NotLess: '\u226E',
				NotLessEqual: '\u2270',
				NotLessGreater: '\u2278',
				NotLessLess: '\u226A\u0338',
				NotLessSlantEqual: '\u2A7D\u0338',
				NotLessTilde: '\u2274',
				NotNestedGreaterGreater: '\u2AA2\u0338',
				NotNestedLessLess: '\u2AA1\u0338',
				notni: '\u220C',
				notniva: '\u220C',
				notnivb: '\u22FE',
				notnivc: '\u22FD',
				NotPrecedes: '\u2280',
				NotPrecedesEqual: '\u2AAF\u0338',
				NotPrecedesSlantEqual: '\u22E0',
				NotReverseElement: '\u220C',
				NotRightTriangle: '\u22EB',
				NotRightTriangleBar: '\u29D0\u0338',
				NotRightTriangleEqual: '\u22ED',
				NotSquareSubset: '\u228F\u0338',
				NotSquareSubsetEqual: '\u22E2',
				NotSquareSuperset: '\u2290\u0338',
				NotSquareSupersetEqual: '\u22E3',
				NotSubset: '\u2282\u20D2',
				NotSubsetEqual: '\u2288',
				NotSucceeds: '\u2281',
				NotSucceedsEqual: '\u2AB0\u0338',
				NotSucceedsSlantEqual: '\u22E1',
				NotSucceedsTilde: '\u227F\u0338',
				NotSuperset: '\u2283\u20D2',
				NotSupersetEqual: '\u2289',
				NotTilde: '\u2241',
				NotTildeEqual: '\u2244',
				NotTildeFullEqual: '\u2247',
				NotTildeTilde: '\u2249',
				NotVerticalBar: '\u2224',
				npar: '\u2226',
				nparallel: '\u2226',
				nparsl: '\u2AFD\u20E5',
				npart: '\u2202\u0338',
				npolint: '\u2A14',
				npr: '\u2280',
				nprcue: '\u22E0',
				npre: '\u2AAF\u0338',
				nprec: '\u2280',
				npreceq: '\u2AAF\u0338',
				nrArr: '\u21CF',
				nrarr: '\u219B',
				nrarrc: '\u2933\u0338',
				nrarrw: '\u219D\u0338',
				nRightarrow: '\u21CF',
				nrightarrow: '\u219B',
				nrtri: '\u22EB',
				nrtrie: '\u22ED',
				nsc: '\u2281',
				nsccue: '\u22E1',
				nsce: '\u2AB0\u0338',
				Nscr: '\uD835\uDCA9',
				nscr: '\uD835\uDCC3',
				nshortmid: '\u2224',
				nshortparallel: '\u2226',
				nsim: '\u2241',
				nsime: '\u2244',
				nsimeq: '\u2244',
				nsmid: '\u2224',
				nspar: '\u2226',
				nsqsube: '\u22E2',
				nsqsupe: '\u22E3',
				nsub: '\u2284',
				nsubE: '\u2AC5\u0338',
				nsube: '\u2288',
				nsubset: '\u2282\u20D2',
				nsubseteq: '\u2288',
				nsubseteqq: '\u2AC5\u0338',
				nsucc: '\u2281',
				nsucceq: '\u2AB0\u0338',
				nsup: '\u2285',
				nsupE: '\u2AC6\u0338',
				nsupe: '\u2289',
				nsupset: '\u2283\u20D2',
				nsupseteq: '\u2289',
				nsupseteqq: '\u2AC6\u0338',
				ntgl: '\u2279',
				Ntilde: '\u00D1',
				ntilde: '\u00F1',
				ntlg: '\u2278',
				ntriangleleft: '\u22EA',
				ntrianglelefteq: '\u22EC',
				ntriangleright: '\u22EB',
				ntrianglerighteq: '\u22ED',
				Nu: '\u039D',
				nu: '\u03BD',
				num: '\u0023',
				numero: '\u2116',
				numsp: '\u2007',
				nvap: '\u224D\u20D2',
				nVDash: '\u22AF',
				nVdash: '\u22AE',
				nvDash: '\u22AD',
				nvdash: '\u22AC',
				nvge: '\u2265\u20D2',
				nvgt: '\u003E\u20D2',
				nvHarr: '\u2904',
				nvinfin: '\u29DE',
				nvlArr: '\u2902',
				nvle: '\u2264\u20D2',
				nvlt: '\u003C\u20D2',
				nvltrie: '\u22B4\u20D2',
				nvrArr: '\u2903',
				nvrtrie: '\u22B5\u20D2',
				nvsim: '\u223C\u20D2',
				nwarhk: '\u2923',
				nwArr: '\u21D6',
				nwarr: '\u2196',
				nwarrow: '\u2196',
				nwnear: '\u2927',
				Oacute: '\u00D3',
				oacute: '\u00F3',
				oast: '\u229B',
				ocir: '\u229A',
				Ocirc: '\u00D4',
				ocirc: '\u00F4',
				Ocy: '\u041E',
				ocy: '\u043E',
				odash: '\u229D',
				Odblac: '\u0150',
				odblac: '\u0151',
				odiv: '\u2A38',
				odot: '\u2299',
				odsold: '\u29BC',
				OElig: '\u0152',
				oelig: '\u0153',
				ofcir: '\u29BF',
				Ofr: '\uD835\uDD12',
				ofr: '\uD835\uDD2C',
				ogon: '\u02DB',
				Ograve: '\u00D2',
				ograve: '\u00F2',
				ogt: '\u29C1',
				ohbar: '\u29B5',
				ohm: '\u03A9',
				oint: '\u222E',
				olarr: '\u21BA',
				olcir: '\u29BE',
				olcross: '\u29BB',
				oline: '\u203E',
				olt: '\u29C0',
				Omacr: '\u014C',
				omacr: '\u014D',
				Omega: '\u03A9',
				omega: '\u03C9',
				Omicron: '\u039F',
				omicron: '\u03BF',
				omid: '\u29B6',
				ominus: '\u2296',
				Oopf: '\uD835\uDD46',
				oopf: '\uD835\uDD60',
				opar: '\u29B7',
				OpenCurlyDoubleQuote: '\u201C',
				OpenCurlyQuote: '\u2018',
				operp: '\u29B9',
				oplus: '\u2295',
				Or: '\u2A54',
				or: '\u2228',
				orarr: '\u21BB',
				ord: '\u2A5D',
				order: '\u2134',
				orderof: '\u2134',
				ordf: '\u00AA',
				ordm: '\u00BA',
				origof: '\u22B6',
				oror: '\u2A56',
				orslope: '\u2A57',
				orv: '\u2A5B',
				oS: '\u24C8',
				Oscr: '\uD835\uDCAA',
				oscr: '\u2134',
				Oslash: '\u00D8',
				oslash: '\u00F8',
				osol: '\u2298',
				Otilde: '\u00D5',
				otilde: '\u00F5',
				Otimes: '\u2A37',
				otimes: '\u2297',
				otimesas: '\u2A36',
				Ouml: '\u00D6',
				ouml: '\u00F6',
				ovbar: '\u233D',
				OverBar: '\u203E',
				OverBrace: '\u23DE',
				OverBracket: '\u23B4',
				OverParenthesis: '\u23DC',
				par: '\u2225',
				para: '\u00B6',
				parallel: '\u2225',
				parsim: '\u2AF3',
				parsl: '\u2AFD',
				part: '\u2202',
				PartialD: '\u2202',
				Pcy: '\u041F',
				pcy: '\u043F',
				percnt: '\u0025',
				period: '\u002E',
				permil: '\u2030',
				perp: '\u22A5',
				pertenk: '\u2031',
				Pfr: '\uD835\uDD13',
				pfr: '\uD835\uDD2D',
				Phi: '\u03A6',
				phi: '\u03C6',
				phiv: '\u03D5',
				phmmat: '\u2133',
				phone: '\u260E',
				Pi: '\u03A0',
				pi: '\u03C0',
				pitchfork: '\u22D4',
				piv: '\u03D6',
				planck: '\u210F',
				planckh: '\u210E',
				plankv: '\u210F',
				plus: '\u002B',
				plusacir: '\u2A23',
				plusb: '\u229E',
				pluscir: '\u2A22',
				plusdo: '\u2214',
				plusdu: '\u2A25',
				pluse: '\u2A72',
				PlusMinus: '\u00B1',
				plusmn: '\u00B1',
				plussim: '\u2A26',
				plustwo: '\u2A27',
				pm: '\u00B1',
				Poincareplane: '\u210C',
				pointint: '\u2A15',
				Popf: '\u2119',
				popf: '\uD835\uDD61',
				pound: '\u00A3',
				Pr: '\u2ABB',
				pr: '\u227A',
				prap: '\u2AB7',
				prcue: '\u227C',
				prE: '\u2AB3',
				pre: '\u2AAF',
				prec: '\u227A',
				precapprox: '\u2AB7',
				preccurlyeq: '\u227C',
				Precedes: '\u227A',
				PrecedesEqual: '\u2AAF',
				PrecedesSlantEqual: '\u227C',
				PrecedesTilde: '\u227E',
				preceq: '\u2AAF',
				precnapprox: '\u2AB9',
				precneqq: '\u2AB5',
				precnsim: '\u22E8',
				precsim: '\u227E',
				Prime: '\u2033',
				prime: '\u2032',
				primes: '\u2119',
				prnap: '\u2AB9',
				prnE: '\u2AB5',
				prnsim: '\u22E8',
				prod: '\u220F',
				Product: '\u220F',
				profalar: '\u232E',
				profline: '\u2312',
				profsurf: '\u2313',
				prop: '\u221D',
				Proportion: '\u2237',
				Proportional: '\u221D',
				propto: '\u221D',
				prsim: '\u227E',
				prurel: '\u22B0',
				Pscr: '\uD835\uDCAB',
				pscr: '\uD835\uDCC5',
				Psi: '\u03A8',
				psi: '\u03C8',
				puncsp: '\u2008',
				Qfr: '\uD835\uDD14',
				qfr: '\uD835\uDD2E',
				qint: '\u2A0C',
				Qopf: '\u211A',
				qopf: '\uD835\uDD62',
				qprime: '\u2057',
				Qscr: '\uD835\uDCAC',
				qscr: '\uD835\uDCC6',
				quaternions: '\u210D',
				quatint: '\u2A16',
				quest: '\u003F',
				questeq: '\u225F',
				QUOT: '\u0022',
				quot: '\u0022',
				rAarr: '\u21DB',
				race: '\u223D\u0331',
				Racute: '\u0154',
				racute: '\u0155',
				radic: '\u221A',
				raemptyv: '\u29B3',
				Rang: '\u27EB',
				rang: '\u27E9',
				rangd: '\u2992',
				range: '\u29A5',
				rangle: '\u27E9',
				raquo: '\u00BB',
				Rarr: '\u21A0',
				rArr: '\u21D2',
				rarr: '\u2192',
				rarrap: '\u2975',
				rarrb: '\u21E5',
				rarrbfs: '\u2920',
				rarrc: '\u2933',
				rarrfs: '\u291E',
				rarrhk: '\u21AA',
				rarrlp: '\u21AC',
				rarrpl: '\u2945',
				rarrsim: '\u2974',
				Rarrtl: '\u2916',
				rarrtl: '\u21A3',
				rarrw: '\u219D',
				rAtail: '\u291C',
				ratail: '\u291A',
				ratio: '\u2236',
				rationals: '\u211A',
				RBarr: '\u2910',
				rBarr: '\u290F',
				rbarr: '\u290D',
				rbbrk: '\u2773',
				rbrace: '\u007D',
				rbrack: '\u005D',
				rbrke: '\u298C',
				rbrksld: '\u298E',
				rbrkslu: '\u2990',
				Rcaron: '\u0158',
				rcaron: '\u0159',
				Rcedil: '\u0156',
				rcedil: '\u0157',
				rceil: '\u2309',
				rcub: '\u007D',
				Rcy: '\u0420',
				rcy: '\u0440',
				rdca: '\u2937',
				rdldhar: '\u2969',
				rdquo: '\u201D',
				rdquor: '\u201D',
				rdsh: '\u21B3',
				Re: '\u211C',
				real: '\u211C',
				realine: '\u211B',
				realpart: '\u211C',
				reals: '\u211D',
				rect: '\u25AD',
				REG: '\u00AE',
				reg: '\u00AE',
				ReverseElement: '\u220B',
				ReverseEquilibrium: '\u21CB',
				ReverseUpEquilibrium: '\u296F',
				rfisht: '\u297D',
				rfloor: '\u230B',
				Rfr: '\u211C',
				rfr: '\uD835\uDD2F',
				rHar: '\u2964',
				rhard: '\u21C1',
				rharu: '\u21C0',
				rharul: '\u296C',
				Rho: '\u03A1',
				rho: '\u03C1',
				rhov: '\u03F1',
				RightAngleBracket: '\u27E9',
				RightArrow: '\u2192',
				Rightarrow: '\u21D2',
				rightarrow: '\u2192',
				RightArrowBar: '\u21E5',
				RightArrowLeftArrow: '\u21C4',
				rightarrowtail: '\u21A3',
				RightCeiling: '\u2309',
				RightDoubleBracket: '\u27E7',
				RightDownTeeVector: '\u295D',
				RightDownVector: '\u21C2',
				RightDownVectorBar: '\u2955',
				RightFloor: '\u230B',
				rightharpoondown: '\u21C1',
				rightharpoonup: '\u21C0',
				rightleftarrows: '\u21C4',
				rightleftharpoons: '\u21CC',
				rightrightarrows: '\u21C9',
				rightsquigarrow: '\u219D',
				RightTee: '\u22A2',
				RightTeeArrow: '\u21A6',
				RightTeeVector: '\u295B',
				rightthreetimes: '\u22CC',
				RightTriangle: '\u22B3',
				RightTriangleBar: '\u29D0',
				RightTriangleEqual: '\u22B5',
				RightUpDownVector: '\u294F',
				RightUpTeeVector: '\u295C',
				RightUpVector: '\u21BE',
				RightUpVectorBar: '\u2954',
				RightVector: '\u21C0',
				RightVectorBar: '\u2953',
				ring: '\u02DA',
				risingdotseq: '\u2253',
				rlarr: '\u21C4',
				rlhar: '\u21CC',
				rlm: '\u200F',
				rmoust: '\u23B1',
				rmoustache: '\u23B1',
				rnmid: '\u2AEE',
				roang: '\u27ED',
				roarr: '\u21FE',
				robrk: '\u27E7',
				ropar: '\u2986',
				Ropf: '\u211D',
				ropf: '\uD835\uDD63',
				roplus: '\u2A2E',
				rotimes: '\u2A35',
				RoundImplies: '\u2970',
				rpar: '\u0029',
				rpargt: '\u2994',
				rppolint: '\u2A12',
				rrarr: '\u21C9',
				Rrightarrow: '\u21DB',
				rsaquo: '\u203A',
				Rscr: '\u211B',
				rscr: '\uD835\uDCC7',
				Rsh: '\u21B1',
				rsh: '\u21B1',
				rsqb: '\u005D',
				rsquo: '\u2019',
				rsquor: '\u2019',
				rthree: '\u22CC',
				rtimes: '\u22CA',
				rtri: '\u25B9',
				rtrie: '\u22B5',
				rtrif: '\u25B8',
				rtriltri: '\u29CE',
				RuleDelayed: '\u29F4',
				ruluhar: '\u2968',
				rx: '\u211E',
				Sacute: '\u015A',
				sacute: '\u015B',
				sbquo: '\u201A',
				Sc: '\u2ABC',
				sc: '\u227B',
				scap: '\u2AB8',
				Scaron: '\u0160',
				scaron: '\u0161',
				sccue: '\u227D',
				scE: '\u2AB4',
				sce: '\u2AB0',
				Scedil: '\u015E',
				scedil: '\u015F',
				Scirc: '\u015C',
				scirc: '\u015D',
				scnap: '\u2ABA',
				scnE: '\u2AB6',
				scnsim: '\u22E9',
				scpolint: '\u2A13',
				scsim: '\u227F',
				Scy: '\u0421',
				scy: '\u0441',
				sdot: '\u22C5',
				sdotb: '\u22A1',
				sdote: '\u2A66',
				searhk: '\u2925',
				seArr: '\u21D8',
				searr: '\u2198',
				searrow: '\u2198',
				sect: '\u00A7',
				semi: '\u003B',
				seswar: '\u2929',
				setminus: '\u2216',
				setmn: '\u2216',
				sext: '\u2736',
				Sfr: '\uD835\uDD16',
				sfr: '\uD835\uDD30',
				sfrown: '\u2322',
				sharp: '\u266F',
				SHCHcy: '\u0429',
				shchcy: '\u0449',
				SHcy: '\u0428',
				shcy: '\u0448',
				ShortDownArrow: '\u2193',
				ShortLeftArrow: '\u2190',
				shortmid: '\u2223',
				shortparallel: '\u2225',
				ShortRightArrow: '\u2192',
				ShortUpArrow: '\u2191',
				shy: '\u00AD',
				Sigma: '\u03A3',
				sigma: '\u03C3',
				sigmaf: '\u03C2',
				sigmav: '\u03C2',
				sim: '\u223C',
				simdot: '\u2A6A',
				sime: '\u2243',
				simeq: '\u2243',
				simg: '\u2A9E',
				simgE: '\u2AA0',
				siml: '\u2A9D',
				simlE: '\u2A9F',
				simne: '\u2246',
				simplus: '\u2A24',
				simrarr: '\u2972',
				slarr: '\u2190',
				SmallCircle: '\u2218',
				smallsetminus: '\u2216',
				smashp: '\u2A33',
				smeparsl: '\u29E4',
				smid: '\u2223',
				smile: '\u2323',
				smt: '\u2AAA',
				smte: '\u2AAC',
				smtes: '\u2AAC\uFE00',
				SOFTcy: '\u042C',
				softcy: '\u044C',
				sol: '\u002F',
				solb: '\u29C4',
				solbar: '\u233F',
				Sopf: '\uD835\uDD4A',
				sopf: '\uD835\uDD64',
				spades: '\u2660',
				spadesuit: '\u2660',
				spar: '\u2225',
				sqcap: '\u2293',
				sqcaps: '\u2293\uFE00',
				sqcup: '\u2294',
				sqcups: '\u2294\uFE00',
				Sqrt: '\u221A',
				sqsub: '\u228F',
				sqsube: '\u2291',
				sqsubset: '\u228F',
				sqsubseteq: '\u2291',
				sqsup: '\u2290',
				sqsupe: '\u2292',
				sqsupset: '\u2290',
				sqsupseteq: '\u2292',
				squ: '\u25A1',
				Square: '\u25A1',
				square: '\u25A1',
				SquareIntersection: '\u2293',
				SquareSubset: '\u228F',
				SquareSubsetEqual: '\u2291',
				SquareSuperset: '\u2290',
				SquareSupersetEqual: '\u2292',
				SquareUnion: '\u2294',
				squarf: '\u25AA',
				squf: '\u25AA',
				srarr: '\u2192',
				Sscr: '\uD835\uDCAE',
				sscr: '\uD835\uDCC8',
				ssetmn: '\u2216',
				ssmile: '\u2323',
				sstarf: '\u22C6',
				Star: '\u22C6',
				star: '\u2606',
				starf: '\u2605',
				straightepsilon: '\u03F5',
				straightphi: '\u03D5',
				strns: '\u00AF',
				Sub: '\u22D0',
				sub: '\u2282',
				subdot: '\u2ABD',
				subE: '\u2AC5',
				sube: '\u2286',
				subedot: '\u2AC3',
				submult: '\u2AC1',
				subnE: '\u2ACB',
				subne: '\u228A',
				subplus: '\u2ABF',
				subrarr: '\u2979',
				Subset: '\u22D0',
				subset: '\u2282',
				subseteq: '\u2286',
				subseteqq: '\u2AC5',
				SubsetEqual: '\u2286',
				subsetneq: '\u228A',
				subsetneqq: '\u2ACB',
				subsim: '\u2AC7',
				subsub: '\u2AD5',
				subsup: '\u2AD3',
				succ: '\u227B',
				succapprox: '\u2AB8',
				succcurlyeq: '\u227D',
				Succeeds: '\u227B',
				SucceedsEqual: '\u2AB0',
				SucceedsSlantEqual: '\u227D',
				SucceedsTilde: '\u227F',
				succeq: '\u2AB0',
				succnapprox: '\u2ABA',
				succneqq: '\u2AB6',
				succnsim: '\u22E9',
				succsim: '\u227F',
				SuchThat: '\u220B',
				Sum: '\u2211',
				sum: '\u2211',
				sung: '\u266A',
				Sup: '\u22D1',
				sup: '\u2283',
				sup1: '\u00B9',
				sup2: '\u00B2',
				sup3: '\u00B3',
				supdot: '\u2ABE',
				supdsub: '\u2AD8',
				supE: '\u2AC6',
				supe: '\u2287',
				supedot: '\u2AC4',
				Superset: '\u2283',
				SupersetEqual: '\u2287',
				suphsol: '\u27C9',
				suphsub: '\u2AD7',
				suplarr: '\u297B',
				supmult: '\u2AC2',
				supnE: '\u2ACC',
				supne: '\u228B',
				supplus: '\u2AC0',
				Supset: '\u22D1',
				supset: '\u2283',
				supseteq: '\u2287',
				supseteqq: '\u2AC6',
				supsetneq: '\u228B',
				supsetneqq: '\u2ACC',
				supsim: '\u2AC8',
				supsub: '\u2AD4',
				supsup: '\u2AD6',
				swarhk: '\u2926',
				swArr: '\u21D9',
				swarr: '\u2199',
				swarrow: '\u2199',
				swnwar: '\u292A',
				szlig: '\u00DF',
				Tab: '\u0009',
				target: '\u2316',
				Tau: '\u03A4',
				tau: '\u03C4',
				tbrk: '\u23B4',
				Tcaron: '\u0164',
				tcaron: '\u0165',
				Tcedil: '\u0162',
				tcedil: '\u0163',
				Tcy: '\u0422',
				tcy: '\u0442',
				tdot: '\u20DB',
				telrec: '\u2315',
				Tfr: '\uD835\uDD17',
				tfr: '\uD835\uDD31',
				there4: '\u2234',
				Therefore: '\u2234',
				therefore: '\u2234',
				Theta: '\u0398',
				theta: '\u03B8',
				thetasym: '\u03D1',
				thetav: '\u03D1',
				thickapprox: '\u2248',
				thicksim: '\u223C',
				ThickSpace: '\u205F\u200A',
				thinsp: '\u2009',
				ThinSpace: '\u2009',
				thkap: '\u2248',
				thksim: '\u223C',
				THORN: '\u00DE',
				thorn: '\u00FE',
				Tilde: '\u223C',
				tilde: '\u02DC',
				TildeEqual: '\u2243',
				TildeFullEqual: '\u2245',
				TildeTilde: '\u2248',
				times: '\u00D7',
				timesb: '\u22A0',
				timesbar: '\u2A31',
				timesd: '\u2A30',
				tint: '\u222D',
				toea: '\u2928',
				top: '\u22A4',
				topbot: '\u2336',
				topcir: '\u2AF1',
				Topf: '\uD835\uDD4B',
				topf: '\uD835\uDD65',
				topfork: '\u2ADA',
				tosa: '\u2929',
				tprime: '\u2034',
				TRADE: '\u2122',
				trade: '\u2122',
				triangle: '\u25B5',
				triangledown: '\u25BF',
				triangleleft: '\u25C3',
				trianglelefteq: '\u22B4',
				triangleq: '\u225C',
				triangleright: '\u25B9',
				trianglerighteq: '\u22B5',
				tridot: '\u25EC',
				trie: '\u225C',
				triminus: '\u2A3A',
				TripleDot: '\u20DB',
				triplus: '\u2A39',
				trisb: '\u29CD',
				tritime: '\u2A3B',
				trpezium: '\u23E2',
				Tscr: '\uD835\uDCAF',
				tscr: '\uD835\uDCC9',
				TScy: '\u0426',
				tscy: '\u0446',
				TSHcy: '\u040B',
				tshcy: '\u045B',
				Tstrok: '\u0166',
				tstrok: '\u0167',
				twixt: '\u226C',
				twoheadleftarrow: '\u219E',
				twoheadrightarrow: '\u21A0',
				Uacute: '\u00DA',
				uacute: '\u00FA',
				Uarr: '\u219F',
				uArr: '\u21D1',
				uarr: '\u2191',
				Uarrocir: '\u2949',
				Ubrcy: '\u040E',
				ubrcy: '\u045E',
				Ubreve: '\u016C',
				ubreve: '\u016D',
				Ucirc: '\u00DB',
				ucirc: '\u00FB',
				Ucy: '\u0423',
				ucy: '\u0443',
				udarr: '\u21C5',
				Udblac: '\u0170',
				udblac: '\u0171',
				udhar: '\u296E',
				ufisht: '\u297E',
				Ufr: '\uD835\uDD18',
				ufr: '\uD835\uDD32',
				Ugrave: '\u00D9',
				ugrave: '\u00F9',
				uHar: '\u2963',
				uharl: '\u21BF',
				uharr: '\u21BE',
				uhblk: '\u2580',
				ulcorn: '\u231C',
				ulcorner: '\u231C',
				ulcrop: '\u230F',
				ultri: '\u25F8',
				Umacr: '\u016A',
				umacr: '\u016B',
				uml: '\u00A8',
				UnderBar: '\u005F',
				UnderBrace: '\u23DF',
				UnderBracket: '\u23B5',
				UnderParenthesis: '\u23DD',
				Union: '\u22C3',
				UnionPlus: '\u228E',
				Uogon: '\u0172',
				uogon: '\u0173',
				Uopf: '\uD835\uDD4C',
				uopf: '\uD835\uDD66',
				UpArrow: '\u2191',
				Uparrow: '\u21D1',
				uparrow: '\u2191',
				UpArrowBar: '\u2912',
				UpArrowDownArrow: '\u21C5',
				UpDownArrow: '\u2195',
				Updownarrow: '\u21D5',
				updownarrow: '\u2195',
				UpEquilibrium: '\u296E',
				upharpoonleft: '\u21BF',
				upharpoonright: '\u21BE',
				uplus: '\u228E',
				UpperLeftArrow: '\u2196',
				UpperRightArrow: '\u2197',
				Upsi: '\u03D2',
				upsi: '\u03C5',
				upsih: '\u03D2',
				Upsilon: '\u03A5',
				upsilon: '\u03C5',
				UpTee: '\u22A5',
				UpTeeArrow: '\u21A5',
				upuparrows: '\u21C8',
				urcorn: '\u231D',
				urcorner: '\u231D',
				urcrop: '\u230E',
				Uring: '\u016E',
				uring: '\u016F',
				urtri: '\u25F9',
				Uscr: '\uD835\uDCB0',
				uscr: '\uD835\uDCCA',
				utdot: '\u22F0',
				Utilde: '\u0168',
				utilde: '\u0169',
				utri: '\u25B5',
				utrif: '\u25B4',
				uuarr: '\u21C8',
				Uuml: '\u00DC',
				uuml: '\u00FC',
				uwangle: '\u29A7',
				vangrt: '\u299C',
				varepsilon: '\u03F5',
				varkappa: '\u03F0',
				varnothing: '\u2205',
				varphi: '\u03D5',
				varpi: '\u03D6',
				varpropto: '\u221D',
				vArr: '\u21D5',
				varr: '\u2195',
				varrho: '\u03F1',
				varsigma: '\u03C2',
				varsubsetneq: '\u228A\uFE00',
				varsubsetneqq: '\u2ACB\uFE00',
				varsupsetneq: '\u228B\uFE00',
				varsupsetneqq: '\u2ACC\uFE00',
				vartheta: '\u03D1',
				vartriangleleft: '\u22B2',
				vartriangleright: '\u22B3',
				Vbar: '\u2AEB',
				vBar: '\u2AE8',
				vBarv: '\u2AE9',
				Vcy: '\u0412',
				vcy: '\u0432',
				VDash: '\u22AB',
				Vdash: '\u22A9',
				vDash: '\u22A8',
				vdash: '\u22A2',
				Vdashl: '\u2AE6',
				Vee: '\u22C1',
				vee: '\u2228',
				veebar: '\u22BB',
				veeeq: '\u225A',
				vellip: '\u22EE',
				Verbar: '\u2016',
				verbar: '\u007C',
				Vert: '\u2016',
				vert: '\u007C',
				VerticalBar: '\u2223',
				VerticalLine: '\u007C',
				VerticalSeparator: '\u2758',
				VerticalTilde: '\u2240',
				VeryThinSpace: '\u200A',
				Vfr: '\uD835\uDD19',
				vfr: '\uD835\uDD33',
				vltri: '\u22B2',
				vnsub: '\u2282\u20D2',
				vnsup: '\u2283\u20D2',
				Vopf: '\uD835\uDD4D',
				vopf: '\uD835\uDD67',
				vprop: '\u221D',
				vrtri: '\u22B3',
				Vscr: '\uD835\uDCB1',
				vscr: '\uD835\uDCCB',
				vsubnE: '\u2ACB\uFE00',
				vsubne: '\u228A\uFE00',
				vsupnE: '\u2ACC\uFE00',
				vsupne: '\u228B\uFE00',
				Vvdash: '\u22AA',
				vzigzag: '\u299A',
				Wcirc: '\u0174',
				wcirc: '\u0175',
				wedbar: '\u2A5F',
				Wedge: '\u22C0',
				wedge: '\u2227',
				wedgeq: '\u2259',
				weierp: '\u2118',
				Wfr: '\uD835\uDD1A',
				wfr: '\uD835\uDD34',
				Wopf: '\uD835\uDD4E',
				wopf: '\uD835\uDD68',
				wp: '\u2118',
				wr: '\u2240',
				wreath: '\u2240',
				Wscr: '\uD835\uDCB2',
				wscr: '\uD835\uDCCC',
				xcap: '\u22C2',
				xcirc: '\u25EF',
				xcup: '\u22C3',
				xdtri: '\u25BD',
				Xfr: '\uD835\uDD1B',
				xfr: '\uD835\uDD35',
				xhArr: '\u27FA',
				xharr: '\u27F7',
				Xi: '\u039E',
				xi: '\u03BE',
				xlArr: '\u27F8',
				xlarr: '\u27F5',
				xmap: '\u27FC',
				xnis: '\u22FB',
				xodot: '\u2A00',
				Xopf: '\uD835\uDD4F',
				xopf: '\uD835\uDD69',
				xoplus: '\u2A01',
				xotime: '\u2A02',
				xrArr: '\u27F9',
				xrarr: '\u27F6',
				Xscr: '\uD835\uDCB3',
				xscr: '\uD835\uDCCD',
				xsqcup: '\u2A06',
				xuplus: '\u2A04',
				xutri: '\u25B3',
				xvee: '\u22C1',
				xwedge: '\u22C0',
				Yacute: '\u00DD',
				yacute: '\u00FD',
				YAcy: '\u042F',
				yacy: '\u044F',
				Ycirc: '\u0176',
				ycirc: '\u0177',
				Ycy: '\u042B',
				ycy: '\u044B',
				yen: '\u00A5',
				Yfr: '\uD835\uDD1C',
				yfr: '\uD835\uDD36',
				YIcy: '\u0407',
				yicy: '\u0457',
				Yopf: '\uD835\uDD50',
				yopf: '\uD835\uDD6A',
				Yscr: '\uD835\uDCB4',
				yscr: '\uD835\uDCCE',
				YUcy: '\u042E',
				yucy: '\u044E',
				Yuml: '\u0178',
				yuml: '\u00FF',
				Zacute: '\u0179',
				zacute: '\u017A',
				Zcaron: '\u017D',
				zcaron: '\u017E',
				Zcy: '\u0417',
				zcy: '\u0437',
				Zdot: '\u017B',
				zdot: '\u017C',
				zeetrf: '\u2128',
				ZeroWidthSpace: '\u200B',
				Zeta: '\u0396',
				zeta: '\u03B6',
				Zfr: '\u2128',
				zfr: '\uD835\uDD37',
				ZHcy: '\u0416',
				zhcy: '\u0436',
				zigrarr: '\u21DD',
				Zopf: '\u2124',
				zopf: '\uD835\uDD6B',
				Zscr: '\uD835\uDCB5',
				zscr: '\uD835\uDCCF',
				zwj: '\u200D',
				zwnj: '\u200C',
			});

			/**
			 * @deprecated
			 * Use `HTML_ENTITIES` instead.
			 * @see {@link HTML_ENTITIES}
			 */
			exports.entityMap = exports.HTML_ENTITIES; 
		} (entities));
		return entities;
	}

	var sax = {};

	var hasRequiredSax;

	function requireSax () {
		if (hasRequiredSax) return sax;
		hasRequiredSax = 1;

		var conventions = requireConventions();
		var g = requireGrammar();
		var errors = requireErrors();

		var isHTMLEscapableRawTextElement = conventions.isHTMLEscapableRawTextElement;
		var isHTMLMimeType = conventions.isHTMLMimeType;
		var isHTMLRawTextElement = conventions.isHTMLRawTextElement;
		var hasOwn = conventions.hasOwn;
		var NAMESPACE = conventions.NAMESPACE;
		var ParseError = errors.ParseError;
		var DOMException = errors.DOMException;

		//var handlers = 'resolveEntity,getExternalSubset,characters,endDocument,endElement,endPrefixMapping,ignorableWhitespace,processingInstruction,setDocumentLocator,skippedEntity,startDocument,startElement,startPrefixMapping,notationDecl,unparsedEntityDecl,error,fatalError,warning,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,comment,endCDATA,endDTD,endEntity,startCDATA,startDTD,startEntity'.split(',')

		//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
		//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
		var S_TAG = 0; //tag name offerring
		var S_ATTR = 1; //attr name offerring
		var S_ATTR_SPACE = 2; //attr name end and space offer
		var S_EQ = 3; //=space?
		var S_ATTR_NOQUOT_VALUE = 4; //attr value(no quot value only)
		var S_ATTR_END = 5; //attr value end and no space(quot end)
		var S_TAG_SPACE = 6; //(attr value end || tag end ) && (space offer)
		var S_TAG_CLOSE = 7; //closed el<el />

		function XMLReader() {}

		XMLReader.prototype = {
			parse: function (source, defaultNSMap, entityMap) {
				var domBuilder = this.domBuilder;
				domBuilder.startDocument();
				_copy(defaultNSMap, (defaultNSMap = Object.create(null)));
				parse(source, defaultNSMap, entityMap, domBuilder, this.errorHandler);
				domBuilder.endDocument();
			},
		};

		/**
		 * Detecting everything that might be a reference,
		 * including those without ending `;`, since those are allowed in HTML.
		 * The entityReplacer takes care of verifying and transforming each occurrence,
		 * and reports to the errorHandler on those that are not OK,
		 * depending on the context.
		 */
		var ENTITY_REG = /&#?\w+;?/g;

		function parse(source, defaultNSMapCopy, entityMap, domBuilder, errorHandler) {
			var isHTML = isHTMLMimeType(domBuilder.mimeType);
			if (source.indexOf(g.UNICODE_REPLACEMENT_CHARACTER) >= 0) {
				errorHandler.warning('Unicode replacement character detected, source encoding issues?');
			}

			function fixedFromCharCode(code) {
				// String.prototype.fromCharCode does not supports
				// > 2 bytes unicode chars directly
				if (code > 0xffff) {
					code -= 0x10000;
					var surrogate1 = 0xd800 + (code >> 10),
						surrogate2 = 0xdc00 + (code & 0x3ff);

					return String.fromCharCode(surrogate1, surrogate2);
				} else {
					return String.fromCharCode(code);
				}
			}

			function entityReplacer(a) {
				var complete = a[a.length - 1] === ';' ? a : a + ';';
				if (!isHTML && complete !== a) {
					errorHandler.error('EntityRef: expecting ;');
					return a;
				}
				var match = g.Reference.exec(complete);
				if (!match || match[0].length !== complete.length) {
					errorHandler.error('entity not matching Reference production: ' + a);
					return a;
				}
				var k = complete.slice(1, -1);
				if (hasOwn(entityMap, k)) {
					return entityMap[k];
				} else if (k.charAt(0) === '#') {
					return fixedFromCharCode(parseInt(k.substring(1).replace('x', '0x')));
				} else {
					errorHandler.error('entity not found:' + a);
					return a;
				}
			}

			function appendText(end) {
				//has some bugs
				if (end > start) {
					var xt = source.substring(start, end).replace(ENTITY_REG, entityReplacer);
					locator && position(start);
					domBuilder.characters(xt, 0, end - start);
					start = end;
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
					var tagStart = source.indexOf('<', start);
					if (tagStart < 0) {
						if (!isHTML && unclosedTags.length > 0) {
							return errorHandler.fatalError('unclosed xml tag(s): ' + unclosedTags.join(', '));
						}
						if (!source.substring(start).match(/^\s*$/)) {
							var doc = domBuilder.doc;
							var text = doc.createTextNode(source.substring(start));
							if (doc.documentElement) {
								// `return errorHandler.error` is not a common pattern,
								// it is usually only used with `.fatalError`s.
								// In this case it is intentional, because it allows to stop parsing
								// and returning doc after reporting the extra content that will not be part of the document.
								return errorHandler.error('Extra content at the end of the document');
							}
							doc.appendChild(text);
							domBuilder.currentElement = text;
						}
						return;
					}
					if (tagStart > start) {
						var fromSource = source.substring(start, tagStart);
						if (!isHTML && unclosedTags.length === 0) {
							fromSource = fromSource.replace(new RegExp(g.S_OPT.source, 'g'), '');
							fromSource && errorHandler.error("Unexpected content outside root element: '" + fromSource + "'");
						}
						appendText(tagStart);
					}
					switch (source.charAt(tagStart + 1)) {
						case '/':
							var end = source.indexOf('>', tagStart + 2);
							var tagNameRaw = source.substring(tagStart + 2, end > 0 ? end : undefined);
							if (!tagNameRaw) {
								return errorHandler.fatalError('end tag name missing');
							}
							var endTagNameStrict = g.reg('^', g.QName_group, g.S_OPT, '$');
							var tagNameMatch = end > 0 && endTagNameStrict.exec(tagNameRaw);
							if (!tagNameMatch) {
								var leadingTagNameMatch = end > 0 && g.reg('^', g.QName_group).exec(tagNameRaw);
								if (isHTML && leadingTagNameMatch) {
									errorHandler.warning('end tag name contains invalid trailing characters: "' + tagNameRaw + '"');
									tagNameMatch = leadingTagNameMatch;
								} else if (
									// Backward compatibility, remove this whole `else if` arm in the next breaking release
									// (XML then falls through to the `fatalError` below, for a clean mode split: XML fatal,
									// HTML warning). A valid end-tag name followed by a line break and trailing content was
									// silently accepted while `reg` still used the `m` flag; re-adding `m` here matches exactly
									// those inputs, kept recoverable and reported.
									leadingTagNameMatch &&
									new RegExp(endTagNameStrict.source, endTagNameStrict.flags + 'm').test(tagNameRaw)
								) {
									errorHandler.error('end tag name is followed by a line break and trailing content: "' + tagNameRaw + '"');
									tagNameMatch = leadingTagNameMatch;
								} else {
									return errorHandler.fatalError('end tag name contains invalid characters: "' + tagNameRaw + '"');
								}
							}
							if (!domBuilder.currentElement && !domBuilder.doc.documentElement) {
								// not enough information to provide a helpful error message,
								// but parsing will throw since there is no root element
								return;
							}
							var currentTagName =
								unclosedTags[unclosedTags.length - 1] ||
								domBuilder.currentElement.tagName ||
								domBuilder.doc.documentElement.tagName ||
								'';
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
						case '?': // <?...?>
							locator && position(tagStart);
							end = parseProcessingInstruction(source, tagStart, domBuilder, errorHandler);
							break;
						case '!': // <!doctype,<![CDATA,<!--
							locator && position(tagStart);
							end = parseDoctypeCommentOrCData(source, tagStart, domBuilder, errorHandler, isHTML);
							break;
						default:
							locator && position(tagStart);
							var el = new ElementAttributes();
							var currentNSMap = parseStack[parseStack.length - 1].currentNSMap;
							//elStartEnd
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
								//try{//attribute position fixed
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
						// A DOMException raised while building the DOM is not-well-formed input,
						// so it is wrapped into a ParseError and reported before being thrown.
						return errorHandler.fatalError('Error constructing the DOM: ' + e.name + ': ' + e.message, e);
					}
					errorHandler.error('element parse error: ' + e);
					end = -1;
				}
				if (end > start) {
					start = end;
				} else {
					//Possible sax fallback here, risk of positional error
					appendText(Math.max(tagStart, start) + 1);
				}
			}
		}

		function copyLocator(f, t) {
			t.lineNumber = f.lineNumber;
			t.columnNumber = f.columnNumber;
			return t;
		}

		/**
		 * @returns
		 * end of the elementStartPart(end of elementEndPart for selfClosed el)
		 * @see {@link #appendElement}
		 */
		function parseElementStartPart(source, start, el, currentNSMap, entityReplacer, errorHandler, isHTML) {
			/**
			 * @param {string} qname
			 * @param {string} value
			 * @param {number} startIndex
			 */
			function addAttribute(qname, value, startIndex) {
				if (hasOwn(el.attributeNames, qname)) {
					return errorHandler.fatalError('Attribute ' + qname + ' redefined');
				}
				if (!isHTML && value.indexOf('<') >= 0) {
					return errorHandler.fatalError("Unescaped '<' not allowed in attributes values");
				}
				el.addValue(
					qname,
					// @see https://www.w3.org/TR/xml/#AVNormalize
					// since the xmldom sax parser does not "interpret" DTD the following is not implemented:
					// - recursive replacement of (DTD) entity references
					// - trimming and collapsing multiple spaces into a single one for attributes that are not of type CDATA
					value.replace(/[\t\n\r]/g, ' ').replace(ENTITY_REG, entityReplacer),
					startIndex
				);
			}

			var attrName;
			var value;
			var p = ++start;
			var s = S_TAG; //status
			while (true) {
				var c = source.charAt(p);
				if (s === S_TAG && c === '<') {
					// A `<` can never occur inside a tag name. Without this guard the scan runs
					// on to the next `>` (or EOF) before `setTagName` rejects the whole slice, so
					// a document with many `<` inside a malformed tag makes each one-character
					// recovery step re-scan to the distant `>` — O(n^2). Stopping at the `<` keeps
					// each recovery step bounded. The candidate scanned so far is reported raw,
					// consistent with the sibling invalid-tag-name throw below.
					throw new Error('unexpected < in tag name: ' + source.slice(start, p));
				}
				switch (c) {
					case '=':
						if (s === S_ATTR) {
							//attrName
							attrName = source.slice(start, p);
							s = S_EQ;
						} else if (s === S_ATTR_SPACE) {
							s = S_EQ;
						} else {
							//fatalError: equal must after attrName or space after attrName
							throw new Error('attribute equal must after attrName');
						}
						break;
					case "'":
					case '"':
						if (
							s === S_EQ ||
							s === S_ATTR //|| s == S_ATTR_SPACE
						) {
							//equal
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
								//fatalError: no end quot match
								throw new Error("attribute value no end '" + c + "' match");
							}
						} else if (s == S_ATTR_NOQUOT_VALUE) {
							value = source.slice(start, p);
							addAttribute(attrName, value, start);
							errorHandler.warning('attribute "' + attrName + '" missed start quot(' + c + ')!!');
							start = p + 1;
							s = S_ATTR_END;
						} else {
							//fatalError: no equal before
							throw new Error('attribute value must after "="');
						}
						break;
					case '/':
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
					case '': //end document
						errorHandler.error('unexpected end of input');
						if (s == S_TAG) {
							el.setTagName(source.slice(start, p));
						}
						return p;
					case '>':
						switch (s) {
							case S_TAG:
								el.setTagName(source.slice(start, p));
							case S_ATTR_END:
							case S_TAG_SPACE:
							case S_TAG_CLOSE:
								break; //normal
							case S_ATTR_NOQUOT_VALUE: //Compatible state
							case S_ATTR:
								value = source.slice(start, p);
								if (value.slice(-1) === '/') {
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
									return errorHandler.fatalError('AttValue: \' or " expected');
								}
						}
						return p;
					/*xml space '\x20' | #x9 | #xD | #xA; */
					case '\u0080':
						c = ' ';
					default:
						if (c <= ' ') {
							//space
							switch (s) {
								case S_TAG:
									el.setTagName(source.slice(start, p)); //tagName
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
								//case S_TAG_SPACE:
								//case S_EQ:
								//case S_ATTR_SPACE:
								//	void();break;
								//case S_TAG_CLOSE:
								//ignore warning
							}
						} else {
							//not space
							//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
							//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
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
				} //end outer switch
				p++;
			}
		}

		/**
		 * @returns
		 * `true` if a new namespace has been defined.
		 */
		function appendElement(el, domBuilder, currentNSMap) {
			var tagName = el.tagName;
			var localNSMap = null;
			var i = el.length;
			while (i--) {
				var a = el[i];
				var qName = a.qName;
				var value = a.value;
				var nsp = qName.indexOf(':');
				if (nsp > 0) {
					var prefix = (a.prefix = qName.slice(0, nsp));
					var localName = qName.slice(nsp + 1);
					var nsPrefix = prefix === 'xmlns' && localName;
				} else {
					localName = qName;
					prefix = null;
					nsPrefix = qName === 'xmlns' && '';
				}
				//can not set prefix,because prefix !== ''
				a.localName = localName;
				//prefix == null for no ns prefix attribute
				if (nsPrefix !== false) {
					//hack!!
					if (localNSMap == null) {
						localNSMap = Object.create(null);
						// Derive the child scope's namespace map by prototype-chain inheritance
						// instead of a flat copy: lookups inherit ancestor prefixes transparently,
						// so a document nesting N scopes retains O(N) map entries rather than
						// sum(1..N) = O(N^2). `localNSMap` stays a flat own-only record of the
						// prefixes declared at THIS element, so own-property enumeration
						// (endPrefixMapping below) still reports only local declarations.
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
					//no prefix attribute has no namespace
					if (a.prefix === 'xml') {
						a.uri = NAMESPACE.XML;
					}
					if (a.prefix !== 'xmlns') {
						a.uri = currentNSMap[a.prefix];
					}
				}
			}
			var nsp = tagName.indexOf(':');
			if (nsp > 0) {
				prefix = el.prefix = tagName.slice(0, nsp);
				localName = el.localName = tagName.slice(nsp + 1);
			} else {
				prefix = null; //important!!
				localName = el.localName = tagName;
			}
			//no prefix element has default namespace
			var ns = (el.uri = currentNSMap[prefix || '']);
			domBuilder.startElement(ns, localName, tagName, el);
			//endPrefixMapping and startPrefixMapping have not any help for dom builder
			//localNSMap = null
			if (el.closed) {
				domBuilder.endElement(ns, localName, tagName);
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
				//parseStack.push(el);
				return true;
			}
		}

		function parseHtmlSpecialContent(source, elStartEnd, tagName, entityReplacer, domBuilder) {
			// https://html.spec.whatwg.org/#raw-text-elements
			// https://html.spec.whatwg.org/#escapable-raw-text-elements
			// https://html.spec.whatwg.org/#cdata-rcdata-restrictions:raw-text-elements
			// TODO: https://html.spec.whatwg.org/#cdata-rcdata-restrictions
			var isEscapableRaw = isHTMLEscapableRawTextElement(tagName);
			if (isEscapableRaw || isHTMLRawTextElement(tagName)) {
				// The closing tag of a raw-text element matches case-insensitively
				// (WHATWG HTML §13.2.5.14 RAWTEXT end tag name state). A case-sensitive
				// search that missed the closing tag would return -1 and the `substring`
				// below would treat -1 as a backward slice from position 0, re-emitting all
				// prior source and amplifying output quadratically across repeated elements.
				// The regex is anchored to `elStartEnd` via `lastIndex` so it scans forward
				// only (O(distance), not the whole source).
				var closeTag = new RegExp('</' + tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '>', 'ig');
				closeTag.lastIndex = elStartEnd;
				var match = closeTag.exec(source);
				var elEndStart = match ? match.index : -1;
				if (elEndStart < 0) {
					// No closing tag: never slice with a -1 end index. Leave the element to
					// the parse loop's normal recovery instead of back-capturing the source.
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

		/**
		 * @typedef ParseUtils
		 * @property {function(relativeIndex: number?): string | undefined} char
		 * Provides look ahead access to a singe character relative to the current index.
		 * @property {function(): number} getIndex
		 * Provides read-only access to the current index.
		 * @property {function(reg: RegExp): string | null} getMatch
		 * Applies the provided regular expression enforcing that it starts at the current index and
		 * returns the complete matching string,
		 * and moves the current index by the length of the matching string.
		 * @property {function(): string} getSource
		 * Provides read-only access to the complete source.
		 * @property {function(places: number?): void} skip
		 * moves the current index by places (defaults to 1)
		 * @property {function(): number} skipBlanks
		 * Moves the current index by the amount of white space that directly follows the current index
		 * and returns the amount of whitespace chars skipped (0..n),
		 * or -1 if the end of the source was reached.
		 * @property {function(): string} substringFromIndex
		 * creates a substring from the current index to the end of `source`
		 * @property {function(compareWith: string): boolean} substringStartsWith
		 * Checks if `source` contains `compareWith`, starting from the current index.
		 * @property {function(compareWith: string): boolean} substringStartsWithCaseInsensitive
		 * Checks if `source` contains `compareWith`, starting from the current index,
		 * comparing the upper case of both sides.
		 * @see {@link parseUtils}
		 */

		/**
		 * A temporary scope for parsing and look ahead operations in `source`,
		 * starting from index `start`.
		 *
		 * Some operations move the current index by a number of positions,
		 * after which `getIndex` returns the new index.
		 *
		 * @param {string} source
		 * @param {number} start
		 * @returns {ParseUtils}
		 */
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
					if (c !== ' ' && c !== '\n' && c !== '\t' && c !== '\r') {
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
				var expr = g.reg('^', args);
				var match = expr.exec(substringFromIndex());
				if (match) {
					skip(match[0].length);
					return match[0];
				}
				return null;
			}
			return {
				char: char,
				getIndex: function () {
					return index;
				},
				getMatch: getMatch,
				getSource: function () {
					return source;
				},
				skip: skip,
				skipBlanks: skipBlanks,
				substringFromIndex: substringFromIndex,
				substringStartsWith: substringStartsWith,
				substringStartsWithCaseInsensitive: substringStartsWithCaseInsensitive,
			};
		}

		/**
		 * @param {ParseUtils} p
		 * @param {DOMHandler} errorHandler
		 * @returns {string}
		 */
		function parseDoctypeInternalSubset(p, errorHandler) {
			/**
			 * @param {ParseUtils} p
			 * @param {DOMHandler} errorHandler
			 * @returns {string}
			 */
			function parsePI(p, errorHandler) {
				var match = g.PI.exec(p.substringFromIndex());
				if (!match) {
					return errorHandler.fatalError('processing instruction is not well-formed at position ' + p.getIndex());
				}
				if (match[1].toLowerCase() === 'xml') {
					return errorHandler.fatalError(
						'xml declaration is only allowed at the start of the document, but found at position ' + p.getIndex()
					);
				}
				p.skip(match[0].length);
				return match[0];
			}
			// Parse internal subset
			var source = p.getSource();
			if (p.char() === '[') {
				p.skip(1);
				var intSubsetStart = p.getIndex();
				while (p.getIndex() < source.length) {
					p.skipBlanks();
					if (p.char() === ']') {
						var internalSubset = source.substring(intSubsetStart, p.getIndex());
						p.skip(1);
						return internalSubset;
					}
					var current = null;
					// Only in external subset
					// if (char() === '<' && char(1) === '!' && char(2) === '[') {
					// 	parseConditionalSections(p, errorHandler);
					// } else
					if (p.char() === '<' && p.char(1) === '!') {
						switch (p.char(2)) {
							case 'E': // ELEMENT | ENTITY
								if (p.char(3) === 'L') {
									current = p.getMatch(g.elementdecl);
								} else if (p.char(3) === 'N') {
									current = p.getMatch(g.EntityDecl);
								}
								break;
							case 'A': // ATTRIBUTE
								current = p.getMatch(g.AttlistDecl);
								break;
							case 'N': // NOTATION
								current = p.getMatch(g.NotationDecl);
								break;
							case '-': // COMMENT
								current = p.getMatch(g.Comment);
								break;
						}
					} else if (p.char() === '<' && p.char(1) === '?') {
						current = parsePI(p, errorHandler);
					} else if (p.char() === '%') {
						current = p.getMatch(g.PEReference);
					} else {
						return errorHandler.fatalError('Error detected in Markup declaration');
					}
					if (!current) {
						return errorHandler.fatalError('Error in internal subset at position ' + p.getIndex());
					}
				}
				return errorHandler.fatalError('doctype internal subset is not well-formed, missing ]');
			}
		}

		/**
		 * Called when the parser encounters an element starting with '<!'.
		 *
		 * @param {string} source
		 * The xml.
		 * @param {number} start
		 * the start index of the '<!'
		 * @param {DOMHandler} domBuilder
		 * @param {DOMHandler} errorHandler
		 * @param {boolean} isHTML
		 * @returns {number | never}
		 * The end index of the element.
		 * @throws {ParseError}
		 * In case the element is not well-formed.
		 */
		function parseDoctypeCommentOrCData(source, start, domBuilder, errorHandler, isHTML) {
			var p = parseUtils(source, start);

			switch (isHTML ? p.char(2).toUpperCase() : p.char(2)) {
				case '-':
					// should be a comment
					var comment = p.getMatch(g.Comment);
					if (comment) {
						domBuilder.comment(comment, g.COMMENT_START.length, comment.length - g.COMMENT_START.length - g.COMMENT_END.length);
						return p.getIndex();
					} else {
						return errorHandler.fatalError('comment is not well-formed at position ' + p.getIndex());
					}
				case '[':
					// should be CDATA
					var cdata = p.getMatch(g.CDSect);
					if (cdata) {
						if (!isHTML && !domBuilder.currentElement) {
							return errorHandler.fatalError('CDATA outside of element');
						}
						domBuilder.startCDATA();
						domBuilder.characters(cdata, g.CDATA_START.length, cdata.length - g.CDATA_START.length - g.CDATA_END.length);
						domBuilder.endCDATA();
						return p.getIndex();
					} else {
						return errorHandler.fatalError('Invalid CDATA starting at position ' + start);
					}
				case 'D': {
					// should be DOCTYPE
					if (domBuilder.doc && domBuilder.doc.documentElement) {
						return errorHandler.fatalError('Doctype not allowed inside or after documentElement at position ' + p.getIndex());
					}
					if (isHTML ? !p.substringStartsWithCaseInsensitive(g.DOCTYPE_DECL_START) : !p.substringStartsWith(g.DOCTYPE_DECL_START)) {
						return errorHandler.fatalError('Expected ' + g.DOCTYPE_DECL_START + ' at position ' + p.getIndex());
					}
					p.skip(g.DOCTYPE_DECL_START.length);
					if (p.skipBlanks() < 1) {
						return errorHandler.fatalError('Expected whitespace after ' + g.DOCTYPE_DECL_START + ' at position ' + p.getIndex());
					}

					var doctype = {
						name: undefined,
						publicId: undefined,
						systemId: undefined,
						internalSubset: undefined,
					};
					// Parse the DOCTYPE name
					doctype.name = p.getMatch(g.Name);
					if (!doctype.name)
						return errorHandler.fatalError('doctype name missing or contains unexpected characters at position ' + p.getIndex());

					if (isHTML && doctype.name.toLowerCase() !== 'html') {
						errorHandler.warning('Unexpected DOCTYPE in HTML document at position ' + p.getIndex());
					}
					p.skipBlanks();

					// Check for ExternalID
					if (p.substringStartsWith(g.PUBLIC) || p.substringStartsWith(g.SYSTEM)) {
						var match = g.ExternalID_match.exec(p.substringFromIndex());
						if (!match) {
							return errorHandler.fatalError('doctype external id is not well-formed at position ' + p.getIndex());
						}
						if (match.groups.SystemLiteralOnly !== undefined) {
							doctype.systemId = match.groups.SystemLiteralOnly;
						} else {
							doctype.systemId = match.groups.SystemLiteral;
							doctype.publicId = match.groups.PubidLiteral;
						}
						p.skip(match[0].length);
					} else if (isHTML && p.substringStartsWithCaseInsensitive(g.SYSTEM)) {
						// https://html.spec.whatwg.org/multipage/syntax.html#doctype-legacy-string
						p.skip(g.SYSTEM.length);
						if (p.skipBlanks() < 1) {
							return errorHandler.fatalError('Expected whitespace after ' + g.SYSTEM + ' at position ' + p.getIndex());
						}
						doctype.systemId = p.getMatch(g.ABOUT_LEGACY_COMPAT_SystemLiteral);
						if (!doctype.systemId) {
							return errorHandler.fatalError(
								'Expected ' + g.ABOUT_LEGACY_COMPAT + ' in single or double quotes after ' + g.SYSTEM + ' at position ' + p.getIndex()
							);
						}
					}
					if (isHTML && doctype.systemId && !g.ABOUT_LEGACY_COMPAT_SystemLiteral.test(doctype.systemId)) {
						errorHandler.warning('Unexpected doctype.systemId in HTML document at position ' + p.getIndex());
					}
					if (!isHTML) {
						p.skipBlanks();
						doctype.internalSubset = parseDoctypeInternalSubset(p, errorHandler);
					}
					p.skipBlanks();
					if (p.char() !== '>') {
						return errorHandler.fatalError('doctype not terminated with > at position ' + p.getIndex());
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
				return errorHandler.fatalError('Invalid processing instruction starting at position ' + start);
			}
			if (match[1].toLowerCase() === 'xml') {
				if (start > 0) {
					return errorHandler.fatalError(
						'processing instruction at position ' + start + ' is an xml declaration which is only at the start of the document'
					);
				}
				if (!g.XMLDecl.test(source.substring(start))) {
					return errorHandler.fatalError('xml declaration is not well-formed');
				}
			}
			domBuilder.processingInstruction(match[1], match[2]);
			return start + match[0].length;
		}

		function ElementAttributes() {
			this.attributeNames = Object.create(null);
		}

		ElementAttributes.prototype = {
			setTagName: function (tagName) {
				if (!g.QName_exact.test(tagName)) {
					throw new Error('invalid tagName:' + tagName);
				}
				this.tagName = tagName;
			},
			addValue: function (qName, value, offset) {
				if (!g.QName_exact.test(qName)) {
					throw new Error('invalid attribute:' + qName);
				}
				this.attributeNames[qName] = this.length;
				this[this.length++] = { qName: qName, value: value, offset: offset };
			},
			length: 0,
			getLocalName: function (i) {
				return this[i].localName;
			},
			getLocator: function (i) {
				return this[i].locator;
			},
			getQName: function (i) {
				return this[i].qName;
			},
			getURI: function (i) {
				return this[i].uri;
			},
			getValue: function (i) {
				return this[i].value;
			},
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

		sax.XMLReader = XMLReader;
		sax.parseUtils = parseUtils;
		sax.parseDoctypeCommentOrCData = parseDoctypeCommentOrCData;
		return sax;
	}

	var hasRequiredDomParser;

	function requireDomParser () {
		if (hasRequiredDomParser) return domParser;
		hasRequiredDomParser = 1;

		var conventions = requireConventions();
		var dom = requireDom();
		var errors = requireErrors();
		var entities = requireEntities();
		var sax = requireSax();

		var DOMImplementation = dom.DOMImplementation;

		var hasDefaultHTMLNamespace = conventions.hasDefaultHTMLNamespace;
		var isHTMLMimeType = conventions.isHTMLMimeType;
		var isValidMimeType = conventions.isValidMimeType;
		var MIME_TYPE = conventions.MIME_TYPE;
		var NAMESPACE = conventions.NAMESPACE;
		var ParseError = errors.ParseError;

		var XMLReader = sax.XMLReader;

		/**
		 * Normalizes line ending according to <https://www.w3.org/TR/xml11/#sec-line-ends>,
		 * including some Unicode "newline" characters:
		 *
		 * > XML parsed entities are often stored in computer files which,
		 * > for editing convenience, are organized into lines.
		 * > These lines are typically separated by some combination
		 * > of the characters CARRIAGE RETURN (#xD) and LINE FEED (#xA).
		 * >
		 * > To simplify the tasks of applications, the XML processor must behave
		 * > as if it normalized all line breaks in external parsed entities (including the document entity)
		 * > on input, before parsing, by translating the following to a single #xA character:
		 * >
		 * > 1. the two-character sequence #xD #xA,
		 * > 2. the two-character sequence #xD #x85,
		 * > 3. the single character #x85,
		 * > 4. the single character #x2028,
		 * > 5. the single character #x2029,
		 * > 6. any #xD character that is not immediately followed by #xA or #x85.
		 *
		 * @param {string} input
		 * @returns {string}
		 * @prettierignore
		 */
		function normalizeLineEndings(input) {
			return input.replace(/\r[\n\u0085]/g, '\n').replace(/[\r\u0085\u2028\u2029]/g, '\n');
		}

		/**
		 * @typedef Locator
		 * @property {number} [columnNumber]
		 * @property {number} [lineNumber]
		 */

		/**
		 * @typedef DOMParserOptions
		 * @property {typeof assign} [assign]
		 * The method to use instead of `conventions.assign`, which is used to copy values from
		 * `options` before they are used for parsing.
		 * @property {typeof DOMHandler} [domHandler]
		 * For internal testing: The class for creating an instance for handling events from the SAX
		 * parser.
		 * *****Warning: By configuring a faulty implementation, the specified behavior can completely
		 * be broken.*****.
		 * @property {Function} [errorHandler]
		 * DEPRECATED! use `onError` instead.
		 * @property {function(level:ErrorLevel, message:string, context: DOMHandler):void}
		 * [onError]
		 * A function invoked for every error that occurs during parsing.
		 *
		 * If it is not provided, all errors are reported to `console.error`
		 * and only `fatalError`s are thrown as a `ParseError`,
		 * which prevents any further processing.
		 * If the provided method throws, a `ParserError` is thrown,
		 * which prevents any further processing.
		 *
		 * Be aware that many `warning`s are considered an error that prevents further processing in
		 * most implementations.
		 * @property {boolean} [locator=true]
		 * Configures if the nodes created during parsing will have a `lineNumber` and a `columnNumber`
		 * attribute describing their location in the XML string.
		 * Default is true.
		 * @property {(string) => string} [normalizeLineEndings]
		 * used to replace line endings before parsing, defaults to exported `normalizeLineEndings`,
		 * which normalizes line endings according to <https://www.w3.org/TR/xml11/#sec-line-ends>,
		 * including some Unicode "newline" characters.
		 * @property {Object} [xmlns]
		 * The XML namespaces that should be assumed when parsing.
		 * The default namespace can be provided by the key that is the empty string.
		 * When the `mimeType` for HTML, XHTML or SVG are passed to `parseFromString`,
		 * the default namespace that will be used,
		 * will be overridden according to the specification.
		 * @see {@link normalizeLineEndings}
		 */

		/**
		 * The DOMParser interface provides the ability to parse XML or HTML source code from a string
		 * into a DOM `Document`.
		 *
		 * ***xmldom is different from the spec in that it allows an `options` parameter,
		 * to control the behavior***.
		 *
		 * @class
		 * @param {DOMParserOptions} [options]
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
		 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-parsing-and-serialization
		 */
		function DOMParser(options) {
			options = options || {};
			if (options.locator === undefined) {
				options.locator = true;
			}

			/**
			 * The method to use instead of `conventions.assign`, which is used to copy values from
			 * `options`
			 * before they are used for parsing.
			 *
			 * @type {conventions.assign}
			 * @private
			 * @see {@link conventions.assign}
			 * @readonly
			 */
			this.assign = options.assign || conventions.assign;

			/**
			 * For internal testing: The class for creating an instance for handling events from the SAX
			 * parser.
			 * *****Warning: By configuring a faulty implementation, the specified behavior can completely
			 * be broken*****.
			 *
			 * @type {typeof DOMHandler}
			 * @private
			 * @readonly
			 */
			this.domHandler = options.domHandler || DOMHandler;

			/**
			 * A function that is invoked for every error that occurs during parsing.
			 *
			 * If it is not provided, all errors are reported to `console.error`
			 * and only `fatalError`s are thrown as a `ParseError`,
			 * which prevents any further processing.
			 * If the provided method throws, a `ParserError` is thrown,
			 * which prevents any further processing.
			 *
			 * Be aware that many `warning`s are considered an error that prevents further processing in
			 * most implementations.
			 *
			 * @type {function(level:ErrorLevel, message:string, context: DOMHandler):void}
			 * @see {@link onErrorStopParsing}
			 * @see {@link onWarningStopParsing}
			 */
			this.onError = options.onError || options.errorHandler;
			if (options.errorHandler && typeof options.errorHandler !== 'function') {
				throw new TypeError('errorHandler object is no longer supported, switch to onError!');
			} else if (options.errorHandler) {
				options.errorHandler('warning', 'The `errorHandler` option has been deprecated, use `onError` instead!', this);
			}

			/**
			 * used to replace line endings before parsing, defaults to `normalizeLineEndings`
			 *
			 * @type {(string) => string}
			 * @readonly
			 */
			this.normalizeLineEndings = options.normalizeLineEndings || normalizeLineEndings;

			/**
			 * Configures if the nodes created during parsing will have a `lineNumber` and a
			 * `columnNumber`
			 * attribute describing their location in the XML string.
			 * Default is true.
			 *
			 * @type {boolean}
			 * @readonly
			 */
			this.locator = !!options.locator;

			/**
			 * The default namespace can be provided by the key that is the empty string.
			 * When the `mimeType` for HTML, XHTML or SVG are passed to `parseFromString`,
			 * the default namespace that will be used,
			 * will be overridden according to the specification.
			 *
			 * @type {Readonly<Object>}
			 * @readonly
			 */
			this.xmlns = this.assign(Object.create(null), options.xmlns);
		}

		/**
		 * Parses `source` using the options in the way configured by the `DOMParserOptions` of `this`
		 * `DOMParser`. If `mimeType` is `text/html` an HTML `Document` is created,
		 * otherwise an XML `Document` is created.
		 *
		 * __It behaves different from the description in the living standard__:
		 * - Uses the `options` passed to the `DOMParser` constructor to modify the behavior.
		 * - Any unexpected input is reported to `onError` with either a `warning`,
		 * `error` or `fatalError` level.
		 * - Any `fatalError` throws a `ParseError` which prevents further processing.
		 * - Any error thrown by `onError` is converted to a `ParseError` which prevents further
		 * processing - If no `Document` was created during parsing it is reported as a `fatalError`.
		 * - A `DOMException` raised while building the DOM (e.g. an unbound namespace prefix) is
		 * reported as a `fatalError` and rethrown as a `ParseError` with the `DOMException` as its
		 * `cause`.
		 * *****Warning: By configuring a faulty DOMHandler implementation,
		 * the specified behavior can completely be broken*****.
		 *
		 * @param {string} source
		 * The XML mime type only allows string input!
		 * @param {string} [mimeType='application/xml']
		 * the mimeType or contentType of the document to be created determines the `type` of document
		 * created (XML or HTML)
		 * @returns {Document}
		 * The `Document` node.
		 * @throws {ParseError}
		 * for any `fatalError` or anything that is thrown by `onError`
		 * @throws {TypeError}
		 * for any invalid `mimeType`
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString
		 * @see https://html.spec.whatwg.org/#dom-domparser-parsefromstring-dev
		 */
		DOMParser.prototype.parseFromString = function (source, mimeType) {
			if (!isValidMimeType(mimeType)) {
				throw new TypeError('DOMParser.parseFromString: the provided mimeType "' + mimeType + '" is not valid.');
			}
			var defaultNSMap = this.assign(Object.create(null), this.xmlns);
			var entityMap = entities.XML_ENTITIES;
			var defaultNamespace = defaultNSMap[''] || null;
			if (hasDefaultHTMLNamespace(mimeType)) {
				entityMap = entities.HTML_ENTITIES;
				defaultNamespace = NAMESPACE.HTML;
			} else if (mimeType === MIME_TYPE.XML_SVG_IMAGE) {
				defaultNamespace = NAMESPACE.SVG;
			}
			defaultNSMap[''] = defaultNamespace;
			defaultNSMap.xml = defaultNSMap.xml || NAMESPACE.XML;

			var domBuilder = new this.domHandler({
				mimeType: mimeType,
				defaultNamespace: defaultNamespace,
				onError: this.onError,
			});
			var locator = this.locator ? {} : undefined;
			if (this.locator) {
				domBuilder.setDocumentLocator(locator);
			}

			var sax = new XMLReader();
			sax.errorHandler = domBuilder;
			sax.domBuilder = domBuilder;
			var isXml = !conventions.isHTMLMimeType(mimeType);
			if (isXml && typeof source !== 'string') {
				sax.errorHandler.fatalError('source is not a string');
			}
			sax.parse(this.normalizeLineEndings(String(source)), defaultNSMap, entityMap);
			if (!domBuilder.doc.documentElement) {
				sax.errorHandler.fatalError('missing root element');
			}
			return domBuilder.doc;
		};

		/**
		 * @typedef DOMHandlerOptions
		 * @property {string} [mimeType=MIME_TYPE.XML_APPLICATION]
		 * @property {string | null} [defaultNamespace=null]
		 */
		/**
		 * The class that is used to handle events from the SAX parser to create the related DOM
		 * elements.
		 *
		 * Some methods are only implemented as an empty function,
		 * since they are (at least currently) not relevant for xmldom.
		 *
		 * @class
		 * @param {DOMHandlerOptions} [options]
		 * @see http://www.saxproject.org/apidoc/org/xml/sax/ext/DefaultHandler2.html
		 */
		function DOMHandler(options) {
			var opt = options || {};
			/**
			 * The mime type is used to determine if the DOM handler will create an XML or HTML document.
			 * Only if it is set to `text/html` it will create an HTML document.
			 * It defaults to MIME_TYPE.XML_APPLICATION.
			 *
			 * @type {string}
			 * @see {@link MIME_TYPE}
			 * @readonly
			 */
			this.mimeType = opt.mimeType || MIME_TYPE.XML_APPLICATION;

			/**
			 * The namespace to use to create an XML document.
			 * For the following reasons this is required:
			 * - The SAX API for `startDocument` doesn't offer any way to pass a namespace,
			 * since at that point there is no way for the parser to know what the default namespace from
			 * the document will be.
			 * - When creating using `DOMImplementation.createDocument` it is required to pass a
			 * namespace,
			 * to determine the correct `Document.contentType`, which should match `this.mimeType`.
			 * - When parsing an XML document with the `application/xhtml+xml` mimeType,
			 * the HTML namespace needs to be the default namespace.
			 *
			 * @type {string | null}
			 * @private
			 * @readonly
			 */
			this.defaultNamespace = opt.defaultNamespace || null;

			/**
			 * @type {boolean}
			 * @private
			 */
			this.cdata = false;

			/**
			 * The last `Element` that was created by `startElement`.
			 * `endElement` sets it to the `currentElement.parentNode`.
			 *
			 * Note: The sax parser currently sets it to white space text nodes between tags.
			 *
			 * @type {Element | Node | undefined}
			 * @private
			 */
			this.currentElement = undefined;

			/**
			 * The Document that is created as part of `startDocument`,
			 * and returned by `DOMParser.parseFromString`.
			 *
			 * @type {Document | undefined}
			 * @readonly
			 */
			this.doc = undefined;

			/**
			 * The locator is stored as part of setDocumentLocator.
			 * It is controlled and mutated by the SAX parser to store the current parsing position.
			 * It is used by DOMHandler to set `columnNumber` and `lineNumber`
			 * on the DOM nodes.
			 *
			 * @type {Readonly<Locator> | undefined}
			 * @private
			 * @readonly (the
			 * sax parser currently sometimes set's it)
			 */
			this.locator = undefined;
			/**
			 * @type {function (level:ErrorLevel ,message:string, context:DOMHandler):void}
			 * @readonly
			 */
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
			startDocument: function () {
				var impl = new DOMImplementation();
				this.doc = isHTMLMimeType(this.mimeType) ? impl.createHTMLDocument(false) : impl.createDocument(this.defaultNamespace, '');
			},
			startElement: function (namespaceURI, localName, qName, attrs) {
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
			endElement: function (namespaceURI, localName, qName) {
				this.currentElement = this.currentElement.parentNode;
			},
			startPrefixMapping: function (prefix, uri) {},
			endPrefixMapping: function (prefix) {},
			processingInstruction: function (target, data) {
				var ins = this.doc.createProcessingInstruction(target, data);
				this.locator && position(this.locator, ins);
				appendElement(this, ins);
			},
			ignorableWhitespace: function (ch, start, length) {},
			characters: function (chars, start, length) {
				chars = _toString.apply(this, arguments);
				//console.log(chars)
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
						//process xml
					}
					this.locator && position(this.locator, charNode);
				}
			},
			skippedEntity: function (name) {},
			endDocument: function () {
				this.doc.normalize();
			},
			/**
			 * Stores the locator to be able to set the `columnNumber` and `lineNumber`
			 * on the created DOM nodes.
			 *
			 * @param {Locator} locator
			 */
			setDocumentLocator: function (locator) {
				if (locator) {
					locator.lineNumber = 0;
				}
				this.locator = locator;
			},
			//LexicalHandler
			comment: function (chars, start, length) {
				chars = _toString.apply(this, arguments);
				var comm = this.doc.createComment(chars);
				this.locator && position(this.locator, comm);
				appendElement(this, comm);
			},

			startCDATA: function () {
				//used in characters() methods
				this.cdata = true;
			},
			endCDATA: function () {
				this.cdata = false;
			},

			startDTD: function (name, publicId, systemId, internalSubset) {
				var impl = this.doc.implementation;
				if (impl && impl.createDocumentType) {
					var dt = impl.createDocumentType(name, publicId, systemId, internalSubset);
					this.locator && position(this.locator, dt);
					appendElement(this, dt);
					this.doc.doctype = dt;
				}
			},
			reportError: function (level, message) {
				if (typeof this.onError === 'function') {
					try {
						this.onError(level, message, this);
					} catch (e) {
						throw new ParseError('Reporting ' + level + ' "' + message + '" caused ' + e, this.locator);
					}
				} else {
					console.error('[xmldom ' + level + ']\t' + message, _locator(this.locator));
				}
			},
			/**
			 * @see http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
			 */
			warning: function (message) {
				this.reportError('warning', message);
			},
			error: function (message) {
				this.reportError('error', message);
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
			fatalError: function (message, cause) {
				this.reportError('fatalError', message);
				throw new ParseError(message, this.locator, cause);
			},
		};

		function _locator(l) {
			if (l) {
				return '\n@#[line:' + l.lineNumber + ',col:' + l.columnNumber + ']';
			}
		}

		function _toString(chars, start, length) {
			if (typeof chars == 'string') {
				return chars.substr(start, length);
			} else {
				//java sax connect width xmldom on rhino(what about: "? && !(chars instanceof String)")
				if (chars.length >= start + length || start) {
					return new java.lang.String(chars, start, length) + '';
				}
				return chars;
			}
		}

		/*
		 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/LexicalHandler.html
		 * used method of org.xml.sax.ext.LexicalHandler:
		 *  #comment(chars, start, length)
		 *  #startCDATA()
		 *  #endCDATA()
		 *  #startDTD(name, publicId, systemId)
		 *
		 *
		 * IGNORED method of org.xml.sax.ext.LexicalHandler:
		 *  #endDTD()
		 *  #startEntity(name)
		 *  #endEntity(name)
		 *
		 *
		 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/DeclHandler.html
		 * IGNORED method of org.xml.sax.ext.DeclHandler
		 * 	#attributeDecl(eName, aName, type, mode, value)
		 *  #elementDecl(name, model)
		 *  #externalEntityDecl(name, publicId, systemId)
		 *  #internalEntityDecl(name, value)
		 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/EntityResolver2.html
		 * IGNORED method of org.xml.sax.EntityResolver2
		 *  #resolveEntity(String name,String publicId,String baseURI,String systemId)
		 *  #resolveEntity(publicId, systemId)
		 *  #getExternalSubset(name, baseURI)
		 * @link http://www.saxproject.org/apidoc/org/xml/sax/DTDHandler.html
		 * IGNORED method of org.xml.sax.DTDHandler
		 *  #notationDecl(name, publicId, systemId) {};
		 *  #unparsedEntityDecl(name, publicId, systemId, notationName) {};
		 */
		'endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl'.replace(
			/\w+/g,
			function (key) {
				DOMHandler.prototype[key] = function () {
					return null;
				};
			}
		);

		/* Private static helpers treated below as private instance methods, so don't need to add these to the public API; we might use a Relator to also get rid of non-standard public properties */
		function appendElement(handler, node) {
			if (!handler.currentElement) {
				handler.doc.appendChild(node);
			} else {
				handler.currentElement.appendChild(node);
			}
		}

		/**
		 * A method that prevents any further parsing when an `error`
		 * with level `error` is reported during parsing.
		 *
		 * @see {@link DOMParserOptions.onError}
		 * @see {@link onWarningStopParsing}
		 */
		function onErrorStopParsing(level) {
			if (level === 'error') throw 'onErrorStopParsing';
		}

		/**
		 * A method that prevents any further parsing when any `error` is reported during parsing.
		 *
		 * @see {@link DOMParserOptions.onError}
		 * @see {@link onErrorStopParsing}
		 */
		function onWarningStopParsing() {
			throw 'onWarningStopParsing';
		}

		domParser.__DOMHandler = DOMHandler;
		domParser.DOMParser = DOMParser;
		domParser.normalizeLineEndings = normalizeLineEndings;
		domParser.onErrorStopParsing = onErrorStopParsing;
		domParser.onWarningStopParsing = onWarningStopParsing;
		return domParser;
	}

	var hasRequiredLib;

	function requireLib () {
		if (hasRequiredLib) return lib;
		hasRequiredLib = 1;
		var conventions = requireConventions();
		lib.assign = conventions.assign;
		lib.hasDefaultHTMLNamespace = conventions.hasDefaultHTMLNamespace;
		lib.isHTMLMimeType = conventions.isHTMLMimeType;
		lib.isValidMimeType = conventions.isValidMimeType;
		lib.MIME_TYPE = conventions.MIME_TYPE;
		lib.NAMESPACE = conventions.NAMESPACE;

		var errors = requireErrors();
		lib.DOMException = errors.DOMException;
		lib.DOMExceptionName = errors.DOMExceptionName;
		lib.ExceptionCode = errors.ExceptionCode;
		lib.ParseError = errors.ParseError;

		var dom = requireDom();
		lib.Attr = dom.Attr;
		lib.CDATASection = dom.CDATASection;
		lib.CharacterData = dom.CharacterData;
		lib.Comment = dom.Comment;
		lib.Document = dom.Document;
		lib.DocumentFragment = dom.DocumentFragment;
		lib.DocumentType = dom.DocumentType;
		lib.DOMImplementation = dom.DOMImplementation;
		lib.Element = dom.Element;
		lib.Entity = dom.Entity;
		lib.EntityReference = dom.EntityReference;
		lib.LiveNodeList = dom.LiveNodeList;
		lib.NamedNodeMap = dom.NamedNodeMap;
		lib.Node = dom.Node;
		lib.NodeList = dom.NodeList;
		lib.Notation = dom.Notation;
		lib.ProcessingInstruction = dom.ProcessingInstruction;
		lib.Text = dom.Text;
		lib.XMLSerializer = dom.XMLSerializer;

		var domParser = requireDomParser();
		lib.DOMParser = domParser.DOMParser;
		lib.normalizeLineEndings = domParser.normalizeLineEndings;
		lib.onErrorStopParsing = domParser.onErrorStopParsing;
		lib.onWarningStopParsing = domParser.onWarningStopParsing;
		return lib;
	}

	var libExports = requireLib();

	function encloseFontFamily(fontFamily) {
	    let value = String(fontFamily ?? "").trim();
	    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"')))
	        value = value.slice(1, -1);
	    if (/^(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|emoji|math|fangsong)$/i.test(value))
	        return value;
	    if (/^[^\u0000-\u0020\u007f-\u009f'"\\;:{}()[\]<>/,]+$/u.test(value))
	        return value;
	    const escaped = value
	        .replace(/\\/g, "\\\\")
	        .replace(/'/g, "\\'")
	        .replace(/[\u0000-\u001f\u007f-\u009f]/g, character => character === "\0" ? "\ufffd" : `\\${character.codePointAt(0).toString(16)} `);
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
	    const inferredScript = ["Hans", "Hant", "Jpan", "Hang"].includes(script)
	        ? script
	        : namedJapaneseFont
	            ? "Jpan"
	            : script;
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
	    }
	    else if (kai) {
	        families.push("'Kaiti SC'", "STKaiti", "'Noto Serif CJK SC'", "serif");
	    }
	    else if (sans) {
	        if (inferredScript == "Hant")
	            families.push("'Microsoft JhengHei'", "'PingFang TC'", "'Noto Sans CJK TC'", "sans-serif");
	        else if (inferredScript == "Jpan")
	            families.push("'Yu Gothic'", "Meiryo", "'Noto Sans CJK JP'", "sans-serif");
	        else if (inferredScript == "Hang")
	            families.push("'Malgun Gothic'", "'Apple SD Gothic Neo'", "'Noto Sans CJK KR'", "sans-serif");
	        else
	            families.push("'Microsoft YaHei'", "'PingFang SC'", "'Noto Sans CJK SC'", "sans-serif");
	    }
	    else if (inferredScript == "Hant") {
	        families.push("'PingFang TC'", "'Noto Sans CJK TC'", "sans-serif");
	    }
	    else if (inferredScript == "Jpan") {
	        families.push("'Yu Gothic'", "Meiryo", "'Noto Sans CJK JP'", "sans-serif");
	    }
	    else if (inferredScript == "Hang") {
	        families.push("'Apple SD Gothic Neo'", "'Noto Sans CJK KR'", "sans-serif");
	    }
	    else {
	        families.push("'PingFang SC'", "'Noto Sans CJK SC'", "sans-serif");
	    }
	    return [...new Set(families)];
	}
	function fangzhengFontFamilyAliases(typeface) {
	    const value = String(typeface ?? "").normalize("NFKC").toLowerCase().replace(/[\s_-]+/g, "");
	    const groups = [
	        [/方正仿宋|fangzhengfangsong|fzfangsong|fzfs/, ["方正仿宋", "方正仿宋简体", "方正仿宋_GBK", "FZFangSong-Z02", "FZFSK--GBK1-0"]],
	        [/方正楷体|fangzhengkai|fzkai|fzkt/, ["方正楷体", "方正楷体简体", "方正楷体_GBK", "FZKai-Z03", "FZKTK--GBK1-0"]],
	        [/方正黑体|fangzhenghei|fzhei|fzht/, ["方正黑体", "方正黑体简体", "FZHei-B01", "FZHTK--GBK1-0"]],
	        [/方正书宋|fangzhengshusong|fzshusong|fzss/, ["方正书宋", "方正书宋简体", "FZShuSong-Z01", "FZSSK--GBK1-0"]],
	        [/方正小标宋|fangzhengxiaobiaosong|fzxiaobiaosong|fzxbs/, ["方正小标宋简体", "方正小标宋", "FZXiaoBiaoSong-B05", "FZXBSJW--GB1-0"]]
	    ];
	    return groups.find(([pattern]) => pattern.test(value))?.[1] ?? [];
	}
	function splitPath(path) {
	    let si = path.lastIndexOf('/') + 1;
	    let folder = si == 0 ? "" : path.substring(0, si);
	    let fileName = si == 0 ? path : path.substring(si);
	    return [folder, fileName];
	}
	function resolvePath(path, base) {
	    try {
	        const prefix = "http://docx/";
	        const url = new URL(path, prefix + base).toString();
	        return url.substring(prefix.length);
	    }
	    catch {
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
	    for (const rule of (text ?? '').split(';')) {
	        const index = rule.indexOf(':');
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
	    return min > val ? min : (max < val ? max : val);
	}

	const ns = {
	    wordml: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
	    drawingml: "http://schemas.openxmlformats.org/drawingml/2006/main",
	    picture: "http://schemas.openxmlformats.org/drawingml/2006/picture",
	    wordprocessingCanvas: "http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas",
	    wordprocessingGroup: "http://schemas.microsoft.com/office/word/2010/wordprocessingGroup",
	    wordprocessingShape: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape"};
	const LengthUsage = {
	    Dxa: { mul: 0.05, unit: "pt" },
	    SignedDxa: { mul: 0.05, unit: "pt" },
	    Emu: { mul: 1 / 12700, unit: "pt" },
	    FontSize: { mul: 0.5, unit: "pt" },
	    SignedHalfPoint: { mul: 0.5, unit: "pt" },
	    Border: { mul: 0.125, unit: "pt", min: 0.25, max: 12 },
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
	        case "1": return true;
	        case "0": return false;
	        case "on": return true;
	        case "off": return false;
	        case "true": return true;
	        case "false": return false;
	        default: return defaultValue;
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
	            props.fontSize ?? (props.fontSize = xml.lengthAttr(elem, "val", LengthUsage.FontSize));
	            break;
	        default:
	            return false;
	    }
	    return true;
	}

	const policyCache = new Map();
	const pendingHtml = new Map();
	const XML_POLICY_NAME = "file-viewer-docx-xml-parser";
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
	    }
	    finally {
	        pendingHtml.delete(policyName);
	    }
	}
	function trustedXmlForParsing(xml) {
	    if (typeof document === "undefined")
	        return xml;
	    return trustedHtmlForSink(XML_POLICY_NAME, xml);
	}

	let runtime = {
	    parse: source => new DOMParser().parseFromString(source, "application/xml"),
	    serialize: node => new XMLSerializer().serializeToString(node)
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
	    return data.charCodeAt(0) === 0xFEFF ? data.substring(1) : data;
	}
	function serializeXmlString(elem) {
	    return runtime.serialize(elem);
	}
	class XmlParser {
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
	        return el ? this.attr(el, attrLocalName) : undefined;
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
	            "firstRow", "lastRow", "firstColumn", "lastColumn",
	            "oddVBand", "evenVBand", "oddHBand", "evenHBand",
	            "firstRowLastColumn", "firstRowFirstColumn", "lastRowLastColumn", "lastRowFirstColumn"
	        ];
	        return attrs
	            .map(name => convertBoolean(this.rawAttr(elem, name), false) ? "1" : "0")
	            .join("");
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
	}
	const globalXmlParser = new XmlParser();

	const unsafeExternalResourceCharacters = /[\u0000-\u001f\u007f]/;
	const localDataImage = /^data:image\/[a-z0-9.+-]+(?:;[^,]*)?,/i;
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
	    }
	    catch {
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
	var RelationshipTypes;
	(function (RelationshipTypes) {
	    RelationshipTypes["OfficeDocument"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
	    RelationshipTypes["FontTable"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable";
	    RelationshipTypes["Image"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
	    RelationshipTypes["Numbering"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering";
	    RelationshipTypes["Styles"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles";
	    RelationshipTypes["StylesWithEffects"] = "http://schemas.microsoft.com/office/2007/relationships/stylesWithEffects";
	    RelationshipTypes["Theme"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme";
	    RelationshipTypes["Settings"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings";
	    RelationshipTypes["WebSettings"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/webSettings";
	    RelationshipTypes["Hyperlink"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";
	    RelationshipTypes["Footnotes"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes";
	    RelationshipTypes["Endnotes"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes";
	    RelationshipTypes["Footer"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer";
	    RelationshipTypes["Header"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header";
	    RelationshipTypes["ExtendedProperties"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties";
	    RelationshipTypes["CoreProperties"] = "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties";
	    RelationshipTypes["CustomProperties"] = "http://schemas.openxmlformats.org/package/2006/relationships/metadata/custom-properties";
	    RelationshipTypes["Comments"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments";
	    RelationshipTypes["CommentsExtended"] = "http://schemas.microsoft.com/office/2011/relationships/commentsExtended";
	    RelationshipTypes["AltChunk"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk";
	    RelationshipTypes["Chart"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart";
	    RelationshipTypes["ChartUserShapes"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chartUserShapes";
	    RelationshipTypes["DiagramData"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramData";
	    RelationshipTypes["DiagramLayout"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramLayout";
	    RelationshipTypes["DiagramQuickStyle"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramQuickStyle";
	    RelationshipTypes["DiagramColors"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramColors";
	    RelationshipTypes["Ink"] = "http://schemas.microsoft.com/office/2007/relationships/ink";
	    RelationshipTypes["ContentPart"] = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/contentPart";
	})(RelationshipTypes || (RelationshipTypes = {}));
	function parseRelationships(root, xml) {
	    return xml.elements(root).map(e => ({
	        id: xml.attr(e, "Id"),
	        type: xml.attr(e, "Type"),
	        target: xml.attr(e, "Target"),
	        targetMode: xml.attr(e, "TargetMode")
	    }));
	}

	class Part {
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
	}

	const embedFontTypeMap = {
	    embedRegular: 'regular',
	    embedBold: 'bold',
	    embedItalic: 'italic',
	    embedBoldItalic: 'boldItalic',
	};
	function parseFonts(root, xml) {
	    return xml.elements(root).map(el => parseFont$2(el, xml));
	}
	function parseFont$2(elem, xml) {
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

	class FontTablePart extends Part {
	    parseXml(root) {
	        this.fonts = parseFonts(root, this._package.xmlParser);
	    }
	}

	function commonjsRequire(path) {
		throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
	}

	var jszip_min = {exports: {}};

	/*!

	JSZip v3.10.2 - A JavaScript class for generating and reading zip files
	<http://stuartk.com/jszip>

	(c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
	Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/main/LICENSE.markdown.

	JSZip uses the library pako released under the MIT license :
	https://github.com/nodeca/pako/blob/main/LICENSE
	*/

	var hasRequiredJszip_min;

	function requireJszip_min () {
		if (hasRequiredJszip_min) return jszip_min.exports;
		hasRequiredJszip_min = 1;
		(function (module, exports) {
			!function(e){module.exports=e();}(function(){return function s(a,o,h){function u(r,e){if(!o[r]){if(!a[r]){var t="function"==typeof commonjsRequire&&commonjsRequire;if(!e&&t)return t(r,true);if(l)return l(r,true);var n=new Error("Cannot find module '"+r+"'");throw n.code="MODULE_NOT_FOUND",n}var i=o[r]={exports:{}};a[r][0].call(i.exports,function(e){var t=a[r][1][e];return u(t||e)},i,i.exports,s,a,o,h);}return o[r].exports}for(var l="function"==typeof commonjsRequire&&commonjsRequire,e=0;e<h.length;e++)u(h[e]);return u}({1:[function(e,t,r){var d=e("./utils"),c=e("./support"),p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";r.encode=function(e){for(var t,r,n,i,s,a,o,h=[],u=0,l=e.length,f=l,c="string"!==d.getTypeOf(e);u<e.length;)f=l-u,n=c?(t=e[u++],r=u<l?e[u++]:0,u<l?e[u++]:0):(t=e.charCodeAt(u++),r=u<l?e.charCodeAt(u++):0,u<l?e.charCodeAt(u++):0),i=t>>2,s=(3&t)<<4|r>>4,a=1<f?(15&r)<<2|n>>6:64,o=2<f?63&n:64,h.push(p.charAt(i)+p.charAt(s)+p.charAt(a)+p.charAt(o));return h.join("")},r.decode=function(e){var t,r,n,i,s,a,o=0,h=0,u="data:";if(e.substr(0,u.length)===u)throw new Error("Invalid base64 input, it looks like a data url.");var l,f=3*(e=e.replace(/[^A-Za-z0-9+/=]/g,"")).length/4;if(e.charAt(e.length-1)===p.charAt(64)&&f--,e.charAt(e.length-2)===p.charAt(64)&&f--,f%1!=0)throw new Error("Invalid base64 input, bad content length.");for(l=c.uint8array?new Uint8Array(0|f):new Array(0|f);o<e.length;)t=p.indexOf(e.charAt(o++))<<2|(i=p.indexOf(e.charAt(o++)))>>4,r=(15&i)<<4|(s=p.indexOf(e.charAt(o++)))>>2,n=(3&s)<<6|(a=p.indexOf(e.charAt(o++))),l[h++]=t,64!==s&&(l[h++]=r),64!==a&&(l[h++]=n);return l};},{"./support":30,"./utils":32}],2:[function(e,t,r){var n=e("./external"),i=e("./stream/DataWorker"),s=e("./stream/Crc32Probe"),a=e("./stream/DataLengthProbe");function o(e,t,r,n,i){this.compressedSize=e,this.uncompressedSize=t,this.crc32=r,this.compression=n,this.compressedContent=i;}o.prototype={getContentWorker:function(){var e=new i(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")),t=this;return e.on("end",function(){if(this.streamInfo.data_length!==t.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")}),e},getCompressedWorker:function(){return new i(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},o.createWorkerFrom=function(e,t,r){return e.pipe(new s).pipe(new a("uncompressedSize")).pipe(t.compressWorker(r)).pipe(new a("compressedSize")).withStreamInfo("compression",t)},t.exports=o;},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(e,t,r){var n=e("./stream/GenericWorker");r.STORE={magic:"\0\0",compressWorker:function(){return new n("STORE compression")},uncompressWorker:function(){return new n("STORE decompression")}},r.DEFLATE=e("./flate");},{"./flate":7,"./stream/GenericWorker":28}],4:[function(e,t,r){var n=e("./utils");var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e;}return t}();t.exports=function(e,t){return void 0!==e&&e.length?"string"!==n.getTypeOf(e)?function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return  -1^e}(0|t,e,e.length,0):function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t.charCodeAt(a))];return  -1^e}(0|t,e,e.length,0):0};},{"./utils":32}],5:[function(e,t,r){r.base64=false,r.binary=false,r.dir=false,r.createFolders=true,r.date=null,r.compression=null,r.compressionOptions=null,r.comment=null,r.unixPermissions=null,r.dosPermissions=null;},{}],6:[function(e,t,r){var n=null;n="undefined"!=typeof Promise?Promise:e("lie"),t.exports={Promise:n};},{lie:37}],7:[function(e,t,r){var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,i=e("pako"),s=e("./utils"),a=e("./stream/GenericWorker"),o=n?"uint8array":"array";function h(e,t){a.call(this,"FlateWorker/"+e),this._pako=null,this._pakoAction=e,this._pakoOptions=t,this.meta={};}r.magic="\b\0",s.inherits(h,a),h.prototype.processChunk=function(e){this.meta=e.meta,null===this._pako&&this._createPako(),this._pako.push(s.transformTo(o,e.data),false);},h.prototype.flush=function(){a.prototype.flush.call(this),null===this._pako&&this._createPako(),this._pako.push([],true);},h.prototype.cleanUp=function(){a.prototype.cleanUp.call(this),this._pako=null;},h.prototype._createPako=function(){this._pako=new i[this._pakoAction]({raw:true,level:this._pakoOptions.level||-1});var t=this;this._pako.onData=function(e){t.push({data:e,meta:t.meta});};},r.compressWorker=function(e){return new h("Deflate",e)},r.uncompressWorker=function(){return new h("Inflate",{})};},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(e,t,r){function A(e,t){var r,n="";for(r=0;r<t;r++)n+=String.fromCharCode(255&e),e>>>=8;return n}function n(e,t,r,n,i,s){var a,o,h=e.file,u=e.compression,l=s!==O.utf8encode,f=I.transformTo("string",s(h.name)),c=I.transformTo("string",O.utf8encode(h.name)),d=h.comment,p=I.transformTo("string",s(d)),m=I.transformTo("string",O.utf8encode(d)),_=c.length!==h.name.length,g=m.length!==d.length,b="",v="",y="",w=h.dir,k=h.date,x={crc32:0,compressedSize:0,uncompressedSize:0};t&&!r||(x.crc32=e.crc32,x.compressedSize=e.compressedSize,x.uncompressedSize=e.uncompressedSize);var S=0;t&&(S|=8),l||!_&&!g||(S|=2048);var z=0,C=0;w&&(z|=16),"UNIX"===i?(C=798,z|=function(e,t){var r=e;return e||(r=t?16893:33204),(65535&r)<<16}(h.unixPermissions,w)):(C=20,z|=function(e){return 63&(e||0)}(h.dosPermissions)),a=k.getUTCHours(),a<<=6,a|=k.getUTCMinutes(),a<<=5,a|=k.getUTCSeconds()/2,o=k.getUTCFullYear()-1980,o<<=4,o|=k.getUTCMonth()+1,o<<=5,o|=k.getUTCDate(),_&&(v=A(1,1)+A(B(f),4)+c,b+="up"+A(v.length,2)+v),g&&(y=A(1,1)+A(B(p),4)+m,b+="uc"+A(y.length,2)+y);var E="";return E+="\n\0",E+=A(S,2),E+=u.magic,E+=A(a,2),E+=A(o,2),E+=A(x.crc32,4),E+=A(x.compressedSize,4),E+=A(x.uncompressedSize,4),E+=A(f.length,2),E+=A(b.length,2),{fileRecord:R.LOCAL_FILE_HEADER+E+f+b,dirRecord:R.CENTRAL_FILE_HEADER+A(C,2)+E+A(p.length,2)+"\0\0\0\0"+A(z,4)+A(n,4)+f+b+p}}var I=e("../utils"),i=e("../stream/GenericWorker"),O=e("../utf8"),B=e("../crc32"),R=e("../signature");function s(e,t,r,n){i.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=t,this.zipPlatform=r,this.encodeFileName=n,this.streamFiles=e,this.accumulate=false,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[];}I.inherits(s,i),s.prototype.push=function(e){var t=e.meta.percent||0,r=this.entriesCount,n=this._sources.length;this.accumulate?this.contentBuffer.push(e):(this.bytesWritten+=e.data.length,i.prototype.push.call(this,{data:e.data,meta:{currentFile:this.currentFile,percent:r?(t+100*(r-n-1))/r:100}}));},s.prototype.openedSource=function(e){this.currentSourceOffset=this.bytesWritten,this.currentFile=e.file.name;var t=this.streamFiles&&!e.file.dir;if(t){var r=n(e,t,false,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:r.fileRecord,meta:{percent:0}});}else this.accumulate=true;},s.prototype.closedSource=function(e){this.accumulate=false;var t=this.streamFiles&&!e.file.dir,r=n(e,t,true,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(r.dirRecord),t)this.push({data:function(e){return R.DATA_DESCRIPTOR+A(e.crc32,4)+A(e.compressedSize,4)+A(e.uncompressedSize,4)}(e),meta:{percent:100}});else for(this.push({data:r.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null;},s.prototype.flush=function(){for(var e=this.bytesWritten,t=0;t<this.dirRecords.length;t++)this.push({data:this.dirRecords[t],meta:{percent:100}});var r=this.bytesWritten-e,n=function(e,t,r,n,i){var s=I.transformTo("string",i(n));return R.CENTRAL_DIRECTORY_END+"\0\0\0\0"+A(e,2)+A(e,2)+A(t,4)+A(r,4)+A(s.length,2)+s}(this.dirRecords.length,r,e,this.zipComment,this.encodeFileName);this.push({data:n,meta:{percent:100}});},s.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume();},s.prototype.registerPrevious=function(e){this._sources.push(e);var t=this;return e.on("data",function(e){t.processChunk(e);}),e.on("end",function(){t.closedSource(t.previous.streamInfo),t._sources.length?t.prepareNextSource():t.end();}),e.on("error",function(e){t.error(e);}),this},s.prototype.resume=function(){return !!i.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),true):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),true))},s.prototype.error=function(e){var t=this._sources;if(!i.prototype.error.call(this,e))return  false;for(var r=0;r<t.length;r++)try{t[r].error(e);}catch(e){}return  true},s.prototype.lock=function(){i.prototype.lock.call(this);for(var e=this._sources,t=0;t<e.length;t++)e[t].lock();},t.exports=s;},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(e,t,r){var u=e("../compressions"),n=e("./ZipFileWorker");r.generateWorker=function(e,a,t){var o=new n(a.streamFiles,t,a.platform,a.encodeFileName),h=0;try{e.forEach(function(e,t){h++;var r=function(e,t){var r=e||t,n=u[r];if(!n)throw new Error(r+" is not a valid compression method !");return n}(t.options.compression,a.compression),n=t.options.compressionOptions||a.compressionOptions||{},i=t.dir,s=t.date;t._compressWorker(r,n).withStreamInfo("file",{name:e,dir:i,date:s,comment:t.comment||"",unixPermissions:t.unixPermissions,dosPermissions:t.dosPermissions}).pipe(o);}),o.entriesCount=h;}catch(e){o.error(e);}return o};},{"../compressions":3,"./ZipFileWorker":8}],10:[function(e,t,r){function n(){if(!(this instanceof n))return new n;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var e=new n;for(var t in this)"function"!=typeof this[t]&&(e[t]=this[t]);return e};}(n.prototype=e("./object")).loadAsync=e("./load"),n.support=e("./support"),n.defaults=e("./defaults"),n.version="3.10.2",n.loadAsync=function(e,t){return (new n).loadAsync(e,t)},n.external=e("./external"),t.exports=n;},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(e,t,r){var u=e("./utils"),i=e("./external"),n=e("./utf8"),s=e("./zipEntries"),a=e("./stream/Crc32Probe"),l=e("./nodejsUtils");function f(n){return new i.Promise(function(e,t){var r=n.decompressed.getContentWorker().pipe(new a);r.on("error",function(e){t(e);}).on("end",function(){r.streamInfo.crc32!==n.decompressed.crc32?t(new Error("Corrupted zip : CRC32 mismatch")):e();}).resume();})}t.exports=function(e,o){var h=this;return o=u.extend(o||{},{base64:false,checkCRC32:false,optimizedBinaryString:false,createFolders:false,decodeFileName:n.utf8decode}),l.isNode&&l.isStream(e)?i.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):u.prepareContent("the loaded zip file",e,true,o.optimizedBinaryString,o.base64).then(function(e){var t=new s(o);return t.load(e),t}).then(function(e){var t=[i.Promise.resolve(e)],r=e.files;if(o.checkCRC32)for(var n=0;n<r.length;n++)t.push(f(r[n]));return i.Promise.all(t)}).then(function(e){for(var t=e.shift(),r=t.files,n=0;n<r.length;n++){var i=r[n],s=i.fileNameStr,a=u.resolve(i.fileNameStr);h.file(a,i.decompressed,{binary:true,optimizedBinaryString:true,date:i.date,dir:i.dir,comment:i.fileCommentStr.length?i.fileCommentStr:null,unixPermissions:i.unixPermissions,dosPermissions:i.dosPermissions,createFolders:o.createFolders}),i.dir||(h.file(a).unsafeOriginalName=s);}return t.zipComment.length&&(h.comment=t.zipComment),h})};},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(e,t,r){var n=e("../utils"),i=e("../stream/GenericWorker");function s(e,t){i.call(this,"Nodejs stream input adapter for "+e),this._upstreamEnded=false,this._bindStream(t);}n.inherits(s,i),s.prototype._bindStream=function(e){var t=this;(this._stream=e).pause(),e.on("data",function(e){t.push({data:e,meta:{percent:0}});}).on("error",function(e){t.isPaused?this.generatedError=e:t.error(e);}).on("end",function(){t.isPaused?t._upstreamEnded=true:t.end();});},s.prototype.pause=function(){return !!i.prototype.pause.call(this)&&(this._stream.pause(),true)},s.prototype.resume=function(){return !!i.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),true)},t.exports=s;},{"../stream/GenericWorker":28,"../utils":32}],13:[function(e,t,r){var i=e("readable-stream").Readable;function n(e,t,r){i.call(this,t),this._helper=e;var n=this;e.on("data",function(e,t){n.push(e)||n._helper.pause(),r&&r(t);}).on("error",function(e){n.emit("error",e);}).on("end",function(){n.push(null);});}e("../utils").inherits(n,i),n.prototype._read=function(){this._helper.resume();},t.exports=n;},{"../utils":32,"readable-stream":16}],14:[function(e,t,r){t.exports={isNode:"undefined"!=typeof Buffer,newBufferFrom:function(e,t){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(e,t);if("number"==typeof e)throw new Error('The "data" argument must not be a number');return new Buffer(e,t)},allocBuffer:function(e){if(Buffer.alloc)return Buffer.alloc(e);var t=new Buffer(e);return t.fill(0),t},isBuffer:function(e){return Buffer.isBuffer(e)},isStream:function(e){return e&&"function"==typeof e.on&&"function"==typeof e.pause&&"function"==typeof e.resume}};},{}],15:[function(e,t,r){function s(e,t,r){var n,i=u.getTypeOf(t),s=u.extend(r||{},f);s.date=s.date||new Date,null!==s.compression&&(s.compression=s.compression.toUpperCase()),"string"==typeof s.unixPermissions&&(s.unixPermissions=parseInt(s.unixPermissions,8)),s.unixPermissions&&16384&s.unixPermissions&&(s.dir=true),s.dosPermissions&&16&s.dosPermissions&&(s.dir=true),s.dir&&(e=g(e)),s.createFolders&&(n=_(e))&&b.call(this,n,true);var a="string"===i&&false===s.binary&&false===s.base64;r&&void 0!==r.binary||(s.binary=!a),(t instanceof c&&0===t.uncompressedSize||s.dir||!t||0===t.length)&&(s.base64=false,s.binary=true,t="",s.compression="STORE",i="string");var o=null;o=t instanceof c||t instanceof l?t:p.isNode&&p.isStream(t)?new m(e,t):u.prepareContent(e,t,s.binary,s.optimizedBinaryString,s.base64);var h=new d(e,o,s);this.files[e]=h;}var i=e("./utf8"),u=e("./utils"),l=e("./stream/GenericWorker"),a=e("./stream/StreamHelper"),f=e("./defaults"),c=e("./compressedObject"),d=e("./zipObject"),o=e("./generate"),p=e("./nodejsUtils"),m=e("./nodejs/NodejsStreamInputAdapter"),_=function(e){"/"===e.slice(-1)&&(e=e.substring(0,e.length-1));var t=e.lastIndexOf("/");return 0<t?e.substring(0,t):""},g=function(e){return "/"!==e.slice(-1)&&(e+="/"),e},b=function(e,t){return t=void 0!==t?t:f.createFolders,e=g(e),this.files[e]||s.call(this,e,null,{dir:true,createFolders:t}),this.files[e]};function h(e){return "[object RegExp]"===Object.prototype.toString.call(e)}var n={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(e){var t,r,n;for(t in this.files)n=this.files[t],(r=t.slice(this.root.length,t.length))&&t.slice(0,this.root.length)===this.root&&e(r,n);},filter:function(r){var n=[];return this.forEach(function(e,t){r(e,t)&&n.push(t);}),n},file:function(e,t,r){if(1!==arguments.length)return e=this.root+e,s.call(this,e,t,r),this;if(h(e)){var n=e;return this.filter(function(e,t){return !t.dir&&n.test(e)})}var i=this.files[this.root+e];return i&&!i.dir?i:null},folder:function(r){if(!r)return this;if(h(r))return this.filter(function(e,t){return t.dir&&r.test(e)});var e=this.root+r,t=b.call(this,e),n=this.clone();return n.root=t.name,n},remove:function(r){r=this.root+r;var e=this.files[r];if(e||("/"!==r.slice(-1)&&(r+="/"),e=this.files[r]),e&&!e.dir)delete this.files[r];else for(var t=this.filter(function(e,t){return t.name.slice(0,r.length)===r}),n=0;n<t.length;n++)delete this.files[t[n].name];return this},generate:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(e){var t,r={};try{if((r=u.extend(e||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:i.utf8encode})).type=r.type.toLowerCase(),r.compression=r.compression.toUpperCase(),"binarystring"===r.type&&(r.type="string"),!r.type)throw new Error("No output type specified.");u.checkSupport(r.type),"darwin"!==r.platform&&"freebsd"!==r.platform&&"linux"!==r.platform&&"sunos"!==r.platform||(r.platform="UNIX"),"win32"===r.platform&&(r.platform="DOS");var n=r.comment||this.comment||"";t=o.generateWorker(this,r,n);}catch(e){(t=new l("error")).error(e);}return new a(t,r.type||"string",r.mimeType)},generateAsync:function(e,t){return this.generateInternalStream(e).accumulate(t)},generateNodeStream:function(e,t){return (e=e||{}).type||(e.type="nodebuffer"),this.generateInternalStream(e).toNodejsStream(t)}};t.exports=n;},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(e,t,r){t.exports=e("stream");},{stream:void 0}],17:[function(e,t,r){var n=e("./DataReader");function i(e){n.call(this,e);for(var t=0;t<this.data.length;t++)e[t]=255&e[t];}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data[this.zero+e]},i.prototype.lastIndexOfSignature=function(e){for(var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.length-4;0<=s;--s)if(this.data[s]===t&&this.data[s+1]===r&&this.data[s+2]===n&&this.data[s+3]===i)return s-this.zero;return  -1},i.prototype.readAndCheckSignature=function(e){var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.readData(4);return t===s[0]&&r===s[1]&&n===s[2]&&i===s[3]},i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return [];var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i;},{"../utils":32,"./DataReader":18}],18:[function(e,t,r){var n=e("../utils");function i(e){this.data=e,this.length=e.length,this.index=0,this.zero=0;}i.prototype={checkOffset:function(e){this.checkIndex(this.index+e);},checkIndex:function(e){if(this.length<this.zero+e||e<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+e+"). Corrupted zip ?")},setIndex:function(e){this.checkIndex(e),this.index=e;},skip:function(e){this.setIndex(this.index+e);},byteAt:function(){},readInt:function(e){var t,r=0;for(this.checkOffset(e),t=this.index+e-1;t>=this.index;t--)r=(r<<8)+this.byteAt(t);return this.index+=e,r},readString:function(e){return n.transformTo("string",this.readData(e))},readData:function(){},lastIndexOfSignature:function(){},readAndCheckSignature:function(){},readDate:function(){var e=this.readInt(4);return new Date(Date.UTC(1980+(e>>25&127),(e>>21&15)-1,e>>16&31,e>>11&31,e>>5&63,(31&e)<<1))}},t.exports=i;},{"../utils":32}],19:[function(e,t,r){var n=e("./Uint8ArrayReader");function i(e){n.call(this,e);}e("../utils").inherits(i,n),i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i;},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(e,t,r){var n=e("./DataReader");function i(e){n.call(this,e);}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data.charCodeAt(this.zero+e)},i.prototype.lastIndexOfSignature=function(e){return this.data.lastIndexOf(e)-this.zero},i.prototype.readAndCheckSignature=function(e){return e===this.readData(4)},i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i;},{"../utils":32,"./DataReader":18}],21:[function(e,t,r){var n=e("./ArrayReader");function i(e){n.call(this,e);}e("../utils").inherits(i,n),i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return new Uint8Array(0);var t=this.data.subarray(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i;},{"../utils":32,"./ArrayReader":17}],22:[function(e,t,r){var n=e("../utils"),i=e("../support"),s=e("./ArrayReader"),a=e("./StringReader"),o=e("./NodeBufferReader"),h=e("./Uint8ArrayReader");t.exports=function(e){var t=n.getTypeOf(e);return n.checkSupport(t),"string"!==t||i.uint8array?"nodebuffer"===t?new o(e):i.uint8array?new h(n.transformTo("uint8array",e)):new s(n.transformTo("array",e)):new a(e)};},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(e,t,r){r.LOCAL_FILE_HEADER="PK",r.CENTRAL_FILE_HEADER="PK",r.CENTRAL_DIRECTORY_END="PK",r.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK",r.ZIP64_CENTRAL_DIRECTORY_END="PK",r.DATA_DESCRIPTOR="PK\b";},{}],24:[function(e,t,r){var n=e("./GenericWorker"),i=e("../utils");function s(e){n.call(this,"ConvertWorker to "+e),this.destType=e;}i.inherits(s,n),s.prototype.processChunk=function(e){this.push({data:i.transformTo(this.destType,e.data),meta:e.meta});},t.exports=s;},{"../utils":32,"./GenericWorker":28}],25:[function(e,t,r){var n=e("./GenericWorker"),i=e("../crc32");function s(){n.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0);}e("../utils").inherits(s,n),s.prototype.processChunk=function(e){this.streamInfo.crc32=i(e.data,this.streamInfo.crc32||0),this.push(e);},t.exports=s;},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(e,t,r){var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataLengthProbe for "+e),this.propName=e,this.withStreamInfo(e,0);}n.inherits(s,i),s.prototype.processChunk=function(e){if(e){var t=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=t+e.data.length;}i.prototype.processChunk.call(this,e);},t.exports=s;},{"../utils":32,"./GenericWorker":28}],27:[function(e,t,r){var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataWorker");var t=this;this.dataIsReady=false,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=false,e.then(function(e){t.dataIsReady=true,t.data=e,t.max=e&&e.length||0,t.type=n.getTypeOf(e),t.isPaused||t._tickAndRepeat();},function(e){t.error(e);});}n.inherits(s,i),s.prototype.cleanUp=function(){i.prototype.cleanUp.call(this),this.data=null;},s.prototype.resume=function(){return !!i.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=true,n.delay(this._tickAndRepeat,[],this)),true)},s.prototype._tickAndRepeat=function(){this._tickScheduled=false,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(n.delay(this._tickAndRepeat,[],this),this._tickScheduled=true));},s.prototype._tick=function(){if(this.isPaused||this.isFinished)return  false;var e=null,t=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case "string":e=this.data.substring(this.index,t);break;case "uint8array":e=this.data.subarray(this.index,t);break;case "array":case "nodebuffer":e=this.data.slice(this.index,t);}return this.index=t,this.push({data:e,meta:{percent:this.max?this.index/this.max*100:0}})},t.exports=s;},{"../utils":32,"./GenericWorker":28}],28:[function(e,t,r){function n(e){this.name=e||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=true,this.isFinished=false,this.isLocked=false,this._listeners={data:[],end:[],error:[]},this.previous=null;}n.prototype={push:function(e){this.emit("data",e);},end:function(){if(this.isFinished)return  false;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0;}catch(e){this.emit("error",e);}return  true},error:function(e){return !this.isFinished&&(this.isPaused?this.generatedError=e:(this.isFinished=true,this.emit("error",e),this.previous&&this.previous.error(e),this.cleanUp()),true)},on:function(e,t){return this._listeners[e].push(t),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[];},emit:function(e,t){if(this._listeners[e])for(var r=0;r<this._listeners[e].length;r++)this._listeners[e][r].call(this,t);},pipe:function(e){return e.registerPrevious(this)},registerPrevious:function(e){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=e.streamInfo,this.mergeStreamInfo(),this.previous=e;var t=this;return e.on("data",function(e){t.processChunk(e);}),e.on("end",function(){t.end();}),e.on("error",function(e){t.error(e);}),this},pause:function(){return !this.isPaused&&!this.isFinished&&(this.isPaused=true,this.previous&&this.previous.pause(),true)},resume:function(){if(!this.isPaused||this.isFinished)return  false;var e=this.isPaused=false;return this.generatedError&&(this.error(this.generatedError),e=true),this.previous&&this.previous.resume(),!e},flush:function(){},processChunk:function(e){this.push(e);},withStreamInfo:function(e,t){return this.extraStreamInfo[e]=t,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var e in this.extraStreamInfo)Object.prototype.hasOwnProperty.call(this.extraStreamInfo,e)&&(this.streamInfo[e]=this.extraStreamInfo[e]);},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=true,this.previous&&this.previous.lock();},toString:function(){var e="Worker "+this.name;return this.previous?this.previous+" -> "+e:e}},t.exports=n;},{}],29:[function(e,t,r){var h=e("../utils"),i=e("./ConvertWorker"),s=e("./GenericWorker"),u=e("../base64"),n=e("../support"),a=e("../external"),o=null;if(n.nodestream)try{o=e("../nodejs/NodejsStreamOutputAdapter");}catch(e){}function l(e,o){return new a.Promise(function(t,r){var n=[],i=e._internalType,s=e._outputType,a=e._mimeType;e.on("data",function(e,t){n.push(e),o&&o(t);}).on("error",function(e){n=[],r(e);}).on("end",function(){try{var e=function(e,t,r){switch(e){case "blob":return h.newBlob(h.transformTo("arraybuffer",t),r);case "base64":return u.encode(t);default:return h.transformTo(e,t)}}(s,function(e,t){var r,n=0,i=null,s=0;for(r=0;r<t.length;r++)s+=t[r].length;switch(e){case "string":return t.join("");case "array":return Array.prototype.concat.apply([],t);case "uint8array":for(i=new Uint8Array(s),r=0;r<t.length;r++)i.set(t[r],n),n+=t[r].length;return i;case "nodebuffer":return Buffer.concat(t);default:throw new Error("concat : unsupported type '"+e+"'")}}(i,n),a);t(e);}catch(e){r(e);}n=[];}).resume();})}function f(e,t,r){var n=t;switch(t){case "blob":case "arraybuffer":n="uint8array";break;case "base64":n="string";}try{this._internalType=n,this._outputType=t,this._mimeType=r,h.checkSupport(n),this._worker=e.pipe(new i(n)),e.lock();}catch(e){this._worker=new s("error"),this._worker.error(e);}}f.prototype={accumulate:function(e){return l(this,e)},on:function(e,t){var r=this;return "data"===e?this._worker.on(e,function(e){t.call(r,e.data,e.meta);}):this._worker.on(e,function(){h.delay(t,arguments,r);}),this},resume:function(){return h.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(e){if(h.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new o(this,{objectMode:"nodebuffer"!==this._outputType},e)}},t.exports=f;},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(e,t,r){if(r.base64=true,r.array=true,r.string=true,r.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,r.nodebuffer="undefined"!=typeof Buffer,r.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)r.blob=false;else {var n=new ArrayBuffer(0);try{r.blob=0===new Blob([n],{type:"application/zip"}).size;}catch(e){try{var i=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);i.append(n),r.blob=0===i.getBlob("application/zip").size;}catch(e){r.blob=false;}}}try{r.nodestream=!!e("readable-stream").Readable;}catch(e){r.nodestream=false;}},{"readable-stream":16}],31:[function(e,t,s){for(var o=e("./utils"),h=e("./support"),r=e("./nodejsUtils"),n=e("./stream/GenericWorker"),u=new Array(256),i=0;i<256;i++)u[i]=252<=i?6:248<=i?5:240<=i?4:224<=i?3:192<=i?2:1;u[254]=u[254]=1;function a(){n.call(this,"utf-8 decode"),this.leftOver=null;}function l(){n.call(this,"utf-8 encode");}s.utf8encode=function(e){return h.nodebuffer?r.newBufferFrom(e,"utf-8"):function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=h.uint8array?new Uint8Array(o):new Array(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t}(e)},s.utf8decode=function(e){return h.nodebuffer?o.transformTo("nodebuffer",e).toString("utf-8"):function(e){var t,r,n,i,s=e.length,a=new Array(2*s);for(t=r=0;t<s;)if((n=e[t++])<128)a[r++]=n;else if(4<(i=u[n]))a[r++]=65533,t+=i-1;else {for(n&=2===i?31:3===i?15:7;1<i&&t<s;)n=n<<6|63&e[t++],i--;1<i?a[r++]=65533:n<65536?a[r++]=n:(n-=65536,a[r++]=55296|n>>10&1023,a[r++]=56320|1023&n);}return a.length!==r&&(a.subarray?a=a.subarray(0,r):a.length=r),o.applyFromCharCode(a)}(e=o.transformTo(h.uint8array?"uint8array":"array",e))},o.inherits(a,n),a.prototype.processChunk=function(e){var t=o.transformTo(h.uint8array?"uint8array":"array",e.data);if(this.leftOver&&this.leftOver.length){if(h.uint8array){var r=t;(t=new Uint8Array(r.length+this.leftOver.length)).set(this.leftOver,0),t.set(r,this.leftOver.length);}else t=this.leftOver.concat(t);this.leftOver=null;}var n=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}(t),i=t;n!==t.length&&(h.uint8array?(i=t.subarray(0,n),this.leftOver=t.subarray(n,t.length)):(i=t.slice(0,n),this.leftOver=t.slice(n,t.length))),this.push({data:s.utf8decode(i),meta:e.meta});},a.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:s.utf8decode(this.leftOver),meta:{}}),this.leftOver=null);},s.Utf8DecodeWorker=a,o.inherits(l,n),l.prototype.processChunk=function(e){this.push({data:s.utf8encode(e.data),meta:e.meta});},s.Utf8EncodeWorker=l;},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(e,t,a){var o=e("./support"),h=e("./base64"),r=e("./nodejsUtils"),u=e("./external");function n(e){return e}function l(e,t){for(var r=0;r<e.length;++r)t[r]=255&e.charCodeAt(r);return t}e("setimmediate"),a.newBlob=function(t,r){a.checkSupport("blob");try{return new Blob([t],{type:r})}catch(e){try{var n=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return n.append(t),n.getBlob(r)}catch(e){throw new Error("Bug : can't construct the Blob.")}}};var i={stringifyByChunk:function(e,t,r){var n=[],i=0,s=e.length;if(s<=r)return String.fromCharCode.apply(null,e);for(;i<s;)"array"===t||"nodebuffer"===t?n.push(String.fromCharCode.apply(null,e.slice(i,Math.min(i+r,s)))):n.push(String.fromCharCode.apply(null,e.subarray(i,Math.min(i+r,s)))),i+=r;return n.join("")},stringifyByChar:function(e){for(var t="",r=0;r<e.length;r++)t+=String.fromCharCode(e[r]);return t},applyCanBeUsed:{uint8array:function(){try{return o.uint8array&&1===String.fromCharCode.apply(null,new Uint8Array(1)).length}catch(e){return  false}}(),nodebuffer:function(){try{return o.nodebuffer&&1===String.fromCharCode.apply(null,r.allocBuffer(1)).length}catch(e){return  false}}()}};function s(e){var t=65536,r=a.getTypeOf(e),n=true;if("uint8array"===r?n=i.applyCanBeUsed.uint8array:"nodebuffer"===r&&(n=i.applyCanBeUsed.nodebuffer),n)for(;1<t;)try{return i.stringifyByChunk(e,r,t)}catch(e){t=Math.floor(t/2);}return i.stringifyByChar(e)}function f(e,t){for(var r=0;r<e.length;r++)t[r]=e[r];return t}a.applyFromCharCode=s;var c={};c.string={string:n,array:function(e){return l(e,new Array(e.length))},arraybuffer:function(e){return c.string.uint8array(e).buffer},uint8array:function(e){return l(e,new Uint8Array(e.length))},nodebuffer:function(e){return l(e,r.allocBuffer(e.length))}},c.array={string:s,array:n,arraybuffer:function(e){return new Uint8Array(e).buffer},uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(e)}},c.arraybuffer={string:function(e){return s(new Uint8Array(e))},array:function(e){return f(new Uint8Array(e),new Array(e.byteLength))},arraybuffer:n,uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(new Uint8Array(e))}},c.uint8array={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return e.buffer},uint8array:n,nodebuffer:function(e){return r.newBufferFrom(e)}},c.nodebuffer={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return c.nodebuffer.uint8array(e).buffer},uint8array:function(e){return f(e,new Uint8Array(e.length))},nodebuffer:n},a.transformTo=function(e,t){if(t=t||"",!e)return t;a.checkSupport(e);var r=a.getTypeOf(t);return c[r][e](t)},a.resolve=function(e){for(var t=e.split("/"),r=[],n=0;n<t.length;n++){var i=t[n];"."===i||""===i&&0!==n&&n!==t.length-1||(".."===i?r.pop():r.push(i));}return r.join("/")},a.getTypeOf=function(e){if("string"==typeof e)return "string";var t=Object.prototype.toString.call(e);return "[object Array]"===t?"array":o.nodebuffer&&r.isBuffer(e)?"nodebuffer":o.uint8array&&"[object Uint8Array]"===t?"uint8array":o.arraybuffer&&"[object ArrayBuffer]"===t?"arraybuffer":void 0},a.checkSupport=function(e){if(!o[e.toLowerCase()])throw new Error(e+" is not supported by this platform")},a.MAX_VALUE_16BITS=65535,a.MAX_VALUE_32BITS=-1,a.pretty=function(e){var t,r,n="";for(r=0;r<(e||"").length;r++)n+="\\x"+((t=e.charCodeAt(r))<16?"0":"")+t.toString(16).toUpperCase();return n},a.delay=function(e,t,r){setImmediate(function(){e.apply(r||null,t||[]);});},a.inherits=function(e,t){function r(){}r.prototype=t.prototype,e.prototype=new r;},a.extend=function(){var e,t,r={};for(e=0;e<arguments.length;e++)for(t in arguments[e])Object.prototype.hasOwnProperty.call(arguments[e],t)&&void 0===r[t]&&(r[t]=arguments[e][t]);return r},a.prepareContent=function(r,e,n,i,s){return u.Promise.resolve(e).then(function(n){return o.blob&&(n instanceof Blob||-1!==["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(n)))?void 0!==Blob.prototype.arrayBuffer?n.arrayBuffer():"undefined"!=typeof FileReader?new u.Promise(function(t,r){var e=new FileReader;e.onload=function(e){t(e.target.result);},e.onerror=function(e){r(e.target.error);},e.readAsArrayBuffer(n);}):u.Promise.reject(new Error(r+" is a Blob, but we have no way of reading it.")):n}).then(function(e){var t=a.getTypeOf(e);return t?("arraybuffer"===t?e=a.transformTo("uint8array",e):"string"===t&&(s?e=h.decode(e):n&&true!==i&&(e=function(e){return l(e,o.uint8array?new Uint8Array(e.length):new Array(e.length))}(e))),e):u.Promise.reject(new Error("Can't read the data of '"+r+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))})};},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,setimmediate:54}],33:[function(e,t,r){var n=e("./reader/readerFor"),i=e("./utils"),s=e("./signature"),a=e("./zipEntry"),o=e("./support");function h(e){this.files=[],this.loadOptions=e;}h.prototype={checkSignature:function(e){if(!this.reader.readAndCheckSignature(e)){this.reader.index-=4;var t=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+i.pretty(t)+", expected "+i.pretty(e)+")")}},isSignature:function(e,t){var r=this.reader.index;this.reader.setIndex(e);var n=this.reader.readString(4)===t;return this.reader.setIndex(r),n},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var e=this.reader.readData(this.zipCommentLength),t=o.uint8array?"uint8array":"array",r=i.transformTo(t,e);this.zipComment=this.loadOptions.decodeFileName(r);},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var e,t,r,n=this.zip64EndOfCentralSize-44;0<n;)e=this.reader.readInt(2),t=this.reader.readInt(4),r=this.reader.readData(t),this.zip64ExtensibleData[e]={id:e,length:t,value:r};},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var e,t;for(e=0;e<this.files.length;e++)t=this.files[e],this.reader.setIndex(t.localHeaderOffset),this.checkSignature(s.LOCAL_FILE_HEADER),t.readLocalPart(this.reader),t.handleUTF8(),t.processAttributes();},readCentralDir:function(){var e;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER);)(e=new a({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(e);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var e=this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);if(e<0)throw !this.isSignature(0,s.LOCAL_FILE_HEADER)?new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html"):new Error("Corrupted zip: can't find end of central directory");this.reader.setIndex(e);var t=e;if(this.checkSignature(s.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===i.MAX_VALUE_16BITS||this.diskWithCentralDirStart===i.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===i.MAX_VALUE_16BITS||this.centralDirRecords===i.MAX_VALUE_16BITS||this.centralDirSize===i.MAX_VALUE_32BITS||this.centralDirOffset===i.MAX_VALUE_32BITS){if(this.zip64=true,(e=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(e),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,s.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral();}var r=this.centralDirOffset+this.centralDirSize;this.zip64&&(r+=20,r+=12+this.zip64EndOfCentralSize);var n=t-r;if(0<n)this.isSignature(t,s.CENTRAL_FILE_HEADER)||(this.reader.zero=n);else if(n<0)throw new Error("Corrupted zip: missing "+Math.abs(n)+" bytes.")},prepareReader:function(e){this.reader=n(e);},load:function(e){this.prepareReader(e),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles();}},t.exports=h;},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utils":32,"./zipEntry":34}],34:[function(e,t,r){var n=e("./reader/readerFor"),s=e("./utils"),i=e("./compressedObject"),a=e("./crc32"),o=e("./utf8"),h=e("./compressions"),u=e("./support");function l(e,t){this.options=e,this.loadOptions=t;}l.prototype={isEncrypted:function(){return 1==(1&this.bitFlag)},useUTF8:function(){return 2048==(2048&this.bitFlag)},readLocalPart:function(e){var t,r;if(e.skip(22),this.fileNameLength=e.readInt(2),r=e.readInt(2),this.fileName=e.readData(this.fileNameLength),e.skip(r),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if(null===(t=function(e){for(var t in h)if(Object.prototype.hasOwnProperty.call(h,t)&&h[t].magic===e)return h[t];return null}(this.compressionMethod)))throw new Error("Corrupted zip : compression "+s.pretty(this.compressionMethod)+" unknown (inner file : "+s.transformTo("string",this.fileName)+")");this.decompressed=new i(this.compressedSize,this.uncompressedSize,this.crc32,t,e.readData(this.compressedSize));},readCentralPart:function(e){this.versionMadeBy=e.readInt(2),e.skip(2),this.bitFlag=e.readInt(2),this.compressionMethod=e.readString(2),this.date=e.readDate(),this.crc32=e.readInt(4),this.compressedSize=e.readInt(4),this.uncompressedSize=e.readInt(4);var t=e.readInt(2);if(this.extraFieldsLength=e.readInt(2),this.fileCommentLength=e.readInt(2),this.diskNumberStart=e.readInt(2),this.internalFileAttributes=e.readInt(2),this.externalFileAttributes=e.readInt(4),this.localHeaderOffset=e.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");e.skip(t),this.readExtraFields(e),this.parseZIP64ExtraField(e),this.fileComment=e.readData(this.fileCommentLength);},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var e=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),0==e&&(this.dosPermissions=63&this.externalFileAttributes),3==e&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=true);},parseZIP64ExtraField:function(){if(this.extraFields[1]){var e=n(this.extraFields[1].value);this.uncompressedSize===s.MAX_VALUE_32BITS&&(this.uncompressedSize=e.readInt(8)),this.compressedSize===s.MAX_VALUE_32BITS&&(this.compressedSize=e.readInt(8)),this.localHeaderOffset===s.MAX_VALUE_32BITS&&(this.localHeaderOffset=e.readInt(8)),this.diskNumberStart===s.MAX_VALUE_32BITS&&(this.diskNumberStart=e.readInt(4));}},readExtraFields:function(e){var t,r,n,i=e.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});e.index+4<i;)t=e.readInt(2),r=e.readInt(2),n=e.readData(r),this.extraFields[t]={id:t,length:r,value:n};e.setIndex(i);},handleUTF8:function(){var e=u.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=o.utf8decode(this.fileName),this.fileCommentStr=o.utf8decode(this.fileComment);else {var t=this.findExtraFieldUnicodePath();if(null!==t)this.fileNameStr=t;else {var r=s.transformTo(e,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(r);}var n=this.findExtraFieldUnicodeComment();if(null!==n)this.fileCommentStr=n;else {var i=s.transformTo(e,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(i);}}},findExtraFieldUnicodePath:function(){var e=this.extraFields[28789];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileName)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null},findExtraFieldUnicodeComment:function(){var e=this.extraFields[25461];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileComment)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null}},t.exports=l;},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(e,t,r){function n(e,t,r){this.name=e,this.dir=r.dir,this.date=r.date,this.comment=r.comment,this.unixPermissions=r.unixPermissions,this.dosPermissions=r.dosPermissions,this._data=t,this._dataBinary=r.binary,this.options={compression:r.compression,compressionOptions:r.compressionOptions};}var s=e("./stream/StreamHelper"),i=e("./stream/DataWorker"),a=e("./utf8"),o=e("./compressedObject"),h=e("./stream/GenericWorker");n.prototype={internalStream:function(e){var t=null,r="string";try{if(!e)throw new Error("No output type specified.");var n="string"===(r=e.toLowerCase())||"text"===r;"binarystring"!==r&&"text"!==r||(r="string"),t=this._decompressWorker();var i=!this._dataBinary;i&&!n&&(t=t.pipe(new a.Utf8EncodeWorker)),!i&&n&&(t=t.pipe(new a.Utf8DecodeWorker));}catch(e){(t=new h("error")).error(e);}return new s(t,r,"")},async:function(e,t){return this.internalStream(e).accumulate(t)},nodeStream:function(e,t){return this.internalStream(e||"nodebuffer").toNodejsStream(t)},_compressWorker:function(e,t){if(this._data instanceof o&&this._data.compression.magic===e.magic)return this._data.getCompressedWorker();var r=this._decompressWorker();return this._dataBinary||(r=r.pipe(new a.Utf8EncodeWorker)),o.createWorkerFrom(r,e,t)},_decompressWorker:function(){return this._data instanceof o?this._data.getContentWorker():this._data instanceof h?this._data:new i(this._data)}};for(var u=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],l=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},f=0;f<u.length;f++)n.prototype[u[f]]=l;t.exports=n;},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(e,l,t){(function(t){var r,n,e=t.MutationObserver||t.WebKitMutationObserver;if(e){var i=0,s=new e(u),a=t.document.createTextNode("");s.observe(a,{characterData:true}),r=function(){a.data=i=++i%2;};}else if(t.setImmediate||void 0===t.MessageChannel)r="document"in t&&"onreadystatechange"in t.document.createElement("script")?function(){var e=t.document.createElement("script");e.onreadystatechange=function(){u(),e.onreadystatechange=null,e.parentNode.removeChild(e),e=null;},t.document.documentElement.appendChild(e);}:function(){setTimeout(u,0);};else {var o=new t.MessageChannel;o.port1.onmessage=u,r=function(){o.port2.postMessage(0);};}var h=[];function u(){var e,t;n=true;for(var r=h.length;r;){for(t=h,h=[],e=-1;++e<r;)t[e]();r=h.length;}n=false;}l.exports=function(e){1!==h.push(e)||n||r();};}).call(this,"undefined"!=typeof commonjsGlobal?commonjsGlobal:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{});},{}],37:[function(e,t,r){var i=e("immediate");function u(){}var l={},s=["REJECTED"],a=["FULFILLED"],n=["PENDING"];function o(e){if("function"!=typeof e)throw new TypeError("resolver must be a function");this.state=n,this.queue=[],this.outcome=void 0,e!==u&&d(this,e);}function h(e,t,r){this.promise=e,"function"==typeof t&&(this.onFulfilled=t,this.callFulfilled=this.otherCallFulfilled),"function"==typeof r&&(this.onRejected=r,this.callRejected=this.otherCallRejected);}function f(t,r,n){i(function(){var e;try{e=r(n);}catch(e){return l.reject(t,e)}e===t?l.reject(t,new TypeError("Cannot resolve promise with itself")):l.resolve(t,e);});}function c(e){var t=e&&e.then;if(e&&("object"==typeof e||"function"==typeof e)&&"function"==typeof t)return function(){t.apply(e,arguments);}}function d(t,e){var r=false;function n(e){r||(r=true,l.reject(t,e));}function i(e){r||(r=true,l.resolve(t,e));}var s=p(function(){e(i,n);});"error"===s.status&&n(s.value);}function p(e,t){var r={};try{r.value=e(t),r.status="success";}catch(e){r.status="error",r.value=e;}return r}(t.exports=o).prototype.finally=function(t){if("function"!=typeof t)return this;var r=this.constructor;return this.then(function(e){return r.resolve(t()).then(function(){return e})},function(e){return r.resolve(t()).then(function(){throw e})})},o.prototype.catch=function(e){return this.then(null,e)},o.prototype.then=function(e,t){if("function"!=typeof e&&this.state===a||"function"!=typeof t&&this.state===s)return this;var r=new this.constructor(u);this.state!==n?f(r,this.state===a?e:t,this.outcome):this.queue.push(new h(r,e,t));return r},h.prototype.callFulfilled=function(e){l.resolve(this.promise,e);},h.prototype.otherCallFulfilled=function(e){f(this.promise,this.onFulfilled,e);},h.prototype.callRejected=function(e){l.reject(this.promise,e);},h.prototype.otherCallRejected=function(e){f(this.promise,this.onRejected,e);},l.resolve=function(e,t){var r=p(c,t);if("error"===r.status)return l.reject(e,r.value);var n=r.value;if(n)d(e,n);else {e.state=a,e.outcome=t;for(var i=-1,s=e.queue.length;++i<s;)e.queue[i].callFulfilled(t);}return e},l.reject=function(e,t){e.state=s,e.outcome=t;for(var r=-1,n=e.queue.length;++r<n;)e.queue[r].callRejected(t);return e},o.resolve=function(e){if(e instanceof this)return e;return l.resolve(new this(u),e)},o.reject=function(e){var t=new this(u);return l.reject(t,e)},o.all=function(e){var r=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var n=e.length,i=false;if(!n)return this.resolve([]);var s=new Array(n),a=0,t=-1,o=new this(u);for(;++t<n;)h(e[t],t);return o;function h(e,t){r.resolve(e).then(function(e){s[t]=e,++a!==n||i||(i=true,l.resolve(o,s));},function(e){i||(i=true,l.reject(o,e));});}},o.race=function(e){var t=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var r=e.length,n=false;if(!r)return this.resolve([]);var i=-1,s=new this(u);for(;++i<r;)a=e[i],t.resolve(a).then(function(e){n||(n=true,l.resolve(s,e));},function(e){n||(n=true,l.reject(s,e));});var a;return s};},{immediate:36}],38:[function(e,t,r){var n={};(0, e("./lib/utils/common").assign)(n,e("./lib/deflate"),e("./lib/inflate"),e("./lib/zlib/constants")),t.exports=n;},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(e,t,r){var a=e("./zlib/deflate"),o=e("./utils/common"),h=e("./utils/strings"),i=e("./zlib/messages"),s=e("./zlib/zstream"),u=Object.prototype.toString,l=0,f=-1,c=0,d=8;function p(e){if(!(this instanceof p))return new p(e);this.options=o.assign({level:f,method:d,chunkSize:16384,windowBits:15,memLevel:8,strategy:c,to:""},e||{});var t=this.options;t.raw&&0<t.windowBits?t.windowBits=-t.windowBits:t.gzip&&0<t.windowBits&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=false,this.chunks=[],this.strm=new s,this.strm.avail_out=0;var r=a.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(r!==l)throw new Error(i[r]);if(t.header&&a.deflateSetHeader(this.strm,t.header),t.dictionary){var n;if(n="string"==typeof t.dictionary?h.string2buf(t.dictionary):"[object ArrayBuffer]"===u.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,(r=a.deflateSetDictionary(this.strm,n))!==l)throw new Error(i[r]);this._dict_set=true;}}function n(e,t){var r=new p(t);if(r.push(e,true),r.err)throw r.msg||i[r.err];return r.result}p.prototype.push=function(e,t){var r,n,i=this.strm,s=this.options.chunkSize;if(this.ended)return  false;n=t===~~t?t:true===t?4:0,"string"==typeof e?i.input=h.string2buf(e):"[object ArrayBuffer]"===u.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;do{if(0===i.avail_out&&(i.output=new o.Buf8(s),i.next_out=0,i.avail_out=s),1!==(r=a.deflate(i,n))&&r!==l)return this.onEnd(r),!(this.ended=true);0!==i.avail_out&&(0!==i.avail_in||4!==n&&2!==n)||("string"===this.options.to?this.onData(h.buf2binstring(o.shrinkBuf(i.output,i.next_out))):this.onData(o.shrinkBuf(i.output,i.next_out)));}while((0<i.avail_in||0===i.avail_out)&&1!==r);return 4===n?(r=a.deflateEnd(this.strm),this.onEnd(r),this.ended=true,r===l):2!==n||(this.onEnd(l),!(i.avail_out=0))},p.prototype.onData=function(e){this.chunks.push(e);},p.prototype.onEnd=function(e){e===l&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg;},r.Deflate=p,r.deflate=n,r.deflateRaw=function(e,t){return (t=t||{}).raw=true,n(e,t)},r.gzip=function(e,t){return (t=t||{}).gzip=true,n(e,t)};},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(e,t,r){var c=e("./zlib/inflate"),d=e("./utils/common"),p=e("./utils/strings"),m=e("./zlib/constants"),n=e("./zlib/messages"),i=e("./zlib/zstream"),s=e("./zlib/gzheader"),_=Object.prototype.toString;function a(e){if(!(this instanceof a))return new a(e);this.options=d.assign({chunkSize:16384,windowBits:0,to:""},e||{});var t=this.options;t.raw&&0<=t.windowBits&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(0<=t.windowBits&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),15<t.windowBits&&t.windowBits<48&&0==(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg="",this.ended=false,this.chunks=[],this.strm=new i,this.strm.avail_out=0;var r=c.inflateInit2(this.strm,t.windowBits);if(r!==m.Z_OK)throw new Error(n[r]);this.header=new s,c.inflateGetHeader(this.strm,this.header);}function o(e,t){var r=new a(t);if(r.push(e,true),r.err)throw r.msg||n[r.err];return r.result}a.prototype.push=function(e,t){var r,n,i,s,a,o,h=this.strm,u=this.options.chunkSize,l=this.options.dictionary,f=false;if(this.ended)return  false;n=t===~~t?t:true===t?m.Z_FINISH:m.Z_NO_FLUSH,"string"==typeof e?h.input=p.binstring2buf(e):"[object ArrayBuffer]"===_.call(e)?h.input=new Uint8Array(e):h.input=e,h.next_in=0,h.avail_in=h.input.length;do{if(0===h.avail_out&&(h.output=new d.Buf8(u),h.next_out=0,h.avail_out=u),(r=c.inflate(h,m.Z_NO_FLUSH))===m.Z_NEED_DICT&&l&&(o="string"==typeof l?p.string2buf(l):"[object ArrayBuffer]"===_.call(l)?new Uint8Array(l):l,r=c.inflateSetDictionary(this.strm,o)),r===m.Z_BUF_ERROR&&true===f&&(r=m.Z_OK,f=false),r!==m.Z_STREAM_END&&r!==m.Z_OK)return this.onEnd(r),!(this.ended=true);h.next_out&&(0!==h.avail_out&&r!==m.Z_STREAM_END&&(0!==h.avail_in||n!==m.Z_FINISH&&n!==m.Z_SYNC_FLUSH)||("string"===this.options.to?(i=p.utf8border(h.output,h.next_out),s=h.next_out-i,a=p.buf2string(h.output,i),h.next_out=s,h.avail_out=u-s,s&&d.arraySet(h.output,h.output,i,s,0),this.onData(a)):this.onData(d.shrinkBuf(h.output,h.next_out)))),0===h.avail_in&&0===h.avail_out&&(f=true);}while((0<h.avail_in||0===h.avail_out)&&r!==m.Z_STREAM_END);return r===m.Z_STREAM_END&&(n=m.Z_FINISH),n===m.Z_FINISH?(r=c.inflateEnd(this.strm),this.onEnd(r),this.ended=true,r===m.Z_OK):n!==m.Z_SYNC_FLUSH||(this.onEnd(m.Z_OK),!(h.avail_out=0))},a.prototype.onData=function(e){this.chunks.push(e);},a.prototype.onEnd=function(e){e===m.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=d.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg;},r.Inflate=a,r.inflate=o,r.inflateRaw=function(e,t){return (t=t||{}).raw=true,o(e,t)},r.ungzip=o;},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(e,t,r){var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;r.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var r=t.shift();if(r){if("object"!=typeof r)throw new TypeError(r+"must be non-object");for(var n in r)r.hasOwnProperty(n)&&(e[n]=r[n]);}}return e},r.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var i={arraySet:function(e,t,r,n,i){if(t.subarray&&e.subarray)e.set(t.subarray(r,r+n),i);else for(var s=0;s<n;s++)e[i+s]=t[r+s];},flattenChunks:function(e){var t,r,n,i,s,a;for(t=n=0,r=e.length;t<r;t++)n+=e[t].length;for(a=new Uint8Array(n),t=i=0,r=e.length;t<r;t++)s=e[t],a.set(s,i),i+=s.length;return a}},s={arraySet:function(e,t,r,n,i){for(var s=0;s<n;s++)e[i+s]=t[r+s];},flattenChunks:function(e){return [].concat.apply([],e)}};r.setTyped=function(e){e?(r.Buf8=Uint8Array,r.Buf16=Uint16Array,r.Buf32=Int32Array,r.assign(r,i)):(r.Buf8=Array,r.Buf16=Array,r.Buf32=Array,r.assign(r,s));},r.setTyped(n);},{}],42:[function(e,t,r){var h=e("./common"),i=true,s=true;try{String.fromCharCode.apply(null,[0]);}catch(e){i=false;}try{String.fromCharCode.apply(null,new Uint8Array(1));}catch(e){s=false;}for(var u=new h.Buf8(256),n=0;n<256;n++)u[n]=252<=n?6:248<=n?5:240<=n?4:224<=n?3:192<=n?2:1;function l(e,t){if(t<65537&&(e.subarray&&s||!e.subarray&&i))return String.fromCharCode.apply(null,h.shrinkBuf(e,t));for(var r="",n=0;n<t;n++)r+=String.fromCharCode(e[n]);return r}u[254]=u[254]=1,r.string2buf=function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=new h.Buf8(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t},r.buf2binstring=function(e){return l(e,e.length)},r.binstring2buf=function(e){for(var t=new h.Buf8(e.length),r=0,n=t.length;r<n;r++)t[r]=e.charCodeAt(r);return t},r.buf2string=function(e,t){var r,n,i,s,a=t||e.length,o=new Array(2*a);for(r=n=0;r<a;)if((i=e[r++])<128)o[n++]=i;else if(4<(s=u[i]))o[n++]=65533,r+=s-1;else {for(i&=2===s?31:3===s?15:7;1<s&&r<a;)i=i<<6|63&e[r++],s--;1<s?o[n++]=65533:i<65536?o[n++]=i:(i-=65536,o[n++]=55296|i>>10&1023,o[n++]=56320|1023&i);}return l(o,n)},r.utf8border=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t};},{"./common":41}],43:[function(e,t,r){t.exports=function(e,t,r,n){for(var i=65535&e|0,s=e>>>16&65535|0,a=0;0!==r;){for(r-=a=2e3<r?2e3:r;s=s+(i=i+t[n++]|0)|0,--a;);i%=65521,s%=65521;}return i|s<<16|0};},{}],44:[function(e,t,r){t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8};},{}],45:[function(e,t,r){var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e;}return t}();t.exports=function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return  -1^e};},{}],46:[function(e,t,r){var h,c=e("../utils/common"),u=e("./trees"),d=e("./adler32"),p=e("./crc32"),n=e("./messages"),l=0,f=4,m=0,_=-2,g=-1,b=4,i=2,v=8,y=9,s=286,a=30,o=19,w=2*s+1,k=15,x=3,S=258,z=S+x+1,C=42,E=113,A=1,I=2,O=3,B=4;function R(e,t){return e.msg=n[t],t}function T(e){return (e<<1)-(4<e?9:0)}function D(e){for(var t=e.length;0<=--t;)e[t]=0;}function F(e){var t=e.state,r=t.pending;r>e.avail_out&&(r=e.avail_out),0!==r&&(c.arraySet(e.output,t.pending_buf,t.pending_out,r,e.next_out),e.next_out+=r,t.pending_out+=r,e.total_out+=r,e.avail_out-=r,t.pending-=r,0===t.pending&&(t.pending_out=0));}function N(e,t){u._tr_flush_block(e,0<=e.block_start?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,F(e.strm);}function U(e,t){e.pending_buf[e.pending++]=t;}function P(e,t){e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t;}function L(e,t){var r,n,i=e.max_chain_length,s=e.strstart,a=e.prev_length,o=e.nice_match,h=e.strstart>e.w_size-z?e.strstart-(e.w_size-z):0,u=e.window,l=e.w_mask,f=e.prev,c=e.strstart+S,d=u[s+a-1],p=u[s+a];e.prev_length>=e.good_match&&(i>>=2),o>e.lookahead&&(o=e.lookahead);do{if(u[(r=t)+a]===p&&u[r+a-1]===d&&u[r]===u[s]&&u[++r]===u[s+1]){s+=2,r++;do{}while(u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&s<c);if(n=S-(c-s),s=c-S,a<n){if(e.match_start=t,o<=(a=n))break;d=u[s+a-1],p=u[s+a];}}}while((t=f[t&l])>h&&0!=--i);return a<=e.lookahead?a:e.lookahead}function j(e){var t,r,n,i,s,a,o,h,u,l,f=e.w_size;do{if(i=e.window_size-e.lookahead-e.strstart,e.strstart>=f+(f-z)){for(c.arraySet(e.window,e.window,f,f,0),e.match_start-=f,e.strstart-=f,e.block_start-=f,t=r=e.hash_size;n=e.head[--t],e.head[t]=f<=n?n-f:0,--r;);for(t=r=f;n=e.prev[--t],e.prev[t]=f<=n?n-f:0,--r;);i+=f;}if(0===e.strm.avail_in)break;if(a=e.strm,o=e.window,h=e.strstart+e.lookahead,u=i,l=void 0,l=a.avail_in,u<l&&(l=u),r=0===l?0:(a.avail_in-=l,c.arraySet(o,a.input,a.next_in,l,h),1===a.state.wrap?a.adler=d(a.adler,o,l,h):2===a.state.wrap&&(a.adler=p(a.adler,o,l,h)),a.next_in+=l,a.total_in+=l,l),e.lookahead+=r,e.lookahead+e.insert>=x)for(s=e.strstart-e.insert,e.ins_h=e.window[s],e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+1])&e.hash_mask;e.insert&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+x-1])&e.hash_mask,e.prev[s&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=s,s++,e.insert--,!(e.lookahead+e.insert<x)););}while(e.lookahead<z&&0!==e.strm.avail_in)}function Z(e,t){for(var r,n;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==r&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r)),e.match_length>=x)if(n=u._tr_tally(e,e.strstart-e.match_start,e.match_length-x),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=x){for(e.match_length--;e.strstart++,e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart,0!=--e.match_length;);e.strstart++;}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+1])&e.hash_mask;else n=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(n&&(N(e,false),0===e.strm.avail_out))return A}return e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,true),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,false),0===e.strm.avail_out)?A:I}function W(e,t){for(var r,n,i;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=x-1,0!==r&&e.prev_length<e.max_lazy_match&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r),e.match_length<=5&&(1===e.strategy||e.match_length===x&&4096<e.strstart-e.match_start)&&(e.match_length=x-1)),e.prev_length>=x&&e.match_length<=e.prev_length){for(i=e.strstart+e.lookahead-x,n=u._tr_tally(e,e.strstart-1-e.prev_match,e.prev_length-x),e.lookahead-=e.prev_length-1,e.prev_length-=2;++e.strstart<=i&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!=--e.prev_length;);if(e.match_available=0,e.match_length=x-1,e.strstart++,n&&(N(e,false),0===e.strm.avail_out))return A}else if(e.match_available){if((n=u._tr_tally(e,0,e.window[e.strstart-1]))&&N(e,false),e.strstart++,e.lookahead--,0===e.strm.avail_out)return A}else e.match_available=1,e.strstart++,e.lookahead--;}return e.match_available&&(n=u._tr_tally(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,true),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,false),0===e.strm.avail_out)?A:I}function M(e,t,r,n,i){this.good_length=e,this.max_lazy=t,this.nice_length=r,this.max_chain=n,this.func=i;}function H(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=v,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new c.Buf16(2*w),this.dyn_dtree=new c.Buf16(2*(2*a+1)),this.bl_tree=new c.Buf16(2*(2*o+1)),D(this.dyn_ltree),D(this.dyn_dtree),D(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new c.Buf16(k+1),this.heap=new c.Buf16(2*s+1),D(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new c.Buf16(2*s+1),D(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0;}function G(e){var t;return e&&e.state?(e.total_in=e.total_out=0,e.data_type=i,(t=e.state).pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap?C:E,e.adler=2===t.wrap?0:1,t.last_flush=l,u._tr_init(t),m):R(e,_)}function K(e){var t=G(e);return t===m&&function(e){e.window_size=2*e.w_size,D(e.head),e.max_lazy_match=h[e.level].max_lazy,e.good_match=h[e.level].good_length,e.nice_match=h[e.level].nice_length,e.max_chain_length=h[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=x-1,e.match_available=0,e.ins_h=0;}(e.state),t}function Y(e,t,r,n,i,s){if(!e)return _;var a=1;if(t===g&&(t=6),n<0?(a=0,n=-n):15<n&&(a=2,n-=16),i<1||y<i||r!==v||n<8||15<n||t<0||9<t||s<0||b<s)return R(e,_);8===n&&(n=9);var o=new H;return (e.state=o).strm=e,o.wrap=a,o.gzhead=null,o.w_bits=n,o.w_size=1<<o.w_bits,o.w_mask=o.w_size-1,o.hash_bits=i+7,o.hash_size=1<<o.hash_bits,o.hash_mask=o.hash_size-1,o.hash_shift=~~((o.hash_bits+x-1)/x),o.window=new c.Buf8(2*o.w_size),o.head=new c.Buf16(o.hash_size),o.prev=new c.Buf16(o.w_size),o.lit_bufsize=1<<i+6,o.pending_buf_size=4*o.lit_bufsize,o.pending_buf=new c.Buf8(o.pending_buf_size),o.d_buf=1*o.lit_bufsize,o.l_buf=3*o.lit_bufsize,o.level=t,o.strategy=s,o.method=r,K(e)}h=[new M(0,0,0,0,function(e,t){var r=65535;for(r>e.pending_buf_size-5&&(r=e.pending_buf_size-5);;){if(e.lookahead<=1){if(j(e),0===e.lookahead&&t===l)return A;if(0===e.lookahead)break}e.strstart+=e.lookahead,e.lookahead=0;var n=e.block_start+r;if((0===e.strstart||e.strstart>=n)&&(e.lookahead=e.strstart-n,e.strstart=n,N(e,false),0===e.strm.avail_out))return A;if(e.strstart-e.block_start>=e.w_size-z&&(N(e,false),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,true),0===e.strm.avail_out?O:B):(e.strstart>e.block_start&&(N(e,false),e.strm.avail_out),A)}),new M(4,4,8,4,Z),new M(4,5,16,8,Z),new M(4,6,32,32,Z),new M(4,4,16,16,W),new M(8,16,32,32,W),new M(8,16,128,128,W),new M(8,32,128,256,W),new M(32,128,258,1024,W),new M(32,258,258,4096,W)],r.deflateInit=function(e,t){return Y(e,t,v,15,8,0)},r.deflateInit2=Y,r.deflateReset=K,r.deflateResetKeep=G,r.deflateSetHeader=function(e,t){return e&&e.state?2!==e.state.wrap?_:(e.state.gzhead=t,m):_},r.deflate=function(e,t){var r,n,i,s;if(!e||!e.state||5<t||t<0)return e?R(e,_):_;if(n=e.state,!e.output||!e.input&&0!==e.avail_in||666===n.status&&t!==f)return R(e,0===e.avail_out?-5:_);if(n.strm=e,r=n.last_flush,n.last_flush=t,n.status===C)if(2===n.wrap)e.adler=0,U(n,31),U(n,139),U(n,8),n.gzhead?(U(n,(n.gzhead.text?1:0)+(n.gzhead.hcrc?2:0)+(n.gzhead.extra?4:0)+(n.gzhead.name?8:0)+(n.gzhead.comment?16:0)),U(n,255&n.gzhead.time),U(n,n.gzhead.time>>8&255),U(n,n.gzhead.time>>16&255),U(n,n.gzhead.time>>24&255),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,255&n.gzhead.os),n.gzhead.extra&&n.gzhead.extra.length&&(U(n,255&n.gzhead.extra.length),U(n,n.gzhead.extra.length>>8&255)),n.gzhead.hcrc&&(e.adler=p(e.adler,n.pending_buf,n.pending,0)),n.gzindex=0,n.status=69):(U(n,0),U(n,0),U(n,0),U(n,0),U(n,0),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,3),n.status=E);else {var a=v+(n.w_bits-8<<4)<<8;a|=(2<=n.strategy||n.level<2?0:n.level<6?1:6===n.level?2:3)<<6,0!==n.strstart&&(a|=32),a+=31-a%31,n.status=E,P(n,a),0!==n.strstart&&(P(n,e.adler>>>16),P(n,65535&e.adler)),e.adler=1;}if(69===n.status)if(n.gzhead.extra){for(i=n.pending;n.gzindex<(65535&n.gzhead.extra.length)&&(n.pending!==n.pending_buf_size||(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending!==n.pending_buf_size));)U(n,255&n.gzhead.extra[n.gzindex]),n.gzindex++;n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),n.gzindex===n.gzhead.extra.length&&(n.gzindex=0,n.status=73);}else n.status=73;if(73===n.status)if(n.gzhead.name){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.name.length?255&n.gzhead.name.charCodeAt(n.gzindex++):0,U(n,s);}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.gzindex=0,n.status=91);}else n.status=91;if(91===n.status)if(n.gzhead.comment){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.comment.length?255&n.gzhead.comment.charCodeAt(n.gzindex++):0,U(n,s);}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.status=103);}else n.status=103;if(103===n.status&&(n.gzhead.hcrc?(n.pending+2>n.pending_buf_size&&F(e),n.pending+2<=n.pending_buf_size&&(U(n,255&e.adler),U(n,e.adler>>8&255),e.adler=0,n.status=E)):n.status=E),0!==n.pending){if(F(e),0===e.avail_out)return n.last_flush=-1,m}else if(0===e.avail_in&&T(t)<=T(r)&&t!==f)return R(e,-5);if(666===n.status&&0!==e.avail_in)return R(e,-5);if(0!==e.avail_in||0!==n.lookahead||t!==l&&666!==n.status){var o=2===n.strategy?function(e,t){for(var r;;){if(0===e.lookahead&&(j(e),0===e.lookahead)){if(t===l)return A;break}if(e.match_length=0,r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,r&&(N(e,false),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,true),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,false),0===e.strm.avail_out)?A:I}(n,t):3===n.strategy?function(e,t){for(var r,n,i,s,a=e.window;;){if(e.lookahead<=S){if(j(e),e.lookahead<=S&&t===l)return A;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=x&&0<e.strstart&&(n=a[i=e.strstart-1])===a[++i]&&n===a[++i]&&n===a[++i]){s=e.strstart+S;do{}while(n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&i<s);e.match_length=S-(s-i),e.match_length>e.lookahead&&(e.match_length=e.lookahead);}if(e.match_length>=x?(r=u._tr_tally(e,1,e.match_length-x),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),r&&(N(e,false),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,true),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,false),0===e.strm.avail_out)?A:I}(n,t):h[n.level].func(n,t);if(o!==O&&o!==B||(n.status=666),o===A||o===O)return 0===e.avail_out&&(n.last_flush=-1),m;if(o===I&&(1===t?u._tr_align(n):5!==t&&(u._tr_stored_block(n,0,0,false),3===t&&(D(n.head),0===n.lookahead&&(n.strstart=0,n.block_start=0,n.insert=0))),F(e),0===e.avail_out))return n.last_flush=-1,m}return t!==f?m:n.wrap<=0?1:(2===n.wrap?(U(n,255&e.adler),U(n,e.adler>>8&255),U(n,e.adler>>16&255),U(n,e.adler>>24&255),U(n,255&e.total_in),U(n,e.total_in>>8&255),U(n,e.total_in>>16&255),U(n,e.total_in>>24&255)):(P(n,e.adler>>>16),P(n,65535&e.adler)),F(e),0<n.wrap&&(n.wrap=-n.wrap),0!==n.pending?m:1)},r.deflateEnd=function(e){var t;return e&&e.state?(t=e.state.status)!==C&&69!==t&&73!==t&&91!==t&&103!==t&&t!==E&&666!==t?R(e,_):(e.state=null,t===E?R(e,-3):m):_},r.deflateSetDictionary=function(e,t){var r,n,i,s,a,o,h,u,l=t.length;if(!e||!e.state)return _;if(2===(s=(r=e.state).wrap)||1===s&&r.status!==C||r.lookahead)return _;for(1===s&&(e.adler=d(e.adler,t,l,0)),r.wrap=0,l>=r.w_size&&(0===s&&(D(r.head),r.strstart=0,r.block_start=0,r.insert=0),u=new c.Buf8(r.w_size),c.arraySet(u,t,l-r.w_size,r.w_size,0),t=u,l=r.w_size),a=e.avail_in,o=e.next_in,h=e.input,e.avail_in=l,e.next_in=0,e.input=t,j(r);r.lookahead>=x;){for(n=r.strstart,i=r.lookahead-(x-1);r.ins_h=(r.ins_h<<r.hash_shift^r.window[n+x-1])&r.hash_mask,r.prev[n&r.w_mask]=r.head[r.ins_h],r.head[r.ins_h]=n,n++,--i;);r.strstart=n,r.lookahead=x-1,j(r);}return r.strstart+=r.lookahead,r.block_start=r.strstart,r.insert=r.lookahead,r.lookahead=0,r.match_length=r.prev_length=x-1,r.match_available=0,e.next_in=o,e.input=h,e.avail_in=a,r.wrap=s,m},r.deflateInfo="pako deflate (from Nodeca project)";},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(e,t,r){t.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=false;};},{}],48:[function(e,t,r){t.exports=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C;r=e.state,n=e.next_in,z=e.input,i=n+(e.avail_in-5),s=e.next_out,C=e.output,a=s-(t-e.avail_out),o=s+(e.avail_out-257),h=r.dmax,u=r.wsize,l=r.whave,f=r.wnext,c=r.window,d=r.hold,p=r.bits,m=r.lencode,_=r.distcode,g=(1<<r.lenbits)-1,b=(1<<r.distbits)-1;e:do{p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=m[d&g];t:for(;;){if(d>>>=y=v>>>24,p-=y,0===(y=v>>>16&255))C[s++]=65535&v;else {if(!(16&y)){if(0==(64&y)){v=m[(65535&v)+(d&(1<<y)-1)];continue t}if(32&y){r.mode=12;break e}e.msg="invalid literal/length code",r.mode=30;break e}w=65535&v,(y&=15)&&(p<y&&(d+=z[n++]<<p,p+=8),w+=d&(1<<y)-1,d>>>=y,p-=y),p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=_[d&b];r:for(;;){if(d>>>=y=v>>>24,p-=y,!(16&(y=v>>>16&255))){if(0==(64&y)){v=_[(65535&v)+(d&(1<<y)-1)];continue r}e.msg="invalid distance code",r.mode=30;break e}if(k=65535&v,p<(y&=15)&&(d+=z[n++]<<p,(p+=8)<y&&(d+=z[n++]<<p,p+=8)),h<(k+=d&(1<<y)-1)){e.msg="invalid distance too far back",r.mode=30;break e}if(d>>>=y,p-=y,(y=s-a)<k){if(l<(y=k-y)&&r.sane){e.msg="invalid distance too far back",r.mode=30;break e}if(S=c,(x=0)===f){if(x+=u-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C;}}else if(f<y){if(x+=u+f-y,(y-=f)<w){for(w-=y;C[s++]=c[x++],--y;);if(x=0,f<w){for(w-=y=f;C[s++]=c[x++],--y;);x=s-k,S=C;}}}else if(x+=f-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C;}for(;2<w;)C[s++]=S[x++],C[s++]=S[x++],C[s++]=S[x++],w-=3;w&&(C[s++]=S[x++],1<w&&(C[s++]=S[x++]));}else {for(x=s-k;C[s++]=C[x++],C[s++]=C[x++],C[s++]=C[x++],2<(w-=3););w&&(C[s++]=C[x++],1<w&&(C[s++]=C[x++]));}break}}break}}while(n<i&&s<o);n-=w=p>>3,d&=(1<<(p-=w<<3))-1,e.next_in=n,e.next_out=s,e.avail_in=n<i?i-n+5:5-(n-i),e.avail_out=s<o?o-s+257:257-(s-o),r.hold=d,r.bits=p;};},{}],49:[function(e,t,r){var I=e("../utils/common"),O=e("./adler32"),B=e("./crc32"),R=e("./inffast"),T=e("./inftrees"),D=1,F=2,N=0,U=-2,P=1,n=852,i=592;function L(e){return (e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function s(){this.mode=0,this.last=false,this.wrap=0,this.havedict=false,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new I.Buf16(320),this.work=new I.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0;}function a(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=P,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new I.Buf32(n),t.distcode=t.distdyn=new I.Buf32(i),t.sane=1,t.back=-1,N):U}function o(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,a(e)):U}function h(e,t){var r,n;return e&&e.state?(n=e.state,t<0?(r=0,t=-t):(r=1+(t>>4),t<48&&(t&=15)),t&&(t<8||15<t)?U:(null!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=r,n.wbits=t,o(e))):U}function u(e,t){var r,n;return e?(n=new s,(e.state=n).window=null,(r=h(e,t))!==N&&(e.state=null),r):U}var l,f,c=true;function j(e){if(c){var t;for(l=new I.Buf32(512),f=new I.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(T(D,e.lens,0,288,l,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;T(F,e.lens,0,32,f,0,e.work,{bits:5}),c=false;}e.lencode=l,e.lenbits=9,e.distcode=f,e.distbits=5;}function Z(e,t,r,n){var i,s=e.state;return null===s.window&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new I.Buf8(s.wsize)),n>=s.wsize?(I.arraySet(s.window,t,r-s.wsize,s.wsize,0),s.wnext=0,s.whave=s.wsize):(n<(i=s.wsize-s.wnext)&&(i=n),I.arraySet(s.window,t,r-n,i,s.wnext),(n-=i)?(I.arraySet(s.window,t,r-n,n,0),s.wnext=n,s.whave=s.wsize):(s.wnext+=i,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=i))),0}r.inflateReset=o,r.inflateReset2=h,r.inflateResetKeep=a,r.inflateInit=function(e){return u(e,15)},r.inflateInit2=u,r.inflate=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C=0,E=new I.Buf8(4),A=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return U;12===(r=e.state).mode&&(r.mode=13),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,f=o,c=h,x=N;e:for(;;)switch(r.mode){case P:if(0===r.wrap){r.mode=13;break}for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}if(2&r.wrap&&35615===u){E[r.check=0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0),l=u=0,r.mode=2;break}if(r.flags=0,r.head&&(r.head.done=false),!(1&r.wrap)||(((255&u)<<8)+(u>>8))%31){e.msg="incorrect header check",r.mode=30;break}if(8!=(15&u)){e.msg="unknown compression method",r.mode=30;break}if(l-=4,k=8+(15&(u>>>=4)),0===r.wbits)r.wbits=k;else if(k>r.wbits){e.msg="invalid window size",r.mode=30;break}r.dmax=1<<k,e.adler=r.check=1,r.mode=512&u?10:12,l=u=0;break;case 2:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}if(r.flags=u,8!=(255&r.flags)){e.msg="unknown compression method",r.mode=30;break}if(57344&r.flags){e.msg="unknown header flags set",r.mode=30;break}r.head&&(r.head.text=u>>8&1),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=3;case 3:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}r.head&&(r.head.time=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,E[2]=u>>>16&255,E[3]=u>>>24&255,r.check=B(r.check,E,4,0)),l=u=0,r.mode=4;case 4:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}r.head&&(r.head.xflags=255&u,r.head.os=u>>8),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=5;case 5:if(1024&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}r.length=u,r.head&&(r.head.extra_len=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0;}else r.head&&(r.head.extra=null);r.mode=6;case 6:if(1024&r.flags&&(o<(d=r.length)&&(d=o),d&&(r.head&&(k=r.head.extra_len-r.length,r.head.extra||(r.head.extra=new Array(r.head.extra_len)),I.arraySet(r.head.extra,n,s,d,k)),512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,r.length-=d),r.length))break e;r.length=0,r.mode=7;case 7:if(2048&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.name+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.name=null);r.length=0,r.mode=8;case 8:if(4096&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.comment+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.comment=null);r.mode=9;case 9:if(512&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}if(u!==(65535&r.check)){e.msg="header crc mismatch",r.mode=30;break}l=u=0;}r.head&&(r.head.hcrc=r.flags>>9&1,r.head.done=true),e.adler=r.check=0,r.mode=12;break;case 10:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}e.adler=r.check=L(u),l=u=0,r.mode=11;case 11:if(0===r.havedict)return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,2;e.adler=r.check=1,r.mode=12;case 12:if(5===t||6===t)break e;case 13:if(r.last){u>>>=7&l,l-=7&l,r.mode=27;break}for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}switch(r.last=1&u,l-=1,3&(u>>>=1)){case 0:r.mode=14;break;case 1:if(j(r),r.mode=20,6!==t)break;u>>>=2,l-=2;break e;case 2:r.mode=17;break;case 3:e.msg="invalid block type",r.mode=30;}u>>>=2,l-=2;break;case 14:for(u>>>=7&l,l-=7&l;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}if((65535&u)!=(u>>>16^65535)){e.msg="invalid stored block lengths",r.mode=30;break}if(r.length=65535&u,l=u=0,r.mode=15,6===t)break e;case 15:r.mode=16;case 16:if(d=r.length){if(o<d&&(d=o),h<d&&(d=h),0===d)break e;I.arraySet(i,n,s,d,a),o-=d,s+=d,h-=d,a+=d,r.length-=d;break}r.mode=12;break;case 17:for(;l<14;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}if(r.nlen=257+(31&u),u>>>=5,l-=5,r.ndist=1+(31&u),u>>>=5,l-=5,r.ncode=4+(15&u),u>>>=4,l-=4,286<r.nlen||30<r.ndist){e.msg="too many length or distance symbols",r.mode=30;break}r.have=0,r.mode=18;case 18:for(;r.have<r.ncode;){for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}r.lens[A[r.have++]]=7&u,u>>>=3,l-=3;}for(;r.have<19;)r.lens[A[r.have++]]=0;if(r.lencode=r.lendyn,r.lenbits=7,S={bits:r.lenbits},x=T(0,r.lens,0,19,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid code lengths set",r.mode=30;break}r.have=0,r.mode=19;case 19:for(;r.have<r.nlen+r.ndist;){for(;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}if(b<16)u>>>=_,l-=_,r.lens[r.have++]=b;else {if(16===b){for(z=_+2;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}if(u>>>=_,l-=_,0===r.have){e.msg="invalid bit length repeat",r.mode=30;break}k=r.lens[r.have-1],d=3+(3&u),u>>>=2,l-=2;}else if(17===b){for(z=_+3;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}l-=_,k=0,d=3+(7&(u>>>=_)),u>>>=3,l-=3;}else {for(z=_+7;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}l-=_,k=0,d=11+(127&(u>>>=_)),u>>>=7,l-=7;}if(r.have+d>r.nlen+r.ndist){e.msg="invalid bit length repeat",r.mode=30;break}for(;d--;)r.lens[r.have++]=k;}}if(30===r.mode)break;if(0===r.lens[256]){e.msg="invalid code -- missing end-of-block",r.mode=30;break}if(r.lenbits=9,S={bits:r.lenbits},x=T(D,r.lens,0,r.nlen,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid literal/lengths set",r.mode=30;break}if(r.distbits=6,r.distcode=r.distdyn,S={bits:r.distbits},x=T(F,r.lens,r.nlen,r.ndist,r.distcode,0,r.work,S),r.distbits=S.bits,x){e.msg="invalid distances set",r.mode=30;break}if(r.mode=20,6===t)break e;case 20:r.mode=21;case 21:if(6<=o&&258<=h){e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,R(e,c),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,12===r.mode&&(r.back=-1);break}for(r.back=0;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}if(g&&0==(240&g)){for(v=_,y=g,w=b;g=(C=r.lencode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}u>>>=v,l-=v,r.back+=v;}if(u>>>=_,l-=_,r.back+=_,r.length=b,0===g){r.mode=26;break}if(32&g){r.back=-1,r.mode=12;break}if(64&g){e.msg="invalid literal/length code",r.mode=30;break}r.extra=15&g,r.mode=22;case 22:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}r.length+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra;}r.was=r.length,r.mode=23;case 23:for(;g=(C=r.distcode[u&(1<<r.distbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}if(0==(240&g)){for(v=_,y=g,w=b;g=(C=r.distcode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}u>>>=v,l-=v,r.back+=v;}if(u>>>=_,l-=_,r.back+=_,64&g){e.msg="invalid distance code",r.mode=30;break}r.offset=b,r.extra=15&g,r.mode=24;case 24:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}r.offset+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra;}if(r.offset>r.dmax){e.msg="invalid distance too far back",r.mode=30;break}r.mode=25;case 25:if(0===h)break e;if(d=c-h,r.offset>d){if((d=r.offset-d)>r.whave&&r.sane){e.msg="invalid distance too far back",r.mode=30;break}p=d>r.wnext?(d-=r.wnext,r.wsize-d):r.wnext-d,d>r.length&&(d=r.length),m=r.window;}else m=i,p=a-r.offset,d=r.length;for(h<d&&(d=h),h-=d,r.length-=d;i[a++]=m[p++],--d;);0===r.length&&(r.mode=21);break;case 26:if(0===h)break e;i[a++]=r.length,h--,r.mode=21;break;case 27:if(r.wrap){for(;l<32;){if(0===o)break e;o--,u|=n[s++]<<l,l+=8;}if(c-=h,e.total_out+=c,r.total+=c,c&&(e.adler=r.check=r.flags?B(r.check,i,c,a-c):O(r.check,i,c,a-c)),c=h,(r.flags?u:L(u))!==r.check){e.msg="incorrect data check",r.mode=30;break}l=u=0;}r.mode=28;case 28:if(r.wrap&&r.flags){for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8;}if(u!==(4294967295&r.total)){e.msg="incorrect length check",r.mode=30;break}l=u=0;}r.mode=29;case 29:x=1;break e;case 30:x=-3;break e;case 31:return  -4;case 32:default:return U}return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,(r.wsize||c!==e.avail_out&&r.mode<30&&(r.mode<27||4!==t))&&Z(e,e.output,e.next_out,c-e.avail_out)?(r.mode=31,-4):(f-=e.avail_in,c-=e.avail_out,e.total_in+=f,e.total_out+=c,r.total+=c,r.wrap&&c&&(e.adler=r.check=r.flags?B(r.check,i,c,e.next_out-c):O(r.check,i,c,e.next_out-c)),e.data_type=r.bits+(r.last?64:0)+(12===r.mode?128:0)+(20===r.mode||15===r.mode?256:0),(0==f&&0===c||4===t)&&x===N&&(x=-5),x)},r.inflateEnd=function(e){if(!e||!e.state)return U;var t=e.state;return t.window&&(t.window=null),e.state=null,N},r.inflateGetHeader=function(e,t){var r;return e&&e.state?0==(2&(r=e.state).wrap)?U:((r.head=t).done=false,N):U},r.inflateSetDictionary=function(e,t){var r,n=t.length;return e&&e.state?0!==(r=e.state).wrap&&11!==r.mode?U:11===r.mode&&O(1,t,n,0)!==r.check?-3:Z(e,t,n,n)?(r.mode=31,-4):(r.havedict=1,N):U},r.inflateInfo="pako inflate (from Nodeca project)";},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(e,t,r){var D=e("../utils/common"),F=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],N=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],U=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],P=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,r,n,i,s,a,o){var h,u,l,f,c,d,p,m,_,g=o.bits,b=0,v=0,y=0,w=0,k=0,x=0,S=0,z=0,C=0,E=0,A=null,I=0,O=new D.Buf16(16),B=new D.Buf16(16),R=null,T=0;for(b=0;b<=15;b++)O[b]=0;for(v=0;v<n;v++)O[t[r+v]]++;for(k=g,w=15;1<=w&&0===O[w];w--);if(w<k&&(k=w),0===w)return i[s++]=20971520,i[s++]=20971520,o.bits=1,0;for(y=1;y<w&&0===O[y];y++);for(k<y&&(k=y),b=z=1;b<=15;b++)if(z<<=1,(z-=O[b])<0)return  -1;if(0<z&&(0===e||1!==w))return  -1;for(B[1]=0,b=1;b<15;b++)B[b+1]=B[b]+O[b];for(v=0;v<n;v++)0!==t[r+v]&&(a[B[t[r+v]]++]=v);if(d=0===e?(A=R=a,19):1===e?(A=F,I-=257,R=N,T-=257,256):(A=U,R=P,-1),b=y,c=s,S=v=E=0,l=-1,f=(C=1<<(x=k))-1,1===e&&852<C||2===e&&592<C)return 1;for(;;){for(p=b-S,_=a[v]<d?(m=0,a[v]):a[v]>d?(m=R[T+a[v]],A[I+a[v]]):(m=96,0),h=1<<b-S,y=u=1<<x;i[c+(E>>S)+(u-=h)]=p<<24|m<<16|_|0,0!==u;);for(h=1<<b-1;E&h;)h>>=1;if(0!==h?(E&=h-1,E+=h):E=0,v++,0==--O[b]){if(b===w)break;b=t[r+a[v]];}if(k<b&&(E&f)!==l){for(0===S&&(S=k),c+=y,z=1<<(x=b-S);x+S<w&&!((z-=O[x+S])<=0);)x++,z<<=1;if(C+=1<<x,1===e&&852<C||2===e&&592<C)return 1;i[l=E&f]=k<<24|x<<16|c-s|0;}}return 0!==E&&(i[c+E]=b-S<<24|64<<16|0),o.bits=k,0};},{"../utils/common":41}],51:[function(e,t,r){t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"};},{}],52:[function(e,t,r){var i=e("../utils/common"),o=0,h=1;function n(e){for(var t=e.length;0<=--t;)e[t]=0;}var s=0,a=29,u=256,l=u+1+a,f=30,c=19,_=2*l+1,g=15,d=16,p=7,m=256,b=16,v=17,y=18,w=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],k=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],x=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],S=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],z=new Array(2*(l+2));n(z);var C=new Array(2*f);n(C);var E=new Array(512);n(E);var A=new Array(256);n(A);var I=new Array(a);n(I);var O,B,R,T=new Array(f);function D(e,t,r,n,i){this.static_tree=e,this.extra_bits=t,this.extra_base=r,this.elems=n,this.max_length=i,this.has_stree=e&&e.length;}function F(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t;}function N(e){return e<256?E[e]:E[256+(e>>>7)]}function U(e,t){e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255;}function P(e,t,r){e.bi_valid>d-r?(e.bi_buf|=t<<e.bi_valid&65535,U(e,e.bi_buf),e.bi_buf=t>>d-e.bi_valid,e.bi_valid+=r-d):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=r);}function L(e,t,r){P(e,r[2*t],r[2*t+1]);}function j(e,t){for(var r=0;r|=1&e,e>>>=1,r<<=1,0<--t;);return r>>>1}function Z(e,t,r){var n,i,s=new Array(g+1),a=0;for(n=1;n<=g;n++)s[n]=a=a+r[n-1]<<1;for(i=0;i<=t;i++){var o=e[2*i+1];0!==o&&(e[2*i]=j(s[o]++,o));}}function W(e){var t;for(t=0;t<l;t++)e.dyn_ltree[2*t]=0;for(t=0;t<f;t++)e.dyn_dtree[2*t]=0;for(t=0;t<c;t++)e.bl_tree[2*t]=0;e.dyn_ltree[2*m]=1,e.opt_len=e.static_len=0,e.last_lit=e.matches=0;}function M(e){8<e.bi_valid?U(e,e.bi_buf):0<e.bi_valid&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0;}function H(e,t,r,n){var i=2*t,s=2*r;return e[i]<e[s]||e[i]===e[s]&&n[t]<=n[r]}function G(e,t,r){for(var n=e.heap[r],i=r<<1;i<=e.heap_len&&(i<e.heap_len&&H(t,e.heap[i+1],e.heap[i],e.depth)&&i++,!H(t,n,e.heap[i],e.depth));)e.heap[r]=e.heap[i],r=i,i<<=1;e.heap[r]=n;}function K(e,t,r){var n,i,s,a,o=0;if(0!==e.last_lit)for(;n=e.pending_buf[e.d_buf+2*o]<<8|e.pending_buf[e.d_buf+2*o+1],i=e.pending_buf[e.l_buf+o],o++,0===n?L(e,i,t):(L(e,(s=A[i])+u+1,t),0!==(a=w[s])&&P(e,i-=I[s],a),L(e,s=N(--n),r),0!==(a=k[s])&&P(e,n-=T[s],a)),o<e.last_lit;);L(e,m,t);}function Y(e,t){var r,n,i,s=t.dyn_tree,a=t.stat_desc.static_tree,o=t.stat_desc.has_stree,h=t.stat_desc.elems,u=-1;for(e.heap_len=0,e.heap_max=_,r=0;r<h;r++)0!==s[2*r]?(e.heap[++e.heap_len]=u=r,e.depth[r]=0):s[2*r+1]=0;for(;e.heap_len<2;)s[2*(i=e.heap[++e.heap_len]=u<2?++u:0)]=1,e.depth[i]=0,e.opt_len--,o&&(e.static_len-=a[2*i+1]);for(t.max_code=u,r=e.heap_len>>1;1<=r;r--)G(e,s,r);for(i=h;r=e.heap[1],e.heap[1]=e.heap[e.heap_len--],G(e,s,1),n=e.heap[1],e.heap[--e.heap_max]=r,e.heap[--e.heap_max]=n,s[2*i]=s[2*r]+s[2*n],e.depth[i]=(e.depth[r]>=e.depth[n]?e.depth[r]:e.depth[n])+1,s[2*r+1]=s[2*n+1]=i,e.heap[1]=i++,G(e,s,1),2<=e.heap_len;);e.heap[--e.heap_max]=e.heap[1],function(e,t){var r,n,i,s,a,o,h=t.dyn_tree,u=t.max_code,l=t.stat_desc.static_tree,f=t.stat_desc.has_stree,c=t.stat_desc.extra_bits,d=t.stat_desc.extra_base,p=t.stat_desc.max_length,m=0;for(s=0;s<=g;s++)e.bl_count[s]=0;for(h[2*e.heap[e.heap_max]+1]=0,r=e.heap_max+1;r<_;r++)p<(s=h[2*h[2*(n=e.heap[r])+1]+1]+1)&&(s=p,m++),h[2*n+1]=s,u<n||(e.bl_count[s]++,a=0,d<=n&&(a=c[n-d]),o=h[2*n],e.opt_len+=o*(s+a),f&&(e.static_len+=o*(l[2*n+1]+a)));if(0!==m){do{for(s=p-1;0===e.bl_count[s];)s--;e.bl_count[s]--,e.bl_count[s+1]+=2,e.bl_count[p]--,m-=2;}while(0<m);for(s=p;0!==s;s--)for(n=e.bl_count[s];0!==n;)u<(i=e.heap[--r])||(h[2*i+1]!==s&&(e.opt_len+=(s-h[2*i+1])*h[2*i],h[2*i+1]=s),n--);}}(e,t),Z(s,u,e.bl_count);}function X(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),t[2*(r+1)+1]=65535,n=0;n<=r;n++)i=a,a=t[2*(n+1)+1],++o<h&&i===a||(o<u?e.bl_tree[2*i]+=o:0!==i?(i!==s&&e.bl_tree[2*i]++,e.bl_tree[2*b]++):o<=10?e.bl_tree[2*v]++:e.bl_tree[2*y]++,s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4));}function V(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),n=0;n<=r;n++)if(i=a,a=t[2*(n+1)+1],!(++o<h&&i===a)){if(o<u)for(;L(e,i,e.bl_tree),0!=--o;);else 0!==i?(i!==s&&(L(e,i,e.bl_tree),o--),L(e,b,e.bl_tree),P(e,o-3,2)):o<=10?(L(e,v,e.bl_tree),P(e,o-3,3)):(L(e,y,e.bl_tree),P(e,o-11,7));s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4);}}n(T);var q=false;function J(e,t,r,n){P(e,(s<<1)+(n?1:0),3),function(e,t,r,n){M(e),(U(e,r),U(e,~r)),i.arraySet(e.pending_buf,e.window,t,r,e.pending),e.pending+=r;}(e,t,r);}r._tr_init=function(e){q||(function(){var e,t,r,n,i,s=new Array(g+1);for(n=r=0;n<a-1;n++)for(I[n]=r,e=0;e<1<<w[n];e++)A[r++]=n;for(A[r-1]=n,n=i=0;n<16;n++)for(T[n]=i,e=0;e<1<<k[n];e++)E[i++]=n;for(i>>=7;n<f;n++)for(T[n]=i<<7,e=0;e<1<<k[n]-7;e++)E[256+i++]=n;for(t=0;t<=g;t++)s[t]=0;for(e=0;e<=143;)z[2*e+1]=8,e++,s[8]++;for(;e<=255;)z[2*e+1]=9,e++,s[9]++;for(;e<=279;)z[2*e+1]=7,e++,s[7]++;for(;e<=287;)z[2*e+1]=8,e++,s[8]++;for(Z(z,l+1,s),e=0;e<f;e++)C[2*e+1]=5,C[2*e]=j(e,5);O=new D(z,w,u+1,l,g),B=new D(C,k,0,f,g),R=new D(new Array(0),x,0,c,p);}(),q=true),e.l_desc=new F(e.dyn_ltree,O),e.d_desc=new F(e.dyn_dtree,B),e.bl_desc=new F(e.bl_tree,R),e.bi_buf=0,e.bi_valid=0,W(e);},r._tr_stored_block=J,r._tr_flush_block=function(e,t,r,n){var i,s,a=0;0<e.level?(2===e.strm.data_type&&(e.strm.data_type=function(e){var t,r=4093624447;for(t=0;t<=31;t++,r>>>=1)if(1&r&&0!==e.dyn_ltree[2*t])return o;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return h;for(t=32;t<u;t++)if(0!==e.dyn_ltree[2*t])return h;return o}(e)),Y(e,e.l_desc),Y(e,e.d_desc),a=function(e){var t;for(X(e,e.dyn_ltree,e.l_desc.max_code),X(e,e.dyn_dtree,e.d_desc.max_code),Y(e,e.bl_desc),t=c-1;3<=t&&0===e.bl_tree[2*S[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t}(e),i=e.opt_len+3+7>>>3,(s=e.static_len+3+7>>>3)<=i&&(i=s)):i=s=r+5,r+4<=i&&-1!==t?J(e,t,r,n):4===e.strategy||s===i?(P(e,2+(n?1:0),3),K(e,z,C)):(P(e,4+(n?1:0),3),function(e,t,r,n){var i;for(P(e,t-257,5),P(e,r-1,5),P(e,n-4,4),i=0;i<n;i++)P(e,e.bl_tree[2*S[i]+1],3);V(e,e.dyn_ltree,t-1),V(e,e.dyn_dtree,r-1);}(e,e.l_desc.max_code+1,e.d_desc.max_code+1,a+1),K(e,e.dyn_ltree,e.dyn_dtree)),W(e),n&&M(e);},r._tr_tally=function(e,t,r){return e.pending_buf[e.d_buf+2*e.last_lit]=t>>>8&255,e.pending_buf[e.d_buf+2*e.last_lit+1]=255&t,e.pending_buf[e.l_buf+e.last_lit]=255&r,e.last_lit++,0===t?e.dyn_ltree[2*r]++:(e.matches++,t--,e.dyn_ltree[2*(A[r]+u+1)]++,e.dyn_dtree[2*N(t)]++),e.last_lit===e.lit_bufsize-1},r._tr_align=function(e){P(e,2,3),L(e,m,z),function(e){16===e.bi_valid?(U(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):8<=e.bi_valid&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8);}(e);};},{"../utils/common":41}],53:[function(e,t,r){t.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0;};},{}],54:[function(e,t,r){(function(e){!function(r,n){if(!r.setImmediate){var i,s,t,a,o=1,h={},u=false,l=r.document,e=Object.getPrototypeOf&&Object.getPrototypeOf(r);e=e&&e.setTimeout?e:r,i="[object process]"==={}.toString.call(r.process)?function(e){process.nextTick(function(){c(e);});}:function(){if(r.postMessage&&!r.importScripts){var e=true,t=r.onmessage;return r.onmessage=function(){e=false;},r.postMessage("","*"),r.onmessage=t,e}}()?(a="setImmediate$"+Math.random()+"$",r.addEventListener?r.addEventListener("message",d,false):r.attachEvent("onmessage",d),function(e){r.postMessage(a+e,"*");}):r.MessageChannel?((t=new MessageChannel).port1.onmessage=function(e){c(e.data);},function(e){t.port2.postMessage(e);}):l&&"onreadystatechange"in l.createElement("script")?(s=l.documentElement,function(e){var t=l.createElement("script");t.onreadystatechange=function(){c(e),t.onreadystatechange=null,s.removeChild(t),t=null;},s.appendChild(t);}):function(e){setTimeout(c,0,e);},e.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),r=0;r<t.length;r++)t[r]=arguments[r+1];var n={callback:e,args:t};return h[o]=n,i(o),o++},e.clearImmediate=f;}function f(e){delete h[e];}function c(e){if(u)setTimeout(c,0,e);else {var t=h[e];if(t){u=true;try{!function(e){var t=e.callback,r=e.args;switch(r.length){case 0:t();break;case 1:t(r[0]);break;case 2:t(r[0],r[1]);break;case 3:t(r[0],r[1],r[2]);break;default:t.apply(n,r);}}(t);}finally{f(e),u=false;}}}}function d(e){e.source===r&&"string"==typeof e.data&&0===e.data.indexOf(a)&&c(+e.data.slice(a.length));}}("undefined"==typeof self?void 0===e?this:e:self);}).call(this,"undefined"!=typeof commonjsGlobal?commonjsGlobal:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{});},{}]},{},[10])(10)}); 
		} (jszip_min));
		return jszip_min.exports;
	}

	var jszip_minExports = requireJszip_min();
	var JSZip = /*@__PURE__*/getDefaultExportFromCjs(jszip_minExports);

	function parseContentTypes(root, xml) {
	    return xml.elements(root).map(e => ({
	        extension: xml.attr(e, "Extension"),
	        partName: xml.attr(e, "PartName"),
	        contentType: xml.attr(e, "ContentType")
	    }));
	}

	class OpenXmlPackage {
	    constructor(_zip, options) {
	        this._zip = _zip;
	        this.options = options;
	        this.xmlParser = new XmlParser();
	    }
	    get(path) {
	        const p = normalizePath(path);
	        return this._zip.files[p] ?? this._zip.files[p.replace(/\//g, '\\')];
	    }
	    update(path, content) {
	        this._zip.file(path, content);
	    }
	    static async load(input, options) {
	        const zip = await (options.zipLoader ? options.zipLoader(input) : JSZip.loadAsync(input));
	        return new OpenXmlPackage(zip, options);
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
	    parseXmlDocument(txt) {
	        return parseXmlString(txt, this.options.trimXmlDeclaration);
	    }
	}
	function rootElement(doc) {
	    return doc.firstElementChild ?? doc.documentElement;
	}
	function normalizePath(path) {
	    return path.startsWith('/') ? path.substr(1) : path;
	}

	class DocumentPart extends Part {
	    constructor(pkg, path, parser) {
	        super(pkg, path);
	        this._documentParser = parser;
	    }
	    parseXml(root) {
	        this.body = this._documentParser.parseDocumentFile(root);
	    }
	}

	function parseBorder(elem, xml) {
	    return {
	        type: xml.attr(elem, "val"),
	        color: xml.attr(elem, "color"),
	        size: xml.lengthAttr(elem, "sz", LengthUsage.Border),
	        offset: xml.lengthAttr(elem, "space", LengthUsage.Point),
	        frame: xml.boolAttr(elem, 'frame'),
	        shadow: xml.boolAttr(elem, 'shadow')
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

	function parseNoteProperties(element, xml) {
	    const result = { defaultNoteIds: [] };
	    for (const child of xml.elements(element)) {
	        switch (child.localName) {
	            case 'numFmt':
	                result.numberingFormat = result.nummeringFormat = xml.attr(child, 'val');
	                break;
	            case 'numStart':
	                const start = xml.intAttr(child, 'val', null);
	                if (Number.isSafeInteger(start) && start >= 0)
	                    result.start = start;
	                break;
	            case 'numRestart':
	                const restart = xml.attr(child, 'val');
	                if (['continuous', 'eachSect', 'eachPage'].includes(restart))
	                    result.restart = restart;
	                break;
	            case 'footnote':
	            case 'endnote':
	                result.defaultNoteIds.push(xml.attr(child, 'id'));
	                break;
	        }
	    }
	    return result;
	}

	var SectionType;
	(function (SectionType) {
	    SectionType["Continuous"] = "continuous";
	    SectionType["NextPage"] = "nextPage";
	    SectionType["NextColumn"] = "nextColumn";
	    SectionType["EvenPage"] = "evenPage";
	    SectionType["OddPage"] = "oddPage";
	})(SectionType || (SectionType = {}));
	const defaultPageLayoutTwips = {
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
	function parseSectionProperties(elem = null, xml = globalXmlParser) {
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
	                    gutter: xml.lengthAttr(e, "gutter") ?? pageMarginDefaults.gutter,
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
	        columns: xml.elements(elem, "col")
	            .map(e => ({
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
	        type: xml.attr(elem, "type"),
	    };
	}

	function parseLineSpacing(elem, xml) {
	    return {
	        before: xml.lengthAttr(elem, "before"),
	        after: xml.lengthAttr(elem, "after"),
	        line: xml.intAttr(elem, "line"),
	        lineRule: xml.attr(elem, "lineRule")
	    };
	}

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
	            props.numbering = parseNumbering$1(elem, xml);
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
	    return xml.elements(elem, "tab")
	        .map(e => ({
	        position: xml.lengthAttr(e, "pos"),
	        leader: xml.attr(e, "leader"),
	        style: xml.attr(e, "val")
	    }));
	}
	function parseNumbering$1(elem, xml) {
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

	function parseNumberingPart(elem, xml) {
	    let result = {
	        numberings: [],
	        abstractNumberings: [],
	        bulletPictures: []
	    };
	    for (let e of xml.elements(elem)) {
	        switch (e.localName) {
	            case "num":
	                result.numberings.push(parseNumbering(e, xml));
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
	function parseNumbering(elem, xml) {
	    let result = {
	        id: xml.attr(elem, 'numId'),
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
	        id: xml.attr(elem, 'abstractNumId'),
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
	        level: xml.intAttr(elem, 'ilvl')
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
	        level: xml.intAttr(elem, 'ilvl')
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

	class NumberingPart extends Part {
	    constructor(pkg, path, parser) {
	        super(pkg, path);
	        this._documentParser = parser;
	    }
	    parseXml(root) {
	        Object.assign(this, parseNumberingPart(root, this._package.xmlParser));
	        this.domNumberings = this._documentParser.parseNumberingFile(root);
	    }
	}

	class StylesPart extends Part {
	    constructor(pkg, path, parser) {
	        super(pkg, path);
	        this._documentParser = parser;
	    }
	    parseXml(root) {
	        this.styles = this._documentParser.parseStylesFile(root);
	    }
	}

	var DomType;
	(function (DomType) {
	    DomType["Document"] = "document";
	    DomType["Paragraph"] = "paragraph";
	    DomType["Run"] = "run";
	    DomType["Break"] = "break";
	    DomType["NoBreakHyphen"] = "noBreakHyphen";
	    DomType["Table"] = "table";
	    DomType["Row"] = "row";
	    DomType["Cell"] = "cell";
	    DomType["Hyperlink"] = "hyperlink";
	    DomType["SmartTag"] = "smartTag";
	    DomType["Drawing"] = "drawing";
	    DomType["Image"] = "image";
	    DomType["Text"] = "text";
	    DomType["Tab"] = "tab";
	    DomType["PositionalTab"] = "positionalTab";
	    DomType["SoftHyphen"] = "softHyphen";
	    DomType["Symbol"] = "symbol";
	    DomType["BookmarkStart"] = "bookmarkStart";
	    DomType["BookmarkEnd"] = "bookmarkEnd";
	    DomType["Footer"] = "footer";
	    DomType["Header"] = "header";
	    DomType["FootnoteReference"] = "footnoteReference";
	    DomType["EndnoteReference"] = "endnoteReference";
	    DomType["Footnote"] = "footnote";
	    DomType["Endnote"] = "endnote";
	    DomType["SimpleField"] = "simpleField";
	    DomType["ComplexField"] = "complexField";
	    DomType["Instruction"] = "instruction";
	    DomType["VmlPicture"] = "vmlPicture";
	    DomType["MmlMath"] = "mmlMath";
	    DomType["Shape"] = "shape";
	    DomType["MmlMathParagraph"] = "mmlMathParagraph";
	    DomType["MmlFraction"] = "mmlFraction";
	    DomType["MmlFunction"] = "mmlFunction";
	    DomType["MmlFunctionName"] = "mmlFunctionName";
	    DomType["MmlNumerator"] = "mmlNumerator";
	    DomType["MmlDenominator"] = "mmlDenominator";
	    DomType["MmlRadical"] = "mmlRadical";
	    DomType["MmlBase"] = "mmlBase";
	    DomType["MmlDegree"] = "mmlDegree";
	    DomType["MmlSuperscript"] = "mmlSuperscript";
	    DomType["MmlSubscript"] = "mmlSubscript";
	    DomType["MmlPreSubSuper"] = "mmlPreSubSuper";
	    DomType["MmlSubArgument"] = "mmlSubArgument";
	    DomType["MmlSuperArgument"] = "mmlSuperArgument";
	    DomType["MmlNary"] = "mmlNary";
	    DomType["MmlDelimiter"] = "mmlDelimiter";
	    DomType["MmlRun"] = "mmlRun";
	    DomType["MmlEquationArray"] = "mmlEquationArray";
	    DomType["MmlLimit"] = "mmlLimit";
	    DomType["MmlLimitLower"] = "mmlLimitLower";
	    DomType["MmlLimitUpper"] = "mmlLimitUpper";
	    DomType["MmlSubSuperscript"] = "mmlSubSuperscript";
	    DomType["MmlPhantom"] = "mmlPhantom";
	    DomType["MmlBorderBox"] = "mmlBorderBox";
	    DomType["MmlAccent"] = "mmlAccent";
	    DomType["MmlMatrix"] = "mmlMatrix";
	    DomType["MmlMatrixRow"] = "mmlMatrixRow";
	    DomType["MmlBox"] = "mmlBox";
	    DomType["MmlBar"] = "mmlBar";
	    DomType["MmlGroupChar"] = "mmlGroupChar";
	    DomType["VmlElement"] = "vmlElement";
	    DomType["Chart"] = "chart";
	    DomType["SmartArt"] = "smartArt";
	    DomType["Ink"] = "ink";
	    DomType["Ruby"] = "ruby";
	    DomType["RubyBase"] = "rubyBase";
	    DomType["RubyText"] = "rubyText";
	    DomType["Inserted"] = "inserted";
	    DomType["Deleted"] = "deleted";
	    DomType["DeletedText"] = "deletedText";
	    DomType["Comment"] = "comment";
	    DomType["CommentReference"] = "commentReference";
	    DomType["CommentRangeStart"] = "commentRangeStart";
	    DomType["CommentRangeEnd"] = "commentRangeEnd";
	    DomType["AltChunk"] = "altChunk";
	})(DomType || (DomType = {}));
	class OpenXmlElementBase {
	    constructor() {
	        this.children = [];
	        this.cssStyle = {};
	    }
	}

	class WmlHeader extends OpenXmlElementBase {
	    constructor() {
	        super(...arguments);
	        this.type = DomType.Header;
	    }
	}
	class WmlFooter extends OpenXmlElementBase {
	    constructor() {
	        super(...arguments);
	        this.type = DomType.Footer;
	    }
	}

	class BaseHeaderFooterPart extends Part {
	    constructor(pkg, path, parser) {
	        super(pkg, path);
	        this._documentParser = parser;
	    }
	    parseXml(root) {
	        this.rootElement = this.createRootElement();
	        this.rootElement.children = this._documentParser.parseBodyElements(root);
	    }
	}
	class HeaderPart extends BaseHeaderFooterPart {
	    createRootElement() {
	        return new WmlHeader();
	    }
	}
	class FooterPart extends BaseHeaderFooterPart {
	    createRootElement() {
	        return new WmlFooter();
	    }
	}

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
	    if (typeof value === 'undefined')
	        return;
	    return parseInt(value);
	}

	class ExtendedPropsPart extends Part {
	    parseXml(root) {
	        this.props = parseExtendedProps(root, this._package.xmlParser);
	    }
	}

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

	class CorePropsPart extends Part {
	    parseXml(root) {
	        this.props = parseCoreProps(root, this._package.xmlParser);
	    }
	}

	class DmlTheme {
	}
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
	        mn: "Mong",
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
	        }
	        else if (sysClr) {
	            result.colors[el.localName] = xml.attr(sysClr, "lastClr");
	        }
	    }
	    return result;
	}
	function parseFontScheme(elem, xml) {
	    var result = {
	        name: xml.attr(elem, "name"),
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
	    for (const font of xml.elements(elem).filter(x => x.localName == "font")) {
	        const script = xml.attr(font, "script");
	        const typeface = xml.attr(font, "typeface");
	        if (script && typeface)
	            scriptTypefaces[script] = typeface;
	    }
	    return {
	        latinTypeface: xml.elementAttr(elem, "latin", "typeface"),
	        eaTypeface: xml.elementAttr(elem, "ea", "typeface"),
	        csTypeface: xml.elementAttr(elem, "cs", "typeface"),
	        scriptTypefaces,
	    };
	}

	class ThemePart extends Part {
	    constructor(pkg, path) {
	        super(pkg, path);
	    }
	    parseXml(root) {
	        this.theme = parseTheme(root, this._package.xmlParser);
	    }
	}

	class WmlBaseNote {
	}
	class WmlFootnote extends WmlBaseNote {
	    constructor() {
	        super(...arguments);
	        this.type = DomType.Footnote;
	    }
	}
	class WmlEndnote extends WmlBaseNote {
	    constructor() {
	        super(...arguments);
	        this.type = DomType.Endnote;
	    }
	}

	class BaseNotePart extends Part {
	    constructor(pkg, path, parser) {
	        super(pkg, path);
	        this._documentParser = parser;
	    }
	}
	class FootnotesPart extends BaseNotePart {
	    constructor(pkg, path, parser) {
	        super(pkg, path, parser);
	    }
	    parseXml(root) {
	        this.notes = this._documentParser.parseNotes(root, "footnote", WmlFootnote);
	    }
	}
	class EndnotesPart extends BaseNotePart {
	    constructor(pkg, path, parser) {
	        super(pkg, path, parser);
	    }
	    parseXml(root) {
	        this.notes = this._documentParser.parseNotes(root, "endnote", WmlEndnote);
	    }
	}

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
	                }
	                break;
	        }
	    }
	    return result;
	}

	class SettingsPart extends Part {
	    constructor(pkg, path) {
	        super(pkg, path);
	    }
	    parseXml(root) {
	        this.settings = parseSettings(root, this._package.xmlParser);
	    }
	}

	function parseCustomProps(root, xml) {
	    return xml.elements(root, "property").map(e => {
	        const firstChild = e.firstChild;
	        return {
	            formatId: xml.attr(e, "fmtid"),
	            name: xml.attr(e, "name"),
	            type: firstChild.nodeName,
	            value: firstChild.textContent
	        };
	    });
	}

	class CustomPropsPart extends Part {
	    parseXml(root) {
	        this.props = parseCustomProps(root, this._package.xmlParser);
	    }
	}

	class CommentsPart extends Part {
	    constructor(pkg, path, parser) {
	        super(pkg, path);
	        this._documentParser = parser;
	    }
	    parseXml(root) {
	        this.comments = this._documentParser.parseComments(root);
	        this.commentMap = keyBy(this.comments, x => x.id);
	    }
	}

	class CommentsExtendedPart extends Part {
	    constructor(pkg, path) {
	        super(pkg, path);
	        this.comments = [];
	    }
	    parseXml(root) {
	        const xml = this._package.xmlParser;
	        for (let el of xml.elements(root, "commentEx")) {
	            this.comments.push({
	                paraId: xml.attr(el, 'paraId'),
	                paraIdParent: xml.attr(el, 'paraIdParent'),
	                done: xml.boolAttr(el, 'done')
	            });
	        }
	        this.commentMap = keyBy(this.comments, x => x.paraId);
	    }
	}

	const EMR = {
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
	    TRANSPARENTBLT: 116,
	};
	const STOCK_OBJECTS$1 = {
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
	    19: { type: "pen", color: "#000000", width: 1 },
	};
	const IDENTITY = { m11: 1, m12: 0, m21: 0, m22: 1, dx: 0, dy: 0 };
	function isEmfBinary(data) {
	    if (!data || data.length < 48)
	        return false;
	    const view = toDataView$1(data);
	    return view.getUint32(0, true) == EMR.HEADER && view.getUint32(40, true) == 0x464d4520;
	}
	function convertEmfToSvgDataUrl(data, options) {
	    const svg = convertEmfToSvg(data, options);
	    return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
	}
	function convertEmfToSvg(data, options = {}) {
	    if (!isEmfBinary(data))
	        return null;
	    const view = toDataView$1(data);
	    const headerSize = view.getUint32(4, true);
	    const bounds = readRectL(view, 8);
	    const frame = readRectL(view, 24);
	    const declaredRecords = view.byteLength >= 52 ? view.getUint32(48, true) : 0;
	    const width = Math.max(1, bounds.right - bounds.left);
	    const height = Math.max(1, bounds.bottom - bounds.top);
	    const physicalWidth = Math.max(1, frame.right - frame.left) / 100;
	    const physicalHeight = Math.max(1, frame.bottom - frame.top) / 100;
	    const state = initialState$1();
	    const stack = [];
	    const objects = {};
	    const elements = [];
	    let offset = Math.max(8, headerSize || 108);
	    let records = 1;
	    let pathData = "";
	    let inPath = false;
	    let shapeCount = 0;
	    const maxRecords = options.maxRecords ?? Math.max(10000, declaredRecords + 100);
	    const maxShapes = options.maxShapes ?? 50000;
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
	                }
	                else if (relative > 0 && relative <= stack.length) {
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
	                state.textColor = colorRefToCss$1(view.getUint32(offset + 8, true));
	                break;
	            case EMR.SETBKCOLOR:
	                state.bkColor = colorRefToCss$1(view.getUint32(offset + 8, true));
	                break;
	            case EMR.CREATEPEN: {
	                const handle = view.getUint32(offset + 8, true);
	                const style = view.getUint32(offset + 12, true);
	                const width = Math.abs(view.getInt32(offset + 16, true));
	                const color = colorRefToCss$1(view.getUint32(offset + 24, true));
	                objects[handle] = { type: "pen", color, width: width || 1, nullPen: (style & 0xf) == 5 };
	                break;
	            }
	            case EMR.EXTCREATEPEN: {
	                const handle = view.getUint32(offset + 8, true);
	                const style = view.getUint32(offset + 28, true);
	                const width = Math.abs(view.getInt32(offset + 32, true));
	                const brushStyle = view.getUint32(offset + 36, true);
	                const color = colorRefToCss$1(view.getUint32(offset + 40, true));
	                objects[handle] = { type: "pen", color, width: width || 1, nullPen: (style & 0xf) == 5 || brushStyle == 1 };
	                break;
	            }
	            case EMR.CREATEBRUSHINDIRECT: {
	                const handle = view.getUint32(offset + 8, true);
	                const style = view.getUint32(offset + 12, true);
	                const color = colorRefToCss$1(view.getUint32(offset + 16, true));
	                objects[handle] = { type: "brush", color, nullBrush: style == 1 };
	                break;
	            }
	            case EMR.EXTCREATEFONTINDIRECTW: {
	                const handle = view.getUint32(offset + 8, true);
	                objects[handle] = parseFont$1(view, offset + 12, size - 12);
	                break;
	            }
	            case EMR.SELECTOBJECT: {
	                const handle = view.getUint32(offset + 8, true);
	                const obj = handle & 0x80000000 ? STOCK_OBJECTS$1[handle & 0x7fffffff] : objects[handle];
	                if (obj?.type == "pen")
	                    state.pen = clonePen(obj);
	                else if (obj?.type == "brush")
	                    state.brush = cloneBrush(obj);
	                else if (obj?.type == "font")
	                    state.font = { ...obj };
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
	                const p = transformPoint$1(state, readPointL(view, offset + 8));
	                state.currentPoint = p;
	                if (inPath)
	                    appendPath(`M ${fmt$1(p.x)} ${fmt$1(p.y)}`);
	                break;
	            }
	            case EMR.LINETO: {
	                const p = transformPoint$1(state, readPointL(view, offset + 8));
	                if (inPath) {
	                    appendPath(`L ${fmt$1(p.x)} ${fmt$1(p.y)}`);
	                }
	                else {
	                    emit(`<path d="M ${fmt$1(state.currentPoint.x)} ${fmt$1(state.currentPoint.y)} L ${fmt$1(p.x)} ${fmt$1(p.y)}" ${paintAttrs$1(state, false, true)}/>`);
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
	                emitRect$1(view, offset, state, emit, false);
	                break;
	            case EMR.ELLIPSE:
	                emitEllipse(view, offset, state, emit);
	                break;
	            case EMR.ROUNDRECT:
	                emitRect$1(view, offset, state, emit, true);
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
	                emitExtTextOut$1(view, offset, size, state, emit, type == EMR.EXTTEXTOUTW);
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
	        return emptySvg$1(width, height, bounds, physicalWidth, physicalHeight, "Unsupported EMF image");
	    return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt$1(physicalWidth)}mm" height="${fmt$1(physicalHeight)}mm" viewBox="${fmt$1(bounds.left)} ${fmt$1(bounds.top)} ${fmt$1(width)} ${fmt$1(height)}" preserveAspectRatio="xMidYMid meet" data-docx-metafile="emf">${elements.join("")}</svg>`;
	}
	function initialState$1() {
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
	        currentPoint: { x: 0, y: 0 },
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
	        currentPoint: { ...state.currentPoint },
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
	function toDataView$1(data) {
	    return new DataView(data.buffer, data.byteOffset, data.byteLength);
	}
	function readRectL(view, offset) {
	    return {
	        left: view.getInt32(offset, true),
	        top: view.getInt32(offset + 4, true),
	        right: view.getInt32(offset + 8, true),
	        bottom: view.getInt32(offset + 12, true),
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
	        dy: view.getFloat32(offset + 20, true),
	    };
	}
	function multiplyMatrix(a, b) {
	    return {
	        m11: a.m11 * b.m11 + a.m12 * b.m21,
	        m12: a.m11 * b.m12 + a.m12 * b.m22,
	        m21: a.m21 * b.m11 + a.m22 * b.m21,
	        m22: a.m21 * b.m12 + a.m22 * b.m22,
	        dx: a.dx * b.m11 + a.dy * b.m21 + b.dx,
	        dy: a.dx * b.m12 + a.dy * b.m22 + b.dy,
	    };
	}
	function transformPoint$1(state, p) {
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
	        y: yDen ? current.y * yNum / yDen : current.y,
	    };
	}
	function colorRefToCss$1(color) {
	    const r = color & 0xff;
	    const g = (color >> 8) & 0xff;
	    const b = (color >> 16) & 0xff;
	    return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
	}
	function hex2(value) {
	    return Math.max(0, Math.min(255, value | 0)).toString(16).padStart(2, "0");
	}
	function fmt$1(value) {
	    if (!Number.isFinite(value))
	        return "0";
	    const rounded = Math.round(value * 1000) / 1000;
	    return `${rounded}`;
	}
	function esc$1(value) {
	    return `${value ?? ""}`
	        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
	        .replace(/&/g, "&amp;")
	        .replace(/</g, "&lt;")
	        .replace(/>/g, "&gt;")
	        .replace(/"/g, "&quot;");
	}
	function paintAttrs$1(state, fill, stroke) {
	    const attrs = [];
	    if (fill && !state.brush.nullBrush) {
	        attrs.push(`fill="${state.brush.color}"`);
	        attrs.push(`fill-rule="${state.polyFillMode == 2 ? "nonzero" : "evenodd"}"`);
	    }
	    else {
	        attrs.push(`fill="none"`);
	    }
	    if (stroke && !state.pen.nullPen) {
	        const scale = approximateScale(state);
	        const strokeWidth = state.pen.width == 0 ? 1 : Math.max(0.35, state.pen.width * scale);
	        attrs.push(`stroke="${state.pen.color}"`);
	        attrs.push(`stroke-width="${fmt$1(strokeWidth)}"`);
	        attrs.push(`stroke-linecap="square"`);
	        attrs.push(`stroke-linejoin="miter"`);
	    }
	    else {
	        attrs.push(`stroke="none"`);
	    }
	    return attrs.join(" ");
	}
	function emitPath(pathData, state, emit, fill, stroke) {
	    if (!pathData)
	        return;
	    emit(`<path d="${pathData}" ${paintAttrs$1(state, fill, stroke)}/>`);
	}
	function emitPoly16(view, offset, closed, toCurrent, inPath, state, appendPath, emit) {
	    const count = view.getUint32(offset + 24, true);
	    if (!count || offset + 28 + count * 4 > view.byteLength)
	        return;
	    const points = [];
	    for (let i = 0; i < count; i++)
	        points.push(transformPoint$1(state, readPointS(view, offset + 28 + i * 4)));
	    emitPolyline$1(points, closed, toCurrent, inPath, state, appendPath, emit);
	}
	function emitPoly32(view, offset, closed, toCurrent, inPath, state, appendPath, emit) {
	    const count = view.getUint32(offset + 24, true);
	    if (!count || offset + 28 + count * 8 > view.byteLength)
	        return;
	    const points = [];
	    for (let i = 0; i < count; i++)
	        points.push(transformPoint$1(state, readPointL(view, offset + 28 + i * 8)));
	    emitPolyline$1(points, closed, toCurrent, inPath, state, appendPath, emit);
	}
	function emitPolyline$1(points, closed, toCurrent, inPath, state, appendPath, emit) {
	    if (!points.length)
	        return;
	    let d = inPath && toCurrent ? "" : (toCurrent ? `M ${fmt$1(state.currentPoint.x)} ${fmt$1(state.currentPoint.y)}` : `M ${fmt$1(points[0].x)} ${fmt$1(points[0].y)}`);
	    const start = toCurrent ? 0 : 1;
	    for (let i = start; i < points.length; i++)
	        d += ` L ${fmt$1(points[i].x)} ${fmt$1(points[i].y)}`;
	    if (closed)
	        d += " Z";
	    state.currentPoint = points[points.length - 1];
	    if (inPath)
	        appendPath(d.trim());
	    else
	        emit(`<path d="${d.trim()}" ${paintAttrs$1(state, closed, true)}/>`);
	}
	function emitBezier(view, offset, shortPoints, toCurrent, inPath, state, appendPath, emit) {
	    const count = view.getUint32(offset + 24, true);
	    const pointSize = shortPoints ? 4 : 8;
	    if (!count || offset + 28 + count * pointSize > view.byteLength)
	        return;
	    const points = [];
	    for (let i = 0; i < count; i++) {
	        const p = shortPoints ? readPointS(view, offset + 28 + i * pointSize) : readPointL(view, offset + 28 + i * pointSize);
	        points.push(transformPoint$1(state, p));
	    }
	    let d = inPath && toCurrent ? "" : (toCurrent ? `M ${fmt$1(state.currentPoint.x)} ${fmt$1(state.currentPoint.y)}` : `M ${fmt$1(points[0].x)} ${fmt$1(points[0].y)}`);
	    let last = toCurrent ? state.currentPoint : points[0];
	    const start = toCurrent ? 0 : 1;
	    for (let i = start; i + 2 < points.length; i += 3) {
	        const p1 = points[i];
	        const p2 = points[i + 1];
	        const p3 = points[i + 2];
	        d += ` C ${fmt$1(p1.x)} ${fmt$1(p1.y)} ${fmt$1(p2.x)} ${fmt$1(p2.y)} ${fmt$1(p3.x)} ${fmt$1(p3.y)}`;
	        last = p3;
	    }
	    state.currentPoint = last;
	    if (inPath)
	        appendPath(d.trim());
	    else
	        emit(`<path d="${d.trim()}" ${paintAttrs$1(state, false, true)}/>`);
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
	            points.push(transformPoint$1(state, p));
	        }
	        emitPolyline$1(points, closed, false, inPath, state, appendPath, emit);
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
	    for (let i = 0; i < count; i++) {
	        const pointOffset = pointsOffset + i * pointSize;
	        const p = shortPoints ? readPointS(view, pointOffset) : readPointL(view, pointOffset);
	        points.push(transformPoint$1(state, p));
	    }
	    let d = "";
	    let i = 0;
	    while (i < count) {
	        const t = view.getUint8(typesOffset + i);
	        const op = t & 0x06;
	        if (op == 0x06) {
	            d += ` M ${fmt$1(points[i].x)} ${fmt$1(points[i].y)}`;
	            state.currentPoint = points[i];
	            i++;
	        }
	        else if (op == 0x02) {
	            d += ` L ${fmt$1(points[i].x)} ${fmt$1(points[i].y)}`;
	            state.currentPoint = points[i];
	            i++;
	        }
	        else if (op == 0x04 && i + 2 < count) {
	            d += ` C ${fmt$1(points[i].x)} ${fmt$1(points[i].y)} ${fmt$1(points[i + 1].x)} ${fmt$1(points[i + 1].y)} ${fmt$1(points[i + 2].x)} ${fmt$1(points[i + 2].y)}`;
	            state.currentPoint = points[i + 2];
	            i += 3;
	        }
	        else {
	            i++;
	        }
	        if (t & 0x01)
	            d += " Z";
	    }
	    d = d.trim();
	    if (!d)
	        return;
	    if (inPath)
	        appendPath(d);
	    else
	        emit(`<path d="${d}" ${paintAttrs$1(state, false, true)}/>`);
	}
	function emitRect$1(view, offset, state, emit, rounded) {
	    const r = readRectL(view, offset + 8);
	    const p1 = transformPoint$1(state, { x: r.left, y: r.top });
	    const p2 = transformPoint$1(state, { x: r.right, y: r.bottom });
	    const x = Math.min(p1.x, p2.x);
	    const y = Math.min(p1.y, p2.y);
	    const w = Math.abs(p2.x - p1.x);
	    const h = Math.abs(p2.y - p1.y);
	    const radius = rounded ? ` rx="${fmt$1(Math.min(w, h) / 8)}" ry="${fmt$1(Math.min(w, h) / 8)}"` : "";
	    emit(`<rect x="${fmt$1(x)}" y="${fmt$1(y)}" width="${fmt$1(w)}" height="${fmt$1(h)}"${radius} ${paintAttrs$1(state, true, true)}/>`);
	}
	function emitEllipse(view, offset, state, emit) {
	    const r = readRectL(view, offset + 8);
	    const p1 = transformPoint$1(state, { x: r.left, y: r.top });
	    const p2 = transformPoint$1(state, { x: r.right, y: r.bottom });
	    const cx = (p1.x + p2.x) / 2;
	    const cy = (p1.y + p2.y) / 2;
	    const rx = Math.abs(p2.x - p1.x) / 2;
	    const ry = Math.abs(p2.y - p1.y) / 2;
	    emit(`<ellipse cx="${fmt$1(cx)}" cy="${fmt$1(cy)}" rx="${fmt$1(rx)}" ry="${fmt$1(ry)}" ${paintAttrs$1(state, true, true)}/>`);
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
	    const pStart = transformPoint$1(state, { x: cx + Math.cos(startAngle) * rxRaw, y: cy + Math.sin(startAngle) * ryRaw });
	    const pEnd = transformPoint$1(state, { x: cx + Math.cos(endAngle) * rxRaw, y: cy + Math.sin(endAngle) * ryRaw });
	    const pCenter = transformPoint$1(state, { x: cx, y: cy });
	    const pRx = transformPoint$1(state, { x: cx + rxRaw, y: cy });
	    const pRy = transformPoint$1(state, { x: cx, y: cy + ryRaw });
	    const rx = Math.max(0.01, Math.abs(pRx.x - pCenter.x) || Math.abs(pRy.x - pCenter.x));
	    const ry = Math.max(0.01, Math.abs(pRy.y - pCenter.y) || Math.abs(pRx.y - pCenter.y));
	    const arc = `A ${fmt$1(rx)} ${fmt$1(ry)} 0 ${largeArc} 1 ${fmt$1(pEnd.x)} ${fmt$1(pEnd.y)}`;
	    let d = `M ${fmt$1(pStart.x)} ${fmt$1(pStart.y)} ${arc}`;
	    let fill = false;
	    let stroke = true;
	    if (type == EMR.CHORD) {
	        d += " Z";
	        fill = true;
	    }
	    else if (type == EMR.PIE) {
	        d += ` L ${fmt$1(pCenter.x)} ${fmt$1(pCenter.y)} Z`;
	        fill = true;
	    }
	    if (type == EMR.ARCTO)
	        state.currentPoint = pEnd;
	    if (inPath)
	        appendPath(d);
	    else
	        emit(`<path d="${d}" ${paintAttrs$1(state, fill, stroke)}/>`);
	}
	function parseFont$1(view, offset, available) {
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
	function emitExtTextOut$1(view, offset, size, state, emit, unicode) {
	    if (size < 76)
	        return;
	    const ref = transformPoint$1(state, readPointL(view, offset + 36));
	    const chars = view.getUint32(offset + 44, true);
	    const offString = view.getUint32(offset + 48, true);
	    if (!chars || offString <= 0)
	        return;
	    const bytesPerChar = unicode ? 2 : 1;
	    if (offString + chars * bytesPerChar > size)
	        return;
	    const text = unicode
	        ? decodeUtf16(view, offset + offString, chars)
	        : decodeAnsi(new Uint8Array(view.buffer, view.byteOffset + offset + offString, chars));
	    emitText$1(text, ref, state, emit);
	}
	function emitPolyTextOut(view, offset, size, state, emit, unicode) {
	    if (size < 40)
	        return;
	    const count = view.getUint32(offset + 36, true);
	    let textOffset = offset + 40;
	    for (let i = 0; i < count && textOffset + 40 <= offset + size; i++, textOffset += 40) {
	        const ref = transformPoint$1(state, readPointL(view, textOffset));
	        const chars = view.getUint32(textOffset + 8, true);
	        const offString = view.getUint32(textOffset + 12, true);
	        const bytesPerChar = unicode ? 2 : 1;
	        if (!chars || !offString || offString + chars * bytesPerChar > size)
	            continue;
	        const text = unicode
	            ? decodeUtf16(view, offset + offString, chars)
	            : decodeAnsi(new Uint8Array(view.buffer, view.byteOffset + offset + offString, chars));
	        emitText$1(text, ref, state, emit);
	    }
	}
	function emitSmallTextOut(view, offset, size, state, emit) {
	    if (size < 36)
	        return;
	    const ref = transformPoint$1(state, readPointL(view, offset + 8));
	    const chars = view.getUint32(offset + 16, true);
	    const flags = view.getUint32(offset + 20, true);
	    const textOffset = (flags & 0x200) ? 40 : 28;
	    if (!chars || textOffset + chars > size)
	        return;
	    const text = decodeAnsi(new Uint8Array(view.buffer, view.byteOffset + offset + textOffset, chars));
	    emitText$1(text, ref, state, emit);
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
	        }
	        catch {
	            try {
	                return new decoder("windows-1252").decode(bytes).replace(/\0+$/g, "");
	            }
	            catch { }
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
	        `x="${fmt$1(ref.x)}"`,
	        `y="${fmt$1(ref.y)}"`,
	        `fill="${state.textColor}"`,
	        `font-size="${fmt$1(fontSize)}"`,
	        font?.family ? `font-family="${esc$1(font.family)}"` : "",
	        font?.weight ? `font-weight="${font.weight >= 600 ? "bold" : "normal"}"` : "",
	        font?.italic ? `font-style="italic"` : "",
	        font?.underline ? `text-decoration="underline"` : "",
	        textAnchorAttr$1(state),
	        baselineAttr(state),
	    ].filter(Boolean).join(" ");
	    return attrs;
	}
	function textAnchorAttr$1(state) {
	    const horizontal = state.textAlign & 0x06;
	    if (horizontal == 0x06)
	        return `text-anchor="middle"`;
	    if (horizontal == 0x02)
	        return `text-anchor="end"`;
	    return "";
	}
	function baselineAttr(state) {
	    const vertical = state.textAlign & 0x18;
	    if (vertical == 0x00)
	        return `dominant-baseline="text-before-edge"`;
	    if (vertical == 0x08)
	        return `dominant-baseline="text-after-edge"`;
	    return "";
	}
	function emitText$1(text, ref, state, emit) {
	    if (!text)
	        return;
	    emit(`<text ${textAttrs(state, ref)}>${esc$1(text)}</text>`);
	}
	function emitPixel(view, offset, state, emit) {
	    if (offset + 20 > view.byteLength)
	        return;
	    const p = transformPoint$1(state, readPointL(view, offset + 8));
	    const color = colorRefToCss$1(view.getUint32(offset + 16, true));
	    emit(`<rect x="${fmt$1(p.x)}" y="${fmt$1(p.y)}" width="1" height="1" fill="${color}" stroke="none"/>`);
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
	    }
	    else {
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
	    const p1 = transformPoint$1(state, { x: xDest, y: yDest });
	    const p2 = transformPoint$1(state, { x: xDest + cxDest, y: yDest + cyDest });
	    const x = Math.min(p1.x, p2.x);
	    const y = Math.min(p1.y, p2.y);
	    const w = Math.abs(p2.x - p1.x);
	    const h = Math.abs(p2.y - p1.y);
	    emit(`<image x="${fmt$1(x)}" y="${fmt$1(y)}" width="${fmt$1(w)}" height="${fmt$1(h)}" href="${imageUrl}" preserveAspectRatio="none"/>`);
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
	    out[0] = 0x42;
	    out[1] = 0x4d;
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
	    return [`<image x="${fmt$1(bounds.left)}" y="${fmt$1(bounds.top)}" width="${fmt$1(width)}" height="${fmt$1(height)}" href="${url}" preserveAspectRatio="xMidYMid meet"/>`];
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
	    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
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
	        if (data[i] != 0xff || data[i + 1] != 0xd8 || data[i + 2] != 0xff)
	            continue;
	        for (let j = i + 4; j + 1 < data.length; j++) {
	            if (data[j] == 0xff && data[j + 1] == 0xd9)
	                return data.subarray(i, j + 2);
	        }
	    }
	    return null;
	}
	function findBmp(data) {
	    for (let i = 0; i + 14 < data.length; i++) {
	        if (data[i] != 0x42 || data[i + 1] != 0x4d)
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
	    return ((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]) >>> 0;
	}
	function readU32LE(data, offset) {
	    return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
	}
	function writeU32(out, offset, value) {
	    out[offset] = value & 0xff;
	    out[offset + 1] = (value >> 8) & 0xff;
	    out[offset + 2] = (value >> 16) & 0xff;
	    out[offset + 3] = (value >> 24) & 0xff;
	}
	function base64(bytes) {
	    let binary = "";
	    const chunk = 0x8000;
	    for (let i = 0; i < bytes.length; i += chunk)
	        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	    if (typeof btoa == "function")
	        return btoa(binary);
	    const buffer = globalThis.Buffer;
	    if (buffer)
	        return buffer.from(bytes).toString("base64");
	    return binary;
	}
	function emptySvg$1(width, height, bounds, physicalWidth, physicalHeight, message) {
	    return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt$1(physicalWidth)}mm" height="${fmt$1(physicalHeight)}mm" viewBox="${fmt$1(bounds.left)} ${fmt$1(bounds.top)} ${fmt$1(width)} ${fmt$1(height)}" preserveAspectRatio="xMidYMid meet" data-docx-metafile="emf"><rect x="${fmt$1(bounds.left)}" y="${fmt$1(bounds.top)}" width="${fmt$1(width)}" height="${fmt$1(height)}" fill="none" stroke="#999" stroke-width="1"/><text x="${fmt$1(bounds.left + width / 2)}" y="${fmt$1(bounds.top + height / 2)}" text-anchor="middle" font-size="12" fill="#666">${esc$1(message)}</text></svg>`;
	}

	const PLACEABLE_KEY = 0x9ac6cdd7;
	const META = {
	    EOF: 0x0000,
	    SETBKMODE: 0x0102,
	    SETBKCOLOR: 0x0201,
	    SETTEXTCOLOR: 0x0209,
	    SETTEXTALIGN: 0x012e,
	    SETWINDOWORG: 0x020b,
	    SETWINDOWEXT: 0x020c,
	    SETVIEWPORTORG: 0x020d,
	    SETVIEWPORTEXT: 0x020e,
	    MOVETO: 0x0214,
	    LINETO: 0x0213,
	    POLYLINE: 0x0325,
	    POLYGON: 0x0324,
	    RECTANGLE: 0x041b,
	    ELLIPSE: 0x0418,
	    CREATEPENINDIRECT: 0x02fa,
	    CREATEBRUSHINDIRECT: 0x02fc,
	    CREATEFONTINDIRECT: 0x02fb,
	    SELECTOBJECT: 0x012d,
	    DELETEOBJECT: 0x01f0,
	    TEXTOUT: 0x0521,
	    EXTTEXTOUT: 0x0a32,
	};
	const STOCK_OBJECTS = {
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
	    19: { type: "pen", color: "#000000", width: 1 },
	};
	function isWmfBinary(data) {
	    if (!data || data.length < 22)
	        return false;
	    const view = toDataView(data);
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
	    const view = toDataView(data);
	    let offset = 0;
	    let bounds = { left: 0, top: 0, right: 1000, bottom: 1000 };
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
	    const state = initialState(bounds);
	    const objects = new Array(objectCount).fill(null);
	    const elements = [];
	    let shapeCount = 0;
	    let records = 0;
	    const maxRecords = options.maxRecords ?? 10000;
	    const maxShapes = options.maxShapes ?? 50000;
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
	                state.bkColor = colorRefToCss(readUint32Safe(view, params));
	                break;
	            case META.SETTEXTCOLOR:
	                state.textColor = colorRefToCss(readUint32Safe(view, params));
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
	                storeObject(objects, parseFont(view, params, end));
	                break;
	            case META.SELECTOBJECT: {
	                const handle = readUint16(view, params);
	                const obj = handle >= 0x8000 ? STOCK_OBJECTS[handle & 0x7fff] : objects[handle];
	                if (obj?.type == "pen")
	                    state.pen = { ...obj };
	                else if (obj?.type == "brush")
	                    state.brush = { ...obj };
	                else if (obj?.type == "font")
	                    state.font = { ...obj };
	                break;
	            }
	            case META.DELETEOBJECT: {
	                const handle = readUint16(view, params);
	                if (handle < objects.length)
	                    objects[handle] = null;
	                break;
	            }
	            case META.MOVETO:
	                state.currentPoint = transformPoint(state, readPointYX(view, params));
	                break;
	            case META.LINETO: {
	                const p = transformPoint(state, readPointYX(view, params));
	                emit(`<path d="M ${fmt(state.currentPoint.x)} ${fmt(state.currentPoint.y)} L ${fmt(p.x)} ${fmt(p.y)}" ${strokeAttrs(state)}/>`);
	                state.currentPoint = p;
	                break;
	            }
	            case META.POLYLINE:
	            case META.POLYGON:
	                emitPolyline(view, params, end, fn == META.POLYGON, state, emit);
	                break;
	            case META.RECTANGLE:
	                emitRect(view, params, state, emit, false);
	                break;
	            case META.ELLIPSE:
	                emitRect(view, params, state, emit, true);
	                break;
	            case META.TEXTOUT:
	                emitTextOut(view, params, end, state, emit);
	                break;
	            case META.EXTTEXTOUT:
	                emitExtTextOut(view, params, end, state, emit);
	                break;
	        }
	        offset = end;
	    }
	    if (!elements.length)
	        return emptySvg(width, height, bounds, physicalWidth, physicalHeight, "Unsupported WMF image");
	    return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(physicalWidth)}mm" height="${fmt(physicalHeight)}mm" viewBox="${fmt(bounds.left)} ${fmt(bounds.top)} ${fmt(width)} ${fmt(height)}" preserveAspectRatio="xMidYMid meet" data-docx-metafile="wmf">${elements.join("")}</svg>`;
	}
	function initialState(bounds) {
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
	        textAlign: 0,
	    };
	}
	function transformPoint(state, p) {
	    const viewportExt = state.viewportExt ?? state.windowExt;
	    const sx = safeRatio(viewportExt.x, state.windowExt.x);
	    const sy = safeRatio(viewportExt.y, state.windowExt.y);
	    return {
	        x: state.viewportOrg.x + (p.x - state.windowOrg.x) * sx,
	        y: state.viewportOrg.y + (p.y - state.windowOrg.y) * sy,
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
	    const color = offset + 10 <= end ? colorRefToCss(readUint32Safe(view, offset + 6)) : "#000000";
	    return { type: "pen", color, width: Math.max(1, widthX, widthY), nullPen: (style & 0xf) == 5 };
	}
	function parseBrush(view, offset, end) {
	    const style = readUint16(view, offset);
	    const color = offset + 6 <= end ? colorRefToCss(readUint32Safe(view, offset + 2)) : "#ffffff";
	    return { type: "brush", color, nullBrush: style == 1 || style == 5 };
	}
	function parseFont(view, offset, end) {
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
	function emitPolyline(view, offset, end, closed, state, emit) {
	    const count = readUint16(view, offset);
	    let pos = offset + 2;
	    const points = [];
	    for (let i = 0; i < count && pos + 4 <= end; i++, pos += 4)
	        points.push(transformPoint(state, { x: readInt16(view, pos), y: readInt16(view, pos + 2) }));
	    if (!points.length)
	        return;
	    const d = points.map((p, i) => `${i == 0 ? "M" : "L"} ${fmt(p.x)} ${fmt(p.y)}`).join(" ") + (closed ? " Z" : "");
	    emit(`<path d="${d}" ${closed ? paintAttrs(state) : strokeAttrs(state)}/>`);
	    state.currentPoint = points[points.length - 1];
	}
	function emitRect(view, offset, state, emit, ellipse) {
	    const bottomRight = transformPoint(state, readPointYX(view, offset));
	    const topLeft = transformPoint(state, readPointYX(view, offset + 4));
	    const x = Math.min(topLeft.x, bottomRight.x);
	    const y = Math.min(topLeft.y, bottomRight.y);
	    const width = Math.abs(bottomRight.x - topLeft.x);
	    const height = Math.abs(bottomRight.y - topLeft.y);
	    if (ellipse) {
	        emit(`<ellipse cx="${fmt(x + width / 2)}" cy="${fmt(y + height / 2)}" rx="${fmt(width / 2)}" ry="${fmt(height / 2)}" ${paintAttrs(state)}/>`);
	    }
	    else {
	        emit(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(width)}" height="${fmt(height)}" ${paintAttrs(state)}/>`);
	    }
	}
	function emitTextOut(view, offset, end, state, emit) {
	    const count = readUint16(view, offset);
	    const stringOffset = offset + 2;
	    const alignedStringEnd = stringOffset + count + (count % 2);
	    if (alignedStringEnd + 4 > end)
	        return;
	    const text = decodeText(view, stringOffset, count, state.font.charset);
	    const y = readInt16(view, alignedStringEnd);
	    const x = readInt16(view, alignedStringEnd + 2);
	    emitText(text, resolveTextPoint(state, { x, y }), null, state, emit);
	    advanceCurrentPoint(text, null, state);
	}
	function emitExtTextOut(view, offset, end, state, emit) {
	    const y = readInt16(view, offset);
	    const x = readInt16(view, offset + 2);
	    const count = readUint16(view, offset + 4);
	    const options = readUint16(view, offset + 6);
	    let pos = offset + 8;
	    if (options & 0x0006)
	        pos += 8;
	    if (pos + count > end)
	        return;
	    const text = decodeText(view, pos, count, state.font.charset);
	    pos += count + (count % 2);
	    const dx = [];
	    while (pos + 2 <= end && dx.length < count) {
	        dx.push(readInt16(view, pos));
	        pos += 2;
	    }
	    emitText(text, resolveTextPoint(state, { x, y }), dx.length ? dx : null, state, emit);
	    advanceCurrentPoint(text, dx.length ? dx : null, state);
	}
	function resolveTextPoint(state, declared) {
	    if (state.textAlign & 0x0001)
	        return { ...state.currentPoint };
	    return transformPoint(state, declared);
	}
	function advanceCurrentPoint(text, dx, state) {
	    if (!(state.textAlign & 0x0001))
	        return;
	    const logicalAdvance = dx?.length
	        ? dx.reduce((sum, value) => sum + value, 0)
	        : text.length * state.font.size * 0.5;
	    state.currentPoint = {
	        x: state.currentPoint.x + transformScalarX(state, logicalAdvance),
	        y: state.currentPoint.y
	    };
	}
	function emitText(text, point, dx, state, emit) {
	    if (!text)
	        return;
	    const font = state.font;
	    const size = Math.max(1, transformScalarY(state, font.size));
	    const style = [
	        `font-family:${quoteFont(font.family)}`,
	        `font-size:${fmt(size)}px`,
	        `font-weight:${font.weight >= 600 ? "700" : font.weight}`,
	        `font-style:${font.italic ? "italic" : "normal"}`,
	    ];
	    const decorations = [];
	    if (font.underline)
	        decorations.push("underline");
	    if (font.strike)
	        decorations.push("line-through");
	    if (decorations.length)
	        style.push(`text-decoration:${decorations.join(" ")}`);
	    const attrs = [
	        `x="${fmt(point.x)}"`,
	        `y="${fmt(point.y)}"`,
	        `fill="${escAttr(state.textColor)}"`,
	        `style="${escAttr(style.join(";"))}"`,
	        `dominant-baseline="${(state.textAlign & 0x18) == 0x18 ? "alphabetic" : "text-before-edge"}"`,
	        textAnchorAttr(state.textAlign),
	    ].filter(Boolean).join(" ");
	    if (!dx || dx.length == 0) {
	        emit(`<text ${attrs}>${esc(text)}</text>`);
	        return;
	    }
	    let x = point.x;
	    const chars = Array.from(text);
	    const tspans = chars.map((ch, i) => {
	        const t = `<tspan x="${fmt(x)}">${esc(ch)}</tspan>`;
	        x += transformScalarX(state, dx[i] ?? 0);
	        return t;
	    }).join("");
	    emit(`<text ${attrs}>${tspans}</text>`);
	}
	function storeObject(objects, obj) {
	    let index = objects.findIndex(x => x == null);
	    if (index < 0) {
	        objects.push(obj);
	        return;
	    }
	    objects[index] = obj;
	}
	function paintAttrs(state) {
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
	    return `fill="none" stroke="${escAttr(state.pen?.color ?? "#000000")}" stroke-width="${fmt(Math.max(0.5, transformScalarX(state, state.pen?.width ?? 1)))}"`;
	}
	function textAnchorAttr(textAlign) {
	    if (textAlign & 0x0006)
	        return `text-anchor="end"`;
	    if (textAlign & 0x0002)
	        return `text-anchor="middle"`;
	    return "";
	}
	function decodeText(view, offset, count, charset) {
	    const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, Math.max(0, Math.min(count, view.byteLength - offset)));
	    const preferred = charset == 2 ? "symbol" : charset == 134 ? "gb18030" : "windows-1252";
	    try {
	        return new TextDecoder(preferred).decode(bytes).replace(/\0+$/g, "");
	    }
	    catch {
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
	function colorRefToCss(value) {
	    const r = value & 0xff;
	    const g = (value >> 8) & 0xff;
	    const b = (value >> 16) & 0xff;
	    return `#${hex(r)}${hex(g)}${hex(b)}`;
	}
	function hex(v) {
	    return Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
	}
	function toDataView(data) {
	    return new DataView(data.buffer, data.byteOffset, data.byteLength);
	}
	function fmt(value) {
	    if (!Number.isFinite(value))
	        return "0";
	    const rounded = Math.round(value * 1000) / 1000;
	    return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
	}
	function esc(value) {
	    return String(value ?? "")
	        .replace(/&/g, "&amp;")
	        .replace(/</g, "&lt;")
	        .replace(/>/g, "&gt;");
	}
	function escAttr(value) {
	    return esc(value).replace(/"/g, "&quot;");
	}
	function emptySvg(width, height, bounds, physicalWidth, physicalHeight, message) {
	    return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(physicalWidth)}mm" height="${fmt(physicalHeight)}mm" viewBox="${fmt(bounds.left)} ${fmt(bounds.top)} ${fmt(width)} ${fmt(height)}" preserveAspectRatio="xMidYMid meet" data-docx-metafile="wmf"><rect x="${fmt(bounds.left)}" y="${fmt(bounds.top)}" width="${fmt(width)}" height="${fmt(height)}" fill="none" stroke="#999" stroke-width="1"/><text x="${fmt(bounds.left + width / 2)}" y="${fmt(bounds.top + height / 2)}" text-anchor="middle" font-size="12" fill="#666">${esc(message)}</text></svg>`;
	}

	const topLevelRels = [
	    { type: RelationshipTypes.OfficeDocument, target: "word/document.xml" },
	    { type: RelationshipTypes.ExtendedProperties, target: "docProps/app.xml" },
	    { type: RelationshipTypes.CoreProperties, target: "docProps/core.xml" },
	    { type: RelationshipTypes.CustomProperties, target: "docProps/custom.xml" },
	];
	class WordDocument {
	    constructor() {
	        this.parts = [];
	        this.partsMap = {};
	        this.contentTypes = [];
	        this._snapshotAssetDataUrls = null;
	        this._snapshotTextParts = null;
	    }
	    static fromSnapshot(snapshot, options) {
	        const d = new WordDocument();
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
	            get: (path) => d._snapshotTextParts?.[normalizeSnapshotPath(path)] != null ? {} : null,
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
	    static async load(blob, parser, options) {
	        var d = new WordDocument();
	        d._options = options;
	        d._parser = parser;
	        d._package = await OpenXmlPackage.load(blob, options);
	        d.rels = await d._package.loadRelationships();
	        d.contentTypes = await d._package.loadContentTypes();
	        await Promise.all(topLevelRels.map(rel => {
	            const r = d.rels.find(x => x.type === rel.type) ?? rel;
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
	            parts: this.parts.map(p => this.snapshotPart(p)).filter(Boolean),
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
	        }
	        else if (part === this.fontTablePart) {
	            kind = "fontTable";
	            data = { fonts: anyPart.fonts };
	        }
	        else if (part === this.numberingPart) {
	            kind = "numbering";
	            data = { numberings: anyPart.numberings, abstractNumberings: anyPart.abstractNumberings, bulletPictures: anyPart.bulletPictures, domNumberings: anyPart.domNumberings };
	        }
	        else if (part === this.stylesPart) {
	            kind = "styles";
	            data = { styles: anyPart.styles };
	        }
	        else if (part === this.themePart) {
	            kind = "theme";
	            data = { theme: anyPart.theme };
	        }
	        else if (part === this.footnotesPart) {
	            kind = "footnotes";
	            data = { notes: anyPart.notes };
	        }
	        else if (part === this.endnotesPart) {
	            kind = "endnotes";
	            data = { notes: anyPart.notes };
	        }
	        else if (part === this.corePropsPart) {
	            kind = "coreProps";
	            data = { props: anyPart.props };
	        }
	        else if (part === this.extendedPropsPart) {
	            kind = "extendedProps";
	            data = { props: anyPart.props };
	        }
	        else if (part === this.settingsPart) {
	            kind = "settings";
	            data = { settings: anyPart.settings };
	        }
	        else if (part === this.commentsPart) {
	            kind = "comments";
	            data = { comments: anyPart.comments };
	        }
	        else if (part === this.commentsExtendedPart) {
	            kind = "commentsExtended";
	            data = { comments: anyPart.comments };
	        }
	        else if (anyPart.rootElement) {
	            kind = anyPart.rootElement.type === "header" ? "header" : "footer";
	            data = { rootElement: anyPart.rootElement };
	        }
	        else
	            return null;
	        return { kind, path: part.path, rels: part.rels ?? [], data };
	    }
	    async preloadSnapshotRelationshipTargets(snapshot) {
	        const seen = new Set();
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
	                }
	                else {
	                    const url = await this.loadPackageAssetDataUrl(path);
	                    if (url)
	                        snapshot.assetDataUrls[path] = url;
	                }
	            }
	            catch (e) {
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
	            case RelationshipTypes.OfficeDocument:
	                this.documentPart = part = new DocumentPart(this._package, path, this._parser);
	                break;
	            case RelationshipTypes.FontTable:
	                this.fontTablePart = part = new FontTablePart(this._package, path);
	                break;
	            case RelationshipTypes.Numbering:
	                this.numberingPart = part = new NumberingPart(this._package, path, this._parser);
	                break;
	            case RelationshipTypes.Styles:
	                this.stylesPart = part = new StylesPart(this._package, path, this._parser);
	                break;
	            case RelationshipTypes.Theme:
	                this.themePart = part = new ThemePart(this._package, path);
	                break;
	            case RelationshipTypes.Footnotes:
	                this.footnotesPart = part = new FootnotesPart(this._package, path, this._parser);
	                break;
	            case RelationshipTypes.Endnotes:
	                this.endnotesPart = part = new EndnotesPart(this._package, path, this._parser);
	                break;
	            case RelationshipTypes.Footer:
	                part = new FooterPart(this._package, path, this._parser);
	                break;
	            case RelationshipTypes.Header:
	                part = new HeaderPart(this._package, path, this._parser);
	                break;
	            case RelationshipTypes.CoreProperties:
	                this.corePropsPart = part = new CorePropsPart(this._package, path);
	                break;
	            case RelationshipTypes.ExtendedProperties:
	                this.extendedPropsPart = part = new ExtendedPropsPart(this._package, path);
	                break;
	            case RelationshipTypes.CustomProperties:
	                part = new CustomPropsPart(this._package, path);
	                break;
	            case RelationshipTypes.Settings:
	                this.settingsPart = part = new SettingsPart(this._package, path);
	                break;
	            case RelationshipTypes.Comments:
	                this.commentsPart = part = new CommentsPart(this._package, path, this._parser);
	                break;
	            case RelationshipTypes.CommentsExtended:
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
	            await Promise.all(part.rels
	                .filter(rel => !isExternalRelationship(rel))
	                .map(rel => this.loadRelationshipPart(resolvePath(rel.target, folder), rel.type)));
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
	        const xmlText = normalizedPath ? (this._snapshotTextParts?.[normalizedPath] ?? await this._package.load(normalizedPath, "string")) : null;
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
	        if (!path)
	            return null;
	        if (this._snapshotAssetDataUrls?.[path])
	            return this._snapshotAssetDataUrls[path];
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
	        }
	        catch (e) {
	            if (this._options?.debug)
	                console.warn(`docx-preview: unable to convert metafile asset ${path}`, e);
	            return null;
	        }
	        return null;
	    }
	    isConvertibleMetafileAsset(path) {
	        const contentType = this.contentTypeForPath(path).toLowerCase();
	        return /\.(emf|wmf)$/i.test(path ?? "")
	            || contentType == "image/x-emf"
	            || contentType == "image/emf"
	            || contentType == "image/x-wmf"
	            || contentType == "image/wmf";
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
	        const contentType = (this.contentTypes ?? []).find(ct => ct.extension?.toLowerCase() == extension);
	        return contentType?.contentType ?? "";
	    }
	    findPartByRelId(id, basePart = null) {
	        var rel = this.getRelById(basePart, id);
	        const path = rel && !isExternalRelationship(rel) ? this.resolveRelationshipTarget(basePart, rel) : null;
	        return path ? this.partsMap[path] : null;
	    }
	    getRelById(part, id) {
	        return (part?.rels ?? this.rels ?? []).find(x => x.id == id);
	    }
	    getPathById(part, id) {
	        const rel = this.getRelById(part, id);
	        return rel && !isExternalRelationship(rel) ? this.resolveRelationshipTarget(part, rel) : null;
	    }
	    resolveRelationshipTarget(part, rel) {
	        const [folder] = part ? splitPath(part.path) : [''];
	        return normalizeSnapshotPath(resolvePath(rel.target, folder));
	    }
	}
	function normalizeSnapshotPath(path) {
	    if (!path)
	        return path;
	    return path.startsWith('/') ? path.substring(1) : path;
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

	function parseBookmarkStart(elem, xml) {
	    return {
	        type: DomType.BookmarkStart,
	        id: xml.attr(elem, "id"),
	        name: xml.attr(elem, "name"),
	        colFirst: xml.intAttr(elem, "colFirst"),
	        colLast: xml.intAttr(elem, "colLast")
	    };
	}
	function parseBookmarkEnd(elem, xml) {
	    return {
	        type: DomType.BookmarkEnd,
	        id: xml.attr(elem, "id")
	    };
	}

	class VmlElement extends OpenXmlElementBase {
	    constructor() {
	        super(...arguments);
	        this.type = DomType.VmlElement;
	        this.attrs = {};
	    }
	}
	function parseVmlElement(elem, parser) {
	    var result = new VmlElement();
	    switch (elem.localName) {
	        case "group":
	            result.tagName = "g";
	            result.isGroup = true;
	            break;
	        case "rect":
	            result.tagName = "rect";
	            Object.assign(result.attrs, { width: '100%', height: '100%' });
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
	            Object.assign(result.attrs, { width: '100%', height: '100%' });
	            break;
	        default:
	            return null;
	    }
	    for (const at of globalXmlParser.attrs(elem)) {
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
	            case "inset":
	                if (result.textInset) {
	                    const values = at.value.trim().split(/\s*,\s*|\s+/);
	                    result.textInset = result.textInset.map((fallback, index) => values[index] || fallback);
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
	    for (const el of globalXmlParser.elements(elem)) {
	        switch (el.localName) {
	            case "stroke":
	                Object.assign(result.attrs, parseStroke(el));
	                break;
	            case "fill":
	                Object.assign(result.attrs, parseFill(el));
	                break;
	            case "imagedata":
	                const imageId = globalXmlParser.attr(el, "id") ?? globalXmlParser.attr(el, "relid") ?? globalXmlParser.attr(el, "pict");
	                if (imageId) {
	                    result.tagName = "image";
	                    Object.assign(result.attrs, vmlImageAttrs(el));
	                    result.imageHref = {
	                        id: imageId,
	                        title: globalXmlParser.attr(el, "title"),
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
	                layoutInCell: !/^(f|false|0|off)$/i.test(globalXmlParser.attr(elem, "allowincell") ?? ""),
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
	function vmlImageAttrs(el) {
	    const cropLeft = parseVmlFraction(globalXmlParser.attr(el, "cropleft"));
	    const cropTop = parseVmlFraction(globalXmlParser.attr(el, "croptop"));
	    const cropRight = parseVmlFraction(globalXmlParser.attr(el, "cropright"));
	    const cropBottom = parseVmlFraction(globalXmlParser.attr(el, "cropbottom"));
	    const cropWidth = Math.max(0.0001, 1 - cropLeft - cropRight);
	    const cropHeight = Math.max(0.0001, 1 - cropTop - cropBottom);
	    const attrs = {
	        x: percent(-cropLeft / cropWidth),
	        y: percent(-cropTop / cropHeight),
	        width: percent(1 / cropWidth),
	        height: percent(1 / cropHeight),
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
	    }
	    else if (raw.endsWith("%")) {
	        result = parseFloat(raw) / 100;
	    }
	    else {
	        result = parseFloat(raw);
	    }
	    if (!Number.isFinite(result))
	        return 0;
	    return Math.max(0, Math.min(0.9999, result));
	}
	function percent(value) {
	    return `${Math.round(value * 100000) / 1000}%`;
	}
	function parseStroke(el) {
	    const result = {};
	    const color = globalXmlParser.attr(el, "color");
	    const weight = globalXmlParser.attr(el, "weight");
	    const on = globalXmlParser.attr(el, "on");
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
	    const color = globalXmlParser.attr(el, "color") ?? globalXmlParser.attr(el, "color2");
	    const on = globalXmlParser.attr(el, "on");
	    const opacity = globalXmlParser.attr(el, "opacity");
	    if (on == "f" || on == "false")
	        result.fill = "none";
	    else if (color)
	        result.fill = color;
	    if (opacity)
	        result["fill-opacity"] = opacity.endsWith('%') ? `${parseFloat(opacity) / 100}` : opacity;
	    return result;
	}
	function parsePoint(val) {
	    return val.trim().split(/[\s,]+/);
	}
	function parseNumericPoint(val) {
	    const [x, y] = parsePoint(val).map(value => Number(value));
	    return [
	        Number.isFinite(x) ? x : 0,
	        Number.isFinite(y) ? y : 0
	    ];
	}
	function convertPath(path) {
	    return path.replace(/([mlxe])|([-\d]+)|([,])/g, (m) => {
	        if (/[-\d]/.test(m))
	            return m;
	        if (/[ml,]/.test(m))
	            return m;
	        if (m == "x")
	            return "z";
	        return '';
	    });
	}

	class WmlComment extends OpenXmlElementBase {
	    constructor() {
	        super(...arguments);
	        this.type = DomType.Comment;
	    }
	}
	class WmlCommentReference extends OpenXmlElementBase {
	    constructor(id) {
	        super();
	        this.id = id;
	        this.type = DomType.CommentReference;
	    }
	}
	class WmlCommentRangeStart extends OpenXmlElementBase {
	    constructor(id) {
	        super();
	        this.id = id;
	        this.type = DomType.CommentRangeStart;
	    }
	}
	class WmlCommentRangeEnd extends OpenXmlElementBase {
	    constructor(id) {
	        super();
	        this.id = id;
	        this.type = DomType.CommentRangeEnd;
	    }
	}

	function createParagraphAddressResolver() {
	    const paths = new WeakMap();
	    const indexed = new WeakSet();
	    function path(node) {
	        const cached = paths.get(node);
	        if (cached)
	            return cached;
	        const parent = node.parentNode?.nodeType === 1 ? node.parentNode : null;
	        if (!parent) {
	            const value = `/${node.nodeName}`;
	            paths.set(node, value);
	            return value;
	        }
	        const prefix = path(parent);
	        if (!indexed.has(parent)) {
	            const groups = new Map();
	            for (const child of Array.from(parent.childNodes)) {
	                if (child.nodeType !== 1)
	                    continue;
	                const element = child;
	                const key = `${element.namespaceURI}|${element.localName}`;
	                const siblings = groups.get(key) ?? [];
	                siblings.push(element);
	                groups.set(key, siblings);
	            }
	            for (const siblings of groups.values())
	                siblings.forEach((sibling, index) => {
	                    paths.set(sibling, `${prefix}/${sibling.nodeName}${siblings.length > 1 ? `[${index + 1}]` : ''}`);
	                });
	            indexed.add(parent);
	        }
	        return paths.get(node);
	    }
	    return (node) => {
	        if (node.localName !== 'p' || node.namespaceURI !== 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
	            return undefined;
	        const id = node.getAttributeNS('http://schemas.microsoft.com/office/word/2010/wordml', 'paraId');
	        return id ? `p:${id}` : `xpath:${path(node)}`;
	    };
	}

	var autos = {
	    shd: "inherit",
	    color: "var(--docx-auto-color, black)",
	    borderColor: "var(--docx-auto-color, black)",
	    highlight: "transparent"
	};
	const supportedNamespaceURIs = [
	    ns.wordprocessingShape,
	    ns.wordprocessingCanvas,
	    ns.wordprocessingGroup,
	    ns.drawingml,
	    ns.picture
	];
	const mmlTagMap = {
	    "oMath": DomType.MmlMath,
	    "oMathPara": DomType.MmlMathParagraph,
	    "f": DomType.MmlFraction,
	    "func": DomType.MmlFunction,
	    "fName": DomType.MmlFunctionName,
	    "num": DomType.MmlNumerator,
	    "den": DomType.MmlDenominator,
	    "rad": DomType.MmlRadical,
	    "deg": DomType.MmlDegree,
	    "e": DomType.MmlBase,
	    "sSup": DomType.MmlSuperscript,
	    "sSub": DomType.MmlSubscript,
	    "sPre": DomType.MmlPreSubSuper,
	    "sup": DomType.MmlSuperArgument,
	    "sub": DomType.MmlSubArgument,
	    "d": DomType.MmlDelimiter,
	    "nary": DomType.MmlNary,
	    "eqArr": DomType.MmlEquationArray,
	    "lim": DomType.MmlLimit,
	    "limLow": DomType.MmlLimitLower,
	    "limUpp": DomType.MmlLimitUpper,
	    "sSubSup": DomType.MmlSubSuperscript,
	    "phant": DomType.MmlPhantom,
	    "borderBox": DomType.MmlBorderBox,
	    "acc": DomType.MmlAccent,
	    "m": DomType.MmlMatrix,
	    "mr": DomType.MmlMatrixRow,
	    "box": DomType.MmlBox,
	    "bar": DomType.MmlBar,
	    "groupChr": DomType.MmlGroupChar
	};
	class DocumentParser {
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
	        for (let el of globalXmlParser.elements(xmlDoc, elemName)) {
	            const node = new elemClass();
	            node.id = globalXmlParser.attr(el, "id");
	            node.noteType = globalXmlParser.attr(el, "type");
	            node.children = this.parseBodyElements(el);
	            result.push(node);
	        }
	        return result;
	    }
	    parseComments(xmlDoc) {
	        var result = [];
	        for (let el of globalXmlParser.elements(xmlDoc, "comment")) {
	            const item = new WmlComment();
	            item.id = globalXmlParser.attr(el, "id");
	            item.author = globalXmlParser.attr(el, "author");
	            item.initials = globalXmlParser.attr(el, "initials");
	            item.date = globalXmlParser.attr(el, "date");
	            item.children = this.parseBodyElements(el);
	            result.push(item);
	        }
	        return result;
	    }
	    parseDocumentFile(xmlDoc) {
	        var xbody = globalXmlParser.element(xmlDoc, "body");
	        var background = globalXmlParser.element(xmlDoc, "background");
	        var sectPr = globalXmlParser.element(xbody, "sectPr");
	        const fill = background?.getElementsByTagNameNS("urn:schemas-microsoft-com:vml", "fill")?.[0];
	        const imageId = fill?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
	        return {
	            type: DomType.Document,
	            children: this.parseBodyElements(xbody),
	            props: parseSectionProperties(sectPr, globalXmlParser),
	            cssStyle: background ? this.parseBackground(background) : {},
	            backgroundImage: imageId ? { id: imageId, type: fill.getAttribute("type") || "tile" } : undefined,
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
	    parseBodyElements(element) {
	        var children = [];
	        for (const elem of globalXmlParser.elements(element)) {
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
	                    children.push(...this.parseSdt(elem, e => this.parseBodyElements(e)));
	                    break;
	                case "ins":
	                    children.push(this.parseRevision(DomType.Inserted, elem, e => ({ children: this.parseBodyElements(e) }), "insert"));
	                    break;
	                case "del":
	                    children.push(this.parseRevision(DomType.Deleted, elem, e => ({ children: this.parseBodyElements(e) }), "delete"));
	                    break;
	                case "moveFrom":
	                    children.push(this.parseRevision(DomType.Deleted, elem, e => ({ children: this.parseBodyElements(e) }), "move-from"));
	                    break;
	                case "moveTo":
	                    children.push(this.parseRevision(DomType.Inserted, elem, e => ({ children: this.parseBodyElements(e) }), "move-to"));
	                    break;
	            }
	        }
	        return children;
	    }
	    parseStylesFile(xstyles) {
	        var result = [];
	        for (const n of globalXmlParser.elements(xstyles)) {
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
	        for (const c of globalXmlParser.elements(node)) {
	            switch (c.localName) {
	                case "rPrDefault":
	                    var rPr = globalXmlParser.element(c, "rPr");
	                    if (rPr)
	                        result.styles.push({
	                            target: "span",
	                            values: this.parseDefaultProperties(rPr, {})
	                        });
	                    break;
	                case "pPrDefault":
	                    var pPr = globalXmlParser.element(c, "pPr");
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
	            id: globalXmlParser.attr(node, "styleId"),
	            isDefault: globalXmlParser.boolAttr(node, "default"),
	            name: null,
	            target: null,
	            basedOn: null,
	            styles: [],
	            linked: null
	        };
	        switch (globalXmlParser.attr(node, "type")) {
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
	        for (const n of globalXmlParser.elements(node)) {
	            switch (n.localName) {
	                case "basedOn":
	                    result.basedOn = globalXmlParser.attr(n, "val");
	                    break;
	                case "name":
	                    result.name = globalXmlParser.attr(n, "val");
	                    break;
	                case "link":
	                    result.linked = globalXmlParser.attr(n, "val");
	                    break;
	                case "next":
	                    result.next = globalXmlParser.attr(n, "val");
	                    break;
	                case "aliases":
	                    result.aliases = globalXmlParser.attr(n, "val").split(",");
	                    break;
	                case "pPr":
	                    result.styles.push({
	                        target: "p",
	                        values: this.parseDefaultProperties(n, {})
	                    });
	                    result.paragraphProps = parseParagraphProperties(n, globalXmlParser);
	                    break;
	                case "rPr":
	                    result.styles.push({
	                        target: "span",
	                        values: this.parseDefaultProperties(n, {})
	                    });
	                    result.runProps = parseRunProperties(n, globalXmlParser);
	                    break;
	                case "tblPr":
	                case "tcPr":
	                    result.styles.push({
	                        target: "td",
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
	        var type = globalXmlParser.attr(node, "type");
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
	            default: return [];
	        }
	        for (const n of globalXmlParser.elements(node)) {
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
	        for (const n of globalXmlParser.elements(node)) {
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
	            abstractLevels[globalXmlParser.attr(n, "abstractNumId")] = this.parseAbstractNumbering(n, bullets);
	        }
	        for (const n of numberNodes) {
	            const numId = globalXmlParser.attr(n, "numId");
	            const abstractNumId = globalXmlParser.elementAttr(n, "abstractNumId", "val");
	            const levels = (abstractLevels[abstractNumId] ?? []).map(x => this.cloneNumberingLevel(x, numId));
	            for (const override of globalXmlParser.elements(n, "lvlOverride")) {
	                const level = globalXmlParser.intAttr(override, "ilvl");
	                const levelNode = globalXmlParser.element(override, "lvl");
	                const startOverride = globalXmlParser.element(override, "startOverride");
	                let target = levels.find(x => x.level == level);
	                if (levelNode) {
	                    target = this.parseNumberingLevel(numId, levelNode, bullets);
	                    const index = levels.findIndex(x => x.level == level);
	                    if (index >= 0)
	                        levels[index] = target;
	                    else
	                        levels.push(target);
	                }
	                if (startOverride && target)
	                    target.start = globalXmlParser.intAttr(startOverride, "val", target.start);
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
	        const id = globalXmlParser.intAttr(elem, "numPicBulletId");
	        const pict = globalXmlParser.element(elem, "pict");
	        const shape = pict && globalXmlParser.element(pict, "shape");
	        const imagedata = shape && globalXmlParser.element(shape, "imagedata");
	        if (imagedata) {
	            return {
	                id,
	                src: globalXmlParser.attr(imagedata, "id"),
	                style: globalXmlParser.attr(shape, "style")
	            };
	        }
	        const drawing = globalXmlParser.element(elem, "drawing");
	        const blip = drawing ? this.findDescendant(drawing, "blip") : null;
	        if (blip) {
	            const extent = drawing ? this.findDescendant(drawing, "extent") : null;
	            const style = [];
	            if (extent) {
	                const width = globalXmlParser.lengthAttr(extent, "cx", LengthUsage.Emu);
	                const height = globalXmlParser.lengthAttr(extent, "cy", LengthUsage.Emu);
	                if (width)
	                    style.push(`width:${width};`);
	                if (height)
	                    style.push(`height:${height};`);
	            }
	            return {
	                id,
	                src: globalXmlParser.attr(blip, "embed") ?? globalXmlParser.attr(blip, "link"),
	                style: style.join("") || undefined
	            };
	        }
	        return null;
	    }
	    parseAbstractNumbering(node, bullets) {
	        var result = [];
	        var id = globalXmlParser.attr(node, "abstractNumId");
	        for (const n of globalXmlParser.elements(node)) {
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
	            id: id,
	            level: globalXmlParser.intAttr(node, "ilvl"),
	            start: 1,
	            pStyleName: undefined,
	            pStyle: {},
	            rStyle: {},
	            suff: "tab"
	        };
	        for (const n of globalXmlParser.elements(node)) {
	            switch (n.localName) {
	                case "start":
	                    result.start = globalXmlParser.intAttr(n, "val");
	                    break;
	                case "pPr":
	                    this.parseDefaultProperties(n, result.pStyle);
	                    break;
	                case "rPr":
	                    this.parseDefaultProperties(n, result.rStyle);
	                    break;
	                case "lvlPicBulletId":
	                    var bulletId = globalXmlParser.intAttr(n, "val");
	                    result.bullet = bullets.find(x => x?.id == bulletId);
	                    break;
	                case "lvlText":
	                    result.levelText = globalXmlParser.attr(n, "val");
	                    break;
	                case "pStyle":
	                    result.pStyleName = globalXmlParser.attr(n, "val");
	                    break;
	                case "numFmt":
	                    result.format = globalXmlParser.attr(n, "val");
	                    break;
	                case "lvlRestart":
	                    result.restart = globalXmlParser.intAttr(n, "val");
	                    break;
	                case "suff":
	                    result.suff = globalXmlParser.attr(n, "val");
	                    break;
	            }
	        }
	        return result;
	    }
	    parseSdt(node, parser) {
	        const sdtContent = globalXmlParser.element(node, "sdtContent");
	        return sdtContent ? parser(sdtContent) : [];
	    }
	    parseInserted(node, parentParser) {
	        return this.parseRevision(DomType.Inserted, node, parentParser);
	    }
	    parseDeleted(node, parentParser) {
	        return this.parseRevision(DomType.Deleted, node, parentParser);
	    }
	    parseRevision(type, node, parentParser, kind = type == DomType.Inserted ? "insert" : "delete") {
	        return {
	            type,
	            children: parentParser(node)?.children ?? [],
	            props: {
	                revision: {
	                    id: globalXmlParser.attr(node, "id"),
	                    author: globalXmlParser.attr(node, "author"),
	                    date: globalXmlParser.attr(node, "date"),
	                    kind
	                }
	            }
	        };
	    }
	    parseAltChunk(node) {
	        return { type: DomType.AltChunk, children: [], id: globalXmlParser.attr(node, "id") };
	    }
	    parseParagraph(node) {
	        var result = { type: DomType.Paragraph, children: [] };
	        if (this.options.exposeDisplayTargets)
	            result.displayAddress = this.paragraphAddress(node);
	        for (let el of globalXmlParser.elements(node)) {
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
	                    result.children.push(parseBookmarkStart(el, globalXmlParser));
	                    break;
	                case "bookmarkEnd":
	                    result.children.push(parseBookmarkEnd(el, globalXmlParser));
	                    break;
	                case "commentRangeStart":
	                    result.children.push(new WmlCommentRangeStart(globalXmlParser.attr(el, "id")));
	                    break;
	                case "commentRangeEnd":
	                    result.children.push(new WmlCommentRangeEnd(globalXmlParser.attr(el, "id")));
	                    break;
	                case "oMath":
	                case "oMathPara": {
	                    const math = this.parseMathElement(el);
	                    if (math)
	                        result.children.push(math);
	                    break;
	                }
	                case "sdt":
	                    result.children.push(...this.parseSdt(el, e => this.parseParagraph(e).children));
	                    break;
	                case "ins":
	                    result.children.push(this.parseInserted(el, e => this.parseParagraph(e)));
	                    break;
	                case "del":
	                    result.children.push(this.parseDeleted(el, e => this.parseParagraph(e)));
	                    break;
	                case "moveFrom":
	                    result.children.push(this.parseRevision(DomType.Deleted, el, e => this.parseParagraph(e), "move-from"));
	                    break;
	                case "moveTo":
	                    result.children.push(this.parseRevision(DomType.Inserted, el, e => this.parseParagraph(e), "move-to"));
	                    break;
	            }
	        }
	        return result;
	    }
	    parseParagraphProperties(elem, paragraph) {
	        this.parseDefaultProperties(elem, paragraph.cssStyle = {}, null, c => {
	            if (c.localName == "rPr") {
	                const paragraphMarkRevisions = globalXmlParser.elements(c)
	                    .filter(item => item.localName == "ins" || item.localName == "del")
	                    .map(item => this.revisionMetadata(item, item.localName == "del" ? "delete" : "insert"));
	                if (paragraphMarkRevisions.length) {
	                    paragraph.props = {
	                        ...(paragraph.props ?? {}),
	                        paragraphMarkRevisions: [...(paragraph.props?.paragraphMarkRevisions ?? []), ...paragraphMarkRevisions]
	                    };
	                }
	                if (paragraphMarkRevisions.some(item => item.kind == "delete"))
	                    paragraph.props = { ...(paragraph.props ?? {}), deletedParagraphMark: true };
	                const background = paragraph.cssStyle["background-color"];
	                this.parseDefaultProperties(c, paragraph.cssStyle);
	                if (background == null)
	                    delete paragraph.cssStyle["background-color"];
	                else
	                    paragraph.cssStyle["background-color"] = background;
	                parseParagraphProperty(c, paragraph, globalXmlParser);
	                return true;
	            }
	            if (c.localName == "pPrChange") {
	                this.addFormatRevision(paragraph, c, "paragraph-format", elem);
	                return true;
	            }
	            if (parseParagraphProperty(c, paragraph, globalXmlParser))
	                return true;
	            switch (c.localName) {
	                case "pStyle":
	                    paragraph.styleName = globalXmlParser.attr(c, "val");
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
	        const dropCap = globalXmlParser.attr(node, "dropCap");
	        paragraph.frame = {
	            dropCap,
	            width: globalXmlParser.lengthAttr(node, "w"),
	            height: globalXmlParser.lengthAttr(node, "h"),
	            horizontalPosition: globalXmlParser.lengthAttr(node, "x"),
	            verticalPosition: globalXmlParser.lengthAttr(node, "y"),
	            horizontalAnchor: globalXmlParser.attr(node, "hAnchor"),
	            verticalAnchor: globalXmlParser.attr(node, "vAnchor"),
	            horizontalAlignment: globalXmlParser.attr(node, "xAlign"),
	            verticalAlignment: globalXmlParser.attr(node, "yAlign"),
	            horizontalSpace: globalXmlParser.lengthAttr(node, "hSpace"),
	            verticalSpace: globalXmlParser.lengthAttr(node, "vSpace"),
	            heightRule: globalXmlParser.attr(node, "hRule"),
	            wrap: globalXmlParser.attr(node, "wrap"),
	            lines: globalXmlParser.intAttr(node, "lines")
	        };
	        if (dropCap == "drop")
	            paragraph.cssStyle["float"] = "left";
	    }
	    parseHyperlink(node, parent) {
	        var result = { type: DomType.Hyperlink, parent: parent, children: [] };
	        result.anchor = globalXmlParser.attr(node, "anchor");
	        result.id = globalXmlParser.attr(node, "id");
	        for (const c of globalXmlParser.elements(node)) {
	            switch (c.localName) {
	                case "r":
	                    result.children.push(this.parseRun(c, result));
	                    break;
	            }
	        }
	        return result;
	    }
	    parseSmartTag(node, parent) {
	        var result = { type: DomType.SmartTag, parent, children: [] };
	        var uri = globalXmlParser.attr(node, "uri");
	        var element = globalXmlParser.attr(node, "element");
	        if (uri)
	            result.uri = uri;
	        if (element)
	            result.element = element;
	        for (const c of globalXmlParser.elements(node)) {
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
	            type: DomType.SimpleField,
	            parent,
	            children: [],
	            instruction: globalXmlParser.attr(node, "instr"),
	            lock: globalXmlParser.boolAttr(node, "lock", false),
	            dirty: globalXmlParser.boolAttr(node, "dirty", false)
	        };
	        for (const c of globalXmlParser.elements(node)) {
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
	                    result.children.push(parseBookmarkStart(c, globalXmlParser));
	                    break;
	                case "bookmarkEnd":
	                    result.children.push(parseBookmarkEnd(c, globalXmlParser));
	                    break;
	                case "commentRangeStart":
	                    result.children.push(new WmlCommentRangeStart(globalXmlParser.attr(c, "id")));
	                    break;
	                case "commentRangeEnd":
	                    result.children.push(new WmlCommentRangeEnd(globalXmlParser.attr(c, "id")));
	                    break;
	                case "sdt":
	                    result.children.push(...this.parseSdt(c, e => this.parseParagraph(e).children));
	                    break;
	                case "ins":
	                    result.children.push(this.parseInserted(c, e => this.parseParagraph(e)));
	                    break;
	                case "del":
	                    result.children.push(this.parseDeleted(c, e => this.parseParagraph(e)));
	                    break;
	                case "moveFrom":
	                    result.children.push(this.parseRevision(DomType.Deleted, c, e => this.parseParagraph(e), "move-from"));
	                    break;
	                case "moveTo":
	                    result.children.push(this.parseRevision(DomType.Inserted, c, e => this.parseParagraph(e), "move-to"));
	                    break;
	            }
	        }
	        return result;
	    }
	    parseRun(node, parent) {
	        var result = { type: DomType.Run, parent: parent, children: [] };
	        for (let c of globalXmlParser.elements(node)) {
	            c = this.checkAlternateContent(c);
	            if (!c)
	                continue;
	            switch (c.localName) {
	                case "t":
	                    result.children.push({
	                        type: DomType.Text,
	                        text: c.textContent
	                    });
	                    break;
	                case "delText":
	                    result.children.push({
	                        type: DomType.DeletedText,
	                        text: c.textContent
	                    });
	                    break;
	                case "commentReference":
	                    result.children.push(new WmlCommentReference(globalXmlParser.attr(c, "id")));
	                    break;
	                case "fldSimple":
	                    result.children.push(this.parseSimpleField(c, result));
	                    break;
	                case "instrText":
	                    result.fieldRun = true;
	                    result.children.push({
	                        type: DomType.Instruction,
	                        text: c.textContent
	                    });
	                    break;
	                case "fldChar":
	                    result.fieldRun = true;
	                    result.children.push({
	                        type: DomType.ComplexField,
	                        charType: globalXmlParser.attr(c, "fldCharType"),
	                        lock: globalXmlParser.boolAttr(c, "lock", false),
	                        dirty: globalXmlParser.boolAttr(c, "dirty", false)
	                    });
	                    break;
	                case "noBreakHyphen":
	                    result.children.push({ type: DomType.NoBreakHyphen });
	                    break;
	                case "softHyphen":
	                    result.children.push({ type: DomType.SoftHyphen });
	                    break;
	                case "cr":
	                    result.children.push({
	                        type: DomType.Break,
	                        break: "line"
	                    });
	                    break;
	                case "ptab":
	                    result.children.push({ type: DomType.PositionalTab });
	                    break;
	                case "br":
	                    result.children.push({
	                        type: DomType.Break,
	                        break: globalXmlParser.attr(c, "type") || "textWrapping"
	                    });
	                    break;
	                case "lastRenderedPageBreak":
	                    result.children.push({
	                        type: DomType.Break,
	                        break: "lastRenderedPageBreak"
	                    });
	                    break;
	                case "sym":
	                    result.children.push({
	                        type: DomType.Symbol,
	                        font: encloseFontFamily(globalXmlParser.attr(c, "font")),
	                        char: globalXmlParser.hexAttr(c, "char")
	                    });
	                    break;
	                case "tab":
	                    result.children.push({ type: DomType.Tab });
	                    break;
	                case "footnoteReference":
	                    result.children.push({
	                        type: DomType.FootnoteReference,
	                        id: globalXmlParser.attr(c, "id"),
	                        customMarkFollows: globalXmlParser.boolAttr(c, "customMarkFollows", false)
	                    });
	                    break;
	                case "endnoteReference":
	                    result.children.push({
	                        type: DomType.EndnoteReference,
	                        id: globalXmlParser.attr(c, "id"),
	                        customMarkFollows: globalXmlParser.boolAttr(c, "customMarkFollows", false)
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
	        const result = { type: DomType.Ruby, children: [] };
	        for (const child of globalXmlParser.elements(elem)) {
	            switch (child.localName) {
	                case "rubyPr":
	                    for (const prop of globalXmlParser.elements(child)) {
	                        switch (prop.localName) {
	                            case "rubyAlign":
	                                result.align = globalXmlParser.attr(prop, "val");
	                                break;
	                        }
	                    }
	                    break;
	                case "rt":
	                    result.children.push(this.parseRubyContent(child, DomType.RubyText));
	                    break;
	                case "rubyBase":
	                    result.children.push(this.parseRubyContent(child, DomType.RubyBase));
	                    break;
	            }
	        }
	        return result;
	    }
	    parseRubyContent(elem, type) {
	        const result = { type, children: [] };
	        for (const child of globalXmlParser.elements(elem)) {
	            if (child.localName == "r")
	                result.children.push(this.parseRun(child, result));
	            else if (type == DomType.RubyText && child.localName == "rPr") {
	                const hps = globalXmlParser.element(child, "hps");
	                const hpsVal = hps ? globalXmlParser.intAttr(hps, "val", null) : null;
	                if (hpsVal != null)
	                    result.cssStyle = { ...(result.cssStyle ?? {}), fontSize: `${hpsVal / 2}pt` };
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
	                }
	                else {
	                    hiddenRevision = true;
	                }
	            }
	            else if (el.localName == "r") {
	                var run = this.parseRun(el, result);
	                run.type = DomType.MmlRun;
	                result.children.push(run);
	            }
	            else if (el.localName == propsTag) {
	                result.props = this.parseMathProperies(el);
	            }
	            else if (el.localName == "ins") {
	                for (const child of globalXmlParser.elements(el))
	                    appendChild(child);
	            }
	            else if (el.localName == "del") {
	                if (this.options.renderChanges || this.options.reviewMode != null) {
	                    for (const child of globalXmlParser.elements(el))
	                        appendChild(child);
	                }
	                else {
	                    hiddenRevision = true;
	                }
	            }
	        };
	        for (const el of globalXmlParser.elements(elem))
	            appendChild(el);
	        if (hiddenRevision && !this.hasVisibleMathContent(result))
	            return null;
	        return result;
	    }
	    hasVisibleMathContent(elem) {
	        for (const child of elem.children ?? []) {
	            switch (child.type) {
	                case DomType.Text:
	                    if (child.text?.length)
	                        return true;
	                    break;
	                case DomType.DeletedText:
	                    if ((this.options.renderChanges || this.options.reviewMode != null) && child.text?.length)
	                        return true;
	                    break;
	                case DomType.Symbol:
	                case DomType.Tab:
	                case DomType.PositionalTab:
	                case DomType.NoBreakHyphen:
	                case DomType.Break:
	                    return true;
	            }
	            if (this.hasVisibleMathContent(child))
	                return true;
	        }
	        return false;
	    }
	    parseMathProperies(elem) {
	        const result = {};
	        for (const el of globalXmlParser.elements(elem)) {
	            switch (el.localName) {
	                case "chr":
	                    result.char = globalXmlParser.attr(el, "val");
	                    break;
	                case "vertJc":
	                    result.verticalJustification = globalXmlParser.attr(el, "val");
	                    break;
	                case "pos":
	                    result.position = globalXmlParser.attr(el, "val");
	                    break;
	                case "degHide":
	                    result.hideDegree = globalXmlParser.boolAttr(el, "val");
	                    break;
	                case "begChr":
	                    result.beginChar = globalXmlParser.attr(el, "val");
	                    break;
	                case "endChr":
	                    result.endChar = globalXmlParser.attr(el, "val");
	                    break;
	                case "limLoc":
	                    result.limitLocation = globalXmlParser.attr(el, "val");
	                    break;
	                case "grow":
	                    result.grow = globalXmlParser.boolAttr(el, "val");
	                    break;
	                case "sepChr":
	                    result.separatorChar = globalXmlParser.attr(el, "val");
	                    break;
	            }
	        }
	        return result;
	    }
	    parseRunProperties(elem, run) {
	        this.parseDefaultProperties(elem, run.cssStyle = {}, null, c => {
	            switch (c.localName) {
	                case "rStyle":
	                    run.styleName = globalXmlParser.attr(c, "val");
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
	        const result = { type: DomType.VmlPicture, children: [] };
	        for (const el of globalXmlParser.elements(elem)) {
	            const child = parseVmlElement(el, this);
	            child && result.children.push(child);
	        }
	        return result;
	    }
	    checkAlternateContent(elem) {
	        if (elem.localName != 'AlternateContent')
	            return elem;
	        for (const choice of globalXmlParser.elements(elem).filter(x => x.localName == "Choice")) {
	            const requires = (globalXmlParser.attr(choice, "Requires") ?? "").split(/\s+/).filter(Boolean);
	            const supported = requires.length > 0 && requires.every(prefix => supportedNamespaceURIs.includes(elem.lookupNamespaceURI(prefix)));
	            if (supported) {
	                const selected = globalXmlParser.elements(choice)[0];
	                if (selected)
	                    return selected;
	            }
	        }
	        const fallback = globalXmlParser.element(elem, "Fallback");
	        return fallback ? globalXmlParser.elements(fallback)[0] : null;
	    }
	    parseDrawing(node) {
	        for (var n of globalXmlParser.elements(node)) {
	            switch (n.localName) {
	                case "inline":
	                case "anchor":
	                    return this.parseDrawingWrapper(n);
	            }
	        }
	    }
	    parseDrawingWrapper(node) {
	        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
	        var result = { type: DomType.Drawing, children: [], cssStyle: {}, props: {} };
	        var isAnchor = node.localName == "anchor";
	        const wrapDistances = {
	            left: globalXmlParser.lengthAttr(node, "distL", LengthUsage.Emu),
	            top: globalXmlParser.lengthAttr(node, "distT", LengthUsage.Emu),
	            right: globalXmlParser.lengthAttr(node, "distR", LengthUsage.Emu),
	            bottom: globalXmlParser.lengthAttr(node, "distB", LengthUsage.Emu)
	        };
	        const addMargin = (prop, value) => {
	            if (value)
	                result.cssStyle[prop] = values.addSize(result.cssStyle[prop], value);
	        };
	        let wrapType = null;
	        let wrapText = null;
	        let wrapPolygon = null;
	        let simplePos = globalXmlParser.boolAttr(node, "simplePos", false);
	        let behindDoc = globalXmlParser.boolAttr(node, "behindDoc", false);
	        let relativeHeight = globalXmlParser.intAttr(node, "relativeHeight", null);
	        if (relativeHeight != null)
	            result.cssStyle["z-index"] = `${Math.max(1, Math.round(relativeHeight / 1000))}`;
	        if (behindDoc)
	            result.cssStyle["z-index"] = "0";
	        let posX = { relative: "page", align: "left", offset: "0" };
	        let posY = { relative: "page", align: "top", offset: "0" };
	        let posXAlignSpecified = false;
	        let posYAlignSpecified = false;
	        let posXOffsetSpecified = false;
	        let posYOffsetSpecified = false;
	        for (var n of globalXmlParser.elements(node)) {
	            switch (n.localName) {
	                case "simplePos":
	                    if (simplePos) {
	                        posX.offset = globalXmlParser.lengthAttr(n, "x", LengthUsage.Emu);
	                        posY.offset = globalXmlParser.lengthAttr(n, "y", LengthUsage.Emu);
	                        posXOffsetSpecified = posX.offset != null;
	                        posYOffsetSpecified = posY.offset != null;
	                    }
	                    break;
	                case "extent":
	                    result.cssStyle["width"] = globalXmlParser.lengthAttr(n, "cx", LengthUsage.Emu);
	                    result.cssStyle["height"] = globalXmlParser.lengthAttr(n, "cy", LengthUsage.Emu);
	                    break;
	                case "effectExtent":
	                    addMargin("margin-left", globalXmlParser.lengthAttr(n, "l", LengthUsage.Emu));
	                    addMargin("margin-top", globalXmlParser.lengthAttr(n, "t", LengthUsage.Emu));
	                    addMargin("margin-right", globalXmlParser.lengthAttr(n, "r", LengthUsage.Emu));
	                    addMargin("margin-bottom", globalXmlParser.lengthAttr(n, "b", LengthUsage.Emu));
	                    break;
	                case "docPr":
	                    result.props.title = globalXmlParser.attr(n, "title") ?? globalXmlParser.attr(n, "name");
	                    result.props.alt = globalXmlParser.attr(n, "descr") ?? result.props.title;
	                    break;
	                case "positionH":
	                case "positionV":
	                    if (!simplePos) {
	                        let isHorizontalPosition = n.localName == "positionH";
	                        let pos = isHorizontalPosition ? posX : posY;
	                        var alignNode = globalXmlParser.element(n, "align");
	                        var offsetNode = globalXmlParser.element(n, "posOffset");
	                        pos.relative = globalXmlParser.attr(n, "relativeFrom") ?? pos.relative;
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
	                    wrapText = globalXmlParser.attr(n, "wrapText");
	                    break;
	                case "wrapTight":
	                    wrapType = "wrapTight";
	                    wrapText = globalXmlParser.attr(n, "wrapText");
	                    wrapPolygon = this.parseWrapPolygon(n);
	                    break;
	                case "wrapThrough":
	                    wrapType = "wrapThrough";
	                    wrapText = globalXmlParser.attr(n, "wrapText");
	                    wrapPolygon = this.parseWrapPolygon(n);
	                    break;
	                case "graphic":
	                    var g = this.parseGraphic(n);
	                    if (g) {
	                        if (g.type == DomType.Image) {
	                            (_a = g).alt ?? (_a.alt = result.props.alt);
	                            (_b = g).title ?? (_b.title = result.props.title);
	                        }
	                        else if (g.type == DomType.Shape) {
	                            (_c = g).alt ?? (_c.alt = result.props.alt);
	                            (_d = g).title ?? (_d.title = result.props.title);
	                        }
	                        else if (g.type == DomType.Chart) {
	                            (_e = g).alt ?? (_e.alt = result.props.alt);
	                            (_f = g).title ?? (_f.title = result.props.title);
	                        }
	                        else if (g.type == DomType.SmartArt) {
	                            (_g = g).alt ?? (_g.alt = result.props.alt);
	                            (_h = g).title ?? (_h.title = result.props.title);
	                        }
	                        else if (g.type == DomType.Ink) {
	                            (_j = g).alt ?? (_j.alt = result.props.alt);
	                            (_k = g).title ?? (_k.title = result.props.title);
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
	            layoutInCell: globalXmlParser.boolAttr(node, "layoutInCell", true),
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
	        }
	        else if (wrapType == "wrapNone") {
	            result.cssStyle["display"] = "block";
	            result.cssStyle["position"] = isAnchor ? "absolute" : "relative";
	            if (posX.offset)
	                result.cssStyle["left"] = posX.offset;
	            if (posY.offset)
	                result.cssStyle["top"] = posY.offset;
	        }
	        else if (wrapType == "wrapSquare" || wrapType == "wrapTight" || wrapType == "wrapThrough") {
	            if (wrapPolygon) {
	                result.cssStyle["shape-outside"] = wrapPolygon;
	                (_l = result.cssStyle)["clip-path"] ?? (_l["clip-path"] = wrapPolygon);
	            }
	            if (wrapText == "left") {
	                result.cssStyle["float"] = "right";
	            }
	            else if (wrapText == "right") {
	                result.cssStyle["float"] = "left";
	            }
	            else if (posX.align == "left" || posX.align == "right") {
	                result.cssStyle["float"] = posX.align;
	            }
	            else {
	                result.cssStyle["display"] = "block";
	                applyHorizontalAlignment();
	            }
	        }
	        else if (isAnchor && (posX.align == "left" || posX.align == "right")) {
	            result.cssStyle["float"] = posX.align;
	        }
	        else {
	            result.cssStyle["vertical-align"] = "text-bottom";
	        }
	        return this.applyDrawingFloatOffsets(result, node);
	    }
	    applyDrawingFloatOffsets(drawing, wrapper) {
	        const style = drawing.cssStyle;
	        const anchor = drawing.props?.anchorPosition;
	        if (!style?.float || !anchor)
	            return drawing;
	        const hasOffset = (direction) => {
	            if (anchor.simplePos)
	                return true;
	            const position = globalXmlParser.element(wrapper, `position${direction}`);
	            return !!position && !!globalXmlParser.element(position, "posOffset");
	        };
	        const length = /^-?\d+(?:\.\d+)?(?:pt|px|in|cm|mm)?$/;
	        const horizontal = anchor.horizontal, vertical = anchor.vertical;
	        if (hasOffset("H") && horizontal?.relative == "column"
	            && length.test(horizontal.offset ?? "") && length.test(style.width ?? "")) {
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
	        const polygon = globalXmlParser.element(elem, "wrapPolygon");
	        if (!polygon)
	            return null;
	        const points = [];
	        const addPoint = (pt) => {
	            const x = globalXmlParser.lengthAttr(pt, "x", LengthUsage.Emu);
	            const y = globalXmlParser.lengthAttr(pt, "y", LengthUsage.Emu);
	            if (x && y)
	                points.push(`${x} ${y}`);
	        };
	        for (const n of globalXmlParser.elements(polygon)) {
	            if (n.localName == "start" || n.localName == "lineTo")
	                addPoint(n);
	        }
	        return points.length >= 3 ? `polygon(${points.join(", ")})` : null;
	    }
	    parseGraphic(elem) {
	        var graphicData = globalXmlParser.element(elem, "graphicData");
	        if (!graphicData)
	            return null;
	        for (let n of globalXmlParser.elements(graphicData)) {
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
	            type: DomType.Shape,
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
	        for (const child of globalXmlParser.elements(elem)) {
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
	        const groupProps = globalXmlParser.element(elem, "grpSpPr");
	        const xfrm = groupProps ? globalXmlParser.element(groupProps, "xfrm") : globalXmlParser.element(elem, "xfrm");
	        const off = xfrm ? globalXmlParser.element(xfrm, "off") : null;
	        const ext = xfrm ? globalXmlParser.element(xfrm, "ext") : null;
	        const chOff = xfrm ? globalXmlParser.element(xfrm, "chOff") : null;
	        const chExt = xfrm ? globalXmlParser.element(xfrm, "chExt") : null;
	        const extCx = ext ? globalXmlParser.floatAttr(ext, "cx", null) : null;
	        const extCy = ext ? globalXmlParser.floatAttr(ext, "cy", null) : null;
	        const chExtCx = chExt ? globalXmlParser.floatAttr(chExt, "cx", null) : null;
	        const chExtCy = chExt ? globalXmlParser.floatAttr(chExt, "cy", null) : null;
	        const parentScaleX = parentTransform?.scaleX ?? 1;
	        const parentScaleY = parentTransform?.scaleY ?? 1;
	        const groupOffX = off ? globalXmlParser.floatAttr(off, "x", 0) : 0;
	        const groupOffY = off ? globalXmlParser.floatAttr(off, "y", 0) : 0;
	        const originX = parentTransform
	            ? parentTransform.originX + (groupOffX - parentTransform.offsetX) * parentScaleX
	            : 0;
	        const originY = parentTransform
	            ? parentTransform.originY + (groupOffY - parentTransform.offsetY) * parentScaleY
	            : 0;
	        return {
	            originX,
	            originY,
	            offsetX: chOff ? globalXmlParser.floatAttr(chOff, "x", 0) : 0,
	            offsetY: chOff ? globalXmlParser.floatAttr(chOff, "y", 0) : 0,
	            scaleX: parentScaleX * (extCx && chExtCx ? extCx / chExtCx : 1),
	            scaleY: parentScaleY * (extCy && chExtCy ? extCy / chExtCy : 1)
	        };
	    }
	    parseDmlPositionedPicture(elem, transform) {
	        const result = this.parsePicture(elem);
	        const spPr = globalXmlParser.element(elem, "spPr");
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
	        const spPr = globalXmlParser.element(elem, "spPr");
	        if (!spPr)
	            return null;
	        const bounds = this.parseDmlShapeBounds(spPr, transform);
	        const textChildren = [];
	        let bodyPr = null;
	        let hasTextBody = false;
	        for (const n of globalXmlParser.elements(elem)) {
	            switch (n.localName) {
	                case "txbx":
	                case "textBox":
	                    hasTextBody = true;
	                    for (const txbxContent of globalXmlParser.elements(n, "txbxContent"))
	                        textChildren.push(...this.parseBodyElements(txbxContent));
	                    break;
	                case "bodyPr":
	                    bodyPr = n;
	                    break;
	            }
	        }
	        bodyPr ?? (bodyPr = globalXmlParser.element(elem, "bodyPr"));
	        const cssStyle = {
	            "position": "absolute",
	            "left": this.pt(bounds.left),
	            "top": this.pt(bounds.top),
	            "width": this.pt(bounds.width),
	            "height": this.pt(bounds.height),
	            "box-sizing": "border-box",
	            "overflow": "hidden"
	        };
	        const cNvPr = globalXmlParser.element(elem, "cNvPr");
	        const geom = globalXmlParser.element(spPr, "custGeom");
	        const prstGeom = globalXmlParser.element(spPr, "prstGeom");
	        const fillStyle = this.parseDmlFillStyle(spPr);
	        const lineStyle = this.parseDmlLineStyle(globalXmlParser.element(spPr, "ln"));
	        if (geom) {
	            const path = this.parseDmlCustomGeometry(geom);
	            return {
	                type: DomType.Shape,
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
	                title: cNvPr ? globalXmlParser.attr(cNvPr, "title") ?? globalXmlParser.attr(cNvPr, "name") : null,
	                alt: cNvPr ? globalXmlParser.attr(cNvPr, "descr") : null
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
	            type: DomType.Shape,
	            children: textChildren,
	            cssStyle,
	            props: { dmlShape: true, presetGeometry: prstGeom ? globalXmlParser.attr(prstGeom, "prst") : null, ...textBoxProps },
	            title: cNvPr ? globalXmlParser.attr(cNvPr, "title") ?? globalXmlParser.attr(cNvPr, "name") : null,
	            alt: cNvPr ? globalXmlParser.attr(cNvPr, "descr") : null
	        };
	    }
	    parseDmlShapeBounds(spPr, transform) {
	        const xfrm = globalXmlParser.element(spPr, "xfrm");
	        const off = xfrm ? globalXmlParser.element(xfrm, "off") : null;
	        const ext = xfrm ? globalXmlParser.element(xfrm, "ext") : null;
	        const scaleX = transform?.scaleX ?? 1;
	        const scaleY = transform?.scaleY ?? 1;
	        const baseX = transform?.offsetX ?? 0;
	        const baseY = transform?.offsetY ?? 0;
	        const originX = transform?.originX ?? 0;
	        const originY = transform?.originY ?? 0;
	        const x = off ? globalXmlParser.floatAttr(off, "x", 0) : 0;
	        const y = off ? globalXmlParser.floatAttr(off, "y", 0) : 0;
	        const cx = ext ? globalXmlParser.floatAttr(ext, "cx", 0) : 0;
	        const cy = ext ? globalXmlParser.floatAttr(ext, "cy", 0) : 0;
	        return {
	            left: this.emuToPt(originX + (x - baseX) * scaleX),
	            top: this.emuToPt(originY + (y - baseY) * scaleY),
	            width: Math.max(0, this.emuToPt(cx * scaleX)),
	            height: Math.max(0, this.emuToPt(cy * scaleY))
	        };
	    }
	    parseDmlFillStyle(spPr) {
	        if (globalXmlParser.element(spPr, "noFill"))
	            return { fill: "none", backgroundColor: "transparent" };
	        const solidFill = globalXmlParser.element(spPr, "solidFill");
	        if (solidFill) {
	            const color = this.parseDmlColor(solidFill) ?? "transparent";
	            return { fill: color, backgroundColor: color };
	        }
	        const pattFill = globalXmlParser.element(spPr, "pattFill");
	        if (pattFill) {
	            const fg = this.parseDmlColor(globalXmlParser.element(pattFill, "fgClr")) ?? "currentColor";
	            const bg = this.parseDmlColor(globalXmlParser.element(pattFill, "bgClr")) ?? "transparent";
	            const prst = globalXmlParser.attr(pattFill, "prst");
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
	        if (!line || globalXmlParser.element(line, "noFill"))
	            return { stroke: "none", strokeWidth: "0", borderType: "none" };
	        const stroke = this.parseDmlColor(globalXmlParser.element(line, "solidFill")) ?? "black";
	        const width = globalXmlParser.attr(line, "w") ? this.pt(this.emuToPt(globalXmlParser.floatAttr(line, "w", 0))) : "0.75pt";
	        const dash = globalXmlParser.elementAttr(line, "prstDash", "val");
	        let strokeDasharray = null;
	        let borderType = "solid";
	        if (dash && dash != "solid") {
	            borderType = "dashed";
	            strokeDasharray = dash == "dot" ? "1 2" : "4 3";
	        }
	        return { stroke, strokeWidth: width, borderType, strokeDasharray };
	    }
	    parseDmlCustomGeometry(geom) {
	        const pathList = globalXmlParser.element(geom, "pathLst");
	        const paths = pathList ? globalXmlParser.elements(pathList, "path") : [];
	        let d = "";
	        let viewWidth = 1;
	        let viewHeight = 1;
	        for (const path of paths) {
	            const width = globalXmlParser.floatAttr(path, "w", viewWidth);
	            const height = globalXmlParser.floatAttr(path, "h", viewHeight);
	            viewWidth = Math.max(viewWidth, width || 1);
	            viewHeight = Math.max(viewHeight, height || 1);
	            d += this.parseDmlPathData(path, width || 1, height || 1);
	        }
	        return { d: d.trim(), viewBox: `0 0 ${viewWidth} ${viewHeight}` };
	    }
	    parseDmlPathData(path, width, height) {
	        const parts = [];
	        const point = (el) => {
	            const pt = globalXmlParser.element(el, "pt");
	            return pt ? `${this.dmlCoord(globalXmlParser.attr(pt, "x"), width, height)} ${this.dmlCoord(globalXmlParser.attr(pt, "y"), width, height)}` : "0 0";
	        };
	        for (const child of globalXmlParser.elements(path)) {
	            switch (child.localName) {
	                case "moveTo":
	                    parts.push(`M ${point(child)}`);
	                    break;
	                case "lnTo":
	                    parts.push(`L ${point(child)}`);
	                    break;
	                case "cubicBezTo":
	                    const cubic = globalXmlParser.elements(child, "pt").map(pt => `${this.dmlCoord(globalXmlParser.attr(pt, "x"), width, height)} ${this.dmlCoord(globalXmlParser.attr(pt, "y"), width, height)}`);
	                    if (cubic.length == 3)
	                        parts.push(`C ${cubic.join(" ")}`);
	                    break;
	                case "quadBezTo":
	                    const quad = globalXmlParser.elements(child, "pt").map(pt => `${this.dmlCoord(globalXmlParser.attr(pt, "x"), width, height)} ${this.dmlCoord(globalXmlParser.attr(pt, "y"), width, height)}`);
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
	        switch (bodyPr ? globalXmlParser.attr(bodyPr, "anchor") : null) {
	            case "ctr": return "center";
	            case "b": return "flex-end";
	            default: return "flex-start";
	        }
	    }
	    applyDmlTextInsets(bodyPr, cssStyle) {
	        if (!bodyPr)
	            return;
	        const map = { lIns: "padding-left", tIns: "padding-top", rIns: "padding-right", bIns: "padding-bottom" };
	        for (const [attr, prop] of Object.entries(map)) {
	            const value = globalXmlParser.attr(bodyPr, attr);
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
	            type: DomType.Chart,
	            id: globalXmlParser.attr(elem, "id"),
	            cssStyle: {
	                "width": "100%",
	                "height": "100%"
	            }
	        };
	    }
	    parseSmartArtReference(elem) {
	        const relIds = elem.localName == "relIds" ? elem : this.findDescendant(elem, "relIds");
	        return {
	            type: DomType.SmartArt,
	            dataId: relIds ? globalXmlParser.attr(relIds, "dm") : globalXmlParser.attr(elem, "dm"),
	            layoutId: relIds ? globalXmlParser.attr(relIds, "lo") : globalXmlParser.attr(elem, "lo"),
	            styleId: relIds ? globalXmlParser.attr(relIds, "qs") : globalXmlParser.attr(elem, "qs"),
	            colorId: relIds ? globalXmlParser.attr(relIds, "cs") : globalXmlParser.attr(elem, "cs"),
	            cssStyle: {
	                "width": "100%",
	                "height": "100%"
	            }
	        };
	    }
	    parseInkReference(elem) {
	        return {
	            type: DomType.Ink,
	            id: globalXmlParser.attr(elem, "id"),
	            cssStyle: {
	                "width": "100%",
	                "height": "100%"
	            }
	        };
	    }
	    parseGraphicPlaceholder(label) {
	        return {
	            type: DomType.Shape,
	            children: [{ type: DomType.Text, text: `[${label}]` }],
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
	            type: DomType.Shape,
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
	            result.title = globalXmlParser.attr(cNvPr, "title") ?? globalXmlParser.attr(cNvPr, "name");
	            result.alt = globalXmlParser.attr(cNvPr, "descr") ?? result.title;
	        }
	        for (const n of globalXmlParser.elements(elem)) {
	            switch (n.localName) {
	                case "spPr":
	                    this.parseDmlShapeProperties(n, result.cssStyle);
	                    break;
	                case "txbx":
	                case "textBox":
	                    hasTextBody = true;
	                    for (const txbxContent of globalXmlParser.elements(n, "txbxContent"))
	                        result.children.push(...this.parseBodyElements(txbxContent));
	                    break;
	                case "bodyPr":
	                    bodyPr = n;
	                    break;
	            }
	        }
	        if (hasTextBody)
	            result.props = { ...(result.props ?? {}), ...this.parseDmlTextBoxProperties(bodyPr) };
	        return result;
	    }
	    parseDmlShapeProperties(elem, style) {
	        const xfrm = globalXmlParser.element(elem, "xfrm");
	        if (xfrm) {
	            for (const n of globalXmlParser.elements(xfrm)) {
	                switch (n.localName) {
	                    case "ext":
	                        style["width"] = globalXmlParser.lengthAttr(n, "cx", LengthUsage.Emu);
	                        style["height"] = globalXmlParser.lengthAttr(n, "cy", LengthUsage.Emu);
	                        break;
	                }
	            }
	        }
	        const solidFill = globalXmlParser.element(elem, "solidFill");
	        const noFill = globalXmlParser.element(elem, "noFill");
	        const line = globalXmlParser.element(elem, "ln");
	        if (solidFill)
	            style["background-color"] = this.parseDmlColor(solidFill) ?? style["background-color"];
	        else if (noFill)
	            style["background-color"] = "transparent";
	        if (line && globalXmlParser.element(line, "noFill")) {
	            style["border"] = "none";
	        }
	        else if (line) {
	            const lineColor = this.parseDmlColor(globalXmlParser.element(line, "solidFill")) ?? "black";
	            const lineWidth = globalXmlParser.lengthAttr(line, "w", LengthUsage.Emu) ?? "1px";
	            const dash = globalXmlParser.elementAttr(line, "prstDash", "val");
	            const borderType = dash && dash != "solid" ? "dashed" : "solid";
	            style["border"] = `${lineWidth} ${borderType} ${lineColor}`;
	        }
	    }
	    parseDmlColor(elem) {
	        if (!elem)
	            return null;
	        const srgbClr = globalXmlParser.element(elem, "srgbClr");
	        const schemeClr = globalXmlParser.element(elem, "schemeClr");
	        const prstClr = globalXmlParser.element(elem, "prstClr");
	        const sysClr = globalXmlParser.element(elem, "sysClr");
	        if (srgbClr)
	            return this.applyDmlColorTransforms(srgbClr, `#${globalXmlParser.attr(srgbClr, "val")}`);
	        if (schemeClr) {
	            const scheme = this.resolveDmlSchemeColor(globalXmlParser.attr(schemeClr, "val"));
	            const fallback = this.dmlSchemeColorFallback(scheme);
	            return this.applyDmlColorTransforms(schemeClr, `var(--docx-${scheme}-color${fallback ? `, ${fallback}` : ""})`);
	        }
	        if (sysClr)
	            return this.applyDmlColorTransforms(sysClr, `#${globalXmlParser.attr(sysClr, "lastClr") ?? globalXmlParser.attr(sysClr, "val")}`);
	        return prstClr ? this.applyDmlColorTransforms(prstClr, globalXmlParser.attr(prstClr, "val")) : null;
	    }
	    resolveDmlSchemeColor(value) {
	        switch (value) {
	            case "bg1": return "lt1";
	            case "tx1": return "dk1";
	            case "bg2": return "lt2";
	            case "tx2": return "dk2";
	            default: return value;
	        }
	    }
	    dmlSchemeColorFallback(value) {
	        return themeSchemeColorFallback(value);
	    }
	    applyDmlColorTransforms(elem, color) {
	        const lumMod = globalXmlParser.elementAttr(elem, "lumMod", "val");
	        const lumOff = globalXmlParser.elementAttr(elem, "lumOff", "val");
	        if (lumMod != null) {
	            const percent = Math.max(0, Math.min(100, parseFloat(lumMod) / 1000));
	            if (Number.isFinite(percent) && percent < 100)
	                color = `color-mix(in srgb, ${color} ${percent}%, black)`;
	        }
	        if (lumOff != null) {
	            const percent = Math.max(0, Math.min(100, parseFloat(lumOff) / 1000));
	            if (Number.isFinite(percent) && percent > 0)
	                color = `color-mix(in srgb, ${color} ${100 - percent}%, white)`;
	        }
	        return color;
	    }
	    findDescendant(elem, localName) {
	        for (const child of globalXmlParser.elements(elem)) {
	            if (child.localName == localName)
	                return child;
	            const nested = this.findDescendant(child, localName);
	            if (nested)
	                return nested;
	        }
	        return null;
	    }
	    parsePicture(elem) {
	        var result = { type: DomType.Image, src: "", cssStyle: {} };
	        var blipFill = globalXmlParser.element(elem, "blipFill");
	        var blip = blipFill ? globalXmlParser.element(blipFill, "blip") : null;
	        var srcRect = blipFill ? globalXmlParser.element(blipFill, "srcRect") : null;
	        result.src = blip ? (globalXmlParser.attr(blip, "embed") ?? globalXmlParser.attr(blip, "link")) : "";
	        const cNvPr = this.findDescendant(elem, "cNvPr");
	        if (cNvPr) {
	            result.title = globalXmlParser.attr(cNvPr, "title") ?? globalXmlParser.attr(cNvPr, "name");
	            result.alt = globalXmlParser.attr(cNvPr, "descr") ?? result.title;
	        }
	        if (srcRect) {
	            result.srcRect = [
	                globalXmlParser.intAttr(srcRect, "l", 0) / 100000,
	                globalXmlParser.intAttr(srcRect, "t", 0) / 100000,
	                globalXmlParser.intAttr(srcRect, "r", 0) / 100000,
	                globalXmlParser.intAttr(srcRect, "b", 0) / 100000,
	            ];
	        }
	        var spPr = globalXmlParser.element(elem, "spPr");
	        var xfrm = spPr ? globalXmlParser.element(spPr, "xfrm") : null;
	        var transforms = [];
	        result.cssStyle["display"] = "block";
	        result.cssStyle["position"] = "relative";
	        result.cssStyle["object-fit"] = "contain";
	        if (xfrm) {
	            result.rotation = globalXmlParser.intAttr(xfrm, "rot", 0) / 60000;
	            if (globalXmlParser.boolAttr(xfrm, "flipH", false))
	                transforms.push("scaleX(-1)");
	            if (globalXmlParser.boolAttr(xfrm, "flipV", false))
	                transforms.push("scaleY(-1)");
	            for (var n of globalXmlParser.elements(xfrm)) {
	                switch (n.localName) {
	                    case "ext":
	                        result.cssStyle["width"] = globalXmlParser.lengthAttr(n, "cx", LengthUsage.Emu);
	                        result.cssStyle["height"] = globalXmlParser.lengthAttr(n, "cy", LengthUsage.Emu);
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
	    parseTable(node) {
	        var result = { type: DomType.Table, children: [] };
	        for (const c of globalXmlParser.elements(node)) {
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
	        for (const n of globalXmlParser.elements(node)) {
	            switch (n.localName) {
	                case "gridCol":
	                    result.push({ width: globalXmlParser.lengthAttr(n, "w") });
	                    break;
	            }
	        }
	        return result;
	    }
	    parseTableProperties(elem, table) {
	        table.cssStyle = {};
	        table.cellStyle = {};
	        let tableIndent = null;
	        this.parseDefaultProperties(elem, table.cssStyle, table.cellStyle, c => {
	            switch (c.localName) {
	                case "tblStyle":
	                    table.styleName = globalXmlParser.attr(c, "val");
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
	                    table.colBandSize = globalXmlParser.intAttr(c, "val");
	                    break;
	                case "tblStyleRowBandSize":
	                    table.rowBandSize = globalXmlParser.intAttr(c, "val");
	                    break;
	                case "tblPrChange":
	                    this.addFormatRevision(table, c, "table-format", elem);
	                    break;
	                case "hidden":
	                    if (globalXmlParser.boolAttr(c, "val", true))
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
	        const type = globalXmlParser.attr(node, "type");
	        if (type == "pct" || type == "auto")
	            return null;
	        return globalXmlParser.lengthAttr(node, "w", LengthUsage.SignedDxa);
	    }
	    parseTablePosition(node, table) {
	        var topFromText = globalXmlParser.lengthAttr(node, "topFromText");
	        var bottomFromText = globalXmlParser.lengthAttr(node, "bottomFromText");
	        var rightFromText = globalXmlParser.lengthAttr(node, "rightFromText");
	        var leftFromText = globalXmlParser.lengthAttr(node, "leftFromText");
	        table.cssStyle["float"] = 'left';
	        table.cssStyle["margin-bottom"] = values.addSize(table.cssStyle["margin-bottom"], bottomFromText);
	        table.cssStyle["margin-left"] = values.addSize(table.cssStyle["margin-left"], leftFromText);
	        table.cssStyle["margin-right"] = values.addSize(table.cssStyle["margin-right"], rightFromText);
	        table.cssStyle["margin-top"] = values.addSize(table.cssStyle["margin-top"], topFromText);
	    }
	    parseTableRow(node) {
	        var result = { type: DomType.Row, children: [] };
	        for (const c of globalXmlParser.elements(node)) {
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
	        row.cssStyle = this.parseDefaultProperties(elem, rowStyle, null, c => {
	            switch (c.localName) {
	                case "cnfStyle":
	                    row.className = values.classNameOfCnfStyle(c);
	                    break;
	                case "tblHeader":
	                    row.isHeader = globalXmlParser.boolAttr(c, "val");
	                    break;
	                case "gridBefore":
	                    row.gridBefore = globalXmlParser.intAttr(c, "val");
	                    break;
	                case "gridAfter":
	                    row.gridAfter = globalXmlParser.intAttr(c, "val");
	                    break;
	                case "cantSplit":
	                    if (globalXmlParser.boolAttr(c, "val", true))
	                        rowStyle["break-inside"] = "avoid";
	                    break;
	                case "hidden":
	                    if (globalXmlParser.boolAttr(c, "val", true))
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
	        var result = { type: DomType.Cell, children: [] };
	        for (const c of globalXmlParser.elements(node)) {
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
	        cell.cssStyle = this.parseDefaultProperties(elem, {}, null, c => {
	            switch (c.localName) {
	                case "gridSpan":
	                    cell.span = globalXmlParser.intAttr(c, "val", null);
	                    break;
	                case "hMerge":
	                    cell.horizontalMerge = globalXmlParser.attr(c, "val") ?? "continue";
	                    break;
	                case "vMerge":
	                    cell.verticalMerge = globalXmlParser.attr(c, "val") ?? "continue";
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
	        const cellBorders = globalXmlParser.element(elem, "tcBorders");
	        if (cellBorders) {
	            const diagonalBorders = {};
	            for (const border of globalXmlParser.elements(cellBorders)) {
	                if (border.localName === "tl2br" || border.localName === "tr2bl")
	                    diagonalBorders[border.localName] = values.valueOfBorder(border);
	            }
	            if (Object.keys(diagonalBorders).length)
	                cell.props = { ...cell.props, diagonalBorders };
	        }
	        this.parseTableCellVerticalText(elem, cell);
	    }
	    addStructuralRevision(element, node, kind) {
	        element.props = { ...(element.props ?? {}), revision: this.revisionMetadata(node, kind) };
	    }
	    addFormatRevision(element, node, kind, currentPropertiesNode) {
	        const oldPropertiesNode = globalXmlParser.elements(node)[0];
	        const before = this.captureFormatProperties(oldPropertiesNode);
	        const after = this.captureFormatProperties(currentPropertiesNode);
	        const propertyNames = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
	        const formatChanges = propertyNames
	            .filter(property => before[property] !== after[property])
	            .map(property => ({ property, before: before[property], after: after[property] }));
	        const revision = { ...this.revisionMetadata(node, kind), formatChanges };
	        const formatRevisions = [...(element.props?.formatRevisions ?? []), revision];
	        element.props = { ...(element.props ?? {}), formatRevisions };
	    }
	    captureFormatProperties(node) {
	        const result = {};
	        if (!node)
	            return result;
	        for (const property of globalXmlParser.elements(node)) {
	            if (/PrChange$/.test(property.localName))
	                continue;
	            result[property.localName] = this.serializeFormatProperty(property);
	        }
	        return result;
	    }
	    serializeFormatProperty(node) {
	        const attributes = Array.from(node.attributes ?? [])
	            .map(attribute => [attribute.localName || attribute.name, attribute.value])
	            .sort(([left], [right]) => left.localeCompare(right))
	            .map(([name, value]) => `${name}=${value}`);
	        const children = globalXmlParser.elements(node)
	            .map(child => `${child.localName}{${this.serializeFormatProperty(child)}}`);
	        return [...attributes, ...children].join("|") || "true";
	    }
	    revisionMetadata(node, kind) {
	        return {
	            id: globalXmlParser.attr(node, "id"),
	            author: globalXmlParser.attr(node, "author"),
	            date: globalXmlParser.attr(node, "date"),
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
	        for (const c of globalXmlParser.elements(elem)) {
	            if (c.localName === "textDirection") {
	                const direction = globalXmlParser.attr(c, "val");
	                const style = directionMap[direction] || { writingMode: "horizontal-tb" };
	                cell.cssStyle["writing-mode"] = style.writingMode;
	                cell.cssStyle["transform"] = style.transform;
	            }
	        }
	    }
	    parseDefaultProperties(elem, style = null, childStyle = null, handler = null) {
	        style = style || {};
	        const language = globalXmlParser.element(elem, "lang");
	        const languages = {
	            latin: language ? globalXmlParser.attr(language, "val") : "",
	            eastAsia: language ? globalXmlParser.attr(language, "eastAsia") : "",
	            bidi: language ? globalXmlParser.attr(language, "bidi") : "",
	        };
	        for (const c of globalXmlParser.elements(elem)) {
	            if (handler?.(c))
	                continue;
	            switch (c.localName) {
	                case "jc":
	                    style["text-align"] = values.valueOfJc(c);
	                    break;
	                case "textAlignment":
	                    style["vertical-align"] = values.valueOfTextAlignment(c);
	                    break;
	                case "color":
	                    style["color"] = xmlUtil.colorAttr(c, "val", null, autos.color);
	                    break;
	                case "sz":
	                    style["font-size"] = style["min-height"] = globalXmlParser.lengthAttr(c, "val", LengthUsage.FontSize);
	                    break;
	                case "szCs":
	                    style["font-size"] ?? (style["font-size"] = globalXmlParser.lengthAttr(c, "val", LengthUsage.FontSize));
	                    style["min-height"] ?? (style["min-height"] = style["font-size"]);
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
	                    style["vertical-align"] = globalXmlParser.lengthAttr(c, "val", LengthUsage.SignedHalfPoint);
	                    break;
	                case "w":
	                case "scale":
	                    const textScale = globalXmlParser.intAttr(c, "val", 100);
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
	                    style["text-decoration"] = globalXmlParser.boolAttr(c, "val", true) ? "line-through" : "none";
	                    break;
	                case "dstrike":
	                    if (globalXmlParser.boolAttr(c, "val", true)) {
	                        style["text-decoration-line"] = "line-through";
	                        style["text-decoration-style"] = "double";
	                    }
	                    else {
	                        style["text-decoration"] = "none";
	                    }
	                    break;
	                case "b":
	                    style["font-weight"] = globalXmlParser.boolAttr(c, "val", true) ? "bold" : "normal";
	                    break;
	                case "i":
	                    style["font-style"] = globalXmlParser.boolAttr(c, "val", true) ? "italic" : "normal";
	                    break;
	                case "bCs":
	                    style["--docx-bidi-font-weight"] = globalXmlParser.boolAttr(c, "val", true) ? "bold" : "normal";
	                    if (style["direction"] == "rtl")
	                        style["font-weight"] = style["--docx-bidi-font-weight"];
	                    break;
	                case "iCs":
	                    style["--docx-bidi-font-style"] = globalXmlParser.boolAttr(c, "val", true) ? "italic" : "normal";
	                    if (style["direction"] == "rtl")
	                        style["font-style"] = style["--docx-bidi-font-style"];
	                    break;
	                case "caps":
	                    style["text-transform"] = globalXmlParser.boolAttr(c, "val", true) ? "uppercase" : "none";
	                    break;
	                case "smallCaps":
	                    style["font-variant"] = globalXmlParser.boolAttr(c, "val", true) ? "small-caps" : "none";
	                    break;
	                case "rtl":
	                    if (globalXmlParser.boolAttr(c, "val", true)) {
	                        style["direction"] = "rtl";
	                        style["unicode-bidi"] = "embed";
	                        if (style["--docx-bidi-font-weight"])
	                            style["font-weight"] = style["--docx-bidi-font-weight"];
	                        if (style["--docx-bidi-font-style"])
	                            style["font-style"] = style["--docx-bidi-font-style"];
	                    }
	                    break;
	                case "outline":
	                    if (globalXmlParser.boolAttr(c, "val", true))
	                        style["-webkit-text-stroke"] = "0.5px currentColor";
	                    break;
	                case "shadow":
	                    if (globalXmlParser.boolAttr(c, "val", true))
	                        style["text-shadow"] = "1px 1px 0 currentColor";
	                    break;
	                case "emboss":
	                    if (globalXmlParser.boolAttr(c, "val", true))
	                        style["text-shadow"] = "-1px -1px 0 rgba(255,255,255,.75), 1px 1px 0 rgba(0,0,0,.35)";
	                    break;
	                case "imprint":
	                    if (globalXmlParser.boolAttr(c, "val", true))
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
	                    if (globalXmlParser.boolAttr(c, "val", true))
	                        style["display"] = "none";
	                    break;
	                case "kern":
	                    style["font-kerning"] = globalXmlParser.intAttr(c, "val", 0) > 0 ? "normal" : "none";
	                    break;
	                case "noWrap":
	                    style["white-space"] = globalXmlParser.boolAttr(c, "val", true) ? "nowrap" : "normal";
	                    break;
	                case "snapToGrid":
	                    style["--docx-snap-to-grid"] = globalXmlParser.boolAttr(c, "val", true) ? "1" : "0";
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
	                        style["letter-spacing"] = globalXmlParser.lengthAttr(c, "val", LengthUsage.SignedDxa);
	                    break;
	                case "wordWrap":
	                    if (globalXmlParser.boolAttr(c, "val"))
	                        style["overflow-wrap"] = "break-word";
	                    break;
	                case "suppressAutoHyphens":
	                    style["hyphens"] = globalXmlParser.boolAttr(c, "val", true) ? "none" : "auto";
	                    break;
	                case "lang":
	                    style["$lang"] = globalXmlParser.attr(c, "val");
	                    style["$lang-eastAsia"] = globalXmlParser.attr(c, "eastAsia");
	                    style["$lang-bidi"] = globalXmlParser.attr(c, "bidi");
	                    break;
	                case "rtl":
	                case "bidi":
	                    if (globalXmlParser.boolAttr(c, "val", true))
	                        style["direction"] = "rtl";
	                    break;
	                case "pageBreakBefore":
	                    if (globalXmlParser.boolAttr(c, "val", true))
	                        style["break-before"] = "page";
	                    break;
	                case "keepLines":
	                    if (globalXmlParser.boolAttr(c, "val", true))
	                        style["break-inside"] = "avoid";
	                    break;
	                case "keepNext":
	                    if (globalXmlParser.boolAttr(c, "val", true))
	                        style["break-after"] = "avoid";
	                    break;
	                case "widowControl":
	                    if (globalXmlParser.boolAttr(c, "val", true)) {
	                        style["orphans"] = "2";
	                        style["widows"] = "2";
	                    }
	                    break;
	                case "webHidden":
	                    if (this.options.hideWebHiddenContent && globalXmlParser.boolAttr(c, "val", true))
	                        style["display"] = "none";
	                    break;
	                case "specVanish":
	                    if (globalXmlParser.boolAttr(c, "val", true))
	                        style["display"] = "none";
	                    break;
	                case "tabs":
	                case "outlineLvl":
	                case "contextualSpacing":
	                case "tblStyleColBandSize":
	                case "tblStyleRowBandSize":
	                case "suppressLineNumbers":
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
	        const width = globalXmlParser.lengthAttr(node, "val");
	        if (width) {
	            style["display"] = "inline-block";
	            style["width"] = width;
	            style["text-align"] = "justify";
	            style["text-align-last"] = "justify";
	        }
	    }
	    parseEastAsianLayout(node, style) {
	        if (globalXmlParser.boolAttr(node, "combine", false))
	            style["text-combine-upright"] = "all";
	        if (globalXmlParser.boolAttr(node, "vert", false))
	            style["writing-mode"] = "vertical-rl";
	        if (globalXmlParser.boolAttr(node, "vertCompress", false))
	            style["font-stretch"] = "condensed";
	    }
	    parseUnderline(node, style) {
	        var val = globalXmlParser.attr(node, "val");
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
	        var ascii = globalXmlParser.attr(node, "ascii");
	        var hAnsi = globalXmlParser.attr(node, "hAnsi");
	        var eastAsia = globalXmlParser.attr(node, "eastAsia");
	        var cs = globalXmlParser.attr(node, "cs");
	        var asciiTheme = values.themeValue(node, "asciiTheme");
	        var hAnsiTheme = values.themeValue(node, "hAnsiTheme");
	        var eastAsiaTheme = this.scriptThemeFontValue(values.themeValue(node, "eastAsiaTheme"), languages.eastAsia);
	        var csTheme = this.scriptThemeFontValue(values.themeValue(node, "cstheme") ?? values.themeValue(node, "csTheme"), languages.bidi);
	        const eastAsiaScript = themeScriptForLanguage(languages.eastAsia);
	        const expandDirectFont = (font, script = "") => isEastAsianFontFamily(font)
	            ? eastAsianFontFamilyStack(font, script)
	            : [encloseFontFamily(font)];
	        var fonts = [ascii, hAnsi]
	            .filter(x => x)
	            .flatMap(x => expandDirectFont(x, eastAsiaScript));
	        fonts.push(...[asciiTheme, hAnsiTheme]
	            .filter(x => x)
	            .map(x => x.startsWith("var(") ? x : encloseFontFamily(x)));
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
	            const currentFonts = (style["font-family"] ?? "").split(',').map(x => x.trim()).filter(x => x);
	            style["font-family"] = [...new Set([...currentFonts, ...fonts])].join(', ');
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
	        var firstLine = globalXmlParser.lengthAttr(node, "firstLine");
	        var hanging = globalXmlParser.lengthAttr(node, "hanging");
	        var left = globalXmlParser.lengthAttr(node, "left");
	        var start = globalXmlParser.lengthAttr(node, "start");
	        var right = globalXmlParser.lengthAttr(node, "right");
	        var end = globalXmlParser.lengthAttr(node, "end");
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
	        var before = globalXmlParser.lengthAttr(node, "before");
	        var after = globalXmlParser.lengthAttr(node, "after");
	        var beforeLines = globalXmlParser.intAttr(node, "beforeLines", null);
	        var afterLines = globalXmlParser.intAttr(node, "afterLines", null);
	        var beforeAuto = globalXmlParser.boolAttr(node, "beforeAutospacing", false);
	        var afterAuto = globalXmlParser.boolAttr(node, "afterAutospacing", false);
	        var line = globalXmlParser.intAttr(node, "line", null);
	        var lineRule = globalXmlParser.attr(node, "lineRule");
	        if (beforeAuto)
	            style["margin-top"] = "auto";
	        else if (Number.isFinite(beforeLines) && beforeLines >= 0)
	            style["margin-top"] = `${(beforeLines / 100).toFixed(2)}em`;
	        else if (before)
	            style["margin-top"] = before;
	        if (afterAuto)
	            style["margin-bottom"] = "auto";
	        else if (Number.isFinite(afterLines) && afterLines >= 0)
	            style["margin-bottom"] = `${(afterLines / 100).toFixed(2)}em`;
	        else if (after)
	            style["margin-bottom"] = after;
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
	        for (const c of globalXmlParser.elements(node)) {
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
	        switch (globalXmlParser.attr(node, "hRule")) {
	            case "exact":
	                output["height"] = globalXmlParser.lengthAttr(node, "val");
	                break;
	            case "atLeast":
	            default:
	                output["height"] = globalXmlParser.lengthAttr(node, "val");
	                break;
	        }
	    }
	    parseBorderProperties(node, output) {
	        for (const c of globalXmlParser.elements(node)) {
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
	}
	const knownColors = ['black', 'blue', 'cyan', 'darkBlue', 'darkCyan', 'darkGray', 'darkGreen', 'darkMagenta', 'darkRed', 'darkYellow', 'green', 'lightGray', 'magenta', 'none', 'red', 'white', 'yellow'];
	const wmlThemeColorAliases = {
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
	        case "dk1": return "#000000";
	        case "lt1": return "#FFFFFF";
	        case "dk2": return "#44546A";
	        case "lt2": return "#E7E6E6";
	        case "accent1": return "#4472C4";
	        case "accent2": return "#ED7D31";
	        case "accent3": return "#A5A5A5";
	        case "accent4": return "#FFC000";
	        case "accent5": return "#5B9BD5";
	        case "accent6": return "#70AD47";
	        case "hlink": return "#0563C1";
	        case "folHlink": return "#954F72";
	        default: return null;
	    }
	}
	class xmlUtil {
	    static colorAttr(node, attrName, defValue = null, autoColor = autos.color) {
	        var v = globalXmlParser.attr(node, attrName);
	        if (v) {
	            if (v == "auto") {
	                return autoColor;
	            }
	            else if (knownColors.includes(v)) {
	                return v;
	            }
	            return `#${v}`;
	        }
	        var themeColor = globalXmlParser.attr(node, "themeColor");
	        if (themeColor) {
	            const scheme = resolveWmlThemeColor(themeColor);
	            const fallback = themeSchemeColorFallback(scheme);
	            return `var(--docx-${scheme}-color${fallback ? `, ${fallback}` : ""})`;
	        }
	        return defValue;
	    }
	}
	class values {
	    static themeValue(c, attr) {
	        var val = globalXmlParser.attr(c, attr);
	        return val ? `var(--docx-${val}-font)` : null;
	    }
	    static valueOfSize(c, attr) {
	        var type = LengthUsage.Dxa;
	        switch (globalXmlParser.attr(c, "type")) {
	            case "dxa": break;
	            case "pct":
	                type = LengthUsage.Percent;
	                break;
	            case "auto": return "auto";
	        }
	        return globalXmlParser.lengthAttr(c, attr, type);
	    }
	    static valueOfMargin(c) {
	        return globalXmlParser.lengthAttr(c, "w");
	    }
	    static valueOfBorder(c) {
	        var type = values.parseBorderType(globalXmlParser.attr(c, "val"));
	        if (type == "none")
	            return "none";
	        var color = xmlUtil.colorAttr(c, "color", autos.borderColor, autos.borderColor);
	        var size = globalXmlParser.lengthAttr(c, "sz", LengthUsage.Border) ?? "1pt";
	        return `${size} ${type} ${color == "auto" ? autos.borderColor : color}`;
	    }
	    static parseBorderType(type) {
	        switch (type) {
	            case "single": return "solid";
	            case "dashDotStroked": return "solid";
	            case "dashed": return "dashed";
	            case "dashSmallGap": return "dashed";
	            case "dotDash": return "dotted";
	            case "dotDotDash": return "dotted";
	            case "dotted": return "dotted";
	            case "double": return "double";
	            case "doubleWave": return "double";
	            case "inset": return "inset";
	            case "nil": return "none";
	            case "none": return "none";
	            case "outset": return "outset";
	            case "thick": return "solid";
	            case "thickThinLargeGap": return "solid";
	            case "thickThinMediumGap": return "solid";
	            case "thickThinSmallGap": return "solid";
	            case "thinThickLargeGap": return "solid";
	            case "thinThickMediumGap": return "solid";
	            case "thinThickSmallGap": return "solid";
	            case "thinThickThinLargeGap": return "solid";
	            case "thinThickThinMediumGap": return "solid";
	            case "thinThickThinSmallGap": return "solid";
	            case "threeDEmboss": return "solid";
	            case "threeDEngrave": return "solid";
	            case "triple": return "double";
	            case "wave": return "solid";
	        }
	        return 'solid';
	    }
	    static valueOfTblLayout(c) {
	        var type = globalXmlParser.attr(c, "type") ?? globalXmlParser.attr(c, "val");
	        return type == "fixed" ? "fixed" : "auto";
	    }
	    static classNameOfCnfStyle(c) {
	        const val = globalXmlParser.attr(c, "val");
	        const classes = [
	            'first-row', 'last-row', 'first-col', 'last-col',
	            'odd-col', 'even-col', 'odd-row', 'even-row',
	            'ne-cell', 'nw-cell', 'se-cell', 'sw-cell'
	        ];
	        return classes.filter((_, i) => val[i] == '1').join(' ');
	    }
	    static valueOfJc(c) {
	        var type = globalXmlParser.attr(c, "val");
	        switch (type) {
	            case "start":
	            case "left": return "left";
	            case "center": return "center";
	            case "end":
	            case "right": return "right";
	            case "both": return "justify";
	        }
	        return type;
	    }
	    static valueOfVertAlign(c, asTagName = false) {
	        var type = globalXmlParser.attr(c, "val");
	        switch (type) {
	            case "subscript": return "sub";
	            case "superscript": return asTagName ? "sup" : "super";
	        }
	        return asTagName ? null : type;
	    }
	    static valueOfEmphasisMark(c) {
	        var type = globalXmlParser.attr(c, "val");
	        switch (type) {
	            case "none": return "none";
	            case "comma": return "\"﹐\"";
	            case "circle": return "circle";
	            case "dot":
	            case "underDot":
	            default:
	                return "dot";
	        }
	    }
	    static valueOfTextAlignment(c) {
	        var type = globalXmlParser.attr(c, "val");
	        switch (type) {
	            case "auto":
	            case "baseline": return "baseline";
	            case "top": return "top";
	            case "center": return "middle";
	            case "bottom": return "bottom";
	        }
	        return type;
	    }
	    static addSize(a, b) {
	        if (!a || a == "0.00pt" || a == "0px")
	            return b;
	        if (!b || b == "0.00pt" || b == "0px")
	            return a;
	        return `calc(${a} + ${b})`;
	    }
	    static classNameOftblLook(c) {
	        const val = globalXmlParser.hexAttr(c, "val", 0);
	        let className = "";
	        if (globalXmlParser.boolAttr(c, "firstRow") || (val & 0x0020))
	            className += " first-row";
	        if (globalXmlParser.boolAttr(c, "lastRow") || (val & 0x0040))
	            className += " last-row";
	        if (globalXmlParser.boolAttr(c, "firstColumn") || (val & 0x0080))
	            className += " first-col";
	        if (globalXmlParser.boolAttr(c, "lastColumn") || (val & 0x0100))
	            className += " last-col";
	        if (globalXmlParser.boolAttr(c, "noHBand") || (val & 0x0200))
	            className += " no-hband";
	        if (globalXmlParser.boolAttr(c, "noVBand") || (val & 0x0400))
	            className += " no-vband";
	        return className.trim();
	    }
	}

	const EMPTY_DOCX_ERROR_MESSAGE = "文件为空或尚未保存，无法作为 Word 文档打开。请在 WPS/Word 中保存后重新上传。";
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

	setXmlRuntime({
	    parse: source => {
	        if (/<!DOCTYPE|<!ENTITY/i.test(String(source)))
	            throw new Error("DTD declarations are not allowed in document XML.");
	        return new libExports.DOMParser({
	            onError: (level, message) => {
	                if (level !== "warning")
	                    throw new Error(message);
	            }
	        }).parseFromString(source, "application/xml");
	    },
	    serialize: node => new libExports.XMLSerializer().serializeToString(node)
	});
	const ctx = self;
	function selectedZipLoader(url) {
	    if (url === undefined)
	        return undefined;
	    if (typeof url !== "string" || !url.trim())
	        throw new Error("The Worker library URL must be a non-empty string.");
	    const workerLocation = new URL(ctx.location.href);
	    const libraryUrl = new URL(url, workerLocation);
	    const libraryOriginUrl = libraryUrl.protocol === "blob:" ? new URL(libraryUrl.pathname) : libraryUrl;
	    if (!["http:", "https:", "blob:"].includes(libraryUrl.protocol)
	        || workerLocation.origin === "null" || libraryUrl.origin !== workerLocation.origin
	        || libraryOriginUrl.username || libraryOriginUrl.password)
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
	        const options = { ...msg.options, useWorker: false, h: undefined, progress: undefined,
	            zipLoader: selectedZipLoader(msg.jsZipUrl) };
	        assertNonEmptyDocxInput(msg.data);
	        post(id, "progress", { current: 1, total: 3, message: "Loading package relationships" });
	        const document = await WordDocument.load(msg.data, new DocumentParser(options), options);
	        post(id, "progress", { current: 2, total: 3, message: "Serializing parsed document model" });
	        const snapshot = await document.createSnapshot();
	        post(id, "progress", { current: 3, total: 3, message: "Worker parse complete" });
	        post(id, "parsed", { snapshot });
	    }
	    catch (error) {
	        post(id, "error", {
	            error: {
	                message: error?.message ?? `${error}`,
	                stack: error?.stack
	            }
	        });
	    }
	};

})();
