// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createEpubScrolledManager, resolveEpubJs, resolveEpubNavigationHref } from '../packages/renderers/ebook/src/epub';

const createEpubFactory = () => {
  return function ePub() {
    return undefined;
  };
};

describe('epubjs module resolution', () => {
  it('unwraps nested default exports to find the callable factory', () => {
    const ePub = createEpubFactory();

    expect(resolveEpubJs({ default: ePub })).toBe(ePub);
    expect(resolveEpubJs({ default: { default: ePub } })).toBe(ePub);
  });
});

describe('EPUB scrolled manager lifecycle', () => {
  const setupManager = () => {
    const originalListeners = vi.fn();
    const addScrollListeners = vi.fn();
    const removeScrollListeners = vi.fn();
    const destroy = vi.fn();
    class ContinuousManager {
      ignore = false;
      addEventListeners() { originalListeners(); }
      addScrollListeners() { addScrollListeners(); }
      removeEventListeners() { removeScrollListeners(); }
      destroy() { this.removeEventListeners(); destroy(); }
    }
    const requireManager = vi.fn(() => ContinuousManager);
    const factory = Object.assign(createEpubFactory(), { Rendition: { prototype: { requireManager } } });
    const Manager = createEpubScrolledManager(factory as never);
    return { manager: new Manager(), requireManager, originalListeners, addScrollListeners, removeScrollListeners, destroy };
  };

  it('reuses continuous scrolling without registering the upstream unload handler', () => {
    const fixture = setupManager();
    const addListener = vi.spyOn(window, 'addEventListener');
    try {
      fixture.manager.addEventListeners(); fixture.manager.addEventListeners();
      expect(fixture.requireManager).toHaveBeenCalledExactlyOnceWith('continuous');
      expect(fixture.originalListeners).not.toHaveBeenCalled();
      expect(fixture.addScrollListeners).toHaveBeenCalledOnce();
      expect(addListener.mock.calls.filter(([type]) => type === 'unload')).toEqual([]);
      expect(addListener.mock.calls.filter(([type]) => type === 'pagehide')).toHaveLength(1);
    } finally { fixture.manager.destroy(); addListener.mockRestore(); }
  });

  it('retains a persisted page and tears down once on a later non-persisted pagehide', () => {
    const fixture = setupManager();
    fixture.manager.addEventListeners();
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    expect(fixture.destroy).not.toHaveBeenCalled();
    expect(fixture.removeScrollListeners).not.toHaveBeenCalled();
    expect(fixture.manager.ignore).toBe(false);
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
    fixture.manager.destroy();
    expect(fixture.manager.ignore).toBe(true);
    expect(fixture.destroy).toHaveBeenCalledOnce();
    expect(fixture.removeScrollListeners).toHaveBeenCalledOnce();
  });

  it('removes the same pagehide callback on explicit teardown and cannot reattach after destroy', () => {
    const fixture = setupManager();
    const addListener = vi.spyOn(window, 'addEventListener');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    try {
      fixture.manager.addEventListeners();
      const callback = addListener.mock.calls.find(([type]) => type === 'pagehide')![1];
      fixture.manager.destroy(); fixture.manager.destroy(); fixture.manager.addEventListeners();
      expect(removeListener.mock.calls.filter(([type]) => type === 'pagehide')).toEqual([['pagehide', callback]]);
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
      expect(fixture.manager.ignore).toBe(false);
      expect(fixture.destroy).toHaveBeenCalledOnce();
      expect(fixture.addScrollListeners).toHaveBeenCalledOnce();
      expect(fixture.removeScrollListeners).toHaveBeenCalledOnce();
    } finally { fixture.manager.destroy(); addListener.mockRestore(); removeListener.mockRestore(); }
  });

  it('fails closed when the vendor manager API is unavailable', () => {
    expect(() => createEpubScrolledManager(createEpubFactory() as never)).toThrow('continuous view manager');
  });
});

describe('EPUB navigation paths', () => {
  const spineHrefs = [
    'text/cover.xhtml',
    'text/chapter.xhtml',
    'appendix.xhtml',
  ];

  it('resolves links relative to a nested EPUB 3 navigation document', () => {
    expect(resolveEpubNavigationHref(
      'chapter.xhtml#start',
      'text/nav.xhtml',
      spineHrefs
    )).toBe('text/chapter.xhtml#start');
    expect(resolveEpubNavigationHref(
      '../appendix.xhtml?view=reader#notes',
      'text/nav.xhtml',
      spineHrefs
    )).toBe('appendix.xhtml?view=reader#notes');
  });

  it('preserves already OPF-relative and external links', () => {
    expect(resolveEpubNavigationHref(
      'text/chapter.xhtml#start',
      'text/nav.xhtml',
      spineHrefs
    )).toBe('text/chapter.xhtml#start');
    expect(resolveEpubNavigationHref(
      'https://example.test/chapter.xhtml',
      'text/nav.xhtml',
      spineHrefs
    )).toBe('https://example.test/chapter.xhtml');
  });

  it('leaves an unknown link untouched instead of inventing a spine target', () => {
    expect(resolveEpubNavigationHref(
      'missing.xhtml#start',
      'text/nav.xhtml',
      spineHrefs
    )).toBe('missing.xhtml#start');
  });
});
