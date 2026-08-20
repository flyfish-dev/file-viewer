import { a as e, f as t, i as n, t as r, u as i } from "./messages-C4pe41Pd.js";
//#region ../../packages/core/dist/renderers/image.js
var a = {
	avif: "image/avif",
	bmp: "image/bmp",
	gif: "image/gif",
	heic: "image/heic",
	heif: "image/heif",
	ico: "image/x-icon",
	jxl: "image/jxl",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	svg: "image/svg+xml",
	tif: "image/tiff",
	tiff: "image/tiff",
	webp: "image/webp"
}, o = "\n.image-viewer{position:relative;width:100%;height:100%;overflow:auto;background:var(--file-viewer-render-surface-background,#eef1f4);box-sizing:border-box}\n.image-stage{min-width:100%;min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}\n.image-stage img{display:block;width:auto;max-width:none;margin:0 auto;border:0;box-shadow:0 18px 48px rgba(15,23,42,.16);background:#fff;cursor:zoom-in}\n.image-stage img:focus-visible{outline:3px solid #2563eb;outline-offset:4px}\n.image-lightbox{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:40px;background:rgba(15,23,42,.9);box-sizing:border-box;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .18s ease,visibility 0s linear .18s}\n.image-lightbox[data-open='true']{opacity:1;visibility:visible;pointer-events:auto;transition-delay:0s}\n.image-lightbox img{display:block;max-width:100%;max-height:100%;object-fit:contain;background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.4);cursor:default;transform:scale(.985);transition:transform .18s ease}\n.image-lightbox[data-open='true'] img{transform:scale(1)}\n.image-lightbox button{position:absolute;top:16px;right:16px;display:grid;width:40px;height:40px;place-items:center;padding:0;border:1px solid rgba(255,255,255,.7);border-radius:999px;background:rgba(255,255,255,.96);color:#172033;font:400 27px/1 Arial,sans-serif;cursor:pointer;box-shadow:0 12px 28px rgba(0,0,0,.24);transition:background-color .14s ease,transform .14s ease}\n.image-lightbox button:hover{background:#fff;transform:scale(1.04)}\n.image-lightbox button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}\n[data-viewer-theme='dark'] .image-viewer{background:var(--file-viewer-render-surface-background,#101820)}\n@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .image-viewer{background:var(--file-viewer-render-surface-background,#101820)}}\n@media (max-width:767px){.image-stage{padding:12px}.image-lightbox{padding:16px}.image-lightbox button{top:12px;right:12px}}\n@media (prefers-reduced-motion:reduce){.image-lightbox,.image-lightbox img,.image-lightbox button{transition:none}}\n", s = (e) => {
	let t = e.createElement("style");
	return t.textContent = o, t;
}, c = (e) => a[(e || "").trim().toLowerCase()] || "image/*", l = async (e) => await new Promise((t, n) => {
	let r = new FileReader();
	r.onload = (e) => {
		var r;
		let i = (r = e.target) == null ? void 0 : r.result;
		if (typeof i == "string") {
			t(i);
			return;
		}
		n(/* @__PURE__ */ Error("Unable to read image data URL."));
	}, r.onerror = () => n(r.error || /* @__PURE__ */ Error("Unable to read image data URL.")), r.readAsDataURL(e);
}), u = async (e, t) => {
	let n = (t || "").trim().toLowerCase();
	if (n === "heic" || n === "heif") throw Error("HEIC/HEIF image conversion has moved out of @file-viewer/core. Install and pass @file-viewer/renderer-image, or use @file-viewer/preset-all.");
	return l(new Blob([e], { type: c(n) }));
}, d = (e) => Number(e.toFixed(3)), f = (e, t, n) => {
	let r = e.createElement("div");
	r.className = "image-lightbox", r.dataset.open = "false", r.setAttribute("role", "dialog"), r.setAttribute("aria-modal", "true"), r.setAttribute("aria-hidden", "true");
	let i = e.createElement("img");
	i.alt = n("image.lightbox.alt"), i.src = t;
	let a = e.createElement("button");
	a.type = "button", a.setAttribute("aria-label", n("image.lightbox.close")), a.textContent = "×";
	let o = null, s = () => {
		r.dataset.open === "true" && (r.dataset.open = "false", r.setAttribute("aria-hidden", "true"), o != null && o.isConnected && o.focus({ preventScroll: !0 }), o = null);
	}, c = (e) => {
		e.key === "Escape" && r.dataset.open === "true" && (e.preventDefault(), s());
	};
	return a.addEventListener("click", s), r.addEventListener("click", (e) => {
		e.target === r && s();
	}), e.addEventListener("keydown", c), r.append(i, a), {
		element: r,
		open(t) {
			o = t || (e.activeElement instanceof HTMLElement ? e.activeElement : null), r.dataset.open = "true", r.setAttribute("aria-hidden", "false"), a.focus({ preventScroll: !0 });
		},
		destroy() {
			a.removeEventListener("click", s), e.removeEventListener("keydown", c), r.remove();
		}
	};
};
async function p(a, o, l, p) {
	var m, h;
	let g = r(p == null ? void 0 : p.options), _ = o.ownerDocument || document, v = await u(a, l);
	(m = p == null ? void 0 : p.registerThumbnailAdapter) == null || m.call(p, { capture: () => new Blob([a], { type: c(l) }) });
	let y = 1, b = 1, x = 1, S = 0, C = e(), w = _.createElement("div");
	w.className = "image-viewer", w.dataset.viewerZoomProvider = "image";
	let T = _.createElement("div");
	T.className = "image-stage";
	let E = _.createElement("img");
	E.alt = g("image.alt"), E.src = v, E.tabIndex = 0, E.setAttribute("role", "button"), E.setAttribute("aria-haspopup", "dialog"), T.append(E), w.append(T);
	let D = f(_, v, g), O = () => D.open(E), k = (e) => {
		(e.key === "Enter" || e.key === " ") && (e.preventDefault(), D.open(E));
	};
	E.addEventListener("click", O), E.addEventListener("keydown", k);
	let A = () => Math.min(.1, b || .1), j = (e) => {
		let t = A();
		return Math.min(5, Math.max(t, d(e)));
	}, M = () => {
		let e = E.naturalWidth || 0, t = E.naturalHeight || 0;
		if (!e || !t) return 1;
		let n = Math.max((w.clientWidth || 0) - 48, 1), r = Math.max((w.clientHeight || S || 0) - 48, 1);
		return Math.min(1, n / e, r / t);
	}, N = () => {
		if (b = M(), x = j(b * y), E.naturalWidth && E.naturalHeight) {
			E.style.width = `${Math.max(1, Math.round(E.naturalWidth * x))}px`, E.style.height = `${Math.max(1, Math.round(E.naturalHeight * x))}px`;
			return;
		}
		E.style.width = "auto", E.style.height = S > 0 ? `${Math.max(1, Math.round(S * y))}px` : `${y * 100}%`;
	}, P = () => {
		S = w.clientHeight || 0, N(), C.emit();
	}, F = new ResizeObserver(P);
	F.observe(w), E.addEventListener("load", P);
	let I = () => ({
		scale: x,
		label: `${Math.round(x * 100)}%`,
		canZoomIn: x < 5,
		canZoomOut: x > A(),
		canReset: Math.abs(y - 1) > .001,
		minScale: A(),
		maxScale: 5
	}), L = (e) => (y = j(e) / Math.max(b, .001), N(), C.emit(), I());
	return i(w, {
		zoomIn: () => L(x + .15),
		zoomOut: () => L(x - .15),
		resetZoom: () => (y = 1, N(), C.emit(), I()),
		setZoom: L,
		fit: (e) => {
			var t, r;
			let i = E.naturalWidth || 0, a = E.naturalHeight || 0;
			if (!i || !a) return {
				applied: !1,
				mode: e.mode,
				resize: e.resize,
				source: e.source,
				reason: "image-not-ready",
				provider: "zoom"
			};
			let o = n({
				mode: e.mode === "auto" ? "scale-down" : e.mode,
				viewportWidth: Math.max(1, e.viewportWidth || w.clientWidth || 0),
				viewportHeight: Math.max(1, e.viewportHeight || w.clientHeight || S || 0),
				contentWidth: i,
				contentHeight: a,
				currentScale: x,
				minScale: (t = e.minScale) == null ? A() : t,
				maxScale: (r = e.maxScale) == null ? 5 : r
			});
			if (!o) return {
				applied: !1,
				mode: e.mode,
				resize: e.resize,
				source: e.source,
				reason: "unmeasurable",
				provider: "zoom"
			};
			let s = L(o);
			return {
				applied: !0,
				mode: e.mode,
				resize: e.resize,
				scale: s.scale,
				source: e.source,
				provider: "zoom"
			};
		},
		getState: I,
		subscribe: C.subscribe
	}), o.replaceChildren(s(_), w), (((h = p == null ? void 0 : p.surface) == null ? void 0 : h.shadowRoot) || o).append(D.element), P(), {
		$el: o,
		unmount() {
			var e;
			(e = p == null ? void 0 : p.registerThumbnailAdapter) == null || e.call(p, null), t(w), F.disconnect(), E.removeEventListener("load", P), E.removeEventListener("click", O), E.removeEventListener("keydown", k), D.destroy(), o.replaceChildren();
		}
	};
}
//#endregion
export { p as default };
