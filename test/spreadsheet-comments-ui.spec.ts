import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { createFileViewerI18n, type FileViewerI18nContext } from '@file-viewer/core';
import { createSpreadsheetComments } from '../packages/renderers/spreadsheet/src/spreadsheet/comments';
import type { SheetDefinition } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/type';
import { createEmptyVirtualState, DEFAULT_SHEET_DEFAULTS, RowState } from '../packages/renderers/spreadsheet/src/spreadsheet/state';
import { createTableConfig } from '../packages/renderers/spreadsheet/src/spreadsheet/view';

function fixture(count = 61, useShadowRoot = false, i18n?: FileViewerI18nContext) {
  const dom = new JSDOM('<!doctype html><body></body>', {
    pretendToBeVisual: true,
  });
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const document = dom.window.document;
  const root = document.createElement('div');
  const body = document.createElement('div');
  const toolbar = document.createElement('div');
  root.append(body, toolbar);
  const host = document.createElement('div');
  document.body.append(host);
  const boundary = useShadowRoot
    ? host.attachShadow({ mode: 'open' })
    : document.body;
  boundary.append(root);
  const sheets: SheetDefinition[] = [
    {
      id: 0,
      name: 'Sheet',
      comments: Array.from({ length: count }, (_, i) => ({
        address: `A${i + 1}`,
        row: i,
        col: 0,
        kind: 'note',
        resolved: false,
        messages: [
          {
            id: `note-${i}`,
            parentId: null,
            author: 'Author',
            text: `Note ${i + 1}`,
            createdAt: null,
          },
        ],
      })),
    },
  ];
  const viewer = createSpreadsheetComments({
    root,
    body,
    toolbar,
    options: { locale: 'en-US' },
    i18n,
    getSheetId: () => 0,
    navigate: () => {},
  });
  viewer.update(sheets);
  const button = (name: string) => {
    const node = Array.from(root.querySelectorAll('button')).find(
      (node) => (node.getAttribute('aria-label') || node.textContent) === name,
    );
    if (!node) throw new Error(`Missing button ${name}`);
    return node;
  };
  const open = () => button(`Comments and notes (${count})`).click();
  return { viewer, sheets, dom, root, boundary, document, button, open };
}

