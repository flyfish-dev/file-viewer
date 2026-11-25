import type { createFileViewerTranslator, FileViewerSpreadsheetPasswordRequestReason } from '@file-viewer/core';

export const spreadsheetPasswordStyle = `
.excel-wrapper .excel-password-dialog{position:absolute;inset:0;z-index:1250;display:grid;place-items:center;overflow:auto;padding:16px;background:rgba(15,23,42,.56)}
.excel-wrapper .excel-password-dialog[hidden]{display:none}
.excel-wrapper .excel-password-card{display:grid;gap:14px;width:min(100%,380px);padding:22px;border-radius:14px;background:#fff;color:#172033;box-shadow:0 20px 54px rgba(0,0,0,.25)}
.excel-wrapper .excel-password-card h2,.excel-wrapper .excel-password-card p{margin:0}
.excel-wrapper .excel-password-card h2{font-size:17px;line-height:1.35}
.excel-wrapper .excel-password-card input{min-width:0;padding:10px 12px;border:1px solid #94a3b8;border-radius:8px;background:transparent;color:inherit;font:inherit}
.excel-wrapper .excel-password-card [role='alert']{font-size:13px;color:#b42318}
.excel-wrapper .excel-password-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}
.excel-wrapper .excel-password-actions button,.excel-wrapper .excel-password-retry{padding:7px 11px;border:1px solid currentColor;border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer}
.excel-wrapper .excel-password-actions button[type='submit']{border-color:#16653f;background:#16653f;color:#fff}
.excel-wrapper .excel-password-retry{margin-inline-start:10px}
.excel-wrapper .excel-password-card :focus-visible,.excel-wrapper .excel-password-retry:focus-visible{outline:2px solid #27845c;outline-offset:2px}
.excel-wrapper[data-spreadsheet-theme='dark'] .excel-password-card{background:#172033;color:#f8fafc}
.excel-wrapper[data-spreadsheet-theme='dark'] .excel-password-card [role='alert']{color:#fca5a5}
`;

export function createSpreadsheetPasswordPrompt(
  document: Document,
  t: ReturnType<typeof createFileViewerTranslator>
) {
  const element = document.createElement('div');
  element.className = 'excel-password-dialog';
  element.hidden = true;
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'true');
  t.attr(element, 'aria-label', 'spreadsheet.password.title');
  const form = document.createElement('form');
  form.className = 'excel-password-card';
  const heading = t.text(document.createElement('h2'), 'spreadsheet.password.title');
  const input = document.createElement('input');
  input.type = 'password';
  input.autocomplete = 'off';
  t.attr(input, 'aria-label', 'spreadsheet.password.title');
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  const actions = document.createElement('div');
  actions.className = 'excel-password-actions';
  const cancel = t.text(document.createElement('button'), 'archive.password.cancel');
  cancel.type = 'button';
  const submit = t.text(document.createElement('button'), 'archive.password.confirm');
  submit.type = 'submit';
  actions.append(cancel, submit);
  form.append(heading, input, message, actions);
  element.append(form);

  let resolvePending: ((password: string | null) => void) | undefined;
  let previousFocus: HTMLElement | null = null;
  let reason: FileViewerSpreadsheetPasswordRequestReason = 'encrypted';
  const close = (password: string | null = null) => {
    const complete = resolvePending;
    resolvePending = undefined;
    input.value = '';
    element.hidden = true;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
    complete?.(password);
  };
  form.addEventListener('submit', event => {
    event.preventDefault();
    close(input.value);
  });
  cancel.addEventListener('click', () => close());
  element.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
    if (event.key !== 'Tab') return;
    if (event.shiftKey && event.target === input) {
      event.preventDefault();
      submit.focus();
    } else if (!event.shiftKey && event.target === submit) {
      event.preventDefault();
      input.focus();
    }
  });

  return {
    element,
    request(nextReason: FileViewerSpreadsheetPasswordRequestReason) {
      reason = nextReason;
      const activeElement = document.activeElement;
      previousFocus = activeElement && 'focus' in activeElement ? activeElement as HTMLElement : null;
      t.bind(message, node => {
        node.textContent = reason === 'invalid-password' ? t('spreadsheet.password.invalid')
          : reason === 'read-failed' ? t('spreadsheet.password.decryptFailed')
            : '';
      });
      element.hidden = false;
      input.focus({ preventScroll: true });
      return new Promise<string | null>(resolve => { resolvePending = resolve; });
    },
    close,
  };
}
