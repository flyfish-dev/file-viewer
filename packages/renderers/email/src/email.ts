import {
  createFileViewerTranslator,
  disposeFileViewerRendered,
  resolveFileViewerColorScheme,
} from '@file-viewer/core';
import type {
  FileRenderContext,
  FileViewerRenderedInstance,
} from '@file-viewer/core';

type EmailKind = 'eml' | 'msg' | 'mbox';
type EmailBodyMode = 'html' | 'text' | 'headers';

interface EmailAddress {
  name?: string;
  address?: string;
}

interface EmailAttachmentView {
  id: string;
  name: string;
  mimeType?: string;
  size: number;
  contentId?: string;
  load(): Promise<ArrayBuffer>;
}

interface ParsedEmailView {
  kind: EmailKind;
  subject: string;
  from: EmailAddress[];
  to: EmailAddress[];
  cc: EmailAddress[];
  date?: string;
  text?: string;
  html?: string;
  headers?: string;
  attachments: EmailAttachmentView[];
}

const emailStyle = `
.email-viewer{position:relative;height:100%;min-height:0;display:flex;flex-direction:column;background:#f3f6f8;color:#172033;box-sizing:border-box}
.email-viewer *{box-sizing:border-box}
.email-header{padding:18px 22px;border-bottom:1px solid rgba(23,32,51,.08);background:#fff}
.email-header>span{color:#1f7a58;font-size:12px;font-weight:900}
.email-header h2{margin:4px 0 12px;font-size:22px;line-height:1.25}
.email-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 18px}
.email-meta p{margin:0;color:#526275;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.email-meta strong{margin-right:8px;color:#172033}
.email-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(240px,300px) minmax(0,1fr)}
.email-sidebar{min-height:0;display:flex;flex-direction:column;gap:14px;padding:14px;border-right:1px solid rgba(23,32,51,.08);background:rgba(255,255,255,.7)}
.body-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:4px;border-radius:12px;background:rgba(23,32,51,.06)}
.body-tabs button,.attachment-item,.attachment-preview-head button{font:inherit;cursor:pointer}
.body-tabs button{height:34px;border:0;border-radius:9px;background:transparent;color:#64748b;font-size:12px;font-weight:800}
.body-tabs button.active{background:#fff;color:#172033}
.body-tabs button:disabled{opacity:.4;cursor:not-allowed}
.attachment-panel{min-height:0;overflow:auto}
.attachment-title{display:flex;justify-content:space-between;color:#172033;font-size:14px;margin-bottom:8px}
.attachment-title span{color:#64748b}
.attachment-empty{margin:8px 0 0;color:#64748b;font-size:12px}
.attachment-item{width:100%;min-height:62px;display:grid;grid-template-columns:42px minmax(0,1fr);gap:10px;align-items:center;margin-bottom:8px;padding:9px;border:1px solid rgba(23,32,51,.08);border-radius:12px;background:#fff;text-align:left}
.attachment-item:hover,.attachment-item.active{border-color:rgba(31,122,88,.28);box-shadow:0 10px 22px rgba(23,32,51,.08)}
.attachment-item span{grid-row:span 2;height:38px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;background:rgba(31,122,88,.12);color:#1f7a58;font-size:11px;font-weight:900}
.attachment-item strong,.attachment-item em{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.attachment-item em{color:#64748b;font-size:12px;font-style:normal}
.message-panel{min-width:0;min-height:0;display:grid;grid-template-rows:minmax(240px,46%) minmax(0,1fr)}
.email-message-content{min-height:0}
.email-html,.email-text{width:100%;height:100%;border:0;background:#fff}
.email-text{margin:0;overflow:auto;padding:20px;white-space:pre-wrap;word-break:break-word;line-height:1.65}
.attachment-preview{min-height:0;display:flex;flex-direction:column;border-top:1px solid rgba(23,32,51,.08)}
.attachment-preview[hidden]{display:none}
.attachment-preview-head{min-height:48px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 14px;background:rgba(255,255,255,.78)}
.attachment-preview-head button{height:32px;padding:0 12px;border:0;border-radius:9px;background:#1f7a58;color:#fff;font-weight:800}
.attachment-target{flex:1;min-height:0;overflow:auto}
.email-attachment-render{width:100%;height:100%;min-height:320px}
.email-state{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:14px;background:rgba(243,246,248,.86);z-index:2}
.email-state span{width:34px;height:34px;border-radius:999px;border:3px solid rgba(31,122,88,.16);border-top-color:#1f7a58;animation:email-spin .9s linear infinite}
.email-error{position:absolute;right:18px;bottom:18px;width:min(460px,calc(100% - 36px));padding:14px;border-radius:14px;background:#fff7e8;color:#8a4b00;box-shadow:0 16px 36px rgba(23,32,51,.14);z-index:3}
.email-error p{margin:6px 0 0}
@keyframes email-spin{to{transform:rotate(360deg)}}
[data-viewer-theme='dark'] .email-viewer{background:#172033;color:#e5eef8}
[data-viewer-theme='dark'] .email-header,[data-viewer-theme='dark'] .email-sidebar,[data-viewer-theme='dark'] .attachment-item,[data-viewer-theme='dark'] .email-text,[data-viewer-theme='dark'] .attachment-preview-head{border-color:rgba(139,148,158,.2);background:#111827;color:#e5eef8}
[data-viewer-theme='dark'] .email-meta p,[data-viewer-theme='dark'] .attachment-item em,[data-viewer-theme='dark'] .attachment-title span,[data-viewer-theme='dark'] .attachment-empty{color:#94a3b8}
[data-viewer-theme='dark'] .email-meta strong,[data-viewer-theme='dark'] .attachment-title,[data-viewer-theme='dark'] .attachment-item strong{color:#f8fafc}
[data-viewer-theme='dark'] .body-tabs{background:rgba(139,148,158,.12)}[data-viewer-theme='dark'] .body-tabs button{color:#94a3b8}[data-viewer-theme='dark'] .body-tabs button.active{background:#1f2937;color:#f8fafc}
[data-viewer-theme='dark'] .email-html{background:#111827;color-scheme:dark}
[data-viewer-theme='dark'] .email-state{background:rgba(13,17,23,.9);color:#cbd5e1}
@media (prefers-color-scheme:dark){[data-viewer-theme='system'] .email-viewer{background:#172033;color:#e5eef8}[data-viewer-theme='system'] .email-header,[data-viewer-theme='system'] .email-sidebar,[data-viewer-theme='system'] .attachment-item,[data-viewer-theme='system'] .email-text,[data-viewer-theme='system'] .attachment-preview-head{border-color:rgba(139,148,158,.2);background:#111827;color:#e5eef8}[data-viewer-theme='system'] .email-meta p,[data-viewer-theme='system'] .attachment-item em,[data-viewer-theme='system'] .attachment-title span,[data-viewer-theme='system'] .attachment-empty{color:#94a3b8}[data-viewer-theme='system'] .email-meta strong,[data-viewer-theme='system'] .attachment-title,[data-viewer-theme='system'] .attachment-item strong{color:#f8fafc}[data-viewer-theme='system'] .body-tabs{background:rgba(139,148,158,.12)}[data-viewer-theme='system'] .body-tabs button{color:#94a3b8}[data-viewer-theme='system'] .body-tabs button.active{background:#1f2937;color:#f8fafc}[data-viewer-theme='system'] .email-html{background:#111827;color-scheme:dark}[data-viewer-theme='system'] .email-state{background:rgba(13,17,23,.9);color:#cbd5e1}}
@media (max-width:860px){.email-meta,.email-body{grid-template-columns:1fr}.email-body{grid-template-rows:auto minmax(0,1fr)}.email-sidebar{border-right:0;border-bottom:1px solid rgba(23,32,51,.08)}}
`;

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value < 0) {
    return '-';
  }
  if (value < 1024) {
    return `${value} B`;
  }
  const mb = value / 1024 / 1024;
  if (mb >= 1) {
    return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  }
  return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`;
};

const normalizeAddress = (value: unknown): EmailAddress[] => {
  if (!value) {
    return [];
  }
  const source = Array.isArray(value) ? value : [value];
  return source.flatMap(item => {
    const candidate = item as { name?: string; address?: string; email?: string; group?: EmailAddress[] };
    if (candidate.group) {
      return normalizeAddress(candidate.group);
    }
    return [{
      name: candidate.name || '',
      address: candidate.address || candidate.email || '',
    }];
  });
};

const addressText = (items: EmailAddress[]) => {
  return items
    .map(item => item.name && item.address ? `${item.name} <${item.address}>` : item.address || item.name || '')
    .filter(Boolean)
    .join(', ');
};

const toArrayBuffer = async (value: ArrayBuffer | Uint8Array | string): Promise<ArrayBuffer> => {
  if (value instanceof ArrayBuffer) {
    return value;
  }
  if (value instanceof Uint8Array) {
    const copy = new Uint8Array(value.byteLength);
    copy.set(value);
    return copy.buffer;
  }
  return toArrayBuffer(new TextEncoder().encode(value));
};

const normalizeContentId = (value?: string) => (value || '').replace(/[<>]/g, '');

const createPostalAttachments = (
  email: any,
  objectUrls: string[],
  cidUrls: Map<string, string>
) => {
  const attachments: EmailAttachmentView[] = (email.attachments || []).map((attachment: any, index: number) => {
    const size = typeof attachment.content === 'string'
      ? attachment.content.length
      : attachment.content?.byteLength || 0;
    const name = attachment.filename || `attachment-${index + 1}`;
    return {
      id: `${index}-${name}`,
      name,
      mimeType: attachment.mimeType,
      size,
      contentId: attachment.contentId,
      load: () => toArrayBuffer(attachment.content),
    };
  });

  return Promise.all(attachments.map(async attachment => {
    if (!attachment.contentId || !attachment.mimeType?.startsWith('image/')) {
      return;
    }
    const buffer = await attachment.load();
    const url = URL.createObjectURL(new Blob([buffer], { type: attachment.mimeType }));
    objectUrls.push(url);
    cidUrls.set(normalizeContentId(attachment.contentId), url);
  })).then(() => attachments);
};

const parseEml = async (
  buffer: ArrayBuffer,
  filename: string,
  objectUrls: string[],
  cidUrls: Map<string, string>
): Promise<ParsedEmailView> => {
  const PostalMime = (await import('postal-mime')).default as any;
  const email = await PostalMime.parse(buffer, {
    attachmentEncoding: 'arraybuffer',
    maxNestingDepth: 24,
    maxHeadersSize: 2 * 1024 * 1024,
  });
  const attachments = await createPostalAttachments(email, objectUrls, cidUrls);

  return {
    kind: 'eml',
    subject: email.subject || filename,
    from: normalizeAddress(email.from),
    to: normalizeAddress(email.to),
    cc: normalizeAddress(email.cc),
    date: email.date,
    text: email.text,
    html: email.html,
    headers: email.headerLines?.map((item: any) => item.line).join('\n')
      || email.headers?.map((item: any) => `${item.originalKey}: ${item.value}`).join('\n'),
    attachments,
  };
};

const parseMbox = async (
  buffer: ArrayBuffer,
  filename: string,
  objectUrls: string[],
  cidUrls: Map<string, string>,
  t: ReturnType<typeof createFileViewerTranslator>
): Promise<ParsedEmailView> => {
  const source = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const starts = [...source.matchAll(/^From .*$\n/gm)].map(match => match.index || 0);
  const firstStart = starts[0] ?? 0;
  const secondStart = starts[1] ?? source.length;
  const firstMessage = source.slice(firstStart, secondStart).replace(/^From .*$\n/, '');
  const encoded = new TextEncoder().encode(firstMessage).buffer;
  const PostalMime = (await import('postal-mime')).default as any;
  const email = await PostalMime.parse(encoded, {
    attachmentEncoding: 'arraybuffer',
    maxNestingDepth: 24,
    maxHeadersSize: 2 * 1024 * 1024,
  });
  const attachments = await createPostalAttachments(email, objectUrls, cidUrls);

  return {
    kind: 'mbox',
    subject: email.subject || t('email.mbox.subject', { filename }),
    from: normalizeAddress(email.from),
    to: normalizeAddress(email.to),
    cc: normalizeAddress(email.cc),
    date: email.date,
    text: `${t('email.mbox.summary', { count: Math.max(1, starts.length) })}\n\n${email.text || ''}`,
    html: email.html,
    headers: email.headerLines?.map((item: any) => item.line).join('\n')
      || email.headers?.map((item: any) => `${item.originalKey}: ${item.value}`).join('\n'),
    attachments,
  };
};

const parseMsg = async (buffer: ArrayBuffer, filename: string): Promise<ParsedEmailView> => {
  const msgReaderModule = await import('@kenjiuno/msgreader');
  const MsgReader = ((msgReaderModule.default as any)?.default || msgReaderModule.default) as any;
  const reader = new MsgReader(buffer);
  const fileData = reader.getFileData();
  const attachments: EmailAttachmentView[] = (fileData.attachments || []).map((attachment: any, index: number) => {
    const name = attachment.fileName || attachment.fileNameShort || attachment.name || `attachment-${index + 1}${attachment.extension || ''}`;
    return {
      id: `${index}-${name}`,
      name,
      mimeType: 'application/octet-stream',
      size: attachment.contentLength || attachment.size || 0,
      contentId: attachment.pidContentId,
      async load() {
        const file = reader.getAttachment(attachment);
        return toArrayBuffer(file.content);
      },
    };
  });

  return {
    kind: 'msg',
    subject: fileData.subject || filename,
    from: normalizeAddress({ name: fileData.senderName, address: fileData.senderEmail }),
    to: normalizeAddress(fileData.recipients || []).filter(item => item.name || item.address),
    cc: [],
    date: fileData.messageDeliveryTime || fileData.clientSubmitTime || fileData.creationTime,
    text: fileData.body,
    html: fileData.html || '',
    headers: fileData.headers,
    attachments,
  };
};

const parseEmail = (
  buffer: ArrayBuffer,
  type: EmailKind,
  filename: string,
  objectUrls: string[],
  cidUrls: Map<string, string>,
  t: ReturnType<typeof createFileViewerTranslator>
) => {
  if (type === 'msg') {
    return parseMsg(buffer, filename);
  }
  if (type === 'mbox') {
    return parseMbox(buffer, filename, objectUrls, cidUrls, t);
  }
  return parseEml(buffer, filename, objectUrls, cidUrls);
};

const createStyle = () => {
  const style = document.createElement('style');
  style.textContent = emailStyle;
  return style;
};

const createElement = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  text?: string
) => {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
};

const getAttachmentExtension = (name: string) => {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1).toLowerCase() : 'txt';
};

const createHtmlSrcdoc = (html: string, cidUrls: Map<string, string>, darkMode = false) => {
  let next = html;
  cidUrls.forEach((url, cid) => {
    const escaped = cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`cid:${escaped}`, 'gi'), url);
  });
  const pageStyle = darkMode
    ? ':root{color-scheme:dark}body{background:#111827;color:#e5e7eb}'
    : ':root{color-scheme:light}body{background:#fff;color:#172033}';
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>${pageStyle}body{margin:0;padding:18px;font-family:Aptos,"Segoe UI",sans-serif;line-height:1.6;word-break:break-word;}img{max-width:100%;height:auto;}</style></head><body>${next}</body></html>`;
};

