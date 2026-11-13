import {
  createFileViewerTranslator,
  type FileViewerI18nContext,
  type FileViewerMessageKey,
  type FileViewerMessageParams,
  type FileViewerOptions,
} from '@file-viewer/core';
import type { SheetComment, SheetDefinition } from './worker/type.js';

export type SpreadsheetCommentEntry = SheetComment & {
  sheetId: number;
  sheetName: string;
  key: string;
};
type CellFocusTarget = { address: string; sheetId: number };
interface Options {
  root: HTMLDivElement;
  toolbar: HTMLDivElement;
  body: HTMLDivElement;
  options?: FileViewerOptions;
  i18n?: FileViewerI18nContext;
  navigate: (entry: SpreadsheetCommentEntry) => void;
  getSheetId: () => number;
}

const commentKeys = {
  title: 'spreadsheet.comments.title',
  close: 'spreadsheet.comments.close',
  note: 'spreadsheet.comments.note',
  thread: 'spreadsheet.comments.thread',
  resolved: 'spreadsheet.comments.resolved',
  unknown: 'spreadsheet.comments.unknown',
  empty: 'spreadsheet.comments.empty',
  more: 'spreadsheet.comments.more',
  open: 'spreadsheet.comments.open',
  jump: 'spreadsheet.comments.jump',
  warning: 'spreadsheet.comments.warning',
  count: 'spreadsheet.comments.count',
} satisfies Record<string, FileViewerMessageKey>;

