import { describe, expect, it } from 'vitest';
import { fileViewerFullPreset } from '../packages/components/web-full/src/iife';
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
