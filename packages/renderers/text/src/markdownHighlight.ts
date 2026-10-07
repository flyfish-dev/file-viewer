import type { FileRenderContext } from "@file-viewer/core";

const MAX_HIGHLIGHT_CHARACTERS = 100 * 1024;

export const markdownCodeStyle = `
.markdown-body pre code{--md-code-comment:#6e7781;--md-code-keyword:#cf222e;--md-code-string:#0a3069;--md-code-title:#8250df;--md-code-number:#0550ae;--md-code-attr:#953800;--md-code-built-in:#116329}
.markdown-body pre .hljs-comment,.markdown-body pre .hljs-quote{color:var(--md-code-comment)}
.markdown-body pre .hljs-keyword,.markdown-body pre .hljs-selector-tag{color:var(--md-code-keyword)}
.markdown-body pre .hljs-string,.markdown-body pre .hljs-doctag,.markdown-body pre .hljs-regexp{color:var(--md-code-string)}
.markdown-body pre .hljs-title,.markdown-body pre .hljs-section,.markdown-body pre .hljs-selector-id{color:var(--md-code-title)}
.markdown-body pre .hljs-number,.markdown-body pre .hljs-literal{color:var(--md-code-number)}
.markdown-body pre .hljs-attr,.markdown-body pre .hljs-attribute,.markdown-body pre .hljs-name{color:var(--md-code-attr)}
.markdown-body pre .hljs-built_in,.markdown-body pre .hljs-type{color:var(--md-code-built-in)}
[data-viewer-theme='dark'] .markdown-body pre code{--md-code-comment:#8b949e;--md-code-keyword:#ff7b72;--md-code-string:#a5d6ff;--md-code-title:#d2a8ff;--md-code-number:#79c0ff;--md-code-attr:#ffa657;--md-code-built-in:#7ee787}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .markdown-body pre code{--md-code-comment:#8b949e;--md-code-keyword:#ff7b72;--md-code-string:#a5d6ff;--md-code-title:#d2a8ff;--md-code-number:#79c0ff;--md-code-attr:#ffa657;--md-code-built-in:#7ee787}}
`;

/** Only this article owns these mutations, including when it is in Shadow DOM. */
export async function highlightMarkdownCode(
  article: HTMLElement,
  context?: FileRenderContext,
) {
  if (context?.options?.text?.markdownHighlight === false) return;
  const candidates = Array.from(
    article.querySelectorAll<HTMLElement>("pre > code"),
  )
    .map((code) => ({
      code,
      language: /(?:^|\s)(?:language|lang)-([^\s]+)/i
        .exec(code.className)?.[1]
        ?.toLowerCase(),
    }))
    .filter(
      ({ code, language }) =>
        language &&
        language !== "mermaid" &&
        (code.textContent?.length ?? 0) <= MAX_HIGHLIGHT_CHARACTERS,
    );
  if (!candidates.length) return;
  try {
    // The common grammar bundle supports aliases such as js/html/py. Unknown
    // languages stay verbatim; no source-controlled module path is imported.
    const { default: highlighter } = await import("highlight.js/lib/common");
    for (const { code, language } of candidates) {
      if (!language || !highlighter.getLanguage(language)) continue;
      const highlighted = highlighter.highlight(code.textContent || "", {
        language,
        ignoreIllegals: true,
      });
      // highlight.js escapes authored markup before adding its token spans.
      code.innerHTML = highlighted.value;
      code.classList.add("hljs");
    }
  } catch {
    // Preserve the readable source if the local grammar chunk cannot load.
    try {
      context?.options?.onDiagnostic?.({
        code: "markdown-highlight-unavailable",
        level: "warning",
        message:
          "Markdown code blocks kept as plain text because local highlighting could not load.",
      });
    } catch {
      /* Host diagnostics must not prevent Markdown preview. */
    }
  }
}