const appendMeta = (meta: HTMLElement, label: string, value: string) => {
  const row = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = label;
  row.append(strong, document.createTextNode(value || '-'));
  meta.append(row);
};

export default async function renderEmail(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type = 'eml',
  context?: FileRenderContext
): Promise<FileViewerRenderedInstance> {
  const normalizedType: EmailKind = type === 'msg' ? 'msg' : type === 'mbox' ? 'mbox' : 'eml';
  const filename = context?.filename || `message.${normalizedType}`;
  const objectUrls: string[] = [];
  const cidUrls = new Map<string, string>();
  const t = createFileViewerTranslator(context?.options);
  const systemDark = target.ownerDocument.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const darkMode = resolveFileViewerColorScheme(context?.options?.theme, systemDark) === 'dark';
  const cleanups: Array<() => void> = [];
  let nestedRendered: FileViewerRenderedInstance | undefined;
  let attachmentPreviewVersion = 0;
  let attachmentAbortController: AbortController | undefined;
  let disposed = false;
  let overlay: HTMLDivElement | null = null;
  let errorElement: HTMLDivElement | null = null;

  const root = createElement('section', 'email-viewer');
  const style = createStyle();
  target.replaceChildren(style, root);

  const listen = <K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    event: K,
    listener: (event: HTMLElementEventMap[K]) => void
  ) => {
    element.addEventListener(event, listener as EventListener);
    cleanups.push(() => element.removeEventListener(event, listener as EventListener));
  };

  const showLoading = (text: string) => {
    if (!overlay) {
      overlay = createElement('div', 'email-state');
      overlay.append(createElement('span'), createElement('strong', undefined, text));
      root.append(overlay);
      return;
    }
    const label = overlay.querySelector('strong');
    if (label) {
      label.textContent = text;
    }
  };

  const hideLoading = () => {
    overlay?.remove();
    overlay = null;
  };

  const showError = (message: string) => {
    errorElement?.remove();
    errorElement = createElement('div', 'email-error');
    errorElement.append(createElement('strong', undefined, t('email.error.title')));
    errorElement.append(createElement('p', undefined, message));
    root.append(errorElement);
  };

  const clearAttachmentPreview = async () => {
    await disposeFileViewerRendered(nestedRendered);
    nestedRendered = undefined;
  };

  const downloadAttachment = async (attachment: EmailAttachmentView) => {
    const attachmentBuffer = await attachment.load();
    const url = URL.createObjectURL(new Blob([attachmentBuffer], { type: attachment.mimeType || 'application/octet-stream' }));
    objectUrls.push(url);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.name;
    document.body.append(link);
    link.click();
    link.remove();
  };

  const renderParsedEmail = (parsed: ParsedEmailView) => {
    let activeBody: EmailBodyMode = parsed.html ? 'html' : parsed.text ? 'text' : 'headers';
    let activeAttachment: EmailAttachmentView | null = null;
    const tabButtons: Array<{ mode: EmailBodyMode; button: HTMLButtonElement }> = [];
    const attachmentButtons: Array<{ id: string; button: HTMLButtonElement }> = [];

    root.replaceChildren();

    const header = createElement('header', 'email-header');
    header.append(createElement('span', undefined, parsed.kind.toUpperCase()));
    header.append(createElement('h2', undefined, parsed.subject || filename));
    const meta = createElement('div', 'email-meta');
    appendMeta(meta, t('email.meta.from'), addressText(parsed.from));
    appendMeta(meta, t('email.meta.to'), addressText(parsed.to));
    if (parsed.cc.length) {
      appendMeta(meta, t('email.meta.cc'), addressText(parsed.cc));
    }
    appendMeta(meta, t('email.meta.date'), parsed.date || '-');
    header.append(meta);

    const body = createElement('div', 'email-body');
    const sidebar = createElement('aside', 'email-sidebar');
    const tabs = createElement('div', 'body-tabs');
    const messagePanel = createElement('main', 'message-panel');
    const messageContent = createElement('div', 'email-message-content');
    const attachmentPreview = createElement('section', 'attachment-preview') as HTMLElement;
    attachmentPreview.hidden = true;
    const attachmentPreviewHead = createElement('div', 'attachment-preview-head');
    const attachmentPreviewTitle = createElement('strong');
    const attachmentDownload = createElement('button', undefined, t('email.attachments.download'));
    attachmentDownload.type = 'button';
    const attachmentTarget = createElement('div', 'attachment-target') as HTMLDivElement;
    attachmentPreviewHead.append(attachmentPreviewTitle, attachmentDownload);
    attachmentPreview.append(attachmentPreviewHead, attachmentTarget);

    const renderMessageContent = () => {
      messageContent.replaceChildren();
      if (activeBody === 'html' && parsed.html) {
        const iframe = createElement('iframe', 'email-html') as HTMLIFrameElement;
        iframe.setAttribute('sandbox', '');
        iframe.srcdoc = createHtmlSrcdoc(parsed.html, cidUrls, darkMode);
        messageContent.append(iframe);
        return;
      }
      const pre = createElement('pre', 'email-text');
      pre.textContent = activeBody === 'text' ? parsed.text || '' : parsed.headers || '';
      messageContent.append(pre);
    };

    const syncTabState = () => {
      tabButtons.forEach(({ mode, button }) => {
        button.classList.toggle('active', mode === activeBody);
      });
    };

    const bodyModes: Array<{ key: EmailBodyMode; label: string; disabled: boolean }> = [
      { key: 'html', label: 'HTML', disabled: !parsed.html },
      { key: 'text', label: t('email.tabs.text'), disabled: !parsed.text },
      { key: 'headers', label: t('email.tabs.headers'), disabled: !parsed.headers },
    ];
    bodyModes.forEach(mode => {
      const button = createElement('button', undefined, mode.label);
      button.type = 'button';
      button.disabled = mode.disabled;
      listen(button, 'click', () => {
        if (button.disabled) {
          return;
        }
        activeBody = mode.key;
        syncTabState();
        renderMessageContent();
      });
      tabButtons.push({ mode: mode.key, button });
      tabs.append(button);
    });
    syncTabState();

    const attachmentPanel = createElement('section', 'attachment-panel');
    const attachmentTitle = createElement('div', 'attachment-title');
    attachmentTitle.append(createElement('strong', undefined, t('email.attachments.title')), createElement('span', undefined, String(parsed.attachments.length)));
    attachmentPanel.append(attachmentTitle);
    if (!parsed.attachments.length) {
      attachmentPanel.append(createElement('p', 'attachment-empty', t('email.attachments.empty')));
    }

    const syncAttachmentState = () => {
      attachmentButtons.forEach(({ id, button }) => {
        button.classList.toggle('active', id === activeAttachment?.id);
      });
    };

    const previewAttachment = async (attachment: EmailAttachmentView) => {
      const previewVersion = ++attachmentPreviewVersion;
      attachmentAbortController?.abort();
      const previewAbortController = new AbortController();
      attachmentAbortController = previewAbortController;
      const abortFromParent = () => previewAbortController.abort(context?.signal?.reason);
      if (context?.signal?.aborted) {
        abortFromParent();
      } else {
        context?.signal?.addEventListener('abort', abortFromParent, { once: true });
      }
      activeAttachment = attachment;
      syncAttachmentState();
      attachmentPreview.hidden = false;
      attachmentPreviewTitle.textContent = attachment.name;
      showLoading(t('email.attachments.opening', { name: attachment.name }));
      try {
        await clearAttachmentPreview();
        attachmentTarget.replaceChildren();
        const attachmentBuffer = await attachment.load();
        const child = createElement('div', 'email-attachment-render') as HTMLDivElement;
        attachmentTarget.append(child);
        const extension = getAttachmentExtension(attachment.name);
        if (context?.renderNestedBuffer) {
          const nextRendered = await context.renderNestedBuffer(attachmentBuffer, extension, child, {
            ...context,
            filename: attachment.name,
            options: context.options,
            signal: previewAbortController.signal,
          });
          if (disposed || previewVersion !== attachmentPreviewVersion || previewAbortController.signal.aborted) {
            await disposeFileViewerRendered(nextRendered);
            return;
          }
          nestedRendered = nextRendered;
        } else {
          child.append(createElement('div', undefined, t('email.attachments.nestedUnavailable', { name: attachment.name })));
        }
      } catch (nextError) {
        if (disposed || previewVersion !== attachmentPreviewVersion || previewAbortController.signal.aborted) {
          return;
        }
        console.error(nextError);
        showError(nextError instanceof Error ? nextError.message : String(nextError));
      } finally {
        context?.signal?.removeEventListener('abort', abortFromParent);
        if (attachmentAbortController === previewAbortController) {
          attachmentAbortController = undefined;
        }
        if (!disposed && previewVersion === attachmentPreviewVersion) {
          hideLoading();
        }
      }
    };

    parsed.attachments.forEach(attachment => {
      const button = createElement('button', 'attachment-item');
      button.type = 'button';
      const icon = createElement('span', undefined, getAttachmentExtension(attachment.name).toUpperCase() || 'FILE');
      const name = createElement('strong', undefined, attachment.name);
      const size = createElement('em', undefined, formatBytes(attachment.size));
      button.append(icon, name, size);
      listen(button, 'click', () => {
        void previewAttachment(attachment);
      });
      attachmentButtons.push({ id: attachment.id, button });
      attachmentPanel.append(button);
    });

    listen(attachmentDownload, 'click', () => {
      if (activeAttachment) {
        void downloadAttachment(activeAttachment);
      }
    });

    renderMessageContent();
    sidebar.append(tabs, attachmentPanel);
    messagePanel.append(messageContent, attachmentPreview);
    body.append(sidebar, messagePanel);
    root.append(header, body);
  };

  showLoading(t('email.loading.parsing'));
  try {
    const parsed = await parseEmail(buffer, normalizedType, filename, objectUrls, cidUrls, t);
    renderParsedEmail(parsed);
  } catch (nextError) {
    console.error(nextError);
    root.replaceChildren();
    showError(nextError instanceof Error ? nextError.message : String(nextError));
  } finally {
    hideLoading();
  }

  return {
    $el: root,
    async unmount() {
      disposed = true;
      attachmentPreviewVersion += 1;
      attachmentAbortController?.abort();
      attachmentAbortController = undefined;
      await clearAttachmentPreview();
      cleanups.splice(0).forEach(cleanup => cleanup());
      objectUrls.forEach(url => URL.revokeObjectURL(url));
      target.replaceChildren();
    },
  };
}
