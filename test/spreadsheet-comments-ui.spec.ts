import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { createSpreadsheetComments } from '../packages/renderers/spreadsheet/src/spreadsheet/comments';
import type { SheetDefinition } from '../packages/renderers/spreadsheet/src/spreadsheet/worker/type';

function fixture(count = 61, useShadowRoot = false) {
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