export const createSpreadsheetComments = ({
  root,
  toolbar,
  body,
  options,
  i18n,
  navigate,
  getSheetId,
}: Options) => {
  const document = root.ownerDocument;
  const t = createFileViewerTranslator(i18n || options);
  const label = (
    key: keyof typeof commentKeys,
    values?: FileViewerMessageParams,
  ) => t(commentKeys[key], values);
  const isElement = (value: unknown): value is HTMLElement =>
    value instanceof (document.defaultView?.HTMLElement || HTMLElement);
  let sheets: SheetDefinition[] = [];
  let hasError = false;
  let limit = 30;
  let selectedId = '';
  let returnFocus: CellFocusTarget | null = null;
  let focusedCell: (CellFocusTarget & { element: HTMLElement }) | null = null;
  let activeList: HTMLDivElement | null = null;
  let shownPopover: { entry: SpreadsheetCommentEntry; anchor: HTMLElement } | null = null;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'excel-comments-toggle hidden';
  toggle.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('aside');
  panel.className = 'excel-comments-panel hidden';
  panel.setAttribute('aria-label', label('title'));
  const popover = document.createElement('section');
  popover.className = 'excel-comment-popover hidden';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', label('title'));
  popover.tabIndex = -1;
  const entries = (): SpreadsheetCommentEntry[] =>
    sheets
      .filter((sheet) => !sheet.hidden)
      .flatMap((sheet) =>
        (sheet.comments || []).map((comment) => ({
          ...comment,
          sheetId: sheet.id,
          sheetName: sheet.name,
          key: `${sheet.id}:${comment.address}`,
        })),
      );
  const textNode = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    value: string,
    className?: string,
  ): HTMLElementTagNameMap[K] => {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  };
  const button = (text: string, action: () => void, className: string) => {
    const node = textNode('button', text, className);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  };
  const closeButton = (action: () => void) => {
    const node = button('', action, 'excel-comments-close');
    node.setAttribute('aria-label', label('close'));
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('width', '16');
    icon.setAttribute('height', '16');
    icon.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M6 6l12 12M18 6 6 18');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-linecap', 'round');
    icon.append(path);
    node.append(icon);
    return node;
  };
  const findIndicator = (cell: CellFocusTarget | null) =>
    cell && cell.sheetId === getSheetId()
      ? Array.from(
          root.querySelectorAll<HTMLButtonElement>('.excel-comment-indicator'),
        ).find((node) => node.dataset.cell === cell.address)
      : null;
  const focusin = (event: Event) => {
    const indicator = event
      .composedPath()
      .find(
        (node): node is HTMLElement =>
          isElement(node) &&
          node.classList.contains('excel-comment-indicator') &&
          root.contains(node),
      );
    focusedCell = indicator
      ? {
          element: indicator,
          address: indicator.dataset.cell || '',
          sheetId: getSheetId(),
        }
      : null;
  };
  const closePopover = (restoreFocus = false) => {
    popover.classList.add('hidden');
    shownPopover = null;
    if (restoreFocus)
      (findIndicator(returnFocus) || toggle).focus({ preventScroll: true });
  };
  const renderThread = (
    entry: SpreadsheetCommentEntry,
    destination: HTMLElement,
    { jump, close }: { jump?: () => void; close?: HTMLButtonElement } = {},
  ) => {
    const heading = textNode('div', '', 'excel-comment-heading');
    const location = textNode('div', '', 'excel-comment-location');
    const reference = `${entry.sheetName}!${entry.address}`;
    const cell = jump
      ? button(reference, jump, 'excel-comment-cell excel-comment-jump')
      : textNode('span', reference, 'excel-comment-cell');
    cell.title = reference;
    if (jump)
      cell.setAttribute('aria-label', label('jump', { cell: reference }));
    if (jump) cell.textContent = entry.address;
    location.append(
      cell,
      textNode(
        'span',
        entry.resolved ? label('resolved') : label(entry.kind),
        'excel-comment-kind',
      ),
    );
    heading.append(location);
    if (close) heading.append(close);
    destination.append(heading);
    for (const message of entry.messages) {
      const item = textNode('div', '', 'excel-comment-message');
      const metadata = textNode('div', '', 'excel-comment-metadata');
      metadata.append(textNode('strong', message.author || label('unknown')));
      const date = message.createdAt ? new Date(message.createdAt) : null;
      if (date && Number.isFinite(date.getTime())) {
        const time = textNode(
          'time',
          t.formatDateTime(date, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        );
        time.dateTime = date.toISOString();
        time.title = t.formatDateTime(date);
        metadata.append(time);
      }
      item.append(metadata, textNode('p', message.text));
      destination.append(item);
    }
  };
  const renderPanel = (revealSelected = false, focusKey = '') => {
    const focused = root.querySelector<HTMLElement>(':focus');
    const focusedKey =
      focused && panel.contains(focused)
        ? focused.closest<HTMLElement>('[data-entry-key]')?.dataset.entryKey
        : '';
    const focusedClose =
      focused &&
      panel.contains(focused) &&
      focused.classList.contains('excel-comments-close');
    const focusedMore =
      focused && panel.contains(focused) && focused.dataset.action === 'more';
    const previousScroll = activeList?.scrollTop || 0;
    panel.replaceChildren();
    const heading = textNode('div', '', 'excel-comments-header');
    heading.append(
      textNode('h2', label('title'), 'excel-comments-title'),
      closeButton(() => setOpen(false)),
    );
    panel.append(heading);
    const list = textNode('div', '', 'excel-comments-list');
    const all = entries();
    if (hasError) {
      const warning = textNode('p', label('warning'), 'excel-comments-warning');
      warning.setAttribute('role', 'status');
      list.append(warning);
    }
    if (!all.length && !hasError) list.append(textNode('p', label('empty')));
    let currentSheet: number | undefined;
    let group: HTMLUListElement | undefined;
    const multipleSheets = new Set(all.map((entry) => entry.sheetId)).size > 1;
    for (const entry of all.slice(0, limit)) {
      if (currentSheet !== entry.sheetId) {
        currentSheet = entry.sheetId;
        const section = textNode('section', '', 'excel-comments-sheet-group');
        if (multipleSheets)
          section.append(
            textNode('h3', entry.sheetName, 'excel-comments-sheet-title'),
          );
        group = textNode('ul', '', 'excel-comments-sheet-entries');
        section.append(group);
        list.append(section);
      }
      const card = textNode('li', '', 'excel-comment-card');
      card.dataset.entryKey = entry.key;
      card.setAttribute('aria-current', String(entry.key === selectedId));
      card.dataset.selected = String(entry.key === selectedId);
      renderThread(entry, card, {
        jump: () => {
          selectedId = entry.key;
          navigate(entry);
          renderPanel(true);
        },
      });
      group?.append(card);
    }
    if (all.length > limit) {
      const more = button(
        label('more'),
        () => {
          const nextKey = all[limit]?.key;
          limit += 30;
          renderPanel(false, nextKey);
        },
        'excel-comment-jump',
      );
      more.dataset.action = 'more';
      list.append(more);
    }
    panel.append(list);
    activeList = list;
    list.scrollTop = previousScroll;
    const targetKey = focusKey || (revealSelected ? selectedId : focusedKey);
    const target = Array.from(
      list.querySelectorAll<HTMLElement>('[data-entry-key]'),
    ).find((node) => node.dataset.entryKey === targetKey);
    if (target) {
      if (focusKey || revealSelected)
        target.scrollIntoView({ block: 'nearest' });
      target.querySelector('button')?.focus({ preventScroll: true });
    } else if (focusedClose || focusedKey)
      panel
        .querySelector<HTMLButtonElement>('.excel-comments-close')
        ?.focus({ preventScroll: true });
    else if (focusedMore)
      (
        list.querySelector<HTMLButtonElement>('[data-action=more]') ||
        panel.querySelector<HTMLButtonElement>('.excel-comments-close')
      )?.focus({ preventScroll: true });
  };
  const setOpen = (open: boolean) => {
    closePopover();
    panel.classList.toggle('hidden', !open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      renderPanel();
      panel.querySelector('button')?.focus();
    } else toggle.focus();
  };
  const renderPopover = () => {
    if (!shownPopover) return;
    const { entry, anchor } = shownPopover;
    popover.replaceChildren();
    const close = closeButton(() => closePopover(true));
    renderThread(entry, popover, { close });
    popover.classList.remove('hidden');
    const hostRect = root.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const width = Math.min(320, hostRect.width - 16);
    popover.style.width = `${width}px`;
    popover.style.left = `${Math.max(8, Math.min(anchorRect.right - hostRect.left - width, hostRect.width - width - 8))}px`;
    const height = popover.getBoundingClientRect().height;
    popover.style.top = `${Math.max(8, Math.min(anchorRect.bottom - hostRect.top + 6, hostRect.height - height - 8))}px`;
  };
  const refreshLabels = () => {
    for (const indicator of root.querySelectorAll<HTMLElement>('.excel-comment-indicator')) {
      const cell = indicator.dataset.cell;
      if (cell) indicator.setAttribute('aria-label', label('open', { cell }));
    }
    panel.setAttribute('aria-label', label('title'));
    popover.setAttribute('aria-label', label('title'));
    const count = entries().length;
    toggle.textContent = label('count', { count });
    toggle.classList.toggle('hidden', !count && !hasError);
    if (toggle.getAttribute('aria-expanded') === 'true') renderPanel();
    if (shownPopover) {
      const focusedClose = Boolean(popover.querySelector('.excel-comments-close:focus'));
      const previousScroll = popover.scrollTop;
      renderPopover();
      popover.scrollTop = previousScroll;
      if (focusedClose)
        popover.querySelector<HTMLButtonElement>('.excel-comments-close')?.focus({ preventScroll: true });
    }
  };
  toggle.addEventListener('click', () =>
    setOpen(toggle.getAttribute('aria-expanded') !== 'true'),
  );
  const keydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (!popover.classList.contains('hidden')) {
      closePopover(event.composedPath().includes(popover));
      event.stopPropagation();
    } else if (
      !panel.classList.contains('hidden') &&
      event.composedPath().includes(root)
    ) {
      setOpen(false);
      event.stopPropagation();
    }
  };
  const outside = (event: PointerEvent) => {
    if (
      !event.composedPath().includes(popover) &&
      !event
        .composedPath()
        .some(
          (node) =>
            isElement(node) &&
            node.classList.contains('excel-comment-indicator'),
        )
    )
      closePopover();
  };
  const focusRoot = root.getRootNode();
  focusRoot.addEventListener('focusin', focusin, true);
  if (focusRoot !== document)
    document.addEventListener('focusin', focusin, true);
  document.addEventListener('keydown', keydown, true);
  document.addEventListener('pointerdown', outside);
  body.append(panel);
  toolbar.prepend(toggle);
  root.append(popover);
  const unsubscribe = i18n?.subscribe(refreshLabels);
  return {
    restoreCellFocus() {
      if (!focusedCell || focusedCell.element.isConnected) return;
      const indicator = findIndicator(focusedCell);
      focusedCell = null;
      indicator?.focus({ preventScroll: true });
    },
    update(nextSheets: SheetDefinition[], error = false) {
      if (sheets === nextSheets && hasError === error) return;
      sheets = nextSheets;
      hasError = error;
      refreshLabels();
    },
    label,
    hide: () => closePopover(),
    show(
      comment: SheetComment,
      sheet: SheetDefinition,
      anchor: HTMLElement,
      focus = true,
    ) {
      const entry = {
        ...comment,
        sheetId: sheet.id,
        sheetName: sheet.name,
        key: `${sheet.id}:${comment.address}`,
      };
      returnFocus = { address: comment.address, sheetId: sheet.id };
      selectedId = entry.key;
      shownPopover = { entry, anchor };
      renderPopover();
      if (focus) popover.focus({ preventScroll: true });
    },
    destroy() {
      unsubscribe?.();
      shownPopover = null;
      focusRoot.removeEventListener('focusin', focusin, true);
      if (focusRoot !== document)
        document.removeEventListener('focusin', focusin, true);
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('pointerdown', outside);
    },
  };
};
export const spreadsheetCommentsStyle = `
.excel-wrapper .excel-comments-panel,.excel-wrapper .excel-comment-popover{--excel-comment-gutter:16px}
.excel-wrapper .excel-body{display:flex;position:relative;flex:1;min-height:0;min-width:0}
.excel-wrapper .excel-body .table-wrapper{width:auto;min-width:0;flex:1}
.excel-wrapper .excel-comments-toggle{align-self:flex-start;flex-shrink:0;border:0;border-radius:6px;background:transparent;min-height:32px;padding:4px 8px;color:inherit;font:inherit;font-size:12px;cursor:pointer}
.excel-wrapper .excel-comments-toggle:hover{background:#e8edf2}
.excel-wrapper .excel-comments-toggle[aria-expanded=true]{background:#e8edf2;color:#1f2937}
.excel-wrapper .excel-comments-panel{display:flex;flex-direction:column;width:min(360px,42%);min-width:220px;flex-shrink:0;border-left:1px solid #e5e7eb;background:#fff;color:#1f2937;font-size:14px}
.excel-wrapper .excel-comments-header{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;box-sizing:border-box;padding:8px var(--excel-comment-gutter)}
.excel-wrapper .excel-comments-title{margin:0;font-size:14px;line-height:20px;font-weight:600}
.excel-wrapper .excel-comments-list{display:flex;flex-direction:column;gap:8px;overflow:auto;padding:4px 0 16px;min-height:0;scroll-padding:8px}
.excel-wrapper .excel-comments-sheet-group{display:flex;flex-direction:column;gap:4px;min-width:0}
.excel-wrapper .excel-comments-sheet-title{margin:0;padding:8px var(--excel-comment-gutter);font-size:12px;line-height:16px;font-weight:500;color:#64748b;overflow-wrap:anywhere}
.excel-wrapper .excel-comments-sheet-entries{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;min-width:0}
.excel-wrapper .excel-comments-list>p{margin:0;padding:8px var(--excel-comment-gutter)}
.excel-wrapper .excel-comment-card{display:flex;flex-direction:column;gap:8px;min-width:0;padding:12px var(--excel-comment-gutter);border:0;background:transparent;overflow-wrap:anywhere}
.excel-wrapper .excel-comment-card[data-selected=true]{background:#f1f5f9}
.excel-wrapper .excel-comment-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-width:0}
.excel-wrapper .excel-comment-location{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px;min-width:0;flex:1}
.excel-wrapper .excel-comment-cell{font-size:14px;font-weight:500;line-height:20px;min-width:0;max-width:100%;overflow-wrap:anywhere}
.excel-wrapper .excel-comment-kind{font-size:12px;line-height:16px;color:#64748b}
.excel-wrapper .excel-comment-message{display:flex;flex-direction:column;gap:4px;min-width:0}
.excel-wrapper .excel-comment-metadata{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:8px;row-gap:2px;min-width:0;font-size:12px;line-height:20px;color:#64748b}
.excel-wrapper .excel-comment-metadata strong{min-width:0;max-width:100%;color:#1f2937;font-size:14px;font-weight:500;overflow-wrap:anywhere}
.excel-wrapper .excel-comment-message p{margin:0;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:20px;font-size:14px;color:inherit}
.excel-wrapper .excel-comments-close{display:flex;align-items:center;justify-content:center;border:0;background:transparent;color:inherit;font:inherit;font-size:20px;width:28px;height:28px;padding:0;cursor:pointer;border-radius:4px;flex-shrink:0}
.excel-wrapper .excel-comments-close:hover{background:#e8edf2}
.excel-wrapper .excel-comment-jump{border:0;padding:0;background:transparent;color:#166534;font:inherit;font-size:14px;font-weight:500;line-height:20px;text-align:left;cursor:pointer;overflow-wrap:anywhere;min-height:24px}
.excel-wrapper .excel-comment-jump:hover{text-decoration:underline;text-underline-offset:3px}
.excel-wrapper .excel-comments-list>.excel-comment-jump{align-self:flex-start;padding:8px var(--excel-comment-gutter);font-size:12px}
.excel-wrapper .excel-comment-popover{position:absolute;display:flex;flex-direction:column;gap:12px;box-sizing:border-box;outline:none;z-index:150;max-height:calc(100% - 16px);overflow:auto;padding:var(--excel-comment-gutter);border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#1f2937;box-shadow:0 8px 28px #0002;font-size:14px;overflow-wrap:anywhere}
.excel-wrapper .excel-comment-indicator{position:absolute;top:0;right:0;width:16px;height:16px;border:0;background:transparent;padding:0;pointer-events:auto;cursor:pointer;z-index:5}
.excel-wrapper .excel-comment-indicator::after{content:'';position:absolute;right:1px;top:1px;border-top:8px solid #7c3aed;border-left:8px solid transparent}
.excel-wrapper .excel-comment-indicator[data-kind=note]::after{border-top-color:#dc2626}
.excel-wrapper .excel-comment-indicator:focus-visible{outline:2px solid #2563eb;outline-offset:-2px}
.excel-wrapper .excel-comment-indicator[data-resolved=true]::after{border-top-color:#64748b}
.excel-wrapper .excel-comments-warning{margin:0;padding:8px var(--excel-comment-gutter);color:#92400e;font-size:12px}
.excel-wrapper[data-spreadsheet-theme=dark] .excel-comments-panel{background:#111827;color:#e5e7eb;border-color:#334155}
.excel-wrapper[data-spreadsheet-theme=dark] .excel-comment-popover{background:#18212f;color:#e5e7eb;border-color:#475569}
.excel-wrapper[data-spreadsheet-theme=dark] .excel-comment-card[data-selected=true],.excel-wrapper[data-spreadsheet-theme=dark] .excel-comments-close:hover,.excel-wrapper[data-spreadsheet-theme=dark] .excel-comments-toggle:hover{background:#243044}
.excel-wrapper[data-spreadsheet-theme=dark] .excel-comment-kind,.excel-wrapper[data-spreadsheet-theme=dark] .excel-comment-metadata{color:#94a3b8}
.excel-wrapper[data-spreadsheet-theme=dark] .excel-comment-metadata strong{color:#e5e7eb}
.excel-wrapper button:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
.excel-wrapper[data-spreadsheet-theme=dark] .excel-comment-jump{color:#86efac}
.excel-wrapper[data-spreadsheet-theme=dark] .excel-comments-sheet-title{color:#94a3b8}
.excel-wrapper[data-spreadsheet-theme=dark] button:focus-visible{outline-color:#60a5fa}
.excel-wrapper[data-spreadsheet-theme=dark] .excel-comments-toggle[aria-expanded=true]{background:#243044;color:#e5e7eb}
@media(pointer:coarse){.excel-wrapper .excel-comment-jump{min-height:32px}}
@media(max-width:640px){.excel-wrapper .excel-body:has(>.excel-comments-panel:not(.hidden)){display:grid;grid-template-rows:minmax(0,55fr) minmax(0,45fr)}.excel-wrapper .excel-comments-panel{width:100%;min-width:0;min-height:0;border-left:0;border-top:1px solid #e5e7eb}.excel-wrapper[data-spreadsheet-theme=dark] .excel-comments-panel{border-color:#334155}}
`;