describe('spreadsheet comments accessibility and lifecycle', () => {
  it('updates the existing table indicator label without replacing the focused cell control', () => {
    const scope = createFileViewerI18n({ locale: 'en-US' });
    const f = fixture(1, false, scope);
    try {
      const state = createEmptyVirtualState();
      state.columns = [{ key: '__index', width: 68 }, { key: 'c0', width: 64 }];
      const config = createTableConfig({
        hostHeight: 400,
        sheetDefaults: DEFAULT_SHEET_DEFAULTS,
        virtualState: state,
        comments: f.sheets[0].comments,
        commentLabel: (comment) => scope.t('spreadsheet.comments.open', { cell: comment.address }),
      });
      const render = config.BODY_CELL_RENDER_METHOD as unknown as
        (params: unknown) => (element: HTMLDivElement) => void;
      const cell = f.document.createElement('div');
      f.root.append(cell);
      render({ row: { __s: RowState.Loaded, c0: '' }, rowIndex: 0,
        colIndex: 1, column: state.columns[1], value: '' })(cell);
      const indicator = cell.querySelector<HTMLButtonElement>('.excel-comment-indicator')!;
      indicator.focus();
      scope.update({ locale: 'ru-RU' });
      expect(indicator.getAttribute('aria-label')).toBe(scope.t('spreadsheet.comments.open', { cell: 'A1' }));
      expect(f.document.activeElement).toBe(indicator);
      expect(cell.querySelector('.excel-comment-indicator')).toBe(indicator);
    } finally {
      f.viewer.destroy();
      scope.destroy();
      f.dom.window.close();
    }
  });

  it.each(['missing Intl', 'missing locale data'])('opens dated comments with %s using the shared format fallback', (mode) => {
    const scope = createFileViewerI18n({ locale: 'ru-RU' });
    const f = fixture(1, false, scope);
    try {
      const comment = f.sheets[0].comments![0];
      comment.messages[0].createdAt = '2026-01-02T03:04:00Z';
      if (mode === 'missing Intl') vi.stubGlobal('Intl', undefined);
      else vi.spyOn(Intl.DateTimeFormat, 'supportedLocalesOf').mockReturnValue([]);
      const anchor = f.document.createElement('button');
      f.root.append(anchor);
      f.viewer.show(comment, f.sheets[0], anchor);
      const time = f.root.querySelector('time');
      expect(time?.textContent).toBe('2026-01-02T03:04:00.000Z');
      expect(time?.title).toBe('2026-01-02T03:04:00.000Z');
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      f.viewer.destroy();
      scope.destroy();
      f.dom.window.close();
    }
  });

  it('switches all seven locales without losing panel pagination, reading position or focus', () => {
    const scope = createFileViewerI18n({ locale: 'en-US' });
    const subscribe = scope.subscribe.bind(scope);
    let listeners = 0;
    scope.subscribe = (listener) => {
      listeners++;
      const unsubscribe = subscribe(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners--;
        unsubscribe();
      };
    };
    const f = fixture(61, true, scope);
    try {
      f.open();
      f.button('Show more').click();
      expect(listeners).toBe(1);
      for (const locale of ['zh-CN', 'en-US', 'ja-JP', 'de-DE', 'ru-RU', 'zh-TW', 'zh-HK'] as const) {
        f.root.querySelector('.excel-comments-list')!.scrollTop = 91;
        scope.update({ locale });
        expect(f.root.querySelector('.excel-comments-toggle')?.textContent).toBe(
          scope.t('spreadsheet.comments.count', { count: 61 }),
        );
        expect(f.root.querySelector('.excel-comments-panel')?.getAttribute('aria-label')).toBe(
          scope.t('spreadsheet.comments.title'),
        );
        expect(f.root.querySelectorAll('.excel-comment-card')).toHaveLength(60);
        expect(f.root.querySelector('.excel-comments-list')?.scrollTop).toBe(91);
        expect((f.boundary as ShadowRoot).activeElement).toBe(
          f.button(scope.t('spreadsheet.comments.jump', { cell: 'Sheet!A31' })),
        );
        expect(f.root.querySelector('.excel-comment-message p')?.textContent).toBe('Note 1');
        expect(listeners).toBe(1);
      }
      f.viewer.destroy();
      expect(listeners).toBe(0);
      const retired = f.root.textContent;
      scope.update({ locale: 'en-US' });
      expect(f.root.textContent).toBe(retired);
    } finally {
      f.viewer.destroy();
      scope.destroy();
      f.dom.window.close();
    }
  });

  it('refreshes an open preview and timestamp while preserving close-button focus and plain text', () => {
    const scope = createFileViewerI18n({ locale: 'en-US' });
    const f = fixture(1, false, scope);
    try {
      const comment = f.sheets[0].comments![0];
      comment.messages[0].createdAt = '2026-01-02T03:04:00Z';
      const anchor = f.document.createElement('button');
      f.root.append(anchor);
      f.viewer.show(comment, f.sheets[0], anchor);
      f.button('Close comments').focus();
      const popover = f.root.querySelector<HTMLElement>('.excel-comment-popover')!;
      popover.scrollTop = 27;
      scope.update({ locale: 'ru-RU', messages: { 'spreadsheet.comments.close': 'Close <details>' } });
      expect(popover.classList.contains('hidden')).toBe(false);
      expect(f.document.activeElement).toBe(f.button('Close <details>'));
      expect(popover.scrollTop).toBe(27);
      expect(popover.querySelector('time')?.textContent).toBe(
        new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(comment.messages[0].createdAt),
        ),
      );
      expect(popover.querySelector('details')).toBeNull();
      expect(popover.querySelector('.excel-comment-message p')?.textContent).toBe('Note 1');
    } finally {
      f.viewer.destroy();
      scope.destroy();
      f.dom.window.close();
    }
  });

  it('keeps keyboard focus on the first newly revealed cell during pagination', () => {
    const f = fixture();
    try {
      f.open();
      f.button('Show more').click();
      expect(f.document.activeElement).toBe(f.button('Go to Sheet!A31'));
      f.button('Show more').click();
      expect(f.document.activeElement).toBe(f.button('Go to Sheet!A61'));
      expect(f.root.querySelector('[data-action=more]')).toBeNull();
    } finally {
      f.viewer.destroy();
      f.dom.window.close();
    }
  });

  it('restores the focused row after a metadata update and falls back when it disappears', () => {
    const f = fixture(2);
    try {
      f.open();
      f.button('Go to Sheet!A2').focus();
      f.viewer.update(structuredClone(f.sheets));
      expect(f.document.activeElement).toBe(f.button('Go to Sheet!A2'));
      f.viewer.update([{ id: 0, name: 'Sheet', comments: [] }]);
      expect(f.document.activeElement).toBe(f.button('Close comments'));
    } finally {
      f.viewer.destroy();
      f.dom.window.close();
    }
  });

  it('announces partial-read warnings and marks the selected cell semantically', () => {
    const f = fixture(2);
    try {
      f.open();
      f.viewer.update(structuredClone(f.sheets), true);
      expect(f.root.querySelector('[role=status]')?.textContent).toBe(
        'Some comments could not be read',
      );
      f.button('Go to Sheet!A2').click();
      expect(
        f.root.querySelector('[aria-current=true]')?.textContent,
      ).toContain('Note 2');
    } finally {
      f.viewer.destroy();
      f.dom.window.close();
    }
  });

  it('dismisses a hover preview without stealing focus from another control', () => {
    const f = fixture(1);
    try {
      const external = f.document.createElement('button');
      f.document.body.append(external);
      external.focus();
      const anchor = f.document.createElement('button');
      f.root.append(anchor);
      const comment = f.sheets[0].comments?.[0];
      if (!comment) throw new Error('Missing fixture comment');
      f.viewer.show(comment, f.sheets[0], anchor, false);
      external.dispatchEvent(
        new f.dom.window.KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
        }),
      );
      expect(
        f.root.querySelector('[role=dialog]')?.classList.contains('hidden'),
      ).toBe(true);
      expect(f.document.activeElement).toBe(external);
    } finally {
      f.viewer.destroy();
      f.dom.window.close();
    }
  });

  it('restores cell focus after the virtual overlay replaces an indicator', () => {
    const f = fixture(1);
    try {
      const marker = f.document.createElement('button');
      marker.className = 'excel-comment-indicator';
      marker.dataset.cell = 'A1';
      f.root.append(marker);
      marker.focus();
      const next = marker.cloneNode(true);
      marker.replaceWith(next);
      f.viewer.restoreCellFocus();
      expect(f.document.activeElement).toBe(next);
    } finally {
      f.viewer.destroy();
      f.dom.window.close();
    }
  });

  it('tracks focus moves within an isolated viewer without stealing focus from its toolbar', () => {
    const f = fixture(2, true);
    try {
      const first = f.document.createElement('button');
      first.className = 'excel-comment-indicator';
      first.dataset.cell = 'A1';
      const second = f.document.createElement('button');
      second.className = 'excel-comment-indicator';
      second.dataset.cell = 'A2';
      f.root.append(first, second);
      first.focus();
      second.focus();
      const replacement = second.cloneNode(true);
      second.replaceWith(replacement);
      f.viewer.restoreCellFocus();
      expect(f.root.querySelector(':focus')).toBe(replacement);
      const toolbarButton = f.document.createElement('button');
      f.boundary.append(toolbarButton);
      toolbarButton.focus();
      replacement.parentNode?.removeChild(replacement);
      f.viewer.restoreCellFocus();
      expect(toolbarButton.matches(':focus')).toBe(true);
    } finally {
      f.viewer.destroy();
      f.dom.window.close();
    }
  });

  it('renders user-authored content as text and unregisters document listeners on disposal', () => {
    const f = fixture(1);
    try {
      const comment = f.sheets[0].comments?.[0];
      if (!comment) throw new Error('Missing fixture comment');
      comment.messages[0].text = '<img src=x onerror=alert(1)>';
      f.open();
      expect(
        f.root.querySelector('.excel-comment-message p')?.textContent,
      ).toBe(comment.messages[0].text);
      expect(f.root.querySelector('img')).toBeNull();
      f.viewer.destroy();
      f.root.dispatchEvent(
        new f.dom.window.KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
        }),
      );
      expect(f.root.querySelector('aside')?.classList.contains('hidden')).toBe(
        false,
      );
    } finally {
      f.viewer.destroy();
      f.dom.window.close();
    }
  });
});
