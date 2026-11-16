import { afterEach, describe, expect, it } from 'vitest';
import { fileViewerFullPreset, getDefaultFullAssetBaseUrl, getFullRendererScriptUrl, preloadFullRenderer, resetDefaultFullAssetBaseUrl, setDefaultFullAssetBaseUrl, withFullViewerOptions } from '../packages/components/web-full/src/iife';
import { pdfRendererDefinition } from '../packages/renderers/pdf/src/index';

describe('Full IIFE PDF source contract', () => {
  it('preserves the real PDF URL capability before the lazy script is downloaded', () => {
    const plugin = fileViewerFullPreset.renderers.find(plugin => plugin.definitions?.some(definition => definition.id === 'pdf'));
    expect(plugin).toBeDefined();
    expect(plugin?.definitions?.find(definition => definition.id === 'pdf')).toEqual(pdfRendererDefinition);
    expect(pdfRendererDefinition.sourceAccess).toBe('stream-preferred');
    expect(plugin?.handlers?.some(entry => entry.rendererId === 'pdf' && typeof entry.handler === 'function')).toBe(true);
  });
});

describe('Full IIFE document-free asset configuration', () => {
  afterEach(() => resetDefaultFullAssetBaseUrl());
  it('keeps relative configuration portable without inventing a server origin', async () => {
    expect(typeof document).toBe('undefined');
    setDefaultFullAssetBaseUrl('/server-assets');
    expect(getDefaultFullAssetBaseUrl()).toBe('/server-assets/');
    expect(withFullViewerOptions().spreadsheet?.workerUrl).toBe('/server-assets/vendor/xlsx/sheet.worker.js');
    expect(getFullRendererScriptUrl('xlsx', 'https://assets.example/full/')).toBe('https://assets.example/full/renderers/spreadsheet.iife.js');
    expect(() => getFullRendererScriptUrl('xlsx')).toThrow(TypeError);
    await expect(preloadFullRenderer('xlsx')).rejects.toThrow(/outside a browser document/);
    setDefaultFullAssetBaseUrl(null);
    expect(getDefaultFullAssetBaseUrl()).toBeUndefined();
    expect(withFullViewerOptions().spreadsheet?.workerUrl).toBeUndefined();
  });
});
