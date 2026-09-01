export const codeStyle = `
.code-viewer{min-height:100%;--code-bg:#f6f8fa;--code-toolbar-bg:rgba(255,255,255,.92);--code-border:rgba(31,35,40,.12);--code-text:#24292f;--code-muted:#57606a;--code-keyword:#cf222e;--code-title:#8250df;--code-string:#0a3069;--code-number:#0550ae;--code-comment:#6e7781;--code-attr:#953800;--code-built-in:#116329;--code-accent:#0969da;--code-accent-border:rgba(9,105,218,.28);--code-accent-soft:rgba(9,105,218,.1);background:var(--code-bg);color:var(--code-text);box-sizing:border-box}
.code-toolbar{position:sticky;top:0;z-index:2;display:flex;height:42px;align-items:center;justify-content:space-between;gap:16px;padding:0 16px;border-bottom:1px solid var(--code-border);background:var(--code-toolbar-bg);backdrop-filter:blur(12px);box-sizing:border-box}
.code-toolbar span,.code-toolbar strong{color:var(--code-muted);font-size:12px;font-weight:700;letter-spacing:0}
.code-toolbar-meta{display:inline-flex;min-width:0;align-items:center;justify-content:flex-end;gap:10px;white-space:nowrap}
.code-toolbar-meta>span{overflow:hidden;text-overflow:ellipsis}
.code-format-status{display:inline-flex;align-items:center;min-height:22px;padding:0 8px;border:1px solid var(--code-accent-border);border-radius:999px;background:var(--code-accent-soft);color:var(--code-accent)!important;font-size:11px!important}
.code-format-toggle{min-height:26px;padding:0 9px;border:1px solid var(--code-border);border-radius:6px;background:var(--code-bg);color:var(--code-text);font:600 11px/1.2 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer}
.code-format-toggle:hover{border-color:var(--code-accent);color:var(--code-accent)}
.code-format-toggle:focus-visible{outline:2px solid var(--code-accent);outline-offset:2px}
.code-area{display:block;min-width:min-content;margin:0;padding:18px 20px 28px;overflow:auto;background:transparent;box-sizing:border-box}
.code-area--line-numbers{display:grid;grid-template-columns:max-content max-content;padding:18px 0 28px}
.code-line-numbers{position:sticky;left:0;z-index:1;display:block;min-width:4ch;padding:0 12px 0 16px;border-right:1px solid var(--code-border);background:var(--code-bg);color:var(--code-muted);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:var(--code-font-size,13px);line-height:1.7;text-align:right;white-space:pre;user-select:none;box-sizing:border-box}
.code-area.code-area--line-numbers code{padding:0 20px}
.code-area code{display:block;padding:0;overflow:visible;background:transparent;color:inherit;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;font-size:var(--code-font-size,13px);line-height:1.7;tab-size:2;white-space:pre}
.code-viewer--wrap-lines .code-area{width:100%;min-width:0;overflow-x:hidden}
.code-viewer--wrap-lines .code-area code{min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
.code-area--wrapped-line-numbers{display:block;padding:18px 0 28px}
.code-area--wrapped-line-numbers code{width:100%;padding:0;white-space:normal!important}
.code-source-line{display:grid;width:100%;min-width:0;grid-template-columns:max-content minmax(0,1fr);align-items:stretch;min-height:1.7em}
.code-source-line-number{position:sticky;left:0;z-index:1;display:block;min-width:4ch;padding:0 12px 0 16px;border-right:1px solid var(--code-border);background:var(--code-bg);color:var(--code-muted);font:inherit;line-height:inherit;text-align:right;white-space:pre;user-select:none;box-sizing:border-box}
.code-source-line-content{display:block;min-width:0;padding:0 20px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;box-sizing:border-box}
.code-source-line-content:empty::after{content:' '}
.code-area .hljs-comment,.code-area .hljs-quote{color:var(--code-comment)}
.code-area .hljs-keyword,.code-area .hljs-selector-tag,.code-area .hljs-subst{color:var(--code-keyword)}
.code-area .hljs-string,.code-area .hljs-doctag,.code-area .hljs-regexp{color:var(--code-string)}
.code-area .hljs-title,.code-area .hljs-section,.code-area .hljs-selector-id{color:var(--code-title);font-weight:700}
.code-area .hljs-number,.code-area .hljs-literal,.code-area .hljs-variable,.code-area .hljs-template-variable{color:var(--code-number)}
.code-area .hljs-attr,.code-area .hljs-attribute,.code-area .hljs-name,.code-area .hljs-selector-class{color:var(--code-attr)}
.code-area .hljs-built_in,.code-area .hljs-type,.code-area .hljs-class .hljs-title{color:var(--code-built-in)}
[data-viewer-theme='dark'] .code-viewer{--code-bg:#0d1117;--code-toolbar-bg:rgba(13,17,23,.92);--code-border:rgba(139,148,158,.24);--code-text:#e6edf3;--code-muted:#8b949e;--code-keyword:#ff7b72;--code-title:#d2a8ff;--code-string:#a5d6ff;--code-number:#79c0ff;--code-comment:#8b949e;--code-attr:#ffa657;--code-built-in:#7ee787;--code-accent:#58a6ff;--code-accent-border:rgba(88,166,255,.32);--code-accent-soft:rgba(56,139,253,.15)}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .code-viewer{--code-bg:#0d1117;--code-toolbar-bg:rgba(13,17,23,.92);--code-border:rgba(139,148,158,.24);--code-text:#e6edf3;--code-muted:#8b949e;--code-keyword:#ff7b72;--code-title:#d2a8ff;--code-string:#a5d6ff;--code-number:#79c0ff;--code-comment:#8b949e;--code-attr:#ffa657;--code-built-in:#7ee787;--code-accent:#58a6ff;--code-accent-border:rgba(88,166,255,.32);--code-accent-soft:rgba(56,139,253,.15)}}
`
