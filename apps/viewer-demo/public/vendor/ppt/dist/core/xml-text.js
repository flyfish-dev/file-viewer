import { escapeHtml } from './utils.js';
export function escapeXmlText(value) {
    // XML 1.0 rejects controls and isolated surrogates even as numeric entities.
    const legalText = value.replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, '\ufffd');
    return escapeHtml(legalText);
}
