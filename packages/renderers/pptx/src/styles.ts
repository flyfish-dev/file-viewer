const legacyPptxCss = `
.slide{position:relative;border:0;border-radius:0;overflow:hidden;margin-bottom:50px;margin-left:auto;margin-right:auto;z-index:100}
.slide div.block{position:absolute;top:0;left:0;width:100%;line-height:1}
.slide div.content{display:flex;flex-direction:column}
.slide div.diagram-content{display:flex;flex-direction:column}
.slide div.content-rtl{display:flex;flex-direction:column;direction:rtl}
.slide .pregraph-rtl{direction:rtl}
.slide .pregraph-ltr{direction:ltr}
.slide .pregraph-inherit{direction:inherit}
.slide .slide-prgrph{width:100%}
.slide .line-break-br::before{content:"\\A";white-space:pre}
.slide div.v-up{justify-content:flex-start}
.slide div.v-mid{justify-content:center}
.slide div.v-down{justify-content:flex-end}
.slide div.h-left{justify-content:flex-start;align-items:flex-start;text-align:left}
.slide div.h-left-rtl{justify-content:flex-end;align-items:flex-end;text-align:left}
.slide div.h-mid{justify-content:center;align-items:center;text-align:center}
.slide div.h-right{justify-content:flex-end;align-items:flex-end;text-align:right}
.slide div.h-right-rtl{justify-content:flex-start;align-items:flex-start;text-align:right}
.slide div.h-just,.slide div.h-dist{text-align:justify}
.slide div.up-left{justify-content:flex-start;align-items:flex-start;text-align:left}
.slide div.up-center{justify-content:flex-start;align-items:center}
.slide div.up-right{justify-content:flex-start;align-items:flex-end}
.slide div.center-left{justify-content:center;align-items:flex-start;text-align:left}
.slide div.center-center{justify-content:center;align-items:center}
.slide div.center-right{justify-content:center;align-items:flex-end}
.slide div.down-left{justify-content:flex-end;align-items:flex-start;text-align:left}
.slide div.down-center{justify-content:flex-end;align-items:center}
.slide div.down-right{justify-content:flex-end;align-items:flex-end}
.slide li.slide{margin:10px 0;font-size:18px}
.slide table{position:absolute}
.slide svg.drawing{position:absolute;overflow:visible}
`;

const PPTX_CONTENT_STYLE_SCOPE = '.flyfish-pptx-content';

/**
 * The legacy engine emits class-only selector lists. Prefix each top-level
 * class rule so light-DOM consumers do not inherit generic `.slide` or
 * generated `._css_*` rules from a renderer-local style element.
 */
export const scopePptxContentStyleText = (cssText: string) => cssText.replace(
  /(^|})\s*(\.[^{}]+)\{/g,
  (_match, boundary: string, selectorList: string) => {
    const scopedSelectors = selectorList
      .split(',')
      .map(selector => `${PPTX_CONTENT_STYLE_SCOPE} ${selector.trim()}`)
      .join(',');
    return `${boundary}${scopedSelectors}{`;
  }
);

export const pptxViewerCss = `
.flyfish-pptx-scale-box{position:relative;box-sizing:border-box;max-width:100%;margin:0 auto;min-width:0}
.flyfish-pptx-content{position:absolute;top:0;left:0;box-sizing:border-box;max-width:none;min-width:0;transform-origin:top left;will-change:transform}
.flyfish-pptx-content[data-render-state="loading"]{opacity:.82}
.flyfish-pptx-slide-slot{display:flow-root;box-sizing:border-box;width:100%;min-width:0}
.flyfish-pptx-slide-error{display:flex;align-items:center;justify-content:center;background:#fff7ed!important;color:#9a3412}
.flyfish-pptx-slide-error-card{display:grid;gap:10px;max-width:70%;padding:24px;border:1px solid #fdba74;border-radius:12px;background:#fff;text-align:center;font:14px/1.5 system-ui,sans-serif}
.flyfish-pptx-slide-error-card strong{font-size:18px}
.flyfish-pptx-content .slide{background:#fff;box-shadow:0 18px 36px rgba(18,35,52,.12)}
.flyfish-pptx-thumbnail{display:block;box-sizing:border-box;width:min(960px,100%);height:auto;margin:0 auto 28px;border-radius:12px;background:#fff;box-shadow:0 18px 36px rgba(18,35,52,.14)}
${scopePptxContentStyleText(legacyPptxCss)}
.flyfish-pptx-content > .slide:last-of-type{margin-bottom:0}
.flyfish-pptx-slide-slot:last-of-type > .slide{margin-bottom:0}
.flyfish-pptx-presentation{position:fixed;inset:0;z-index:2147483000;display:block;overflow:hidden;background:#000;cursor:default;user-select:none;-webkit-user-select:none}
.flyfish-pptx-presentation:focus{outline:none}
.flyfish-pptx-presentation-stage{position:absolute;inset:0;overflow:hidden}
.flyfish-pptx-presentation .flyfish-pptx-scale-box{position:absolute;inset:0;width:100%;height:100%;margin:0}
.flyfish-pptx-presentation .flyfish-pptx-thumbnail{display:none}
.flyfish-pptx-content.is-presenting > .flyfish-pptx-slide-slot{display:none;min-height:0}
.flyfish-pptx-content.is-presenting > .flyfish-pptx-slide-slot.is-active-slide{display:flow-root}
.flyfish-pptx-content.is-presenting .slide{margin:0!important;box-shadow:none}
.flyfish-pptx-presentation-counter{position:absolute;right:18px;bottom:14px;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.14);color:#fff;font:13px/1.4 system-ui,sans-serif;letter-spacing:.02em;pointer-events:none}
.flyfish-pptx-presentation-hint{position:absolute;left:18px;bottom:14px;color:rgba(255,255,255,.55);font:12px/1.4 system-ui,sans-serif;pointer-events:none}
.flyfish-pptx-presentation-hint[hidden]{display:none}
.flyfish-pptx-presentation-exit{position:absolute;top:14px;right:14px;width:34px;height:34px;padding:0;border:0;border-radius:999px;background:rgba(255,255,255,.14);color:#fff;font-size:15px;line-height:1;cursor:pointer}
.flyfish-pptx-presentation-exit:hover{background:rgba(255,255,255,.26)}
.flyfish-pptx-presentation-exit:focus-visible{outline:2px solid #fff;outline-offset:2px}
@media (prefers-reduced-motion:no-preference){.flyfish-pptx-content.is-presenting > .flyfish-pptx-slide-slot.is-active-slide{animation:flyfish-pptx-slide-in 140ms ease-out}}
@keyframes flyfish-pptx-slide-in{from{opacity:.35}to{opacity:1}}
`;

const PPTX_STYLE_ID = 'flyfish-pptx-native-style';

export const ensurePptxViewerStyles = (
  documentRef: Document,
  root: Document | ShadowRoot = documentRef
) => {
  if (root instanceof Document && root.getElementById(PPTX_STYLE_ID)) {
    return;
  }
  if (!(root instanceof Document) && root.querySelector(`#${PPTX_STYLE_ID}`)) {
    return;
  }

  const style = documentRef.createElement('style');
  style.id = PPTX_STYLE_ID;
  style.textContent = pptxViewerCss;
  if (root instanceof Document) {
    (root.head || root.documentElement).appendChild(style);
    return;
  }
  root.appendChild(style);
};
