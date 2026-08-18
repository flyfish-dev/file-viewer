//#region \0rolldown/runtime.js
var e = Object.create, t = Object.defineProperty, n = Object.getOwnPropertyDescriptor, r = Object.getOwnPropertyNames, i = Object.getPrototypeOf, a = Object.prototype.hasOwnProperty, o = (e, t) => () => (t || (e((t = { exports: {} }).exports, t), e = null), t.exports), s = (e, i, o, s) => {
	if (i && typeof i == "object" || typeof i == "function") for (var c = r(i), l = 0, u = c.length, d; l < u; l++) d = c[l], !a.call(e, d) && d !== o && t(e, d, {
		get: ((e) => i[e]).bind(null, d),
		enumerable: !(s = n(i, d)) || s.enumerable
	});
	return e;
}, c = (n, r, a) => (a = n == null ? {} : e(i(n)), s(r || !n || !n.__esModule ? t(a, "default", {
	value: n,
	enumerable: !0
}) : a, n)), l = /* @__PURE__ */ ((e) => typeof require < "u" ? require : typeof Proxy < "u" ? new Proxy(e, { get: (e, t) => (typeof require < "u" ? require : e)[t] }) : e)(function(e) {
	if (typeof require < "u") return require.apply(this, arguments);
	throw Error("Calling `require` for \"" + e + "\" in an environment that doesn't expose the `require` function. See https://rolldown.rs/in-depth/bundling-cjs#require-external-modules for more details.");
}), u = {};
u.version = "0.21.1";
var d = 1200, f = 1252, p, m = [
	874,
	932,
	936,
	949,
	950,
	1250,
	1251,
	1252,
	1253,
	1254,
	1255,
	1256,
	1257,
	1258,
	1e4
], h = {
	0: 1252,
	1: 65001,
	2: 65001,
	77: 1e4,
	128: 932,
	129: 949,
	130: 1361,
	134: 936,
	136: 950,
	161: 1253,
	162: 1254,
	163: 1258,
	177: 1255,
	178: 1256,
	186: 1257,
	204: 1251,
	222: 874,
	238: 1250,
	255: 1252,
	69: 6969
}, g = function(e) {
	m.indexOf(e) != -1 && (f = h[0] = e);
};
function _() {
	g(1252);
}
var v = function(e) {
	d = e, g(e);
};
function y() {
	v(1200), _();
}
function b(e) {
	for (var t = [], n = 0, r = e.length; n < r; ++n) t[n] = e.charCodeAt(n);
	return t;
}
function x(e) {
	for (var t = [], n = 0; n < e.length >> 1; ++n) t[n] = String.fromCharCode(e.charCodeAt(2 * n) + (e.charCodeAt(2 * n + 1) << 8));
	return t.join("");
}
function S(e) {
	for (var t = [], n = 0; n < e.length >> 1; ++n) t[n] = String.fromCharCode(e[2 * n] + (e[2 * n + 1] << 8));
	return t.join("");
}
function C(e) {
	for (var t = [], n = 0; n < e.length >> 1; ++n) t[n] = String.fromCharCode(e.charCodeAt(2 * n + 1) + (e.charCodeAt(2 * n) << 8));
	return t.join("");
}
var w = function(e) {
	var t = e.charCodeAt(0), n = e.charCodeAt(1);
	return t == 255 && n == 254 ? x(e.slice(2)) : t == 254 && n == 255 ? C(e.slice(2)) : t == 65279 ? e.slice(1) : e;
}, T = function(e) {
	return String.fromCharCode(e);
}, E = function(e) {
	return String.fromCharCode(e);
}, D = null, O = !0, k = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
function A(e) {
	for (var t = "", n = 0, r = 0, i = 0, a = 0, o = 0, s = 0, c = 0, l = 0; l < e.length;) n = e.charCodeAt(l++), a = n >> 2, r = e.charCodeAt(l++), o = (n & 3) << 4 | r >> 4, i = e.charCodeAt(l++), s = (r & 15) << 2 | i >> 6, c = i & 63, isNaN(r) ? s = c = 64 : isNaN(i) && (c = 64), t += k.charAt(a) + k.charAt(o) + k.charAt(s) + k.charAt(c);
	return t;
}
function j(e) {
	for (var t = "", n = 0, r = 0, i = 0, a = 0, o = 0, s = 0, c = 0, l = 0; l < e.length;) n = e[l++], a = n >> 2, r = e[l++], o = (n & 3) << 4 | r >> 4, i = e[l++], s = (r & 15) << 2 | i >> 6, c = i & 63, isNaN(r) ? s = c = 64 : isNaN(i) && (c = 64), t += k.charAt(a) + k.charAt(o) + k.charAt(s) + k.charAt(c);
	return t;
}
function M(e) {
	var t = "", n = 0, r = 0, i = 0, a = 0, o = 0, s = 0, c = 0;
	if (e.slice(0, 5) == "data:") {
		var l = e.slice(0, 1024).indexOf(";base64,");
		l > -1 && (e = e.slice(l + 8));
	}
	e = e.replace(/[^\w\+\/\=]/g, "");
	for (var l = 0; l < e.length;) a = k.indexOf(e.charAt(l++)), o = k.indexOf(e.charAt(l++)), n = a << 2 | o >> 4, t += String.fromCharCode(n), s = k.indexOf(e.charAt(l++)), r = (o & 15) << 4 | s >> 2, s !== 64 && (t += String.fromCharCode(r)), c = k.indexOf(e.charAt(l++)), i = (s & 3) << 6 | c, c !== 64 && (t += String.fromCharCode(i));
	return t;
}
var N = /*#__PURE__*/ (function() {
	return typeof Buffer < "u" && typeof process < "u" && process.versions !== void 0 && !!process.versions.node;
})(), P = /*#__PURE__*/ (function() {
	if (typeof Buffer < "u") {
		var e = !Buffer.from;
		if (!e) try {
			Buffer.from("foo", "utf8");
		} catch {
			e = !0;
		}
		return e ? function(e, t) {
			return t ? new Buffer(e, t) : new Buffer(e);
		} : Buffer.from.bind(Buffer);
	}
	return function() {};
})(), F = /*#__PURE__*/ (function() {
	if (typeof Buffer > "u") return !1;
	var e = P([65, 0]);
	return e ? e.toString("utf16le").length == 1 : !1;
})();
function I(e) {
	return N ? Buffer.alloc ? Buffer.alloc(e) : new Buffer(e) : typeof Uint8Array < "u" ? new Uint8Array(e) : Array(e);
}
function L(e) {
	return N ? Buffer.allocUnsafe ? Buffer.allocUnsafe(e) : new Buffer(e) : typeof Uint8Array < "u" ? new Uint8Array(e) : Array(e);
}
var R = function(e) {
	return N ? P(e, "binary") : e.split("").map(function(e) {
		return e.charCodeAt(0) & 255;
	});
};
function z(e) {
	if (Array.isArray(e)) return e.map(function(e) {
		return String.fromCharCode(e);
	}).join("");
	for (var t = [], n = 0; n < e.length; ++n) t[n] = String.fromCharCode(e[n]);
	return t.join("");
}
function B(e) {
	if (typeof ArrayBuffer > "u") throw Error("Unsupported");
	if (e instanceof ArrayBuffer) return B(new Uint8Array(e));
	for (var t = Array(e.length), n = 0; n < e.length; ++n) t[n] = e[n];
	return t;
}
var V = N ? function(e) {
	return Buffer.concat(e.map(function(e) {
		return Buffer.isBuffer(e) ? e : P(e);
	}));
} : function(e) {
	if (typeof Uint8Array < "u") {
		var t = 0, n = 0;
		for (t = 0; t < e.length; ++t) n += e[t].length;
		var r = new Uint8Array(n), i = 0;
		for (t = 0, n = 0; t < e.length; n += i, ++t) i = e[t].length, e[t] instanceof Uint8Array ? r.set(e[t], n) : typeof e[t] == "string" ? r.set(new Uint8Array(R(e[t])), n) : r.set(new Uint8Array(e[t]), n);
		return r;
	}
	return [].concat.apply([], e.map(function(e) {
		return Array.isArray(e) ? e : [].slice.call(e);
	}));
};
function H(e) {
	for (var t = [], n = 0, r = e.length + 250, i = I(e.length + 255), a = 0; a < e.length; ++a) {
		var o = e.charCodeAt(a);
		if (o < 128) i[n++] = o;
		else if (o < 2048) i[n++] = 192 | o >> 6 & 31, i[n++] = 128 | o & 63;
		else if (o >= 55296 && o < 57344) {
			o = (o & 1023) + 64;
			var s = e.charCodeAt(++a) & 1023;
			i[n++] = 240 | o >> 8 & 7, i[n++] = 128 | o >> 2 & 63, i[n++] = 128 | s >> 6 & 15 | (o & 3) << 4, i[n++] = 128 | s & 63;
		} else i[n++] = 224 | o >> 12 & 15, i[n++] = 128 | o >> 6 & 63, i[n++] = 128 | o & 63;
		n > r && (t.push(i.slice(0, n)), n = 0, i = I(65535), r = 65530);
	}
	return t.push(i.slice(0, n)), V(t);
}
var U = /\u0000/g, W = /[\u0001-\u0006]/g;
function ee(e) {
	for (var t = "", n = e.length - 1; n >= 0;) t += e.charAt(n--);
	return t;
}
function te(e, t) {
	var n = "" + e;
	return n.length >= t ? n : Ct("0", t - n.length) + n;
}
function ne(e, t) {
	var n = "" + e;
	return n.length >= t ? n : Ct(" ", t - n.length) + n;
}
function re(e, t) {
	var n = "" + e;
	return n.length >= t ? n : n + Ct(" ", t - n.length);
}
function G(e, t) {
	var n = "" + Math.round(e);
	return n.length >= t ? n : Ct("0", t - n.length) + n;
}
function ie(e, t) {
	var n = "" + e;
	return n.length >= t ? n : Ct("0", t - n.length) + n;
}
var ae = 2 ** 32;
function K(e, t) {
	return e > ae || e < -ae ? G(e, t) : ie(Math.round(e), t);
}
function oe(e, t) {
	return t = t || 0, e.length >= 7 + t && (e.charCodeAt(t) | 32) == 103 && (e.charCodeAt(t + 1) | 32) == 101 && (e.charCodeAt(t + 2) | 32) == 110 && (e.charCodeAt(t + 3) | 32) == 101 && (e.charCodeAt(t + 4) | 32) == 114 && (e.charCodeAt(t + 5) | 32) == 97 && (e.charCodeAt(t + 6) | 32) == 108;
}
var q = [
	["Sun", "Sunday"],
	["Mon", "Monday"],
	["Tue", "Tuesday"],
	["Wed", "Wednesday"],
	["Thu", "Thursday"],
	["Fri", "Friday"],
	["Sat", "Saturday"]
], se = [
	[
		"J",
		"Jan",
		"January"
	],
	[
		"F",
		"Feb",
		"February"
	],
	[
		"M",
		"Mar",
		"March"
	],
	[
		"A",
		"Apr",
		"April"
	],
	[
		"M",
		"May",
		"May"
	],
	[
		"J",
		"Jun",
		"June"
	],
	[
		"J",
		"Jul",
		"July"
	],
	[
		"A",
		"Aug",
		"August"
	],
	[
		"S",
		"Sep",
		"September"
	],
	[
		"O",
		"Oct",
		"October"
	],
	[
		"N",
		"Nov",
		"November"
	],
	[
		"D",
		"Dec",
		"December"
	]
];
function ce(e) {
	return e || (e = {}), e[0] = "General", e[1] = "0", e[2] = "0.00", e[3] = "#,##0", e[4] = "#,##0.00", e[9] = "0%", e[10] = "0.00%", e[11] = "0.00E+00", e[12] = "# ?/?", e[13] = "# ??/??", e[14] = "m/d/yy", e[15] = "d-mmm-yy", e[16] = "d-mmm", e[17] = "mmm-yy", e[18] = "h:mm AM/PM", e[19] = "h:mm:ss AM/PM", e[20] = "h:mm", e[21] = "h:mm:ss", e[22] = "m/d/yy h:mm", e[37] = "#,##0 ;(#,##0)", e[38] = "#,##0 ;[Red](#,##0)", e[39] = "#,##0.00;(#,##0.00)", e[40] = "#,##0.00;[Red](#,##0.00)", e[45] = "mm:ss", e[46] = "[h]:mm:ss", e[47] = "mmss.0", e[48] = "##0.0E+0", e[49] = "@", e[56] = "\"上午/下午 \"hh\"時\"mm\"分\"ss\"秒 \"", e;
}
var J = {
	0: "General",
	1: "0",
	2: "0.00",
	3: "#,##0",
	4: "#,##0.00",
	9: "0%",
	10: "0.00%",
	11: "0.00E+00",
	12: "# ?/?",
	13: "# ??/??",
	14: "m/d/yy",
	15: "d-mmm-yy",
	16: "d-mmm",
	17: "mmm-yy",
	18: "h:mm AM/PM",
	19: "h:mm:ss AM/PM",
	20: "h:mm",
	21: "h:mm:ss",
	22: "m/d/yy h:mm",
	37: "#,##0 ;(#,##0)",
	38: "#,##0 ;[Red](#,##0)",
	39: "#,##0.00;(#,##0.00)",
	40: "#,##0.00;[Red](#,##0.00)",
	45: "mm:ss",
	46: "[h]:mm:ss",
	47: "mmss.0",
	48: "##0.0E+0",
	49: "@",
	56: "\"上午/下午 \"hh\"時\"mm\"分\"ss\"秒 \""
}, le = {
	5: 37,
	6: 38,
	7: 39,
	8: 40,
	23: 0,
	24: 0,
	25: 0,
	26: 0,
	27: 14,
	28: 14,
	29: 14,
	30: 14,
	31: 14,
	50: 14,
	51: 14,
	52: 14,
	53: 14,
	54: 14,
	55: 14,
	56: 14,
	57: 14,
	58: 14,
	59: 1,
	60: 2,
	61: 3,
	62: 4,
	67: 9,
	68: 10,
	69: 12,
	70: 13,
	71: 14,
	72: 14,
	73: 15,
	74: 16,
	75: 17,
	76: 20,
	77: 21,
	78: 22,
	79: 45,
	80: 46,
	81: 47,
	82: 0
}, ue = {
	5: "\"$\"#,##0_);\\(\"$\"#,##0\\)",
	63: "\"$\"#,##0_);\\(\"$\"#,##0\\)",
	6: "\"$\"#,##0_);[Red]\\(\"$\"#,##0\\)",
	64: "\"$\"#,##0_);[Red]\\(\"$\"#,##0\\)",
	7: "\"$\"#,##0.00_);\\(\"$\"#,##0.00\\)",
	65: "\"$\"#,##0.00_);\\(\"$\"#,##0.00\\)",
	8: "\"$\"#,##0.00_);[Red]\\(\"$\"#,##0.00\\)",
	66: "\"$\"#,##0.00_);[Red]\\(\"$\"#,##0.00\\)",
	41: "_(* #,##0_);_(* \\(#,##0\\);_(* \"-\"_);_(@_)",
	42: "_(\"$\"* #,##0_);_(\"$\"* \\(#,##0\\);_(\"$\"* \"-\"_);_(@_)",
	43: "_(* #,##0.00_);_(* \\(#,##0.00\\);_(* \"-\"??_);_(@_)",
	44: "_(\"$\"* #,##0.00_);_(\"$\"* \\(#,##0.00\\);_(\"$\"* \"-\"??_);_(@_)"
};
function de(e, t, n) {
	for (var r = e < 0 ? -1 : 1, i = e * r, a = 0, o = 1, s = 0, c = 1, l = 0, u = 0, d = Math.floor(i); l < t && (d = Math.floor(i), s = d * o + a, u = d * l + c, !(i - d < 5e-8));) i = 1 / (i - d), a = o, o = s, c = l, l = u;
	if (u > t && (l > t ? (u = c, s = a) : (u = l, s = o)), !n) return [
		0,
		r * s,
		u
	];
	var f = Math.floor(r * s / u);
	return [
		f,
		r * s - f * u,
		u
	];
}
function fe(e) {
	var t = e.toPrecision(16);
	if (t.indexOf("e") > -1) {
		var n = t.slice(0, t.indexOf("e"));
		return n = n.indexOf(".") > -1 ? n.slice(0, n.slice(0, 2) == "0." ? 17 : 16) : n.slice(0, 15) + Ct("0", n.length - 15), n + t.slice(t.indexOf("e"));
	}
	var r = t.indexOf(".") > -1 ? t.slice(0, t.slice(0, 2) == "0." ? 17 : 16) : t.slice(0, 15) + Ct("0", t.length - 15);
	return Number(r);
}
function pe(e, t, n) {
	if (e > 2958465 || e < 0) return null;
	e = fe(e);
	var r = e | 0, i = Math.floor(86400 * (e - r)), a = 0, o = [], s = {
		D: r,
		T: i,
		u: 86400 * (e - r) - i,
		y: 0,
		m: 0,
		d: 0,
		H: 0,
		M: 0,
		S: 0,
		q: 0
	};
	if (Math.abs(s.u) < 1e-6 && (s.u = 0), t && t.date1904 && (r += 1462), s.u > .9999 && (s.u = 0, ++i == 86400 && (s.T = i = 0, ++r, ++s.D)), r === 60) o = n ? [
		1317,
		10,
		29
	] : [
		1900,
		2,
		29
	], a = 3;
	else if (r === 0) o = n ? [
		1317,
		8,
		29
	] : [
		1900,
		1,
		0
	], a = 6;
	else {
		r > 60 && --r;
		var c = new Date(1900, 0, 1);
		c.setDate(c.getDate() + r - 1), o = [
			c.getFullYear(),
			c.getMonth() + 1,
			c.getDate()
		], a = c.getDay(), r < 60 && (a = (a + 6) % 7), n && (a = be(c, o));
	}
	return s.y = o[0], s.m = o[1], s.d = o[2], s.S = i % 60, i = Math.floor(i / 60), s.M = i % 60, i = Math.floor(i / 60), s.H = i, s.q = a, s;
}
function me(e) {
	return e.indexOf(".") == -1 ? e : e.replace(/(?:\.0*|(\.\d*[1-9])0+)$/, "$1");
}
function he(e) {
	return e.indexOf("E") == -1 ? e : e.replace(/(?:\.0*|(\.\d*[1-9])0+)[Ee]/, "$1E").replace(/(E[+-])(\d)$/, "$10$2");
}
function ge(e) {
	var t = e < 0 ? 12 : 11, n = me(e.toFixed(12));
	return n.length <= t || (n = e.toPrecision(10), n.length <= t) ? n : e.toExponential(5);
}
function _e(e) {
	var t = me(e.toFixed(11));
	return t.length > (e < 0 ? 12 : 11) || t === "0" || t === "-0" ? e.toPrecision(6) : t;
}
function ve(e) {
	if (!isFinite(e)) return isNaN(e) ? "#NUM!" : "#DIV/0!";
	var t = Math.floor(Math.log(Math.abs(e)) * Math.LOG10E);
	return me(he((t >= -4 && t <= -1 ? e.toPrecision(10 + t) : Math.abs(t) <= 9 ? ge(e) : t === 10 ? e.toFixed(10).substr(0, 12) : _e(e)).toUpperCase()));
}
function ye(e, t) {
	switch (typeof e) {
		case "string": return e;
		case "boolean": return e ? "TRUE" : "FALSE";
		case "number": return (e | 0) === e ? e.toString(10) : ve(e);
		case "undefined": return "";
		case "object":
			if (e == null) return "";
			if (e instanceof Date) return Xe(14, mt(e, t && t.date1904), t);
	}
	throw Error("unsupported value in General format: " + e);
}
function be(e, t) {
	t[0] -= 581;
	var n = e.getDay();
	return e < 60 && (n = (n + 6) % 7), n;
}
function xe(e, t, n, r) {
	var i = "", a = 0, o = 0, s = n.y, c, l = 0;
	switch (e) {
		case 98: s = n.y + 543;
		case 121:
			switch (t.length) {
				case 1:
				case 2:
					c = s % 100, l = 2;
					break;
				default:
					c = s % 1e4, l = 4;
					break;
			}
			break;
		case 109:
			switch (t.length) {
				case 1:
				case 2:
					c = n.m, l = t.length;
					break;
				case 3: return se[n.m - 1][1];
				case 5: return se[n.m - 1][0];
				default: return se[n.m - 1][2];
			}
			break;
		case 100:
			switch (t.length) {
				case 1:
				case 2:
					c = n.d, l = t.length;
					break;
				case 3: return q[n.q][0];
				default: return q[n.q][1];
			}
			break;
		case 104:
			switch (t.length) {
				case 1:
				case 2:
					c = 1 + (n.H + 11) % 12, l = t.length;
					break;
				default: throw "bad hour format: " + t;
			}
			break;
		case 72:
			switch (t.length) {
				case 1:
				case 2:
					c = n.H, l = t.length;
					break;
				default: throw "bad hour format: " + t;
			}
			break;
		case 77:
			switch (t.length) {
				case 1:
				case 2:
					c = n.M, l = t.length;
					break;
				default: throw "bad minute format: " + t;
			}
			break;
		case 115:
			if (t != "s" && t != "ss" && t != ".0" && t != ".00" && t != ".000") throw "bad second format: " + t;
			return n.u === 0 && (t == "s" || t == "ss") ? te(n.S, t.length) : (o = r >= 2 ? r === 3 ? 1e3 : 100 : r === 1 ? 10 : 1, a = Math.round(o * (n.S + n.u)), a >= 60 * o && (a = 0), t === "s" ? a === 0 ? "0" : "" + a / o : (i = te(a, 2 + r), t === "ss" ? i.substr(0, 2) : "." + i.substr(2, t.length - 1)));
		case 90:
			switch (t) {
				case "[h]":
				case "[hh]":
					c = n.D * 24 + n.H;
					break;
				case "[m]":
				case "[mm]":
					c = (n.D * 24 + n.H) * 60 + n.M;
					break;
				case "[s]":
				case "[ss]":
					c = ((n.D * 24 + n.H) * 60 + n.M) * 60 + (r == 0 ? Math.round(n.S + n.u) : n.S);
					break;
				default: throw "bad abstime format: " + t;
			}
			l = t.length === 3 ? 1 : 2;
			break;
		case 101:
			c = s, l = 1;
			break;
	}
	return l > 0 ? te(c, l) : "";
}
function Se(e) {
	var t = 3;
	if (e.length <= t) return e;
	for (var n = e.length % t, r = e.substr(0, n); n != e.length; n += t) r += (r.length > 0 ? "," : "") + e.substr(n, t);
	return r;
}
var Ce = /%/g;
function we(e, t, n) {
	var r = t.replace(Ce, ""), i = t.length - r.length;
	return He(e, r, n * 10 ** (2 * i)) + Ct("%", i);
}
function Te(e, t, n) {
	for (var r = t.length - 1; t.charCodeAt(r - 1) === 44;) --r;
	return He(e, t.substr(0, r), n / 10 ** (3 * (t.length - r)));
}
function Y(e, t) {
	var n, r = e.indexOf("E") - e.indexOf(".") - 1;
	if (e.match(/^#+0.0E\+0$/)) {
		if (t == 0) return "0.0E+0";
		if (t < 0) return "-" + Y(e, -t);
		var i = e.indexOf(".");
		i === -1 && (i = e.indexOf("E"));
		var a = Math.floor(Math.log(t) * Math.LOG10E) % i;
		if (a < 0 && (a += i), n = (t / 10 ** a).toPrecision(r + 1 + (i + a) % i), n.indexOf("e") === -1) {
			var o = Math.floor(Math.log(t) * Math.LOG10E);
			for (n.indexOf(".") === -1 ? n = n.charAt(0) + "." + n.substr(1) + "E+" + (o - n.length + a) : n += "E+" + (o - a); n.substr(0, 2) === "0.";) n = n.charAt(0) + n.substr(2, i) + "." + n.substr(2 + i), n = n.replace(/^0+([1-9])/, "$1").replace(/^0+\./, "0.");
			n = n.replace(/\+-/, "-");
		}
		n = n.replace(/^([+-]?)(\d*)\.(\d*)[Ee]/, function(e, t, n, r) {
			return t + n + r.substr(0, (i + a) % i) + "." + r.substr(a) + "E";
		});
	} else n = t.toExponential(r);
	return e.match(/E\+00$/) && n.match(/e[+-]\d$/) && (n = n.substr(0, n.length - 1) + "0" + n.charAt(n.length - 1)), e.match(/E\-/) && n.match(/e\+/) && (n = n.replace(/e\+/, "e")), n.replace("e", "E");
}
var Ee = /# (\?+)( ?)\/( ?)(\d+)/;
function De(e, t, n) {
	var r = parseInt(e[4], 10), i = Math.round(t * r), a = Math.floor(i / r), o = i - a * r, s = r;
	return n + (a === 0 ? "" : "" + a) + " " + (o === 0 ? Ct(" ", e[1].length + 1 + e[4].length) : ne(o, e[1].length) + e[2] + "/" + e[3] + te(s, e[4].length));
}
function Oe(e, t, n) {
	return n + (t === 0 ? "" : "" + t) + Ct(" ", e[1].length + 2 + e[4].length);
}
var ke = /^#*0*\.([0#]+)/, Ae = /\)[^)]*[0#]/, je = /\(###\) ###\\?-####/;
function Me(e) {
	for (var t = "", n, r = 0; r != e.length; ++r) switch (n = e.charCodeAt(r)) {
		case 35: break;
		case 63:
			t += " ";
			break;
		case 48:
			t += "0";
			break;
		default: t += String.fromCharCode(n);
	}
	return t;
}
function Ne(e, t) {
	var n = e < 0 ? -1 : 1, r = 10 ** t;
	return "" + n * (Math.round(n * e * r) / r);
}
function Pe(e, t) {
	var n = e - Math.floor(e), r = 10 ** t;
	return t < ("" + Math.round(n * r)).length ? 0 : Math.round(n * r);
}
function Fe(e, t) {
	return +(t < ("" + Math.round((e - Math.floor(e)) * 10 ** t)).length);
}
function Ie(e) {
	return e < 2147483647 && e > -2147483648 ? "" + (e >= 0 ? e | 0 : e - 1 | 0) : "" + Math.floor(e);
}
function Le(e, t, n) {
	if (e.charCodeAt(0) === 40 && !t.match(Ae)) {
		var r = t.replace(/\( */, "").replace(/ \)/, "").replace(/\)/, "");
		return n >= 0 ? Le("n", r, n) : "(" + Le("n", r, -n) + ")";
	}
	if (t.charCodeAt(t.length - 1) === 44) return Te(e, t, n);
	if (t.indexOf("%") !== -1) return we(e, t, n);
	if (t.indexOf("E") !== -1) return Y(t, n);
	if (t.charCodeAt(0) === 36) return "$" + Le(e, t.substr(t.charAt(1) == " " ? 2 : 1), n);
	var i, a, o, s, c = Math.abs(n), l = n < 0 ? "-" : "";
	if (t.match(/^00+$/)) return l + K(c, t.length);
	if (t.match(/^[#?]+$/)) return i = K(n, 0), i === "0" && (i = ""), i.length > t.length ? i : Me(t.substr(0, t.length - i.length)) + i;
	if (a = t.match(Ee)) return De(a, c, l);
	if (t.match(/^#+0+$/)) return l + K(c, t.length - t.indexOf("0"));
	if (a = t.match(ke)) return i = Ne(n, a[1].length).replace(/^([^\.]+)$/, "$1." + Me(a[1])).replace(/\.$/, "." + Me(a[1])).replace(/\.(\d*)$/, function(e, t) {
		return "." + t + Ct("0", Me(a[1]).length - t.length);
	}), t.indexOf("0.") === -1 ? i.replace(/^0\./, ".") : i;
	if (t = t.replace(/^#+([0.])/, "$1"), a = t.match(/^(0*)\.(#*)$/)) return l + Ne(c, a[2].length).replace(/\.(\d*[1-9])0*$/, ".$1").replace(/^(-?\d*)$/, "$1.").replace(/^0\./, a[1].length ? "0." : ".");
	if (a = t.match(/^#{1,3},##0(\.?)$/)) return l + Se(K(c, 0));
	if (a = t.match(/^#,##0\.([#0]*0)$/)) return n < 0 ? "-" + Le(e, t, -n) : Se("" + (Math.floor(n) + Fe(n, a[1].length))) + "." + te(Pe(n, a[1].length), a[1].length);
	if (a = t.match(/^#,#*,#0/)) return Le(e, t.replace(/^#,#*,/, ""), n);
	if (a = t.match(/^([0#]+)(\\?-([0#]+))+$/)) return i = ee(Le(e, t.replace(/[\\-]/g, ""), n)), o = 0, ee(ee(t.replace(/\\/g, "")).replace(/[0#]/g, function(e) {
		return o < i.length ? i.charAt(o++) : e === "0" ? "0" : "";
	}));
	if (t.match(je)) return i = Le(e, "##########", n), "(" + i.substr(0, 3) + ") " + i.substr(3, 3) + "-" + i.substr(6);
	var u = "";
	if (a = t.match(/^([#0?]+)( ?)\/( ?)([#0?]+)/)) return o = Math.min(a[4].length, 7), s = de(c, 10 ** o - 1, !1), i = "" + l, u = He("n", a[1], s[1]), u.charAt(u.length - 1) == " " && (u = u.substr(0, u.length - 1) + "0"), i += u + a[2] + "/" + a[3], u = re(s[2], o), u.length < a[4].length && (u = Me(a[4].substr(a[4].length - u.length)) + u), i += u, i;
	if (a = t.match(/^# ([#0?]+)( ?)\/( ?)([#0?]+)/)) return o = Math.min(Math.max(a[1].length, a[4].length), 7), s = de(c, 10 ** o - 1, !0), l + (s[0] || (s[1] ? "" : "0")) + " " + (s[1] ? ne(s[1], o) + a[2] + "/" + a[3] + re(s[2], o) : Ct(" ", 2 * o + 1 + a[2].length + a[3].length));
	if (a = t.match(/^[#0?]+$/)) return i = K(n, 0), t.length <= i.length ? i : Me(t.substr(0, t.length - i.length)) + i;
	if (a = t.match(/^([#0?]+)\.([#0]+)$/)) {
		i = "" + n.toFixed(Math.min(a[2].length, 10)).replace(/([^0])0+$/, "$1"), o = i.indexOf(".");
		var d = t.indexOf(".") - o, f = t.length - i.length - d;
		return Me(t.substr(0, d) + i + t.substr(t.length - f));
	}
	if (a = t.match(/^00,000\.([#0]*0)$/)) return o = Pe(n, a[1].length), n < 0 ? "-" + Le(e, t, -n) : Se(Ie(n)).replace(/^\d,\d{3}$/, "0$&").replace(/^\d*$/, function(e) {
		return "00," + (e.length < 3 ? te(0, 3 - e.length) : "") + e;
	}) + "." + te(o, a[1].length);
	switch (t) {
		case "###,##0.00": return Le(e, "#,##0.00", n);
		case "###,###":
		case "##,###":
		case "#,###":
			var p = Se(K(c, 0));
			return p === "0" ? "" : l + p;
		case "###,###.00": return Le(e, "###,##0.00", n).replace(/^0\./, ".");
		case "#,###.00": return Le(e, "#,##0.00", n).replace(/^0\./, ".");
		default:
	}
	throw Error("unsupported format |" + t + "|");
}
function Re(e, t, n) {
	for (var r = t.length - 1; t.charCodeAt(r - 1) === 44;) --r;
	return He(e, t.substr(0, r), n / 10 ** (3 * (t.length - r)));
}
function ze(e, t, n) {
	var r = t.replace(Ce, ""), i = t.length - r.length;
	return He(e, r, n * 10 ** (2 * i)) + Ct("%", i);
}
function Be(e, t) {
	var n, r = e.indexOf("E") - e.indexOf(".") - 1;
	if (e.match(/^#+0.0E\+0$/)) {
		if (t == 0) return "0.0E+0";
		if (t < 0) return "-" + Be(e, -t);
		var i = e.indexOf(".");
		i === -1 && (i = e.indexOf("E"));
		var a = Math.floor(Math.log(t) * Math.LOG10E) % i;
		if (a < 0 && (a += i), n = (t / 10 ** a).toPrecision(r + 1 + (i + a) % i), !n.match(/[Ee]/)) {
			var o = Math.floor(Math.log(t) * Math.LOG10E);
			n.indexOf(".") === -1 ? n = n.charAt(0) + "." + n.substr(1) + "E+" + (o - n.length + a) : n += "E+" + (o - a), n = n.replace(/\+-/, "-");
		}
		n = n.replace(/^([+-]?)(\d*)\.(\d*)[Ee]/, function(e, t, n, r) {
			return t + n + r.substr(0, (i + a) % i) + "." + r.substr(a) + "E";
		});
	} else n = t.toExponential(r);
	return e.match(/E\+00$/) && n.match(/e[+-]\d$/) && (n = n.substr(0, n.length - 1) + "0" + n.charAt(n.length - 1)), e.match(/E\-/) && n.match(/e\+/) && (n = n.replace(/e\+/, "e")), n.replace("e", "E");
}
function Ve(e, t, n) {
	if (e.charCodeAt(0) === 40 && !t.match(Ae)) {
		var r = t.replace(/\( */, "").replace(/ \)/, "").replace(/\)/, "");
		return n >= 0 ? Ve("n", r, n) : "(" + Ve("n", r, -n) + ")";
	}
	if (t.charCodeAt(t.length - 1) === 44) return Re(e, t, n);
	if (t.indexOf("%") !== -1) return ze(e, t, n);
	if (t.indexOf("E") !== -1) return Be(t, n);
	if (t.charCodeAt(0) === 36) return "$" + Ve(e, t.substr(t.charAt(1) == " " ? 2 : 1), n);
	var i, a, o, s, c = Math.abs(n), l = n < 0 ? "-" : "";
	if (t.match(/^00+$/)) return l + te(c, t.length);
	if (t.match(/^[#?]+$/)) return i = "" + n, n === 0 && (i = ""), i.length > t.length ? i : Me(t.substr(0, t.length - i.length)) + i;
	if (a = t.match(Ee)) return Oe(a, c, l);
	if (t.match(/^#+0+$/)) return l + te(c, t.length - t.indexOf("0"));
	if (a = t.match(ke)) return i = ("" + n).replace(/^([^\.]+)$/, "$1." + Me(a[1])).replace(/\.$/, "." + Me(a[1])), i = i.replace(/\.(\d*)$/, function(e, t) {
		return "." + t + Ct("0", Me(a[1]).length - t.length);
	}), t.indexOf("0.") === -1 ? i.replace(/^0\./, ".") : i;
	if (t = t.replace(/^#+([0.])/, "$1"), a = t.match(/^(0*)\.(#*)$/)) return l + ("" + c).replace(/\.(\d*[1-9])0*$/, ".$1").replace(/^(-?\d*)$/, "$1.").replace(/^0\./, a[1].length ? "0." : ".");
	if (a = t.match(/^#{1,3},##0(\.?)$/)) return l + Se("" + c);
	if (a = t.match(/^#,##0\.([#0]*0)$/)) return n < 0 ? "-" + Ve(e, t, -n) : Se("" + n) + "." + Ct("0", a[1].length);
	if (a = t.match(/^#,#*,#0/)) return Ve(e, t.replace(/^#,#*,/, ""), n);
	if (a = t.match(/^([0#]+)(\\?-([0#]+))+$/)) return i = ee(Ve(e, t.replace(/[\\-]/g, ""), n)), o = 0, ee(ee(t.replace(/\\/g, "")).replace(/[0#]/g, function(e) {
		return o < i.length ? i.charAt(o++) : e === "0" ? "0" : "";
	}));
	if (t.match(je)) return i = Ve(e, "##########", n), "(" + i.substr(0, 3) + ") " + i.substr(3, 3) + "-" + i.substr(6);
	var u = "";
	if (a = t.match(/^([#0?]+)( ?)\/( ?)([#0?]+)/)) return o = Math.min(a[4].length, 7), s = de(c, 10 ** o - 1, !1), i = "" + l, u = He("n", a[1], s[1]), u.charAt(u.length - 1) == " " && (u = u.substr(0, u.length - 1) + "0"), i += u + a[2] + "/" + a[3], u = re(s[2], o), u.length < a[4].length && (u = Me(a[4].substr(a[4].length - u.length)) + u), i += u, i;
	if (a = t.match(/^# ([#0?]+)( ?)\/( ?)([#0?]+)/)) return o = Math.min(Math.max(a[1].length, a[4].length), 7), s = de(c, 10 ** o - 1, !0), l + (s[0] || (s[1] ? "" : "0")) + " " + (s[1] ? ne(s[1], o) + a[2] + "/" + a[3] + re(s[2], o) : Ct(" ", 2 * o + 1 + a[2].length + a[3].length));
	if (a = t.match(/^[#0?]+$/)) return i = "" + n, t.length <= i.length ? i : Me(t.substr(0, t.length - i.length)) + i;
	if (a = t.match(/^([#0]+)\.([#0]+)$/)) {
		i = "" + n.toFixed(Math.min(a[2].length, 10)).replace(/([^0])0+$/, "$1"), o = i.indexOf(".");
		var d = t.indexOf(".") - o, f = t.length - i.length - d;
		return Me(t.substr(0, d) + i + t.substr(t.length - f));
	}
	if (a = t.match(/^00,000\.([#0]*0)$/)) return n < 0 ? "-" + Ve(e, t, -n) : Se("" + n).replace(/^\d,\d{3}$/, "0$&").replace(/^\d*$/, function(e) {
		return "00," + (e.length < 3 ? te(0, 3 - e.length) : "") + e;
	}) + "." + te(0, a[1].length);
	switch (t) {
		case "###,###":
		case "##,###":
		case "#,###":
			var p = Se("" + c);
			return p === "0" ? "" : l + p;
		default: if (t.match(/\.[0#?]*$/)) return Ve(e, t.slice(0, t.lastIndexOf(".")), n) + Me(t.slice(t.lastIndexOf(".")));
	}
	throw Error("unsupported format |" + t + "|");
}
function He(e, t, n) {
	return (n | 0) === n ? Ve(e, t, n) : Le(e, t, n);
}
function Ue(e) {
	for (var t = [], n = !1, r = 0, i = 0; r < e.length; ++r) switch (e.charCodeAt(r)) {
		case 34:
			n = !n;
			break;
		case 95:
		case 42:
		case 92:
			++r;
			break;
		case 59: t[t.length] = e.substr(i, r - i), i = r + 1;
	}
	if (t[t.length] = e.substr(i), n === !0) throw Error("Format |" + e + "| unterminated string ");
	return t;
}
var We = /\[[HhMmSs\u0E0A\u0E19\u0E17]*\]/;
function Ge(e) {
	for (var t = 0, n = "", r = ""; t < e.length;) switch (n = e.charAt(t)) {
		case "G":
			oe(e, t) && (t += 6), t++;
			break;
		case "\"":
			for (; e.charCodeAt(++t) !== 34 && t < e.length;);
			++t;
			break;
		case "\\":
			t += 2;
			break;
		case "_":
			t += 2;
			break;
		case "@":
			++t;
			break;
		case "B":
		case "b": if (e.charAt(t + 1) === "1" || e.charAt(t + 1) === "2") return !0;
		case "M":
		case "D":
		case "Y":
		case "H":
		case "S":
		case "E":
		case "m":
		case "d":
		case "y":
		case "h":
		case "s":
		case "e":
		case "g": return !0;
		case "A":
		case "a":
		case "上":
			if (e.substr(t, 3).toUpperCase() === "A/P" || e.substr(t, 5).toUpperCase() === "AM/PM" || e.substr(t, 5).toUpperCase() === "上午/下午") return !0;
			++t;
			break;
		case "[":
			for (r = n; e.charAt(t++) !== "]" && t < e.length;) r += e.charAt(t);
			if (r.match(We)) return !0;
			break;
		case ".":
		case "0":
		case "#":
			for (; t < e.length && ("0#?.,E+-%".indexOf(n = e.charAt(++t)) > -1 || n == "\\" && e.charAt(t + 1) == "-" && "0#".indexOf(e.charAt(t + 2)) > -1););
			break;
		case "?":
			for (; e.charAt(++t) === n;);
			break;
		case "*":
			++t, (e.charAt(t) == " " || e.charAt(t) == "*") && ++t;
			break;
		case "(":
		case ")":
			++t;
			break;
		case "1":
		case "2":
		case "3":
		case "4":
		case "5":
		case "6":
		case "7":
		case "8":
		case "9":
			for (; t < e.length && "0123456789".indexOf(e.charAt(++t)) > -1;);
			break;
		case " ":
			++t;
			break;
		default:
			++t;
			break;
	}
	return !1;
}
function Ke(e, t, n, r) {
	for (var i = [], a = "", o = 0, s = "", c = "t", l, u, d, f = "H"; o < e.length;) switch (s = e.charAt(o)) {
		case "G":
			if (!oe(e, o)) throw Error("unrecognized character " + s + " in " + e);
			i[i.length] = {
				t: "G",
				v: "General"
			}, o += 7;
			break;
		case "\"":
			for (a = ""; (d = e.charCodeAt(++o)) !== 34 && o < e.length;) a += String.fromCharCode(d);
			i[i.length] = {
				t: "t",
				v: a
			}, ++o;
			break;
		case "\\":
			var p = e.charAt(++o), m = p === "(" || p === ")" ? p : "t";
			i[i.length] = {
				t: m,
				v: p
			}, ++o;
			break;
		case "_":
			i[i.length] = {
				t: "t",
				v: " "
			}, o += 2;
			break;
		case "@":
			i[i.length] = {
				t: "T",
				v: t
			}, ++o;
			break;
		case "B":
		case "b": if (e.charAt(o + 1) === "1" || e.charAt(o + 1) === "2") {
			if (l == null && (l = pe(t, n, e.charAt(o + 1) === "2"), l == null)) return "";
			i[i.length] = {
				t: "X",
				v: e.substr(o, 2)
			}, c = s, o += 2;
			break;
		}
		case "M":
		case "D":
		case "Y":
		case "H":
		case "S":
		case "E": s = s.toLowerCase();
		case "m":
		case "d":
		case "y":
		case "h":
		case "s":
		case "e":
		case "g":
			if (t < 0 || l == null && (l = pe(t, n), l == null)) return "";
			for (a = s; ++o < e.length && e.charAt(o).toLowerCase() === s;) a += s;
			s === "m" && c.toLowerCase() === "h" && (s = "M"), s === "h" && (s = f), i[i.length] = {
				t: s,
				v: a
			}, c = s;
			break;
		case "A":
		case "a":
		case "上":
			var h = {
				t: s,
				v: s
			};
			if (l == null && (l = pe(t, n)), e.substr(o, 3).toUpperCase() === "A/P" ? (l != null && (h.v = l.H >= 12 ? e.charAt(o + 2) : s), h.t = "T", f = "h", o += 3) : e.substr(o, 5).toUpperCase() === "AM/PM" ? (l != null && (h.v = l.H >= 12 ? "PM" : "AM"), h.t = "T", o += 5, f = "h") : e.substr(o, 5).toUpperCase() === "上午/下午" ? (l != null && (h.v = l.H >= 12 ? "下午" : "上午"), h.t = "T", o += 5, f = "h") : (h.t = "t", ++o), l == null && h.t === "T") return "";
			i[i.length] = h, c = s;
			break;
		case "[":
			for (a = s; e.charAt(o++) !== "]" && o < e.length;) a += e.charAt(o);
			if (a.slice(-1) !== "]") throw "unterminated \"[\" block: |" + a + "|";
			if (a.match(We)) {
				if (l == null && (l = pe(t, n), l == null)) return "";
				i[i.length] = {
					t: "Z",
					v: a.toLowerCase()
				}, c = a.charAt(1);
			} else a.indexOf("$") > -1 && (a = (a.match(/\$([^-\[\]]*)/) || [])[1] || "$", Ge(e) || (i[i.length] = {
				t: "t",
				v: a
			}));
			break;
		case ".": if (l != null) {
			for (a = s; ++o < e.length && (s = e.charAt(o)) === "0";) a += s;
			i[i.length] = {
				t: "s",
				v: a
			};
			break;
		}
		case "0":
		case "#":
			for (a = s; ++o < e.length && "0#?.,E+-%".indexOf(s = e.charAt(o)) > -1;) a += s;
			i[i.length] = {
				t: "n",
				v: a
			};
			break;
		case "?":
			for (a = s; e.charAt(++o) === s;) a += s;
			i[i.length] = {
				t: s,
				v: a
			}, c = s;
			break;
		case "*":
			++o, (e.charAt(o) == " " || e.charAt(o) == "*") && ++o;
			break;
		case "(":
		case ")":
			i[i.length] = {
				t: r === 1 ? "t" : s,
				v: s
			}, ++o;
			break;
		case "1":
		case "2":
		case "3":
		case "4":
		case "5":
		case "6":
		case "7":
		case "8":
		case "9":
			for (a = s; o < e.length && "0123456789".indexOf(e.charAt(++o)) > -1;) a += e.charAt(o);
			i[i.length] = {
				t: "D",
				v: a
			};
			break;
		case " ":
			i[i.length] = {
				t: s,
				v: s
			}, ++o;
			break;
		case "$":
			i[i.length] = {
				t: "t",
				v: "$"
			}, ++o;
			break;
		default:
			if (",$-+/():!^&'~{}<>=€acfijklopqrtuvwxzP".indexOf(s) === -1) throw Error("unrecognized character " + s + " in " + e);
			i[i.length] = {
				t: "t",
				v: s
			}, ++o;
			break;
	}
	var g = 0, _ = 0, v;
	for (o = i.length - 1, c = "t"; o >= 0; --o) switch (i[o].t) {
		case "h":
		case "H":
			i[o].t = f, c = "h", g < 1 && (g = 1);
			break;
		case "s": (v = i[o].v.match(/\.0+$/)) && (_ = Math.max(_, v[0].length - 1), g = 4), g < 3 && (g = 3);
		case "d":
		case "y":
		case "e":
			c = i[o].t;
			break;
		case "M":
			c = i[o].t, g < 2 && (g = 2);
			break;
		case "m":
			c === "s" && (i[o].t = "M", g < 2 && (g = 2));
			break;
		case "X": break;
		case "Z": g < 1 && i[o].v.match(/[Hh]/) && (g = 1), g < 2 && i[o].v.match(/[Mm]/) && (g = 2), g < 3 && i[o].v.match(/[Ss]/) && (g = 3);
	}
	var y;
	switch (g) {
		case 0: break;
		case 1:
		case 2:
		case 3:
			l.u >= .5 && (l.u = 0, ++l.S), l.S >= 60 && (l.S = 0, ++l.M), l.M >= 60 && (l.M = 0, ++l.H), l.H >= 24 && (l.H = 0, ++l.D, y = pe(l.D), y.u = l.u, y.S = l.S, y.M = l.M, y.H = l.H, l = y);
			break;
		case 4:
			switch (_) {
				case 1:
					l.u = Math.round(l.u * 10) / 10;
					break;
				case 2:
					l.u = Math.round(l.u * 100) / 100;
					break;
				case 3:
					l.u = Math.round(l.u * 1e3) / 1e3;
					break;
			}
			l.u >= 1 && (l.u = 0, ++l.S), l.S >= 60 && (l.S = 0, ++l.M), l.M >= 60 && (l.M = 0, ++l.H), l.H >= 24 && (l.H = 0, ++l.D, y = pe(l.D), y.u = l.u, y.S = l.S, y.M = l.M, y.H = l.H, l = y);
			break;
	}
	var b = "", x;
	for (o = 0; o < i.length; ++o) switch (i[o].t) {
		case "t":
		case "T":
		case " ":
		case "D": break;
		case "X":
			i[o].v = "", i[o].t = ";";
			break;
		case "d":
		case "m":
		case "y":
		case "h":
		case "H":
		case "M":
		case "s":
		case "e":
		case "b":
		case "Z":
			i[o].v = xe(i[o].t.charCodeAt(0), i[o].v, l, _), i[o].t = "t";
			break;
		case "n":
		case "?":
			for (x = o + 1; i[x] != null && ((s = i[x].t) === "?" || s === "D" || (s === " " || s === "t") && i[x + 1] != null && (i[x + 1].t === "?" || i[x + 1].t === "t" && i[x + 1].v === "/") || i[o].t === "(" && (s === " " || s === "n" || s === ")") || s === "t" && (i[x].v === "/" || i[x].v === " " && i[x + 1] != null && i[x + 1].t == "?"));) i[o].v += i[x].v, i[x] = {
				v: "",
				t: ";"
			}, ++x;
			b += i[o].v, o = x - 1;
			break;
		case "G":
			i[o].t = "t", i[o].v = ye(t, n);
			break;
	}
	var S = "", C, w;
	if (b.length > 0) {
		b.charCodeAt(0) == 40 ? (C = t < 0 && b.charCodeAt(0) === 45 ? -t : t, w = He("n", b, C)) : (C = t < 0 && r > 1 ? -t : t, w = He("n", b, C), C < 0 && i[0] && i[0].t == "t" && (w = w.substr(1), i[0].v = "-" + i[0].v)), x = w.length - 1;
		var T = i.length;
		for (o = 0; o < i.length; ++o) if (i[o] != null && i[o].t != "t" && i[o].v.indexOf(".") > -1) {
			T = o;
			break;
		}
		var E = i.length;
		if (T === i.length && w.indexOf("E") === -1) {
			for (o = i.length - 1; o >= 0; --o) i[o] == null || "n?".indexOf(i[o].t) === -1 || (x >= i[o].v.length - 1 ? (x -= i[o].v.length, i[o].v = w.substr(x + 1, i[o].v.length)) : x < 0 ? i[o].v = "" : (i[o].v = w.substr(0, x + 1), x = -1), i[o].t = "t", E = o);
			x >= 0 && E < i.length && (i[E].v = w.substr(0, x + 1) + i[E].v);
		} else if (T !== i.length && w.indexOf("E") === -1) {
			for (x = w.indexOf(".") - 1, o = T; o >= 0; --o) if (!(i[o] == null || "n?".indexOf(i[o].t) === -1)) {
				for (u = i[o].v.indexOf(".") > -1 && o === T ? i[o].v.indexOf(".") - 1 : i[o].v.length - 1, S = i[o].v.substr(u + 1); u >= 0; --u) x >= 0 && (i[o].v.charAt(u) === "0" || i[o].v.charAt(u) === "#") && (S = w.charAt(x--) + S);
				i[o].v = S, i[o].t = "t", E = o;
			}
			for (x >= 0 && E < i.length && (i[E].v = w.substr(0, x + 1) + i[E].v), x = w.indexOf(".") + 1, o = T; o < i.length; ++o) if (!(i[o] == null || "n?(".indexOf(i[o].t) === -1 && o !== T)) {
				for (u = i[o].v.indexOf(".") > -1 && o === T ? i[o].v.indexOf(".") + 1 : 0, S = i[o].v.substr(0, u); u < i[o].v.length; ++u) x < w.length && (S += w.charAt(x++));
				i[o].v = S, i[o].t = "t", E = o;
			}
		}
	}
	for (o = 0; o < i.length; ++o) i[o] != null && "n?".indexOf(i[o].t) > -1 && (C = r > 1 && t < 0 && o > 0 && i[o - 1].v === "-" ? -t : t, i[o].v = He(i[o].t, i[o].v, C), i[o].t = "t");
	var D = "";
	for (o = 0; o !== i.length; ++o) i[o] != null && (D += i[o].v);
	return D;
}
var qe = /\[(=|>[=]?|<[>=]?)(-?\d+(?:\.\d*)?)\]/;
function Je(e, t) {
	if (t == null) return !1;
	var n = parseFloat(t[2]);
	switch (t[1]) {
		case "=":
			if (e == n) return !0;
			break;
		case ">":
			if (e > n) return !0;
			break;
		case "<":
			if (e < n) return !0;
			break;
		case "<>":
			if (e != n) return !0;
			break;
		case ">=":
			if (e >= n) return !0;
			break;
		case "<=":
			if (e <= n) return !0;
			break;
	}
	return !1;
}
function Ye(e, t) {
	var n = Ue(e), r = n.length, i = n[r - 1].indexOf("@");
	if (r < 4 && i > -1 && --r, n.length > 4) throw Error("cannot find right format for |" + n.join("|") + "|");
	if (typeof t != "number") return [4, n.length === 4 || i > -1 ? n[n.length - 1] : "@"];
	switch (typeof t == "number" && !isFinite(t) && (t = 0), n.length) {
		case 1:
			n = i > -1 ? [
				"General",
				"General",
				"General",
				n[0]
			] : [
				n[0],
				n[0],
				n[0],
				"@"
			];
			break;
		case 2:
			n = i > -1 ? [
				n[0],
				n[0],
				n[0],
				n[1]
			] : [
				n[0],
				n[1],
				n[0],
				"@"
			];
			break;
		case 3:
			n = i > -1 ? [
				n[0],
				n[1],
				n[0],
				n[2]
			] : [
				n[0],
				n[1],
				n[2],
				"@"
			];
			break;
		case 4: break;
	}
	var a = t > 0 ? n[0] : t < 0 ? n[1] : n[2];
	if (n[0].indexOf("[") === -1 && n[1].indexOf("[") === -1) return [r, a];
	if (n[0].match(/\[[=<>]/) != null || n[1].match(/\[[=<>]/) != null) {
		var o = n[0].match(qe), s = n[1].match(qe);
		return Je(t, o) ? [r, n[0]] : Je(t, s) ? [r, n[1]] : [r, n[o != null && s != null ? 2 : 1]];
	}
	return [r, a];
}
function Xe(e, t, n) {
	n == null && (n = {});
	var r = "";
	switch (typeof e) {
		case "string":
			r = e == "m/d/yy" && n.dateNF ? n.dateNF : e;
			break;
		case "number":
			r = e == 14 && n.dateNF ? n.dateNF : (n.table == null ? J : n.table)[e], r == null && (r = n.table && n.table[le[e]] || J[le[e]]), r == null && (r = ue[e] || "General");
			break;
	}
	if (oe(r, 0)) return ye(t, n);
	t instanceof Date && (t = mt(t, n.date1904));
	var i = Ye(r, t);
	if (oe(i[1])) return ye(t, n);
	if (t === !0) t = "TRUE";
	else if (t === !1) t = "FALSE";
	else if (t === "" || t == null) return "";
	else if (isNaN(t) && i[1].indexOf("0") > -1) return "#NUM!";
	else if (!isFinite(t) && i[1].indexOf("0") > -1) return "#DIV/0!";
	return Ke(i[1], t, n, i[0]);
}
function Ze(e, t) {
	if (typeof t != "number") {
		t = +t || -1;
		for (var n = 0; n < 392; ++n) {
			if (J[n] == null) {
				t < 0 && (t = n);
				continue;
			}
			if (J[n] == e) {
				t = n;
				break;
			}
		}
		t < 0 && (t = 391);
	}
	return J[t] = e, t;
}
function Qe() {
	J = ce();
}
var $e = {
	5: "\"$\"#,##0_);\\(\"$\"#,##0\\)",
	6: "\"$\"#,##0_);[Red]\\(\"$\"#,##0\\)",
	7: "\"$\"#,##0.00_);\\(\"$\"#,##0.00\\)",
	8: "\"$\"#,##0.00_);[Red]\\(\"$\"#,##0.00\\)",
	23: "General",
	24: "General",
	25: "General",
	26: "General",
	27: "m/d/yy",
	28: "m/d/yy",
	29: "m/d/yy",
	30: "m/d/yy",
	31: "m/d/yy",
	32: "h:mm:ss",
	33: "h:mm:ss",
	34: "h:mm:ss",
	35: "h:mm:ss",
	36: "m/d/yy",
	41: "_(* #,##0_);_(* (#,##0);_(* \"-\"_);_(@_)",
	42: "_(\"$\"* #,##0_);_(\"$\"* (#,##0);_(\"$\"* \"-\"_);_(@_)",
	43: "_(* #,##0.00_);_(* (#,##0.00);_(* \"-\"??_);_(@_)",
	44: "_(\"$\"* #,##0.00_);_(\"$\"* (#,##0.00);_(\"$\"* \"-\"??_);_(@_)",
	50: "m/d/yy",
	51: "m/d/yy",
	52: "m/d/yy",
	53: "m/d/yy",
	54: "m/d/yy",
	55: "m/d/yy",
	56: "m/d/yy",
	57: "m/d/yy",
	58: "m/d/yy",
	59: "0",
	60: "0.00",
	61: "#,##0",
	62: "#,##0.00",
	63: "\"$\"#,##0_);\\(\"$\"#,##0\\)",
	64: "\"$\"#,##0_);[Red]\\(\"$\"#,##0\\)",
	65: "\"$\"#,##0.00_);\\(\"$\"#,##0.00\\)",
	66: "\"$\"#,##0.00_);[Red]\\(\"$\"#,##0.00\\)",
	67: "0%",
	68: "0.00%",
	69: "# ?/?",
	70: "# ??/??",
	71: "m/d/yy",
	72: "m/d/yy",
	73: "d-mmm-yy",
	74: "d-mmm",
	75: "mmm-yy",
	76: "h:mm",
	77: "h:mm:ss",
	78: "m/d/yy h:mm",
	79: "mm:ss",
	80: "[h]:mm:ss",
	81: "mmss.0"
}, et = /[dD]+|[mM]+|[yYeE]+|[Hh]+|[Ss]+/g;
function tt(e) {
	var t = typeof e == "number" ? J[e] : e;
	return t = t.replace(et, "(\\d+)"), et.lastIndex = 0, RegExp("^" + t + "$");
}
function nt(e, t, n) {
	var r = -1, i = -1, a = -1, o = -1, s = -1, c = -1;
	(t.match(et) || []).forEach(function(e, t) {
		var l = parseInt(n[t + 1], 10);
		switch (e.toLowerCase().charAt(0)) {
			case "y":
				r = l;
				break;
			case "d":
				a = l;
				break;
			case "h":
				o = l;
				break;
			case "s":
				c = l;
				break;
			case "m":
				o >= 0 ? s = l : i = l;
				break;
		}
	}), et.lastIndex = 0, c >= 0 && s == -1 && i >= 0 && (s = i, i = -1);
	var l = ("" + (r >= 0 ? r : (/* @__PURE__ */ new Date()).getFullYear())).slice(-4) + "-" + ("00" + (i >= 1 ? i : 1)).slice(-2) + "-" + ("00" + (a >= 1 ? a : 1)).slice(-2);
	l.length == 7 && (l = "0" + l), l.length == 8 && (l = "20" + l);
	var u = ("00" + (o >= 0 ? o : 0)).slice(-2) + ":" + ("00" + (s >= 0 ? s : 0)).slice(-2) + ":" + ("00" + (c >= 0 ? c : 0)).slice(-2);
	return o == -1 && s == -1 && c == -1 ? l : r == -1 && i == -1 && a == -1 ? u : l + "T" + u;
}
var rt = { "d.m": "d\\.m" };
function it(e, t) {
	return Ze(rt[e] || e, t);
}
var at = /*#__PURE__*/ (function() {
	var e = {};
	e.version = "1.2.0";
	function t() {
		for (var e = 0, t = Array(256), n = 0; n != 256; ++n) e = n, e = e & 1 ? -306674912 ^ e >>> 1 : e >>> 1, e = e & 1 ? -306674912 ^ e >>> 1 : e >>> 1, e = e & 1 ? -306674912 ^ e >>> 1 : e >>> 1, e = e & 1 ? -306674912 ^ e >>> 1 : e >>> 1, e = e & 1 ? -306674912 ^ e >>> 1 : e >>> 1, e = e & 1 ? -306674912 ^ e >>> 1 : e >>> 1, e = e & 1 ? -306674912 ^ e >>> 1 : e >>> 1, e = e & 1 ? -306674912 ^ e >>> 1 : e >>> 1, t[n] = e;
		return typeof Int32Array < "u" ? new Int32Array(t) : t;
	}
	var n = t();
	function r(e) {
		var t = 0, n = 0, r = 0, i = typeof Int32Array < "u" ? new Int32Array(4096) : Array(4096);
		for (r = 0; r != 256; ++r) i[r] = e[r];
		for (r = 0; r != 256; ++r) for (n = e[r], t = 256 + r; t < 4096; t += 256) n = i[t] = n >>> 8 ^ e[n & 255];
		var a = [];
		for (r = 1; r != 16; ++r) a[r - 1] = typeof Int32Array < "u" && typeof i.subarray == "function" ? i.subarray(r * 256, r * 256 + 256) : i.slice(r * 256, r * 256 + 256);
		return a;
	}
	var i = r(n), a = i[0], o = i[1], s = i[2], c = i[3], l = i[4], u = i[5], d = i[6], f = i[7], p = i[8], m = i[9], h = i[10], g = i[11], _ = i[12], v = i[13], y = i[14];
	function b(e, t) {
		for (var r = t ^ -1, i = 0, a = e.length; i < a;) r = r >>> 8 ^ n[(r ^ e.charCodeAt(i++)) & 255];
		return ~r;
	}
	function x(e, t) {
		for (var r = t ^ -1, i = e.length - 15, b = 0; b < i;) r = y[e[b++] ^ r & 255] ^ v[e[b++] ^ r >> 8 & 255] ^ _[e[b++] ^ r >> 16 & 255] ^ g[e[b++] ^ r >>> 24] ^ h[e[b++]] ^ m[e[b++]] ^ p[e[b++]] ^ f[e[b++]] ^ d[e[b++]] ^ u[e[b++]] ^ l[e[b++]] ^ c[e[b++]] ^ s[e[b++]] ^ o[e[b++]] ^ a[e[b++]] ^ n[e[b++]];
		for (i += 15; b < i;) r = r >>> 8 ^ n[(r ^ e[b++]) & 255];
		return ~r;
	}
	function S(e, t) {
		for (var r = t ^ -1, i = 0, a = e.length, o = 0, s = 0; i < a;) o = e.charCodeAt(i++), o < 128 ? r = r >>> 8 ^ n[(r ^ o) & 255] : o < 2048 ? (r = r >>> 8 ^ n[(r ^ (192 | o >> 6 & 31)) & 255], r = r >>> 8 ^ n[(r ^ (128 | o & 63)) & 255]) : o >= 55296 && o < 57344 ? (o = (o & 1023) + 64, s = e.charCodeAt(i++) & 1023, r = r >>> 8 ^ n[(r ^ (240 | o >> 8 & 7)) & 255], r = r >>> 8 ^ n[(r ^ (128 | o >> 2 & 63)) & 255], r = r >>> 8 ^ n[(r ^ (128 | s >> 6 & 15 | (o & 3) << 4)) & 255], r = r >>> 8 ^ n[(r ^ (128 | s & 63)) & 255]) : (r = r >>> 8 ^ n[(r ^ (224 | o >> 12 & 15)) & 255], r = r >>> 8 ^ n[(r ^ (128 | o >> 6 & 63)) & 255], r = r >>> 8 ^ n[(r ^ (128 | o & 63)) & 255]);
		return ~r;
	}
	return e.table = n, e.bstr = b, e.buf = x, e.str = S, e;
})(), ot = /*#__PURE__*/ (function() {
	var e = {};
	e.version = "1.2.2";
	function t(e, t) {
		for (var n = e.split("/"), r = t.split("/"), i = 0, a = 0, o = Math.min(n.length, r.length); i < o; ++i) {
			if (a = n[i].length - r[i].length) return a;
			if (n[i] != r[i]) return n[i] < r[i] ? -1 : 1;
		}
		return n.length - r.length;
	}
	function n(e) {
		if (e.charAt(e.length - 1) == "/") return e.slice(0, -1).indexOf("/") === -1 ? e : n(e.slice(0, -1));
		var t = e.lastIndexOf("/");
		return t === -1 ? e : e.slice(0, t + 1);
	}
	function r(e) {
		if (e.charAt(e.length - 1) == "/") return r(e.slice(0, -1));
		var t = e.lastIndexOf("/");
		return t === -1 ? e : e.slice(t + 1);
	}
	function i(e, t) {
		typeof t == "string" && (t = new Date(t));
		var n = t.getHours();
		n = n << 6 | t.getMinutes(), n = n << 5 | t.getSeconds() >>> 1, e.write_shift(2, n);
		var r = t.getFullYear() - 1980;
		r = r << 4 | t.getMonth() + 1, r = r << 5 | t.getDate(), e.write_shift(2, r);
	}
	function a(e) {
		var t = e.read_shift(2) & 65535, n = e.read_shift(2) & 65535, r = /* @__PURE__ */ new Date(), i = n & 31;
		n >>>= 5;
		var a = n & 15;
		n >>>= 4, r.setMilliseconds(0), r.setFullYear(n + 1980), r.setMonth(a - 1), r.setDate(i);
		var o = t & 31;
		t >>>= 5;
		var s = t & 63;
		return t >>>= 6, r.setHours(t), r.setMinutes(s), r.setSeconds(o << 1), r;
	}
	function o(e) {
		br(e, 0);
		for (var t = {}, n = 0; e.l <= e.length - 4;) {
			var r = e.read_shift(2), i = e.read_shift(2), a = e.l + i, o = {};
			switch (r) {
				case 21589:
					n = e.read_shift(1), n & 1 && (o.mtime = e.read_shift(4)), i > 5 && (n & 2 && (o.atime = e.read_shift(4)), n & 4 && (o.ctime = e.read_shift(4))), o.mtime && (o.mt = /* @__PURE__ */ new Date(o.mtime * 1e3));
					break;
				case 1:
					var s = e.read_shift(4), c = e.read_shift(4);
					o.usz = c * 2 ** 32 + s, s = e.read_shift(4), c = e.read_shift(4), o.csz = c * 2 ** 32 + s;
					break;
			}
			e.l = a, t[r] = o;
		}
		return t;
	}
	var s;
	function c() {
		return s || (s = st);
	}
	function l(e, t) {
		if (e[0] == 80 && e[1] == 75) return Fe(e, t);
		if ((e[0] | 32) == 109 && (e[1] | 32) == 105) return We(e, t);
		if (e.length < 512) throw Error("CFB file size " + e.length + " < 512");
		var n = 3, r = 512, i = 0, a = 0, o = 0, s = 0, c = 0, l = [], m = e.slice(0, 512);
		br(m, 0);
		var g = u(m);
		switch (n = g[0], n) {
			case 3:
				r = 512;
				break;
			case 4:
				r = 4096;
				break;
			case 0: if (g[1] == 0) return Fe(e, t);
			default: throw Error("Major Version: Expected 3 or 4 saw " + n);
		}
		r !== 512 && (m = e.slice(0, r), br(m, 28));
		var y = e.slice(0, r);
		d(m, n);
		var b = m.read_shift(4, "i");
		if (n === 3 && b !== 0) throw Error("# Directory Sectors: Expected 0 saw " + b);
		m.l += 4, o = m.read_shift(4, "i"), m.l += 4, m.chk("00100000", "Mini Stream Cutoff Size: "), s = m.read_shift(4, "i"), i = m.read_shift(4, "i"), c = m.read_shift(4, "i"), a = m.read_shift(4, "i");
		for (var x = -1, S = 0; S < 109 && (x = m.read_shift(4, "i"), !(x < 0)); ++S) l[S] = x;
		var C = f(e, r);
		h(c, a, C, r, l);
		var w = _(C, o, l, r);
		o < w.length && (w[o].name = "!Directory"), i > 0 && s !== O && (w[s].name = "!MiniFAT"), w[l[0]].name = "!FAT", w.fat_addrs = l, w.ssz = r;
		var T = {}, E = [], D = [], k = [];
		v(o, w, C, E, i, T, D, s), p(D, k, E), E.shift();
		var A = {
			FileIndex: D,
			FullPaths: k
		};
		return t && t.raw && (A.raw = {
			header: y,
			sectors: C
		}), A;
	}
	function u(e) {
		if (e[e.l] == 80 && e[e.l + 1] == 75) return [0, 0];
		e.chk(k, "Header Signature: "), e.l += 16;
		var t = e.read_shift(2, "u");
		return [e.read_shift(2, "u"), t];
	}
	function d(e, t) {
		var n = 9;
		switch (e.l += 2, n = e.read_shift(2)) {
			case 9:
				if (t != 3) throw Error("Sector Shift: Expected 9 saw " + n);
				break;
			case 12:
				if (t != 4) throw Error("Sector Shift: Expected 12 saw " + n);
				break;
			default: throw Error("Sector Shift: Expected 9 or 12 saw " + n);
		}
		e.chk("0600", "Mini Sector Shift: "), e.chk("000000000000", "Reserved: ");
	}
	function f(e, t) {
		for (var n = Math.ceil(e.length / t) - 1, r = [], i = 1; i < n; ++i) r[i - 1] = e.slice(i * t, (i + 1) * t);
		return r[n - 1] = e.slice(n * t), r;
	}
	function p(e, t, n) {
		for (var r = 0, i = 0, a = 0, o = 0, s = 0, c = n.length, l = [], u = []; r < c; ++r) l[r] = u[r] = r, t[r] = n[r];
		for (; s < u.length; ++s) r = u[s], i = e[r].L, a = e[r].R, o = e[r].C, l[r] === r && (i !== -1 && l[i] !== i && (l[r] = l[i]), a !== -1 && l[a] !== a && (l[r] = l[a])), o !== -1 && (l[o] = r), i !== -1 && r != l[r] && (l[i] = l[r], u.lastIndexOf(i) < s && u.push(i)), a !== -1 && r != l[r] && (l[a] = l[r], u.lastIndexOf(a) < s && u.push(a));
		for (r = 1; r < c; ++r) l[r] === r && (a !== -1 && l[a] !== a ? l[r] = l[a] : i !== -1 && l[i] !== i && (l[r] = l[i]));
		for (r = 1; r < c; ++r) if (e[r].type !== 0) {
			if (s = r, s != l[s]) do
				s = l[s], t[r] = t[s] + "/" + t[r];
			while (s !== 0 && l[s] !== -1 && s != l[s]);
			l[r] = -1;
		}
		for (t[0] += "/", r = 1; r < c; ++r) e[r].type !== 2 && (t[r] += "/");
	}
	function m(e, t, n) {
		for (var r = e.start, i = e.size, a = [], o = r; n && i > 0 && o >= 0;) a.push(t.slice(o * D, o * D + D)), i -= D, o = fr(n, o * 4);
		return a.length === 0 ? Sr(0) : V(a).slice(0, e.size);
	}
	function h(e, t, n, r, i) {
		var a = O;
		if (e === O) {
			if (t !== 0) throw Error("DIFAT chain shorter than expected");
		} else if (e !== -1) {
			var o = n[e], s = (r >>> 2) - 1;
			if (!o) return;
			for (var c = 0; c < s && (a = fr(o, c * 4)) !== O; ++c) i.push(a);
			t >= 1 && h(fr(o, r - 4), t - 1, n, r, i);
		}
	}
	function g(e, t, n, r, i) {
		var a = [], o = [];
		i || (i = []);
		var s = r - 1, c = 0, l = 0;
		for (c = t; c >= 0;) {
			i[c] = !0, a[a.length] = c, o.push(e[c]);
			var u = n[Math.floor(c * 4 / r)];
			if (l = c * 4 & s, r < 4 + l) throw Error("FAT boundary crossed: " + c + " 4 " + r);
			if (!e[u]) break;
			c = fr(e[u], l);
		}
		return {
			nodes: a,
			data: Vn([o])
		};
	}
	function _(e, t, n, r) {
		var i = e.length, a = [], o = [], s = [], c = [], l = r - 1, u = 0, d = 0, f = 0, p = 0;
		for (u = 0; u < i; ++u) if (s = [], f = u + t, f >= i && (f -= i), !o[f]) {
			c = [];
			var m = [];
			for (d = f; d >= 0;) {
				m[d] = !0, o[d] = !0, s[s.length] = d, c.push(e[d]);
				var h = n[Math.floor(d * 4 / r)];
				if (p = d * 4 & l, r < 4 + p) throw Error("FAT boundary crossed: " + d + " 4 " + r);
				if (!e[h] || (d = fr(e[h], p), m[d])) break;
			}
			a[f] = {
				nodes: s,
				data: Vn([c])
			};
		}
		return a;
	}
	function v(e, t, n, r, i, a, o, s) {
		for (var c = 0, l = r.length ? 2 : 0, u = t[e].data, d = 0, f = 0, p; d < u.length; d += 128) {
			var h = u.slice(d, d + 128);
			br(h, 64), f = h.read_shift(2), p = Un(h, 0, f - l), r.push(p);
			var _ = {
				name: p,
				type: h.read_shift(1),
				color: h.read_shift(1),
				L: h.read_shift(4, "i"),
				R: h.read_shift(4, "i"),
				C: h.read_shift(4, "i"),
				clsid: h.read_shift(16),
				state: h.read_shift(4, "i"),
				start: 0,
				size: 0
			};
			h.read_shift(2) + h.read_shift(2) + h.read_shift(2) + h.read_shift(2) !== 0 && (_.ct = y(h, h.l - 8)), h.read_shift(2) + h.read_shift(2) + h.read_shift(2) + h.read_shift(2) !== 0 && (_.mt = y(h, h.l - 8)), _.start = h.read_shift(4, "i"), _.size = h.read_shift(4, "i"), _.size < 0 && _.start < 0 && (_.size = _.type = 0, _.start = O, _.name = ""), _.type === 5 ? (c = _.start, i > 0 && c !== O && (t[c].name = "!StreamData")) : _.size >= 4096 ? (_.storage = "fat", t[_.start] === void 0 && (t[_.start] = g(n, _.start, t.fat_addrs, t.ssz)), t[_.start].name = _.name, _.content = t[_.start].data.slice(0, _.size)) : (_.storage = "minifat", _.size < 0 ? _.size = 0 : c !== O && _.start !== O && t[c] && (_.content = m(_, t[c].data, (t[s] || {}).data))), _.content && br(_.content, 0), a[p] = _, o.push(_);
		}
	}
	function y(e, t) {
		return /* @__PURE__ */ new Date((dr(e, t + 4) / 1e7 * 2 ** 32 + dr(e, t) / 1e7 - 11644473600) * 1e3);
	}
	function b(e, t) {
		return c(), l(s.readFileSync(e), t);
	}
	function x(e, t) {
		var n = t && t.type;
		switch (n || N && Buffer.isBuffer(e) && (n = "buffer"), n || "base64") {
			case "file": return b(e, t);
			case "base64": return l(R(M(e)), t);
			case "binary": return l(R(e), t);
		}
		return l(e, t);
	}
	function S(e, t) {
		var n = t || {}, r = n.root || "Root Entry";
		if (e.FullPaths || (e.FullPaths = []), e.FileIndex || (e.FileIndex = []), e.FullPaths.length !== e.FileIndex.length) throw Error("inconsistent CFB structure");
		e.FullPaths.length === 0 && (e.FullPaths[0] = r + "/", e.FileIndex[0] = {
			name: r,
			type: 5
		}), n.CLSID && (e.FileIndex[0].clsid = n.CLSID), C(e);
	}
	function C(e) {
		var t = "Sh33tJ5";
		if (!ot.find(e, "/" + t)) {
			var n = Sr(4);
			n[0] = 55, n[1] = n[3] = 50, n[2] = 54, e.FileIndex.push({
				name: t,
				type: 2,
				content: n,
				size: 4,
				L: 69,
				R: 69,
				C: 69
			}), e.FullPaths.push(e.FullPaths[0] + t), w(e);
		}
	}
	function w(e, i) {
		S(e);
		for (var a = !1, o = !1, s = e.FullPaths.length - 1; s >= 0; --s) {
			var c = e.FileIndex[s];
			switch (c.type) {
				case 0:
					o ? a = !0 : (e.FileIndex.pop(), e.FullPaths.pop());
					break;
				case 1:
				case 2:
				case 5:
					o = !0, isNaN(c.R * c.L * c.C) && (a = !0), c.R > -1 && c.L > -1 && c.R == c.L && (a = !0);
					break;
				default:
					a = !0;
					break;
			}
		}
		if (!(!a && !i)) {
			var l = new Date(1987, 1, 19), u = 0, d = Object.create ? Object.create(null) : {}, f = [];
			for (s = 0; s < e.FullPaths.length; ++s) d[e.FullPaths[s]] = !0, e.FileIndex[s].type !== 0 && f.push([e.FullPaths[s], e.FileIndex[s]]);
			for (s = 0; s < f.length; ++s) {
				var p = n(f[s][0]);
				for (o = d[p]; !o;) {
					for (; n(p) && !d[n(p)];) p = n(p);
					f.push([p, {
						name: r(p).replace("/", ""),
						type: 1,
						clsid: F,
						ct: l,
						mt: l,
						content: null
					}]), d[p] = !0, p = n(f[s][0]), o = d[p];
				}
			}
			for (f.sort(function(e, n) {
				return t(e[0], n[0]);
			}), e.FullPaths = [], e.FileIndex = [], s = 0; s < f.length; ++s) e.FullPaths[s] = f[s][0], e.FileIndex[s] = f[s][1];
			for (s = 0; s < f.length; ++s) {
				var m = e.FileIndex[s], h = e.FullPaths[s];
				if (m.name = r(h).replace("/", ""), m.L = m.R = m.C = -(m.color = 1), m.size = m.content ? m.content.length : 0, m.start = 0, m.clsid = m.clsid || F, s === 0) m.C = f.length > 1 ? 1 : -1, m.size = 0, m.type = 5;
				else if (h.slice(-1) == "/") {
					for (u = s + 1; u < f.length && n(e.FullPaths[u]) != h; ++u);
					for (m.C = u >= f.length ? -1 : u, u = s + 1; u < f.length && n(e.FullPaths[u]) != n(h); ++u);
					m.R = u >= f.length ? -1 : u, m.type = 1;
				} else n(e.FullPaths[s + 1] || "") == n(h) && (m.R = s + 1), m.type = 2;
			}
		}
	}
	function T(e, t) {
		var n = t || {};
		if (n.fileType == "mad") return Ge(e, n);
		switch (w(e), n.fileType) {
			case "zip": return Le(e, n);
		}
		var r = (function(e) {
			for (var t = 0, n = 0, r = 0; r < e.FileIndex.length; ++r) {
				var i = e.FileIndex[r];
				if (i.content) {
					var a = i.content.length;
					a > 0 && (a < 4096 ? t += a + 63 >> 6 : n += a + 511 >> 9);
				}
			}
			for (var o = e.FullPaths.length + 3 >> 2, s = t + 7 >> 3, c = t + 127 >> 7, l = s + n + o + c, u = l + 127 >> 7, d = u <= 109 ? 0 : Math.ceil((u - 109) / 127); l + u + d + 127 >> 7 > u;) d = ++u <= 109 ? 0 : Math.ceil((u - 109) / 127);
			var f = [
				1,
				d,
				u,
				c,
				o,
				n,
				t,
				0
			];
			return e.FileIndex[0].size = t << 6, f[7] = (e.FileIndex[0].start = f[0] + f[1] + f[2] + f[3] + f[4] + f[5]) + (f[6] + 7 >> 3), f;
		})(e), i = Sr(r[7] << 9), a = 0, o = 0;
		for (a = 0; a < 8; ++a) i.write_shift(1, j[a]);
		for (a = 0; a < 8; ++a) i.write_shift(2, 0);
		for (i.write_shift(2, 62), i.write_shift(2, 3), i.write_shift(2, 65534), i.write_shift(2, 9), i.write_shift(2, 6), a = 0; a < 3; ++a) i.write_shift(2, 0);
		for (i.write_shift(4, 0), i.write_shift(4, r[2]), i.write_shift(4, r[0] + r[1] + r[2] + r[3] - 1), i.write_shift(4, 0), i.write_shift(4, 4096), i.write_shift(4, r[3] ? r[0] + r[1] + r[2] - 1 : O), i.write_shift(4, r[3]), i.write_shift(-4, r[1] ? r[0] - 1 : O), i.write_shift(4, r[1]), a = 0; a < 109; ++a) i.write_shift(-4, a < r[2] ? r[1] + a : -1);
		if (r[1]) for (o = 0; o < r[1]; ++o) {
			for (; a < 236 + o * 127; ++a) i.write_shift(-4, a < r[2] ? r[1] + a : -1);
			i.write_shift(-4, o === r[1] - 1 ? O : o + 1);
		}
		var s = function(e) {
			for (o += e; a < o - 1; ++a) i.write_shift(-4, a + 1);
			e && (++a, i.write_shift(-4, O));
		};
		for (o = a = 0, o += r[1]; a < o; ++a) i.write_shift(-4, z.DIFSECT);
		for (o += r[2]; a < o; ++a) i.write_shift(-4, z.FATSECT);
		s(r[3]), s(r[4]);
		for (var c = 0, l = 0, u = e.FileIndex[0]; c < e.FileIndex.length; ++c) u = e.FileIndex[c], u.content && (l = u.content.length, !(l < 4096) && (u.start = o, s(l + 511 >> 9)));
		for (s(r[6] + 7 >> 3); i.l & 511;) i.write_shift(-4, z.ENDOFCHAIN);
		for (o = a = 0, c = 0; c < e.FileIndex.length; ++c) u = e.FileIndex[c], u.content && (l = u.content.length, !(!l || l >= 4096) && (u.start = o, s(l + 63 >> 6)));
		for (; i.l & 511;) i.write_shift(-4, z.ENDOFCHAIN);
		for (a = 0; a < r[4] << 2; ++a) {
			var d = e.FullPaths[a];
			if (!d || d.length === 0) {
				for (c = 0; c < 17; ++c) i.write_shift(4, 0);
				for (c = 0; c < 3; ++c) i.write_shift(4, -1);
				for (c = 0; c < 12; ++c) i.write_shift(4, 0);
				continue;
			}
			u = e.FileIndex[a], a === 0 && (u.start = u.size ? u.start - 1 : O);
			var f = a === 0 && n.root || u.name;
			if (f.length > 31 && (console.error("Name " + f + " will be truncated to " + f.slice(0, 31)), f = f.slice(0, 31)), l = 2 * (f.length + 1), i.write_shift(64, f, "utf16le"), i.write_shift(2, l), i.write_shift(1, u.type), i.write_shift(1, u.color), i.write_shift(-4, u.L), i.write_shift(-4, u.R), i.write_shift(-4, u.C), u.clsid) i.write_shift(16, u.clsid, "hex");
			else for (c = 0; c < 4; ++c) i.write_shift(4, 0);
			i.write_shift(4, u.state || 0), i.write_shift(4, 0), i.write_shift(4, 0), i.write_shift(4, 0), i.write_shift(4, 0), i.write_shift(4, u.start), i.write_shift(4, u.size), i.write_shift(4, 0);
		}
		for (a = 1; a < e.FileIndex.length; ++a) if (u = e.FileIndex[a], u.size >= 4096) if (i.l = u.start + 1 << 9, N && Buffer.isBuffer(u.content)) u.content.copy(i, i.l, 0, u.size), i.l += u.size + 511 & -512;
		else {
			for (c = 0; c < u.size; ++c) i.write_shift(1, u.content[c]);
			for (; c & 511; ++c) i.write_shift(1, 0);
		}
		for (a = 1; a < e.FileIndex.length; ++a) if (u = e.FileIndex[a], u.size > 0 && u.size < 4096) if (N && Buffer.isBuffer(u.content)) u.content.copy(i, i.l, 0, u.size), i.l += u.size + 63 & -64;
		else {
			for (c = 0; c < u.size; ++c) i.write_shift(1, u.content[c]);
			for (; c & 63; ++c) i.write_shift(1, 0);
		}
		if (N) i.l = i.length;
		else for (; i.l < i.length;) i.write_shift(1, 0);
		return i;
	}
	function E(e, t) {
		var n = e.FullPaths.map(function(e) {
			return e.toUpperCase();
		}), r = n.map(function(e) {
			var t = e.split("/");
			return t[t.length - (e.slice(-1) == "/" ? 2 : 1)];
		}), i = !1;
		t.charCodeAt(0) === 47 ? (i = !0, t = n[0].slice(0, -1) + t) : i = t.indexOf("/") !== -1;
		var a = t.toUpperCase(), o = i === !0 ? n.indexOf(a) : r.indexOf(a);
		if (o !== -1) return e.FileIndex[o];
		var s = !a.match(W);
		for (a = a.replace(U, ""), s && (a = a.replace(W, "!")), o = 0; o < n.length; ++o) if ((s ? n[o].replace(W, "!") : n[o]).replace(U, "") == a || (s ? r[o].replace(W, "!") : r[o]).replace(U, "") == a) return e.FileIndex[o];
		return null;
	}
	var D = 64, O = -2, k = "d0cf11e0a1b11ae1", j = [
		208,
		207,
		17,
		224,
		161,
		177,
		26,
		225
	], F = "00000000000000000000000000000000", z = {
		MAXREGSECT: -6,
		DIFSECT: -4,
		FATSECT: -3,
		ENDOFCHAIN: O,
		FREESECT: -1,
		HEADER_SIGNATURE: k,
		HEADER_MINOR_VERSION: "3e00",
		MAXREGSID: -6,
		NOSTREAM: -1,
		HEADER_CLSID: F,
		EntryTypes: [
			"unknown",
			"storage",
			"stream",
			"lockbytes",
			"property",
			"root"
		]
	};
	function B(e, t, n) {
		c();
		var r = T(e, n);
		s.writeFileSync(t, r);
	}
	function H(e) {
		for (var t = Array(e.length), n = 0; n < e.length; ++n) t[n] = String.fromCharCode(e[n]);
		return t.join("");
	}
	function ee(e, t) {
		var n = T(e, t);
		switch (t && t.type || "buffer") {
			case "file": return c(), s.writeFileSync(t.filename, n), n;
			case "binary": return typeof n == "string" ? n : H(n);
			case "base64": return A(typeof n == "string" ? n : H(n));
			case "buffer": if (N) return Buffer.isBuffer(n) ? n : P(n);
			case "array": return typeof n == "string" ? R(n) : n;
		}
		return n;
	}
	var te;
	function ne(e) {
		try {
			var t = e.InflateRaw, n = new t();
			if (n._processChunk(new Uint8Array([3, 0]), n._finishFlushFlag), n.bytesRead) te = e;
			else throw Error("zlib does not expose bytesRead");
		} catch (e) {
			console.error("cannot use native zlib: " + (e.message || e));
		}
	}
	function re(e, t) {
		if (!te) return Ne(e, t);
		var n = te.InflateRaw, r = new n(), i = r._processChunk(e.slice(e.l), r._finishFlushFlag);
		return e.l += r.bytesRead, i;
	}
	function G(e) {
		return te ? te.deflateRawSync(e) : Y(e);
	}
	var ie = [
		16,
		17,
		18,
		0,
		8,
		7,
		9,
		6,
		10,
		5,
		11,
		4,
		12,
		3,
		13,
		2,
		14,
		1,
		15
	], ae = [
		3,
		4,
		5,
		6,
		7,
		8,
		9,
		10,
		11,
		13,
		15,
		17,
		19,
		23,
		27,
		31,
		35,
		43,
		51,
		59,
		67,
		83,
		99,
		115,
		131,
		163,
		195,
		227,
		258
	], K = [
		1,
		2,
		3,
		4,
		5,
		7,
		9,
		13,
		17,
		25,
		33,
		49,
		65,
		97,
		129,
		193,
		257,
		385,
		513,
		769,
		1025,
		1537,
		2049,
		3073,
		4097,
		6145,
		8193,
		12289,
		16385,
		24577
	];
	function oe(e) {
		var t = (e << 1 | e << 11) & 139536 | (e << 5 | e << 15) & 558144;
		return (t >> 16 | t >> 8 | t) & 255;
	}
	for (var q = typeof Uint8Array < "u", se = q ? new Uint8Array(256) : [], ce = 0; ce < 256; ++ce) se[ce] = oe(ce);
	function J(e, t) {
		var n = se[e & 255];
		return t <= 8 ? n >>> 8 - t : (n = n << 8 | se[e >> 8 & 255], t <= 16 ? n >>> 16 - t : (n = n << 8 | se[e >> 16 & 255], n >>> 24 - t));
	}
	function le(e, t) {
		var n = t & 7, r = t >>> 3;
		return (e[r] | (n <= 6 ? 0 : e[r + 1] << 8)) >>> n & 3;
	}
	function ue(e, t) {
		var n = t & 7, r = t >>> 3;
		return (e[r] | (n <= 5 ? 0 : e[r + 1] << 8)) >>> n & 7;
	}
	function de(e, t) {
		var n = t & 7, r = t >>> 3;
		return (e[r] | (n <= 4 ? 0 : e[r + 1] << 8)) >>> n & 15;
	}
	function fe(e, t) {
		var n = t & 7, r = t >>> 3;
		return (e[r] | (n <= 3 ? 0 : e[r + 1] << 8)) >>> n & 31;
	}
	function pe(e, t) {
		var n = t & 7, r = t >>> 3;
		return (e[r] | (n <= 1 ? 0 : e[r + 1] << 8)) >>> n & 127;
	}
	function me(e, t, n) {
		var r = t & 7, i = t >>> 3, a = (1 << n) - 1, o = e[i] >>> r;
		return n < 8 - r || (o |= e[i + 1] << 8 - r, n < 16 - r) || (o |= e[i + 2] << 16 - r, n < 24 - r) || (o |= e[i + 3] << 24 - r), o & a;
	}
	function he(e, t, n) {
		var r = t & 7, i = t >>> 3;
		return r <= 5 ? e[i] |= (n & 7) << r : (e[i] |= n << r & 255, e[i + 1] = (n & 7) >> 8 - r), t + 3;
	}
	function ge(e, t, n) {
		var r = t & 7, i = t >>> 3;
		return n = (n & 1) << r, e[i] |= n, t + 1;
	}
	function _e(e, t, n) {
		var r = t & 7, i = t >>> 3;
		return n <<= r, e[i] |= n & 255, n >>>= 8, e[i + 1] = n, t + 8;
	}
	function ve(e, t, n) {
		var r = t & 7, i = t >>> 3;
		return n <<= r, e[i] |= n & 255, n >>>= 8, e[i + 1] = n & 255, e[i + 2] = n >>> 8, t + 16;
	}
	function ye(e, t) {
		var n = e.length, r = 2 * n > t ? 2 * n : t + 5, i = 0;
		if (n >= t) return e;
		if (N) {
			var a = L(r);
			if (e.copy) e.copy(a);
			else for (; i < e.length; ++i) a[i] = e[i];
			return a;
		} else if (q) {
			var o = new Uint8Array(r);
			if (o.set) o.set(e);
			else for (; i < n; ++i) o[i] = e[i];
			return o;
		}
		return e.length = r, e;
	}
	function be(e) {
		for (var t = Array(e), n = 0; n < e; ++n) t[n] = 0;
		return t;
	}
	function xe(e, t, n) {
		var r = 1, i = 0, a = 0, o = 0, s = 0, c = e.length, l = q ? new Uint16Array(32) : be(32);
		for (a = 0; a < 32; ++a) l[a] = 0;
		for (a = c; a < n; ++a) e[a] = 0;
		c = e.length;
		var u = q ? new Uint16Array(c) : be(c);
		for (a = 0; a < c; ++a) l[i = e[a]]++, r < i && (r = i), u[a] = 0;
		for (l[0] = 0, a = 1; a <= r; ++a) l[a + 16] = s = s + l[a - 1] << 1;
		for (a = 0; a < c; ++a) s = e[a], s != 0 && (u[a] = l[s + 16]++);
		var d = 0;
		for (a = 0; a < c; ++a) if (d = e[a], d != 0) for (s = J(u[a], r) >> r - d, o = (1 << r + 4 - d) - 1; o >= 0; --o) t[s | o << d] = d & 15 | a << 4;
		return r;
	}
	var Se = q ? new Uint16Array(512) : be(512), Ce = q ? new Uint16Array(32) : be(32);
	if (!q) {
		for (var we = 0; we < 512; ++we) Se[we] = 0;
		for (we = 0; we < 32; ++we) Ce[we] = 0;
	}
	(function() {
		for (var e = [], t = 0; t < 32; t++) e.push(5);
		xe(e, Ce, 32);
		var n = [];
		for (t = 0; t <= 143; t++) n.push(8);
		for (; t <= 255; t++) n.push(9);
		for (; t <= 279; t++) n.push(7);
		for (; t <= 287; t++) n.push(8);
		xe(n, Se, 288);
	})();
	var Te = /*#__PURE__*/ (function() {
		for (var e = q ? new Uint8Array(32768) : [], t = 0, n = 0; t < K.length - 1; ++t) for (; n < K[t + 1]; ++n) e[n] = t;
		for (; n < 32768; ++n) e[n] = 29;
		var r = q ? new Uint8Array(259) : [];
		for (t = 0, n = 0; t < ae.length - 1; ++t) for (; n < ae[t + 1]; ++n) r[n] = t;
		function i(e, t) {
			for (var n = 0; n < e.length;) {
				var r = Math.min(65535, e.length - n), i = n + r == e.length;
				for (t.write_shift(1, +i), t.write_shift(2, r), t.write_shift(2, ~r & 65535); r-- > 0;) t[t.l++] = e[n++];
			}
			return t.l;
		}
		function a(t, n) {
			for (var i = 0, a = 0, o = q ? new Uint16Array(32768) : []; a < t.length;) {
				var s = Math.min(65535, t.length - a);
				if (s < 10) {
					for (i = he(n, i, +(a + s == t.length)), i & 7 && (i += 8 - (i & 7)), n.l = i / 8 | 0, n.write_shift(2, s), n.write_shift(2, ~s & 65535); s-- > 0;) n[n.l++] = t[a++];
					i = n.l * 8;
					continue;
				}
				i = he(n, i, +(a + s == t.length) + 2);
				for (var c = 0; s-- > 0;) {
					var l = t[a];
					c = (c << 5 ^ l) & 32767;
					var u = -1, d = 0;
					if ((u = o[c]) && (u |= a & -32768, u > a && (u -= 32768), u < a)) for (; t[u + d] == t[a + d] && d < 250;) ++d;
					if (d > 2) {
						l = r[d], l <= 22 ? i = _e(n, i, se[l + 1] >> 1) - 1 : (_e(n, i, 3), i += 5, _e(n, i, se[l - 23] >> 5), i += 3);
						var f = l < 8 ? 0 : l - 4 >> 2;
						f > 0 && (ve(n, i, d - ae[l]), i += f), l = e[a - u], i = _e(n, i, se[l] >> 3), i -= 3;
						var p = l < 4 ? 0 : l - 2 >> 1;
						p > 0 && (ve(n, i, a - u - K[l]), i += p);
						for (var m = 0; m < d; ++m) o[c] = a & 32767, c = (c << 5 ^ t[a]) & 32767, ++a;
						s -= d - 1;
					} else l <= 143 ? l += 48 : i = ge(n, i, 1), i = _e(n, i, se[l]), o[c] = a & 32767, ++a;
				}
				i = _e(n, i, 0) - 1;
			}
			return n.l = (i + 7) / 8 | 0, n.l;
		}
		return function(e, t) {
			return e.length < 8 ? i(e, t) : a(e, t);
		};
	})();
	function Y(e) {
		var t = Sr(50 + Math.floor(e.length * 1.1)), n = Te(e, t);
		return t.slice(0, n);
	}
	var Ee = q ? new Uint16Array(32768) : be(32768), De = q ? new Uint16Array(32768) : be(32768), Oe = q ? new Uint16Array(128) : be(128), ke = 1, Ae = 1;
	function je(e, t) {
		var n = fe(e, t) + 257;
		t += 5;
		var r = fe(e, t) + 1;
		t += 5;
		var i = de(e, t) + 4;
		t += 4;
		for (var a = 0, o = q ? new Uint8Array(19) : be(19), s = [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0
		], c = 1, l = q ? new Uint8Array(8) : be(8), u = q ? new Uint8Array(8) : be(8), d = o.length, f = 0; f < i; ++f) o[ie[f]] = a = ue(e, t), c < a && (c = a), l[a]++, t += 3;
		var p = 0;
		for (l[0] = 0, f = 1; f <= c; ++f) u[f] = p = p + l[f - 1] << 1;
		for (f = 0; f < d; ++f) (p = o[f]) != 0 && (s[f] = u[p]++);
		var m = 0;
		for (f = 0; f < d; ++f) if (m = o[f], m != 0) {
			p = se[s[f]] >> 8 - m;
			for (var h = (1 << 7 - m) - 1; h >= 0; --h) Oe[p | h << m] = m & 7 | f << 3;
		}
		var g = [];
		for (c = 1; g.length < n + r;) switch (p = Oe[pe(e, t)], t += p & 7, p >>>= 3) {
			case 16:
				for (a = 3 + le(e, t), t += 2, p = g[g.length - 1]; a-- > 0;) g.push(p);
				break;
			case 17:
				for (a = 3 + ue(e, t), t += 3; a-- > 0;) g.push(0);
				break;
			case 18:
				for (a = 11 + pe(e, t), t += 7; a-- > 0;) g.push(0);
				break;
			default:
				g.push(p), c < p && (c = p);
				break;
		}
		var _ = g.slice(0, n), v = g.slice(n);
		for (f = n; f < 286; ++f) _[f] = 0;
		for (f = r; f < 30; ++f) v[f] = 0;
		return ke = xe(_, Ee, 286), Ae = xe(v, De, 30), t;
	}
	function Me(e, t) {
		if (e[0] == 3 && !(e[1] & 3)) return [I(t), 2];
		for (var n = 0, r = 0, i = L(t || 1 << 18), a = 0, o = i.length >>> 0, s = 0, c = 0; !(r & 1);) {
			if (r = ue(e, n), n += 3, r >>> 1) r >> 1 == 1 ? (s = 9, c = 5) : (n = je(e, n), s = ke, c = Ae);
			else {
				n & 7 && (n += 8 - (n & 7));
				var l = e[n >>> 3] | e[(n >>> 3) + 1] << 8;
				if (n += 32, l > 0) for (!t && o < a + l && (i = ye(i, a + l), o = i.length); l-- > 0;) i[a++] = e[n >>> 3], n += 8;
				continue;
			}
			for (;;) {
				!t && o < a + 32767 && (i = ye(i, a + 32767), o = i.length);
				var u = me(e, n, s), d = r >>> 1 == 1 ? Se[u] : Ee[u];
				if (n += d & 15, d >>>= 4, !(d >>> 8 & 255)) i[a++] = d;
				else if (d == 256) break;
				else {
					d -= 257;
					var f = d < 8 ? 0 : d - 4 >> 2;
					f > 5 && (f = 0);
					var p = a + ae[d];
					f > 0 && (p += me(e, n, f), n += f), u = me(e, n, c), d = r >>> 1 == 1 ? Ce[u] : De[u], n += d & 15, d >>>= 4;
					var m = d < 4 ? 0 : d - 2 >> 1, h = K[d];
					for (m > 0 && (h += me(e, n, m), n += m), !t && o < p && (i = ye(i, p + 100), o = i.length); a < p;) i[a] = i[a - h], ++a;
				}
			}
		}
		return t ? [i, n + 7 >>> 3] : [i.slice(0, a), n + 7 >>> 3];
	}
	function Ne(e, t) {
		var n = Me(e.slice(e.l || 0), t);
		return e.l += n[1], n[0];
	}
	function Pe(e, t) {
		if (e) typeof console < "u" && console.error(t);
		else throw Error(t);
	}
	function Fe(e, t) {
		var n = e;
		br(n, 0);
		var r = {
			FileIndex: [],
			FullPaths: []
		};
		S(r, { root: t.root });
		for (var i = n.length - 4; (n[i] != 80 || n[i + 1] != 75 || n[i + 2] != 5 || n[i + 3] != 6) && i >= 0;) --i;
		n.l = i + 4, n.l += 4;
		var a = n.read_shift(2);
		for (n.l += 6, n.l = n.read_shift(4), i = 0; i < a; ++i) {
			n.l += 20;
			var s = n.read_shift(4), c = n.read_shift(4), l = n.read_shift(2), u = n.read_shift(2), d = n.read_shift(2);
			n.l += 8;
			var f = n.read_shift(4), p = o(n.slice(n.l + l, n.l + l + u));
			n.l += l + u + d;
			var m = n.l;
			n.l = f + 4, p && p[1] && ((p[1] || {}).usz && (c = p[1].usz), (p[1] || {}).csz && (s = p[1].csz)), Ie(n, s, c, r, p), n.l = m;
		}
		return r;
	}
	function Ie(e, t, n, r, i) {
		e.l += 2;
		var s = e.read_shift(2), c = e.read_shift(2), l = a(e);
		if (s & 8257) throw Error("Unsupported ZIP encryption");
		for (var u = e.read_shift(4), d = e.read_shift(4), f = e.read_shift(4), p = e.read_shift(2), m = e.read_shift(2), h = "", g = 0; g < p; ++g) h += String.fromCharCode(e[e.l++]);
		if (m) {
			var _ = o(e.slice(e.l, e.l + m));
			(_[21589] || {}).mt && (l = _[21589].mt), (_[1] || {}).usz && (f = _[1].usz), (_[1] || {}).csz && (d = _[1].csz), i && ((i[21589] || {}).mt && (l = i[21589].mt), (i[1] || {}).usz && (f = i[1].usz), (i[1] || {}).csz && (d = i[1].csz));
		}
		e.l += m;
		var v = e.slice(e.l, e.l + d);
		switch (c) {
			case 8:
				v = re(e, f);
				break;
			case 0:
				e.l += d;
				break;
			default: throw Error("Unsupported ZIP Compression method " + c);
		}
		var y = !1;
		s & 8 && (u = e.read_shift(4), u == 134695760 && (u = e.read_shift(4), y = !0), d = e.read_shift(4), f = e.read_shift(4)), d != t && Pe(y, "Bad compressed size: " + t + " != " + d), f != n && Pe(y, "Bad uncompressed size: " + n + " != " + f), qe(r, h, v, {
			unsafe: !0,
			mt: l
		});
	}
	function Le(e, t) {
		var n = t || {}, r = [], a = [], o = Sr(1), s = n.compression ? 8 : 0, c = 0, l = 0, u = 0, d = 0, f = 0, p = e.FullPaths[0], m = p, h = e.FileIndex[0], g = [], _ = 0;
		for (l = 1; l < e.FullPaths.length; ++l) if (m = e.FullPaths[l].slice(p.length), h = e.FileIndex[l], !(!h.size || !h.content || Array.isArray(h.content) && h.content.length == 0 || m == "Sh33tJ5")) {
			var v = d, y = Sr(m.length);
			for (u = 0; u < m.length; ++u) y.write_shift(1, m.charCodeAt(u) & 127);
			y = y.slice(0, y.l), g[f] = typeof h.content == "string" ? at.bstr(h.content, 0) : at.buf(h.content, 0);
			var b = typeof h.content == "string" ? R(h.content) : h.content;
			s == 8 && (b = G(b)), o = Sr(30), o.write_shift(4, 67324752), o.write_shift(2, 20), o.write_shift(2, c), o.write_shift(2, s), h.mt ? i(o, h.mt) : o.write_shift(4, 0), o.write_shift(-4, c & 8 ? 0 : g[f]), o.write_shift(4, c & 8 ? 0 : b.length), o.write_shift(4, c & 8 ? 0 : h.content.length), o.write_shift(2, y.length), o.write_shift(2, 0), d += o.length, r.push(o), d += y.length, r.push(y), d += b.length, r.push(b), c & 8 && (o = Sr(12), o.write_shift(-4, g[f]), o.write_shift(4, b.length), o.write_shift(4, h.content.length), d += o.l, r.push(o)), o = Sr(46), o.write_shift(4, 33639248), o.write_shift(2, 0), o.write_shift(2, 20), o.write_shift(2, c), o.write_shift(2, s), o.write_shift(4, 0), o.write_shift(-4, g[f]), o.write_shift(4, b.length), o.write_shift(4, h.content.length), o.write_shift(2, y.length), o.write_shift(2, 0), o.write_shift(2, 0), o.write_shift(2, 0), o.write_shift(2, 0), o.write_shift(4, 0), o.write_shift(4, v), _ += o.l, a.push(o), _ += y.length, a.push(y), ++f;
		}
		return o = Sr(22), o.write_shift(4, 101010256), o.write_shift(2, 0), o.write_shift(2, 0), o.write_shift(2, f), o.write_shift(2, f), o.write_shift(4, _), o.write_shift(4, d), o.write_shift(2, 0), V([
			V(r),
			V(a),
			o
		]);
	}
	var Re = {
		htm: "text/html",
		xml: "text/xml",
		gif: "image/gif",
		jpg: "image/jpeg",
		png: "image/png",
		mso: "application/x-mso",
		thmx: "application/vnd.ms-officetheme",
		sh33tj5: "application/octet-stream"
	};
	function ze(e, t) {
		if (e.ctype) return e.ctype;
		var n = e.name || "", r = n.match(/\.([^\.]+)$/);
		return r && Re[r[1]] || t && (r = (n = t).match(/[\.\\]([^\.\\])+$/), r && Re[r[1]]) ? Re[r[1]] : "application/octet-stream";
	}
	function Be(e) {
		for (var t = A(e), n = [], r = 0; r < t.length; r += 76) n.push(t.slice(r, r + 76));
		return n.join("\r\n") + "\r\n";
	}
	function Ve(e) {
		var t = e.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7E-\xFF=]/g, function(e) {
			var t = e.charCodeAt(0).toString(16).toUpperCase();
			return "=" + (t.length == 1 ? "0" + t : t);
		});
		t = t.replace(/ $/gm, "=20").replace(/\t$/gm, "=09"), t.charAt(0) == "\n" && (t = "=0D" + t.slice(1)), t = t.replace(/\r(?!\n)/gm, "=0D").replace(/\n\n/gm, "\n=0A").replace(/([^\r\n])\n/gm, "$1=0A");
		for (var n = [], r = t.split("\r\n"), i = 0; i < r.length; ++i) {
			var a = r[i];
			if (a.length == 0) {
				n.push("");
				continue;
			}
			for (var o = 0; o < a.length;) {
				var s = 76, c = a.slice(o, o + s);
				c.charAt(s - 1) == "=" ? s-- : c.charAt(s - 2) == "=" ? s -= 2 : c.charAt(s - 3) == "=" && (s -= 3), c = a.slice(o, o + s), o += s, o < a.length && (c += "="), n.push(c);
			}
		}
		return n.join("\r\n");
	}
	function He(e) {
		for (var t = [], n = 0; n < e.length; ++n) {
			for (var r = e[n]; n <= e.length && r.charAt(r.length - 1) == "=";) r = r.slice(0, r.length - 1) + e[++n];
			t.push(r);
		}
		for (var i = 0; i < t.length; ++i) t[i] = t[i].replace(/[=][0-9A-Fa-f]{2}/g, function(e) {
			return String.fromCharCode(parseInt(e.slice(1), 16));
		});
		return R(t.join("\r\n"));
	}
	function Ue(e, t, n) {
		for (var r = "", i = "", a = "", o, s = 0; s < 10; ++s) {
			var c = t[s];
			if (!c || c.match(/^\s*$/)) break;
			var l = c.match(/^([^:]*?):\s*([^\s].*)$/);
			if (l) switch (l[1].toLowerCase()) {
				case "content-location":
					r = l[2].trim();
					break;
				case "content-type":
					a = l[2].trim();
					break;
				case "content-transfer-encoding":
					i = l[2].trim();
					break;
			}
		}
		switch (++s, i.toLowerCase()) {
			case "base64":
				o = R(M(t.slice(s).join("")));
				break;
			case "quoted-printable":
				o = He(t.slice(s));
				break;
			default: throw Error("Unsupported Content-Transfer-Encoding " + i);
		}
		var u = qe(e, r.slice(n.length), o, { unsafe: !0 });
		a && (u.ctype = a);
	}
	function We(e, t) {
		if (H(e.slice(0, 13)).toLowerCase() != "mime-version:") throw Error("Unsupported MAD header");
		var n = t && t.root || "", r = (N && Buffer.isBuffer(e) ? e.toString("binary") : H(e)).split("\r\n"), i = 0, a = "";
		for (i = 0; i < r.length; ++i) if (a = r[i], /^Content-Location:/i.test(a) && (a = a.slice(a.indexOf("file")), n || (n = a.slice(0, a.lastIndexOf("/") + 1)), a.slice(0, n.length) != n)) for (; n.length > 0 && (n = n.slice(0, n.length - 1), n = n.slice(0, n.lastIndexOf("/") + 1), a.slice(0, n.length) != n););
		var o = (r[1] || "").match(/boundary="(.*?)"/);
		if (!o) throw Error("MAD cannot find boundary");
		var s = "--" + (o[1] || ""), c = {
			FileIndex: [],
			FullPaths: []
		};
		S(c);
		var l, u = 0;
		for (i = 0; i < r.length; ++i) {
			var d = r[i];
			d !== s && d !== s + "--" || (u++ && Ue(c, r.slice(l, i), n), l = i);
		}
		return c;
	}
	function Ge(e, t) {
		var n = t || {}, r = n.boundary || "SheetJS";
		r = "------=" + r;
		for (var i = [
			"MIME-Version: 1.0",
			"Content-Type: multipart/related; boundary=\"" + r.slice(2) + "\"",
			"",
			"",
			""
		], a = e.FullPaths[0], o = a, s = e.FileIndex[0], c = 1; c < e.FullPaths.length; ++c) if (o = e.FullPaths[c].slice(a.length), s = e.FileIndex[c], !(!s.size || !s.content || o == "Sh33tJ5")) {
			o = o.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7E-\xFF]/g, function(e) {
				return "_x" + e.charCodeAt(0).toString(16) + "_";
			}).replace(/[\u0080-\uFFFF]/g, function(e) {
				return "_u" + e.charCodeAt(0).toString(16) + "_";
			});
			for (var l = s.content, u = N && Buffer.isBuffer(l) ? l.toString("binary") : H(l), d = 0, f = Math.min(1024, u.length), p = 0, m = 0; m <= f; ++m) (p = u.charCodeAt(m)) >= 32 && p < 128 && ++d;
			var h = d >= f * 4 / 5;
			i.push(r), i.push("Content-Location: " + (n.root || "file:///C:/SheetJS/") + o), i.push("Content-Transfer-Encoding: " + (h ? "quoted-printable" : "base64")), i.push("Content-Type: " + ze(s, o)), i.push(""), i.push(h ? Ve(u) : Be(u));
		}
		return i.push(r + "--\r\n"), i.join("\r\n");
	}
	function Ke(e) {
		var t = {};
		return S(t, e), t;
	}
	function qe(e, t, n, i) {
		var a = i && i.unsafe;
		a || S(e);
		var o = !a && ot.find(e, t);
		if (!o) {
			var s = e.FullPaths[0];
			t.slice(0, s.length) == s ? s = t : (s.slice(-1) != "/" && (s += "/"), s = (s + t).replace("//", "/")), o = {
				name: r(t),
				type: 2
			}, e.FileIndex.push(o), e.FullPaths.push(s), a || ot.utils.cfb_gc(e);
		}
		return o.content = n, o.size = n ? n.length : 0, i && (i.CLSID && (o.clsid = i.CLSID), i.mt && (o.mt = i.mt), i.ct && (o.ct = i.ct)), o;
	}
	function Je(e, t) {
		S(e);
		var n = ot.find(e, t);
		if (n) {
			for (var r = 0; r < e.FileIndex.length; ++r) if (e.FileIndex[r] == n) return e.FileIndex.splice(r, 1), e.FullPaths.splice(r, 1), !0;
		}
		return !1;
	}
	function Ye(e, t, n) {
		S(e);
		var i = ot.find(e, t);
		if (i) {
			for (var a = 0; a < e.FileIndex.length; ++a) if (e.FileIndex[a] == i) return e.FileIndex[a].name = r(n), e.FullPaths[a] = n, !0;
		}
		return !1;
	}
	function Xe(e) {
		w(e, !0);
	}
	return e.find = E, e.read = x, e.parse = l, e.write = ee, e.writeFile = B, e.utils = {
		cfb_new: Ke,
		cfb_add: qe,
		cfb_del: Je,
		cfb_mov: Ye,
		cfb_gc: Xe,
		ReadShift: mr,
		CheckField: yr,
		prep_blob: br,
		bconcat: V,
		use_zlib: ne,
		_deflateRaw: Y,
		_inflateRaw: Ne,
		consts: z
	}, e;
})(), st;
function ct(e) {
	if (st !== void 0) return st.readFileSync(e);
	if (typeof Deno < "u") return Deno.readFileSync(e);
	if (typeof $ < "u" && typeof File < "u" && typeof Folder < "u") try {
		var t = File(e);
		t.open("r"), t.encoding = "binary";
		var n = t.read();
		return t.close(), n;
	} catch (e) {
		if (!e.message || e.message.indexOf("onstruct") == -1) throw e;
	}
	throw Error("Cannot access file " + e);
}
function lt(e) {
	for (var t = Object.keys(e), n = [], r = 0; r < t.length; ++r) Object.prototype.hasOwnProperty.call(e, t[r]) && n.push(t[r]);
	return n;
}
function ut(e) {
	for (var t = [], n = lt(e), r = 0; r !== n.length; ++r) t[e[n[r]]] = n[r];
	return t;
}
var dt = /*#__PURE__*/ Date.UTC(1899, 11, 30, 0, 0, 0), ft = /*#__PURE__*/ Date.UTC(1899, 11, 31, 0, 0, 0), pt = /*#__PURE__*/ Date.UTC(1904, 0, 1, 0, 0, 0);
function mt(e, t) {
	var n = (/* @__PURE__ */ e.getTime() - dt) / (1440 * 60 * 1e3);
	return t ? (n -= 1462, n < -1402 ? n - 1 : n) : n < 60 ? n - 1 : n;
}
function ht(e) {
	if (e >= 60 && e < 61) return e;
	var t = /* @__PURE__ */ new Date();
	return t.setTime((e > 60 ? e : e + 1) * 24 * 60 * 60 * 1e3 + dt), t;
}
function gt(e) {
	var t = 0, n = 0, r = !1, i = e.match(/P([0-9\.]+Y)?([0-9\.]+M)?([0-9\.]+D)?T([0-9\.]+H)?([0-9\.]+M)?([0-9\.]+S)?/);
	if (!i) throw Error("|" + e + "| is not an ISO8601 Duration");
	for (var a = 1; a != i.length; ++a) if (i[a]) {
		switch (n = 1, a > 3 && (r = !0), i[a].slice(i[a].length - 1)) {
			case "Y": throw Error("Unsupported ISO Duration Field: " + i[a].slice(i[a].length - 1));
			case "D": n *= 24;
			case "H": n *= 60;
			case "M": if (r) n *= 60;
			else throw Error("Unsupported ISO Duration Field: M");
			case "S": break;
		}
		t += n * parseInt(i[a], 10);
	}
	return t;
}
var _t = /^(\d+):(\d+)(:\d+)?(\.\d+)?$/, vt = /^(\d+)-(\d+)-(\d+)$/, yt = /^(\d+)-(\d+)-(\d+)[T ](\d+):(\d+)(:\d+)?(\.\d+)?$/;
function bt(e, t) {
	if (e instanceof Date) return e;
	var n = e.match(_t);
	return n ? new Date((t ? pt : ft) + ((parseInt(n[1], 10) * 60 + parseInt(n[2], 10)) * 60 + (n[3] ? parseInt(n[3].slice(1), 10) : 0)) * 1e3 + (n[4] ? parseInt((n[4] + "000").slice(1, 4), 10) : 0)) : (n = e.match(vt), n ? new Date(Date.UTC(+n[1], n[2] - 1, +n[3], 0, 0, 0, 0)) : (n = e.match(yt), n ? new Date(Date.UTC(+n[1], n[2] - 1, +n[3], +n[4], +n[5], n[6] && parseInt(n[6].slice(1), 10) || 0, n[7] && parseInt((n[7] + "0000").slice(1, 4), 10) || 0)) : new Date(e)));
}
function xt(e, t) {
	if (N && Buffer.isBuffer(e)) {
		if (t && F) {
			if (e[0] == 255 && e[1] == 254) return En(e.slice(2).toString("utf16le"));
			if (e[1] == 254 && e[2] == 255) return En(C(e.slice(2).toString("binary")));
		}
		return e.toString("binary");
	}
	if (typeof TextDecoder < "u") try {
		if (t) {
			if (e[0] == 255 && e[1] == 254) return En(new TextDecoder("utf-16le").decode(e.slice(2)));
			if (e[0] == 254 && e[1] == 255) return En(new TextDecoder("utf-16be").decode(e.slice(2)));
		}
		var n = {
			"€": "",
			"‚": "",
			ƒ: "",
			"„": "",
			"…": "",
			"†": "",
			"‡": "",
			ˆ: "",
			"‰": "",
			Š: "",
			"‹": "",
			Œ: "",
			Ž: "",
			"‘": "",
			"’": "",
			"“": "",
			"”": "",
			"•": "",
			"–": "",
			"—": "",
			"˜": "",
			"™": "",
			š: "",
			"›": "",
			œ: "",
			ž: "",
			Ÿ: ""
		};
		return Array.isArray(e) && (e = new Uint8Array(e)), new TextDecoder("latin1").decode(e).replace(/[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g, function(e) {
			return n[e] || e;
		});
	} catch {}
	var r = [], i = 0;
	try {
		for (i = 0; i < e.length - 65536; i += 65536) r.push(String.fromCharCode.apply(0, e.slice(i, i + 65536)));
		r.push(String.fromCharCode.apply(0, e.slice(i)));
	} catch {
		try {
			for (; i < e.length - 16384; i += 16384) r.push(String.fromCharCode.apply(0, e.slice(i, i + 16384)));
			r.push(String.fromCharCode.apply(0, e.slice(i)));
		} catch {
			for (; i != e.length; ++i) r.push(String.fromCharCode(e[i]));
		}
	}
	return r.join("");
}
function St(e) {
	if (typeof JSON < "u" && !Array.isArray(e)) return JSON.parse(JSON.stringify(e));
	if (typeof e != "object" || !e) return e;
	if (e instanceof Date) return new Date(e.getTime());
	var t = {};
	for (var n in e) Object.prototype.hasOwnProperty.call(e, n) && (t[n] = St(e[n]));
	return t;
}
function Ct(e, t) {
	for (var n = ""; n.length < t;) n += e;
	return n;
}
function wt(e) {
	var t = Number(e);
	if (!isNaN(t)) return isFinite(t) ? t : NaN;
	if (!/\d/.test(e)) return t;
	var n = 1, r = e.replace(/([\d]),([\d])/g, "$1$2").replace(/[$]/g, "").replace(/[%]/g, function() {
		return n *= 100, "";
	});
	return !isNaN(t = Number(r)) || (r = r.replace(/[(]([^()]*)[)]/, function(e, t) {
		return n = -n, t;
	}), !isNaN(t = Number(r))) ? t / n : t;
}
var Tt = /^(0?\d|1[0-2])(?:|:([0-5]?\d)(?:|(\.\d+)(?:|:([0-5]?\d))|:([0-5]?\d)(|\.\d+)))\s+([ap])m?$/, Et = /^([01]?\d|2[0-3])(?:|:([0-5]?\d)(?:|(\.\d+)(?:|:([0-5]?\d))|:([0-5]?\d)(|\.\d+)))$/, Dt = /^(\d+)-(\d+)-(\d+)[T ](\d+):(\d+)(:\d+)(\.\d+)?[Z]?$/, Ot = (/* @__PURE__ */ new Date("6/9/69 00:00 UTC")).valueOf() == -177984e5;
function kt(e) {
	return e[2] ? e[3] ? e[4] ? new Date(Date.UTC(1899, 11, 31, e[1] % 12 + (e[7] == "p" ? 12 : 0), +e[2], +e[4], parseFloat(e[3]) * 1e3)) : new Date(Date.UTC(1899, 11, 31, e[7] == "p" ? 12 : 0, +e[1], +e[2], parseFloat(e[3]) * 1e3)) : e[5] ? new Date(Date.UTC(1899, 11, 31, e[1] % 12 + (e[7] == "p" ? 12 : 0), +e[2], +e[5], e[6] ? parseFloat(e[6]) * 1e3 : 0)) : new Date(Date.UTC(1899, 11, 31, e[1] % 12 + (e[7] == "p" ? 12 : 0), +e[2], 0, 0)) : new Date(Date.UTC(1899, 11, 31, e[1] % 12 + (e[7] == "p" ? 12 : 0), 0, 0, 0));
}
function At(e) {
	return e[2] ? e[3] ? e[4] ? new Date(Date.UTC(1899, 11, 31, +e[1], +e[2], +e[4], parseFloat(e[3]) * 1e3)) : new Date(Date.UTC(1899, 11, 31, 0, +e[1], +e[2], parseFloat(e[3]) * 1e3)) : e[5] ? new Date(Date.UTC(1899, 11, 31, +e[1], +e[2], +e[5], e[6] ? parseFloat(e[6]) * 1e3 : 0)) : new Date(Date.UTC(1899, 11, 31, +e[1], +e[2], 0, 0)) : new Date(Date.UTC(1899, 11, 31, +e[1], 0, 0, 0));
}
var jt = [
	"january",
	"february",
	"march",
	"april",
	"may",
	"june",
	"july",
	"august",
	"september",
	"october",
	"november",
	"december"
];
function Mt(e) {
	if (Dt.test(e)) return e.indexOf("Z") == -1 ? Ft(new Date(e)) : new Date(e);
	var t = e.toLowerCase(), n = t.replace(/\s+/g, " ").trim(), r = n.match(Tt);
	if (r) return kt(r);
	if (r = n.match(Et), r) return At(r);
	if (r = n.match(yt), r) return new Date(Date.UTC(+r[1], r[2] - 1, +r[3], +r[4], +r[5], r[6] && parseInt(r[6].slice(1), 10) || 0, r[7] && parseInt((r[7] + "0000").slice(1, 4), 10) || 0));
	var i = new Date(Ot && e.indexOf("UTC") == -1 ? e + " UTC" : e), a = /* @__PURE__ */ new Date(NaN), o = i.getYear();
	i.getMonth();
	var s = i.getDate();
	if (isNaN(s)) return a;
	if (t.match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/)) {
		if (t = t.replace(/[^a-z]/g, "").replace(/([^a-z]|^)[ap]m?([^a-z]|$)/, ""), t.length > 3 && jt.indexOf(t) == -1) return a;
	} else if (t.replace(/[ap]m?/, "").match(/[a-z]/)) return a;
	return o < 0 || o > 8099 || e.match(/[^-0-9:,\/\\\ ]/) ? a : i;
}
var Nt = /*#__PURE__*/ (function() {
	var e = "abacaba".split(/(:?b)/i).length == 5;
	return function(t, n, r) {
		if (e || typeof n == "string") return t.split(n);
		for (var i = t.split(n), a = [i[0]], o = 1; o < i.length; ++o) a.push(r), a.push(i[o]);
		return a;
	};
})();
function Pt(e) {
	return new Date(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), e.getUTCHours(), e.getUTCMinutes(), e.getUTCSeconds(), e.getUTCMilliseconds());
}
function Ft(e) {
	return new Date(Date.UTC(e.getFullYear(), e.getMonth(), e.getDate(), e.getHours(), e.getMinutes(), e.getSeconds(), e.getMilliseconds()));
}
function It(e) {
	var t = e.slice(0, 1024).indexOf("<!DOCTYPE");
	if (t == -1) return e;
	var n = e.match(/<[\w]/);
	return n ? e.slice(0, t) + e.slice(n.index) : e;
}
function Lt(e, t, n) {
	for (var r = [], i = e.indexOf(t); i > -1;) {
		var a = e.indexOf(n, i + t.length);
		if (a == -1) break;
		r.push(e.slice(i, a + n.length)), i = e.indexOf(t, a + n.length);
	}
	return r.length > 0 ? r : null;
}
function Rt(e, t, n) {
	var r = [], i = 0, a = e.indexOf(t);
	if (a == -1) return e;
	for (; a > -1;) {
		r.push(e.slice(i, a));
		var o = e.indexOf(n, a + t.length);
		if (o == -1) break;
		(a = e.indexOf(t, i = o + n.length)) == -1 && r.push(e.slice(i));
	}
	return r.join("");
}
var zt = {
	" ": 1,
	"	": 1,
	"\r": 1,
	"\n": 1,
	">": 1
};
function Bt(e, t) {
	for (var n = e.indexOf("<" + t), r = t.length + 1, i = e.length; n >= 0 && n <= i - r && !zt[e.charAt(n + r)];) n = e.indexOf("<" + t, n + 1);
	if (n === -1) return null;
	var a = e.indexOf(">", n + t.length);
	if (a === -1) return null;
	var o = "</" + t + ">", s = e.indexOf(o, a);
	return s == -1 ? null : [e.slice(n, s + o.length), e.slice(a + 1, s)];
}
var Vt = /*#__PURE__*/ (function() {
	var e = {};
	return function(t, n) {
		var r = e[n];
		r || (e[n] = r = [RegExp("<(?:\\w+:)?" + n + "\\b[^<>]*>", "g"), RegExp("</(?:\\w+:)?" + n + ">", "g")]), r[0].lastIndex = r[1].lastIndex = 0;
		var i = r[0].exec(t);
		if (!i) return null;
		var a = i.index, o = r[0].lastIndex;
		if (r[1].lastIndex = r[0].lastIndex, i = r[1].exec(t), !i) return null;
		var s = i.index, c = r[1].lastIndex;
		return [t.slice(a, c), t.slice(o, s)];
	};
})(), Ht = /*#__PURE__*/ (function() {
	var e = {};
	return function(t, n) {
		var r = [], i = e[n];
		i || (e[n] = i = [RegExp("<(?:\\w+:)?" + n + "\\b[^<>]*>", "g"), RegExp("</(?:\\w+:)?" + n + ">", "g")]), i[0].lastIndex = i[1].lastIndex = 0;
		for (var a; a = i[0].exec(t);) {
			var o = a.index;
			if (i[1].lastIndex = i[0].lastIndex, a = i[1].exec(t), !a) return null;
			var s = i[1].lastIndex;
			r.push(t.slice(o, s)), i[0].lastIndex = i[1].lastIndex;
		}
		return r.length == 0 ? null : r;
	};
})(), Ut = /*#__PURE__*/ (function() {
	var e = {};
	return function(t, n) {
		var r = [], i = e[n];
		i || (e[n] = i = [RegExp("<(?:\\w+:)?" + n + "\\b[^<>]*>", "g"), RegExp("</(?:\\w+:)?" + n + ">", "g")]), i[0].lastIndex = i[1].lastIndex = 0;
		for (var a, o = 0, s = 0; a = i[0].exec(t);) {
			if (o = a.index, r.push(t.slice(s, o)), s = o, i[1].lastIndex = i[0].lastIndex, a = i[1].exec(t), !a) return null;
			s = i[1].lastIndex, i[0].lastIndex = i[1].lastIndex;
		}
		return r.push(t.slice(s)), r.length == 0 ? "" : r.join("");
	};
})(), Wt = /*#__PURE__*/ (function() {
	var e = {};
	return function(t, n) {
		var r = [], i = e[n];
		i || (e[n] = i = [RegExp("<" + n + "\\b[^<>]*>", "ig"), RegExp("</" + n + ">", "ig")]), i[0].lastIndex = i[1].lastIndex = 0;
		for (var a; a = i[0].exec(t);) {
			var o = a.index;
			if (i[1].lastIndex = i[0].lastIndex, a = i[1].exec(t), !a) return null;
			var s = i[1].lastIndex;
			r.push(t.slice(o, s)), i[0].lastIndex = i[1].lastIndex;
		}
		return r.length == 0 ? null : r;
	};
})();
function Gt(e) {
	return e ? e.content && e.type ? xt(e.content, !0) : e.data ? w(e.data) : e.asNodeBuffer && N ? w(e.asNodeBuffer().toString("binary")) : e.asBinary ? w(e.asBinary()) : e._data && e._data.getContent ? w(xt(Array.prototype.slice.call(e._data.getContent(), 0))) : null : null;
}
function Kt(e) {
	if (!e) return null;
	if (e.data) return b(e.data);
	if (e.asNodeBuffer && N) return e.asNodeBuffer();
	if (e._data && e._data.getContent) {
		var t = e._data.getContent();
		return typeof t == "string" ? b(t) : Array.prototype.slice.call(t);
	}
	return e.content && e.type ? e.content : null;
}
function qt(e) {
	return e && e.name.slice(-4) === ".bin" ? Kt(e) : Gt(e);
}
function Jt(e, t) {
	for (var n = e.FullPaths || lt(e.files), r = t.toLowerCase().replace(/[\/]/g, "\\"), i = r.replace(/\\/g, "/"), a = 0; a < n.length; ++a) {
		var o = n[a].replace(/^Root Entry[\/]/, "").toLowerCase();
		if (r == o || i == o) return e.files ? e.files[n[a]] : e.FileIndex[a];
	}
	return null;
}
function Yt(e, t) {
	var n = Jt(e, t);
	if (n == null) throw Error("Cannot find file " + t + " in zip");
	return n;
}
function Xt(e, t, n) {
	if (!n) return qt(Yt(e, t));
	if (!t) return null;
	try {
		return Xt(e, t);
	} catch {
		return null;
	}
}
function Zt(e, t, n) {
	if (!n) return Gt(Yt(e, t));
	if (!t) return null;
	try {
		return Zt(e, t);
	} catch {
		return null;
	}
}
function Qt(e, t, n) {
	if (!n) return Kt(Yt(e, t));
	if (!t) return null;
	try {
		return Qt(e, t);
	} catch {
		return null;
	}
}
function $t(e) {
	for (var t = e.FullPaths || lt(e.files), n = [], r = 0; r < t.length; ++r) t[r].slice(-1) != "/" && n.push(t[r].replace(/^Root Entry[\/]/, ""));
	return n.sort();
}
function en(e, t, n) {
	if (e.FullPaths) {
		if (Array.isArray(n) && typeof n[0] == "string" && (n = n.join("")), typeof n == "string") {
			var r = N ? P(n) : H(n);
			return ot.utils.cfb_add(e, t, r);
		}
		ot.utils.cfb_add(e, t, n);
	} else e.file(t, n);
}
function tn(e, t) {
	switch (t.type) {
		case "base64": return ot.read(e, { type: "base64" });
		case "binary": return ot.read(e, { type: "binary" });
		case "buffer":
		case "array": return ot.read(e, { type: "buffer" });
	}
	throw Error("Unrecognized type " + t.type);
}
function nn(e, t) {
	if (e.charAt(0) == "/") return e.slice(1);
	var n = t.split("/");
	t.slice(-1) != "/" && n.pop();
	for (var r = e.split("/"); r.length !== 0;) {
		var i = r.shift();
		i === ".." ? n.pop() : i !== "." && n.push(i);
	}
	return n.join("/");
}
var rn = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\r\n", an = /\s([^"\s?>\/]+)\s*=\s*((?:")([^"]*)(?:")|(?:')([^']*)(?:')|([^'">\s]+))/g, on = /<[\/\?]?[a-zA-Z0-9:_-]+(?:\s+[^"\s?<>\/]+\s*=\s*(?:"[^"]*"|'[^']*'|[^'"<>\s=]+))*\s*[\/\?]?>/gm, sn = /*#__PURE__*/ rn.match(on) ? on : /<[^<>]*>/g, cn = /<\w*:/, ln = /<(\/?)\w+:/;
function X(e, t, n) {
	for (var r = {}, i = 0, a = 0; i !== e.length && !((a = e.charCodeAt(i)) === 32 || a === 10 || a === 13); ++i);
	if (t || (r[0] = e.slice(0, i)), i === e.length) return r;
	var o = e.match(an), s = 0, c = "", l = 0, u = "", d = "", f = 1;
	if (o) for (l = 0; l != o.length; ++l) {
		for (d = o[l].slice(1), a = 0; a != d.length && d.charCodeAt(a) !== 61; ++a);
		for (u = d.slice(0, a).trim(); d.charCodeAt(a + 1) == 32;) ++a;
		for (f = +((i = d.charCodeAt(a + 1)) == 34 || i == 39), c = d.slice(a + 1 + f, d.length - f), s = 0; s != u.length && u.charCodeAt(s) !== 58; ++s);
		if (s === u.length) u.indexOf("_") > 0 && (u = u.slice(0, u.indexOf("_"))), r[u] = c, n || (r[u.toLowerCase()] = c);
		else {
			var p = (s === 5 && u.slice(0, 5) === "xmlns" ? "xmlns" : "") + u.slice(s + 1);
			if (r[p] && u.slice(s - 3, s) == "ext") continue;
			r[p] = c, n || (r[p.toLowerCase()] = c);
		}
	}
	return r;
}
function un(e, t, n) {
	for (var r = {}, i = 0, a = 0; i !== e.length && !((a = e.charCodeAt(i)) === 32 || a === 10 || a === 13); ++i);
	if (t || (r[0] = e.slice(0, i)), i === e.length) return r;
	var o = e.match(an), s = "", c = 0, l = "", u = "", d = 1;
	if (o) for (c = 0; c != o.length; ++c) {
		for (u = o[c].slice(1), a = 0; a != u.length && u.charCodeAt(a) !== 61; ++a);
		for (l = u.slice(0, a).trim(); u.charCodeAt(a + 1) == 32;) ++a;
		d = +((i = u.charCodeAt(a + 1)) == 34 || i == 39), s = u.slice(a + 1 + d, u.length - d), l.indexOf("_") > 0 && (l = l.slice(0, l.indexOf("_"))), r[l] = s, n || (r[l.toLowerCase()] = s);
	}
	return r;
}
function dn(e) {
	return e.replace(ln, "<$1");
}
var fn = {
	"&quot;": "\"",
	"&apos;": "'",
	"&gt;": ">",
	"&lt;": "<",
	"&amp;": "&"
}, pn = /*#__PURE__*/ ut(fn), mn = /*#__PURE__*/ (function() {
	var e = /&(?:quot|apos|gt|lt|amp|#x?([\da-fA-F]+));/gi, t = /_x([\da-fA-F]{4})_/g;
	function n(r) {
		var i = r + "", a = i.indexOf("<![CDATA[");
		if (a == -1) return i.replace(e, function(e, t) {
			return fn[e] || String.fromCharCode(parseInt(t, e.indexOf("x") > -1 ? 16 : 10)) || e;
		}).replace(t, function(e, t) {
			return String.fromCharCode(parseInt(t, 16));
		});
		var o = i.indexOf("]]>");
		return n(i.slice(0, a)) + i.slice(a + 9, o) + n(i.slice(o + 3));
	}
	return function(e, t) {
		var r = n(e);
		return t ? r.replace(/\r\n/g, "\n") : r;
	};
})(), hn = /[&<>'"]/g, gn = /[\u0000-\u0008\u000b-\u001f\uFFFE-\uFFFF]/g;
function _n(e) {
	return (e + "").replace(hn, function(e) {
		return pn[e];
	}).replace(gn, function(e) {
		return "_x" + ("000" + e.charCodeAt(0).toString(16)).slice(-4) + "_";
	});
}
var vn = /[\u0000-\u001f]/g;
function yn(e) {
	return (e + "").replace(hn, function(e) {
		return pn[e];
	}).replace(/\n/g, "<br/>").replace(vn, function(e) {
		return "&#x" + ("000" + e.charCodeAt(0).toString(16)).slice(-4) + ";";
	});
}
var bn = /*#__PURE__*/ (function() {
	var e = /&#(\d+);/g;
	function t(e, t) {
		return String.fromCharCode(parseInt(t, 10));
	}
	return function(n) {
		return n.replace(e, t);
	};
})();
function Z(e) {
	switch (e) {
		case 1:
		case !0:
		case "1":
		case "true": return !0;
		case 0:
		case !1:
		case "0":
		case "false": return !1;
	}
	return !1;
}
function xn(e) {
	for (var t = "", n = 0, r = 0, i = 0, a = 0, o = 0, s = 0; n < e.length;) {
		if (r = e.charCodeAt(n++), r < 128) {
			t += String.fromCharCode(r);
			continue;
		}
		if (i = e.charCodeAt(n++), r > 191 && r < 224) {
			o = (r & 31) << 6, o |= i & 63, t += String.fromCharCode(o);
			continue;
		}
		if (a = e.charCodeAt(n++), r < 240) {
			t += String.fromCharCode((r & 15) << 12 | (i & 63) << 6 | a & 63);
			continue;
		}
		o = e.charCodeAt(n++), s = ((r & 7) << 18 | (i & 63) << 12 | (a & 63) << 6 | o & 63) - 65536, t += String.fromCharCode(55296 + (s >>> 10 & 1023)), t += String.fromCharCode(56320 + (s & 1023));
	}
	return t;
}
function Sn(e) {
	var t = I(2 * e.length), n, r, i = 1, a = 0, o = 0, s;
	for (r = 0; r < e.length; r += i) i = 1, (s = e.charCodeAt(r)) < 128 ? n = s : s < 224 ? (n = (s & 31) * 64 + (e.charCodeAt(r + 1) & 63), i = 2) : s < 240 ? (n = (s & 15) * 4096 + (e.charCodeAt(r + 1) & 63) * 64 + (e.charCodeAt(r + 2) & 63), i = 3) : (i = 4, n = (s & 7) * 262144 + (e.charCodeAt(r + 1) & 63) * 4096 + (e.charCodeAt(r + 2) & 63) * 64 + (e.charCodeAt(r + 3) & 63), n -= 65536, o = 55296 + (n >>> 10 & 1023), n = 56320 + (n & 1023)), o !== 0 && (t[a++] = o & 255, t[a++] = o >>> 8, o = 0), t[a++] = n % 256, t[a++] = n >>> 8;
	return t.slice(0, a).toString("ucs2");
}
function Cn(e) {
	return P(e, "binary").toString("utf8");
}
var wn = "foo bar bazâð£", Tn = /*#__PURE__*/ (function() {
	if (N) {
		if (Cn(wn) == xn(wn)) return Cn;
		if (Sn(wn) == xn(wn)) return Sn;
	}
	return xn;
})(), En = N ? function(e) {
	return P(e, "utf8").toString("binary");
} : function(e) {
	for (var t = [], n = 0, r = 0, i = 0; n < e.length;) switch (r = e.charCodeAt(n++), !0) {
		case r < 128:
			t.push(String.fromCharCode(r));
			break;
		case r < 2048:
			t.push(String.fromCharCode(192 + (r >> 6))), t.push(String.fromCharCode(128 + (r & 63)));
			break;
		case r >= 55296 && r < 57344:
			r -= 55296, i = e.charCodeAt(n++) - 56320 + (r << 10), t.push(String.fromCharCode(240 + (i >> 18 & 7))), t.push(String.fromCharCode(144 + (i >> 12 & 63))), t.push(String.fromCharCode(128 + (i >> 6 & 63))), t.push(String.fromCharCode(128 + (i & 63)));
			break;
		default: t.push(String.fromCharCode(224 + (r >> 12))), t.push(String.fromCharCode(128 + (r >> 6 & 63))), t.push(String.fromCharCode(128 + (r & 63)));
	}
	return t.join("");
}, Dn = /*#__PURE__*/ (function() {
	var e = [
		["nbsp", " "],
		["middot", "·"],
		["quot", "\""],
		["apos", "'"],
		["gt", ">"],
		["lt", "<"],
		["amp", "&"]
	].map(function(e) {
		return [RegExp("&" + e[0] + ";", "ig"), e[1]];
	});
	return function(t) {
		for (var n = t.replace(/^[\t\n\r ]+/, "").replace(/(^|[^\t\n\r ])[\t\n\r ]+$/, "$1").replace(/>\s+/g, ">").replace(/\b\s+</g, "<").replace(/[\t\n\r ]+/g, " ").replace(/<\s*[bB][rR]\s*\/?>/g, "\n").replace(/<[^<>]*>/g, ""), r = 0; r < e.length; ++r) n = n.replace(e[r][0], e[r][1]);
		return n;
	};
})(), On = /<\/?(?:vt:)?variant>/g, kn = /<(?:vt:)([^<"'>]*)>([\s\S]*)</;
function An(e, t) {
	var n = X(e), r = Ht(e, n.baseType) || [], i = [];
	if (r.length != n.size) {
		if (t.WTF) throw Error("unexpected vector length " + r.length + " != " + n.size);
		return i;
	}
	return r.forEach(function(e) {
		var t = e.replace(On, "").match(kn);
		t && i.push({
			v: Tn(t[2]),
			t: t[1]
		});
	}), i;
}
var jn = /(^\s|\s$|\n)/;
function Mn(e) {
	return lt(e).map(function(t) {
		return " " + t + "=\"" + e[t] + "\"";
	}).join("");
}
function Nn(e, t, n) {
	return "<" + e + (n == null ? "" : Mn(n)) + (t == null ? "/" : (t.match(jn) ? " xml:space=\"preserve\"" : "") + ">" + t + "</" + e) + ">";
}
function Pn(e) {
	if (N && Buffer.isBuffer(e)) return e.toString("utf8");
	if (typeof e == "string") return e;
	if (typeof Uint8Array < "u" && e instanceof Uint8Array) return Tn(z(B(e)));
	throw Error("Bad input format: expected Buffer or string");
}
var Fn = /<([\/]?)([^\s?><!\/:"]*:|)([^\s?<>:\/"]+)(?:\s+[^<>=?"'\s]+="[^"]*?")*\s*[\/]?>/gm, In = {
	CORE_PROPS: "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
	CUST_PROPS: "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties",
	EXT_PROPS: "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties",
	CT: "http://schemas.openxmlformats.org/package/2006/content-types",
	RELS: "http://schemas.openxmlformats.org/package/2006/relationships",
	TCMNT: "http://schemas.microsoft.com/office/spreadsheetml/2018/threadedcomments",
	dc: "http://purl.org/dc/elements/1.1/",
	dcterms: "http://purl.org/dc/terms/",
	dcmitype: "http://purl.org/dc/dcmitype/",
	mx: "http://schemas.microsoft.com/office/mac/excel/2008/main",
	r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
	sjs: "http://schemas.openxmlformats.org/package/2006/sheetjs/core-properties",
	vt: "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes",
	xsi: "http://www.w3.org/2001/XMLSchema-instance",
	xsd: "http://www.w3.org/2001/XMLSchema"
}, Ln = [
	"http://schemas.openxmlformats.org/spreadsheetml/2006/main",
	"http://purl.oclc.org/ooxml/spreadsheetml/main",
	"http://schemas.microsoft.com/office/excel/2006/main",
	"http://schemas.microsoft.com/office/excel/2006/2"
];
function Rn(e, t) {
	for (var n = 1 - 2 * (e[t + 7] >>> 7), r = ((e[t + 7] & 127) << 4) + (e[t + 6] >>> 4 & 15), i = e[t + 6] & 15, a = 5; a >= 0; --a) i = i * 256 + e[t + a];
	return r == 2047 ? i == 0 ? n * Infinity : NaN : (r == 0 ? r = -1022 : (r -= 1023, i += 2 ** 52), n * 2 ** (r - 52) * i);
}
function zn(e, t, n) {
	var r = (t < 0 || 1 / t == -Infinity) << 7, i = 0, a = 0, o = r ? -t : t;
	isFinite(o) ? o == 0 ? i = a = 0 : (i = Math.floor(Math.log(o) / Math.LN2), a = o * 2 ** (52 - i), i <= -1023 && (!isFinite(a) || a < 2 ** 52) ? i = -1022 : (a -= 2 ** 52, i += 1023)) : (i = 2047, a = isNaN(t) ? 26985 : 0);
	for (var s = 0; s <= 5; ++s, a /= 256) e[n + s] = a & 255;
	e[n + 6] = (i & 15) << 4 | a & 15, e[n + 7] = i >> 4 | r;
}
var Bn = function(e) {
	for (var t = [], n = 10240, r = 0; r < e[0].length; ++r) if (e[0][r]) for (var i = 0, a = e[0][r].length; i < a; i += n) t.push.apply(t, e[0][r].slice(i, i + n));
	return t;
}, Vn = N ? function(e) {
	return e[0].length > 0 && Buffer.isBuffer(e[0][0]) ? Buffer.concat(e[0].map(function(e) {
		return Buffer.isBuffer(e) ? e : P(e);
	})) : Bn(e);
} : Bn, Hn = function(e, t, n) {
	for (var r = [], i = t; i < n; i += 2) r.push(String.fromCharCode(lr(e, i)));
	return r.join("").replace(U, "");
}, Un = N ? function(e, t, n) {
	return !Buffer.isBuffer(e) || !F ? Hn(e, t, n) : e.toString("utf16le", t, n).replace(U, "");
} : Hn, Wn = function(e, t, n) {
	for (var r = [], i = t; i < t + n; ++i) r.push(("0" + e[i].toString(16)).slice(-2));
	return r.join("");
}, Gn = N ? function(e, t, n) {
	return Buffer.isBuffer(e) ? e.toString("hex", t, t + n) : Wn(e, t, n);
} : Wn, Kn = function(e, t, n) {
	for (var r = [], i = t; i < n; i++) r.push(String.fromCharCode(cr(e, i)));
	return r.join("");
}, qn = N ? function(e, t, n) {
	return Buffer.isBuffer(e) ? e.toString("utf8", t, n) : Kn(e, t, n);
} : Kn, Jn = function(e, t) {
	var n = dr(e, t);
	return n > 0 ? qn(e, t + 4, t + 4 + n - 1) : "";
}, Yn = Jn, Xn = function(e, t) {
	var n = dr(e, t);
	return n > 0 ? qn(e, t + 4, t + 4 + n - 1) : "";
}, Zn = Xn, Qn = function(e, t) {
	var n = 2 * dr(e, t);
	return n > 0 ? qn(e, t + 4, t + 4 + n - 1) : "";
}, $n = Qn, er = function(e, t) {
	var n = dr(e, t);
	return n > 0 ? Un(e, t + 4, t + 4 + n) : "";
}, tr = er, nr = function(e, t) {
	var n = dr(e, t);
	return n > 0 ? qn(e, t + 4, t + 4 + n) : "";
}, rr = nr, ir = function(e, t) {
	return Rn(e, t);
}, ar = ir, or = function(e) {
	return Array.isArray(e) || typeof Uint8Array < "u" && e instanceof Uint8Array;
};
N && (Yn = function(e, t) {
	if (!Buffer.isBuffer(e)) return Jn(e, t);
	var n = e.readUInt32LE(t);
	return n > 0 ? e.toString("utf8", t + 4, t + 4 + n - 1) : "";
}, Zn = function(e, t) {
	if (!Buffer.isBuffer(e)) return Xn(e, t);
	var n = e.readUInt32LE(t);
	return n > 0 ? e.toString("utf8", t + 4, t + 4 + n - 1) : "";
}, $n = function(e, t) {
	if (!Buffer.isBuffer(e) || !F) return Qn(e, t);
	var n = 2 * e.readUInt32LE(t);
	return e.toString("utf16le", t + 4, t + 4 + n - 1);
}, tr = function(e, t) {
	if (!Buffer.isBuffer(e) || !F) return er(e, t);
	var n = e.readUInt32LE(t);
	return e.toString("utf16le", t + 4, t + 4 + n);
}, rr = function(e, t) {
	if (!Buffer.isBuffer(e)) return nr(e, t);
	var n = e.readUInt32LE(t);
	return e.toString("utf8", t + 4, t + 4 + n);
}, ar = function(e, t) {
	return Buffer.isBuffer(e) ? e.readDoubleLE(t) : ir(e, t);
}, or = function(e) {
	return Buffer.isBuffer(e) || Array.isArray(e) || typeof Uint8Array < "u" && e instanceof Uint8Array;
});
function sr() {
	Un = function(e, t, n) {
		return p.utils.decode(1200, e.slice(t, n)).replace(U, "");
	}, qn = function(e, t, n) {
		return p.utils.decode(65001, e.slice(t, n));
	}, Yn = function(e, t) {
		var n = dr(e, t);
		return n > 0 ? p.utils.decode(f, e.slice(t + 4, t + 4 + n - 1)) : "";
	}, Zn = function(e, t) {
		var n = dr(e, t);
		return n > 0 ? p.utils.decode(d, e.slice(t + 4, t + 4 + n - 1)) : "";
	}, $n = function(e, t) {
		var n = 2 * dr(e, t);
		return n > 0 ? p.utils.decode(1200, e.slice(t + 4, t + 4 + n - 1)) : "";
	}, tr = function(e, t) {
		var n = dr(e, t);
		return n > 0 ? p.utils.decode(1200, e.slice(t + 4, t + 4 + n)) : "";
	}, rr = function(e, t) {
		var n = dr(e, t);
		return n > 0 ? p.utils.decode(65001, e.slice(t + 4, t + 4 + n)) : "";
	};
}
p !== void 0 && sr();
var cr = function(e, t) {
	return e[t];
}, lr = function(e, t) {
	return e[t + 1] * 256 + e[t];
}, ur = function(e, t) {
	var n = e[t + 1] * 256 + e[t];
	return n < 32768 ? n : (65535 - n + 1) * -1;
}, dr = function(e, t) {
	return e[t + 3] * (1 << 24) + (e[t + 2] << 16) + (e[t + 1] << 8) + e[t];
}, fr = function(e, t) {
	return e[t + 3] << 24 | e[t + 2] << 16 | e[t + 1] << 8 | e[t];
}, pr = function(e, t) {
	return e[t] << 24 | e[t + 1] << 16 | e[t + 2] << 8 | e[t + 3];
};
function mr(e, t) {
	var n = "", r, i, a = [], o, s, c, l;
	switch (t) {
		case "dbcs":
			if (l = this.l, N && Buffer.isBuffer(this) && F) n = this.slice(this.l, this.l + 2 * e).toString("utf16le");
			else for (c = 0; c < e; ++c) n += String.fromCharCode(lr(this, l)), l += 2;
			e *= 2;
			break;
		case "utf8":
			n = qn(this, this.l, this.l + e);
			break;
		case "utf16le":
			e *= 2, n = Un(this, this.l, this.l + e);
			break;
		case "wstr":
			if (p !== void 0) n = p.utils.decode(d, this.slice(this.l, this.l + 2 * e));
			else return mr.call(this, e, "dbcs");
			e = 2 * e;
			break;
		case "lpstr-ansi":
			n = Yn(this, this.l), e = 4 + dr(this, this.l);
			break;
		case "lpstr-cp":
			n = Zn(this, this.l), e = 4 + dr(this, this.l);
			break;
		case "lpwstr":
			n = $n(this, this.l), e = 4 + 2 * dr(this, this.l);
			break;
		case "lpp4":
			e = 4 + dr(this, this.l), n = tr(this, this.l), e & 2 && (e += 2);
			break;
		case "8lpp4":
			e = 4 + dr(this, this.l), n = rr(this, this.l), e & 3 && (e += 4 - (e & 3));
			break;
		case "cstr":
			for (e = 0, n = ""; (o = cr(this, this.l + e++)) !== 0;) a.push(T(o));
			n = a.join("");
			break;
		case "_wstr":
			for (e = 0, n = ""; (o = lr(this, this.l + e)) !== 0;) a.push(T(o)), e += 2;
			e += 2, n = a.join("");
			break;
		case "dbcs-cont":
			for (n = "", l = this.l, c = 0; c < e; ++c) {
				if (this.lens && this.lens.indexOf(l) !== -1) return o = cr(this, l), this.l = l + 1, s = mr.call(this, e - c, o ? "dbcs-cont" : "sbcs-cont"), a.join("") + s;
				a.push(T(lr(this, l))), l += 2;
			}
			n = a.join(""), e *= 2;
			break;
		case "cpstr": if (p !== void 0) {
			n = p.utils.decode(d, this.slice(this.l, this.l + e));
			break;
		}
		case "sbcs-cont":
			for (n = "", l = this.l, c = 0; c != e; ++c) {
				if (this.lens && this.lens.indexOf(l) !== -1) return o = cr(this, l), this.l = l + 1, s = mr.call(this, e - c, o ? "dbcs-cont" : "sbcs-cont"), a.join("") + s;
				a.push(T(cr(this, l))), l += 1;
			}
			n = a.join("");
			break;
		default: switch (e) {
			case 1: return r = cr(this, this.l), this.l++, r;
			case 2: return r = (t === "i" ? ur : lr)(this, this.l), this.l += 2, r;
			case 4:
			case -4: return t === "i" || !(this[this.l + 3] & 128) ? (r = (e > 0 ? fr : pr)(this, this.l), this.l += 4, r) : (i = dr(this, this.l), this.l += 4, i);
			case 8:
			case -8:
				if (t === "f") return i = e == 8 ? ar(this, this.l) : ar([
					this[this.l + 7],
					this[this.l + 6],
					this[this.l + 5],
					this[this.l + 4],
					this[this.l + 3],
					this[this.l + 2],
					this[this.l + 1],
					this[this.l + 0]
				], 0), this.l += 8, i;
				e = 8;
			case 16:
				n = Gn(this, this.l, e);
				break;
		}
	}
	return this.l += e, n;
}
var hr = function(e, t, n) {
	e[n] = t & 255, e[n + 1] = t >>> 8 & 255, e[n + 2] = t >>> 16 & 255, e[n + 3] = t >>> 24 & 255;
}, gr = function(e, t, n) {
	e[n] = t & 255, e[n + 1] = t >> 8 & 255, e[n + 2] = t >> 16 & 255, e[n + 3] = t >> 24 & 255;
}, _r = function(e, t, n) {
	e[n] = t & 255, e[n + 1] = t >>> 8 & 255;
};
function vr(e, t, n) {
	var r = 0, i = 0;
	if (n === "dbcs") {
		for (i = 0; i != t.length; ++i) _r(this, t.charCodeAt(i), this.l + 2 * i);
		r = 2 * t.length;
	} else if (n === "sbcs" || n == "cpstr") if (p !== void 0 && f == 874) {
		for (i = 0; i != t.length; ++i) {
			var a = p.utils.encode(f, t.charAt(i));
			this[this.l + i] = a[0];
		}
		r = t.length;
	} else if (p !== void 0 && n == "cpstr") {
		if (a = p.utils.encode(d, t), a.length == t.length) for (i = 0; i < t.length; ++i) a[i] == 0 && t.charCodeAt(i) != 0 && (a[i] = 95);
		if (a.length == 2 * t.length) for (i = 0; i < t.length; ++i) a[2 * i] == 0 && a[2 * i + 1] == 0 && t.charCodeAt(i) != 0 && (a[2 * i] = 95);
		for (i = 0; i < a.length; ++i) this[this.l + i] = a[i];
		r = a.length;
	} else {
		for (t = t.replace(/[^\x00-\x7F]/g, "_"), i = 0; i != t.length; ++i) this[this.l + i] = t.charCodeAt(i) & 255;
		r = t.length;
	}
	else if (n === "hex") {
		for (; i < e; ++i) this[this.l++] = parseInt(t.slice(2 * i, 2 * i + 2), 16) || 0;
		return this;
	} else if (n === "utf16le") {
		var o = Math.min(this.l + e, this.length);
		for (i = 0; i < Math.min(t.length, e); ++i) {
			var s = t.charCodeAt(i);
			this[this.l++] = s & 255, this[this.l++] = s >> 8;
		}
		for (; this.l < o;) this[this.l++] = 0;
		return this;
	} else switch (e) {
		case 1:
			r = 1, this[this.l] = t & 255;
			break;
		case 2:
			r = 2, this[this.l] = t & 255, t >>>= 8, this[this.l + 1] = t & 255;
			break;
		case 3:
			r = 3, this[this.l] = t & 255, t >>>= 8, this[this.l + 1] = t & 255, t >>>= 8, this[this.l + 2] = t & 255;
			break;
		case 4:
			r = 4, hr(this, t, this.l);
			break;
		case 8: if (r = 8, n === "f") {
			zn(this, t, this.l);
			break;
		}
		case 16: break;
		case -4:
			r = 4, gr(this, t, this.l);
			break;
	}
	return this.l += r, this;
}
function yr(e, t) {
	var n = Gn(this, this.l, e.length >> 1);
	if (n !== e) throw Error(t + "Expected " + e + " saw " + n);
	this.l += e.length >> 1;
}
function br(e, t) {
	e.l = t, e.read_shift = mr, e.chk = yr, e.write_shift = vr;
}
function xr(e, t) {
	e.l += t;
}
function Sr(e) {
	var t = I(e);
	return br(t, 0), t;
}
function Cr(e, t, n) {
	if (e) {
		var r, i, a;
		br(e, e.l || 0);
		for (var o = e.length, s = 0, c = 0; e.l < o;) {
			s = e.read_shift(1), s & 128 && (s = (s & 127) + ((e.read_shift(1) & 127) << 7));
			var l = Bm[s] || Bm[65535];
			for (r = e.read_shift(1), a = r & 127, i = 1; i < 4 && r & 128; ++i) a += ((r = e.read_shift(1)) & 127) << 7 * i;
			c = e.l + a;
			var u = l.f && l.f(e, a, n);
			if (e.l = c, t(u, l, s)) return;
		}
	}
}
function wr() {
	var e = [], t = N ? 16384 : 2048, n = N && typeof Sr(t).subarray == "function", r = function(e) {
		var t = Sr(e);
		return br(t, 0), t;
	}, i = r(t), a = function() {
		i && (i.l && (i.length > i.l && (i = i.slice(0, i.l), i.l = i.length), i.length > 0 && e.push(i)), i = null);
	};
	return {
		next: function(e) {
			return i && e < i.length - i.l ? i : (a(), i = r(Math.max(e + 1, t)));
		},
		push: function(t) {
			i.l > 0 && e.push(i.slice(0, i.l)), e.push(t), i = n ? i.subarray(i.l || 0) : i.slice(i.l || 0), br(i, 0);
		},
		end: function() {
			return a(), V(e);
		},
		_bufs: e,
		end2: function() {
			return a(), e;
		}
	};
}
function Tr(e, t, n) {
	var r = St(e);
	if (t.s ? (r.cRel && (r.c += t.s.c), r.rRel && (r.r += t.s.r)) : (r.cRel && (r.c += t.c), r.rRel && (r.r += t.r)), !n || n.biff < 12) {
		for (; r.c >= 256;) r.c -= 256;
		for (; r.r >= 65536;) r.r -= 65536;
	}
	return r;
}
function Er(e, t, n) {
	var r = St(e);
	return r.s = Tr(r.s, t.s, n), r.e = Tr(r.e, t.s, n), r;
}
function Dr(e, t) {
	if (e.cRel && e.c < 0) for (e = St(e); e.c < 0;) e.c += t > 8 ? 16384 : 256;
	if (e.rRel && e.r < 0) for (e = St(e); e.r < 0;) e.r += t > 8 ? 1048576 : t > 5 ? 65536 : 16384;
	var n = zr(e);
	return !e.cRel && e.cRel != null && (n = Fr(n)), !e.rRel && e.rRel != null && (n = jr(n)), n;
}
function Or(e, t) {
	return e.s.r == 0 && !e.s.rRel && e.e.r == (t.biff >= 12 ? 1048575 : t.biff >= 8 ? 65536 : 16384) && !e.e.rRel ? (e.s.cRel ? "" : "$") + Pr(e.s.c) + ":" + (e.e.cRel ? "" : "$") + Pr(e.e.c) : e.s.c == 0 && !e.s.cRel && e.e.c == (t.biff >= 12 ? 16383 : 255) && !e.e.cRel ? (e.s.rRel ? "" : "$") + Ar(e.s.r) + ":" + (e.e.rRel ? "" : "$") + Ar(e.e.r) : Dr(e.s, t.biff) + ":" + Dr(e.e, t.biff);
}
function kr(e) {
	return parseInt(Mr(e), 10) - 1;
}
function Ar(e) {
	return "" + (e + 1);
}
function jr(e) {
	return e.replace(/([A-Z]|^)(\d+)$/, "$1$$$2");
}
function Mr(e) {
	return e.replace(/\$(\d+)$/, "$1");
}
function Nr(e) {
	for (var t = Ir(e), n = 0, r = 0; r !== t.length; ++r) n = 26 * n + t.charCodeAt(r) - 64;
	return n - 1;
}
function Pr(e) {
	if (e < 0) throw Error("invalid column " + e);
	var t = "";
	for (++e; e; e = Math.floor((e - 1) / 26)) t = String.fromCharCode((e - 1) % 26 + 65) + t;
	return t;
}
function Fr(e) {
	return e.replace(/^([A-Z])/, "$$$1");
}
function Ir(e) {
	return e.replace(/^\$([A-Z])/, "$1");
}
function Lr(e) {
	return e.replace(/(\$?[A-Z]*)(\$?\d*)/, "$1,$2").split(",");
}
function Rr(e) {
	for (var t = 0, n = 0, r = 0; r < e.length; ++r) {
		var i = e.charCodeAt(r);
		i >= 48 && i <= 57 ? t = 10 * t + (i - 48) : i >= 65 && i <= 90 && (n = 26 * n + (i - 64));
	}
	return {
		c: n - 1,
		r: t - 1
	};
}
function zr(e) {
	for (var t = e.c + 1, n = ""; t; t = (t - 1) / 26 | 0) n = String.fromCharCode((t - 1) % 26 + 65) + n;
	return n + (e.r + 1);
}
function Br(e) {
	var t = e.indexOf(":");
	return t == -1 ? {
		s: Rr(e),
		e: Rr(e)
	} : {
		s: Rr(e.slice(0, t)),
		e: Rr(e.slice(t + 1))
	};
}
function Vr(e, t) {
	return t === void 0 || typeof t == "number" ? Vr(e.s, e.e) : (typeof e != "string" && (e = zr(e)), typeof t != "string" && (t = zr(t)), e == t ? e : e + ":" + t);
}
function Hr(e, t) {
	if (!e && !(t && t.biff <= 5 && t.biff >= 2)) throw Error("empty sheet name");
	return /[^\w\u4E00-\u9FFF\u3040-\u30FF]/.test(e) ? "'" + e.replace(/'/g, "''") + "'" : e;
}
function Ur(e) {
	var t = {
		s: {
			c: 0,
			r: 0
		},
		e: {
			c: 0,
			r: 0
		}
	}, n = 0, r = 0, i = 0, a = e.length;
	for (n = 0; r < a && !((i = e.charCodeAt(r) - 64) < 1 || i > 26); ++r) n = 26 * n + i;
	for (t.s.c = --n, n = 0; r < a && !((i = e.charCodeAt(r) - 48) < 0 || i > 9); ++r) n = 10 * n + i;
	if (t.s.r = --n, r === a || i != 10) return t.e.c = t.s.c, t.e.r = t.s.r, t;
	for (++r, n = 0; r != a && !((i = e.charCodeAt(r) - 64) < 1 || i > 26); ++r) n = 26 * n + i;
	for (t.e.c = --n, n = 0; r != a && !((i = e.charCodeAt(r) - 48) < 0 || i > 9); ++r) n = 10 * n + i;
	return t.e.r = --n, t;
}
function Wr(e, t) {
	var n = e.t == "d" && t instanceof Date;
	if (e.z != null) try {
		return e.w = Xe(e.z, n ? mt(t) : t);
	} catch {}
	try {
		return e.w = Xe((e.XF || {}).numFmtId || (n ? 14 : 0), n ? mt(t) : t);
	} catch {
		return "" + t;
	}
}
function Gr(e, t, n) {
	return e == null || e.t == null || e.t == "z" ? "" : e.w === void 0 ? (e.t == "d" && !e.z && n && n.dateNF && (e.z = n.dateNF), e.t == "e" ? Fi[e.v] || e.v : t == null ? Wr(e, e.v) : Wr(e, t)) : e.w;
}
function Kr(e, t) {
	var n = t && t.sheet ? t.sheet : "Sheet1", r = {};
	return r[n] = e, {
		SheetNames: [n],
		Sheets: r
	};
}
function qr(e) {
	var t = {};
	return (e || {}).dense && (t["!data"] = []), t;
}
function Jr(e, t, n) {
	var r = n || {}, i = e ? e["!data"] != null : r.dense;
	D != null && i == null && (i = D);
	var a = e || (i ? { "!data": [] } : {});
	i && !a["!data"] && (a["!data"] = []);
	var o = 0, s = 0;
	if (a && r.origin != null) if (typeof r.origin == "number") o = r.origin;
	else {
		var c = typeof r.origin == "string" ? Rr(r.origin) : r.origin;
		o = c.r, s = c.c;
	}
	var l = {
		s: {
			c: 1e7,
			r: 1e7
		},
		e: {
			c: 0,
			r: 0
		}
	};
	if (a["!ref"]) {
		var u = Ur(a["!ref"]);
		l.s.c = u.s.c, l.s.r = u.s.r, l.e.c = Math.max(l.e.c, u.e.c), l.e.r = Math.max(l.e.r, u.e.r), o == -1 && (l.e.r = o = a["!ref"] ? u.e.r + 1 : 0);
	} else l.s.c = l.e.c = l.s.r = l.e.r = 0;
	for (var d = [], f = !1, p = 0; p != t.length; ++p) if (t[p]) {
		if (!Array.isArray(t[p])) throw Error("aoa_to_sheet expects an array of arrays");
		var m = o + p;
		i && (a["!data"][m] || (a["!data"][m] = []), d = a["!data"][m]);
		for (var h = t[p], g = 0; g != h.length; ++g) if (h[g] !== void 0) {
			var _ = {
				v: h[g],
				t: ""
			}, v = s + g;
			if (l.s.r > m && (l.s.r = m), l.s.c > v && (l.s.c = v), l.e.r < m && (l.e.r = m), l.e.c < v && (l.e.c = v), f = !0, h[g] && typeof h[g] == "object" && !Array.isArray(h[g]) && !(h[g] instanceof Date)) _ = h[g];
			else if (Array.isArray(_.v) && (_.f = h[g][1], _.v = _.v[0]), _.v === null) if (_.f) _.t = "n";
			else if (r.nullError) _.t = "e", _.v = 0;
			else if (r.sheetStubs) _.t = "z";
			else continue;
			else typeof _.v == "number" ? isFinite(_.v) ? _.t = "n" : isNaN(_.v) ? (_.t = "e", _.v = 15) : (_.t = "e", _.v = 7) : typeof _.v == "boolean" ? _.t = "b" : _.v instanceof Date ? (_.z = r.dateNF || J[14], r.UTC || (_.v = Ft(_.v)), r.cellDates ? (_.t = "d", _.w = Xe(_.z, mt(_.v, r.date1904))) : (_.t = "n", _.v = mt(_.v, r.date1904), _.w = Xe(_.z, _.v))) : _.t = "s";
			if (i) d[v] && d[v].z && (_.z = d[v].z), d[v] = _;
			else {
				var y = Pr(v) + (m + 1);
				a[y] && a[y].z && (_.z = a[y].z), a[y] = _;
			}
		}
	}
	return f && l.s.c < 104e5 && (a["!ref"] = Vr(l)), a;
}
function Yr(e, t) {
	return Jr(null, e, t);
}
function Xr(e) {
	return e.read_shift(4, "i");
}
function Zr(e) {
	var t = e.read_shift(4);
	return t === 0 ? "" : e.read_shift(t, "dbcs");
}
function Qr(e) {
	return {
		ich: e.read_shift(2),
		ifnt: e.read_shift(2)
	};
}
function $r(e, t) {
	var n = e.l, r = e.read_shift(1), i = Zr(e), a = [], o = {
		t: i,
		h: i
	};
	if (r & 1) {
		for (var s = e.read_shift(4), c = 0; c != s; ++c) a.push(Qr(e));
		o.r = a;
	} else o.r = [{
		ich: 0,
		ifnt: 0
	}];
	return e.l = n + t, o;
}
var ei = $r;
function ti(e) {
	var t = e.read_shift(4), n = e.read_shift(2);
	return n += e.read_shift(1) << 16, e.l++, {
		c: t,
		iStyleRef: n
	};
}
function ni(e) {
	var t = e.read_shift(2);
	return t += e.read_shift(1) << 16, e.l++, {
		c: -1,
		iStyleRef: t
	};
}
var ri = Zr;
function ii(e) {
	var t = e.read_shift(4);
	return t === 0 || t === 4294967295 ? "" : e.read_shift(t, "dbcs");
}
var ai = Zr, oi = ii;
function si(e) {
	var t = e.slice(e.l, e.l + 4), n = t[0] & 1, r = t[0] & 2;
	e.l += 4;
	var i = r === 0 ? ar([
		0,
		0,
		0,
		0,
		t[0] & 252,
		t[1],
		t[2],
		t[3]
	], 0) : fr(t, 0) >> 2;
	return n ? i / 100 : i;
}
function ci(e) {
	var t = {
		s: {},
		e: {}
	};
	return t.s.r = e.read_shift(4), t.e.r = e.read_shift(4), t.s.c = e.read_shift(4), t.e.c = e.read_shift(4), t;
}
var li = ci;
function ui(e) {
	if (e.length - e.l < 8) throw "XLS Xnum Buffer underflow";
	return e.read_shift(8, "f");
}
function di(e) {
	var t = {}, n = e.read_shift(1) >>> 1, r = e.read_shift(1), i = e.read_shift(2, "i"), a = e.read_shift(1), o = e.read_shift(1), s = e.read_shift(1);
	switch (e.l++, n) {
		case 0:
			t.auto = 1;
			break;
		case 1:
			t.index = r;
			var c = Pi[r];
			c && (t.rgb = sc(c));
			break;
		case 2:
			t.rgb = sc([
				a,
				o,
				s
			]);
			break;
		case 3:
			t.theme = r;
			break;
	}
	return i != 0 && (t.tint = i > 0 ? i / 32767 : i / 32768), t;
}
function fi(e) {
	var t = e.read_shift(1);
	return e.l++, {
		fBold: t & 1,
		fItalic: t & 2,
		fUnderline: t & 4,
		fStrikeout: t & 8,
		fOutline: t & 16,
		fShadow: t & 32,
		fCondense: t & 64,
		fExtend: t & 128
	};
}
function pi(e, t) {
	var n = {
		2: "BITMAP",
		3: "METAFILEPICT",
		8: "DIB",
		14: "ENHMETAFILE"
	}, r = e.read_shift(4);
	switch (r) {
		case 0: return "";
		case 4294967295:
		case 4294967294: return n[e.read_shift(4)] || "";
	}
	if (r > 400) throw Error("Unsupported Clipboard: " + r.toString(16));
	return e.l -= 4, e.read_shift(0, t == 1 ? "lpstr" : "lpwstr");
}
function mi(e) {
	return pi(e, 1);
}
function hi(e) {
	return pi(e, 2);
}
var gi = 2, _i = 3, vi = 11, yi = 12, bi = 19, xi = 64, Si = 65, Ci = 71, wi = 4108, Ti = 4126, Ei = 80, Di = 81, Oi = [Ei, Di], ki = {
	1: {
		n: "CodePage",
		t: gi
	},
	2: {
		n: "Category",
		t: Ei
	},
	3: {
		n: "PresentationFormat",
		t: Ei
	},
	4: {
		n: "ByteCount",
		t: _i
	},
	5: {
		n: "LineCount",
		t: _i
	},
	6: {
		n: "ParagraphCount",
		t: _i
	},
	7: {
		n: "SlideCount",
		t: _i
	},
	8: {
		n: "NoteCount",
		t: _i
	},
	9: {
		n: "HiddenCount",
		t: _i
	},
	10: {
		n: "MultimediaClipCount",
		t: _i
	},
	11: {
		n: "ScaleCrop",
		t: vi
	},
	12: {
		n: "HeadingPairs",
		t: wi
	},
	13: {
		n: "TitlesOfParts",
		t: Ti
	},
	14: {
		n: "Manager",
		t: Ei
	},
	15: {
		n: "Company",
		t: Ei
	},
	16: {
		n: "LinksUpToDate",
		t: vi
	},
	17: {
		n: "CharacterCount",
		t: _i
	},
	19: {
		n: "SharedDoc",
		t: vi
	},
	22: {
		n: "HyperlinksChanged",
		t: vi
	},
	23: {
		n: "AppVersion",
		t: _i,
		p: "version"
	},
	24: {
		n: "DigSig",
		t: Si
	},
	26: {
		n: "ContentType",
		t: Ei
	},
	27: {
		n: "ContentStatus",
		t: Ei
	},
	28: {
		n: "Language",
		t: Ei
	},
	29: {
		n: "Version",
		t: Ei
	},
	255: {},
	2147483648: {
		n: "Locale",
		t: bi
	},
	2147483651: {
		n: "Behavior",
		t: bi
	},
	1919054434: {}
}, Ai = {
	1: {
		n: "CodePage",
		t: gi
	},
	2: {
		n: "Title",
		t: Ei
	},
	3: {
		n: "Subject",
		t: Ei
	},
	4: {
		n: "Author",
		t: Ei
	},
	5: {
		n: "Keywords",
		t: Ei
	},
	6: {
		n: "Comments",
		t: Ei
	},
	7: {
		n: "Template",
		t: Ei
	},
	8: {
		n: "LastAuthor",
		t: Ei
	},
	9: {
		n: "RevNumber",
		t: Ei
	},
	10: {
		n: "EditTime",
		t: xi
	},
	11: {
		n: "LastPrinted",
		t: xi
	},
	12: {
		n: "CreatedDate",
		t: xi
	},
	13: {
		n: "ModifiedDate",
		t: xi
	},
	14: {
		n: "PageCount",
		t: _i
	},
	15: {
		n: "WordCount",
		t: _i
	},
	16: {
		n: "CharCount",
		t: _i
	},
	17: {
		n: "Thumbnail",
		t: Ci
	},
	18: {
		n: "Application",
		t: Ei
	},
	19: {
		n: "DocSecurity",
		t: _i
	},
	255: {},
	2147483648: {
		n: "Locale",
		t: bi
	},
	2147483651: {
		n: "Behavior",
		t: bi
	},
	1919054434: {}
}, ji = {
	1: "US",
	2: "CA",
	3: "",
	7: "RU",
	20: "EG",
	30: "GR",
	31: "NL",
	32: "BE",
	33: "FR",
	34: "ES",
	36: "HU",
	39: "IT",
	41: "CH",
	43: "AT",
	44: "GB",
	45: "DK",
	46: "SE",
	47: "NO",
	48: "PL",
	49: "DE",
	52: "MX",
	55: "BR",
	61: "AU",
	64: "NZ",
	66: "TH",
	81: "JP",
	82: "KR",
	84: "VN",
	86: "CN",
	90: "TR",
	105: "JS",
	213: "DZ",
	216: "MA",
	218: "LY",
	351: "PT",
	354: "IS",
	358: "FI",
	420: "CZ",
	886: "TW",
	961: "LB",
	962: "JO",
	963: "SY",
	964: "IQ",
	965: "KW",
	966: "SA",
	971: "AE",
	972: "IL",
	974: "QA",
	981: "IR",
	65535: "US"
}, Mi = [
	null,
	"solid",
	"mediumGray",
	"darkGray",
	"lightGray",
	"darkHorizontal",
	"darkVertical",
	"darkDown",
	"darkUp",
	"darkGrid",
	"darkTrellis",
	"lightHorizontal",
	"lightVertical",
	"lightDown",
	"lightUp",
	"lightGrid",
	"lightTrellis",
	"gray125",
	"gray0625"
];
function Ni(e) {
	return e.map(function(e) {
		return [
			e >> 16 & 255,
			e >> 8 & 255,
			e & 255
		];
	});
}
var Pi = /*#__PURE__*/ St(/* @__PURE__ */ Ni([
	0,
	16777215,
	16711680,
	65280,
	255,
	16776960,
	16711935,
	65535,
	0,
	16777215,
	16711680,
	65280,
	255,
	16776960,
	16711935,
	65535,
	8388608,
	32768,
	128,
	8421376,
	8388736,
	32896,
	12632256,
	8421504,
	10066431,
	10040166,
	16777164,
	13434879,
	6684774,
	16744576,
	26316,
	13421823,
	128,
	16711935,
	16776960,
	65535,
	8388736,
	8388608,
	32896,
	255,
	52479,
	13434879,
	13434828,
	16777113,
	10079487,
	16751052,
	13408767,
	16764057,
	3368703,
	3394764,
	10079232,
	16763904,
	16750848,
	16737792,
	6710937,
	9868950,
	13158,
	3381606,
	13056,
	3355392,
	10040064,
	10040166,
	3355545,
	3355443,
	0,
	16777215,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0
])), Fi = {
	0: "#NULL!",
	7: "#DIV/0!",
	15: "#VALUE!",
	23: "#REF!",
	29: "#NAME?",
	36: "#NUM!",
	42: "#N/A",
	43: "#GETTING_DATA",
	255: "#WTF?"
}, Ii = {
	"#NULL!": 0,
	"#DIV/0!": 7,
	"#VALUE!": 15,
	"#REF!": 23,
	"#NAME?": 29,
	"#NUM!": 36,
	"#N/A": 42,
	"#GETTING_DATA": 43,
	"#WTF?": 255
}, Li = [
	"_xlnm.Consolidate_Area",
	"_xlnm.Auto_Open",
	"_xlnm.Auto_Close",
	"_xlnm.Extract",
	"_xlnm.Database",
	"_xlnm.Criteria",
	"_xlnm.Print_Area",
	"_xlnm.Print_Titles",
	"_xlnm.Recorder",
	"_xlnm.Data_Form",
	"_xlnm.Auto_Activate",
	"_xlnm.Auto_Deactivate",
	"_xlnm.Sheet_Title",
	"_xlnm._FilterDatabase"
], Ri = {
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": "workbooks",
	"application/vnd.ms-excel.sheet.macroEnabled.main+xml": "workbooks",
	"application/vnd.ms-excel.sheet.binary.macroEnabled.main": "workbooks",
	"application/vnd.ms-excel.addin.macroEnabled.main+xml": "workbooks",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": "workbooks",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": "sheets",
	"application/vnd.ms-excel.worksheet": "sheets",
	"application/vnd.ms-excel.binIndexWs": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": "charts",
	"application/vnd.ms-excel.chartsheet": "charts",
	"application/vnd.ms-excel.macrosheet+xml": "macros",
	"application/vnd.ms-excel.macrosheet": "macros",
	"application/vnd.ms-excel.intlmacrosheet": "TODO",
	"application/vnd.ms-excel.binIndexMs": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": "dialogs",
	"application/vnd.ms-excel.dialogsheet": "dialogs",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml": "strs",
	"application/vnd.ms-excel.sharedStrings": "strs",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": "styles",
	"application/vnd.ms-excel.styles": "styles",
	"application/vnd.openxmlformats-package.core-properties+xml": "coreprops",
	"application/vnd.openxmlformats-officedocument.custom-properties+xml": "custprops",
	"application/vnd.openxmlformats-officedocument.extended-properties+xml": "extprops",
	"application/vnd.openxmlformats-officedocument.customXmlProperties+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.customProperty": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": "comments",
	"application/vnd.ms-excel.comments": "comments",
	"application/vnd.ms-excel.threadedcomments+xml": "threadedcomments",
	"application/vnd.ms-excel.person+xml": "people",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheetMetadata+xml": "metadata",
	"application/vnd.ms-excel.sheetMetadata": "metadata",
	"application/vnd.ms-excel.pivotTable": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.pivotTable+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.drawingml.chart+xml": "TODO",
	"application/vnd.ms-office.chartcolorstyle+xml": "TODO",
	"application/vnd.ms-office.chartstyle+xml": "TODO",
	"application/vnd.ms-office.chartex+xml": "TODO",
	"application/vnd.ms-excel.calcChain": "calcchains",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml": "calcchains",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.printerSettings": "TODO",
	"application/vnd.ms-office.activeX": "TODO",
	"application/vnd.ms-office.activeX+xml": "TODO",
	"application/vnd.ms-excel.attachedToolbars": "TODO",
	"application/vnd.ms-excel.connections": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": "TODO",
	"application/vnd.ms-excel.externalLink": "links",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.externalLink+xml": "links",
	"application/vnd.ms-excel.pivotCacheDefinition": "TODO",
	"application/vnd.ms-excel.pivotCacheRecords": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheDefinition+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheRecords+xml": "TODO",
	"application/vnd.ms-excel.queryTable": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.queryTable+xml": "TODO",
	"application/vnd.ms-excel.userNames": "TODO",
	"application/vnd.ms-excel.revisionHeaders": "TODO",
	"application/vnd.ms-excel.revisionLog": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.revisionHeaders+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.revisionLog+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.userNames+xml": "TODO",
	"application/vnd.ms-excel.tableSingleCells": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.tableSingleCells+xml": "TODO",
	"application/vnd.ms-excel.slicer": "TODO",
	"application/vnd.ms-excel.slicerCache": "TODO",
	"application/vnd.ms-excel.slicer+xml": "TODO",
	"application/vnd.ms-excel.slicerCache+xml": "TODO",
	"application/vnd.ms-excel.wsSortMap": "TODO",
	"application/vnd.ms-excel.table": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.theme+xml": "themes",
	"application/vnd.openxmlformats-officedocument.themeOverride+xml": "TODO",
	"application/vnd.ms-excel.Timeline+xml": "TODO",
	"application/vnd.ms-excel.TimelineCache+xml": "TODO",
	"application/vnd.ms-office.vbaProject": "vba",
	"application/vnd.ms-office.vbaProjectSignature": "TODO",
	"application/vnd.ms-office.volatileDependencies": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.volatileDependencies+xml": "TODO",
	"application/vnd.ms-excel.controlproperties+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.model+data": "TODO",
	"application/vnd.ms-excel.Survey+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.drawing+xml": "drawings",
	"application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.drawingml.diagramColors+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.drawingml.diagramData+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.drawingml.diagramLayout+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.drawingml.diagramStyle+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.vmlDrawing": "TODO",
	"application/vnd.openxmlformats-package.relationships+xml": "rels",
	"application/vnd.openxmlformats-officedocument.oleObject": "TODO",
	"image/png": "TODO",
	sheet: "js"
};
function zi() {
	return {
		workbooks: [],
		sheets: [],
		charts: [],
		dialogs: [],
		macros: [],
		rels: [],
		strs: [],
		comments: [],
		threadedcomments: [],
		links: [],
		coreprops: [],
		extprops: [],
		custprops: [],
		themes: [],
		styles: [],
		calcchains: [],
		vba: [],
		drawings: [],
		metadata: [],
		people: [],
		TODO: [],
		xmlns: ""
	};
}
function Bi(e) {
	var t = zi();
	if (!e || !e.match) return t;
	var n = {};
	if ((e.match(sn) || []).forEach(function(e) {
		var r = X(e);
		switch (r[0].replace(cn, "<")) {
			case "<?xml": break;
			case "<Types":
				t.xmlns = r["xmlns" + (r[0].match(/<(\w+):/) || ["", ""])[1]];
				break;
			case "<Default":
				n[r.Extension.toLowerCase()] = r.ContentType;
				break;
			case "<Override":
				t[Ri[r.ContentType]] !== void 0 && t[Ri[r.ContentType]].push(r.PartName);
				break;
		}
	}), t.xmlns !== In.CT) throw Error("Unknown Namespace: " + t.xmlns);
	return t.calcchain = t.calcchains.length > 0 ? t.calcchains[0] : "", t.sst = t.strs.length > 0 ? t.strs[0] : "", t.style = t.styles.length > 0 ? t.styles[0] : "", t.defaults = n, delete t.calcchains, t;
}
var Vi = {
	WB: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
	SHEET: "http://sheetjs.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
	HLINK: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
	VML: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing",
	XPATH: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/externalLinkPath",
	XMISS: "http://schemas.microsoft.com/office/2006/relationships/xlExternalLinkPath/xlPathMissing",
	XLINK: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/externalLink",
	CXML: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml",
	CXMLP: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXmlProps",
	CMNT: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
	CORE_PROPS: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
	EXT_PROPS: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties",
	CUST_PROPS: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties",
	SST: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
	STY: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
	THEME: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
	CHART: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart",
	CHARTEX: "http://schemas.microsoft.com/office/2014/relationships/chartEx",
	CS: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chartsheet",
	WS: ["http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet", "http://purl.oclc.org/ooxml/officeDocument/relationships/worksheet"],
	DS: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/dialogsheet",
	MS: "http://schemas.microsoft.com/office/2006/relationships/xlMacrosheet",
	IMG: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
	DRAW: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
	XLMETA: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sheetMetadata",
	TCMNT: "http://schemas.microsoft.com/office/2017/10/relationships/threadedComment",
	PEOPLE: "http://schemas.microsoft.com/office/2017/10/relationships/person",
	CONN: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/connections",
	VBA: "http://schemas.microsoft.com/office/2006/relationships/vbaProject"
};
function Hi(e) {
	var t = e.lastIndexOf("/");
	return e.slice(0, t + 1) + "_rels/" + e.slice(t + 1) + ".rels";
}
function Ui(e, t) {
	var n = { "!id": {} };
	if (!e) return n;
	t.charAt(0) !== "/" && (t = "/" + t);
	var r = {};
	return (e.match(sn) || []).forEach(function(e) {
		var i = X(e);
		if (i[0] === "<Relationship") {
			var a = {};
			a.Type = i.Type, a.Target = mn(i.Target), a.Id = i.Id, i.TargetMode && (a.TargetMode = i.TargetMode);
			var o = i.TargetMode === "External" ? i.Target : nn(i.Target, t);
			n[o] = a, r[i.Id] = a;
		}
	}), n["!id"] = r, n;
}
var Wi = "application/vnd.oasis.opendocument.spreadsheet";
function Gi(e, t) {
	for (var n = Pn(e), r, i; r = Fn.exec(n);) switch (r[3]) {
		case "manifest": break;
		case "file-entry":
			if (i = X(r[0], !1), i.path == "/" && i.type !== Wi) throw Error("This OpenDocument is not a spreadsheet");
			break;
		case "encryption-data":
		case "algorithm":
		case "start-key-generation":
		case "key-derivation": throw Error("Unsupported ODS Encryption");
		default: if (t && t.WTF) throw r;
	}
}
var Ki = [
	["cp:category", "Category"],
	["cp:contentStatus", "ContentStatus"],
	["cp:keywords", "Keywords"],
	["cp:lastModifiedBy", "LastAuthor"],
	["cp:lastPrinted", "LastPrinted"],
	["cp:revision", "RevNumber"],
	["cp:version", "Version"],
	["dc:creator", "Author"],
	["dc:description", "Comments"],
	["dc:identifier", "Identifier"],
	["dc:language", "Language"],
	["dc:subject", "Subject"],
	["dc:title", "Title"],
	[
		"dcterms:created",
		"CreatedDate",
		"date"
	],
	[
		"dcterms:modified",
		"ModifiedDate",
		"date"
	]
];
function qi(e) {
	var t = {};
	e = Tn(e);
	for (var n = 0; n < Ki.length; ++n) {
		var r = Ki[n], i = Bt(e, r[0]);
		i != null && i.length > 0 && (t[r[1]] = mn(i[1])), r[2] === "date" && t[r[1]] && (t[r[1]] = bt(t[r[1]]));
	}
	return t;
}
var Ji = [
	[
		"Application",
		"Application",
		"string"
	],
	[
		"AppVersion",
		"AppVersion",
		"string"
	],
	[
		"Company",
		"Company",
		"string"
	],
	[
		"DocSecurity",
		"DocSecurity",
		"string"
	],
	[
		"Manager",
		"Manager",
		"string"
	],
	[
		"HyperlinksChanged",
		"HyperlinksChanged",
		"bool"
	],
	[
		"SharedDoc",
		"SharedDoc",
		"bool"
	],
	[
		"LinksUpToDate",
		"LinksUpToDate",
		"bool"
	],
	[
		"ScaleCrop",
		"ScaleCrop",
		"bool"
	],
	[
		"HeadingPairs",
		"HeadingPairs",
		"raw"
	],
	[
		"TitlesOfParts",
		"TitlesOfParts",
		"raw"
	]
];
function Yi(e, t, n, r) {
	var i = [];
	if (typeof e == "string") i = An(e, r);
	else for (var a = 0; a < e.length; ++a) i = i.concat(e[a].map(function(e) {
		return { v: e };
	}));
	var o = typeof t == "string" ? An(t, r).map(function(e) {
		return e.v;
	}) : t, s = 0, c = 0;
	if (o.length > 0) for (var l = 0; l !== i.length; l += 2) {
		switch (c = +i[l + 1].v, i[l].v) {
			case "Worksheets":
			case "工作表":
			case "Листы":
			case "أوراق العمل":
			case "ワークシート":
			case "גליונות עבודה":
			case "Arbeitsblätter":
			case "Çalışma Sayfaları":
			case "Feuilles de calcul":
			case "Fogli di lavoro":
			case "Folhas de cálculo":
			case "Planilhas":
			case "Regneark":
			case "Hojas de cálculo":
			case "Werkbladen":
				n.Worksheets = c, n.SheetNames = o.slice(s, s + c);
				break;
			case "Named Ranges":
			case "Rangos con nombre":
			case "名前付き一覧":
			case "Benannte Bereiche":
			case "Navngivne områder":
				n.NamedRanges = c, n.DefinedNames = o.slice(s, s + c);
				break;
			case "Charts":
			case "Diagramme":
				n.Chartsheets = c, n.ChartNames = o.slice(s, s + c);
				break;
		}
		s += c;
	}
}
function Xi(e, t, n) {
	var r = {};
	return t || (t = {}), e = Tn(e), Ji.forEach(function(n) {
		var i = (Vt(e, n[0]) || [])[1];
		switch (n[2]) {
			case "string":
				i && (t[n[1]] = mn(i));
				break;
			case "bool":
				t[n[1]] = i === "true";
				break;
			case "raw":
				var a = Bt(e, n[0]);
				a && a.length > 0 && (r[n[1]] = a[1]);
				break;
		}
	}), r.HeadingPairs && r.TitlesOfParts && Yi(r.HeadingPairs, r.TitlesOfParts, t, n), t;
}
var Zi = /<[^<>]+>[^<]*/g;
function Qi(e, t) {
	var n = {}, r = "", i = e.match(Zi);
	if (i) for (var a = 0; a != i.length; ++a) {
		var o = i[a], s = X(o);
		switch (dn(s[0])) {
			case "<?xml": break;
			case "<Properties": break;
			case "<property":
				r = mn(s.name);
				break;
			case "</property>":
				r = null;
				break;
			default: if (o.indexOf("<vt:") === 0) {
				var c = o.split(">"), l = c[0].slice(4), u = c[1];
				switch (l) {
					case "lpstr":
					case "bstr":
					case "lpwstr":
						n[r] = mn(u);
						break;
					case "bool":
						n[r] = Z(u);
						break;
					case "i1":
					case "i2":
					case "i4":
					case "i8":
					case "int":
					case "uint":
						n[r] = parseInt(u, 10);
						break;
					case "r4":
					case "r8":
					case "decimal":
						n[r] = parseFloat(u);
						break;
					case "filetime":
					case "date":
						n[r] = bt(u);
						break;
					case "cy":
					case "error":
						n[r] = mn(u);
						break;
					default:
						if (l.slice(-1) == "/") break;
						t.WTF && typeof console < "u" && console.warn("Unexpected", o, l, c);
				}
			} else if (o.slice(0, 2) !== "</" && t.WTF) throw Error(o);
		}
	}
	return n;
}
var $i = {
	Title: "Title",
	Subject: "Subject",
	Author: "Author",
	Keywords: "Keywords",
	Comments: "Description",
	LastAuthor: "LastAuthor",
	RevNumber: "Revision",
	Application: "AppName",
	LastPrinted: "LastPrinted",
	CreatedDate: "Created",
	ModifiedDate: "LastSaved",
	Category: "Category",
	Manager: "Manager",
	Company: "Company",
	AppVersion: "Version",
	ContentStatus: "ContentStatus",
	Identifier: "Identifier",
	Language: "Language"
}, ea;
function ta(e, t, n) {
	ea || (ea = ut($i)), t = ea[t] || t, e[t] = n;
}
function na(e) {
	var t = e.read_shift(4), n = e.read_shift(4);
	return (/* @__PURE__ */ new Date((n / 1e7 * 2 ** 32 + t / 1e7 - 11644473600) * 1e3)).toISOString().replace(/\.000/, "");
}
function ra(e, t, n) {
	var r = e.l, i = e.read_shift(0, "lpstr-cp");
	if (n) for (; e.l - r & 3;) ++e.l;
	return i;
}
function ia(e, t, n) {
	var r = e.read_shift(0, "lpwstr");
	return n && (e.l += 4 - (r.length + 1 & 3) & 3), r;
}
function aa(e, t, n) {
	return t === 31 ? ia(e) : ra(e, t, n);
}
function oa(e, t, n) {
	return aa(e, t, n === !1 ? 0 : 4);
}
function sa(e, t) {
	if (!t) throw Error("VtUnalignedString must have positive length");
	return aa(e, t, 0);
}
function ca(e) {
	for (var t = e.read_shift(4), n = [], r = 0; r != t; ++r) {
		var i = e.l;
		n[r] = e.read_shift(0, "lpwstr").replace(U, ""), e.l - i & 2 && (e.l += 2);
	}
	return n;
}
function la(e) {
	for (var t = e.read_shift(4), n = [], r = 0; r != t; ++r) n[r] = e.read_shift(0, "lpstr-cp").replace(U, "");
	return n;
}
function ua(e) {
	var t = e.l, n = ha(e, Di);
	return e[e.l] == 0 && e[e.l + 1] == 0 && e.l - t & 2 && (e.l += 2), [n, ha(e, _i)];
}
function da(e) {
	for (var t = e.read_shift(4), n = [], r = 0; r < t / 2; ++r) n.push(ua(e));
	return n;
}
function fa(e, t) {
	for (var n = e.read_shift(4), r = {}, i = 0; i != n; ++i) {
		var a = e.read_shift(4), o = e.read_shift(4);
		r[a] = e.read_shift(o, t === 1200 ? "utf16le" : "utf8").replace(U, "").replace(W, "!"), t === 1200 && o % 2 && (e.l += 2);
	}
	return e.l & 3 && (e.l = e.l >> 3 << 2), r;
}
function pa(e) {
	var t = e.read_shift(4), n = e.slice(e.l, e.l + t);
	return e.l += t, (t & 3) > 0 && (e.l += 4 - (t & 3) & 3), n;
}
function ma(e) {
	var t = {};
	return t.Size = e.read_shift(4), e.l += t.Size + 3 - (t.Size - 1) % 4, t;
}
function ha(e, t, n) {
	var r = e.read_shift(2), i, a = n || {};
	if (e.l += 2, t !== yi && r !== t && Oi.indexOf(t) === -1 && !((t & 65534) == 4126 && (r & 65534) == 4126)) throw Error("Expected type " + t + " saw " + r);
	switch (t === yi ? r : t) {
		case 2: return i = e.read_shift(2, "i"), a.raw || (e.l += 2), i;
		case 3: return i = e.read_shift(4, "i"), i;
		case 11: return e.read_shift(4) !== 0;
		case 19: return i = e.read_shift(4), i;
		case 30:
			e.l += 4, val = oa(e, e[e.l - 4]).replace(/(^|[^\u0000])\u0000+$/, "$1");
			break;
		case 31:
			e.l += 4, val = oa(e, e[e.l - 4]).replace(/(^|[^\u0000])\u0000+$/, "$1");
			break;
		case 64: return na(e);
		case 65: return pa(e);
		case 71: return ma(e);
		case 80: return oa(e, r, !a.raw).replace(U, "");
		case 81: return sa(e, r).replace(U, "");
		case 4108: return da(e);
		case 4126:
		case 4127: return r == 4127 ? ca(e) : la(e);
		default: throw Error("TypedPropertyValue unrecognized type " + t + " " + r);
	}
}
function ga(e, t) {
	var n = e.l, r = e.read_shift(4), i = e.read_shift(4), a = [], o = 0, s = 0, c = -1, l = {};
	for (o = 0; o != i; ++o) a[o] = [e.read_shift(4), e.read_shift(4) + n];
	a.sort(function(e, t) {
		return e[1] - t[1];
	});
	var u = {};
	for (o = 0; o != i; ++o) {
		if (e.l !== a[o][1]) {
			var d = !0;
			if (o > 0 && t) switch (t[a[o - 1][0]].t) {
				case 2:
					e.l + 2 === a[o][1] && (e.l += 2, d = !1);
					break;
				case 80:
					e.l <= a[o][1] && (e.l = a[o][1], d = !1);
					break;
				case 4108:
					e.l <= a[o][1] && (e.l = a[o][1], d = !1);
					break;
			}
			if ((!t || o == 0) && e.l <= a[o][1] && (d = !1, e.l = a[o][1]), d) throw Error("Read Error: Expected address " + a[o][1] + " at " + e.l + " :" + o);
		}
		if (t) {
			if (a[o][0] == 0 && a.length > o + 1 && a[o][1] == a[o + 1][1]) continue;
			var f = t[a[o][0]];
			if (u[f.n] = ha(e, f.t, { raw: !0 }), f.p === "version" && (u[f.n] = String(u[f.n] >> 16) + "." + ("0000" + String(u[f.n] & 65535)).slice(-4)), f.n == "CodePage") switch (u[f.n]) {
				case 0: u[f.n] = 1252;
				case 874:
				case 932:
				case 936:
				case 949:
				case 950:
				case 1250:
				case 1251:
				case 1253:
				case 1254:
				case 1255:
				case 1256:
				case 1257:
				case 1258:
				case 1e4:
				case 1200:
				case 1201:
				case 1252:
				case 65e3:
				case -536:
				case 65001:
				case -535:
					v(s = u[f.n] >>> 0 & 65535);
					break;
				default: throw Error("Unsupported CodePage: " + u[f.n]);
			}
		} else if (a[o][0] === 1) {
			if (s = u.CodePage = ha(e, gi), v(s), c !== -1) {
				var p = e.l;
				e.l = a[c][1], l = fa(e, s), e.l = p;
			}
		} else if (a[o][0] === 0) {
			if (s === 0) {
				c = o, e.l = a[o + 1][1];
				continue;
			}
			l = fa(e, s);
		} else {
			var m = l[a[o][0]], h;
			switch (e[e.l]) {
				case 65:
					e.l += 4, h = pa(e);
					break;
				case 30:
					e.l += 4, h = oa(e, e[e.l - 4]).replace(/(^|[^\u0000])\u0000+$/, "$1");
					break;
				case 31:
					e.l += 4, h = oa(e, e[e.l - 4]).replace(/(^|[^\u0000])\u0000+$/, "$1");
					break;
				case 3:
					e.l += 4, h = e.read_shift(4, "i");
					break;
				case 19:
					e.l += 4, h = e.read_shift(4);
					break;
				case 5:
					e.l += 4, h = e.read_shift(8, "f");
					break;
				case 11:
					e.l += 4, h = ba(e, 4);
					break;
				case 64:
					e.l += 4, h = bt(na(e));
					break;
				default: throw Error("unparsed value: " + e[e.l]);
			}
			u[m] = h;
		}
	}
	return e.l = n + r, u;
}
function _a(e, t, n) {
	var r = e.content;
	if (!r) return {};
	br(r, 0);
	var i, a, o, s, c = 0;
	r.chk("feff", "Byte Order: "), r.read_shift(2);
	var l = r.read_shift(4), u = r.read_shift(16);
	if (u !== ot.utils.consts.HEADER_CLSID && u !== n) throw Error("Bad PropertySet CLSID " + u);
	if (i = r.read_shift(4), i !== 1 && i !== 2) throw Error("Unrecognized #Sets: " + i);
	if (a = r.read_shift(16), s = r.read_shift(4), i === 1 && s !== r.l) throw Error("Length mismatch: " + s + " !== " + r.l);
	i === 2 && (o = r.read_shift(16), c = r.read_shift(4));
	var d = ga(r, t), f = { SystemIdentifier: l };
	for (var p in d) f[p] = d[p];
	if (f.FMTID = a, i === 1) return f;
	if (c - r.l == 2 && (r.l += 2), r.l !== c) throw Error("Length mismatch 2: " + r.l + " !== " + c);
	var m;
	try {
		m = ga(r, null);
	} catch {}
	for (p in m) f[p] = m[p];
	return f.FMTID = [a, o], f;
}
function va(e, t) {
	return e.read_shift(t), null;
}
function ya(e, t, n) {
	for (var r = [], i = e.l + t; e.l < i;) r.push(n(e, i - e.l));
	if (i !== e.l) throw Error("Slurp error");
	return r;
}
function ba(e, t) {
	return e.read_shift(t) === 1;
}
function xa(e) {
	return e.read_shift(2, "u");
}
function Sa(e, t) {
	return ya(e, t, xa);
}
function Ca(e) {
	var t = e.read_shift(1);
	return e.read_shift(1) === 1 ? t : t === 1;
}
function wa(e, t, n) {
	var r = e.read_shift(n && n.biff >= 12 ? 2 : 1), i = "sbcs-cont", a = d;
	n && n.biff >= 8 && (d = 1200), !n || n.biff == 8 ? e.read_shift(1) && (i = "dbcs-cont") : n.biff == 12 && (i = "wstr"), n.biff >= 2 && n.biff <= 5 && (i = "cpstr");
	var o = r ? e.read_shift(r, i) : "";
	return d = a, o;
}
function Ta(e) {
	var t = d;
	d = 1200;
	var n = e.read_shift(2), r = e.read_shift(1), i = r & 4, a = r & 8, o = 1 + (r & 1), s = 0, c, l = {};
	a && (s = e.read_shift(2)), i && (c = e.read_shift(4));
	var u = o == 2 ? "dbcs-cont" : "sbcs-cont", f = n === 0 ? "" : e.read_shift(n, u);
	return a && (e.l += 4 * s), i && (e.l += c), l.t = f, a || (l.raw = "<t>" + l.t + "</t>", l.r = l.t), d = t, l;
}
function Ea(e, t, n) {
	var r;
	if (n) {
		if (n.biff >= 2 && n.biff <= 5) return e.read_shift(t, "cpstr");
		if (n.biff >= 12) return e.read_shift(t, "dbcs-cont");
	}
	return r = e.read_shift(1) === 0 ? e.read_shift(t, "sbcs-cont") : e.read_shift(t, "dbcs-cont"), r;
}
function Da(e, t, n) {
	var r = e.read_shift(n && n.biff == 2 ? 1 : 2);
	return r === 0 ? (n.biff <= 8 && e.l++, "") : Ea(e, r, n);
}
function Oa(e, t, n) {
	if (n.biff > 5) return Da(e, t, n);
	var r = e.read_shift(1);
	return r === 0 ? (e.l++, "") : e.read_shift(r, n.biff <= 4 || !e.lens ? "cpstr" : "sbcs-cont");
}
function ka(e) {
	var t = e.read_shift(1);
	e.l++;
	var n = e.read_shift(2);
	return e.l += 2, [t, n];
}
function Aa(e) {
	var t = e.read_shift(4), n = e.l, r = !1;
	t > 24 && (e.l += t - 24, e.read_shift(16) === "795881f43b1d7f48af2c825dc4852763" && (r = !0), e.l = n);
	var i = e.read_shift((r ? t - 24 : t) >> 1, "utf16le").replace(U, "");
	return r && (e.l += 24), i;
}
function ja(e) {
	for (var t = e.read_shift(2), n = ""; t-- > 0;) n += "../";
	var r = e.read_shift(0, "lpstr-ansi");
	if (e.l += 2, e.read_shift(2) != 57005) throw Error("Bad FileMoniker");
	if (e.read_shift(4) === 0) return n + r.replace(/\\/g, "/");
	var i = e.read_shift(4);
	if (e.read_shift(2) != 3) throw Error("Bad FileMoniker");
	var a = e.read_shift(i >> 1, "utf16le").replace(U, "");
	return n + a;
}
function Ma(e, t) {
	var n = e.read_shift(16);
	switch (t -= 16, n) {
		case "e0c9ea79f9bace118c8200aa004ba90b": return Aa(e, t);
		case "0303000000000000c000000000000046": return ja(e, t);
		default: throw Error("Unsupported Moniker " + n);
	}
}
function Na(e) {
	var t = e.read_shift(4);
	return t > 0 ? e.read_shift(t, "utf16le").replace(U, "") : "";
}
function Pa(e, t) {
	var n = e.l + t, r = e.read_shift(4);
	if (r !== 2) throw Error("Unrecognized streamVersion: " + r);
	var i = e.read_shift(2);
	e.l += 2;
	var a, o, s, c, l = "", u, d;
	i & 16 && (a = Na(e, n - e.l)), i & 128 && (o = Na(e, n - e.l)), (i & 257) == 257 && (s = Na(e, n - e.l)), (i & 257) == 1 && (c = Ma(e, n - e.l)), i & 8 && (l = Na(e, n - e.l)), i & 32 && (u = e.read_shift(16)), i & 64 && (d = na(e)), e.l = n;
	var f = o || s || c || "";
	f && l && (f += "#" + l), f || (f = "#" + l), i & 2 && f.charAt(0) == "/" && f.charAt(1) != "/" && (f = "file://" + f);
	var p = { Target: f };
	return u && (p.guid = u), d && (p.time = d), a && (p.Tooltip = a), p;
}
function Fa(e) {
	return [
		e.read_shift(1),
		e.read_shift(1),
		e.read_shift(1),
		e.read_shift(1)
	];
}
function Ia(e, t) {
	var n = Fa(e, t);
	return n[3] = 0, n;
}
function La(e, t, n) {
	var r = {
		r: e.read_shift(2),
		c: e.read_shift(2),
		ixfe: 0
	};
	return n && n.biff == 2 || t == 7 ? (r.ixfe = e.read_shift(1) & 63, e.l += 2) : r.ixfe = e.read_shift(2), r;
}
function Ra(e) {
	var t = e.read_shift(2), n = e.read_shift(2);
	return e.l += 8, {
		type: t,
		flags: n
	};
}
function za(e, t, n) {
	return t === 0 ? "" : Oa(e, t, n);
}
function Ba(e, t, n) {
	var r = n.biff > 8 ? 4 : 2;
	return [
		e.read_shift(r),
		e.read_shift(r, "i"),
		e.read_shift(r, "i")
	];
}
function Va(e) {
	return [e.read_shift(2), si(e)];
}
function Ha(e, t, n) {
	e.l += 4, t -= 4;
	var r = e.l + t, i = wa(e, t, n), a = e.read_shift(2);
	if (r -= e.l, a !== r) throw Error("Malformed AddinUdf: padding = " + r + " != " + a);
	return e.l += a, i;
}
function Ua(e) {
	var t = e.read_shift(2), n = e.read_shift(2), r = e.read_shift(2), i = e.read_shift(2);
	return {
		s: {
			c: r,
			r: t
		},
		e: {
			c: i,
			r: n
		}
	};
}
function Wa(e) {
	var t = e.read_shift(2), n = e.read_shift(2), r = e.read_shift(1), i = e.read_shift(1);
	return {
		s: {
			c: r,
			r: t
		},
		e: {
			c: i,
			r: n
		}
	};
}
var Ga = Wa;
function Ka(e) {
	e.l += 4;
	var t = e.read_shift(2), n = e.read_shift(2), r = e.read_shift(2);
	return e.l += 12, [
		n,
		t,
		r
	];
}
function qa(e) {
	var t = {};
	return e.l += 4, e.l += 16, t.fSharedNote = e.read_shift(2), e.l += 4, t;
}
function Ja(e) {
	return e.l += 4, e.cf = e.read_shift(2), {};
}
function Ya(e) {
	e.l += 2, e.l += e.read_shift(2);
}
var Xa = {
	0: Ya,
	4: Ya,
	5: Ya,
	6: Ya,
	7: Ja,
	8: Ya,
	9: Ya,
	10: Ya,
	11: Ya,
	12: Ya,
	13: qa,
	14: Ya,
	15: Ya,
	16: Ya,
	17: Ya,
	18: Ya,
	19: Ya,
	20: Ya,
	21: Ka
};
function Za(e, t) {
	for (var n = e.l + t, r = []; e.l < n;) {
		var i = e.read_shift(2);
		e.l -= 2;
		try {
			r[i] = Xa[i](e, n - e.l);
		} catch {
			return e.l = n, r;
		}
	}
	return e.l != n && (e.l = n), r;
}
function Qa(e, t) {
	var n = {
		BIFFVer: 0,
		dt: 0
	};
	switch (n.BIFFVer = e.read_shift(2), t -= 2, t >= 2 && (n.dt = e.read_shift(2), e.l -= 2), n.BIFFVer) {
		case 1536:
		case 1280:
		case 1024:
		case 768:
		case 512:
		case 2:
		case 7: break;
		default: if (t > 6) throw Error("Unexpected BIFF Ver " + n.BIFFVer);
	}
	return e.read_shift(t), n;
}
function $a(e, t) {
	return t === 0 || e.read_shift(2), 1200;
}
function eo(e, t, n) {
	if (n.enc) return e.l += t, "";
	var r = e.l, i = Oa(e, 0, n);
	return e.read_shift(t + r - e.l), i;
}
function to(e, t, n) {
	var r = n && n.biff == 8 || t == 2 ? e.read_shift(2) : (e.l += t, 0);
	return {
		fDialog: r & 16,
		fBelow: r & 64,
		fRight: r & 128
	};
}
function no(e, t, n) {
	var r = "";
	if (n.biff == 4) return r = wa(e, 0, n), r.length === 0 && (r = "Sheet1"), { name: r };
	var i = e.read_shift(4), a = e.read_shift(1) & 3, o = e.read_shift(1);
	switch (o) {
		case 0:
			o = "Worksheet";
			break;
		case 1:
			o = "Macrosheet";
			break;
		case 2:
			o = "Chartsheet";
			break;
		case 6:
			o = "VBAModule";
			break;
	}
	return r = wa(e, 0, n), r.length === 0 && (r = "Sheet1"), {
		pos: i,
		hs: a,
		dt: o,
		name: r
	};
}
function ro(e, t) {
	for (var n = e.l + t, r = e.read_shift(4), i = e.read_shift(4), a = [], o = 0; o != i && e.l < n; ++o) a.push(Ta(e));
	return a.Count = r, a.Unique = i, a;
}
function io(e, t) {
	var n = {};
	return n.dsst = e.read_shift(2), e.l += t - 2, n;
}
function ao(e) {
	var t = {};
	t.r = e.read_shift(2), t.c = e.read_shift(2), t.cnt = e.read_shift(2) - t.c;
	var n = e.read_shift(2);
	e.l += 4;
	var r = e.read_shift(1);
	e.l += 1;
	var i = e.read_shift(2);
	return t.ixfe = i & 4095, t.flags = i >> 12 & 15, r & 7 && (t.level = r & 7), r & 32 && (t.hidden = !0), r & 64 && (t.hpt = n / 20), t;
}
function oo(e) {
	var t = Ra(e);
	if (t.type != 2211) throw Error("Invalid Future Record " + t.type);
	return e.read_shift(4) !== 0;
}
function so(e) {
	return e.read_shift(2), e.read_shift(4);
}
function co(e, t, n) {
	var r = 0;
	n && n.biff == 2 || (r = e.read_shift(2));
	var i = e.read_shift(2);
	return n && n.biff == 2 && (r = 1 - (i >> 15), i &= 32767), [{
		Unsynced: r & 1,
		DyZero: (r & 2) >> 1,
		ExAsc: (r & 4) >> 2,
		ExDsc: (r & 8) >> 3
	}, i];
}
function lo(e) {
	var t = e.read_shift(2), n = e.read_shift(2), r = e.read_shift(2), i = e.read_shift(2), a = e.read_shift(2), o = e.read_shift(2), s = e.read_shift(2), c = e.read_shift(2), l = e.read_shift(2);
	return {
		Pos: [t, n],
		Dim: [r, i],
		Flags: a,
		CurTab: o,
		FirstTab: s,
		Selected: c,
		TabRatio: l
	};
}
function uo(e, t, n) {
	return n && n.biff >= 2 && n.biff < 5 ? {} : { RTL: e.read_shift(2) & 64 };
}
function fo() {}
function po(e, t, n) {
	var r = e.l + t, i = {
		dyHeight: e.read_shift(2),
		fl: e.read_shift(2)
	};
	switch (i.sz = i.dyHeight / 20, i.italic = !!(i.fl & 2), i.strike = !!(i.fl & 8), i.outline = !!(i.fl & 16), i.shadow = !!(i.fl & 32), i.condense = !!(i.fl & 64), i.extend = !!(i.fl & 128), n && n.biff || 8) {
		case 2: break;
		case 3:
		case 4:
			i.icv = e.read_shift(2);
			break;
		default:
			i.icv = e.read_shift(2), i.bls = e.read_shift(2), i.bold = i.bls >= 700, i.vertAlign = e.read_shift(2), i.underline = e.read_shift(1), i.family = e.read_shift(1), i.charset = e.read_shift(1), e.l++;
			break;
	}
	return i.name = e.l < r ? wa(e, r - e.l, n) : "", i;
}
function mo(e, t, n) {
	var r = La(e, t, n);
	return r.isst = e.read_shift(4), r;
}
function ho(e, t, n) {
	n.biffguess && n.biff == 2 && (n.biff = 5);
	var r = e.l + t, i = La(e, t, n);
	return i.val = Da(e, r - e.l, n), i;
}
function go(e, t, n) {
	return [e.read_shift(2), Oa(e, 0, n)];
}
var _o = Oa;
function vo(e, t, n) {
	var r = e.l + t, i = n.biff == 8 || !n.biff ? 4 : 2, a = e.read_shift(i), o = e.read_shift(i), s = e.read_shift(2), c = e.read_shift(2);
	return e.l = r, {
		s: {
			r: a,
			c: s
		},
		e: {
			r: o,
			c
		}
	};
}
function yo(e) {
	var t = e.read_shift(2), n = e.read_shift(2), r = Va(e);
	return {
		r: t,
		c: n,
		ixfe: r[0],
		rknum: r[1]
	};
}
function bo(e, t) {
	for (var n = e.l + t - 2, r = e.read_shift(2), i = e.read_shift(2), a = []; e.l < n;) a.push(Va(e));
	if (e.l !== n) throw Error("MulRK read error");
	var o = e.read_shift(2);
	if (a.length != o - i + 1) throw Error("MulRK length mismatch");
	return {
		r,
		c: i,
		C: o,
		rkrec: a
	};
}
function xo(e, t) {
	for (var n = e.l + t - 2, r = e.read_shift(2), i = e.read_shift(2), a = []; e.l < n;) a.push(e.read_shift(2));
	if (e.l !== n) throw Error("MulBlank read error");
	var o = e.read_shift(2);
	if (a.length != o - i + 1) throw Error("MulBlank length mismatch");
	return {
		r,
		c: i,
		C: o,
		ixfe: a
	};
}
function So(e, t, n, r) {
	var i = {}, a = e.read_shift(4), o = e.read_shift(4), s = e.read_shift(4), c = e.read_shift(2);
	return i.patternType = Mi[s >> 26], i.alc = a & 7, i.fWrap = a >> 3 & 1, i.alcV = a >> 4 & 7, i.fJustLast = a >> 7 & 1, i.trot = a >> 8 & 255, i.cIndent = a >> 16 & 15, i.fShrinkToFit = a >> 20 & 1, i.iReadOrder = a >> 22 & 2, i.fAtrNum = a >> 26 & 1, i.fAtrFnt = a >> 27 & 1, i.fAtrAlc = a >> 28 & 1, i.fAtrBdr = a >> 29 & 1, i.fAtrPat = a >> 30 & 1, i.fAtrProt = a >> 31 & 1, i.dgLeft = o & 15, i.dgRight = o >> 4 & 15, i.dgTop = o >> 8 & 15, i.dgBottom = o >> 12 & 15, i.icvLeft = o >> 16 & 127, i.icvRight = o >> 23 & 127, i.grbitDiag = o >> 30 & 3, i.icvTop = s & 127, i.icvBottom = s >> 7 & 127, i.icvDiag = s >> 14 & 127, i.dgDiag = s >> 21 & 15, i.icvFore = c & 127, i.icvBack = c >> 7 & 127, i.fsxButton = c >> 14 & 1, i;
}
function Co(e, t, n) {
	var r = {};
	return r.ifnt = e.read_shift(2), r.numFmtId = e.read_shift(2), r.flags = e.read_shift(2), r.locked = !!(r.flags & 1), r.hidden = !!(r.flags & 2), r.fStyle = r.flags >> 2 & 1, r.xfId = r.ixfeParent = r.flags >> 4 & 4095, t -= 6, r.data = So(e, t, r.fStyle, n), r;
}
function wo(e) {
	var t = {};
	return t.ifnt = e.read_shift(1), e.l++, t.flags = e.read_shift(1), t.numFmtId = t.flags & 63, t.flags >>= 6, t.fStyle = 0, t.data = {}, t;
}
function To(e) {
	var t = {};
	return t.ifnt = e.read_shift(1), t.numFmtId = e.read_shift(1), t.flags = e.read_shift(2), t.fStyle = t.flags >> 2 & 1, t.data = {}, t;
}
function Eo(e) {
	var t = {};
	return t.ifnt = e.read_shift(1), t.numFmtId = e.read_shift(1), t.flags = e.read_shift(2), t.fStyle = t.flags >> 2 & 1, t.data = {}, t;
}
function Do(e) {
	e.l += 4;
	var t = [e.read_shift(2), e.read_shift(2)];
	if (t[0] !== 0 && t[0]--, t[1] !== 0 && t[1]--, t[0] > 7 || t[1] > 7) throw Error("Bad Gutters: " + t.join("|"));
	return t;
}
function Oo(e, t, n) {
	var r = La(e, 6, n), i = Ca(e, 2);
	return r.val = i, r.t = i === !0 || i === !1 ? "b" : "e", r;
}
function ko(e, t, n) {
	n.biffguess && n.biff == 2 && (n.biff = 5);
	var r = La(e, 6, n);
	return r.val = ui(e, 8), r;
}
var Ao = za;
function jo(e, t, n) {
	var r = e.l + t, i = e.read_shift(2), a = e.read_shift(2);
	if (n.sbcch = a, a == 1025 || a == 14849) return [a, i];
	if (a < 1 || a > 255) throw Error("Unexpected SupBook type: " + a);
	for (var o = Ea(e, a), s = []; r > e.l;) s.push(Da(e, r - e.l, n));
	return [
		a,
		i,
		o,
		s
	];
}
function Mo(e, t, n) {
	var r = e.read_shift(2), i, a = {
		fBuiltIn: r & 1,
		fWantAdvise: r >>> 1 & 1,
		fWantPict: r >>> 2 & 1,
		fOle: r >>> 3 & 1,
		fOleLink: r >>> 4 & 1,
		cf: r >>> 5 & 1023,
		fIcon: r >>> 15 & 1
	};
	return n.sbcch === 14849 && (i = Ha(e, t - 2, n)), a.body = i || e.read_shift(t - 2), typeof i == "string" && (a.Name = i), a;
}
function No(e, t, n) {
	var r = e.l + t, i = e.read_shift(2), a = e.read_shift(1), o = e.read_shift(1), s = e.read_shift(n && n.biff == 2 ? 1 : 2), c = 0;
	(!n || n.biff >= 5) && (n.biff != 5 && (e.l += 2), c = e.read_shift(2), n.biff == 5 && (e.l += 2), e.l += 4);
	var l = Ea(e, o, n);
	i & 32 && (l = Li[l.charCodeAt(0)]);
	var u = r - e.l;
	n && n.biff == 2 && --u;
	var d = r == e.l || s === 0 || !(u > 0) ? [] : Jd(e, u, n, s);
	return {
		chKey: a,
		Name: l,
		itab: c,
		rgce: d
	};
}
function Po(e, t, n) {
	if (n.biff < 8 || !(n.biff > 8) && t == e[e.l] + +(e[e.l + 1] == 3) + 1) return Fo(e, t, n);
	for (var r = [], i = e.l + t, a = e.read_shift(n.biff > 8 ? 4 : 2); a-- !== 0;) r.push(Ba(e, n.biff > 8 ? 12 : 6, n));
	if (e.l != i) throw Error("Bad ExternSheet: " + e.l + " != " + i);
	return r;
}
function Fo(e, t, n) {
	e[e.l + 1] == 3 && e[e.l]++;
	var r = wa(e, t, n);
	return r.charCodeAt(0) == 3 ? r.slice(1) : r;
}
function Io(e, t, n) {
	if (n.biff < 8) {
		e.l += t;
		return;
	}
	var r = e.read_shift(2), i = e.read_shift(2);
	return [Ea(e, r, n), Ea(e, i, n)];
}
function Lo(e, t, n) {
	var r = Wa(e, 6);
	e.l++;
	var i = e.read_shift(1);
	return t -= 8, [
		Yd(e, t, n),
		i,
		r
	];
}
function Ro(e, t, n) {
	var r = Ga(e, 6);
	switch (n.biff) {
		case 2:
			e.l++, t -= 7;
			break;
		case 3:
		case 4:
			e.l += 2, t -= 8;
			break;
		default: e.l += 6, t -= 12;
	}
	return [r, Kd(e, t, n, r)];
}
function zo(e) {
	return [
		e.read_shift(4) !== 0,
		e.read_shift(4) !== 0,
		e.read_shift(4)
	];
}
function Bo(e, t, n) {
	var r = e.read_shift(2), i = e.read_shift(2), a = e.read_shift(2), o = e.read_shift(2), s = Oa(e, 0, n);
	return [
		{
			r,
			c: i
		},
		s,
		o,
		a
	];
}
function Vo(e, t, n) {
	if (n && n.biff < 8) {
		var r = e.read_shift(2), i = e.read_shift(2);
		if (r == 65535 || r == -1) return;
		var a = e.read_shift(2), o = e.read_shift(Math.min(a, 2048), "cpstr");
		return [{
			r,
			c: i
		}, o];
	}
	return Bo(e, t, n);
}
function Ho(e, t) {
	for (var n = [], r = e.read_shift(2); r--;) n.push(Ua(e, t));
	return n;
}
function Uo(e, t, n) {
	if (n && n.biff < 8) return Go(e, t, n);
	var r = Ka(e, 22);
	return {
		cmo: r,
		ft: Za(e, t - 22, r[1])
	};
}
var Wo = { 8: function(e, t) {
	var n = e.l + t;
	e.l += 10;
	var r = e.read_shift(2);
	e.l += 4, e.l += 2, e.l += 2, e.l += 2, e.l += 4;
	var i = e.read_shift(1);
	return e.l += i, e.l = n, { fmt: r };
} };
function Go(e, t, n) {
	e.l += 4;
	var r = e.read_shift(2), i = e.read_shift(2), a = e.read_shift(2);
	e.l += 2, e.l += 2, e.l += 2, e.l += 2, e.l += 2, e.l += 2, e.l += 2, e.l += 2, e.l += 2, e.l += 6, t -= 36;
	var o = [];
	return o.push((Wo[r] || xr)(e, t, n)), {
		cmo: [
			i,
			r,
			a
		],
		ft: o
	};
}
function Ko(e, t, n) {
	var r = e.l, i = "";
	try {
		e.l += 4;
		var a = (n.lastobj || { cmo: [0, 0] }).cmo[1];
		[
			0,
			5,
			7,
			11,
			12,
			14
		].indexOf(a) == -1 ? e.l += 6 : ka(e, 6, n);
		var o = e.read_shift(2);
		e.read_shift(2), xa(e, 2);
		var s = e.read_shift(2);
		e.l += s;
		for (var c = 1; c < e.lens.length - 1; ++c) {
			if (e.l - r != e.lens[c]) throw Error("TxO: bad continue record");
			var l = e[e.l], u = Ea(e, e.lens[c + 1] - e.lens[c] - 1);
			if (i += u, i.length >= (l ? o : 2 * o)) break;
		}
		if (i.length !== o && i.length !== o * 2) throw Error("cchText: " + o + " != " + i.length);
		return e.l = r + t, { t: i };
	} catch {
		return e.l = r + t, { t: i };
	}
}
function qo(e, t) {
	var n = Ua(e, 8);
	return e.l += 16, [n, Pa(e, t - 24)];
}
function Jo(e, t) {
	e.read_shift(2);
	var n = Ua(e, 8), r = e.read_shift((t - 10) / 2, "dbcs-cont");
	return r = r.replace(U, ""), [n, r];
}
function Yo(e) {
	var t = [0, 0], n = e.read_shift(2);
	return t[0] = ji[n] || n, n = e.read_shift(2), t[1] = ji[n] || n, t;
}
function Xo(e) {
	for (var t = e.read_shift(2), n = []; t-- > 0;) n.push(Ia(e, 8));
	return n;
}
function Zo(e) {
	for (var t = e.read_shift(2), n = []; t-- > 0;) n.push(Ia(e, 8));
	return n;
}
function Qo(e) {
	e.l += 2;
	var t = {
		cxfs: 0,
		crc: 0
	};
	return t.cxfs = e.read_shift(2), t.crc = e.read_shift(4), t;
}
function $o(e, t, n) {
	if (!n.cellStyles) return xr(e, t);
	var r = n && n.biff >= 12 ? 4 : 2, i = e.read_shift(r), a = e.read_shift(r), o = e.read_shift(r), s = e.read_shift(r), c = e.read_shift(2);
	r == 2 && (e.l += 2);
	var l = {
		s: i,
		e: a,
		w: o,
		ixfe: s,
		flags: c
	};
	return (n.biff >= 5 || !n.biff) && (l.level = c >> 8 & 7), l;
}
function es(e, t) {
	var n = {};
	return t < 32 ? n : (e.l += 16, n.header = ui(e, 8), n.footer = ui(e, 8), e.l += 2, n);
}
function ts(e, t, n) {
	var r = { area: !1 };
	if (n.biff != 5) return e.l += t, r;
	var i = e.read_shift(1);
	return e.l += 3, i & 16 && (r.area = !0), r;
}
var ns = La, rs = Sa, is = Da;
function as(e) {
	var t = e.read_shift(2), n = e.read_shift(2), r = e.read_shift(4), i = {
		fmt: t,
		env: n,
		len: r,
		data: e.slice(e.l, e.l + r)
	};
	return e.l += r, i;
}
function os(e, t, n) {
	n.biffguess && n.biff == 5 && (n.biff = 2);
	var r = La(e, 7, n), i = Oa(e, t - 7, n);
	return r.t = "str", r.val = i, r;
}
function ss(e, t, n) {
	var r = La(e, 7, n), i = ui(e, 8);
	return r.t = "n", r.val = i, r;
}
function cs(e, t, n) {
	var r = La(e, 7, n), i = e.read_shift(2);
	return r.t = "n", r.val = i, r;
}
function ls(e) {
	var t = e.read_shift(1);
	return t === 0 ? (e.l++, "") : e.read_shift(t, "sbcs-cont");
}
function us(e, t, n) {
	var r = e.l + 7, i = La(e, 6, n);
	e.l = r;
	var a = Ca(e, 2);
	return i.val = a, i.t = a === !0 || a === !1 ? "b" : "e", i;
}
function ds(e, t) {
	e.l += 6, e.l += 2, e.l += 1, e.l += 3, e.l += 1, e.l += t - 13;
}
function fs(e, t, n) {
	var r = e.l + t, i = La(e, 6, n), a = Ea(e, e.read_shift(2), n);
	return e.l = r, i.t = "str", i.val = a, i;
}
function ps(e) {
	var t = e.read_shift(4), n = e.read_shift(1), r = e.read_shift(n, "sbcs");
	return r.length === 0 && (r = "Sheet1"), {
		flags: t,
		name: r
	};
}
var ms = [
	2,
	3,
	48,
	49,
	131,
	139,
	140,
	245
], hs = /*#__PURE__*/ (function() {
	var e = {
		1: 437,
		2: 850,
		3: 1252,
		4: 1e4,
		100: 852,
		101: 866,
		102: 865,
		103: 861,
		104: 895,
		105: 620,
		106: 737,
		107: 857,
		120: 950,
		121: 949,
		122: 936,
		123: 932,
		124: 874,
		125: 1255,
		126: 1256,
		150: 10007,
		151: 10029,
		152: 10006,
		200: 1250,
		201: 1251,
		202: 1254,
		203: 1253,
		0: 20127,
		8: 865,
		9: 437,
		10: 850,
		11: 437,
		13: 437,
		14: 850,
		15: 437,
		16: 850,
		17: 437,
		18: 850,
		19: 932,
		20: 850,
		21: 437,
		22: 850,
		23: 865,
		24: 437,
		25: 437,
		26: 850,
		27: 437,
		28: 863,
		29: 850,
		31: 852,
		34: 852,
		35: 852,
		36: 860,
		37: 850,
		38: 866,
		55: 850,
		64: 852,
		77: 936,
		78: 949,
		79: 950,
		80: 874,
		87: 1252,
		88: 1252,
		89: 1252,
		108: 863,
		134: 737,
		135: 852,
		136: 857,
		204: 1257,
		255: 16969
	}, t = ut({
		1: 437,
		2: 850,
		3: 1252,
		4: 1e4,
		100: 852,
		101: 866,
		102: 865,
		103: 861,
		104: 895,
		105: 620,
		106: 737,
		107: 857,
		120: 950,
		121: 949,
		122: 936,
		123: 932,
		124: 874,
		125: 1255,
		126: 1256,
		150: 10007,
		151: 10029,
		152: 10006,
		200: 1250,
		201: 1251,
		202: 1254,
		203: 1253,
		0: 20127
	});
	function n(t, n) {
		var r = [], i = I(1);
		switch (n.type) {
			case "base64":
				i = R(M(t));
				break;
			case "binary":
				i = R(t);
				break;
			case "buffer":
			case "array":
				i = t;
				break;
		}
		br(i, 0);
		var a = i.read_shift(1), o = !!(a & 136), s = !1, c = !1;
		switch (a) {
			case 2: break;
			case 3: break;
			case 48:
				s = !0, o = !0;
				break;
			case 49:
				s = !0, o = !0;
				break;
			case 131: break;
			case 139: break;
			case 140:
				c = !0;
				break;
			case 245: break;
			default: throw Error("DBF Unsupported Version: " + a.toString(16));
		}
		var l = 0, u = 521;
		a == 2 && (l = i.read_shift(2)), i.l += 3, a != 2 && (l = i.read_shift(4)), l > 1048576 && (l = 1e6), a != 2 && (u = i.read_shift(2));
		var d = i.read_shift(2), f = n.codepage || 1252;
		a != 2 && (i.l += 16, i.read_shift(1), i[i.l] !== 0 && (f = e[i[i.l]]), i.l += 1, i.l += 2), c && (i.l += 36);
		for (var m = [], h = {}, g = Math.min(i.length, a == 2 ? 521 : u - 10 - (s ? 264 : 0)), _ = c ? 32 : 11; i.l < g && i[i.l] != 13;) switch (h = {}, h.name = (p === void 0 ? z(i.slice(i.l, i.l + _)) : p.utils.decode(f, i.slice(i.l, i.l + _))).replace(/[\u0000\r\n][\S\s]*$/g, ""), i.l += _, h.type = String.fromCharCode(i.read_shift(1)), a != 2 && !c && (h.offset = i.read_shift(4)), h.len = i.read_shift(1), a == 2 && (h.offset = i.read_shift(2)), h.dec = i.read_shift(1), h.name.length && m.push(h), a != 2 && (i.l += c ? 13 : 14), h.type) {
			case "B":
				(!s || h.len != 8) && n.WTF && console.log("Skipping " + h.name + ":" + h.type);
				break;
			case "G":
			case "P":
				n.WTF && console.log("Skipping " + h.name + ":" + h.type);
				break;
			case "+":
			case "0":
			case "@":
			case "C":
			case "D":
			case "F":
			case "I":
			case "L":
			case "M":
			case "N":
			case "O":
			case "T":
			case "Y": break;
			default: throw Error("Unknown Field Type: " + h.type);
		}
		if (i[i.l] !== 13 && (i.l = u - 1), i.read_shift(1) !== 13) throw Error("DBF Terminator not found " + i.l + " " + i[i.l]);
		i.l = u;
		var v = 0, y = 0;
		for (r[0] = [], y = 0; y != m.length; ++y) r[0][y] = m[y].name;
		for (; l-- > 0;) {
			if (i[i.l] === 42) {
				i.l += d;
				continue;
			}
			for (++i.l, r[++v] = [], y = 0, y = 0; y != m.length; ++y) {
				var b = i.slice(i.l, i.l + m[y].len);
				i.l += m[y].len, br(b, 0);
				var x = p === void 0 ? z(b) : p.utils.decode(f, b);
				switch (m[y].type) {
					case "C":
						x.trim().length && (r[v][y] = x.replace(/([^\s])\s+$/, "$1"));
						break;
					case "D":
						x.length === 8 ? (r[v][y] = new Date(Date.UTC(+x.slice(0, 4), x.slice(4, 6) - 1, +x.slice(6, 8), 0, 0, 0, 0)), n && n.UTC || (r[v][y] = Pt(r[v][y]))) : r[v][y] = x;
						break;
					case "F":
						r[v][y] = parseFloat(x.trim());
						break;
					case "+":
					case "I":
						r[v][y] = c ? b.read_shift(-4, "i") ^ 2147483648 : b.read_shift(4, "i");
						break;
					case "L":
						switch (x.trim().toUpperCase()) {
							case "Y":
							case "T":
								r[v][y] = !0;
								break;
							case "N":
							case "F":
								r[v][y] = !1;
								break;
							case "":
							case "\0":
							case "?": break;
							default: throw Error("DBF Unrecognized L:|" + x + "|");
						}
						break;
					case "M":
						if (!o) throw Error("DBF Unexpected MEMO for type " + a.toString(16));
						r[v][y] = "##MEMO##" + (c ? parseInt(x.trim(), 10) : b.read_shift(4));
						break;
					case "N":
						x = x.replace(/\u0000/g, "").trim(), x && x != "." && (r[v][y] = +x || 0);
						break;
					case "@":
						r[v][y] = /* @__PURE__ */ new Date(b.read_shift(-8, "f") - 621356832e5);
						break;
					case "T":
						var S = b.read_shift(4), C = b.read_shift(4);
						if (S == 0 && C == 0) break;
						r[v][y] = new Date((S - 2440588) * 864e5 + C), n && n.UTC || (r[v][y] = Pt(r[v][y]));
						break;
					case "Y":
						r[v][y] = b.read_shift(4, "i") / 1e4 + b.read_shift(4, "i") / 1e4 * 2 ** 32;
						break;
					case "O":
						r[v][y] = -b.read_shift(-8, "f");
						break;
					case "B": if (s && m[y].len == 8) {
						r[v][y] = b.read_shift(8, "f");
						break;
					}
					case "G":
					case "P":
						b.l += m[y].len;
						break;
					case "0": if (m[y].name === "_NullFlags") break;
					default: throw Error("DBF Unsupported data type " + m[y].type);
				}
			}
		}
		if (a != 2 && i.l < i.length && i[i.l++] != 26) throw Error("DBF EOF Marker missing " + (i.l - 1) + " of " + i.length + " " + i[i.l - 1].toString(16));
		return n && n.sheetRows && (r = r.slice(0, n.sheetRows)), n.DBF = m, r;
	}
	function r(e, t) {
		var r = t || {};
		r.dateNF || (r.dateNF = "yyyymmdd");
		var i = Yr(n(e, r), r);
		return i["!cols"] = r.DBF.map(function(e) {
			return {
				wch: e.len,
				DBF: e
			};
		}), delete r.DBF, i;
	}
	function i(e, t) {
		try {
			var n = Kr(r(e, t), t);
			return n.bookType = "dbf", n;
		} catch (e) {
			if (t && t.WTF) throw e;
		}
		return {
			SheetNames: [],
			Sheets: {}
		};
	}
	var a = {
		B: 8,
		C: 250,
		L: 1,
		D: 8,
		"?": 0,
		"": 0
	};
	function o(n, r) {
		if (!n["!ref"]) throw Error("Cannot export empty sheet to DBF");
		var i = r || {}, o = d;
		if (+i.codepage >= 0 && v(+i.codepage), i.type == "string") throw Error("Cannot write DBF to JS string");
		var s = wr(), c = yg(n, {
			header: 1,
			raw: !0,
			cellDates: !0
		}), l = c[0], u = c.slice(1), m = n["!cols"] || [], h = 0, g = 0, _ = 0, y = 1;
		for (h = 0; h < l.length; ++h) {
			if (((m[h] || {}).DBF || {}).name) {
				l[h] = m[h].DBF.name, ++_;
				continue;
			}
			if (l[h] != null) {
				if (++_, typeof l[h] == "number" && (l[h] = l[h].toString(10)), typeof l[h] != "string") throw Error("DBF Invalid column name " + l[h] + " |" + typeof l[h] + "|");
				if (l.indexOf(l[h]) !== h) {
					for (g = 0; g < 1024; ++g) if (l.indexOf(l[h] + "_" + g) == -1) {
						l[h] += "_" + g;
						break;
					}
				}
			}
		}
		var b = Ur(n["!ref"]), x = [], S = [], C = [];
		for (h = 0; h <= b.e.c - b.s.c; ++h) {
			var w = "", T = "", E = 0, D = [];
			for (g = 0; g < u.length; ++g) u[g][h] != null && D.push(u[g][h]);
			if (D.length == 0 || l[h] == null) {
				x[h] = "?";
				continue;
			}
			for (g = 0; g < D.length; ++g) {
				switch (typeof D[g]) {
					case "number":
						T = "B";
						break;
					case "string":
						T = "C";
						break;
					case "boolean":
						T = "L";
						break;
					case "object":
						T = D[g] instanceof Date ? "D" : "C";
						break;
					default: T = "C";
				}
				E = Math.max(E, (p !== void 0 && typeof D[g] == "string" ? p.utils.encode(f, D[g]) : String(D[g])).length), w = w && w != T ? "C" : T;
			}
			E > 250 && (E = 250), T = ((m[h] || {}).DBF || {}).type, T == "C" && m[h].DBF.len > E && (E = m[h].DBF.len), w == "B" && T == "N" && (w = "N", C[h] = m[h].DBF.dec, E = m[h].DBF.len), S[h] = w == "C" || T == "N" ? E : a[w] || 0, y += S[h], x[h] = w;
		}
		var O = s.next(32);
		for (O.write_shift(4, 318902576), O.write_shift(4, u.length), O.write_shift(2, 296 + 32 * _), O.write_shift(2, y), h = 0; h < 4; ++h) O.write_shift(4, 0);
		var k = +t[d] || 3;
		for (O.write_shift(4, 0 | k << 8), e[k] != +i.codepage && (i.codepage && console.error("DBF Unsupported codepage " + d + ", using 1252"), d = 1252), h = 0, g = 0; h < l.length; ++h) if (l[h] != null) {
			var A = s.next(32), j = (l[h].slice(-10) + "\0\0\0\0\0\0\0\0\0\0\0").slice(0, 11);
			A.write_shift(1, j, "sbcs"), A.write_shift(1, x[h] == "?" ? "C" : x[h], "sbcs"), A.write_shift(4, g), A.write_shift(1, S[h] || a[x[h]] || 0), A.write_shift(1, C[h] || 0), A.write_shift(1, 2), A.write_shift(4, 0), A.write_shift(1, 0), A.write_shift(4, 0), A.write_shift(4, 0), g += S[h] || a[x[h]] || 0;
		}
		var M = s.next(264);
		for (M.write_shift(4, 13), h = 0; h < 65; ++h) M.write_shift(4, 0);
		for (h = 0; h < u.length; ++h) {
			var N = s.next(y);
			for (N.write_shift(1, 0), g = 0; g < l.length; ++g) if (l[g] != null) switch (x[g]) {
				case "L":
					N.write_shift(1, u[h][g] == null ? 63 : u[h][g] ? 84 : 70);
					break;
				case "B":
					N.write_shift(8, u[h][g] || 0, "f");
					break;
				case "N":
					var P = "0";
					for (typeof u[h][g] == "number" && (P = u[h][g].toFixed(C[g] || 0)), P.length > S[g] && (P = P.slice(0, S[g])), _ = 0; _ < S[g] - P.length; ++_) N.write_shift(1, 32);
					N.write_shift(1, P, "sbcs");
					break;
				case "D":
					u[h][g] ? (N.write_shift(4, ("0000" + u[h][g].getFullYear()).slice(-4), "sbcs"), N.write_shift(2, ("00" + (u[h][g].getMonth() + 1)).slice(-2), "sbcs"), N.write_shift(2, ("00" + u[h][g].getDate()).slice(-2), "sbcs")) : N.write_shift(8, "00000000", "sbcs");
					break;
				case "C":
					var F = N.l, I = String(u[h][g] == null ? "" : u[h][g]).slice(0, S[g]);
					for (N.write_shift(1, I, "cpstr"), F += S[g] - N.l, _ = 0; _ < F; ++_) N.write_shift(1, 32);
					break;
			}
		}
		return d = o, s.next(1).write_shift(1, 26), s.end();
	}
	return {
		to_workbook: i,
		to_sheet: r,
		from_sheet: o
	};
})(), gs = /*#__PURE__*/ (function() {
	var e = {
		AA: "À",
		BA: "Á",
		CA: "Â",
		DA: 195,
		HA: "Ä",
		JA: 197,
		AE: "È",
		BE: "É",
		CE: "Ê",
		HE: "Ë",
		AI: "Ì",
		BI: "Í",
		CI: "Î",
		HI: "Ï",
		AO: "Ò",
		BO: "Ó",
		CO: "Ô",
		DO: 213,
		HO: "Ö",
		AU: "Ù",
		BU: "Ú",
		CU: "Û",
		HU: "Ü",
		Aa: "à",
		Ba: "á",
		Ca: "â",
		Da: 227,
		Ha: "ä",
		Ja: 229,
		Ae: "è",
		Be: "é",
		Ce: "ê",
		He: "ë",
		Ai: "ì",
		Bi: "í",
		Ci: "î",
		Hi: "ï",
		Ao: "ò",
		Bo: "ó",
		Co: "ô",
		Do: 245,
		Ho: "ö",
		Au: "ù",
		Bu: "ú",
		Cu: "û",
		Hu: "ü",
		KC: "Ç",
		Kc: "ç",
		q: "æ",
		z: "œ",
		a: "Æ",
		j: "Œ",
		DN: 209,
		Dn: 241,
		Hy: 255,
		S: 169,
		c: 170,
		R: 174,
		"B ": 180,
		0: 176,
		1: 177,
		2: 178,
		3: 179,
		5: 181,
		6: 182,
		7: 183,
		Q: 185,
		k: 186,
		b: 208,
		i: 216,
		l: 222,
		s: 240,
		y: 248,
		"!": 161,
		"\"": 162,
		"#": 163,
		"(": 164,
		"%": 165,
		"'": 167,
		"H ": 168,
		"+": 171,
		";": 187,
		"<": 188,
		"=": 189,
		">": 190,
		"?": 191,
		"{": 223
	}, t = RegExp("\x1BN(" + lt(e).join("|").replace(/\|\|\|/, "|\\||").replace(/([?()+])/g, "\\$1").replace("{", "\\{") + "|\\|)", "gm");
	try {
		t = RegExp("\x1BN(" + lt(e).join("|").replace(/\|\|\|/, "|\\||").replace(/([?()+])/g, "\\$1") + "|\\|)", "gm");
	} catch {}
	var n = function(t, n) {
		var r = e[n];
		return typeof r == "number" ? E(r) : r;
	}, r = function(e, t, n) {
		var r = t.charCodeAt(0) - 32 << 4 | n.charCodeAt(0) - 48;
		return r == 59 ? e : E(r);
	};
	e["|"] = 254;
	var i = function(e) {
		return e.replace(/\n/g, "\x1B :").replace(/\r/g, "\x1B =");
	};
	function a(e, t) {
		switch (t.type) {
			case "base64": return o(M(e), t);
			case "binary": return o(e, t);
			case "buffer": return o(N && Buffer.isBuffer(e) ? e.toString("binary") : z(e), t);
			case "array": return o(xt(e), t);
		}
		throw Error("Unrecognized type " + t.type);
	}
	function o(e, i) {
		var a = e.split(/[\n\r]+/), o = -1, s = -1, c = 0, l = 0, u = [], d = [], f = null, m = {}, h = [], g = [], _ = [], y = 0, b, x = { Workbook: {
			WBProps: {},
			Names: []
		} };
		for (+i.codepage >= 0 && v(+i.codepage); c !== a.length; ++c) {
			y = 0;
			var S = a[c].trim().replace(/\x1B([\x20-\x2F])([\x30-\x3F])/g, r).replace(t, n), C = S.replace(/;;/g, "\0").split(";").map(function(e) {
				return e.replace(/\u0000/g, ";");
			}), w = C[0], T;
			if (S.length > 0) switch (w) {
				case "ID": break;
				case "E": break;
				case "B": break;
				case "O":
					for (l = 1; l < C.length; ++l) switch (C[l].charAt(0)) {
						case "V":
							var E = parseInt(C[l].slice(1), 10);
							E >= 1 && E <= 4 && (x.Workbook.WBProps.date1904 = !0);
							break;
					}
					break;
				case "W": break;
				case "P":
					switch (C[1].charAt(0)) {
						case "P":
							d.push(S.slice(3).replace(/;;/g, ";"));
							break;
					}
					break;
				case "NN":
					var D = { Sheet: 0 };
					for (l = 1; l < C.length; ++l) switch (C[l].charAt(0)) {
						case "N":
							D.Name = C[l].slice(1);
							break;
						case "E":
							D.Ref = (i && i.sheet || "Sheet1") + "!" + uu(C[l].slice(1));
							break;
					}
					x.Workbook.Names.push(D);
					break;
				case "C":
					var O = !1, k = !1, A = !1, j = !1, M = -1, N = -1, P = "", F = "z", I = "";
					for (l = 1; l < C.length; ++l) switch (C[l].charAt(0)) {
						case "A":
							I = C[l].slice(1);
							break;
						case "X":
							s = parseInt(C[l].slice(1), 10) - 1, k = !0;
							break;
						case "Y":
							for (o = parseInt(C[l].slice(1), 10) - 1, k || (s = 0), b = u.length; b <= o; ++b) u[b] = [];
							break;
						case "K":
							T = C[l].slice(1), T.charAt(0) === "\"" ? (T = T.slice(1, T.length - 1), F = "s") : T === "TRUE" || T === "FALSE" ? (T = T === "TRUE", F = "b") : T.charAt(0) == "#" && Ii[T] != null ? (F = "e", T = Ii[T]) : isNaN(wt(T)) || (T = wt(T), F = "n", f !== null && Ge(f) && i.cellDates && (T = ht(x.Workbook.WBProps.date1904 ? T + 1462 : T), F = typeof T == "number" ? "n" : "d")), p !== void 0 && typeof T == "string" && (i || {}).type != "string" && (i || {}).codepage && (T = p.utils.decode(i.codepage, T)), O = !0;
							break;
						case "E":
							j = !0, P = uu(C[l].slice(1), {
								r: o,
								c: s
							});
							break;
						case "S":
							A = !0;
							break;
						case "G": break;
						case "R":
							M = parseInt(C[l].slice(1), 10) - 1;
							break;
						case "C":
							N = parseInt(C[l].slice(1), 10) - 1;
							break;
						default: if (i && i.WTF) throw Error("SYLK bad record " + S);
					}
					if (O && (u[o][s] ? (u[o][s].t = F, u[o][s].v = T) : u[o][s] = {
						t: F,
						v: T
					}, f && (u[o][s].z = f), i.cellText !== !1 && f && (u[o][s].w = Xe(u[o][s].z, u[o][s].v, { date1904: x.Workbook.WBProps.date1904 })), f = null), A) {
						if (j) throw Error("SYLK shared formula cannot have own formula");
						var L = M > -1 && u[M][N];
						if (!L || !L[1]) throw Error("SYLK shared formula cannot find base");
						P = pu(L[1], {
							r: o - M,
							c: s - N
						});
					}
					P && (u[o][s] ? u[o][s].f = P : u[o][s] = {
						t: "n",
						f: P
					}), I && (u[o][s] || (u[o][s] = { t: "z" }), u[o][s].c = [{
						a: "SheetJSYLK",
						t: I
					}]);
					break;
				case "F":
					var R = 0;
					for (l = 1; l < C.length; ++l) switch (C[l].charAt(0)) {
						case "X":
							s = parseInt(C[l].slice(1), 10) - 1, ++R;
							break;
						case "Y":
							for (o = parseInt(C[l].slice(1), 10) - 1, b = u.length; b <= o; ++b) u[b] = [];
							break;
						case "M":
							y = parseInt(C[l].slice(1), 10) / 20;
							break;
						case "F": break;
						case "G": break;
						case "P":
							f = d[parseInt(C[l].slice(1), 10)];
							break;
						case "S": break;
						case "D": break;
						case "N": break;
						case "W":
							for (_ = C[l].slice(1).split(" "), b = parseInt(_[0], 10); b <= parseInt(_[1], 10); ++b) y = parseInt(_[2], 10), g[b - 1] = y === 0 ? { hidden: !0 } : { wch: y };
							break;
						case "C":
							s = parseInt(C[l].slice(1), 10) - 1, g[s] || (g[s] = {});
							break;
						case "R":
							o = parseInt(C[l].slice(1), 10) - 1, h[o] || (h[o] = {}), y > 0 ? (h[o].hpt = y, h[o].hpx = Gc(y)) : y === 0 && (h[o].hidden = !0);
							break;
						default: if (i && i.WTF) throw Error("SYLK bad record " + S);
					}
					R < 1 && (f = null);
					break;
				default: if (i && i.WTF) throw Error("SYLK bad record " + S);
			}
		}
		return h.length > 0 && (m["!rows"] = h), g.length > 0 && (m["!cols"] = g), g.forEach(function(e) {
			Cc(e);
		}), i && i.sheetRows && (u = u.slice(0, i.sheetRows)), [
			u,
			m,
			x
		];
	}
	function s(e, t) {
		var n = a(e, t), r = n[0], i = n[1], o = n[2], s = St(t);
		s.date1904 = (((o || {}).Workbook || {}).WBProps || {}).date1904;
		var c = Yr(r, s);
		lt(i).forEach(function(e) {
			c[e] = i[e];
		});
		var l = Kr(c, t);
		return lt(o).forEach(function(e) {
			l[e] = o[e];
		}), l.bookType = "sylk", l;
	}
	function c(e, t, n, r, i, a) {
		var o = "C;Y" + (n + 1) + ";X" + (r + 1) + ";K";
		switch (e.t) {
			case "n":
				o += isFinite(e.v) ? e.v || 0 : Fi[isNaN(e.v) ? 36 : 7], e.f && !e.F && (o += ";E" + fu(e.f, {
					r: n,
					c: r
				}));
				break;
			case "b":
				o += e.v ? "TRUE" : "FALSE";
				break;
			case "e":
				o += e.w || Fi[e.v] || e.v;
				break;
			case "d":
				o += mt(bt(e.v, a), a);
				break;
			case "s":
				o += "\"" + (e.v == null ? "" : String(e.v)).replace(/"/g, "").replace(/;/g, ";;") + "\"";
				break;
		}
		return o;
	}
	function l(e, t, n) {
		var r = "C;Y" + (t + 1) + ";X" + (n + 1) + ";A";
		return r += i(e.map(function(e) {
			return e.t;
		}).join("")), r;
	}
	function u(e, t) {
		t.forEach(function(t, n) {
			var r = "F;W" + (n + 1) + " " + (n + 1) + " ";
			t.hidden ? r += "0" : (typeof t.width == "number" && !t.wpx && (t.wpx = vc(t.width)), typeof t.wpx == "number" && !t.wch && (t.wch = yc(t.wpx)), typeof t.wch == "number" && (r += Math.round(t.wch))), r.charAt(r.length - 1) != " " && e.push(r);
		});
	}
	function d(e, t) {
		t.forEach(function(t, n) {
			var r = "F;";
			t.hidden ? r += "M0;" : t.hpt ? r += "M" + 20 * t.hpt + ";" : t.hpx && (r += "M" + 20 * Wc(t.hpx) + ";"), r.length > 2 && e.push(r + "R" + (n + 1));
		});
	}
	function f(e, t, n) {
		t || (t = {}), t._formats = ["General"];
		var r = ["ID;PSheetJS;N;E"], i = [], a = Ur(e["!ref"] || "A1"), o, s = e["!data"] != null, f = "\r\n", p = (((n || {}).Workbook || {}).WBProps || {}).date1904, m = "General";
		r.push("P;PGeneral");
		var h = a.s.r, g = a.s.c, _ = [];
		if (e["!ref"]) {
			for (h = a.s.r; h <= a.e.r; ++h) if (!(s && !e["!data"][h])) {
				for (_ = [], g = a.s.c; g <= a.e.c; ++g) o = s ? e["!data"][h][g] : e[Pr(g) + Ar(h)], !(!o || !o.c) && _.push(l(o.c, h, g));
				_.length && i.push(_.join(f));
			}
		}
		if (e["!ref"]) {
			for (h = a.s.r; h <= a.e.r; ++h) if (!(s && !e["!data"][h])) {
				for (_ = [], g = a.s.c; g <= a.e.c; ++g) if (o = s ? e["!data"][h][g] : e[Pr(g) + Ar(h)], !(!o || o.v == null && (!o.f || o.F))) {
					if ((o.z || (o.t == "d" ? J[14] : "General")) != m) {
						var v = t._formats.indexOf(o.z);
						v == -1 && (t._formats.push(o.z), v = t._formats.length - 1, r.push("P;P" + o.z.replace(/;/g, ";;"))), _.push("F;P" + v + ";Y" + (h + 1) + ";X" + (g + 1));
					}
					_.push(c(o, e, h, g, t, p));
				}
				i.push(_.join(f));
			}
		}
		return r.push("F;P0;DG0G8;M255"), e["!cols"] && u(r, e["!cols"]), e["!rows"] && d(r, e["!rows"]), e["!ref"] && r.push("B;Y" + (a.e.r - a.s.r + 1) + ";X" + (a.e.c - a.s.c + 1) + ";D" + [
			a.s.c,
			a.s.r,
			a.e.c,
			a.e.r
		].join(" ")), r.push("O;L;D;B" + (p ? ";V4" : "") + ";K47;G100 0.001"), delete t._formats, r.join(f) + f + i.join(f) + f + "E" + f;
	}
	return {
		to_workbook: s,
		from_sheet: f
	};
})(), _s = /*#__PURE__*/ (function() {
	function e(e, n) {
		switch (n.type) {
			case "base64": return t(M(e), n);
			case "binary": return t(e, n);
			case "buffer": return t(N && Buffer.isBuffer(e) ? e.toString("binary") : z(e), n);
			case "array": return t(xt(e), n);
		}
		throw Error("Unrecognized type " + n.type);
	}
	function t(e, t) {
		for (var n = e.split("\n"), r = -1, i = -1, a = 0, o = []; a !== n.length; ++a) {
			if (n[a].trim() === "BOT") {
				o[++r] = [], i = 0;
				continue;
			}
			if (!(r < 0)) {
				var s = n[a].trim().split(","), c = s[0], l = s[1];
				++a;
				for (var u = n[a] || ""; (u.match(/["]/g) || []).length & 1 && a < n.length - 1;) u += "\n" + n[++a];
				switch (u = u.trim(), +c) {
					case -1:
						if (u === "BOT") {
							o[++r] = [], i = 0;
							continue;
						} else if (u !== "EOD") throw Error("Unrecognized DIF special command " + u);
						break;
					case 0:
						u === "TRUE" ? o[r][i] = !0 : u === "FALSE" ? o[r][i] = !1 : isNaN(wt(l)) ? isNaN(Mt(l).getDate()) ? o[r][i] = l : (o[r][i] = bt(l), t && t.UTC || (o[r][i] = Pt(o[r][i]))) : o[r][i] = wt(l), ++i;
						break;
					case 1:
						u = u.slice(1, u.length - 1), u = u.replace(/""/g, "\""), O && u && u.match(/^=".*"$/) && (u = u.slice(2, -1)), o[r][i++] = u === "" ? null : u;
						break;
				}
				if (u === "EOD") break;
			}
		}
		return t && t.sheetRows && (o = o.slice(0, t.sheetRows)), o;
	}
	function n(t, n) {
		return Yr(e(t, n), n);
	}
	function r(e, t) {
		var r = Kr(n(e, t), t);
		return r.bookType = "dif", r;
	}
	function i(e, t) {
		return "0," + String(e) + "\r\n" + t;
	}
	function a(e) {
		return "1,0\r\n\"" + e.replace(/"/g, "\"\"") + "\"";
	}
	function o(e) {
		var t = O;
		if (!e["!ref"]) throw Error("Cannot export empty sheet to DIF");
		for (var n = Ur(e["!ref"]), r = e["!data"] != null, o = [
			"TABLE\r\n0,1\r\n\"sheetjs\"\r\n",
			"VECTORS\r\n0," + (n.e.r - n.s.r + 1) + "\r\n\"\"\r\n",
			"TUPLES\r\n0," + (n.e.c - n.s.c + 1) + "\r\n\"\"\r\n",
			"DATA\r\n0,0\r\n\"\"\r\n"
		], s = n.s.r; s <= n.e.r; ++s) {
			for (var c = r ? e["!data"][s] : [], l = "-1,0\r\nBOT\r\n", u = n.s.c; u <= n.e.c; ++u) {
				var d = r ? c && c[u] : e[zr({
					r: s,
					c: u
				})];
				if (d == null) {
					l += "1,0\r\n\"\"\r\n";
					continue;
				}
				switch (d.t) {
					case "n":
						t ? d.w == null ? d.v == null ? d.f != null && !d.F ? l += a("=" + d.f) : l += "1,0\r\n\"\"" : l += i(d.v, "V") : l += "0," + d.w + "\r\nV" : d.v == null ? l += "1,0\r\n\"\"" : l += i(d.v, "V");
						break;
					case "b":
						l += d.v ? i(1, "TRUE") : i(0, "FALSE");
						break;
					case "s":
						l += a(!t || isNaN(+d.v) ? d.v : "=\"" + d.v + "\"");
						break;
					case "d":
						d.w || (d.w = Xe(d.z || J[14], mt(bt(d.v)))), t ? l += i(d.w, "V") : l += a(d.w);
						break;
					default: l += "1,0\r\n\"\"";
				}
				l += "\r\n";
			}
			o.push(l);
		}
		return o.join("") + "-1,0\r\nEOD";
	}
	return {
		to_workbook: r,
		to_sheet: n,
		from_sheet: o
	};
})(), vs = /*#__PURE__*/ (function() {
	function e(e) {
		return e.replace(/\\b/g, "\\").replace(/\\c/g, ":").replace(/\\n/g, "\n");
	}
	function t(e) {
		return e.replace(/\\/g, "\\b").replace(/:/g, "\\c").replace(/\n/g, "\\n");
	}
	function n(t, n) {
		for (var r = t.split("\n"), i = -1, a = -1, o = 0, s = []; o !== r.length; ++o) {
			var c = r[o].trim().split(":");
			if (c[0] === "cell") {
				var l = Rr(c[1]);
				if (s.length <= l.r) for (i = s.length; i <= l.r; ++i) s[i] || (s[i] = []);
				switch (i = l.r, a = l.c, c[2]) {
					case "t":
						s[i][a] = e(c[3]);
						break;
					case "v":
						s[i][a] = +c[3];
						break;
					case "vtf": var u = c[c.length - 1];
					case "vtc":
						switch (c[3]) {
							case "nl":
								s[i][a] = !!+c[4];
								break;
							default:
								s[i][a] = c[c.length - 1].charAt(0) == "#" ? {
									t: "e",
									v: Ii[c[c.length - 1]]
								} : +c[4];
								break;
						}
						c[2] == "vtf" && (s[i][a] = [s[i][a], u]);
				}
			}
		}
		return n && n.sheetRows && (s = s.slice(0, n.sheetRows)), s;
	}
	function r(e, t) {
		return Yr(n(e, t), t);
	}
	function i(e, t) {
		return Kr(r(e, t), t);
	}
	var a = [
		"socialcalc:version:1.5",
		"MIME-Version: 1.0",
		"Content-Type: multipart/mixed; boundary=SocialCalcSpreadsheetControlSave"
	].join("\n"), o = ["--SocialCalcSpreadsheetControlSave", "Content-type: text/plain; charset=UTF-8"].join("\n") + "\n", s = ["# SocialCalc Spreadsheet Control Save", "part:sheet"].join("\n"), c = "--SocialCalcSpreadsheetControlSave--";
	function l(e) {
		if (!e || !e["!ref"]) return "";
		for (var n = [], r = [], i, a = "", o = Br(e["!ref"]), s = e["!data"] != null, c = o.s.r; c <= o.e.r; ++c) for (var l = o.s.c; l <= o.e.c; ++l) if (a = zr({
			r: c,
			c: l
		}), i = s ? (e["!data"][c] || [])[l] : e[a], !(!i || i.v == null || i.t === "z")) {
			switch (r = [
				"cell",
				a,
				"t"
			], i.t) {
				case "s":
					r.push(t(i.v));
					break;
				case "b":
					r[2] = "vt" + (i.f ? "f" : "c"), r[3] = "nl", r[4] = i.v ? "1" : "0", r[5] = t(i.f || (i.v ? "TRUE" : "FALSE"));
					break;
				case "d":
					var u = mt(bt(i.v));
					r[2] = "vtc", r[3] = "nd", r[4] = "" + u, r[5] = i.w || Xe(i.z || J[14], u);
					break;
				case "n":
					isFinite(i.v) ? i.f ? (r[2] = "vtf", r[3] = "n", r[4] = i.v, r[5] = t(i.f)) : (r[2] = "v", r[3] = i.v) : (r[2] = "vt" + (i.f ? "f" : "c"), r[3] = "e" + Fi[isNaN(i.v) ? 36 : 7], r[4] = "0", r[5] = i.f || r[3].slice(1), r[6] = "e", r[7] = r[3].slice(1));
					break;
				case "e": continue;
			}
			n.push(r.join(":"));
		}
		return n.push("sheet:c:" + (o.e.c - o.s.c + 1) + ":r:" + (o.e.r - o.s.r + 1) + ":tvf:1"), n.push("valueformat:1:text-wiki"), n.join("\n");
	}
	function u(e) {
		return [
			a,
			o,
			s,
			o,
			l(e),
			c
		].join("\n");
	}
	return {
		to_workbook: i,
		to_sheet: r,
		from_sheet: u
	};
})(), ys = /*#__PURE__*/ (function() {
	function e(e, t, n, r, i) {
		i.raw ? t[n][r] = e : e === "" || (e === "TRUE" ? t[n][r] = !0 : e === "FALSE" ? t[n][r] = !1 : isNaN(wt(e)) ? isNaN(Mt(e).getDate()) ? e.charCodeAt(0) == 35 && Ii[e] != null ? t[n][r] = {
			t: "e",
			v: Ii[e],
			w: e
		} : t[n][r] = e : t[n][r] = bt(e) : t[n][r] = wt(e));
	}
	function t(t, n) {
		var r = n || {}, i = [];
		if (!t || t.length === 0) return i;
		for (var a = t.split(/[\r\n]/), o = a.length - 1; o >= 0 && a[o].length === 0;) --o;
		for (var s = 10, c = 0, l = 0; l <= o; ++l) c = a[l].indexOf(" "), c == -1 ? c = a[l].length : c++, s = Math.max(s, c);
		for (l = 0; l <= o; ++l) {
			i[l] = [];
			var u = 0;
			for (e(a[l].slice(0, s).trim(), i, l, u, r), u = 1; u <= (a[l].length - s) / 10 + 1; ++u) e(a[l].slice(s + (u - 1) * 10, s + u * 10).trim(), i, l, u, r);
		}
		return r.sheetRows && (i = i.slice(0, r.sheetRows)), i;
	}
	var n = {
		44: ",",
		9: "	",
		59: ";",
		124: "|"
	}, r = {
		44: 3,
		9: 2,
		59: 1,
		124: 0
	};
	function i(e) {
		for (var t = {}, i = !1, a = 0, o = 0; a < e.length; ++a) (o = e.charCodeAt(a)) == 34 ? i = !i : !i && o in n && (t[o] = (t[o] || 0) + 1);
		for (a in o = [], t) Object.prototype.hasOwnProperty.call(t, a) && o.push([t[a], a]);
		if (!o.length) for (a in t = r, t) Object.prototype.hasOwnProperty.call(t, a) && o.push([t[a], a]);
		return o.sort(function(e, t) {
			return e[0] - t[0] || r[e[1]] - r[t[1]];
		}), n[o.pop()[1]] || 44;
	}
	function a(e, t) {
		var n = t || {}, r = "";
		D != null && n.dense == null && (n.dense = D);
		var a = {};
		n.dense && (a["!data"] = []);
		var o = {
			s: {
				c: 0,
				r: 0
			},
			e: {
				c: 0,
				r: 0
			}
		};
		e.slice(0, 4) == "sep=" ? e.charCodeAt(5) == 13 && e.charCodeAt(6) == 10 ? (r = e.charAt(4), e = e.slice(7)) : e.charCodeAt(5) == 13 || e.charCodeAt(5) == 10 ? (r = e.charAt(4), e = e.slice(6)) : r = i(e.slice(0, 1024)) : r = n && n.FS ? n.FS : i(e.slice(0, 1024));
		var s = 0, c = 0, l = 0, u = 0, d = 0, f = r.charCodeAt(0), p = !1, m = 0, h = e.charCodeAt(0), g = n.dateNF == null ? null : tt(n.dateNF);
		function _() {
			var t = e.slice(u, d);
			t.slice(-1) == "\r" && (t = t.slice(0, -1));
			var r = {};
			if (t.charAt(0) == "\"" && t.charAt(t.length - 1) == "\"" && (t = t.slice(1, -1).replace(/""/g, "\"")), n.cellText !== !1 && (r.w = t), t.length === 0 ? r.t = "z" : n.raw || t.trim().length === 0 ? (r.t = "s", r.v = t) : t.charCodeAt(0) == 61 ? t.charCodeAt(1) == 34 && t.charCodeAt(t.length - 1) == 34 ? (r.t = "s", r.v = t.slice(2, -1).replace(/""/g, "\"")) : hu(t) ? (r.t = "s", r.f = t.slice(1), r.v = t) : (r.t = "s", r.v = t) : t == "TRUE" ? (r.t = "b", r.v = !0) : t == "FALSE" ? (r.t = "b", r.v = !1) : isNaN(l = wt(t)) ? !isNaN((l = Mt(t)).getDate()) || g && t.match(g) ? (r.z = n.dateNF || J[14], g && t.match(g) ? (l = bt(nt(t, n.dateNF, t.match(g) || [])), n && n.UTC === !1 && (l = Pt(l))) : n && n.UTC === !1 ? l = Pt(l) : n.cellText !== !1 && n.dateNF && (r.w = Xe(r.z, l)), n.cellDates ? (r.t = "d", r.v = l) : (r.t = "n", r.v = mt(l)), n.cellNF || delete r.z) : t.charCodeAt(0) == 35 && Ii[t] != null ? (r.t = "e", r.w = t, r.v = Ii[t]) : (r.t = "s", r.v = t) : (r.t = "n", r.v = l), r.t == "z" || (n.dense ? (a["!data"][s] || (a["!data"][s] = []), a["!data"][s][c] = r) : a[zr({
				c,
				r: s
			})] = r), u = d + 1, h = e.charCodeAt(u), o.e.c < c && (o.e.c = c), o.e.r < s && (o.e.r = s), m == f) ++c;
			else if (c = 0, ++s, n.sheetRows && n.sheetRows <= s) return !0;
		}
		outer: for (; d < e.length; ++d) switch (m = e.charCodeAt(d)) {
			case 34:
				h === 34 && (p = !p);
				break;
			case 13:
				if (p) break;
				e.charCodeAt(d + 1) == 10 && ++d;
			case f:
			case 10:
				if (!p && _()) break outer;
				break;
			default: break;
		}
		return d - u > 0 && _(), a["!ref"] = Vr(o), a;
	}
	function o(e, n) {
		return !(n && n.PRN) || n.FS || e.slice(0, 4) == "sep=" || e.indexOf("	") >= 0 || e.indexOf(",") >= 0 || e.indexOf(";") >= 0 ? a(e, n) : Yr(t(e, n), n);
	}
	function s(e, t) {
		var n = "", r = t.type == "string" ? [
			0,
			0,
			0,
			0
		] : lg(e, t);
		switch (t.type) {
			case "base64":
				n = M(e);
				break;
			case "binary":
				n = e;
				break;
			case "buffer":
				n = t.codepage == 65001 ? e.toString("utf8") : t.codepage && p !== void 0 ? p.utils.decode(t.codepage, e) : N && Buffer.isBuffer(e) ? e.toString("binary") : z(e);
				break;
			case "array":
				n = xt(e);
				break;
			case "string":
				n = e;
				break;
			default: throw Error("Unrecognized type " + t.type);
		}
		return r[0] == 239 && r[1] == 187 && r[2] == 191 ? n = Tn(n.slice(3)) : t.type != "string" && t.type != "buffer" && t.codepage == 65001 ? n = Tn(n) : t.type == "binary" && p !== void 0 && t.codepage && (n = p.utils.decode(t.codepage, p.utils.encode(28591, n))), n.slice(0, 19) == "socialcalc:version:" ? vs.to_sheet(t.type == "string" ? n : Tn(n), t) : o(n, t);
	}
	function c(e, t) {
		return Kr(s(e, t), t);
	}
	function l(e) {
		var t = [];
		if (!e["!ref"]) return "";
		for (var n = Ur(e["!ref"]), r, i = e["!data"] != null, a = n.s.r; a <= n.e.r; ++a) {
			for (var o = [], s = n.s.c; s <= n.e.c; ++s) {
				var c = zr({
					r: a,
					c: s
				});
				if (r = i ? (e["!data"][a] || [])[s] : e[c], !r || r.v == null) {
					o.push("          ");
					continue;
				}
				for (var l = (r.w || (Gr(r), r.w) || "").slice(0, 10); l.length < 10;) l += " ";
				o.push(l + (s === 0 ? " " : ""));
			}
			t.push(o.join(""));
		}
		return t.join("\n");
	}
	return {
		to_workbook: c,
		to_sheet: s,
		from_sheet: l
	};
})();
function bs(e, t) {
	var n = t || {}, r = !!n.WTF;
	n.WTF = !0;
	try {
		var i = gs.to_workbook(e, n);
		return n.WTF = r, i;
	} catch (i) {
		if (n.WTF = r, i.message.indexOf("SYLK bad record ID") == -1 && r) throw i;
		return ys.to_workbook(e, t);
	}
}
function xs(e, t) {
	var n = t || {}, r = !!n.WTF;
	n.WTF = !0;
	try {
		var i = _s.to_workbook(e, n);
		if (!i || !i.Sheets) throw "DIF bad workbook";
		var a = i.Sheets[i.SheetNames[0]];
		if (!a || !a["!ref"]) throw "DIF empty worksheet";
		return n.WTF = r, i;
	} catch {
		return n.WTF = r, ys.to_workbook(e, t);
	}
}
var Ss = /*#__PURE__*/ (function() {
	function e(e, t, n) {
		if (e) {
			br(e, e.l || 0);
			for (var r = n.Enum || U; e.l < e.length;) {
				var i = e.read_shift(2), a = r[i] || r[65535], o = e.read_shift(2), s = e.l + o, c = a.f && a.f(e, o, n);
				if (e.l = s, t(c, a, i)) return;
			}
		}
	}
	function t(e, t) {
		switch (t.type) {
			case "base64": return r(R(M(e)), t);
			case "binary": return r(R(e), t);
			case "buffer":
			case "array": return r(e, t);
		}
		throw "Unsupported type " + t.type;
	}
	var n = [
		"mmmm",
		"dd-mmm-yyyy",
		"dd-mmm",
		"mmm-yyyy",
		"@",
		"mm/dd",
		"hh:mm:ss AM/PM",
		"hh:mm AM/PM",
		"mm/dd/yyyy",
		"mm/dd",
		"hh:mm:ss",
		"hh:mm"
	];
	function r(t, r) {
		if (!t) return t;
		var i = r || {};
		D != null && i.dense == null && (i.dense = D);
		var a = {}, o = "Sheet1", s = "", c = 0, l = {}, u = [], d = [], f = [];
		i.dense && (f = a["!data"] = []);
		var p = {
			s: {
				r: 0,
				c: 0
			},
			e: {
				r: 0,
				c: 0
			}
		}, m = i.sheetRows || 0, h = {};
		if (t[4] == 81 && t[5] == 80 && t[6] == 87) return ne(t, r);
		if (t[2] == 0 && (t[3] == 8 || t[3] == 9) && t.length >= 16 && t[14] == 5 && t[15] === 108) throw Error("Unsupported Works 3 for Mac file");
		if (t[2] == 2) i.Enum = U, e(t, function(e, t, r) {
			switch (r) {
				case 0:
					i.vers = e, e >= 4096 && (i.qpro = !0);
					break;
				case 255:
					i.vers = e, i.works = !0;
					break;
				case 6:
					p = e;
					break;
				case 204:
					e && (s = e);
					break;
				case 222:
					s = e;
					break;
				case 15:
				case 51: (!i.qpro && !i.works || r == 51) && e[1].v.charCodeAt(0) < 48 && (e[1].v = e[1].v.slice(1)), (i.works || i.works2) && (e[1].v = e[1].v.replace(/\r\n/g, "\n"));
				case 13:
				case 14:
				case 16:
					(e[2] & 112) == 112 && (e[2] & 15) > 1 && (e[2] & 15) < 15 && (e[1].z = i.dateNF || n[(e[2] & 15) - 1] || J[14], i.cellDates && (e[1].v = ht(e[1].v), e[1].t = typeof e[1].v == "number" ? "n" : "d")), i.qpro && e[3] > c && (a["!ref"] = Vr(p), l[o] = a, u.push(o), a = {}, i.dense && (f = a["!data"] = []), p = {
						s: {
							r: 0,
							c: 0
						},
						e: {
							r: 0,
							c: 0
						}
					}, c = e[3], o = s || "Sheet" + (c + 1), s = "");
					var d = i.dense ? (f[e[0].r] || [])[e[0].c] : a[zr(e[0])];
					if (d) {
						d.t = e[1].t, d.v = e[1].v, e[1].z != null && (d.z = e[1].z), e[1].f != null && (d.f = e[1].f), h = d;
						break;
					}
					i.dense ? (f[e[0].r] || (f[e[0].r] = []), f[e[0].r][e[0].c] = e[1]) : a[zr(e[0])] = e[1], h = e[1];
					break;
				case 21509:
					i.works2 = !0;
					break;
				case 21506:
					e == 5281 && (h.z = "hh:mm:ss", i.cellDates && h.t == "n" && (h.v = ht(h.v), h.t = typeof h.v == "number" ? "n" : "d"));
					break;
			}
		}, i);
		else if (t[2] == 26 || t[2] == 14) i.Enum = W, t[2] == 14 && (i.qpro = !0, t.l = 0), e(t, function(e, t, n) {
			switch (n) {
				case 204:
					o = e;
					break;
				case 22: e[1].v.charCodeAt(0) < 48 && (e[1].v = e[1].v.slice(1)), e[1].v = e[1].v.replace(/\x0F./g, function(e) {
					return String.fromCharCode(e.charCodeAt(1) - 32);
				}).replace(/\r\n/g, "\n");
				case 23:
				case 24:
				case 25:
				case 37:
				case 39:
				case 40:
					if (e[3] > c && (a["!ref"] = Vr(p), l[o] = a, u.push(o), a = {}, i.dense && (f = a["!data"] = []), p = {
						s: {
							r: 0,
							c: 0
						},
						e: {
							r: 0,
							c: 0
						}
					}, c = e[3], o = "Sheet" + (c + 1)), m > 0 && e[0].r >= m) break;
					i.dense ? (f[e[0].r] || (f[e[0].r] = []), f[e[0].r][e[0].c] = e[1]) : a[zr(e[0])] = e[1], p.e.c < e[0].c && (p.e.c = e[0].c), p.e.r < e[0].r && (p.e.r = e[0].r);
					break;
				case 27:
					e[14e3] && (d[e[14e3][0]] = e[14e3][1]);
					break;
				case 1537:
					d[e[0]] = e[1], e[0] == c && (o = e[1]);
					break;
				default: break;
			}
		}, i);
		else throw Error("Unrecognized LOTUS BOF " + t[2]);
		if (a["!ref"] = Vr(p), l[s || o] = a, u.push(s || o), !d.length) return {
			SheetNames: u,
			Sheets: l
		};
		for (var g = {}, _ = [], v = 0; v < d.length; ++v) l[u[v]] ? (_.push(d[v] || u[v]), g[d[v]] = l[d[v]] || l[u[v]]) : (_.push(d[v]), g[d[v]] = { "!ref": "A1" });
		return {
			SheetNames: _,
			Sheets: g
		};
	}
	function i(e, t) {
		var n = t || {};
		if (+n.codepage >= 0 && v(+n.codepage), n.type == "string") throw Error("Cannot write WK1 to JS string");
		var r = wr();
		if (!e["!ref"]) throw Error("Cannot export empty sheet to WK1");
		var i = Ur(e["!ref"]), a = e["!data"] != null, s = [];
		Hm(r, 0, o(1030)), Hm(r, 6, l(i));
		for (var c = Math.min(i.e.r, 8191), u = i.s.c; u <= i.e.c; ++u) s[u] = Pr(u);
		for (var d = i.s.r; d <= c; ++d) {
			var f = Ar(d);
			for (u = i.s.c; u <= i.e.c; ++u) {
				var m = a ? (e["!data"][d] || [])[u] : e[s[u] + f];
				if (!(!m || m.t == "z")) switch (m.t) {
					case "n":
						(m.v | 0) == m.v && m.v >= -32768 && m.v <= 32767 ? Hm(r, 13, g(d, u, m)) : Hm(r, 14, y(d, u, m));
						break;
					case "d":
						var h = mt(m.v);
						(h | 0) == h && h >= -32768 && h <= 32767 ? Hm(r, 13, g(d, u, {
							t: "n",
							v: h,
							z: m.z || J[14]
						})) : Hm(r, 14, y(d, u, {
							t: "n",
							v: h,
							z: m.z || J[14]
						}));
						break;
					default:
						var _ = Gr(m);
						Hm(r, 15, p(d, u, _.slice(0, 239)));
				}
			}
		}
		return Hm(r, 1), r.end();
	}
	function a(e, t) {
		var n = t || {};
		if (+n.codepage >= 0 && v(+n.codepage), n.type == "string") throw Error("Cannot write WK3 to JS string");
		var r = wr();
		Hm(r, 0, s(e));
		for (var i = 0, a = 0; i < e.SheetNames.length; ++i) (e.Sheets[e.SheetNames[i]] || {})["!ref"] && Hm(r, 27, H(e.SheetNames[i], a++));
		var o = 0;
		for (i = 0; i < e.SheetNames.length; ++i) {
			var c = e.Sheets[e.SheetNames[i]];
			if (!(!c || !c["!ref"])) {
				for (var l = Ur(c["!ref"]), u = c["!data"] != null, d = [], f = Math.min(l.e.r, 8191), p = l.s.r; p <= f; ++p) for (var m = Ar(p), h = l.s.c; h <= l.e.c; ++h) {
					p === l.s.r && (d[h] = Pr(h));
					var g = d[h] + m, _ = u ? (c["!data"][p] || [])[h] : c[g];
					if (!(!_ || _.t == "z")) if (_.t == "n") Hm(r, 23, j(p, h, o, _.v));
					else {
						var y = Gr(_);
						Hm(r, 22, O(p, h, o, y.slice(0, 239)));
					}
				}
				++o;
			}
		}
		return Hm(r, 1), r.end();
	}
	function o(e) {
		var t = Sr(2);
		return t.write_shift(2, e), t;
	}
	function s(e) {
		var t = Sr(26);
		t.write_shift(2, 4096), t.write_shift(2, 4), t.write_shift(4, 0);
		for (var n = 0, r = 0, i = 0, a = 0; a < e.SheetNames.length; ++a) {
			var o = e.SheetNames[a], s = e.Sheets[o];
			if (!(!s || !s["!ref"])) {
				++i;
				var c = Br(s["!ref"]);
				n < c.e.r && (n = c.e.r), r < c.e.c && (r = c.e.c);
			}
		}
		return n > 8191 && (n = 8191), t.write_shift(2, n), t.write_shift(1, i), t.write_shift(1, r), t.write_shift(2, 0), t.write_shift(2, 0), t.write_shift(1, 1), t.write_shift(1, 2), t.write_shift(4, 0), t.write_shift(4, 0), t;
	}
	function c(e, t, n) {
		var r = {
			s: {
				c: 0,
				r: 0
			},
			e: {
				c: 0,
				r: 0
			}
		};
		return t == 8 && n.qpro ? (r.s.c = e.read_shift(1), e.l++, r.s.r = e.read_shift(2), r.e.c = e.read_shift(1), e.l++, r.e.r = e.read_shift(2), r) : (r.s.c = e.read_shift(2), r.s.r = e.read_shift(2), t == 12 && n.qpro && (e.l += 2), r.e.c = e.read_shift(2), r.e.r = e.read_shift(2), t == 12 && n.qpro && (e.l += 2), r.s.c == 65535 && (r.s.c = r.e.c = r.s.r = r.e.r = 0), r);
	}
	function l(e) {
		var t = Sr(8);
		return t.write_shift(2, e.s.c), t.write_shift(2, e.s.r), t.write_shift(2, e.e.c), t.write_shift(2, e.e.r), t;
	}
	function u(e, t, n) {
		var r = [
			{
				c: 0,
				r: 0
			},
			{
				t: "n",
				v: 0
			},
			0,
			0
		];
		return n.qpro && n.vers != 20768 ? (r[0].c = e.read_shift(1), r[3] = e.read_shift(1), r[0].r = e.read_shift(2), e.l += 2) : n.works ? (r[0].c = e.read_shift(2), r[0].r = e.read_shift(2), r[2] = e.read_shift(2)) : (r[2] = e.read_shift(1), r[0].c = e.read_shift(2), r[0].r = e.read_shift(2)), r;
	}
	function d(e) {
		return e.z && Ge(e.z) ? 240 | (n.indexOf(e.z) + 1 || 2) : 255;
	}
	function f(e, t, n) {
		var r = e.l + t, i = u(e, t, n);
		if (i[1].t = "s", (n.vers & 65534) == 20768) {
			e.l++;
			var a = e.read_shift(1);
			return i[1].v = e.read_shift(a, "utf8"), i;
		}
		return n.qpro && e.l++, i[1].v = e.read_shift(r - e.l, "cstr"), i;
	}
	function p(e, t, n) {
		var r = Sr(7 + n.length);
		r.write_shift(1, 255), r.write_shift(2, t), r.write_shift(2, e), r.write_shift(1, 39);
		for (var i = 0; i < r.length; ++i) {
			var a = n.charCodeAt(i);
			r.write_shift(1, a >= 128 ? 95 : a);
		}
		return r.write_shift(1, 0), r;
	}
	function m(e, t, n) {
		var r = e.l + t, i = u(e, t, n);
		if (i[1].t = "s", n.vers == 20768) {
			var a = e.read_shift(1);
			return i[1].v = e.read_shift(a, "utf8"), i;
		}
		return i[1].v = e.read_shift(r - e.l, "cstr"), i;
	}
	function h(e, t, n) {
		var r = u(e, t, n);
		return r[1].v = e.read_shift(2, "i"), r;
	}
	function g(e, t, n) {
		var r = Sr(7);
		return r.write_shift(1, d(n)), r.write_shift(2, t), r.write_shift(2, e), r.write_shift(2, n.v, "i"), r;
	}
	function _(e, t, n) {
		var r = u(e, t, n);
		return r[1].v = e.read_shift(8, "f"), r;
	}
	function y(e, t, n) {
		var r = Sr(13);
		return r.write_shift(1, d(n)), r.write_shift(2, t), r.write_shift(2, e), r.write_shift(8, n.v, "f"), r;
	}
	function b(e, t, n) {
		var r = e.l + t, i = u(e, t, n);
		if (i[1].v = e.read_shift(8, "f"), n.qpro) e.l = r;
		else {
			var a = e.read_shift(2);
			w(e.slice(e.l, e.l + a), i), e.l += a;
		}
		return i;
	}
	function x(e, t, n) {
		var r = t & 32768;
		return t &= -32769, t = (r ? e : 0) + (t >= 8192 ? t - 16384 : t), (r ? "" : "$") + (n ? Pr(t) : Ar(t));
	}
	var S = {
		31: ["NA", 0],
		33: ["ABS", 1],
		34: ["TRUNC", 1],
		35: ["SQRT", 1],
		36: ["LOG", 1],
		37: ["LN", 1],
		38: ["PI", 0],
		39: ["SIN", 1],
		40: ["COS", 1],
		41: ["TAN", 1],
		42: ["ATAN2", 2],
		43: ["ATAN", 1],
		44: ["ASIN", 1],
		45: ["ACOS", 1],
		46: ["EXP", 1],
		47: ["MOD", 2],
		49: ["ISNA", 1],
		50: ["ISERR", 1],
		51: ["FALSE", 0],
		52: ["TRUE", 0],
		53: ["RAND", 0],
		54: ["DATE", 3],
		63: ["ROUND", 2],
		64: ["TIME", 3],
		68: ["ISNUMBER", 1],
		69: ["ISTEXT", 1],
		70: ["LEN", 1],
		71: ["VALUE", 1],
		73: ["MID", 3],
		74: ["CHAR", 1],
		80: ["SUM", 69],
		81: ["AVERAGEA", 69],
		82: ["COUNTA", 69],
		83: ["MINA", 69],
		84: ["MAXA", 69],
		102: ["UPPER", 1],
		103: ["LOWER", 1],
		107: ["PROPER", 1],
		109: ["TRIM", 1],
		111: ["T", 1]
	}, C = /* @__PURE__ */ ".........+.-.*./.^.=.<>.<=.>=.<.>.....&.......".split(".");
	function w(e, t) {
		br(e, 0);
		for (var n = [], r = 0, i = "", a = "", o = "", s = ""; e.l < e.length;) {
			var c = e[e.l++];
			switch (c) {
				case 0:
					n.push(e.read_shift(8, "f"));
					break;
				case 1:
					a = x(t[0].c, e.read_shift(2), !0), i = x(t[0].r, e.read_shift(2), !1), n.push(a + i);
					break;
				case 2:
					var l = x(t[0].c, e.read_shift(2), !0), u = x(t[0].r, e.read_shift(2), !1);
					a = x(t[0].c, e.read_shift(2), !0), i = x(t[0].r, e.read_shift(2), !1), n.push(l + u + ":" + a + i);
					break;
				case 3:
					if (e.l < e.length) {
						console.error("WK1 premature formula end");
						return;
					}
					break;
				case 4:
					n.push("(" + n.pop() + ")");
					break;
				case 5:
					n.push(e.read_shift(2));
					break;
				case 6:
					for (var d = ""; c = e[e.l++];) d += String.fromCharCode(c);
					n.push("\"" + d.replace(/"/g, "\"\"") + "\"");
					break;
				case 8:
					n.push("-" + n.pop());
					break;
				case 23:
					n.push("+" + n.pop());
					break;
				case 22:
					n.push("NOT(" + n.pop() + ")");
					break;
				case 20:
				case 21:
					s = n.pop(), o = n.pop(), n.push(["AND", "OR"][c - 20] + "(" + o + "," + s + ")");
					break;
				default: if (c < 32 && C[c]) s = n.pop(), o = n.pop(), n.push(o + C[c] + s);
				else if (S[c]) {
					if (r = S[c][1], r == 69 && (r = e[e.l++]), r > n.length) {
						console.error("WK1 bad formula parse 0x" + c.toString(16) + ":|" + n.join("|") + "|");
						return;
					}
					var f = n.slice(-r);
					n.length -= r, n.push(S[c][0] + "(" + f.join(",") + ")");
				} else if (c <= 7) return console.error("WK1 invalid opcode " + c.toString(16));
				else if (c <= 24) return console.error("WK1 unsupported op " + c.toString(16));
				else if (c <= 30) return console.error("WK1 invalid opcode " + c.toString(16));
				else if (c <= 115) return console.error("WK1 unsupported function opcode " + c.toString(16));
				else return console.error("WK1 unrecognized opcode " + c.toString(16));
			}
		}
		n.length == 1 ? t[1].f = "" + n[0] : console.error("WK1 bad formula parse |" + n.join("|") + "|");
	}
	function T(e) {
		var t = [
			{
				c: 0,
				r: 0
			},
			{
				t: "n",
				v: 0
			},
			0
		];
		return t[0].r = e.read_shift(2), t[3] = e[e.l++], t[0].c = e[e.l++], t;
	}
	function E(e, t) {
		var n = T(e, t);
		return n[1].t = "s", n[1].v = e.read_shift(t - 4, "cstr"), n;
	}
	function O(e, t, n, r) {
		var i = Sr(6 + r.length);
		i.write_shift(2, e), i.write_shift(1, n), i.write_shift(1, t), i.write_shift(1, 39);
		for (var a = 0; a < r.length; ++a) {
			var o = r.charCodeAt(a);
			i.write_shift(1, o >= 128 ? 95 : o);
		}
		return i.write_shift(1, 0), i;
	}
	function k(e, t) {
		var n = T(e, t);
		n[1].v = e.read_shift(2);
		var r = n[1].v >> 1;
		if (n[1].v & 1) switch (r & 7) {
			case 0:
				r = (r >> 3) * 5e3;
				break;
			case 1:
				r = (r >> 3) * 500;
				break;
			case 2:
				r = (r >> 3) / 20;
				break;
			case 3:
				r = (r >> 3) / 200;
				break;
			case 4:
				r = (r >> 3) / 2e3;
				break;
			case 5:
				r = (r >> 3) / 2e4;
				break;
			case 6:
				r = (r >> 3) / 16;
				break;
			case 7:
				r = (r >> 3) / 64;
				break;
		}
		return n[1].v = r, n;
	}
	function A(e, t) {
		var n = T(e, t), r = e.read_shift(4), i = e.read_shift(4), a = e.read_shift(2);
		if (a == 65535) return r === 0 && i === 3221225472 ? (n[1].t = "e", n[1].v = 15) : r === 0 && i === 3489660928 ? (n[1].t = "e", n[1].v = 42) : n[1].v = 0, n;
		var o = a & 32768;
		return a = (a & 32767) - 16446, n[1].v = (1 - o * 2) * (i * 2 ** (a + 32) + r * 2 ** a), n;
	}
	function j(e, t, n, r) {
		var i = Sr(14);
		if (i.write_shift(2, e), i.write_shift(1, n), i.write_shift(1, t), r == 0) return i.write_shift(4, 0), i.write_shift(4, 0), i.write_shift(2, 65535), i;
		var a = 0, o = 0, s = 0, c = 0;
		return r < 0 && (a = 1, r = -r), o = Math.log2(r) | 0, r /= 2 ** (o - 31), c = r >>> 0, c & 2147483648 || (r /= 2, ++o, c = r >>> 0), r -= c, c |= 2147483648, c >>>= 0, r *= 2 ** 32, s = r >>> 0, i.write_shift(4, s), i.write_shift(4, c), o += 16383 + (a ? 32768 : 0), i.write_shift(2, o), i;
	}
	function N(e, t) {
		var n = A(e, 14);
		return e.l += t - 14, n;
	}
	function P(e, t) {
		var n = T(e, t), r = e.read_shift(4);
		return n[1].v = r >> 6, n;
	}
	function F(e, t) {
		var n = T(e, t), r = e.read_shift(8, "f");
		return n[1].v = r, n;
	}
	function I(e, t) {
		var n = F(e, 12);
		return e.l += t - 12, n;
	}
	function L(e, t) {
		return e[e.l + t - 1] == 0 ? e.read_shift(t, "cstr") : "";
	}
	function z(e, t) {
		var n = e[e.l++];
		n > t - 1 && (n = t - 1);
		for (var r = ""; r.length < n;) r += String.fromCharCode(e[e.l++]);
		return r;
	}
	function B(e, t, n) {
		if (!(!n.qpro || t < 21)) {
			var r = e.read_shift(1);
			return e.l += 17, e.l += 1, e.l += 2, [r, e.read_shift(t - 21, "cstr")];
		}
	}
	function V(e, t) {
		for (var n = {}, r = e.l + t; e.l < r;) {
			var i = e.read_shift(2);
			if (i == 14e3) {
				for (n[i] = [0, ""], n[i][0] = e.read_shift(2); e[e.l];) n[i][1] += String.fromCharCode(e[e.l]), e.l++;
				e.l++;
			}
		}
		return n;
	}
	function H(e, t) {
		var n = Sr(5 + e.length);
		n.write_shift(2, 14e3), n.write_shift(2, t);
		for (var r = 0; r < e.length; ++r) {
			var i = e.charCodeAt(r);
			n[n.l++] = i > 127 ? 95 : i;
		}
		return n[n.l++] = 0, n;
	}
	var U = {
		0: {
			n: "BOF",
			f: xa
		},
		1: { n: "EOF" },
		2: { n: "CALCMODE" },
		3: { n: "CALCORDER" },
		4: { n: "SPLIT" },
		5: { n: "SYNC" },
		6: {
			n: "RANGE",
			f: c
		},
		7: { n: "WINDOW1" },
		8: { n: "COLW1" },
		9: { n: "WINTWO" },
		10: { n: "COLW2" },
		11: { n: "NAME" },
		12: { n: "BLANK" },
		13: {
			n: "INTEGER",
			f: h
		},
		14: {
			n: "NUMBER",
			f: _
		},
		15: {
			n: "LABEL",
			f
		},
		16: {
			n: "FORMULA",
			f: b
		},
		24: { n: "TABLE" },
		25: { n: "ORANGE" },
		26: { n: "PRANGE" },
		27: { n: "SRANGE" },
		28: { n: "FRANGE" },
		29: { n: "KRANGE1" },
		32: { n: "HRANGE" },
		35: { n: "KRANGE2" },
		36: { n: "PROTEC" },
		37: { n: "FOOTER" },
		38: { n: "HEADER" },
		39: { n: "SETUP" },
		40: { n: "MARGINS" },
		41: { n: "LABELFMT" },
		42: { n: "TITLES" },
		43: { n: "SHEETJS" },
		45: { n: "GRAPH" },
		46: { n: "NGRAPH" },
		47: { n: "CALCCOUNT" },
		48: { n: "UNFORMATTED" },
		49: { n: "CURSORW12" },
		50: { n: "WINDOW" },
		51: {
			n: "STRING",
			f: m
		},
		55: { n: "PASSWORD" },
		56: { n: "LOCKED" },
		60: { n: "QUERY" },
		61: { n: "QUERYNAME" },
		62: { n: "PRINT" },
		63: { n: "PRINTNAME" },
		64: { n: "GRAPH2" },
		65: { n: "GRAPHNAME" },
		66: { n: "ZOOM" },
		67: { n: "SYMSPLIT" },
		68: { n: "NSROWS" },
		69: { n: "NSCOLS" },
		70: { n: "RULER" },
		71: { n: "NNAME" },
		72: { n: "ACOMM" },
		73: { n: "AMACRO" },
		74: { n: "PARSE" },
		102: { n: "PRANGES??" },
		103: { n: "RRANGES??" },
		104: { n: "FNAME??" },
		105: { n: "MRANGES??" },
		204: {
			n: "SHEETNAMECS",
			f: L
		},
		222: {
			n: "SHEETNAMELP",
			f: z
		},
		255: {
			n: "BOF",
			f: xa
		},
		21506: {
			n: "WKSNF",
			f: xa
		},
		65535: { n: "" }
	}, W = {
		0: { n: "BOF" },
		1: { n: "EOF" },
		2: { n: "PASSWORD" },
		3: { n: "CALCSET" },
		4: { n: "WINDOWSET" },
		5: { n: "SHEETCELLPTR" },
		6: { n: "SHEETLAYOUT" },
		7: { n: "COLUMNWIDTH" },
		8: { n: "HIDDENCOLUMN" },
		9: { n: "USERRANGE" },
		10: { n: "SYSTEMRANGE" },
		11: { n: "ZEROFORCE" },
		12: { n: "SORTKEYDIR" },
		13: { n: "FILESEAL" },
		14: { n: "DATAFILLNUMS" },
		15: { n: "PRINTMAIN" },
		16: { n: "PRINTSTRING" },
		17: { n: "GRAPHMAIN" },
		18: { n: "GRAPHSTRING" },
		19: { n: "??" },
		20: { n: "ERRCELL" },
		21: { n: "NACELL" },
		22: {
			n: "LABEL16",
			f: E
		},
		23: {
			n: "NUMBER17",
			f: A
		},
		24: {
			n: "NUMBER18",
			f: k
		},
		25: {
			n: "FORMULA19",
			f: N
		},
		26: { n: "FORMULA1A" },
		27: {
			n: "XFORMAT",
			f: V
		},
		28: { n: "DTLABELMISC" },
		29: { n: "DTLABELCELL" },
		30: { n: "GRAPHWINDOW" },
		31: { n: "CPA" },
		32: { n: "LPLAUTO" },
		33: { n: "QUERY" },
		34: { n: "HIDDENSHEET" },
		35: { n: "??" },
		37: {
			n: "NUMBER25",
			f: P
		},
		38: { n: "??" },
		39: {
			n: "NUMBER27",
			f: F
		},
		40: {
			n: "FORMULA28",
			f: I
		},
		142: { n: "??" },
		147: { n: "??" },
		150: { n: "??" },
		151: { n: "??" },
		152: { n: "??" },
		153: { n: "??" },
		154: { n: "??" },
		155: { n: "??" },
		156: { n: "??" },
		163: { n: "??" },
		174: { n: "??" },
		175: { n: "??" },
		176: { n: "??" },
		177: { n: "??" },
		184: { n: "??" },
		185: { n: "??" },
		186: { n: "??" },
		187: { n: "??" },
		188: { n: "??" },
		195: { n: "??" },
		201: { n: "??" },
		204: {
			n: "SHEETNAMECS",
			f: L
		},
		205: { n: "??" },
		206: { n: "??" },
		207: { n: "??" },
		208: { n: "??" },
		256: { n: "??" },
		259: { n: "??" },
		260: { n: "??" },
		261: { n: "??" },
		262: { n: "??" },
		263: { n: "??" },
		265: { n: "??" },
		266: { n: "??" },
		267: { n: "??" },
		268: { n: "??" },
		270: { n: "??" },
		271: { n: "??" },
		384: { n: "??" },
		389: { n: "??" },
		390: { n: "??" },
		393: { n: "??" },
		396: { n: "??" },
		512: { n: "??" },
		514: { n: "??" },
		513: { n: "??" },
		516: { n: "??" },
		517: { n: "??" },
		640: { n: "??" },
		641: { n: "??" },
		642: { n: "??" },
		643: { n: "??" },
		644: { n: "??" },
		645: { n: "??" },
		646: { n: "??" },
		647: { n: "??" },
		648: { n: "??" },
		658: { n: "??" },
		659: { n: "??" },
		660: { n: "??" },
		661: { n: "??" },
		662: { n: "??" },
		665: { n: "??" },
		666: { n: "??" },
		768: { n: "??" },
		772: { n: "??" },
		1537: {
			n: "SHEETINFOQP",
			f: B
		},
		1600: { n: "??" },
		1602: { n: "??" },
		1793: { n: "??" },
		1794: { n: "??" },
		1795: { n: "??" },
		1796: { n: "??" },
		1920: { n: "??" },
		2048: { n: "??" },
		2049: { n: "??" },
		2052: { n: "??" },
		2688: { n: "??" },
		10998: { n: "??" },
		12849: { n: "??" },
		28233: { n: "??" },
		28484: { n: "??" },
		65535: { n: "" }
	}, ee = {
		5: "dd-mmm-yy",
		6: "dd-mmm",
		7: "mmm-yy",
		8: "mm/dd/yy",
		10: "hh:mm:ss AM/PM",
		11: "hh:mm AM/PM",
		14: "dd-mmm-yyyy",
		15: "mmm-yyyy",
		34: "0.00",
		50: "0.00;[Red]0.00",
		66: "0.00;(0.00)",
		82: "0.00;[Red](0.00)",
		162: "\"$\"#,##0.00;\\(\"$\"#,##0.00\\)",
		288: "0%",
		304: "0E+00",
		320: "# ?/?"
	};
	function te(e) {
		var t = e.read_shift(2), n = e.read_shift(1);
		if (n != 0) throw "unsupported QPW string type " + n.toString(16);
		return e.read_shift(t, "sbcs-cont");
	}
	function ne(e, t) {
		br(e, 0);
		var n = t || {};
		D != null && n.dense == null && (n.dense = D);
		var r = {};
		n.dense && (r["!data"] = []);
		var i = [], a = "", o = {
			s: {
				r: -1,
				c: -1
			},
			e: {
				r: -1,
				c: -1
			}
		}, s = 0, c = 0, l = 0, u = 0, d = {
			SheetNames: [],
			Sheets: {}
		}, f = [];
		outer: for (; e.l < e.length;) {
			var p = e.read_shift(2), m = e.read_shift(2), h = e.slice(e.l, e.l + m);
			switch (br(h, 0), p) {
				case 1:
					if (h.read_shift(4) != 962023505) throw "Bad QPW9 BOF!";
					break;
				case 2: break outer;
				case 8: break;
				case 10:
					for (var g = h.read_shift(4), _ = (h.length - h.l) / g | 0, v = 0; v < g; ++v) {
						var y = h.l + _, b = {};
						h.l += 2, b.numFmtId = h.read_shift(2), ee[b.numFmtId] && (b.z = ee[b.numFmtId]), h.l = y, f.push(b);
					}
					break;
				case 1025: break;
				case 1026: break;
				case 1031:
					for (h.l += 12; h.l < h.length;) s = h.read_shift(2), c = h.read_shift(1), i.push(h.read_shift(s, "cstr"));
					break;
				case 1032: break;
				case 1537:
					var x = h.read_shift(2);
					r = {}, n.dense && (r["!data"] = []), o.s.c = h.read_shift(2), o.e.c = h.read_shift(2), o.s.r = h.read_shift(4), o.e.r = h.read_shift(4), h.l += 4, h.l + 2 < h.length && (s = h.read_shift(2), c = h.read_shift(1), a = s == 0 ? "" : h.read_shift(s, "cstr")), a || (a = Pr(x));
					break;
				case 1538:
					if (o.s.c > 255 || o.s.r > 999999) break;
					o.e.c < o.s.c && (o.e.c = o.s.c), o.e.r < o.s.r && (o.e.r = o.s.r), r["!ref"] = Vr(o), Ag(d, r, a);
					break;
				case 2561:
					l = h.read_shift(2), o.e.c < l && (o.e.c = l), o.s.c > l && (o.s.c = l), u = h.read_shift(4), o.s.r > u && (o.s.r = u), u = h.read_shift(4), o.e.r < u && (o.e.r = u);
					break;
				case 3073:
					u = h.read_shift(4), s = h.read_shift(4), o.s.r > u && (o.s.r = u), o.e.r < u + s - 1 && (o.e.r = u + s - 1);
					for (var S = Pr(l); h.l < h.length;) {
						var C = { t: "z" }, w = h.read_shift(1), T = -1;
						w & 128 && (T = h.read_shift(2));
						var E = w & 64 ? h.read_shift(2) - 1 : 0;
						switch (w & 31) {
							case 0: break;
							case 1: break;
							case 2:
								C = {
									t: "n",
									v: h.read_shift(2)
								};
								break;
							case 3:
								C = {
									t: "n",
									v: h.read_shift(2, "i")
								};
								break;
							case 4:
								C = {
									t: "n",
									v: si(h)
								};
								break;
							case 5:
								C = {
									t: "n",
									v: h.read_shift(8, "f")
								};
								break;
							case 7:
								C = {
									t: "s",
									v: i[c = h.read_shift(4) - 1]
								};
								break;
							case 8:
								C = {
									t: "n",
									v: h.read_shift(8, "f")
								}, h.l += 2, h.l += 4, isNaN(C.v) && (C = {
									t: "e",
									v: 15
								});
								break;
							default: throw "Unrecognized QPW cell type " + (w & 31);
						}
						T != -1 && (f[T - 1] || {}).z && (C.z = f[T - 1].z);
						var O = 0;
						if (w & 32) switch (w & 31) {
							case 2:
								O = h.read_shift(2);
								break;
							case 3:
								O = h.read_shift(2, "i");
								break;
							case 7:
								O = h.read_shift(2);
								break;
							default: throw "Unsupported delta for QPW cell type " + (w & 31);
						}
						if (!(!n.sheetStubs && C.t == "z")) {
							var k = St(C);
							C.t == "n" && C.z && Ge(C.z) && n.cellDates && (k.v = ht(C.v), k.t = typeof k.v == "number" ? "n" : "d"), r["!data"] == null ? r[S + Ar(u)] = k : (r["!data"][u] || (r["!data"][u] = []), r["!data"][u][l] = k);
						}
						for (++u, --s; E-- > 0 && s >= 0;) {
							if (w & 32) switch (w & 31) {
								case 2:
									C = {
										t: "n",
										v: C.v + O & 65535
									};
									break;
								case 3:
									C = {
										t: "n",
										v: C.v + O & 65535
									}, C.v > 32767 && (C.v -= 65536);
									break;
								case 7:
									C = {
										t: "s",
										v: i[c = c + O >>> 0]
									};
									break;
								default: throw "Cannot apply delta for QPW cell type " + (w & 31);
							}
							else switch (w & 31) {
								case 1:
									C = { t: "z" };
									break;
								case 2:
									C = {
										t: "n",
										v: h.read_shift(2)
									};
									break;
								case 7:
									C = {
										t: "s",
										v: i[c = h.read_shift(4) - 1]
									};
									break;
								default: throw "Cannot apply repeat for QPW cell type " + (w & 31);
							}
							!n.sheetStubs && C.t == "z" || (r["!data"] == null ? r[S + Ar(u)] = C : (r["!data"][u] || (r["!data"][u] = []), r["!data"][u][l] = C)), ++u, --s;
						}
					}
					break;
				case 3074:
					l = h.read_shift(2), u = h.read_shift(4);
					var A = te(h);
					r["!data"] == null ? r[Pr(l) + Ar(u)] = {
						t: "s",
						v: A
					} : (r["!data"][u] || (r["!data"][u] = []), r["!data"][u][l] = {
						t: "s",
						v: A
					});
					break;
				default: break;
			}
			e.l += m;
		}
		return d;
	}
	return {
		sheet_to_wk1: i,
		book_to_wk3: a,
		to_workbook: t
	};
})();
function Cs(e) {
	var t = {}, n = e.match(sn), r = 0, i = !1;
	if (n) for (; r != n.length; ++r) {
		var a = X(n[r]);
		switch (a[0].replace(/<\w*:/g, "<")) {
			case "<condense": break;
			case "<extend": break;
			case "<shadow": if (!a.val) break;
			case "<shadow>":
			case "<shadow/>":
				t.shadow = 1;
				break;
			case "</shadow>": break;
			case "<charset":
				if (a.val == "1") break;
				t.cp = h[parseInt(a.val, 10)];
				break;
			case "<outline": if (!a.val) break;
			case "<outline>":
			case "<outline/>":
				t.outline = 1;
				break;
			case "</outline>": break;
			case "<rFont":
				t.name = a.val;
				break;
			case "<sz":
				t.sz = a.val;
				break;
			case "<strike": if (!a.val) break;
			case "<strike>":
			case "<strike/>":
				t.strike = 1;
				break;
			case "</strike>": break;
			case "<u":
				if (!a.val) break;
				switch (a.val) {
					case "double":
						t.uval = "double";
						break;
					case "singleAccounting":
						t.uval = "single-accounting";
						break;
					case "doubleAccounting":
						t.uval = "double-accounting";
						break;
				}
			case "<u>":
			case "<u/>":
				t.u = 1;
				break;
			case "</u>": break;
			case "<b": if (a.val == "0") break;
			case "<b>":
			case "<b/>":
				t.b = 1;
				break;
			case "</b>": break;
			case "<i": if (a.val == "0") break;
			case "<i>":
			case "<i/>":
				t.i = 1;
				break;
			case "</i>": break;
			case "<color":
				a.rgb && (t.color = a.rgb.slice(2, 8));
				break;
			case "<color>":
			case "<color/>":
			case "</color>": break;
			case "<family":
				t.family = a.val;
				break;
			case "<family>":
			case "<family/>":
			case "</family>": break;
			case "<vertAlign":
				t.valign = a.val;
				break;
			case "<vertAlign>":
			case "<vertAlign/>":
			case "</vertAlign>": break;
			case "<scheme": break;
			case "<scheme>":
			case "<scheme/>":
			case "</scheme>": break;
			case "<extLst":
			case "<extLst>":
			case "</extLst>": break;
			case "<ext":
				i = !0;
				break;
			case "</ext>":
				i = !1;
				break;
			default: if (a[0].charCodeAt(1) !== 47 && !i) throw Error("Unrecognized rich format " + a[0]);
		}
	}
	return t;
}
var ws = /*#__PURE__*/ (function() {
	function e(e) {
		var t = Vt(e, "t");
		if (!t) return {
			t: "s",
			v: ""
		};
		var n = {
			t: "s",
			v: mn(t[1])
		}, r = Vt(e, "rPr");
		return r && (n.s = Cs(r[1])), n;
	}
	var t = /<(?:\w+:)?r>/g, n = /<\/(?:\w+:)?r>/;
	return function(r) {
		return r.replace(t, "").split(n).map(e).filter(function(e) {
			return e.v;
		});
	};
})(), Ts = /*#__PURE__*/ (function() {
	var e = /(\r\n|\n)/g;
	function t(e, t, n) {
		var r = [];
		e.u && r.push("text-decoration: underline;"), e.uval && r.push("text-underline-style:" + e.uval + ";"), e.sz && r.push("font-size:" + e.sz + "pt;"), e.outline && r.push("text-effect: outline;"), e.shadow && r.push("text-shadow: auto;"), t.push("<span style=\"" + r.join("") + "\">"), e.b && (t.push("<b>"), n.push("</b>")), e.i && (t.push("<i>"), n.push("</i>")), e.strike && (t.push("<s>"), n.push("</s>"));
		var i = e.valign || "";
		return i == "superscript" || i == "super" ? i = "sup" : i == "subscript" && (i = "sub"), i != "" && (t.push("<" + i + ">"), n.push("</" + i + ">")), n.push("</span>"), e;
	}
	function n(n) {
		var r = [
			[],
			n.v,
			[]
		];
		return n.v ? (n.s && t(n.s, r[0], r[2]), r[0].join("") + r[1].replace(e, "<br/>") + r[2].join("")) : "";
	}
	return function(e) {
		return e.map(n).join("");
	};
})(), Es = /<(?:\w+:)?t\b[^<>]*>([^<]*)<\/(?:\w+:)?t>/g, Ds = /<(?:\w+:)?r\b[^<>]*>/;
function Os(e, t) {
	var n = t ? t.cellHTML : !0, r = {};
	return e ? (e.match(/^\s*<(?:\w+:)?t[^>]*>/) ? (r.t = mn(Tn(e.slice(e.indexOf(">") + 1).split(/<\/(?:\w+:)?t>/)[0] || ""), !0), r.r = Tn(e), n && (r.h = yn(r.t))) : e.match(Ds) && (r.r = Tn(e), r.t = mn(Tn((Ut(e, "rPh").match(Es) || []).join("").replace(sn, "")), !0), n && (r.h = Ts(ws(r.r)))), r) : { t: "" };
}
var ks = /<(?:\w+:)?(?:si|sstItem)>/g, As = /<\/(?:\w+:)?(?:si|sstItem)>/;
function js(e, t) {
	var n = [], r = "";
	if (!e) return n;
	var i = Vt(e, "sst");
	if (i) {
		r = i[1].replace(ks, "").split(As);
		for (var a = 0; a != r.length; ++a) {
			var o = Os(r[a].trim(), t);
			o != null && (n[n.length] = o);
		}
		i = X(i[0].slice(0, i[0].indexOf(">"))), n.Count = i.count, n.Unique = i.uniqueCount;
	}
	return n;
}
function Ms(e) {
	return [e.read_shift(4), e.read_shift(4)];
}
function Ns(e, t) {
	var n = [], r = !1;
	return Cr(e, function(e, i, a) {
		switch (a) {
			case 159:
				n.Count = e[0], n.Unique = e[1];
				break;
			case 19:
				n.push(e);
				break;
			case 160: return !0;
			case 35:
				r = !0;
				break;
			case 36:
				r = !1;
				break;
			default: if (i.T, !r || t.WTF) throw Error("Unexpected record 0x" + a.toString(16));
		}
	}), n;
}
function Ps(e) {
	if (p !== void 0) return p.utils.encode(f, e);
	for (var t = [], n = e.split(""), r = 0; r < n.length; ++r) t[r] = n[r].charCodeAt(0);
	return t;
}
function Fs(e, t) {
	var n = {};
	return n.Major = e.read_shift(2), n.Minor = e.read_shift(2), t >= 4 && (e.l += t - 4), n;
}
function Is(e) {
	var t = {};
	return t.id = e.read_shift(0, "lpp4"), t.R = Fs(e, 4), t.U = Fs(e, 4), t.W = Fs(e, 4), t;
}
function Ls(e) {
	for (var t = e.read_shift(4), n = e.l + t - 4, r = {}, i = e.read_shift(4), a = []; i-- > 0;) a.push({
		t: e.read_shift(4),
		v: e.read_shift(0, "lpp4")
	});
	if (r.name = e.read_shift(0, "lpp4"), r.comps = a, e.l != n) throw Error("Bad DataSpaceMapEntry: " + e.l + " != " + n);
	return r;
}
function Rs(e) {
	var t = [];
	e.l += 4;
	for (var n = e.read_shift(4); n-- > 0;) t.push(Ls(e));
	return t;
}
function zs(e) {
	var t = [];
	e.l += 4;
	for (var n = e.read_shift(4); n-- > 0;) t.push(e.read_shift(0, "lpp4"));
	return t;
}
function Bs(e) {
	var t = {};
	return e.read_shift(4), e.l += 4, t.id = e.read_shift(0, "lpp4"), t.name = e.read_shift(0, "lpp4"), t.R = Fs(e, 4), t.U = Fs(e, 4), t.W = Fs(e, 4), t;
}
function Vs(e) {
	var t = Bs(e);
	if (t.ename = e.read_shift(0, "8lpp4"), t.blksz = e.read_shift(4), t.cmode = e.read_shift(4), e.read_shift(4) != 4) throw Error("Bad !Primary record");
	return t;
}
function Hs(e, t) {
	var n = e.l + t, r = {};
	r.Flags = e.read_shift(4) & 63, e.l += 4, r.AlgID = e.read_shift(4);
	var i = !1;
	switch (r.AlgID) {
		case 26126:
		case 26127:
		case 26128:
			i = r.Flags == 36;
			break;
		case 26625:
			i = r.Flags == 4;
			break;
		case 0:
			i = r.Flags == 16 || r.Flags == 4 || r.Flags == 36;
			break;
		default: throw "Unrecognized encryption algorithm: " + r.AlgID;
	}
	if (!i) throw Error("Encryption Flags/AlgID mismatch");
	return r.AlgIDHash = e.read_shift(4), r.KeySize = e.read_shift(4), r.ProviderType = e.read_shift(4), e.l += 8, r.CSPName = e.read_shift(n - e.l >> 1, "utf16le"), e.l = n, r;
}
function Us(e, t) {
	var n = {}, r = e.l + t;
	return e.l += 4, n.Salt = e.slice(e.l, e.l + 16), e.l += 16, n.Verifier = e.slice(e.l, e.l + 16), e.l += 16, e.read_shift(4), n.VerifierHash = e.slice(e.l, r), e.l = r, n;
}
function Ws(e) {
	var t = Fs(e);
	switch (t.Minor) {
		case 2: return [t.Minor, Gs(e, t)];
		case 3: return [t.Minor, Ks(e, t)];
		case 4: return [t.Minor, qs(e, t)];
	}
	throw Error("ECMA-376 Encrypted file unrecognized Version: " + t.Minor);
}
function Gs(e) {
	if ((e.read_shift(4) & 63) != 36) throw Error("EncryptionInfo mismatch");
	return {
		t: "Std",
		h: Hs(e, e.read_shift(4)),
		v: Us(e, e.length - e.l)
	};
}
function Ks() {
	throw Error("File is password-protected: ECMA-376 Extensible");
}
function qs(e) {
	var t = [
		"saltSize",
		"blockSize",
		"keyBits",
		"hashSize",
		"cipherAlgorithm",
		"cipherChaining",
		"hashAlgorithm",
		"saltValue"
	];
	e.l += 4;
	var n = e.read_shift(e.length - e.l, "utf8"), r = {};
	return n.replace(sn, function(e) {
		var n = X(e);
		switch (dn(n[0])) {
			case "<?xml": break;
			case "<encryption":
			case "</encryption>": break;
			case "<keyData":
				t.forEach(function(e) {
					r[e] = n[e];
				});
				break;
			case "<dataIntegrity":
				r.encryptedHmacKey = n.encryptedHmacKey, r.encryptedHmacValue = n.encryptedHmacValue;
				break;
			case "<keyEncryptors>":
			case "<keyEncryptors":
				r.encs = [];
				break;
			case "</keyEncryptors>": break;
			case "<keyEncryptor":
				r.uri = n.uri;
				break;
			case "</keyEncryptor>": break;
			case "<encryptedKey":
				r.encs.push(n);
				break;
			default: throw n[0];
		}
	}), r;
}
function Js(e, t) {
	var n = {}, r = n.EncryptionVersionInfo = Fs(e, 4);
	if (t -= 4, r.Minor != 2) throw Error("unrecognized minor version code: " + r.Minor);
	if (r.Major > 4 || r.Major < 2) throw Error("unrecognized major version code: " + r.Major);
	n.Flags = e.read_shift(4), t -= 4;
	var i = e.read_shift(4);
	return t -= 4, n.EncryptionHeader = Hs(e, i), t -= i, n.EncryptionVerifier = Us(e, t), n;
}
function Ys(e) {
	var t = {}, n = t.EncryptionVersionInfo = Fs(e, 4);
	if (n.Major != 1 || n.Minor != 1) throw "unrecognized version code " + n.Major + " : " + n.Minor;
	return t.Salt = e.read_shift(16), t.EncryptedVerifier = e.read_shift(16), t.EncryptedVerifierHash = e.read_shift(16), t;
}
function Xs(e) {
	var t = 0, n, r = Ps(e), i = r.length + 1, a, o, s, c, l;
	for (n = I(i), n[0] = r.length, a = 1; a != i; ++a) n[a] = r[a - 1];
	for (a = i - 1; a >= 0; --a) o = n[a], s = t & 16384 ? 1 : 0, c = t << 1 & 32767, l = s | c, t = l ^ o;
	return t ^ 52811;
}
var Zs = /*#__PURE__*/ (function() {
	var e = [
		187,
		255,
		255,
		186,
		255,
		255,
		185,
		128,
		0,
		190,
		15,
		0,
		191,
		15,
		0
	], t = [
		57840,
		7439,
		52380,
		33984,
		4364,
		3600,
		61902,
		12606,
		6258,
		57657,
		54287,
		34041,
		10252,
		43370,
		20163
	], n = [
		44796,
		19929,
		39858,
		10053,
		20106,
		40212,
		10761,
		31585,
		63170,
		64933,
		60267,
		50935,
		40399,
		11199,
		17763,
		35526,
		1453,
		2906,
		5812,
		11624,
		23248,
		885,
		1770,
		3540,
		7080,
		14160,
		28320,
		56640,
		55369,
		41139,
		20807,
		41614,
		21821,
		43642,
		17621,
		28485,
		56970,
		44341,
		19019,
		38038,
		14605,
		29210,
		60195,
		50791,
		40175,
		10751,
		21502,
		43004,
		24537,
		18387,
		36774,
		3949,
		7898,
		15796,
		31592,
		63184,
		47201,
		24803,
		49606,
		37805,
		14203,
		28406,
		56812,
		17824,
		35648,
		1697,
		3394,
		6788,
		13576,
		27152,
		43601,
		17539,
		35078,
		557,
		1114,
		2228,
		4456,
		30388,
		60776,
		51953,
		34243,
		7079,
		14158,
		28316,
		14128,
		28256,
		56512,
		43425,
		17251,
		34502,
		7597,
		13105,
		26210,
		52420,
		35241,
		883,
		1766,
		3532,
		4129,
		8258,
		16516,
		33032,
		4657,
		9314,
		18628
	], r = function(e) {
		return (e / 2 | e * 128) & 255;
	}, i = function(e, t) {
		return r(e ^ t);
	}, a = function(e) {
		for (var r = t[e.length - 1], i = 104, a = e.length - 1; a >= 0; --a) for (var o = e[a], s = 0; s != 7; ++s) o & 64 && (r ^= n[i]), o *= 2, --i;
		return r;
	};
	return function(t) {
		for (var n = Ps(t), r = a(n), o = n.length, s = I(16), c = 0; c != 16; ++c) s[c] = 0;
		var l, u, d;
		for ((o & 1) == 1 && (l = r >> 8, s[o] = i(e[0], l), --o, l = r & 255, u = n[n.length - 1], s[o] = i(u, l)); o > 0;) --o, l = r >> 8, s[o] = i(n[o], l), --o, l = r & 255, s[o] = i(n[o], l);
		for (o = 15, d = 15 - n.length; d > 0;) l = r >> 8, s[o] = i(e[d], l), --o, --d, l = r & 255, s[o] = i(n[o], l), --o, --d;
		return s;
	};
})(), Qs = function(e, t, n, r, i) {
	i || (i = t), r || (r = Zs(e));
	var a, o;
	for (a = 0; a != t.length; ++a) o = t[a], o ^= r[n], o = (o >> 5 | o << 3) & 255, i[a] = o, ++n;
	return [
		i,
		n,
		r
	];
}, $s = function(e) {
	var t = 0, n = Zs(e);
	return function(e) {
		var r = Qs("", e, t, n);
		return t = r[1], r[0];
	};
};
function ec(e, t, n, r) {
	var i = {
		key: xa(e),
		verificationBytes: xa(e)
	};
	return n.password && (i.verifier = Xs(n.password)), r.valid = i.verificationBytes === i.verifier, r.valid && (r.insitu = $s(n.password)), i;
}
function tc(e, t, n) {
	var r = n || {};
	return r.Info = e.read_shift(2), e.l -= 2, r.Info === 1 ? r.Data = Ys(e, t) : r.Data = Js(e, t), r;
}
function nc(e, t, n) {
	var r = { Type: n.biff >= 8 ? e.read_shift(2) : 0 };
	return r.Type ? tc(e, t - 2, r) : ec(e, n.biff >= 8 ? t : t - 2, n, r), r;
}
function rc(e, t) {
	switch (t.type) {
		case "base64": return ic(M(e), t);
		case "binary": return ic(e, t);
		case "buffer": return ic(N && Buffer.isBuffer(e) ? e.toString("binary") : z(e), t);
		case "array": return ic(xt(e), t);
	}
	throw Error("Unrecognized type " + t.type);
}
function ic(e, t) {
	var n = t || {}, r = {}, i = n.dense;
	i && (r["!data"] = []);
	var a = Lt(e, "\\trowd", "\\row");
	if (!a) throw Error("RTF missing table");
	var o = {
		s: {
			c: 0,
			r: 0
		},
		e: {
			c: 0,
			r: a.length - 1
		}
	}, s = [];
	return a.forEach(function(e, t) {
		i && (s = r["!data"][t] = []);
		for (var a = /\\[\w\-]+\b/g, c = 0, l, u = -1, d = []; (l = a.exec(e)) != null;) {
			var f = e.slice(c, a.lastIndex - l[0].length);
			switch (f.charCodeAt(0) == 32 && (f = f.slice(1)), f.length && d.push(f), l[0]) {
				case "\\cell":
					if (++u, d.length) {
						var p = {
							v: d.join(""),
							t: "s"
						};
						p.v == "TRUE" || p.v == "FALSE" ? (p.v = p.v == "TRUE", p.t = "b") : isNaN(wt(p.v)) ? Ii[p.v] != null && (p.t = "e", p.w = p.v, p.v = Ii[p.v]) : (p.t = "n", n.cellText !== !1 && (p.w = p.v), p.v = wt(p.v)), i ? s[u] = p : r[zr({
							r: t,
							c: u
						})] = p;
					}
					d = [];
					break;
				case "\\par":
					d.push("\n");
					break;
			}
			c = a.lastIndex;
		}
		u > o.e.c && (o.e.c = u);
	}), r["!ref"] = Vr(o), r;
}
function ac(e, t) {
	var n = Kr(rc(e, t), t);
	return n.bookType = "rtf", n;
}
function oc(e) {
	var t = e.slice(+(e[0] === "#")).slice(0, 6);
	return [
		parseInt(t.slice(0, 2), 16),
		parseInt(t.slice(2, 4), 16),
		parseInt(t.slice(4, 6), 16)
	];
}
function sc(e) {
	for (var t = 0, n = 1; t != 3; ++t) n = n * 256 + (e[t] > 255 ? 255 : e[t] < 0 ? 0 : e[t]);
	return n.toString(16).toUpperCase().slice(1);
}
function cc(e) {
	var t = e[0] / 255, n = e[1] / 255, r = e[2] / 255, i = Math.max(t, n, r), a = Math.min(t, n, r), o = i - a;
	if (o === 0) return [
		0,
		0,
		t
	];
	var s = 0, c = 0, l = i + a;
	switch (c = o / (l > 1 ? 2 - l : l), i) {
		case t:
			s = ((n - r) / o + 6) % 6;
			break;
		case n:
			s = (r - t) / o + 2;
			break;
		case r:
			s = (t - n) / o + 4;
			break;
	}
	return [
		s / 6,
		c,
		l / 2
	];
}
function lc(e) {
	var t = e[0], n = e[1], r = e[2], i = n * 2 * (r < .5 ? r : 1 - r), a = r - i / 2, o = [
		a,
		a,
		a
	], s = 6 * t, c;
	if (n !== 0) switch (s | 0) {
		case 0:
		case 6:
			c = i * s, o[0] += i, o[1] += c;
			break;
		case 1:
			c = i * (2 - s), o[0] += c, o[1] += i;
			break;
		case 2:
			c = i * (s - 2), o[1] += i, o[2] += c;
			break;
		case 3:
			c = i * (4 - s), o[1] += c, o[2] += i;
			break;
		case 4:
			c = i * (s - 4), o[2] += i, o[0] += c;
			break;
		case 5:
			c = i * (6 - s), o[2] += c, o[0] += i;
			break;
	}
	for (var l = 0; l != 3; ++l) o[l] = Math.round(o[l] * 255);
	return o;
}
function uc(e, t) {
	if (t === 0) return e;
	var n = cc(oc(e));
	return t < 0 ? n[2] *= 1 + t : n[2] = 1 - (1 - n[2]) * (1 - t), sc(lc(n));
}
function dc(e, t) {
	var n = {};
	if (e == null) return n;
	if (e.auto != null && (n.auto = Z(e.auto)), e.rgb != null && (n.rgb = e.rgb.slice(-6).toUpperCase()), e.indexed != null) {
		n.indexed = parseInt(e.indexed, 10), n.index = n.indexed;
		var r = Pi[n.indexed];
		n.indexed == 81 && (r = Pi[1]), r || (r = Pi[1]), r && (n.rgb = sc(r));
	}
	return e.theme != null && (n.theme = parseInt(e.theme, 10), e.tint != null && (n.tint = parseFloat(e.tint)), t && t.themeElements && t.themeElements.clrScheme && t.themeElements.clrScheme[n.theme] && (n.raw_rgb = t.themeElements.clrScheme[n.theme].rgb, n.rgb = uc(n.raw_rgb, n.tint || 0))), e.tint != null && n.tint == null && (n.tint = parseFloat(e.tint)), n;
}
function fc(e, t) {
	if (!e) return e;
	var n = St(e);
	if (n.rgb && (n.rgb = ("" + n.rgb).slice(-6).toUpperCase()), n.indexed != null && !n.rgb) {
		var r = Pi[n.indexed];
		n.indexed == 81 && (r = Pi[1]), r || (r = Pi[1]), r && (n.rgb = sc(r));
	}
	return n.index != null && n.indexed == null && (n.indexed = n.index), n.theme != null && t && t.themeElements && t.themeElements.clrScheme && t.themeElements.clrScheme[n.theme] && (n.raw_rgb = t.themeElements.clrScheme[n.theme].rgb, n.rgb = uc(n.raw_rgb, n.tint || 0)), n;
}
function pc(e, t) {
	if (!e) return e;
	var n = St(e);
	return n.color && (n.color = fc(n.color, t)), n.fgColor && (n.fgColor = fc(n.fgColor, t)), n.bgColor && (n.bgColor = fc(n.bgColor, t)), [
		"left",
		"right",
		"top",
		"bottom",
		"diagonal",
		"horizontal",
		"vertical",
		"start",
		"end"
	].forEach(function(e) {
		n[e] && n[e].color && (n[e].color = fc(n[e].color, t));
	}), n.gradientFill && n.gradientFill.stops && n.gradientFill.stops.forEach(function(e) {
		e.color && (e.color = fc(e.color, t));
	}), n;
}
var mc = 6, hc = 15, gc = 1, _c = mc;
function vc(e) {
	return Math.floor((e + Math.round(128 / _c) / 256) * _c);
}
function yc(e) {
	return Math.floor((e - 5) / _c * 100 + .5) / 100;
}
function bc(e) {
	return Math.round((e * _c + 5) / _c * 256) / 256;
}
function xc(e) {
	return bc(yc(vc(e)));
}
function Sc(e) {
	var t = Math.abs(e - xc(e)), n = _c;
	if (t > .005) for (_c = gc; _c < hc; ++_c) Math.abs(e - xc(e)) <= t && (t = Math.abs(e - xc(e)), n = _c);
	_c = n;
}
function Cc(e) {
	e.width ? (e.wpx = vc(e.width), e.wch = yc(e.wpx), e.MDW = _c) : e.wpx ? (e.wch = yc(e.wpx), e.width = bc(e.wch), e.MDW = _c) : typeof e.wch == "number" && (e.width = bc(e.wch), e.wpx = vc(e.width), e.MDW = _c), e.customWidth && delete e.customWidth;
}
var wc = 255, Tc = 5;
function Ec(e) {
	return e > wc ? wc : e < 0 ? 0 : e;
}
function Dc(e) {
	return Ec(bc(yc(Math.max(0, e))));
}
function Oc(e) {
	return e ? e.wpx == null ? e.width == null ? e.wch == null ? 64 : vc(bc(e.wch)) : vc(e.width) : e.wpx : 64;
}
function kc(e, t) {
	return e || (e = {}), e.wpx = Math.max(0, Math.ceil(t)), e.wch = yc(e.wpx), e.width = Dc(e.wpx), e.MDW = _c, e.bestFit = !0, e.customWidth = !0, e;
}
function Ac(e) {
	var t = +(e && e.font || {}).sz;
	return t > 0 ? t : 11;
}
function jc(e) {
	return (e && e.font || {}).name || "Calibri";
}
function Mc(e) {
	var t = e && e.font || {}, n = [];
	t.italic && n.push("italic"), t.bold && n.push("bold"), n.push(Ac(e) + "pt");
	var r = jc(e);
	return /[,\s'"]/.test(r) && (r = "\"" + String(r).replace(/"/g, "\\\"") + "\""), n.push(r), n.join(" ");
}
function Nc(e, t) {
	var n = e.charCodeAt(0);
	return n == 9 || n == 32 ? t * .33 : n >= 48 && n <= 57 ? t * .52 : n >= 65 && n <= 90 ? t * .62 : n >= 97 && n <= 122 ? "iljtfr".indexOf(e) > -1 ? t * .28 : "mw".indexOf(e) > -1 ? t * .82 : t * .5 : n >= 11904 ? t : t * .52;
}
function Pc(e, t) {
	for (var n = Kc(Ac(t)), r = 0, i = 0; i < e.length; ++i) r += Nc(e.charAt(i), n);
	return r;
}
function Fc(e, t, n) {
	var r = n || {}, i = (e == null ? "" : String(e)).split(/\r\n|\n|\r/g), a = 0, o = 0, s = 0;
	if (r.measureText) for (o = 0; o < i.length; ++o) s = +r.measureText(i[o], Mc(t), t || {}), isFinite(s) && s > a && (a = s);
	else {
		var c = r.canvas, l = null;
		if (!c && typeof document < "u" && document.createElement) try {
			c = document.createElement("canvas");
		} catch {}
		try {
			l = c && c.getContext && c.getContext("2d");
		} catch {
			l = null;
		}
		if (l && l.measureText) for (l.font = Mc(t), o = 0; o < i.length; ++o) s = l.measureText(i[o]).width, isFinite(s) && s > a && (a = s);
		else for (o = 0; o < i.length; ++o) s = Pc(i[o], t || {}), isFinite(s) && s > a && (a = s);
	}
	return a;
}
function Ic(e, t) {
	return !e || e.v == null ? "" : (e.w == null && e.t != "z" && Gr(e), String(e.w == null ? e.v : e.w));
}
function Lc(e, t) {
	var n = String(e == null ? "" : e).split(/\r\n|\n|\r/g), r = [], i = 0, a = 0, o = null;
	if (!t) return n;
	for (i = 0; i < n.length; ++i) {
		for (o = n[i].split(/[\t \u00A0\-\/]+/), a = 0; a < o.length; ++a) o[a] && r.push(o[a]);
		(!o.length || o.length == 1 && !o[0]) && r.push(n[i]);
	}
	return r.length ? r : [""];
}
function Rc(e, t, n, r) {
	var i = {}, a = e["!cols"] || [], o = e["!rows"] || [];
	return a[r] && a[r].s && ff(i, a[r].s), o[n] && o[n].s && ff(i, o[n].s), t && t.s && ff(i, t.s), i;
}
function zc(e, t, n) {
	for (var r = n || {}, i = Ic(e, r), a = t && t.alignment || {}, o = Lc(i, !!a.wrapText), s = 0, c = 0, l = 0; l < o.length; ++l) c = Fc(o[l], t, r), c > s && (s = c);
	var u = +a.indent || 0;
	u > 0 && (s += u * 3 * Math.max(1, _c));
	var d = +a.textRotation || 0;
	if (d == 255 && (d = 90), d > 90 && (d = 90 - d), d < 0 && (d = -d), d > 0 && d < 90) {
		var f = d * Math.PI / 180, p = Kc(Ac(t));
		s = Math.abs(s * Math.cos(f)) + Math.abs(p * Math.sin(f));
	} else d >= 90 && (s = Math.max(_c + Tc, Kc(Ac(t)) + 2));
	return s + (r.padding == null ? Tc : +r.padding);
}
function Bc(e) {
	for (var t = {}, n = 0; n < e.length; ++n) t[e[n].s.r + ":" + e[n].s.c] = e[n];
	return t;
}
function Vc(e, t, n) {
	for (var r = 0; r < e.length; ++r) {
		var i = e[r];
		if (i.s.r <= t && t <= i.e.r && i.s.c <= n && n <= i.e.c) return !(i.s.r == t && i.s.c == n);
	}
	return !1;
}
function Hc(e, t) {
	var n = t || {}, r = _c;
	n.MDW && (_c = +n.MDW || _c);
	var i = n.range ? typeof n.range == "string" ? Br(n.range) : n.range : Br(e["!ref"] || "A1"), a = e["!cols"] || [], o = e["!rows"] || [], s = [], c = [], l = n.minPx == null ? n.min == null ? 0 : vc(bc(+n.min)) : +n.minPx, u = n.maxPx == null ? vc(wc) : +n.maxPx, d = n.includeMerged === !1 ? [] : e["!merges"] || [], f = Bc(d), p = e["!data"] != null, m = 0, h = 0, g = 0, _ = null, v = 0, y = null, b = null, x = 0, S = 0;
	for (m = i.s.c; m <= i.e.c; ++m) s[m] = St(a[m] || {}), !(s[m] && s[m].hidden && n.skipHidden) && (c[m] = s[m] && (s[m].wpx != null || s[m].width != null || s[m].wch != null) ? Oc(s[m]) : l);
	for (h = i.s.r; h <= i.e.r; ++h) if (!(o[h] && o[h].hidden && n.skipHidden)) {
		for (m = i.s.c; m <= i.e.c; ++m) if (!(s[m] && s[m].hidden && n.skipHidden) && !Vc(d, h, m) && (y = p ? (e["!data"][h] || [])[m] : e[zr({
			r: h,
			c: m
		})], !(!y || y.v == null))) if (b = Rc(e, y, h, m), x = zc(y, b, n), b && b.alignment && b.alignment.shrinkToFit && c[m] && (x = Math.min(x, c[m])), _ = f[h + ":" + m], g = _ ? _.e.c - _.s.c + 1 : 1, g > 1) {
			for (S = 0, v = 0; v < g; ++v) S += c[m + v] || l;
			if (x > S) for (v = 0; v < g; ++v) c[m + v] = Math.min(u, Math.max(c[m + v] || l, (c[m + v] || l) + (x - S) / g));
		} else c[m] = Math.min(u, Math.max(c[m] || l, x));
	}
	for (m = i.s.c; m <= i.e.c; ++m) c[m] != null && (s[m] = kc(s[m] || {}, Math.min(u, Math.max(l, c[m]))));
	return n.set === !1 ? (_c = r, s) : (e["!cols"] = s, _c = r, s);
}
var Uc = 96;
function Wc(e) {
	return e * 96 / Uc;
}
function Gc(e) {
	return e * Uc / 96;
}
function Kc(e) {
	return e * 96 / 72;
}
function qc(e) {
	return e * 72 / 96;
}
var Jc = {
	None: "none",
	Solid: "solid",
	Gray50: "mediumGray",
	Gray75: "darkGray",
	Gray25: "lightGray",
	HorzStripe: "darkHorizontal",
	VertStripe: "darkVertical",
	ReverseDiagStripe: "darkDown",
	DiagStripe: "darkUp",
	DiagCross: "darkGrid",
	ThickDiagCross: "darkTrellis",
	ThinHorzStripe: "lightHorizontal",
	ThinVertStripe: "lightVertical",
	ThinReverseDiagStripe: "lightDown",
	ThinHorzCross: "lightGrid"
};
function Yc(e, t, n, r) {
	t.Borders = [];
	var i = {}, a = "", o = !1;
	(e.match(sn) || []).forEach(function(e) {
		var s = X(e);
		switch (dn(s[0])) {
			case "<borders":
			case "<borders>":
			case "</borders>": break;
			case "<border":
			case "<border>":
			case "<border/>":
				i = {}, s.diagonalUp && (i.diagonalUp = Z(s.diagonalUp)), s.diagonalDown && (i.diagonalDown = Z(s.diagonalDown)), t.Borders.push(i);
				break;
			case "</border>": break;
			case "<left/>":
				i.left = {}, s.style && (i.left.style = s.style);
				break;
			case "<left":
			case "<left>":
				a = "left", i[a] = i[a] || {}, s.style && (i[a].style = s.style);
				break;
			case "</left>":
				a = "";
				break;
			case "<right/>":
				i.right = {}, s.style && (i.right.style = s.style);
				break;
			case "<right":
			case "<right>":
				a = "right", i[a] = i[a] || {}, s.style && (i[a].style = s.style);
				break;
			case "</right>":
				a = "";
				break;
			case "<top/>":
				i.top = {}, s.style && (i.top.style = s.style);
				break;
			case "<top":
			case "<top>":
				a = "top", i[a] = i[a] || {}, s.style && (i[a].style = s.style);
				break;
			case "</top>":
				a = "";
				break;
			case "<bottom/>":
				i.bottom = {}, s.style && (i.bottom.style = s.style);
				break;
			case "<bottom":
			case "<bottom>":
				a = "bottom", i[a] = i[a] || {}, s.style && (i[a].style = s.style);
				break;
			case "</bottom>":
				a = "";
				break;
			case "<diagonal/>":
				i.diagonal = {}, s.style && (i.diagonal.style = s.style);
				break;
			case "<diagonal":
			case "<diagonal>":
				a = "diagonal", i[a] = i[a] || {}, s.style && (i[a].style = s.style);
				break;
			case "</diagonal>":
				a = "";
				break;
			case "<horizontal/>":
				i.horizontal = {}, s.style && (i.horizontal.style = s.style);
				break;
			case "<horizontal":
			case "<horizontal>":
				a = "horizontal", i[a] = i[a] || {}, s.style && (i[a].style = s.style);
				break;
			case "</horizontal>":
				a = "";
				break;
			case "<vertical/>":
				i.vertical = {}, s.style && (i.vertical.style = s.style);
				break;
			case "<vertical":
			case "<vertical>":
				a = "vertical", i[a] = i[a] || {}, s.style && (i[a].style = s.style);
				break;
			case "</vertical>":
				a = "";
				break;
			case "<start/>":
				i.start = {}, s.style && (i.start.style = s.style);
				break;
			case "<start":
			case "<start>":
				a = "start", i[a] = i[a] || {}, s.style && (i[a].style = s.style);
				break;
			case "</start>":
				a = "";
				break;
			case "<end/>":
				i.end = {}, s.style && (i.end.style = s.style);
				break;
			case "<end":
			case "<end>":
				a = "end", i[a] = i[a] || {}, s.style && (i[a].style = s.style);
				break;
			case "</end>":
				a = "";
				break;
			case "<color":
			case "<color>":
				a && (i[a].color = dc(s, n));
				break;
			case "<color/>":
			case "</color>": break;
			case "<extLst":
			case "<extLst>":
			case "</extLst>": break;
			case "<ext":
				o = !0;
				break;
			case "</ext>":
				o = !1;
				break;
			default: if (r && r.WTF && !o) throw Error("unrecognized " + s[0] + " in borders");
		}
	});
}
function Xc(e, t, n, r) {
	t.Fills = [];
	var i = {}, a = null, o = null, s = !1;
	(e.match(sn) || []).forEach(function(e) {
		var c = X(e);
		switch (dn(c[0])) {
			case "<fills":
			case "<fills>":
			case "</fills>": break;
			case "<fill>":
			case "<fill":
			case "<fill/>":
				i = {}, t.Fills.push(i);
				break;
			case "</fill>": break;
			case "<gradientFill>":
				a = { stops: [] }, i.gradientFill = a;
				break;
			case "<gradientFill":
				a = { stops: [] }, c.type && (a.type = c.type), c.degree && (a.degree = parseFloat(c.degree)), [
					"left",
					"right",
					"top",
					"bottom"
				].forEach(function(e) {
					c[e] != null && (a[e] = parseFloat(c[e]));
				}), i.gradientFill = a;
				break;
			case "</gradientFill>":
				a = null;
				break;
			case "<patternFill":
			case "<patternFill>":
				c.patternType && (i.patternType = c.patternType);
				break;
			case "<patternFill/>":
			case "</patternFill>": break;
			case "<bgColor":
				i.bgColor = dc(c, n);
				break;
			case "<bgColor/>":
			case "</bgColor>": break;
			case "<fgColor":
				i.fgColor = dc(c, n);
				break;
			case "<fgColor/>":
			case "</fgColor>": break;
			case "<stop":
				o = {}, c.position != null && (o.position = parseFloat(c.position)), a && a.stops.push(o);
				break;
			case "<stop/>":
				a && (o = {}, c.position != null && (o.position = parseFloat(c.position)), a.stops.push(o)), o = null;
				break;
			case "</stop>":
				o = null;
				break;
			case "<color":
				o && (o.color = dc(c, n));
				break;
			case "<color/>":
				o && (o.color = dc(c, n));
				break;
			case "</color>": break;
			case "<extLst":
			case "<extLst>":
			case "</extLst>": break;
			case "<ext":
				s = !0;
				break;
			case "</ext>":
				s = !1;
				break;
			default: if (r && r.WTF && !s) throw Error("unrecognized " + c[0] + " in fills");
		}
	});
}
function Zc(e, t, n, r) {
	t.Fonts = [];
	var i = {}, a = !1;
	(e.match(sn) || []).forEach(function(e) {
		var o = X(e);
		switch (dn(o[0])) {
			case "<fonts":
			case "<fonts>":
			case "</fonts>": break;
			case "<font":
			case "<font>": break;
			case "</font>":
			case "<font/>":
				t.Fonts.push(i), i = {};
				break;
			case "<name":
				o.val && (i.name = Tn(o.val));
				break;
			case "<name/>":
			case "</name>": break;
			case "<b":
				i.bold = o.val ? Z(o.val) : 1;
				break;
			case "<b/>":
				i.bold = 1;
				break;
			case "</b>":
			case "</b": break;
			case "<i":
				i.italic = o.val ? Z(o.val) : 1;
				break;
			case "<i/>":
				i.italic = 1;
				break;
			case "</i>":
			case "</i": break;
			case "<u":
				switch (o.val) {
					case "none":
						i.underline = 0;
						break;
					case "single":
						i.underline = 1;
						break;
					case "double":
						i.underline = 2;
						break;
					case "singleAccounting":
						i.underline = 33;
						break;
					case "doubleAccounting":
						i.underline = 34;
						break;
				}
				break;
			case "<u/>":
				i.underline = 1;
				break;
			case "</u>":
			case "</u": break;
			case "<strike":
				i.strike = o.val ? Z(o.val) : 1;
				break;
			case "<strike/>":
				i.strike = 1;
				break;
			case "</strike>":
			case "</strike": break;
			case "<outline":
				i.outline = o.val ? Z(o.val) : 1;
				break;
			case "<outline/>":
				i.outline = 1;
				break;
			case "</outline>":
			case "</outline": break;
			case "<shadow":
				i.shadow = o.val ? Z(o.val) : 1;
				break;
			case "<shadow/>":
				i.shadow = 1;
				break;
			case "</shadow>":
			case "</shadow": break;
			case "<condense":
				i.condense = o.val ? Z(o.val) : 1;
				break;
			case "<condense/>":
				i.condense = 1;
				break;
			case "</condense>":
			case "</condense": break;
			case "<extend":
				i.extend = o.val ? Z(o.val) : 1;
				break;
			case "<extend/>":
				i.extend = 1;
				break;
			case "</extend>":
			case "</extend": break;
			case "<sz":
				o.val && (i.sz = +o.val);
				break;
			case "<sz/>":
			case "</sz>":
			case "</sz": break;
			case "<vertAlign":
				o.val && (i.vertAlign = o.val);
				break;
			case "<vertAlign/>":
			case "</vertAlign>":
			case "</vertAlign": break;
			case "<family":
				o.val && (i.family = parseInt(o.val, 10));
				break;
			case "<family/>":
			case "</family>":
			case "</family": break;
			case "<scheme":
				o.val && (i.scheme = o.val);
				break;
			case "<scheme/>":
			case "</scheme>":
			case "</scheme": break;
			case "<charset":
				if (o.val == "1") break;
				o.codepage = h[parseInt(o.val, 10)];
				break;
			case "<charset/>":
			case "</charset>":
			case "</charset": break;
			case "<color":
				i.color = dc(o, n);
				break;
			case "<color/>":
			case "</color>":
			case "</color": break;
			case "<AlternateContent":
				a = !0;
				break;
			case "</AlternateContent>":
			case "</AlternateContent":
				a = !1;
				break;
			case "<extLst":
			case "<extLst>":
			case "</extLst>": break;
			case "<ext":
				a = !0;
				break;
			case "</ext>":
				a = !1;
				break;
			default: if (r && r.WTF && !a) throw Error("unrecognized " + o[0] + " in fonts");
		}
	});
}
function Qc(e, t, n) {
	t.NumberFmt = [];
	for (var r = lt(J), i = 0; i < r.length; ++i) t.NumberFmt[r[i]] = J[r[i]];
	var a = e.match(sn);
	if (a) for (i = 0; i < a.length; ++i) {
		var o = X(a[i]);
		switch (dn(o[0])) {
			case "<numFmts":
			case "</numFmts>":
			case "<numFmts/>":
			case "<numFmts>": break;
			case "<numFmt":
				var s = mn(Tn(o.formatCode)), c = parseInt(o.numFmtId, 10);
				if (t.NumberFmt[c] = s, c > 0) {
					if (c > 392) {
						for (c = 392; c > 60 && t.NumberFmt[c] != null; --c);
						t.NumberFmt[c] = s;
					}
					it(s, c);
				}
				break;
			case "</numFmt>": break;
			default: if (n.WTF) throw Error("unrecognized " + o[0] + " in numFmts");
		}
	}
}
var $c = [
	"numFmtId",
	"fillId",
	"fontId",
	"borderId",
	"xfId"
], el = [
	"applyAlignment",
	"applyBorder",
	"applyFill",
	"applyFont",
	"applyNumberFormat",
	"applyProtection",
	"pivotButton",
	"quotePrefix"
];
function tl(e, t, n, r) {
	t[r] = [];
	var i, a = !1;
	(e.match(sn) || []).forEach(function(e) {
		var o = X(e), s = 0;
		switch (dn(o[0])) {
			case "<cellXfs":
			case "<cellXfs>":
			case "<cellXfs/>":
			case "</cellXfs>":
			case "<cellStyleXfs":
			case "<cellStyleXfs>":
			case "<cellStyleXfs/>":
			case "</cellStyleXfs>": break;
			case "<xf":
			case "<xf/>":
			case "<xf>":
				for (i = o, delete i[0], s = 0; s < $c.length; ++s) i[$c[s]] && (i[$c[s]] = parseInt(i[$c[s]], 10));
				for (s = 0; s < el.length; ++s) i[el[s]] && (i[el[s]] = Z(i[el[s]]));
				if (t.NumberFmt && i.numFmtId > 392) {
					for (s = 392; s > 60; --s) if (t.NumberFmt[i.numFmtId] == t.NumberFmt[s]) {
						i.numFmtId = s;
						break;
					}
				}
				t[r].push(i);
				break;
			case "</xf>": break;
			case "<alignment":
			case "<alignment/>":
			case "<alignment>":
				var c = {};
				o.vertical && (c.vertical = o.vertical), o.horizontal && (c.horizontal = o.horizontal), o.textRotation != null && (c.textRotation = parseInt(o.textRotation, 10)), o.indent && (c.indent = parseInt(o.indent, 10)), o.relativeIndent && (c.relativeIndent = parseInt(o.relativeIndent, 10)), o.readingOrder && (c.readingOrder = parseInt(o.readingOrder, 10)), o.wrapText && (c.wrapText = Z(o.wrapText)), o.shrinkToFit && (c.shrinkToFit = Z(o.shrinkToFit)), o.justifyLastLine && (c.justifyLastLine = Z(o.justifyLastLine)), i.alignment = c;
				break;
			case "</alignment>": break;
			case "<protection":
			case "<protection>":
				var l = {};
				o.locked != null && (l.locked = Z(o.locked)), o.hidden != null && (l.hidden = Z(o.hidden)), i.protection = l;
				break;
			case "<protection/>":
				l = {}, o.locked != null && (l.locked = Z(o.locked)), o.hidden != null && (l.hidden = Z(o.hidden)), i.protection = l;
				break;
			case "</protection>": break;
			case "<AlternateContent":
			case "<AlternateContent>":
				a = !0;
				break;
			case "</AlternateContent>":
				a = !1;
				break;
			case "<extLst":
			case "<extLst>":
			case "</extLst>": break;
			case "<ext":
				a = !0;
				break;
			case "</ext>":
				a = !1;
				break;
			default: if (n && n.WTF && !a) throw Error("unrecognized " + o[0] + " in cellXfs");
		}
	});
}
function nl(e, t, n) {
	tl(e, t, n, "CellXf");
}
function rl(e, t, n) {
	tl(e, t, n, "CellStyleXf");
}
function il(e, t, n) {
	t.CellStyles = [], (e.match(sn) || []).forEach(function(e) {
		var r = X(e);
		switch (dn(r[0])) {
			case "<cellStyles":
			case "<cellStyles>":
			case "<cellStyles/>":
			case "</cellStyles>": break;
			case "<cellStyle":
			case "<cellStyle/>":
				delete r[0], r.xfId != null && (r.xfId = parseInt(r.xfId, 10)), r.builtinId != null && (r.builtinId = parseInt(r.builtinId, 10)), r.iLevel != null && (r.iLevel = parseInt(r.iLevel, 10)), r.customBuiltin != null && (r.customBuiltin = Z(r.customBuiltin)), r.hidden != null && (r.hidden = Z(r.hidden)), r.name && (r.name = Tn(r.name)), t.CellStyles.push(r);
				break;
			case "</cellStyle>": break;
			default: if (n && n.WTF) throw Error("unrecognized " + r[0] + " in cellStyles");
		}
	});
}
function al(e, t, n, r) {
	t.Dxfs = [];
	var i = null, a = null, o = null, s = null, c = "", l = !1;
	(e.match(sn) || []).forEach(function(e) {
		var u = X(e);
		switch (dn(u[0])) {
			case "<dxfs":
			case "<dxfs>":
			case "<dxfs/>":
			case "</dxfs>": break;
			case "<dxf":
			case "<dxf>":
				i = {}, t.Dxfs.push(i);
				break;
			case "<dxf/>":
				t.Dxfs.push({}), i = null;
				break;
			case "</dxf>":
				i = null;
				break;
			case "<font":
			case "<font>":
				a = {}, i && (i.font = a);
				break;
			case "</font>":
			case "<font/>":
				a = null;
				break;
			case "<name":
				a && u.val && (a.name = Tn(u.val));
				break;
			case "<name/>":
			case "</name>": break;
			case "<b":
				a && (a.bold = u.val ? Z(u.val) : 1);
				break;
			case "<b/>":
				a && (a.bold = 1);
				break;
			case "</b>": break;
			case "<i":
				a && (a.italic = u.val ? Z(u.val) : 1);
				break;
			case "<i/>":
				a && (a.italic = 1);
				break;
			case "</i>": break;
			case "<u":
				a && (a.underline = u.val || 1);
				break;
			case "<u/>":
				a && (a.underline = 1);
				break;
			case "</u>": break;
			case "<strike":
				a && (a.strike = u.val ? Z(u.val) : 1);
				break;
			case "<strike/>":
				a && (a.strike = 1);
				break;
			case "</strike>": break;
			case "<sz":
				a && u.val && (a.sz = +u.val);
				break;
			case "<sz/>":
			case "</sz>": break;
			case "<outline":
				a && (a.outline = u.val ? Z(u.val) : 1);
				break;
			case "<outline/>":
				a && (a.outline = 1);
				break;
			case "</outline>": break;
			case "<shadow":
				a && (a.shadow = u.val ? Z(u.val) : 1);
				break;
			case "<shadow/>":
				a && (a.shadow = 1);
				break;
			case "</shadow>": break;
			case "<condense":
				a && (a.condense = u.val ? Z(u.val) : 1);
				break;
			case "<condense/>":
				a && (a.condense = 1);
				break;
			case "</condense>": break;
			case "<extend":
				a && (a.extend = u.val ? Z(u.val) : 1);
				break;
			case "<extend/>":
				a && (a.extend = 1);
				break;
			case "</extend>": break;
			case "<vertAlign":
				a && u.val && (a.vertAlign = u.val);
				break;
			case "<vertAlign/>":
			case "</vertAlign>": break;
			case "<family":
				a && u.val && (a.family = parseInt(u.val, 10));
				break;
			case "<family/>":
			case "</family>": break;
			case "<scheme":
				a && u.val && (a.scheme = u.val);
				break;
			case "<scheme/>":
			case "</scheme>": break;
			case "<charset":
				a && u.val != null && (a.charset = parseInt(u.val, 10));
				break;
			case "<charset/>":
			case "</charset>": break;
			case "<color":
				a ? a.color = dc(u, n) : c && s && (s[c].color = dc(u, n));
				break;
			case "<color/>":
			case "</color>": break;
			case "<fill":
			case "<fill>":
				o = {}, i && (i.fill = o);
				break;
			case "<fill/>":
				o = null;
				break;
			case "</fill>":
				o = null;
				break;
			case "<patternFill":
			case "<patternFill>":
				o && u.patternType && (o.patternType = u.patternType);
				break;
			case "<patternFill/>":
			case "</patternFill>": break;
			case "<fgColor":
				o && (o.fgColor = dc(u, n));
				break;
			case "<fgColor/>":
			case "</fgColor>": break;
			case "<bgColor":
				o && (o.bgColor = dc(u, n));
				break;
			case "<bgColor/>":
			case "</bgColor>": break;
			case "<border":
			case "<border>":
				s = {}, i && (i.border = s);
				break;
			case "<border/>":
				s = null;
				break;
			case "</border>":
				s = null;
				break;
			case "<left":
			case "<left>":
			case "<left/>":
				c = "left", s && (s[c] = s[c] || {}, u.style && (s[c].style = u.style)), u[0].slice(-2) == "/>" && (c = "");
				break;
			case "</left>":
				c = "";
				break;
			case "<right":
			case "<right>":
			case "<right/>":
				c = "right", s && (s[c] = s[c] || {}, u.style && (s[c].style = u.style)), u[0].slice(-2) == "/>" && (c = "");
				break;
			case "</right>":
				c = "";
				break;
			case "<top":
			case "<top>":
			case "<top/>":
				c = "top", s && (s[c] = s[c] || {}, u.style && (s[c].style = u.style)), u[0].slice(-2) == "/>" && (c = "");
				break;
			case "</top>":
				c = "";
				break;
			case "<bottom":
			case "<bottom>":
			case "<bottom/>":
				c = "bottom", s && (s[c] = s[c] || {}, u.style && (s[c].style = u.style)), u[0].slice(-2) == "/>" && (c = "");
				break;
			case "</bottom>":
				c = "";
				break;
			case "<diagonal":
			case "<diagonal>":
			case "<diagonal/>":
				c = "diagonal", s && (s[c] = s[c] || {}, u.style && (s[c].style = u.style)), u[0].slice(-2) == "/>" && (c = "");
				break;
			case "</diagonal>":
				c = "";
				break;
			case "<horizontal":
			case "<horizontal>":
			case "<horizontal/>":
				c = "horizontal", s && (s[c] = s[c] || {}, u.style && (s[c].style = u.style)), u[0].slice(-2) == "/>" && (c = "");
				break;
			case "</horizontal>":
				c = "";
				break;
			case "<vertical":
			case "<vertical>":
			case "<vertical/>":
				c = "vertical", s && (s[c] = s[c] || {}, u.style && (s[c].style = u.style)), u[0].slice(-2) == "/>" && (c = "");
				break;
			case "</vertical>":
				c = "";
				break;
			case "<start":
			case "<start>":
			case "<start/>":
				c = "start", s && (s[c] = s[c] || {}, u.style && (s[c].style = u.style)), u[0].slice(-2) == "/>" && (c = "");
				break;
			case "</start>":
				c = "";
				break;
			case "<end":
			case "<end>":
			case "<end/>":
				c = "end", s && (s[c] = s[c] || {}, u.style && (s[c].style = u.style)), u[0].slice(-2) == "/>" && (c = "");
				break;
			case "</end>":
				c = "";
				break;
			case "<alignment":
				i && (i.alignment = {}, u.vertical && (i.alignment.vertical = u.vertical), u.horizontal && (i.alignment.horizontal = u.horizontal), u.wrapText && (i.alignment.wrapText = Z(u.wrapText)));
				break;
			case "<alignment/>":
			case "</alignment>": break;
			case "<numFmt":
				i && (i.numFmt = {
					numFmtId: u.numFmtId == null ? void 0 : parseInt(u.numFmtId, 10),
					formatCode: u.formatCode ? mn(Tn(u.formatCode)) : void 0
				});
				break;
			case "<numFmt/>":
			case "</numFmt>": break;
			case "<protection":
				i && (i.protection = {}, u.locked != null && (i.protection.locked = Z(u.locked)), u.hidden != null && (i.protection.hidden = Z(u.hidden)));
				break;
			case "<protection/>":
			case "</protection>": break;
			case "<extLst":
			case "<extLst>":
			case "</extLst>": break;
			case "<ext":
				l = !0;
				break;
			case "</ext>":
				l = !1;
				break;
			default: if (r && r.WTF && !l) throw Error("unrecognized " + u[0] + " in dxfs");
		}
	});
}
function ol(e, t, n, r) {
	t.Colors = {
		indexedColors: [],
		mruColors: [],
		themeColors: []
	};
	var i = null, a = !1;
	(e.match(sn) || []).forEach(function(e) {
		var o = X(e);
		switch (dn(o[0])) {
			case "<colors":
			case "<colors>":
			case "</colors>": break;
			case "<indexedColors":
			case "<indexedColors>":
				i = t.Colors.indexedColors;
				break;
			case "</indexedColors>":
				i = null;
				break;
			case "<themeColors":
			case "<themeColors>":
				i = t.Colors.themeColors;
				break;
			case "</themeColors>":
				i = null;
				break;
			case "<mruColors":
			case "<mruColors>":
				i = t.Colors.mruColors;
				break;
			case "</mruColors>":
				i = null;
				break;
			case "<rgbColor":
			case "<rgbColor/>":
				i && i.push(dc(o, n));
				break;
			case "</rgbColor>": break;
			case "<color":
			case "<color/>":
				i && i.push(dc(o, n));
				break;
			case "</color>": break;
			case "<extLst":
			case "<extLst>":
			case "</extLst>": break;
			case "<ext":
				a = !0;
				break;
			case "</ext>":
				a = !1;
				break;
			default: if (r && r.WTF && !a) throw Error("unrecognized " + o[0] + " in colors");
		}
	});
}
var sl = /*#__PURE__*/ (function() {
	return function(e, t, n) {
		var r = {};
		if (!e) return r;
		e = It(Rt(e, "<!--", "-->"));
		var i;
		return (i = Vt(e, "numFmts")) && Qc(i[0], r, n), (i = Vt(e, "fonts")) && Zc(i[0], r, t, n), (i = Vt(e, "fills")) && Xc(i[0], r, t, n), (i = Vt(e, "borders")) && Yc(i[0], r, t, n), (i = Vt(e, "cellStyleXfs")) && rl(i[0], r, n), (i = Vt(e, "cellStyles")) && il(i[0], r, n), (i = Vt(e, "cellXfs")) && nl(i[0], r, n), (i = Vt(e, "dxfs")) && al(i[0], r, t, n), (i = Vt(e, "colors")) && ol(i[0], r, t, n), r;
	};
})();
function cl(e, t) {
	return [e.read_shift(2), Zr(e, t - 2)];
}
function ll(e, t, n) {
	var r = {};
	r.sz = e.read_shift(2) / 20;
	var i = fi(e, 2, n);
	switch (i.fItalic && (r.italic = 1), i.fCondense && (r.condense = 1), i.fExtend && (r.extend = 1), i.fShadow && (r.shadow = 1), i.fOutline && (r.outline = 1), i.fStrikeout && (r.strike = 1), e.read_shift(2) === 700 && (r.bold = 1), e.read_shift(2)) {
		case 1:
			r.vertAlign = "superscript";
			break;
		case 2:
			r.vertAlign = "subscript";
			break;
	}
	var a = e.read_shift(1);
	a != 0 && (r.underline = a);
	var o = e.read_shift(1);
	o > 0 && (r.family = o);
	var s = e.read_shift(1);
	switch (s > 0 && (r.charset = s), e.l++, r.color = di(e, 8), e.read_shift(1)) {
		case 1:
			r.scheme = "major";
			break;
		case 2:
			r.scheme = "minor";
			break;
	}
	return r.name = Zr(e, t - 21), r;
}
var ul = xr;
function dl(e, t) {
	var n = e.l + t, r = e.read_shift(2), i = e.read_shift(2);
	return e.l = n, {
		ixfe: r,
		numFmtId: i
	};
}
var fl = xr;
function pl(e, t, n) {
	var r = {};
	for (var i in r.NumberFmt = [], J) r.NumberFmt[i] = J[i];
	r.CellXf = [], r.Fonts = [];
	var a = [], o = !1;
	return Cr(e, function(e, i, s) {
		switch (s) {
			case 44:
				r.NumberFmt[e[0]] = e[1], it(e[1], e[0]);
				break;
			case 43:
				r.Fonts.push(e), e.color.theme != null && t && t.themeElements && t.themeElements.clrScheme && (e.color.rgb = uc(t.themeElements.clrScheme[e.color.theme].rgb, e.color.tint || 0));
				break;
			case 1025: break;
			case 45: break;
			case 46: break;
			case 47:
				a[a.length - 1] == 617 && r.CellXf.push(e);
				break;
			case 48:
			case 507:
			case 572:
			case 475: break;
			case 1171:
			case 2102:
			case 1130:
			case 512:
			case 2095:
			case 3072: break;
			case 35:
				o = !0;
				break;
			case 36:
				o = !1;
				break;
			case 37:
				a.push(s), o = !0;
				break;
			case 38:
				a.pop(), o = !1;
				break;
			default: if (i.T > 0) a.push(s);
			else if (i.T < 0) a.pop();
			else if (!o || n.WTF && a[a.length - 1] != 37) throw Error("Unexpected record 0x" + s.toString(16));
		}
	}), r;
}
var ml = [
	"</a:lt1>",
	"</a:dk1>",
	"</a:lt2>",
	"</a:dk2>",
	"</a:accent1>",
	"</a:accent2>",
	"</a:accent3>",
	"</a:accent4>",
	"</a:accent5>",
	"</a:accent6>",
	"</a:hlink>",
	"</a:folHlink>"
];
function hl(e, t, n) {
	t.themeElements.clrScheme = [];
	var r = {};
	(e[0].match(sn) || []).forEach(function(e) {
		var i = X(e);
		switch (i[0]) {
			case "<a:clrScheme":
			case "</a:clrScheme>": break;
			case "<a:srgbClr":
				r.rgb = i.val;
				break;
			case "</a:srgbClr>": break;
			case "<a:sysClr":
				r.rgb = i.lastClr;
				break;
			case "</a:sysClr>": break;
			case "</a:dk1>":
			case "</a:lt1>":
			case "<a:dk1>":
			case "<a:lt1>":
			case "<a:dk2>":
			case "</a:dk2>":
			case "<a:lt2>":
			case "</a:lt2>":
			case "<a:accent1>":
			case "</a:accent1>":
			case "<a:accent2>":
			case "</a:accent2>":
			case "<a:accent3>":
			case "</a:accent3>":
			case "<a:accent4>":
			case "</a:accent4>":
			case "<a:accent5>":
			case "</a:accent5>":
			case "<a:accent6>":
			case "</a:accent6>":
			case "<a:hlink>":
			case "</a:hlink>":
			case "<a:folHlink>":
			case "</a:folHlink>":
				i[0].charAt(1) === "/" ? (t.themeElements.clrScheme[ml.indexOf(i[0])] = r, r = {}) : r.name = i[0].slice(3, i[0].length - 1);
				break;
			default: if (n && n.WTF) throw Error("Unrecognized " + i[0] + " in clrScheme");
		}
	});
}
function gl(e, t, n) {
	t.themeElements = {};
	var r;
	if (!(r = Bt(e, "a:clrScheme"))) throw Error("clrScheme not found in themeElements");
	if (hl(r, t, n), !(r = Bt(e, "a:fontScheme"))) throw Error("fontScheme not found in themeElements");
	if (!(r = Bt(e, "a:fmtScheme"))) throw Error("fmtScheme not found in themeElements");
}
function _l(e, t) {
	(!e || e.length === 0) && (e = vl());
	var n, r = {};
	if (!(n = Bt(e, "a:themeElements"))) throw Error("themeElements not found in theme");
	return gl(n[0], r, t), r.raw = e, r;
}
function vl(e, t) {
	if (t && t.themeXLSX) return t.themeXLSX;
	if (e && typeof e.raw == "string") return e.raw;
	var n = [rn];
	return n[n.length] = "<a:theme xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" name=\"Office Theme\">", n[n.length] = "<a:themeElements>", n[n.length] = "<a:clrScheme name=\"Office\">", n[n.length] = "<a:dk1><a:sysClr val=\"windowText\" lastClr=\"000000\"/></a:dk1>", n[n.length] = "<a:lt1><a:sysClr val=\"window\" lastClr=\"FFFFFF\"/></a:lt1>", n[n.length] = "<a:dk2><a:srgbClr val=\"1F497D\"/></a:dk2>", n[n.length] = "<a:lt2><a:srgbClr val=\"EEECE1\"/></a:lt2>", n[n.length] = "<a:accent1><a:srgbClr val=\"4F81BD\"/></a:accent1>", n[n.length] = "<a:accent2><a:srgbClr val=\"C0504D\"/></a:accent2>", n[n.length] = "<a:accent3><a:srgbClr val=\"9BBB59\"/></a:accent3>", n[n.length] = "<a:accent4><a:srgbClr val=\"8064A2\"/></a:accent4>", n[n.length] = "<a:accent5><a:srgbClr val=\"4BACC6\"/></a:accent5>", n[n.length] = "<a:accent6><a:srgbClr val=\"F79646\"/></a:accent6>", n[n.length] = "<a:hlink><a:srgbClr val=\"0000FF\"/></a:hlink>", n[n.length] = "<a:folHlink><a:srgbClr val=\"800080\"/></a:folHlink>", n[n.length] = "</a:clrScheme>", n[n.length] = "<a:fontScheme name=\"Office\">", n[n.length] = "<a:majorFont>", n[n.length] = "<a:latin typeface=\"Cambria\"/>", n[n.length] = "<a:ea typeface=\"\"/>", n[n.length] = "<a:cs typeface=\"\"/>", n[n.length] = "<a:font script=\"Jpan\" typeface=\"ＭＳ Ｐゴシック\"/>", n[n.length] = "<a:font script=\"Hang\" typeface=\"맑은 고딕\"/>", n[n.length] = "<a:font script=\"Hans\" typeface=\"宋体\"/>", n[n.length] = "<a:font script=\"Hant\" typeface=\"新細明體\"/>", n[n.length] = "<a:font script=\"Arab\" typeface=\"Times New Roman\"/>", n[n.length] = "<a:font script=\"Hebr\" typeface=\"Times New Roman\"/>", n[n.length] = "<a:font script=\"Thai\" typeface=\"Tahoma\"/>", n[n.length] = "<a:font script=\"Ethi\" typeface=\"Nyala\"/>", n[n.length] = "<a:font script=\"Beng\" typeface=\"Vrinda\"/>", n[n.length] = "<a:font script=\"Gujr\" typeface=\"Shruti\"/>", n[n.length] = "<a:font script=\"Khmr\" typeface=\"MoolBoran\"/>", n[n.length] = "<a:font script=\"Knda\" typeface=\"Tunga\"/>", n[n.length] = "<a:font script=\"Guru\" typeface=\"Raavi\"/>", n[n.length] = "<a:font script=\"Cans\" typeface=\"Euphemia\"/>", n[n.length] = "<a:font script=\"Cher\" typeface=\"Plantagenet Cherokee\"/>", n[n.length] = "<a:font script=\"Yiii\" typeface=\"Microsoft Yi Baiti\"/>", n[n.length] = "<a:font script=\"Tibt\" typeface=\"Microsoft Himalaya\"/>", n[n.length] = "<a:font script=\"Thaa\" typeface=\"MV Boli\"/>", n[n.length] = "<a:font script=\"Deva\" typeface=\"Mangal\"/>", n[n.length] = "<a:font script=\"Telu\" typeface=\"Gautami\"/>", n[n.length] = "<a:font script=\"Taml\" typeface=\"Latha\"/>", n[n.length] = "<a:font script=\"Syrc\" typeface=\"Estrangelo Edessa\"/>", n[n.length] = "<a:font script=\"Orya\" typeface=\"Kalinga\"/>", n[n.length] = "<a:font script=\"Mlym\" typeface=\"Kartika\"/>", n[n.length] = "<a:font script=\"Laoo\" typeface=\"DokChampa\"/>", n[n.length] = "<a:font script=\"Sinh\" typeface=\"Iskoola Pota\"/>", n[n.length] = "<a:font script=\"Mong\" typeface=\"Mongolian Baiti\"/>", n[n.length] = "<a:font script=\"Viet\" typeface=\"Times New Roman\"/>", n[n.length] = "<a:font script=\"Uigh\" typeface=\"Microsoft Uighur\"/>", n[n.length] = "<a:font script=\"Geor\" typeface=\"Sylfaen\"/>", n[n.length] = "</a:majorFont>", n[n.length] = "<a:minorFont>", n[n.length] = "<a:latin typeface=\"Calibri\"/>", n[n.length] = "<a:ea typeface=\"\"/>", n[n.length] = "<a:cs typeface=\"\"/>", n[n.length] = "<a:font script=\"Jpan\" typeface=\"ＭＳ Ｐゴシック\"/>", n[n.length] = "<a:font script=\"Hang\" typeface=\"맑은 고딕\"/>", n[n.length] = "<a:font script=\"Hans\" typeface=\"宋体\"/>", n[n.length] = "<a:font script=\"Hant\" typeface=\"新細明體\"/>", n[n.length] = "<a:font script=\"Arab\" typeface=\"Arial\"/>", n[n.length] = "<a:font script=\"Hebr\" typeface=\"Arial\"/>", n[n.length] = "<a:font script=\"Thai\" typeface=\"Tahoma\"/>", n[n.length] = "<a:font script=\"Ethi\" typeface=\"Nyala\"/>", n[n.length] = "<a:font script=\"Beng\" typeface=\"Vrinda\"/>", n[n.length] = "<a:font script=\"Gujr\" typeface=\"Shruti\"/>", n[n.length] = "<a:font script=\"Khmr\" typeface=\"DaunPenh\"/>", n[n.length] = "<a:font script=\"Knda\" typeface=\"Tunga\"/>", n[n.length] = "<a:font script=\"Guru\" typeface=\"Raavi\"/>", n[n.length] = "<a:font script=\"Cans\" typeface=\"Euphemia\"/>", n[n.length] = "<a:font script=\"Cher\" typeface=\"Plantagenet Cherokee\"/>", n[n.length] = "<a:font script=\"Yiii\" typeface=\"Microsoft Yi Baiti\"/>", n[n.length] = "<a:font script=\"Tibt\" typeface=\"Microsoft Himalaya\"/>", n[n.length] = "<a:font script=\"Thaa\" typeface=\"MV Boli\"/>", n[n.length] = "<a:font script=\"Deva\" typeface=\"Mangal\"/>", n[n.length] = "<a:font script=\"Telu\" typeface=\"Gautami\"/>", n[n.length] = "<a:font script=\"Taml\" typeface=\"Latha\"/>", n[n.length] = "<a:font script=\"Syrc\" typeface=\"Estrangelo Edessa\"/>", n[n.length] = "<a:font script=\"Orya\" typeface=\"Kalinga\"/>", n[n.length] = "<a:font script=\"Mlym\" typeface=\"Kartika\"/>", n[n.length] = "<a:font script=\"Laoo\" typeface=\"DokChampa\"/>", n[n.length] = "<a:font script=\"Sinh\" typeface=\"Iskoola Pota\"/>", n[n.length] = "<a:font script=\"Mong\" typeface=\"Mongolian Baiti\"/>", n[n.length] = "<a:font script=\"Viet\" typeface=\"Arial\"/>", n[n.length] = "<a:font script=\"Uigh\" typeface=\"Microsoft Uighur\"/>", n[n.length] = "<a:font script=\"Geor\" typeface=\"Sylfaen\"/>", n[n.length] = "</a:minorFont>", n[n.length] = "</a:fontScheme>", n[n.length] = "<a:fmtScheme name=\"Office\">", n[n.length] = "<a:fillStyleLst>", n[n.length] = "<a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill>", n[n.length] = "<a:gradFill rotWithShape=\"1\">", n[n.length] = "<a:gsLst>", n[n.length] = "<a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"50000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs>", n[n.length] = "<a:gs pos=\"35000\"><a:schemeClr val=\"phClr\"><a:tint val=\"37000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs>", n[n.length] = "<a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:tint val=\"15000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs>", n[n.length] = "</a:gsLst>", n[n.length] = "<a:lin ang=\"16200000\" scaled=\"1\"/>", n[n.length] = "</a:gradFill>", n[n.length] = "<a:gradFill rotWithShape=\"1\">", n[n.length] = "<a:gsLst>", n[n.length] = "<a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"100000\"/><a:shade val=\"100000\"/><a:satMod val=\"130000\"/></a:schemeClr></a:gs>", n[n.length] = "<a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:tint val=\"50000\"/><a:shade val=\"100000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs>", n[n.length] = "</a:gsLst>", n[n.length] = "<a:lin ang=\"16200000\" scaled=\"0\"/>", n[n.length] = "</a:gradFill>", n[n.length] = "</a:fillStyleLst>", n[n.length] = "<a:lnStyleLst>", n[n.length] = "<a:ln w=\"9525\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"><a:shade val=\"95000\"/><a:satMod val=\"105000\"/></a:schemeClr></a:solidFill><a:prstDash val=\"solid\"/></a:ln>", n[n.length] = "<a:ln w=\"25400\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:prstDash val=\"solid\"/></a:ln>", n[n.length] = "<a:ln w=\"38100\" cap=\"flat\" cmpd=\"sng\" algn=\"ctr\"><a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill><a:prstDash val=\"solid\"/></a:ln>", n[n.length] = "</a:lnStyleLst>", n[n.length] = "<a:effectStyleLst>", n[n.length] = "<a:effectStyle>", n[n.length] = "<a:effectLst>", n[n.length] = "<a:outerShdw blurRad=\"40000\" dist=\"20000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"38000\"/></a:srgbClr></a:outerShdw>", n[n.length] = "</a:effectLst>", n[n.length] = "</a:effectStyle>", n[n.length] = "<a:effectStyle>", n[n.length] = "<a:effectLst>", n[n.length] = "<a:outerShdw blurRad=\"40000\" dist=\"23000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"35000\"/></a:srgbClr></a:outerShdw>", n[n.length] = "</a:effectLst>", n[n.length] = "</a:effectStyle>", n[n.length] = "<a:effectStyle>", n[n.length] = "<a:effectLst>", n[n.length] = "<a:outerShdw blurRad=\"40000\" dist=\"23000\" dir=\"5400000\" rotWithShape=\"0\"><a:srgbClr val=\"000000\"><a:alpha val=\"35000\"/></a:srgbClr></a:outerShdw>", n[n.length] = "</a:effectLst>", n[n.length] = "<a:scene3d><a:camera prst=\"orthographicFront\"><a:rot lat=\"0\" lon=\"0\" rev=\"0\"/></a:camera><a:lightRig rig=\"threePt\" dir=\"t\"><a:rot lat=\"0\" lon=\"0\" rev=\"1200000\"/></a:lightRig></a:scene3d>", n[n.length] = "<a:sp3d><a:bevelT w=\"63500\" h=\"25400\"/></a:sp3d>", n[n.length] = "</a:effectStyle>", n[n.length] = "</a:effectStyleLst>", n[n.length] = "<a:bgFillStyleLst>", n[n.length] = "<a:solidFill><a:schemeClr val=\"phClr\"/></a:solidFill>", n[n.length] = "<a:gradFill rotWithShape=\"1\">", n[n.length] = "<a:gsLst>", n[n.length] = "<a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"40000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs>", n[n.length] = "<a:gs pos=\"40000\"><a:schemeClr val=\"phClr\"><a:tint val=\"45000\"/><a:shade val=\"99000\"/><a:satMod val=\"350000\"/></a:schemeClr></a:gs>", n[n.length] = "<a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:shade val=\"20000\"/><a:satMod val=\"255000\"/></a:schemeClr></a:gs>", n[n.length] = "</a:gsLst>", n[n.length] = "<a:path path=\"circle\"><a:fillToRect l=\"50000\" t=\"-80000\" r=\"50000\" b=\"180000\"/></a:path>", n[n.length] = "</a:gradFill>", n[n.length] = "<a:gradFill rotWithShape=\"1\">", n[n.length] = "<a:gsLst>", n[n.length] = "<a:gs pos=\"0\"><a:schemeClr val=\"phClr\"><a:tint val=\"80000\"/><a:satMod val=\"300000\"/></a:schemeClr></a:gs>", n[n.length] = "<a:gs pos=\"100000\"><a:schemeClr val=\"phClr\"><a:shade val=\"30000\"/><a:satMod val=\"200000\"/></a:schemeClr></a:gs>", n[n.length] = "</a:gsLst>", n[n.length] = "<a:path path=\"circle\"><a:fillToRect l=\"50000\" t=\"50000\" r=\"50000\" b=\"50000\"/></a:path>", n[n.length] = "</a:gradFill>", n[n.length] = "</a:bgFillStyleLst>", n[n.length] = "</a:fmtScheme>", n[n.length] = "</a:themeElements>", n[n.length] = "<a:objectDefaults>", n[n.length] = "<a:spDef>", n[n.length] = "<a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx=\"1\"><a:schemeClr val=\"accent1\"/></a:lnRef><a:fillRef idx=\"3\"><a:schemeClr val=\"accent1\"/></a:fillRef><a:effectRef idx=\"2\"><a:schemeClr val=\"accent1\"/></a:effectRef><a:fontRef idx=\"minor\"><a:schemeClr val=\"lt1\"/></a:fontRef></a:style>", n[n.length] = "</a:spDef>", n[n.length] = "<a:lnDef>", n[n.length] = "<a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx=\"2\"><a:schemeClr val=\"accent1\"/></a:lnRef><a:fillRef idx=\"0\"><a:schemeClr val=\"accent1\"/></a:fillRef><a:effectRef idx=\"1\"><a:schemeClr val=\"accent1\"/></a:effectRef><a:fontRef idx=\"minor\"><a:schemeClr val=\"tx1\"/></a:fontRef></a:style>", n[n.length] = "</a:lnDef>", n[n.length] = "</a:objectDefaults>", n[n.length] = "<a:extraClrSchemeLst/>", n[n.length] = "</a:theme>", n.join("");
}
function yl(e, t, n) {
	var r = e.l + t;
	if (e.read_shift(4) !== 124226) {
		if (!n.cellStyles) {
			e.l = r;
			return;
		}
		var i = e.slice(e.l);
		e.l = r;
		var a;
		try {
			a = tn(i, { type: "array" });
		} catch {
			return;
		}
		var o = Zt(a, "theme/theme/theme1.xml", !0);
		if (o) return _l(o, n);
	}
}
function bl(e) {
	return e.read_shift(4);
}
function xl(e) {
	var t = {};
	switch (t.xclrType = e.read_shift(2), t.nTintShade = e.read_shift(2, "i"), t.xclrType) {
		case 0:
			e.l += 4;
			break;
		case 1:
			t.xclrValue = Sl(e, 4);
			break;
		case 2:
			t.xclrValue = Fa(e, 4);
			break;
		case 3:
			t.xclrValue = bl(e, 4);
			break;
		case 4:
			e.l += 4;
			break;
	}
	return e.l += 8, t;
}
function Sl(e, t) {
	var n = e.l + t, r = e.read_shift(2) & 127;
	return e.l = n, r;
}
function Cl(e, t) {
	return xr(e, t);
}
function wl(e) {
	var t = e.read_shift(2), n = e.read_shift(2) - 4, r = [t];
	switch (t) {
		case 4:
		case 5:
		case 7:
		case 8:
		case 9:
		case 10:
		case 11:
		case 13:
			r[1] = xl(e, n);
			break;
		case 6:
			r[1] = Cl(e, n);
			break;
		case 14:
		case 15:
			r[1] = e.read_shift(n === 1 ? 1 : 2);
			break;
		default: throw Error("Unrecognized ExtProp type: " + t + " " + n);
	}
	return r;
}
function Tl(e, t) {
	var n = e.l + t;
	e.l += 2;
	var r = e.read_shift(2);
	e.l += 2;
	for (var i = e.read_shift(2), a = []; i-- > 0;) a.push(wl(e, n - e.l));
	return {
		ixfe: r,
		ext: a
	};
}
function El(e, t) {
	e && (e.data || (e.data = {}), t.forEach(function(t) {
		switch (t[0]) {
			case 4:
				e.data.xfextFore = t[1];
				break;
			case 5:
				e.data.xfextBack = t[1];
				break;
			case 6:
				e.data.gradientFill = t[1];
				break;
			case 7:
				e.data.xfextTop = t[1];
				break;
			case 8:
				e.data.xfextBottom = t[1];
				break;
			case 9:
				e.data.xfextLeft = t[1];
				break;
			case 10:
				e.data.xfextRight = t[1];
				break;
			case 11:
				e.data.xfextDiag = t[1];
				break;
			case 13:
				e.xfextFont = t[1];
				break;
			case 14:
				e.fontScheme = t[1];
				break;
			case 15:
				e.data.cIndent = t[1];
				break;
		}
	}));
}
function Dl(e, t) {
	return {
		flags: e.read_shift(4),
		version: e.read_shift(4),
		name: Zr(e, t - 8)
	};
}
function Ol(e) {
	for (var t = [], n = e.read_shift(4); n-- > 0;) t.push([e.read_shift(4), e.read_shift(4)]);
	return t;
}
function kl(e) {
	return e.l += 4, e.read_shift(4) != 0;
}
function Al(e, t, n) {
	var r = {
		Types: [],
		Cell: [],
		Value: []
	}, i = n || {}, a = [], o = !1, s = 2;
	return Cr(e, function(e, t, n) {
		switch (n) {
			case 58: break;
			case 59: break;
			case 335:
				r.Types.push({ name: e.name });
				break;
			case 51:
				e.forEach(function(e) {
					s == 1 ? r.Cell.push({
						type: r.Types[e[0] - 1].name,
						index: e[1]
					}) : s == 0 && r.Value.push({
						type: r.Types[e[0] - 1].name,
						index: e[1]
					});
				});
				break;
			case 337:
				s = +!!e;
				break;
			case 338:
				s = 2;
				break;
			case 35:
				a.push(n), o = !0;
				break;
			case 36:
				a.pop(), o = !1;
				break;
			default: if (!t.T && (!o || i.WTF && a[a.length - 1] != 35)) throw Error("Unexpected record 0x" + n.toString(16));
		}
	}), r;
}
function jl(e, t, n) {
	var r = {
		Types: [],
		Cell: [],
		Value: []
	};
	if (!e) return r;
	var i = !1, a = 2, o;
	return e.replace(sn, function(e) {
		var t = X(e);
		switch (dn(t[0])) {
			case "<?xml": break;
			case "<metadata":
			case "</metadata>": break;
			case "<metadataTypes":
			case "</metadataTypes>": break;
			case "<metadataType":
				r.Types.push({ name: t.name });
				break;
			case "</metadataType>": break;
			case "<futureMetadata":
				for (var s = 0; s < r.Types.length; ++s) r.Types[s].name == t.name && (o = r.Types[s]);
				break;
			case "</futureMetadata>": break;
			case "<bk>": break;
			case "</bk>": break;
			case "<rc":
				a == 1 ? r.Cell.push({
					type: r.Types[t.t - 1].name,
					index: +t.v
				}) : a == 0 && r.Value.push({
					type: r.Types[t.t - 1].name,
					index: +t.v
				});
				break;
			case "</rc>": break;
			case "<cellMetadata":
				a = 1;
				break;
			case "</cellMetadata>":
				a = 2;
				break;
			case "<valueMetadata":
				a = 0;
				break;
			case "</valueMetadata>":
				a = 2;
				break;
			case "<extLst":
			case "<extLst>":
			case "</extLst>":
			case "<extLst/>": break;
			case "<ext":
				i = !0;
				break;
			case "</ext>":
				i = !1;
				break;
			case "<rvb":
				if (!o) break;
				o.offsets || (o.offsets = []), o.offsets.push(+t.i);
				break;
			default: if (!i && n != null && n.WTF) throw Error("unrecognized " + t[0] + " in metadata");
		}
		return e;
	}), r;
}
function Ml(e) {
	var t = [];
	if (!e) return t;
	var n = 1;
	return (e.match(sn) || []).forEach(function(e) {
		var r = X(e);
		switch (r[0]) {
			case "<?xml": break;
			case "<calcChain":
			case "<calcChain>":
			case "</calcChain>": break;
			case "<c":
				delete r[0], r.i ? n = r.i : r.i = n, t.push(r);
				break;
		}
	}), t;
}
function Nl(e) {
	var t = {};
	t.i = e.read_shift(4);
	var n = {};
	n.r = e.read_shift(4), n.c = e.read_shift(4), t.r = zr(n);
	var r = e.read_shift(1);
	return r & 2 && (t.l = "1"), r & 8 && (t.a = "1"), t;
}
function Pl(e, t, n) {
	var r = [], i = !1;
	return Cr(e, function(e, t, a) {
		switch (a) {
			case 63:
				r.push(e);
				break;
			default: if (!t.T && (!i || n.WTF)) throw Error("Unexpected record 0x" + a.toString(16));
		}
	}), r;
}
function Fl(e, t, n, r) {
	if (!e) return e;
	var i = r || {}, a = !1, o = !1;
	Cr(e, function(e, t, n) {
		if (!o) switch (n) {
			case 359:
			case 363:
			case 364:
			case 366:
			case 367:
			case 368:
			case 369:
			case 370:
			case 371:
			case 472:
			case 577:
			case 578:
			case 579:
			case 580:
			case 581:
			case 582:
			case 583:
			case 584:
			case 585:
			case 586:
			case 587:
			case 5108: break;
			case 35:
				a = !0;
				break;
			case 36:
				a = !1;
				break;
			default: if (!t.T && (!a || i.WTF)) throw Error("Unexpected record 0x" + n.toString(16));
		}
	}, i);
}
function Il(e, t) {
	if (!e) return {
		charts: [],
		images: [],
		shapes: [],
		raw: ""
	};
	var n = {
		charts: [],
		images: [],
		shapes: [],
		raw: e
	};
	return t || (t = { "!id": {} }), (e.match(/<(?:\w+:)?(twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[^>]*>[\s\S]*?<\/(?:\w+:)?\1>/g) || [e]).forEach(function(e) {
		var r = Rl(e);
		(e.match(/<c:chart\b[^<>]*r:id="([^<>"]*)"/g) || []).forEach(function(e) {
			var i = e.match(/r:id="([^<>"]*)"/);
			if (i) {
				var a = t["!id"][i[1]] || {};
				n.charts.push({
					id: i[1],
					rel: a,
					target: a.Target,
					anchor: r
				});
			}
		}), (e.match(/<a:blip\b[^<>]*(?:r:embed|r:link)="([^<>"]*)"/g) || []).forEach(function(e) {
			var i = e.match(/(?:r:embed|r:link)="([^<>"]*)"/);
			if (i) {
				var a = t["!id"][i[1]] || {};
				n.images.push({
					id: i[1],
					rel: a,
					target: a.Target,
					anchor: r
				});
			}
		});
		var i = zl(e);
		i && n.shapes.push({
			text: i,
			anchor: r,
			raw: e
		});
	}), n.chart = n.charts[0] && n.charts[0].target, n;
}
function Ll(e, t) {
	var n = Vt(e, t), r = n && n[1] || "";
	function i(e) {
		var t = Vt(r, e);
		return t && t[1] != null ? parseInt(t[1], 10) : 0;
	}
	return {
		col: i("col"),
		colOff: i("colOff"),
		row: i("row"),
		rowOff: i("rowOff")
	};
}
function Rl(e) {
	var t = { type: (e.match(/^<(?:\w+:)?(\w+)/) || [])[1] || "anchor" };
	(e.indexOf("<xdr:from") >= 0 || e.indexOf("<from") >= 0) && (t.from = Ll(e, "from")), (e.indexOf("<xdr:to") >= 0 || e.indexOf("<to") >= 0) && (t.to = Ll(e, "to"));
	var n = e.match(/<(?:\w+:)?pos\b[^<>]*\/>/);
	if (n) {
		var r = X(n[0]);
		t.pos = {
			x: r.x ? parseInt(r.x, 10) : 0,
			y: r.y ? parseInt(r.y, 10) : 0
		};
	}
	var i = e.match(/<(?:\w+:)?ext\b[^<>]*\/>/);
	if (i) {
		var a = X(i[0]);
		t.ext = {
			cx: a.cx ? parseInt(a.cx, 10) : 0,
			cy: a.cy ? parseInt(a.cy, 10) : 0
		};
	}
	return t;
}
function zl(e) {
	var t = [];
	return (e.match(/<a:t\b[^>]*>[\s\S]*?<\/a:t>/g) || []).forEach(function(e) {
		t.push(mn(e.replace(/<[^>]*>/g, "")));
	}), t.join("");
}
function Bl(e, t, n) {
	var r = e.slice(e.l, e.l + t);
	return e.l += t, !n || !n.drawings && !n.charts ? {
		raw: r,
		blips: [],
		shapes: [],
		images: [],
		charts: [],
		groups: !0
	} : Wl(r, !0);
}
function Vl(e, t, n) {
	var r = e.slice(e.l, e.l + t);
	return e.l += t, !n || !n.drawings && !n.charts ? {
		raw: r,
		blips: [],
		shapes: [],
		images: [],
		charts: [],
		groups: !1
	} : Wl(r, !1);
}
function Hl(e, t) {
	return e[t] | e[t + 1] << 8;
}
function Ul(e, t) {
	return (e[t] | e[t + 1] << 8 | e[t + 2] << 16 | e[t + 3] << 24) >>> 0;
}
function Wl(e, t) {
	var n = {
		raw: e,
		blips: [],
		shapes: [],
		images: [],
		charts: [],
		groups: !!t
	}, r = {
		out: n,
		current: null
	};
	try {
		Gl(e, 0, e.length, r);
	} catch (e) {
		n.error = e.message || String(e);
	}
	return n;
}
function Gl(e, t, n, r) {
	for (var i = t; i + 8 <= n && i + 8 <= e.length;) {
		var a = Hl(e, i), o = Hl(e, i + 2), s = Ul(e, i + 4), c = a & 15, l = a >> 4, u = i + 8, d = u + s;
		if (d > e.length && (d = e.length), o == 61444) {
			var f = {
				raw: e.slice(i, d),
				props: {}
			};
			r.out.shapes.push(f);
			var p = r.current;
			r.current = f, Gl(e, u, d, r), r.current = p;
		} else o == 61447 ? r.out.blips.push(Yl(e, u, d, l)) : o == 61450 && r.current ? (r.current.spid = Ul(e, u), r.current.flags = Ul(e, u + 4)) : o == 61451 && r.current ? (r.current.props = Kl(e, u, d, l), r.current.props.pib != null && (r.current.blipId = r.current.props.pib)) : o == 61456 && r.current ? r.current.anchor = ql(e, u, d) : o == 61457 && r.current ? r.current.clientData = e.slice(u, d) : c == 15 && Gl(e, u, d, r);
		i = d;
	}
}
function Kl(e, t, n, r) {
	for (var i = {}, a = [], o = t, s = 0; s < r && o + 6 <= n; ++s, o += 6) {
		var c = Hl(e, o), l = Ul(e, o + 2), u = c & 16383;
		i[u] = l, c & 16384 && a.push([u, l]), u == 260 && (i.pib = l), u == 261 && (i.pibName = l), u == 896 && (i.fillColor = l), u == 897 && (i.fillOpacity = l), u == 959 && (i.lineColor = l);
	}
	return a.forEach(function(t) {
		o + t[1] <= n && (i["complex_" + t[0]] = e.slice(o, o + t[1])), o += t[1];
	}), i;
}
function ql(e, t, n) {
	if (n - t < 18) return {};
	var r = t, i = Hl(e, r);
	r += 2;
	var a = Hl(e, r), o = Hl(e, r + 2), s = Hl(e, r + 4), c = Hl(e, r + 6);
	r += 8;
	var l = Hl(e, r), u = Hl(e, r + 2), d = Hl(e, r + 4), f = Hl(e, r + 6);
	return {
		type: "twoCellAnchor",
		flags: i,
		from: {
			col: a,
			colOff: o * 9525 / 1024,
			row: s,
			rowOff: c * 9525 / 256
		},
		to: {
			col: l,
			colOff: u * 9525 / 1024,
			row: d,
			rowOff: f * 9525 / 256
		}
	};
}
function Jl(e, t, n) {
	for (var r = t; r + 8 <= n; ++r) {
		if (e[r] == 137 && e[r + 1] == 80 && e[r + 2] == 78 && e[r + 3] == 71) return [r, "image/png"];
		if (e[r] == 255 && e[r + 1] == 216 && e[r + 2] == 255) return [r, "image/jpeg"];
		if (e[r] == 66 && e[r + 1] == 77) return [r, "image/bmp"];
	}
	return [t, ""];
}
function Yl(e, t, n, r) {
	var i = {
		index: r,
		raw: e.slice(t, n)
	};
	if (n - t < 36) return i;
	i.btWin32 = e[t], i.btMacOS = e[t + 1], i.size = Ul(e, t + 20), i.cRef = Ul(e, t + 24);
	var a = t + 36;
	if (a + 8 <= n) {
		i.blipType = Hl(e, a + 2);
		var o = a + 8, s = n, c = Jl(e, o, s);
		c[1] && (i.contentType = c[1], i.data = e.slice(c[0], s), i.dataURI = "data:" + i.contentType + ";base64," + j(i.data));
	}
	return i;
}
function Xl(e, t, n) {
	var r = 0;
	(Ht(e, "(?:shape|rect)") || []).forEach(function(e) {
		var i = "", a = !0, o = -1, s = -1, c = -1;
		switch (e.replace(sn, function(t, n) {
			var r = X(t);
			switch (dn(r[0])) {
				case "<ClientData":
					r.ObjectType && (i = r.ObjectType);
					break;
				case "<Visible":
				case "<Visible/>":
					a = !1;
					break;
				case "<Row":
				case "<Row>":
					o = n + t.length;
					break;
				case "</Row>":
					s = +e.slice(o, n).trim();
					break;
				case "<Column":
				case "<Column>":
					o = n + t.length;
					break;
				case "</Column>":
					c = +e.slice(o, n).trim();
					break;
			}
			return "";
		}), i) {
			case "Note":
				var l = Dg(t, s >= 0 && c >= 0 ? zr({
					r: s,
					c
				}) : n[r].ref);
				l.c && (l.c.hidden = a), ++r;
				break;
		}
	});
}
function Zl(e, t, n, r) {
	var i = e["!data"] != null, a;
	t.forEach(function(t) {
		var o = Rr(t.ref);
		if (!(o.r < 0 || o.c < 0)) {
			if (i ? (e["!data"][o.r] || (e["!data"][o.r] = []), a = e["!data"][o.r][o.c]) : a = e[t.ref], !a) {
				a = { t: "z" }, i ? e["!data"][o.r][o.c] = a : e[t.ref] = a;
				var s = Ur(e["!ref"] || "BDWGO1000001:A1");
				s.s.r > o.r && (s.s.r = o.r), s.e.r < o.r && (s.e.r = o.r), s.s.c > o.c && (s.s.c = o.c), s.e.c < o.c && (s.e.c = o.c), e["!ref"] = Vr(s);
			}
			a.c || (a.c = []);
			var c = {
				a: t.author,
				t: t.t,
				r: t.r,
				T: n
			};
			t.h && (c.h = t.h);
			for (var l = a.c.length - 1; l >= 0; --l) {
				if (!n && a.c[l].T) return;
				n && !a.c[l].T && a.c.splice(l, 1);
			}
			if (n && r) {
				for (l = 0; l < r.length; ++l) if (c.a == r[l].id) {
					c.a = r[l].name || c.a;
					break;
				}
			}
			a.c.push(c);
		}
	});
}
function Ql(e, t) {
	if (e.match(/<(?:\w+:)?comments *\/>/)) return [];
	var n = [], r = [], i = Vt(e, "authors");
	i && i[1] && i[1].split(/<\/\w*:?author>/).forEach(function(e) {
		if (!(e === "" || e.trim() === "")) {
			var t = e.match(/<(?:\w+:)?author[^<>]*>(.*)/);
			t && n.push(t[1]);
		}
	});
	var a = Vt(e, "commentList");
	return a && a[1] && a[1].split(/<\/\w*:?comment>/).forEach(function(e) {
		if (!(e === "" || e.trim() === "")) {
			var i = e.match(/<(?:\w+:)?comment[^<>]*>/);
			if (i) {
				var a = X(i[0]), o = {
					author: a.authorId && n[a.authorId] || "sheetjsghost",
					ref: a.ref,
					guid: a.guid
				}, s = Rr(a.ref);
				if (!(t.sheetRows && t.sheetRows <= s.r)) {
					var c = Vt(e, "text"), l = !!c && !!c[1] && Os(c[1]) || {
						r: "",
						t: "",
						h: ""
					};
					o.r = l.r, l.r == "<t></t>" && (l.t = l.h = ""), o.t = (l.t || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n"), t.cellHTML && (o.h = l.h), r.push(o);
				}
			}
		}
	}), r;
}
function $l(e, t) {
	var n = [], r = !1, i = {}, a = 0;
	return e.replace(sn, function(o, s) {
		var c = X(o);
		switch (dn(c[0])) {
			case "<?xml": break;
			case "<ThreadedComments": break;
			case "</ThreadedComments>": break;
			case "<threadedComment":
				i = {
					author: c.personId,
					guid: c.id,
					ref: c.ref,
					T: 1
				};
				break;
			case "</threadedComment>":
				i.t != null && n.push(i);
				break;
			case "<text>":
			case "<text":
				a = s + o.length;
				break;
			case "</text>":
				i.t = e.slice(a, s).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
				break;
			case "<mentions":
			case "<mentions>":
				r = !0;
				break;
			case "</mentions>":
				r = !1;
				break;
			case "<extLst":
			case "<extLst>":
			case "</extLst>":
			case "<extLst/>": break;
			case "<ext":
				r = !0;
				break;
			case "</ext>":
				r = !1;
				break;
			default: if (!r && t.WTF) throw Error("unrecognized " + c[0] + " in threaded comments");
		}
		return o;
	}), n;
}
function eu(e, t) {
	var n = [], r = !1;
	return e.replace(sn, function(e) {
		var i = X(e);
		switch (dn(i[0])) {
			case "<?xml": break;
			case "<personList": break;
			case "</personList>": break;
			case "<person":
				n.push({
					name: i.displayname,
					id: i.id
				});
				break;
			case "</person>": break;
			case "<extLst":
			case "<extLst>":
			case "</extLst>":
			case "<extLst/>": break;
			case "<ext":
				r = !0;
				break;
			case "</ext>":
				r = !1;
				break;
			default: if (!r && t.WTF) throw Error("unrecognized " + i[0] + " in threaded comments");
		}
		return e;
	}), n;
}
function tu(e) {
	var t = {};
	t.iauthor = e.read_shift(4);
	var n = li(e, 16);
	return t.rfx = n.s, t.ref = zr(n.s), e.l += 16, t;
}
var nu = Zr;
function ru(e, t) {
	var n = [], r = [], i = {}, a = !1;
	return Cr(e, function(e, o, s) {
		switch (s) {
			case 632:
				r.push(e);
				break;
			case 635:
				i = e;
				break;
			case 637:
				i.t = e.t, i.h = e.h, i.r = e.r;
				break;
			case 636:
				if (i.author = r[i.iauthor], delete i.iauthor, t.sheetRows && i.rfx && t.sheetRows <= i.rfx.r) break;
				i.t || (i.t = ""), delete i.rfx, n.push(i);
				break;
			case 3072: break;
			case 35:
				a = !0;
				break;
			case 36:
				a = !1;
				break;
			case 37: break;
			case 38: break;
			default: if (!o.T && (!a || t.WTF)) throw Error("Unexpected record 0x" + s.toString(16));
		}
	}), n;
}
var iu = "application/vnd.ms-office.vbaProject";
function au(e) {
	var t = ot.utils.cfb_new({ root: "R" });
	return e.FullPaths.forEach(function(n, r) {
		if (!(n.slice(-1) === "/" || !n.match(/_VBA_PROJECT_CUR/))) {
			var i = n.replace(/^[^\/]*/, "R").replace(/\/_VBA_PROJECT_CUR\u0000*/, "");
			ot.utils.cfb_add(t, i, e.FileIndex[r].content);
		}
	}), ot.write(t);
}
function ou() {
	return { "!type": "dialog" };
}
function su() {
	return { "!type": "dialog" };
}
function cu() {
	return { "!type": "macro" };
}
function lu() {
	return { "!type": "macro" };
}
var uu = /*#__PURE__*/ (function() {
	var e = /(^|[^A-Za-z_])R(\[?-?\d+\]|[1-9]\d*|)C(\[?-?\d+\]|[1-9]\d*|)(?![A-Za-z0-9_])/g, t = {
		r: 0,
		c: 0
	};
	function n(e, n, r, i) {
		var a = !1, o = !1;
		r.length == 0 ? o = !0 : r.charAt(0) == "[" && (o = !0, r = r.slice(1, -1)), i.length == 0 ? a = !0 : i.charAt(0) == "[" && (a = !0, i = i.slice(1, -1));
		var s = r.length > 0 ? parseInt(r, 10) | 0 : 0, c = i.length > 0 ? parseInt(i, 10) | 0 : 0;
		return a ? c += t.c : --c, o ? s += t.r : --s, n + (a ? "" : "$") + Pr(c) + (o ? "" : "$") + Ar(s);
	}
	return function(r, i) {
		return t = i, r.replace(e, n);
	};
})(), du = /(^|[^._A-Za-z0-9])(\$?)([A-Z]{1,2}|[A-W][A-Z]{2}|X[A-E][A-Z]|XF[A-D])(\$?)(\d{1,7})(?![_.\(A-Za-z0-9])/g;
try {
	du = /(^|[^._A-Za-z0-9])([$]?)([A-Z]{1,2}|[A-W][A-Z]{2}|X[A-E][A-Z]|XF[A-D])([$]?)(10[0-3]\d{4}|104[0-7]\d{3}|1048[0-4]\d{2}|10485[0-6]\d|104857[0-6]|[1-9]\d{0,5})(?![_.\(A-Za-z0-9])/g;
} catch {}
var fu = /*#__PURE__*/ (function() {
	return function(e, t) {
		return e.replace(du, function(e, n, r, i, a, o) {
			var s = Nr(i) - (r ? 0 : t.c), c = kr(o) - (a ? 0 : t.r), l = a == "$" ? c + 1 : c == 0 ? "" : "[" + c + "]", u = r == "$" ? s + 1 : s == 0 ? "" : "[" + s + "]";
			return n + "R" + l + "C" + u;
		});
	};
})();
function pu(e, t) {
	return e.replace(du, function(e, n, r, i, a, o) {
		return n + (r == "$" ? r + i : Pr(Nr(i) + t.c)) + (a == "$" ? a + o : Ar(kr(o) + t.r));
	});
}
function mu(e, t, n) {
	var r = Br(t).s, i = Rr(n);
	return pu(e, {
		r: i.r - r.r,
		c: i.c - r.c
	});
}
function hu(e) {
	return e.length != 1;
}
function gu(e) {
	return e.replace(/_xlfn\./g, "");
}
function _u(e) {
	e.l += 1;
}
function vu(e, t) {
	var n = e.read_shift(t == 1 ? 1 : 2);
	return [
		n & 16383,
		n >> 14 & 1,
		n >> 15 & 1
	];
}
function yu(e, t, n) {
	var r = 2;
	if (n) {
		if (n.biff >= 2 && n.biff <= 5) return bu(e, t, n);
		n.biff == 12 && (r = 4);
	}
	var i = e.read_shift(r), a = e.read_shift(r), o = vu(e, 2), s = vu(e, 2);
	return {
		s: {
			r: i,
			c: o[0],
			cRel: o[1],
			rRel: o[2]
		},
		e: {
			r: a,
			c: s[0],
			cRel: s[1],
			rRel: s[2]
		}
	};
}
function bu(e) {
	var t = vu(e, 2), n = vu(e, 2), r = e.read_shift(1), i = e.read_shift(1);
	return {
		s: {
			r: t[0],
			c: r,
			cRel: t[1],
			rRel: t[2]
		},
		e: {
			r: n[0],
			c: i,
			cRel: n[1],
			rRel: n[2]
		}
	};
}
function xu(e, t, n) {
	if (n.biff < 8) return bu(e, t, n);
	var r = e.read_shift(n.biff == 12 ? 4 : 2), i = e.read_shift(n.biff == 12 ? 4 : 2), a = vu(e, 2), o = vu(e, 2);
	return {
		s: {
			r,
			c: a[0],
			cRel: a[1],
			rRel: a[2]
		},
		e: {
			r: i,
			c: o[0],
			cRel: o[1],
			rRel: o[2]
		}
	};
}
function Su(e, t, n) {
	if (n && n.biff >= 2 && n.biff <= 5) return Cu(e, t, n);
	var r = e.read_shift(n && n.biff == 12 ? 4 : 2), i = vu(e, 2);
	return {
		r,
		c: i[0],
		cRel: i[1],
		rRel: i[2]
	};
}
function Cu(e) {
	var t = vu(e, 2), n = e.read_shift(1);
	return {
		r: t[0],
		c: n,
		cRel: t[1],
		rRel: t[2]
	};
}
function wu(e) {
	var t = e.read_shift(2), n = e.read_shift(2);
	return {
		r: t,
		c: n & 255,
		fQuoted: !!(n & 16384),
		cRel: n >> 15,
		rRel: n >> 15
	};
}
function Tu(e, t, n) {
	var r = n && n.biff ? n.biff : 8;
	if (r >= 2 && r <= 5) return Eu(e, t, n);
	var i = e.read_shift(r >= 12 ? 4 : 2), a = e.read_shift(2), o = (a & 16384) >> 14, s = (a & 32768) >> 15;
	if (a &= 16383, s == 1) for (; i > 524287;) i -= 1048576;
	if (o == 1) for (; a > 8191;) a -= 16384;
	return {
		r: i,
		c: a,
		cRel: o,
		rRel: s
	};
}
function Eu(e) {
	var t = e.read_shift(2), n = e.read_shift(1), r = (t & 32768) >> 15, i = (t & 16384) >> 14;
	return t &= 16383, r == 1 && t >= 8192 && (t -= 16384), i == 1 && n >= 128 && (n -= 256), {
		r: t,
		c: n,
		cRel: i,
		rRel: r
	};
}
function Du(e, t, n) {
	return [(e[e.l++] & 96) >> 5, yu(e, n.biff >= 2 && n.biff <= 5 ? 6 : 8, n)];
}
function Ou(e, t, n) {
	var r = (e[e.l++] & 96) >> 5, i = e.read_shift(2, "i"), a = 8;
	if (n) switch (n.biff) {
		case 5:
			e.l += 12, a = 6;
			break;
		case 12:
			a = 12;
			break;
	}
	return [
		r,
		i,
		yu(e, a, n)
	];
}
function ku(e, t, n) {
	var r = (e[e.l++] & 96) >> 5;
	return e.l += n && n.biff > 8 ? 12 : n.biff < 8 ? 6 : 8, [r];
}
function Au(e, t, n) {
	var r = (e[e.l++] & 96) >> 5, i = e.read_shift(2), a = 8;
	if (n) switch (n.biff) {
		case 5:
			e.l += 12, a = 6;
			break;
		case 12:
			a = 12;
			break;
	}
	return e.l += a, [r, i];
}
function ju(e, t, n) {
	return [(e[e.l++] & 96) >> 5, xu(e, t - 1, n)];
}
function Mu(e, t, n) {
	var r = (e[e.l++] & 96) >> 5;
	return e.l += n.biff == 2 ? 6 : n.biff == 12 ? 14 : 7, [r];
}
function Nu(e) {
	var t = e[e.l + 1] & 1;
	return e.l += 4, [t, 1];
}
function Pu(e, t, n) {
	e.l += 2;
	for (var r = e.read_shift(n && n.biff == 2 ? 1 : 2), i = [], a = 0; a <= r; ++a) i.push(e.read_shift(n && n.biff == 2 ? 1 : 2));
	return i;
}
function Fu(e, t, n) {
	var r = e[e.l + 1] & 255 ? 1 : 0;
	return e.l += 2, [r, e.read_shift(n && n.biff == 2 ? 1 : 2)];
}
function Iu(e, t, n) {
	var r = e[e.l + 1] & 255 ? 1 : 0;
	return e.l += 2, [r, e.read_shift(n && n.biff == 2 ? 1 : 2)];
}
function Lu(e) {
	var t = e[e.l + 1] & 255 ? 1 : 0;
	return e.l += 2, [t, e.read_shift(2)];
}
function Ru(e, t, n) {
	var r = e[e.l + 1] & 255 ? 1 : 0;
	return e.l += n && n.biff == 2 ? 3 : 4, [r];
}
function zu(e) {
	return [e.read_shift(1), e.read_shift(1)];
}
function Bu(e) {
	return e.read_shift(2), zu(e, 2);
}
function Vu(e) {
	return e.read_shift(2), zu(e, 2);
}
function Hu(e, t, n) {
	var r = (e[e.l] & 96) >> 5;
	return e.l += 1, [r, Su(e, 0, n)];
}
function Uu(e, t, n) {
	var r = (e[e.l] & 96) >> 5;
	return e.l += 1, [r, Tu(e, 0, n)];
}
function Wu(e, t, n) {
	var r = (e[e.l] & 96) >> 5;
	e.l += 1;
	var i = e.read_shift(2);
	return n && n.biff == 5 && (e.l += 12), [
		r,
		i,
		Su(e, 0, n)
	];
}
function Gu(e, t, n) {
	var r = (e[e.l] & 96) >> 5;
	e.l += 1;
	var i = e.read_shift(n && n.biff <= 3 ? 1 : 2);
	return [
		of[i],
		af[i],
		r
	];
}
function Ku(e, t, n) {
	var r = e[e.l++], i = e.read_shift(1), a = n && n.biff <= 3 ? [r == 88 ? -1 : 0, e.read_shift(1)] : qu(e);
	return [i, (a[0] === 0 ? af : rf)[a[1]]];
}
function qu(e) {
	return [e[e.l + 1] >> 7, e.read_shift(2) & 32767];
}
function Ju(e, t, n) {
	e.l += n && n.biff == 2 ? 3 : 4;
}
function Yu(e, t, n) {
	return e.l++, n && n.biff == 12 ? [e.read_shift(4, "i"), 0] : [e.read_shift(2), e.read_shift(n && n.biff == 2 ? 1 : 2)];
}
function Xu(e) {
	return e.l++, Fi[e.read_shift(1)];
}
function Zu(e) {
	return e.l++, e.read_shift(2);
}
function Qu(e) {
	return e.l++, e.read_shift(1) !== 0;
}
function $u(e) {
	return e.l++, ui(e, 8);
}
function ed(e, t, n) {
	return e.l++, wa(e, t - 1, n);
}
function td(e, t) {
	var n = [e.read_shift(1)];
	if (t == 12) switch (n[0]) {
		case 2:
			n[0] = 4;
			break;
		case 4:
			n[0] = 16;
			break;
		case 0:
			n[0] = 1;
			break;
		case 1:
			n[0] = 2;
			break;
	}
	switch (n[0]) {
		case 4:
			n[1] = ba(e, 1) ? "TRUE" : "FALSE", t != 12 && (e.l += 7);
			break;
		case 37:
		case 16:
			n[1] = Fi[e[e.l]], e.l += t == 12 ? 4 : 8;
			break;
		case 0:
			e.l += 8;
			break;
		case 1:
			n[1] = ui(e, 8);
			break;
		case 2:
			n[1] = Oa(e, 0, { biff: t > 0 && t < 8 ? 2 : t });
			break;
		default: throw Error("Bad SerAr: " + n[0]);
	}
	return n;
}
function nd(e, t, n) {
	for (var r = e.read_shift(n.biff == 12 ? 4 : 2), i = [], a = 0; a != r; ++a) i.push((n.biff == 12 ? li : Ua)(e, 8));
	return i;
}
function rd(e, t, n) {
	var r = 0, i = 0;
	n.biff == 12 ? (r = e.read_shift(4), i = e.read_shift(4)) : (i = 1 + e.read_shift(1), r = 1 + e.read_shift(2)), n.biff >= 2 && n.biff < 8 && (--r, --i == 0 && (i = 256));
	for (var a = 0, o = []; a != r && (o[a] = []); ++a) for (var s = 0; s != i; ++s) o[a][s] = td(e, n.biff);
	return o;
}
function id(e, t, n) {
	var r = e.read_shift(1) >>> 5 & 3, i = !n || n.biff >= 8 ? 4 : 2, a = e.read_shift(i);
	switch (n.biff) {
		case 2:
			e.l += 5;
			break;
		case 3:
		case 4:
			e.l += 8;
			break;
		case 5:
			e.l += 12;
			break;
	}
	return [
		r,
		0,
		a
	];
}
function ad(e, t, n) {
	return n.biff == 5 ? od(e, t, n) : [
		e.read_shift(1) >>> 5 & 3,
		e.read_shift(2),
		e.read_shift(4)
	];
}
function od(e) {
	var t = e.read_shift(1) >>> 5 & 3, n = e.read_shift(2, "i");
	e.l += 8;
	var r = e.read_shift(2);
	return e.l += 12, [
		t,
		n,
		r
	];
}
function sd(e, t, n) {
	var r = e.read_shift(1) >>> 5 & 3;
	return e.l += n && n.biff == 2 ? 3 : 4, [r, e.read_shift(n && n.biff == 2 ? 1 : 2)];
}
function cd(e, t, n) {
	return [e.read_shift(1) >>> 5 & 3, e.read_shift(n && n.biff == 2 ? 1 : 2)];
}
function ld(e, t, n) {
	var r = e.read_shift(1) >>> 5 & 3;
	return e.l += 4, n.biff < 8 && e.l--, n.biff == 12 && (e.l += 2), [r];
}
function ud(e, t, n) {
	var r = (e[e.l++] & 96) >> 5, i = e.read_shift(2), a = 4;
	if (n) switch (n.biff) {
		case 5:
			a = 15;
			break;
		case 12:
			a = 6;
			break;
	}
	return e.l += a, [r, i];
}
var dd = xr, fd = xr, pd = xr;
function md(e, t, n) {
	return e.l += 2, [wu(e, 4, n)];
}
function hd(e) {
	return e.l += 6, [];
}
var gd = md, _d = hd, vd = hd, yd = md;
function bd(e) {
	return e.l += 2, [xa(e), e.read_shift(2) & 1];
}
var xd = md, Sd = bd, Cd = hd, wd = md, Td = md, Ed = [
	"Data",
	"All",
	"Headers",
	"??",
	"?Data2",
	"??",
	"?DataHeaders",
	"??",
	"Totals",
	"??",
	"??",
	"??",
	"?DataTotals",
	"??",
	"??",
	"??",
	"?Current"
];
function Dd(e) {
	e.l += 2;
	var t = e.read_shift(2), n = e.read_shift(2), r = e.read_shift(4), i = e.read_shift(2), a = e.read_shift(2), o = Ed[n >> 2 & 31];
	return {
		ixti: t,
		coltype: n & 3,
		rt: o,
		idx: r,
		c: i,
		C: a
	};
}
function Od(e) {
	return e.l += 2, [e.read_shift(4)];
}
function kd(e, t, n) {
	return e.l += 5, e.l += 2, e.l += n.biff == 2 ? 1 : 4, ["PTGSHEET"];
}
function Ad(e, t, n) {
	return e.l += n.biff == 2 ? 4 : 5, ["PTGENDSHEET"];
}
function jd(e) {
	return [e.read_shift(1) >>> 5 & 3, e.read_shift(2)];
}
function Md(e) {
	return [e.read_shift(1) >>> 5 & 3, e.read_shift(2)];
}
function Nd(e) {
	return e.l += 4, [0, 0];
}
var Pd = {
	1: {
		n: "PtgExp",
		f: Yu
	},
	2: {
		n: "PtgTbl",
		f: pd
	},
	3: {
		n: "PtgAdd",
		f: _u
	},
	4: {
		n: "PtgSub",
		f: _u
	},
	5: {
		n: "PtgMul",
		f: _u
	},
	6: {
		n: "PtgDiv",
		f: _u
	},
	7: {
		n: "PtgPower",
		f: _u
	},
	8: {
		n: "PtgConcat",
		f: _u
	},
	9: {
		n: "PtgLt",
		f: _u
	},
	10: {
		n: "PtgLe",
		f: _u
	},
	11: {
		n: "PtgEq",
		f: _u
	},
	12: {
		n: "PtgGe",
		f: _u
	},
	13: {
		n: "PtgGt",
		f: _u
	},
	14: {
		n: "PtgNe",
		f: _u
	},
	15: {
		n: "PtgIsect",
		f: _u
	},
	16: {
		n: "PtgUnion",
		f: _u
	},
	17: {
		n: "PtgRange",
		f: _u
	},
	18: {
		n: "PtgUplus",
		f: _u
	},
	19: {
		n: "PtgUminus",
		f: _u
	},
	20: {
		n: "PtgPercent",
		f: _u
	},
	21: {
		n: "PtgParen",
		f: _u
	},
	22: {
		n: "PtgMissArg",
		f: _u
	},
	23: {
		n: "PtgStr",
		f: ed
	},
	26: {
		n: "PtgSheet",
		f: kd
	},
	27: {
		n: "PtgEndSheet",
		f: Ad
	},
	28: {
		n: "PtgErr",
		f: Xu
	},
	29: {
		n: "PtgBool",
		f: Qu
	},
	30: {
		n: "PtgInt",
		f: Zu
	},
	31: {
		n: "PtgNum",
		f: $u
	},
	32: {
		n: "PtgArray",
		f: Mu
	},
	33: {
		n: "PtgFunc",
		f: Gu
	},
	34: {
		n: "PtgFuncVar",
		f: Ku
	},
	35: {
		n: "PtgName",
		f: id
	},
	36: {
		n: "PtgRef",
		f: Hu
	},
	37: {
		n: "PtgArea",
		f: Du
	},
	38: {
		n: "PtgMemArea",
		f: sd
	},
	39: {
		n: "PtgMemErr",
		f: dd
	},
	40: {
		n: "PtgMemNoMem",
		f: fd
	},
	41: {
		n: "PtgMemFunc",
		f: cd
	},
	42: {
		n: "PtgRefErr",
		f: ld
	},
	43: {
		n: "PtgAreaErr",
		f: ku
	},
	44: {
		n: "PtgRefN",
		f: Uu
	},
	45: {
		n: "PtgAreaN",
		f: ju
	},
	46: {
		n: "PtgMemAreaN",
		f: jd
	},
	47: {
		n: "PtgMemNoMemN",
		f: Md
	},
	57: {
		n: "PtgNameX",
		f: ad
	},
	58: {
		n: "PtgRef3d",
		f: Wu
	},
	59: {
		n: "PtgArea3d",
		f: Ou
	},
	60: {
		n: "PtgRefErr3d",
		f: ud
	},
	61: {
		n: "PtgAreaErr3d",
		f: Au
	},
	255: {}
}, Fd = {
	64: 32,
	96: 32,
	65: 33,
	97: 33,
	66: 34,
	98: 34,
	67: 35,
	99: 35,
	68: 36,
	100: 36,
	69: 37,
	101: 37,
	70: 38,
	102: 38,
	71: 39,
	103: 39,
	72: 40,
	104: 40,
	73: 41,
	105: 41,
	74: 42,
	106: 42,
	75: 43,
	107: 43,
	76: 44,
	108: 44,
	77: 45,
	109: 45,
	78: 46,
	110: 46,
	79: 47,
	111: 47,
	88: 34,
	120: 34,
	89: 57,
	121: 57,
	90: 58,
	122: 58,
	91: 59,
	123: 59,
	92: 60,
	124: 60,
	93: 61,
	125: 61
}, Id = {
	1: {
		n: "PtgElfLel",
		f: bd
	},
	2: {
		n: "PtgElfRw",
		f: wd
	},
	3: {
		n: "PtgElfCol",
		f: gd
	},
	6: {
		n: "PtgElfRwV",
		f: Td
	},
	7: {
		n: "PtgElfColV",
		f: yd
	},
	10: {
		n: "PtgElfRadical",
		f: xd
	},
	11: {
		n: "PtgElfRadicalS",
		f: Cd
	},
	13: {
		n: "PtgElfColS",
		f: _d
	},
	15: {
		n: "PtgElfColSV",
		f: vd
	},
	16: {
		n: "PtgElfRadicalLel",
		f: Sd
	},
	25: {
		n: "PtgList",
		f: Dd
	},
	29: {
		n: "PtgSxName",
		f: Od
	},
	255: {}
}, Ld = {
	0: {
		n: "PtgAttrNoop",
		f: Nd
	},
	1: {
		n: "PtgAttrSemi",
		f: Ru
	},
	2: {
		n: "PtgAttrIf",
		f: Iu
	},
	4: {
		n: "PtgAttrChoose",
		f: Pu
	},
	8: {
		n: "PtgAttrGoto",
		f: Fu
	},
	16: {
		n: "PtgAttrSum",
		f: Ju
	},
	32: {
		n: "PtgAttrBaxcel",
		f: Nu
	},
	33: {
		n: "PtgAttrBaxcel",
		f: Nu
	},
	64: {
		n: "PtgAttrSpace",
		f: Bu
	},
	65: {
		n: "PtgAttrSpaceSemi",
		f: Vu
	},
	128: {
		n: "PtgAttrIfError",
		f: Lu
	},
	255: {}
};
function Rd(e, t, n, r) {
	if (r.biff < 8) return xr(e, t);
	for (var i = e.l + t, a = [], o = 0; o !== n.length; ++o) switch (n[o][0]) {
		case "PtgArray":
			n[o][1] = rd(e, 0, r), a.push(n[o][1]);
			break;
		case "PtgMemArea":
			n[o][2] = nd(e, n[o][1], r), a.push(n[o][2]);
			break;
		case "PtgExp":
			r && r.biff == 12 && (n[o][1][1] = e.read_shift(4), a.push(n[o][1]));
			break;
		case "PtgList":
		case "PtgElfRadicalS":
		case "PtgElfColS":
		case "PtgElfColSV": throw "Unsupported " + n[o][0];
		default: break;
	}
	return t = i - e.l, t !== 0 && a.push(xr(e, t)), a;
}
function zd(e, t, n) {
	for (var r = e.l + t, i, a, o = []; r != e.l;) t = r - e.l, a = e[e.l], i = Pd[a] || Pd[Fd[a]], (a === 24 || a === 25) && (i = (a === 24 ? Id : Ld)[e[e.l + 1]]), !i || !i.f ? xr(e, t) : o.push([i.n, i.f(e, t, n)]);
	return o;
}
function Bd(e) {
	for (var t = [], n = 0; n < e.length; ++n) {
		for (var r = e[n], i = [], a = 0; a < r.length; ++a) {
			var o = r[a];
			if (o) switch (o[0]) {
				case 2:
					i.push("\"" + o[1].replace(/"/g, "\"\"") + "\"");
					break;
				default: i.push(o[1]);
			}
			else i.push("");
		}
		t.push(i.join(","));
	}
	return t.join(";");
}
var Vd = {
	PtgAdd: "+",
	PtgConcat: "&",
	PtgDiv: "/",
	PtgEq: "=",
	PtgGe: ">=",
	PtgGt: ">",
	PtgLe: "<=",
	PtgLt: "<",
	PtgMul: "*",
	PtgNe: "<>",
	PtgPower: "^",
	PtgSub: "-"
};
function Hd(e, t) {
	var n = e.lastIndexOf("!"), r = t.lastIndexOf("!");
	return n == -1 && r == -1 ? e + ":" + t : n > 0 && r > 0 && e.slice(0, n).toLowerCase() == t.slice(0, r).toLowerCase() ? e + ":" + t.slice(r + 1) : (console.error("Cannot hydrate range", e, t), e + ":" + t);
}
function Ud(e, t, n) {
	if (!e) return "SH33TJSERR0";
	if (n.biff > 8 && (!e.XTI || !e.XTI[t])) return e.SheetNames[t];
	if (!e.XTI) return "SH33TJSERR6";
	var r = e.XTI[t];
	if (n.biff < 8) return t > 1e4 && (t -= 65536), t < 0 && (t = -t), t == 0 ? "" : e.XTI[t - 1];
	if (!r) return "SH33TJSERR1";
	var i = "";
	if (n.biff > 8) switch (e[r[0]][0]) {
		case 357: return i = r[1] == -1 ? "#REF" : e.SheetNames[r[1]], r[1] == r[2] ? i : i + ":" + e.SheetNames[r[2]];
		case 358: return n.SID == null ? "SH33TJSSAME" + e[r[0]][0] : e.SheetNames[n.SID];
		case 355:
		default: return "SH33TJSSRC" + e[r[0]][0];
	}
	switch (e[r[0]][0][0]) {
		case 1025: return i = r[1] == -1 ? "#REF" : e.SheetNames[r[1]] || "SH33TJSERR3", r[1] == r[2] ? i : i + ":" + e.SheetNames[r[2]];
		case 14849: return e[r[0]].slice(1).map(function(e) {
			return e.Name;
		}).join(";;");
		default: return e[r[0]][0][3] ? (i = r[1] == -1 ? "#REF" : e[r[0]][0][3][r[1]] || "SH33TJSERR4", r[1] == r[2] ? i : i + ":" + e[r[0]][0][3][r[2]]) : "SH33TJSERR2";
	}
}
function Wd(e, t, n) {
	var r = Ud(e, t, n);
	return r == "#REF" ? r : Hr(r, n);
}
function Gd(e, t, n, r, i) {
	var a = i && i.biff || 8, o = {
		s: {
			c: 0,
			r: 0
		},
		e: {
			c: 0,
			r: 0
		}
	}, s = [], c, l, u, d = 0, f = 0, p, m = "";
	if (!e[0] || !e[0][0]) return "";
	for (var h = -1, g = "", _ = 0, v = e[0].length; _ < v; ++_) {
		var y = e[0][_];
		switch (y[0]) {
			case "PtgUminus":
				s.push("-" + s.pop());
				break;
			case "PtgUplus":
				s.push("+" + s.pop());
				break;
			case "PtgPercent":
				s.push(s.pop() + "%");
				break;
			case "PtgAdd":
			case "PtgConcat":
			case "PtgDiv":
			case "PtgEq":
			case "PtgGe":
			case "PtgGt":
			case "PtgLe":
			case "PtgLt":
			case "PtgMul":
			case "PtgNe":
			case "PtgPower":
			case "PtgSub":
				if (c = s.pop(), l = s.pop(), h >= 0) {
					switch (e[0][h][1][0]) {
						case 0:
							g = Ct(" ", e[0][h][1][1]);
							break;
						case 1:
							g = Ct("\r", e[0][h][1][1]);
							break;
						default: if (g = "", i.WTF) throw Error("Unexpected PtgAttrSpaceType " + e[0][h][1][0]);
					}
					l += g, h = -1;
				}
				s.push(l + Vd[y[0]] + c);
				break;
			case "PtgIsect":
				c = s.pop(), l = s.pop(), s.push(l + " " + c);
				break;
			case "PtgUnion":
				c = s.pop(), l = s.pop(), s.push(l + "," + c);
				break;
			case "PtgRange":
				c = s.pop(), l = s.pop(), s.push(Hd(l, c));
				break;
			case "PtgAttrChoose": break;
			case "PtgAttrGoto": break;
			case "PtgAttrIf": break;
			case "PtgAttrIfError": break;
			case "PtgRef":
				u = Tr(y[1][1], o, i), s.push(Dr(u, a));
				break;
			case "PtgRefN":
				u = n ? Tr(y[1][1], n, i) : y[1][1], s.push(Dr(u, a));
				break;
			case "PtgRef3d":
				d = y[1][1], u = Tr(y[1][2], o, i), m = Wd(r, d, i), s.push(m + "!" + Dr(u, a));
				break;
			case "PtgFunc":
			case "PtgFuncVar":
				var b = y[1][0], x = y[1][1];
				b || (b = 0), b &= 127;
				var S = b == 0 ? [] : s.slice(-b);
				s.length -= b, x === "User" && (x = S.shift()), s.push(x + "(" + S.join(",") + ")");
				break;
			case "PtgBool":
				s.push(y[1] ? "TRUE" : "FALSE");
				break;
			case "PtgInt":
				s.push(y[1]);
				break;
			case "PtgNum":
				s.push(String(y[1]));
				break;
			case "PtgStr":
				s.push("\"" + y[1].replace(/"/g, "\"\"") + "\"");
				break;
			case "PtgErr":
				s.push(y[1]);
				break;
			case "PtgAreaN":
				p = Er(y[1][1], n ? { s: n } : o, i), s.push(Or(p, i));
				break;
			case "PtgArea":
				p = Er(y[1][1], o, i), s.push(Or(p, i));
				break;
			case "PtgArea3d":
				d = y[1][1], p = y[1][2], m = Wd(r, d, i), s.push(m + "!" + Or(p, i));
				break;
			case "PtgAttrSum":
				s.push("SUM(" + s.pop() + ")");
				break;
			case "PtgAttrBaxcel":
			case "PtgAttrSemi": break;
			case "PtgName":
				f = y[1][2];
				var C = (r.names || [])[f - 1] || (r[0] || [])[f], w = C ? C.Name : "SH33TJSNAME" + String(f);
				w && w.slice(0, 6) == "_xlfn." && !i.xlfn && (w = w.slice(6)), s.push(w);
				break;
			case "PtgNameX":
				var T = y[1][1];
				f = y[1][2];
				var E;
				if (i.biff <= 5) T < 0 && (T = -T), r[T] && (E = r[T][f]);
				else {
					var D = "";
					if (((r[T] || [])[0] || [])[0] == 14849 || (((r[T] || [])[0] || [])[0] == 1025 ? r[T][f] && r[T][f].itab > 0 && (D = r.SheetNames[r[T][f].itab - 1] + "!") : D = r.SheetNames[f - 1] + "!"), r[T] && r[T][f]) D += r[T][f].Name;
					else if (r[0] && r[0][f]) D += r[0][f].Name;
					else {
						var O = (Ud(r, T, i) || "").split(";;");
						O[f - 1] ? D = O[f - 1] : D += "SH33TJSERRX";
					}
					s.push(D);
					break;
				}
				E || (E = { Name: "SH33TJSERRY" }), s.push(E.Name);
				break;
			case "PtgParen":
				var k = "(", A = ")";
				if (h >= 0) {
					switch (g = "", e[0][h][1][0]) {
						case 2:
							k = Ct(" ", e[0][h][1][1]) + k;
							break;
						case 3:
							k = Ct("\r", e[0][h][1][1]) + k;
							break;
						case 4:
							A = Ct(" ", e[0][h][1][1]) + A;
							break;
						case 5:
							A = Ct("\r", e[0][h][1][1]) + A;
							break;
						default: if (i.WTF) throw Error("Unexpected PtgAttrSpaceType " + e[0][h][1][0]);
					}
					h = -1;
				}
				s.push(k + s.pop() + A);
				break;
			case "PtgRefErr":
				s.push("#REF!");
				break;
			case "PtgRefErr3d":
				s.push("#REF!");
				break;
			case "PtgExp":
				u = {
					c: y[1][1],
					r: y[1][0]
				};
				var j = {
					c: n.c,
					r: n.r
				};
				if (r.sharedf[zr(u)]) {
					var M = r.sharedf[zr(u)];
					s.push(Gd(M, o, j, r, i));
				} else {
					var N = !1;
					for (c = 0; c != r.arrayf.length; ++c) if (l = r.arrayf[c], !(u.c < l[0].s.c || u.c > l[0].e.c) && !(u.r < l[0].s.r || u.r > l[0].e.r)) {
						s.push(Gd(l[1], o, j, r, i)), N = !0;
						break;
					}
					N || s.push(y[1]);
				}
				break;
			case "PtgArray":
				s.push("{" + Bd(y[1]) + "}");
				break;
			case "PtgMemArea": break;
			case "PtgAttrSpace":
			case "PtgAttrSpaceSemi":
				h = _;
				break;
			case "PtgTbl": break;
			case "PtgMemErr": break;
			case "PtgMissArg":
				s.push("");
				break;
			case "PtgAreaErr":
				s.push("#REF!");
				break;
			case "PtgAreaErr3d":
				s.push("#REF!");
				break;
			case "PtgList":
				s.push("Table" + y[1].idx + "[#" + y[1].rt + "]");
				break;
			case "PtgMemAreaN":
			case "PtgMemNoMemN":
			case "PtgAttrNoop":
			case "PtgSheet":
			case "PtgEndSheet": break;
			case "PtgMemFunc": break;
			case "PtgMemNoMem": break;
			case "PtgElfCol":
			case "PtgElfColS":
			case "PtgElfColSV":
			case "PtgElfColV":
			case "PtgElfLel":
			case "PtgElfRadical":
			case "PtgElfRadicalLel":
			case "PtgElfRadicalS":
			case "PtgElfRw":
			case "PtgElfRwV": throw Error("Unsupported ELFs");
			case "PtgSxName": throw Error("Unrecognized Formula Token: " + String(y));
			default: throw Error("Unrecognized Formula Token: " + String(y));
		}
		if (i.biff != 3 && h >= 0 && [
			"PtgAttrSpace",
			"PtgAttrSpaceSemi",
			"PtgAttrGoto"
		].indexOf(e[0][_][0]) == -1) {
			y = e[0][h];
			var P = !0;
			switch (y[1][0]) {
				case 4: P = !1;
				case 0:
					g = Ct(" ", y[1][1]);
					break;
				case 5: P = !1;
				case 1:
					g = Ct("\r", y[1][1]);
					break;
				default: if (g = "", i.WTF) throw Error("Unexpected PtgAttrSpaceType " + y[1][0]);
			}
			s.push((P ? g : "") + s.pop() + (P ? "" : g)), h = -1;
		}
	}
	if (s.length > 1 && i.WTF) throw Error("bad formula stack");
	return s[0] == "TRUE" ? !0 : s[0] == "FALSE" ? !1 : s[0];
}
function Kd(e, t, n) {
	var r = e.l + t, i = n.biff == 2 ? 1 : 2, a, o = e.read_shift(i);
	if (o == 65535) return [[], xr(e, t - 2)];
	var s = zd(e, o, n);
	return t !== o + i && (a = Rd(e, t - o - i, s, n)), e.l = r, [s, a];
}
function qd(e, t, n) {
	var r = e.l + t, i = n.biff == 2 ? 1 : 2, a, o = e.read_shift(i);
	if (o == 65535) return [[], xr(e, t - 2)];
	var s = zd(e, o, n);
	return t !== o + i && (a = Rd(e, t - o - i, s, n)), e.l = r, [s, a];
}
function Jd(e, t, n, r) {
	var i = e.l + t, a = zd(e, r, n), o;
	return i !== e.l && (o = Rd(e, i - e.l, a, n)), [a, o];
}
function Yd(e, t, n) {
	var r = e.l + t, i, a = e.read_shift(2), o = zd(e, a, n);
	return a == 65535 ? [[], xr(e, t - 2)] : (t !== a + 2 && (i = Rd(e, r - a - 2, o, n)), [o, i]);
}
function Xd(e) {
	var t;
	if (lr(e, e.l + 6) !== 65535) return [ui(e), "n"];
	switch (e[e.l]) {
		case 0: return e.l += 8, ["String", "s"];
		case 1: return t = e[e.l + 2] === 1, e.l += 8, [t, "b"];
		case 2: return t = e[e.l + 2], e.l += 8, [t, "e"];
		case 3: return e.l += 8, ["", "s"];
	}
	return [];
}
function Zd(e, t, n) {
	var r = e.l + t, i = La(e, 6, n), a = Xd(e, 8), o = e.read_shift(1);
	n.biff != 2 && (e.read_shift(1), n.biff >= 5 && e.read_shift(4));
	var s = qd(e, r - e.l, n);
	return {
		cell: i,
		val: a[0],
		formula: s,
		shared: o >> 3 & 1,
		tt: a[1]
	};
}
function Qd(e, t, n) {
	var r = zd(e, e.read_shift(4), n), i = e.read_shift(4);
	return [r, i > 0 ? Rd(e, i, r, n) : null];
}
var $d = Qd, ef = Qd, tf = Qd, nf = Qd, rf = {
	0: "BEEP",
	1: "OPEN",
	2: "OPEN.LINKS",
	3: "CLOSE.ALL",
	4: "SAVE",
	5: "SAVE.AS",
	6: "FILE.DELETE",
	7: "PAGE.SETUP",
	8: "PRINT",
	9: "PRINTER.SETUP",
	10: "QUIT",
	11: "NEW.WINDOW",
	12: "ARRANGE.ALL",
	13: "WINDOW.SIZE",
	14: "WINDOW.MOVE",
	15: "FULL",
	16: "CLOSE",
	17: "RUN",
	22: "SET.PRINT.AREA",
	23: "SET.PRINT.TITLES",
	24: "SET.PAGE.BREAK",
	25: "REMOVE.PAGE.BREAK",
	26: "FONT",
	27: "DISPLAY",
	28: "PROTECT.DOCUMENT",
	29: "PRECISION",
	30: "A1.R1C1",
	31: "CALCULATE.NOW",
	32: "CALCULATION",
	34: "DATA.FIND",
	35: "EXTRACT",
	36: "DATA.DELETE",
	37: "SET.DATABASE",
	38: "SET.CRITERIA",
	39: "SORT",
	40: "DATA.SERIES",
	41: "TABLE",
	42: "FORMAT.NUMBER",
	43: "ALIGNMENT",
	44: "STYLE",
	45: "BORDER",
	46: "CELL.PROTECTION",
	47: "COLUMN.WIDTH",
	48: "UNDO",
	49: "CUT",
	50: "COPY",
	51: "PASTE",
	52: "CLEAR",
	53: "PASTE.SPECIAL",
	54: "EDIT.DELETE",
	55: "INSERT",
	56: "FILL.RIGHT",
	57: "FILL.DOWN",
	61: "DEFINE.NAME",
	62: "CREATE.NAMES",
	63: "FORMULA.GOTO",
	64: "FORMULA.FIND",
	65: "SELECT.LAST.CELL",
	66: "SHOW.ACTIVE.CELL",
	67: "GALLERY.AREA",
	68: "GALLERY.BAR",
	69: "GALLERY.COLUMN",
	70: "GALLERY.LINE",
	71: "GALLERY.PIE",
	72: "GALLERY.SCATTER",
	73: "COMBINATION",
	74: "PREFERRED",
	75: "ADD.OVERLAY",
	76: "GRIDLINES",
	77: "SET.PREFERRED",
	78: "AXES",
	79: "LEGEND",
	80: "ATTACH.TEXT",
	81: "ADD.ARROW",
	82: "SELECT.CHART",
	83: "SELECT.PLOT.AREA",
	84: "PATTERNS",
	85: "MAIN.CHART",
	86: "OVERLAY",
	87: "SCALE",
	88: "FORMAT.LEGEND",
	89: "FORMAT.TEXT",
	90: "EDIT.REPEAT",
	91: "PARSE",
	92: "JUSTIFY",
	93: "HIDE",
	94: "UNHIDE",
	95: "WORKSPACE",
	96: "FORMULA",
	97: "FORMULA.FILL",
	98: "FORMULA.ARRAY",
	99: "DATA.FIND.NEXT",
	100: "DATA.FIND.PREV",
	101: "FORMULA.FIND.NEXT",
	102: "FORMULA.FIND.PREV",
	103: "ACTIVATE",
	104: "ACTIVATE.NEXT",
	105: "ACTIVATE.PREV",
	106: "UNLOCKED.NEXT",
	107: "UNLOCKED.PREV",
	108: "COPY.PICTURE",
	109: "SELECT",
	110: "DELETE.NAME",
	111: "DELETE.FORMAT",
	112: "VLINE",
	113: "HLINE",
	114: "VPAGE",
	115: "HPAGE",
	116: "VSCROLL",
	117: "HSCROLL",
	118: "ALERT",
	119: "NEW",
	120: "CANCEL.COPY",
	121: "SHOW.CLIPBOARD",
	122: "MESSAGE",
	124: "PASTE.LINK",
	125: "APP.ACTIVATE",
	126: "DELETE.ARROW",
	127: "ROW.HEIGHT",
	128: "FORMAT.MOVE",
	129: "FORMAT.SIZE",
	130: "FORMULA.REPLACE",
	131: "SEND.KEYS",
	132: "SELECT.SPECIAL",
	133: "APPLY.NAMES",
	134: "REPLACE.FONT",
	135: "FREEZE.PANES",
	136: "SHOW.INFO",
	137: "SPLIT",
	138: "ON.WINDOW",
	139: "ON.DATA",
	140: "DISABLE.INPUT",
	142: "OUTLINE",
	143: "LIST.NAMES",
	144: "FILE.CLOSE",
	145: "SAVE.WORKBOOK",
	146: "DATA.FORM",
	147: "COPY.CHART",
	148: "ON.TIME",
	149: "WAIT",
	150: "FORMAT.FONT",
	151: "FILL.UP",
	152: "FILL.LEFT",
	153: "DELETE.OVERLAY",
	155: "SHORT.MENUS",
	159: "SET.UPDATE.STATUS",
	161: "COLOR.PALETTE",
	162: "DELETE.STYLE",
	163: "WINDOW.RESTORE",
	164: "WINDOW.MAXIMIZE",
	166: "CHANGE.LINK",
	167: "CALCULATE.DOCUMENT",
	168: "ON.KEY",
	169: "APP.RESTORE",
	170: "APP.MOVE",
	171: "APP.SIZE",
	172: "APP.MINIMIZE",
	173: "APP.MAXIMIZE",
	174: "BRING.TO.FRONT",
	175: "SEND.TO.BACK",
	185: "MAIN.CHART.TYPE",
	186: "OVERLAY.CHART.TYPE",
	187: "SELECT.END",
	188: "OPEN.MAIL",
	189: "SEND.MAIL",
	190: "STANDARD.FONT",
	191: "CONSOLIDATE",
	192: "SORT.SPECIAL",
	193: "GALLERY.3D.AREA",
	194: "GALLERY.3D.COLUMN",
	195: "GALLERY.3D.LINE",
	196: "GALLERY.3D.PIE",
	197: "VIEW.3D",
	198: "GOAL.SEEK",
	199: "WORKGROUP",
	200: "FILL.GROUP",
	201: "UPDATE.LINK",
	202: "PROMOTE",
	203: "DEMOTE",
	204: "SHOW.DETAIL",
	206: "UNGROUP",
	207: "OBJECT.PROPERTIES",
	208: "SAVE.NEW.OBJECT",
	209: "SHARE",
	210: "SHARE.NAME",
	211: "DUPLICATE",
	212: "APPLY.STYLE",
	213: "ASSIGN.TO.OBJECT",
	214: "OBJECT.PROTECTION",
	215: "HIDE.OBJECT",
	216: "SET.EXTRACT",
	217: "CREATE.PUBLISHER",
	218: "SUBSCRIBE.TO",
	219: "ATTRIBUTES",
	220: "SHOW.TOOLBAR",
	222: "PRINT.PREVIEW",
	223: "EDIT.COLOR",
	224: "SHOW.LEVELS",
	225: "FORMAT.MAIN",
	226: "FORMAT.OVERLAY",
	227: "ON.RECALC",
	228: "EDIT.SERIES",
	229: "DEFINE.STYLE",
	240: "LINE.PRINT",
	243: "ENTER.DATA",
	249: "GALLERY.RADAR",
	250: "MERGE.STYLES",
	251: "EDITION.OPTIONS",
	252: "PASTE.PICTURE",
	253: "PASTE.PICTURE.LINK",
	254: "SPELLING",
	256: "ZOOM",
	259: "INSERT.OBJECT",
	260: "WINDOW.MINIMIZE",
	265: "SOUND.NOTE",
	266: "SOUND.PLAY",
	267: "FORMAT.SHAPE",
	268: "EXTEND.POLYGON",
	269: "FORMAT.AUTO",
	272: "GALLERY.3D.BAR",
	273: "GALLERY.3D.SURFACE",
	274: "FILL.AUTO",
	276: "CUSTOMIZE.TOOLBAR",
	277: "ADD.TOOL",
	278: "EDIT.OBJECT",
	279: "ON.DOUBLECLICK",
	280: "ON.ENTRY",
	281: "WORKBOOK.ADD",
	282: "WORKBOOK.MOVE",
	283: "WORKBOOK.COPY",
	284: "WORKBOOK.OPTIONS",
	285: "SAVE.WORKSPACE",
	288: "CHART.WIZARD",
	289: "DELETE.TOOL",
	290: "MOVE.TOOL",
	291: "WORKBOOK.SELECT",
	292: "WORKBOOK.ACTIVATE",
	293: "ASSIGN.TO.TOOL",
	295: "COPY.TOOL",
	296: "RESET.TOOL",
	297: "CONSTRAIN.NUMERIC",
	298: "PASTE.TOOL",
	302: "WORKBOOK.NEW",
	305: "SCENARIO.CELLS",
	306: "SCENARIO.DELETE",
	307: "SCENARIO.ADD",
	308: "SCENARIO.EDIT",
	309: "SCENARIO.SHOW",
	310: "SCENARIO.SHOW.NEXT",
	311: "SCENARIO.SUMMARY",
	312: "PIVOT.TABLE.WIZARD",
	313: "PIVOT.FIELD.PROPERTIES",
	314: "PIVOT.FIELD",
	315: "PIVOT.ITEM",
	316: "PIVOT.ADD.FIELDS",
	318: "OPTIONS.CALCULATION",
	319: "OPTIONS.EDIT",
	320: "OPTIONS.VIEW",
	321: "ADDIN.MANAGER",
	322: "MENU.EDITOR",
	323: "ATTACH.TOOLBARS",
	324: "VBAActivate",
	325: "OPTIONS.CHART",
	328: "VBA.INSERT.FILE",
	330: "VBA.PROCEDURE.DEFINITION",
	336: "ROUTING.SLIP",
	338: "ROUTE.DOCUMENT",
	339: "MAIL.LOGON",
	342: "INSERT.PICTURE",
	343: "EDIT.TOOL",
	344: "GALLERY.DOUGHNUT",
	350: "CHART.TREND",
	352: "PIVOT.ITEM.PROPERTIES",
	354: "WORKBOOK.INSERT",
	355: "OPTIONS.TRANSITION",
	356: "OPTIONS.GENERAL",
	370: "FILTER.ADVANCED",
	373: "MAIL.ADD.MAILER",
	374: "MAIL.DELETE.MAILER",
	375: "MAIL.REPLY",
	376: "MAIL.REPLY.ALL",
	377: "MAIL.FORWARD",
	378: "MAIL.NEXT.LETTER",
	379: "DATA.LABEL",
	380: "INSERT.TITLE",
	381: "FONT.PROPERTIES",
	382: "MACRO.OPTIONS",
	383: "WORKBOOK.HIDE",
	384: "WORKBOOK.UNHIDE",
	385: "WORKBOOK.DELETE",
	386: "WORKBOOK.NAME",
	388: "GALLERY.CUSTOM",
	390: "ADD.CHART.AUTOFORMAT",
	391: "DELETE.CHART.AUTOFORMAT",
	392: "CHART.ADD.DATA",
	393: "AUTO.OUTLINE",
	394: "TAB.ORDER",
	395: "SHOW.DIALOG",
	396: "SELECT.ALL",
	397: "UNGROUP.SHEETS",
	398: "SUBTOTAL.CREATE",
	399: "SUBTOTAL.REMOVE",
	400: "RENAME.OBJECT",
	412: "WORKBOOK.SCROLL",
	413: "WORKBOOK.NEXT",
	414: "WORKBOOK.PREV",
	415: "WORKBOOK.TAB.SPLIT",
	416: "FULL.SCREEN",
	417: "WORKBOOK.PROTECT",
	420: "SCROLLBAR.PROPERTIES",
	421: "PIVOT.SHOW.PAGES",
	422: "TEXT.TO.COLUMNS",
	423: "FORMAT.CHARTTYPE",
	424: "LINK.FORMAT",
	425: "TRACER.DISPLAY",
	430: "TRACER.NAVIGATE",
	431: "TRACER.CLEAR",
	432: "TRACER.ERROR",
	433: "PIVOT.FIELD.GROUP",
	434: "PIVOT.FIELD.UNGROUP",
	435: "CHECKBOX.PROPERTIES",
	436: "LABEL.PROPERTIES",
	437: "LISTBOX.PROPERTIES",
	438: "EDITBOX.PROPERTIES",
	439: "PIVOT.REFRESH",
	440: "LINK.COMBO",
	441: "OPEN.TEXT",
	442: "HIDE.DIALOG",
	443: "SET.DIALOG.FOCUS",
	444: "ENABLE.OBJECT",
	445: "PUSHBUTTON.PROPERTIES",
	446: "SET.DIALOG.DEFAULT",
	447: "FILTER",
	448: "FILTER.SHOW.ALL",
	449: "CLEAR.OUTLINE",
	450: "FUNCTION.WIZARD",
	451: "ADD.LIST.ITEM",
	452: "SET.LIST.ITEM",
	453: "REMOVE.LIST.ITEM",
	454: "SELECT.LIST.ITEM",
	455: "SET.CONTROL.VALUE",
	456: "SAVE.COPY.AS",
	458: "OPTIONS.LISTS.ADD",
	459: "OPTIONS.LISTS.DELETE",
	460: "SERIES.AXES",
	461: "SERIES.X",
	462: "SERIES.Y",
	463: "ERRORBAR.X",
	464: "ERRORBAR.Y",
	465: "FORMAT.CHART",
	466: "SERIES.ORDER",
	467: "MAIL.LOGOFF",
	468: "CLEAR.ROUTING.SLIP",
	469: "APP.ACTIVATE.MICROSOFT",
	470: "MAIL.EDIT.MAILER",
	471: "ON.SHEET",
	472: "STANDARD.WIDTH",
	473: "SCENARIO.MERGE",
	474: "SUMMARY.INFO",
	475: "FIND.FILE",
	476: "ACTIVE.CELL.FONT",
	477: "ENABLE.TIPWIZARD",
	478: "VBA.MAKE.ADDIN",
	480: "INSERTDATATABLE",
	481: "WORKGROUP.OPTIONS",
	482: "MAIL.SEND.MAILER",
	485: "AUTOCORRECT",
	489: "POST.DOCUMENT",
	491: "PICKLIST",
	493: "VIEW.SHOW",
	494: "VIEW.DEFINE",
	495: "VIEW.DELETE",
	509: "SHEET.BACKGROUND",
	510: "INSERT.MAP.OBJECT",
	511: "OPTIONS.MENONO",
	517: "MSOCHECKS",
	518: "NORMAL",
	519: "LAYOUT",
	520: "RM.PRINT.AREA",
	521: "CLEAR.PRINT.AREA",
	522: "ADD.PRINT.AREA",
	523: "MOVE.BRK",
	545: "HIDECURR.NOTE",
	546: "HIDEALL.NOTES",
	547: "DELETE.NOTE",
	548: "TRAVERSE.NOTES",
	549: "ACTIVATE.NOTES",
	620: "PROTECT.REVISIONS",
	621: "UNPROTECT.REVISIONS",
	647: "OPTIONS.ME",
	653: "WEB.PUBLISH",
	667: "NEWWEBQUERY",
	673: "PIVOT.TABLE.CHART",
	753: "OPTIONS.SAVE",
	755: "OPTIONS.SPELL",
	808: "HIDEALL.INKANNOTS"
}, af = {
	0: "COUNT",
	1: "IF",
	2: "ISNA",
	3: "ISERROR",
	4: "SUM",
	5: "AVERAGE",
	6: "MIN",
	7: "MAX",
	8: "ROW",
	9: "COLUMN",
	10: "NA",
	11: "NPV",
	12: "STDEV",
	13: "DOLLAR",
	14: "FIXED",
	15: "SIN",
	16: "COS",
	17: "TAN",
	18: "ATAN",
	19: "PI",
	20: "SQRT",
	21: "EXP",
	22: "LN",
	23: "LOG10",
	24: "ABS",
	25: "INT",
	26: "SIGN",
	27: "ROUND",
	28: "LOOKUP",
	29: "INDEX",
	30: "REPT",
	31: "MID",
	32: "LEN",
	33: "VALUE",
	34: "TRUE",
	35: "FALSE",
	36: "AND",
	37: "OR",
	38: "NOT",
	39: "MOD",
	40: "DCOUNT",
	41: "DSUM",
	42: "DAVERAGE",
	43: "DMIN",
	44: "DMAX",
	45: "DSTDEV",
	46: "VAR",
	47: "DVAR",
	48: "TEXT",
	49: "LINEST",
	50: "TREND",
	51: "LOGEST",
	52: "GROWTH",
	53: "GOTO",
	54: "HALT",
	55: "RETURN",
	56: "PV",
	57: "FV",
	58: "NPER",
	59: "PMT",
	60: "RATE",
	61: "MIRR",
	62: "IRR",
	63: "RAND",
	64: "MATCH",
	65: "DATE",
	66: "TIME",
	67: "DAY",
	68: "MONTH",
	69: "YEAR",
	70: "WEEKDAY",
	71: "HOUR",
	72: "MINUTE",
	73: "SECOND",
	74: "NOW",
	75: "AREAS",
	76: "ROWS",
	77: "COLUMNS",
	78: "OFFSET",
	79: "ABSREF",
	80: "RELREF",
	81: "ARGUMENT",
	82: "SEARCH",
	83: "TRANSPOSE",
	84: "ERROR",
	85: "STEP",
	86: "TYPE",
	87: "ECHO",
	88: "SET.NAME",
	89: "CALLER",
	90: "DEREF",
	91: "WINDOWS",
	92: "SERIES",
	93: "DOCUMENTS",
	94: "ACTIVE.CELL",
	95: "SELECTION",
	96: "RESULT",
	97: "ATAN2",
	98: "ASIN",
	99: "ACOS",
	100: "CHOOSE",
	101: "HLOOKUP",
	102: "VLOOKUP",
	103: "LINKS",
	104: "INPUT",
	105: "ISREF",
	106: "GET.FORMULA",
	107: "GET.NAME",
	108: "SET.VALUE",
	109: "LOG",
	110: "EXEC",
	111: "CHAR",
	112: "LOWER",
	113: "UPPER",
	114: "PROPER",
	115: "LEFT",
	116: "RIGHT",
	117: "EXACT",
	118: "TRIM",
	119: "REPLACE",
	120: "SUBSTITUTE",
	121: "CODE",
	122: "NAMES",
	123: "DIRECTORY",
	124: "FIND",
	125: "CELL",
	126: "ISERR",
	127: "ISTEXT",
	128: "ISNUMBER",
	129: "ISBLANK",
	130: "T",
	131: "N",
	132: "FOPEN",
	133: "FCLOSE",
	134: "FSIZE",
	135: "FREADLN",
	136: "FREAD",
	137: "FWRITELN",
	138: "FWRITE",
	139: "FPOS",
	140: "DATEVALUE",
	141: "TIMEVALUE",
	142: "SLN",
	143: "SYD",
	144: "DDB",
	145: "GET.DEF",
	146: "REFTEXT",
	147: "TEXTREF",
	148: "INDIRECT",
	149: "REGISTER",
	150: "CALL",
	151: "ADD.BAR",
	152: "ADD.MENU",
	153: "ADD.COMMAND",
	154: "ENABLE.COMMAND",
	155: "CHECK.COMMAND",
	156: "RENAME.COMMAND",
	157: "SHOW.BAR",
	158: "DELETE.MENU",
	159: "DELETE.COMMAND",
	160: "GET.CHART.ITEM",
	161: "DIALOG.BOX",
	162: "CLEAN",
	163: "MDETERM",
	164: "MINVERSE",
	165: "MMULT",
	166: "FILES",
	167: "IPMT",
	168: "PPMT",
	169: "COUNTA",
	170: "CANCEL.KEY",
	171: "FOR",
	172: "WHILE",
	173: "BREAK",
	174: "NEXT",
	175: "INITIATE",
	176: "REQUEST",
	177: "POKE",
	178: "EXECUTE",
	179: "TERMINATE",
	180: "RESTART",
	181: "HELP",
	182: "GET.BAR",
	183: "PRODUCT",
	184: "FACT",
	185: "GET.CELL",
	186: "GET.WORKSPACE",
	187: "GET.WINDOW",
	188: "GET.DOCUMENT",
	189: "DPRODUCT",
	190: "ISNONTEXT",
	191: "GET.NOTE",
	192: "NOTE",
	193: "STDEVP",
	194: "VARP",
	195: "DSTDEVP",
	196: "DVARP",
	197: "TRUNC",
	198: "ISLOGICAL",
	199: "DCOUNTA",
	200: "DELETE.BAR",
	201: "UNREGISTER",
	204: "USDOLLAR",
	205: "FINDB",
	206: "SEARCHB",
	207: "REPLACEB",
	208: "LEFTB",
	209: "RIGHTB",
	210: "MIDB",
	211: "LENB",
	212: "ROUNDUP",
	213: "ROUNDDOWN",
	214: "ASC",
	215: "DBCS",
	216: "RANK",
	219: "ADDRESS",
	220: "DAYS360",
	221: "TODAY",
	222: "VDB",
	223: "ELSE",
	224: "ELSE.IF",
	225: "END.IF",
	226: "FOR.CELL",
	227: "MEDIAN",
	228: "SUMPRODUCT",
	229: "SINH",
	230: "COSH",
	231: "TANH",
	232: "ASINH",
	233: "ACOSH",
	234: "ATANH",
	235: "DGET",
	236: "CREATE.OBJECT",
	237: "VOLATILE",
	238: "LAST.ERROR",
	239: "CUSTOM.UNDO",
	240: "CUSTOM.REPEAT",
	241: "FORMULA.CONVERT",
	242: "GET.LINK.INFO",
	243: "TEXT.BOX",
	244: "INFO",
	245: "GROUP",
	246: "GET.OBJECT",
	247: "DB",
	248: "PAUSE",
	251: "RESUME",
	252: "FREQUENCY",
	253: "ADD.TOOLBAR",
	254: "DELETE.TOOLBAR",
	255: "User",
	256: "RESET.TOOLBAR",
	257: "EVALUATE",
	258: "GET.TOOLBAR",
	259: "GET.TOOL",
	260: "SPELLING.CHECK",
	261: "ERROR.TYPE",
	262: "APP.TITLE",
	263: "WINDOW.TITLE",
	264: "SAVE.TOOLBAR",
	265: "ENABLE.TOOL",
	266: "PRESS.TOOL",
	267: "REGISTER.ID",
	268: "GET.WORKBOOK",
	269: "AVEDEV",
	270: "BETADIST",
	271: "GAMMALN",
	272: "BETAINV",
	273: "BINOMDIST",
	274: "CHIDIST",
	275: "CHIINV",
	276: "COMBIN",
	277: "CONFIDENCE",
	278: "CRITBINOM",
	279: "EVEN",
	280: "EXPONDIST",
	281: "FDIST",
	282: "FINV",
	283: "FISHER",
	284: "FISHERINV",
	285: "FLOOR",
	286: "GAMMADIST",
	287: "GAMMAINV",
	288: "CEILING",
	289: "HYPGEOMDIST",
	290: "LOGNORMDIST",
	291: "LOGINV",
	292: "NEGBINOMDIST",
	293: "NORMDIST",
	294: "NORMSDIST",
	295: "NORMINV",
	296: "NORMSINV",
	297: "STANDARDIZE",
	298: "ODD",
	299: "PERMUT",
	300: "POISSON",
	301: "TDIST",
	302: "WEIBULL",
	303: "SUMXMY2",
	304: "SUMX2MY2",
	305: "SUMX2PY2",
	306: "CHITEST",
	307: "CORREL",
	308: "COVAR",
	309: "FORECAST",
	310: "FTEST",
	311: "INTERCEPT",
	312: "PEARSON",
	313: "RSQ",
	314: "STEYX",
	315: "SLOPE",
	316: "TTEST",
	317: "PROB",
	318: "DEVSQ",
	319: "GEOMEAN",
	320: "HARMEAN",
	321: "SUMSQ",
	322: "KURT",
	323: "SKEW",
	324: "ZTEST",
	325: "LARGE",
	326: "SMALL",
	327: "QUARTILE",
	328: "PERCENTILE",
	329: "PERCENTRANK",
	330: "MODE",
	331: "TRIMMEAN",
	332: "TINV",
	334: "MOVIE.COMMAND",
	335: "GET.MOVIE",
	336: "CONCATENATE",
	337: "POWER",
	338: "PIVOT.ADD.DATA",
	339: "GET.PIVOT.TABLE",
	340: "GET.PIVOT.FIELD",
	341: "GET.PIVOT.ITEM",
	342: "RADIANS",
	343: "DEGREES",
	344: "SUBTOTAL",
	345: "SUMIF",
	346: "COUNTIF",
	347: "COUNTBLANK",
	348: "SCENARIO.GET",
	349: "OPTIONS.LISTS.GET",
	350: "ISPMT",
	351: "DATEDIF",
	352: "DATESTRING",
	353: "NUMBERSTRING",
	354: "ROMAN",
	355: "OPEN.DIALOG",
	356: "SAVE.DIALOG",
	357: "VIEW.GET",
	358: "GETPIVOTDATA",
	359: "HYPERLINK",
	360: "PHONETIC",
	361: "AVERAGEA",
	362: "MAXA",
	363: "MINA",
	364: "STDEVPA",
	365: "VARPA",
	366: "STDEVA",
	367: "VARA",
	368: "BAHTTEXT",
	369: "THAIDAYOFWEEK",
	370: "THAIDIGIT",
	371: "THAIMONTHOFYEAR",
	372: "THAINUMSOUND",
	373: "THAINUMSTRING",
	374: "THAISTRINGLENGTH",
	375: "ISTHAIDIGIT",
	376: "ROUNDBAHTDOWN",
	377: "ROUNDBAHTUP",
	378: "THAIYEAR",
	379: "RTD",
	380: "CUBEVALUE",
	381: "CUBEMEMBER",
	382: "CUBEMEMBERPROPERTY",
	383: "CUBERANKEDMEMBER",
	384: "HEX2BIN",
	385: "HEX2DEC",
	386: "HEX2OCT",
	387: "DEC2BIN",
	388: "DEC2HEX",
	389: "DEC2OCT",
	390: "OCT2BIN",
	391: "OCT2HEX",
	392: "OCT2DEC",
	393: "BIN2DEC",
	394: "BIN2OCT",
	395: "BIN2HEX",
	396: "IMSUB",
	397: "IMDIV",
	398: "IMPOWER",
	399: "IMABS",
	400: "IMSQRT",
	401: "IMLN",
	402: "IMLOG2",
	403: "IMLOG10",
	404: "IMSIN",
	405: "IMCOS",
	406: "IMEXP",
	407: "IMARGUMENT",
	408: "IMCONJUGATE",
	409: "IMAGINARY",
	410: "IMREAL",
	411: "COMPLEX",
	412: "IMSUM",
	413: "IMPRODUCT",
	414: "SERIESSUM",
	415: "FACTDOUBLE",
	416: "SQRTPI",
	417: "QUOTIENT",
	418: "DELTA",
	419: "GESTEP",
	420: "ISEVEN",
	421: "ISODD",
	422: "MROUND",
	423: "ERF",
	424: "ERFC",
	425: "BESSELJ",
	426: "BESSELK",
	427: "BESSELY",
	428: "BESSELI",
	429: "XIRR",
	430: "XNPV",
	431: "PRICEMAT",
	432: "YIELDMAT",
	433: "INTRATE",
	434: "RECEIVED",
	435: "DISC",
	436: "PRICEDISC",
	437: "YIELDDISC",
	438: "TBILLEQ",
	439: "TBILLPRICE",
	440: "TBILLYIELD",
	441: "PRICE",
	442: "YIELD",
	443: "DOLLARDE",
	444: "DOLLARFR",
	445: "NOMINAL",
	446: "EFFECT",
	447: "CUMPRINC",
	448: "CUMIPMT",
	449: "EDATE",
	450: "EOMONTH",
	451: "YEARFRAC",
	452: "COUPDAYBS",
	453: "COUPDAYS",
	454: "COUPDAYSNC",
	455: "COUPNCD",
	456: "COUPNUM",
	457: "COUPPCD",
	458: "DURATION",
	459: "MDURATION",
	460: "ODDLPRICE",
	461: "ODDLYIELD",
	462: "ODDFPRICE",
	463: "ODDFYIELD",
	464: "RANDBETWEEN",
	465: "WEEKNUM",
	466: "AMORDEGRC",
	467: "AMORLINC",
	468: "CONVERT",
	724: "SHEETJS",
	469: "ACCRINT",
	470: "ACCRINTM",
	471: "WORKDAY",
	472: "NETWORKDAYS",
	473: "GCD",
	474: "MULTINOMIAL",
	475: "LCM",
	476: "FVSCHEDULE",
	477: "CUBEKPIMEMBER",
	478: "CUBESET",
	479: "CUBESETCOUNT",
	480: "IFERROR",
	481: "COUNTIFS",
	482: "SUMIFS",
	483: "AVERAGEIF",
	484: "AVERAGEIFS"
}, of = {
	2: 1,
	3: 1,
	10: 0,
	15: 1,
	16: 1,
	17: 1,
	18: 1,
	19: 0,
	20: 1,
	21: 1,
	22: 1,
	23: 1,
	24: 1,
	25: 1,
	26: 1,
	27: 2,
	30: 2,
	31: 3,
	32: 1,
	33: 1,
	34: 0,
	35: 0,
	38: 1,
	39: 2,
	40: 3,
	41: 3,
	42: 3,
	43: 3,
	44: 3,
	45: 3,
	47: 3,
	48: 2,
	53: 1,
	61: 3,
	63: 0,
	65: 3,
	66: 3,
	67: 1,
	68: 1,
	69: 1,
	70: 1,
	71: 1,
	72: 1,
	73: 1,
	74: 0,
	75: 1,
	76: 1,
	77: 1,
	79: 2,
	80: 2,
	83: 1,
	85: 0,
	86: 1,
	89: 0,
	90: 1,
	94: 0,
	95: 0,
	97: 2,
	98: 1,
	99: 1,
	101: 3,
	102: 3,
	105: 1,
	106: 1,
	108: 2,
	111: 1,
	112: 1,
	113: 1,
	114: 1,
	117: 2,
	118: 1,
	119: 4,
	121: 1,
	126: 1,
	127: 1,
	128: 1,
	129: 1,
	130: 1,
	131: 1,
	133: 1,
	134: 1,
	135: 1,
	136: 2,
	137: 2,
	138: 2,
	140: 1,
	141: 1,
	142: 3,
	143: 4,
	144: 4,
	161: 1,
	162: 1,
	163: 1,
	164: 1,
	165: 2,
	172: 1,
	175: 2,
	176: 2,
	177: 3,
	178: 2,
	179: 1,
	184: 1,
	186: 1,
	189: 3,
	190: 1,
	195: 3,
	196: 3,
	197: 1,
	198: 1,
	199: 3,
	201: 1,
	207: 4,
	210: 3,
	211: 1,
	212: 2,
	213: 2,
	214: 1,
	215: 1,
	225: 0,
	229: 1,
	230: 1,
	231: 1,
	232: 1,
	233: 1,
	234: 1,
	235: 3,
	244: 1,
	247: 4,
	252: 2,
	257: 1,
	261: 1,
	271: 1,
	273: 4,
	274: 2,
	275: 2,
	276: 2,
	277: 3,
	278: 3,
	279: 1,
	280: 3,
	281: 3,
	282: 3,
	283: 1,
	284: 1,
	285: 2,
	286: 4,
	287: 3,
	288: 2,
	289: 4,
	290: 3,
	291: 3,
	292: 3,
	293: 4,
	294: 1,
	295: 3,
	296: 1,
	297: 3,
	298: 1,
	299: 2,
	300: 3,
	301: 3,
	302: 4,
	303: 2,
	304: 2,
	305: 2,
	306: 2,
	307: 2,
	308: 2,
	309: 3,
	310: 2,
	311: 2,
	312: 2,
	313: 2,
	314: 2,
	315: 2,
	316: 4,
	325: 2,
	326: 2,
	327: 2,
	328: 2,
	331: 2,
	332: 2,
	337: 2,
	342: 1,
	343: 1,
	346: 2,
	347: 1,
	350: 4,
	351: 3,
	352: 1,
	353: 2,
	360: 1,
	368: 1,
	369: 1,
	370: 1,
	371: 1,
	372: 1,
	373: 1,
	374: 1,
	375: 1,
	376: 1,
	377: 1,
	378: 1,
	382: 3,
	385: 1,
	392: 1,
	393: 1,
	396: 2,
	397: 2,
	398: 2,
	399: 1,
	400: 1,
	401: 1,
	402: 1,
	403: 1,
	404: 1,
	405: 1,
	406: 1,
	407: 1,
	408: 1,
	409: 1,
	410: 1,
	414: 4,
	415: 1,
	416: 1,
	417: 2,
	420: 1,
	421: 1,
	422: 2,
	424: 1,
	425: 2,
	426: 2,
	427: 2,
	428: 2,
	430: 3,
	438: 3,
	439: 3,
	440: 3,
	443: 2,
	444: 2,
	445: 2,
	446: 2,
	447: 6,
	448: 6,
	449: 2,
	450: 2,
	464: 2,
	468: 3,
	476: 2,
	479: 1,
	480: 2,
	65535: 0
};
function sf(e) {
	return e.slice(0, 3) == "of:" && (e = e.slice(3)), e.charCodeAt(0) == 61 && (e = e.slice(1), e.charCodeAt(0) == 61 && (e = e.slice(1))), e = e.replace(/COM\.MICROSOFT\./g, ""), e = e.replace(/\[((?:\.[A-Z]+[0-9]+)(?::\.[A-Z]+[0-9]+)?)\]/g, function(e, t) {
		return t.replace(/\./g, "");
	}), e = e.replace(/\$'([^']|'')+'/g, function(e) {
		return e.slice(1);
	}), e = e.replace(/\$([^\]\. #$]+)/g, function(e, t) {
		return t.match(/^([A-Z]{1,2}|[A-W][A-Z]{2}|X[A-E][A-Z]|XF[A-D])?(10[0-3]\d{4}|104[0-7]\d{3}|1048[0-4]\d{2}|10485[0-6]\d|104857[0-6]|[1-9]\d{0,5})?$/) ? e : t;
	}), e = e.replace(/\[.(#[A-Z]*[?!])\]/g, "$1"), e.replace(/[;~]/g, ",").replace(/\|/g, ";");
}
function cf(e) {
	e = e.replace(/\$'([^']|'')+'/g, function(e) {
		return e.slice(1);
	}), e = e.replace(/\$([^\]\. #$]+)/g, function(e, t) {
		return t.match(/^([A-Z]{1,2}|[A-W][A-Z]{2}|X[A-E][A-Z]|XF[A-D])?(10[0-3]\d{4}|104[0-7]\d{3}|1048[0-4]\d{2}|10485[0-6]\d|104857[0-6]|[1-9]\d{0,5})?$/) ? e : t;
	});
	var t = e.split(":");
	return [t[0].split(".")[0], t[0].split(".")[1] + (t.length > 1 ? ":" + (t[1].split(".")[1] || t[1].split(".")[0]) : "")];
}
var lf = {}, uf = {};
function df(e, t) {
	if (e) {
		var n = [
			.7,
			.7,
			.75,
			.75,
			.3,
			.3
		];
		t == "xlml" && (n = [
			1,
			1,
			1,
			1,
			.5,
			.5
		]), e.left == null && (e.left = n[0]), e.right == null && (e.right = n[1]), e.top == null && (e.top = n[2]), e.bottom == null && (e.bottom = n[3]), e.header == null && (e.header = n[4]), e.footer == null && (e.footer = n[5]);
	}
}
function ff(e, t) {
	return t && lt(t).forEach(function(n) {
		e[n] = St(t[n]);
	}), e;
}
function pf(e, t) {
	return t ? (t.patternType != null && (e.patternType = t.patternType), t.fgColor != null && (e.fgColor = St(t.fgColor)), t.bgColor != null && (e.bgColor = St(t.bgColor)), t.gradientFill != null && (e.gradientFill = St(t.gradientFill)), e) : e;
}
function mf(e, t, n, r) {
	if (!e || !t) return null;
	var i = {};
	t.xfId != null && e.CellStyleXf && e.CellStyleXf[t.xfId] && ff(i, e.CellStyleXf[t.xfId]), ff(i, t);
	var a = {
		id: r,
		xf: St(i)
	};
	return i.numFmtId != null && (a.numFmtId = i.numFmtId, e.NumberFmt && e.NumberFmt[i.numFmtId] != null && (a.numFmt = e.NumberFmt[i.numFmtId])), i.fontId != null && e.Fonts && e.Fonts[i.fontId] && (a.font = pc(e.Fonts[i.fontId], n)), i.fillId != null && e.Fills && e.Fills[i.fillId] && (a.fill = pc(e.Fills[i.fillId], n), pf(a, a.fill)), i.borderId != null && e.Borders && e.Borders[i.borderId] && (a.border = pc(e.Borders[i.borderId], n)), i.alignment && (a.alignment = St(i.alignment)), i.protection && (a.protection = St(i.protection)), a;
}
function hf(e, t, n, r, i, a, o, s, c) {
	try {
		r.cellNF && (e.z = J[t]);
	} catch (e) {
		if (r.WTF) throw e;
	}
	if (!(e.t === "z" && !r.cellStyles)) {
		if (e.t === "d" && typeof e.v == "string" && (e.v = bt(e.v)), (!r || r.cellText !== !1) && e.t !== "z") try {
			if (J[t] == null && it($e[t] || "General", t), e.t === "e") e.w = e.w || Fi[e.v];
			else if (t === 0) if (e.t === "n") (e.v | 0) === e.v ? e.w = e.v.toString(10) : e.w = ve(e.v);
			else if (e.t === "d") {
				var l = mt(e.v, !!o);
				(l | 0) === l ? e.w = l.toString(10) : e.w = ve(l);
			} else if (e.v === void 0) return "";
			else e.w = ye(e.v, uf);
			else e.t === "d" ? e.w = Xe(t, mt(e.v, !!o), uf) : e.w = Xe(t, e.v, uf);
		} catch (e) {
			if (r.WTF) throw e;
		}
		if (r.cellStyles) {
			if (s != null) try {
				var u = mf(a, s, i, c);
				if (u) {
					e.s = u;
					return;
				}
			} catch (e) {
				if (r.WTF) throw e;
			}
			if (n != null) try {
				e.s = pc(a.Fills[n], i);
			} catch (e) {
				if (r.WTF && a.Fills) throw e;
			}
		}
	}
}
function gf(e, t) {
	return !(e.e.r < t.s.r || t.e.r < e.s.r || e.e.c < t.s.c || t.e.c < e.s.c);
}
function _f(e, t) {
	for (var n = e && e["!merges"] || [], r = [], i = e && e["!ref"] ? Ur(e["!ref"]) : null, a = {}, o = 0; o < n.length; ++o) {
		var s = n[o], c = "";
		if (!s || !s.s || !s.e) {
			r.push({
				code: "E_MERGE_RANGE",
				message: "Merge range is malformed",
				index: o
			});
			continue;
		}
		if (s.s.r < 0 || s.s.c < 0 || s.e.r < s.s.r || s.e.c < s.s.c) {
			r.push({
				code: "E_MERGE_RANGE",
				message: "Merge range is invalid",
				index: o,
				range: s
			});
			continue;
		}
		c = Vr(s), a[c] != null && r.push({
			code: "E_MERGE_DUP",
			message: "Merge range is duplicated",
			index: o,
			other: a[c],
			range: c
		}), a[c] = o, i && (s.s.r < i.s.r || s.s.c < i.s.c || s.e.r > i.e.r || s.e.c > i.e.c) && r.push({
			code: "E_MERGE_BOUNDS",
			message: "Merge range exceeds worksheet range",
			index: o,
			range: c,
			ref: Vr(i)
		});
		for (var l = 0; l < o; ++l) !n[l] || !n[l].s || !n[l].e || gf(s, n[l]) && Vr(n[l]) != c && r.push({
			code: "E_MERGE_OVERLAP",
			message: "Merge ranges overlap",
			index: o,
			other: l,
			range: c,
			otherRange: Vr(n[l])
		});
	}
	if (r.length && t && t.WTF) throw Error(r[0].message + " (" + (r[0].range || r[0].index) + ")");
	return r;
}
function vf(e, t) {
	var n = Ur(t);
	n.s.r <= n.e.r && n.s.c <= n.e.c && n.s.r >= 0 && n.s.c >= 0 && (e["!ref"] = Vr(n));
}
var yf = /<(?:\w+:)?mergeCell ref=["'][A-Z0-9:]+['"]\s*[\/]?>/g, bf = /<(?:\w+:)?hyperlink [^<>]*>/gm, xf = /"(\w*:\w*)"/, Sf = /<(?:\w+:)?col\b[^<>]*[\/]?>/g, Cf = /<(?:\w:)?autoFilter[^>]*([\/]|>([\s\S]*)<\/(?:\w:)?autoFilter)>/g, wf = /<(?:\w+:)?pageMargins[^<>]*\/>/g, Tf = /<(?:\w+:)?sheetPr\b[^<>]*?\/>/;
function Ef(e, t, n, r, i, a, o) {
	if (!e) return e;
	r || (r = { "!id": {} }), D != null && t.dense == null && (t.dense = D);
	var s = {};
	t.dense && (s["!data"] = []);
	var c = {
		s: {
			r: 2e6,
			c: 2e6
		},
		e: {
			r: 0,
			c: 0
		}
	}, l = "", u = "", d = Vt(e, "sheetData");
	d ? (l = e.slice(0, d.index), u = e.slice(d.index + d[0].length)) : l = u = e;
	var f = l.match(Tf);
	f ? Df(f[0], s, i, n) : (f = Vt(l, "sheetPr")) && Of(f[0], f[1] || "", s, i, n, o, a);
	var p = (l.match(/<(?:\w*:)?dimension/) || { index: -1 }).index;
	if (p > 0) {
		var m = l.slice(p, p + 50).match(xf);
		m && !(t && t.nodim) && vf(s, m[1]);
	}
	var h = Vt(l, "sheetViews");
	h && h[1] && Pf(h[1], i);
	var g = [];
	if (t.cellStyles) {
		var _ = l.match(Sf);
		_ && jf(g, _);
	}
	d && Ff(d[1], s, t, c, a, o, i);
	var v = u.match(Cf);
	v && (s["!autofilter"] = Mf(v[0]));
	var y = [], b = u.match(yf);
	if (b) for (p = 0; p != b.length; ++p) y[p] = Ur(b[p].slice(b[p].indexOf("=") + 2));
	var x = u.match(bf);
	x && kf(s, x, r);
	var S = u.match(wf);
	S && (s["!margins"] = Af(X(S[0])));
	var C;
	if ((C = u.match(/<(?:\w+:)?drawing\b[^<>]*r:id="(.*?)"/)) && (s["!rel"] = C[1]), (C = u.match(/legacyDrawing r:id="(.*?)"/)) && (s["!legrel"] = C[1]), t && t.nodim && (c.s.c = c.s.r = 0), !s["!ref"] && c.e.c >= c.s.c && c.e.r >= c.s.r && (s["!ref"] = Vr(c)), t.sheetRows > 0 && s["!ref"]) {
		var w = Ur(s["!ref"]);
		t.sheetRows <= +w.e.r && (w.e.r = t.sheetRows - 1, w.e.r > c.e.r && (w.e.r = c.e.r), w.e.r < w.s.r && (w.s.r = w.e.r), w.e.c > c.e.c && (w.e.c = c.e.c), w.e.c < w.s.c && (w.s.c = w.e.c), s["!fullref"] = s["!ref"], s["!ref"] = Vr(w));
	}
	if (g.length > 0 && (s["!cols"] = g), y.length > 0) {
		s["!merges"] = y;
		var T = _f(s, { WTF: !!(t && (t.WTF || t.validateMerges)) });
		T.length && (s["!mergeErrors"] = T);
	}
	return r["!id"][s["!rel"]] && (s["!drawel"] = r["!id"][s["!rel"]]), r["!id"][s["!legrel"]] && (s["!legdrawel"] = r["!id"][s["!legrel"]]), s;
}
function Df(e, t, n, r) {
	var i = X(e);
	n.Sheets[r] || (n.Sheets[r] = {}), i.codeName && (n.Sheets[r].CodeName = mn(Tn(i.codeName)));
}
function Of(e, t, n, r, i) {
	Df(e.slice(0, e.indexOf(">")), n, r, i);
}
function kf(e, t, n) {
	for (var r = e["!data"] != null, i = 0; i != t.length; ++i) {
		var a = X(Tn(t[i]), !0);
		if (!a.ref) return;
		var o = ((n || {})["!id"] || [])[a.id];
		o ? (a.Target = o.Target, a.location && (a.Target += "#" + mn(a.location))) : (a.Target = "#" + mn(a.location), o = {
			Target: a.Target,
			TargetMode: "Internal"
		}), a.Rel = o, a.tooltip && (a.Tooltip = a.tooltip, delete a.tooltip);
		for (var s = Ur(a.ref), c = s.s.r; c <= s.e.r; ++c) for (var l = s.s.c; l <= s.e.c; ++l) {
			var u = Pr(l) + Ar(c);
			r ? (e["!data"][c] || (e["!data"][c] = []), e["!data"][c][l] || (e["!data"][c][l] = {
				t: "z",
				v: void 0
			}), e["!data"][c][l].l = a) : (e[u] || (e[u] = {
				t: "z",
				v: void 0
			}), e[u].l = a);
		}
	}
}
function Af(e) {
	var t = {};
	return [
		"left",
		"right",
		"top",
		"bottom",
		"header",
		"footer"
	].forEach(function(n) {
		e[n] && (t[n] = parseFloat(e[n]));
	}), t;
}
function jf(e, t) {
	for (var n = !1, r = 0; r != t.length; ++r) {
		var i = X(t[r], !0);
		i.hidden && (i.hidden = Z(i.hidden)), i.bestFit && (i.bestFit = Z(i.bestFit)), i.customWidth && (i.customWidth = Z(i.customWidth));
		var a = parseInt(i.min, 10) - 1, o = parseInt(i.max, 10) - 1;
		for (i.outlineLevel && (i.level = +i.outlineLevel || 0), delete i.min, delete i.max, i.width = +i.width, !n && i.width && (n = !0, _c = mc, Sc(i.width)), Cc(i); a <= o;) e[a++] = St(i);
	}
}
function Mf(e) {
	return { ref: (e.match(/ref=["']([^"']*)["']/) || [])[1] };
}
var Nf = /<(?:\w:)?sheetView(?:[^<>a-z][^<>]*)?\/?>/g;
function Pf(e, t) {
	t.Views || (t.Views = [{}]), (e.match(Nf) || []).forEach(function(e, n) {
		var r = X(e);
		t.Views[n] || (t.Views[n] = {}), +r.zoomScale && (t.Views[n].zoom = +r.zoomScale), r.rightToLeft && Z(r.rightToLeft) && (t.Views[n].RTL = !0);
	});
}
var Ff = /*#__PURE__*/ (function() {
	var e = /<(?:\w+:)?c[ \/>]/, t = /<\/(?:\w+:)?row>/, n = /r=["']([^"']*)["']/, r = /ref=["']([^"']*)["']/;
	return function(i, a, o, s, c, l, u) {
		for (var d = 0, f = "", p = [], m = [], h = 0, g = 0, _ = 0, v = "", y, b, x = 0, S = 0, C, w, T = 0, E = 0, D = -1, O = Array.isArray(l.CellXf), k, A = [], j = [], M = a["!data"] != null, N = [], P = {}, F = !1, I = !!o.sheetStubs, L = !!((u || {}).WBProps || {}).date1904, R = i.split(t), z = 0, B = R.length; z != B; ++z) {
			f = R[z].trim();
			var V = f.length;
			if (V !== 0) {
				var H = 0;
				outa: for (d = 0; d < V; ++d) switch (f[d]) {
					case ">":
						if (f[d - 1] != "/") {
							++d;
							break outa;
						}
						if (o && o.cellStyles) {
							if (b = X(f.slice(H, d), !0), x = b.r == null ? x + 1 : parseInt(b.r, 10), S = -1, o.sheetRows && o.sheetRows < x) continue;
							P = {}, F = !1, b.ht && (F = !0, P.hpt = parseFloat(b.ht), P.hpx = Gc(P.hpt)), b.hidden && Z(b.hidden) && (F = !0, P.hidden = !0), b.outlineLevel != null && (F = !0, P.level = +b.outlineLevel), F && (N[x - 1] = P);
						}
						break;
					case "<":
						H = d;
						break;
				}
				if (H >= d) break;
				if (b = X(f.slice(H, d), !0), x = b.r == null ? x + 1 : parseInt(b.r, 10), S = -1, !(o.sheetRows && o.sheetRows < x)) {
					o.nodim || (s.s.r > x - 1 && (s.s.r = x - 1), s.e.r < x - 1 && (s.e.r = x - 1)), o && o.cellStyles && (P = {}, F = !1, b.ht && (F = !0, P.hpt = parseFloat(b.ht), P.hpx = Gc(P.hpt)), b.hidden && Z(b.hidden) && (F = !0, P.hidden = !0), b.outlineLevel != null && (F = !0, P.level = +b.outlineLevel), F && (N[x - 1] = P)), p = f.slice(d).split(e);
					for (var U = 0; U != p.length && p[U].trim().charAt(0) == "<"; ++U);
					for (p = p.slice(U), d = 0; d != p.length; ++d) if (f = p[d].trim(), f.length !== 0) {
						if (m = f.match(n), h = d, g = 0, _ = 0, f = "<c " + (f.slice(0, 1) == "<" ? ">" : "") + f, m != null && m.length === 2) {
							for (h = 0, v = m[1], g = 0; g != v.length && !((_ = v.charCodeAt(g) - 64) < 1 || _ > 26); ++g) h = 26 * h + _;
							--h, S = h;
						} else ++S;
						for (g = 0; g != f.length && f.charCodeAt(g) !== 62; ++g);
						if (++g, b = X(f.slice(0, g), !0), b.r || (b.r = zr({
							r: x - 1,
							c: S
						})), v = f.slice(g), y = { t: "" }, (m = Vt(v, "v")) != null && m[1] !== "" && (y.v = mn(m[1])), o.cellFormula) {
							if ((m = Vt(v, "f")) != null) {
								if (m[1] == "") m[0].indexOf("t=\"shared\"") > -1 && (w = X(m[0]), j[w.si] && (y.f = mu(j[w.si][1], j[w.si][2], b.r)));
								else if (y.f = mn(Tn(m[1]), !0), o.xlfn || (y.f = gu(y.f)), m[0].indexOf("t=\"array\"") > -1) y.F = (v.match(r) || [])[1], y.F.indexOf(":") > -1 && A.push([Ur(y.F), y.F]);
								else if (m[0].indexOf("t=\"shared\"") > -1) {
									w = X(m[0]);
									var W = mn(Tn(m[1]), !0);
									o.xlfn || (W = gu(W)), j[parseInt(w.si, 10)] = [
										w,
										W,
										b.r
									];
								}
							} else (m = v.match(/<f[^<>]*\/>/)) && (w = X(m[0]), j[w.si] && (y.f = mu(j[w.si][1], j[w.si][2], b.r)));
							var ee = Rr(b.r);
							for (g = 0; g < A.length; ++g) ee.r >= A[g][0].s.r && ee.r <= A[g][0].e.r && ee.c >= A[g][0].s.c && ee.c <= A[g][0].e.c && (y.F = A[g][1]);
						}
						if (b.t == null && y.v === void 0) if (y.f || y.F) y.v = 0, y.t = "n";
						else if (I) y.t = "z";
						else continue;
						else y.t = b.t || "n";
						switch (s.s.c > S && (s.s.c = S), s.e.c < S && (s.e.c = S), y.t) {
							case "n":
								if (y.v == "" || y.v == null) {
									if (!I) continue;
									y.t = "z";
								} else y.v = parseFloat(y.v);
								break;
							case "s":
								if (y.v === void 0) {
									if (!I) continue;
									y.t = "z";
								} else C = lf[parseInt(y.v, 10)], y.v = C.t, y.r = C.r, o.cellHTML && (y.h = C.h);
								break;
							case "str":
								y.t = "s", y.v = y.v == null ? "" : mn(Tn(y.v), !0), o.cellHTML && (y.h = yn(y.v));
								break;
							case "inlineStr":
								m = Vt(v, "is"), y.t = "s", m != null && (C = Os(m[1])) ? (y.v = C.t, o.cellHTML && (y.h = C.h)) : y.v = "";
								break;
							case "b":
								y.v = Z(y.v);
								break;
							case "d":
								o.cellDates ? y.v = bt(y.v, L) : (y.v = mt(bt(y.v, L), L), y.t = "n");
								break;
							case "e":
								(!o || o.cellText !== !1) && (y.w = y.v), y.v = Ii[y.v];
								break;
						}
						if (T = E = 0, D = -1, k = null, O && b.s !== void 0 && (D = parseInt(b.s, 10), k = l.CellXf[D], k != null && (k.numFmtId != null && (T = k.numFmtId), o.cellStyles && k.fillId != null && (E = k.fillId))), hf(y, T, E, o, c, l, L, k, D), o.cellDates && O && y.t == "n" && Ge(J[T]) && (y.v = ht(y.v + (L ? 1462 : 0)), y.t = typeof y.v == "number" ? "n" : "d"), b.cm && o.xlmeta) {
							var te = (o.xlmeta.Cell || [])[b.cm - 1];
							te && te.type == "XLDAPR" && (y.D = !0);
						}
						var ne;
						o.nodim && (ne = Rr(b.r), s.s.r > ne.r && (s.s.r = ne.r), s.e.r < ne.r && (s.e.r = ne.r)), M ? (ne = Rr(b.r), a["!data"][ne.r] || (a["!data"][ne.r] = []), a["!data"][ne.r][ne.c] = y) : a[b.r] = y;
					}
				}
			}
		}
		N.length > 0 && (a["!rows"] = N);
	};
})();
function If(e, t) {
	var n = {}, r = e.l + t;
	n.r = e.read_shift(4), e.l += 4;
	var i = e.read_shift(2);
	e.l += 1;
	var a = e.read_shift(1);
	return e.l = r, a & 7 && (n.level = a & 7), a & 16 && (n.hidden = !0), a & 32 && (n.hpt = i / 20), n;
}
var Lf = li;
function Rf() {}
function zf(e, t) {
	var n = {}, r = e[e.l];
	return ++e.l, n.above = !(r & 64), n.left = !(r & 128), e.l += 18, n.name = ri(e, t - 19), n;
}
function Bf(e) {
	return [ti(e)];
}
function Vf(e) {
	return [ni(e)];
}
function Hf(e) {
	return [
		ti(e),
		e.read_shift(1),
		"b"
	];
}
function Uf(e) {
	return [
		ni(e),
		e.read_shift(1),
		"b"
	];
}
function Wf(e) {
	return [
		ti(e),
		e.read_shift(1),
		"e"
	];
}
function Gf(e) {
	return [
		ni(e),
		e.read_shift(1),
		"e"
	];
}
function Kf(e) {
	return [
		ti(e),
		e.read_shift(4),
		"s"
	];
}
function qf(e) {
	return [
		ni(e),
		e.read_shift(4),
		"s"
	];
}
function Jf(e) {
	return [
		ti(e),
		ui(e),
		"n"
	];
}
function Yf(e) {
	return [
		ni(e),
		ui(e),
		"n"
	];
}
function Xf(e) {
	return [
		ti(e),
		si(e),
		"n"
	];
}
function Zf(e) {
	return [
		ni(e),
		si(e),
		"n"
	];
}
function Qf(e) {
	return [
		ti(e),
		$r(e),
		"is"
	];
}
function $f(e) {
	return [
		ti(e),
		Zr(e),
		"str"
	];
}
function ep(e) {
	return [
		ni(e),
		Zr(e),
		"str"
	];
}
function tp(e, t, n) {
	var r = e.l + t, i = ti(e);
	i.r = n["!row"];
	var a = [
		i,
		e.read_shift(1),
		"b"
	];
	return n.cellFormula ? (e.l += 2, a[3] = Gd(ef(e, r - e.l, n), null, i, n.supbooks, n)) : e.l = r, a;
}
function np(e, t, n) {
	var r = e.l + t, i = ti(e);
	i.r = n["!row"];
	var a = [
		i,
		e.read_shift(1),
		"e"
	];
	return n.cellFormula ? (e.l += 2, a[3] = Gd(ef(e, r - e.l, n), null, i, n.supbooks, n)) : e.l = r, a;
}
function rp(e, t, n) {
	var r = e.l + t, i = ti(e);
	i.r = n["!row"];
	var a = [
		i,
		ui(e),
		"n"
	];
	return n.cellFormula ? (e.l += 2, a[3] = Gd(ef(e, r - e.l, n), null, i, n.supbooks, n)) : e.l = r, a;
}
function ip(e, t, n) {
	var r = e.l + t, i = ti(e);
	i.r = n["!row"];
	var a = [
		i,
		Zr(e),
		"str"
	];
	return n.cellFormula ? (e.l += 2, a[3] = Gd(ef(e, r - e.l, n), null, i, n.supbooks, n)) : e.l = r, a;
}
var ap = li;
function op(e, t) {
	var n = e.l + t, r = li(e, 16), i = ii(e), a = Zr(e), o = Zr(e), s = Zr(e);
	e.l = n;
	var c = {
		rfx: r,
		relId: i,
		loc: a,
		display: s
	};
	return o && (c.Tooltip = o), c;
}
function sp() {}
function cp(e, t, n) {
	var r = e.l + t, i = ci(e, 16), a = e.read_shift(1), o = [i];
	return o[2] = a, n.cellFormula ? o[1] = $d(e, r - e.l, n) : e.l = r, o;
}
function lp(e, t, n) {
	var r = e.l + t, i = [li(e, 16)];
	return n.cellFormula && (i[1] = nf(e, r - e.l, n)), e.l = r, i;
}
var up = [
	"left",
	"right",
	"top",
	"bottom",
	"header",
	"footer"
];
function dp(e) {
	var t = {};
	return up.forEach(function(n) {
		t[n] = ui(e, 8);
	}), t;
}
function fp(e) {
	var t = e.read_shift(2);
	return e.l += 28, { RTL: t & 32 };
}
function pp() {}
function mp() {}
function hp(e, t, n, r, i, a, o) {
	if (!e) return e;
	var s = t || {};
	r || (r = { "!id": {} }), D != null && s.dense == null && (s.dense = D);
	var c = {};
	s.dense && (c["!data"] = []);
	var l, u = {
		s: {
			r: 2e6,
			c: 2e6
		},
		e: {
			r: 0,
			c: 0
		}
	}, d = [], f = !1, p = !1, m, h, g, _, v, y, b, x, S, C = [];
	s.biff = 12, s["!row"] = 0;
	var w = 0, T = !1, E = [], O = {}, k = s.supbooks || i.supbooks || [[]];
	if (k.sharedf = O, k.arrayf = E, k.SheetNames = i.SheetNames || i.Sheets.map(function(e) {
		return e.name;
	}), !s.supbooks && (s.supbooks = k, i.Names)) for (var A = 0; A < i.Names.length; ++A) k[0][A + 1] = i.Names[A];
	var j = [], M = [], N = !1;
	Bm[16] = {
		n: "BrtShortReal",
		f: Yf
	};
	var P, F, I = 1462 * !!((i || {}).WBProps || {}).date1904;
	if (Cr(e, function(e, t, D) {
		if (!p) switch (D) {
			case 148:
				l = e;
				break;
			case 0:
				m = e, s.sheetRows && s.sheetRows <= m.r && (p = !0), x = Ar(_ = m.r), s["!row"] = m.r, (e.hidden || e.hpt || e.level != null) && (e.hpt && (e.hpx = Gc(e.hpt)), M[e.r] = e);
				break;
			case 2:
			case 3:
			case 4:
			case 5:
			case 6:
			case 7:
			case 8:
			case 9:
			case 10:
			case 11:
			case 13:
			case 14:
			case 15:
			case 16:
			case 17:
			case 18:
			case 62:
				switch (h = { t: e[2] }, e[2]) {
					case "n":
						h.v = e[1];
						break;
					case "s":
						b = lf[e[1]], h.v = b.t, h.r = b.r;
						break;
					case "b":
						h.v = !!e[1];
						break;
					case "e":
						h.v = e[1], s.cellText !== !1 && (h.w = Fi[h.v]);
						break;
					case "str":
						h.t = "s", h.v = e[1];
						break;
					case "is":
						h.t = "s", h.v = e[1].t;
						break;
				}
				if ((g = o.CellXf[e[0].iStyleRef]) && hf(h, g.numFmtId, null, s, a, o, I > 0, g, e[0].iStyleRef), v = e[0].c == -1 ? v + 1 : e[0].c, s.dense ? (c["!data"][_] || (c["!data"][_] = []), c["!data"][_][v] = h) : c[Pr(v) + x] = h, s.cellFormula) {
					for (T = !1, w = 0; w < E.length; ++w) {
						var A = E[w];
						m.r >= A[0].s.r && m.r <= A[0].e.r && v >= A[0].s.c && v <= A[0].e.c && (h.F = Vr(A[0]), T = !0);
					}
					!T && e.length > 3 && (h.f = e[3]);
				}
				if (u.s.r > m.r && (u.s.r = m.r), u.s.c > v && (u.s.c = v), u.e.r < m.r && (u.e.r = m.r), u.e.c < v && (u.e.c = v), s.cellDates && g && h.t == "n" && Ge(J[g.numFmtId])) {
					var L = pe(h.v + I);
					L && (h.t = "d", h.v = new Date(Date.UTC(L.y, L.m - 1, L.d, L.H, L.M, L.S, L.u)));
				}
				P && (P.type == "XLDAPR" && (h.D = !0), P = void 0), F && (F = void 0);
				break;
			case 1:
			case 12:
				if (!s.sheetStubs || f) break;
				h = {
					t: "z",
					v: void 0
				}, v = e[0].c == -1 ? v + 1 : e[0].c, s.dense ? (c["!data"][_] || (c["!data"][_] = []), c["!data"][_][v] = h) : c[Pr(v) + x] = h, u.s.r > m.r && (u.s.r = m.r), u.s.c > v && (u.s.c = v), u.e.r < m.r && (u.e.r = m.r), u.e.c < v && (u.e.c = v), P && (P.type == "XLDAPR" && (h.D = !0), P = void 0), F && (F = void 0);
				break;
			case 176:
				C.push(e);
				break;
			case 49:
				P = ((s.xlmeta || {}).Cell || [])[e - 1];
				break;
			case 494:
				var R = r["!id"][e.relId];
				for (R ? (e.Target = R.Target, e.loc && (e.Target += "#" + e.loc), e.Rel = R) : e.relId == "" && (e.Target = "#" + e.loc), _ = e.rfx.s.r; _ <= e.rfx.e.r; ++_) for (v = e.rfx.s.c; v <= e.rfx.e.c; ++v) s.dense ? (c["!data"][_] || (c["!data"][_] = []), c["!data"][_][v] || (c["!data"][_][v] = {
					t: "z",
					v: void 0
				}), c["!data"][_][v].l = e) : (y = Pr(v) + Ar(_), c[y] || (c[y] = {
					t: "z",
					v: void 0
				}), c[y].l = e);
				break;
			case 426:
				if (!s.cellFormula) break;
				E.push(e), S = s.dense ? c["!data"][_][v] : c[Pr(v) + x], S.f = Gd(e[1], u, {
					r: m.r,
					c: v
				}, k, s), S.F = Vr(e[0]);
				break;
			case 427:
				if (!s.cellFormula) break;
				O[zr(e[0].s)] = e[1], S = s.dense ? c["!data"][_][v] : c[Pr(v) + x], S.f = Gd(e[1], u, {
					r: m.r,
					c: v
				}, k, s);
				break;
			case 60:
				if (!s.cellStyles) break;
				for (; e.e >= e.s;) j[e.e--] = {
					width: e.w / 256,
					hidden: !!(e.flags & 1),
					level: e.level
				}, N || (N = !0, _c = mc, Sc(e.w / 256)), Cc(j[e.e + 1]);
				break;
			case 551:
				e && (c["!legrel"] = e);
				break;
			case 161:
				c["!autofilter"] = { ref: Vr(e) };
				break;
			case 476:
				c["!margins"] = e;
				break;
			case 147:
				i.Sheets[n] || (i.Sheets[n] = {}), e.name && (i.Sheets[n].CodeName = e.name), (e.above || e.left) && (c["!outline"] = {
					above: e.above,
					left: e.left
				});
				break;
			case 137:
				i.Views || (i.Views = [{}]), i.Views[0] || (i.Views[0] = {}), e.RTL && (i.Views[0].RTL = !0);
				break;
			case 485: break;
			case 64:
			case 1053: break;
			case 151: break;
			case 152:
			case 175:
			case 644:
			case 625:
			case 562:
			case 396:
			case 1112:
			case 1146:
			case 471:
			case 1050:
			case 649:
			case 1105:
			case 589:
			case 607:
			case 564:
			case 1055:
			case 168:
			case 174:
			case 1180:
			case 499:
			case 507:
			case 550:
			case 171:
			case 167:
			case 1177:
			case 169:
			case 1181:
			case 552:
			case 661:
			case 639:
			case 478:
			case 537:
			case 477:
			case 536:
			case 1103:
			case 680:
			case 1104:
			case 1024:
			case 663:
			case 535:
			case 678:
			case 504:
			case 1043:
			case 428:
			case 170:
			case 3072:
			case 50:
			case 2070:
			case 1045: break;
			case 35:
				f = !0;
				break;
			case 36:
				f = !1;
				break;
			case 37:
				d.push(D), f = !0;
				break;
			case 38:
				d.pop(), f = !1;
				break;
			default: if (!t.T && (!f || s.WTF)) throw Error("Unexpected record 0x" + D.toString(16));
		}
	}, s), delete s.supbooks, delete s["!row"], !c["!ref"] && (u.s.r < 2e6 || l && (l.e.r > 0 || l.e.c > 0 || l.s.r > 0 || l.s.c > 0)) && (c["!ref"] = Vr(l || u)), s.sheetRows && c["!ref"]) {
		var L = Ur(c["!ref"]);
		s.sheetRows <= +L.e.r && (L.e.r = s.sheetRows - 1, L.e.r > u.e.r && (L.e.r = u.e.r), L.e.r < L.s.r && (L.s.r = L.e.r), L.e.c > u.e.c && (L.e.c = u.e.c), L.e.c < L.s.c && (L.s.c = L.e.c), c["!fullref"] = c["!ref"], c["!ref"] = Vr(L));
	}
	return C.length > 0 && (c["!merges"] = C), j.length > 0 && (c["!cols"] = j), M.length > 0 && (c["!rows"] = M), r["!id"][c["!legrel"]] && (c["!legdrawel"] = r["!id"][c["!legrel"]]), c;
}
function gp(e) {
	var t = [], n = e.match(/^<c:numCache>/), r;
	(e.match(/<c:pt idx="(\d*)"[^<>\/]*><c:v>([^<]*)<\/c:v><\/c:pt>/gm) || []).forEach(function(e) {
		var r = e.match(/<c:pt idx="(\d*)"[^<>\/]*><c:v>([^<]*)<\/c:v><\/c:pt>/);
		r && (t[+r[1]] = n ? +r[2] : r[2]);
	});
	var i = mn((Bt(e, "c:formatCode") || ["", "General"])[1]);
	return (Lt(e, "<c:f>", "</c:f>") || []).forEach(function(e) {
		r = e.replace(/<[^<>]*>/g, "");
	}), [
		t,
		i,
		r
	];
}
function _p(e) {
	var t = Lt(e, "<c:numCache>", "</c:numCache>");
	if (t && t.length) {
		var n = gp(t[0]);
		return {
			values: n[0],
			formatCode: n[1],
			formula: n[2]
		};
	}
	var r = Lt(e, "<c:strCache>", "</c:strCache>");
	if (r && r.length) {
		var i = gp(r[0]);
		return {
			values: i[0],
			formatCode: i[1],
			formula: i[2]
		};
	}
	var a = (Lt(e, "<c:f>", "</c:f>") || [])[0];
	return {
		values: [],
		formula: a ? a.replace(/<[^<>]*>/g, "") : void 0
	};
}
function vp(e) {
	var t = Lt(e, "<c:tx>", "</c:tx>");
	if (!t || !t.length) return "";
	var n = Vt(t[0], "v");
	if (n && n[1]) return mn(n[1]);
	var r = Vt(t[0], "f");
	return r && r[1] ? mn(r[1]) : "";
}
function yp(e) {
	var t = { name: vp(e) }, n = Vt(e, "idx");
	n && (t.idx = +(X(n[0]).val || 0));
	var r = Vt(e, "order");
	return r && (t.order = +(X(r[0]).val || 0)), [
		"cat",
		"val",
		"xVal",
		"yVal",
		"bubbleSize"
	].forEach(function(n) {
		var r = Vt(e, n);
		r && (t[n] = _p(r[0]));
	}), t.val && t.val.values ? t.data = t.val.values : t.yVal && t.yVal.values && (t.data = t.yVal.values), t;
}
function bp(e) {
	var t = Vt(e, "title");
	if (!t) return "";
	var n = [];
	return (t[0].match(/<a:t\b[^>]*>[\s\S]*?<\/a:t>/g) || []).forEach(function(e) {
		n.push(mn(e.replace(/<[^>]*>/g, "")));
	}), n.join("");
}
function xp(e, t, n) {
	var r = {
		target: t,
		raw: e,
		rels: n,
		series: []
	};
	r.title = bp(e);
	var i = Vt(e, "plotArea"), a = i ? i[1] : e;
	[
		"barChart",
		"lineChart",
		"areaChart",
		"scatterChart",
		"pieChart",
		"doughnutChart",
		"bubbleChart"
	].forEach(function(e) {
		(Lt(a, "<c:" + e + ">", "</c:" + e + ">") || []).forEach(function(t) {
			r.type || (r.type = e);
			var n = Vt(t, "grouping");
			n && (r.grouping = X(n[0]).val), (Lt(t, "<c:ser>", "</c:ser>") || []).forEach(function(t) {
				var n = yp(t);
				n.chartType = e, r.series.push(n);
			});
		});
	});
	var o = Vt(e, "legend");
	if (o) {
		r.legend = {};
		var s = Vt(o[0], "legendPos");
		s && (r.legend.position = X(s[0]).val);
	}
	return r;
}
function Sp(e, t, n, r, i, a) {
	var o = a || { "!type": "chart" };
	if (!e) return a;
	o["!chart"] = xp(e, t, r);
	var s = 0, c = 0, l = "A", u = {
		s: {
			r: 2e6,
			c: 2e6
		},
		e: {
			r: 0,
			c: 0
		}
	};
	return (Lt(e, "<c:numCache>", "</c:numCache>") || []).forEach(function(e) {
		var t = gp(e);
		u.s.r = u.s.c = 0, u.e.c = s, l = Pr(s), t[0].forEach(function(e, n) {
			o["!data"] ? (o["!data"][n] || (o["!data"][n] = []), o["!data"][n][s] = {
				t: "n",
				v: e,
				z: t[1]
			}) : o[l + Ar(n)] = {
				t: "n",
				v: e,
				z: t[1]
			}, c = n;
		}), u.e.r < c && (u.e.r = c), ++s;
	}), s > 0 && (o["!ref"] = Vr(u)), o;
}
function Cp(e, t, n, r, i) {
	if (!e) return e;
	r || (r = { "!id": {} });
	var a = {
		"!type": "chart",
		"!drawel": null,
		"!rel": ""
	}, o, s = e.match(Tf);
	return s && Df(s[0], a, i, n), (o = e.match(/drawing r:id="(.*?)"/)) && (a["!rel"] = o[1]), r["!id"][a["!rel"]] && (a["!drawel"] = r["!id"][a["!rel"]]), a;
}
function wp(e, t) {
	return e.l += 10, { name: Zr(e, t - 10) };
}
function Tp(e, t, n, r, i) {
	if (!e) return e;
	r || (r = { "!id": {} });
	var a = {
		"!type": "chart",
		"!drawel": null,
		"!rel": ""
	}, o = [], s = !1;
	return Cr(e, function(e, r, c) {
		switch (c) {
			case 550:
				a["!rel"] = e;
				break;
			case 651:
				i.Sheets[n] || (i.Sheets[n] = {}), e.name && (i.Sheets[n].CodeName = e.name);
				break;
			case 562:
			case 652:
			case 669:
			case 679:
			case 551:
			case 552:
			case 476:
			case 3072: break;
			case 35:
				s = !0;
				break;
			case 36:
				s = !1;
				break;
			case 37:
				o.push(c);
				break;
			case 38:
				o.pop();
				break;
			default: if (r.T > 0) o.push(c);
			else if (r.T < 0) o.pop();
			else if (!s || t.WTF) throw Error("Unexpected record 0x" + c.toString(16));
		}
	}, t), r["!id"][a["!rel"]] && (a["!drawel"] = r["!id"][a["!rel"]]), a;
}
var Ep = [
	[
		"allowRefreshQuery",
		!1,
		"bool"
	],
	[
		"autoCompressPictures",
		!0,
		"bool"
	],
	[
		"backupFile",
		!1,
		"bool"
	],
	[
		"checkCompatibility",
		!1,
		"bool"
	],
	["CodeName", ""],
	[
		"date1904",
		!1,
		"bool"
	],
	[
		"defaultThemeVersion",
		0,
		"int"
	],
	[
		"filterPrivacy",
		!1,
		"bool"
	],
	[
		"hidePivotFieldList",
		!1,
		"bool"
	],
	[
		"promptedSolutions",
		!1,
		"bool"
	],
	[
		"publishItems",
		!1,
		"bool"
	],
	[
		"refreshAllConnections",
		!1,
		"bool"
	],
	[
		"saveExternalLinkValues",
		!0,
		"bool"
	],
	[
		"showBorderUnselectedTables",
		!0,
		"bool"
	],
	[
		"showInkAnnotation",
		!0,
		"bool"
	],
	["showObjects", "all"],
	[
		"showPivotChartFilter",
		!1,
		"bool"
	],
	["updateLinks", "userSet"]
], Dp = [
	[
		"activeTab",
		0,
		"int"
	],
	[
		"autoFilterDateGrouping",
		!0,
		"bool"
	],
	[
		"firstSheet",
		0,
		"int"
	],
	[
		"minimized",
		!1,
		"bool"
	],
	[
		"showHorizontalScroll",
		!0,
		"bool"
	],
	[
		"showSheetTabs",
		!0,
		"bool"
	],
	[
		"showVerticalScroll",
		!0,
		"bool"
	],
	[
		"tabRatio",
		600,
		"int"
	],
	["visibility", "visible"]
], Op = [], kp = [
	["calcCompleted", "true"],
	["calcMode", "auto"],
	["calcOnSave", "true"],
	["concurrentCalc", "true"],
	["fullCalcOnLoad", "false"],
	["fullPrecision", "true"],
	["iterate", "false"],
	["iterateCount", "100"],
	["iterateDelta", "0.001"],
	["refMode", "A1"]
];
function Ap(e, t) {
	for (var n = 0; n != e.length; ++n) for (var r = e[n], i = 0; i != t.length; ++i) {
		var a = t[i];
		if (r[a[0]] == null) r[a[0]] = a[1];
		else switch (a[2]) {
			case "bool":
				typeof r[a[0]] == "string" && (r[a[0]] = Z(r[a[0]]));
				break;
			case "int":
				typeof r[a[0]] == "string" && (r[a[0]] = parseInt(r[a[0]], 10));
				break;
		}
	}
}
function jp(e, t) {
	for (var n = 0; n != t.length; ++n) {
		var r = t[n];
		if (e[r[0]] == null) e[r[0]] = r[1];
		else switch (r[2]) {
			case "bool":
				typeof e[r[0]] == "string" && (e[r[0]] = Z(e[r[0]]));
				break;
			case "int":
				typeof e[r[0]] == "string" && (e[r[0]] = parseInt(e[r[0]], 10));
				break;
		}
	}
}
function Mp(e) {
	jp(e.WBProps, Ep), jp(e.CalcPr, kp), Ap(e.WBView, Dp), Ap(e.Sheets, Op), uf.date1904 = Z(e.WBProps.date1904);
}
var Np = /*#__PURE__*/ ":][*?/\\".split("");
function Pp(e, t) {
	try {
		if (e == "") throw Error("Sheet name cannot be blank");
		if (e.length > 31) throw Error("Sheet name cannot exceed 31 chars");
		if (e.charCodeAt(0) == 39 || e.charCodeAt(e.length - 1) == 39) throw Error("Sheet name cannot start or end with apostrophe (')");
		if (e.toLowerCase() == "history") throw Error("Sheet name cannot be 'History'");
		Np.forEach(function(t) {
			if (e.indexOf(t) != -1) throw Error("Sheet name cannot contain : \\ / ? * [ ]");
		});
	} catch (e) {
		if (t) return !1;
		throw e;
	}
	return !0;
}
var Fp = /<\w+:workbook/;
function Ip(e, t) {
	if (!e) throw Error("Could not find file");
	var n = {
		AppVersion: {},
		WBProps: {},
		WBView: [],
		Sheets: [],
		CalcPr: {},
		Names: [],
		xmlns: ""
	}, r = !1, i = "xmlns", a = {}, o = 0;
	if (e.replace(sn, function(s, c) {
		var l = X(s);
		switch (dn(l[0])) {
			case "<?xml": break;
			case "<workbook":
				s.match(Fp) && (i = "xmlns" + s.match(/<(\w+):/)[1]), n.xmlns = l[i];
				break;
			case "</workbook>": break;
			case "<fileVersion":
				delete l[0], n.AppVersion = l;
				break;
			case "<fileVersion/>":
			case "</fileVersion>": break;
			case "<fileSharing": break;
			case "<fileSharing/>": break;
			case "<workbookPr":
			case "<workbookPr/>":
				Ep.forEach(function(e) {
					if (l[e[0]] != null) switch (e[2]) {
						case "bool":
							n.WBProps[e[0]] = Z(l[e[0]]);
							break;
						case "int":
							n.WBProps[e[0]] = parseInt(l[e[0]], 10);
							break;
						default: n.WBProps[e[0]] = l[e[0]];
					}
				}), l.codeName && (n.WBProps.CodeName = Tn(l.codeName));
				break;
			case "</workbookPr>": break;
			case "<workbookProtection": break;
			case "<workbookProtection/>": break;
			case "<bookViews":
			case "<bookViews>":
			case "</bookViews>": break;
			case "<workbookView":
			case "<workbookView/>":
				delete l[0], n.WBView.push(l);
				break;
			case "</workbookView>": break;
			case "<sheets":
			case "<sheets>":
			case "</sheets>": break;
			case "<sheet":
				switch (l.state) {
					case "hidden":
						l.Hidden = 1;
						break;
					case "veryHidden":
						l.Hidden = 2;
						break;
					default: l.Hidden = 0;
				}
				delete l.state, l.name = mn(Tn(l.name)), delete l[0], n.Sheets.push(l);
				break;
			case "</sheet>": break;
			case "<functionGroups":
			case "<functionGroups/>": break;
			case "<functionGroup": break;
			case "<externalReferences":
			case "</externalReferences>":
			case "<externalReferences>": break;
			case "<externalReference": break;
			case "<definedNames/>": break;
			case "<definedNames>":
			case "<definedNames":
				r = !0;
				break;
			case "</definedNames>":
				r = !1;
				break;
			case "<definedName":
				a = {}, a.Name = Tn(l.name), l.comment && (a.Comment = l.comment), l.localSheetId && (a.Sheet = +l.localSheetId), Z(l.hidden || "0") && (a.Hidden = !0), o = c + s.length;
				break;
			case "</definedName>":
				a.Ref = mn(Tn(e.slice(o, c))), n.Names.push(a);
				break;
			case "<definedName/>": break;
			case "<calcPr":
				delete l[0], n.CalcPr = l;
				break;
			case "<calcPr/>":
				delete l[0], n.CalcPr = l;
				break;
			case "</calcPr>": break;
			case "<oleSize": break;
			case "<customWorkbookViews>":
			case "</customWorkbookViews>":
			case "<customWorkbookViews": break;
			case "<customWorkbookView":
			case "</customWorkbookView>": break;
			case "<pivotCaches>":
			case "</pivotCaches>":
			case "<pivotCaches": break;
			case "<pivotCache": break;
			case "<smartTagPr":
			case "<smartTagPr/>": break;
			case "<smartTagTypes":
			case "<smartTagTypes>":
			case "</smartTagTypes>": break;
			case "<smartTagType": break;
			case "<webPublishing":
			case "<webPublishing/>": break;
			case "<fileRecoveryPr":
			case "<fileRecoveryPr/>": break;
			case "<webPublishObjects>":
			case "<webPublishObjects":
			case "</webPublishObjects>": break;
			case "<webPublishObject": break;
			case "<extLst":
			case "<extLst>":
			case "</extLst>":
			case "<extLst/>": break;
			case "<ext":
				r = !0;
				break;
			case "</ext>":
				r = !1;
				break;
			case "<ArchID": break;
			case "<AlternateContent":
			case "<AlternateContent>":
				r = !0;
				break;
			case "</AlternateContent>":
				r = !1;
				break;
			case "<revisionPtr": break;
			default: if (!r && t.WTF) throw Error("unrecognized " + l[0] + " in workbook");
		}
		return s;
	}), Ln.indexOf(n.xmlns) === -1) throw Error("Unknown Namespace: " + n.xmlns);
	return Mp(n), n;
}
function Lp(e, t) {
	var n = {};
	return n.Hidden = e.read_shift(4), n.iTabID = e.read_shift(4), n.strRelID = oi(e, t - 8), n.name = Zr(e), n;
}
function Rp(e, t) {
	var n = {}, r = e.read_shift(4);
	n.defaultThemeVersion = e.read_shift(4);
	var i = t > 8 ? Zr(e) : "";
	return i.length > 0 && (n.CodeName = i), n.autoCompressPictures = !!(r & 65536), n.backupFile = !!(r & 64), n.checkCompatibility = !!(r & 4096), n.date1904 = !!(r & 1), n.filterPrivacy = !!(r & 8), n.hidePivotFieldList = !!(r & 1024), n.promptedSolutions = !!(r & 16), n.publishItems = !!(r & 2048), n.refreshAllConnections = !!(r & 262144), n.saveExternalLinkValues = !!(r & 128), n.showBorderUnselectedTables = !!(r & 4), n.showInkAnnotation = !!(r & 32), n.showObjects = [
		"all",
		"placeholders",
		"none"
	][r >> 13 & 3], n.showPivotChartFilter = !!(r & 32768), n.updateLinks = [
		"userSet",
		"never",
		"always"
	][r >> 8 & 3], n;
}
function zp(e, t) {
	var n = {};
	return e.read_shift(4), n.ArchID = e.read_shift(4), e.l += t - 8, n;
}
function Bp(e, t, n) {
	var r = e.l + t, i = e.read_shift(4);
	e.l += 1;
	var a = e.read_shift(4), o = ai(e), s, c = "";
	try {
		s = tf(e, 0, n);
		try {
			c = ii(e);
		} catch {}
	} catch {
		console.error("Could not parse defined name " + o);
	}
	i & 32 && (o = "_xlnm." + o), e.l = r;
	var l = {
		Name: o,
		Ptg: s,
		Flags: i
	};
	return a < 268435455 && (l.Sheet = a), c && (l.Comment = c), l;
}
function Vp(e, t) {
	var n = {
		AppVersion: {},
		WBProps: {},
		WBView: [],
		Sheets: [],
		CalcPr: {},
		xmlns: ""
	}, r = [], i = !1;
	t || (t = {}), t.biff = 12;
	var a = [], o = [[]];
	return o.SheetNames = [], o.XTI = [], Bm[16] = {
		n: "BrtFRTArchID$",
		f: zp
	}, Cr(e, function(e, s, c) {
		switch (c) {
			case 156:
				o.SheetNames.push(e.name), n.Sheets.push(e);
				break;
			case 153:
				n.WBProps = e;
				break;
			case 39:
				e.Sheet != null && (t.SID = e.Sheet), e.Ref = e.Ptg ? Gd(e.Ptg, null, null, o, t) : "#REF!", delete t.SID, delete e.Ptg, a.push(e);
				break;
			case 1036: break;
			case 357:
			case 358:
			case 355:
			case 667:
				o[0].length ? o.push([c, e]) : o[0] = [c, e], o[o.length - 1].XTI = [];
				break;
			case 362:
				o.length === 0 && (o[0] = [], o[0].XTI = []), o[o.length - 1].XTI = o[o.length - 1].XTI.concat(e), o.XTI = o.XTI.concat(e);
				break;
			case 361: break;
			case 2071:
			case 158:
			case 143:
			case 664:
			case 353: break;
			case 3072:
			case 3073:
			case 534:
			case 677:
			case 157:
			case 610:
			case 2050:
			case 155:
			case 548:
			case 676:
			case 128:
			case 665:
			case 2128:
			case 2125:
			case 549:
			case 2053:
			case 596:
			case 2076:
			case 2075:
			case 2082:
			case 397:
			case 154:
			case 1117:
			case 553:
			case 2091: break;
			case 35:
				r.push(c), i = !0;
				break;
			case 36:
				r.pop(), i = !1;
				break;
			case 37:
				r.push(c), i = !0;
				break;
			case 38:
				r.pop(), i = !1;
				break;
			case 16: break;
			default: if (!s.T && (!i || t.WTF && r[r.length - 1] != 37 && r[r.length - 1] != 35)) throw Error("Unexpected record 0x" + c.toString(16));
		}
	}, t), Mp(n), n.Names = a, n.supbooks = o, n;
}
function Hp(e, t, n) {
	return t.slice(-4) === ".bin" ? Vp(e, n) : Ip(e, n);
}
function Up(e, t, n, r, i, a, o, s) {
	return t.slice(-4) === ".bin" ? hp(e, r, n, i, a, o, s) : Ef(e, r, n, i, a, o, s);
}
function Wp(e, t, n, r, i, a, o, s) {
	return t.slice(-4) === ".bin" ? Tp(e, r, n, i, a, o, s) : Cp(e, r, n, i, a, o, s);
}
function Gp(e, t, n, r, i, a, o, s) {
	return t.slice(-4) === ".bin" ? cu(e, r, n, i, a, o, s) : lu(e, r, n, i, a, o, s);
}
function Kp(e, t, n, r, i, a, o, s) {
	return t.slice(-4) === ".bin" ? ou(e, r, n, i, a, o, s) : su(e, r, n, i, a, o, s);
}
function qp(e, t, n, r) {
	return t.slice(-4) === ".bin" ? pl(e, n, r) : sl(e, n, r);
}
function Jp(e, t, n) {
	return t.slice(-4) === ".bin" ? Ns(e, n) : js(e, n);
}
function Yp(e, t, n) {
	return t.slice(-4) === ".bin" ? ru(e, n) : Ql(e, n);
}
function Xp(e, t, n) {
	return t.slice(-4) === ".bin" ? Pl(e, t, n) : Ml(e, t, n);
}
function Zp(e, t, n, r) {
	if (n.slice(-4) === ".bin") return Fl(e, t, n, r);
}
function Qp(e, t, n) {
	return t.slice(-4) === ".bin" ? Al(e, t, n) : jl(e, t, n);
}
var $p = /\b((?:\w+:)?[\w]+)=((?:")([^"]*)(?:")|(?:')([^']*)(?:'))/g, em = /\b((?:\w+:)?[\w]+)=((?:")(?:[^"]*)(?:")|(?:')(?:[^']*)(?:'))/;
function tm(e, t) {
	var n = e.split(/\s+/), r = [];
	if (t || (r[0] = n[0]), n.length === 1) return r;
	var i = e.match($p), a, o, s, c;
	if (i) for (c = 0; c != i.length; ++c) a = i[c].match(em), (o = a[1].indexOf(":")) === -1 ? r[a[1]] = a[2].slice(1, a[2].length - 1) : (s = a[1].slice(0, 6) === "xmlns:" ? "xmlns" + a[1].slice(6) : a[1].slice(o + 1), r[s] = a[2].slice(1, a[2].length - 1));
	return r;
}
function nm(e) {
	var t = e.split(/\s+/), n = {};
	if (t.length === 1) return n;
	var r = e.match($p), i, a, o, s;
	if (r) for (s = 0; s != r.length; ++s) i = r[s].match(em), (a = i[1].indexOf(":")) === -1 ? n[i[1]] = i[2].slice(1, i[2].length - 1) : (o = i[1].slice(0, 6) === "xmlns:" ? "xmlns" + i[1].slice(6) : i[1].slice(a + 1), n[o] = i[2].slice(1, i[2].length - 1));
	return n;
}
var rm;
function im(e, t, n) {
	var r = rm[e] || mn(e);
	return r === "General" ? ye(t) : Xe(r, t, { date1904: !!n });
}
function am(e, t, n, r) {
	var i = r;
	switch ((n[0].match(/dt:dt="([\w.]+)"/) || ["", ""])[1]) {
		case "boolean":
			i = Z(r);
			break;
		case "i2":
		case "int":
			i = parseInt(r, 10);
			break;
		case "r4":
		case "float":
			i = parseFloat(r);
			break;
		case "date":
		case "dateTime.tz":
			i = bt(r);
			break;
		case "i8":
		case "string":
		case "fixed":
		case "uuid":
		case "bin.base64": break;
		default: throw Error("bad custprop:" + n[0]);
	}
	e[mn(t)] = i;
}
function om(e, t, n, r) {
	if (e.t !== "z") {
		if (!n || n.cellText !== !1) try {
			e.t === "e" ? e.w = e.w || Fi[e.v] : t === "General" ? e.t === "n" ? (e.v | 0) === e.v ? e.w = e.v.toString(10) : e.w = ve(e.v) : e.w = ye(e.v) : e.w = im(t || "General", e.v, r);
		} catch (e) {
			if (n.WTF) throw e;
		}
		try {
			var i = rm[t] || t || "General";
			if (n.cellNF && (e.z = i), n.cellDates && e.t == "n" && Ge(i)) {
				var a = pe(e.v + (r ? 1462 : 0));
				a && (e.t = "d", e.v = new Date(Date.UTC(a.y, a.m - 1, a.d, a.H, a.M, a.S, a.u)));
			}
		} catch (e) {
			if (n.WTF) throw e;
		}
	}
}
function sm(e, t, n) {
	if (n.cellStyles && t.Interior) {
		var r = t.Interior;
		r.Pattern && (r.patternType = Jc[r.Pattern] || r.Pattern);
	}
	e[t.ID] = t;
}
function cm(e, t, n, r, i, a, o, s, c, l, u) {
	var d = "General", f = r.StyleID, p = {};
	l = l || {};
	var m = [], h = 0;
	for (f === void 0 && s && (f = s.StyleID), f === void 0 && o && (f = o.StyleID); a[f] !== void 0;) {
		var g = a[f];
		if (g.nf && (d = g.nf), g.Interior && m.push(g.Interior), !g.Parent) break;
		f = g.Parent;
	}
	switch (n.Type) {
		case "Boolean":
			r.t = "b", r.v = Z(e);
			break;
		case "String":
			r.t = "s", r.r = bn(mn(e)), r.v = e.indexOf("<") > -1 ? mn(t || e).replace(/<[^<>]*>/g, "") : r.r;
			break;
		case "DateTime": e.slice(-1) != "Z" && (e += "Z"), r.v = mt(bt(e, u), u), r.v !== r.v && (r.v = mn(e)), (!d || d == "General") && (d = "yyyy-mm-dd");
		case "Number":
			r.v === void 0 && (r.v = +e), r.t || (r.t = "n");
			break;
		case "Error":
			r.t = "e", r.v = Ii[e], l.cellText !== !1 && (r.w = e);
			break;
		default:
			e == "" && t == "" ? r.t = "z" : (r.t = "s", r.v = bn(t || e));
			break;
	}
	if (om(r, d, l, u), l.cellFormula !== !1) if (r.Formula) {
		var _ = mn(r.Formula);
		_.charCodeAt(0) == 61 && (_ = _.slice(1)), r.f = uu(_, i), delete r.Formula, r.ArrayRange == "RC" ? r.F = uu("RC:RC", i) : r.ArrayRange && (r.F = uu(r.ArrayRange, i), c.push([Ur(r.F), r.F]));
	} else for (h = 0; h < c.length; ++h) i.r >= c[h][0].s.r && i.r <= c[h][0].e.r && i.c >= c[h][0].s.c && i.c <= c[h][0].e.c && (r.F = c[h][1]);
	l.cellStyles && (m.forEach(function(e) {
		!p.patternType && e.patternType && (p.patternType = e.patternType);
	}), r.s = p), r.StyleID !== void 0 && (r.ixfe = r.StyleID);
}
function lm(e) {
	return Li.indexOf("_xlnm." + e) > -1 ? "_xlnm." + e : e;
}
function um(e) {
	e.t = e.v || "", e.t = e.t.replace(/\r\n/g, "\n").replace(/\r/g, "\n"), e.v = e.w = e.ixfe = void 0;
}
function dm(e, t) {
	var n = t || {};
	Qe();
	var r = w(Pn(e));
	(n.type == "binary" || n.type == "array" || n.type == "base64") && (r = p === void 0 ? Tn(r) : p.utils.decode(65001, b(r)));
	var i = r.slice(0, 1024).toLowerCase(), a = !1;
	if (i = i.replace(/".*?"/g, ""), (i.indexOf(">") & 1023) > Math.min(i.indexOf(",") & 1023, i.indexOf(";") & 1023)) {
		var o = St(n);
		return o.type = "string", ys.to_workbook(r, o);
	}
	if (i.indexOf("<?xml") == -1 && [
		"html",
		"table",
		"head",
		"meta",
		"script",
		"style",
		"div"
	].forEach(function(e) {
		i.indexOf("<" + e) >= 0 && (a = !0);
	}), a) return rh(r, n);
	rm = {
		"General Number": "General",
		"General Date": J[22],
		"Long Date": "dddd, mmmm dd, yyyy",
		"Medium Date": J[15],
		"Short Date": J[14],
		"Long Time": J[19],
		"Medium Time": J[18],
		"Short Time": J[20],
		Currency: "\"$\"#,##0.00_);[Red]\\(\"$\"#,##0.00\\)",
		Fixed: J[2],
		Standard: J[4],
		Percent: J[10],
		Scientific: J[11],
		"Yes/No": "\"Yes\";\"Yes\";\"No\";@",
		"True/False": "\"True\";\"True\";\"False\";@",
		"On/Off": "\"Yes\";\"Yes\";\"No\";@"
	};
	var s, c = [], l;
	D != null && n.dense == null && (n.dense = D);
	var u = {}, d = [], f = {}, m = "";
	n.dense && (f["!data"] = []);
	var h = {}, g = {}, _ = tm("<Data ss:Type=\"String\">"), v = 0, y = 0, x = 0, S = {
		s: {
			r: 2e6,
			c: 2e6
		},
		e: {
			r: 0,
			c: 0
		}
	}, C = {}, T = {}, E = "", O = 0, k = [], A = {}, j = {}, M = 0, N = [], P = [], F = {}, I = [], L, R = !1, z = [], B = [], V = {}, H = 0, U = 0, W = {
		Sheets: [],
		WBProps: { date1904: !1 }
	}, ee = {};
	Fn.lastIndex = 0, r = Rt(r, "<!--", "-->");
	for (var te = ""; s = Fn.exec(r);) switch (s[3] = (te = s[3]).toLowerCase()) {
		case "data":
			if (te == "data") {
				if (s[1] === "/") {
					if ((l = c.pop())[0] !== s[3]) throw Error("Bad state: " + l.join("|"));
				} else s[0].charAt(s[0].length - 2) !== "/" && c.push([s[3], !0]);
				break;
			}
			if (c[c.length - 1][1]) break;
			s[1] === "/" ? cm(r.slice(v, s.index), E, _, c[c.length - 1][0] == "comment" ? F : h, {
				c: y,
				r: x
			}, C, I[y], g, z, n, W.WBProps.date1904) : (E = "", _ = tm(s[0]), v = s.index + s[0].length);
			break;
		case "cell":
			if (s[1] === "/") if (P.length > 0 && (h.c = P), (!n.sheetRows || n.sheetRows > x) && h.v !== void 0 && (n.dense ? (f["!data"][x] || (f["!data"][x] = []), f["!data"][x][y] = h) : f[Pr(y) + Ar(x)] = h), h.HRef && (h.l = { Target: mn(h.HRef) }, h.HRefScreenTip && (h.l.Tooltip = h.HRefScreenTip), delete h.HRef, delete h.HRefScreenTip), (h.MergeAcross || h.MergeDown) && (H = y + (parseInt(h.MergeAcross, 10) | 0), U = x + (parseInt(h.MergeDown, 10) | 0), (H > y || U > x) && k.push({
				s: {
					c: y,
					r: x
				},
				e: {
					c: H,
					r: U
				}
			})), !n.sheetStubs) h.MergeAcross ? y = H + 1 : ++y;
			else if (h.MergeAcross || h.MergeDown) {
				for (var ne = y; ne <= H; ++ne) for (var re = x; re <= U; ++re) (ne > y || re > x) && (n.dense ? (f["!data"][re] || (f["!data"][re] = []), f["!data"][re][ne] = { t: "z" }) : f[Pr(ne) + Ar(re)] = { t: "z" });
				y = H + 1;
			} else ++y;
			else h = nm(s[0]), h.Index && (y = h.Index - 1), y < S.s.c && (S.s.c = y), y > S.e.c && (S.e.c = y), s[0].slice(-2) === "/>" && ++y, P = [];
			break;
		case "row":
			s[1] === "/" || s[0].slice(-2) === "/>" ? (x < S.s.r && (S.s.r = x), x > S.e.r && (S.e.r = x), s[0].slice(-2) === "/>" && (g = tm(s[0]), g.Index && (x = g.Index - 1)), y = 0, ++x) : (g = tm(s[0]), g.Index && (x = g.Index - 1), V = {}, (g.AutoFitHeight == "0" || g.Height) && (V.hpx = parseInt(g.Height, 10), V.hpt = Wc(V.hpx), B[x] = V), g.Hidden == "1" && (V.hidden = !0, B[x] = V));
			break;
		case "worksheet":
			if (s[1] === "/") {
				if ((l = c.pop())[0] !== s[3]) throw Error("Bad state: " + l.join("|"));
				d.push(m), S.s.r <= S.e.r && S.s.c <= S.e.c && (f["!ref"] = Vr(S), n.sheetRows && n.sheetRows <= S.e.r && (f["!fullref"] = f["!ref"], S.e.r = n.sheetRows - 1, f["!ref"] = Vr(S))), k.length && (f["!merges"] = k), I.length > 0 && (f["!cols"] = I), B.length > 0 && (f["!rows"] = B), u[m] = f;
			} else S = {
				s: {
					r: 2e6,
					c: 2e6
				},
				e: {
					r: 0,
					c: 0
				}
			}, x = y = 0, c.push([s[3], !1]), l = tm(s[0]), m = mn(l.Name), f = {}, n.dense && (f["!data"] = []), k = [], z = [], B = [], ee = {
				name: m,
				Hidden: 0
			}, W.Sheets.push(ee);
			break;
		case "table":
			if (s[1] === "/") {
				if ((l = c.pop())[0] !== s[3]) throw Error("Bad state: " + l.join("|"));
			} else if (s[0].slice(-2) == "/>") break;
			else c.push([s[3], !1]), I = [], R = !1;
			break;
		case "style":
			s[1] === "/" ? sm(C, T, n) : T = tm(s[0]);
			break;
		case "numberformat":
			T.nf = mn(tm(s[0]).Format || "General"), rm[T.nf] && (T.nf = rm[T.nf]);
			for (var G = 0; G != 392 && J[G] != T.nf; ++G);
			if (G == 392) {
				for (G = 57; G != 392; ++G) if (J[G] == null) {
					it(T.nf, G);
					break;
				}
			}
			break;
		case "column":
			if (c[c.length - 1][0] !== "table" || s[1] === "/") break;
			if (L = tm(s[0]), L.Hidden && (L.hidden = !0, delete L.Hidden), L.Width && (L.wpx = parseInt(L.Width, 10)), !R && L.wpx > 10) {
				R = !0, _c = mc;
				for (var ie = 0; ie < I.length; ++ie) I[ie] && Cc(I[ie]);
			}
			R && Cc(L), I[L.Index - 1 || I.length] = L;
			for (var ae = 0; ae < +L.Span; ++ae) I[I.length] = St(L);
			break;
		case "namedrange":
			if (s[1] === "/") break;
			W.Names || (W.Names = []);
			var K = X(s[0]), oe = {
				Name: lm(K.Name),
				Ref: uu(K.RefersTo.slice(1), {
					r: 0,
					c: 0
				})
			};
			W.Sheets.length > 0 && (oe.Sheet = W.Sheets.length - 1), W.Names.push(oe);
			break;
		case "namedcell": break;
		case "b": break;
		case "i": break;
		case "u": break;
		case "s": break;
		case "em": break;
		case "h2": break;
		case "h3": break;
		case "sub": break;
		case "sup": break;
		case "span": break;
		case "alignment": break;
		case "borders": break;
		case "border": break;
		case "font":
			if (s[0].slice(-2) === "/>") break;
			s[1] === "/" ? E += r.slice(O, s.index) : O = s.index + s[0].length;
			break;
		case "interior":
			if (!n.cellStyles) break;
			T.Interior = tm(s[0]);
			break;
		case "protection": break;
		case "author":
		case "title":
		case "description":
		case "created":
		case "keywords":
		case "subject":
		case "category":
		case "company":
		case "lastauthor":
		case "lastsaved":
		case "lastprinted":
		case "version":
		case "revision":
		case "totaltime":
		case "hyperlinkbase":
		case "manager":
		case "contentstatus":
		case "identifier":
		case "language":
		case "appname":
			if (s[0].slice(-2) === "/>") break;
			s[1] === "/" ? ta(A, te, r.slice(M, s.index)) : M = s.index + s[0].length;
			break;
		case "paragraphs": break;
		case "styles":
		case "workbook":
			if (s[1] === "/") {
				if ((l = c.pop())[0] !== s[3]) throw Error("Bad state: " + l.join("|"));
			} else c.push([s[3], !1]);
			break;
		case "comment":
			if (s[1] === "/") {
				if ((l = c.pop())[0] !== s[3]) throw Error("Bad state: " + l.join("|"));
				um(F), P.push(F);
			} else c.push([s[3], !1]), l = tm(s[0]), Z(l.ShowAlways || "0") || (P.hidden = !0), F = { a: l.Author };
			break;
		case "autofilter":
			if (s[1] === "/") {
				if ((l = c.pop())[0] !== s[3]) throw Error("Bad state: " + l.join("|"));
			} else if (s[0].charAt(s[0].length - 2) !== "/") {
				var q = tm(s[0]);
				f["!autofilter"] = { ref: uu(q.Range).replace(/\$/g, "") }, c.push([s[3], !0]);
			}
			break;
		case "name": break;
		case "datavalidation":
			if (s[1] === "/") {
				if ((l = c.pop())[0] !== s[3]) throw Error("Bad state: " + l.join("|"));
			} else s[0].charAt(s[0].length - 2) !== "/" && c.push([s[3], !0]);
			break;
		case "pixelsperinch": break;
		case "componentoptions":
		case "documentproperties":
		case "customdocumentproperties":
		case "officedocumentsettings":
		case "pivottable":
		case "pivotcache":
		case "names":
		case "mapinfo":
		case "pagebreaks":
		case "querytable":
		case "sorting":
		case "schema":
		case "conditionalformatting":
		case "smarttagtype":
		case "smarttags":
		case "excelworkbook":
		case "workbookoptions":
		case "worksheetoptions":
			if (s[1] === "/") {
				if ((l = c.pop())[0] !== s[3]) throw Error("Bad state: " + l.join("|"));
			} else s[0].charAt(s[0].length - 2) !== "/" && c.push([s[3], !0]);
			break;
		case "null": break;
		default:
			if (c.length == 0 && s[3] == "document" || c.length == 0 && s[3] == "uof") return Sh(r, n);
			var se = !0;
			switch (c[c.length - 1][0]) {
				case "officedocumentsettings":
					switch (s[3]) {
						case "allowpng": break;
						case "removepersonalinformation": break;
						case "downloadcomponents": break;
						case "locationofcomponents": break;
						case "colors": break;
						case "color": break;
						case "index": break;
						case "rgb": break;
						case "targetscreensize": break;
						case "readonlyrecommended": break;
						default: se = !1;
					}
					break;
				case "componentoptions":
					switch (s[3]) {
						case "toolbar": break;
						case "hideofficelogo": break;
						case "spreadsheetautofit": break;
						case "label": break;
						case "caption": break;
						case "maxheight": break;
						case "maxwidth": break;
						case "nextsheetnumber": break;
						default: se = !1;
					}
					break;
				case "excelworkbook":
					switch (s[3]) {
						case "date1904":
							W.WBProps.date1904 = !0;
							break;
						case "hidehorizontalscrollbar": break;
						case "hideverticalscrollbar": break;
						case "hideworkbooktabs": break;
						case "windowheight": break;
						case "windowwidth": break;
						case "windowtopx": break;
						case "windowtopy": break;
						case "tabratio": break;
						case "protectstructure": break;
						case "protectwindow": break;
						case "protectwindows": break;
						case "activesheet": break;
						case "displayinknotes": break;
						case "firstvisiblesheet": break;
						case "supbook": break;
						case "sheetname": break;
						case "sheetindex": break;
						case "sheetindexfirst": break;
						case "sheetindexlast": break;
						case "dll": break;
						case "acceptlabelsinformulas": break;
						case "donotsavelinkvalues": break;
						case "iteration": break;
						case "maxiterations": break;
						case "maxchange": break;
						case "path": break;
						case "xct": break;
						case "count": break;
						case "selectedsheets": break;
						case "calculation": break;
						case "uncalced": break;
						case "startupprompt": break;
						case "crn": break;
						case "externname": break;
						case "formula": break;
						case "colfirst": break;
						case "collast": break;
						case "wantadvise": break;
						case "boolean": break;
						case "error": break;
						case "text": break;
						case "ole": break;
						case "noautorecover": break;
						case "publishobjects": break;
						case "donotcalculatebeforesave": break;
						case "number": break;
						case "refmoder1c1": break;
						case "embedsavesmarttags": break;
						default: se = !1;
					}
					break;
				case "workbookoptions":
					switch (s[3]) {
						case "owcversion": break;
						case "height": break;
						case "width": break;
						default: se = !1;
					}
					break;
				case "worksheetoptions":
					switch (s[3]) {
						case "visible":
							if (s[0].slice(-2) !== "/>") if (s[1] === "/") switch (r.slice(M, s.index)) {
								case "SheetHidden":
									ee.Hidden = 1;
									break;
								case "SheetVeryHidden":
									ee.Hidden = 2;
									break;
							}
							else M = s.index + s[0].length;
							break;
						case "header":
							f["!margins"] || df(f["!margins"] = {}, "xlml"), isNaN(+X(s[0]).Margin) || (f["!margins"].header = +X(s[0]).Margin);
							break;
						case "footer":
							f["!margins"] || df(f["!margins"] = {}, "xlml"), isNaN(+X(s[0]).Margin) || (f["!margins"].footer = +X(s[0]).Margin);
							break;
						case "pagemargins":
							var ce = X(s[0]);
							f["!margins"] || df(f["!margins"] = {}, "xlml"), isNaN(+ce.Top) || (f["!margins"].top = +ce.Top), isNaN(+ce.Left) || (f["!margins"].left = +ce.Left), isNaN(+ce.Right) || (f["!margins"].right = +ce.Right), isNaN(+ce.Bottom) || (f["!margins"].bottom = +ce.Bottom);
							break;
						case "displayrighttoleft":
							W.Views || (W.Views = []), W.Views[0] || (W.Views[0] = {}), W.Views[0].RTL = !0;
							break;
						case "freezepanes": break;
						case "frozennosplit": break;
						case "splithorizontal":
						case "splitvertical": break;
						case "donotdisplaygridlines": break;
						case "activerow": break;
						case "activecol": break;
						case "toprowbottompane": break;
						case "leftcolumnrightpane": break;
						case "unsynced": break;
						case "print": break;
						case "printerrors": break;
						case "panes": break;
						case "scale": break;
						case "pane": break;
						case "number": break;
						case "layout": break;
						case "pagesetup": break;
						case "selected": break;
						case "protectobjects": break;
						case "enableselection": break;
						case "protectscenarios": break;
						case "validprinterinfo": break;
						case "horizontalresolution": break;
						case "verticalresolution": break;
						case "numberofcopies": break;
						case "activepane": break;
						case "toprowvisible": break;
						case "leftcolumnvisible": break;
						case "fittopage": break;
						case "rangeselection": break;
						case "papersizeindex": break;
						case "pagelayoutzoom": break;
						case "pagebreakzoom": break;
						case "filteron": break;
						case "fitwidth": break;
						case "fitheight": break;
						case "commentslayout": break;
						case "zoom": break;
						case "lefttoright": break;
						case "gridlines": break;
						case "allowsort": break;
						case "allowfilter": break;
						case "allowinsertrows": break;
						case "allowdeleterows": break;
						case "allowinsertcols": break;
						case "allowdeletecols": break;
						case "allowinserthyperlinks": break;
						case "allowformatcells": break;
						case "allowsizecols": break;
						case "allowsizerows": break;
						case "nosummaryrowsbelowdetail":
							f["!outline"] || (f["!outline"] = {}), f["!outline"].above = !0;
							break;
						case "tabcolorindex": break;
						case "donotdisplayheadings": break;
						case "showpagelayoutzoom": break;
						case "nosummarycolumnsrightdetail":
							f["!outline"] || (f["!outline"] = {}), f["!outline"].left = !0;
							break;
						case "blackandwhite": break;
						case "donotdisplayzeros": break;
						case "displaypagebreak": break;
						case "rowcolheadings": break;
						case "donotdisplayoutline": break;
						case "noorientation": break;
						case "allowusepivottables": break;
						case "zeroheight": break;
						case "viewablerange": break;
						case "selection": break;
						case "protectcontents": break;
						default: se = !1;
					}
					break;
				case "pivottable":
				case "pivotcache":
					switch (s[3]) {
						case "immediateitemsondrop": break;
						case "showpagemultipleitemlabel": break;
						case "compactrowindent": break;
						case "location": break;
						case "pivotfield": break;
						case "orientation": break;
						case "layoutform": break;
						case "layoutsubtotallocation": break;
						case "layoutcompactrow": break;
						case "position": break;
						case "pivotitem": break;
						case "datatype": break;
						case "datafield": break;
						case "sourcename": break;
						case "parentfield": break;
						case "ptlineitems": break;
						case "ptlineitem": break;
						case "countofsameitems": break;
						case "item": break;
						case "itemtype": break;
						case "ptsource": break;
						case "cacheindex": break;
						case "consolidationreference": break;
						case "filename": break;
						case "reference": break;
						case "nocolumngrand": break;
						case "norowgrand": break;
						case "blanklineafteritems": break;
						case "hidden": break;
						case "subtotal": break;
						case "basefield": break;
						case "mapchilditems": break;
						case "function": break;
						case "refreshonfileopen": break;
						case "printsettitles": break;
						case "mergelabels": break;
						case "defaultversion": break;
						case "refreshname": break;
						case "refreshdate": break;
						case "refreshdatecopy": break;
						case "versionlastrefresh": break;
						case "versionlastupdate": break;
						case "versionupdateablemin": break;
						case "versionrefreshablemin": break;
						case "calculation": break;
						default: se = !1;
					}
					break;
				case "pagebreaks":
					switch (s[3]) {
						case "colbreaks": break;
						case "colbreak": break;
						case "rowbreaks": break;
						case "rowbreak": break;
						case "colstart": break;
						case "colend": break;
						case "rowend": break;
						default: se = !1;
					}
					break;
				case "autofilter":
					switch (s[3]) {
						case "autofiltercolumn": break;
						case "autofiltercondition": break;
						case "autofilterand": break;
						case "autofilteror": break;
						default: se = !1;
					}
					break;
				case "querytable":
					switch (s[3]) {
						case "id": break;
						case "autoformatfont": break;
						case "autoformatpattern": break;
						case "querysource": break;
						case "querytype": break;
						case "enableredirections": break;
						case "refreshedinxl9": break;
						case "urlstring": break;
						case "htmltables": break;
						case "connection": break;
						case "commandtext": break;
						case "refreshinfo": break;
						case "notitles": break;
						case "nextid": break;
						case "columninfo": break;
						case "overwritecells": break;
						case "donotpromptforfile": break;
						case "textwizardsettings": break;
						case "source": break;
						case "number": break;
						case "decimal": break;
						case "thousandseparator": break;
						case "trailingminusnumbers": break;
						case "formatsettings": break;
						case "fieldtype": break;
						case "delimiters": break;
						case "tab": break;
						case "comma": break;
						case "autoformatname": break;
						case "versionlastedit": break;
						case "versionlastrefresh": break;
						default: se = !1;
					}
					break;
				case "datavalidation":
					switch (s[3]) {
						case "range": break;
						case "type": break;
						case "min": break;
						case "max": break;
						case "sort": break;
						case "descending": break;
						case "order": break;
						case "casesensitive": break;
						case "value": break;
						case "errorstyle": break;
						case "errormessage": break;
						case "errortitle": break;
						case "inputmessage": break;
						case "inputtitle": break;
						case "combohide": break;
						case "inputhide": break;
						case "condition": break;
						case "qualifier": break;
						case "useblank": break;
						case "value1": break;
						case "value2": break;
						case "format": break;
						case "cellrangelist": break;
						default: se = !1;
					}
					break;
				case "sorting":
				case "conditionalformatting":
					switch (s[3]) {
						case "range": break;
						case "type": break;
						case "min": break;
						case "max": break;
						case "sort": break;
						case "descending": break;
						case "order": break;
						case "casesensitive": break;
						case "value": break;
						case "errorstyle": break;
						case "errormessage": break;
						case "errortitle": break;
						case "cellrangelist": break;
						case "inputmessage": break;
						case "inputtitle": break;
						case "combohide": break;
						case "inputhide": break;
						case "condition": break;
						case "qualifier": break;
						case "useblank": break;
						case "value1": break;
						case "value2": break;
						case "format": break;
						default: se = !1;
					}
					break;
				case "mapinfo":
				case "schema":
				case "data":
					switch (s[3]) {
						case "map": break;
						case "entry": break;
						case "range": break;
						case "xpath": break;
						case "field": break;
						case "xsdtype": break;
						case "filteron": break;
						case "aggregate": break;
						case "elementtype": break;
						case "attributetype": break;
						case "schema":
						case "element":
						case "complextype":
						case "datatype":
						case "all":
						case "attribute":
						case "extends": break;
						case "row": break;
						default: se = !1;
					}
					break;
				case "smarttags": break;
				default:
					se = !1;
					break;
			}
			if (se || s[3].match(/!\[CDATA/)) break;
			if (!c[c.length - 1][1]) throw "Unrecognized tag: " + s[3] + "|" + c.join("|");
			if (c[c.length - 1][0] === "customdocumentproperties") {
				if (s[0].slice(-2) === "/>") break;
				s[1] === "/" ? am(j, te, N, r.slice(M, s.index)) : (N = s, M = s.index + s[0].length);
				break;
			}
			if (n.WTF) throw "Unrecognized tag: " + s[3] + "|" + c.join("|");
	}
	var le = {};
	return !n.bookSheets && !n.bookProps && (le.Sheets = u), le.SheetNames = d, le.Workbook = W, le.SSF = St(J), le.Props = A, le.Custprops = j, le.bookType = "xlml", le;
}
function fm(e, t) {
	switch ($h(t = t || {}), t.type || "base64") {
		case "base64": return dm(M(e), t);
		case "binary":
		case "buffer":
		case "file": return dm(e, t);
		case "array": return dm(z(e), t);
	}
}
function pm(e) {
	var t = {}, n = e.content;
	if (n.l = 28, t.AnsiUserType = n.read_shift(0, "lpstr-ansi"), t.AnsiClipboardFormat = mi(n), n.length - n.l <= 4) return t;
	var r = n.read_shift(4);
	if (r == 0 || r > 40 || (n.l -= 4, t.Reserved1 = n.read_shift(0, "lpstr-ansi"), n.length - n.l <= 4) || (r = n.read_shift(4), r !== 1907505652) || (t.UnicodeClipboardFormat = hi(n), r = n.read_shift(4), r == 0 || r > 40)) return t;
	n.l -= 4, t.Reserved2 = n.read_shift(0, "lpwstr");
}
var mm = [
	60,
	1084,
	2066,
	2165,
	2175
];
function hm(e, t, n, r, i) {
	var a = r, o = [], s = n.slice(n.l, n.l + a);
	if (i && i.enc && i.enc.insitu && s.length > 0) switch (e) {
		case 9:
		case 521:
		case 1033:
		case 2057:
		case 47:
		case 405:
		case 225:
		case 406:
		case 312:
		case 404:
		case 10: break;
		case 133: break;
		default: i.enc.insitu(s);
	}
	o.push(s), n.l += a;
	for (var c = lr(n, n.l), l = Vm[c], u = 0; l != null && mm.indexOf(c) > -1;) a = lr(n, n.l + 2), u = n.l + 4, c == 2066 ? u += 4 : (c == 2165 || c == 2175) && (u += 12), s = n.slice(u, n.l + 4 + a), o.push(s), n.l += 4 + a, l = Vm[c = lr(n, n.l)];
	var d = V(o);
	br(d, 0);
	var f = 0;
	d.lens = [];
	for (var p = 0; p < o.length; ++p) d.lens.push(f), f += o[p].length;
	if (d.length < r) throw "XLS Record 0x" + e.toString(16) + " Truncated: " + d.length + " < " + r;
	return t.f(d, d.length, i);
}
function gm(e, t, n) {
	if (e.t !== "z" && e.XF) {
		var r = 0;
		try {
			r = e.z || e.XF.numFmtId || 0, t.cellNF && e.z == null && (e.z = J[r]);
		} catch (e) {
			if (t.WTF) throw e;
		}
		if (!t || t.cellText !== !1) try {
			e.t === "e" ? e.w = e.w || Fi[e.v] : r === 0 || r == "General" ? e.t === "n" ? (e.v | 0) === e.v ? e.w = e.v.toString(10) : e.w = ve(e.v) : e.w = ye(e.v) : e.w = Xe(r, e.v, {
				date1904: !!n,
				dateNF: t && t.dateNF
			});
		} catch (e) {
			if (t.WTF) throw e;
		}
		if (t.cellDates && r && e.t == "n" && Ge(J[r] || String(r))) {
			var i = pe(e.v + (n ? 1462 : 0));
			i && (e.t = "d", e.v = new Date(Date.UTC(i.y, i.m - 1, i.d, i.H, i.M, i.S, i.u)));
		}
	}
}
function _m(e, t, n) {
	return {
		v: e,
		ixfe: t,
		t: n
	};
}
var vm = [
	"none",
	"thin",
	"medium",
	"dashed",
	"dotted",
	"thick",
	"double",
	"hair",
	"mediumDashed",
	"dashDot",
	"mediumDashDot",
	"dashDotDot",
	"mediumDashDotDot",
	"slantDashDot"
], ym = [
	null,
	"left",
	"center",
	"right",
	"fill",
	"justify",
	"centerContinuous",
	"distributed"
], bm = [
	"top",
	"center",
	"bottom",
	"justify",
	"distributed"
];
function xm(e, t) {
	var n = e.l + t, r = {};
	return t >= 16 && (r.x = e.read_shift(4, "i"), r.y = e.read_shift(4, "i"), r.w = e.read_shift(4, "i"), r.h = e.read_shift(4, "i")), e.l = n, r;
}
function Sm(e, t) {
	var n = e.l + t, r = {};
	return t >= 12 && (r.catType = e.read_shift(2), r.valType = e.read_shift(2), r.cCat = e.read_shift(2), r.cVal = e.read_shift(2), r.bubbleType = e.read_shift(2), r.cBubble = e.read_shift(2)), e.l = n, r;
}
function Cm(e, t, n) {
	var r = e.l + t, i = {};
	t >= 2 && (i.id = e.read_shift(2));
	try {
		e.l < r && (i.text = wa(e, r - e.l, n));
	} catch {
		e.l = r;
	}
	return e.l = r, i;
}
function wm(e, t) {
	var n = e.l + t, r = {};
	return t >= 20 && (r.x = e.read_shift(4, "i"), r.y = e.read_shift(4, "i"), r.w = e.read_shift(4, "i"), r.h = e.read_shift(4, "i"), r.dock = e.read_shift(1), r.spacing = e.read_shift(1), r.flags = e.read_shift(2)), e.l = n, r;
}
function Tm(e, t) {
	var n = e.l + t, r = {};
	return t >= 2 && (r.axisType = e.read_shift(2)), e.l = n, r;
}
function Em(e, t) {
	var n = e.l + t, r = {};
	return t >= 32 && (r.hAlign = e.read_shift(1), r.vAlign = e.read_shift(1), r.bgMode = e.read_shift(2), r.color = e.read_shift(4), r.x = e.read_shift(4, "i"), r.y = e.read_shift(4, "i"), r.w = e.read_shift(4, "i"), r.h = e.read_shift(4, "i")), e.l = n, r;
}
function Dm(e, t) {
	var n = e.l + t, r = {};
	if (t >= 6) {
		r.id = e.read_shift(1), r.rt = e.read_shift(1), r.flags = e.read_shift(2);
		var i = e.read_shift(2);
		r.cce = i, r.formulaRaw = e.slice(e.l, Math.min(n, e.l + i));
	}
	return e.l = n, r;
}
function Om(e) {
	return function(t, n) {
		var r = t.l + n, i = { type: e };
		return n >= 2 && (i.flags = t.read_shift(2)), t.l = r, i;
	};
}
var km = Om("barChart"), Am = Om("lineChart"), jm = Om("pieChart"), Mm = Om("areaChart"), Nm = Om("scatterChart"), Pm = Om("radarChart"), Fm = Om("surfaceChart");
function Im(e, t) {
	var n = { opts: {} }, r = {};
	D != null && t.dense == null && (t.dense = D);
	var i = {};
	t.dense && (i["!data"] = []);
	var a = {}, o = {}, s = null, c = [], l = "", u = {}, d, f = "", p, m, h, g, _ = {}, y = [], b, x, S = [], C = [], w = {}, T = [], E = {
		Sheets: [],
		WBProps: { date1904: !1 },
		Views: [{}]
	}, O = {}, k = !1, A = function(e) {
		return e < 8 ? Pi[e] : e < 64 && T[e - 8] || Pi[e];
	}, M = function(e) {
		if (e == null) return null;
		var t = A(e), n = {
			indexed: e,
			index: e
		};
		return t && (n.rgb = sc(t)), fc(n, W);
	}, N = function(e) {
		if (!e) return null;
		var t = {};
		switch (e.xclrType) {
			case 0:
				t.auto = 1;
				break;
			case 1:
				t = M(e.xclrValue) || {};
				break;
			case 2:
				t.rgb = sc(e.xclrValue);
				break;
			case 3:
				t.theme = e.xclrValue;
				break;
		}
		return e.nTintShade && (t.tint = e.nTintShade > 0 ? e.nTintShade / 32767 : e.nTintShade / 32768), fc(t, W);
	}, P = function(e, t) {
		if (!e) return null;
		var n = {};
		return e.name && (n.name = e.name), e.sz && (n.sz = e.sz), e.bold && (n.bold = !0), e.italic && (n.italic = !0), e.underline && (n.underline = e.underline), e.strike && (n.strike = !0), e.outline && (n.outline = !0), e.shadow && (n.shadow = !0), e.family != null && (n.family = e.family), e.charset != null && (n.charset = e.charset), e.vertAlign == 1 ? n.vertAlign = "superscript" : e.vertAlign == 2 && (n.vertAlign = "subscript"), t && t.fontScheme != null && (n.scheme = t.fontScheme == 1 ? "major" : t.fontScheme == 2 ? "minor" : "none"), n.color = N(t && t.xfextFont) || M(e.icv), n.color && n.color.auto && delete n.color, n;
	}, F = function(e) {
		if (!e) return null;
		var t = { patternType: e.patternType || "none" }, n = N(e.xfextFore) || M(e.icvFore), r = N(e.xfextBack) || M(e.icvBack);
		return n && (t.fgColor = n), r && (t.bgColor = r), e.gradientFill && (t.gradientFill = e.gradientFill), t;
	}, I = function(e, t, n) {
		if (!e) return null;
		var r = { style: vm[e] || "thin" }, i = N(n) || M(t);
		return i && (r.color = i), r;
	}, L = function(e) {
		if (!e) return null;
		var t = {}, n;
		return (n = I(e.dgLeft, e.icvLeft, e.xfextLeft)) && (t.left = n), (n = I(e.dgRight, e.icvRight, e.xfextRight)) && (t.right = n), (n = I(e.dgTop, e.icvTop, e.xfextTop)) && (t.top = n), (n = I(e.dgBottom, e.icvBottom, e.xfextBottom)) && (t.bottom = n), (n = I(e.dgDiag, e.icvDiag, e.xfextDiag)) && (t.diagonal = n), e.grbitDiag & 1 && (t.diagonalUp = !0), e.grbitDiag & 2 && (t.diagonalDown = !0), lt(t).length ? t : null;
	}, R = function(e) {
		if (!e) return null;
		var t = {};
		return ym[e.alc] && (t.horizontal = ym[e.alc]), bm[e.alcV] && e.alcV != 2 && (t.vertical = bm[e.alcV]), e.fWrap && (t.wrapText = !0), e.fShrinkToFit && (t.shrinkToFit = !0), e.trot && (t.textRotation = e.trot), e.cIndent && (t.indent = e.cIndent), e.iReadOrder && (t.readingOrder = e.iReadOrder), lt(t).length ? t : null;
	}, z = function(e, t) {
		if (!t) return e;
		var n = t.data || {};
		t.numFmtId != null && (e.numFmtId = t.numFmtId, J[t.numFmtId] != null && (e.numFmt = J[t.numFmtId]));
		var r = P(C[t.ifnt], t);
		r && (e.font = r);
		var i = F(n);
		i && (e.fill = i, pf(e, i));
		var a = L(n);
		a && (e.border = a);
		var o = R(n);
		return o && (e.alignment = o), (t.locked || t.hidden) && (e.protection = {
			locked: t.locked,
			hidden: t.hidden
		}), e;
	}, B = function(e, t) {
		if (!e) return null;
		if (t == null && (t = S.indexOf(e)), w[t]) return w[t];
		var n = {
			id: t,
			xf: St(e)
		};
		return !e.fStyle && e.xfId != null && e.xfId !== t && S[e.xfId] && ff(n, B(S[e.xfId], e.xfId)), n.id = t, n.xf = St(e), z(n, e), w[t] = n;
	}, V = function(e, t) {
		if (!(!e.XF || !t || !t.cellStyles)) {
			var n = B(e.XF, e.ixfe);
			n && (e.s = n);
		}
	}, H = function(e, t, n) {
		if (!(!k && ce > 1) && !(n.sheetRows && e.r >= n.sheetRows)) {
			if (n.cellStyles && t.XF && t.XF.data && V(t, n), delete t.ixfe, delete t.XF, d = e, f = zr(e), (!o || !o.s || !o.e) && (o = {
				s: {
					r: 0,
					c: 0
				},
				e: {
					r: 0,
					c: 0
				}
			}), e.r < o.s.r && (o.s.r = e.r), e.c < o.s.c && (o.s.c = e.c), e.r + 1 > o.e.r && (o.e.r = e.r + 1), e.c + 1 > o.e.c && (o.e.c = e.c + 1), n.cellFormula && t.f) {
				for (var r = 0; r < y.length; ++r) if (!(y[r][0].s.c > e.c || y[r][0].s.r > e.r) && !(y[r][0].e.c < e.c || y[r][0].e.r < e.r)) {
					t.F = Vr(y[r][0]), (y[r][0].s.c != e.c || y[r][0].s.r != e.r) && delete t.f, t.f && (t.f = "" + Gd(y[r][1], o, e, q, U));
					break;
				}
			}
			n.dense ? (i["!data"][e.r] || (i["!data"][e.r] = []), i["!data"][e.r][e.c] = t) : i[f] = t;
		}
	}, U = {
		enc: !1,
		sbcch: 0,
		snames: [],
		sharedf: _,
		arrayf: y,
		rrtabid: [],
		lastuser: "",
		biff: 8,
		codepage: 0,
		winlocked: 0,
		cellStyles: !!t && !!t.cellStyles,
		drawings: !!t && !!t.drawings,
		charts: !!t && !!t.charts,
		WTF: !!t && !!t.WTF
	};
	t.password && (U.password = t.password);
	var W, ee = [], te = [], ne = [], re = [], G = !1, ie = { blips: [] }, ae = null, K = [], oe = null, q = [];
	q.SheetNames = U.snames, q.sharedf = U.sharedf, q.arrayf = U.arrayf, q.names = [], q.XTI = [];
	var se = 0, ce = 0, le = 0, ue = [], de = [], fe, pe = function() {
		return ae || (ae = {
			raw: [],
			images: [],
			shapes: [],
			charts: []
		}), ae;
	}, me = function(e) {
		if (e && !(!t.drawings && !t.charts)) if (e.groups && e.blips) ie.blips = ie.blips.concat(e.blips);
		else {
			var n = pe();
			e.raw && n.raw.push(e.raw), e.blips && e.blips.length && (ie.blips = ie.blips.concat(e.blips)), (e.shapes || []).forEach(function(e) {
				K.push(e);
				var t = e.blipId == null ? null : ie.blips[e.blipId - 1];
				t && t.dataURI ? n.images.push({
					id: "xls-image-" + (n.images.length + 1),
					objectId: e.spid,
					biffType: "msoDrawing",
					anchor: e.anchor,
					dataURI: t.dataURI,
					contentType: t.contentType,
					raw: e.raw
				}) : n.shapes.push({
					id: "xls-shape-" + (n.shapes.length + 1),
					objectId: e.spid,
					biffType: "msoDrawing",
					anchor: e.anchor,
					props: e.props,
					raw: e.raw
				});
			});
		}
	}, he = function(e) {
		if (!(!e || !e.ImData || !e.ImData.data) && !(!t.drawings && !t.charts)) {
			var n = pe(), r = e.ImData.data, i = Jl(r, 0, r.length), a = e._shape || {}, o = {
				id: "xls-imdata-" + (n.images.length + 1),
				objectId: e.cmo && e.cmo[0],
				biffType: "imData",
				anchor: a.anchor,
				raw: e.ImData
			};
			i[1] ? (o.contentType = i[1], o.dataURI = "data:" + i[1] + ";base64," + j(r.slice(i[0])), n.images.push(o)) : n.shapes.push({
				id: "xls-imdata-" + (n.shapes.length + 1),
				objectId: o.objectId,
				biffType: "imData",
				anchor: a.anchor,
				raw: e.ImData
			});
		}
	}, ge = function() {
		oe = {
			type: null,
			title: "",
			series: [],
			seriesText: [],
			raw: [],
			current: null
		};
	}, _e = function(e, t) {
		switch (oe || ge(), oe.raw.push({
			rt: e,
			v: t
		}), e) {
			case 4099:
				oe.current = {
					raw: t,
					name: "",
					data: []
				}, oe.series.push(oe.current);
				break;
			case 4109:
				t && t.text && (oe.current && !oe.current.name ? oe.current.name = t.text : oe.title ? oe.seriesText.push(t.text) : oe.title = t.text);
				break;
			case 4119:
			case 4120:
			case 4121:
			case 4122:
			case 4123:
			case 4158:
			case 4159:
				t && t.type && (oe.type = t.type);
				break;
			case 4177:
				oe.current && (oe.current.brai || (oe.current.brai = []), oe.current.brai.push(t));
				break;
		}
	}, ve = function(e) {
		if (!oe || !oe.raw.length) return null;
		var t = {
			type: oe.type || "barChart",
			title: oe.title,
			series: [],
			raw: oe.raw
		};
		if (e && e["!ref"]) {
			var n = Ur(e["!ref"]), r = e["!data"] != null, i, a, o, s = !1;
			for (a = n.s.r; a <= n.e.r; ++a) o = r ? (e["!data"][a] || [])[n.s.c] : e[zr({
				r: a,
				c: n.s.c
			})], o && o.t == "n" && (s = !0);
			var c = [];
			if (!s && n.e.c > n.s.c) for (a = n.s.r; a <= n.e.r; ++a) o = r ? (e["!data"][a] || [])[n.s.c] : e[zr({
				r: a,
				c: n.s.c
			})], c.push(o ? o.w || o.v : "");
			for (i = n.s.c + +!!c.length; i <= n.e.c; ++i) {
				var l = [], u = (oe.series[i - n.s.c] || oe.series[i - n.s.c - 1] || {}).name || "";
				for (a = n.s.r; a <= n.e.r; ++a) o = r ? (e["!data"][a] || [])[i] : e[zr({
					r: a,
					c: i
				})], o && o.t == "n" ? l.push(o.v) : o && o.v != null && !isNaN(+o.v) && l.push(+o.v);
				l.length && t.series.push({
					name: u,
					data: l,
					val: { values: l },
					cat: { values: c }
				});
			}
		}
		return t.series.length || oe.series.forEach(function(e) {
			t.series.push({
				name: e.name || "",
				data: [],
				raw: e
			});
		}), t;
	}, ye = function(e) {
		if (e["!merges"] && e["!merges"].length) {
			var n = _f(e, { WTF: !!(t && (t.WTF || t.validateMerges)) });
			n.length && (e["!mergeErrors"] = n);
		}
		ae && (ae.images.length || ae.shapes.length || ae.charts.length || ae.raw.length) && (e["!drawings"] = ae);
		var r = t.charts ? ve(e) : null;
		r && (e["!chart"] = r, e["!charts"] || (e["!charts"] = []), ae && ae.charts.length ? ae.charts.forEach(function(t) {
			t.model || (t.model = r), e["!charts"].push(t);
		}) : e["!charts"].push({
			id: "xls-chart-" + e["!charts"].length,
			title: r.title,
			model: r,
			raw: r.raw,
			anchor: {
				type: "absoluteAnchor",
				pos: {
					x: 0,
					y: 0
				},
				ext: {
					cx: 480 * 9525,
					cy: 288 * 9525
				}
			}
		}));
	};
	U.codepage = 1200, v(1200);
	for (var be = !1; e.l < e.length - 1;) {
		var xe = e.l, Se = e.read_shift(2);
		if (Se === 0 && se === 10) break;
		var Ce = e.l === e.length ? 0 : e.read_shift(2), we = Vm[Se];
		if (ce == 0 && [
			9,
			521,
			1033,
			2057
		].indexOf(Se) == -1) break;
		if (we && we.f) {
			if (t.bookSheets && se === 133 && Se !== 133) break;
			if (se = Se, we.r === 2 || we.r == 12) {
				var Te = e.read_shift(2);
				if (Ce -= 2, !U.enc && Te !== Se && ((Te & 255) << 8 | Te >> 8) !== Se) throw Error("rt mismatch: " + Te + "!=" + Se);
				we.r == 12 && (e.l += 10, Ce -= 10);
			}
			var Y = {};
			if (Y = Se === 10 ? we.f(e, Ce, U) : hm(Se, we, e, Ce, U), ce == 0 && [
				9,
				521,
				1033,
				2057
			].indexOf(se) === -1) continue;
			switch (Se) {
				case 34:
					n.opts.Date1904 = E.WBProps.date1904 = Y;
					break;
				case 134:
					n.opts.WriteProtect = !0;
					break;
				case 47:
					if (U.enc || (e.l = 0), U.enc = Y, !t.password) throw Error("File is password-protected");
					if (Y.valid == null) throw Error("Encryption scheme unsupported");
					if (!Y.valid) throw Error("Password is incorrect");
					break;
				case 92:
					U.lastuser = Y;
					break;
				case 66:
					var Ee = Number(Y);
					switch (Ee) {
						case 21010:
							Ee = 1200;
							break;
						case 32768:
							Ee = 1e4;
							break;
						case 32769:
							Ee = 1252;
							break;
					}
					v(U.codepage = Ee), be = !0;
					break;
				case 317:
					U.rrtabid = Y;
					break;
				case 25:
					U.winlocked = Y;
					break;
				case 439:
					n.opts.RefreshAll = Y;
					break;
				case 12:
					n.opts.CalcCount = Y;
					break;
				case 16:
					n.opts.CalcDelta = Y;
					break;
				case 17:
					n.opts.CalcIter = Y;
					break;
				case 13:
					n.opts.CalcMode = Y;
					break;
				case 14:
					n.opts.CalcPrecision = Y;
					break;
				case 95:
					n.opts.CalcSaveRecalc = Y;
					break;
				case 15:
					U.CalcRefMode = Y;
					break;
				case 2211:
					n.opts.FullCalc = Y;
					break;
				case 129:
					Y.fDialog && (i["!type"] = "dialog"), Y.fBelow || ((i["!outline"] || (i["!outline"] = {})).above = !0), Y.fRight || ((i["!outline"] || (i["!outline"] = {})).left = !0);
					break;
				case 67:
				case 579:
				case 1091:
				case 224:
					S.push(Y);
					break;
				case 49:
					C.push(Y), U.biff >= 5 && C.length == 4 && C.push(null);
					break;
				case 430:
					q.push([Y]), q[q.length - 1].XTI = [];
					break;
				case 35:
				case 547:
					q[q.length - 1].push(Y);
					break;
				case 24:
				case 536:
					fe = {
						Name: Y.Name,
						Ref: Gd(Y.rgce, o, null, q, U)
					}, Y.itab > 0 && (fe.Sheet = Y.itab - 1), q.names.push(fe), q[0] || (q[0] = [], q[0].XTI = []), q[q.length - 1].push(Y), Y.Name == "_xlnm._FilterDatabase" && Y.itab > 0 && Y.rgce && Y.rgce[0] && Y.rgce[0][0] && Y.rgce[0][0][0] == "PtgArea3d" && (de[Y.itab - 1] = { ref: Vr(Y.rgce[0][0][1][2]) });
					break;
				case 22:
					U.ExternCount = Y;
					break;
				case 23:
					q.length == 0 && (q[0] = [], q[0].XTI = []), q[q.length - 1].XTI = q[q.length - 1].XTI.concat(Y), q.XTI = q.XTI.concat(Y);
					break;
				case 2196:
					if (U.biff < 8) break;
					fe != null && (fe.Comment = Y[1]);
					break;
				case 18:
					i["!protect"] = Y;
					break;
				case 19:
					Y !== 0 && U.WTF && console.error("Password verifier: " + Y);
					break;
				case 133:
					a[U.biff == 4 ? U.snames.length : Y.pos] = Y, U.snames.push(Y.name);
					break;
				case 10:
					if (--ce ? !k : k) break;
					if (o.e) {
						if (o.e.r > 0 && o.e.c > 0) {
							if (o.e.r--, o.e.c--, i["!ref"] = Vr(o), t.sheetRows && t.sheetRows <= o.e.r) {
								var De = o.e.r;
								o.e.r = t.sheetRows - 1, i["!fullref"] = i["!ref"], i["!ref"] = Vr(o), o.e.r = De;
							}
							o.e.r++, o.e.c++;
						}
						ee.length > 0 && (i["!merges"] = ee), te.length > 0 && (i["!objects"] = te), ne.length > 0 && (i["!cols"] = ne), re.length > 0 && (i["!rows"] = re), ye(i), E.Sheets.push(O);
					}
					l === "" ? u = i : r[l] = i, i = {}, t.dense && (i["!data"] = []);
					break;
				case 9:
				case 521:
				case 1033:
				case 2057:
					if (U.biff === 8 && (U.biff = {
						9: 2,
						521: 3,
						1033: 4
					}[Se] || {
						512: 2,
						768: 3,
						1024: 4,
						1280: 5,
						1536: 8,
						2: 2,
						7: 2
					}[Y.BIFFVer] || 8), U.biffguess = Y.BIFFVer == 0, Y.BIFFVer == 0 && Y.dt == 4096 && (U.biff = 5, be = !0, v(U.codepage = 28591)), U.biff == 4 && Y.dt & 256 && (k = !0), U.biff == 8 && Y.BIFFVer == 0 && Y.dt == 16 && (U.biff = 2), ce++ && !k) break;
					if (i = {}, t.dense && (i["!data"] = []), U.biff < 8 && !be && (be = !0, v(U.codepage = t.codepage || 1252)), U.biff == 4 && k) l = (a[U.snames.indexOf(l) + 1] || { name: "" }).name;
					else if (U.biff < 5 || Y.BIFFVer == 0 && Y.dt == 4096) {
						l === "" && (l = "Sheet1"), o = {
							s: {
								r: 0,
								c: 0
							},
							e: {
								r: 0,
								c: 0
							}
						};
						var Oe = {
							pos: e.l - Ce,
							name: l
						};
						a[Oe.pos] = Oe, U.snames.push(l);
					} else l = (a[xe] || { name: "" }).name;
					Y.dt == 32 && (i["!type"] = "chart"), Y.dt == 64 && (i["!type"] = "macro"), ee = [], te = [], ae = null, K = [], ge(), U.arrayf = y = [], ne = [], re = [], G = !1, O = {
						Hidden: (a[xe] || { hs: 0 }).hs,
						name: l
					};
					break;
				case 515:
				case 3:
				case 2:
					i["!type"] == "chart" && (t.dense ? (i["!data"][Y.r] || [])[Y.c] : i[Pr(Y.c) + Ar(Y.r)]) && ++Y.c, b = {
						ixfe: Y.ixfe,
						XF: S[Y.ixfe] || {},
						v: Y.val,
						t: "n"
					}, le > 0 && (b.z = b.XF && b.XF.numFmtId && ue[b.XF.numFmtId] || ue[b.ixfe >> 8 & 63]), gm(b, t, n.opts.Date1904), H({
						c: Y.c,
						r: Y.r
					}, b, t);
					break;
				case 5:
				case 517:
					b = {
						ixfe: Y.ixfe,
						XF: S[Y.ixfe],
						v: Y.val,
						t: Y.t
					}, le > 0 && (b.z = b.XF && b.XF.numFmtId && ue[b.XF.numFmtId] || ue[b.ixfe >> 8 & 63]), gm(b, t, n.opts.Date1904), H({
						c: Y.c,
						r: Y.r
					}, b, t);
					break;
				case 638:
					b = {
						ixfe: Y.ixfe,
						XF: S[Y.ixfe],
						v: Y.rknum,
						t: "n"
					}, le > 0 && (b.z = b.XF && b.XF.numFmtId && ue[b.XF.numFmtId] || ue[b.ixfe >> 8 & 63]), gm(b, t, n.opts.Date1904), H({
						c: Y.c,
						r: Y.r
					}, b, t);
					break;
				case 189:
					for (var ke = Y.c; ke <= Y.C; ++ke) {
						var Ae = Y.rkrec[ke - Y.c][0];
						b = {
							ixfe: Ae,
							XF: S[Ae],
							v: Y.rkrec[ke - Y.c][1],
							t: "n"
						}, le > 0 && (b.z = b.XF && b.XF.numFmtId && ue[b.XF.numFmtId] || ue[b.ixfe >> 8 & 63]), gm(b, t, n.opts.Date1904), H({
							c: ke,
							r: Y.r
						}, b, t);
					}
					break;
				case 6:
				case 518:
				case 1030:
					if (Y.val == "String") {
						s = Y;
						break;
					}
					if (b = _m(Y.val, Y.cell.ixfe, Y.tt), b.XF = S[b.ixfe], t.cellFormula) {
						var je = Y.formula;
						if (je && je[0] && je[0][0] && je[0][0][0] == "PtgExp") {
							var Me = je[0][0][1][0], Ne = je[0][0][1][1], Pe = zr({
								r: Me,
								c: Ne
							});
							_[Pe] ? b.f = "" + Gd(Y.formula, o, Y.cell, q, U) : b.F = ((t.dense ? (i["!data"][Me] || [])[Ne] : i[Pe]) || {}).F;
						} else b.f = "" + Gd(Y.formula, o, Y.cell, q, U);
					}
					le > 0 && (b.z = b.XF && b.XF.numFmtId && ue[b.XF.numFmtId] || ue[b.ixfe >> 8 & 63]), gm(b, t, n.opts.Date1904), H(Y.cell, b, t), s = Y;
					break;
				case 7:
				case 519:
					if (s) s.val = Y, b = _m(Y, s.cell.ixfe, "s"), b.XF = S[b.ixfe], t.cellFormula && (b.f = "" + Gd(s.formula, o, s.cell, q, U)), le > 0 && (b.z = b.XF && b.XF.numFmtId && ue[b.XF.numFmtId] || ue[b.ixfe >> 8 & 63]), gm(b, t, n.opts.Date1904), H(s.cell, b, t), s = null;
					else throw Error("String record expects Formula");
					break;
				case 33:
				case 545:
					y.push(Y);
					var Fe = zr(Y[0].s);
					if (p = t.dense ? (i["!data"][Y[0].s.r] || [])[Y[0].s.c] : i[Fe], t.cellFormula && p) {
						if (!s || !Fe || !p) break;
						p.f = "" + Gd(Y[1], o, Y[0], q, U), p.F = Vr(Y[0]);
					}
					break;
				case 1212:
					if (!t.cellFormula) break;
					if (f) {
						if (!s) break;
						_[zr(s.cell)] = Y[0], p = t.dense ? (i["!data"][s.cell.r] || [])[s.cell.c] : i[zr(s.cell)], (p || {}).f = "" + Gd(Y[0], o, d, q, U);
					}
					break;
				case 253:
					b = _m(c[Y.isst].t, Y.ixfe, "s"), c[Y.isst].h && (b.h = c[Y.isst].h), b.XF = S[b.ixfe], le > 0 && (b.z = b.XF && b.XF.numFmtId && ue[b.XF.numFmtId] || ue[b.ixfe >> 8 & 63]), gm(b, t, n.opts.Date1904), H({
						c: Y.c,
						r: Y.r
					}, b, t);
					break;
				case 513:
					t.sheetStubs && (b = {
						ixfe: Y.ixfe,
						XF: S[Y.ixfe],
						t: "z"
					}, le > 0 && (b.z = b.XF && b.XF.numFmtId && ue[b.XF.numFmtId] || ue[b.ixfe >> 8 & 63]), gm(b, t, n.opts.Date1904), H({
						c: Y.c,
						r: Y.r
					}, b, t));
					break;
				case 190:
					if (t.sheetStubs) for (var Ie = Y.c; Ie <= Y.C; ++Ie) {
						var Le = Y.ixfe[Ie - Y.c];
						b = {
							ixfe: Le,
							XF: S[Le],
							t: "z"
						}, le > 0 && (b.z = b.XF && b.XF.numFmtId && ue[b.XF.numFmtId] || ue[b.ixfe >> 8 & 63]), gm(b, t, n.opts.Date1904), H({
							c: Ie,
							r: Y.r
						}, b, t);
					}
					break;
				case 214:
				case 516:
				case 4:
					b = _m(Y.val, Y.ixfe, "s"), b.XF = S[b.ixfe], le > 0 && (b.z = b.XF && b.XF.numFmtId && ue[b.XF.numFmtId] || ue[b.ixfe >> 8 & 63]), gm(b, t, n.opts.Date1904), H({
						c: Y.c,
						r: Y.r
					}, b, t);
					break;
				case 0:
				case 512:
					ce === 1 && (o = Y);
					break;
				case 252:
					c = Y;
					break;
				case 1054:
					if (U.biff >= 3 && U.biff <= 4) {
						ue[le++] = Y[1];
						for (var Re = 0; Re < le + 163 && J[Re] != Y[1]; ++Re);
						Re >= 163 && it(Y[1], le + 163);
					} else it(Y[1], Y[0]);
					break;
				case 30:
					ue[le++] = Y;
					for (var ze = 0; ze < le + 163 && J[ze] != Y; ++ze);
					ze >= 163 && it(Y, le + 163);
					break;
				case 229:
					ee = ee.concat(Y);
					break;
				case 235:
					me(Y);
					break;
				case 236:
					me(Y);
					break;
				case 93:
					te[Y.cmo[0]] = U.lastobj = Y, K.length && (Y._shape = K.shift(), Y._shape.object = Y, Y.cmo[1] == 5 && pe().charts.push({
						id: "xls-chart-object-" + Y.cmo[0],
						objectId: Y.cmo[0],
						biffType: "obj",
						anchor: Y._shape.anchor,
						raw: Y._shape.raw
					}));
					break;
				case 438:
					U.lastobj.TxO = Y;
					break;
				case 127:
					U.lastobj.ImData = Y, he(U.lastobj);
					break;
				case 440:
					for (g = Y[0].s.r; g <= Y[0].e.r; ++g) for (h = Y[0].s.c; h <= Y[0].e.c; ++h) p = t.dense ? (i["!data"][g] || [])[h] : i[zr({
						c: h,
						r: g
					})], p && (p.l = Y[1]);
					break;
				case 2048:
					for (g = Y[0].s.r; g <= Y[0].e.r; ++g) for (h = Y[0].s.c; h <= Y[0].e.c; ++h) p = t.dense ? (i["!data"][g] || [])[h] : i[zr({
						c: h,
						r: g
					})], p && p.l && (p.l.Tooltip = Y[1]);
					break;
				case 28:
					if (p = t.dense ? (i["!data"][Y[0].r] || [])[Y[0].c] : i[zr(Y[0])], p || (t.dense ? (i["!data"][Y[0].r] || (i["!data"][Y[0].r] = []), p = i["!data"][Y[0].r][Y[0].c] = { t: "z" }) : p = i[zr(Y[0])] = { t: "z" }, o.e.r = Math.max(o.e.r, Y[0].r), o.s.r = Math.min(o.s.r, Y[0].r), o.e.c = Math.max(o.e.c, Y[0].c), o.s.c = Math.min(o.s.c, Y[0].c)), p.c || (p.c = []), U.biff <= 5 && U.biff >= 2) m = {
						a: "SheetJ5",
						t: Y[1]
					};
					else {
						var Be = te[Y[2]];
						m = {
							a: Y[1],
							t: Be.TxO.t
						}, Y[3] != null && !(Y[3] & 2) && (p.c.hidden = !0);
					}
					p.c.push(m);
					break;
				case 2173:
					El(S[Y.ixfe], Y.ext), w = {};
					break;
				case 125:
					if (!U.cellStyles) break;
					for (; Y.e >= Y.s;) ne[Y.e--] = {
						width: Y.w / 256,
						level: Y.level || 0,
						hidden: !!(Y.flags & 1)
					}, Y.ixfe != null && S[Y.ixfe] && (ne[Y.e + 1].s = B(S[Y.ixfe], Y.ixfe)), G || (G = !0, _c = mc, Sc(Y.w / 256)), Cc(ne[Y.e + 1]);
					break;
				case 520:
					var Ve = {};
					Y.level != null && (re[Y.r] = Ve, Ve.level = Y.level), Y.hidden && (re[Y.r] = Ve, Ve.hidden = !0), U.cellStyles && Y.ixfe != null && Y.ixfe != 4095 && S[Y.ixfe] && (re[Y.r] = Ve, Ve.s = B(S[Y.ixfe], Y.ixfe)), Y.hpt && (re[Y.r] = Ve, Ve.hpt = Y.hpt, Ve.hpx = Gc(Y.hpt));
					break;
				case 38:
				case 39:
				case 40:
				case 41:
					i["!margins"] || df(i["!margins"] = {}), i["!margins"][{
						38: "left",
						39: "right",
						40: "top",
						41: "bottom"
					}[Se]] = Y;
					break;
				case 161:
					i["!margins"] || df(i["!margins"] = {}), i["!margins"].header = Y.header, i["!margins"].footer = Y.footer;
					break;
				case 574:
					Y.RTL && (E.Views[0].RTL = !0);
					break;
				case 146:
					T = Y, w = {};
					break;
				case 2198:
					W = Y, w = {};
					break;
				case 140:
					x = Y;
					break;
				case 4098:
				case 4099:
				case 4109:
				case 4116:
				case 4117:
				case 4119:
				case 4120:
				case 4121:
				case 4122:
				case 4123:
				case 4125:
				case 4127:
				case 4128:
				case 4133:
				case 4149:
				case 4154:
				case 4158:
				case 4159:
				case 4161:
				case 4165:
				case 4177:
					_e(Se, Y);
					break;
				case 442:
					l ? O.CodeName = Y || O.name : E.WBProps.CodeName = Y || "ThisWorkbook";
					break;
			}
		} else we || console.error("Missing Info for XLS Record 0x" + Se.toString(16)), e.l += Ce;
	}
	return n.SheetNames = lt(a).sort(function(e, t) {
		return Number(e) - Number(t);
	}).map(function(e) {
		return a[e].name;
	}), t.bookSheets || (n.Sheets = r), !n.SheetNames.length && u["!ref"] ? (n.SheetNames.push("Sheet1"), n.Sheets && (n.Sheets.Sheet1 = u)) : n.Preamble = u, n.Sheets && de.forEach(function(e, t) {
		n.Sheets[n.SheetNames[t]]["!autofilter"] = e;
	}), n.Strings = c, n.SSF = St(J), U.enc && (n.Encryption = U.enc), W && (n.Themes = W), n.Metadata = {}, x !== void 0 && (n.Metadata.Country = x), q.names.length > 0 && (E.Names = q.names), n.Workbook = E, n;
}
var Lm = {
	SI: "e0859ff2f94f6810ab9108002b27b3d9",
	DSI: "02d5cdd59c2e1b10939708002b2cf9ae",
	UDI: "05d5cdd59c2e1b10939708002b2cf9ae"
};
function Rm(e, t, n) {
	var r = ot.find(e, "/!DocumentSummaryInformation");
	if (r && r.size > 0) try {
		var i = _a(r, ki, Lm.DSI);
		for (var a in i) t[a] = i[a];
	} catch (e) {
		n.WTF && console.error(e && e.message || e);
	}
	var o = ot.find(e, "/!SummaryInformation");
	if (o && o.size > 0) try {
		var s = _a(o, Ai, Lm.SI);
		for (var c in s) t[c] == null && (t[c] = s[c]);
	} catch (e) {
		n.WTF && console.error(e && e.message || e);
	}
	t.HeadingPairs && t.TitlesOfParts && (Yi(t.HeadingPairs, t.TitlesOfParts, t, n), delete t.HeadingPairs, delete t.TitlesOfParts);
}
function zm(e, t) {
	t || (t = {}), $h(t), y(), t.codepage && g(t.codepage);
	var n, r;
	if (e.FullPaths) {
		if (ot.find(e, "/encryption")) throw Error("File is password-protected");
		n = ot.find(e, "!CompObj"), r = ot.find(e, "/Workbook") || ot.find(e, "/Book");
	} else {
		switch (t.type) {
			case "base64":
				e = R(M(e));
				break;
			case "binary":
				e = R(e);
				break;
			case "buffer": break;
			case "array":
				Array.isArray(e) || (e = Array.prototype.slice.call(e));
				break;
		}
		br(e, 0), r = { content: e };
	}
	var i, a;
	if (n && pm(n), t.bookProps && !t.bookSheets) i = {};
	else {
		var o = N ? "buffer" : "array";
		if (r && r.content) i = Im(r.content, t);
		else if ((a = ot.find(e, "PerfectOffice_MAIN")) && a.content) i = Ss.to_workbook(a.content, (t.type = o, t));
		else if ((a = ot.find(e, "NativeContent_MAIN")) && a.content) i = Ss.to_workbook(a.content, (t.type = o, t));
		else if ((a = ot.find(e, "MN0")) && a.content) throw Error("Unsupported Works 4 for Mac file");
		else throw Error("Cannot find Workbook stream");
		t.bookVBA && e.FullPaths && ot.find(e, "/_VBA_PROJECT_CUR/VBA/dir") && (i.vbaraw = au(e));
	}
	var s = {};
	return e.FullPaths && Rm(e, s, t), i.Props = i.Custprops = s, t.bookFiles && (i.cfb = e), i;
}
var Bm = {
	0: { f: If },
	1: { f: Bf },
	2: { f: Xf },
	3: { f: Wf },
	4: { f: Hf },
	5: { f: Jf },
	6: { f: $f },
	7: { f: Kf },
	8: { f: ip },
	9: { f: rp },
	10: { f: tp },
	11: { f: np },
	12: { f: Vf },
	13: { f: Zf },
	14: { f: Gf },
	15: { f: Uf },
	16: { f: Yf },
	17: { f: ep },
	18: { f: qf },
	19: { f: $r },
	20: {},
	21: {},
	22: {},
	23: {},
	24: {},
	25: {},
	26: {},
	27: {},
	28: {},
	29: {},
	30: {},
	31: {},
	32: {},
	33: {},
	34: {},
	35: { T: 1 },
	36: { T: -1 },
	37: { T: 1 },
	38: { T: -1 },
	39: { f: Bp },
	40: {},
	42: {},
	43: { f: ll },
	44: { f: cl },
	45: { f: ul },
	46: { f: fl },
	47: { f: dl },
	48: {},
	49: { f: Xr },
	50: {},
	51: { f: Ol },
	52: { T: 1 },
	53: { T: -1 },
	54: { T: 1 },
	55: { T: -1 },
	56: { T: 1 },
	57: { T: -1 },
	58: {},
	59: {},
	60: { f: $o },
	62: { f: Qf },
	63: { f: Nl },
	64: { f: pp },
	65: {},
	66: {},
	67: {},
	68: {},
	69: {},
	70: {},
	128: {},
	129: { T: 1 },
	130: { T: -1 },
	131: {
		T: 1,
		f: xr,
		p: 0
	},
	132: { T: -1 },
	133: { T: 1 },
	134: { T: -1 },
	135: { T: 1 },
	136: { T: -1 },
	137: {
		T: 1,
		f: fp
	},
	138: { T: -1 },
	139: { T: 1 },
	140: { T: -1 },
	141: { T: 1 },
	142: { T: -1 },
	143: { T: 1 },
	144: { T: -1 },
	145: { T: 1 },
	146: { T: -1 },
	147: { f: zf },
	148: {
		f: Lf,
		p: 16
	},
	151: { f: sp },
	152: {},
	153: { f: Rp },
	154: {},
	155: {},
	156: { f: Lp },
	157: {},
	158: {},
	159: {
		T: 1,
		f: Ms
	},
	160: { T: -1 },
	161: {
		T: 1,
		f: li
	},
	162: { T: -1 },
	163: { T: 1 },
	164: { T: -1 },
	165: { T: 1 },
	166: { T: -1 },
	167: {},
	168: {},
	169: {},
	170: {},
	171: {},
	172: { T: 1 },
	173: { T: -1 },
	174: {},
	175: {},
	176: { f: ap },
	177: { T: 1 },
	178: { T: -1 },
	179: { T: 1 },
	180: { T: -1 },
	181: { T: 1 },
	182: { T: -1 },
	183: { T: 1 },
	184: { T: -1 },
	185: { T: 1 },
	186: { T: -1 },
	187: { T: 1 },
	188: { T: -1 },
	189: { T: 1 },
	190: { T: -1 },
	191: { T: 1 },
	192: { T: -1 },
	193: { T: 1 },
	194: { T: -1 },
	195: { T: 1 },
	196: { T: -1 },
	197: { T: 1 },
	198: { T: -1 },
	199: { T: 1 },
	200: { T: -1 },
	201: { T: 1 },
	202: { T: -1 },
	203: { T: 1 },
	204: { T: -1 },
	205: { T: 1 },
	206: { T: -1 },
	207: { T: 1 },
	208: { T: -1 },
	209: { T: 1 },
	210: { T: -1 },
	211: { T: 1 },
	212: { T: -1 },
	213: { T: 1 },
	214: { T: -1 },
	215: { T: 1 },
	216: { T: -1 },
	217: { T: 1 },
	218: { T: -1 },
	219: { T: 1 },
	220: { T: -1 },
	221: { T: 1 },
	222: { T: -1 },
	223: { T: 1 },
	224: { T: -1 },
	225: { T: 1 },
	226: { T: -1 },
	227: { T: 1 },
	228: { T: -1 },
	229: { T: 1 },
	230: { T: -1 },
	231: { T: 1 },
	232: { T: -1 },
	233: { T: 1 },
	234: { T: -1 },
	235: { T: 1 },
	236: { T: -1 },
	237: { T: 1 },
	238: { T: -1 },
	239: { T: 1 },
	240: { T: -1 },
	241: { T: 1 },
	242: { T: -1 },
	243: { T: 1 },
	244: { T: -1 },
	245: { T: 1 },
	246: { T: -1 },
	247: { T: 1 },
	248: { T: -1 },
	249: { T: 1 },
	250: { T: -1 },
	251: { T: 1 },
	252: { T: -1 },
	253: { T: 1 },
	254: { T: -1 },
	255: { T: 1 },
	256: { T: -1 },
	257: { T: 1 },
	258: { T: -1 },
	259: { T: 1 },
	260: { T: -1 },
	261: { T: 1 },
	262: { T: -1 },
	263: { T: 1 },
	264: { T: -1 },
	265: { T: 1 },
	266: { T: -1 },
	267: { T: 1 },
	268: { T: -1 },
	269: { T: 1 },
	270: { T: -1 },
	271: { T: 1 },
	272: { T: -1 },
	273: { T: 1 },
	274: { T: -1 },
	275: { T: 1 },
	276: { T: -1 },
	277: {},
	278: { T: 1 },
	279: { T: -1 },
	280: { T: 1 },
	281: { T: -1 },
	282: { T: 1 },
	283: { T: 1 },
	284: { T: -1 },
	285: { T: 1 },
	286: { T: -1 },
	287: { T: 1 },
	288: { T: -1 },
	289: { T: 1 },
	290: { T: -1 },
	291: { T: 1 },
	292: { T: -1 },
	293: { T: 1 },
	294: { T: -1 },
	295: { T: 1 },
	296: { T: -1 },
	297: { T: 1 },
	298: { T: -1 },
	299: { T: 1 },
	300: { T: -1 },
	301: { T: 1 },
	302: { T: -1 },
	303: { T: 1 },
	304: { T: -1 },
	305: { T: 1 },
	306: { T: -1 },
	307: { T: 1 },
	308: { T: -1 },
	309: { T: 1 },
	310: { T: -1 },
	311: { T: 1 },
	312: { T: -1 },
	313: { T: -1 },
	314: { T: 1 },
	315: { T: -1 },
	316: { T: 1 },
	317: { T: -1 },
	318: { T: 1 },
	319: { T: -1 },
	320: { T: 1 },
	321: { T: -1 },
	322: { T: 1 },
	323: { T: -1 },
	324: { T: 1 },
	325: { T: -1 },
	326: { T: 1 },
	327: { T: -1 },
	328: { T: 1 },
	329: { T: -1 },
	330: { T: 1 },
	331: { T: -1 },
	332: { T: 1 },
	333: { T: -1 },
	334: { T: 1 },
	335: { f: Dl },
	336: { T: -1 },
	337: {
		f: kl,
		T: 1
	},
	338: { T: -1 },
	339: { T: 1 },
	340: { T: -1 },
	341: { T: 1 },
	342: { T: -1 },
	343: { T: 1 },
	344: { T: -1 },
	345: { T: 1 },
	346: { T: -1 },
	347: { T: 1 },
	348: { T: -1 },
	349: { T: 1 },
	350: { T: -1 },
	351: {},
	352: {},
	353: { T: 1 },
	354: { T: -1 },
	355: { f: oi },
	357: {},
	358: {},
	359: {},
	360: { T: 1 },
	361: {},
	362: { f: Po },
	363: {},
	364: {},
	366: {},
	367: {},
	368: {},
	369: {},
	370: {},
	371: {},
	372: { T: 1 },
	373: { T: -1 },
	374: { T: 1 },
	375: { T: -1 },
	376: { T: 1 },
	377: { T: -1 },
	378: { T: 1 },
	379: { T: -1 },
	380: { T: 1 },
	381: { T: -1 },
	382: { T: 1 },
	383: { T: -1 },
	384: { T: 1 },
	385: { T: -1 },
	386: { T: 1 },
	387: { T: -1 },
	388: { T: 1 },
	389: { T: -1 },
	390: { T: 1 },
	391: { T: -1 },
	392: { T: 1 },
	393: { T: -1 },
	394: { T: 1 },
	395: { T: -1 },
	396: {},
	397: {},
	398: {},
	399: {},
	400: {},
	401: { T: 1 },
	403: {},
	404: {},
	405: {},
	406: {},
	407: {},
	408: {},
	409: {},
	410: {},
	411: {},
	412: {},
	413: {},
	414: {},
	415: {},
	416: {},
	417: {},
	418: {},
	419: {},
	420: {},
	421: {},
	422: { T: 1 },
	423: { T: 1 },
	424: { T: -1 },
	425: { T: -1 },
	426: { f: cp },
	427: { f: lp },
	428: {},
	429: { T: 1 },
	430: { T: -1 },
	431: { T: 1 },
	432: { T: -1 },
	433: { T: 1 },
	434: { T: -1 },
	435: { T: 1 },
	436: { T: -1 },
	437: { T: 1 },
	438: { T: -1 },
	439: { T: 1 },
	440: { T: -1 },
	441: { T: 1 },
	442: { T: -1 },
	443: { T: 1 },
	444: { T: -1 },
	445: { T: 1 },
	446: { T: -1 },
	447: { T: 1 },
	448: { T: -1 },
	449: { T: 1 },
	450: { T: -1 },
	451: { T: 1 },
	452: { T: -1 },
	453: { T: 1 },
	454: { T: -1 },
	455: { T: 1 },
	456: { T: -1 },
	457: { T: 1 },
	458: { T: -1 },
	459: { T: 1 },
	460: { T: -1 },
	461: { T: 1 },
	462: { T: -1 },
	463: { T: 1 },
	464: { T: -1 },
	465: { T: 1 },
	466: { T: -1 },
	467: { T: 1 },
	468: { T: -1 },
	469: { T: 1 },
	470: { T: -1 },
	471: {},
	472: {},
	473: { T: 1 },
	474: { T: -1 },
	475: {},
	476: { f: dp },
	477: {},
	478: {},
	479: { T: 1 },
	480: { T: -1 },
	481: { T: 1 },
	482: { T: -1 },
	483: { T: 1 },
	484: { T: -1 },
	485: { f: Rf },
	486: { T: 1 },
	487: { T: -1 },
	488: { T: 1 },
	489: { T: -1 },
	490: { T: 1 },
	491: { T: -1 },
	492: { T: 1 },
	493: { T: -1 },
	494: { f: op },
	495: { T: 1 },
	496: { T: -1 },
	497: { T: 1 },
	498: { T: -1 },
	499: {},
	500: { T: 1 },
	501: { T: -1 },
	502: { T: 1 },
	503: { T: -1 },
	504: {},
	505: { T: 1 },
	506: { T: -1 },
	507: {},
	508: { T: 1 },
	509: { T: -1 },
	510: { T: 1 },
	511: { T: -1 },
	512: {},
	513: {},
	514: { T: 1 },
	515: { T: -1 },
	516: { T: 1 },
	517: { T: -1 },
	518: { T: 1 },
	519: { T: -1 },
	520: { T: 1 },
	521: { T: -1 },
	522: {},
	523: {},
	524: {},
	525: {},
	526: {},
	527: {},
	528: { T: 1 },
	529: { T: -1 },
	530: { T: 1 },
	531: { T: -1 },
	532: { T: 1 },
	533: { T: -1 },
	534: {},
	535: {},
	536: {},
	537: {},
	538: { T: 1 },
	539: { T: -1 },
	540: { T: 1 },
	541: { T: -1 },
	542: { T: 1 },
	548: {},
	549: {},
	550: { f: oi },
	551: { f: ii },
	552: {},
	553: {},
	554: { T: 1 },
	555: { T: -1 },
	556: { T: 1 },
	557: { T: -1 },
	558: { T: 1 },
	559: { T: -1 },
	560: { T: 1 },
	561: { T: -1 },
	562: {},
	564: {},
	565: { T: 1 },
	566: { T: -1 },
	569: { T: 1 },
	570: { T: -1 },
	572: {},
	573: { T: 1 },
	574: { T: -1 },
	577: {},
	578: {},
	579: {},
	580: {},
	581: {},
	582: {},
	583: {},
	584: {},
	585: {},
	586: {},
	587: {},
	588: { T: -1 },
	589: {},
	590: { T: 1 },
	591: { T: -1 },
	592: { T: 1 },
	593: { T: -1 },
	594: { T: 1 },
	595: { T: -1 },
	596: {},
	597: { T: 1 },
	598: { T: -1 },
	599: { T: 1 },
	600: { T: -1 },
	601: { T: 1 },
	602: { T: -1 },
	603: { T: 1 },
	604: { T: -1 },
	605: { T: 1 },
	606: { T: -1 },
	607: {},
	608: { T: 1 },
	609: { T: -1 },
	610: {},
	611: { T: 1 },
	612: { T: -1 },
	613: { T: 1 },
	614: { T: -1 },
	615: { T: 1 },
	616: { T: -1 },
	617: { T: 1 },
	618: { T: -1 },
	619: { T: 1 },
	620: { T: -1 },
	625: {},
	626: { T: 1 },
	627: { T: -1 },
	628: { T: 1 },
	629: { T: -1 },
	630: { T: 1 },
	631: { T: -1 },
	632: { f: nu },
	633: { T: 1 },
	634: { T: -1 },
	635: {
		T: 1,
		f: tu
	},
	636: { T: -1 },
	637: { f: ei },
	638: { T: 1 },
	639: {},
	640: { T: -1 },
	641: { T: 1 },
	642: { T: -1 },
	643: { T: 1 },
	644: {},
	645: { T: -1 },
	646: { T: 1 },
	648: { T: 1 },
	649: {},
	650: { T: -1 },
	651: { f: wp },
	652: {},
	653: { T: 1 },
	654: { T: -1 },
	655: { T: 1 },
	656: { T: -1 },
	657: { T: 1 },
	658: { T: -1 },
	659: {},
	660: { T: 1 },
	661: {},
	662: { T: -1 },
	663: {},
	664: { T: 1 },
	665: {},
	666: { T: -1 },
	667: {},
	668: {},
	669: {},
	671: { T: 1 },
	672: { T: -1 },
	673: { T: 1 },
	674: { T: -1 },
	675: {},
	676: {},
	677: {},
	678: {},
	679: {},
	680: {},
	681: {},
	1024: {},
	1025: {},
	1026: { T: 1 },
	1027: { T: -1 },
	1028: { T: 1 },
	1029: { T: -1 },
	1030: {},
	1031: { T: 1 },
	1032: { T: -1 },
	1033: { T: 1 },
	1034: { T: -1 },
	1035: {},
	1036: {},
	1037: {},
	1038: { T: 1 },
	1039: { T: -1 },
	1040: {},
	1041: { T: 1 },
	1042: { T: -1 },
	1043: {},
	1044: {},
	1045: {},
	1046: { T: 1 },
	1047: { T: -1 },
	1048: { T: 1 },
	1049: { T: -1 },
	1050: {},
	1051: { T: 1 },
	1052: { T: 1 },
	1053: { f: mp },
	1054: { T: 1 },
	1055: {},
	1056: { T: 1 },
	1057: { T: -1 },
	1058: { T: 1 },
	1059: { T: -1 },
	1061: {},
	1062: { T: 1 },
	1063: { T: -1 },
	1064: { T: 1 },
	1065: { T: -1 },
	1066: { T: 1 },
	1067: { T: -1 },
	1068: { T: 1 },
	1069: { T: -1 },
	1070: { T: 1 },
	1071: { T: -1 },
	1072: { T: 1 },
	1073: { T: -1 },
	1075: { T: 1 },
	1076: { T: -1 },
	1077: { T: 1 },
	1078: { T: -1 },
	1079: { T: 1 },
	1080: { T: -1 },
	1081: { T: 1 },
	1082: { T: -1 },
	1083: { T: 1 },
	1084: { T: -1 },
	1085: {},
	1086: { T: 1 },
	1087: { T: -1 },
	1088: { T: 1 },
	1089: { T: -1 },
	1090: { T: 1 },
	1091: { T: -1 },
	1092: { T: 1 },
	1093: { T: -1 },
	1094: { T: 1 },
	1095: { T: -1 },
	1096: {},
	1097: { T: 1 },
	1098: {},
	1099: { T: -1 },
	1100: { T: 1 },
	1101: { T: -1 },
	1102: {},
	1103: {},
	1104: {},
	1105: {},
	1111: {},
	1112: {},
	1113: { T: 1 },
	1114: { T: -1 },
	1115: { T: 1 },
	1116: { T: -1 },
	1117: {},
	1118: { T: 1 },
	1119: { T: -1 },
	1120: { T: 1 },
	1121: { T: -1 },
	1122: { T: 1 },
	1123: { T: -1 },
	1124: { T: 1 },
	1125: { T: -1 },
	1126: {},
	1128: { T: 1 },
	1129: { T: -1 },
	1130: {},
	1131: { T: 1 },
	1132: { T: -1 },
	1133: { T: 1 },
	1134: { T: -1 },
	1135: { T: 1 },
	1136: { T: -1 },
	1137: { T: 1 },
	1138: { T: -1 },
	1139: { T: 1 },
	1140: { T: -1 },
	1141: {},
	1142: { T: 1 },
	1143: { T: -1 },
	1144: { T: 1 },
	1145: { T: -1 },
	1146: {},
	1147: { T: 1 },
	1148: { T: -1 },
	1149: { T: 1 },
	1150: { T: -1 },
	1152: { T: 1 },
	1153: { T: -1 },
	1154: { T: -1 },
	1155: { T: -1 },
	1156: { T: -1 },
	1157: { T: 1 },
	1158: { T: -1 },
	1159: { T: 1 },
	1160: { T: -1 },
	1161: { T: 1 },
	1162: { T: -1 },
	1163: { T: 1 },
	1164: { T: -1 },
	1165: { T: 1 },
	1166: { T: -1 },
	1167: { T: 1 },
	1168: { T: -1 },
	1169: { T: 1 },
	1170: { T: -1 },
	1171: {},
	1172: { T: 1 },
	1173: { T: -1 },
	1177: {},
	1178: { T: 1 },
	1180: {},
	1181: {},
	1182: {},
	2048: { T: 1 },
	2049: { T: -1 },
	2050: {},
	2051: { T: 1 },
	2052: { T: -1 },
	2053: {},
	2054: {},
	2055: { T: 1 },
	2056: { T: -1 },
	2057: { T: 1 },
	2058: { T: -1 },
	2060: {},
	2067: {},
	2068: { T: 1 },
	2069: { T: -1 },
	2070: {},
	2071: {},
	2072: { T: 1 },
	2073: { T: -1 },
	2075: {},
	2076: {},
	2077: { T: 1 },
	2078: { T: -1 },
	2079: {},
	2080: { T: 1 },
	2081: { T: -1 },
	2082: {},
	2083: { T: 1 },
	2084: { T: -1 },
	2085: { T: 1 },
	2086: { T: -1 },
	2087: { T: 1 },
	2088: { T: -1 },
	2089: { T: 1 },
	2090: { T: -1 },
	2091: {},
	2092: {},
	2093: { T: 1 },
	2094: { T: -1 },
	2095: {},
	2096: { T: 1 },
	2097: { T: -1 },
	2098: { T: 1 },
	2099: { T: -1 },
	2100: { T: 1 },
	2101: { T: -1 },
	2102: {},
	2103: { T: 1 },
	2104: { T: -1 },
	2105: {},
	2106: { T: 1 },
	2107: { T: -1 },
	2108: {},
	2109: { T: 1 },
	2110: { T: -1 },
	2111: { T: 1 },
	2112: { T: -1 },
	2113: { T: 1 },
	2114: { T: -1 },
	2115: {},
	2116: {},
	2117: {},
	2118: { T: 1 },
	2119: { T: -1 },
	2120: {},
	2121: { T: 1 },
	2122: { T: -1 },
	2123: { T: 1 },
	2124: { T: -1 },
	2125: {},
	2126: { T: 1 },
	2127: { T: -1 },
	2128: {},
	2129: { T: 1 },
	2130: { T: -1 },
	2131: { T: 1 },
	2132: { T: -1 },
	2133: { T: 1 },
	2134: {},
	2135: {},
	2136: {},
	2137: { T: 1 },
	2138: { T: -1 },
	2139: { T: 1 },
	2140: { T: -1 },
	2141: {},
	3072: {},
	3073: {},
	4096: { T: 1 },
	4097: { T: -1 },
	5002: { T: 1 },
	5003: { T: -1 },
	5081: { T: 1 },
	5082: { T: -1 },
	5083: {},
	5084: { T: 1 },
	5085: { T: -1 },
	5086: { T: 1 },
	5087: { T: -1 },
	5088: {},
	5089: {},
	5090: {},
	5092: { T: 1 },
	5093: { T: -1 },
	5094: {},
	5095: { T: 1 },
	5096: { T: -1 },
	5097: {},
	5099: {},
	5100: {},
	5101: {},
	5102: {},
	5103: {},
	5105: {},
	5108: {},
	5109: {},
	5110: {},
	5111: {},
	5112: {},
	5113: {},
	5114: {},
	5117: {},
	5127: {},
	5130: {},
	5131: {},
	5132: {},
	5134: {},
	5135: {},
	65535: { n: "" }
}, Vm = {
	6: { f: Zd },
	10: { f: va },
	12: { f: xa },
	13: { f: xa },
	14: { f: ba },
	15: { f: ba },
	16: { f: ui },
	17: { f: ba },
	18: { f: ba },
	19: { f: xa },
	20: { f: Ao },
	21: { f: Ao },
	23: { f: Po },
	24: { f: No },
	25: { f: ba },
	26: {},
	27: {},
	28: { f: Vo },
	29: {},
	34: { f: ba },
	35: { f: Mo },
	38: { f: ui },
	39: { f: ui },
	40: { f: ui },
	41: { f: ui },
	42: { f: ba },
	43: { f: ba },
	47: { f: nc },
	49: { f: po },
	51: { f: xa },
	60: {},
	61: { f: lo },
	64: { f: ba },
	65: { f: fo },
	66: { f: xa },
	77: {},
	80: {},
	81: {},
	82: {},
	85: { f: xa },
	89: {},
	90: {},
	91: {},
	92: { f: eo },
	93: { f: Uo },
	94: {},
	95: { f: ba },
	96: {},
	97: {},
	99: { f: ba },
	125: { f: $o },
	128: { f: Do },
	129: { f: to },
	130: { f: xa },
	131: { f: ba },
	132: { f: ba },
	133: { f: no },
	134: {},
	140: { f: Yo },
	141: { f: xa },
	144: {},
	146: { f: Zo },
	151: {},
	152: {},
	153: {},
	154: {},
	155: {},
	156: { f: xa },
	157: {},
	158: {},
	160: { f: rs },
	161: { f: es },
	174: {},
	175: {},
	176: {},
	177: {},
	178: {},
	180: {},
	181: {},
	182: {},
	184: {},
	185: {},
	189: { f: bo },
	190: { f: xo },
	193: { f: va },
	197: {},
	198: {},
	199: {},
	200: {},
	201: {},
	202: { f: ba },
	203: {},
	204: {},
	205: {},
	206: {},
	207: {},
	208: {},
	209: {},
	210: {},
	211: {},
	213: {},
	215: {},
	216: {},
	217: {},
	218: { f: xa },
	220: {},
	221: { f: ba },
	222: {},
	224: { f: Co },
	225: { f: $a },
	226: { f: va },
	227: {},
	229: { f: Ho },
	233: {},
	235: { f: Bl },
	236: { f: Vl },
	237: {},
	239: {},
	240: {},
	241: {},
	242: {},
	244: {},
	245: {},
	246: {},
	247: {},
	248: {},
	249: {},
	251: {},
	252: { f: ro },
	253: { f: mo },
	255: { f: io },
	256: {},
	259: {},
	290: {},
	311: {},
	312: {},
	315: {},
	317: { f: Sa },
	318: {},
	319: {},
	320: {},
	330: {},
	331: {},
	333: {},
	334: {},
	335: {},
	336: {},
	337: {},
	338: {},
	339: {},
	340: {},
	351: {},
	352: { f: ba },
	353: { f: va },
	401: {},
	402: {},
	403: {},
	404: {},
	405: {},
	406: {},
	407: {},
	408: {},
	425: {},
	426: {},
	427: {},
	428: {},
	429: {},
	430: { f: jo },
	431: { f: ba },
	432: {},
	433: {},
	434: {},
	437: {},
	438: { f: Ko },
	439: { f: ba },
	440: { f: qo },
	441: {},
	442: { f: Da },
	443: {},
	444: { f: xa },
	445: {},
	446: {},
	448: { f: va },
	449: {
		f: so,
		r: 2
	},
	450: { f: va },
	512: { f: vo },
	513: { f: ns },
	515: { f: ko },
	516: { f: ho },
	517: { f: Oo },
	519: { f: is },
	520: { f: ao },
	523: {},
	545: { f: Ro },
	549: { f: co },
	566: {},
	574: { f: uo },
	638: { f: yo },
	659: {},
	1048: {},
	1054: { f: go },
	1084: {},
	1212: { f: Lo },
	2048: { f: Jo },
	2049: {},
	2050: {},
	2051: {},
	2052: {},
	2053: {},
	2054: {},
	2055: {},
	2056: {},
	2057: { f: Qa },
	2058: {},
	2059: {},
	2060: {},
	2061: {},
	2062: {},
	2063: {},
	2064: {},
	2066: {},
	2067: {},
	2128: {},
	2129: {},
	2130: {},
	2131: {},
	2132: {},
	2133: {},
	2134: {},
	2135: {},
	2136: {},
	2137: {},
	2138: {},
	2146: {},
	2147: { r: 12 },
	2148: {},
	2149: {},
	2150: {},
	2151: { f: va },
	2152: {},
	2154: {},
	2155: {},
	2156: {},
	2161: {},
	2162: {},
	2164: {},
	2165: {},
	2166: {},
	2167: {},
	2168: {},
	2169: {},
	2170: {},
	2171: {},
	2172: {
		f: Qo,
		r: 12
	},
	2173: {
		f: Tl,
		r: 12
	},
	2174: {},
	2175: {},
	2180: {},
	2181: {},
	2182: {},
	2183: {},
	2184: {},
	2185: {},
	2186: {},
	2187: {},
	2188: {
		f: ba,
		r: 12
	},
	2189: {},
	2190: { r: 12 },
	2191: {},
	2192: {},
	2194: {},
	2195: {},
	2196: {
		f: Io,
		r: 12
	},
	2197: {},
	2198: {
		f: yl,
		r: 12
	},
	2199: {},
	2200: {},
	2201: {},
	2202: {
		f: zo,
		r: 12
	},
	2203: { f: va },
	2204: {},
	2205: {},
	2206: {},
	2207: {},
	2211: { f: oo },
	2212: {},
	2213: {},
	2214: {},
	2215: {},
	4097: {},
	4098: { f: xm },
	4099: { f: Sm },
	4102: {},
	4103: {},
	4105: {},
	4106: {},
	4107: {},
	4108: {},
	4109: { f: Cm },
	4116: {},
	4117: { f: wm },
	4118: {},
	4119: { f: km },
	4120: { f: Am },
	4121: { f: jm },
	4122: { f: Mm },
	4123: { f: Nm },
	4124: {},
	4125: { f: Tm },
	4126: {},
	4127: {},
	4128: {},
	4129: {},
	4130: {},
	4132: {},
	4133: { f: Em },
	4134: { f: xa },
	4135: {},
	4146: {},
	4147: {},
	4148: {},
	4149: {},
	4154: {},
	4156: {},
	4157: {},
	4158: { f: Pm },
	4159: { f: Fm },
	4160: {},
	4161: {},
	4163: {},
	4164: { f: ts },
	4165: {},
	4166: {},
	4168: {},
	4170: {},
	4171: {},
	4174: {},
	4175: {},
	4176: {},
	4177: { f: Dm },
	4187: {},
	4188: { f: Xo },
	4189: {},
	4191: {},
	4192: {},
	4193: {},
	4194: {},
	4195: {},
	4196: {},
	4197: {},
	4198: {},
	4199: {},
	4200: {},
	0: { f: vo },
	1: {},
	2: { f: cs },
	3: { f: ss },
	4: { f: os },
	5: { f: us },
	7: { f: ls },
	8: {},
	9: { f: Qa },
	11: {},
	22: { f: xa },
	30: { f: _o },
	31: {},
	32: {},
	33: { f: Ro },
	36: {},
	37: { f: co },
	50: { f: ds },
	62: {},
	52: {},
	67: { f: wo },
	68: { f: xa },
	69: {},
	86: {},
	126: {},
	127: { f: as },
	135: {},
	136: {},
	137: {},
	143: { f: ps },
	145: {},
	148: {},
	149: {},
	150: {},
	169: {},
	171: {},
	188: {},
	191: {},
	192: {},
	194: {},
	195: {},
	214: { f: fs },
	223: {},
	234: {},
	354: {},
	421: {},
	518: { f: Zd },
	521: { f: Qa },
	536: { f: No },
	547: { f: Mo },
	561: {},
	579: { f: To },
	1030: { f: Zd },
	1033: { f: Qa },
	1091: { f: Eo },
	2157: {},
	2163: {},
	2177: {},
	2240: {},
	2241: {},
	2242: {},
	2243: {},
	2244: {},
	2245: {},
	2246: {},
	2247: {},
	2248: {},
	2249: {},
	2250: {},
	2251: {},
	2262: { r: 12 },
	101: {},
	102: {},
	105: {},
	106: {},
	107: {},
	109: {},
	112: {},
	114: {},
	29282: {}
};
function Hm(e, t, n, r) {
	var i = t;
	if (!isNaN(i)) {
		var a = r || (n || []).length || 0, o = e.next(4);
		o.write_shift(2, i), o.write_shift(2, a), a > 0 && or(n) && e.push(n);
	}
}
function Um(e, t) {
	var n = t || {}, r = n.dense == null ? D : n.dense, i = {};
	r && (i["!data"] = []), e = Rt(e, "<!--", "-->");
	var a = e.match(/<table/i);
	if (!a) throw Error("Invalid HTML: could not find <table>");
	var o = e.match(/<\/table/i), s = a.index, c = o && o.index || e.length, l = Nt(e.slice(s, c), /(:?<tr[^<>]*>)/i, "<tr>"), u = -1, d = 0, f = 0, p = 0, m = {
		s: {
			r: 1e7,
			c: 1e7
		},
		e: {
			r: 0,
			c: 0
		}
	}, h = [];
	for (s = 0; s < l.length; ++s) {
		var g = l[s].trim(), _ = g.slice(0, 3).toLowerCase();
		if (_ == "<tr") {
			if (++u, n.sheetRows && n.sheetRows <= u) {
				--u;
				break;
			}
			d = 0;
			continue;
		}
		if (!(_ != "<td" && _ != "<th")) {
			var v = g.split(/<\/t[dh]>/i);
			for (c = 0; c < v.length; ++c) {
				var y = v[c].trim();
				if (y.match(/<t[dh]/i)) {
					for (var b = y, x = 0; b.charAt(0) == "<" && (x = b.indexOf(">")) > -1;) b = b.slice(x + 1);
					for (var S = 0; S < h.length; ++S) {
						var C = h[S];
						C.s.c == d && C.s.r < u && u <= C.e.r && (d = C.e.c + 1, S = -1);
					}
					var w = X(y.slice(0, y.indexOf(">")));
					p = w.colspan ? +w.colspan : 1, ((f = +w.rowspan) > 1 || p > 1) && h.push({
						s: {
							r: u,
							c: d
						},
						e: {
							r: u + (f || 1) - 1,
							c: d + p - 1
						}
					});
					var T = w.t || w["data-t"] || "";
					if (!b.length) {
						d += p;
						continue;
					}
					if (b = Dn(b), m.s.r > u && (m.s.r = u), m.e.r < u && (m.e.r = u), m.s.c > d && (m.s.c = d), m.e.c < d && (m.e.c = d), !b.length) {
						d += p;
						continue;
					}
					var E = {
						t: "s",
						v: b
					};
					n.raw || !b.trim().length || T == "s" || (b === "TRUE" ? E = {
						t: "b",
						v: !0
					} : b === "FALSE" ? E = {
						t: "b",
						v: !1
					} : isNaN(wt(b)) ? isNaN(Mt(b).getDate()) ? b.charCodeAt(0) == 35 && Ii[b] != null && (E.t = "e", E.w = b, E.v = Ii[b]) : (E = {
						t: "d",
						v: bt(b)
					}, n.UTC === !1 && (E.v = Pt(E.v)), n.cellDates || (E = {
						t: "n",
						v: mt(E.v)
					}), E.z = n.dateNF || J[14]) : E = {
						t: "n",
						v: wt(b)
					}), E.cellText !== !1 && (E.w = b), r ? (i["!data"][u] || (i["!data"][u] = []), i["!data"][u][d] = E) : i[zr({
						r: u,
						c: d
					})] = E, d += p;
				}
			}
		}
	}
	return i["!ref"] = Vr(m), h.length && (i["!merges"] = h), i;
}
function Wm(e) {
	return _n(String(e).replace(/"/g, "'"));
}
function Gm(e) {
	return e && e.rgb ? "#" + String(e.rgb).slice(-6) : "";
}
function Km(e) {
	return e ? "'" + Wm(e).replace(/'/g, "\\'") + "'" : "";
}
function qm(e) {
	switch (e) {
		case "dashDot":
		case "dashDotDot":
		case "dashed":
		case "mediumDashed": return "dashed";
		case "dotted":
		case "hair": return "dotted";
		case "double": return "double";
		case "none": return "none";
		default: return "solid";
	}
}
function Jm(e) {
	switch (e) {
		case "medium":
		case "mediumDashDot":
		case "mediumDashDotDot":
		case "mediumDashed": return "2px";
		case "thick": return "3px";
		case "hair": return "1px";
		default: return "1px";
	}
}
function Ym(e, t, n) {
	if (!(!n || !n.style || n.style == "none")) {
		var r = Gm(n.color) || "#000000";
		e.push("border-" + t + ":" + Jm(n.style) + " " + qm(n.style) + " " + r);
	}
}
function Xm(e, t) {
	if (!t || !t.cellStyles || !e || !e.s) return "";
	var n = e.s, r = [], i = n.font || {};
	i.name && r.push("font-family:" + Km(i.name)), i.sz && r.push("font-size:" + i.sz + "pt"), i.bold && r.push("font-weight:bold"), i.italic && r.push("font-style:italic");
	var a = [];
	i.underline && a.push("underline"), i.strike && a.push("line-through"), a.length && r.push("text-decoration:" + a.join(" ")), i.color && Gm(i.color) && r.push("color:" + Gm(i.color));
	var o = n.fill || n, s = "";
	o.patternType != "none" && o.patternType != "gray125" && (s = Gm(o.fgColor) || Gm(o.bgColor)), s && r.push("background-color:" + s);
	var c = n.alignment || {};
	if (c.horizontal && r.push("text-align:" + c.horizontal), c.vertical && r.push("vertical-align:" + c.vertical), c.textRotation != null && c.textRotation !== 0) {
		var l = c.textRotation == 255 ? 90 : c.textRotation > 90 ? 90 - c.textRotation : c.textRotation;
		r.push("transform:rotate(" + l + "deg)"), r.push("transform-origin:center");
	}
	var u = n.border || {};
	return Ym(r, "left", u.left || u.start), Ym(r, "right", u.right || u.end), Ym(r, "top", u.top), Ym(r, "bottom", u.bottom), r.join(";");
}
function Zm(e, t, n, r, i) {
	if (!t || !e) return "";
	var a = e.s || {}, o = a.alignment || {}, s = [];
	if ((t.browserPixels || t.autoFit) && s.push("box-sizing:border-box;padding:0 2px;min-width:0"), o.wrapText ? s.push("white-space:pre-wrap;overflow-wrap:normal;word-break:normal") : (s.push("white-space:pre"), o.shrinkToFit || t.overflow == "clip" || t.overflow == "hidden" ? s.push("overflow:hidden;text-overflow:clip") : s.push("overflow:visible")), o.shrinkToFit && i && n != null) {
		for (var c = 0, l = r || 1, u = 0; u < l; ++u) c += Qm(i[n + u]);
		var d = zc(e, a, t);
		if (c > 0 && d > c) {
			var f = Math.max(.25, Math.min(1, c / d));
			s.push("font-size:" + Math.max(1, Ac(a) * f) + "pt");
		}
	}
	return s.join(";");
}
function Qm(e) {
	return Oc(e);
}
function $m(e) {
	return e ? e.hpx == null ? e.hpt == null ? 20 : Kc(e.hpt) : e.hpx : 20;
}
function eh(e, t, n, r) {
	for (var i = e["!merges"] || [], a = [], o = {}, s = e["!data"] != null, c = (e["!rows"] || [])[n], l = r && r._htmlCols || e["!cols"] || [], u = t.s.c; u <= t.e.c; ++u) {
		for (var d = 0, f = 0, p = 0; p < i.length; ++p) if (!(i[p].s.r > n || i[p].s.c > u) && !(i[p].e.r < n || i[p].e.c < u)) {
			if (i[p].s.r < n || i[p].s.c < u) {
				d = -1;
				break;
			}
			d = i[p].e.r - i[p].s.r + 1, f = i[p].e.c - i[p].s.c + 1;
			break;
		}
		if (!(d < 0)) {
			var m = Pr(u) + Ar(n), h = s ? (e["!data"][n] || [])[u] : e[m], g = h;
			if (h && h.t == "n" && h.v != null && !isFinite(h.v) && (h = isNaN(h.v) ? {
				t: "e",
				v: 36,
				w: Fi[36]
			} : {
				t: "e",
				v: 7,
				w: Fi[7]
			}, g = h), r.cellStyles) {
				var _ = {};
				l[u] && l[u].s && ff(_, l[u].s), c && c.s && ff(_, c.s), h && h.s && ff(_, h.s), lt(_).length && (g = h ? St(h) : { t: "z" }, g.s = _);
			}
			var v = h && h.v != null && (h.h || yn(h.w || (Gr(h), h.w) || "")) || "";
			o = {}, d > 1 && (o.rowspan = d), f > 1 && (o.colspan = f), r.editable ? v = "<span contenteditable=\"true\">" + v + "</span>" : h && (o["data-t"] = h && h.t || "z", h.v != null && (o["data-v"] = yn(h.v instanceof Date ? h.v.toISOString() : h.v)), h.z != null && (o["data-z"] = h.z), h.f != null && (o["data-f"] = yn(h.f)), h.l && (h.l.Target || "#").charAt(0) != "#" && (!r.sanitizeLinks || (h.l.Target || "").slice(0, 11).toLowerCase() != "javascript:") && (v = "<a href=\"" + yn(h.l.Target) + "\">" + v + "</a>"));
			var y = Xm(g, r), b = Zm(g, r, u, f, l);
			b && (y = y ? y + ";" + b : b), y && (o.style = y), o.id = (r.id || "sjs") + "-" + m, a.push(Nn("td", v, o));
		}
	}
	var x = {}, S = [];
	return c && (c.hidden && S.push("display:none"), r.browserPixels && S.push("height:" + $m(c) + "px")), S.length && (x.style = S.join(";")), Nn("tr", a.join(""), x);
}
var th = "<html><head><meta charset=\"utf-8\"/><title>SheetJS Table Export</title></head><body>", nh = "</body></html>";
function rh(e, t) {
	var n = Wt(e, "table");
	if (!n || n.length == 0) throw Error("Invalid HTML: could not find <table>");
	if (n.length == 1) {
		var r = Kr(Um(n[0], t), t);
		return r.bookType = "html", r;
	}
	var i = kg();
	return n.forEach(function(e, n) {
		Ag(i, Um(e, t), "Sheet" + (n + 1));
	}), i.bookType = "html", i;
}
var ih = 9525;
function ah(e, t, n) {
	for (var r = {
		left: 0,
		top: 0,
		width: 480,
		height: 288
	}, i = n && n._htmlCols || e["!cols"] || [], a = e["!rows"] || [], o = t && t.from || {
		col: 0,
		row: 0,
		colOff: 0,
		rowOff: 0
	}, s = t && t.to, c = 0; c < (o.col || 0); ++c) r.left += Qm(i[c]);
	for (var l = 0; l < (o.row || 0); ++l) r.top += $m(a[l]);
	if (r.left += (o.colOff || 0) / ih, r.top += (o.rowOff || 0) / ih, s) {
		var u = 0, d = 0;
		for (c = 0; c < (s.col || 0); ++c) u += Qm(i[c]);
		for (l = 0; l < (s.row || 0); ++l) d += $m(a[l]);
		u += (s.colOff || 0) / ih, d += (s.rowOff || 0) / ih, r.width = Math.max(1, u - r.left), r.height = Math.max(1, d - r.top);
	} else t && t.ext && (t.ext.cx && (r.width = t.ext.cx / ih), t.ext.cy && (r.height = t.ext.cy / ih));
	return r;
}
function oh(e) {
	return "position:absolute;left:" + Math.round(e.left) + "px;top:" + Math.round(e.top) + "px;width:" + Math.round(e.width) + "px;height:" + Math.round(e.height) + "px";
}
function sh(e) {
	return e ? e.val && e.val.values ? e.val.values : e.yVal && e.yVal.values ? e.yVal.values : e.data && e.data.length ? e.data : [] : [];
}
function ch(e) {
	return e ? e.cat && e.cat.values ? e.cat.values : e.xVal && e.xVal.values ? e.xVal.values : [] : [];
}
function lh(e, t, n) {
	var r = e && (e.model || e["!chart"] || e);
	if (!r) return "";
	var i = r.series || [], a = (r.type || "").replace(/Chart$/, ""), o = Math.max(160, Math.round(t || 480)), s = Math.max(120, Math.round(n || 288)), c = r.title || e.title || "", l = [
		"#4F81BD",
		"#C0504D",
		"#9BBB59",
		"#8064A2",
		"#4BACC6",
		"#F79646"
	], u = ["<svg class=\"sjs-chart-svg\" xmlns=\"http://www.w3.org/2000/svg\" width=\"" + o + "\" height=\"" + s + "\" viewBox=\"0 0 " + o + " " + s + "\">"];
	u.push("<rect x=\"0\" y=\"0\" width=\"" + o + "\" height=\"" + s + "\" fill=\"#fff\" stroke=\"#d0d7de\"/>"), c && u.push("<text x=\"" + o / 2 + "\" y=\"20\" text-anchor=\"middle\" font-family=\"Arial\" font-size=\"14\">" + yn(c) + "</text>");
	var d = c ? 34 : 16, f = 42, p = 14, m = 28, h = o - f - p, g = s - d - m, _ = [];
	i.forEach(function(e) {
		sh(e).forEach(function(e) {
			typeof e == "number" && isFinite(e) && _.push(e);
		});
	});
	var v = Math.max.apply(Math, _.concat([0])), y = Math.min.apply(Math, _.concat([0]));
	if (y > 0 && (y = 0), v == y && (v = y + 1), u.push("<line x1=\"" + f + "\" y1=\"" + (d + g) + "\" x2=\"" + (f + h) + "\" y2=\"" + (d + g) + "\" stroke=\"#444\"/>"), u.push("<line x1=\"" + f + "\" y1=\"" + d + "\" x2=\"" + f + "\" y2=\"" + (d + g) + "\" stroke=\"#444\"/>"), a == "pie" || a == "doughnut") {
		var b = sh(i[0] || {}), x = b.reduce(function(e, t) {
			return e + (typeof t == "number" ? Math.max(0, t) : 0);
		}, 0) || 1, S = o / 2, C = d + g / 2, w = Math.max(10, Math.min(h, g) / 2 - 8), T = -Math.PI / 2;
		return b.forEach(function(e, t) {
			var n = T + Math.max(0, +e || 0) / x * Math.PI * 2, r = S + w * Math.cos(T), i = C + w * Math.sin(T), a = S + w * Math.cos(n), o = C + w * Math.sin(n), s = +(n - T > Math.PI);
			u.push("<path d=\"M" + S + "," + C + " L" + r + "," + i + " A" + w + "," + w + " 0 " + s + ",1 " + a + "," + o + " Z\" fill=\"" + l[t % l.length] + "\"/>"), T = n;
		}), a == "doughnut" && u.push("<circle cx=\"" + S + "\" cy=\"" + C + "\" r=\"" + w * .45 + "\" fill=\"#fff\"/>"), u.push("</svg>"), u.join("");
	}
	var E = 0;
	if (i.forEach(function(e) {
		E = Math.max(E, sh(e).length);
	}), !E) return u.push("</svg>"), u.join("");
	var D = h / E;
	i.forEach(function(e, t) {
		var n = sh(e), r = l[t % l.length];
		if (a == "line" || a == "scatter" || a == "area") {
			var o = [];
			n.forEach(function(e, t) {
				if (!(typeof e != "number" || !isFinite(e))) {
					var n = f + D * (t + .5), r = d + g - (e - y) / (v - y) * g;
					o.push([n, r]);
				}
			}), a == "area" && o.length && u.push("<polygon points=\"" + [[o[0][0], d + g]].concat(o, [[o[o.length - 1][0], d + g]]).map(function(e) {
				return e[0] + "," + e[1];
			}).join(" ") + "\" fill=\"" + r + "\" opacity=\"0.35\"/>"), o.length && u.push("<polyline points=\"" + o.map(function(e) {
				return e[0] + "," + e[1];
			}).join(" ") + "\" fill=\"none\" stroke=\"" + r + "\" stroke-width=\"2\"/>"), o.forEach(function(e) {
				u.push("<circle cx=\"" + e[0] + "\" cy=\"" + e[1] + "\" r=\"2.5\" fill=\"" + r + "\"/>");
			});
		} else {
			var s = Math.max(1, D / Math.max(i.length, 1) * .72);
			n.forEach(function(e, n) {
				if (!(typeof e != "number" || !isFinite(e))) {
					var a = f + D * n + (D - s * i.length) / 2 + s * t, o = d + g - (e - y) / (v - y) * g, c = d + g - (0 - y) / (v - y) * g;
					u.push("<rect x=\"" + a + "\" y=\"" + Math.min(o, c) + "\" width=\"" + s + "\" height=\"" + Math.max(1, Math.abs(c - o)) + "\" fill=\"" + r + "\"/>");
				}
			});
		}
		e.name && u.push("<text x=\"" + (f + 8) + "\" y=\"" + (d + 14 + t * 14) + "\" font-family=\"Arial\" font-size=\"11\" fill=\"" + r + "\">" + yn(e.name) + "</text>");
	});
	var O = ch(i[0] || {});
	return O.slice(0, Math.min(O.length, E)).forEach(function(e, t) {
		t % Math.ceil(E / 8) == 0 && u.push("<text x=\"" + (f + D * (t + .5)) + "\" y=\"" + (d + g + 16) + "\" text-anchor=\"middle\" font-family=\"Arial\" font-size=\"10\">" + yn(String(e)) + "</text>");
	}), u.push("</svg>"), u.join("");
}
function uh(e, t) {
	var n = [], r = e["!drawings"] || {}, i = e["!charts"] || [];
	return t && t.drawings && r.images && r.images.forEach(function(r) {
		if (!(!r || !r.dataURI)) {
			var i = ah(e, r.anchor, t);
			n.push("<img class=\"sjs-drawing-image\" src=\"" + r.dataURI + "\" style=\"" + oh(i) + "\"/>");
		}
	}), t && t.charts && i.forEach(function(r) {
		var i = ah(e, r.anchor, t);
		n.push("<div class=\"sjs-chart\" style=\"" + oh(i) + "\">" + lh(r, i.width, i.height) + "</div>");
	}), n.length ? "<div class=\"sjs-drawing-layer\" style=\"position:absolute;left:0;top:0;pointer-events:none\">" + n.join("") + "</div>" : "";
}
function dh(e, t, n) {
	var r = [], i = {}, a = [];
	n && n.id && (i.id = n.id), n && (n.browserPixels || n.autoFit) && a.push("border-collapse:collapse;table-layout:fixed"), a.length && (i.style = a.join(";"));
	var o = Nn("table", "", i).replace(/<\/table>$/, ""), s = n && n._htmlCols || e["!cols"];
	if (n && (n.browserPixels || n.autoFit) && s) {
		r.push("<colgroup>");
		for (var c = t.s.c; c <= t.e.c; ++c) {
			var l = s[c], u = [];
			u.push("width:" + Qm(l) + "px"), l && l.hidden && u.push("display:none"), r.push(Nn("col", null, { style: u.join(";") }));
		}
		r.push("</colgroup>");
	}
	return o + r.join("");
}
function fh(e, t) {
	var n = {};
	if (t) for (var r in t) Object.prototype.hasOwnProperty.call(t, r) && (n[r] = t[r]);
	if (n.autoFit) {
		var i = { set: !1 };
		if (typeof n.autoFit == "object") for (r in n.autoFit) Object.prototype.hasOwnProperty.call(n.autoFit, r) && (i[r] = n.autoFit[r]);
		n.measureText && i.measureText == null && (i.measureText = n.measureText), n.canvas && i.canvas == null && (i.canvas = n.canvas), n._htmlCols = Hc(e, i), n.browserPixels == null && (n.browserPixels = !0);
	}
	var a = n.header == null ? th : n.header, o = n.footer == null ? nh : n.footer, s = [a], c = Br(e["!ref"] || "A1"), l = n.charts && e["!charts"] && e["!charts"].length || n.drawings && e["!drawings"];
	if (l && s.push("<div class=\"sjs-sheet\" style=\"position:relative;display:inline-block\">"), s.push(dh(e, c, n)), e["!ref"]) for (var u = c.s.r; u <= c.e.r; ++u) s.push(eh(e, c, u, n));
	return l ? (s.push("</table>"), s.push(uh(e, n)), s.push("</div>"), s.push(o)) : s.push("</table>" + o), s.join("");
}
function ph(e, t, n) {
	var r = n || {}, i = e["!data"] != null, a = 0, o = 0;
	if (r.origin != null) if (typeof r.origin == "number") a = r.origin;
	else {
		var s = typeof r.origin == "string" ? Rr(r.origin) : r.origin;
		a = s.r, o = s.c;
	}
	var c = {
		s: {
			r: 0,
			c: 0
		},
		e: {
			r: a,
			c: o
		}
	};
	if (e["!ref"]) {
		var l = Br(e["!ref"]);
		c.s.r = Math.min(c.s.r, l.s.r), c.s.c = Math.min(c.s.c, l.s.c), c.e.r = Math.max(c.e.r, l.e.r), c.e.c = Math.max(c.e.c, l.e.c), a == -1 && (c.e.r = a = l.e.r + 1);
	}
	var u = t.rows;
	if (!u) throw "Unsupported origin when " + t.tagName + " is not a TABLE";
	var d = Math.min(r.sheetRows || 1e7, u.length), f = [], p = 0, m = e["!rows"] || (e["!rows"] = []), h = 0, g = 0, _ = 0, v = 0, y = 0, b = 0;
	for (e["!cols"] || (e["!cols"] = []); h < u.length && g < d; ++h) {
		var x = u[h];
		if (gh(x)) {
			if (r.display) continue;
			m[g] = { hidden: !0 };
		}
		var S = x.cells;
		for (_ = v = 0; _ < S.length; ++_) {
			var C = S[_];
			if (!(r.display && gh(C))) {
				var w = C.hasAttribute("data-v") ? C.getAttribute("data-v") : C.hasAttribute("v") ? C.getAttribute("v") : Dn(C.innerHTML), T = C.getAttribute("data-z") || C.getAttribute("z"), E = C.hasAttribute("data-f") ? C.getAttribute("data-f") : C.hasAttribute("f") ? C.getAttribute("f") : null;
				for (p = 0; p < f.length; ++p) {
					var D = f[p];
					D.s.c == v + o && D.s.r < g + a && g + a <= D.e.r && (v = D.e.c + 1 - o, p = -1);
				}
				b = +C.getAttribute("colspan") || 1, ((y = +C.getAttribute("rowspan") || 1) > 1 || b > 1) && f.push({
					s: {
						r: g + a,
						c: v + o
					},
					e: {
						r: g + a + (y || 1) - 1,
						c: v + o + (b || 1) - 1
					}
				});
				var O = {
					t: "s",
					v: w
				}, k = C.getAttribute("data-t") || C.getAttribute("t") || "";
				w != null && (w.length == 0 ? O.t = k || "z" : r.raw || w.trim().length == 0 || k == "s" || (k == "e" && Fi[+w] ? O = {
					t: "e",
					v: +w,
					w: Fi[+w]
				} : w === "TRUE" ? O = {
					t: "b",
					v: !0
				} : w === "FALSE" ? O = {
					t: "b",
					v: !1
				} : isNaN(wt(w)) ? isNaN(Mt(w).getDate()) ? w.charCodeAt(0) == 35 && Ii[w] != null && (O = {
					t: "e",
					v: Ii[w],
					w
				}) : (O = {
					t: "d",
					v: bt(w)
				}, r.UTC && (O.v = Ft(O.v)), r.cellDates || (O = {
					t: "n",
					v: mt(O.v)
				}), O.z = r.dateNF || J[14]) : O = {
					t: "n",
					v: wt(w)
				})), O.z === void 0 && T != null && (O.z = T);
				var A = "", j = C.getElementsByTagName("A");
				if (j && j.length) for (var M = 0; M < j.length && !(j[M].hasAttribute("href") && (A = j[M].getAttribute("href"), A.charAt(0) != "#")); ++M);
				A && A.charAt(0) != "#" && A.slice(0, 11).toLowerCase() != "javascript:" && (O.l = { Target: A }), E != null && (O.f = E), i ? (e["!data"][g + a] || (e["!data"][g + a] = []), e["!data"][g + a][v + o] = O) : e[zr({
					c: v + o,
					r: g + a
				})] = O, c.e.c < v + o && (c.e.c = v + o), v += b;
			}
		}
		++g;
	}
	return f.length && (e["!merges"] = (e["!merges"] || []).concat(f)), c.e.r = Math.max(c.e.r, g - 1 + a), e["!ref"] = Vr(c), g >= d && (e["!fullref"] = Vr((c.e.r = u.length - h + g - 1 + a, c))), e;
}
function mh(e, t) {
	var n = t || {}, r = {};
	return n.dense && (r["!data"] = []), ph(r, e, t);
}
function hh(e, t) {
	return Kr(mh(e, t), t);
}
function gh(e) {
	var t = "", n = _h(e);
	return n && (t = n(e).getPropertyValue("display")), t || (t = e.style && e.style.display), t === "none";
}
function _h(e) {
	return e.ownerDocument.defaultView && typeof e.ownerDocument.defaultView.getComputedStyle == "function" ? e.ownerDocument.defaultView.getComputedStyle : typeof getComputedStyle == "function" ? getComputedStyle : null;
}
function vh(e) {
	return [mn(e.replace(/[\t\r\n]/g, " ").trim().replace(/ +/g, " ").replace(/<text:s\/>/g, " ").replace(/<text:s text:c="(\d+)"\/>/g, function(e, t) {
		return Array(parseInt(t, 10) + 1).join(" ");
	}).replace(/<text:tab[^<>]*\/>/g, "	").replace(/<text:line-break\/>/g, "\n").replace(/<[^<>]*>/g, ""))];
}
function yh(e, t, n) {
	var r = n || {}, i = Pn(e);
	Fn.lastIndex = 0, i = It(Rt(i, "<!--", "-->"));
	for (var a, o, s = "", c = "", l, u = 0, d = -1, f = ""; a = Fn.exec(i);) switch (a[3] = a[3].replace(/_[\s\S]*$/, "")) {
		case "number-style":
		case "currency-style":
		case "percentage-style":
		case "date-style":
		case "time-style":
		case "text-style":
			a[1] === "/" ? (o["truncate-on-overflow"] == "false" && (s.match(/h/) ? s = s.replace(/h+/, "[$&]") : s.match(/m/) ? s = s.replace(/m+/, "[$&]") : s.match(/s/) && (s = s.replace(/s+/, "[$&]"))), r[o.name] = s, s = "") : a[0].charAt(a[0].length - 2) !== "/" && (s = "", o = X(a[0], !1));
			break;
		case "boolean-style":
			a[1] === "/" ? (r[o.name] = "General", s = "") : a[0].charAt(a[0].length - 2) !== "/" && (s = "", o = X(a[0], !1));
			break;
		case "boolean":
			s += "General";
			break;
		case "text":
			a[1] === "/" ? (f = i.slice(d, Fn.lastIndex - a[0].length), f == "%" && o[0] == "<number:percentage-style" ? s += "%" : s += "\"" + f.replace(/"/g, "\"\"") + "\"") : a[0].charAt(a[0].length - 2) !== "/" && (d = Fn.lastIndex);
			break;
		case "day":
			switch (l = X(a[0], !1), l.style) {
				case "short":
					s += "d";
					break;
				case "long":
					s += "dd";
					break;
				default:
					s += "dd";
					break;
			}
			break;
		case "day-of-week":
			switch (l = X(a[0], !1), l.style) {
				case "short":
					s += "ddd";
					break;
				case "long":
					s += "dddd";
					break;
				default:
					s += "ddd";
					break;
			}
			break;
		case "era":
			switch (l = X(a[0], !1), l.style) {
				case "short":
					s += "ee";
					break;
				case "long":
					s += "eeee";
					break;
				default:
					s += "eeee";
					break;
			}
			break;
		case "hours":
			switch (l = X(a[0], !1), l.style) {
				case "short":
					s += "h";
					break;
				case "long":
					s += "hh";
					break;
				default:
					s += "hh";
					break;
			}
			break;
		case "minutes":
			switch (l = X(a[0], !1), l.style) {
				case "short":
					s += "m";
					break;
				case "long":
					s += "mm";
					break;
				default:
					s += "mm";
					break;
			}
			break;
		case "month":
			switch (l = X(a[0], !1), l.textual && (s += "mm"), l.style) {
				case "short":
					s += "m";
					break;
				case "long":
					s += "mm";
					break;
				default:
					s += "m";
					break;
			}
			break;
		case "seconds":
			switch (l = X(a[0], !1), l.style) {
				case "short":
					s += "s";
					break;
				case "long":
					s += "ss";
					break;
				default:
					s += "ss";
					break;
			}
			l["decimal-places"] && (s += "." + Ct("0", +l["decimal-places"]));
			break;
		case "year":
			switch (l = X(a[0], !1), l.style) {
				case "short":
					s += "yy";
					break;
				case "long":
					s += "yyyy";
					break;
				default:
					s += "yy";
					break;
			}
			break;
		case "am-pm":
			s += "AM/PM";
			break;
		case "week-of-year":
		case "quarter":
			console.error("Excel does not support ODS format token " + a[3]);
			break;
		case "fill-character":
			a[1] === "/" ? (f = i.slice(d, Fn.lastIndex - a[0].length), s += "\"" + f.replace(/"/g, "\"\"") + "\"*") : a[0].charAt(a[0].length - 2) !== "/" && (d = Fn.lastIndex);
			break;
		case "scientific-number":
			l = X(a[0], !1), s += "0." + Ct("0", +l["min-decimal-places"] || +l["decimal-places"] || 2) + Ct("?", l["decimal-places"] - +l["min-decimal-places"] || 0) + "E" + (Z(l["forced-exponent-sign"]) ? "+" : "") + Ct("0", +l["min-exponent-digits"] || 2);
			break;
		case "fraction":
			l = X(a[0], !1), +l["min-integer-digits"] ? s += Ct("0", +l["min-integer-digits"]) : s += "#", s += " ", s += Ct("?", +l["min-numerator-digits"] || 1), s += "/", +l["denominator-value"] ? s += l["denominator-value"] : s += Ct("?", +l["min-denominator-digits"] || 1);
			break;
		case "currency-symbol":
			a[1] === "/" ? s += "\"" + i.slice(d, Fn.lastIndex - a[0].length).replace(/"/g, "\"\"") + "\"" : a[0].charAt(a[0].length - 2) === "/" ? s += "$" : d = Fn.lastIndex;
			break;
		case "text-properties":
			switch (l = X(a[0], !1), (l.color || "").toLowerCase().replace("#", "")) {
				case "ff0000":
				case "red":
					s = "[Red]" + s;
					break;
			}
			break;
		case "text-content":
			s += "@";
			break;
		case "map":
			l = X(a[0], !1), mn(l.condition) == "value()>=0" ? s = r[l["apply-style-name"]] + ";" + s : t && t.WTF && console.error("ODS number format may be incorrect: " + l.condition);
			break;
		case "number":
			if (a[1] === "/") break;
			l = X(a[0], !1), c = "", c += Ct("0", +l["min-integer-digits"] || 1), Z(l.grouping) && (c = Se(Ct("#", Math.max(0, 4 - c.length)) + c)), (+l["min-decimal-places"] || +l["decimal-places"]) && (c += "."), +l["min-decimal-places"] && (c += Ct("0", +l["min-decimal-places"] || 1)), l["decimal-places"] - (+l["min-decimal-places"] || 0) && (c += Ct("0", l["decimal-places"] - (+l["min-decimal-places"] || 0))), s += c;
			break;
		case "embedded-text":
			a[1] === "/" ? u == 0 ? s += "\"" + i.slice(d, Fn.lastIndex - a[0].length).replace(/"/g, "\"\"") + "\"" : s = s.slice(0, u) + "\"" + i.slice(d, Fn.lastIndex - a[0].length).replace(/"/g, "\"\"") + "\"" + s.slice(u) : a[0].charAt(a[0].length - 2) !== "/" && (d = Fn.lastIndex, u = -+X(a[0], !1).position || 0);
			break;
	}
	return r;
}
function bh(e, t, n) {
	var r = t || {};
	D != null && r.dense == null && (r.dense = D);
	var i = Pn(e), a = [], o, s, c, l = "", u = 0, d, f, p = {}, m = [], h = {};
	r.dense && (h["!data"] = []);
	var g, _, v = { value: "" }, y = {}, b = "", x = 0, S, C = "", w = 0, T = [], E = [], O = -1, k = -1, A = {
		s: {
			r: 1e6,
			c: 1e7
		},
		e: {
			r: 0,
			c: 0
		}
	}, j = 0, M = n || {}, N = {}, P = {}, F = [], I = {}, L = 0, R = 0, z = [], B = 1, V = 1, H = [], U = {
		Names: [],
		WBProps: {},
		Sheets: []
	}, W = {}, ee = ["", ""], te = [], ne = {}, re = "", G = 0, ie = !1, ae = !1, K = 0;
	for (Fn.lastIndex = 0, i = It(Rt(i, "<!--", "-->")); g = Fn.exec(i);) switch (g[3] = g[3].replace(/_[\s\S]*$/, "")) {
		case "table":
		case "工作表":
			g[1] === "/" ? (A.e.c >= A.s.c && A.e.r >= A.s.r ? h["!ref"] = Vr(A) : h["!ref"] = "A1:A1", r.sheetRows > 0 && r.sheetRows <= A.e.r && (h["!fullref"] = h["!ref"], A.e.r = r.sheetRows - 1, h["!ref"] = Vr(A)), F.length && (h["!merges"] = F), z.length && (h["!rows"] = z), d.name = d.名称 || d.name, typeof JSON < "u" && JSON.stringify(d), m.push(d.name), p[d.name] = h, U.Sheets.push({ Hidden: P[d["style-name"]] && P[d["style-name"]].display ? +!Z(P[d["style-name"]].display) : 0 }), ae = !1) : g[0].charAt(g[0].length - 2) !== "/" && (d = X(g[0], !1), O = k = -1, A.s.r = A.s.c = 1e7, A.e.r = A.e.c = 0, h = {}, r.dense && (h["!data"] = []), F = [], z = [], ae = !0);
			break;
		case "table-row-group":
			g[1] === "/" ? --j : ++j;
			break;
		case "table-row":
		case "行":
			if (g[1] === "/") {
				O += B, B = 1;
				break;
			}
			if (f = X(g[0], !1), f.行号 ? O = f.行号 - 1 : O == -1 && (O = 0), B = +f["number-rows-repeated"] || 1, B < 10) for (K = 0; K < B; ++K) j > 0 && (z[O + K] = { level: j });
			k = -1;
			break;
		case "covered-table-cell":
			if (g[1] !== "/") if (++k, v = X(g[0], !1), V = parseInt(v["number-columns-repeated"] || "1", 10) || 1, r.sheetStubs) {
				for (; V-- > 0;) r.dense ? (h["!data"][O] || (h["!data"][O] = []), h["!data"][O][k] = { t: "z" }) : h[zr({
					r: O,
					c: k
				})] = { t: "z" }, ++k;
				--k;
			} else k += V - 1;
			b = "", T = [];
			break;
		case "table-cell":
		case "数据":
			if (g[0].charAt(g[0].length - 2) === "/") ++k, v = X(g[0], !1), V = parseInt(v["number-columns-repeated"] || "1", 10) || 1, _ = {
				t: "z",
				v: null
			}, v.formula && r.cellFormula != 0 && (_.f = sf(mn(v.formula))), v["style-name"] && N[v["style-name"]] && (_.z = N[v["style-name"]]), (v.数据类型 || v["value-type"]) == "string" && (_.t = "s", _.v = mn(v["string-value"] || ""), r.dense ? (h["!data"][O] || (h["!data"][O] = []), h["!data"][O][k] = _) : h[Pr(k) + Ar(O)] = _), k += V - 1;
			else if (g[1] !== "/") {
				++k, b = C = "", x = w = 0, T = [], E = [], V = 1;
				var oe = B ? O + B - 1 : O;
				if (k > A.e.c && (A.e.c = k), k < A.s.c && (A.s.c = k), O < A.s.r && (A.s.r = O), oe > A.e.r && (A.e.r = oe), v = X(g[0], !1), y = un(g[0], !0), te = [], ne = {}, _ = {
					t: v.数据类型 || v["value-type"],
					v: null
				}, v["style-name"] && N[v["style-name"]] && (_.z = N[v["style-name"]]), r.cellFormula) if (v.formula && (v.formula = mn(v.formula)), v["number-matrix-columns-spanned"] && v["number-matrix-rows-spanned"] && (L = parseInt(v["number-matrix-rows-spanned"], 10) || 0, R = parseInt(v["number-matrix-columns-spanned"], 10) || 0, I = {
					s: {
						r: O,
						c: k
					},
					e: {
						r: O + L - 1,
						c: k + R - 1
					}
				}, _.F = Vr(I), H.push([I, _.F])), v.formula) _.f = sf(v.formula);
				else for (K = 0; K < H.length; ++K) O >= H[K][0].s.r && O <= H[K][0].e.r && k >= H[K][0].s.c && k <= H[K][0].e.c && (_.F = H[K][1]);
				switch ((v["number-columns-spanned"] || v["number-rows-spanned"]) && (L = parseInt(v["number-rows-spanned"] || "1", 10) || 1, R = parseInt(v["number-columns-spanned"] || "1", 10) || 1, L * R > 1 && (I = {
					s: {
						r: O,
						c: k
					},
					e: {
						r: O + L - 1,
						c: k + R - 1
					}
				}, F.push(I))), v["number-columns-repeated"] && (V = parseInt(v["number-columns-repeated"], 10)), _.t) {
					case "boolean":
						_.t = "b", _.v = Z(v["boolean-value"]) || +v["boolean-value"] >= 1;
						break;
					case "float":
						_.t = "n", _.v = parseFloat(v.value), r.cellDates && _.z && Ge(_.z) && (_.v = ht(_.v + (U.WBProps.date1904 ? 1462 : 0)), _.t = typeof _.v == "number" ? "n" : "d");
						break;
					case "percentage":
						_.t = "n", _.v = parseFloat(v.value);
						break;
					case "currency":
						_.t = "n", _.v = parseFloat(v.value);
						break;
					case "date":
						_.t = "d", _.v = bt(v["date-value"], U.WBProps.date1904), r.cellDates || (_.t = "n", _.v = mt(_.v, U.WBProps.date1904)), _.z || (_.z = "m/d/yy");
						break;
					case "time":
						_.t = "n", _.v = gt(v["time-value"]) / 86400, r.cellDates && (_.v = ht(_.v), _.t = typeof _.v == "number" ? "n" : "d"), _.z || (_.z = "HH:MM:SS");
						break;
					case "number":
						_.t = "n", _.v = parseFloat(v.数据数值);
						break;
					default: if (_.t === "string" || _.t === "text" || !_.t) _.t = "s", v["string-value"] != null && (b = mn(v["string-value"]), T = []);
					else throw Error("Unsupported value type " + _.t);
				}
			} else {
				if (ie = !1, y["calcext:value-type"] == "error" && Ii[b] != null && (_.t = "e", _.w = b, _.v = Ii[b]), _.t === "s" && (_.v = b || "", T.length && (_.R = T), ie = x == 0), W.Target && (_.l = W), te.length > 0 && (_.c = te, te = []), b && r.cellText !== !1 && (_.w = b), ie && (_.t = "z", delete _.v), (!ie || r.sheetStubs) && !(r.sheetRows && r.sheetRows <= O)) for (var q = 0; q < B; ++q) {
					if (V = parseInt(v["number-columns-repeated"] || "1", 10), r.dense) for (h["!data"][O + q] || (h["!data"][O + q] = []), h["!data"][O + q][k] = q == 0 ? _ : St(_); --V > 0;) h["!data"][O + q][k + V] = St(_);
					else for (h[zr({
						r: O + q,
						c: k
					})] = _; --V > 0;) h[zr({
						r: O + q,
						c: k + V
					})] = St(_);
					A.e.c <= k && (A.e.c = k);
				}
				V = parseInt(v["number-columns-repeated"] || "1", 10), k += V - 1, V = 0, _ = {}, b = "", T = [];
			}
			W = {};
			break;
		case "document":
		case "document-content":
		case "电子表格文档":
		case "spreadsheet":
		case "主体":
		case "scripts":
		case "styles":
		case "font-face-decls":
		case "master-styles":
			if (g[1] === "/") {
				if ((o = a.pop())[0] !== g[3]) throw "Bad state: " + o;
			} else g[0].charAt(g[0].length - 2) !== "/" && a.push([g[3], !0]);
			break;
		case "annotation":
			if (g[1] === "/") {
				if ((o = a.pop())[0] !== g[3]) throw "Bad state: " + o;
				ne.t = b, T.length && (ne.R = T), ne.a = re, te.push(ne), b = C, x = w, T = E;
			} else if (g[0].charAt(g[0].length - 2) !== "/") {
				a.push([g[3], !1]);
				var se = X(g[0], !0);
				se.display && Z(se.display) || (te.hidden = !0), C = b, w = x, E = T, b = "", x = 0, T = [];
			}
			re = "", G = 0;
			break;
		case "creator":
			g[1] === "/" ? re = i.slice(G, g.index) : G = g.index + g[0].length;
			break;
		case "meta":
		case "元数据":
		case "settings":
		case "config-item-set":
		case "config-item-map-indexed":
		case "config-item-map-entry":
		case "config-item-map-named":
		case "shapes":
		case "frame":
		case "text-box":
		case "image":
		case "data-pilot-tables":
		case "list-style":
		case "form":
		case "dde-links":
		case "event-listeners":
		case "chart":
			if (g[1] === "/") {
				if ((o = a.pop())[0] !== g[3]) throw "Bad state: " + o;
			} else g[0].charAt(g[0].length - 2) !== "/" && a.push([g[3], !1]);
			b = "", x = 0, T = [];
			break;
		case "scientific-number":
		case "currency-symbol":
		case "fill-character": break;
		case "text-style":
		case "boolean-style":
		case "number-style":
		case "currency-style":
		case "percentage-style":
		case "date-style":
		case "time-style":
			if (g[1] === "/") {
				var ce = Fn.lastIndex;
				yh(i.slice(c, Fn.lastIndex), t, M), Fn.lastIndex = ce;
			} else g[0].charAt(g[0].length - 2) !== "/" && (c = Fn.lastIndex - g[0].length);
			break;
		case "script": break;
		case "libraries": break;
		case "automatic-styles": break;
		case "default-style":
		case "page-layout": break;
		case "style":
			var J = X(g[0], !1);
			J.family == "table-cell" && M[J["data-style-name"]] ? N[J.name] = M[J["data-style-name"]] : J.family == "table" && (P[J.name] = J);
			break;
		case "map": break;
		case "font-face": break;
		case "paragraph-properties": break;
		case "table-properties":
			var le = X(g[0], !1);
			J && J.family == "table" && (J.display = le.display);
			break;
		case "table-column-properties": break;
		case "table-row-properties": break;
		case "table-cell-properties": break;
		case "number": break;
		case "fraction": break;
		case "day":
		case "month":
		case "year":
		case "era":
		case "day-of-week":
		case "week-of-year":
		case "quarter":
		case "hours":
		case "minutes":
		case "seconds":
		case "am-pm": break;
		case "boolean": break;
		case "text":
			if (g[0].slice(-2) === "/>") break;
			if (g[1] === "/") switch (a[a.length - 1][0]) {
				case "number-style":
				case "date-style":
				case "time-style":
					l += i.slice(u, g.index);
					break;
			}
			else u = g.index + g[0].length;
			break;
		case "named-range":
			s = X(g[0], !1), ee = cf(s["cell-range-address"]);
			var ue = {
				Name: s.name,
				Ref: ee[0] + "!" + ee[1]
			};
			ae && (ue.Sheet = m.length), U.Names.push(ue);
			break;
		case "text-content": break;
		case "text-properties": break;
		case "embedded-text": break;
		case "body":
		case "电子表格": break;
		case "forms": break;
		case "table-column": break;
		case "table-header-rows": break;
		case "table-rows": break;
		case "table-column-group": break;
		case "table-header-columns": break;
		case "table-columns": break;
		case "null-date":
			switch (s = X(g[0], !1), s["date-value"]) {
				case "1904-01-01":
					U.WBProps.date1904 = !0;
					break;
			}
			break;
		case "graphic-properties": break;
		case "calculation-settings": break;
		case "named-expressions": break;
		case "label-range": break;
		case "label-ranges": break;
		case "named-expression": break;
		case "sort": break;
		case "sort-by": break;
		case "sort-groups": break;
		case "tab": break;
		case "line-break": break;
		case "span": break;
		case "p":
		case "文本串":
			if (["master-styles"].indexOf(a[a.length - 1][0]) > -1) break;
			if (g[1] === "/" && (!v || !v["string-value"])) {
				var de = vh(i.slice(x, g.index), S);
				b = (b.length > 0 ? b + "\n" : "") + de[0];
			} else g[0].slice(-2) == "/>" ? b += "\n" : (S = X(g[0], !1), x = g.index + g[0].length);
			break;
		case "s": break;
		case "database-range":
			if (g[1] === "/") break;
			try {
				ee = cf(X(g[0])["target-range-address"]), p[ee[0]]["!autofilter"] = { ref: ee[1] };
			} catch {}
			break;
		case "date": break;
		case "object": break;
		case "title":
		case "标题": break;
		case "desc": break;
		case "binary-data": break;
		case "table-source": break;
		case "scenario": break;
		case "iteration": break;
		case "content-validations": break;
		case "content-validation": break;
		case "help-message": break;
		case "error-message": break;
		case "database-ranges": break;
		case "filter": break;
		case "filter-and": break;
		case "filter-or": break;
		case "filter-condition": break;
		case "filter-set-item": break;
		case "list-level-style-bullet": break;
		case "list-level-style-number": break;
		case "list-level-properties": break;
		case "sender-firstname":
		case "sender-lastname":
		case "sender-initials":
		case "sender-title":
		case "sender-position":
		case "sender-email":
		case "sender-phone-private":
		case "sender-fax":
		case "sender-company":
		case "sender-phone-work":
		case "sender-street":
		case "sender-city":
		case "sender-postal-code":
		case "sender-country":
		case "sender-state-or-province":
		case "author-name":
		case "author-initials":
		case "chapter":
		case "file-name":
		case "template-name":
		case "sheet-name": break;
		case "event-listener": break;
		case "initial-creator":
		case "creation-date":
		case "print-date":
		case "generator":
		case "document-statistic":
		case "user-defined":
		case "editing-duration":
		case "editing-cycles": break;
		case "config-item": break;
		case "page-number": break;
		case "page-count": break;
		case "time": break;
		case "cell-range-source": break;
		case "detective": break;
		case "operation": break;
		case "highlighted-range": break;
		case "data-pilot-table":
		case "source-cell-range":
		case "source-service":
		case "data-pilot-field":
		case "data-pilot-level":
		case "data-pilot-subtotals":
		case "data-pilot-subtotal":
		case "data-pilot-members":
		case "data-pilot-member":
		case "data-pilot-display-info":
		case "data-pilot-sort-info":
		case "data-pilot-layout-info":
		case "data-pilot-field-reference":
		case "data-pilot-groups":
		case "data-pilot-group":
		case "data-pilot-group-member": break;
		case "rect": break;
		case "dde-connection-decls":
		case "dde-connection-decl":
		case "dde-link":
		case "dde-source": break;
		case "properties": break;
		case "property": break;
		case "a":
			if (g[1] !== "/") {
				if (W = X(g[0], !1), !W.href) break;
				W.Target = mn(W.href), delete W.href, W.Target.charAt(0) == "#" && W.Target.indexOf(".") > -1 ? (ee = cf(W.Target.slice(1)), W.Target = "#" + ee[0] + "!" + ee[1]) : W.Target.match(/^\.\.[\\\/]/) && (W.Target = W.Target.slice(3)), W.title && (W.Tooltip = mn(W.title), delete W.title);
			}
			break;
		case "table-protection": break;
		case "data-pilot-grand-total": break;
		case "office-document-common-attrs": break;
		default: switch (g[2]) {
			case "dc:":
			case "calcext:":
			case "loext:":
			case "ooo:":
			case "chartooo:":
			case "draw:":
			case "style:":
			case "chart:":
			case "form:":
			case "uof:":
			case "表:":
			case "字:": break;
			default: if (r.WTF) throw Error(g);
		}
	}
	var fe = {
		Sheets: p,
		SheetNames: m,
		Workbook: U
	};
	return r.bookSheets && delete fe.Sheets, fe;
}
function xh(e, t) {
	t = t || {}, Jt(e, "META-INF/manifest.xml") && Gi(Xt(e, "META-INF/manifest.xml"), t);
	var n = Zt(e, "styles.xml"), r = n && yh(Tn(n), t), i = Zt(e, "content.xml");
	if (!i) throw Error("Missing content.xml in ODS / UOF file");
	var a = bh(Tn(i), t, r);
	return Jt(e, "meta.xml") && (a.Props = qi(Xt(e, "meta.xml"))), a.bookType = "ods", a;
}
function Sh(e, t) {
	var n = bh(e, t);
	return n.bookType = "fods", n;
}
var Ch = function() {
	try {
		return typeof Uint8Array > "u" || Uint8Array.prototype.subarray === void 0 ? "slice" : typeof Buffer < "u" ? Buffer.prototype.subarray === void 0 ? "slice" : (typeof Buffer.from == "function" ? Buffer.from([72, 62]) : new Buffer([72, 62])) instanceof Uint8Array ? "subarray" : "slice" : "subarray";
	} catch {
		return "slice";
	}
}();
function wh(e) {
	return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function Th(e) {
	return typeof TextDecoder < "u" ? new TextDecoder().decode(e) : Tn(z(e));
}
function Eh(e) {
	for (var t = 0, n = 0; n < e.length; ++n) t += e[n].length;
	var r = new Uint8Array(t), i = 0;
	for (n = 0; n < e.length; ++n) {
		var a = e[n], o = a.length;
		if (o < 250) for (var s = 0; s < o; ++s) r[i++] = a[s];
		else r.set(a, i), i += o;
	}
	return r;
}
function Dh(e) {
	return e -= e >> 1 & 1431655765, e = (e & 858993459) + (e >> 2 & 858993459), (e + (e >> 4) & 252645135) * 16843009 >>> 24;
}
function Oh(e, t) {
	for (var n = (e[t + 15] & 127) << 7 | e[t + 14] >> 1, r = e[t + 14] & 1, i = t + 13; i >= t; --i) r = r * 256 + e[i];
	return (e[t + 15] & 128 ? -r : r) * 10 ** (n - 6176);
}
function kh(e, t) {
	var n = t.l, r = e[n] & 127;
	varint: if (e[n++] >= 128 && (r |= (e[n] & 127) << 7, e[n++] < 128 || (r |= (e[n] & 127) << 14, e[n++] < 128) || (r |= (e[n] & 127) << 21, e[n++] < 128) || (r += (e[n] & 127) * 2 ** 28, ++n, e[n++] < 128) || (r += (e[n] & 127) * 2 ** 35, ++n, e[n++] < 128) || (r += (e[n] & 127) * 2 ** 42, ++n, e[n++] < 128))) break varint;
	return t.l = n, r;
}
function Ah(e) {
	var t = 0, n = e[t] & 127;
	return e[t++] < 128 || (n |= (e[t] & 127) << 7, e[t++] < 128) || (n |= (e[t] & 127) << 14, e[t++] < 128) || (n |= (e[t] & 127) << 21, e[t++] < 128) || (n |= (e[t] & 15) << 28), n;
}
function jh(e) {
	for (var t = [], n = { l: 0 }; n.l < e.length;) {
		var r = n.l, i = kh(e, n), a = i & 7;
		i = i / 8 | 0;
		var o, s = n.l;
		switch (a) {
			case 0:
				for (; e[s++] >= 128;);
				o = e[Ch](n.l, s), n.l = s;
				break;
			case 1:
				o = e[Ch](s, s + 8), n.l = s + 8;
				break;
			case 2:
				var c = kh(e, n);
				o = e[Ch](n.l, n.l + c), n.l += c;
				break;
			case 5:
				o = e[Ch](s, s + 4), n.l = s + 4;
				break;
			default: throw Error(`PB Type ${a} for Field ${i} at offset ${r}`);
		}
		var l = {
			data: o,
			type: a
		};
		t[i] == null && (t[i] = []), t[i].push(l);
	}
	return t;
}
function Mh(e, t) {
	return (e == null ? void 0 : e.map(function(e) {
		return t(e.data);
	})) || [];
}
function Nh(e) {
	for (var t, n = [], r = { l: 0 }; r.l < e.length;) {
		var i = kh(e, r), a = jh(e[Ch](r.l, r.l + i));
		r.l += i;
		var o = {
			id: Ah(a[1][0].data),
			messages: []
		};
		a[2].forEach(function(t) {
			var n = jh(t.data), i = Ah(n[3][0].data);
			o.messages.push({
				meta: n,
				data: e[Ch](r.l, r.l + i)
			}), r.l += i;
		}), (t = a[3]) != null && t[0] && (o.merge = Ah(a[3][0].data) >>> 0 > 0), n.push(o);
	}
	return n;
}
function Ph(e, t) {
	if (e != 0) throw Error(`Unexpected Snappy chunk type ${e}`);
	for (var n = { l: 0 }, r = kh(t, n), i = [], a = n.l; a < t.length;) {
		var o = t[a] & 3;
		if (o == 0) {
			var s = t[a++] >> 2;
			if (s < 60) ++s;
			else {
				var c = s - 59;
				s = t[a], c > 1 && (s |= t[a + 1] << 8), c > 2 && (s |= t[a + 2] << 16), c > 3 && (s |= t[a + 3] << 24), s >>>= 0, s++, a += c;
			}
			i.push(t[Ch](a, a + s)), a += s;
			continue;
		} else {
			var l = 0, u = 0;
			if (o == 1 ? (u = (t[a] >> 2 & 7) + 4, l = (t[a++] & 224) << 3, l |= t[a++]) : (u = (t[a++] >> 2) + 1, o == 2 ? (l = t[a] | t[a + 1] << 8, a += 2) : (l = (t[a] | t[a + 1] << 8 | t[a + 2] << 16 | t[a + 3] << 24) >>> 0, a += 4)), l == 0) throw Error("Invalid offset 0");
			for (var d = i.length - 1, f = l; d >= 0 && f >= i[d].length;) f -= i[d].length, --d;
			if (d < 0) if (f == 0) f = i[d = 0].length;
			else throw Error("Invalid offset beyond length");
			if (u < f) i.push(i[d][Ch](i[d].length - f, i[d].length - f + u));
			else {
				for (f > 0 && (i.push(i[d][Ch](i[d].length - f)), u -= f), ++d; u >= i[d].length;) i.push(i[d]), u -= i[d].length, ++d;
				u && i.push(i[d][Ch](0, u));
			}
			i.length > 25 && (i = [Eh(i)]);
		}
	}
	for (var p = 0, m = 0; m < i.length; ++m) p += i[m].length;
	if (p != r) throw Error(`Unexpected length: ${p} != ${r}`);
	return i;
}
function Fh(e) {
	Array.isArray(e) && (e = new Uint8Array(e));
	for (var t = [], n = 0; n < e.length;) {
		var r = e[n++], i = e[n] | e[n + 1] << 8 | e[n + 2] << 16;
		n += 3, t.push.apply(t, Ph(r, e[Ch](n, n + i))), n += i;
	}
	if (n !== e.length) throw Error("data is not a valid framed stream!");
	return t.length == 1 ? t[0] : Eh(t);
}
var Ih = function() {
	return {
		sst: [],
		rsst: [],
		ofmt: [],
		nfmt: [],
		fmla: [],
		ferr: [],
		cmnt: []
	};
};
function Lh(e, t, n, r, i) {
	var a, o, s, c, l = t & 255, u = t >> 8, d = (u >= 5 ? i : r) || [];
	dur: if (n & (u > 4 ? 8 : 4) && e.t == "n" && l == 7) {
		var f = (a = d[7]) != null && a[0] ? Ah(d[7][0].data) : -1;
		if (f == -1) break dur;
		var p = (o = d[15]) != null && o[0] ? Ah(d[15][0].data) : -1, m = (s = d[16]) != null && s[0] ? Ah(d[16][0].data) : -1, h = (c = d[40]) != null && c[0] ? Ah(d[40][0].data) : -1, g = e.v, _ = g;
		autodur: if (h) {
			if (g == 0) {
				p = m = 2;
				break autodur;
			}
			p = g >= 604800 ? 1 : g >= 86400 ? 2 : g >= 3600 ? 4 : g >= 60 ? 8 : g >= 1 ? 16 : 32, Math.floor(g) == g ? g % 60 ? m = 16 : g % 3600 ? m = 8 : g % 86400 ? m = 4 : g % 604800 && (m = 2) : m = 32, m < p && (m = p);
		}
		if (p == -1 || m == -1) break dur;
		var v = [], y = [];
		p == 1 && (_ = g / 604800, m == 1 ? y.push("d\"d\"") : (_ |= 0, g -= 604800 * _), v.push(_ + (f == 2 ? " week" + (_ == 1 ? "" : "s") : f == 1 ? "w" : ""))), p <= 2 && m >= 2 && (_ = g / 86400, m > 2 && (_ |= 0, g -= 86400 * _), y.push("d\"d\""), v.push(_ + (f == 2 ? " day" + (_ == 1 ? "" : "s") : f == 1 ? "d" : ""))), p <= 4 && m >= 4 && (_ = g / 3600, m > 4 && (_ |= 0, g -= 3600 * _), y.push((p >= 4 ? "[h]" : "h") + "\"h\""), v.push(_ + (f == 2 ? " hour" + (_ == 1 ? "" : "s") : f == 1 ? "h" : ""))), p <= 8 && m >= 8 && (_ = g / 60, m > 8 && (_ |= 0, g -= 60 * _), y.push((p >= 8 ? "[m]" : "m") + "\"m\""), f == 0 ? v.push((p == 8 && m == 8 || _ >= 10 ? "" : "0") + _) : v.push(_ + (f == 2 ? " minute" + (_ == 1 ? "" : "s") : f == 1 ? "m" : ""))), p <= 16 && m >= 16 && (_ = g, m > 16 && (_ |= 0, g -= _), y.push((p >= 16 ? "[s]" : "s") + "\"s\""), f == 0 ? v.push((m == 16 && p == 16 || _ >= 10 ? "" : "0") + _) : v.push(_ + (f == 2 ? " second" + (_ == 1 ? "" : "s") : f == 1 ? "s" : ""))), m >= 32 && (_ = Math.round(1e3 * g), p < 32 && y.push(".000\"ms\""), f == 0 ? v.push((_ >= 100 ? "" : _ >= 10 ? "0" : "00") + _) : v.push(_ + (f == 2 ? " millisecond" + (_ == 1 ? "" : "s") : f == 1 ? "ms" : ""))), e.w = v.join(f == 0 ? ":" : " "), e.z = y.join(f == 0 ? "\":\"" : " "), f == 0 && (e.w = e.w.replace(/:(\d\d\d)$/, ".$1"));
	}
}
function Rh(e, t, n, r) {
	var i = wh(e), a = i.getUint32(4, !0), o = -1, s = -1, c = -1, l = NaN, u = 0, d = new Date(Date.UTC(2001, 0, 1)), f = n > 1 ? 12 : 8;
	a & 2 && (c = i.getUint32(f, !0), f += 4), f += Dh(a & (n > 1 ? 3468 : 396)) * 4, a & 512 && (o = i.getUint32(f, !0), f += 4), f += Dh(a & (n > 1 ? 12288 : 4096)) * 4, a & 16 && (s = i.getUint32(f, !0), f += 4), a & 32 && (l = i.getFloat64(f, !0), f += 8), a & 64 && (d.setTime(d.getTime() + (u = i.getFloat64(f, !0)) * 1e3), f += 8), n > 1 && (a = i.getUint32(8, !0) >>> 16, a & 255 && (c == -1 && (c = i.getUint32(f, !0)), f += 4));
	var p, m = e[n >= 4 ? 1 : 2];
	switch (m) {
		case 0: return;
		case 2:
			p = {
				t: "n",
				v: l
			};
			break;
		case 3:
			p = {
				t: "s",
				v: t.sst[s]
			};
			break;
		case 5:
			p = r != null && r.cellDates ? {
				t: "d",
				v: d
			} : {
				t: "n",
				v: u / 86400 + 35430,
				z: J[14]
			};
			break;
		case 6:
			p = {
				t: "b",
				v: l > 0
			};
			break;
		case 7:
			p = {
				t: "n",
				v: l
			};
			break;
		case 8:
			p = {
				t: "e",
				v: 0
			};
			break;
		case 9:
			if (o > -1) {
				var h = t.rsst[o];
				p = {
					t: "s",
					v: h.v
				}, h.l && (p.l = { Target: h.l });
			} else throw Error(`Unsupported cell type ${e[Ch](0, 4)}`);
			break;
		default: throw Error(`Unsupported cell type ${e[Ch](0, 4)}`);
	}
	return c > -1 && Lh(p, m | n << 8, a, t.ofmt[c], t.nfmt[c]), m == 7 && (p.v /= 86400), p;
}
function zh(e, t, n) {
	var r = wh(e);
	r.getUint32(4, !0);
	var i = r.getUint32(8, !0), a = 12, o = -1, s = -1, c = -1, l = NaN, u = NaN, d = 0, f = new Date(Date.UTC(2001, 0, 1));
	i & 1 && (l = Oh(e, a), a += 16), i & 2 && (u = r.getFloat64(a, !0), a += 8), i & 4 && (f.setTime(f.getTime() + (d = r.getFloat64(a, !0)) * 1e3), a += 8), i & 8 && (s = r.getUint32(a, !0), a += 4), i & 16 && (o = r.getUint32(a, !0), a += 4), a += Dh(i & 480) * 4, i & 512 && (r.getUint32(a, !0), a += 4), a += Dh(i & 1024) * 4, i & 2048 && (r.getUint32(a, !0), a += 4);
	var p, m = e[1];
	switch (m) {
		case 0:
			p = { t: "z" };
			break;
		case 2:
			p = {
				t: "n",
				v: l
			};
			break;
		case 3:
			p = {
				t: "s",
				v: t.sst[s]
			};
			break;
		case 5:
			p = n != null && n.cellDates ? {
				t: "d",
				v: f
			} : {
				t: "n",
				v: d / 86400 + 35430,
				z: J[14]
			};
			break;
		case 6:
			p = {
				t: "b",
				v: u > 0
			};
			break;
		case 7:
			p = {
				t: "n",
				v: u
			};
			break;
		case 8:
			p = {
				t: "e",
				v: 0
			};
			break;
		case 9:
			if (o > -1) {
				var h = t.rsst[o];
				p = {
					t: "s",
					v: h.v
				}, h.l && (p.l = { Target: h.l });
			} else throw Error(`Unsupported cell type ${e[1]} : ${i & 31} : ${e[Ch](0, 4)}`);
			break;
		case 10:
			p = {
				t: "n",
				v: l
			};
			break;
		default: throw Error(`Unsupported cell type ${e[1]} : ${i & 31} : ${e[Ch](0, 4)}`);
	}
	if (a += Dh(i & 4096) * 4, i & 516096 && (c == -1 && (c = r.getUint32(a, !0)), a += 4), i & 524288) {
		var g = r.getUint32(a, !0);
		a += 4, t.cmnt[g] && (p.c = Kh(t.cmnt[g]));
	}
	return c > -1 && Lh(p, m | 1280, i >> 13, t.ofmt[c], t.nfmt[c]), m == 7 && (p.v /= 86400), p;
}
function Bh(e, t, n) {
	switch (e[0]) {
		case 0:
		case 1:
		case 2:
		case 3:
		case 4: return Rh(e, t, e[0], n);
		case 5: return zh(e, t, n);
		default: throw Error(`Unsupported payload version ${e[0]}`);
	}
}
function Vh(e) {
	return Ah(jh(e)[1][0].data);
}
function Hh(e, t) {
	var n = jh(t.data), r = Ah(n[1][0].data), i = n[3], a = [];
	return (i || []).forEach(function(t) {
		var n, i, o = jh(t.data);
		if (o[1]) {
			var s = Ah(o[1][0].data) >>> 0;
			switch (r) {
				case 1:
					a[s] = Th(o[3][0].data);
					break;
				case 8:
					var c = e[Vh(o[9][0].data)][0], l = e[Vh(jh(c.data)[1][0].data)][0], u = Ah(l.meta[1][0].data);
					if (u != 2001) throw Error(`2000 unexpected reference to ${u}`);
					var d = jh(l.data), f = { v: d[3].map(function(e) {
						return Th(e.data);
					}).join("") };
					a[s] = f;
					sfields: if ((n = d == null ? void 0 : d[11]) != null && n[0]) {
						var p = (i = jh(d[11][0].data)) == null ? void 0 : i[1];
						if (!p) break sfields;
						p.forEach(function(t) {
							var n, r, i, a = jh(t.data);
							if ((n = a[2]) != null && n[0]) {
								var o = e[Vh((r = a[2]) == null ? void 0 : r[0].data)][0], s = Ah(o.meta[1][0].data);
								switch (s) {
									case 2032:
										var c = jh(o.data);
										(i = c == null ? void 0 : c[2]) != null && i[0] && !f.l && (f.l = Th(c[2][0].data));
										break;
									case 2039: break;
									default: console.log(`unrecognized ObjectAttribute type ${s}`);
								}
							}
						});
					}
					break;
				case 2:
					a[s] = jh(o[6][0].data);
					break;
				case 3:
					a[s] = jh(o[5][0].data);
					break;
				case 10:
					var m = e[Vh(o[10][0].data)][0];
					a[s] = Gh(e, m.data);
					break;
				default: throw r;
			}
		}
	}), a;
}
function Uh(e, t) {
	var n, r, i, a, o, s, c, l, u, d, f, p, m, h, g = jh(e), _ = Ah(g[1][0].data) >>> 0, v = Ah(g[2][0].data) >>> 0, y = ((r = (n = g[8]) == null ? void 0 : n[0]) == null ? void 0 : r.data) && Ah(g[8][0].data) > 0 || !1, b, x;
	if ((a = (i = g[7]) == null ? void 0 : i[0]) != null && a.data && t != 0) b = (s = (o = g[7]) == null ? void 0 : o[0]) == null ? void 0 : s.data, x = (l = (c = g[6]) == null ? void 0 : c[0]) == null ? void 0 : l.data;
	else if ((d = (u = g[4]) == null ? void 0 : u[0]) != null && d.data && t != 1) b = (p = (f = g[4]) == null ? void 0 : f[0]) == null ? void 0 : p.data, x = (h = (m = g[3]) == null ? void 0 : m[0]) == null ? void 0 : h.data;
	else throw `NUMBERS Tile missing ${t} cell storage`;
	for (var S = y ? 4 : 1, C = wh(b), w = [], T = 0; T < b.length / 2; ++T) {
		var E = C.getUint16(T * 2, !0);
		E < 65535 && w.push([T, E]);
	}
	if (w.length != v) throw `Expected ${v} cells, found ${w.length}`;
	var D = [];
	for (T = 0; T < w.length - 1; ++T) D[w[T][0]] = x[Ch](w[T][1] * S, w[T + 1][1] * S);
	return w.length >= 1 && (D[w[w.length - 1][0]] = x[Ch](w[w.length - 1][1] * S)), {
		R: _,
		cells: D
	};
}
function Wh(e, t) {
	var n, r = jh(t.data), i = -1;
	(n = r == null ? void 0 : r[7]) != null && n[0] && (i = Ah(r[7][0].data) >>> 0 ? 1 : 0);
	var a = Mh(r[5], function(e) {
		return Uh(e, i);
	});
	return {
		nrows: Ah(r[4][0].data) >>> 0,
		data: a.reduce(function(e, t) {
			return e[t.R] || (e[t.R] = []), t.cells.forEach(function(n, r) {
				if (e[t.R][r]) throw Error(`Duplicate cell r=${t.R} c=${r}`);
				e[t.R][r] = n;
			}), e;
		}, [])
	};
}
function Gh(e, t) {
	var n, r, i, a, o, s, c, l, u, d, f = {
		t: "",
		a: ""
	}, p = jh(t);
	if ((r = (n = p == null ? void 0 : p[1]) == null ? void 0 : n[0]) != null && r.data && (f.t = Th((a = (i = p == null ? void 0 : p[1]) == null ? void 0 : i[0]) == null ? void 0 : a.data) || ""), (s = (o = p == null ? void 0 : p[3]) == null ? void 0 : o[0]) != null && s.data) {
		var m = e[Vh((l = (c = p == null ? void 0 : p[3]) == null ? void 0 : c[0]) == null ? void 0 : l.data)][0], h = jh(m.data);
		(d = (u = h[1]) == null ? void 0 : u[0]) != null && d.data && (f.a = Th(h[1][0].data));
	}
	return p != null && p[4] && (f.replies = [], p[4].forEach(function(t) {
		var n = e[Vh(t.data)][0];
		f.replies.push(Gh(e, n.data));
	})), f;
}
function Kh(e) {
	var t = [];
	return t.push({
		t: e.t || "",
		a: e.a,
		T: e.replies && e.replies.length > 0
	}), e.replies && e.replies.forEach(function(e) {
		t.push({
			t: e.t || "",
			a: e.a,
			T: !0
		});
	}), t;
}
function qh(e, t, n, r) {
	var i, a, o, s, c, l, u, d, f, p, m, h, g, _, v = jh(t.data), y = {
		s: {
			r: 0,
			c: 0
		},
		e: {
			r: 0,
			c: 0
		}
	};
	if (y.e.r = (Ah(v[6][0].data) >>> 0) - 1, y.e.r < 0) throw Error(`Invalid row varint ${v[6][0].data}`);
	if (y.e.c = (Ah(v[7][0].data) >>> 0) - 1, y.e.c < 0) throw Error(`Invalid col varint ${v[7][0].data}`);
	n["!ref"] = Vr(y);
	var b = n["!data"] != null, x = n, S = jh(v[4][0].data), C = Ih();
	(i = S[4]) != null && i[0] && (C.sst = Hh(e, e[Vh(S[4][0].data)][0])), (a = S[6]) != null && a[0] && (C.fmla = Hh(e, e[Vh(S[6][0].data)][0])), (o = S[11]) != null && o[0] && (C.ofmt = Hh(e, e[Vh(S[11][0].data)][0])), (s = S[12]) != null && s[0] && (C.ferr = Hh(e, e[Vh(S[12][0].data)][0])), (c = S[17]) != null && c[0] && (C.rsst = Hh(e, e[Vh(S[17][0].data)][0])), (l = S[19]) != null && l[0] && (C.cmnt = Hh(e, e[Vh(S[19][0].data)][0])), (u = S[22]) != null && u[0] && (C.nfmt = Hh(e, e[Vh(S[22][0].data)][0]));
	var w = jh(S[3][0].data), T = 0;
	if (!((d = S[9]) != null && d[0])) throw "NUMBERS file missing row tree";
	if (jh(S[9][0].data)[1].map(function(e) {
		return jh(e.data);
	}).forEach(function(t) {
		T = Ah(t[1][0].data);
		var i = Ah(t[2][0].data), a = w[1][i];
		if (!a) throw "NUMBERS missing tile " + i;
		var o = e[Vh(jh(a.data)[2][0].data)][0], s = Ah(o.meta[1][0].data);
		if (s != 6002) throw Error(`6001 unexpected reference to ${s}`);
		var c = Wh(e, o);
		c.data.forEach(function(e, t) {
			e.forEach(function(e, i) {
				var a = Bh(e, C, r);
				a && (b ? (x["!data"][T + t] || (x["!data"][T + t] = []), x["!data"][T + t][i] = a) : n[Pr(i) + Ar(T + t)] = a);
			});
		}), T += c.nrows;
	}), (f = S[13]) != null && f[0]) {
		var E = e[Vh(S[13][0].data)][0], D = Ah(E.meta[1][0].data);
		if (D != 6144) throw Error(`Expected merge type 6144, found ${D}`);
		n["!merges"] = (p = jh(E.data)) == null ? void 0 : p[1].map(function(e) {
			var t = jh(e.data), n = wh(jh(t[1][0].data)[1][0].data), r = wh(jh(t[2][0].data)[1][0].data);
			return {
				s: {
					r: n.getUint16(0, !0),
					c: n.getUint16(2, !0)
				},
				e: {
					r: n.getUint16(0, !0) + r.getUint16(0, !0) - 1,
					c: n.getUint16(2, !0) + r.getUint16(2, !0) - 1
				}
			};
		});
	}
	if (!((m = n["!merges"]) != null && m.length) && (h = v[47]) != null && h[0]) {
		var O = jh(v[47][0].data);
		if ((g = O[2]) != null && g[0]) {
			var k = jh(O[2][0].data);
			(_ = k[3]) != null && _[0] && (n["!merges"] = Mh(k[3], function(e) {
				var t, n, r, i, a, o = jh(jh(jh(e)[2][0].data)[1][0].data);
				if ((t = o[1]) != null && t[0]) {
					var s = jh(o[1][0].data);
					if (Ah(s[1][0].data) == 67) {
						var c = jh(s[40][0].data);
						if (!(!((n = c[3]) != null && n[0]) || !((r = c[4]) != null && r[0]))) {
							var l = jh(c[3][0].data), u = jh(c[4][0].data), d = Ah(l[1][0].data), f = (i = l[2]) != null && i[0] ? Ah(l[2][0].data) : d, p = Ah(u[1][0].data), m = (a = u[2]) != null && a[0] ? Ah(u[2][0].data) : p;
							return {
								s: {
									r: p,
									c: d
								},
								e: {
									r: m,
									c: f
								}
							};
						}
					}
				}
			}).filter(function(e) {
				return e != null;
			}));
		}
	}
}
function Jh(e, t, n) {
	var r = jh(t.data), i = { "!ref": "A1" };
	n != null && n.dense && (i["!data"] = []);
	var a = e[Vh(r[2][0].data)], o = Ah(a[0].meta[1][0].data);
	if (o != 6001) throw Error(`6000 unexpected reference to ${o}`);
	return qh(e, a[0], i, n), i;
}
function Yh(e, t, n) {
	var r, i = jh(t.data), a = {
		name: (r = i[1]) != null && r[0] ? Th(i[1][0].data) : "",
		sheets: []
	};
	return Mh(i[2], Vh).forEach(function(t) {
		e[t].forEach(function(t) {
			Ah(t.meta[1][0].data) == 6e3 && a.sheets.push(Jh(e, t, n));
		});
	}), a;
}
function Xh(e, t, n) {
	var r, i = kg();
	i.Workbook = { WBProps: { date1904: !0 } };
	var a = jh(t.data);
	if ((r = a[2]) != null && r[0]) throw Error("Keynote presentations are not supported");
	if (Mh(a[1], Vh).forEach(function(t) {
		e[t].forEach(function(t) {
			if (Ah(t.meta[1][0].data) == 2) {
				var r = Yh(e, t, n);
				r.sheets.forEach(function(e, t) {
					Ag(i, e, t == 0 ? r.name : r.name + "_" + t, !0);
				});
			}
		});
	}), i.SheetNames.length == 0) throw Error("Empty NUMBERS file");
	return i.bookType = "numbers", i;
}
function Zh(e, t) {
	var n, r, i, a, o, s, c, l = {}, u = [];
	if (e.FullPaths.forEach(function(e) {
		if (e.match(/\.iwpv2/)) throw Error("Unsupported password protection");
	}), e.FileIndex.forEach(function(e) {
		if (e.name.match(/\.iwa$/) && e.content[0] == 0) {
			var t;
			try {
				t = Fh(e.content);
			} catch (t) {
				return console.log("?? " + e.content.length + " " + (t.message || t));
			}
			var n;
			try {
				n = Nh(t);
			} catch (e) {
				return console.log("## " + (e.message || e));
			}
			n.forEach(function(e) {
				l[e.id] = e.messages, u.push(e.id);
			});
		}
	}), !u.length) throw Error("File has no messages");
	if ((i = (r = (n = l == null ? void 0 : l[1]) == null ? void 0 : n[0].meta) == null ? void 0 : r[1]) != null && i[0].data && Ah(l[1][0].meta[1][0].data) == 1e4) throw Error("Pages documents are not supported");
	var d = ((c = (s = (o = (a = l == null ? void 0 : l[1]) == null ? void 0 : a[0]) == null ? void 0 : o.meta) == null ? void 0 : s[1]) == null ? void 0 : c[0].data) && Ah(l[1][0].meta[1][0].data) == 1 && l[1][0];
	if (d || u.forEach(function(e) {
		l[e].forEach(function(e) {
			if (Ah(e.meta[1][0].data) >>> 0 == 1) if (!d) d = e;
			else throw Error("Document has multiple roots");
		});
	}), !d) throw Error("Cannot find Document root");
	return Xh(l, d, t);
}
function Qh(e) {
	return function(t) {
		for (var n = 0; n != e.length; ++n) {
			var r = e[n];
			t[r[0]] === void 0 && (t[r[0]] = r[1]), r[2] === "n" && (t[r[0]] = Number(t[r[0]]));
		}
	};
}
function $h(e) {
	Qh([
		["cellNF", !1],
		["cellHTML", !0],
		["cellFormula", !0],
		["cellStyles", !1],
		["cellText", !0],
		["cellDates", !1],
		["sheetStubs", !1],
		[
			"sheetRows",
			0,
			"n"
		],
		["bookDeps", !1],
		["bookSheets", !1],
		["bookProps", !1],
		["bookFiles", !1],
		["bookVBA", !1],
		["password", ""],
		["WTF", !1]
	])(e);
}
function eg(e) {
	return Vi.WS.indexOf(e) > -1 ? "sheet" : Vi.CS && e == Vi.CS ? "chart" : Vi.DS && e == Vi.DS ? "dialog" : Vi.MS && e == Vi.MS ? "macro" : e && e.length ? e : "sheet";
}
function tg(e, t) {
	if (!e) return 0;
	try {
		e = t.map(function(t) {
			return t.id || (t.id = t.strRelID), [
				t.name,
				e["!id"][t.id].Target,
				eg(e["!id"][t.id].Type)
			];
		});
	} catch {
		return null;
	}
	return !e || e.length === 0 ? null : e;
}
function ng(e, t, n, r, i, a, o, s) {
	if (!(!e || !e["!legdrawel"])) {
		var c = Zt(n, nn(e["!legdrawel"].Target, r), !0);
		c && Xl(Tn(c), e, s || []);
	}
}
function rg(e) {
	switch ((e || "").toLowerCase().replace(/.*\./, "")) {
		case "png": return "image/png";
		case "gif": return "image/gif";
		case "bmp": return "image/bmp";
		case "svg": return "image/svg+xml";
		case "jpg":
		case "jpeg": return "image/jpeg";
		default: return "application/octet-stream";
	}
}
function ig(e, t, n, r, i, a, o) {
	if (!(!e || !e["!drawel"]) && !(!a || !a.drawings && !a.charts)) {
		var s = nn(e["!drawel"].Target, r), c = Hi(s), l = Il(Zt(n, s, !0), Ui(Zt(n, c, !0), s));
		e["!drawings"] = l, a.drawings && l.images && l.images.length && l.images.forEach(function(e) {
			if (!(!e || !e.target)) {
				var t = nn(e.target, s), r = Qt(n, t, !0);
				r && (e.dataURI = "data:" + rg(t) + ";base64," + j(r)), e.path = t;
			}
		}), a.charts && l.charts && l.charts.length && (e["!charts"] = [], l.charts.forEach(function(t) {
			if (!(!t || !t.target)) {
				var r = nn(t.target, s), i = Hi(r), c = Sp(Zt(n, r, !0), r, a, Ui(Zt(n, i, !0), r), o, { "!type": "chart" });
				t.model = c && c["!chart"], t.data = c, t.path = r, e["!charts"].push(t);
			}
		}));
	}
}
function ag(e, t, n, r, i, a, o, s, c, l, u, d) {
	try {
		a[r] = Ui(Zt(e, n, !0), t);
		var f = Xt(e, t), p;
		switch (s) {
			case "sheet":
				p = Up(f, t, i, c, a[r], l, u, d);
				break;
			case "chart":
				if (p = Wp(f, t, i, c, a[r], l, u, d), !p || !p["!drawel"] || !c.drawings && !c.charts) break;
				var m = nn(p["!drawel"].Target, t), h = Hi(m), g = Il(Zt(e, m, !0), Ui(Zt(e, h, !0), m));
				if (p["!drawings"] = g, !c.charts || !g.chart) break;
				var _ = nn(g.chart, m), v = Hi(_);
				p = Sp(Zt(e, _, !0), _, c, Ui(Zt(e, v, !0), _), l, p), g.charts && g.charts.length && (g.charts[0].model = p && p["!chart"], p["!charts"] = g.charts);
				break;
			case "macro":
				p = Gp(f, t, i, c, a[r], l, u, d);
				break;
			case "dialog":
				p = Kp(f, t, i, c, a[r], l, u, d);
				break;
			default: throw Error("Unrecognized sheet type " + s);
		}
		o[r] = p;
		var y = [], b = [];
		a && a[r] && lt(a[r]).forEach(function(n) {
			var i = "";
			if (a[r][n].Type == Vi.CMNT) {
				if (i = nn(a[r][n].Target, t), y = Yp(Xt(e, i, !0), i, c), !y || !y.length) return;
				Zl(p, y, !1);
			}
			a[r][n].Type == Vi.TCMNT && (i = nn(a[r][n].Target, t), b = b.concat($l(Xt(e, i, !0), c)));
		}), b && b.length && Zl(p, b, !0, c.people || []), s == "sheet" && ig(p, s, e, t, i, c, l), ng(p, s, e, t, i, c, l, y);
	} catch (e) {
		if (c.WTF) throw e;
	}
}
function og(e) {
	return e.charAt(0) == "/" ? e.slice(1) : e;
}
function sg(e, t) {
	if (Qe(), t = t || {}, $h(t), Jt(e, "META-INF/manifest.xml") || Jt(e, "objectdata.xml")) return xh(e, t);
	if (Jt(e, "Index/Document.iwa")) {
		if (typeof Uint8Array > "u") throw Error("NUMBERS file parsing requires Uint8Array support");
		if (Zh !== void 0) {
			if (e.FileIndex) return Zh(e, t);
			var n = ot.utils.cfb_new();
			return $t(e).forEach(function(t) {
				en(n, t, Qt(e, t));
			}), Zh(n, t);
		}
		throw Error("Unsupported NUMBERS file");
	}
	if (!Jt(e, "[Content_Types].xml")) {
		if (Jt(e, "index.xml.gz")) throw Error("Unsupported NUMBERS 08 file");
		if (Jt(e, "index.xml")) throw Error("Unsupported NUMBERS 09 file");
		var r = ot.find(e, "Index.zip");
		if (r) return t = St(t), delete t.type, typeof r.content == "string" && (t.type = "binary"), typeof Bun < "u" && Buffer.isBuffer(r.content) ? _g(new Uint8Array(r.content), t) : _g(r.content, t);
		throw Error("Unsupported ZIP file");
	}
	var i = $t(e), a = Bi(Zt(e, "[Content_Types].xml")), o = !1, s, c;
	if (a.workbooks.length === 0 && (c = "xl/workbook.xml", Xt(e, c, !0) && a.workbooks.push(c)), a.workbooks.length === 0) {
		if (c = "xl/workbook.bin", !Xt(e, c, !0)) throw Error("Could not find workbook");
		a.workbooks.push(c), o = !0;
	}
	a.workbooks[0].slice(-3) == "bin" && (o = !0);
	var l = {}, u = {};
	if (!t.bookSheets && !t.bookProps) {
		if (lf = [], a.sst) try {
			lf = Jp(Xt(e, og(a.sst)), a.sst, t);
		} catch (e) {
			if (t.WTF) throw e;
		}
		t.cellStyles && a.themes.length && (l = _l(Zt(e, a.themes[0].replace(/^\//, ""), !0) || "", t)), a.style && (u = qp(Xt(e, og(a.style)), a.style, l, t));
	}
	a.links.map(function(n) {
		try {
			var r = Ui(Zt(e, Hi(og(n))), n);
			return Zp(Xt(e, og(n)), r, n, t);
		} catch {}
	});
	var d = Hp(Xt(e, og(a.workbooks[0])), a.workbooks[0], t), f = {}, p = "";
	a.coreprops.length && (p = Xt(e, og(a.coreprops[0]), !0), p && (f = qi(p)), a.extprops.length !== 0 && (p = Xt(e, og(a.extprops[0]), !0), p && Xi(p, f, t)));
	var m = {};
	(!t.bookSheets || t.bookProps) && a.custprops.length !== 0 && (p = Zt(e, og(a.custprops[0]), !0), p && (m = Qi(p, t)));
	var h = {};
	if ((t.bookSheets || t.bookProps) && (d.Sheets ? s = d.Sheets.map(function(e) {
		return e.name;
	}) : f.Worksheets && f.SheetNames.length > 0 && (s = f.SheetNames), t.bookProps && (h.Props = f, h.Custprops = m), t.bookSheets && s !== void 0 && (h.SheetNames = s), t.bookSheets ? h.SheetNames : t.bookProps)) return h;
	s = {};
	var g = {};
	t.bookDeps && a.calcchain && (g = Xp(Xt(e, og(a.calcchain)), a.calcchain, t));
	var _ = 0, v = {}, y, b, x = d.Sheets;
	f.Worksheets = x.length, f.SheetNames = [];
	for (var S = 0; S != x.length; ++S) f.SheetNames[S] = x[S].name;
	var C = o ? "bin" : "xml", w = a.workbooks[0].lastIndexOf("/"), T = (a.workbooks[0].slice(0, w + 1) + "_rels/" + a.workbooks[0].slice(w + 1) + ".rels").replace(/^\//, "");
	Jt(e, T) || (T = "xl/_rels/workbook." + C + ".rels");
	var E = Ui(Zt(e, T, !0), T.replace(/_rels.*/, "s5s"));
	(a.metadata || []).length >= 1 && (t.xlmeta = Qp(Xt(e, og(a.metadata[0])), a.metadata[0], t)), (a.people || []).length >= 1 && (t.people = eu(Xt(e, og(a.people[0])), t)), E && (E = tg(E, d.Sheets));
	var D = +!!Xt(e, "xl/worksheets/sheet.xml", !0);
	wsloop: for (_ = 0; _ != f.Worksheets; ++_) {
		var O = "sheet";
		if (E && E[_] ? (y = "xl/" + E[_][1].replace(/[\/]?xl\//, ""), Jt(e, y) || (y = E[_][1]), Jt(e, y) || (y = T.replace(/_rels\/[\S\s]*$/, "") + E[_][1]), O = E[_][2]) : (y = "xl/worksheets/sheet" + (_ + 1 - D) + "." + C, y = y.replace(/sheet0\./, "sheet.")), b = y.replace(/^(.*)(\/)([^\/]*)$/, "$1/_rels/$3.rels"), t && t.sheets != null) switch (typeof t.sheets) {
			case "number":
				if (_ != t.sheets) continue wsloop;
				break;
			case "string":
				if (f.SheetNames[_].toLowerCase() != t.sheets.toLowerCase()) continue wsloop;
				break;
			default: if (Array.isArray && Array.isArray(t.sheets)) {
				for (var k = !1, A = 0; A != t.sheets.length; ++A) typeof t.sheets[A] == "number" && t.sheets[A] == _ && (k = 1), typeof t.sheets[A] == "string" && t.sheets[A].toLowerCase() == f.SheetNames[_].toLowerCase() && (k = 1);
				if (!k) continue wsloop;
			}
		}
		ag(e, y, b, f.SheetNames[_], _, v, s, O, t, d, l, u);
	}
	return h = {
		Directory: a,
		Workbook: d,
		Props: f,
		Custprops: m,
		Deps: g,
		Sheets: s,
		SheetNames: f.SheetNames,
		Strings: lf,
		Styles: u,
		Themes: l,
		SSF: St(J)
	}, t && t.bookFiles && (e.files ? (h.keys = i, h.files = e.files) : (h.keys = [], h.files = {}, e.FullPaths.forEach(function(t, n) {
		t = t.replace(/^Root Entry[\/]/, ""), h.keys.push(t), h.files[t] = e.FileIndex[n];
	}))), t && t.bookVBA && (a.vba.length > 0 ? h.vbaraw = Xt(e, og(a.vba[0]), !0) : a.defaults && a.defaults.bin === iu && (h.vbaraw = Xt(e, "xl/vbaProject.bin", !0))), h.bookType = o ? "xlsb" : "xlsx", h;
}
function cg(e, t) {
	var n = t || {}, r = "Workbook", i = ot.find(e, r);
	try {
		if (r = "/!DataSpaces/Version", i = ot.find(e, r), !i || !i.content || (Is(i.content), r = "/!DataSpaces/DataSpaceMap", i = ot.find(e, r), !i || !i.content)) throw Error("ECMA-376 Encrypted file missing " + r);
		var a = Rs(i.content);
		if (a.length !== 1 || a[0].comps.length !== 1 || a[0].comps[0].t !== 0 || a[0].name !== "StrongEncryptionDataSpace" || a[0].comps[0].v !== "EncryptedPackage") throw Error("ECMA-376 Encrypted file bad " + r);
		if (r = "/!DataSpaces/DataSpaceInfo/StrongEncryptionDataSpace", i = ot.find(e, r), !i || !i.content) throw Error("ECMA-376 Encrypted file missing " + r);
		var o = zs(i.content);
		if (o.length != 1 || o[0] != "StrongEncryptionTransform") throw Error("ECMA-376 Encrypted file bad " + r);
		if (r = "/!DataSpaces/TransformInfo/StrongEncryptionTransform/!Primary", i = ot.find(e, r), !i || !i.content) throw Error("ECMA-376 Encrypted file missing " + r);
		Vs(i.content);
	} catch {}
	if (r = "/EncryptionInfo", i = ot.find(e, r), !i || !i.content) throw Error("ECMA-376 Encrypted file missing " + r);
	var s = Ws(i.content);
	if (r = "/EncryptedPackage", i = ot.find(e, r), !i || !i.content) throw Error("ECMA-376 Encrypted file missing " + r);
	if (s[0] == 4 && typeof decrypt_agile < "u") return decrypt_agile(s[1], i.content, n.password || "", n);
	if (s[0] == 2 && typeof decrypt_std76 < "u") return decrypt_std76(s[1], i.content, n.password || "", n);
	throw Error("File is password-protected");
}
function lg(e, t) {
	var n = "";
	switch ((t || {}).type || "base64") {
		case "buffer": return [
			e[0],
			e[1],
			e[2],
			e[3],
			e[4],
			e[5],
			e[6],
			e[7]
		];
		case "base64":
			n = M(e.slice(0, 12));
			break;
		case "binary":
			n = e;
			break;
		case "array": return [
			e[0],
			e[1],
			e[2],
			e[3],
			e[4],
			e[5],
			e[6],
			e[7]
		];
		default: throw Error("Unrecognized type " + (t && t.type || "undefined"));
	}
	return [
		n.charCodeAt(0),
		n.charCodeAt(1),
		n.charCodeAt(2),
		n.charCodeAt(3),
		n.charCodeAt(4),
		n.charCodeAt(5),
		n.charCodeAt(6),
		n.charCodeAt(7)
	];
}
function ug(e, t) {
	return ot.find(e, "EncryptedPackage") ? cg(e, t) : zm(e, t);
}
function dg(e, t) {
	var n, r = e, i = t || {};
	return i.type || (i.type = N && Buffer.isBuffer(e) ? "buffer" : "base64"), n = tn(r, i), sg(n, i);
}
function fg(e, t) {
	var n = 0;
	main: for (; n < e.length;) switch (e.charCodeAt(n)) {
		case 10:
		case 13:
		case 32:
			++n;
			break;
		case 60: return fm(e.slice(n), t);
		default: break main;
	}
	return ys.to_workbook(e, t);
}
function pg(e, t) {
	var n = "", r = lg(e, t);
	switch (t.type) {
		case "base64":
			n = M(e);
			break;
		case "binary":
			n = e;
			break;
		case "buffer":
			n = e.toString("binary");
			break;
		case "array":
			n = xt(e);
			break;
		default: throw Error("Unrecognized type " + t.type);
	}
	return r[0] == 239 && r[1] == 187 && r[2] == 191 && (n = Tn(n)), t.type = "binary", fg(n, t);
}
function mg(e, t) {
	var n = e;
	return t.type == "base64" && (n = M(n)), typeof ArrayBuffer < "u" && e instanceof ArrayBuffer && (n = new Uint8Array(e)), n = p === void 0 ? N && Buffer.isBuffer(e) ? e.slice(2).toString("utf16le") : typeof Uint8Array < "u" && n instanceof Uint8Array ? typeof TextDecoder < "u" ? new TextDecoder("utf-16le").decode(n.slice(2)) : S(n.slice(2)) : x(n.slice(2)) : p.utils.decode(1200, n.slice(2), "str"), t.type = "binary", fg(n, t);
}
function hg(e) {
	return e.match(/[^\x00-\x7F]/) ? En(e) : e;
}
function gg(e, t, n, r) {
	return r ? (n.type = "string", ys.to_workbook(e, n)) : ys.to_workbook(t, n);
}
function _g(e, t) {
	y();
	var n = t || {};
	if (n.codepage && p === void 0 && console.error("Codepage tables are not loaded.  Non-ASCII characters may not give expected results"), typeof ArrayBuffer < "u" && e instanceof ArrayBuffer) return _g(new Uint8Array(e), (n = St(n), n.type = "array", n));
	if (typeof Int8Array < "u" && e instanceof Int8Array) return _g(new Uint8Array(e.buffer, e.byteOffset, e.length), n);
	typeof Uint8Array < "u" && e instanceof Uint8Array && !n.type && (n.type = typeof Deno < "u" ? "buffer" : "array");
	var r = e, i = [
		0,
		0,
		0,
		0
	], a = !1;
	if (n.cellStyles && (n.cellNF = !0, n.sheetStubs = !0), uf = {}, n.dateNF && (uf.dateNF = n.dateNF), n.type || (n.type = N && Buffer.isBuffer(e) ? "buffer" : "base64"), n.type == "file" && (n.type = N ? "buffer" : "binary", r = ct(e), typeof Uint8Array < "u" && !N && (n.type = "array")), n.type == "string" && (a = !0, n.type = "binary", n.codepage = 65001, r = hg(e)), n.type == "array" && typeof Uint8Array < "u" && e instanceof Uint8Array && typeof ArrayBuffer < "u") {
		var o = new Uint8Array(/* @__PURE__ */ new ArrayBuffer(3));
		if (o.foo = "bar", !o.foo) return n = St(n), n.type = "array", _g(B(r), n);
	}
	switch ((i = lg(r, n))[0]) {
		case 208:
			if (i[1] === 207 && i[2] === 17 && i[3] === 224 && i[4] === 161 && i[5] === 177 && i[6] === 26 && i[7] === 225) return ug(ot.read(r, n), n);
			break;
		case 9:
			if (i[1] <= 8) return zm(r, n);
			break;
		case 60: return fm(r, n);
		case 73:
			if (i[1] === 73 && i[2] === 42 && i[3] === 0) throw Error("TIFF Image File is not a spreadsheet");
			if (i[1] === 68) return bs(r, n);
			break;
		case 84:
			if (i[1] === 65 && i[2] === 66 && i[3] === 76) return xs(r, n);
			break;
		case 80: return i[1] === 75 && i[2] < 9 && i[3] < 9 ? dg(r, n) : gg(e, r, n, a);
		case 239: return i[3] === 60 ? fm(r, n) : gg(e, r, n, a);
		case 255:
			if (i[1] === 254) return mg(r, n);
			if (i[1] === 0 && i[2] === 2 && i[3] === 0) return Ss.to_workbook(r, n);
			break;
		case 0:
			if (i[1] === 0 && (i[2] >= 2 && i[3] === 0 || i[2] === 0 && (i[3] === 8 || i[3] === 9))) return Ss.to_workbook(r, n);
			break;
		case 3:
		case 131:
		case 139:
		case 140: return hs.to_workbook(r, n);
		case 123:
			if (i[1] === 92 && i[2] === 114 && i[3] === 116) return ac(r, n);
			break;
		case 10:
		case 13:
		case 32: return pg(r, n);
		case 137:
			if (i[1] === 80 && i[2] === 78 && i[3] === 71) throw Error("PNG Image File is not a spreadsheet");
			break;
		case 37:
			if (i[1] === 80 && i[2] === 68 && i[3] === 70) throw Error("PDF File is not a spreadsheet");
			break;
		case 8:
			if (i[1] === 231) throw Error("Unsupported Multiplan 1.x file!");
			break;
		case 12:
			if (i[1] === 236) throw Error("Unsupported Multiplan 2.x file!");
			if (i[1] === 237) throw Error("Unsupported Multiplan 3.x file!");
			break;
	}
	return ms.indexOf(i[0]) > -1 && i[2] <= 12 && i[3] <= 31 ? hs.to_workbook(r, n) : gg(e, r, n, a);
}
function vg(e, t, n, r, i, a, o) {
	var s = Ar(n), c = o.defval, l = o.raw || !Object.prototype.hasOwnProperty.call(o, "raw"), u = !0, d = e["!data"] != null, f = i === 1 ? [] : {};
	if (i !== 1) if (Object.defineProperty) try {
		Object.defineProperty(f, "__rowNum__", {
			value: n,
			enumerable: !1
		});
	} catch {
		f.__rowNum__ = n;
	}
	else f.__rowNum__ = n;
	if (!d || e["!data"][n]) for (var p = t.s.c; p <= t.e.c; ++p) {
		var m = d ? (e["!data"][n] || [])[p] : e[r[p] + s];
		if (m == null || m.t === void 0) {
			if (c === void 0) continue;
			a[p] != null && (f[a[p]] = c);
			continue;
		}
		var h = m.v;
		switch (m.t) {
			case "z":
				if (h == null) break;
				continue;
			case "e":
				h = h == 0 ? null : void 0;
				break;
			case "s":
			case "b": break;
			case "n": if (!m.z || !Ge(m.z) || (h = ht(h), typeof h == "number")) break;
			case "d":
				o && (o.UTC || o.raw === !1) || (h = Pt(new Date(h)));
				break;
			default: throw Error("unrecognized type " + m.t);
		}
		if (a[p] != null) {
			if (h == null) if (m.t == "e" && h === null) f[a[p]] = null;
			else if (c !== void 0) f[a[p]] = c;
			else if (l && h === null) f[a[p]] = null;
			else continue;
			else f[a[p]] = (m.t === "n" && typeof o.rawNumbers == "boolean" ? o.rawNumbers : l) ? h : Gr(m, h, o);
			h != null && (u = !1);
		}
	}
	return {
		row: f,
		isempty: u
	};
}
function yg(e, t) {
	if (e == null || e["!ref"] == null) return [];
	var n = {
		t: "n",
		v: 0
	}, r = 0, i = 1, a = [], o = 0, s = "", c = {
		s: {
			r: 0,
			c: 0
		},
		e: {
			r: 0,
			c: 0
		}
	}, l = t || {}, u = l.range == null ? e["!ref"] : l.range;
	switch (l.header === 1 ? r = 1 : l.header === "A" ? r = 2 : Array.isArray(l.header) ? r = 3 : l.header == null && (r = 0), typeof u) {
		case "string":
			c = Ur(u);
			break;
		case "number":
			c = Ur(e["!ref"]), c.s.r = u;
			break;
		default: c = u;
	}
	r > 0 && (i = 0);
	var d = Ar(c.s.r), f = [], p = [], m = 0, h = 0, g = e["!data"] != null, _ = c.s.r, v = 0, y = {};
	g && !e["!data"][_] && (e["!data"][_] = []);
	var b = l.skipHidden && e["!cols"] || [], x = l.skipHidden && e["!rows"] || [];
	for (v = c.s.c; v <= c.e.c; ++v) if (!(b[v] || {}).hidden) switch (f[v] = Pr(v), n = g ? e["!data"][_][v] : e[f[v] + d], r) {
		case 1:
			a[v] = v - c.s.c;
			break;
		case 2:
			a[v] = f[v];
			break;
		case 3:
			a[v] = l.header[v - c.s.c];
			break;
		default:
			if (n == null && (n = {
				w: "__EMPTY",
				t: "s"
			}), s = o = Gr(n, null, l), h = y[o] || 0, !h) y[o] = 1;
			else {
				do
					s = o + "_" + h++;
				while (y[s]);
				y[o] = h, y[s] = 1;
			}
			a[v] = s;
	}
	for (_ = c.s.r + i; _ <= c.e.r; ++_) if (!(x[_] || {}).hidden) {
		var S = vg(e, c, _, f, r, a, l);
		(S.isempty === !1 || (r === 1 ? l.blankrows !== !1 : l.blankrows)) && (p[m++] = S.row);
	}
	return p.length = m, p;
}
var bg = /"/g;
function xg(e, t, n, r, i, a, o, s, c) {
	for (var l = !0, u = [], d = "", f = Ar(n), p = e["!data"] != null, m = p && e["!data"][n] || [], h = t.s.c; h <= t.e.c; ++h) if (r[h]) {
		var g = p ? m[h] : e[r[h] + f];
		if (g == null) d = "";
		else if (g.v != null) {
			l = !1, d = "" + (c.rawNumbers && g.t == "n" ? g.v : Gr(g, null, c));
			for (var _ = 0, v = 0; _ !== d.length; ++_) if ((v = d.charCodeAt(_)) === i || v === a || v === 10 || v === 13 || v === 34 || c.forceQuotes) {
				d = "\"" + d.replace(bg, "\"\"") + "\"";
				break;
			}
			d == "ID" && s == 0 && u.length == 0 && (d = "\"ID\"");
		} else g.f != null && !g.F ? (l = !1, d = "=" + g.f, d.indexOf(",") >= 0 && (d = "\"" + d.replace(bg, "\"\"") + "\"")) : d = "";
		u.push(d);
	}
	if (c.strip) for (; u[u.length - 1] === "";) --u.length;
	return c.blankrows === !1 && l ? null : u.join(o);
}
function Sg(e, t) {
	var n = [], r = t == null ? {} : t;
	if (e == null || e["!ref"] == null) return "";
	for (var i = Ur(e["!ref"]), a = r.FS === void 0 ? "," : r.FS, o = a.charCodeAt(0), s = r.RS === void 0 ? "\n" : r.RS, c = s.charCodeAt(0), l = "", u = [], d = r.skipHidden && e["!cols"] || [], f = r.skipHidden && e["!rows"] || [], p = i.s.c; p <= i.e.c; ++p) (d[p] || {}).hidden || (u[p] = Pr(p));
	for (var m = 0, h = i.s.r; h <= i.e.r; ++h) (f[h] || {}).hidden || (l = xg(e, i, h, u, o, c, a, m, r), l != null && (l || r.blankrows !== !1) && n.push((m++ ? s : "") + l));
	return n.join("");
}
function Cg(e, t) {
	t || (t = {}), t.FS = "	", t.RS = "\n";
	var n = Sg(e, t);
	return p === void 0 || t.type == "string" ? n : "ÿþ" + p.utils.encode(1200, n, "str");
}
function wg(e, t) {
	var n = "", r, i = "";
	if (e == null || e["!ref"] == null) return [];
	var a = Ur(e["!ref"]), o = "", s = [], c, l = [], u = e["!data"] != null;
	for (c = a.s.c; c <= a.e.c; ++c) s[c] = Pr(c);
	for (var d = a.s.r; d <= a.e.r; ++d) for (o = Ar(d), c = a.s.c; c <= a.e.c; ++c) if (n = s[c] + o, r = u ? (e["!data"][d] || [])[c] : e[n], i = "", r !== void 0) {
		if (r.F != null) {
			if (n = r.F, !r.f) continue;
			i = r.f, n.indexOf(":") == -1 && (n = n + ":" + n);
		}
		if (r.f != null) i = r.f;
		else if (t && t.values === !1) continue;
		else if (r.t == "z") continue;
		else if (r.t == "n" && r.v != null) i = "" + r.v;
		else if (r.t == "b") i = r.v ? "TRUE" : "FALSE";
		else if (r.w !== void 0) i = "'" + r.w;
		else if (r.v === void 0) continue;
		else i = r.t == "s" ? "'" + r.v : "" + r.v;
		l[l.length] = n + "=" + i;
	}
	return l;
}
function Tg(e, t, n) {
	var r = n || {}, i = e ? e["!data"] != null : r.dense;
	D != null && i == null && (i = D);
	var a = +!r.skipHeader, o = e || {};
	!e && i && (o["!data"] = []);
	var s = 0, c = 0;
	if (o && r.origin != null) if (typeof r.origin == "number") s = r.origin;
	else {
		var l = typeof r.origin == "string" ? Rr(r.origin) : r.origin;
		s = l.r, c = l.c;
	}
	var u = {
		s: {
			c: 0,
			r: 0
		},
		e: {
			c,
			r: s + t.length - 1 + a
		}
	};
	if (o["!ref"]) {
		var d = Ur(o["!ref"]);
		u.e.c = Math.max(u.e.c, d.e.c), u.e.r = Math.max(u.e.r, d.e.r), s == -1 && (s = d.e.r + 1, u.e.r = s + t.length - 1 + a);
	} else s == -1 && (s = 0, u.e.r = t.length - 1 + a);
	var f = r.header || [], p = 0, m = [];
	t.forEach(function(e, t) {
		i && !o["!data"][s + t + a] && (o["!data"][s + t + a] = []), i && (m = o["!data"][s + t + a]), lt(e).forEach(function(n) {
			(p = f.indexOf(n)) == -1 && (f[p = f.length] = n);
			var l = e[n], u = "z", d = "", h = i ? "" : Pr(c + p) + Ar(s + t + a), g = i ? m[c + p] : o[h];
			l && typeof l == "object" && !(l instanceof Date) ? i ? m[c + p] = l : o[h] = l : (typeof l == "number" ? u = "n" : typeof l == "boolean" ? u = "b" : typeof l == "string" ? u = "s" : l instanceof Date ? (u = "d", r.UTC || (l = Ft(l)), r.cellDates || (u = "n", l = mt(l)), d = g != null && g.z && Ge(g.z) ? g.z : r.dateNF || J[14]) : l === null && r.nullError && (u = "e", l = 0), g ? (g.t = u, g.v = l, delete g.w, delete g.R, d && (g.z = d)) : i ? m[c + p] = g = {
				t: u,
				v: l
			} : o[h] = g = {
				t: u,
				v: l
			}, d && (g.z = d));
		});
	}), u.e.c = Math.max(u.e.c, c + f.length - 1);
	var h = Ar(s);
	if (i && !o["!data"][s] && (o["!data"][s] = []), a) for (p = 0; p < f.length; ++p) i ? o["!data"][s][p + c] = {
		t: "s",
		v: f[p]
	} : o[Pr(p + c) + h] = {
		t: "s",
		v: f[p]
	};
	return o["!ref"] = Vr(u), o;
}
function Eg(e, t) {
	return Tg(null, e, t);
}
function Dg(e, t, n) {
	if (typeof t == "string") {
		if (e["!data"] != null) {
			var r = Rr(t);
			return e["!data"][r.r] || (e["!data"][r.r] = []), e["!data"][r.r][r.c] || (e["!data"][r.r][r.c] = { t: "z" });
		}
		return e[t] || (e[t] = { t: "z" });
	}
	return typeof t == "number" ? Dg(e, Pr(n || 0) + Ar(t)) : Dg(e, zr(t));
}
function Og(e, t) {
	if (typeof t == "number") {
		if (t >= 0 && e.SheetNames.length > t) return t;
		throw Error("Cannot find sheet # " + t);
	} else if (typeof t == "string") {
		var n = e.SheetNames.indexOf(t);
		if (n > -1) return n;
		throw Error("Cannot find sheet name |" + t + "|");
	} else throw Error("Cannot find sheet |" + t + "|");
}
function kg(e, t) {
	var n = {
		SheetNames: [],
		Sheets: {}
	};
	return e && Ag(n, e, t || "Sheet1"), n;
}
function Ag(e, t, n, r) {
	var i = 1;
	if (!n) for (; i <= 65535 && e.SheetNames.indexOf(n = "Sheet" + i) != -1; ++i, n = void 0);
	if (!n || e.SheetNames.length >= 65535) throw Error("Too many worksheets");
	if (r && e.SheetNames.indexOf(n) >= 0 && n.length < 32) {
		var a = n.match(/\d+$/);
		i = a && +a[0] || 0;
		var o = a && n.slice(0, a.index) || n;
		for (++i; i <= 65535 && e.SheetNames.indexOf(n = o + i) != -1; ++i);
	}
	if (Pp(n), e.SheetNames.indexOf(n) >= 0) throw Error("Worksheet with name |" + n + "| already exists!");
	return e.SheetNames.push(n), e.Sheets[n] = t, n;
}
function jg(e, t, n) {
	e.Workbook || (e.Workbook = {}), e.Workbook.Sheets || (e.Workbook.Sheets = []);
	var r = Og(e, t);
	switch (e.Workbook.Sheets[r] || (e.Workbook.Sheets[r] = {}), n) {
		case 0:
		case 1:
		case 2: break;
		default: throw Error("Bad sheet visibility setting " + n);
	}
	e.Workbook.Sheets[r].Hidden = n;
}
function Mg(e, t) {
	return e.z = t, e;
}
function Ng(e, t, n) {
	return t ? (e.l = { Target: t }, n && (e.l.Tooltip = n)) : delete e.l, e;
}
function Pg(e, t, n) {
	return Ng(e, "#" + t, n);
}
function Fg(e, t, n) {
	e.c || (e.c = []), e.c.push({
		t,
		a: n || "SheetJS"
	});
}
function Ig(e, t, n, r) {
	for (var i = typeof t == "string" ? Ur(t) : t, a = typeof t == "string" ? t : Vr(t), o = i.s.r; o <= i.e.r; ++o) for (var s = i.s.c; s <= i.e.c; ++s) {
		var c = Dg(e, o, s);
		c.t = "n", c.F = a, delete c.v, o == i.s.r && s == i.s.c && (c.f = n, r && (c.D = !0));
	}
	var l = Br(e["!ref"]);
	return l.s.r > i.s.r && (l.s.r = i.s.r), l.s.c > i.s.c && (l.s.c = i.s.c), l.e.r < i.e.r && (l.e.r = i.e.r), l.e.c < i.e.c && (l.e.c = i.e.c), e["!ref"] = Vr(l), e;
}
var Lg = {
	encode_col: Pr,
	encode_row: Ar,
	encode_cell: zr,
	encode_range: Vr,
	decode_col: Nr,
	decode_row: kr,
	split_cell: Lr,
	decode_cell: Rr,
	decode_range: Br,
	format_cell: Gr,
	sheet_new: qr,
	sheet_add_aoa: Jr,
	sheet_add_json: Tg,
	sheet_add_dom: ph,
	aoa_to_sheet: Yr,
	json_to_sheet: Eg,
	table_to_sheet: mh,
	table_to_book: hh,
	sheet_to_csv: Sg,
	sheet_to_txt: Cg,
	sheet_to_json: yg,
	sheet_to_html: fh,
	sheet_to_formulae: wg,
	sheet_to_row_object_array: yg,
	validate_merges: _f,
	measure_text_width: Fc,
	auto_fit_columns: Hc,
	autofit_columns: Hc,
	col_width_to_px: vc,
	px_to_col_width: function(e) {
		return bc(yc(e));
	},
	row_height_to_px: Kc,
	px_to_row_height: qc,
	sheet_get_cell: Dg,
	book_new: kg,
	book_append_sheet: Ag,
	book_set_sheet_visibility: jg,
	cell_set_number_format: Mg,
	cell_set_hyperlink: Ng,
	cell_set_internal_link: Pg,
	cell_add_comment: Fg,
	sheet_set_array_formula: Ig,
	consts: {
		SHEET_VISIBLE: 0,
		SHEET_HIDDEN: 1,
		SHEET_VERY_HIDDEN: 2
	}
};
u.version;
//#endregion
//#region ../../node_modules/.pnpm/tinycolor2@1.6.0/node_modules/tinycolor2/esm/tinycolor.js
function Rg(e) {
	"@babel/helpers - typeof";
	return Rg = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
		return typeof e;
	} : function(e) {
		return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
	}, Rg(e);
}
var zg = /^\s+/, Bg = /\s+$/;
function Q(e, t) {
	if (e = e || "", t = t || {}, e instanceof Q) return e;
	if (!(this instanceof Q)) return new Q(e, t);
	var n = Vg(e);
	this._originalInput = e, this._r = n.r, this._g = n.g, this._b = n.b, this._a = n.a, this._roundA = Math.round(100 * this._a) / 100, this._format = t.format || n.format, this._gradientType = t.gradientType, this._r < 1 && (this._r = Math.round(this._r)), this._g < 1 && (this._g = Math.round(this._g)), this._b < 1 && (this._b = Math.round(this._b)), this._ok = n.ok;
}
Q.prototype = {
	isDark: function() {
		return this.getBrightness() < 128;
	},
	isLight: function() {
		return !this.isDark();
	},
	isValid: function() {
		return this._ok;
	},
	getOriginalInput: function() {
		return this._originalInput;
	},
	getFormat: function() {
		return this._format;
	},
	getAlpha: function() {
		return this._a;
	},
	getBrightness: function() {
		var e = this.toRgb();
		return (e.r * 299 + e.g * 587 + e.b * 114) / 1e3;
	},
	getLuminance: function() {
		var e = this.toRgb(), t = e.r / 255, n = e.g / 255, r = e.b / 255, i = t <= .03928 ? t / 12.92 : ((t + .055) / 1.055) ** 2.4, a = n <= .03928 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4, o = r <= .03928 ? r / 12.92 : ((r + .055) / 1.055) ** 2.4;
		return .2126 * i + .7152 * a + .0722 * o;
	},
	setAlpha: function(e) {
		return this._a = d_(e), this._roundA = Math.round(100 * this._a) / 100, this;
	},
	toHsv: function() {
		var e = Gg(this._r, this._g, this._b);
		return {
			h: e.h * 360,
			s: e.s,
			v: e.v,
			a: this._a
		};
	},
	toHsvString: function() {
		var e = Gg(this._r, this._g, this._b), t = Math.round(e.h * 360), n = Math.round(e.s * 100), r = Math.round(e.v * 100);
		return this._a == 1 ? "hsv(" + t + ", " + n + "%, " + r + "%)" : "hsva(" + t + ", " + n + "%, " + r + "%, " + this._roundA + ")";
	},
	toHsl: function() {
		var e = Ug(this._r, this._g, this._b);
		return {
			h: e.h * 360,
			s: e.s,
			l: e.l,
			a: this._a
		};
	},
	toHslString: function() {
		var e = Ug(this._r, this._g, this._b), t = Math.round(e.h * 360), n = Math.round(e.s * 100), r = Math.round(e.l * 100);
		return this._a == 1 ? "hsl(" + t + ", " + n + "%, " + r + "%)" : "hsla(" + t + ", " + n + "%, " + r + "%, " + this._roundA + ")";
	},
	toHex: function(e) {
		return qg(this._r, this._g, this._b, e);
	},
	toHexString: function(e) {
		return "#" + this.toHex(e);
	},
	toHex8: function(e) {
		return Jg(this._r, this._g, this._b, this._a, e);
	},
	toHex8String: function(e) {
		return "#" + this.toHex8(e);
	},
	toRgb: function() {
		return {
			r: Math.round(this._r),
			g: Math.round(this._g),
			b: Math.round(this._b),
			a: this._a
		};
	},
	toRgbString: function() {
		return this._a == 1 ? "rgb(" + Math.round(this._r) + ", " + Math.round(this._g) + ", " + Math.round(this._b) + ")" : "rgba(" + Math.round(this._r) + ", " + Math.round(this._g) + ", " + Math.round(this._b) + ", " + this._roundA + ")";
	},
	toPercentageRgb: function() {
		return {
			r: Math.round(f_(this._r, 255) * 100) + "%",
			g: Math.round(f_(this._g, 255) * 100) + "%",
			b: Math.round(f_(this._b, 255) * 100) + "%",
			a: this._a
		};
	},
	toPercentageRgbString: function() {
		return this._a == 1 ? "rgb(" + Math.round(f_(this._r, 255) * 100) + "%, " + Math.round(f_(this._g, 255) * 100) + "%, " + Math.round(f_(this._b, 255) * 100) + "%)" : "rgba(" + Math.round(f_(this._r, 255) * 100) + "%, " + Math.round(f_(this._g, 255) * 100) + "%, " + Math.round(f_(this._b, 255) * 100) + "%, " + this._roundA + ")";
	},
	toName: function() {
		return this._a === 0 ? "transparent" : this._a < 1 ? !1 : l_[qg(this._r, this._g, this._b, !0)] || !1;
	},
	toFilter: function(e) {
		var t = "#" + Yg(this._r, this._g, this._b, this._a), n = t, r = this._gradientType ? "GradientType = 1, " : "";
		if (e) {
			var i = Q(e);
			n = "#" + Yg(i._r, i._g, i._b, i._a);
		}
		return "progid:DXImageTransform.Microsoft.gradient(" + r + "startColorstr=" + t + ",endColorstr=" + n + ")";
	},
	toString: function(e) {
		var t = !!e;
		e = e || this._format;
		var n = !1, r = this._a < 1 && this._a >= 0;
		return !t && r && (e === "hex" || e === "hex6" || e === "hex3" || e === "hex4" || e === "hex8" || e === "name") ? e === "name" && this._a === 0 ? this.toName() : this.toRgbString() : (e === "rgb" && (n = this.toRgbString()), e === "prgb" && (n = this.toPercentageRgbString()), (e === "hex" || e === "hex6") && (n = this.toHexString()), e === "hex3" && (n = this.toHexString(!0)), e === "hex4" && (n = this.toHex8String(!0)), e === "hex8" && (n = this.toHex8String()), e === "name" && (n = this.toName()), e === "hsl" && (n = this.toHslString()), e === "hsv" && (n = this.toHsvString()), n || this.toHexString());
	},
	clone: function() {
		return Q(this.toString());
	},
	_applyModification: function(e, t) {
		var n = e.apply(null, [this].concat([].slice.call(t)));
		return this._r = n._r, this._g = n._g, this._b = n._b, this.setAlpha(n._a), this;
	},
	lighten: function() {
		return this._applyModification($g, arguments);
	},
	brighten: function() {
		return this._applyModification(e_, arguments);
	},
	darken: function() {
		return this._applyModification(t_, arguments);
	},
	desaturate: function() {
		return this._applyModification(Xg, arguments);
	},
	saturate: function() {
		return this._applyModification(Zg, arguments);
	},
	greyscale: function() {
		return this._applyModification(Qg, arguments);
	},
	spin: function() {
		return this._applyModification(n_, arguments);
	},
	_applyCombination: function(e, t) {
		return e.apply(null, [this].concat([].slice.call(t)));
	},
	analogous: function() {
		return this._applyCombination(o_, arguments);
	},
	complement: function() {
		return this._applyCombination(r_, arguments);
	},
	monochromatic: function() {
		return this._applyCombination(s_, arguments);
	},
	splitcomplement: function() {
		return this._applyCombination(a_, arguments);
	},
	triad: function() {
		return this._applyCombination(i_, [3]);
	},
	tetrad: function() {
		return this._applyCombination(i_, [4]);
	}
}, Q.fromRatio = function(e, t) {
	if (Rg(e) == "object") {
		var n = {};
		for (var r in e) e.hasOwnProperty(r) && (r === "a" ? n[r] = e[r] : n[r] = v_(e[r]));
		e = n;
	}
	return Q(e, t);
};
function Vg(e) {
	var t = {
		r: 0,
		g: 0,
		b: 0
	}, n = 1, r = null, i = null, a = null, o = !1, s = !1;
	return typeof e == "string" && (e = C_(e)), Rg(e) == "object" && (S_(e.r) && S_(e.g) && S_(e.b) ? (t = Hg(e.r, e.g, e.b), o = !0, s = String(e.r).substr(-1) === "%" ? "prgb" : "rgb") : S_(e.h) && S_(e.s) && S_(e.v) ? (r = v_(e.s), i = v_(e.v), t = Kg(e.h, r, i), o = !0, s = "hsv") : S_(e.h) && S_(e.s) && S_(e.l) && (r = v_(e.s), a = v_(e.l), t = Wg(e.h, r, a), o = !0, s = "hsl"), e.hasOwnProperty("a") && (n = e.a)), n = d_(n), {
		ok: o,
		format: e.format || s,
		r: Math.min(255, Math.max(t.r, 0)),
		g: Math.min(255, Math.max(t.g, 0)),
		b: Math.min(255, Math.max(t.b, 0)),
		a: n
	};
}
function Hg(e, t, n) {
	return {
		r: f_(e, 255) * 255,
		g: f_(t, 255) * 255,
		b: f_(n, 255) * 255
	};
}
function Ug(e, t, n) {
	e = f_(e, 255), t = f_(t, 255), n = f_(n, 255);
	var r = Math.max(e, t, n), i = Math.min(e, t, n), a, o, s = (r + i) / 2;
	if (r == i) a = o = 0;
	else {
		var c = r - i;
		switch (o = s > .5 ? c / (2 - r - i) : c / (r + i), r) {
			case e:
				a = (t - n) / c + (t < n ? 6 : 0);
				break;
			case t:
				a = (n - e) / c + 2;
				break;
			case n:
				a = (e - t) / c + 4;
				break;
		}
		a /= 6;
	}
	return {
		h: a,
		s: o,
		l: s
	};
}
function Wg(e, t, n) {
	var r, i, a;
	e = f_(e, 360), t = f_(t, 100), n = f_(n, 100);
	function o(e, t, n) {
		return n < 0 && (n += 1), n > 1 && --n, n < 1 / 6 ? e + (t - e) * 6 * n : n < 1 / 2 ? t : n < 2 / 3 ? e + (t - e) * (2 / 3 - n) * 6 : e;
	}
	if (t === 0) r = i = a = n;
	else {
		var s = n < .5 ? n * (1 + t) : n + t - n * t, c = 2 * n - s;
		r = o(c, s, e + 1 / 3), i = o(c, s, e), a = o(c, s, e - 1 / 3);
	}
	return {
		r: r * 255,
		g: i * 255,
		b: a * 255
	};
}
function Gg(e, t, n) {
	e = f_(e, 255), t = f_(t, 255), n = f_(n, 255);
	var r = Math.max(e, t, n), i = Math.min(e, t, n), a, o, s = r, c = r - i;
	if (o = r === 0 ? 0 : c / r, r == i) a = 0;
	else {
		switch (r) {
			case e:
				a = (t - n) / c + (t < n ? 6 : 0);
				break;
			case t:
				a = (n - e) / c + 2;
				break;
			case n:
				a = (e - t) / c + 4;
				break;
		}
		a /= 6;
	}
	return {
		h: a,
		s: o,
		v: s
	};
}
function Kg(e, t, n) {
	e = f_(e, 360) * 6, t = f_(t, 100), n = f_(n, 100);
	var r = Math.floor(e), i = e - r, a = n * (1 - t), o = n * (1 - i * t), s = n * (1 - (1 - i) * t), c = r % 6, l = [
		n,
		o,
		a,
		a,
		s,
		n
	][c], u = [
		s,
		n,
		n,
		o,
		a,
		a
	][c], d = [
		a,
		a,
		s,
		n,
		n,
		o
	][c];
	return {
		r: l * 255,
		g: u * 255,
		b: d * 255
	};
}
function qg(e, t, n, r) {
	var i = [
		__(Math.round(e).toString(16)),
		__(Math.round(t).toString(16)),
		__(Math.round(n).toString(16))
	];
	return r && i[0].charAt(0) == i[0].charAt(1) && i[1].charAt(0) == i[1].charAt(1) && i[2].charAt(0) == i[2].charAt(1) ? i[0].charAt(0) + i[1].charAt(0) + i[2].charAt(0) : i.join("");
}
function Jg(e, t, n, r, i) {
	var a = [
		__(Math.round(e).toString(16)),
		__(Math.round(t).toString(16)),
		__(Math.round(n).toString(16)),
		__(y_(r))
	];
	return i && a[0].charAt(0) == a[0].charAt(1) && a[1].charAt(0) == a[1].charAt(1) && a[2].charAt(0) == a[2].charAt(1) && a[3].charAt(0) == a[3].charAt(1) ? a[0].charAt(0) + a[1].charAt(0) + a[2].charAt(0) + a[3].charAt(0) : a.join("");
}
function Yg(e, t, n, r) {
	return [
		__(y_(r)),
		__(Math.round(e).toString(16)),
		__(Math.round(t).toString(16)),
		__(Math.round(n).toString(16))
	].join("");
}
Q.equals = function(e, t) {
	return !e || !t ? !1 : Q(e).toRgbString() == Q(t).toRgbString();
}, Q.random = function() {
	return Q.fromRatio({
		r: Math.random(),
		g: Math.random(),
		b: Math.random()
	});
};
function Xg(e, t) {
	t = t === 0 ? 0 : t || 10;
	var n = Q(e).toHsl();
	return n.s -= t / 100, n.s = p_(n.s), Q(n);
}
function Zg(e, t) {
	t = t === 0 ? 0 : t || 10;
	var n = Q(e).toHsl();
	return n.s += t / 100, n.s = p_(n.s), Q(n);
}
function Qg(e) {
	return Q(e).desaturate(100);
}
function $g(e, t) {
	t = t === 0 ? 0 : t || 10;
	var n = Q(e).toHsl();
	return n.l += t / 100, n.l = p_(n.l), Q(n);
}
function e_(e, t) {
	t = t === 0 ? 0 : t || 10;
	var n = Q(e).toRgb();
	return n.r = Math.max(0, Math.min(255, n.r - Math.round(255 * -(t / 100)))), n.g = Math.max(0, Math.min(255, n.g - Math.round(255 * -(t / 100)))), n.b = Math.max(0, Math.min(255, n.b - Math.round(255 * -(t / 100)))), Q(n);
}
function t_(e, t) {
	t = t === 0 ? 0 : t || 10;
	var n = Q(e).toHsl();
	return n.l -= t / 100, n.l = p_(n.l), Q(n);
}
function n_(e, t) {
	var n = Q(e).toHsl(), r = (n.h + t) % 360;
	return n.h = r < 0 ? 360 + r : r, Q(n);
}
function r_(e) {
	var t = Q(e).toHsl();
	return t.h = (t.h + 180) % 360, Q(t);
}
function i_(e, t) {
	if (isNaN(t) || t <= 0) throw Error("Argument to polyad must be a positive number");
	for (var n = Q(e).toHsl(), r = [Q(e)], i = 360 / t, a = 1; a < t; a++) r.push(Q({
		h: (n.h + a * i) % 360,
		s: n.s,
		l: n.l
	}));
	return r;
}
function a_(e) {
	var t = Q(e).toHsl(), n = t.h;
	return [
		Q(e),
		Q({
			h: (n + 72) % 360,
			s: t.s,
			l: t.l
		}),
		Q({
			h: (n + 216) % 360,
			s: t.s,
			l: t.l
		})
	];
}
function o_(e, t, n) {
	t = t || 6, n = n || 30;
	var r = Q(e).toHsl(), i = 360 / n, a = [Q(e)];
	for (r.h = (r.h - (i * t >> 1) + 720) % 360; --t;) r.h = (r.h + i) % 360, a.push(Q(r));
	return a;
}
function s_(e, t) {
	t = t || 6;
	for (var n = Q(e).toHsv(), r = n.h, i = n.s, a = n.v, o = [], s = 1 / t; t--;) o.push(Q({
		h: r,
		s: i,
		v: a
	})), a = (a + s) % 1;
	return o;
}
Q.mix = function(e, t, n) {
	n = n === 0 ? 0 : n || 50;
	var r = Q(e).toRgb(), i = Q(t).toRgb(), a = n / 100;
	return Q({
		r: (i.r - r.r) * a + r.r,
		g: (i.g - r.g) * a + r.g,
		b: (i.b - r.b) * a + r.b,
		a: (i.a - r.a) * a + r.a
	});
}, Q.readability = function(e, t) {
	var n = Q(e), r = Q(t);
	return (Math.max(n.getLuminance(), r.getLuminance()) + .05) / (Math.min(n.getLuminance(), r.getLuminance()) + .05);
}, Q.isReadable = function(e, t, n) {
	var r = Q.readability(e, t), i, a = !1;
	switch (i = w_(n), i.level + i.size) {
		case "AAsmall":
		case "AAAlarge":
			a = r >= 4.5;
			break;
		case "AAlarge":
			a = r >= 3;
			break;
		case "AAAsmall":
			a = r >= 7;
			break;
	}
	return a;
}, Q.mostReadable = function(e, t, n) {
	var r = null, i = 0, a, o, s, c;
	n = n || {}, o = n.includeFallbackColors, s = n.level, c = n.size;
	for (var l = 0; l < t.length; l++) a = Q.readability(e, t[l]), a > i && (i = a, r = Q(t[l]));
	return Q.isReadable(e, r, {
		level: s,
		size: c
	}) || !o ? r : (n.includeFallbackColors = !1, Q.mostReadable(e, ["#fff", "#000"], n));
};
var c_ = Q.names = {
	aliceblue: "f0f8ff",
	antiquewhite: "faebd7",
	aqua: "0ff",
	aquamarine: "7fffd4",
	azure: "f0ffff",
	beige: "f5f5dc",
	bisque: "ffe4c4",
	black: "000",
	blanchedalmond: "ffebcd",
	blue: "00f",
	blueviolet: "8a2be2",
	brown: "a52a2a",
	burlywood: "deb887",
	burntsienna: "ea7e5d",
	cadetblue: "5f9ea0",
	chartreuse: "7fff00",
	chocolate: "d2691e",
	coral: "ff7f50",
	cornflowerblue: "6495ed",
	cornsilk: "fff8dc",
	crimson: "dc143c",
	cyan: "0ff",
	darkblue: "00008b",
	darkcyan: "008b8b",
	darkgoldenrod: "b8860b",
	darkgray: "a9a9a9",
	darkgreen: "006400",
	darkgrey: "a9a9a9",
	darkkhaki: "bdb76b",
	darkmagenta: "8b008b",
	darkolivegreen: "556b2f",
	darkorange: "ff8c00",
	darkorchid: "9932cc",
	darkred: "8b0000",
	darksalmon: "e9967a",
	darkseagreen: "8fbc8f",
	darkslateblue: "483d8b",
	darkslategray: "2f4f4f",
	darkslategrey: "2f4f4f",
	darkturquoise: "00ced1",
	darkviolet: "9400d3",
	deeppink: "ff1493",
	deepskyblue: "00bfff",
	dimgray: "696969",
	dimgrey: "696969",
	dodgerblue: "1e90ff",
	firebrick: "b22222",
	floralwhite: "fffaf0",
	forestgreen: "228b22",
	fuchsia: "f0f",
	gainsboro: "dcdcdc",
	ghostwhite: "f8f8ff",
	gold: "ffd700",
	goldenrod: "daa520",
	gray: "808080",
	green: "008000",
	greenyellow: "adff2f",
	grey: "808080",
	honeydew: "f0fff0",
	hotpink: "ff69b4",
	indianred: "cd5c5c",
	indigo: "4b0082",
	ivory: "fffff0",
	khaki: "f0e68c",
	lavender: "e6e6fa",
	lavenderblush: "fff0f5",
	lawngreen: "7cfc00",
	lemonchiffon: "fffacd",
	lightblue: "add8e6",
	lightcoral: "f08080",
	lightcyan: "e0ffff",
	lightgoldenrodyellow: "fafad2",
	lightgray: "d3d3d3",
	lightgreen: "90ee90",
	lightgrey: "d3d3d3",
	lightpink: "ffb6c1",
	lightsalmon: "ffa07a",
	lightseagreen: "20b2aa",
	lightskyblue: "87cefa",
	lightslategray: "789",
	lightslategrey: "789",
	lightsteelblue: "b0c4de",
	lightyellow: "ffffe0",
	lime: "0f0",
	limegreen: "32cd32",
	linen: "faf0e6",
	magenta: "f0f",
	maroon: "800000",
	mediumaquamarine: "66cdaa",
	mediumblue: "0000cd",
	mediumorchid: "ba55d3",
	mediumpurple: "9370db",
	mediumseagreen: "3cb371",
	mediumslateblue: "7b68ee",
	mediumspringgreen: "00fa9a",
	mediumturquoise: "48d1cc",
	mediumvioletred: "c71585",
	midnightblue: "191970",
	mintcream: "f5fffa",
	mistyrose: "ffe4e1",
	moccasin: "ffe4b5",
	navajowhite: "ffdead",
	navy: "000080",
	oldlace: "fdf5e6",
	olive: "808000",
	olivedrab: "6b8e23",
	orange: "ffa500",
	orangered: "ff4500",
	orchid: "da70d6",
	palegoldenrod: "eee8aa",
	palegreen: "98fb98",
	paleturquoise: "afeeee",
	palevioletred: "db7093",
	papayawhip: "ffefd5",
	peachpuff: "ffdab9",
	peru: "cd853f",
	pink: "ffc0cb",
	plum: "dda0dd",
	powderblue: "b0e0e6",
	purple: "800080",
	rebeccapurple: "663399",
	red: "f00",
	rosybrown: "bc8f8f",
	royalblue: "4169e1",
	saddlebrown: "8b4513",
	salmon: "fa8072",
	sandybrown: "f4a460",
	seagreen: "2e8b57",
	seashell: "fff5ee",
	sienna: "a0522d",
	silver: "c0c0c0",
	skyblue: "87ceeb",
	slateblue: "6a5acd",
	slategray: "708090",
	slategrey: "708090",
	snow: "fffafa",
	springgreen: "00ff7f",
	steelblue: "4682b4",
	tan: "d2b48c",
	teal: "008080",
	thistle: "d8bfd8",
	tomato: "ff6347",
	turquoise: "40e0d0",
	violet: "ee82ee",
	wheat: "f5deb3",
	white: "fff",
	whitesmoke: "f5f5f5",
	yellow: "ff0",
	yellowgreen: "9acd32"
}, l_ = Q.hexNames = u_(c_);
function u_(e) {
	var t = {};
	for (var n in e) e.hasOwnProperty(n) && (t[e[n]] = n);
	return t;
}
function d_(e) {
	return e = parseFloat(e), (isNaN(e) || e < 0 || e > 1) && (e = 1), e;
}
function f_(e, t) {
	h_(e) && (e = "100%");
	var n = g_(e);
	return e = Math.min(t, Math.max(0, parseFloat(e))), n && (e = parseInt(e * t, 10) / 100), Math.abs(e - t) < 1e-6 ? 1 : e % t / parseFloat(t);
}
function p_(e) {
	return Math.min(1, Math.max(0, e));
}
function m_(e) {
	return parseInt(e, 16);
}
function h_(e) {
	return typeof e == "string" && e.indexOf(".") != -1 && parseFloat(e) === 1;
}
function g_(e) {
	return typeof e == "string" && e.indexOf("%") != -1;
}
function __(e) {
	return e.length == 1 ? "0" + e : "" + e;
}
function v_(e) {
	return e <= 1 && (e = e * 100 + "%"), e;
}
function y_(e) {
	return Math.round(parseFloat(e) * 255).toString(16);
}
function b_(e) {
	return m_(e) / 255;
}
var x_ = function() {
	var e = "(?:[-\\+]?\\d*\\.\\d+%?)|(?:[-\\+]?\\d+%?)", t = "[\\s|\\(]+(" + e + ")[,|\\s]+(" + e + ")[,|\\s]+(" + e + ")\\s*\\)?", n = "[\\s|\\(]+(" + e + ")[,|\\s]+(" + e + ")[,|\\s]+(" + e + ")[,|\\s]+(" + e + ")\\s*\\)?";
	return {
		CSS_UNIT: new RegExp(e),
		rgb: RegExp("rgb" + t),
		rgba: RegExp("rgba" + n),
		hsl: RegExp("hsl" + t),
		hsla: RegExp("hsla" + n),
		hsv: RegExp("hsv" + t),
		hsva: RegExp("hsva" + n),
		hex3: /^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
		hex6: /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
		hex4: /^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
		hex8: /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/
	};
}();
function S_(e) {
	return !!x_.CSS_UNIT.exec(e);
}
function C_(e) {
	e = e.replace(zg, "").replace(Bg, "").toLowerCase();
	var t = !1;
	if (c_[e]) e = c_[e], t = !0;
	else if (e == "transparent") return {
		r: 0,
		g: 0,
		b: 0,
		a: 0,
		format: "name"
	};
	var n;
	return (n = x_.rgb.exec(e)) ? {
		r: n[1],
		g: n[2],
		b: n[3]
	} : (n = x_.rgba.exec(e)) ? {
		r: n[1],
		g: n[2],
		b: n[3],
		a: n[4]
	} : (n = x_.hsl.exec(e)) ? {
		h: n[1],
		s: n[2],
		l: n[3]
	} : (n = x_.hsla.exec(e)) ? {
		h: n[1],
		s: n[2],
		l: n[3],
		a: n[4]
	} : (n = x_.hsv.exec(e)) ? {
		h: n[1],
		s: n[2],
		v: n[3]
	} : (n = x_.hsva.exec(e)) ? {
		h: n[1],
		s: n[2],
		v: n[3],
		a: n[4]
	} : (n = x_.hex8.exec(e)) ? {
		r: m_(n[1]),
		g: m_(n[2]),
		b: m_(n[3]),
		a: b_(n[4]),
		format: t ? "name" : "hex8"
	} : (n = x_.hex6.exec(e)) ? {
		r: m_(n[1]),
		g: m_(n[2]),
		b: m_(n[3]),
		format: t ? "name" : "hex"
	} : (n = x_.hex4.exec(e)) ? {
		r: m_(n[1] + "" + n[1]),
		g: m_(n[2] + "" + n[2]),
		b: m_(n[3] + "" + n[3]),
		a: b_(n[4] + "" + n[4]),
		format: t ? "name" : "hex8"
	} : (n = x_.hex3.exec(e)) ? {
		r: m_(n[1] + "" + n[1]),
		g: m_(n[2] + "" + n[2]),
		b: m_(n[3] + "" + n[3]),
		format: t ? "name" : "hex"
	} : !1;
}
function w_(e) {
	var t, n;
	return e = e || {
		level: "AA",
		size: "small"
	}, t = (e.level || "AA").toUpperCase(), n = (e.size || "small").toLowerCase(), t !== "AA" && t !== "AAA" && (t = "AA"), n !== "small" && n !== "large" && (n = "small"), {
		level: t,
		size: n
	};
}
//#endregion
//#region ../../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/color.ts
var T_ = /* @__PURE__ */ "FF000000.FFFFFFFF.FFFF0000.FF00FF00.FF0000FF.FFFFFF00.FFFF00FF.FF00FFFF.FF000000.FFFFFFFF.FFFF0000.FF00FF00.FF0000FF.FFFFFF00.FFFF00FF.FF00FFFF.FF800000.FF008000.FF000080.FF808000.FF800080.FF008080.FFC0C0C0.FF808080.FF9999FF.FF993366.FFFFFFCC.FFCCFFFF.FF660066.FFFF8080.FF0066CC.FFCCCCFF.FF000080.FFFF00FF.FFFFFF00.FF00FFFF.FF800080.FF800000.FF008080.FF0000FF.FF00CCFF.FFCCFFFF.FFCCFFCC.FFFFFF99.FF99CCFF.FFFF99CC.FFCC99FF.FFFFCC99.FF3366FF.FF33CCCC.FF99CC00.FFFFCC00.FFFF9900.FFFF6600.FF666699.FF969696.FF003366.FF339966.FF003300.FF333300.FF993300.FF993366.FF333399.FF333333".split("."), E_ = 240, D_ = 255;
function O_(e, t, n) {
	let r = Math.max(e, t, n), i = Math.min(e, t, n), a = r + i, o = r - i, s = a / 2, c, l;
	if (i == r) return [
		0,
		s,
		0
	];
	l = s <= .5 ? o / a : o / (2 - a);
	let u = (r - e) / o, d = (r - t) / o, f = (r - n) / o;
	return c = e == r ? f - d : t === r ? 2 + u - f : 4 + d - u, c = c / 6 % 1, [
		c,
		s,
		l
	];
}
function k_(e) {
	e.length > 6 && (e = e.substring(2));
	let [t, n, r] = O_(parseInt(e.slice(0, 2), 16) / D_, parseInt(e.slice(2, 4), 16) / D_, parseInt(e.slice(4, 6), 16) / D_);
	return [
		Math.round(t * E_),
		Math.round(n * E_),
		Math.round(r * E_)
	];
}
function A_(e, t, n) {
	return Q({
		h: e / E_ * 360,
		s: n / E_,
		l: t / E_
	}).toHex().toUpperCase();
}
function j_(e, t) {
	return Math.round(e <= 0 ? t * (1 + e) : t * (1 - e) + (E_ - E_ * (1 - e)));
}
function M_(e, t) {
	if (!e) return e;
	let [n, r, i] = k_(e);
	return `FF${A_(n, j_(t, r), i)}`;
}
//#endregion
//#region ../../packages/renderers/spreadsheet/src/spreadsheet/worker/sheetjs/SheetJsModel.ts
var N_, P_ = 8.43, F_ = 15, I_ = "#202124", L_ = 9525, R_ = 480, z_ = 288, B_ = 24, V_ = 8, H_ = 1e5, U_ = 8, W_ = 128, G_ = (e, t) => {
	let n = Math.max(e, 1), r = Math.max(t, 1), i = r - 1;
	if (n * r <= H_) return [{
		s: {
			r: 0,
			c: 0
		},
		e: {
			r: n - 1,
			c: i
		}
	}];
	let a = Math.max(1, Math.min(W_, Math.floor(H_ / r / U_))), o = Math.max(n - a, 0), s = Math.max(1, Math.floor(H_ / r / a)), c = Math.min(U_, s, Math.ceil(n / a)), l = /* @__PURE__ */ new Set();
	for (let e = 0; e < c; e += 1) {
		let t = c === 1 ? 0 : Math.round(o * e / (c - 1));
		l.add(t);
	}
	return Array.from(l, (e) => ({
		s: {
			r: e,
			c: 0
		},
		e: {
			r: Math.min(e + a - 1, n - 1),
			c: i
		}
	}));
}, K_ = (e) => typeof e == "number" && Number.isFinite(e) ? e : void 0, q_ = {
	rowHeight: (() => {
		var e;
		let t = Lg.row_height_to_px, n = typeof t == "function" ? t(F_) : void 0;
		return Math.ceil((e = K_(n)) == null ? 20 : e);
	})(),
	colWidth: (() => {
		var e;
		let t = Lg.col_width_to_px, n = typeof t == "function" ? t(P_) : void 0;
		return Math.ceil((e = K_(n)) == null ? 64 : e);
	})()
}, J_ = (e, t) => `${e}-${t}`, Y_ = (e) => e ? e.w !== void 0 && e.w !== null ? `${e.w}` : e.v === void 0 || e.v === null ? "" : e.t === "d" && e.v instanceof Date ? e.v.toLocaleDateString() : `${e.v}` : "", X_ = (e) => {
	if (!e) return;
	if (e.hidden) return 0;
	let t = K_(e.wpx);
	if (t !== void 0 && t >= 0) return Math.ceil(t);
	let n = K_(e.width);
	if (n === 0) return 0;
	if (n !== void 0 && n > 0) {
		let t = Lg.col_width_to_px, r = typeof t == "function" ? K_(t(n)) : void 0;
		return Math.ceil(r === void 0 ? n * (e.MDW || 7) : r);
	}
	let r = K_(e.wch);
	if (r === 0) return 0;
	if (r !== void 0 && r > 0) return Math.ceil(r * (e.MDW || 7) + 5);
}, Z_ = (e, t, n) => {
	var r;
	return typeof e == "number" ? e : (r = e == null ? void 0 : e[t]) == null ? n : r;
}, Q_ = (e) => (e || 0) / L_, $_ = (e) => {
	var t, n, r;
	return e ? e.hidden ? !0 : ((t = K_(e.wpx)) == null ? -1 : t) >= 0 || ((n = K_(e.width)) == null ? -1 : n) >= 0 || ((r = K_(e.wch)) == null ? -1 : r) >= 0 : !1;
}, ev = (e) => {
	if (!e) return;
	if (e.hidden) return 0;
	let t = K_(e.hpx);
	if (t !== void 0 && t >= 0) return Math.ceil(t);
	let n = K_(e.hpt);
	if (n !== void 0 && n >= 0) {
		let e = Lg.row_height_to_px, t = typeof e == "function" ? K_(e(n)) : void 0;
		return Math.ceil(t == null ? n * 96 / 72 : t);
	}
}, tv = (e) => {
	switch (`${e || ""}`) {
		case "left": return "Left";
		case "center":
		case "centerContinuous":
		case "distributed":
		case "justify": return "Center";
		case "right": return "Right";
		default: return;
	}
}, nv = (e) => {
	switch (`${e || ""}`) {
		case "top": return "Top";
		case "center":
		case "middle":
		case "distributed":
		case "justify": return "Middle";
		case "bottom": return "Bottom";
		default: return;
	}
}, rv = (e) => {
	if (!e) return "";
	let t = [tv(e.horizontal), nv(e.vertical)].filter(Boolean).map((e) => `ht${e}`);
	return e.wrapText && t.push("htWrap"), e.shrinkToFit && t.push("htShrink"), t.join(" ");
}, iv = (e) => {
	if (!e) return;
	let t = e.raw_rgb && typeof e.tint == "number" ? M_(e.raw_rgb, e.tint) : void 0, n = e.rgb || t || e.raw_rgb;
	if (typeof n == "string" && n) {
		let e = n.startsWith("#") ? n.slice(1) : n;
		return `#${e.length > 6 ? e.slice(-6) : e}`;
	}
	let r = typeof e.indexed == "number" ? e.indexed : e.index;
	if (typeof r == "number") {
		let e = T_[r];
		if (e) return `#${e.slice(-6)}`;
	}
}, av = (e) => e ? (typeof e.indexed == "number" ? e.indexed : e.index) === 32767 : !1, ov = (e) => av(e) ? I_ : iv(e), sv = (e) => {
	switch (e) {
		case "hair": return "0.5px";
		case "medium":
		case "mediumDashed":
		case "mediumDashDot":
		case "mediumDashDotDot": return "2px";
		case "thick":
		case "double": return "3px";
		default: return "1px";
	}
}, cv = (e) => {
	switch (e) {
		case "dashed":
		case "mediumDashed":
		case "dashDot":
		case "mediumDashDot":
		case "dashDotDot":
		case "mediumDashDotDot":
		case "slantDashDot": return "dashed";
		case "dotted": return "dotted";
		case "double": return "double";
		default: return "solid";
	}
}, lv = (...e) => {
	let t = {};
	return e.forEach((e) => {
		e && Object.entries(e).forEach(([e, n]) => {
			if (n && typeof n == "object" && !Array.isArray(n)) {
				t[e] = {
					...t[e] && typeof t[e] == "object" ? t[e] : {},
					...n
				};
				return;
			}
			t[e] = n;
		});
	}), Object.keys(t).length ? t : void 0;
}, uv = (e) => {
	let t = {}, n = (e == null ? void 0 : e.fill) || {}, r = iv((e == null ? void 0 : e.fgColor) || n.fgColor || (e == null ? void 0 : e.bgColor) || n.bgColor), i = (e == null ? void 0 : e.patternType) || n.patternType;
	r && i !== "none" && (t.backgroundColor = r);
	let a = (e == null ? void 0 : e.font) || {}, o = ov(a.color || (e == null ? void 0 : e.color));
	o && (t.color = o), (a.italic || e != null && e.italic) && (t.fontStyle = "italic"), (a.bold || e != null && e.bold) && (t.fontWeight = "bold");
	let s = a.sz || (e == null ? void 0 : e.sz);
	s && (t.fontSize = `${s}px`);
	let c = a.name || (e == null ? void 0 : e.name);
	c && (t.fontFamily = c);
	let l = e == null ? void 0 : e.border;
	return l && [
		"top",
		"right",
		"bottom",
		"left"
	].forEach((e) => {
		let n = l[e];
		if (!(n != null && n.style) || n.style === "none") return;
		let r = `border${e.charAt(0).toUpperCase()}${e.slice(1)}`;
		t[`${r}Width`] = sv(n.style), t[`${r}Style`] = cv(n.style), t[`${r}Color`] = iv(n.color) || "#000000";
	}), Object.keys(t).length ? t : void 0;
}, dv = (e, t) => {
	for (let n of e) for (let e = 0; e < t; e += 1) (n[e] === void 0 || n[e] === null) && (n[e] = "");
	return e;
}, fv = class e {
	static create(t, n = {}) {
		return new e(t, n);
	}
	constructor(e, t) {
		this._ws = e, this._startRow = Math.max(t.startRow || 0, 0), this._pageSize = Math.max(t.pageSize || 500, 1), this._totalRows = t.totalRows, this._totalCols = t.totalCols, this._charts = t.charts || [], this._cellImages = t.cellImages || [], this._cellImageKeys = new Set(this._cellImages.map((e) => J_(e.row, e.col)));
		let { "!ref": n } = e;
		this.range = Lg.decode_range(n || "A1");
	}
	get ws() {
		return this._ws;
	}
	get defaults() {
		return e.defaults;
	}
	get data() {
		var e;
		return (e = this._data) == null ? this._data = this.getData() : e;
	}
	get cell() {
		var e;
		return (e = this._cell) == null ? this._cell = this.getCell() : e;
	}
	get merge() {
		var e;
		return (e = this._merge) == null ? this._merge = this.getMerge() : e;
	}
	get columns() {
		var e;
		return (e = this._columns) == null ? this._columns = this.getColumns() : e;
	}
	get structure() {
		var e;
		return (e = this._structure) == null ? this._structure = this.getStructure() : e;
	}
	get rowHeights() {
		var e;
		return (e = this._rowHeights) == null ? this._rowHeights = this.getRowHeights() : e;
	}
	get colWidths() {
		var e;
		return (e = this._colWidths) == null ? this._colWidths = this.getColWidths() : e;
	}
	get meta() {
		var e;
		return (e = this._meta) == null ? this._meta = {
			startRow: this.startRow,
			endRow: this.endRow,
			pageSize: this._pageSize,
			totalRows: this.totalRows,
			totalCols: this.totalCols
		} : e;
	}
	get totalRows() {
		var e;
		return (e = this._totalRows) == null ? this.range.e.r + 1 : e;
	}
	get totalCols() {
		var e;
		return (e = this._totalCols) == null ? this.range.e.c + 1 : e;
	}
	get startRow() {
		return Math.min(this._startRow, Math.max(this.totalRows - 1, 0));
	}
	get endRow() {
		return Math.min(this.startRow + this._pageSize, this.totalRows);
	}
	get denseRows() {
		let e = this.ws;
		return Array.isArray(e) ? e : Array.isArray(e["!data"]) ? e["!data"] : void 0;
	}
	getCellAt(e, t) {
		let n = this.denseRows;
		if (n) {
			var r;
			return (r = n[e]) == null ? void 0 : r[t];
		}
		return this.ws[Lg.encode_cell({
			r: e,
			c: t
		})];
	}
	getAxisOffset(e, t, n) {
		let r = 0;
		for (let i = 0; i < e; i += 1) r += Z_(t, i, n);
		return r;
	}
	getMarkerLeft(e) {
		return e ? this.getAxisOffset(e.col || 0, this.getColWidths(), this.defaults.colWidth) + Q_(e.colOff) : 0;
	}
	getMarkerTop(e) {
		return e ? this.getAxisOffset(e.row || 0, this.getAllRowHeights(), this.defaults.rowHeight) + Q_(e.rowOff) : 0;
	}
	getImages() {
		let e = this.ws["!drawings"], t = (e == null ? void 0 : e.images) || [];
		if (!t.length && !this._cellImages.length) return;
		let n = t.flatMap((e, t) => {
			var n, r, i, a, o;
			let s = e.anchor;
			if (!e.dataURI || !s) return [];
			let c = s.from, l = c ? this.getMarkerLeft(c) : Q_((n = s.pos) == null ? void 0 : n.x), u = c ? this.getMarkerTop(c) : Q_((r = s.pos) == null ? void 0 : r.y), d = s.to ? this.getMarkerLeft(s.to) : l + Q_((i = s.ext) == null ? void 0 : i.cx), f = s.to ? this.getMarkerTop(s.to) : u + Q_((a = s.ext) == null ? void 0 : a.cy);
			return [{
				id: e.id || ((o = e.objectId) == null ? void 0 : o.toString()) || e.target || `image-${t + 1}`,
				src: e.dataURI,
				contentType: e.contentType,
				left: Math.max(0, l),
				top: Math.max(0, u),
				width: Math.max(1, d > l ? d - l : R_),
				height: Math.max(1, f > u ? f - u : z_),
				row: (c == null ? void 0 : c.row) || 0,
				col: (c == null ? void 0 : c.col) || 0
			}];
		}), r = this._cellImages.flatMap((e) => {
			let t = Z_(this.getColWidths(), e.col, this.defaults.colWidth), n = Z_(this.getAllRowHeights(), e.row, this.defaults.rowHeight);
			return t <= 0 || n <= 0 ? [] : [{
				...e,
				left: this.getAxisOffset(e.col, this.getColWidths(), this.defaults.colWidth),
				top: this.getAxisOffset(e.row, this.getAllRowHeights(), this.defaults.rowHeight),
				width: t,
				height: n
			}];
		}), i = [...n, ...r];
		return i.length ? i : void 0;
	}
	getCharts() {
		let e = this._charts.map((e) => {
			var t, n;
			let r = this.getMarkerLeft(e.from), i = this.getMarkerTop(e.from), a = e.to ? this.getMarkerLeft(e.to) : r + Q_((t = e.ext) == null ? void 0 : t.width), o = e.to ? this.getMarkerTop(e.to) : i + Q_((n = e.ext) == null ? void 0 : n.height);
			return {
				id: e.id,
				type: e.type,
				title: e.title,
				categoryAxisTitle: e.categoryAxisTitle,
				valueAxisTitle: e.valueAxisTitle,
				barDirection: e.barDirection,
				grouping: e.grouping,
				legendPosition: e.legendPosition,
				series: e.series,
				left: Math.max(0, r),
				top: Math.max(0, i),
				width: Math.max(1, a > r ? a - r : R_),
				height: Math.max(1, o > i ? o - i : z_),
				row: e.from.row,
				col: e.from.col
			};
		});
		return e.length ? e : void 0;
	}
	getAllMerge() {
		let { "!merges": e = [] } = this.ws;
		return e.map((e) => {
			let { r: t, c: n } = e.s, { r, c: i } = e.e;
			return {
				row: t,
				col: n,
				rowspan: r - t + 1,
				colspan: i - n + 1
			};
		});
	}
	getData() {
		let e = [], t = this.denseRows;
		for (let n = this.startRow; n < this.endRow; n += 1) {
			let r = t == null ? void 0 : t[n], i = r ? r.slice(0, this.totalCols).map((e, t) => this._cellImageKeys.has(J_(n, t)) ? "" : Y_(e)) : Array.from({ length: this.totalCols }, (e, t) => this._cellImageKeys.has(J_(n, t)) ? "" : Y_(this.getCellAt(n, t)));
			e.push(i);
		}
		return dv(e, this.totalCols);
	}
	getCell() {
		let e = {}, { "!cols": t = [], "!rows": n = [] } = this.ws;
		for (let a = this.startRow; a < this.endRow; a += 1) for (let o = 0; o < this.totalCols; o += 1) {
			var r, i;
			let s = this.getCellAt(a, o), c = lv((r = t[o]) == null ? void 0 : r.s, (i = n[a]) == null ? void 0 : i.s, s == null ? void 0 : s.s), l = rv(c == null ? void 0 : c.alignment), u = uv(c);
			!l && !u || (e[J_(a - this.startRow, o)] = {
				...l ? { className: l } : {},
				style: u || {}
			});
		}
		return e;
	}
	getMerge() {
		return this.getAllMerge().flatMap((e) => e.row + e.rowspan - 1 < this.startRow || e.row >= this.endRow || e.row < this.startRow ? [] : {
			...e,
			row: e.row - this.startRow
		});
	}
	getRowHeights() {
		let { rowHeight: e } = this.defaults, { "!rows": t = [] } = this.ws, n = [];
		if (t.length && this.endRow > this.startRow) for (let e = this.startRow; e < this.endRow; e += 1) {
			let r = ev(t[e]);
			r !== void 0 && (n[e - this.startRow] = r);
		}
		return n.length === 1 ? n[0] : n.length ? n : e;
	}
	getAllRowHeights() {
		let { "!rows": e = [] } = this.ws, t = [];
		if (e.length) for (let n = 0; n < this.totalRows; n += 1) {
			let r = ev(e[n]);
			r !== void 0 && (t[n] = r);
		}
		return t.length ? t : void 0;
	}
	getAutoFitColumns() {
		let e = Lg.auto_fit_columns || Lg.autofit_columns;
		if (typeof e == "function") try {
			let r = this.getAutoFitSampleRanges(), i = [];
			for (let a of r) {
				let r = e(this.ws, {
					range: a,
					set: !1,
					skipHidden: !0,
					includeMerged: !1,
					minPx: B_,
					padding: V_
				});
				for (let e = 0; e < this.totalCols; e += 1) {
					var t, n;
					let a = r == null ? void 0 : r[e];
					if (!a) continue;
					let o = (t = X_(i[e])) == null ? -1 : t, s = (n = X_(a)) == null ? -1 : n;
					(!i[e] || s > o) && (i[e] = a);
				}
			}
			return i.length ? i : void 0;
		} catch (e) {
			console.warn("[file-viewer] Excel 自动列宽计算失败，已回退到原始列宽。", e);
			return;
		}
	}
	getAutoFitSampleRanges() {
		return G_(this.totalRows, this.totalCols);
	}
	get autoFitColumns() {
		return this._autoFitColumns === void 0 && (this._autoFitColumns = this.getAutoFitColumns() || null), this._autoFitColumns || void 0;
	}
	getColumnMeta(e, t) {
		var n;
		let r = e[t];
		return $_(r) || this.hasAnchoredObjects ? r : ((n = this.autoFitColumns) == null ? void 0 : n[t]) || r;
	}
	get hasAnchoredObjects() {
		var e;
		let t = this.ws["!drawings"];
		return !!(!(t == null || (e = t.images) == null) && e.length) || !!this._charts.length || !!this._cellImages.length;
	}
	getColWidths() {
		let { colWidth: e } = this.defaults, { "!cols": t = [] } = this.ws, n = [];
		for (let e = 0; e < this.totalCols; e += 1) {
			let r = X_(this.getColumnMeta(t, e));
			r !== void 0 && (n[e] = r);
		}
		return n.length ? n : e;
	}
	getColumns() {
		let { "!cols": e = [] } = this.ws;
		return Array.from({ length: this.totalCols }, (t, n) => {
			var r;
			let i = this.getColumnMeta(e, n);
			return {
				key: n + 1,
				title: Lg.encode_col(n),
				hidden: !!(i != null && i.hidden),
				editor: !1,
				className: rv(i == null || (r = i.s) == null ? void 0 : r.alignment),
				renderer: "styleRender"
			};
		});
	}
	getStructure() {
		return {
			merge: this.getAllMerge(),
			colWidths: this.getColWidths(),
			rowHeights: this.getAllRowHeights(),
			columns: this.getColumns(),
			images: this.getImages(),
			charts: this.getCharts()
		};
	}
	toObject(e = {}) {
		let { defaults: t, data: n, cell: r, merge: i, rowHeights: a, meta: o } = this;
		return {
			defaults: t,
			data: n,
			cell: r,
			merge: i,
			rowHeights: a,
			...e.includeLayout === !1 ? {} : {
				colWidths: this.colWidths,
				columns: this.columns
			},
			meta: o
		};
	}
};
N_ = fv, N_.defaults = q_;
//#endregion
//#region ../../node_modules/.pnpm/@xmldom+xmldom@0.9.10/node_modules/@xmldom/xmldom/lib/conventions.js
var pv = /* @__PURE__ */ o(((e) => {
	function t(e, t, n) {
		if (n === void 0 && (n = Array.prototype), e && typeof n.find == "function") return n.find.call(e, t);
		for (var i = 0; i < e.length; i++) if (r(e, i)) {
			var a = e[i];
			if (t.call(void 0, a, i, e)) return a;
		}
	}
	function n(e, t) {
		return t === void 0 && (t = Object), t && typeof t.getOwnPropertyDescriptors == "function" && (e = t.create(null, t.getOwnPropertyDescriptors(e))), t && typeof t.freeze == "function" ? t.freeze(e) : e;
	}
	function r(e, t) {
		return Object.prototype.hasOwnProperty.call(e, t);
	}
	function i(e, t) {
		if (typeof e != "object" || !e) throw TypeError("target is not an object");
		for (var n in t) r(t, n) && (e[n] = t[n]);
		return e;
	}
	var a = n({
		allowfullscreen: !0,
		async: !0,
		autofocus: !0,
		autoplay: !0,
		checked: !0,
		controls: !0,
		default: !0,
		defer: !0,
		disabled: !0,
		formnovalidate: !0,
		hidden: !0,
		ismap: !0,
		itemscope: !0,
		loop: !0,
		multiple: !0,
		muted: !0,
		nomodule: !0,
		novalidate: !0,
		open: !0,
		playsinline: !0,
		readonly: !0,
		required: !0,
		reversed: !0,
		selected: !0
	});
	function o(e) {
		return r(a, e.toLowerCase());
	}
	var s = n({
		area: !0,
		base: !0,
		br: !0,
		col: !0,
		embed: !0,
		hr: !0,
		img: !0,
		input: !0,
		link: !0,
		meta: !0,
		param: !0,
		source: !0,
		track: !0,
		wbr: !0
	});
	function c(e) {
		return r(s, e.toLowerCase());
	}
	var l = n({
		script: !1,
		style: !1,
		textarea: !0,
		title: !0
	});
	function u(e) {
		var t = e.toLowerCase();
		return r(l, t) && !l[t];
	}
	function d(e) {
		var t = e.toLowerCase();
		return r(l, t) && l[t];
	}
	function f(e) {
		return e === m.HTML;
	}
	function p(e) {
		return f(e) || e === m.XML_XHTML_APPLICATION;
	}
	var m = n({
		HTML: "text/html",
		XML_APPLICATION: "application/xml",
		XML_TEXT: "text/xml",
		XML_XHTML_APPLICATION: "application/xhtml+xml",
		XML_SVG_IMAGE: "image/svg+xml"
	}), h = Object.keys(m).map(function(e) {
		return m[e];
	});
	function g(e) {
		return h.indexOf(e) > -1;
	}
	var _ = n({
		HTML: "http://www.w3.org/1999/xhtml",
		SVG: "http://www.w3.org/2000/svg",
		XML: "http://www.w3.org/XML/1998/namespace",
		XMLNS: "http://www.w3.org/2000/xmlns/"
	});
	e.assign = i, e.find = t, e.freeze = n, e.HTML_BOOLEAN_ATTRIBUTES = a, e.HTML_RAW_TEXT_ELEMENTS = l, e.HTML_VOID_ELEMENTS = s, e.hasDefaultHTMLNamespace = p, e.hasOwn = r, e.isHTMLBooleanAttribute = o, e.isHTMLRawTextElement = u, e.isHTMLEscapableRawTextElement = d, e.isHTMLMimeType = f, e.isHTMLVoidElement = c, e.isValidMimeType = g, e.MIME_TYPE = m, e.NAMESPACE = _;
})), mv = /* @__PURE__ */ o(((e) => {
	var t = pv();
	function n(e, t) {
		e.prototype = Object.create(Error.prototype, {
			constructor: { value: e },
			name: {
				value: e.name,
				enumerable: !0,
				writable: t
			}
		});
	}
	var r = t.freeze({
		Error: "Error",
		IndexSizeError: "IndexSizeError",
		DomstringSizeError: "DomstringSizeError",
		HierarchyRequestError: "HierarchyRequestError",
		WrongDocumentError: "WrongDocumentError",
		InvalidCharacterError: "InvalidCharacterError",
		NoDataAllowedError: "NoDataAllowedError",
		NoModificationAllowedError: "NoModificationAllowedError",
		NotFoundError: "NotFoundError",
		NotSupportedError: "NotSupportedError",
		InUseAttributeError: "InUseAttributeError",
		InvalidStateError: "InvalidStateError",
		SyntaxError: "SyntaxError",
		InvalidModificationError: "InvalidModificationError",
		NamespaceError: "NamespaceError",
		InvalidAccessError: "InvalidAccessError",
		ValidationError: "ValidationError",
		TypeMismatchError: "TypeMismatchError",
		SecurityError: "SecurityError",
		NetworkError: "NetworkError",
		AbortError: "AbortError",
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
	}), i = Object.keys(r);
	function a(e) {
		return typeof e == "number" && e >= 1 && e <= 25;
	}
	function o(e) {
		return typeof e == "string" && e.substring(e.length - r.Error.length) === r.Error;
	}
	function s(e, t) {
		a(e) ? (this.name = i[e], this.message = t || "") : (this.message = e, this.name = o(t) ? t : r.Error), Error.captureStackTrace && Error.captureStackTrace(this, s);
	}
	n(s, !0), Object.defineProperties(s.prototype, { code: {
		enumerable: !0,
		get: function() {
			var e = i.indexOf(this.name);
			return a(e) ? e : 0;
		}
	} });
	for (var c = {
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
	}, l = Object.entries(c), u = 0; u < l.length; u++) {
		var d = l[u][0];
		s[d] = l[u][1];
	}
	function f(e, t) {
		this.message = e, this.locator = t, Error.captureStackTrace && Error.captureStackTrace(this, f);
	}
	n(f), e.DOMException = s, e.DOMExceptionName = r, e.ExceptionCode = c, e.ParseError = f;
})), hv = /* @__PURE__ */ o(((e) => {
	function t(e) {
		try {
			typeof e != "function" && (e = RegExp);
			var t = new e("𝌆", "u").exec("𝌆");
			return !!t && t[0].length === 2;
		} catch {}
		return !1;
	}
	var n = t();
	function r(e) {
		if (e.source[0] !== "[") throw Error(e + " can not be used with chars");
		return e.source.slice(1, e.source.lastIndexOf("]"));
	}
	function i(e, t) {
		if (e.source[0] !== "[") throw Error("/" + e.source + "/ can not be used with chars_without");
		if (!t || typeof t != "string") throw Error(JSON.stringify(t) + " is not a valid search");
		if (e.source.indexOf(t) === -1) throw Error("\"" + t + "\" is not is /" + e.source + "/");
		if (t === "-" && e.source.indexOf(t) !== 1) throw Error("\"" + t + "\" is not at the first postion of /" + e.source + "/");
		return new RegExp(e.source.replace(t, ""), n ? "u" : "");
	}
	function a(e) {
		var t = this;
		return new RegExp(Array.prototype.slice.call(arguments).map(function(e) {
			var n = typeof e == "string";
			if (n && t === void 0 && e === "|") throw Error("use regg instead of reg to wrap expressions with `|`!");
			return n ? e : e.source;
		}).join(""), n ? "mu" : "m");
	}
	function o(e) {
		if (arguments.length === 0) throw Error("no parameters provided");
		return a.apply(o, ["(?:"].concat(Array.prototype.slice.call(arguments), [")"]));
	}
	var s = "�", c = /[-\x09\x0A\x0D\x20-\x2C\x2E-\uD7FF\uE000-\uFFFD]/;
	n && (c = a("[", r(c), "\\u{10000}-\\u{10FFFF}", "]"));
	var l = RegExp("[^" + r(c) + "]", n ? "u" : ""), u = /[\x20\x09\x0D\x0A]/, d = r(u), f = a(u, "+"), p = a(u, "*"), m = /[:_a-zA-Z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
	n && (m = a("[", r(m), "\\u{10000}-\\u{10FFFF}", "]"));
	var h = a("[", r(m), r(/[-.0-9\xB7]/), r(/[\u0300-\u036F\u203F-\u2040]/), "]"), g = a(m, h, "*"), _ = a(h, "+"), v = o(a("&", g, ";"), "|", o(/&#[0-9]+;|&#x[0-9a-fA-F]+;/)), y = a("%", g, ";"), b = o(a("\"", o(/[^%&"]/, "|", y, "|", v), "*", "\""), "|", a("'", o(/[^%&']/, "|", y, "|", v), "*", "'")), x = o("\"", o(/[^<&"]/, "|", v), "*", "\"", "|", "'", o(/[^<&']/, "|", v), "*", "'"), S = a(i(m, ":"), i(h, ":"), "*"), C = a(S, o(":", S), "?"), w = a("^", C, "$"), T = a("(", C, ")"), E = o(/"[^"]*"|'[^']*'/), D = a(/^<\?/, "(", g, ")", o(f, "(", c, "*?)"), "?", /\?>/), O = /[\x20\x0D\x0Aa-zA-Z0-9-'()+,./:=?;!*#@$_%]/, k = o("\"", O, "*\"", "|", "'", i(O, "'"), "*'"), A = "<!--", j = "-->", M = a(A, o(i(c, "-"), "|", a("-", i(c, "-"))), "*", j), N = "#PCDATA", P = o("EMPTY", "|", "ANY", "|", o(a(/\(/, p, N, o(p, /\|/, p, C), "*", p, /\)\*/), "|", a(/\(/, p, N, p, /\)/)), "|", a(/\([^>]+\)/, /[?*+]?/)), F = a("<!ELEMENT", f, o(C, "|", y), f, o(P, "|", y), p, ">"), I = a("<!ATTLIST", f, g, o(f, g, f, o(/CDATA|ID|IDREF|IDREFS|ENTITY|ENTITIES|NMTOKEN|NMTOKENS/, "|", o(a("NOTATION", f, /\(/, p, g, o(p, /\|/, p, g), "*", p, /\)/), "|", a(/\(/, p, _, o(p, /\|/, p, _), "*", p, /\)/))), f, o(/#REQUIRED|#IMPLIED/, "|", o(o("#FIXED", f), "?", x))), "*", p, ">"), L = "about:legacy-compat", R = o("\"" + L + "\"", "|", "'" + L + "'"), z = "SYSTEM", B = "PUBLIC", V = o(o(z, f, E), "|", o(B, f, k, f, E)), H = a("^", o(o(z, f, "(?<SystemLiteralOnly>", E, ")"), "|", o(B, f, "(?<PubidLiteral>", k, ")", f, "(?<SystemLiteral>", E, ")"))), U = a("^", k, "$"), W = a("^", E, "$"), ee = o(b, "|", o(V, o(f, "NDATA", f, g), "?")), te = "<!ENTITY", ne = o(a(te, f, g, f, ee, p, ">"), "|", a(te, f, "%", f, g, f, o(b, "|", V), p, ">")), re = a("<!NOTATION", f, g, f, o(V, "|", a(B, f, k)), p, ">"), G = a(p, "=", p), ie = /1[.]\d+/, ae = a(f, "version", G, o("'", ie, "'", "|", "\"", ie, "\"")), K = /[A-Za-z][-A-Za-z0-9._]*/, oe = a(/^<\?xml/, ae, o(f, "encoding", G, o("\"", K, "\"", "|", "'", K, "'")), "?", o(f, "standalone", G, o("'", o("yes", "|", "no"), "'", "|", "\"", o("yes", "|", "no"), "\"")), "?", p, /\?>/), q = "<!DOCTYPE", se = "<![CDATA[", ce = "]]>", J = a(/<!\[CDATA\[/, a(c, "*?", /\]\]>/));
	e.chars = r, e.chars_without = i, e.detectUnicodeSupport = t, e.reg = a, e.regg = o, e.ABOUT_LEGACY_COMPAT = L, e.ABOUT_LEGACY_COMPAT_SystemLiteral = R, e.AttlistDecl = I, e.CDATA_START = se, e.CDATA_END = ce, e.CDSect = J, e.Char = c, e.Comment = M, e.COMMENT_START = A, e.COMMENT_END = j, e.DOCTYPE_DECL_START = q, e.elementdecl = F, e.EntityDecl = ne, e.EntityValue = b, e.ExternalID = V, e.ExternalID_match = H, e.Name = g, e.NotationDecl = re, e.Reference = v, e.PEReference = y, e.PI = D, e.PUBLIC = B, e.PubidLiteral = k, e.PubidLiteral_match = U, e.QName = C, e.QName_exact = w, e.QName_group = T, e.S = f, e.SChar_s = d, e.S_OPT = p, e.SYSTEM = z, e.SystemLiteral = E, e.SystemLiteral_match = W, e.InvalidChar = l, e.UNICODE_REPLACEMENT_CHARACTER = s, e.UNICODE_SUPPORT = n, e.XMLDecl = oe;
})), gv = /* @__PURE__ */ o(((e) => {
	var t = pv(), n = t.find, r = t.hasDefaultHTMLNamespace, i = t.hasOwn, a = t.isHTMLMimeType, o = t.isHTMLRawTextElement, s = t.isHTMLVoidElement, c = t.MIME_TYPE, l = t.NAMESPACE, u = Symbol(), d = mv(), f = d.DOMException, p = d.DOMExceptionName, m = hv();
	function h(e) {
		if (e !== u) throw TypeError("Illegal constructor");
	}
	function g(e) {
		return e !== "";
	}
	function _(e) {
		return e ? e.split(/[\t\n\f\r ]+/).filter(g) : [];
	}
	function v(e, t) {
		return i(e, t) || (e[t] = !0), e;
	}
	function y(e) {
		if (!e) return [];
		var t = _(e);
		return Object.keys(t.reduce(v, {}));
	}
	function b(e) {
		return function(t) {
			return e && e.indexOf(t) !== -1;
		};
	}
	function x(e) {
		if (!m.QName_exact.test(e)) throw new f(f.INVALID_CHARACTER_ERR, "invalid character in qualified name \"" + e + "\"");
	}
	function S(e, n) {
		x(n), e = e || null;
		var r = null, i = n;
		if (n.indexOf(":") >= 0) {
			var a = n.split(":");
			r = a[0], i = a[1];
		}
		if (r !== null && e === null) throw new f(f.NAMESPACE_ERR, "prefix is non-null and namespace is null");
		if (r === "xml" && e !== t.NAMESPACE.XML) throw new f(f.NAMESPACE_ERR, "prefix is \"xml\" and namespace is not the XML namespace");
		if ((r === "xmlns" || n === "xmlns") && e !== t.NAMESPACE.XMLNS) throw new f(f.NAMESPACE_ERR, "either qualifiedName or prefix is \"xmlns\" and namespace is not the XMLNS namespace");
		if (e === t.NAMESPACE.XMLNS && r !== "xmlns" && n !== "xmlns") throw new f(f.NAMESPACE_ERR, "namespace is the XMLNS namespace and neither qualifiedName nor prefix is \"xmlns\"");
		return [
			e,
			r,
			i
		];
	}
	function C(e, t) {
		for (var n in e) i(e, n) && (t[n] = e[n]);
	}
	function w(e, t) {
		var n = e.prototype;
		if (!(n instanceof t)) {
			function r() {}
			r.prototype = t.prototype, r = new r(), C(n, r), e.prototype = n = r;
		}
		n.constructor != e && (typeof e != "function" && console.error("unknown Class:" + e), n.constructor = e);
	}
	var T = {}, E = T.ELEMENT_NODE = 1, D = T.ATTRIBUTE_NODE = 2, O = T.TEXT_NODE = 3, k = T.CDATA_SECTION_NODE = 4, A = T.ENTITY_REFERENCE_NODE = 5, j = T.ENTITY_NODE = 6, M = T.PROCESSING_INSTRUCTION_NODE = 7, N = T.COMMENT_NODE = 8, P = T.DOCUMENT_NODE = 9, F = T.DOCUMENT_TYPE_NODE = 10, I = T.DOCUMENT_FRAGMENT_NODE = 11, L = T.NOTATION_NODE = 12, R = t.freeze({
		DOCUMENT_POSITION_DISCONNECTED: 1,
		DOCUMENT_POSITION_PRECEDING: 2,
		DOCUMENT_POSITION_FOLLOWING: 4,
		DOCUMENT_POSITION_CONTAINS: 8,
		DOCUMENT_POSITION_CONTAINED_BY: 16,
		DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32
	});
	function z(e, t) {
		if (t.length < e.length) return z(t, e);
		var n = null;
		for (var r in e) {
			if (e[r] !== t[r]) return n;
			n = e[r];
		}
		return n;
	}
	function B(e) {
		return e.guid || (e.guid = Math.random()), e.guid;
	}
	function V() {}
	V.prototype = {
		length: 0,
		item: function(e) {
			return e >= 0 && e < this.length ? this[e] : null;
		},
		toString: function(e) {
			for (var t = typeof e == "function" ? {
				requireWellFormed: !1,
				splitCDATASections: !0,
				nodeFilter: e
			} : e ? {
				requireWellFormed: !!e.requireWellFormed,
				splitCDATASections: e.splitCDATASections !== !1,
				nodeFilter: e.nodeFilter || null
			} : {
				requireWellFormed: !1,
				splitCDATASections: !0,
				nodeFilter: null
			}, n = [], r = 0; r < this.length; r++) Fe(this[r], n, null, t);
			return n.join("");
		},
		filter: function(e) {
			return Array.prototype.filter.call(this, e);
		},
		indexOf: function(e) {
			return Array.prototype.indexOf.call(this, e);
		}
	}, V.prototype[Symbol.iterator] = function() {
		var e = this, t = 0;
		return {
			next: function() {
				return t < e.length ? {
					value: e[t++],
					done: !1
				} : { done: !0 };
			},
			return: function() {
				return { done: !0 };
			}
		};
	};
	function H(e, t) {
		this._node = e, this._refresh = t, U(this);
	}
	function U(e) {
		var t = e._node._inc || e._node.ownerDocument._inc;
		if (e._inc !== t) {
			var n = e._refresh(e._node);
			if (Re(e, "length", n.length), !e.$$length || n.length < e.$$length) for (var r = n.length; r in e; r++) i(e, r) && delete e[r];
			C(n, e), e._inc = t;
		}
	}
	H.prototype.item = function(e) {
		return U(this), this[e] || null;
	}, w(H, V);
	function W() {}
	function ee(e, t) {
		for (var n = 0; n < e.length;) {
			if (e[n] === t) return n;
			n++;
		}
	}
	function te(e, t, n, r) {
		if (r ? t[ee(t, r)] = n : (t[t.length] = n, t.length++), e) {
			n.ownerElement = e;
			var i = e.ownerDocument;
			i && (r && se(i, e, r), q(i, e, n));
		}
	}
	function ne(e, t, n) {
		var r = ee(t, n);
		if (r >= 0) {
			for (var i = t.length - 1; r <= i;) t[r] = t[++r];
			if (t.length = i, e) {
				var a = e.ownerDocument;
				a && se(a, e, n), n.ownerElement = null;
			}
		}
	}
	W.prototype = {
		length: 0,
		item: V.prototype.item,
		getNamedItem: function(e) {
			this._ownerElement && this._ownerElement._isInHTMLDocumentAndNamespace() && (e = e.toLowerCase());
			for (var t = 0; t < this.length;) {
				var n = this[t];
				if (n.nodeName === e) return n;
				t++;
			}
			return null;
		},
		setNamedItem: function(e) {
			var t = e.ownerElement;
			if (t && t !== this._ownerElement) throw new f(f.INUSE_ATTRIBUTE_ERR);
			var n = this.getNamedItemNS(e.namespaceURI, e.localName);
			return n === e ? e : (te(this._ownerElement, this, e, n), n);
		},
		setNamedItemNS: function(e) {
			return this.setNamedItem(e);
		},
		removeNamedItem: function(e) {
			var t = this.getNamedItem(e);
			if (!t) throw new f(f.NOT_FOUND_ERR, e);
			return ne(this._ownerElement, this, t), t;
		},
		removeNamedItemNS: function(e, t) {
			var n = this.getNamedItemNS(e, t);
			if (!n) throw new f(f.NOT_FOUND_ERR, e ? e + " : " + t : t);
			return ne(this._ownerElement, this, n), n;
		},
		getNamedItemNS: function(e, t) {
			e || (e = null);
			for (var n = 0; n < this.length;) {
				var r = this[n];
				if (r.localName === t && r.namespaceURI === e) return r;
				n++;
			}
			return null;
		}
	}, W.prototype[Symbol.iterator] = function() {
		var e = this, t = 0;
		return {
			next: function() {
				return t < e.length ? {
					value: e[t++],
					done: !1
				} : { done: !0 };
			},
			return: function() {
				return { done: !0 };
			}
		};
	};
	function re() {}
	re.prototype = {
		hasFeature: function(e, t) {
			return !0;
		},
		createDocument: function(e, t, n) {
			var r = c.XML_APPLICATION;
			e === l.HTML ? r = c.XML_XHTML_APPLICATION : e === l.SVG && (r = c.XML_SVG_IMAGE);
			var i = new oe(u, { contentType: r });
			if (i.implementation = this, i.childNodes = new V(), i.doctype = n || null, n && i.appendChild(n), t) {
				var a = i.createElementNS(e, t);
				i.appendChild(a);
			}
			return i;
		},
		createDocumentType: function(e, t, n, r) {
			x(e);
			var i = new Y(u);
			return i.name = e, i.nodeName = e, i.publicId = t || "", i.systemId = n || "", i.internalSubset = r || "", i.childNodes = new V(), i;
		},
		createHTMLDocument: function(e) {
			var t = new oe(u, { contentType: c.HTML });
			if (t.implementation = this, t.childNodes = new V(), e !== !1) {
				t.doctype = this.createDocumentType("html"), t.doctype.ownerDocument = t, t.appendChild(t.doctype);
				var n = t.createElement("html");
				t.appendChild(n);
				var r = t.createElement("head");
				if (n.appendChild(r), typeof e == "string") {
					var i = t.createElement("title");
					i.appendChild(t.createTextNode(e)), r.appendChild(i);
				}
				n.appendChild(t.createElement("body"));
			}
			return t;
		}
	};
	function G(e) {
		h(e);
	}
	G.prototype = {
		firstChild: null,
		lastChild: null,
		previousSibling: null,
		nextSibling: null,
		parentNode: null,
		get parentElement() {
			return this.parentNode && this.parentNode.nodeType === this.ELEMENT_NODE ? this.parentNode : null;
		},
		childNodes: null,
		ownerDocument: null,
		nodeValue: null,
		namespaceURI: null,
		prefix: null,
		localName: null,
		baseURI: "about:blank",
		get isConnected() {
			var e = this.getRootNode();
			return e && e.nodeType === e.DOCUMENT_NODE;
		},
		contains: function(e) {
			if (!e) return !1;
			var t = e;
			do {
				if (this === t) return !0;
				t = t.parentNode;
			} while (t);
			return !1;
		},
		getRootNode: function(e) {
			var t = this;
			do {
				if (!t.parentNode) return t;
				t = t.parentNode;
			} while (t);
		},
		isEqualNode: function(e) {
			if (!e) return !1;
			for (var t = [{
				node: this,
				other: e
			}]; t.length > 0;) {
				var n = t.pop(), r = n.node, i = n.other;
				if (r.nodeType !== i.nodeType) return !1;
				switch (r.nodeType) {
					case r.DOCUMENT_TYPE_NODE:
						if (r.name !== i.name || r.publicId !== i.publicId || r.systemId !== i.systemId) return !1;
						break;
					case r.ELEMENT_NODE:
						if (r.namespaceURI !== i.namespaceURI || r.prefix !== i.prefix || r.localName !== i.localName || r.attributes.length !== i.attributes.length) return !1;
						for (var a = 0; a < r.attributes.length; a++) {
							var o = r.attributes.item(a), s = i.getAttributeNodeNS(o.namespaceURI, o.localName);
							if (!s) return !1;
							t.push({
								node: o,
								other: s
							});
						}
						break;
					case r.ATTRIBUTE_NODE:
						if (r.namespaceURI !== i.namespaceURI || r.localName !== i.localName || r.value !== i.value) return !1;
						break;
					case r.PROCESSING_INSTRUCTION_NODE:
						if (r.target !== i.target || r.data !== i.data) return !1;
						break;
					case r.TEXT_NODE:
					case r.CDATA_SECTION_NODE:
					case r.COMMENT_NODE:
						if (r.data !== i.data) return !1;
						break;
				}
				if (r.childNodes.length !== i.childNodes.length) return !1;
				for (var a = r.childNodes.length - 1; a >= 0; a--) t.push({
					node: r.childNodes[a],
					other: i.childNodes[a]
				});
			}
			return !0;
		},
		isSameNode: function(e) {
			return this === e;
		},
		insertBefore: function(e, t) {
			return ye(this, e, t);
		},
		replaceChild: function(e, t) {
			ye(this, e, t, ve), t && this.removeChild(t);
		},
		removeChild: function(e) {
			return J(this, e);
		},
		appendChild: function(e) {
			return this.insertBefore(e, null);
		},
		hasChildNodes: function() {
			return this.firstChild != null;
		},
		cloneNode: function(e) {
			return Le(this.ownerDocument || this, this, e);
		},
		normalize: function() {
			K(this, null, { enter: function(e) {
				for (var t = e.firstChild; t;) {
					var n = t.nextSibling;
					n !== null && n.nodeType === O && t.nodeType === O ? (e.removeChild(n), t.appendData(n.data)) : t = n;
				}
				return !0;
			} });
		},
		isSupported: function(e, t) {
			return this.ownerDocument.implementation.hasFeature(e, t);
		},
		lookupPrefix: function(e) {
			for (var t = this; t;) {
				var n = t._nsMap;
				if (n) {
					for (var r in n) if (i(n, r) && n[r] === e) return r;
				}
				t = t.nodeType == D ? t.ownerDocument : t.parentNode;
			}
			return null;
		},
		lookupNamespaceURI: function(e) {
			for (var t = this; t;) {
				var n = t._nsMap;
				if (n && i(n, e)) return n[e];
				t = t.nodeType == D ? t.ownerDocument : t.parentNode;
			}
			return null;
		},
		isDefaultNamespace: function(e) {
			return this.lookupPrefix(e) == null;
		},
		compareDocumentPosition: function(e) {
			if (this === e) return 0;
			var t = e, n = this, r = null, i = null;
			if (t instanceof xe && (r = t, t = r.ownerElement), n instanceof xe && (i = n, n = i.ownerElement, r && t && n === t)) for (var a = 0, o; o = n.attributes[a]; a++) {
				if (o === r) return R.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + R.DOCUMENT_POSITION_PRECEDING;
				if (o === i) return R.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + R.DOCUMENT_POSITION_FOLLOWING;
			}
			if (!t || !n || n.ownerDocument !== t.ownerDocument) return R.DOCUMENT_POSITION_DISCONNECTED + R.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC + (B(n.ownerDocument) > B(t.ownerDocument) ? R.DOCUMENT_POSITION_FOLLOWING : R.DOCUMENT_POSITION_PRECEDING);
			if (i && t === n) return R.DOCUMENT_POSITION_CONTAINS + R.DOCUMENT_POSITION_PRECEDING;
			if (r && t === n) return R.DOCUMENT_POSITION_CONTAINED_BY + R.DOCUMENT_POSITION_FOLLOWING;
			for (var s = [], c = t.parentNode; c;) {
				if (!i && c === n) return R.DOCUMENT_POSITION_CONTAINED_BY + R.DOCUMENT_POSITION_FOLLOWING;
				s.push(c), c = c.parentNode;
			}
			s.reverse();
			for (var l = [], u = n.parentNode; u;) {
				if (!r && u === t) return R.DOCUMENT_POSITION_CONTAINS + R.DOCUMENT_POSITION_PRECEDING;
				l.push(u), u = u.parentNode;
			}
			l.reverse();
			var d = z(s, l);
			for (var f in d.childNodes) {
				var p = d.childNodes[f];
				if (p === n) return R.DOCUMENT_POSITION_FOLLOWING;
				if (p === t) return R.DOCUMENT_POSITION_PRECEDING;
				if (l.indexOf(p) >= 0) return R.DOCUMENT_POSITION_FOLLOWING;
				if (s.indexOf(p) >= 0) return R.DOCUMENT_POSITION_PRECEDING;
			}
			return 0;
		}
	};
	function ie(e) {
		return e == "<" && "&lt;" || e == ">" && "&gt;" || e == "&" && "&amp;" || e == "\"" && "&quot;" || "&#" + e.charCodeAt() + ";";
	}
	C(T, G), C(T, G.prototype), C(R, G), C(R, G.prototype);
	function ae(e, t) {
		K(e, null, { enter: function(e) {
			return t(e) ? K.STOP : !0;
		} });
	}
	function K(e, t, n) {
		for (var r = [{
			node: e,
			context: t,
			phase: K.ENTER
		}]; r.length > 0;) {
			var i = r.pop();
			if (i.phase === K.ENTER) {
				var a = n.enter(i.node, i.context);
				if (a === K.STOP) return K.STOP;
				if (r.push({
					node: i.node,
					context: a,
					phase: K.EXIT
				}), a == null) continue;
				for (var o = i.node.lastChild; o;) r.push({
					node: o,
					context: a,
					phase: K.ENTER
				}), o = o.previousSibling;
			} else n.exit && n.exit(i.node, i.context);
		}
	}
	K.STOP = Symbol("walkDOM.STOP"), K.ENTER = 0, K.EXIT = 1;
	function oe(e, t) {
		h(e);
		var n = t || {};
		this.ownerDocument = this, this.contentType = n.contentType || c.XML_APPLICATION, this.type = a(this.contentType) ? "html" : "xml";
	}
	function q(e, t, n) {
		e && e._inc++, n.namespaceURI === l.XMLNS && (t._nsMap[n.prefix ? n.localName : ""] = n.value);
	}
	function se(e, t, n, r) {
		e && e._inc++, n.namespaceURI === l.XMLNS && delete t._nsMap[n.prefix ? n.localName : ""];
	}
	function ce(e, t, n) {
		if (e && e._inc) {
			e._inc++;
			var r = t.childNodes;
			if (n && !n.nextSibling) r[r.length++] = n;
			else {
				for (var i = t.firstChild, a = 0; i;) r[a++] = i, i = i.nextSibling;
				r.length = a, delete r[r.length];
			}
		}
	}
	function J(e, t) {
		if (e !== t.parentNode) throw new f(f.NOT_FOUND_ERR, "child's parent is not parent");
		var n = t.previousSibling, r = t.nextSibling;
		return n ? n.nextSibling = r : e.firstChild = r, r ? r.previousSibling = n : e.lastChild = n, ce(e.ownerDocument, e), t.parentNode = null, t.previousSibling = null, t.nextSibling = null, t;
	}
	function le(e) {
		return e && (e.nodeType === G.DOCUMENT_NODE || e.nodeType === G.DOCUMENT_FRAGMENT_NODE || e.nodeType === G.ELEMENT_NODE);
	}
	function ue(e) {
		return e && (e.nodeType === G.CDATA_SECTION_NODE || e.nodeType === G.COMMENT_NODE || e.nodeType === G.DOCUMENT_FRAGMENT_NODE || e.nodeType === G.DOCUMENT_TYPE_NODE || e.nodeType === G.ELEMENT_NODE || e.nodeType === G.PROCESSING_INSTRUCTION_NODE || e.nodeType === G.TEXT_NODE);
	}
	function de(e) {
		return e && e.nodeType === G.DOCUMENT_TYPE_NODE;
	}
	function fe(e) {
		return e && e.nodeType === G.ELEMENT_NODE;
	}
	function pe(e) {
		return e && e.nodeType === G.TEXT_NODE;
	}
	function me(e, t) {
		var r = e.childNodes || [];
		if (n(r, fe) || de(t)) return !1;
		var i = n(r, de);
		return !(t && i && r.indexOf(i) > r.indexOf(t));
	}
	function he(e, t) {
		var r = e.childNodes || [];
		function i(e) {
			return fe(e) && e !== t;
		}
		if (n(r, i)) return !1;
		var a = n(r, de);
		return !(t && a && r.indexOf(a) > r.indexOf(t));
	}
	function ge(e, t, n) {
		if (!le(e)) throw new f(f.HIERARCHY_REQUEST_ERR, "Unexpected parent node type " + e.nodeType);
		if (n && n.parentNode !== e) throw new f(f.NOT_FOUND_ERR, "child not in parent");
		if (!ue(t) || de(t) && e.nodeType !== G.DOCUMENT_NODE) throw new f(f.HIERARCHY_REQUEST_ERR, "Unexpected node type " + t.nodeType + " for parent node type " + e.nodeType);
	}
	function _e(e, t, r) {
		var i = e.childNodes || [], a = t.childNodes || [];
		if (t.nodeType === G.DOCUMENT_FRAGMENT_NODE) {
			var o = a.filter(fe);
			if (o.length > 1 || n(a, pe)) throw new f(f.HIERARCHY_REQUEST_ERR, "More than one element or text in fragment");
			if (o.length === 1 && !me(e, r)) throw new f(f.HIERARCHY_REQUEST_ERR, "Element in fragment can not be inserted before doctype");
		}
		if (fe(t) && !me(e, r)) throw new f(f.HIERARCHY_REQUEST_ERR, "Only one element can be added and only after doctype");
		if (de(t)) {
			if (n(i, de)) throw new f(f.HIERARCHY_REQUEST_ERR, "Only one doctype is allowed");
			var s = n(i, fe);
			if (r && i.indexOf(s) < i.indexOf(r)) throw new f(f.HIERARCHY_REQUEST_ERR, "Doctype can only be inserted before an element");
			if (!r && s) throw new f(f.HIERARCHY_REQUEST_ERR, "Doctype can not be appended since element is present");
		}
	}
	function ve(e, t, r) {
		var i = e.childNodes || [], a = t.childNodes || [];
		if (t.nodeType === G.DOCUMENT_FRAGMENT_NODE) {
			var o = a.filter(fe);
			if (o.length > 1 || n(a, pe)) throw new f(f.HIERARCHY_REQUEST_ERR, "More than one element or text in fragment");
			if (o.length === 1 && !he(e, r)) throw new f(f.HIERARCHY_REQUEST_ERR, "Element in fragment can not be inserted before doctype");
		}
		if (fe(t) && !he(e, r)) throw new f(f.HIERARCHY_REQUEST_ERR, "Only one element can be added and only after doctype");
		if (de(t)) {
			function e(e) {
				return de(e) && e !== r;
			}
			if (n(i, e)) throw new f(f.HIERARCHY_REQUEST_ERR, "Only one doctype is allowed");
			var s = n(i, fe);
			if (r && i.indexOf(s) < i.indexOf(r)) throw new f(f.HIERARCHY_REQUEST_ERR, "Doctype can only be inserted before an element");
		}
	}
	function ye(e, t, n, r) {
		ge(e, t, n), e.nodeType === G.DOCUMENT_NODE && (r || _e)(e, t, n);
		var i = t.parentNode;
		if (i && i.removeChild(t), t.nodeType === I) {
			var a = t.firstChild;
			if (a == null) return t;
			var o = t.lastChild;
		} else a = o = t;
		var s = n ? n.previousSibling : e.lastChild;
		a.previousSibling = s, o.nextSibling = n, s ? s.nextSibling = a : e.firstChild = a, n == null ? e.lastChild = o : n.previousSibling = o;
		do
			a.parentNode = e;
		while (a !== o && (a = a.nextSibling));
		return ce(e.ownerDocument || e, e, t), t.nodeType == I && (t.firstChild = t.lastChild = null), t;
	}
	oe.prototype = {
		implementation: null,
		nodeName: "#document",
		nodeType: P,
		doctype: null,
		documentElement: null,
		_inc: 1,
		insertBefore: function(e, t) {
			if (e.nodeType === I) {
				for (var n = e.firstChild; n;) {
					var r = n.nextSibling;
					this.insertBefore(n, t), n = r;
				}
				return e;
			}
			return ye(this, e, t), e.ownerDocument = this, this.documentElement === null && e.nodeType === E && (this.documentElement = e), e;
		},
		removeChild: function(e) {
			var t = J(this, e);
			return t === this.documentElement && (this.documentElement = null), t;
		},
		replaceChild: function(e, t) {
			ye(this, e, t, ve), e.ownerDocument = this, t && this.removeChild(t), fe(e) && (this.documentElement = e);
		},
		importNode: function(e, t) {
			return Ie(this, e, t);
		},
		getElementById: function(e) {
			var t = null;
			return ae(this.documentElement, function(n) {
				if (n.nodeType == E && n.getAttribute("id") == e) return t = n, !0;
			}), t;
		},
		createElement: function(e) {
			var t = new be(u);
			t.ownerDocument = this, this.type === "html" && (e = e.toLowerCase()), r(this.contentType) && (t.namespaceURI = l.HTML), t.nodeName = e, t.tagName = e, t.localName = e, t.childNodes = new V();
			var n = t.attributes = new W();
			return n._ownerElement = t, t;
		},
		createDocumentFragment: function() {
			var e = new ke(u);
			return e.ownerDocument = this, e.childNodes = new V(), e;
		},
		createTextNode: function(e) {
			var t = new Ce(u);
			return t.ownerDocument = this, t.childNodes = new V(), t.appendData(e), t;
		},
		createComment: function(e) {
			var t = new we(u);
			return t.ownerDocument = this, t.childNodes = new V(), t.appendData(e), t;
		},
		createCDATASection: function(e) {
			if (e.indexOf("]]>") !== -1) throw new f(f.INVALID_CHARACTER_ERR, "data contains \"]]>\"");
			var t = new Te(u);
			return t.ownerDocument = this, t.childNodes = new V(), t.appendData(e), t;
		},
		createProcessingInstruction: function(e, t) {
			var n = new Ae(u);
			return n.ownerDocument = this, n.childNodes = new V(), n.nodeName = n.target = e, n.nodeValue = n.data = t, n;
		},
		createAttribute: function(e) {
			if (!m.QName_exact.test(e)) throw new f(f.INVALID_CHARACTER_ERR, "invalid character in name \"" + e + "\"");
			return this.type === "html" && (e = e.toLowerCase()), this._createAttribute(e);
		},
		_createAttribute: function(e) {
			var t = new xe(u);
			return t.ownerDocument = this, t.childNodes = new V(), t.name = e, t.nodeName = e, t.localName = e, t.specified = !0, t;
		},
		createEntityReference: function(e) {
			if (!m.Name.test(e)) throw new f(f.INVALID_CHARACTER_ERR, "not a valid xml name \"" + e + "\"");
			if (this.type === "html") throw new f("document is an html document", p.NotSupportedError);
			var t = new Oe(u);
			return t.ownerDocument = this, t.childNodes = new V(), t.nodeName = e, t;
		},
		createElementNS: function(e, t) {
			var n = S(e, t), r = new be(u), i = r.attributes = new W();
			return r.childNodes = new V(), r.ownerDocument = this, r.nodeName = t, r.tagName = t, r.namespaceURI = n[0], r.prefix = n[1], r.localName = n[2], i._ownerElement = r, r;
		},
		createAttributeNS: function(e, t) {
			var n = S(e, t), r = new xe(u);
			return r.ownerDocument = this, r.childNodes = new V(), r.nodeName = t, r.name = t, r.specified = !0, r.namespaceURI = n[0], r.prefix = n[1], r.localName = n[2], r;
		}
	}, w(oe, G);
	function be(e) {
		h(e), this._nsMap = Object.create(null);
	}
	be.prototype = {
		nodeType: E,
		attributes: null,
		getQualifiedName: function() {
			return this.prefix ? this.prefix + ":" + this.localName : this.localName;
		},
		_isInHTMLDocumentAndNamespace: function() {
			return this.ownerDocument.type === "html" && this.namespaceURI === l.HTML;
		},
		hasAttributes: function() {
			return !!(this.attributes && this.attributes.length);
		},
		hasAttribute: function(e) {
			return !!this.getAttributeNode(e);
		},
		getAttribute: function(e) {
			var t = this.getAttributeNode(e);
			return t ? t.value : null;
		},
		getAttributeNode: function(e) {
			return this._isInHTMLDocumentAndNamespace() && (e = e.toLowerCase()), this.attributes.getNamedItem(e);
		},
		setAttribute: function(e, t) {
			this._isInHTMLDocumentAndNamespace() && (e = e.toLowerCase());
			var n = this.getAttributeNode(e);
			n ? n.value = n.nodeValue = "" + t : (n = this.ownerDocument._createAttribute(e), n.value = n.nodeValue = "" + t, this.setAttributeNode(n));
		},
		removeAttribute: function(e) {
			var t = this.getAttributeNode(e);
			t && this.removeAttributeNode(t);
		},
		setAttributeNode: function(e) {
			return this.attributes.setNamedItem(e);
		},
		setAttributeNodeNS: function(e) {
			return this.attributes.setNamedItemNS(e);
		},
		removeAttributeNode: function(e) {
			return this.attributes.removeNamedItem(e.nodeName);
		},
		removeAttributeNS: function(e, t) {
			var n = this.getAttributeNodeNS(e, t);
			n && this.removeAttributeNode(n);
		},
		hasAttributeNS: function(e, t) {
			return this.getAttributeNodeNS(e, t) != null;
		},
		getAttributeNS: function(e, t) {
			var n = this.getAttributeNodeNS(e, t);
			return n ? n.value : null;
		},
		setAttributeNS: function(e, t, n) {
			var r = S(e, t)[2], i = this.getAttributeNodeNS(e, r);
			i ? i.value = i.nodeValue = "" + n : (i = this.ownerDocument.createAttributeNS(e, t), i.value = i.nodeValue = "" + n, this.setAttributeNode(i));
		},
		getAttributeNodeNS: function(e, t) {
			return this.attributes.getNamedItemNS(e, t);
		},
		getElementsByClassName: function(e) {
			var t = y(e);
			return new H(this, function(n) {
				var r = [];
				return t.length > 0 && ae(n, function(i) {
					if (i !== n && i.nodeType === E) {
						var a = i.getAttribute("class");
						if (a) {
							var o = e === a;
							if (!o) {
								var s = y(a);
								o = t.every(b(s));
							}
							o && r.push(i);
						}
					}
				}), r;
			});
		},
		getElementsByTagName: function(e) {
			var t = (this.nodeType === P ? this : this.ownerDocument).type === "html", n = e.toLowerCase();
			return new H(this, function(r) {
				var i = [];
				return ae(r, function(a) {
					a === r || a.nodeType !== E || (e === "*" || a.getQualifiedName() === (t && a.namespaceURI === l.HTML ? n : e)) && i.push(a);
				}), i;
			});
		},
		getElementsByTagNameNS: function(e, t) {
			return new H(this, function(n) {
				var r = [];
				return ae(n, function(i) {
					i !== n && i.nodeType === E && (e === "*" || i.namespaceURI === e) && (t === "*" || i.localName == t) && r.push(i);
				}), r;
			});
		}
	}, oe.prototype.getElementsByClassName = be.prototype.getElementsByClassName, oe.prototype.getElementsByTagName = be.prototype.getElementsByTagName, oe.prototype.getElementsByTagNameNS = be.prototype.getElementsByTagNameNS, w(be, G);
	function xe(e) {
		h(e), this.namespaceURI = null, this.prefix = null, this.ownerElement = null;
	}
	xe.prototype.nodeType = D, w(xe, G);
	function Se(e) {
		h(e);
	}
	Se.prototype = {
		data: "",
		substringData: function(e, t) {
			return this.data.substring(e, e + t);
		},
		appendData: function(e) {
			e = this.data + e, this.nodeValue = this.data = e, this.length = e.length;
		},
		insertData: function(e, t) {
			this.replaceData(e, 0, t);
		},
		deleteData: function(e, t) {
			this.replaceData(e, t, "");
		},
		replaceData: function(e, t, n) {
			var r = this.data.substring(0, e), i = this.data.substring(e + t);
			n = r + n + i, this.nodeValue = this.data = n, this.length = n.length;
		}
	}, w(Se, G);
	function Ce(e) {
		h(e);
	}
	Ce.prototype = {
		nodeName: "#text",
		nodeType: O,
		splitText: function(e) {
			var t = this.data, n = t.substring(e);
			t = t.substring(0, e), this.data = this.nodeValue = t, this.length = t.length;
			var r = this.ownerDocument.createTextNode(n);
			return this.parentNode && this.parentNode.insertBefore(r, this.nextSibling), r;
		}
	}, w(Ce, Se);
	function we(e) {
		h(e);
	}
	we.prototype = {
		nodeName: "#comment",
		nodeType: N
	}, w(we, Se);
	function Te(e) {
		h(e);
	}
	Te.prototype = {
		nodeName: "#cdata-section",
		nodeType: k
	}, w(Te, Ce);
	function Y(e) {
		h(e);
	}
	Y.prototype.nodeType = F, w(Y, G);
	function Ee(e) {
		h(e);
	}
	Ee.prototype.nodeType = L, w(Ee, G);
	function De(e) {
		h(e);
	}
	De.prototype.nodeType = j, w(De, G);
	function Oe(e) {
		h(e);
	}
	Oe.prototype.nodeType = A, w(Oe, G);
	function ke(e) {
		h(e);
	}
	ke.prototype.nodeName = "#document-fragment", ke.prototype.nodeType = I, w(ke, G);
	function Ae(e) {
		h(e);
	}
	Ae.prototype.nodeType = M, w(Ae, Se);
	function je() {}
	je.prototype.serializeToString = function(e, t) {
		return Me.call(e, t);
	}, G.prototype.toString = Me;
	function Me(e) {
		var t = typeof e == "function" ? {
			requireWellFormed: !1,
			splitCDATASections: !0,
			nodeFilter: e
		} : e == null ? {
			requireWellFormed: !1,
			splitCDATASections: !0,
			nodeFilter: null
		} : {
			requireWellFormed: !!e.requireWellFormed,
			splitCDATASections: e.splitCDATASections !== !1,
			nodeFilter: e.nodeFilter || null
		}, n = [], r = this.nodeType === P && this.documentElement || this, i = r.prefix, a = r.namespaceURI;
		if (a && i == null) {
			var i = r.lookupPrefix(a);
			if (i == null) var o = [{
				namespace: a,
				prefix: null
			}];
		}
		return Fe(this, n, o, t), n.join("");
	}
	function Ne(e, t, n) {
		var r = e.prefix || "", i = e.namespaceURI;
		if (!i || r === "xml" && i === l.XML || i === l.XMLNS) return !1;
		for (var a = n.length; a--;) {
			var o = n[a];
			if (o.prefix === r) return o.namespace !== i;
		}
		return !0;
	}
	function Pe(e, t, n) {
		e.push(" ", t, "=\"", n.replace(/[<>&"\t\n\r]/g, ie), "\"");
	}
	function Fe(e, t, n, r) {
		n || (n = []);
		var i = r.nodeFilter, a = r.requireWellFormed, c = r.splitCDATASections, u = (e.nodeType === P ? e : e.ownerDocument).type === "html";
		K(e, { ns: n }, {
			enter: function(e, n) {
				var d = n.ns;
				if (i) if (e = i(e), e) {
					if (typeof e == "string") return t.push(e), null;
				} else return null;
				switch (e.nodeType) {
					case E:
						var h = e.attributes, g = h.length, _ = e.tagName, v = _;
						if (!u && !e.prefix && e.namespaceURI) {
							for (var y, b = 0; b < h.length; b++) if (h.item(b).name === "xmlns") {
								y = h.item(b).value;
								break;
							}
							if (!y) for (var x = d.length - 1; x >= 0; x--) {
								var S = d[x];
								if (S.prefix === "" && S.namespace === e.namespaceURI) {
									y = S.namespace;
									break;
								}
							}
							if (y !== e.namespaceURI) for (var x = d.length - 1; x >= 0; x--) {
								var S = d[x];
								if (S.namespace === e.namespaceURI) {
									S.prefix && (v = S.prefix + ":" + _);
									break;
								}
							}
						}
						t.push("<", v);
						for (var C = d.slice(), w = 0; w < g; w++) {
							var T = h.item(w);
							T.prefix == "xmlns" ? C.push({
								prefix: T.localName,
								namespace: T.value
							}) : T.nodeName == "xmlns" && C.push({
								prefix: "",
								namespace: T.value
							});
						}
						for (var w = 0; w < g; w++) {
							var T = h.item(w);
							if (Ne(T, u, C)) {
								var j = T.prefix || "", L = T.namespaceURI;
								Pe(t, j ? "xmlns:" + j : "xmlns", L), C.push({
									prefix: j,
									namespace: L
								});
							}
							var R = i ? i(T) : T;
							R && (typeof R == "string" ? t.push(R) : Pe(t, R.name, R.value));
						}
						if (_ === v && Ne(e, u, C)) {
							var z = e.prefix || "", L = e.namespaceURI;
							Pe(t, z ? "xmlns:" + z : "xmlns", L), C.push({
								prefix: z,
								namespace: L
							});
						}
						var B = !e.firstChild;
						if (B && (u || e.namespaceURI === l.HTML) && (B = s(_)), B) return t.push("/>"), null;
						if (t.push(">"), u && o(_)) {
							for (var V = e.firstChild; V;) V.data ? t.push(V.data) : Fe(V, t, C.slice(), r), V = V.nextSibling;
							return t.push("</", v, ">"), null;
						}
						return {
							ns: C,
							tag: v
						};
					case P:
					case I:
						if (a && e.nodeType === P && e.documentElement == null) throw new f("The Document has no documentElement", p.InvalidStateError);
						return { ns: d };
					case D: return Pe(t, e.name, e.value), null;
					case O:
						if (a && m.InvalidChar.test(e.data)) throw new f("The Text node data contains characters outside the XML Char production", p.InvalidStateError);
						return t.push(e.data.replace(/[<&>]/g, ie)), null;
					case k:
						if (a && e.data.indexOf("]]>") !== -1) throw new f("The CDATASection data contains \"]]>\"", p.InvalidStateError);
						return c ? t.push(m.CDATA_START, e.data.replace(/]]>/g, "]]]]><![CDATA[>"), m.CDATA_END) : t.push(m.CDATA_START, e.data, m.CDATA_END), null;
					case N:
						if (a) {
							if (m.InvalidChar.test(e.data)) throw new f("The comment node data contains characters outside the XML Char production", p.InvalidStateError);
							if (e.data.indexOf("--") !== -1 || e.data[e.data.length - 1] === "-") throw new f("The comment node data contains \"--\" or ends with \"-\"", p.InvalidStateError);
						}
						return t.push(m.COMMENT_START, e.data, m.COMMENT_END), null;
					case F:
						var H = e.publicId, U = e.systemId;
						if (a) {
							if (H && !m.PubidLiteral_match.test(H)) throw new f("DocumentType publicId is not a valid PubidLiteral", p.InvalidStateError);
							if (U && U !== "." && !m.SystemLiteral_match.test(U)) throw new f("DocumentType systemId is not a valid SystemLiteral", p.InvalidStateError);
							if (e.internalSubset && e.internalSubset.indexOf("]>") !== -1) throw new f("DocumentType internalSubset contains \"]>\"", p.InvalidStateError);
						}
						return t.push(m.DOCTYPE_DECL_START, " ", e.name), H ? (t.push(" ", m.PUBLIC, " ", H), U && U !== "." && t.push(" ", U)) : U && U !== "." && t.push(" ", m.SYSTEM, " ", U), e.internalSubset && t.push(" [", e.internalSubset, "]"), t.push(">"), null;
					case M:
						if (a) {
							if (e.target.indexOf(":") !== -1 || e.target.toLowerCase() === "xml") throw new f("The ProcessingInstruction target is not well-formed", p.InvalidStateError);
							if (m.InvalidChar.test(e.data)) throw new f("The ProcessingInstruction data contains characters outside the XML Char production", p.InvalidStateError);
							if (e.data.indexOf("?>") !== -1) throw new f("The ProcessingInstruction data contains \"?>\"", p.InvalidStateError);
						}
						return t.push("<?", e.target, " ", e.data, "?>"), null;
					case A: return t.push("&", e.nodeName, ";"), null;
					default: return t.push("??", e.nodeName), null;
				}
			},
			exit: function(e, n) {
				n && n.tag && t.push("</", n.tag, ">");
			}
		});
	}
	function Ie(e, t, n) {
		var r;
		return K(t, null, { enter: function(t, i) {
			var a = t.cloneNode(!1);
			return a.ownerDocument = e, a.parentNode = null, i === null ? r = a : i.appendChild(a), t.nodeType === D || n ? a : null;
		} }), r;
	}
	function Le(e, t, n) {
		var r;
		return K(t, null, { enter: function(t, a) {
			var o = new t.constructor(u);
			for (var s in t) if (i(t, s)) {
				var c = t[s];
				typeof c != "object" && c != o[s] && (o[s] = c);
			}
			t.childNodes && (o.childNodes = new V()), o.ownerDocument = e;
			var l = n;
			switch (o.nodeType) {
				case E:
					var d = t.attributes, f = o.attributes = new W(), p = d.length;
					f._ownerElement = o;
					for (var m = 0; m < p; m++) o.setAttributeNode(Le(e, d.item(m), !0));
					break;
				case D: l = !0;
			}
			return a === null ? r = o : a.appendChild(o), l ? o : null;
		} }), r;
	}
	function Re(e, t, n) {
		e[t] = n;
	}
	function ze(e) {
		for (var t = [], n = e.firstChild; n;) n.nodeType === E && t.push(n), n = n.nextSibling;
		return t;
	}
	try {
		Object.defineProperty && (Object.defineProperty(H.prototype, "length", { get: function() {
			return U(this), this.$$length;
		} }), Object.defineProperty(G.prototype, "textContent", {
			get: function() {
				if (this.nodeType === E || this.nodeType === I) {
					var e = [];
					return K(this, null, { enter: function(t) {
						if (t.nodeType === E || t.nodeType === I) return !0;
						if (t.nodeType === M || t.nodeType === N) return null;
						e.push(t.nodeValue);
					} }), e.join("");
				}
				return this.nodeValue;
			},
			set: function(e) {
				switch (this.nodeType) {
					case E:
					case I:
						for (; this.firstChild;) this.removeChild(this.firstChild);
						(e || String(e)) && this.appendChild(this.ownerDocument.createTextNode(e));
						break;
					default: this.data = e, this.value = e, this.nodeValue = e;
				}
			}
		}), Object.defineProperty(be.prototype, "children", { get: function() {
			return new H(this, ze);
		} }), Object.defineProperty(oe.prototype, "children", { get: function() {
			return new H(this, ze);
		} }), Object.defineProperty(ke.prototype, "children", { get: function() {
			return new H(this, ze);
		} }), Re = function(e, t, n) {
			e["$$" + t] = n;
		});
	} catch {}
	e._updateLiveList = U, e.Attr = xe, e.CDATASection = Te, e.CharacterData = Se, e.Comment = we, e.Document = oe, e.DocumentFragment = ke, e.DocumentType = Y, e.DOMImplementation = re, e.Element = be, e.Entity = De, e.EntityReference = Oe, e.LiveNodeList = H, e.NamedNodeMap = W, e.Node = G, e.NodeList = V, e.Notation = Ee, e.Text = Ce, e.ProcessingInstruction = Ae, e.walkDOM = K, e.XMLSerializer = je;
})), _v = /* @__PURE__ */ o(((e) => {
	var t = pv().freeze;
	e.XML_ENTITIES = t({
		amp: "&",
		apos: "'",
		gt: ">",
		lt: "<",
		quot: "\""
	}), e.HTML_ENTITIES = t({
		Aacute: "Á",
		aacute: "á",
		Abreve: "Ă",
		abreve: "ă",
		ac: "∾",
		acd: "∿",
		acE: "∾̳",
		Acirc: "Â",
		acirc: "â",
		acute: "´",
		Acy: "А",
		acy: "а",
		AElig: "Æ",
		aelig: "æ",
		af: "⁡",
		Afr: "𝔄",
		afr: "𝔞",
		Agrave: "À",
		agrave: "à",
		alefsym: "ℵ",
		aleph: "ℵ",
		Alpha: "Α",
		alpha: "α",
		Amacr: "Ā",
		amacr: "ā",
		amalg: "⨿",
		AMP: "&",
		amp: "&",
		And: "⩓",
		and: "∧",
		andand: "⩕",
		andd: "⩜",
		andslope: "⩘",
		andv: "⩚",
		ang: "∠",
		ange: "⦤",
		angle: "∠",
		angmsd: "∡",
		angmsdaa: "⦨",
		angmsdab: "⦩",
		angmsdac: "⦪",
		angmsdad: "⦫",
		angmsdae: "⦬",
		angmsdaf: "⦭",
		angmsdag: "⦮",
		angmsdah: "⦯",
		angrt: "∟",
		angrtvb: "⊾",
		angrtvbd: "⦝",
		angsph: "∢",
		angst: "Å",
		angzarr: "⍼",
		Aogon: "Ą",
		aogon: "ą",
		Aopf: "𝔸",
		aopf: "𝕒",
		ap: "≈",
		apacir: "⩯",
		apE: "⩰",
		ape: "≊",
		apid: "≋",
		apos: "'",
		ApplyFunction: "⁡",
		approx: "≈",
		approxeq: "≊",
		Aring: "Å",
		aring: "å",
		Ascr: "𝒜",
		ascr: "𝒶",
		Assign: "≔",
		ast: "*",
		asymp: "≈",
		asympeq: "≍",
		Atilde: "Ã",
		atilde: "ã",
		Auml: "Ä",
		auml: "ä",
		awconint: "∳",
		awint: "⨑",
		backcong: "≌",
		backepsilon: "϶",
		backprime: "‵",
		backsim: "∽",
		backsimeq: "⋍",
		Backslash: "∖",
		Barv: "⫧",
		barvee: "⊽",
		Barwed: "⌆",
		barwed: "⌅",
		barwedge: "⌅",
		bbrk: "⎵",
		bbrktbrk: "⎶",
		bcong: "≌",
		Bcy: "Б",
		bcy: "б",
		bdquo: "„",
		becaus: "∵",
		Because: "∵",
		because: "∵",
		bemptyv: "⦰",
		bepsi: "϶",
		bernou: "ℬ",
		Bernoullis: "ℬ",
		Beta: "Β",
		beta: "β",
		beth: "ℶ",
		between: "≬",
		Bfr: "𝔅",
		bfr: "𝔟",
		bigcap: "⋂",
		bigcirc: "◯",
		bigcup: "⋃",
		bigodot: "⨀",
		bigoplus: "⨁",
		bigotimes: "⨂",
		bigsqcup: "⨆",
		bigstar: "★",
		bigtriangledown: "▽",
		bigtriangleup: "△",
		biguplus: "⨄",
		bigvee: "⋁",
		bigwedge: "⋀",
		bkarow: "⤍",
		blacklozenge: "⧫",
		blacksquare: "▪",
		blacktriangle: "▴",
		blacktriangledown: "▾",
		blacktriangleleft: "◂",
		blacktriangleright: "▸",
		blank: "␣",
		blk12: "▒",
		blk14: "░",
		blk34: "▓",
		block: "█",
		bne: "=⃥",
		bnequiv: "≡⃥",
		bNot: "⫭",
		bnot: "⌐",
		Bopf: "𝔹",
		bopf: "𝕓",
		bot: "⊥",
		bottom: "⊥",
		bowtie: "⋈",
		boxbox: "⧉",
		boxDL: "╗",
		boxDl: "╖",
		boxdL: "╕",
		boxdl: "┐",
		boxDR: "╔",
		boxDr: "╓",
		boxdR: "╒",
		boxdr: "┌",
		boxH: "═",
		boxh: "─",
		boxHD: "╦",
		boxHd: "╤",
		boxhD: "╥",
		boxhd: "┬",
		boxHU: "╩",
		boxHu: "╧",
		boxhU: "╨",
		boxhu: "┴",
		boxminus: "⊟",
		boxplus: "⊞",
		boxtimes: "⊠",
		boxUL: "╝",
		boxUl: "╜",
		boxuL: "╛",
		boxul: "┘",
		boxUR: "╚",
		boxUr: "╙",
		boxuR: "╘",
		boxur: "└",
		boxV: "║",
		boxv: "│",
		boxVH: "╬",
		boxVh: "╫",
		boxvH: "╪",
		boxvh: "┼",
		boxVL: "╣",
		boxVl: "╢",
		boxvL: "╡",
		boxvl: "┤",
		boxVR: "╠",
		boxVr: "╟",
		boxvR: "╞",
		boxvr: "├",
		bprime: "‵",
		Breve: "˘",
		breve: "˘",
		brvbar: "¦",
		Bscr: "ℬ",
		bscr: "𝒷",
		bsemi: "⁏",
		bsim: "∽",
		bsime: "⋍",
		bsol: "\\",
		bsolb: "⧅",
		bsolhsub: "⟈",
		bull: "•",
		bullet: "•",
		bump: "≎",
		bumpE: "⪮",
		bumpe: "≏",
		Bumpeq: "≎",
		bumpeq: "≏",
		Cacute: "Ć",
		cacute: "ć",
		Cap: "⋒",
		cap: "∩",
		capand: "⩄",
		capbrcup: "⩉",
		capcap: "⩋",
		capcup: "⩇",
		capdot: "⩀",
		CapitalDifferentialD: "ⅅ",
		caps: "∩︀",
		caret: "⁁",
		caron: "ˇ",
		Cayleys: "ℭ",
		ccaps: "⩍",
		Ccaron: "Č",
		ccaron: "č",
		Ccedil: "Ç",
		ccedil: "ç",
		Ccirc: "Ĉ",
		ccirc: "ĉ",
		Cconint: "∰",
		ccups: "⩌",
		ccupssm: "⩐",
		Cdot: "Ċ",
		cdot: "ċ",
		cedil: "¸",
		Cedilla: "¸",
		cemptyv: "⦲",
		cent: "¢",
		CenterDot: "·",
		centerdot: "·",
		Cfr: "ℭ",
		cfr: "𝔠",
		CHcy: "Ч",
		chcy: "ч",
		check: "✓",
		checkmark: "✓",
		Chi: "Χ",
		chi: "χ",
		cir: "○",
		circ: "ˆ",
		circeq: "≗",
		circlearrowleft: "↺",
		circlearrowright: "↻",
		circledast: "⊛",
		circledcirc: "⊚",
		circleddash: "⊝",
		CircleDot: "⊙",
		circledR: "®",
		circledS: "Ⓢ",
		CircleMinus: "⊖",
		CirclePlus: "⊕",
		CircleTimes: "⊗",
		cirE: "⧃",
		cire: "≗",
		cirfnint: "⨐",
		cirmid: "⫯",
		cirscir: "⧂",
		ClockwiseContourIntegral: "∲",
		CloseCurlyDoubleQuote: "”",
		CloseCurlyQuote: "’",
		clubs: "♣",
		clubsuit: "♣",
		Colon: "∷",
		colon: ":",
		Colone: "⩴",
		colone: "≔",
		coloneq: "≔",
		comma: ",",
		commat: "@",
		comp: "∁",
		compfn: "∘",
		complement: "∁",
		complexes: "ℂ",
		cong: "≅",
		congdot: "⩭",
		Congruent: "≡",
		Conint: "∯",
		conint: "∮",
		ContourIntegral: "∮",
		Copf: "ℂ",
		copf: "𝕔",
		coprod: "∐",
		Coproduct: "∐",
		COPY: "©",
		copy: "©",
		copysr: "℗",
		CounterClockwiseContourIntegral: "∳",
		crarr: "↵",
		Cross: "⨯",
		cross: "✗",
		Cscr: "𝒞",
		cscr: "𝒸",
		csub: "⫏",
		csube: "⫑",
		csup: "⫐",
		csupe: "⫒",
		ctdot: "⋯",
		cudarrl: "⤸",
		cudarrr: "⤵",
		cuepr: "⋞",
		cuesc: "⋟",
		cularr: "↶",
		cularrp: "⤽",
		Cup: "⋓",
		cup: "∪",
		cupbrcap: "⩈",
		CupCap: "≍",
		cupcap: "⩆",
		cupcup: "⩊",
		cupdot: "⊍",
		cupor: "⩅",
		cups: "∪︀",
		curarr: "↷",
		curarrm: "⤼",
		curlyeqprec: "⋞",
		curlyeqsucc: "⋟",
		curlyvee: "⋎",
		curlywedge: "⋏",
		curren: "¤",
		curvearrowleft: "↶",
		curvearrowright: "↷",
		cuvee: "⋎",
		cuwed: "⋏",
		cwconint: "∲",
		cwint: "∱",
		cylcty: "⌭",
		Dagger: "‡",
		dagger: "†",
		daleth: "ℸ",
		Darr: "↡",
		dArr: "⇓",
		darr: "↓",
		dash: "‐",
		Dashv: "⫤",
		dashv: "⊣",
		dbkarow: "⤏",
		dblac: "˝",
		Dcaron: "Ď",
		dcaron: "ď",
		Dcy: "Д",
		dcy: "д",
		DD: "ⅅ",
		dd: "ⅆ",
		ddagger: "‡",
		ddarr: "⇊",
		DDotrahd: "⤑",
		ddotseq: "⩷",
		deg: "°",
		Del: "∇",
		Delta: "Δ",
		delta: "δ",
		demptyv: "⦱",
		dfisht: "⥿",
		Dfr: "𝔇",
		dfr: "𝔡",
		dHar: "⥥",
		dharl: "⇃",
		dharr: "⇂",
		DiacriticalAcute: "´",
		DiacriticalDot: "˙",
		DiacriticalDoubleAcute: "˝",
		DiacriticalGrave: "`",
		DiacriticalTilde: "˜",
		diam: "⋄",
		Diamond: "⋄",
		diamond: "⋄",
		diamondsuit: "♦",
		diams: "♦",
		die: "¨",
		DifferentialD: "ⅆ",
		digamma: "ϝ",
		disin: "⋲",
		div: "÷",
		divide: "÷",
		divideontimes: "⋇",
		divonx: "⋇",
		DJcy: "Ђ",
		djcy: "ђ",
		dlcorn: "⌞",
		dlcrop: "⌍",
		dollar: "$",
		Dopf: "𝔻",
		dopf: "𝕕",
		Dot: "¨",
		dot: "˙",
		DotDot: "⃜",
		doteq: "≐",
		doteqdot: "≑",
		DotEqual: "≐",
		dotminus: "∸",
		dotplus: "∔",
		dotsquare: "⊡",
		doublebarwedge: "⌆",
		DoubleContourIntegral: "∯",
		DoubleDot: "¨",
		DoubleDownArrow: "⇓",
		DoubleLeftArrow: "⇐",
		DoubleLeftRightArrow: "⇔",
		DoubleLeftTee: "⫤",
		DoubleLongLeftArrow: "⟸",
		DoubleLongLeftRightArrow: "⟺",
		DoubleLongRightArrow: "⟹",
		DoubleRightArrow: "⇒",
		DoubleRightTee: "⊨",
		DoubleUpArrow: "⇑",
		DoubleUpDownArrow: "⇕",
		DoubleVerticalBar: "∥",
		DownArrow: "↓",
		Downarrow: "⇓",
		downarrow: "↓",
		DownArrowBar: "⤓",
		DownArrowUpArrow: "⇵",
		DownBreve: "̑",
		downdownarrows: "⇊",
		downharpoonleft: "⇃",
		downharpoonright: "⇂",
		DownLeftRightVector: "⥐",
		DownLeftTeeVector: "⥞",
		DownLeftVector: "↽",
		DownLeftVectorBar: "⥖",
		DownRightTeeVector: "⥟",
		DownRightVector: "⇁",
		DownRightVectorBar: "⥗",
		DownTee: "⊤",
		DownTeeArrow: "↧",
		drbkarow: "⤐",
		drcorn: "⌟",
		drcrop: "⌌",
		Dscr: "𝒟",
		dscr: "𝒹",
		DScy: "Ѕ",
		dscy: "ѕ",
		dsol: "⧶",
		Dstrok: "Đ",
		dstrok: "đ",
		dtdot: "⋱",
		dtri: "▿",
		dtrif: "▾",
		duarr: "⇵",
		duhar: "⥯",
		dwangle: "⦦",
		DZcy: "Џ",
		dzcy: "џ",
		dzigrarr: "⟿",
		Eacute: "É",
		eacute: "é",
		easter: "⩮",
		Ecaron: "Ě",
		ecaron: "ě",
		ecir: "≖",
		Ecirc: "Ê",
		ecirc: "ê",
		ecolon: "≕",
		Ecy: "Э",
		ecy: "э",
		eDDot: "⩷",
		Edot: "Ė",
		eDot: "≑",
		edot: "ė",
		ee: "ⅇ",
		efDot: "≒",
		Efr: "𝔈",
		efr: "𝔢",
		eg: "⪚",
		Egrave: "È",
		egrave: "è",
		egs: "⪖",
		egsdot: "⪘",
		el: "⪙",
		Element: "∈",
		elinters: "⏧",
		ell: "ℓ",
		els: "⪕",
		elsdot: "⪗",
		Emacr: "Ē",
		emacr: "ē",
		empty: "∅",
		emptyset: "∅",
		EmptySmallSquare: "◻",
		emptyv: "∅",
		EmptyVerySmallSquare: "▫",
		emsp: " ",
		emsp13: " ",
		emsp14: " ",
		ENG: "Ŋ",
		eng: "ŋ",
		ensp: " ",
		Eogon: "Ę",
		eogon: "ę",
		Eopf: "𝔼",
		eopf: "𝕖",
		epar: "⋕",
		eparsl: "⧣",
		eplus: "⩱",
		epsi: "ε",
		Epsilon: "Ε",
		epsilon: "ε",
		epsiv: "ϵ",
		eqcirc: "≖",
		eqcolon: "≕",
		eqsim: "≂",
		eqslantgtr: "⪖",
		eqslantless: "⪕",
		Equal: "⩵",
		equals: "=",
		EqualTilde: "≂",
		equest: "≟",
		Equilibrium: "⇌",
		equiv: "≡",
		equivDD: "⩸",
		eqvparsl: "⧥",
		erarr: "⥱",
		erDot: "≓",
		Escr: "ℰ",
		escr: "ℯ",
		esdot: "≐",
		Esim: "⩳",
		esim: "≂",
		Eta: "Η",
		eta: "η",
		ETH: "Ð",
		eth: "ð",
		Euml: "Ë",
		euml: "ë",
		euro: "€",
		excl: "!",
		exist: "∃",
		Exists: "∃",
		expectation: "ℰ",
		ExponentialE: "ⅇ",
		exponentiale: "ⅇ",
		fallingdotseq: "≒",
		Fcy: "Ф",
		fcy: "ф",
		female: "♀",
		ffilig: "ﬃ",
		fflig: "ﬀ",
		ffllig: "ﬄ",
		Ffr: "𝔉",
		ffr: "𝔣",
		filig: "ﬁ",
		FilledSmallSquare: "◼",
		FilledVerySmallSquare: "▪",
		fjlig: "fj",
		flat: "♭",
		fllig: "ﬂ",
		fltns: "▱",
		fnof: "ƒ",
		Fopf: "𝔽",
		fopf: "𝕗",
		ForAll: "∀",
		forall: "∀",
		fork: "⋔",
		forkv: "⫙",
		Fouriertrf: "ℱ",
		fpartint: "⨍",
		frac12: "½",
		frac13: "⅓",
		frac14: "¼",
		frac15: "⅕",
		frac16: "⅙",
		frac18: "⅛",
		frac23: "⅔",
		frac25: "⅖",
		frac34: "¾",
		frac35: "⅗",
		frac38: "⅜",
		frac45: "⅘",
		frac56: "⅚",
		frac58: "⅝",
		frac78: "⅞",
		frasl: "⁄",
		frown: "⌢",
		Fscr: "ℱ",
		fscr: "𝒻",
		gacute: "ǵ",
		Gamma: "Γ",
		gamma: "γ",
		Gammad: "Ϝ",
		gammad: "ϝ",
		gap: "⪆",
		Gbreve: "Ğ",
		gbreve: "ğ",
		Gcedil: "Ģ",
		Gcirc: "Ĝ",
		gcirc: "ĝ",
		Gcy: "Г",
		gcy: "г",
		Gdot: "Ġ",
		gdot: "ġ",
		gE: "≧",
		ge: "≥",
		gEl: "⪌",
		gel: "⋛",
		geq: "≥",
		geqq: "≧",
		geqslant: "⩾",
		ges: "⩾",
		gescc: "⪩",
		gesdot: "⪀",
		gesdoto: "⪂",
		gesdotol: "⪄",
		gesl: "⋛︀",
		gesles: "⪔",
		Gfr: "𝔊",
		gfr: "𝔤",
		Gg: "⋙",
		gg: "≫",
		ggg: "⋙",
		gimel: "ℷ",
		GJcy: "Ѓ",
		gjcy: "ѓ",
		gl: "≷",
		gla: "⪥",
		glE: "⪒",
		glj: "⪤",
		gnap: "⪊",
		gnapprox: "⪊",
		gnE: "≩",
		gne: "⪈",
		gneq: "⪈",
		gneqq: "≩",
		gnsim: "⋧",
		Gopf: "𝔾",
		gopf: "𝕘",
		grave: "`",
		GreaterEqual: "≥",
		GreaterEqualLess: "⋛",
		GreaterFullEqual: "≧",
		GreaterGreater: "⪢",
		GreaterLess: "≷",
		GreaterSlantEqual: "⩾",
		GreaterTilde: "≳",
		Gscr: "𝒢",
		gscr: "ℊ",
		gsim: "≳",
		gsime: "⪎",
		gsiml: "⪐",
		Gt: "≫",
		GT: ">",
		gt: ">",
		gtcc: "⪧",
		gtcir: "⩺",
		gtdot: "⋗",
		gtlPar: "⦕",
		gtquest: "⩼",
		gtrapprox: "⪆",
		gtrarr: "⥸",
		gtrdot: "⋗",
		gtreqless: "⋛",
		gtreqqless: "⪌",
		gtrless: "≷",
		gtrsim: "≳",
		gvertneqq: "≩︀",
		gvnE: "≩︀",
		Hacek: "ˇ",
		hairsp: " ",
		half: "½",
		hamilt: "ℋ",
		HARDcy: "Ъ",
		hardcy: "ъ",
		hArr: "⇔",
		harr: "↔",
		harrcir: "⥈",
		harrw: "↭",
		Hat: "^",
		hbar: "ℏ",
		Hcirc: "Ĥ",
		hcirc: "ĥ",
		hearts: "♥",
		heartsuit: "♥",
		hellip: "…",
		hercon: "⊹",
		Hfr: "ℌ",
		hfr: "𝔥",
		HilbertSpace: "ℋ",
		hksearow: "⤥",
		hkswarow: "⤦",
		hoarr: "⇿",
		homtht: "∻",
		hookleftarrow: "↩",
		hookrightarrow: "↪",
		Hopf: "ℍ",
		hopf: "𝕙",
		horbar: "―",
		HorizontalLine: "─",
		Hscr: "ℋ",
		hscr: "𝒽",
		hslash: "ℏ",
		Hstrok: "Ħ",
		hstrok: "ħ",
		HumpDownHump: "≎",
		HumpEqual: "≏",
		hybull: "⁃",
		hyphen: "‐",
		Iacute: "Í",
		iacute: "í",
		ic: "⁣",
		Icirc: "Î",
		icirc: "î",
		Icy: "И",
		icy: "и",
		Idot: "İ",
		IEcy: "Е",
		iecy: "е",
		iexcl: "¡",
		iff: "⇔",
		Ifr: "ℑ",
		ifr: "𝔦",
		Igrave: "Ì",
		igrave: "ì",
		ii: "ⅈ",
		iiiint: "⨌",
		iiint: "∭",
		iinfin: "⧜",
		iiota: "℩",
		IJlig: "Ĳ",
		ijlig: "ĳ",
		Im: "ℑ",
		Imacr: "Ī",
		imacr: "ī",
		image: "ℑ",
		ImaginaryI: "ⅈ",
		imagline: "ℐ",
		imagpart: "ℑ",
		imath: "ı",
		imof: "⊷",
		imped: "Ƶ",
		Implies: "⇒",
		in: "∈",
		incare: "℅",
		infin: "∞",
		infintie: "⧝",
		inodot: "ı",
		Int: "∬",
		int: "∫",
		intcal: "⊺",
		integers: "ℤ",
		Integral: "∫",
		intercal: "⊺",
		Intersection: "⋂",
		intlarhk: "⨗",
		intprod: "⨼",
		InvisibleComma: "⁣",
		InvisibleTimes: "⁢",
		IOcy: "Ё",
		iocy: "ё",
		Iogon: "Į",
		iogon: "į",
		Iopf: "𝕀",
		iopf: "𝕚",
		Iota: "Ι",
		iota: "ι",
		iprod: "⨼",
		iquest: "¿",
		Iscr: "ℐ",
		iscr: "𝒾",
		isin: "∈",
		isindot: "⋵",
		isinE: "⋹",
		isins: "⋴",
		isinsv: "⋳",
		isinv: "∈",
		it: "⁢",
		Itilde: "Ĩ",
		itilde: "ĩ",
		Iukcy: "І",
		iukcy: "і",
		Iuml: "Ï",
		iuml: "ï",
		Jcirc: "Ĵ",
		jcirc: "ĵ",
		Jcy: "Й",
		jcy: "й",
		Jfr: "𝔍",
		jfr: "𝔧",
		jmath: "ȷ",
		Jopf: "𝕁",
		jopf: "𝕛",
		Jscr: "𝒥",
		jscr: "𝒿",
		Jsercy: "Ј",
		jsercy: "ј",
		Jukcy: "Є",
		jukcy: "є",
		Kappa: "Κ",
		kappa: "κ",
		kappav: "ϰ",
		Kcedil: "Ķ",
		kcedil: "ķ",
		Kcy: "К",
		kcy: "к",
		Kfr: "𝔎",
		kfr: "𝔨",
		kgreen: "ĸ",
		KHcy: "Х",
		khcy: "х",
		KJcy: "Ќ",
		kjcy: "ќ",
		Kopf: "𝕂",
		kopf: "𝕜",
		Kscr: "𝒦",
		kscr: "𝓀",
		lAarr: "⇚",
		Lacute: "Ĺ",
		lacute: "ĺ",
		laemptyv: "⦴",
		lagran: "ℒ",
		Lambda: "Λ",
		lambda: "λ",
		Lang: "⟪",
		lang: "⟨",
		langd: "⦑",
		langle: "⟨",
		lap: "⪅",
		Laplacetrf: "ℒ",
		laquo: "«",
		Larr: "↞",
		lArr: "⇐",
		larr: "←",
		larrb: "⇤",
		larrbfs: "⤟",
		larrfs: "⤝",
		larrhk: "↩",
		larrlp: "↫",
		larrpl: "⤹",
		larrsim: "⥳",
		larrtl: "↢",
		lat: "⪫",
		lAtail: "⤛",
		latail: "⤙",
		late: "⪭",
		lates: "⪭︀",
		lBarr: "⤎",
		lbarr: "⤌",
		lbbrk: "❲",
		lbrace: "{",
		lbrack: "[",
		lbrke: "⦋",
		lbrksld: "⦏",
		lbrkslu: "⦍",
		Lcaron: "Ľ",
		lcaron: "ľ",
		Lcedil: "Ļ",
		lcedil: "ļ",
		lceil: "⌈",
		lcub: "{",
		Lcy: "Л",
		lcy: "л",
		ldca: "⤶",
		ldquo: "“",
		ldquor: "„",
		ldrdhar: "⥧",
		ldrushar: "⥋",
		ldsh: "↲",
		lE: "≦",
		le: "≤",
		LeftAngleBracket: "⟨",
		LeftArrow: "←",
		Leftarrow: "⇐",
		leftarrow: "←",
		LeftArrowBar: "⇤",
		LeftArrowRightArrow: "⇆",
		leftarrowtail: "↢",
		LeftCeiling: "⌈",
		LeftDoubleBracket: "⟦",
		LeftDownTeeVector: "⥡",
		LeftDownVector: "⇃",
		LeftDownVectorBar: "⥙",
		LeftFloor: "⌊",
		leftharpoondown: "↽",
		leftharpoonup: "↼",
		leftleftarrows: "⇇",
		LeftRightArrow: "↔",
		Leftrightarrow: "⇔",
		leftrightarrow: "↔",
		leftrightarrows: "⇆",
		leftrightharpoons: "⇋",
		leftrightsquigarrow: "↭",
		LeftRightVector: "⥎",
		LeftTee: "⊣",
		LeftTeeArrow: "↤",
		LeftTeeVector: "⥚",
		leftthreetimes: "⋋",
		LeftTriangle: "⊲",
		LeftTriangleBar: "⧏",
		LeftTriangleEqual: "⊴",
		LeftUpDownVector: "⥑",
		LeftUpTeeVector: "⥠",
		LeftUpVector: "↿",
		LeftUpVectorBar: "⥘",
		LeftVector: "↼",
		LeftVectorBar: "⥒",
		lEg: "⪋",
		leg: "⋚",
		leq: "≤",
		leqq: "≦",
		leqslant: "⩽",
		les: "⩽",
		lescc: "⪨",
		lesdot: "⩿",
		lesdoto: "⪁",
		lesdotor: "⪃",
		lesg: "⋚︀",
		lesges: "⪓",
		lessapprox: "⪅",
		lessdot: "⋖",
		lesseqgtr: "⋚",
		lesseqqgtr: "⪋",
		LessEqualGreater: "⋚",
		LessFullEqual: "≦",
		LessGreater: "≶",
		lessgtr: "≶",
		LessLess: "⪡",
		lesssim: "≲",
		LessSlantEqual: "⩽",
		LessTilde: "≲",
		lfisht: "⥼",
		lfloor: "⌊",
		Lfr: "𝔏",
		lfr: "𝔩",
		lg: "≶",
		lgE: "⪑",
		lHar: "⥢",
		lhard: "↽",
		lharu: "↼",
		lharul: "⥪",
		lhblk: "▄",
		LJcy: "Љ",
		ljcy: "љ",
		Ll: "⋘",
		ll: "≪",
		llarr: "⇇",
		llcorner: "⌞",
		Lleftarrow: "⇚",
		llhard: "⥫",
		lltri: "◺",
		Lmidot: "Ŀ",
		lmidot: "ŀ",
		lmoust: "⎰",
		lmoustache: "⎰",
		lnap: "⪉",
		lnapprox: "⪉",
		lnE: "≨",
		lne: "⪇",
		lneq: "⪇",
		lneqq: "≨",
		lnsim: "⋦",
		loang: "⟬",
		loarr: "⇽",
		lobrk: "⟦",
		LongLeftArrow: "⟵",
		Longleftarrow: "⟸",
		longleftarrow: "⟵",
		LongLeftRightArrow: "⟷",
		Longleftrightarrow: "⟺",
		longleftrightarrow: "⟷",
		longmapsto: "⟼",
		LongRightArrow: "⟶",
		Longrightarrow: "⟹",
		longrightarrow: "⟶",
		looparrowleft: "↫",
		looparrowright: "↬",
		lopar: "⦅",
		Lopf: "𝕃",
		lopf: "𝕝",
		loplus: "⨭",
		lotimes: "⨴",
		lowast: "∗",
		lowbar: "_",
		LowerLeftArrow: "↙",
		LowerRightArrow: "↘",
		loz: "◊",
		lozenge: "◊",
		lozf: "⧫",
		lpar: "(",
		lparlt: "⦓",
		lrarr: "⇆",
		lrcorner: "⌟",
		lrhar: "⇋",
		lrhard: "⥭",
		lrm: "‎",
		lrtri: "⊿",
		lsaquo: "‹",
		Lscr: "ℒ",
		lscr: "𝓁",
		Lsh: "↰",
		lsh: "↰",
		lsim: "≲",
		lsime: "⪍",
		lsimg: "⪏",
		lsqb: "[",
		lsquo: "‘",
		lsquor: "‚",
		Lstrok: "Ł",
		lstrok: "ł",
		Lt: "≪",
		LT: "<",
		lt: "<",
		ltcc: "⪦",
		ltcir: "⩹",
		ltdot: "⋖",
		lthree: "⋋",
		ltimes: "⋉",
		ltlarr: "⥶",
		ltquest: "⩻",
		ltri: "◃",
		ltrie: "⊴",
		ltrif: "◂",
		ltrPar: "⦖",
		lurdshar: "⥊",
		luruhar: "⥦",
		lvertneqq: "≨︀",
		lvnE: "≨︀",
		macr: "¯",
		male: "♂",
		malt: "✠",
		maltese: "✠",
		Map: "⤅",
		map: "↦",
		mapsto: "↦",
		mapstodown: "↧",
		mapstoleft: "↤",
		mapstoup: "↥",
		marker: "▮",
		mcomma: "⨩",
		Mcy: "М",
		mcy: "м",
		mdash: "—",
		mDDot: "∺",
		measuredangle: "∡",
		MediumSpace: " ",
		Mellintrf: "ℳ",
		Mfr: "𝔐",
		mfr: "𝔪",
		mho: "℧",
		micro: "µ",
		mid: "∣",
		midast: "*",
		midcir: "⫰",
		middot: "·",
		minus: "−",
		minusb: "⊟",
		minusd: "∸",
		minusdu: "⨪",
		MinusPlus: "∓",
		mlcp: "⫛",
		mldr: "…",
		mnplus: "∓",
		models: "⊧",
		Mopf: "𝕄",
		mopf: "𝕞",
		mp: "∓",
		Mscr: "ℳ",
		mscr: "𝓂",
		mstpos: "∾",
		Mu: "Μ",
		mu: "μ",
		multimap: "⊸",
		mumap: "⊸",
		nabla: "∇",
		Nacute: "Ń",
		nacute: "ń",
		nang: "∠⃒",
		nap: "≉",
		napE: "⩰̸",
		napid: "≋̸",
		napos: "ŉ",
		napprox: "≉",
		natur: "♮",
		natural: "♮",
		naturals: "ℕ",
		nbsp: "\xA0",
		nbump: "≎̸",
		nbumpe: "≏̸",
		ncap: "⩃",
		Ncaron: "Ň",
		ncaron: "ň",
		Ncedil: "Ņ",
		ncedil: "ņ",
		ncong: "≇",
		ncongdot: "⩭̸",
		ncup: "⩂",
		Ncy: "Н",
		ncy: "н",
		ndash: "–",
		ne: "≠",
		nearhk: "⤤",
		neArr: "⇗",
		nearr: "↗",
		nearrow: "↗",
		nedot: "≐̸",
		NegativeMediumSpace: "​",
		NegativeThickSpace: "​",
		NegativeThinSpace: "​",
		NegativeVeryThinSpace: "​",
		nequiv: "≢",
		nesear: "⤨",
		nesim: "≂̸",
		NestedGreaterGreater: "≫",
		NestedLessLess: "≪",
		NewLine: "\n",
		nexist: "∄",
		nexists: "∄",
		Nfr: "𝔑",
		nfr: "𝔫",
		ngE: "≧̸",
		nge: "≱",
		ngeq: "≱",
		ngeqq: "≧̸",
		ngeqslant: "⩾̸",
		nges: "⩾̸",
		nGg: "⋙̸",
		ngsim: "≵",
		nGt: "≫⃒",
		ngt: "≯",
		ngtr: "≯",
		nGtv: "≫̸",
		nhArr: "⇎",
		nharr: "↮",
		nhpar: "⫲",
		ni: "∋",
		nis: "⋼",
		nisd: "⋺",
		niv: "∋",
		NJcy: "Њ",
		njcy: "њ",
		nlArr: "⇍",
		nlarr: "↚",
		nldr: "‥",
		nlE: "≦̸",
		nle: "≰",
		nLeftarrow: "⇍",
		nleftarrow: "↚",
		nLeftrightarrow: "⇎",
		nleftrightarrow: "↮",
		nleq: "≰",
		nleqq: "≦̸",
		nleqslant: "⩽̸",
		nles: "⩽̸",
		nless: "≮",
		nLl: "⋘̸",
		nlsim: "≴",
		nLt: "≪⃒",
		nlt: "≮",
		nltri: "⋪",
		nltrie: "⋬",
		nLtv: "≪̸",
		nmid: "∤",
		NoBreak: "⁠",
		NonBreakingSpace: "\xA0",
		Nopf: "ℕ",
		nopf: "𝕟",
		Not: "⫬",
		not: "¬",
		NotCongruent: "≢",
		NotCupCap: "≭",
		NotDoubleVerticalBar: "∦",
		NotElement: "∉",
		NotEqual: "≠",
		NotEqualTilde: "≂̸",
		NotExists: "∄",
		NotGreater: "≯",
		NotGreaterEqual: "≱",
		NotGreaterFullEqual: "≧̸",
		NotGreaterGreater: "≫̸",
		NotGreaterLess: "≹",
		NotGreaterSlantEqual: "⩾̸",
		NotGreaterTilde: "≵",
		NotHumpDownHump: "≎̸",
		NotHumpEqual: "≏̸",
		notin: "∉",
		notindot: "⋵̸",
		notinE: "⋹̸",
		notinva: "∉",
		notinvb: "⋷",
		notinvc: "⋶",
		NotLeftTriangle: "⋪",
		NotLeftTriangleBar: "⧏̸",
		NotLeftTriangleEqual: "⋬",
		NotLess: "≮",
		NotLessEqual: "≰",
		NotLessGreater: "≸",
		NotLessLess: "≪̸",
		NotLessSlantEqual: "⩽̸",
		NotLessTilde: "≴",
		NotNestedGreaterGreater: "⪢̸",
		NotNestedLessLess: "⪡̸",
		notni: "∌",
		notniva: "∌",
		notnivb: "⋾",
		notnivc: "⋽",
		NotPrecedes: "⊀",
		NotPrecedesEqual: "⪯̸",
		NotPrecedesSlantEqual: "⋠",
		NotReverseElement: "∌",
		NotRightTriangle: "⋫",
		NotRightTriangleBar: "⧐̸",
		NotRightTriangleEqual: "⋭",
		NotSquareSubset: "⊏̸",
		NotSquareSubsetEqual: "⋢",
		NotSquareSuperset: "⊐̸",
		NotSquareSupersetEqual: "⋣",
		NotSubset: "⊂⃒",
		NotSubsetEqual: "⊈",
		NotSucceeds: "⊁",
		NotSucceedsEqual: "⪰̸",
		NotSucceedsSlantEqual: "⋡",
		NotSucceedsTilde: "≿̸",
		NotSuperset: "⊃⃒",
		NotSupersetEqual: "⊉",
		NotTilde: "≁",
		NotTildeEqual: "≄",
		NotTildeFullEqual: "≇",
		NotTildeTilde: "≉",
		NotVerticalBar: "∤",
		npar: "∦",
		nparallel: "∦",
		nparsl: "⫽⃥",
		npart: "∂̸",
		npolint: "⨔",
		npr: "⊀",
		nprcue: "⋠",
		npre: "⪯̸",
		nprec: "⊀",
		npreceq: "⪯̸",
		nrArr: "⇏",
		nrarr: "↛",
		nrarrc: "⤳̸",
		nrarrw: "↝̸",
		nRightarrow: "⇏",
		nrightarrow: "↛",
		nrtri: "⋫",
		nrtrie: "⋭",
		nsc: "⊁",
		nsccue: "⋡",
		nsce: "⪰̸",
		Nscr: "𝒩",
		nscr: "𝓃",
		nshortmid: "∤",
		nshortparallel: "∦",
		nsim: "≁",
		nsime: "≄",
		nsimeq: "≄",
		nsmid: "∤",
		nspar: "∦",
		nsqsube: "⋢",
		nsqsupe: "⋣",
		nsub: "⊄",
		nsubE: "⫅̸",
		nsube: "⊈",
		nsubset: "⊂⃒",
		nsubseteq: "⊈",
		nsubseteqq: "⫅̸",
		nsucc: "⊁",
		nsucceq: "⪰̸",
		nsup: "⊅",
		nsupE: "⫆̸",
		nsupe: "⊉",
		nsupset: "⊃⃒",
		nsupseteq: "⊉",
		nsupseteqq: "⫆̸",
		ntgl: "≹",
		Ntilde: "Ñ",
		ntilde: "ñ",
		ntlg: "≸",
		ntriangleleft: "⋪",
		ntrianglelefteq: "⋬",
		ntriangleright: "⋫",
		ntrianglerighteq: "⋭",
		Nu: "Ν",
		nu: "ν",
		num: "#",
		numero: "№",
		numsp: " ",
		nvap: "≍⃒",
		nVDash: "⊯",
		nVdash: "⊮",
		nvDash: "⊭",
		nvdash: "⊬",
		nvge: "≥⃒",
		nvgt: ">⃒",
		nvHarr: "⤄",
		nvinfin: "⧞",
		nvlArr: "⤂",
		nvle: "≤⃒",
		nvlt: "<⃒",
		nvltrie: "⊴⃒",
		nvrArr: "⤃",
		nvrtrie: "⊵⃒",
		nvsim: "∼⃒",
		nwarhk: "⤣",
		nwArr: "⇖",
		nwarr: "↖",
		nwarrow: "↖",
		nwnear: "⤧",
		Oacute: "Ó",
		oacute: "ó",
		oast: "⊛",
		ocir: "⊚",
		Ocirc: "Ô",
		ocirc: "ô",
		Ocy: "О",
		ocy: "о",
		odash: "⊝",
		Odblac: "Ő",
		odblac: "ő",
		odiv: "⨸",
		odot: "⊙",
		odsold: "⦼",
		OElig: "Œ",
		oelig: "œ",
		ofcir: "⦿",
		Ofr: "𝔒",
		ofr: "𝔬",
		ogon: "˛",
		Ograve: "Ò",
		ograve: "ò",
		ogt: "⧁",
		ohbar: "⦵",
		ohm: "Ω",
		oint: "∮",
		olarr: "↺",
		olcir: "⦾",
		olcross: "⦻",
		oline: "‾",
		olt: "⧀",
		Omacr: "Ō",
		omacr: "ō",
		Omega: "Ω",
		omega: "ω",
		Omicron: "Ο",
		omicron: "ο",
		omid: "⦶",
		ominus: "⊖",
		Oopf: "𝕆",
		oopf: "𝕠",
		opar: "⦷",
		OpenCurlyDoubleQuote: "“",
		OpenCurlyQuote: "‘",
		operp: "⦹",
		oplus: "⊕",
		Or: "⩔",
		or: "∨",
		orarr: "↻",
		ord: "⩝",
		order: "ℴ",
		orderof: "ℴ",
		ordf: "ª",
		ordm: "º",
		origof: "⊶",
		oror: "⩖",
		orslope: "⩗",
		orv: "⩛",
		oS: "Ⓢ",
		Oscr: "𝒪",
		oscr: "ℴ",
		Oslash: "Ø",
		oslash: "ø",
		osol: "⊘",
		Otilde: "Õ",
		otilde: "õ",
		Otimes: "⨷",
		otimes: "⊗",
		otimesas: "⨶",
		Ouml: "Ö",
		ouml: "ö",
		ovbar: "⌽",
		OverBar: "‾",
		OverBrace: "⏞",
		OverBracket: "⎴",
		OverParenthesis: "⏜",
		par: "∥",
		para: "¶",
		parallel: "∥",
		parsim: "⫳",
		parsl: "⫽",
		part: "∂",
		PartialD: "∂",
		Pcy: "П",
		pcy: "п",
		percnt: "%",
		period: ".",
		permil: "‰",
		perp: "⊥",
		pertenk: "‱",
		Pfr: "𝔓",
		pfr: "𝔭",
		Phi: "Φ",
		phi: "φ",
		phiv: "ϕ",
		phmmat: "ℳ",
		phone: "☎",
		Pi: "Π",
		pi: "π",
		pitchfork: "⋔",
		piv: "ϖ",
		planck: "ℏ",
		planckh: "ℎ",
		plankv: "ℏ",
		plus: "+",
		plusacir: "⨣",
		plusb: "⊞",
		pluscir: "⨢",
		plusdo: "∔",
		plusdu: "⨥",
		pluse: "⩲",
		PlusMinus: "±",
		plusmn: "±",
		plussim: "⨦",
		plustwo: "⨧",
		pm: "±",
		Poincareplane: "ℌ",
		pointint: "⨕",
		Popf: "ℙ",
		popf: "𝕡",
		pound: "£",
		Pr: "⪻",
		pr: "≺",
		prap: "⪷",
		prcue: "≼",
		prE: "⪳",
		pre: "⪯",
		prec: "≺",
		precapprox: "⪷",
		preccurlyeq: "≼",
		Precedes: "≺",
		PrecedesEqual: "⪯",
		PrecedesSlantEqual: "≼",
		PrecedesTilde: "≾",
		preceq: "⪯",
		precnapprox: "⪹",
		precneqq: "⪵",
		precnsim: "⋨",
		precsim: "≾",
		Prime: "″",
		prime: "′",
		primes: "ℙ",
		prnap: "⪹",
		prnE: "⪵",
		prnsim: "⋨",
		prod: "∏",
		Product: "∏",
		profalar: "⌮",
		profline: "⌒",
		profsurf: "⌓",
		prop: "∝",
		Proportion: "∷",
		Proportional: "∝",
		propto: "∝",
		prsim: "≾",
		prurel: "⊰",
		Pscr: "𝒫",
		pscr: "𝓅",
		Psi: "Ψ",
		psi: "ψ",
		puncsp: " ",
		Qfr: "𝔔",
		qfr: "𝔮",
		qint: "⨌",
		Qopf: "ℚ",
		qopf: "𝕢",
		qprime: "⁗",
		Qscr: "𝒬",
		qscr: "𝓆",
		quaternions: "ℍ",
		quatint: "⨖",
		quest: "?",
		questeq: "≟",
		QUOT: "\"",
		quot: "\"",
		rAarr: "⇛",
		race: "∽̱",
		Racute: "Ŕ",
		racute: "ŕ",
		radic: "√",
		raemptyv: "⦳",
		Rang: "⟫",
		rang: "⟩",
		rangd: "⦒",
		range: "⦥",
		rangle: "⟩",
		raquo: "»",
		Rarr: "↠",
		rArr: "⇒",
		rarr: "→",
		rarrap: "⥵",
		rarrb: "⇥",
		rarrbfs: "⤠",
		rarrc: "⤳",
		rarrfs: "⤞",
		rarrhk: "↪",
		rarrlp: "↬",
		rarrpl: "⥅",
		rarrsim: "⥴",
		Rarrtl: "⤖",
		rarrtl: "↣",
		rarrw: "↝",
		rAtail: "⤜",
		ratail: "⤚",
		ratio: "∶",
		rationals: "ℚ",
		RBarr: "⤐",
		rBarr: "⤏",
		rbarr: "⤍",
		rbbrk: "❳",
		rbrace: "}",
		rbrack: "]",
		rbrke: "⦌",
		rbrksld: "⦎",
		rbrkslu: "⦐",
		Rcaron: "Ř",
		rcaron: "ř",
		Rcedil: "Ŗ",
		rcedil: "ŗ",
		rceil: "⌉",
		rcub: "}",
		Rcy: "Р",
		rcy: "р",
		rdca: "⤷",
		rdldhar: "⥩",
		rdquo: "”",
		rdquor: "”",
		rdsh: "↳",
		Re: "ℜ",
		real: "ℜ",
		realine: "ℛ",
		realpart: "ℜ",
		reals: "ℝ",
		rect: "▭",
		REG: "®",
		reg: "®",
		ReverseElement: "∋",
		ReverseEquilibrium: "⇋",
		ReverseUpEquilibrium: "⥯",
		rfisht: "⥽",
		rfloor: "⌋",
		Rfr: "ℜ",
		rfr: "𝔯",
		rHar: "⥤",
		rhard: "⇁",
		rharu: "⇀",
		rharul: "⥬",
		Rho: "Ρ",
		rho: "ρ",
		rhov: "ϱ",
		RightAngleBracket: "⟩",
		RightArrow: "→",
		Rightarrow: "⇒",
		rightarrow: "→",
		RightArrowBar: "⇥",
		RightArrowLeftArrow: "⇄",
		rightarrowtail: "↣",
		RightCeiling: "⌉",
		RightDoubleBracket: "⟧",
		RightDownTeeVector: "⥝",
		RightDownVector: "⇂",
		RightDownVectorBar: "⥕",
		RightFloor: "⌋",
		rightharpoondown: "⇁",
		rightharpoonup: "⇀",
		rightleftarrows: "⇄",
		rightleftharpoons: "⇌",
		rightrightarrows: "⇉",
		rightsquigarrow: "↝",
		RightTee: "⊢",
		RightTeeArrow: "↦",
		RightTeeVector: "⥛",
		rightthreetimes: "⋌",
		RightTriangle: "⊳",
		RightTriangleBar: "⧐",
		RightTriangleEqual: "⊵",
		RightUpDownVector: "⥏",
		RightUpTeeVector: "⥜",
		RightUpVector: "↾",
		RightUpVectorBar: "⥔",
		RightVector: "⇀",
		RightVectorBar: "⥓",
		ring: "˚",
		risingdotseq: "≓",
		rlarr: "⇄",
		rlhar: "⇌",
		rlm: "‏",
		rmoust: "⎱",
		rmoustache: "⎱",
		rnmid: "⫮",
		roang: "⟭",
		roarr: "⇾",
		robrk: "⟧",
		ropar: "⦆",
		Ropf: "ℝ",
		ropf: "𝕣",
		roplus: "⨮",
		rotimes: "⨵",
		RoundImplies: "⥰",
		rpar: ")",
		rpargt: "⦔",
		rppolint: "⨒",
		rrarr: "⇉",
		Rrightarrow: "⇛",
		rsaquo: "›",
		Rscr: "ℛ",
		rscr: "𝓇",
		Rsh: "↱",
		rsh: "↱",
		rsqb: "]",
		rsquo: "’",
		rsquor: "’",
		rthree: "⋌",
		rtimes: "⋊",
		rtri: "▹",
		rtrie: "⊵",
		rtrif: "▸",
		rtriltri: "⧎",
		RuleDelayed: "⧴",
		ruluhar: "⥨",
		rx: "℞",
		Sacute: "Ś",
		sacute: "ś",
		sbquo: "‚",
		Sc: "⪼",
		sc: "≻",
		scap: "⪸",
		Scaron: "Š",
		scaron: "š",
		sccue: "≽",
		scE: "⪴",
		sce: "⪰",
		Scedil: "Ş",
		scedil: "ş",
		Scirc: "Ŝ",
		scirc: "ŝ",
		scnap: "⪺",
		scnE: "⪶",
		scnsim: "⋩",
		scpolint: "⨓",
		scsim: "≿",
		Scy: "С",
		scy: "с",
		sdot: "⋅",
		sdotb: "⊡",
		sdote: "⩦",
		searhk: "⤥",
		seArr: "⇘",
		searr: "↘",
		searrow: "↘",
		sect: "§",
		semi: ";",
		seswar: "⤩",
		setminus: "∖",
		setmn: "∖",
		sext: "✶",
		Sfr: "𝔖",
		sfr: "𝔰",
		sfrown: "⌢",
		sharp: "♯",
		SHCHcy: "Щ",
		shchcy: "щ",
		SHcy: "Ш",
		shcy: "ш",
		ShortDownArrow: "↓",
		ShortLeftArrow: "←",
		shortmid: "∣",
		shortparallel: "∥",
		ShortRightArrow: "→",
		ShortUpArrow: "↑",
		shy: "­",
		Sigma: "Σ",
		sigma: "σ",
		sigmaf: "ς",
		sigmav: "ς",
		sim: "∼",
		simdot: "⩪",
		sime: "≃",
		simeq: "≃",
		simg: "⪞",
		simgE: "⪠",
		siml: "⪝",
		simlE: "⪟",
		simne: "≆",
		simplus: "⨤",
		simrarr: "⥲",
		slarr: "←",
		SmallCircle: "∘",
		smallsetminus: "∖",
		smashp: "⨳",
		smeparsl: "⧤",
		smid: "∣",
		smile: "⌣",
		smt: "⪪",
		smte: "⪬",
		smtes: "⪬︀",
		SOFTcy: "Ь",
		softcy: "ь",
		sol: "/",
		solb: "⧄",
		solbar: "⌿",
		Sopf: "𝕊",
		sopf: "𝕤",
		spades: "♠",
		spadesuit: "♠",
		spar: "∥",
		sqcap: "⊓",
		sqcaps: "⊓︀",
		sqcup: "⊔",
		sqcups: "⊔︀",
		Sqrt: "√",
		sqsub: "⊏",
		sqsube: "⊑",
		sqsubset: "⊏",
		sqsubseteq: "⊑",
		sqsup: "⊐",
		sqsupe: "⊒",
		sqsupset: "⊐",
		sqsupseteq: "⊒",
		squ: "□",
		Square: "□",
		square: "□",
		SquareIntersection: "⊓",
		SquareSubset: "⊏",
		SquareSubsetEqual: "⊑",
		SquareSuperset: "⊐",
		SquareSupersetEqual: "⊒",
		SquareUnion: "⊔",
		squarf: "▪",
		squf: "▪",
		srarr: "→",
		Sscr: "𝒮",
		sscr: "𝓈",
		ssetmn: "∖",
		ssmile: "⌣",
		sstarf: "⋆",
		Star: "⋆",
		star: "☆",
		starf: "★",
		straightepsilon: "ϵ",
		straightphi: "ϕ",
		strns: "¯",
		Sub: "⋐",
		sub: "⊂",
		subdot: "⪽",
		subE: "⫅",
		sube: "⊆",
		subedot: "⫃",
		submult: "⫁",
		subnE: "⫋",
		subne: "⊊",
		subplus: "⪿",
		subrarr: "⥹",
		Subset: "⋐",
		subset: "⊂",
		subseteq: "⊆",
		subseteqq: "⫅",
		SubsetEqual: "⊆",
		subsetneq: "⊊",
		subsetneqq: "⫋",
		subsim: "⫇",
		subsub: "⫕",
		subsup: "⫓",
		succ: "≻",
		succapprox: "⪸",
		succcurlyeq: "≽",
		Succeeds: "≻",
		SucceedsEqual: "⪰",
		SucceedsSlantEqual: "≽",
		SucceedsTilde: "≿",
		succeq: "⪰",
		succnapprox: "⪺",
		succneqq: "⪶",
		succnsim: "⋩",
		succsim: "≿",
		SuchThat: "∋",
		Sum: "∑",
		sum: "∑",
		sung: "♪",
		Sup: "⋑",
		sup: "⊃",
		sup1: "¹",
		sup2: "²",
		sup3: "³",
		supdot: "⪾",
		supdsub: "⫘",
		supE: "⫆",
		supe: "⊇",
		supedot: "⫄",
		Superset: "⊃",
		SupersetEqual: "⊇",
		suphsol: "⟉",
		suphsub: "⫗",
		suplarr: "⥻",
		supmult: "⫂",
		supnE: "⫌",
		supne: "⊋",
		supplus: "⫀",
		Supset: "⋑",
		supset: "⊃",
		supseteq: "⊇",
		supseteqq: "⫆",
		supsetneq: "⊋",
		supsetneqq: "⫌",
		supsim: "⫈",
		supsub: "⫔",
		supsup: "⫖",
		swarhk: "⤦",
		swArr: "⇙",
		swarr: "↙",
		swarrow: "↙",
		swnwar: "⤪",
		szlig: "ß",
		Tab: "	",
		target: "⌖",
		Tau: "Τ",
		tau: "τ",
		tbrk: "⎴",
		Tcaron: "Ť",
		tcaron: "ť",
		Tcedil: "Ţ",
		tcedil: "ţ",
		Tcy: "Т",
		tcy: "т",
		tdot: "⃛",
		telrec: "⌕",
		Tfr: "𝔗",
		tfr: "𝔱",
		there4: "∴",
		Therefore: "∴",
		therefore: "∴",
		Theta: "Θ",
		theta: "θ",
		thetasym: "ϑ",
		thetav: "ϑ",
		thickapprox: "≈",
		thicksim: "∼",
		ThickSpace: "  ",
		thinsp: " ",
		ThinSpace: " ",
		thkap: "≈",
		thksim: "∼",
		THORN: "Þ",
		thorn: "þ",
		Tilde: "∼",
		tilde: "˜",
		TildeEqual: "≃",
		TildeFullEqual: "≅",
		TildeTilde: "≈",
		times: "×",
		timesb: "⊠",
		timesbar: "⨱",
		timesd: "⨰",
		tint: "∭",
		toea: "⤨",
		top: "⊤",
		topbot: "⌶",
		topcir: "⫱",
		Topf: "𝕋",
		topf: "𝕥",
		topfork: "⫚",
		tosa: "⤩",
		tprime: "‴",
		TRADE: "™",
		trade: "™",
		triangle: "▵",
		triangledown: "▿",
		triangleleft: "◃",
		trianglelefteq: "⊴",
		triangleq: "≜",
		triangleright: "▹",
		trianglerighteq: "⊵",
		tridot: "◬",
		trie: "≜",
		triminus: "⨺",
		TripleDot: "⃛",
		triplus: "⨹",
		trisb: "⧍",
		tritime: "⨻",
		trpezium: "⏢",
		Tscr: "𝒯",
		tscr: "𝓉",
		TScy: "Ц",
		tscy: "ц",
		TSHcy: "Ћ",
		tshcy: "ћ",
		Tstrok: "Ŧ",
		tstrok: "ŧ",
		twixt: "≬",
		twoheadleftarrow: "↞",
		twoheadrightarrow: "↠",
		Uacute: "Ú",
		uacute: "ú",
		Uarr: "↟",
		uArr: "⇑",
		uarr: "↑",
		Uarrocir: "⥉",
		Ubrcy: "Ў",
		ubrcy: "ў",
		Ubreve: "Ŭ",
		ubreve: "ŭ",
		Ucirc: "Û",
		ucirc: "û",
		Ucy: "У",
		ucy: "у",
		udarr: "⇅",
		Udblac: "Ű",
		udblac: "ű",
		udhar: "⥮",
		ufisht: "⥾",
		Ufr: "𝔘",
		ufr: "𝔲",
		Ugrave: "Ù",
		ugrave: "ù",
		uHar: "⥣",
		uharl: "↿",
		uharr: "↾",
		uhblk: "▀",
		ulcorn: "⌜",
		ulcorner: "⌜",
		ulcrop: "⌏",
		ultri: "◸",
		Umacr: "Ū",
		umacr: "ū",
		uml: "¨",
		UnderBar: "_",
		UnderBrace: "⏟",
		UnderBracket: "⎵",
		UnderParenthesis: "⏝",
		Union: "⋃",
		UnionPlus: "⊎",
		Uogon: "Ų",
		uogon: "ų",
		Uopf: "𝕌",
		uopf: "𝕦",
		UpArrow: "↑",
		Uparrow: "⇑",
		uparrow: "↑",
		UpArrowBar: "⤒",
		UpArrowDownArrow: "⇅",
		UpDownArrow: "↕",
		Updownarrow: "⇕",
		updownarrow: "↕",
		UpEquilibrium: "⥮",
		upharpoonleft: "↿",
		upharpoonright: "↾",
		uplus: "⊎",
		UpperLeftArrow: "↖",
		UpperRightArrow: "↗",
		Upsi: "ϒ",
		upsi: "υ",
		upsih: "ϒ",
		Upsilon: "Υ",
		upsilon: "υ",
		UpTee: "⊥",
		UpTeeArrow: "↥",
		upuparrows: "⇈",
		urcorn: "⌝",
		urcorner: "⌝",
		urcrop: "⌎",
		Uring: "Ů",
		uring: "ů",
		urtri: "◹",
		Uscr: "𝒰",
		uscr: "𝓊",
		utdot: "⋰",
		Utilde: "Ũ",
		utilde: "ũ",
		utri: "▵",
		utrif: "▴",
		uuarr: "⇈",
		Uuml: "Ü",
		uuml: "ü",
		uwangle: "⦧",
		vangrt: "⦜",
		varepsilon: "ϵ",
		varkappa: "ϰ",
		varnothing: "∅",
		varphi: "ϕ",
		varpi: "ϖ",
		varpropto: "∝",
		vArr: "⇕",
		varr: "↕",
		varrho: "ϱ",
		varsigma: "ς",
		varsubsetneq: "⊊︀",
		varsubsetneqq: "⫋︀",
		varsupsetneq: "⊋︀",
		varsupsetneqq: "⫌︀",
		vartheta: "ϑ",
		vartriangleleft: "⊲",
		vartriangleright: "⊳",
		Vbar: "⫫",
		vBar: "⫨",
		vBarv: "⫩",
		Vcy: "В",
		vcy: "в",
		VDash: "⊫",
		Vdash: "⊩",
		vDash: "⊨",
		vdash: "⊢",
		Vdashl: "⫦",
		Vee: "⋁",
		vee: "∨",
		veebar: "⊻",
		veeeq: "≚",
		vellip: "⋮",
		Verbar: "‖",
		verbar: "|",
		Vert: "‖",
		vert: "|",
		VerticalBar: "∣",
		VerticalLine: "|",
		VerticalSeparator: "❘",
		VerticalTilde: "≀",
		VeryThinSpace: " ",
		Vfr: "𝔙",
		vfr: "𝔳",
		vltri: "⊲",
		vnsub: "⊂⃒",
		vnsup: "⊃⃒",
		Vopf: "𝕍",
		vopf: "𝕧",
		vprop: "∝",
		vrtri: "⊳",
		Vscr: "𝒱",
		vscr: "𝓋",
		vsubnE: "⫋︀",
		vsubne: "⊊︀",
		vsupnE: "⫌︀",
		vsupne: "⊋︀",
		Vvdash: "⊪",
		vzigzag: "⦚",
		Wcirc: "Ŵ",
		wcirc: "ŵ",
		wedbar: "⩟",
		Wedge: "⋀",
		wedge: "∧",
		wedgeq: "≙",
		weierp: "℘",
		Wfr: "𝔚",
		wfr: "𝔴",
		Wopf: "𝕎",
		wopf: "𝕨",
		wp: "℘",
		wr: "≀",
		wreath: "≀",
		Wscr: "𝒲",
		wscr: "𝓌",
		xcap: "⋂",
		xcirc: "◯",
		xcup: "⋃",
		xdtri: "▽",
		Xfr: "𝔛",
		xfr: "𝔵",
		xhArr: "⟺",
		xharr: "⟷",
		Xi: "Ξ",
		xi: "ξ",
		xlArr: "⟸",
		xlarr: "⟵",
		xmap: "⟼",
		xnis: "⋻",
		xodot: "⨀",
		Xopf: "𝕏",
		xopf: "𝕩",
		xoplus: "⨁",
		xotime: "⨂",
		xrArr: "⟹",
		xrarr: "⟶",
		Xscr: "𝒳",
		xscr: "𝓍",
		xsqcup: "⨆",
		xuplus: "⨄",
		xutri: "△",
		xvee: "⋁",
		xwedge: "⋀",
		Yacute: "Ý",
		yacute: "ý",
		YAcy: "Я",
		yacy: "я",
		Ycirc: "Ŷ",
		ycirc: "ŷ",
		Ycy: "Ы",
		ycy: "ы",
		yen: "¥",
		Yfr: "𝔜",
		yfr: "𝔶",
		YIcy: "Ї",
		yicy: "ї",
		Yopf: "𝕐",
		yopf: "𝕪",
		Yscr: "𝒴",
		yscr: "𝓎",
		YUcy: "Ю",
		yucy: "ю",
		Yuml: "Ÿ",
		yuml: "ÿ",
		Zacute: "Ź",
		zacute: "ź",
		Zcaron: "Ž",
		zcaron: "ž",
		Zcy: "З",
		zcy: "з",
		Zdot: "Ż",
		zdot: "ż",
		zeetrf: "ℨ",
		ZeroWidthSpace: "​",
		Zeta: "Ζ",
		zeta: "ζ",
		Zfr: "ℨ",
		zfr: "𝔷",
		ZHcy: "Ж",
		zhcy: "ж",
		zigrarr: "⇝",
		Zopf: "ℤ",
		zopf: "𝕫",
		Zscr: "𝒵",
		zscr: "𝓏",
		zwj: "‍",
		zwnj: "‌"
	}), e.entityMap = e.HTML_ENTITIES;
})), vv = /* @__PURE__ */ o(((e) => {
	var t = pv(), n = hv(), r = mv(), i = t.isHTMLEscapableRawTextElement, a = t.isHTMLMimeType, o = t.isHTMLRawTextElement, s = t.hasOwn, c = t.NAMESPACE, l = r.ParseError, u = r.DOMException, d = 0, f = 1, p = 2, m = 3, h = 4, g = 5, _ = 6, v = 7;
	function y() {}
	y.prototype = { parse: function(e, t, n) {
		var r = this.domBuilder;
		r.startDocument(), E(t, t = Object.create(null)), x(e, t, n, r, this.errorHandler), r.endDocument();
	} };
	var b = /&#?\w+;?/g;
	function x(e, r, i, o, c) {
		var d = a(o.mimeType);
		e.indexOf(n.UNICODE_REPLACEMENT_CHARACTER) >= 0 && c.warning("Unicode replacement character detected, source encoding issues?");
		function f(e) {
			if (e > 65535) {
				e -= 65536;
				var t = 55296 + (e >> 10), n = 56320 + (e & 1023);
				return String.fromCharCode(t, n);
			} else return String.fromCharCode(e);
		}
		function p(e) {
			var t = e[e.length - 1] === ";" ? e : e + ";";
			if (!d && t !== e) return c.error("EntityRef: expecting ;"), e;
			var r = n.Reference.exec(t);
			if (!r || r[0].length !== t.length) return c.error("entity not matching Reference production: " + e), e;
			var a = t.slice(1, -1);
			return s(i, a) ? i[a] : a.charAt(0) === "#" ? f(parseInt(a.substring(1).replace("x", "0x"))) : (c.error("entity not found:" + e), e);
		}
		function m(t) {
			if (t > D) {
				var n = e.substring(D, t).replace(b, p);
				v && y(D), o.characters(n, 0, t - D), D = t;
			}
		}
		var h = 0, g = 0, _ = /\r\n?|\n|$/g, v = o.locator;
		function y(t, n) {
			for (; t >= g && (n = _.exec(e));) h = g, g = n.index + n[0].length, v.lineNumber++;
			v.columnNumber = t - h + 1;
		}
		for (var x = [{ currentNSMap: r }], E = [], D = 0;;) {
			try {
				var O = e.indexOf("<", D);
				if (O < 0) {
					if (!d && E.length > 0) return c.fatalError("unclosed xml tag(s): " + E.join(", "));
					if (!e.substring(D).match(/^\s*$/)) {
						var M = o.doc, N = M.createTextNode(e.substring(D));
						if (M.documentElement) return c.error("Extra content at the end of the document");
						M.appendChild(N), o.currentElement = N;
					}
					return;
				}
				if (O > D) {
					var P = e.substring(D, O);
					!d && E.length === 0 && (P = P.replace(new RegExp(n.S_OPT.source, "g"), ""), P && c.error("Unexpected content outside root element: '" + P + "'")), m(O);
				}
				switch (e.charAt(O + 1)) {
					case "/":
						var F = e.indexOf(">", O + 2), I = e.substring(O + 2, F > 0 ? F : void 0);
						if (!I) return c.fatalError("end tag name missing");
						var L = F > 0 && n.reg("^", n.QName_group, n.S_OPT, "$").exec(I);
						if (!L) return c.fatalError("end tag name contains invalid characters: \"" + I + "\"");
						if (!o.currentElement && !o.doc.documentElement) return;
						var R = E[E.length - 1] || o.currentElement.tagName || o.doc.documentElement.tagName || "";
						if (R !== L[1]) {
							var z = L[1].toLowerCase();
							if (!d || R.toLowerCase() !== z) return c.fatalError("Opening and ending tag mismatch: \"" + R + "\" != \"" + I + "\"");
						}
						var B = x.pop();
						E.pop();
						var V = B.localNSMap;
						if (o.endElement(B.uri, B.localName, R), V) for (var H in V) s(V, H) && o.endPrefixMapping(H);
						F++;
						break;
					case "?":
						v && y(O), F = A(e, O, o, c);
						break;
					case "!":
						v && y(O), F = k(e, O, o, c, d);
						break;
					default:
						v && y(O);
						var U = new j(), W = x[x.length - 1].currentNSMap, F = C(e, O, U, W, p, c, d), ee = U.length;
						if (U.closed || (d && t.isHTMLVoidElement(U.tagName) ? U.closed = !0 : E.push(U.tagName)), v && ee) {
							for (var te = S(v, {}), ne = 0; ne < ee; ne++) {
								var re = U[ne];
								y(re.offset), re.locator = S(v, {});
							}
							o.locator = te, w(U, o, W) && x.push(U), o.locator = v;
						} else w(U, o, W) && x.push(U);
						d && !U.closed ? F = T(e, F, U.tagName, p, o) : F++;
				}
			} catch (e) {
				if (e instanceof l) throw e;
				if (e instanceof u) throw new l(e.name + ": " + e.message, o.locator, e);
				c.error("element parse error: " + e), F = -1;
			}
			F > D ? D = F : m(Math.max(O, D) + 1);
		}
	}
	function S(e, t) {
		return t.lineNumber = e.lineNumber, t.columnNumber = e.columnNumber, t;
	}
	function C(e, t, n, r, i, a, o) {
		function c(e, t, r) {
			if (s(n.attributeNames, e)) return a.fatalError("Attribute " + e + " redefined");
			if (!o && t.indexOf("<") >= 0) return a.fatalError("Unescaped '<' not allowed in attributes values");
			n.addValue(e, t.replace(/[\t\n\r]/g, " ").replace(b, i), r);
		}
		for (var l, u, y = ++t, x = d;;) {
			var S = e.charAt(y);
			switch (S) {
				case "=":
					if (x === f) l = e.slice(t, y), x = m;
					else if (x === p) x = m;
					else throw Error("attribute equal must after attrName");
					break;
				case "'":
				case "\"":
					if (x === m || x === f) if (x === f && (a.warning("attribute value must after \"=\""), l = e.slice(t, y)), t = y + 1, y = e.indexOf(S, t), y > 0) u = e.slice(t, y), c(l, u, t - 1), x = g;
					else throw Error("attribute value no end '" + S + "' match");
					else if (x == h) u = e.slice(t, y), c(l, u, t), a.warning("attribute \"" + l + "\" missed start quot(" + S + ")!!"), t = y + 1, x = g;
					else throw Error("attribute value must after \"=\"");
					break;
				case "/":
					switch (x) {
						case d: n.setTagName(e.slice(t, y));
						case g:
						case _:
						case v: x = v, n.closed = !0;
						case h:
						case f: break;
						case p:
							n.closed = !0;
							break;
						default: throw Error("attribute invalid close char('/')");
					}
					break;
				case "": return a.error("unexpected end of input"), x == d && n.setTagName(e.slice(t, y)), y;
				case ">":
					switch (x) {
						case d: n.setTagName(e.slice(t, y));
						case g:
						case _:
						case v: break;
						case h:
						case f: u = e.slice(t, y), u.slice(-1) === "/" && (n.closed = !0, u = u.slice(0, -1));
						case p:
							x === p && (u = l), x == h ? (a.warning("attribute \"" + u + "\" missed quot(\")!"), c(l, u, t)) : (o || a.warning("attribute \"" + u + "\" missed value!! \"" + u + "\" instead!!"), c(u, u, t));
							break;
						case m: if (!o) return a.fatalError("AttValue: ' or \" expected");
					}
					return y;
				case "": S = " ";
				default: if (S <= " ") switch (x) {
					case d:
						n.setTagName(e.slice(t, y)), x = _;
						break;
					case f:
						l = e.slice(t, y), x = p;
						break;
					case h:
						var u = e.slice(t, y);
						a.warning("attribute \"" + u + "\" missed quot(\")!!"), c(l, u, t);
					case g:
						x = _;
						break;
				}
				else switch (x) {
					case p:
						o || a.warning("attribute \"" + l + "\" missed value!! \"" + l + "\" instead2!!"), c(l, l, t), t = y, x = f;
						break;
					case g: a.warning("attribute space is required\"" + l + "\"!!");
					case _:
						x = f, t = y;
						break;
					case m:
						x = h, t = y;
						break;
					case v: throw Error("elements closed character '/' and '>' must be connected to");
				}
			}
			y++;
		}
	}
	function w(e, t, n) {
		for (var r = e.tagName, i = null, a = e.length; a--;) {
			var o = e[a], l = o.qName, u = o.value, d = l.indexOf(":");
			if (d > 0) var f = o.prefix = l.slice(0, d), p = l.slice(d + 1), m = f === "xmlns" && p;
			else p = l, f = null, m = l === "xmlns" && "";
			o.localName = p, m !== !1 && (i == null && (i = Object.create(null), E(n, n = Object.create(null))), n[m] = i[m] = u, o.uri = c.XMLNS, t.startPrefixMapping(m, u));
		}
		for (var a = e.length; a--;) o = e[a], o.prefix && (o.prefix === "xml" && (o.uri = c.XML), o.prefix !== "xmlns" && (o.uri = n[o.prefix]));
		var d = r.indexOf(":");
		d > 0 ? (f = e.prefix = r.slice(0, d), p = e.localName = r.slice(d + 1)) : (f = null, p = e.localName = r);
		var h = e.uri = n[f || ""];
		if (t.startElement(h, p, r, e), e.closed) {
			if (t.endElement(h, p, r), i) for (f in i) s(i, f) && t.endPrefixMapping(f);
		} else return e.currentNSMap = n, e.localNSMap = i, !0;
	}
	function T(e, t, n, r, a) {
		var s = i(n);
		if (s || o(n)) {
			var c = e.indexOf("</" + n + ">", t), l = e.substring(t + 1, c);
			return s && (l = l.replace(b, r)), a.characters(l, 0, l.length), c;
		}
		return t + 1;
	}
	function E(e, t) {
		for (var n in e) s(e, n) && (t[n] = e[n]);
	}
	function D(e, t) {
		var r = t;
		function i(t) {
			return t = t || 0, e.charAt(r + t);
		}
		function a(e) {
			e = e || 1, r += e;
		}
		function o() {
			for (var t = 0; r < e.length;) {
				var n = i();
				if (n !== " " && n !== "\n" && n !== "	" && n !== "\r") return t;
				t++, a();
			}
			return -1;
		}
		function s() {
			return e.substring(r);
		}
		function c(t) {
			return e.substring(r, r + t.length) === t;
		}
		function l(t) {
			return e.substring(r, r + t.length).toUpperCase() === t.toUpperCase();
		}
		function u(e) {
			var t = n.reg("^", e).exec(s());
			return t ? (a(t[0].length), t[0]) : null;
		}
		return {
			char: i,
			getIndex: function() {
				return r;
			},
			getMatch: u,
			getSource: function() {
				return e;
			},
			skip: a,
			skipBlanks: o,
			substringFromIndex: s,
			substringStartsWith: c,
			substringStartsWithCaseInsensitive: l
		};
	}
	function O(e, t) {
		function r(e, t) {
			var r = n.PI.exec(e.substringFromIndex());
			return r ? r[1].toLowerCase() === "xml" ? t.fatalError("xml declaration is only allowed at the start of the document, but found at position " + e.getIndex()) : (e.skip(r[0].length), r[0]) : t.fatalError("processing instruction is not well-formed at position " + e.getIndex());
		}
		var i = e.getSource();
		if (e.char() === "[") {
			e.skip(1);
			for (var a = e.getIndex(); e.getIndex() < i.length;) {
				if (e.skipBlanks(), e.char() === "]") {
					var o = i.substring(a, e.getIndex());
					return e.skip(1), o;
				}
				var s = null;
				if (e.char() === "<" && e.char(1) === "!") switch (e.char(2)) {
					case "E":
						e.char(3) === "L" ? s = e.getMatch(n.elementdecl) : e.char(3) === "N" && (s = e.getMatch(n.EntityDecl));
						break;
					case "A":
						s = e.getMatch(n.AttlistDecl);
						break;
					case "N":
						s = e.getMatch(n.NotationDecl);
						break;
					case "-":
						s = e.getMatch(n.Comment);
						break;
				}
				else if (e.char() === "<" && e.char(1) === "?") s = r(e, t);
				else if (e.char() === "%") s = e.getMatch(n.PEReference);
				else return t.fatalError("Error detected in Markup declaration");
				if (!s) return t.fatalError("Error in internal subset at position " + e.getIndex());
			}
			return t.fatalError("doctype internal subset is not well-formed, missing ]");
		}
	}
	function k(e, t, r, i, a) {
		var o = D(e, t);
		switch (a ? o.char(2).toUpperCase() : o.char(2)) {
			case "-":
				var s = o.getMatch(n.Comment);
				return s ? (r.comment(s, n.COMMENT_START.length, s.length - n.COMMENT_START.length - n.COMMENT_END.length), o.getIndex()) : i.fatalError("comment is not well-formed at position " + o.getIndex());
			case "[":
				var c = o.getMatch(n.CDSect);
				return c ? !a && !r.currentElement ? i.fatalError("CDATA outside of element") : (r.startCDATA(), r.characters(c, n.CDATA_START.length, c.length - n.CDATA_START.length - n.CDATA_END.length), r.endCDATA(), o.getIndex()) : i.fatalError("Invalid CDATA starting at position " + t);
			case "D":
				if (r.doc && r.doc.documentElement) return i.fatalError("Doctype not allowed inside or after documentElement at position " + o.getIndex());
				if (a ? !o.substringStartsWithCaseInsensitive(n.DOCTYPE_DECL_START) : !o.substringStartsWith(n.DOCTYPE_DECL_START)) return i.fatalError("Expected " + n.DOCTYPE_DECL_START + " at position " + o.getIndex());
				if (o.skip(n.DOCTYPE_DECL_START.length), o.skipBlanks() < 1) return i.fatalError("Expected whitespace after " + n.DOCTYPE_DECL_START + " at position " + o.getIndex());
				var l = {
					name: void 0,
					publicId: void 0,
					systemId: void 0,
					internalSubset: void 0
				};
				if (l.name = o.getMatch(n.Name), !l.name) return i.fatalError("doctype name missing or contains unexpected characters at position " + o.getIndex());
				if (a && l.name.toLowerCase() !== "html" && i.warning("Unexpected DOCTYPE in HTML document at position " + o.getIndex()), o.skipBlanks(), o.substringStartsWith(n.PUBLIC) || o.substringStartsWith(n.SYSTEM)) {
					var u = n.ExternalID_match.exec(o.substringFromIndex());
					if (!u) return i.fatalError("doctype external id is not well-formed at position " + o.getIndex());
					u.groups.SystemLiteralOnly === void 0 ? (l.systemId = u.groups.SystemLiteral, l.publicId = u.groups.PubidLiteral) : l.systemId = u.groups.SystemLiteralOnly, o.skip(u[0].length);
				} else if (a && o.substringStartsWithCaseInsensitive(n.SYSTEM)) {
					if (o.skip(n.SYSTEM.length), o.skipBlanks() < 1) return i.fatalError("Expected whitespace after " + n.SYSTEM + " at position " + o.getIndex());
					if (l.systemId = o.getMatch(n.ABOUT_LEGACY_COMPAT_SystemLiteral), !l.systemId) return i.fatalError("Expected " + n.ABOUT_LEGACY_COMPAT + " in single or double quotes after " + n.SYSTEM + " at position " + o.getIndex());
				}
				return a && l.systemId && !n.ABOUT_LEGACY_COMPAT_SystemLiteral.test(l.systemId) && i.warning("Unexpected doctype.systemId in HTML document at position " + o.getIndex()), a || (o.skipBlanks(), l.internalSubset = O(o, i)), o.skipBlanks(), o.char() === ">" ? (o.skip(1), r.startDTD(l.name, l.publicId, l.systemId, l.internalSubset), r.endDTD(), o.getIndex()) : i.fatalError("doctype not terminated with > at position " + o.getIndex());
			default: return i.fatalError("Not well-formed XML starting with \"<!\" at position " + t);
		}
	}
	function A(e, t, r, i) {
		var a = e.substring(t).match(n.PI);
		if (!a) return i.fatalError("Invalid processing instruction starting at position " + t);
		if (a[1].toLowerCase() === "xml") {
			if (t > 0) return i.fatalError("processing instruction at position " + t + " is an xml declaration which is only at the start of the document");
			if (!n.XMLDecl.test(e.substring(t))) return i.fatalError("xml declaration is not well-formed");
		}
		return r.processingInstruction(a[1], a[2]), t + a[0].length;
	}
	function j() {
		this.attributeNames = Object.create(null);
	}
	j.prototype = {
		setTagName: function(e) {
			if (!n.QName_exact.test(e)) throw Error("invalid tagName:" + e);
			this.tagName = e;
		},
		addValue: function(e, t, r) {
			if (!n.QName_exact.test(e)) throw Error("invalid attribute:" + e);
			this.attributeNames[e] = this.length, this[this.length++] = {
				qName: e,
				value: t,
				offset: r
			};
		},
		length: 0,
		getLocalName: function(e) {
			return this[e].localName;
		},
		getLocator: function(e) {
			return this[e].locator;
		},
		getQName: function(e) {
			return this[e].qName;
		},
		getURI: function(e) {
			return this[e].uri;
		},
		getValue: function(e) {
			return this[e].value;
		}
	}, e.XMLReader = y, e.parseUtils = D, e.parseDoctypeCommentOrCData = k;
})), yv = /* @__PURE__ */ o(((e) => {
	var t = pv(), n = gv(), r = mv(), i = _v(), a = vv(), o = n.DOMImplementation, s = t.hasDefaultHTMLNamespace, c = t.isHTMLMimeType, l = t.isValidMimeType, u = t.MIME_TYPE, d = t.NAMESPACE, f = r.ParseError, p = a.XMLReader;
	function m(e) {
		return e.replace(/\r[\n\u0085]/g, "\n").replace(/[\r\u0085\u2028\u2029]/g, "\n");
	}
	function h(e) {
		if (e = e || {}, e.locator === void 0 && (e.locator = !0), this.assign = e.assign || t.assign, this.domHandler = e.domHandler || g, this.onError = e.onError || e.errorHandler, e.errorHandler && typeof e.errorHandler != "function") throw TypeError("errorHandler object is no longer supported, switch to onError!");
		e.errorHandler && e.errorHandler("warning", "The `errorHandler` option has been deprecated, use `onError` instead!", this), this.normalizeLineEndings = e.normalizeLineEndings || m, this.locator = !!e.locator, this.xmlns = this.assign(Object.create(null), e.xmlns);
	}
	h.prototype.parseFromString = function(e, n) {
		if (!l(n)) throw TypeError("DOMParser.parseFromString: the provided mimeType \"" + n + "\" is not valid.");
		var r = this.assign(Object.create(null), this.xmlns), a = i.XML_ENTITIES, o = r[""] || null;
		s(n) ? (a = i.HTML_ENTITIES, o = d.HTML) : n === u.XML_SVG_IMAGE && (o = d.SVG), r[""] = o, r.xml = r.xml || d.XML;
		var c = new this.domHandler({
			mimeType: n,
			defaultNamespace: o,
			onError: this.onError
		}), f = this.locator ? {} : void 0;
		this.locator && c.setDocumentLocator(f);
		var m = new p();
		return m.errorHandler = c, m.domBuilder = c, !t.isHTMLMimeType(n) && typeof e != "string" && m.errorHandler.fatalError("source is not a string"), m.parse(this.normalizeLineEndings(String(e)), r, a), c.doc.documentElement || m.errorHandler.fatalError("missing root element"), c.doc;
	};
	function g(e) {
		var t = e || {};
		this.mimeType = t.mimeType || u.XML_APPLICATION, this.defaultNamespace = t.defaultNamespace || null, this.cdata = !1, this.currentElement = void 0, this.doc = void 0, this.locator = void 0, this.onError = t.onError;
	}
	function _(e, t) {
		t.lineNumber = e.lineNumber, t.columnNumber = e.columnNumber;
	}
	g.prototype = {
		startDocument: function() {
			var e = new o();
			this.doc = c(this.mimeType) ? e.createHTMLDocument(!1) : e.createDocument(this.defaultNamespace, "");
		},
		startElement: function(e, t, n, r) {
			var i = this.doc, a = i.createElementNS(e, n || t), o = r.length;
			b(this, a), this.currentElement = a, this.locator && _(this.locator, a);
			for (var s = 0; s < o; s++) {
				var e = r.getURI(s), c = r.getValue(s), n = r.getQName(s), l = i.createAttributeNS(e, n);
				this.locator && _(r.getLocator(s), l), l.value = l.nodeValue = c, a.setAttributeNode(l);
			}
		},
		endElement: function(e, t, n) {
			this.currentElement = this.currentElement.parentNode;
		},
		startPrefixMapping: function(e, t) {},
		endPrefixMapping: function(e) {},
		processingInstruction: function(e, t) {
			var n = this.doc.createProcessingInstruction(e, t);
			this.locator && _(this.locator, n), b(this, n);
		},
		ignorableWhitespace: function(e, t, n) {},
		characters: function(e, t, n) {
			if (e = y.apply(this, arguments), e) {
				if (this.cdata) var r = this.doc.createCDATASection(e);
				else var r = this.doc.createTextNode(e);
				this.currentElement ? this.currentElement.appendChild(r) : /^\s*$/.test(e) && this.doc.appendChild(r), this.locator && _(this.locator, r);
			}
		},
		skippedEntity: function(e) {},
		endDocument: function() {
			this.doc.normalize();
		},
		setDocumentLocator: function(e) {
			e && (e.lineNumber = 0), this.locator = e;
		},
		comment: function(e, t, n) {
			e = y.apply(this, arguments);
			var r = this.doc.createComment(e);
			this.locator && _(this.locator, r), b(this, r);
		},
		startCDATA: function() {
			this.cdata = !0;
		},
		endCDATA: function() {
			this.cdata = !1;
		},
		startDTD: function(e, t, n, r) {
			var i = this.doc.implementation;
			if (i && i.createDocumentType) {
				var a = i.createDocumentType(e, t, n, r);
				this.locator && _(this.locator, a), b(this, a), this.doc.doctype = a;
			}
		},
		reportError: function(e, t) {
			if (typeof this.onError == "function") try {
				this.onError(e, t, this);
			} catch (n) {
				throw new f("Reporting " + e + " \"" + t + "\" caused " + n, this.locator);
			}
			else console.error("[xmldom " + e + "]	" + t, v(this.locator));
		},
		warning: function(e) {
			this.reportError("warning", e);
		},
		error: function(e) {
			this.reportError("error", e);
		},
		fatalError: function(e) {
			throw this.reportError("fatalError", e), new f(e, this.locator);
		}
	};
	function v(e) {
		if (e) return "\n@#[line:" + e.lineNumber + ",col:" + e.columnNumber + "]";
	}
	function y(e, t, n) {
		return typeof e == "string" ? e.substr(t, n) : e.length >= t + n || t ? new java.lang.String(e, t, n) + "" : e;
	}
	"endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(/\w+/g, function(e) {
		g.prototype[e] = function() {
			return null;
		};
	});
	function b(e, t) {
		e.currentElement ? e.currentElement.appendChild(t) : e.doc.appendChild(t);
	}
	function x(e) {
		if (e === "error") throw "onErrorStopParsing";
	}
	function S() {
		throw "onWarningStopParsing";
	}
	e.__DOMHandler = g, e.DOMParser = h, e.normalizeLineEndings = m, e.onErrorStopParsing = x, e.onWarningStopParsing = S;
})), bv = /* @__PURE__ */ o(((e) => {
	var t = pv();
	e.assign = t.assign, e.hasDefaultHTMLNamespace = t.hasDefaultHTMLNamespace, e.isHTMLMimeType = t.isHTMLMimeType, e.isValidMimeType = t.isValidMimeType, e.MIME_TYPE = t.MIME_TYPE, e.NAMESPACE = t.NAMESPACE;
	var n = mv();
	e.DOMException = n.DOMException, e.DOMExceptionName = n.DOMExceptionName, e.ExceptionCode = n.ExceptionCode, e.ParseError = n.ParseError;
	var r = gv();
	e.Attr = r.Attr, e.CDATASection = r.CDATASection, e.CharacterData = r.CharacterData, e.Comment = r.Comment, e.Document = r.Document, e.DocumentFragment = r.DocumentFragment, e.DocumentType = r.DocumentType, e.DOMImplementation = r.DOMImplementation, e.Element = r.Element, e.Entity = r.Entity, e.EntityReference = r.EntityReference, e.LiveNodeList = r.LiveNodeList, e.NamedNodeMap = r.NamedNodeMap, e.Node = r.Node, e.NodeList = r.NodeList, e.Notation = r.Notation, e.ProcessingInstruction = r.ProcessingInstruction, e.Text = r.Text, e.XMLSerializer = r.XMLSerializer;
	var i = yv();
	e.DOMParser = i.DOMParser, e.normalizeLineEndings = i.normalizeLineEndings, e.onErrorStopParsing = i.onErrorStopParsing, e.onWarningStopParsing = i.onWarningStopParsing;
})), xv = /* @__PURE__ */ o(((e, t) => {
	(function(n) {
		typeof e == "object" && t !== void 0 ? t.exports = n() : typeof define == "function" && define.amd ? define([], n) : (typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : this).JSZip = n();
	})(function() {
		return function e(t, n, r) {
			function i(o, s) {
				if (!n[o]) {
					if (!t[o]) {
						var c = typeof l == "function" && l;
						if (!s && c) return c(o, !0);
						if (a) return a(o, !0);
						var u = /* @__PURE__ */ Error("Cannot find module '" + o + "'");
						throw u.code = "MODULE_NOT_FOUND", u;
					}
					var d = n[o] = { exports: {} };
					t[o][0].call(d.exports, function(e) {
						var n = t[o][1][e];
						return i(n || e);
					}, d, d.exports, e, t, n, r);
				}
				return n[o].exports;
			}
			for (var a = typeof l == "function" && l, o = 0; o < r.length; o++) i(r[o]);
			return i;
		}({
			1: [function(e, t, n) {
				var r = e("./utils"), i = e("./support"), a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
				n.encode = function(e) {
					for (var t, n, i, o, s, c, l, u = [], d = 0, f = e.length, p = f, m = r.getTypeOf(e) !== "string"; d < e.length;) p = f - d, i = m ? (t = e[d++], n = d < f ? e[d++] : 0, d < f ? e[d++] : 0) : (t = e.charCodeAt(d++), n = d < f ? e.charCodeAt(d++) : 0, d < f ? e.charCodeAt(d++) : 0), o = t >> 2, s = (3 & t) << 4 | n >> 4, c = 1 < p ? (15 & n) << 2 | i >> 6 : 64, l = 2 < p ? 63 & i : 64, u.push(a.charAt(o) + a.charAt(s) + a.charAt(c) + a.charAt(l));
					return u.join("");
				}, n.decode = function(e) {
					var t, n, r, o, s, c, l = 0, u = 0, d = "data:";
					if (e.substr(0, d.length) === d) throw Error("Invalid base64 input, it looks like a data url.");
					var f, p = 3 * (e = e.replace(/[^A-Za-z0-9+/=]/g, "")).length / 4;
					if (e.charAt(e.length - 1) === a.charAt(64) && p--, e.charAt(e.length - 2) === a.charAt(64) && p--, p % 1 != 0) throw Error("Invalid base64 input, bad content length.");
					for (f = i.uint8array ? new Uint8Array(0 | p) : Array(0 | p); l < e.length;) t = a.indexOf(e.charAt(l++)) << 2 | (o = a.indexOf(e.charAt(l++))) >> 4, n = (15 & o) << 4 | (s = a.indexOf(e.charAt(l++))) >> 2, r = (3 & s) << 6 | (c = a.indexOf(e.charAt(l++))), f[u++] = t, s !== 64 && (f[u++] = n), c !== 64 && (f[u++] = r);
					return f;
				};
			}, {
				"./support": 30,
				"./utils": 32
			}],
			2: [function(e, t, n) {
				var r = e("./external"), i = e("./stream/DataWorker"), a = e("./stream/Crc32Probe"), o = e("./stream/DataLengthProbe");
				function s(e, t, n, r, i) {
					this.compressedSize = e, this.uncompressedSize = t, this.crc32 = n, this.compression = r, this.compressedContent = i;
				}
				s.prototype = {
					getContentWorker: function() {
						var e = new i(r.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new o("data_length")), t = this;
						return e.on("end", function() {
							if (this.streamInfo.data_length !== t.uncompressedSize) throw Error("Bug : uncompressed data size mismatch");
						}), e;
					},
					getCompressedWorker: function() {
						return new i(r.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
					}
				}, s.createWorkerFrom = function(e, t, n) {
					return e.pipe(new a()).pipe(new o("uncompressedSize")).pipe(t.compressWorker(n)).pipe(new o("compressedSize")).withStreamInfo("compression", t);
				}, t.exports = s;
			}, {
				"./external": 6,
				"./stream/Crc32Probe": 25,
				"./stream/DataLengthProbe": 26,
				"./stream/DataWorker": 27
			}],
			3: [function(e, t, n) {
				var r = e("./stream/GenericWorker");
				n.STORE = {
					magic: "\0\0",
					compressWorker: function() {
						return new r("STORE compression");
					},
					uncompressWorker: function() {
						return new r("STORE decompression");
					}
				}, n.DEFLATE = e("./flate");
			}, {
				"./flate": 7,
				"./stream/GenericWorker": 28
			}],
			4: [function(e, t, n) {
				var r = e("./utils"), i = function() {
					for (var e, t = [], n = 0; n < 256; n++) {
						e = n;
						for (var r = 0; r < 8; r++) e = 1 & e ? 3988292384 ^ e >>> 1 : e >>> 1;
						t[n] = e;
					}
					return t;
				}();
				t.exports = function(e, t) {
					return e !== void 0 && e.length ? r.getTypeOf(e) === "string" ? function(e, t, n, r) {
						var a = i, o = r + n;
						e ^= -1;
						for (var s = r; s < o; s++) e = e >>> 8 ^ a[255 & (e ^ t.charCodeAt(s))];
						return -1 ^ e;
					}(0 | t, e, e.length, 0) : function(e, t, n, r) {
						var a = i, o = r + n;
						e ^= -1;
						for (var s = r; s < o; s++) e = e >>> 8 ^ a[255 & (e ^ t[s])];
						return -1 ^ e;
					}(0 | t, e, e.length, 0) : 0;
				};
			}, { "./utils": 32 }],
			5: [function(e, t, n) {
				n.base64 = !1, n.binary = !1, n.dir = !1, n.createFolders = !0, n.date = null, n.compression = null, n.compressionOptions = null, n.comment = null, n.unixPermissions = null, n.dosPermissions = null;
			}, {}],
			6: [function(e, t, n) {
				var r = null;
				r = typeof Promise < "u" ? Promise : e("lie"), t.exports = { Promise: r };
			}, { lie: 37 }],
			7: [function(e, t, n) {
				var r = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Uint32Array < "u", i = e("pako"), a = e("./utils"), o = e("./stream/GenericWorker"), s = r ? "uint8array" : "array";
				function c(e, t) {
					o.call(this, "FlateWorker/" + e), this._pako = null, this._pakoAction = e, this._pakoOptions = t, this.meta = {};
				}
				n.magic = "\b\0", a.inherits(c, o), c.prototype.processChunk = function(e) {
					this.meta = e.meta, this._pako === null && this._createPako(), this._pako.push(a.transformTo(s, e.data), !1);
				}, c.prototype.flush = function() {
					o.prototype.flush.call(this), this._pako === null && this._createPako(), this._pako.push([], !0);
				}, c.prototype.cleanUp = function() {
					o.prototype.cleanUp.call(this), this._pako = null;
				}, c.prototype._createPako = function() {
					this._pako = new i[this._pakoAction]({
						raw: !0,
						level: this._pakoOptions.level || -1
					});
					var e = this;
					this._pako.onData = function(t) {
						e.push({
							data: t,
							meta: e.meta
						});
					};
				}, n.compressWorker = function(e) {
					return new c("Deflate", e);
				}, n.uncompressWorker = function() {
					return new c("Inflate", {});
				};
			}, {
				"./stream/GenericWorker": 28,
				"./utils": 32,
				pako: 38
			}],
			8: [function(e, t, n) {
				function r(e, t) {
					var n, r = "";
					for (n = 0; n < t; n++) r += String.fromCharCode(255 & e), e >>>= 8;
					return r;
				}
				function i(e, t, n, i, o, u) {
					var d, f, p = e.file, m = e.compression, h = u !== s.utf8encode, g = a.transformTo("string", u(p.name)), _ = a.transformTo("string", s.utf8encode(p.name)), v = p.comment, y = a.transformTo("string", u(v)), b = a.transformTo("string", s.utf8encode(v)), x = _.length !== p.name.length, S = b.length !== v.length, C = "", w = "", T = "", E = p.dir, D = p.date, O = {
						crc32: 0,
						compressedSize: 0,
						uncompressedSize: 0
					};
					t && !n || (O.crc32 = e.crc32, O.compressedSize = e.compressedSize, O.uncompressedSize = e.uncompressedSize);
					var k = 0;
					t && (k |= 8), h || !x && !S || (k |= 2048);
					var A = 0, j = 0;
					E && (A |= 16), o === "UNIX" ? (j = 798, A |= function(e, t) {
						var n = e;
						return e || (n = t ? 16893 : 33204), (65535 & n) << 16;
					}(p.unixPermissions, E)) : (j = 20, A |= function(e) {
						return 63 & (e || 0);
					}(p.dosPermissions)), d = D.getUTCHours(), d <<= 6, d |= D.getUTCMinutes(), d <<= 5, d |= D.getUTCSeconds() / 2, f = D.getUTCFullYear() - 1980, f <<= 4, f |= D.getUTCMonth() + 1, f <<= 5, f |= D.getUTCDate(), x && (w = r(1, 1) + r(c(g), 4) + _, C += "up" + r(w.length, 2) + w), S && (T = r(1, 1) + r(c(y), 4) + b, C += "uc" + r(T.length, 2) + T);
					var M = "";
					return M += "\n\0", M += r(k, 2), M += m.magic, M += r(d, 2), M += r(f, 2), M += r(O.crc32, 4), M += r(O.compressedSize, 4), M += r(O.uncompressedSize, 4), M += r(g.length, 2), M += r(C.length, 2), {
						fileRecord: l.LOCAL_FILE_HEADER + M + g + C,
						dirRecord: l.CENTRAL_FILE_HEADER + r(j, 2) + M + r(y.length, 2) + "\0\0\0\0" + r(A, 4) + r(i, 4) + g + C + y
					};
				}
				var a = e("../utils"), o = e("../stream/GenericWorker"), s = e("../utf8"), c = e("../crc32"), l = e("../signature");
				function u(e, t, n, r) {
					o.call(this, "ZipFileWorker"), this.bytesWritten = 0, this.zipComment = t, this.zipPlatform = n, this.encodeFileName = r, this.streamFiles = e, this.accumulate = !1, this.contentBuffer = [], this.dirRecords = [], this.currentSourceOffset = 0, this.entriesCount = 0, this.currentFile = null, this._sources = [];
				}
				a.inherits(u, o), u.prototype.push = function(e) {
					var t = e.meta.percent || 0, n = this.entriesCount, r = this._sources.length;
					this.accumulate ? this.contentBuffer.push(e) : (this.bytesWritten += e.data.length, o.prototype.push.call(this, {
						data: e.data,
						meta: {
							currentFile: this.currentFile,
							percent: n ? (t + 100 * (n - r - 1)) / n : 100
						}
					}));
				}, u.prototype.openedSource = function(e) {
					this.currentSourceOffset = this.bytesWritten, this.currentFile = e.file.name;
					var t = this.streamFiles && !e.file.dir;
					if (t) {
						var n = i(e, t, !1, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
						this.push({
							data: n.fileRecord,
							meta: { percent: 0 }
						});
					} else this.accumulate = !0;
				}, u.prototype.closedSource = function(e) {
					this.accumulate = !1;
					var t = this.streamFiles && !e.file.dir, n = i(e, t, !0, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
					if (this.dirRecords.push(n.dirRecord), t) this.push({
						data: function(e) {
							return l.DATA_DESCRIPTOR + r(e.crc32, 4) + r(e.compressedSize, 4) + r(e.uncompressedSize, 4);
						}(e),
						meta: { percent: 100 }
					});
					else for (this.push({
						data: n.fileRecord,
						meta: { percent: 0 }
					}); this.contentBuffer.length;) this.push(this.contentBuffer.shift());
					this.currentFile = null;
				}, u.prototype.flush = function() {
					for (var e = this.bytesWritten, t = 0; t < this.dirRecords.length; t++) this.push({
						data: this.dirRecords[t],
						meta: { percent: 100 }
					});
					var n = this.bytesWritten - e, i = function(e, t, n, i, o) {
						var s = a.transformTo("string", o(i));
						return l.CENTRAL_DIRECTORY_END + "\0\0\0\0" + r(e, 2) + r(e, 2) + r(t, 4) + r(n, 4) + r(s.length, 2) + s;
					}(this.dirRecords.length, n, e, this.zipComment, this.encodeFileName);
					this.push({
						data: i,
						meta: { percent: 100 }
					});
				}, u.prototype.prepareNextSource = function() {
					this.previous = this._sources.shift(), this.openedSource(this.previous.streamInfo), this.isPaused ? this.previous.pause() : this.previous.resume();
				}, u.prototype.registerPrevious = function(e) {
					this._sources.push(e);
					var t = this;
					return e.on("data", function(e) {
						t.processChunk(e);
					}), e.on("end", function() {
						t.closedSource(t.previous.streamInfo), t._sources.length ? t.prepareNextSource() : t.end();
					}), e.on("error", function(e) {
						t.error(e);
					}), this;
				}, u.prototype.resume = function() {
					return !!o.prototype.resume.call(this) && (!this.previous && this._sources.length ? (this.prepareNextSource(), !0) : this.previous || this._sources.length || this.generatedError ? void 0 : (this.end(), !0));
				}, u.prototype.error = function(e) {
					var t = this._sources;
					if (!o.prototype.error.call(this, e)) return !1;
					for (var n = 0; n < t.length; n++) try {
						t[n].error(e);
					} catch {}
					return !0;
				}, u.prototype.lock = function() {
					o.prototype.lock.call(this);
					for (var e = this._sources, t = 0; t < e.length; t++) e[t].lock();
				}, t.exports = u;
			}, {
				"../crc32": 4,
				"../signature": 23,
				"../stream/GenericWorker": 28,
				"../utf8": 31,
				"../utils": 32
			}],
			9: [function(e, t, n) {
				var r = e("../compressions"), i = e("./ZipFileWorker");
				n.generateWorker = function(e, t, n) {
					var a = new i(t.streamFiles, n, t.platform, t.encodeFileName), o = 0;
					try {
						e.forEach(function(e, n) {
							o++;
							var i = function(e, t) {
								var n = e || t, i = r[n];
								if (!i) throw Error(n + " is not a valid compression method !");
								return i;
							}(n.options.compression, t.compression), s = n.options.compressionOptions || t.compressionOptions || {}, c = n.dir, l = n.date;
							n._compressWorker(i, s).withStreamInfo("file", {
								name: e,
								dir: c,
								date: l,
								comment: n.comment || "",
								unixPermissions: n.unixPermissions,
								dosPermissions: n.dosPermissions
							}).pipe(a);
						}), a.entriesCount = o;
					} catch (e) {
						a.error(e);
					}
					return a;
				};
			}, {
				"../compressions": 3,
				"./ZipFileWorker": 8
			}],
			10: [function(e, t, n) {
				function r() {
					if (!(this instanceof r)) return new r();
					if (arguments.length) throw Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
					this.files = Object.create(null), this.comment = null, this.root = "", this.clone = function() {
						var e = new r();
						for (var t in this) typeof this[t] != "function" && (e[t] = this[t]);
						return e;
					};
				}
				(r.prototype = e("./object")).loadAsync = e("./load"), r.support = e("./support"), r.defaults = e("./defaults"), r.version = "3.10.1", r.loadAsync = function(e, t) {
					return new r().loadAsync(e, t);
				}, r.external = e("./external"), t.exports = r;
			}, {
				"./defaults": 5,
				"./external": 6,
				"./load": 11,
				"./object": 15,
				"./support": 30
			}],
			11: [function(e, t, n) {
				var r = e("./utils"), i = e("./external"), a = e("./utf8"), o = e("./zipEntries"), s = e("./stream/Crc32Probe"), c = e("./nodejsUtils");
				function l(e) {
					return new i.Promise(function(t, n) {
						var r = e.decompressed.getContentWorker().pipe(new s());
						r.on("error", function(e) {
							n(e);
						}).on("end", function() {
							r.streamInfo.crc32 === e.decompressed.crc32 ? t() : n(/* @__PURE__ */ Error("Corrupted zip : CRC32 mismatch"));
						}).resume();
					});
				}
				t.exports = function(e, t) {
					var n = this;
					return t = r.extend(t || {}, {
						base64: !1,
						checkCRC32: !1,
						optimizedBinaryString: !1,
						createFolders: !1,
						decodeFileName: a.utf8decode
					}), c.isNode && c.isStream(e) ? i.Promise.reject(/* @__PURE__ */ Error("JSZip can't accept a stream when loading a zip file.")) : r.prepareContent("the loaded zip file", e, !0, t.optimizedBinaryString, t.base64).then(function(e) {
						var n = new o(t);
						return n.load(e), n;
					}).then(function(e) {
						var n = [i.Promise.resolve(e)], r = e.files;
						if (t.checkCRC32) for (var a = 0; a < r.length; a++) n.push(l(r[a]));
						return i.Promise.all(n);
					}).then(function(e) {
						for (var i = e.shift(), a = i.files, o = 0; o < a.length; o++) {
							var s = a[o], c = s.fileNameStr, l = r.resolve(s.fileNameStr);
							n.file(l, s.decompressed, {
								binary: !0,
								optimizedBinaryString: !0,
								date: s.date,
								dir: s.dir,
								comment: s.fileCommentStr.length ? s.fileCommentStr : null,
								unixPermissions: s.unixPermissions,
								dosPermissions: s.dosPermissions,
								createFolders: t.createFolders
							}), s.dir || (n.file(l).unsafeOriginalName = c);
						}
						return i.zipComment.length && (n.comment = i.zipComment), n;
					});
				};
			}, {
				"./external": 6,
				"./nodejsUtils": 14,
				"./stream/Crc32Probe": 25,
				"./utf8": 31,
				"./utils": 32,
				"./zipEntries": 33
			}],
			12: [function(e, t, n) {
				var r = e("../utils"), i = e("../stream/GenericWorker");
				function a(e, t) {
					i.call(this, "Nodejs stream input adapter for " + e), this._upstreamEnded = !1, this._bindStream(t);
				}
				r.inherits(a, i), a.prototype._bindStream = function(e) {
					var t = this;
					(this._stream = e).pause(), e.on("data", function(e) {
						t.push({
							data: e,
							meta: { percent: 0 }
						});
					}).on("error", function(e) {
						t.isPaused ? this.generatedError = e : t.error(e);
					}).on("end", function() {
						t.isPaused ? t._upstreamEnded = !0 : t.end();
					});
				}, a.prototype.pause = function() {
					return !!i.prototype.pause.call(this) && (this._stream.pause(), !0);
				}, a.prototype.resume = function() {
					return !!i.prototype.resume.call(this) && (this._upstreamEnded ? this.end() : this._stream.resume(), !0);
				}, t.exports = a;
			}, {
				"../stream/GenericWorker": 28,
				"../utils": 32
			}],
			13: [function(e, t, n) {
				var r = e("readable-stream").Readable;
				function i(e, t, n) {
					r.call(this, t), this._helper = e;
					var i = this;
					e.on("data", function(e, t) {
						i.push(e) || i._helper.pause(), n && n(t);
					}).on("error", function(e) {
						i.emit("error", e);
					}).on("end", function() {
						i.push(null);
					});
				}
				e("../utils").inherits(i, r), i.prototype._read = function() {
					this._helper.resume();
				}, t.exports = i;
			}, {
				"../utils": 32,
				"readable-stream": 16
			}],
			14: [function(e, t, n) {
				t.exports = {
					isNode: typeof Buffer < "u",
					newBufferFrom: function(e, t) {
						if (Buffer.from && Buffer.from !== Uint8Array.from) return Buffer.from(e, t);
						if (typeof e == "number") throw Error("The \"data\" argument must not be a number");
						return new Buffer(e, t);
					},
					allocBuffer: function(e) {
						if (Buffer.alloc) return Buffer.alloc(e);
						var t = new Buffer(e);
						return t.fill(0), t;
					},
					isBuffer: function(e) {
						return Buffer.isBuffer(e);
					},
					isStream: function(e) {
						return e && typeof e.on == "function" && typeof e.pause == "function" && typeof e.resume == "function";
					}
				};
			}, {}],
			15: [function(e, t, n) {
				function r(e, t, n) {
					var r, i = a.getTypeOf(t), s = a.extend(n || {}, c);
					s.date = s.date || /* @__PURE__ */ new Date(), s.compression !== null && (s.compression = s.compression.toUpperCase()), typeof s.unixPermissions == "string" && (s.unixPermissions = parseInt(s.unixPermissions, 8)), s.unixPermissions && 16384 & s.unixPermissions && (s.dir = !0), s.dosPermissions && 16 & s.dosPermissions && (s.dir = !0), s.dir && (e = h(e)), s.createFolders && (r = m(e)) && g.call(this, r, !0);
					var d = i === "string" && !1 === s.binary && !1 === s.base64;
					n && n.binary !== void 0 || (s.binary = !d), (t instanceof l && t.uncompressedSize === 0 || s.dir || !t || t.length === 0) && (s.base64 = !1, s.binary = !0, t = "", s.compression = "STORE", i = "string");
					var _ = null;
					_ = t instanceof l || t instanceof o ? t : f.isNode && f.isStream(t) ? new p(e, t) : a.prepareContent(e, t, s.binary, s.optimizedBinaryString, s.base64);
					var v = new u(e, _, s);
					this.files[e] = v;
				}
				var i = e("./utf8"), a = e("./utils"), o = e("./stream/GenericWorker"), s = e("./stream/StreamHelper"), c = e("./defaults"), l = e("./compressedObject"), u = e("./zipObject"), d = e("./generate"), f = e("./nodejsUtils"), p = e("./nodejs/NodejsStreamInputAdapter"), m = function(e) {
					e.slice(-1) === "/" && (e = e.substring(0, e.length - 1));
					var t = e.lastIndexOf("/");
					return 0 < t ? e.substring(0, t) : "";
				}, h = function(e) {
					return e.slice(-1) !== "/" && (e += "/"), e;
				}, g = function(e, t) {
					return t = t === void 0 ? c.createFolders : t, e = h(e), this.files[e] || r.call(this, e, null, {
						dir: !0,
						createFolders: t
					}), this.files[e];
				};
				function _(e) {
					return Object.prototype.toString.call(e) === "[object RegExp]";
				}
				t.exports = {
					load: function() {
						throw Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
					},
					forEach: function(e) {
						var t, n, r;
						for (t in this.files) r = this.files[t], (n = t.slice(this.root.length, t.length)) && t.slice(0, this.root.length) === this.root && e(n, r);
					},
					filter: function(e) {
						var t = [];
						return this.forEach(function(n, r) {
							e(n, r) && t.push(r);
						}), t;
					},
					file: function(e, t, n) {
						if (arguments.length !== 1) return e = this.root + e, r.call(this, e, t, n), this;
						if (_(e)) {
							var i = e;
							return this.filter(function(e, t) {
								return !t.dir && i.test(e);
							});
						}
						var a = this.files[this.root + e];
						return a && !a.dir ? a : null;
					},
					folder: function(e) {
						if (!e) return this;
						if (_(e)) return this.filter(function(t, n) {
							return n.dir && e.test(t);
						});
						var t = this.root + e, n = g.call(this, t), r = this.clone();
						return r.root = n.name, r;
					},
					remove: function(e) {
						e = this.root + e;
						var t = this.files[e];
						if (t || (e.slice(-1) !== "/" && (e += "/"), t = this.files[e]), t && !t.dir) delete this.files[e];
						else for (var n = this.filter(function(t, n) {
							return n.name.slice(0, e.length) === e;
						}), r = 0; r < n.length; r++) delete this.files[n[r].name];
						return this;
					},
					generate: function() {
						throw Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
					},
					generateInternalStream: function(e) {
						var t, n = {};
						try {
							if ((n = a.extend(e || {}, {
								streamFiles: !1,
								compression: "STORE",
								compressionOptions: null,
								type: "",
								platform: "DOS",
								comment: null,
								mimeType: "application/zip",
								encodeFileName: i.utf8encode
							})).type = n.type.toLowerCase(), n.compression = n.compression.toUpperCase(), n.type === "binarystring" && (n.type = "string"), !n.type) throw Error("No output type specified.");
							a.checkSupport(n.type), n.platform !== "darwin" && n.platform !== "freebsd" && n.platform !== "linux" && n.platform !== "sunos" || (n.platform = "UNIX"), n.platform === "win32" && (n.platform = "DOS");
							var r = n.comment || this.comment || "";
							t = d.generateWorker(this, n, r);
						} catch (e) {
							(t = new o("error")).error(e);
						}
						return new s(t, n.type || "string", n.mimeType);
					},
					generateAsync: function(e, t) {
						return this.generateInternalStream(e).accumulate(t);
					},
					generateNodeStream: function(e, t) {
						return (e = e || {}).type || (e.type = "nodebuffer"), this.generateInternalStream(e).toNodejsStream(t);
					}
				};
			}, {
				"./compressedObject": 2,
				"./defaults": 5,
				"./generate": 9,
				"./nodejs/NodejsStreamInputAdapter": 12,
				"./nodejsUtils": 14,
				"./stream/GenericWorker": 28,
				"./stream/StreamHelper": 29,
				"./utf8": 31,
				"./utils": 32,
				"./zipObject": 35
			}],
			16: [function(e, t, n) {
				t.exports = e("stream");
			}, { stream: void 0 }],
			17: [function(e, t, n) {
				var r = e("./DataReader");
				function i(e) {
					r.call(this, e);
					for (var t = 0; t < this.data.length; t++) e[t] = 255 & e[t];
				}
				e("../utils").inherits(i, r), i.prototype.byteAt = function(e) {
					return this.data[this.zero + e];
				}, i.prototype.lastIndexOfSignature = function(e) {
					for (var t = e.charCodeAt(0), n = e.charCodeAt(1), r = e.charCodeAt(2), i = e.charCodeAt(3), a = this.length - 4; 0 <= a; --a) if (this.data[a] === t && this.data[a + 1] === n && this.data[a + 2] === r && this.data[a + 3] === i) return a - this.zero;
					return -1;
				}, i.prototype.readAndCheckSignature = function(e) {
					var t = e.charCodeAt(0), n = e.charCodeAt(1), r = e.charCodeAt(2), i = e.charCodeAt(3), a = this.readData(4);
					return t === a[0] && n === a[1] && r === a[2] && i === a[3];
				}, i.prototype.readData = function(e) {
					if (this.checkOffset(e), e === 0) return [];
					var t = this.data.slice(this.zero + this.index, this.zero + this.index + e);
					return this.index += e, t;
				}, t.exports = i;
			}, {
				"../utils": 32,
				"./DataReader": 18
			}],
			18: [function(e, t, n) {
				var r = e("../utils");
				function i(e) {
					this.data = e, this.length = e.length, this.index = 0, this.zero = 0;
				}
				i.prototype = {
					checkOffset: function(e) {
						this.checkIndex(this.index + e);
					},
					checkIndex: function(e) {
						if (this.length < this.zero + e || e < 0) throw Error("End of data reached (data length = " + this.length + ", asked index = " + e + "). Corrupted zip ?");
					},
					setIndex: function(e) {
						this.checkIndex(e), this.index = e;
					},
					skip: function(e) {
						this.setIndex(this.index + e);
					},
					byteAt: function() {},
					readInt: function(e) {
						var t, n = 0;
						for (this.checkOffset(e), t = this.index + e - 1; t >= this.index; t--) n = (n << 8) + this.byteAt(t);
						return this.index += e, n;
					},
					readString: function(e) {
						return r.transformTo("string", this.readData(e));
					},
					readData: function() {},
					lastIndexOfSignature: function() {},
					readAndCheckSignature: function() {},
					readDate: function() {
						var e = this.readInt(4);
						return new Date(Date.UTC(1980 + (e >> 25 & 127), (e >> 21 & 15) - 1, e >> 16 & 31, e >> 11 & 31, e >> 5 & 63, (31 & e) << 1));
					}
				}, t.exports = i;
			}, { "../utils": 32 }],
			19: [function(e, t, n) {
				var r = e("./Uint8ArrayReader");
				function i(e) {
					r.call(this, e);
				}
				e("../utils").inherits(i, r), i.prototype.readData = function(e) {
					this.checkOffset(e);
					var t = this.data.slice(this.zero + this.index, this.zero + this.index + e);
					return this.index += e, t;
				}, t.exports = i;
			}, {
				"../utils": 32,
				"./Uint8ArrayReader": 21
			}],
			20: [function(e, t, n) {
				var r = e("./DataReader");
				function i(e) {
					r.call(this, e);
				}
				e("../utils").inherits(i, r), i.prototype.byteAt = function(e) {
					return this.data.charCodeAt(this.zero + e);
				}, i.prototype.lastIndexOfSignature = function(e) {
					return this.data.lastIndexOf(e) - this.zero;
				}, i.prototype.readAndCheckSignature = function(e) {
					return e === this.readData(4);
				}, i.prototype.readData = function(e) {
					this.checkOffset(e);
					var t = this.data.slice(this.zero + this.index, this.zero + this.index + e);
					return this.index += e, t;
				}, t.exports = i;
			}, {
				"../utils": 32,
				"./DataReader": 18
			}],
			21: [function(e, t, n) {
				var r = e("./ArrayReader");
				function i(e) {
					r.call(this, e);
				}
				e("../utils").inherits(i, r), i.prototype.readData = function(e) {
					if (this.checkOffset(e), e === 0) return new Uint8Array();
					var t = this.data.subarray(this.zero + this.index, this.zero + this.index + e);
					return this.index += e, t;
				}, t.exports = i;
			}, {
				"../utils": 32,
				"./ArrayReader": 17
			}],
			22: [function(e, t, n) {
				var r = e("../utils"), i = e("../support"), a = e("./ArrayReader"), o = e("./StringReader"), s = e("./NodeBufferReader"), c = e("./Uint8ArrayReader");
				t.exports = function(e) {
					var t = r.getTypeOf(e);
					return r.checkSupport(t), t !== "string" || i.uint8array ? t === "nodebuffer" ? new s(e) : i.uint8array ? new c(r.transformTo("uint8array", e)) : new a(r.transformTo("array", e)) : new o(e);
				};
			}, {
				"../support": 30,
				"../utils": 32,
				"./ArrayReader": 17,
				"./NodeBufferReader": 19,
				"./StringReader": 20,
				"./Uint8ArrayReader": 21
			}],
			23: [function(e, t, n) {
				n.LOCAL_FILE_HEADER = "PK", n.CENTRAL_FILE_HEADER = "PK", n.CENTRAL_DIRECTORY_END = "PK", n.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07", n.ZIP64_CENTRAL_DIRECTORY_END = "PK", n.DATA_DESCRIPTOR = "PK\x07\b";
			}, {}],
			24: [function(e, t, n) {
				var r = e("./GenericWorker"), i = e("../utils");
				function a(e) {
					r.call(this, "ConvertWorker to " + e), this.destType = e;
				}
				i.inherits(a, r), a.prototype.processChunk = function(e) {
					this.push({
						data: i.transformTo(this.destType, e.data),
						meta: e.meta
					});
				}, t.exports = a;
			}, {
				"../utils": 32,
				"./GenericWorker": 28
			}],
			25: [function(e, t, n) {
				var r = e("./GenericWorker"), i = e("../crc32");
				function a() {
					r.call(this, "Crc32Probe"), this.withStreamInfo("crc32", 0);
				}
				e("../utils").inherits(a, r), a.prototype.processChunk = function(e) {
					this.streamInfo.crc32 = i(e.data, this.streamInfo.crc32 || 0), this.push(e);
				}, t.exports = a;
			}, {
				"../crc32": 4,
				"../utils": 32,
				"./GenericWorker": 28
			}],
			26: [function(e, t, n) {
				var r = e("../utils"), i = e("./GenericWorker");
				function a(e) {
					i.call(this, "DataLengthProbe for " + e), this.propName = e, this.withStreamInfo(e, 0);
				}
				r.inherits(a, i), a.prototype.processChunk = function(e) {
					if (e) {
						var t = this.streamInfo[this.propName] || 0;
						this.streamInfo[this.propName] = t + e.data.length;
					}
					i.prototype.processChunk.call(this, e);
				}, t.exports = a;
			}, {
				"../utils": 32,
				"./GenericWorker": 28
			}],
			27: [function(e, t, n) {
				var r = e("../utils"), i = e("./GenericWorker");
				function a(e) {
					i.call(this, "DataWorker");
					var t = this;
					this.dataIsReady = !1, this.index = 0, this.max = 0, this.data = null, this.type = "", this._tickScheduled = !1, e.then(function(e) {
						t.dataIsReady = !0, t.data = e, t.max = e && e.length || 0, t.type = r.getTypeOf(e), t.isPaused || t._tickAndRepeat();
					}, function(e) {
						t.error(e);
					});
				}
				r.inherits(a, i), a.prototype.cleanUp = function() {
					i.prototype.cleanUp.call(this), this.data = null;
				}, a.prototype.resume = function() {
					return !!i.prototype.resume.call(this) && (!this._tickScheduled && this.dataIsReady && (this._tickScheduled = !0, r.delay(this._tickAndRepeat, [], this)), !0);
				}, a.prototype._tickAndRepeat = function() {
					this._tickScheduled = !1, this.isPaused || this.isFinished || (this._tick(), this.isFinished || (r.delay(this._tickAndRepeat, [], this), this._tickScheduled = !0));
				}, a.prototype._tick = function() {
					if (this.isPaused || this.isFinished) return !1;
					var e = null, t = Math.min(this.max, this.index + 16384);
					if (this.index >= this.max) return this.end();
					switch (this.type) {
						case "string":
							e = this.data.substring(this.index, t);
							break;
						case "uint8array":
							e = this.data.subarray(this.index, t);
							break;
						case "array":
						case "nodebuffer": e = this.data.slice(this.index, t);
					}
					return this.index = t, this.push({
						data: e,
						meta: { percent: this.max ? this.index / this.max * 100 : 0 }
					});
				}, t.exports = a;
			}, {
				"../utils": 32,
				"./GenericWorker": 28
			}],
			28: [function(e, t, n) {
				function r(e) {
					this.name = e || "default", this.streamInfo = {}, this.generatedError = null, this.extraStreamInfo = {}, this.isPaused = !0, this.isFinished = !1, this.isLocked = !1, this._listeners = {
						data: [],
						end: [],
						error: []
					}, this.previous = null;
				}
				r.prototype = {
					push: function(e) {
						this.emit("data", e);
					},
					end: function() {
						if (this.isFinished) return !1;
						this.flush();
						try {
							this.emit("end"), this.cleanUp(), this.isFinished = !0;
						} catch (e) {
							this.emit("error", e);
						}
						return !0;
					},
					error: function(e) {
						return !this.isFinished && (this.isPaused ? this.generatedError = e : (this.isFinished = !0, this.emit("error", e), this.previous && this.previous.error(e), this.cleanUp()), !0);
					},
					on: function(e, t) {
						return this._listeners[e].push(t), this;
					},
					cleanUp: function() {
						this.streamInfo = this.generatedError = this.extraStreamInfo = null, this._listeners = [];
					},
					emit: function(e, t) {
						if (this._listeners[e]) for (var n = 0; n < this._listeners[e].length; n++) this._listeners[e][n].call(this, t);
					},
					pipe: function(e) {
						return e.registerPrevious(this);
					},
					registerPrevious: function(e) {
						if (this.isLocked) throw Error("The stream '" + this + "' has already been used.");
						this.streamInfo = e.streamInfo, this.mergeStreamInfo(), this.previous = e;
						var t = this;
						return e.on("data", function(e) {
							t.processChunk(e);
						}), e.on("end", function() {
							t.end();
						}), e.on("error", function(e) {
							t.error(e);
						}), this;
					},
					pause: function() {
						return !this.isPaused && !this.isFinished && (this.isPaused = !0, this.previous && this.previous.pause(), !0);
					},
					resume: function() {
						if (!this.isPaused || this.isFinished) return !1;
						var e = this.isPaused = !1;
						return this.generatedError && (this.error(this.generatedError), e = !0), this.previous && this.previous.resume(), !e;
					},
					flush: function() {},
					processChunk: function(e) {
						this.push(e);
					},
					withStreamInfo: function(e, t) {
						return this.extraStreamInfo[e] = t, this.mergeStreamInfo(), this;
					},
					mergeStreamInfo: function() {
						for (var e in this.extraStreamInfo) Object.prototype.hasOwnProperty.call(this.extraStreamInfo, e) && (this.streamInfo[e] = this.extraStreamInfo[e]);
					},
					lock: function() {
						if (this.isLocked) throw Error("The stream '" + this + "' has already been used.");
						this.isLocked = !0, this.previous && this.previous.lock();
					},
					toString: function() {
						var e = "Worker " + this.name;
						return this.previous ? this.previous + " -> " + e : e;
					}
				}, t.exports = r;
			}, {}],
			29: [function(e, t, n) {
				var r = e("../utils"), i = e("./ConvertWorker"), a = e("./GenericWorker"), o = e("../base64"), s = e("../support"), c = e("../external"), l = null;
				if (s.nodestream) try {
					l = e("../nodejs/NodejsStreamOutputAdapter");
				} catch {}
				function u(e, t) {
					return new c.Promise(function(n, i) {
						var a = [], s = e._internalType, c = e._outputType, l = e._mimeType;
						e.on("data", function(e, n) {
							a.push(e), t && t(n);
						}).on("error", function(e) {
							a = [], i(e);
						}).on("end", function() {
							try {
								n(function(e, t, n) {
									switch (e) {
										case "blob": return r.newBlob(r.transformTo("arraybuffer", t), n);
										case "base64": return o.encode(t);
										default: return r.transformTo(e, t);
									}
								}(c, function(e, t) {
									var n, r = 0, i = null, a = 0;
									for (n = 0; n < t.length; n++) a += t[n].length;
									switch (e) {
										case "string": return t.join("");
										case "array": return Array.prototype.concat.apply([], t);
										case "uint8array":
											for (i = new Uint8Array(a), n = 0; n < t.length; n++) i.set(t[n], r), r += t[n].length;
											return i;
										case "nodebuffer": return Buffer.concat(t);
										default: throw Error("concat : unsupported type '" + e + "'");
									}
								}(s, a), l));
							} catch (e) {
								i(e);
							}
							a = [];
						}).resume();
					});
				}
				function d(e, t, n) {
					var o = t;
					switch (t) {
						case "blob":
						case "arraybuffer":
							o = "uint8array";
							break;
						case "base64": o = "string";
					}
					try {
						this._internalType = o, this._outputType = t, this._mimeType = n, r.checkSupport(o), this._worker = e.pipe(new i(o)), e.lock();
					} catch (e) {
						this._worker = new a("error"), this._worker.error(e);
					}
				}
				d.prototype = {
					accumulate: function(e) {
						return u(this, e);
					},
					on: function(e, t) {
						var n = this;
						return e === "data" ? this._worker.on(e, function(e) {
							t.call(n, e.data, e.meta);
						}) : this._worker.on(e, function() {
							r.delay(t, arguments, n);
						}), this;
					},
					resume: function() {
						return r.delay(this._worker.resume, [], this._worker), this;
					},
					pause: function() {
						return this._worker.pause(), this;
					},
					toNodejsStream: function(e) {
						if (r.checkSupport("nodestream"), this._outputType !== "nodebuffer") throw Error(this._outputType + " is not supported by this method");
						return new l(this, { objectMode: this._outputType !== "nodebuffer" }, e);
					}
				}, t.exports = d;
			}, {
				"../base64": 1,
				"../external": 6,
				"../nodejs/NodejsStreamOutputAdapter": 13,
				"../support": 30,
				"../utils": 32,
				"./ConvertWorker": 24,
				"./GenericWorker": 28
			}],
			30: [function(e, t, n) {
				if (n.base64 = !0, n.array = !0, n.string = !0, n.arraybuffer = typeof ArrayBuffer < "u" && typeof Uint8Array < "u", n.nodebuffer = typeof Buffer < "u", n.uint8array = typeof Uint8Array < "u", typeof ArrayBuffer > "u") n.blob = !1;
				else {
					var r = /* @__PURE__ */ new ArrayBuffer(0);
					try {
						n.blob = new Blob([r], { type: "application/zip" }).size === 0;
					} catch {
						try {
							var i = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
							i.append(r), n.blob = i.getBlob("application/zip").size === 0;
						} catch {
							n.blob = !1;
						}
					}
				}
				try {
					n.nodestream = !!e("readable-stream").Readable;
				} catch {
					n.nodestream = !1;
				}
			}, { "readable-stream": 16 }],
			31: [function(e, t, n) {
				for (var r = e("./utils"), i = e("./support"), a = e("./nodejsUtils"), o = e("./stream/GenericWorker"), s = Array(256), c = 0; c < 256; c++) s[c] = 252 <= c ? 6 : 248 <= c ? 5 : 240 <= c ? 4 : 224 <= c ? 3 : 192 <= c ? 2 : 1;
				s[254] = s[254] = 1;
				function l() {
					o.call(this, "utf-8 decode"), this.leftOver = null;
				}
				function u() {
					o.call(this, "utf-8 encode");
				}
				n.utf8encode = function(e) {
					return i.nodebuffer ? a.newBufferFrom(e, "utf-8") : function(e) {
						var t, n, r, a, o, s = e.length, c = 0;
						for (a = 0; a < s; a++) (64512 & (n = e.charCodeAt(a))) == 55296 && a + 1 < s && (64512 & (r = e.charCodeAt(a + 1))) == 56320 && (n = 65536 + (n - 55296 << 10) + (r - 56320), a++), c += n < 128 ? 1 : n < 2048 ? 2 : n < 65536 ? 3 : 4;
						for (t = i.uint8array ? new Uint8Array(c) : Array(c), a = o = 0; o < c; a++) (64512 & (n = e.charCodeAt(a))) == 55296 && a + 1 < s && (64512 & (r = e.charCodeAt(a + 1))) == 56320 && (n = 65536 + (n - 55296 << 10) + (r - 56320), a++), n < 128 ? t[o++] = n : (n < 2048 ? t[o++] = 192 | n >>> 6 : (n < 65536 ? t[o++] = 224 | n >>> 12 : (t[o++] = 240 | n >>> 18, t[o++] = 128 | n >>> 12 & 63), t[o++] = 128 | n >>> 6 & 63), t[o++] = 128 | 63 & n);
						return t;
					}(e);
				}, n.utf8decode = function(e) {
					return i.nodebuffer ? r.transformTo("nodebuffer", e).toString("utf-8") : function(e) {
						var t, n, i, a, o = e.length, c = Array(2 * o);
						for (t = n = 0; t < o;) if ((i = e[t++]) < 128) c[n++] = i;
						else if (4 < (a = s[i])) c[n++] = 65533, t += a - 1;
						else {
							for (i &= a === 2 ? 31 : a === 3 ? 15 : 7; 1 < a && t < o;) i = i << 6 | 63 & e[t++], a--;
							1 < a ? c[n++] = 65533 : i < 65536 ? c[n++] = i : (i -= 65536, c[n++] = 55296 | i >> 10 & 1023, c[n++] = 56320 | 1023 & i);
						}
						return c.length !== n && (c.subarray ? c = c.subarray(0, n) : c.length = n), r.applyFromCharCode(c);
					}(e = r.transformTo(i.uint8array ? "uint8array" : "array", e));
				}, r.inherits(l, o), l.prototype.processChunk = function(e) {
					var t = r.transformTo(i.uint8array ? "uint8array" : "array", e.data);
					if (this.leftOver && this.leftOver.length) {
						if (i.uint8array) {
							var a = t;
							(t = new Uint8Array(a.length + this.leftOver.length)).set(this.leftOver, 0), t.set(a, this.leftOver.length);
						} else t = this.leftOver.concat(t);
						this.leftOver = null;
					}
					var o = function(e, t) {
						var n;
						for ((t = t || e.length) > e.length && (t = e.length), n = t - 1; 0 <= n && (192 & e[n]) == 128;) n--;
						return n < 0 || n === 0 ? t : n + s[e[n]] > t ? n : t;
					}(t), c = t;
					o !== t.length && (i.uint8array ? (c = t.subarray(0, o), this.leftOver = t.subarray(o, t.length)) : (c = t.slice(0, o), this.leftOver = t.slice(o, t.length))), this.push({
						data: n.utf8decode(c),
						meta: e.meta
					});
				}, l.prototype.flush = function() {
					this.leftOver && this.leftOver.length && (this.push({
						data: n.utf8decode(this.leftOver),
						meta: {}
					}), this.leftOver = null);
				}, n.Utf8DecodeWorker = l, r.inherits(u, o), u.prototype.processChunk = function(e) {
					this.push({
						data: n.utf8encode(e.data),
						meta: e.meta
					});
				}, n.Utf8EncodeWorker = u;
			}, {
				"./nodejsUtils": 14,
				"./stream/GenericWorker": 28,
				"./support": 30,
				"./utils": 32
			}],
			32: [function(e, t, n) {
				var r = e("./support"), i = e("./base64"), a = e("./nodejsUtils"), o = e("./external");
				function s(e) {
					return e;
				}
				function c(e, t) {
					for (var n = 0; n < e.length; ++n) t[n] = 255 & e.charCodeAt(n);
					return t;
				}
				e("setimmediate"), n.newBlob = function(e, t) {
					n.checkSupport("blob");
					try {
						return new Blob([e], { type: t });
					} catch {
						try {
							var r = new (self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder)();
							return r.append(e), r.getBlob(t);
						} catch {
							throw Error("Bug : can't construct the Blob.");
						}
					}
				};
				var l = {
					stringifyByChunk: function(e, t, n) {
						var r = [], i = 0, a = e.length;
						if (a <= n) return String.fromCharCode.apply(null, e);
						for (; i < a;) t === "array" || t === "nodebuffer" ? r.push(String.fromCharCode.apply(null, e.slice(i, Math.min(i + n, a)))) : r.push(String.fromCharCode.apply(null, e.subarray(i, Math.min(i + n, a)))), i += n;
						return r.join("");
					},
					stringifyByChar: function(e) {
						for (var t = "", n = 0; n < e.length; n++) t += String.fromCharCode(e[n]);
						return t;
					},
					applyCanBeUsed: {
						uint8array: function() {
							try {
								return r.uint8array && String.fromCharCode.apply(null, new Uint8Array(1)).length === 1;
							} catch {
								return !1;
							}
						}(),
						nodebuffer: function() {
							try {
								return r.nodebuffer && String.fromCharCode.apply(null, a.allocBuffer(1)).length === 1;
							} catch {
								return !1;
							}
						}()
					}
				};
				function u(e) {
					var t = 65536, r = n.getTypeOf(e), i = !0;
					if (r === "uint8array" ? i = l.applyCanBeUsed.uint8array : r === "nodebuffer" && (i = l.applyCanBeUsed.nodebuffer), i) for (; 1 < t;) try {
						return l.stringifyByChunk(e, r, t);
					} catch {
						t = Math.floor(t / 2);
					}
					return l.stringifyByChar(e);
				}
				function d(e, t) {
					for (var n = 0; n < e.length; n++) t[n] = e[n];
					return t;
				}
				n.applyFromCharCode = u;
				var f = {};
				f.string = {
					string: s,
					array: function(e) {
						return c(e, Array(e.length));
					},
					arraybuffer: function(e) {
						return f.string.uint8array(e).buffer;
					},
					uint8array: function(e) {
						return c(e, new Uint8Array(e.length));
					},
					nodebuffer: function(e) {
						return c(e, a.allocBuffer(e.length));
					}
				}, f.array = {
					string: u,
					array: s,
					arraybuffer: function(e) {
						return new Uint8Array(e).buffer;
					},
					uint8array: function(e) {
						return new Uint8Array(e);
					},
					nodebuffer: function(e) {
						return a.newBufferFrom(e);
					}
				}, f.arraybuffer = {
					string: function(e) {
						return u(new Uint8Array(e));
					},
					array: function(e) {
						return d(new Uint8Array(e), Array(e.byteLength));
					},
					arraybuffer: s,
					uint8array: function(e) {
						return new Uint8Array(e);
					},
					nodebuffer: function(e) {
						return a.newBufferFrom(new Uint8Array(e));
					}
				}, f.uint8array = {
					string: u,
					array: function(e) {
						return d(e, Array(e.length));
					},
					arraybuffer: function(e) {
						return e.buffer;
					},
					uint8array: s,
					nodebuffer: function(e) {
						return a.newBufferFrom(e);
					}
				}, f.nodebuffer = {
					string: u,
					array: function(e) {
						return d(e, Array(e.length));
					},
					arraybuffer: function(e) {
						return f.nodebuffer.uint8array(e).buffer;
					},
					uint8array: function(e) {
						return d(e, new Uint8Array(e.length));
					},
					nodebuffer: s
				}, n.transformTo = function(e, t) {
					return t = t || "", e ? (n.checkSupport(e), f[n.getTypeOf(t)][e](t)) : t;
				}, n.resolve = function(e) {
					for (var t = e.split("/"), n = [], r = 0; r < t.length; r++) {
						var i = t[r];
						i === "." || i === "" && r !== 0 && r !== t.length - 1 || (i === ".." ? n.pop() : n.push(i));
					}
					return n.join("/");
				}, n.getTypeOf = function(e) {
					return typeof e == "string" ? "string" : Object.prototype.toString.call(e) === "[object Array]" ? "array" : r.nodebuffer && a.isBuffer(e) ? "nodebuffer" : r.uint8array && e instanceof Uint8Array ? "uint8array" : r.arraybuffer && e instanceof ArrayBuffer ? "arraybuffer" : void 0;
				}, n.checkSupport = function(e) {
					if (!r[e.toLowerCase()]) throw Error(e + " is not supported by this platform");
				}, n.MAX_VALUE_16BITS = 65535, n.MAX_VALUE_32BITS = -1, n.pretty = function(e) {
					var t, n, r = "";
					for (n = 0; n < (e || "").length; n++) r += "\\x" + ((t = e.charCodeAt(n)) < 16 ? "0" : "") + t.toString(16).toUpperCase();
					return r;
				}, n.delay = function(e, t, n) {
					setImmediate(function() {
						e.apply(n || null, t || []);
					});
				}, n.inherits = function(e, t) {
					function n() {}
					n.prototype = t.prototype, e.prototype = new n();
				}, n.extend = function() {
					var e, t, n = {};
					for (e = 0; e < arguments.length; e++) for (t in arguments[e]) Object.prototype.hasOwnProperty.call(arguments[e], t) && n[t] === void 0 && (n[t] = arguments[e][t]);
					return n;
				}, n.prepareContent = function(e, t, a, s, l) {
					return o.Promise.resolve(t).then(function(e) {
						return r.blob && (e instanceof Blob || ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(e)) !== -1) && typeof FileReader < "u" ? new o.Promise(function(t, n) {
							var r = new FileReader();
							r.onload = function(e) {
								t(e.target.result);
							}, r.onerror = function(e) {
								n(e.target.error);
							}, r.readAsArrayBuffer(e);
						}) : e;
					}).then(function(t) {
						var u = n.getTypeOf(t);
						return u ? (u === "arraybuffer" ? t = n.transformTo("uint8array", t) : u === "string" && (l ? t = i.decode(t) : a && !0 !== s && (t = function(e) {
							return c(e, r.uint8array ? new Uint8Array(e.length) : Array(e.length));
						}(t))), t) : o.Promise.reject(/* @__PURE__ */ Error("Can't read the data of '" + e + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"));
					});
				};
			}, {
				"./base64": 1,
				"./external": 6,
				"./nodejsUtils": 14,
				"./support": 30,
				setimmediate: 54
			}],
			33: [function(e, t, n) {
				var r = e("./reader/readerFor"), i = e("./utils"), a = e("./signature"), o = e("./zipEntry"), s = e("./support");
				function c(e) {
					this.files = [], this.loadOptions = e;
				}
				c.prototype = {
					checkSignature: function(e) {
						if (!this.reader.readAndCheckSignature(e)) {
							this.reader.index -= 4;
							var t = this.reader.readString(4);
							throw Error("Corrupted zip or bug: unexpected signature (" + i.pretty(t) + ", expected " + i.pretty(e) + ")");
						}
					},
					isSignature: function(e, t) {
						var n = this.reader.index;
						this.reader.setIndex(e);
						var r = this.reader.readString(4) === t;
						return this.reader.setIndex(n), r;
					},
					readBlockEndOfCentral: function() {
						this.diskNumber = this.reader.readInt(2), this.diskWithCentralDirStart = this.reader.readInt(2), this.centralDirRecordsOnThisDisk = this.reader.readInt(2), this.centralDirRecords = this.reader.readInt(2), this.centralDirSize = this.reader.readInt(4), this.centralDirOffset = this.reader.readInt(4), this.zipCommentLength = this.reader.readInt(2);
						var e = this.reader.readData(this.zipCommentLength), t = s.uint8array ? "uint8array" : "array", n = i.transformTo(t, e);
						this.zipComment = this.loadOptions.decodeFileName(n);
					},
					readBlockZip64EndOfCentral: function() {
						this.zip64EndOfCentralSize = this.reader.readInt(8), this.reader.skip(4), this.diskNumber = this.reader.readInt(4), this.diskWithCentralDirStart = this.reader.readInt(4), this.centralDirRecordsOnThisDisk = this.reader.readInt(8), this.centralDirRecords = this.reader.readInt(8), this.centralDirSize = this.reader.readInt(8), this.centralDirOffset = this.reader.readInt(8), this.zip64ExtensibleData = {};
						for (var e, t, n, r = this.zip64EndOfCentralSize - 44; 0 < r;) e = this.reader.readInt(2), t = this.reader.readInt(4), n = this.reader.readData(t), this.zip64ExtensibleData[e] = {
							id: e,
							length: t,
							value: n
						};
					},
					readBlockZip64EndOfCentralLocator: function() {
						if (this.diskWithZip64CentralDirStart = this.reader.readInt(4), this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8), this.disksCount = this.reader.readInt(4), 1 < this.disksCount) throw Error("Multi-volumes zip are not supported");
					},
					readLocalFiles: function() {
						var e, t;
						for (e = 0; e < this.files.length; e++) t = this.files[e], this.reader.setIndex(t.localHeaderOffset), this.checkSignature(a.LOCAL_FILE_HEADER), t.readLocalPart(this.reader), t.handleUTF8(), t.processAttributes();
					},
					readCentralDir: function() {
						var e;
						for (this.reader.setIndex(this.centralDirOffset); this.reader.readAndCheckSignature(a.CENTRAL_FILE_HEADER);) (e = new o({ zip64: this.zip64 }, this.loadOptions)).readCentralPart(this.reader), this.files.push(e);
						if (this.centralDirRecords !== this.files.length && this.centralDirRecords !== 0 && this.files.length === 0) throw Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
					},
					readEndOfCentral: function() {
						var e = this.reader.lastIndexOfSignature(a.CENTRAL_DIRECTORY_END);
						if (e < 0) throw this.isSignature(0, a.LOCAL_FILE_HEADER) ? /* @__PURE__ */ Error("Corrupted zip: can't find end of central directory") : /* @__PURE__ */ Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");
						this.reader.setIndex(e);
						var t = e;
						if (this.checkSignature(a.CENTRAL_DIRECTORY_END), this.readBlockEndOfCentral(), this.diskNumber === i.MAX_VALUE_16BITS || this.diskWithCentralDirStart === i.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === i.MAX_VALUE_16BITS || this.centralDirRecords === i.MAX_VALUE_16BITS || this.centralDirSize === i.MAX_VALUE_32BITS || this.centralDirOffset === i.MAX_VALUE_32BITS) {
							if (this.zip64 = !0, (e = this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR)) < 0) throw Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
							if (this.reader.setIndex(e), this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR), this.readBlockZip64EndOfCentralLocator(), !this.isSignature(this.relativeOffsetEndOfZip64CentralDir, a.ZIP64_CENTRAL_DIRECTORY_END) && (this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_END), this.relativeOffsetEndOfZip64CentralDir < 0)) throw Error("Corrupted zip: can't find the ZIP64 end of central directory");
							this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir), this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_END), this.readBlockZip64EndOfCentral();
						}
						var n = this.centralDirOffset + this.centralDirSize;
						this.zip64 && (n += 20, n += 12 + this.zip64EndOfCentralSize);
						var r = t - n;
						if (0 < r) this.isSignature(t, a.CENTRAL_FILE_HEADER) || (this.reader.zero = r);
						else if (r < 0) throw Error("Corrupted zip: missing " + Math.abs(r) + " bytes.");
					},
					prepareReader: function(e) {
						this.reader = r(e);
					},
					load: function(e) {
						this.prepareReader(e), this.readEndOfCentral(), this.readCentralDir(), this.readLocalFiles();
					}
				}, t.exports = c;
			}, {
				"./reader/readerFor": 22,
				"./signature": 23,
				"./support": 30,
				"./utils": 32,
				"./zipEntry": 34
			}],
			34: [function(e, t, n) {
				var r = e("./reader/readerFor"), i = e("./utils"), a = e("./compressedObject"), o = e("./crc32"), s = e("./utf8"), c = e("./compressions"), l = e("./support");
				function u(e, t) {
					this.options = e, this.loadOptions = t;
				}
				u.prototype = {
					isEncrypted: function() {
						return (1 & this.bitFlag) == 1;
					},
					useUTF8: function() {
						return (2048 & this.bitFlag) == 2048;
					},
					readLocalPart: function(e) {
						var t, n;
						if (e.skip(22), this.fileNameLength = e.readInt(2), n = e.readInt(2), this.fileName = e.readData(this.fileNameLength), e.skip(n), this.compressedSize === -1 || this.uncompressedSize === -1) throw Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
						if ((t = function(e) {
							for (var t in c) if (Object.prototype.hasOwnProperty.call(c, t) && c[t].magic === e) return c[t];
							return null;
						}(this.compressionMethod)) === null) throw Error("Corrupted zip : compression " + i.pretty(this.compressionMethod) + " unknown (inner file : " + i.transformTo("string", this.fileName) + ")");
						this.decompressed = new a(this.compressedSize, this.uncompressedSize, this.crc32, t, e.readData(this.compressedSize));
					},
					readCentralPart: function(e) {
						this.versionMadeBy = e.readInt(2), e.skip(2), this.bitFlag = e.readInt(2), this.compressionMethod = e.readString(2), this.date = e.readDate(), this.crc32 = e.readInt(4), this.compressedSize = e.readInt(4), this.uncompressedSize = e.readInt(4);
						var t = e.readInt(2);
						if (this.extraFieldsLength = e.readInt(2), this.fileCommentLength = e.readInt(2), this.diskNumberStart = e.readInt(2), this.internalFileAttributes = e.readInt(2), this.externalFileAttributes = e.readInt(4), this.localHeaderOffset = e.readInt(4), this.isEncrypted()) throw Error("Encrypted zip are not supported");
						e.skip(t), this.readExtraFields(e), this.parseZIP64ExtraField(e), this.fileComment = e.readData(this.fileCommentLength);
					},
					processAttributes: function() {
						this.unixPermissions = null, this.dosPermissions = null;
						var e = this.versionMadeBy >> 8;
						this.dir = !!(16 & this.externalFileAttributes), e == 0 && (this.dosPermissions = 63 & this.externalFileAttributes), e == 3 && (this.unixPermissions = this.externalFileAttributes >> 16 & 65535), this.dir || this.fileNameStr.slice(-1) !== "/" || (this.dir = !0);
					},
					parseZIP64ExtraField: function() {
						if (this.extraFields[1]) {
							var e = r(this.extraFields[1].value);
							this.uncompressedSize === i.MAX_VALUE_32BITS && (this.uncompressedSize = e.readInt(8)), this.compressedSize === i.MAX_VALUE_32BITS && (this.compressedSize = e.readInt(8)), this.localHeaderOffset === i.MAX_VALUE_32BITS && (this.localHeaderOffset = e.readInt(8)), this.diskNumberStart === i.MAX_VALUE_32BITS && (this.diskNumberStart = e.readInt(4));
						}
					},
					readExtraFields: function(e) {
						var t, n, r, i = e.index + this.extraFieldsLength;
						for (this.extraFields || (this.extraFields = {}); e.index + 4 < i;) t = e.readInt(2), n = e.readInt(2), r = e.readData(n), this.extraFields[t] = {
							id: t,
							length: n,
							value: r
						};
						e.setIndex(i);
					},
					handleUTF8: function() {
						var e = l.uint8array ? "uint8array" : "array";
						if (this.useUTF8()) this.fileNameStr = s.utf8decode(this.fileName), this.fileCommentStr = s.utf8decode(this.fileComment);
						else {
							var t = this.findExtraFieldUnicodePath();
							if (t !== null) this.fileNameStr = t;
							else {
								var n = i.transformTo(e, this.fileName);
								this.fileNameStr = this.loadOptions.decodeFileName(n);
							}
							var r = this.findExtraFieldUnicodeComment();
							if (r !== null) this.fileCommentStr = r;
							else {
								var a = i.transformTo(e, this.fileComment);
								this.fileCommentStr = this.loadOptions.decodeFileName(a);
							}
						}
					},
					findExtraFieldUnicodePath: function() {
						var e = this.extraFields[28789];
						if (e) {
							var t = r(e.value);
							return t.readInt(1) === 1 && o(this.fileName) === t.readInt(4) ? s.utf8decode(t.readData(e.length - 5)) : null;
						}
						return null;
					},
					findExtraFieldUnicodeComment: function() {
						var e = this.extraFields[25461];
						if (e) {
							var t = r(e.value);
							return t.readInt(1) === 1 && o(this.fileComment) === t.readInt(4) ? s.utf8decode(t.readData(e.length - 5)) : null;
						}
						return null;
					}
				}, t.exports = u;
			}, {
				"./compressedObject": 2,
				"./compressions": 3,
				"./crc32": 4,
				"./reader/readerFor": 22,
				"./support": 30,
				"./utf8": 31,
				"./utils": 32
			}],
			35: [function(e, t, n) {
				function r(e, t, n) {
					this.name = e, this.dir = n.dir, this.date = n.date, this.comment = n.comment, this.unixPermissions = n.unixPermissions, this.dosPermissions = n.dosPermissions, this._data = t, this._dataBinary = n.binary, this.options = {
						compression: n.compression,
						compressionOptions: n.compressionOptions
					};
				}
				var i = e("./stream/StreamHelper"), a = e("./stream/DataWorker"), o = e("./utf8"), s = e("./compressedObject"), c = e("./stream/GenericWorker");
				r.prototype = {
					internalStream: function(e) {
						var t = null, n = "string";
						try {
							if (!e) throw Error("No output type specified.");
							var r = (n = e.toLowerCase()) === "string" || n === "text";
							n !== "binarystring" && n !== "text" || (n = "string"), t = this._decompressWorker();
							var a = !this._dataBinary;
							a && !r && (t = t.pipe(new o.Utf8EncodeWorker())), !a && r && (t = t.pipe(new o.Utf8DecodeWorker()));
						} catch (e) {
							(t = new c("error")).error(e);
						}
						return new i(t, n, "");
					},
					async: function(e, t) {
						return this.internalStream(e).accumulate(t);
					},
					nodeStream: function(e, t) {
						return this.internalStream(e || "nodebuffer").toNodejsStream(t);
					},
					_compressWorker: function(e, t) {
						if (this._data instanceof s && this._data.compression.magic === e.magic) return this._data.getCompressedWorker();
						var n = this._decompressWorker();
						return this._dataBinary || (n = n.pipe(new o.Utf8EncodeWorker())), s.createWorkerFrom(n, e, t);
					},
					_decompressWorker: function() {
						return this._data instanceof s ? this._data.getContentWorker() : this._data instanceof c ? this._data : new a(this._data);
					}
				};
				for (var l = [
					"asText",
					"asBinary",
					"asNodeBuffer",
					"asUint8Array",
					"asArrayBuffer"
				], u = function() {
					throw Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
				}, d = 0; d < l.length; d++) r.prototype[l[d]] = u;
				t.exports = r;
			}, {
				"./compressedObject": 2,
				"./stream/DataWorker": 27,
				"./stream/GenericWorker": 28,
				"./stream/StreamHelper": 29,
				"./utf8": 31
			}],
			36: [function(e, t, n) {
				(function(e) {
					var n, r, i = e.MutationObserver || e.WebKitMutationObserver;
					if (i) {
						var a = 0, o = new i(u), s = e.document.createTextNode("");
						o.observe(s, { characterData: !0 }), n = function() {
							s.data = a = ++a % 2;
						};
					} else if (e.setImmediate || e.MessageChannel === void 0) n = "document" in e && "onreadystatechange" in e.document.createElement("script") ? function() {
						var t = e.document.createElement("script");
						t.onreadystatechange = function() {
							u(), t.onreadystatechange = null, t.parentNode.removeChild(t), t = null;
						}, e.document.documentElement.appendChild(t);
					} : function() {
						setTimeout(u, 0);
					};
					else {
						var c = new e.MessageChannel();
						c.port1.onmessage = u, n = function() {
							c.port2.postMessage(0);
						};
					}
					var l = [];
					function u() {
						var e, t;
						r = !0;
						for (var n = l.length; n;) {
							for (t = l, l = [], e = -1; ++e < n;) t[e]();
							n = l.length;
						}
						r = !1;
					}
					t.exports = function(e) {
						l.push(e) !== 1 || r || n();
					};
				}).call(this, typeof global < "u" ? global : typeof self < "u" ? self : typeof window < "u" ? window : {});
			}, {}],
			37: [function(e, t, n) {
				var r = e("immediate");
				function i() {}
				var a = {}, o = ["REJECTED"], s = ["FULFILLED"], c = ["PENDING"];
				function l(e) {
					if (typeof e != "function") throw TypeError("resolver must be a function");
					this.state = c, this.queue = [], this.outcome = void 0, e !== i && p(this, e);
				}
				function u(e, t, n) {
					this.promise = e, typeof t == "function" && (this.onFulfilled = t, this.callFulfilled = this.otherCallFulfilled), typeof n == "function" && (this.onRejected = n, this.callRejected = this.otherCallRejected);
				}
				function d(e, t, n) {
					r(function() {
						var r;
						try {
							r = t(n);
						} catch (t) {
							return a.reject(e, t);
						}
						r === e ? a.reject(e, /* @__PURE__ */ TypeError("Cannot resolve promise with itself")) : a.resolve(e, r);
					});
				}
				function f(e) {
					var t = e && e.then;
					if (e && (typeof e == "object" || typeof e == "function") && typeof t == "function") return function() {
						t.apply(e, arguments);
					};
				}
				function p(e, t) {
					var n = !1;
					function r(t) {
						n || (n = !0, a.reject(e, t));
					}
					function i(t) {
						n || (n = !0, a.resolve(e, t));
					}
					var o = m(function() {
						t(i, r);
					});
					o.status === "error" && r(o.value);
				}
				function m(e, t) {
					var n = {};
					try {
						n.value = e(t), n.status = "success";
					} catch (e) {
						n.status = "error", n.value = e;
					}
					return n;
				}
				(t.exports = l).prototype.finally = function(e) {
					if (typeof e != "function") return this;
					var t = this.constructor;
					return this.then(function(n) {
						return t.resolve(e()).then(function() {
							return n;
						});
					}, function(n) {
						return t.resolve(e()).then(function() {
							throw n;
						});
					});
				}, l.prototype.catch = function(e) {
					return this.then(null, e);
				}, l.prototype.then = function(e, t) {
					if (typeof e != "function" && this.state === s || typeof t != "function" && this.state === o) return this;
					var n = new this.constructor(i);
					return this.state === c ? this.queue.push(new u(n, e, t)) : d(n, this.state === s ? e : t, this.outcome), n;
				}, u.prototype.callFulfilled = function(e) {
					a.resolve(this.promise, e);
				}, u.prototype.otherCallFulfilled = function(e) {
					d(this.promise, this.onFulfilled, e);
				}, u.prototype.callRejected = function(e) {
					a.reject(this.promise, e);
				}, u.prototype.otherCallRejected = function(e) {
					d(this.promise, this.onRejected, e);
				}, a.resolve = function(e, t) {
					var n = m(f, t);
					if (n.status === "error") return a.reject(e, n.value);
					var r = n.value;
					if (r) p(e, r);
					else {
						e.state = s, e.outcome = t;
						for (var i = -1, o = e.queue.length; ++i < o;) e.queue[i].callFulfilled(t);
					}
					return e;
				}, a.reject = function(e, t) {
					e.state = o, e.outcome = t;
					for (var n = -1, r = e.queue.length; ++n < r;) e.queue[n].callRejected(t);
					return e;
				}, l.resolve = function(e) {
					return e instanceof this ? e : a.resolve(new this(i), e);
				}, l.reject = function(e) {
					var t = new this(i);
					return a.reject(t, e);
				}, l.all = function(e) {
					var t = this;
					if (Object.prototype.toString.call(e) !== "[object Array]") return this.reject(/* @__PURE__ */ TypeError("must be an array"));
					var n = e.length, r = !1;
					if (!n) return this.resolve([]);
					for (var o = Array(n), s = 0, c = -1, l = new this(i); ++c < n;) u(e[c], c);
					return l;
					function u(e, i) {
						t.resolve(e).then(function(e) {
							o[i] = e, ++s !== n || r || (r = !0, a.resolve(l, o));
						}, function(e) {
							r || (r = !0, a.reject(l, e));
						});
					}
				}, l.race = function(e) {
					var t = this;
					if (Object.prototype.toString.call(e) !== "[object Array]") return this.reject(/* @__PURE__ */ TypeError("must be an array"));
					var n = e.length, r = !1;
					if (!n) return this.resolve([]);
					for (var o = -1, s = new this(i); ++o < n;) c = e[o], t.resolve(c).then(function(e) {
						r || (r = !0, a.resolve(s, e));
					}, function(e) {
						r || (r = !0, a.reject(s, e));
					});
					var c;
					return s;
				};
			}, { immediate: 36 }],
			38: [function(e, t, n) {
				var r = {};
				(0, e("./lib/utils/common").assign)(r, e("./lib/deflate"), e("./lib/inflate"), e("./lib/zlib/constants")), t.exports = r;
			}, {
				"./lib/deflate": 39,
				"./lib/inflate": 40,
				"./lib/utils/common": 41,
				"./lib/zlib/constants": 44
			}],
			39: [function(e, t, n) {
				var r = e("./zlib/deflate"), i = e("./utils/common"), a = e("./utils/strings"), o = e("./zlib/messages"), s = e("./zlib/zstream"), c = Object.prototype.toString, l = 0, u = -1, d = 0, f = 8;
				function p(e) {
					if (!(this instanceof p)) return new p(e);
					this.options = i.assign({
						level: u,
						method: f,
						chunkSize: 16384,
						windowBits: 15,
						memLevel: 8,
						strategy: d,
						to: ""
					}, e || {});
					var t = this.options;
					t.raw && 0 < t.windowBits ? t.windowBits = -t.windowBits : t.gzip && 0 < t.windowBits && t.windowBits < 16 && (t.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new s(), this.strm.avail_out = 0;
					var n = r.deflateInit2(this.strm, t.level, t.method, t.windowBits, t.memLevel, t.strategy);
					if (n !== l) throw Error(o[n]);
					if (t.header && r.deflateSetHeader(this.strm, t.header), t.dictionary) {
						var m;
						if (m = typeof t.dictionary == "string" ? a.string2buf(t.dictionary) : c.call(t.dictionary) === "[object ArrayBuffer]" ? new Uint8Array(t.dictionary) : t.dictionary, (n = r.deflateSetDictionary(this.strm, m)) !== l) throw Error(o[n]);
						this._dict_set = !0;
					}
				}
				function m(e, t) {
					var n = new p(t);
					if (n.push(e, !0), n.err) throw n.msg || o[n.err];
					return n.result;
				}
				p.prototype.push = function(e, t) {
					var n, o, s = this.strm, u = this.options.chunkSize;
					if (this.ended) return !1;
					o = t === ~~t ? t : !0 === t ? 4 : 0, typeof e == "string" ? s.input = a.string2buf(e) : c.call(e) === "[object ArrayBuffer]" ? s.input = new Uint8Array(e) : s.input = e, s.next_in = 0, s.avail_in = s.input.length;
					do {
						if (s.avail_out === 0 && (s.output = new i.Buf8(u), s.next_out = 0, s.avail_out = u), (n = r.deflate(s, o)) !== 1 && n !== l) return this.onEnd(n), !(this.ended = !0);
						s.avail_out !== 0 && (s.avail_in !== 0 || o !== 4 && o !== 2) || (this.options.to === "string" ? this.onData(a.buf2binstring(i.shrinkBuf(s.output, s.next_out))) : this.onData(i.shrinkBuf(s.output, s.next_out)));
					} while ((0 < s.avail_in || s.avail_out === 0) && n !== 1);
					return o === 4 ? (n = r.deflateEnd(this.strm), this.onEnd(n), this.ended = !0, n === l) : o !== 2 || (this.onEnd(l), !(s.avail_out = 0));
				}, p.prototype.onData = function(e) {
					this.chunks.push(e);
				}, p.prototype.onEnd = function(e) {
					e === l && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = i.flattenChunks(this.chunks)), this.chunks = [], this.err = e, this.msg = this.strm.msg;
				}, n.Deflate = p, n.deflate = m, n.deflateRaw = function(e, t) {
					return (t = t || {}).raw = !0, m(e, t);
				}, n.gzip = function(e, t) {
					return (t = t || {}).gzip = !0, m(e, t);
				};
			}, {
				"./utils/common": 41,
				"./utils/strings": 42,
				"./zlib/deflate": 46,
				"./zlib/messages": 51,
				"./zlib/zstream": 53
			}],
			40: [function(e, t, n) {
				var r = e("./zlib/inflate"), i = e("./utils/common"), a = e("./utils/strings"), o = e("./zlib/constants"), s = e("./zlib/messages"), c = e("./zlib/zstream"), l = e("./zlib/gzheader"), u = Object.prototype.toString;
				function d(e) {
					if (!(this instanceof d)) return new d(e);
					this.options = i.assign({
						chunkSize: 16384,
						windowBits: 0,
						to: ""
					}, e || {});
					var t = this.options;
					t.raw && 0 <= t.windowBits && t.windowBits < 16 && (t.windowBits = -t.windowBits, t.windowBits === 0 && (t.windowBits = -15)), !(0 <= t.windowBits && t.windowBits < 16) || e && e.windowBits || (t.windowBits += 32), 15 < t.windowBits && t.windowBits < 48 && !(15 & t.windowBits) && (t.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new c(), this.strm.avail_out = 0;
					var n = r.inflateInit2(this.strm, t.windowBits);
					if (n !== o.Z_OK) throw Error(s[n]);
					this.header = new l(), r.inflateGetHeader(this.strm, this.header);
				}
				function f(e, t) {
					var n = new d(t);
					if (n.push(e, !0), n.err) throw n.msg || s[n.err];
					return n.result;
				}
				d.prototype.push = function(e, t) {
					var n, s, c, l, d, f, p = this.strm, m = this.options.chunkSize, h = this.options.dictionary, g = !1;
					if (this.ended) return !1;
					s = t === ~~t ? t : !0 === t ? o.Z_FINISH : o.Z_NO_FLUSH, typeof e == "string" ? p.input = a.binstring2buf(e) : u.call(e) === "[object ArrayBuffer]" ? p.input = new Uint8Array(e) : p.input = e, p.next_in = 0, p.avail_in = p.input.length;
					do {
						if (p.avail_out === 0 && (p.output = new i.Buf8(m), p.next_out = 0, p.avail_out = m), (n = r.inflate(p, o.Z_NO_FLUSH)) === o.Z_NEED_DICT && h && (f = typeof h == "string" ? a.string2buf(h) : u.call(h) === "[object ArrayBuffer]" ? new Uint8Array(h) : h, n = r.inflateSetDictionary(this.strm, f)), n === o.Z_BUF_ERROR && !0 === g && (n = o.Z_OK, g = !1), n !== o.Z_STREAM_END && n !== o.Z_OK) return this.onEnd(n), !(this.ended = !0);
						p.next_out && (p.avail_out !== 0 && n !== o.Z_STREAM_END && (p.avail_in !== 0 || s !== o.Z_FINISH && s !== o.Z_SYNC_FLUSH) || (this.options.to === "string" ? (c = a.utf8border(p.output, p.next_out), l = p.next_out - c, d = a.buf2string(p.output, c), p.next_out = l, p.avail_out = m - l, l && i.arraySet(p.output, p.output, c, l, 0), this.onData(d)) : this.onData(i.shrinkBuf(p.output, p.next_out)))), p.avail_in === 0 && p.avail_out === 0 && (g = !0);
					} while ((0 < p.avail_in || p.avail_out === 0) && n !== o.Z_STREAM_END);
					return n === o.Z_STREAM_END && (s = o.Z_FINISH), s === o.Z_FINISH ? (n = r.inflateEnd(this.strm), this.onEnd(n), this.ended = !0, n === o.Z_OK) : s !== o.Z_SYNC_FLUSH || (this.onEnd(o.Z_OK), !(p.avail_out = 0));
				}, d.prototype.onData = function(e) {
					this.chunks.push(e);
				}, d.prototype.onEnd = function(e) {
					e === o.Z_OK && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = i.flattenChunks(this.chunks)), this.chunks = [], this.err = e, this.msg = this.strm.msg;
				}, n.Inflate = d, n.inflate = f, n.inflateRaw = function(e, t) {
					return (t = t || {}).raw = !0, f(e, t);
				}, n.ungzip = f;
			}, {
				"./utils/common": 41,
				"./utils/strings": 42,
				"./zlib/constants": 44,
				"./zlib/gzheader": 47,
				"./zlib/inflate": 49,
				"./zlib/messages": 51,
				"./zlib/zstream": 53
			}],
			41: [function(e, t, n) {
				var r = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Int32Array < "u";
				n.assign = function(e) {
					for (var t = Array.prototype.slice.call(arguments, 1); t.length;) {
						var n = t.shift();
						if (n) {
							if (typeof n != "object") throw TypeError(n + "must be non-object");
							for (var r in n) n.hasOwnProperty(r) && (e[r] = n[r]);
						}
					}
					return e;
				}, n.shrinkBuf = function(e, t) {
					return e.length === t ? e : e.subarray ? e.subarray(0, t) : (e.length = t, e);
				};
				var i = {
					arraySet: function(e, t, n, r, i) {
						if (t.subarray && e.subarray) e.set(t.subarray(n, n + r), i);
						else for (var a = 0; a < r; a++) e[i + a] = t[n + a];
					},
					flattenChunks: function(e) {
						var t, n, r, i, a, o;
						for (t = r = 0, n = e.length; t < n; t++) r += e[t].length;
						for (o = new Uint8Array(r), t = i = 0, n = e.length; t < n; t++) a = e[t], o.set(a, i), i += a.length;
						return o;
					}
				}, a = {
					arraySet: function(e, t, n, r, i) {
						for (var a = 0; a < r; a++) e[i + a] = t[n + a];
					},
					flattenChunks: function(e) {
						return [].concat.apply([], e);
					}
				};
				n.setTyped = function(e) {
					e ? (n.Buf8 = Uint8Array, n.Buf16 = Uint16Array, n.Buf32 = Int32Array, n.assign(n, i)) : (n.Buf8 = Array, n.Buf16 = Array, n.Buf32 = Array, n.assign(n, a));
				}, n.setTyped(r);
			}, {}],
			42: [function(e, t, n) {
				var r = e("./common"), i = !0, a = !0;
				try {
					String.fromCharCode.apply(null, [0]);
				} catch {
					i = !1;
				}
				try {
					String.fromCharCode.apply(null, new Uint8Array(1));
				} catch {
					a = !1;
				}
				for (var o = new r.Buf8(256), s = 0; s < 256; s++) o[s] = 252 <= s ? 6 : 248 <= s ? 5 : 240 <= s ? 4 : 224 <= s ? 3 : 192 <= s ? 2 : 1;
				function c(e, t) {
					if (t < 65537 && (e.subarray && a || !e.subarray && i)) return String.fromCharCode.apply(null, r.shrinkBuf(e, t));
					for (var n = "", o = 0; o < t; o++) n += String.fromCharCode(e[o]);
					return n;
				}
				o[254] = o[254] = 1, n.string2buf = function(e) {
					var t, n, i, a, o, s = e.length, c = 0;
					for (a = 0; a < s; a++) (64512 & (n = e.charCodeAt(a))) == 55296 && a + 1 < s && (64512 & (i = e.charCodeAt(a + 1))) == 56320 && (n = 65536 + (n - 55296 << 10) + (i - 56320), a++), c += n < 128 ? 1 : n < 2048 ? 2 : n < 65536 ? 3 : 4;
					for (t = new r.Buf8(c), a = o = 0; o < c; a++) (64512 & (n = e.charCodeAt(a))) == 55296 && a + 1 < s && (64512 & (i = e.charCodeAt(a + 1))) == 56320 && (n = 65536 + (n - 55296 << 10) + (i - 56320), a++), n < 128 ? t[o++] = n : (n < 2048 ? t[o++] = 192 | n >>> 6 : (n < 65536 ? t[o++] = 224 | n >>> 12 : (t[o++] = 240 | n >>> 18, t[o++] = 128 | n >>> 12 & 63), t[o++] = 128 | n >>> 6 & 63), t[o++] = 128 | 63 & n);
					return t;
				}, n.buf2binstring = function(e) {
					return c(e, e.length);
				}, n.binstring2buf = function(e) {
					for (var t = new r.Buf8(e.length), n = 0, i = t.length; n < i; n++) t[n] = e.charCodeAt(n);
					return t;
				}, n.buf2string = function(e, t) {
					var n, r, i, a, s = t || e.length, l = Array(2 * s);
					for (n = r = 0; n < s;) if ((i = e[n++]) < 128) l[r++] = i;
					else if (4 < (a = o[i])) l[r++] = 65533, n += a - 1;
					else {
						for (i &= a === 2 ? 31 : a === 3 ? 15 : 7; 1 < a && n < s;) i = i << 6 | 63 & e[n++], a--;
						1 < a ? l[r++] = 65533 : i < 65536 ? l[r++] = i : (i -= 65536, l[r++] = 55296 | i >> 10 & 1023, l[r++] = 56320 | 1023 & i);
					}
					return c(l, r);
				}, n.utf8border = function(e, t) {
					var n;
					for ((t = t || e.length) > e.length && (t = e.length), n = t - 1; 0 <= n && (192 & e[n]) == 128;) n--;
					return n < 0 || n === 0 ? t : n + o[e[n]] > t ? n : t;
				};
			}, { "./common": 41 }],
			43: [function(e, t, n) {
				t.exports = function(e, t, n, r) {
					for (var i = 65535 & e | 0, a = e >>> 16 & 65535 | 0, o = 0; n !== 0;) {
						for (n -= o = 2e3 < n ? 2e3 : n; a = a + (i = i + t[r++] | 0) | 0, --o;);
						i %= 65521, a %= 65521;
					}
					return i | a << 16 | 0;
				};
			}, {}],
			44: [function(e, t, n) {
				t.exports = {
					Z_NO_FLUSH: 0,
					Z_PARTIAL_FLUSH: 1,
					Z_SYNC_FLUSH: 2,
					Z_FULL_FLUSH: 3,
					Z_FINISH: 4,
					Z_BLOCK: 5,
					Z_TREES: 6,
					Z_OK: 0,
					Z_STREAM_END: 1,
					Z_NEED_DICT: 2,
					Z_ERRNO: -1,
					Z_STREAM_ERROR: -2,
					Z_DATA_ERROR: -3,
					Z_BUF_ERROR: -5,
					Z_NO_COMPRESSION: 0,
					Z_BEST_SPEED: 1,
					Z_BEST_COMPRESSION: 9,
					Z_DEFAULT_COMPRESSION: -1,
					Z_FILTERED: 1,
					Z_HUFFMAN_ONLY: 2,
					Z_RLE: 3,
					Z_FIXED: 4,
					Z_DEFAULT_STRATEGY: 0,
					Z_BINARY: 0,
					Z_TEXT: 1,
					Z_UNKNOWN: 2,
					Z_DEFLATED: 8
				};
			}, {}],
			45: [function(e, t, n) {
				var r = function() {
					for (var e, t = [], n = 0; n < 256; n++) {
						e = n;
						for (var r = 0; r < 8; r++) e = 1 & e ? 3988292384 ^ e >>> 1 : e >>> 1;
						t[n] = e;
					}
					return t;
				}();
				t.exports = function(e, t, n, i) {
					var a = r, o = i + n;
					e ^= -1;
					for (var s = i; s < o; s++) e = e >>> 8 ^ a[255 & (e ^ t[s])];
					return -1 ^ e;
				};
			}, {}],
			46: [function(e, t, n) {
				var r, i = e("../utils/common"), a = e("./trees"), o = e("./adler32"), s = e("./crc32"), c = e("./messages"), l = 0, u = 4, d = 0, f = -2, p = -1, m = 4, h = 2, g = 8, _ = 9, v = 286, y = 30, b = 19, x = 2 * v + 1, S = 15, C = 3, w = 258, T = w + C + 1, E = 42, D = 113, O = 1, k = 2, A = 3, j = 4;
				function M(e, t) {
					return e.msg = c[t], t;
				}
				function N(e) {
					return (e << 1) - (4 < e ? 9 : 0);
				}
				function P(e) {
					for (var t = e.length; 0 <= --t;) e[t] = 0;
				}
				function F(e) {
					var t = e.state, n = t.pending;
					n > e.avail_out && (n = e.avail_out), n !== 0 && (i.arraySet(e.output, t.pending_buf, t.pending_out, n, e.next_out), e.next_out += n, t.pending_out += n, e.total_out += n, e.avail_out -= n, t.pending -= n, t.pending === 0 && (t.pending_out = 0));
				}
				function I(e, t) {
					a._tr_flush_block(e, 0 <= e.block_start ? e.block_start : -1, e.strstart - e.block_start, t), e.block_start = e.strstart, F(e.strm);
				}
				function L(e, t) {
					e.pending_buf[e.pending++] = t;
				}
				function R(e, t) {
					e.pending_buf[e.pending++] = t >>> 8 & 255, e.pending_buf[e.pending++] = 255 & t;
				}
				function z(e, t) {
					var n, r, i = e.max_chain_length, a = e.strstart, o = e.prev_length, s = e.nice_match, c = e.strstart > e.w_size - T ? e.strstart - (e.w_size - T) : 0, l = e.window, u = e.w_mask, d = e.prev, f = e.strstart + w, p = l[a + o - 1], m = l[a + o];
					e.prev_length >= e.good_match && (i >>= 2), s > e.lookahead && (s = e.lookahead);
					do
						if (l[(n = t) + o] === m && l[n + o - 1] === p && l[n] === l[a] && l[++n] === l[a + 1]) {
							a += 2, n++;
							do							;
while (l[++a] === l[++n] && l[++a] === l[++n] && l[++a] === l[++n] && l[++a] === l[++n] && l[++a] === l[++n] && l[++a] === l[++n] && l[++a] === l[++n] && l[++a] === l[++n] && a < f);
							if (r = w - (f - a), a = f - w, o < r) {
								if (e.match_start = t, s <= (o = r)) break;
								p = l[a + o - 1], m = l[a + o];
							}
						}
					while ((t = d[t & u]) > c && --i != 0);
					return o <= e.lookahead ? o : e.lookahead;
				}
				function B(e) {
					var t, n, r, a, c, l, u, d, f, p, m = e.w_size;
					do {
						if (a = e.window_size - e.lookahead - e.strstart, e.strstart >= m + (m - T)) {
							for (i.arraySet(e.window, e.window, m, m, 0), e.match_start -= m, e.strstart -= m, e.block_start -= m, t = n = e.hash_size; r = e.head[--t], e.head[t] = m <= r ? r - m : 0, --n;);
							for (t = n = m; r = e.prev[--t], e.prev[t] = m <= r ? r - m : 0, --n;);
							a += m;
						}
						if (e.strm.avail_in === 0) break;
						if (l = e.strm, u = e.window, d = e.strstart + e.lookahead, f = a, p = void 0, p = l.avail_in, f < p && (p = f), n = p === 0 ? 0 : (l.avail_in -= p, i.arraySet(u, l.input, l.next_in, p, d), l.state.wrap === 1 ? l.adler = o(l.adler, u, p, d) : l.state.wrap === 2 && (l.adler = s(l.adler, u, p, d)), l.next_in += p, l.total_in += p, p), e.lookahead += n, e.lookahead + e.insert >= C) for (c = e.strstart - e.insert, e.ins_h = e.window[c], e.ins_h = (e.ins_h << e.hash_shift ^ e.window[c + 1]) & e.hash_mask; e.insert && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[c + C - 1]) & e.hash_mask, e.prev[c & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = c, c++, e.insert--, !(e.lookahead + e.insert < C)););
					} while (e.lookahead < T && e.strm.avail_in !== 0);
				}
				function V(e, t) {
					for (var n, r;;) {
						if (e.lookahead < T) {
							if (B(e), e.lookahead < T && t === l) return O;
							if (e.lookahead === 0) break;
						}
						if (n = 0, e.lookahead >= C && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + C - 1]) & e.hash_mask, n = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), n !== 0 && e.strstart - n <= e.w_size - T && (e.match_length = z(e, n)), e.match_length >= C) if (r = a._tr_tally(e, e.strstart - e.match_start, e.match_length - C), e.lookahead -= e.match_length, e.match_length <= e.max_lazy_match && e.lookahead >= C) {
							for (e.match_length--; e.strstart++, e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + C - 1]) & e.hash_mask, n = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart, --e.match_length != 0;);
							e.strstart++;
						} else e.strstart += e.match_length, e.match_length = 0, e.ins_h = e.window[e.strstart], e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 1]) & e.hash_mask;
						else r = a._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++;
						if (r && (I(e, !1), e.strm.avail_out === 0)) return O;
					}
					return e.insert = e.strstart < C - 1 ? e.strstart : C - 1, t === u ? (I(e, !0), e.strm.avail_out === 0 ? A : j) : e.last_lit && (I(e, !1), e.strm.avail_out === 0) ? O : k;
				}
				function H(e, t) {
					for (var n, r, i;;) {
						if (e.lookahead < T) {
							if (B(e), e.lookahead < T && t === l) return O;
							if (e.lookahead === 0) break;
						}
						if (n = 0, e.lookahead >= C && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + C - 1]) & e.hash_mask, n = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), e.prev_length = e.match_length, e.prev_match = e.match_start, e.match_length = C - 1, n !== 0 && e.prev_length < e.max_lazy_match && e.strstart - n <= e.w_size - T && (e.match_length = z(e, n), e.match_length <= 5 && (e.strategy === 1 || e.match_length === C && 4096 < e.strstart - e.match_start) && (e.match_length = C - 1)), e.prev_length >= C && e.match_length <= e.prev_length) {
							for (i = e.strstart + e.lookahead - C, r = a._tr_tally(e, e.strstart - 1 - e.prev_match, e.prev_length - C), e.lookahead -= e.prev_length - 1, e.prev_length -= 2; ++e.strstart <= i && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + C - 1]) & e.hash_mask, n = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), --e.prev_length != 0;);
							if (e.match_available = 0, e.match_length = C - 1, e.strstart++, r && (I(e, !1), e.strm.avail_out === 0)) return O;
						} else if (e.match_available) {
							if ((r = a._tr_tally(e, 0, e.window[e.strstart - 1])) && I(e, !1), e.strstart++, e.lookahead--, e.strm.avail_out === 0) return O;
						} else e.match_available = 1, e.strstart++, e.lookahead--;
					}
					return e.match_available && (r = a._tr_tally(e, 0, e.window[e.strstart - 1]), e.match_available = 0), e.insert = e.strstart < C - 1 ? e.strstart : C - 1, t === u ? (I(e, !0), e.strm.avail_out === 0 ? A : j) : e.last_lit && (I(e, !1), e.strm.avail_out === 0) ? O : k;
				}
				function U(e, t, n, r, i) {
					this.good_length = e, this.max_lazy = t, this.nice_length = n, this.max_chain = r, this.func = i;
				}
				function W() {
					this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = g, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new i.Buf16(2 * x), this.dyn_dtree = new i.Buf16(2 * (2 * y + 1)), this.bl_tree = new i.Buf16(2 * (2 * b + 1)), P(this.dyn_ltree), P(this.dyn_dtree), P(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new i.Buf16(S + 1), this.heap = new i.Buf16(2 * v + 1), P(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new i.Buf16(2 * v + 1), P(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
				}
				function ee(e) {
					var t;
					return e && e.state ? (e.total_in = e.total_out = 0, e.data_type = h, (t = e.state).pending = 0, t.pending_out = 0, t.wrap < 0 && (t.wrap = -t.wrap), t.status = t.wrap ? E : D, e.adler = t.wrap === 2 ? 0 : 1, t.last_flush = l, a._tr_init(t), d) : M(e, f);
				}
				function te(e) {
					var t = ee(e);
					return t === d && function(e) {
						e.window_size = 2 * e.w_size, P(e.head), e.max_lazy_match = r[e.level].max_lazy, e.good_match = r[e.level].good_length, e.nice_match = r[e.level].nice_length, e.max_chain_length = r[e.level].max_chain, e.strstart = 0, e.block_start = 0, e.lookahead = 0, e.insert = 0, e.match_length = e.prev_length = C - 1, e.match_available = 0, e.ins_h = 0;
					}(e.state), t;
				}
				function ne(e, t, n, r, a, o) {
					if (!e) return f;
					var s = 1;
					if (t === p && (t = 6), r < 0 ? (s = 0, r = -r) : 15 < r && (s = 2, r -= 16), a < 1 || _ < a || n !== g || r < 8 || 15 < r || t < 0 || 9 < t || o < 0 || m < o) return M(e, f);
					r === 8 && (r = 9);
					var c = new W();
					return (e.state = c).strm = e, c.wrap = s, c.gzhead = null, c.w_bits = r, c.w_size = 1 << c.w_bits, c.w_mask = c.w_size - 1, c.hash_bits = a + 7, c.hash_size = 1 << c.hash_bits, c.hash_mask = c.hash_size - 1, c.hash_shift = ~~((c.hash_bits + C - 1) / C), c.window = new i.Buf8(2 * c.w_size), c.head = new i.Buf16(c.hash_size), c.prev = new i.Buf16(c.w_size), c.lit_bufsize = 1 << a + 6, c.pending_buf_size = 4 * c.lit_bufsize, c.pending_buf = new i.Buf8(c.pending_buf_size), c.d_buf = 1 * c.lit_bufsize, c.l_buf = 3 * c.lit_bufsize, c.level = t, c.strategy = o, c.method = n, te(e);
				}
				r = [
					new U(0, 0, 0, 0, function(e, t) {
						var n = 65535;
						for (n > e.pending_buf_size - 5 && (n = e.pending_buf_size - 5);;) {
							if (e.lookahead <= 1) {
								if (B(e), e.lookahead === 0 && t === l) return O;
								if (e.lookahead === 0) break;
							}
							e.strstart += e.lookahead, e.lookahead = 0;
							var r = e.block_start + n;
							if ((e.strstart === 0 || e.strstart >= r) && (e.lookahead = e.strstart - r, e.strstart = r, I(e, !1), e.strm.avail_out === 0) || e.strstart - e.block_start >= e.w_size - T && (I(e, !1), e.strm.avail_out === 0)) return O;
						}
						return e.insert = 0, t === u ? (I(e, !0), e.strm.avail_out === 0 ? A : j) : (e.strstart > e.block_start && (I(e, !1), e.strm.avail_out), O);
					}),
					new U(4, 4, 8, 4, V),
					new U(4, 5, 16, 8, V),
					new U(4, 6, 32, 32, V),
					new U(4, 4, 16, 16, H),
					new U(8, 16, 32, 32, H),
					new U(8, 16, 128, 128, H),
					new U(8, 32, 128, 256, H),
					new U(32, 128, 258, 1024, H),
					new U(32, 258, 258, 4096, H)
				], n.deflateInit = function(e, t) {
					return ne(e, t, g, 15, 8, 0);
				}, n.deflateInit2 = ne, n.deflateReset = te, n.deflateResetKeep = ee, n.deflateSetHeader = function(e, t) {
					return e && e.state && e.state.wrap === 2 ? (e.state.gzhead = t, d) : f;
				}, n.deflate = function(e, t) {
					var n, i, o, c;
					if (!e || !e.state || 5 < t || t < 0) return e ? M(e, f) : f;
					if (i = e.state, !e.output || !e.input && e.avail_in !== 0 || i.status === 666 && t !== u) return M(e, e.avail_out === 0 ? -5 : f);
					if (i.strm = e, n = i.last_flush, i.last_flush = t, i.status === E) if (i.wrap === 2) e.adler = 0, L(i, 31), L(i, 139), L(i, 8), i.gzhead ? (L(i, +!!i.gzhead.text + (i.gzhead.hcrc ? 2 : 0) + (i.gzhead.extra ? 4 : 0) + (i.gzhead.name ? 8 : 0) + (i.gzhead.comment ? 16 : 0)), L(i, 255 & i.gzhead.time), L(i, i.gzhead.time >> 8 & 255), L(i, i.gzhead.time >> 16 & 255), L(i, i.gzhead.time >> 24 & 255), L(i, i.level === 9 ? 2 : 2 <= i.strategy || i.level < 2 ? 4 : 0), L(i, 255 & i.gzhead.os), i.gzhead.extra && i.gzhead.extra.length && (L(i, 255 & i.gzhead.extra.length), L(i, i.gzhead.extra.length >> 8 & 255)), i.gzhead.hcrc && (e.adler = s(e.adler, i.pending_buf, i.pending, 0)), i.gzindex = 0, i.status = 69) : (L(i, 0), L(i, 0), L(i, 0), L(i, 0), L(i, 0), L(i, i.level === 9 ? 2 : 2 <= i.strategy || i.level < 2 ? 4 : 0), L(i, 3), i.status = D);
					else {
						var p = g + (i.w_bits - 8 << 4) << 8;
						p |= (2 <= i.strategy || i.level < 2 ? 0 : i.level < 6 ? 1 : i.level === 6 ? 2 : 3) << 6, i.strstart !== 0 && (p |= 32), p += 31 - p % 31, i.status = D, R(i, p), i.strstart !== 0 && (R(i, e.adler >>> 16), R(i, 65535 & e.adler)), e.adler = 1;
					}
					if (i.status === 69) if (i.gzhead.extra) {
						for (o = i.pending; i.gzindex < (65535 & i.gzhead.extra.length) && (i.pending !== i.pending_buf_size || (i.gzhead.hcrc && i.pending > o && (e.adler = s(e.adler, i.pending_buf, i.pending - o, o)), F(e), o = i.pending, i.pending !== i.pending_buf_size));) L(i, 255 & i.gzhead.extra[i.gzindex]), i.gzindex++;
						i.gzhead.hcrc && i.pending > o && (e.adler = s(e.adler, i.pending_buf, i.pending - o, o)), i.gzindex === i.gzhead.extra.length && (i.gzindex = 0, i.status = 73);
					} else i.status = 73;
					if (i.status === 73) if (i.gzhead.name) {
						o = i.pending;
						do {
							if (i.pending === i.pending_buf_size && (i.gzhead.hcrc && i.pending > o && (e.adler = s(e.adler, i.pending_buf, i.pending - o, o)), F(e), o = i.pending, i.pending === i.pending_buf_size)) {
								c = 1;
								break;
							}
							c = i.gzindex < i.gzhead.name.length ? 255 & i.gzhead.name.charCodeAt(i.gzindex++) : 0, L(i, c);
						} while (c !== 0);
						i.gzhead.hcrc && i.pending > o && (e.adler = s(e.adler, i.pending_buf, i.pending - o, o)), c === 0 && (i.gzindex = 0, i.status = 91);
					} else i.status = 91;
					if (i.status === 91) if (i.gzhead.comment) {
						o = i.pending;
						do {
							if (i.pending === i.pending_buf_size && (i.gzhead.hcrc && i.pending > o && (e.adler = s(e.adler, i.pending_buf, i.pending - o, o)), F(e), o = i.pending, i.pending === i.pending_buf_size)) {
								c = 1;
								break;
							}
							c = i.gzindex < i.gzhead.comment.length ? 255 & i.gzhead.comment.charCodeAt(i.gzindex++) : 0, L(i, c);
						} while (c !== 0);
						i.gzhead.hcrc && i.pending > o && (e.adler = s(e.adler, i.pending_buf, i.pending - o, o)), c === 0 && (i.status = 103);
					} else i.status = 103;
					if (i.status === 103 && (i.gzhead.hcrc ? (i.pending + 2 > i.pending_buf_size && F(e), i.pending + 2 <= i.pending_buf_size && (L(i, 255 & e.adler), L(i, e.adler >> 8 & 255), e.adler = 0, i.status = D)) : i.status = D), i.pending !== 0) {
						if (F(e), e.avail_out === 0) return i.last_flush = -1, d;
					} else if (e.avail_in === 0 && N(t) <= N(n) && t !== u) return M(e, -5);
					if (i.status === 666 && e.avail_in !== 0) return M(e, -5);
					if (e.avail_in !== 0 || i.lookahead !== 0 || t !== l && i.status !== 666) {
						var m = i.strategy === 2 ? function(e, t) {
							for (var n;;) {
								if (e.lookahead === 0 && (B(e), e.lookahead === 0)) {
									if (t === l) return O;
									break;
								}
								if (e.match_length = 0, n = a._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++, n && (I(e, !1), e.strm.avail_out === 0)) return O;
							}
							return e.insert = 0, t === u ? (I(e, !0), e.strm.avail_out === 0 ? A : j) : e.last_lit && (I(e, !1), e.strm.avail_out === 0) ? O : k;
						}(i, t) : i.strategy === 3 ? function(e, t) {
							for (var n, r, i, o, s = e.window;;) {
								if (e.lookahead <= w) {
									if (B(e), e.lookahead <= w && t === l) return O;
									if (e.lookahead === 0) break;
								}
								if (e.match_length = 0, e.lookahead >= C && 0 < e.strstart && (r = s[i = e.strstart - 1]) === s[++i] && r === s[++i] && r === s[++i]) {
									o = e.strstart + w;
									do									;
while (r === s[++i] && r === s[++i] && r === s[++i] && r === s[++i] && r === s[++i] && r === s[++i] && r === s[++i] && r === s[++i] && i < o);
									e.match_length = w - (o - i), e.match_length > e.lookahead && (e.match_length = e.lookahead);
								}
								if (e.match_length >= C ? (n = a._tr_tally(e, 1, e.match_length - C), e.lookahead -= e.match_length, e.strstart += e.match_length, e.match_length = 0) : (n = a._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++), n && (I(e, !1), e.strm.avail_out === 0)) return O;
							}
							return e.insert = 0, t === u ? (I(e, !0), e.strm.avail_out === 0 ? A : j) : e.last_lit && (I(e, !1), e.strm.avail_out === 0) ? O : k;
						}(i, t) : r[i.level].func(i, t);
						if (m !== A && m !== j || (i.status = 666), m === O || m === A) return e.avail_out === 0 && (i.last_flush = -1), d;
						if (m === k && (t === 1 ? a._tr_align(i) : t !== 5 && (a._tr_stored_block(i, 0, 0, !1), t === 3 && (P(i.head), i.lookahead === 0 && (i.strstart = 0, i.block_start = 0, i.insert = 0))), F(e), e.avail_out === 0)) return i.last_flush = -1, d;
					}
					return t === u ? i.wrap <= 0 ? 1 : (i.wrap === 2 ? (L(i, 255 & e.adler), L(i, e.adler >> 8 & 255), L(i, e.adler >> 16 & 255), L(i, e.adler >> 24 & 255), L(i, 255 & e.total_in), L(i, e.total_in >> 8 & 255), L(i, e.total_in >> 16 & 255), L(i, e.total_in >> 24 & 255)) : (R(i, e.adler >>> 16), R(i, 65535 & e.adler)), F(e), 0 < i.wrap && (i.wrap = -i.wrap), i.pending === 0 ? 1 : d) : d;
				}, n.deflateEnd = function(e) {
					var t;
					return e && e.state ? (t = e.state.status) !== E && t !== 69 && t !== 73 && t !== 91 && t !== 103 && t !== D && t !== 666 ? M(e, f) : (e.state = null, t === D ? M(e, -3) : d) : f;
				}, n.deflateSetDictionary = function(e, t) {
					var n, r, a, s, c, l, u, p, m = t.length;
					if (!e || !e.state || (s = (n = e.state).wrap) === 2 || s === 1 && n.status !== E || n.lookahead) return f;
					for (s === 1 && (e.adler = o(e.adler, t, m, 0)), n.wrap = 0, m >= n.w_size && (s === 0 && (P(n.head), n.strstart = 0, n.block_start = 0, n.insert = 0), p = new i.Buf8(n.w_size), i.arraySet(p, t, m - n.w_size, n.w_size, 0), t = p, m = n.w_size), c = e.avail_in, l = e.next_in, u = e.input, e.avail_in = m, e.next_in = 0, e.input = t, B(n); n.lookahead >= C;) {
						for (r = n.strstart, a = n.lookahead - (C - 1); n.ins_h = (n.ins_h << n.hash_shift ^ n.window[r + C - 1]) & n.hash_mask, n.prev[r & n.w_mask] = n.head[n.ins_h], n.head[n.ins_h] = r, r++, --a;);
						n.strstart = r, n.lookahead = C - 1, B(n);
					}
					return n.strstart += n.lookahead, n.block_start = n.strstart, n.insert = n.lookahead, n.lookahead = 0, n.match_length = n.prev_length = C - 1, n.match_available = 0, e.next_in = l, e.input = u, e.avail_in = c, n.wrap = s, d;
				}, n.deflateInfo = "pako deflate (from Nodeca project)";
			}, {
				"../utils/common": 41,
				"./adler32": 43,
				"./crc32": 45,
				"./messages": 51,
				"./trees": 52
			}],
			47: [function(e, t, n) {
				t.exports = function() {
					this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
				};
			}, {}],
			48: [function(e, t, n) {
				t.exports = function(e, t) {
					var n = e.state, r = e.next_in, i, a, o, s, c, l, u, d, f, p, m, h, g, _, v, y, b, x, S, C, w, T = e.input, E;
					i = r + (e.avail_in - 5), a = e.next_out, E = e.output, o = a - (t - e.avail_out), s = a + (e.avail_out - 257), c = n.dmax, l = n.wsize, u = n.whave, d = n.wnext, f = n.window, p = n.hold, m = n.bits, h = n.lencode, g = n.distcode, _ = (1 << n.lenbits) - 1, v = (1 << n.distbits) - 1;
					e: do {
						m < 15 && (p += T[r++] << m, m += 8, p += T[r++] << m, m += 8), y = h[p & _];
						t: for (;;) {
							if (p >>>= b = y >>> 24, m -= b, (b = y >>> 16 & 255) == 0) E[a++] = 65535 & y;
							else {
								if (!(16 & b)) {
									if (!(64 & b)) {
										y = h[(65535 & y) + (p & (1 << b) - 1)];
										continue t;
									}
									if (32 & b) {
										n.mode = 12;
										break e;
									}
									e.msg = "invalid literal/length code", n.mode = 30;
									break e;
								}
								x = 65535 & y, (b &= 15) && (m < b && (p += T[r++] << m, m += 8), x += p & (1 << b) - 1, p >>>= b, m -= b), m < 15 && (p += T[r++] << m, m += 8, p += T[r++] << m, m += 8), y = g[p & v];
								r: for (;;) {
									if (p >>>= b = y >>> 24, m -= b, !(16 & (b = y >>> 16 & 255))) {
										if (!(64 & b)) {
											y = g[(65535 & y) + (p & (1 << b) - 1)];
											continue r;
										}
										e.msg = "invalid distance code", n.mode = 30;
										break e;
									}
									if (S = 65535 & y, m < (b &= 15) && (p += T[r++] << m, (m += 8) < b && (p += T[r++] << m, m += 8)), c < (S += p & (1 << b) - 1)) {
										e.msg = "invalid distance too far back", n.mode = 30;
										break e;
									}
									if (p >>>= b, m -= b, (b = a - o) < S) {
										if (u < (b = S - b) && n.sane) {
											e.msg = "invalid distance too far back", n.mode = 30;
											break e;
										}
										if (w = f, (C = 0) === d) {
											if (C += l - b, b < x) {
												for (x -= b; E[a++] = f[C++], --b;);
												C = a - S, w = E;
											}
										} else if (d < b) {
											if (C += l + d - b, (b -= d) < x) {
												for (x -= b; E[a++] = f[C++], --b;);
												if (C = 0, d < x) {
													for (x -= b = d; E[a++] = f[C++], --b;);
													C = a - S, w = E;
												}
											}
										} else if (C += d - b, b < x) {
											for (x -= b; E[a++] = f[C++], --b;);
											C = a - S, w = E;
										}
										for (; 2 < x;) E[a++] = w[C++], E[a++] = w[C++], E[a++] = w[C++], x -= 3;
										x && (E[a++] = w[C++], 1 < x && (E[a++] = w[C++]));
									} else {
										for (C = a - S; E[a++] = E[C++], E[a++] = E[C++], E[a++] = E[C++], 2 < (x -= 3););
										x && (E[a++] = E[C++], 1 < x && (E[a++] = E[C++]));
									}
									break;
								}
							}
							break;
						}
					} while (r < i && a < s);
					r -= x = m >> 3, p &= (1 << (m -= x << 3)) - 1, e.next_in = r, e.next_out = a, e.avail_in = r < i ? i - r + 5 : 5 - (r - i), e.avail_out = a < s ? s - a + 257 : 257 - (a - s), n.hold = p, n.bits = m;
				};
			}, {}],
			49: [function(e, t, n) {
				var r = e("../utils/common"), i = e("./adler32"), a = e("./crc32"), o = e("./inffast"), s = e("./inftrees"), c = 1, l = 2, u = 0, d = -2, f = 1, p = 852, m = 592;
				function h(e) {
					return (e >>> 24 & 255) + (e >>> 8 & 65280) + ((65280 & e) << 8) + ((255 & e) << 24);
				}
				function g() {
					this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new r.Buf16(320), this.work = new r.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
				}
				function _(e) {
					var t;
					return e && e.state ? (t = e.state, e.total_in = e.total_out = t.total = 0, e.msg = "", t.wrap && (e.adler = 1 & t.wrap), t.mode = f, t.last = 0, t.havedict = 0, t.dmax = 32768, t.head = null, t.hold = 0, t.bits = 0, t.lencode = t.lendyn = new r.Buf32(p), t.distcode = t.distdyn = new r.Buf32(m), t.sane = 1, t.back = -1, u) : d;
				}
				function v(e) {
					var t;
					return e && e.state ? ((t = e.state).wsize = 0, t.whave = 0, t.wnext = 0, _(e)) : d;
				}
				function y(e, t) {
					var n, r;
					return e && e.state ? (r = e.state, t < 0 ? (n = 0, t = -t) : (n = 1 + (t >> 4), t < 48 && (t &= 15)), t && (t < 8 || 15 < t) ? d : (r.window !== null && r.wbits !== t && (r.window = null), r.wrap = n, r.wbits = t, v(e))) : d;
				}
				function b(e, t) {
					var n, r;
					return e ? (r = new g(), (e.state = r).window = null, (n = y(e, t)) !== u && (e.state = null), n) : d;
				}
				var x, S, C = !0;
				function w(e) {
					if (C) {
						var t;
						for (x = new r.Buf32(512), S = new r.Buf32(32), t = 0; t < 144;) e.lens[t++] = 8;
						for (; t < 256;) e.lens[t++] = 9;
						for (; t < 280;) e.lens[t++] = 7;
						for (; t < 288;) e.lens[t++] = 8;
						for (s(c, e.lens, 0, 288, x, 0, e.work, { bits: 9 }), t = 0; t < 32;) e.lens[t++] = 5;
						s(l, e.lens, 0, 32, S, 0, e.work, { bits: 5 }), C = !1;
					}
					e.lencode = x, e.lenbits = 9, e.distcode = S, e.distbits = 5;
				}
				function T(e, t, n, i) {
					var a, o = e.state;
					return o.window === null && (o.wsize = 1 << o.wbits, o.wnext = 0, o.whave = 0, o.window = new r.Buf8(o.wsize)), i >= o.wsize ? (r.arraySet(o.window, t, n - o.wsize, o.wsize, 0), o.wnext = 0, o.whave = o.wsize) : (i < (a = o.wsize - o.wnext) && (a = i), r.arraySet(o.window, t, n - i, a, o.wnext), (i -= a) ? (r.arraySet(o.window, t, n - i, i, 0), o.wnext = i, o.whave = o.wsize) : (o.wnext += a, o.wnext === o.wsize && (o.wnext = 0), o.whave < o.wsize && (o.whave += a))), 0;
				}
				n.inflateReset = v, n.inflateReset2 = y, n.inflateResetKeep = _, n.inflateInit = function(e) {
					return b(e, 15);
				}, n.inflateInit2 = b, n.inflate = function(e, t) {
					var n, p, m, g, _, v, y, b, x, S, C, E, D, O, k, A, j, M, N, P, F, I, L, R, z = 0, B = new r.Buf8(4), V = [
						16,
						17,
						18,
						0,
						8,
						7,
						9,
						6,
						10,
						5,
						11,
						4,
						12,
						3,
						13,
						2,
						14,
						1,
						15
					];
					if (!e || !e.state || !e.output || !e.input && e.avail_in !== 0) return d;
					(n = e.state).mode === 12 && (n.mode = 13), _ = e.next_out, m = e.output, y = e.avail_out, g = e.next_in, p = e.input, v = e.avail_in, b = n.hold, x = n.bits, S = v, C = y, I = u;
					e: for (;;) switch (n.mode) {
						case f:
							if (n.wrap === 0) {
								n.mode = 13;
								break;
							}
							for (; x < 16;) {
								if (v === 0) break e;
								v--, b += p[g++] << x, x += 8;
							}
							if (2 & n.wrap && b === 35615) {
								B[n.check = 0] = 255 & b, B[1] = b >>> 8 & 255, n.check = a(n.check, B, 2, 0), x = b = 0, n.mode = 2;
								break;
							}
							if (n.flags = 0, n.head && (n.head.done = !1), !(1 & n.wrap) || (((255 & b) << 8) + (b >> 8)) % 31) {
								e.msg = "incorrect header check", n.mode = 30;
								break;
							}
							if ((15 & b) != 8) {
								e.msg = "unknown compression method", n.mode = 30;
								break;
							}
							if (x -= 4, F = 8 + (15 & (b >>>= 4)), n.wbits === 0) n.wbits = F;
							else if (F > n.wbits) {
								e.msg = "invalid window size", n.mode = 30;
								break;
							}
							n.dmax = 1 << F, e.adler = n.check = 1, n.mode = 512 & b ? 10 : 12, x = b = 0;
							break;
						case 2:
							for (; x < 16;) {
								if (v === 0) break e;
								v--, b += p[g++] << x, x += 8;
							}
							if (n.flags = b, (255 & n.flags) != 8) {
								e.msg = "unknown compression method", n.mode = 30;
								break;
							}
							if (57344 & n.flags) {
								e.msg = "unknown header flags set", n.mode = 30;
								break;
							}
							n.head && (n.head.text = b >> 8 & 1), 512 & n.flags && (B[0] = 255 & b, B[1] = b >>> 8 & 255, n.check = a(n.check, B, 2, 0)), x = b = 0, n.mode = 3;
						case 3:
							for (; x < 32;) {
								if (v === 0) break e;
								v--, b += p[g++] << x, x += 8;
							}
							n.head && (n.head.time = b), 512 & n.flags && (B[0] = 255 & b, B[1] = b >>> 8 & 255, B[2] = b >>> 16 & 255, B[3] = b >>> 24 & 255, n.check = a(n.check, B, 4, 0)), x = b = 0, n.mode = 4;
						case 4:
							for (; x < 16;) {
								if (v === 0) break e;
								v--, b += p[g++] << x, x += 8;
							}
							n.head && (n.head.xflags = 255 & b, n.head.os = b >> 8), 512 & n.flags && (B[0] = 255 & b, B[1] = b >>> 8 & 255, n.check = a(n.check, B, 2, 0)), x = b = 0, n.mode = 5;
						case 5:
							if (1024 & n.flags) {
								for (; x < 16;) {
									if (v === 0) break e;
									v--, b += p[g++] << x, x += 8;
								}
								n.length = b, n.head && (n.head.extra_len = b), 512 & n.flags && (B[0] = 255 & b, B[1] = b >>> 8 & 255, n.check = a(n.check, B, 2, 0)), x = b = 0;
							} else n.head && (n.head.extra = null);
							n.mode = 6;
						case 6:
							if (1024 & n.flags && (v < (E = n.length) && (E = v), E && (n.head && (F = n.head.extra_len - n.length, n.head.extra || (n.head.extra = Array(n.head.extra_len)), r.arraySet(n.head.extra, p, g, E, F)), 512 & n.flags && (n.check = a(n.check, p, E, g)), v -= E, g += E, n.length -= E), n.length)) break e;
							n.length = 0, n.mode = 7;
						case 7:
							if (2048 & n.flags) {
								if (v === 0) break e;
								for (E = 0; F = p[g + E++], n.head && F && n.length < 65536 && (n.head.name += String.fromCharCode(F)), F && E < v;);
								if (512 & n.flags && (n.check = a(n.check, p, E, g)), v -= E, g += E, F) break e;
							} else n.head && (n.head.name = null);
							n.length = 0, n.mode = 8;
						case 8:
							if (4096 & n.flags) {
								if (v === 0) break e;
								for (E = 0; F = p[g + E++], n.head && F && n.length < 65536 && (n.head.comment += String.fromCharCode(F)), F && E < v;);
								if (512 & n.flags && (n.check = a(n.check, p, E, g)), v -= E, g += E, F) break e;
							} else n.head && (n.head.comment = null);
							n.mode = 9;
						case 9:
							if (512 & n.flags) {
								for (; x < 16;) {
									if (v === 0) break e;
									v--, b += p[g++] << x, x += 8;
								}
								if (b !== (65535 & n.check)) {
									e.msg = "header crc mismatch", n.mode = 30;
									break;
								}
								x = b = 0;
							}
							n.head && (n.head.hcrc = n.flags >> 9 & 1, n.head.done = !0), e.adler = n.check = 0, n.mode = 12;
							break;
						case 10:
							for (; x < 32;) {
								if (v === 0) break e;
								v--, b += p[g++] << x, x += 8;
							}
							e.adler = n.check = h(b), x = b = 0, n.mode = 11;
						case 11:
							if (n.havedict === 0) return e.next_out = _, e.avail_out = y, e.next_in = g, e.avail_in = v, n.hold = b, n.bits = x, 2;
							e.adler = n.check = 1, n.mode = 12;
						case 12: if (t === 5 || t === 6) break e;
						case 13:
							if (n.last) {
								b >>>= 7 & x, x -= 7 & x, n.mode = 27;
								break;
							}
							for (; x < 3;) {
								if (v === 0) break e;
								v--, b += p[g++] << x, x += 8;
							}
							switch (n.last = 1 & b, --x, 3 & (b >>>= 1)) {
								case 0:
									n.mode = 14;
									break;
								case 1:
									if (w(n), n.mode = 20, t !== 6) break;
									b >>>= 2, x -= 2;
									break e;
								case 2:
									n.mode = 17;
									break;
								case 3: e.msg = "invalid block type", n.mode = 30;
							}
							b >>>= 2, x -= 2;
							break;
						case 14:
							for (b >>>= 7 & x, x -= 7 & x; x < 32;) {
								if (v === 0) break e;
								v--, b += p[g++] << x, x += 8;
							}
							if ((65535 & b) != (b >>> 16 ^ 65535)) {
								e.msg = "invalid stored block lengths", n.mode = 30;
								break;
							}
							if (n.length = 65535 & b, x = b = 0, n.mode = 15, t === 6) break e;
						case 15: n.mode = 16;
						case 16:
							if (E = n.length) {
								if (v < E && (E = v), y < E && (E = y), E === 0) break e;
								r.arraySet(m, p, g, E, _), v -= E, g += E, y -= E, _ += E, n.length -= E;
								break;
							}
							n.mode = 12;
							break;
						case 17:
							for (; x < 14;) {
								if (v === 0) break e;
								v--, b += p[g++] << x, x += 8;
							}
							if (n.nlen = 257 + (31 & b), b >>>= 5, x -= 5, n.ndist = 1 + (31 & b), b >>>= 5, x -= 5, n.ncode = 4 + (15 & b), b >>>= 4, x -= 4, 286 < n.nlen || 30 < n.ndist) {
								e.msg = "too many length or distance symbols", n.mode = 30;
								break;
							}
							n.have = 0, n.mode = 18;
						case 18:
							for (; n.have < n.ncode;) {
								for (; x < 3;) {
									if (v === 0) break e;
									v--, b += p[g++] << x, x += 8;
								}
								n.lens[V[n.have++]] = 7 & b, b >>>= 3, x -= 3;
							}
							for (; n.have < 19;) n.lens[V[n.have++]] = 0;
							if (n.lencode = n.lendyn, n.lenbits = 7, L = { bits: n.lenbits }, I = s(0, n.lens, 0, 19, n.lencode, 0, n.work, L), n.lenbits = L.bits, I) {
								e.msg = "invalid code lengths set", n.mode = 30;
								break;
							}
							n.have = 0, n.mode = 19;
						case 19:
							for (; n.have < n.nlen + n.ndist;) {
								for (; A = (z = n.lencode[b & (1 << n.lenbits) - 1]) >>> 16 & 255, j = 65535 & z, !((k = z >>> 24) <= x);) {
									if (v === 0) break e;
									v--, b += p[g++] << x, x += 8;
								}
								if (j < 16) b >>>= k, x -= k, n.lens[n.have++] = j;
								else {
									if (j === 16) {
										for (R = k + 2; x < R;) {
											if (v === 0) break e;
											v--, b += p[g++] << x, x += 8;
										}
										if (b >>>= k, x -= k, n.have === 0) {
											e.msg = "invalid bit length repeat", n.mode = 30;
											break;
										}
										F = n.lens[n.have - 1], E = 3 + (3 & b), b >>>= 2, x -= 2;
									} else if (j === 17) {
										for (R = k + 3; x < R;) {
											if (v === 0) break e;
											v--, b += p[g++] << x, x += 8;
										}
										x -= k, F = 0, E = 3 + (7 & (b >>>= k)), b >>>= 3, x -= 3;
									} else {
										for (R = k + 7; x < R;) {
											if (v === 0) break e;
											v--, b += p[g++] << x, x += 8;
										}
										x -= k, F = 0, E = 11 + (127 & (b >>>= k)), b >>>= 7, x -= 7;
									}
									if (n.have + E > n.nlen + n.ndist) {
										e.msg = "invalid bit length repeat", n.mode = 30;
										break;
									}
									for (; E--;) n.lens[n.have++] = F;
								}
							}
							if (n.mode === 30) break;
							if (n.lens[256] === 0) {
								e.msg = "invalid code -- missing end-of-block", n.mode = 30;
								break;
							}
							if (n.lenbits = 9, L = { bits: n.lenbits }, I = s(c, n.lens, 0, n.nlen, n.lencode, 0, n.work, L), n.lenbits = L.bits, I) {
								e.msg = "invalid literal/lengths set", n.mode = 30;
								break;
							}
							if (n.distbits = 6, n.distcode = n.distdyn, L = { bits: n.distbits }, I = s(l, n.lens, n.nlen, n.ndist, n.distcode, 0, n.work, L), n.distbits = L.bits, I) {
								e.msg = "invalid distances set", n.mode = 30;
								break;
							}
							if (n.mode = 20, t === 6) break e;
						case 20: n.mode = 21;
						case 21:
							if (6 <= v && 258 <= y) {
								e.next_out = _, e.avail_out = y, e.next_in = g, e.avail_in = v, n.hold = b, n.bits = x, o(e, C), _ = e.next_out, m = e.output, y = e.avail_out, g = e.next_in, p = e.input, v = e.avail_in, b = n.hold, x = n.bits, n.mode === 12 && (n.back = -1);
								break;
							}
							for (n.back = 0; A = (z = n.lencode[b & (1 << n.lenbits) - 1]) >>> 16 & 255, j = 65535 & z, !((k = z >>> 24) <= x);) {
								if (v === 0) break e;
								v--, b += p[g++] << x, x += 8;
							}
							if (A && !(240 & A)) {
								for (M = k, N = A, P = j; A = (z = n.lencode[P + ((b & (1 << M + N) - 1) >> M)]) >>> 16 & 255, j = 65535 & z, !(M + (k = z >>> 24) <= x);) {
									if (v === 0) break e;
									v--, b += p[g++] << x, x += 8;
								}
								b >>>= M, x -= M, n.back += M;
							}
							if (b >>>= k, x -= k, n.back += k, n.length = j, A === 0) {
								n.mode = 26;
								break;
							}
							if (32 & A) {
								n.back = -1, n.mode = 12;
								break;
							}
							if (64 & A) {
								e.msg = "invalid literal/length code", n.mode = 30;
								break;
							}
							n.extra = 15 & A, n.mode = 22;
						case 22:
							if (n.extra) {
								for (R = n.extra; x < R;) {
									if (v === 0) break e;
									v--, b += p[g++] << x, x += 8;
								}
								n.length += b & (1 << n.extra) - 1, b >>>= n.extra, x -= n.extra, n.back += n.extra;
							}
							n.was = n.length, n.mode = 23;
						case 23:
							for (; A = (z = n.distcode[b & (1 << n.distbits) - 1]) >>> 16 & 255, j = 65535 & z, !((k = z >>> 24) <= x);) {
								if (v === 0) break e;
								v--, b += p[g++] << x, x += 8;
							}
							if (!(240 & A)) {
								for (M = k, N = A, P = j; A = (z = n.distcode[P + ((b & (1 << M + N) - 1) >> M)]) >>> 16 & 255, j = 65535 & z, !(M + (k = z >>> 24) <= x);) {
									if (v === 0) break e;
									v--, b += p[g++] << x, x += 8;
								}
								b >>>= M, x -= M, n.back += M;
							}
							if (b >>>= k, x -= k, n.back += k, 64 & A) {
								e.msg = "invalid distance code", n.mode = 30;
								break;
							}
							n.offset = j, n.extra = 15 & A, n.mode = 24;
						case 24:
							if (n.extra) {
								for (R = n.extra; x < R;) {
									if (v === 0) break e;
									v--, b += p[g++] << x, x += 8;
								}
								n.offset += b & (1 << n.extra) - 1, b >>>= n.extra, x -= n.extra, n.back += n.extra;
							}
							if (n.offset > n.dmax) {
								e.msg = "invalid distance too far back", n.mode = 30;
								break;
							}
							n.mode = 25;
						case 25:
							if (y === 0) break e;
							if (E = C - y, n.offset > E) {
								if ((E = n.offset - E) > n.whave && n.sane) {
									e.msg = "invalid distance too far back", n.mode = 30;
									break;
								}
								D = E > n.wnext ? (E -= n.wnext, n.wsize - E) : n.wnext - E, E > n.length && (E = n.length), O = n.window;
							} else O = m, D = _ - n.offset, E = n.length;
							for (y < E && (E = y), y -= E, n.length -= E; m[_++] = O[D++], --E;);
							n.length === 0 && (n.mode = 21);
							break;
						case 26:
							if (y === 0) break e;
							m[_++] = n.length, y--, n.mode = 21;
							break;
						case 27:
							if (n.wrap) {
								for (; x < 32;) {
									if (v === 0) break e;
									v--, b |= p[g++] << x, x += 8;
								}
								if (C -= y, e.total_out += C, n.total += C, C && (e.adler = n.check = n.flags ? a(n.check, m, C, _ - C) : i(n.check, m, C, _ - C)), C = y, (n.flags ? b : h(b)) !== n.check) {
									e.msg = "incorrect data check", n.mode = 30;
									break;
								}
								x = b = 0;
							}
							n.mode = 28;
						case 28:
							if (n.wrap && n.flags) {
								for (; x < 32;) {
									if (v === 0) break e;
									v--, b += p[g++] << x, x += 8;
								}
								if (b !== (4294967295 & n.total)) {
									e.msg = "incorrect length check", n.mode = 30;
									break;
								}
								x = b = 0;
							}
							n.mode = 29;
						case 29:
							I = 1;
							break e;
						case 30:
							I = -3;
							break e;
						case 31: return -4;
						case 32:
						default: return d;
					}
					return e.next_out = _, e.avail_out = y, e.next_in = g, e.avail_in = v, n.hold = b, n.bits = x, (n.wsize || C !== e.avail_out && n.mode < 30 && (n.mode < 27 || t !== 4)) && T(e, e.output, e.next_out, C - e.avail_out) ? (n.mode = 31, -4) : (S -= e.avail_in, C -= e.avail_out, e.total_in += S, e.total_out += C, n.total += C, n.wrap && C && (e.adler = n.check = n.flags ? a(n.check, m, C, e.next_out - C) : i(n.check, m, C, e.next_out - C)), e.data_type = n.bits + (n.last ? 64 : 0) + (n.mode === 12 ? 128 : 0) + (n.mode === 20 || n.mode === 15 ? 256 : 0), (S == 0 && C === 0 || t === 4) && I === u && (I = -5), I);
				}, n.inflateEnd = function(e) {
					if (!e || !e.state) return d;
					var t = e.state;
					return t.window && (t.window = null), e.state = null, u;
				}, n.inflateGetHeader = function(e, t) {
					var n;
					return e && e.state && 2 & (n = e.state).wrap ? ((n.head = t).done = !1, u) : d;
				}, n.inflateSetDictionary = function(e, t) {
					var n, r = t.length;
					return e && e.state ? (n = e.state).wrap !== 0 && n.mode !== 11 ? d : n.mode === 11 && i(1, t, r, 0) !== n.check ? -3 : T(e, t, r, r) ? (n.mode = 31, -4) : (n.havedict = 1, u) : d;
				}, n.inflateInfo = "pako inflate (from Nodeca project)";
			}, {
				"../utils/common": 41,
				"./adler32": 43,
				"./crc32": 45,
				"./inffast": 48,
				"./inftrees": 50
			}],
			50: [function(e, t, n) {
				var r = e("../utils/common"), i = [
					3,
					4,
					5,
					6,
					7,
					8,
					9,
					10,
					11,
					13,
					15,
					17,
					19,
					23,
					27,
					31,
					35,
					43,
					51,
					59,
					67,
					83,
					99,
					115,
					131,
					163,
					195,
					227,
					258,
					0,
					0
				], a = [
					16,
					16,
					16,
					16,
					16,
					16,
					16,
					16,
					17,
					17,
					17,
					17,
					18,
					18,
					18,
					18,
					19,
					19,
					19,
					19,
					20,
					20,
					20,
					20,
					21,
					21,
					21,
					21,
					16,
					72,
					78
				], o = [
					1,
					2,
					3,
					4,
					5,
					7,
					9,
					13,
					17,
					25,
					33,
					49,
					65,
					97,
					129,
					193,
					257,
					385,
					513,
					769,
					1025,
					1537,
					2049,
					3073,
					4097,
					6145,
					8193,
					12289,
					16385,
					24577,
					0,
					0
				], s = [
					16,
					16,
					16,
					16,
					17,
					17,
					18,
					18,
					19,
					19,
					20,
					20,
					21,
					21,
					22,
					22,
					23,
					23,
					24,
					24,
					25,
					25,
					26,
					26,
					27,
					27,
					28,
					28,
					29,
					29,
					64,
					64
				];
				t.exports = function(e, t, n, c, l, u, d, f) {
					var p, m, h, g, _, v, y, b, x, S = f.bits, C = 0, w = 0, T = 0, E = 0, D = 0, O = 0, k = 0, A = 0, j = 0, M = 0, N = null, P = 0, F = new r.Buf16(16), I = new r.Buf16(16), L = null, R = 0;
					for (C = 0; C <= 15; C++) F[C] = 0;
					for (w = 0; w < c; w++) F[t[n + w]]++;
					for (D = S, E = 15; 1 <= E && F[E] === 0; E--);
					if (E < D && (D = E), E === 0) return l[u++] = 20971520, l[u++] = 20971520, f.bits = 1, 0;
					for (T = 1; T < E && F[T] === 0; T++);
					for (D < T && (D = T), C = A = 1; C <= 15; C++) if (A <<= 1, (A -= F[C]) < 0) return -1;
					if (0 < A && (e === 0 || E !== 1)) return -1;
					for (I[1] = 0, C = 1; C < 15; C++) I[C + 1] = I[C] + F[C];
					for (w = 0; w < c; w++) t[n + w] !== 0 && (d[I[t[n + w]]++] = w);
					if (v = e === 0 ? (N = L = d, 19) : e === 1 ? (N = i, P -= 257, L = a, R -= 257, 256) : (N = o, L = s, -1), C = T, _ = u, k = w = M = 0, h = -1, g = (j = 1 << (O = D)) - 1, e === 1 && 852 < j || e === 2 && 592 < j) return 1;
					for (;;) {
						for (y = C - k, x = d[w] < v ? (b = 0, d[w]) : d[w] > v ? (b = L[R + d[w]], N[P + d[w]]) : (b = 96, 0), p = 1 << C - k, T = m = 1 << O; l[_ + (M >> k) + (m -= p)] = y << 24 | b << 16 | x | 0, m !== 0;);
						for (p = 1 << C - 1; M & p;) p >>= 1;
						if (p === 0 ? M = 0 : (M &= p - 1, M += p), w++, --F[C] == 0) {
							if (C === E) break;
							C = t[n + d[w]];
						}
						if (D < C && (M & g) !== h) {
							for (k === 0 && (k = D), _ += T, A = 1 << (O = C - k); O + k < E && !((A -= F[O + k]) <= 0);) O++, A <<= 1;
							if (j += 1 << O, e === 1 && 852 < j || e === 2 && 592 < j) return 1;
							l[h = M & g] = D << 24 | O << 16 | _ - u | 0;
						}
					}
					return M !== 0 && (l[_ + M] = C - k << 24 | 4194304), f.bits = D, 0;
				};
			}, { "../utils/common": 41 }],
			51: [function(e, t, n) {
				t.exports = {
					2: "need dictionary",
					1: "stream end",
					0: "",
					"-1": "file error",
					"-2": "stream error",
					"-3": "data error",
					"-4": "insufficient memory",
					"-5": "buffer error",
					"-6": "incompatible version"
				};
			}, {}],
			52: [function(e, t, n) {
				var r = e("../utils/common"), i = 0, a = 1;
				function o(e) {
					for (var t = e.length; 0 <= --t;) e[t] = 0;
				}
				var s = 0, c = 29, l = 256, u = l + 1 + c, d = 30, f = 19, p = 2 * u + 1, m = 15, h = 16, g = 7, _ = 256, v = 16, y = 17, b = 18, x = [
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					1,
					1,
					1,
					1,
					2,
					2,
					2,
					2,
					3,
					3,
					3,
					3,
					4,
					4,
					4,
					4,
					5,
					5,
					5,
					5,
					0
				], S = [
					0,
					0,
					0,
					0,
					1,
					1,
					2,
					2,
					3,
					3,
					4,
					4,
					5,
					5,
					6,
					6,
					7,
					7,
					8,
					8,
					9,
					9,
					10,
					10,
					11,
					11,
					12,
					12,
					13,
					13
				], C = [
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					2,
					3,
					7
				], w = [
					16,
					17,
					18,
					0,
					8,
					7,
					9,
					6,
					10,
					5,
					11,
					4,
					12,
					3,
					13,
					2,
					14,
					1,
					15
				], T = Array(2 * (u + 2));
				o(T);
				var E = Array(2 * d);
				o(E);
				var D = Array(512);
				o(D);
				var O = Array(256);
				o(O);
				var k = Array(c);
				o(k);
				var A, j, M, N = Array(d);
				function P(e, t, n, r, i) {
					this.static_tree = e, this.extra_bits = t, this.extra_base = n, this.elems = r, this.max_length = i, this.has_stree = e && e.length;
				}
				function F(e, t) {
					this.dyn_tree = e, this.max_code = 0, this.stat_desc = t;
				}
				function I(e) {
					return e < 256 ? D[e] : D[256 + (e >>> 7)];
				}
				function L(e, t) {
					e.pending_buf[e.pending++] = 255 & t, e.pending_buf[e.pending++] = t >>> 8 & 255;
				}
				function R(e, t, n) {
					e.bi_valid > h - n ? (e.bi_buf |= t << e.bi_valid & 65535, L(e, e.bi_buf), e.bi_buf = t >> h - e.bi_valid, e.bi_valid += n - h) : (e.bi_buf |= t << e.bi_valid & 65535, e.bi_valid += n);
				}
				function z(e, t, n) {
					R(e, n[2 * t], n[2 * t + 1]);
				}
				function B(e, t) {
					for (var n = 0; n |= 1 & e, e >>>= 1, n <<= 1, 0 < --t;);
					return n >>> 1;
				}
				function V(e, t, n) {
					var r, i, a = Array(m + 1), o = 0;
					for (r = 1; r <= m; r++) a[r] = o = o + n[r - 1] << 1;
					for (i = 0; i <= t; i++) {
						var s = e[2 * i + 1];
						s !== 0 && (e[2 * i] = B(a[s]++, s));
					}
				}
				function H(e) {
					var t;
					for (t = 0; t < u; t++) e.dyn_ltree[2 * t] = 0;
					for (t = 0; t < d; t++) e.dyn_dtree[2 * t] = 0;
					for (t = 0; t < f; t++) e.bl_tree[2 * t] = 0;
					e.dyn_ltree[2 * _] = 1, e.opt_len = e.static_len = 0, e.last_lit = e.matches = 0;
				}
				function U(e) {
					8 < e.bi_valid ? L(e, e.bi_buf) : 0 < e.bi_valid && (e.pending_buf[e.pending++] = e.bi_buf), e.bi_buf = 0, e.bi_valid = 0;
				}
				function W(e, t, n, r) {
					var i = 2 * t, a = 2 * n;
					return e[i] < e[a] || e[i] === e[a] && r[t] <= r[n];
				}
				function ee(e, t, n) {
					for (var r = e.heap[n], i = n << 1; i <= e.heap_len && (i < e.heap_len && W(t, e.heap[i + 1], e.heap[i], e.depth) && i++, !W(t, r, e.heap[i], e.depth));) e.heap[n] = e.heap[i], n = i, i <<= 1;
					e.heap[n] = r;
				}
				function te(e, t, n) {
					var r, i, a, o, s = 0;
					if (e.last_lit !== 0) for (; r = e.pending_buf[e.d_buf + 2 * s] << 8 | e.pending_buf[e.d_buf + 2 * s + 1], i = e.pending_buf[e.l_buf + s], s++, r === 0 ? z(e, i, t) : (z(e, (a = O[i]) + l + 1, t), (o = x[a]) !== 0 && R(e, i -= k[a], o), z(e, a = I(--r), n), (o = S[a]) !== 0 && R(e, r -= N[a], o)), s < e.last_lit;);
					z(e, _, t);
				}
				function ne(e, t) {
					var n, r, i, a = t.dyn_tree, o = t.stat_desc.static_tree, s = t.stat_desc.has_stree, c = t.stat_desc.elems, l = -1;
					for (e.heap_len = 0, e.heap_max = p, n = 0; n < c; n++) a[2 * n] === 0 ? a[2 * n + 1] = 0 : (e.heap[++e.heap_len] = l = n, e.depth[n] = 0);
					for (; e.heap_len < 2;) a[2 * (i = e.heap[++e.heap_len] = l < 2 ? ++l : 0)] = 1, e.depth[i] = 0, e.opt_len--, s && (e.static_len -= o[2 * i + 1]);
					for (t.max_code = l, n = e.heap_len >> 1; 1 <= n; n--) ee(e, a, n);
					for (i = c; n = e.heap[1], e.heap[1] = e.heap[e.heap_len--], ee(e, a, 1), r = e.heap[1], e.heap[--e.heap_max] = n, e.heap[--e.heap_max] = r, a[2 * i] = a[2 * n] + a[2 * r], e.depth[i] = (e.depth[n] >= e.depth[r] ? e.depth[n] : e.depth[r]) + 1, a[2 * n + 1] = a[2 * r + 1] = i, e.heap[1] = i++, ee(e, a, 1), 2 <= e.heap_len;);
					e.heap[--e.heap_max] = e.heap[1], function(e, t) {
						var n, r, i, a, o, s, c = t.dyn_tree, l = t.max_code, u = t.stat_desc.static_tree, d = t.stat_desc.has_stree, f = t.stat_desc.extra_bits, h = t.stat_desc.extra_base, g = t.stat_desc.max_length, _ = 0;
						for (a = 0; a <= m; a++) e.bl_count[a] = 0;
						for (c[2 * e.heap[e.heap_max] + 1] = 0, n = e.heap_max + 1; n < p; n++) g < (a = c[2 * c[2 * (r = e.heap[n]) + 1] + 1] + 1) && (a = g, _++), c[2 * r + 1] = a, l < r || (e.bl_count[a]++, o = 0, h <= r && (o = f[r - h]), s = c[2 * r], e.opt_len += s * (a + o), d && (e.static_len += s * (u[2 * r + 1] + o)));
						if (_ !== 0) {
							do {
								for (a = g - 1; e.bl_count[a] === 0;) a--;
								e.bl_count[a]--, e.bl_count[a + 1] += 2, e.bl_count[g]--, _ -= 2;
							} while (0 < _);
							for (a = g; a !== 0; a--) for (r = e.bl_count[a]; r !== 0;) l < (i = e.heap[--n]) || (c[2 * i + 1] !== a && (e.opt_len += (a - c[2 * i + 1]) * c[2 * i], c[2 * i + 1] = a), r--);
						}
					}(e, t), V(a, l, e.bl_count);
				}
				function re(e, t, n) {
					var r, i, a = -1, o = t[1], s = 0, c = 7, l = 4;
					for (o === 0 && (c = 138, l = 3), t[2 * (n + 1) + 1] = 65535, r = 0; r <= n; r++) i = o, o = t[2 * (r + 1) + 1], ++s < c && i === o || (s < l ? e.bl_tree[2 * i] += s : i === 0 ? s <= 10 ? e.bl_tree[2 * y]++ : e.bl_tree[2 * b]++ : (i !== a && e.bl_tree[2 * i]++, e.bl_tree[2 * v]++), a = i, l = (s = 0) === o ? (c = 138, 3) : i === o ? (c = 6, 3) : (c = 7, 4));
				}
				function G(e, t, n) {
					var r, i, a = -1, o = t[1], s = 0, c = 7, l = 4;
					for (o === 0 && (c = 138, l = 3), r = 0; r <= n; r++) if (i = o, o = t[2 * (r + 1) + 1], !(++s < c && i === o)) {
						if (s < l) for (; z(e, i, e.bl_tree), --s != 0;);
						else i === 0 ? s <= 10 ? (z(e, y, e.bl_tree), R(e, s - 3, 3)) : (z(e, b, e.bl_tree), R(e, s - 11, 7)) : (i !== a && (z(e, i, e.bl_tree), s--), z(e, v, e.bl_tree), R(e, s - 3, 2));
						a = i, l = (s = 0) === o ? (c = 138, 3) : i === o ? (c = 6, 3) : (c = 7, 4);
					}
				}
				o(N);
				var ie = !1;
				function ae(e, t, n, i) {
					R(e, (s << 1) + +!!i, 3), function(e, t, n, i) {
						U(e), i && (L(e, n), L(e, ~n)), r.arraySet(e.pending_buf, e.window, t, n, e.pending), e.pending += n;
					}(e, t, n, !0);
				}
				n._tr_init = function(e) {
					ie || (function() {
						var e, t, n, r, i, a = Array(m + 1);
						for (r = n = 0; r < c - 1; r++) for (k[r] = n, e = 0; e < 1 << x[r]; e++) O[n++] = r;
						for (O[n - 1] = r, r = i = 0; r < 16; r++) for (N[r] = i, e = 0; e < 1 << S[r]; e++) D[i++] = r;
						for (i >>= 7; r < d; r++) for (N[r] = i << 7, e = 0; e < 1 << S[r] - 7; e++) D[256 + i++] = r;
						for (t = 0; t <= m; t++) a[t] = 0;
						for (e = 0; e <= 143;) T[2 * e + 1] = 8, e++, a[8]++;
						for (; e <= 255;) T[2 * e + 1] = 9, e++, a[9]++;
						for (; e <= 279;) T[2 * e + 1] = 7, e++, a[7]++;
						for (; e <= 287;) T[2 * e + 1] = 8, e++, a[8]++;
						for (V(T, u + 1, a), e = 0; e < d; e++) E[2 * e + 1] = 5, E[2 * e] = B(e, 5);
						A = new P(T, x, l + 1, u, m), j = new P(E, S, 0, d, m), M = new P([], C, 0, f, g);
					}(), ie = !0), e.l_desc = new F(e.dyn_ltree, A), e.d_desc = new F(e.dyn_dtree, j), e.bl_desc = new F(e.bl_tree, M), e.bi_buf = 0, e.bi_valid = 0, H(e);
				}, n._tr_stored_block = ae, n._tr_flush_block = function(e, t, n, r) {
					var o, s, c = 0;
					0 < e.level ? (e.strm.data_type === 2 && (e.strm.data_type = function(e) {
						var t, n = 4093624447;
						for (t = 0; t <= 31; t++, n >>>= 1) if (1 & n && e.dyn_ltree[2 * t] !== 0) return i;
						if (e.dyn_ltree[18] !== 0 || e.dyn_ltree[20] !== 0 || e.dyn_ltree[26] !== 0) return a;
						for (t = 32; t < l; t++) if (e.dyn_ltree[2 * t] !== 0) return a;
						return i;
					}(e)), ne(e, e.l_desc), ne(e, e.d_desc), c = function(e) {
						var t;
						for (re(e, e.dyn_ltree, e.l_desc.max_code), re(e, e.dyn_dtree, e.d_desc.max_code), ne(e, e.bl_desc), t = f - 1; 3 <= t && e.bl_tree[2 * w[t] + 1] === 0; t--);
						return e.opt_len += 3 * (t + 1) + 5 + 5 + 4, t;
					}(e), o = e.opt_len + 3 + 7 >>> 3, (s = e.static_len + 3 + 7 >>> 3) <= o && (o = s)) : o = s = n + 5, n + 4 <= o && t !== -1 ? ae(e, t, n, r) : e.strategy === 4 || s === o ? (R(e, 2 + +!!r, 3), te(e, T, E)) : (R(e, 4 + +!!r, 3), function(e, t, n, r) {
						var i;
						for (R(e, t - 257, 5), R(e, n - 1, 5), R(e, r - 4, 4), i = 0; i < r; i++) R(e, e.bl_tree[2 * w[i] + 1], 3);
						G(e, e.dyn_ltree, t - 1), G(e, e.dyn_dtree, n - 1);
					}(e, e.l_desc.max_code + 1, e.d_desc.max_code + 1, c + 1), te(e, e.dyn_ltree, e.dyn_dtree)), H(e), r && U(e);
				}, n._tr_tally = function(e, t, n) {
					return e.pending_buf[e.d_buf + 2 * e.last_lit] = t >>> 8 & 255, e.pending_buf[e.d_buf + 2 * e.last_lit + 1] = 255 & t, e.pending_buf[e.l_buf + e.last_lit] = 255 & n, e.last_lit++, t === 0 ? e.dyn_ltree[2 * n]++ : (e.matches++, t--, e.dyn_ltree[2 * (O[n] + l + 1)]++, e.dyn_dtree[2 * I(t)]++), e.last_lit === e.lit_bufsize - 1;
				}, n._tr_align = function(e) {
					R(e, 2, 3), z(e, _, T), function(e) {
						e.bi_valid === 16 ? (L(e, e.bi_buf), e.bi_buf = 0, e.bi_valid = 0) : 8 <= e.bi_valid && (e.pending_buf[e.pending++] = 255 & e.bi_buf, e.bi_buf >>= 8, e.bi_valid -= 8);
					}(e);
				};
			}, { "../utils/common": 41 }],
			53: [function(e, t, n) {
				t.exports = function() {
					this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
				};
			}, {}],
			54: [function(e, t, n) {
				(function(e) {
					(function(e, t) {
						if (!e.setImmediate) {
							var n, r, i, a, o = 1, s = {}, c = !1, l = e.document, u = Object.getPrototypeOf && Object.getPrototypeOf(e);
							u = u && u.setTimeout ? u : e, n = {}.toString.call(e.process) === "[object process]" ? function(e) {
								process.nextTick(function() {
									f(e);
								});
							} : function() {
								if (e.postMessage && !e.importScripts) {
									var t = !0, n = e.onmessage;
									return e.onmessage = function() {
										t = !1;
									}, e.postMessage("", "*"), e.onmessage = n, t;
								}
							}() ? (a = "setImmediate$" + Math.random() + "$", e.addEventListener ? e.addEventListener("message", p, !1) : e.attachEvent("onmessage", p), function(t) {
								e.postMessage(a + t, "*");
							}) : e.MessageChannel ? ((i = new MessageChannel()).port1.onmessage = function(e) {
								f(e.data);
							}, function(e) {
								i.port2.postMessage(e);
							}) : l && "onreadystatechange" in l.createElement("script") ? (r = l.documentElement, function(e) {
								var t = l.createElement("script");
								t.onreadystatechange = function() {
									f(e), t.onreadystatechange = null, r.removeChild(t), t = null;
								}, r.appendChild(t);
							}) : function(e) {
								setTimeout(f, 0, e);
							}, u.setImmediate = function(e) {
								typeof e != "function" && (e = Function("" + e));
								for (var t = Array(arguments.length - 1), r = 0; r < t.length; r++) t[r] = arguments[r + 1];
								return s[o] = {
									callback: e,
									args: t
								}, n(o), o++;
							}, u.clearImmediate = d;
						}
						function d(e) {
							delete s[e];
						}
						function f(e) {
							if (c) setTimeout(f, 0, e);
							else {
								var n = s[e];
								if (n) {
									c = !0;
									try {
										(function(e) {
											var n = e.callback, r = e.args;
											switch (r.length) {
												case 0:
													n();
													break;
												case 1:
													n(r[0]);
													break;
												case 2:
													n(r[0], r[1]);
													break;
												case 3:
													n(r[0], r[1], r[2]);
													break;
												default: n.apply(t, r);
											}
										})(n);
									} finally {
										d(e), c = !1;
									}
								}
							}
						}
						function p(t) {
							t.source === e && typeof t.data == "string" && t.data.indexOf(a) === 0 && f(+t.data.slice(a.length));
						}
					})(typeof self > "u" ? e === void 0 ? this : e : self);
				}).call(this, typeof global < "u" ? global : typeof self < "u" ? self : typeof window < "u" ? window : {});
			}, {}]
		}, {}, [10])(10);
	});
})), Sv = bv(), Cv = /* @__PURE__ */ c(xv(), 1), wv = "/chart", Tv = "/drawing", Ev = "/worksheet", Dv = {
	areaChart: "area",
	area3DChart: "area",
	barChart: "bar",
	bar3DChart: "bar",
	doughnutChart: "doughnut",
	lineChart: "line",
	line3DChart: "line",
	pieChart: "pie",
	pie3DChart: "pie",
	radarChart: "radar",
	scatterChart: "scatter"
}, Ov = {
	b: "bottom",
	l: "left",
	r: "right",
	t: "top",
	tr: "top"
}, kv = {
	accent1: "#4472c4",
	accent2: "#ed7d31",
	accent3: "#a5a5a5",
	accent4: "#ffc000",
	accent5: "#5b9bd5",
	accent6: "#70ad47",
	dk1: "#000000",
	dk2: "#44546a",
	lt1: "#ffffff",
	lt2: "#e7e6e6",
	tx1: "#000000",
	tx2: "#44546a"
}, Av = (e) => {
	let t = e.localName || e.nodeName;
	return t.split(":").pop() || t;
}, jv = (e) => e ? Array.from(e.childNodes).filter((e) => e.nodeType === 1) : [], Mv = (e, t) => jv(e).filter((e) => Av(e) === t), Nv = (e, t) => Mv(e, t)[0], Pv = (e, t) => {
	let n = [], r = (e) => {
		jv(e).forEach((e) => {
			Av(e) === t && n.push(e), r(e);
		});
	};
	return e && r(e), n;
}, Fv = (e, t) => Pv(e, t)[0], Iv = (e, t = "val") => {
	let n = Number(e == null ? void 0 : e.getAttribute(t));
	return Number.isFinite(n) ? n : 0;
}, Lv = (e) => {
	var t;
	return (e == null || (t = e.textContent) == null ? void 0 : t.trim()) || "";
}, Rv = (e) => e && (e.getAttribute("r:id") || e.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id")) || "", zv = (e, t) => {
	let n = e.includes("/") ? e.slice(0, e.lastIndexOf("/")) : "", r = (t.startsWith("/") ? t.slice(1) : `${n}/${t}`).split("/"), i = [];
	for (let e of r) if (!(!e || e === ".")) {
		if (e === "..") {
			i.pop();
			continue;
		}
		i.push(e);
	}
	return i.join("/");
}, Bv = (e) => {
	let t = e.lastIndexOf("/"), n = t >= 0 ? e.slice(0, t) : "", r = t >= 0 ? e.slice(t + 1) : e;
	return `${n ? `${n}/` : ""}_rels/${r}.rels`;
}, Vv = (e) => new Sv.DOMParser().parseFromString(e.replace(/^[\uFEFF\s]+/, ""), "application/xml"), Hv = async (e, t) => {
	let n = e.file(t);
	return n ? Vv(await n.async("text")) : null;
}, Uv = async (e, t) => {
	let n = await Hv(e, Bv(t));
	return n ? Pv(n.documentElement, "Relationship").flatMap((e) => {
		let n = e.getAttribute("Id") || "", r = e.getAttribute("Target") || "", i = e.getAttribute("Type") || "";
		return !n || !r || e.getAttribute("TargetMode") === "External" ? [] : [{
			id: n,
			target: zv(t, r),
			type: i
		}];
	}) : [];
}, Wv = (e, t) => e.find((e) => e.id === t), Gv = (e) => {
	if (e) return {
		row: Number(Lv(Nv(e, "row"))) || 0,
		col: Number(Lv(Nv(e, "col"))) || 0,
		rowOff: Number(Lv(Nv(e, "rowOff"))) || 0,
		colOff: Number(Lv(Nv(e, "colOff"))) || 0
	};
}, Kv = (e) => e ? Pv(e, "pt").map((e) => ({
	index: Number(e.getAttribute("idx")) || 0,
	value: Lv(Nv(e, "v")) || Lv(Fv(e, "v"))
})).sort((e, t) => e.index - t.index).map((e) => e.value) : [], qv = (e) => {
	if (!e) return "";
	let t = Kv(e);
	return t.length ? t.join(" ").trim() : Pv(e, "t").map(Lv).filter(Boolean).join(" ").trim() || Lv(Fv(e, "v"));
}, Jv = (e) => {
	var t, n;
	let r = Fv(Nv(e, "spPr"), "solidFill"), i = (t = Fv(r, "srgbClr")) == null ? void 0 : t.getAttribute("val");
	return i && /^[0-9a-f]{6}$/i.test(i) ? `#${i}` : kv[((n = Fv(r, "schemeClr")) == null ? void 0 : n.getAttribute("val")) || ""];
}, Yv = (e) => Mv(e, "ser").map((e, t) => {
	let n = Nv(e, "tx"), r = Nv(e, "cat") || Nv(e, "xVal"), i = Nv(e, "val") || Nv(e, "yVal"), a = Kv(r), o = Kv(i).map(Number).filter(Number.isFinite);
	return {
		name: qv(n) || `Series ${t + 1}`,
		categories: a.length ? a : o.map((e, t) => `${t + 1}`),
		values: o,
		color: Jv(e)
	};
}), Xv = (e) => {
	var t, n, r;
	let i = e.documentElement, a = Fv(i, "chart"), o = Nv(a, "plotArea") || Fv(a, "plotArea"), s = jv(o).map((e) => ({
		element: e,
		type: Dv[Av(e)]
	})).find((e) => e.type);
	if (!s) return null;
	let c = Nv(a, "legend"), l = ((t = Nv(c, "legendPos")) == null ? void 0 : t.getAttribute("val")) || "", u = Nv(o, "catAx"), d = Nv(o, "valAx"), f = ((n = Nv(s.element, "barDir")) == null ? void 0 : n.getAttribute("val")) === "bar" ? "bar" : "column";
	return {
		type: s.type,
		title: qv(Nv(a, "title")) || void 0,
		categoryAxisTitle: qv(Nv(u, "title")) || void 0,
		valueAxisTitle: qv(Nv(d, "title")) || void 0,
		barDirection: f,
		grouping: ((r = Nv(s.element, "grouping")) == null ? void 0 : r.getAttribute("val")) || void 0,
		legendPosition: c ? Ov[l] || "bottom" : void 0,
		series: Yv(s.element)
	};
}, Zv = async (e, t) => {
	let [n, r] = await Promise.all([Hv(e, t), Uv(e, t)]);
	if (!n) return [];
	let i = jv(n.documentElement).filter((e) => Av(e).endsWith("Anchor"));
	return (await Promise.all(i.map(async (t, n) => {
		var i;
		let a = Wv(r, Rv(Fv(t, "chart")));
		if (!(a != null && a.type.endsWith(wv))) return null;
		let o = await Hv(e, a.target), s = o ? Xv(o) : null;
		if (!s || !s.series.length || s.series.every((e) => !e.values.length)) return null;
		let c = Gv(Nv(t, "from")) || {
			row: 0,
			col: 0,
			rowOff: Iv(Nv(t, "pos"), "y"),
			colOff: Iv(Nv(t, "pos"), "x")
		}, l = Gv(Nv(t, "to")), u = Nv(t, "ext"), d = (i = Fv(t, "cNvPr")) == null ? void 0 : i.getAttribute("name");
		return {
			...s,
			id: d || a.target || `chart-${n + 1}`,
			from: c,
			to: l,
			ext: u ? {
				width: Iv(u, "cx"),
				height: Iv(u, "cy")
			} : void 0
		};
	}))).filter((e) => e !== null);
}, Qv = async (e) => {
	let t = await Cv.default.loadAsync(e), n = "xl/workbook.xml", [r, i] = await Promise.all([Hv(t, n), Uv(t, n)]), a = {};
	if (!r) return a;
	for (let e of Pv(r.documentElement, "sheet")) {
		let n = e.getAttribute("name") || "", r = Wv(i, Rv(e));
		if (!n || !(r != null && r.type.endsWith(Ev))) continue;
		let o = await Uv(t, r.target), s = Array.from(new Set(o.filter((e) => e.type.endsWith(Tv)).map((e) => e.target))), c = (await Promise.all(s.map((e) => Zv(t, e)))).flat();
		c.length && (a[n] = c);
	}
	return a;
}, $v = new Set(["csv", "tsv"]), ey = new Set(["text/csv", "text/tab-separated-values"]), ty = (e) => String(e || "").trim().toLowerCase().replace(/^\./, "").split(/[?#;]/, 1)[0], ny = (e) => {
	let t = String(e || "").trim().toLowerCase().split(/[?#]/, 1)[0], n = Math.max(t.lastIndexOf("/"), t.lastIndexOf("\\")), r = t.lastIndexOf(".");
	return r > n ? t.slice(r + 1) : "";
}, ry = ({ fileType: e, filename: t }) => {
	let n = ty(e);
	return n ? $v.has(n) || ey.has(n) : $v.has(ny(t));
}, iy = (e, t) => {
	if (typeof TextDecoder > "u") throw Error("Spreadsheet text decoding requires the browser TextDecoder API.");
	try {
		return new TextDecoder(t).decode(e);
	} catch (e) {
		throw t === "gb18030" && e instanceof RangeError ? Error("This browser does not provide GB18030 text decoding. Use a current browser or set spreadsheet.textEncoding to \"utf-8\".") : e;
	}
}, ay = (e) => e.length >= 3 && e[0] === 239 && e[1] === 187 && e[2] === 191, oy = (e) => e !== void 0 && e >= 128 && e <= 191, sy = (e) => {
	for (let t = 0; t < e.length;) {
		let n = e[t];
		if (n === void 0) return !1;
		if (n <= 127) {
			t += 1;
			continue;
		}
		let r = e[t + 1], i = e[t + 2], a = e[t + 3];
		if (n >= 194 && n <= 223 && oy(r)) {
			t += 2;
			continue;
		}
		if (n === 224 && r !== void 0 && r >= 160 && r <= 191 && oy(i)) {
			t += 3;
			continue;
		}
		if ((n >= 225 && n <= 236 || n >= 238 && n <= 239) && oy(r) && oy(i)) {
			t += 3;
			continue;
		}
		if (n === 237 && r !== void 0 && r >= 128 && r <= 159 && oy(i)) {
			t += 3;
			continue;
		}
		if (n === 240 && r !== void 0 && r >= 144 && r <= 191 && oy(i) && oy(a)) {
			t += 4;
			continue;
		}
		if (n >= 241 && n <= 243 && oy(r) && oy(i) && oy(a)) {
			t += 4;
			continue;
		}
		if (n === 244 && r !== void 0 && r >= 128 && r <= 143 && oy(i) && oy(a)) {
			t += 4;
			continue;
		}
		return !1;
	}
	return !0;
}, cy = (e) => {
	let t = String(e || "auto").trim().toLowerCase().replace("_", "-");
	return t === "utf8" || t === "utf-8" ? "utf-8" : t === "gbk" || t === "cp936" || t === "gb2312" ? "gbk" : t === "gb18030" ? "gb18030" : "auto";
}, ly = (e, t = "auto") => {
	let n = new Uint8Array(e), r = cy(t);
	return r === "utf-8" ? {
		text: iy(ay(n) ? n.subarray(3) : n, "utf-8"),
		encoding: "utf-8"
	} : r === "gbk" || r === "gb18030" ? {
		text: iy(n, "gb18030"),
		encoding: "gb18030"
	} : ay(n) ? {
		text: iy(n.subarray(3), "utf-8"),
		encoding: "utf-8"
	} : sy(n) ? {
		text: iy(n, "utf-8"),
		encoding: "utf-8"
	} : {
		text: iy(n, "gb18030"),
		encoding: "gb18030"
	};
}, uy = (e, t = {}) => {
	if (!ry(t)) return {
		kind: "binary",
		data: e
	};
	let n = ly(e, t.textEncoding);
	return {
		kind: "text",
		data: n.text,
		encoding: n.encoding
	};
}, dy = "xl/workbook.xml", fy = "[Content_Types].xml", py = "/worksheet", my = "/sheetmetadata", hy = "/rdrichvalue", gy = "/rdrichvaluestructure", _y = "/richvaluerel", vy = "http://www.wps.cn/officeDocument/2017/relationships/cellimage", yy = "XLRICHVALUE", by = "_localImage", xy = "LocalImageIdentifier", Sy = (e) => {
	var t;
	return (e == null || (t = e.textContent) == null ? void 0 : t.trim()) || "";
}, Cy = (e, t) => jv(e).filter((e) => Av(e) === t), wy = (e, t) => Pv(e, t)[0], Ty = (e, t) => e.find((e) => e.type.toLowerCase().endsWith(t)), Ey = (e) => {
	let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map();
	return e ? (Pv(e.documentElement, "Default").forEach((e) => {
		let n = (e.getAttribute("Extension") || "").toLowerCase(), r = e.getAttribute("ContentType") || "";
		n && r && t.set(n, r);
	}), Pv(e.documentElement, "Override").forEach((e) => {
		let t = (e.getAttribute("PartName") || "").replace(/^\//, ""), r = e.getAttribute("ContentType") || "";
		t && r && n.set(t, r);
	}), {
		defaults: t,
		overrides: n
	}) : {
		defaults: t,
		overrides: n
	};
}, Dy = (e) => {
	var t;
	switch (((t = e.split(".").pop()) == null ? void 0 : t.toLowerCase()) || "") {
		case "bmp": return "image/bmp";
		case "gif": return "image/gif";
		case "jpeg":
		case "jpg": return "image/jpeg";
		case "png": return "image/png";
		case "svg": return "image/svg+xml";
		case "webp": return "image/webp";
		default: return "";
	}
}, Oy = (e, t) => {
	var n;
	let r = t.overrides.get(e);
	if (r) return r;
	let i = ((n = e.split(".").pop()) == null ? void 0 : n.toLowerCase()) || "";
	return t.defaults.get(i) || Dy(e);
}, ky = (e) => e ? Cy(e.documentElement, "s").map((e) => ({
	type: e.getAttribute("t") || "",
	keys: Cy(e, "k").map((e) => e.getAttribute("n") || "")
})) : [], Ay = (e) => e ? Cy(e.documentElement, "rv").map((e) => ({
	structureIndex: Number(e.getAttribute("s")),
	values: Cy(e, "v").map((e) => Number(Sy(e)))
})) : [], jy = (e) => e ? Cy(e.documentElement, "rel").map(Rv) : [], My = (e) => {
	if (!e) return [];
	let t = Cy(wy(e.documentElement, "metadataTypes"), "metadataType").findIndex((e) => e.getAttribute("name") === yy) + 1;
	if (t <= 0) return [];
	let n = Cy(Pv(e.documentElement, "futureMetadata").find((e) => e.getAttribute("name") === yy), "bk").map((e) => {
		let t = wy(e, "rvb"), n = Number(t == null ? void 0 : t.getAttribute("i"));
		return Number.isInteger(n) && n >= 0 ? n : void 0;
	});
	return Cy(wy(e.documentElement, "valueMetadata"), "bk").map((e) => {
		let r = Cy(e, "rc").find((e) => Number(e.getAttribute("t")) === t), i = Number(r == null ? void 0 : r.getAttribute("v"));
		return Number.isInteger(i) && i >= 0 ? n[i] : void 0;
	});
}, Ny = (e, t) => {
	var n, r;
	let i = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), a = e.match(RegExp(`(?:^|\\s)${i}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
	return (n = (r = a == null ? void 0 : a[1]) == null ? a == null ? void 0 : a[2] : r) == null ? "" : n;
}, Py = (e) => {
	let t = [];
	for (let n of e.matchAll(/<(?:[A-Za-z_][\w.-]*:)?c\b[^>]*>/gi)) {
		let e = n[0], r = Ny(e, "r"), i = Ny(e, "vm"), a = Number(i);
		!r || !i || !Number.isInteger(a) || a < 0 || t.push({
			ref: r,
			metadataIndex: a > 0 ? a - 1 : 0
		});
	}
	return t;
}, Fy = (e) => e.replace(/&quot;/gi, "\"").replace(/&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&"), Iy = (e) => {
	let t = [];
	for (let i of e.matchAll(/<(?:[A-Za-z_][\w.-]*:)?c\b[^>]*>[\s\S]*?<\/(?:[A-Za-z_][\w.-]*:)?c\s*>/gi)) {
		var n, r;
		let e = i[0], a = Ny(e.slice(0, e.indexOf(">") + 1), "r"), o = e.match(/<(?:[A-Za-z_][\w.-]*:)?f\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?f\s*>/i), s = (r = Fy((o == null || (n = o[1]) == null ? void 0 : n.trim()) || "").match(/(?:_xlfn\.)?(?:_xlws\.)?DISPIMG\s*\(\s*["']([^"']+)["']/i)) == null ? void 0 : r[1];
		a && s && t.push({
			ref: a,
			imageId: s
		});
	}
	return t;
}, Ly = (e) => e && (e.getAttribute("r:embed") || e.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed") || e.getAttribute("embed")) || "", Ry = async (e, t, n) => {
	let r = /* @__PURE__ */ new Map();
	if (!t) return r;
	let [i, a] = await Promise.all([Hv(e, t.target), Uv(e, t.target)]);
	return i && await Promise.all(Pv(i.documentElement, "cellImage").map(async (t) => {
		let i = wy(t, "cNvPr"), o = (i == null ? void 0 : i.getAttribute("name")) || "", s = Wv(a, Ly(wy(t, "blip")));
		if (!o || !s) return;
		let c = Oy(s.target, n), l = e.file(s.target);
		!l || !c.startsWith("image/") || r.set(o, {
			id: o,
			src: `data:${c};base64,${await l.async("base64")}`,
			contentType: c
		});
	})), r;
}, zy = async (e, t, n, r, i, a) => {
	let o = /* @__PURE__ */ new Map();
	return await Promise.all(n.map(async (n, s) => {
		let c = t[n.structureIndex];
		if (!c || c.type !== by) return;
		let l = c.keys.findIndex((e) => e.endsWith(xy)), u = n.values[l];
		if (l < 0 || !Number.isInteger(u) || u < 0) return;
		let d = r[u], f = Wv(i, d);
		if (!f) return;
		let p = Oy(f.target, a), m = e.file(f.target);
		if (!m || !p.startsWith("image/")) return;
		let h = await m.async("base64");
		o.set(s, {
			id: f.id,
			src: `data:${p};base64,${h}`,
			contentType: p
		});
	})), o;
}, By = async (e) => {
	let t = await Cv.default.loadAsync(e), [n, r, i] = await Promise.all([
		Hv(t, dy),
		Uv(t, dy),
		Hv(t, fy)
	]), a = {};
	if (!n) return a;
	let o = Ty(r, my), s = Ty(r, hy), c = Ty(r, gy), l = Ty(r, _y), u = Ey(i), d = [], f = /* @__PURE__ */ new Map();
	if (o && s && c && l) {
		let [e, n, r, i, a] = await Promise.all([
			Hv(t, o.target),
			Hv(t, s.target),
			Hv(t, c.target),
			Hv(t, l.target),
			Uv(t, l.target)
		]);
		d = My(e), f = await zy(t, ky(r), Ay(n), jy(i), a, u);
	}
	let p = await Ry(t, r.find((e) => e.type.toLowerCase() === vy.toLowerCase()), u);
	if (!f.size && !p.size) return a;
	for (let e of Pv(n.documentElement, "sheet")) {
		let n = e.getAttribute("name") || "", i = Wv(r, Rv(e)), o = i != null && i.type.toLowerCase().endsWith(py) ? t.file(i.target) : null;
		if (!n || !o) continue;
		let s = await o.async("text"), c = /* @__PURE__ */ new Map();
		Py(s).forEach(({ ref: e, metadataIndex: t }) => {
			let n = d[t], r = n === void 0 ? void 0 : f.get(n);
			r && c.set(e, r);
		}), Iy(s).forEach(({ ref: e, imageId: t }) => {
			let n = p.get(t);
			n && !c.has(e) && c.set(e, n);
		});
		let l = Array.from(c).flatMap(([e, t]) => {
			try {
				let n = Lg.decode_cell(e);
				return [{
					...t,
					id: `cell-image-${e}-${t.id}`,
					row: n.r,
					col: n.c
				}];
			} catch {
				return [];
			}
		});
		l.length && (a[n] = l);
	}
	return a;
}, Vy = {
	type: "array",
	dense: !0,
	cellDates: !0,
	cellStyles: !0,
	browserPixels: !0,
	drawings: !0,
	validateMerges: !0
}, Hy = () => ({
	workbook: null,
	sheets: [],
	charts: {},
	cellImages: {}
}), Uy = (e, t = {}) => ({
	type: "parseError",
	payload: {
		...t,
		message: e instanceof Error ? e.message : String(e)
	}
}), Wy = (e) => {
	var t;
	return ((e == null || (t = e["!drawings"]) == null ? void 0 : t.images) || []).reduce((e, t) => {
		var n, r, i, a, o, s;
		let c = t.anchor, l = Number((n = c == null || (r = c.to) == null ? void 0 : r.row) == null ? c == null || (i = c.from) == null ? void 0 : i.row : n), u = Number((a = c == null || (o = c.to) == null ? void 0 : o.col) == null ? c == null || (s = c.from) == null ? void 0 : s.col : a);
		return {
			rowCount: Number.isFinite(l) ? Math.max(e.rowCount, l + 1) : e.rowCount,
			colCount: Number.isFinite(u) ? Math.max(e.colCount, u + 1) : e.colCount
		};
	}, {
		rowCount: 0,
		colCount: 0
	});
}, Gy = (e) => (e || []).reduce((e, t) => {
	var n, r, i, a, o, s;
	let c = (n = t.ext) != null && n.height ? Math.ceil(t.ext.height / 9525 / 20) : 0, l = (r = t.ext) != null && r.width ? Math.ceil(t.ext.width / 9525 / 64) : 0, u = (i = (a = t.to) == null ? void 0 : a.row) == null ? t.from.row + c : i, d = (o = (s = t.to) == null ? void 0 : s.col) == null ? t.from.col + l : o;
	return {
		rowCount: Math.max(e.rowCount, u + 1),
		colCount: Math.max(e.colCount, d + 1)
	};
}, {
	rowCount: 0,
	colCount: 0
}), Ky = 1e3, qy = 256, Jy = 256, Yy = 64, Xy = 4, Zy = (e) => {
	let t = {
		rowCount: 0,
		colCount: 0
	};
	if (!e) return t;
	let n = Array.isArray(e) ? e : e["!data"];
	if (Array.isArray(n)) {
		for (let e of Object.keys(n)) {
			let r = Number(e), i = n[r];
			if (!(!Number.isInteger(r) || r < 0 || !Array.isArray(i))) for (let e of Object.keys(i)) {
				let n = Number(e);
				!Number.isInteger(n) || n < 0 || i[n] == null || (t.rowCount = Math.max(t.rowCount, r + 1), t.colCount = Math.max(t.colCount, n + 1));
			}
		}
		return t;
	}
	for (let n of Object.keys(e)) if (!(n.startsWith("!") || !/^[A-Z]+[1-9][0-9]*$/i.test(n) || e[n] == null)) try {
		let e = Lg.decode_cell(n);
		t.rowCount = Math.max(t.rowCount, e.r + 1), t.colCount = Math.max(t.colCount, e.c + 1);
	} catch {}
	return t;
}, Qy = (e) => ((e == null ? void 0 : e["!merges"]) || []).reduce((e, t) => {
	var n, r, i, a, o, s;
	let c = Number((n = (r = t.e) == null ? void 0 : r.row) == null ? (i = t.e) == null ? void 0 : i.r : n), l = Number((a = (o = t.e) == null ? void 0 : o.col) == null ? (s = t.e) == null ? void 0 : s.c : a);
	return {
		rowCount: Number.isFinite(c) ? Math.max(e.rowCount, c + 1) : e.rowCount,
		colCount: Number.isFinite(l) ? Math.max(e.colCount, l + 1) : e.colCount
	};
}, {
	rowCount: 0,
	colCount: 0
}), $y = (e, t, n, r) => t <= 0 ? Math.min(Math.max(e, 1), r) : e <= Math.max(t + n, t * Xy) ? Math.max(e, t) : t, eb = (e, t) => {
	let n = 0, r = 0, i = e == null ? void 0 : e["!ref"];
	if (i) try {
		let e = Lg.decode_range(i);
		n = e.e.r + 1, r = e.e.c + 1;
	} catch {}
	let a = Zy(e), o = Qy(e), s = Wy(e), c = Gy(t), l = Math.max(a.rowCount, o.rowCount, s.rowCount, c.rowCount), u = Math.max(a.colCount, o.colCount, s.colCount, c.colCount), d = $y(n, l, Jy, Ky), f = $y(r, u, Yy, qy);
	return {
		rowCount: d,
		colCount: f,
		declaredRowCount: n,
		declaredColCount: r,
		observedRowCount: l,
		observedColCount: u,
		trimmed: d < n || f < r
	};
}, tb = (e) => {
	var t;
	let n = e.workbook;
	if (!(n != null && n.SheetNames)) return [];
	let r = ((t = n.Workbook) == null ? void 0 : t.Sheets) || [];
	return e.sheets = n.SheetNames.reduce((t, i, a) => {
		var o;
		let s = n.Sheets[i], c = eb(s, e.charts[i]);
		return !(s != null && s["!ref"]) && !c.observedRowCount && !c.observedColCount ? t : (c.trimmed && console.warn(`[file-viewer] Ignored pathological worksheet dimensions for ${i}: ${c.declaredRowCount}x${c.declaredColCount} -> ${c.rowCount}x${c.colCount}.`), t.push({
			id: t.length,
			name: i,
			hidden: !!((o = r[a]) != null && o.Hidden),
			rowCount: c.rowCount,
			colCount: c.colCount
		}), t);
	}, []), [{
		type: "sheets",
		payload: { sheets: e.sheets }
	}];
}, nb = async (e, t, n = {}) => {
	try {
		let r = uy(t, n);
		if (e.workbook = r.kind === "text" ? _g(r.data, {
			...Vy,
			type: "string"
		}) : _g(r.data, Vy), (t.byteLength >= 2 ? new DataView(t).getUint16(0, !1) : 0) === 20555) {
			let [n, r] = await Promise.all([Qv(t).catch((e) => (console.warn("[file-viewer] Spreadsheet chart parsing failed; continuing with cell content.", e), {})), By(t).catch((e) => (console.warn("[file-viewer] Spreadsheet cell image parsing failed; continuing with cell content.", e), {}))]);
			e.charts = n, e.cellImages = r;
		} else e.charts = {}, e.cellImages = {};
		return tb(e);
	} catch (e) {
		return [Uy(e)];
	}
}, rb = (e, t = {}) => {
	let { sheet: n, startRow: r = 0, pageSize: i = 500, sessionId: a = 0 } = t;
	try {
		var o;
		let t = e.workbook, s = (o = e.sheets.find((e) => e.id === n)) == null ? void 0 : o.name;
		if (!(t != null && t.Sheets) || !s) return [];
		let c = t.Sheets[s];
		if (!c) return [];
		let l = e.sheets.find((e) => e.id === n), u = fv.create(c, {
			startRow: r,
			pageSize: i,
			totalRows: l == null ? void 0 : l.rowCount,
			totalCols: l == null ? void 0 : l.colCount,
			charts: e.charts[s],
			cellImages: e.cellImages[s]
		}), d = u.toObject({ includeLayout: r === 0 }), f = r === 0 ? u.structure : void 0;
		return [{
			type: "parseSheet",
			payload: {
				sessionId: a,
				sheet: n,
				sheetData: f ? {
					...d,
					structure: f
				} : d
			}
		}];
	} catch (e) {
		return [Uy(e, {
			sessionId: a,
			startRow: r
		})];
	}
}, ib = (e, t) => {
	switch (t.type) {
		case "parseWorkbook":
			var n, r, i, a;
			return nb(e, (n = t.payload) == null ? void 0 : n.workbook, {
				fileType: (r = t.payload) == null ? void 0 : r.fileType,
				filename: (i = t.payload) == null ? void 0 : i.filename,
				textEncoding: (a = t.payload) == null ? void 0 : a.textEncoding
			});
		case "parseSheet": return rb(e, t.payload);
		default: return [];
	}
}, ab = typeof self > "u" ? null : self;
if (ab) {
	let e = Hy();
	ab.onmessage = async (t) => {
		(await ib(e, t.data)).forEach((e) => {
			ab.postMessage(e);
		});
	}, ab.onerror = (e) => {
		console.error(e);
	};
}
//#endregion
