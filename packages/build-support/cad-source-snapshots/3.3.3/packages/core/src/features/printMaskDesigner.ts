import type {
  FileViewerPrintMaskOptions,
  FileViewerPrintMaskRegion,
  FileViewerPrintStamp,
} from '../contracts/types';
import { createFileViewerTranslator, type FileViewerI18nInput } from '../i18n/messages';
import {
  normalizeFileViewerPrintMaskRegion,
  normalizeFileViewerPrintStamp,
} from './printMask';

export interface OpenFileViewerPrintMaskDesignerOptions {
  root: HTMLElement;
  pages?: readonly HTMLElement[];
  i18n?: FileViewerI18nInput;
  color?: string;
  initialRegions?: FileViewerPrintMaskRegion[];
  initialStamps?: FileViewerPrintStamp[];
}

export interface FileViewerPrintMaskDesignerResult {
  mask: FileViewerPrintMaskOptions;
}

type Point = { x: number; y: number };

type PrintMaskPageSurface = {
  element: HTMLElement;
  pageIndex?: number;
  canvas: HTMLDivElement;
  previousPosition: string;
};

const DESIGNER_STYLE = `
.fv-print-mask-layer{position:absolute;inset:0;z-index:2147483000;pointer-events:none;}
.fv-print-mask-canvas{position:absolute;inset:0;z-index:2147483000;pointer-events:none;cursor:default;}
.fv-print-mask-canvas.is-armed{pointer-events:auto;cursor:crosshair;touch-action:none;}
.fv-print-mask-block{position:absolute;background:#000;box-sizing:border-box;pointer-events:auto;}
.fv-print-mask-block-remove{position:absolute;right:-8px;top:-8px;width:18px;height:18px;border:0;border-radius:999px;background:#111;color:#fff;font:700 12px/18px system-ui,sans-serif;cursor:pointer;padding:0;}
.fv-print-stamp{position:absolute;box-sizing:border-box;border:1px dashed rgba(22,119,76,.7);border-radius:4px;pointer-events:auto;touch-action:none;cursor:move;transform-origin:center center;}
.fv-print-stamp img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;user-select:none;}
.fv-print-stamp-resize{position:absolute;right:-7px;bottom:-7px;width:15px;height:15px;border:2px solid #fff;border-radius:4px;background:#16774c;box-shadow:0 1px 5px rgba(15,23,42,.22);cursor:nwse-resize;touch-action:none;}
.fv-print-stamp-input{display:none!important;}
.fv-print-mask-toolbar{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483001;display:inline-flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid rgba(20,35,53,.12);border-radius:999px;background:rgba(255,255,255,.94);box-shadow:0 12px 28px rgba(15,23,42,.16);pointer-events:auto;max-width:calc(100% - 24px);flex-wrap:wrap;justify-content:center;}
.fv-print-mask-toolbar span{font:600 12px/1.2 system-ui,sans-serif;color:#40546a;white-space:nowrap;}
.fv-print-mask-toolbar button{min-width:42px;height:30px;padding:0 10px;border:0;border-radius:999px;background:transparent;color:#40546a;font:800 12px/1 system-ui,sans-serif;cursor:pointer;}
.fv-print-mask-toolbar button:hover,.fv-print-mask-toolbar button.is-active{background:rgba(33,163,102,.1);color:#16774c;}
.fv-print-mask-toolbar button.primary{background:#16774c;color:#fff;}
.fv-print-mask-toolbar button.primary:hover{background:#0f5f3c;}
`;

const ensureDesignerStyle = (root: HTMLElement) => {
  const documentRef = root.ownerDocument;
  const treeRoot = root.getRootNode();
  const styleTarget = treeRoot === documentRef
    ? documentRef.head
    : treeRoot as ShadowRoot;
  if (styleTarget.querySelector('#fv-print-mask-designer-style')) {
    return;
  }
  const style = documentRef.createElement('style');
  style.id = 'fv-print-mask-designer-style';
  style.textContent = DESIGNER_STYLE;
  styleTarget.appendChild(style);
};

const toPercentRegion = (
  start: Point,
  end: Point,
  bounds: DOMRect,
  pageIndex?: number
): FileViewerPrintMaskRegion | null => {
  if (!bounds.width || !bounds.height) {
    return null;
  }
  const leftPx = Math.min(start.x, end.x);
  const topPx = Math.min(start.y, end.y);
  const widthPx = Math.abs(end.x - start.x);
  const heightPx = Math.abs(end.y - start.y);
  if (widthPx < 8 || heightPx < 8) {
    return null;
  }
  return normalizeFileViewerPrintMaskRegion({
    left: (leftPx / bounds.width) * 100,
    top: (topPx / bounds.height) * 100,
    width: (widthPx / bounds.width) * 100,
    height: (heightPx / bounds.height) * 100,
    pageIndex,
  });
};

const visibleArea = (element: HTMLElement, viewport: DOMRect) => {
  const rect = element.getBoundingClientRect();
  const width = Math.max(0, Math.min(rect.right, viewport.right) - Math.max(rect.left, viewport.left));
  const height = Math.max(0, Math.min(rect.bottom, viewport.bottom) - Math.max(rect.top, viewport.top));
  return width * height;
};

const MAX_PRINT_STAMP_BYTES = 10 * 1024 * 1024;

const readStampFileAsDataUrl = (
  file: File,
  windowRef: Window | null
) => new Promise<string>((resolve, reject) => {
  if (!/^image\/(?:png|jpe?g|webp|gif|svg\+xml)$/i.test(file.type) || file.size > MAX_PRINT_STAMP_BYTES) {
    reject(new Error('Unsupported print stamp image'));
    return;
  }
  const Reader = (windowRef as unknown as { FileReader?: typeof FileReader } | null)?.FileReader || globalThis.FileReader;
  const reader = new Reader();
  reader.addEventListener('load', () => {
    if (typeof reader.result === 'string' && reader.result.startsWith('data:image/')) {
      resolve(reader.result);
      return;
    }
    reject(new Error('Invalid print stamp image'));
  });
  reader.addEventListener('error', () => reject(reader.error || new Error('Failed to read print stamp image')));
  reader.readAsDataURL(file);
});

/**
 * Opens a page-aware print-mask designer. Browsing remains the default mode;
 * drawing is armed for the currently visible page only and disarms after one block.
 */
export const openFileViewerPrintMaskDesigner = (
  options: OpenFileViewerPrintMaskDesignerOptions
): Promise<FileViewerPrintMaskDesignerResult | null> => {
  const root = options.root;
  const documentRef = root.ownerDocument;
  const t = createFileViewerTranslator(options.i18n);
  const color = options.color || '#000000';
  const regions: FileViewerPrintMaskRegion[] = [...(options.initialRegions || [])]
    .map(region => normalizeFileViewerPrintMaskRegion(region))
    .filter((region): region is FileViewerPrintMaskRegion => !!region);
  const stamps: FileViewerPrintStamp[] = [...(options.initialStamps || [])]
    .map(stamp => normalizeFileViewerPrintStamp(stamp))
    .filter((stamp): stamp is FileViewerPrintStamp => !!stamp);
  const providedPages = Array.from(new Set(options.pages || []))
    .filter(page => page === root || root.contains(page));
  const pageScoped = providedPages.length > 0;
  const pageElements = pageScoped ? providedPages : [root];

  ensureDesignerStyle(root);

  const ensureOverlayContainingBlock = (element: HTMLElement) => {
    const previousPosition = element.style.position;
    const computedPosition = documentRef.defaultView?.getComputedStyle?.(element)?.position ||
      previousPosition ||
      'static';
    if (computedPosition === 'static') {
      element.style.position = 'relative';
    }
    return previousPosition;
  };
  // The toolbar layer is positioned against the viewer root even when page
  // canvases live on child page elements.
  const previousRootPosition = ensureOverlayContainingBlock(root);

  return new Promise(resolve => {
    let settled = false;
    let drawing: {
      surface: PrintMaskPageSurface;
      start: Point;
      preview: HTMLDivElement;
      pointerId: number;
    } | null = null;

    const layer = documentRef.createElement('div');
    layer.className = 'fv-print-mask-layer';
    layer.setAttribute('data-viewer-print-mask-designer', 'true');

    const createSurface = (element: HTMLElement, pageIndex?: number): PrintMaskPageSurface => {
      const previousPosition = ensureOverlayContainingBlock(element);
      const canvas = documentRef.createElement('div');
      canvas.className = 'fv-print-mask-canvas';
      element.appendChild(canvas);
      return {
        element,
        pageIndex,
        canvas,
        previousPosition,
      };
    };
    const surfaces: PrintMaskPageSurface[] = pageElements.map((element, index) => (
      createSurface(element, pageScoped ? index : undefined)
    ));
    const legacySurface = pageScoped &&
      !surfaces.some(surface => surface.element === root) &&
      (
        regions.some(region => region.pageIndex === undefined) ||
        stamps.some(stamp => stamp.pageIndex === undefined)
      )
      ? createSurface(root)
      : null;
    const allSurfaces = legacySurface ? [...surfaces, legacySurface] : surfaces;

    const toolbar = documentRef.createElement('div');
    toolbar.className = 'fv-print-mask-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', t('toolbar.printMaskTitle'));

    const hint = documentRef.createElement('span');
    hint.textContent = t('toolbar.printMaskHint');

    const addButton = documentRef.createElement('button');
    addButton.type = 'button';
    addButton.textContent = t('toolbar.printMaskAdd');

    const stampInput = documentRef.createElement('input');
    stampInput.type = 'file';
    stampInput.accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
    stampInput.className = 'fv-print-stamp-input';
    stampInput.setAttribute('data-viewer-print-stamp-input', 'true');

    const stampButton = documentRef.createElement('button');
    stampButton.type = 'button';
    stampButton.textContent = t('toolbar.printStampUpload');

    const clearButton = documentRef.createElement('button');
    clearButton.type = 'button';
    clearButton.textContent = t('toolbar.printMaskClear');

    const cancelButton = documentRef.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = t('toolbar.printMaskCancel');

    const confirmButton = documentRef.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'primary';
    confirmButton.textContent = t('toolbar.printMaskConfirm');

    toolbar.append(hint, addButton, stampButton, clearButton, cancelButton, confirmButton);
    layer.append(stampInput, toolbar);
    root.appendChild(layer);

    const disarm = () => {
      surfaces.forEach(surface => surface.canvas.classList.remove('is-armed'));
      addButton.classList.remove('is-active');
    };

    const finish = (result: FileViewerPrintMaskDesignerResult | null) => {
      if (settled) {
        return;
      }
      settled = true;
      layer.remove();
      allSurfaces.forEach(surface => {
        surface.canvas.remove();
        if (!surface.previousPosition) {
          surface.element.style.removeProperty('position');
        } else {
          surface.element.style.position = surface.previousPosition;
        }
      });
      if (!previousRootPosition) {
        root.style.removeProperty('position');
      } else {
        root.style.position = previousRootPosition;
      }
      resolve(result);
    };

    const surfaceForItem = (item: FileViewerPrintMaskRegion) => {
      if (item.pageIndex === undefined) {
        return legacySurface || surfaces[0];
      }
      return surfaces.find(surface => surface.pageIndex === item.pageIndex) || null;
    };

    const renderRegions = () => {
      allSurfaces.forEach(surface => surface.canvas.replaceChildren());
      regions.forEach((region, index) => {
        const surface = surfaceForItem(region);
        if (!surface) {
          return;
        }
        const block = documentRef.createElement('div');
        block.className = 'fv-print-mask-block';
        block.style.left = `${region.left}%`;
        block.style.top = `${region.top}%`;
        block.style.width = `${region.width}%`;
        block.style.height = `${region.height}%`;
        block.style.background = color;

        const remove = documentRef.createElement('button');
        remove.type = 'button';
        remove.className = 'fv-print-mask-block-remove';
        remove.title = t('toolbar.printMaskClear');
        remove.setAttribute('aria-label', t('toolbar.printMaskClear'));
        remove.textContent = '−';
        remove.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          regions.splice(index, 1);
          renderRegions();
        });
        block.appendChild(remove);
        surface.canvas.appendChild(block);
      });
      stamps.forEach((stamp, index) => {
        const surface = surfaceForItem(stamp);
        if (!surface) {
          return;
        }
        const stampElement = documentRef.createElement('div');
        stampElement.className = 'fv-print-stamp';
        stampElement.setAttribute('data-viewer-print-stamp', String(index));
        const applyStampStyle = () => {
          stampElement.style.left = `${stamp.left}%`;
          stampElement.style.top = `${stamp.top}%`;
          stampElement.style.width = `${stamp.width}%`;
          stampElement.style.height = `${stamp.height}%`;
          stampElement.style.opacity = String(stamp.opacity ?? 1);
          stampElement.style.transform = `rotate(${stamp.rotate ?? 0}deg)`;
        };
        applyStampStyle();

        const image = documentRef.createElement('img');
        image.src = stamp.src;
        image.alt = stamp.alt || '';
        image.draggable = false;

        const remove = documentRef.createElement('button');
        remove.type = 'button';
        remove.className = 'fv-print-mask-block-remove';
        remove.title = t('toolbar.printStampRemove');
        remove.setAttribute('aria-label', t('toolbar.printStampRemove'));
        remove.textContent = '−';
        remove.addEventListener('pointerdown', event => event.stopPropagation());
        remove.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          stamps.splice(index, 1);
          renderRegions();
        });

        const resize = documentRef.createElement('span');
        resize.className = 'fv-print-stamp-resize';
        resize.setAttribute('role', 'button');
        resize.setAttribute('aria-label', t('toolbar.printStampResize'));
        resize.title = t('toolbar.printStampResize');

        let interaction: {
          pointerId: number;
          mode: 'move' | 'resize';
          startX: number;
          startY: number;
          left: number;
          top: number;
          width: number;
          height: number;
        } | null = null;
        stampElement.addEventListener('pointerdown', event => {
          if (event.button !== 0 || (event.target as Element).closest('button')) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          interaction = {
            pointerId: event.pointerId,
            mode: event.target === resize ? 'resize' : 'move',
            startX: event.clientX,
            startY: event.clientY,
            left: stamp.left,
            top: stamp.top,
            width: stamp.width,
            height: stamp.height,
          };
          stampElement.setPointerCapture?.(event.pointerId);
        });
        stampElement.addEventListener('pointermove', event => {
          if (!interaction || interaction.pointerId !== event.pointerId) {
            return;
          }
          event.preventDefault();
          const bounds = surface.canvas.getBoundingClientRect();
          if (!bounds.width || !bounds.height) {
            return;
          }
          const deltaX = ((event.clientX - interaction.startX) / bounds.width) * 100;
          const deltaY = ((event.clientY - interaction.startY) / bounds.height) * 100;
          if (interaction.mode === 'move') {
            stamp.left = Math.max(0, Math.min(100 - stamp.width, interaction.left + deltaX));
            stamp.top = Math.max(0, Math.min(100 - stamp.height, interaction.top + deltaY));
          } else {
            stamp.width = Math.max(4, Math.min(100 - stamp.left, interaction.width + deltaX));
            stamp.height = Math.max(4, Math.min(100 - stamp.top, interaction.height + deltaY));
          }
          applyStampStyle();
        });
        const endInteraction = (event: PointerEvent) => {
          if (!interaction || interaction.pointerId !== event.pointerId) {
            return;
          }
          try {
            stampElement.releasePointerCapture?.(interaction.pointerId);
          } catch {
            // Pointer capture may already be released by the browser.
          }
          interaction = null;
        };
        stampElement.addEventListener('pointerup', endInteraction);
        stampElement.addEventListener('pointercancel', endInteraction);

        stampElement.append(image, remove, resize);
        surface.canvas.appendChild(stampElement);
      });
    };

    const pointFromEvent = (event: PointerEvent, canvas: HTMLElement): Point => {
      const bounds = canvas.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
        y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
      };
    };

    surfaces.forEach(surface => {
      surface.canvas.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !surface.canvas.classList.contains('is-armed')) {
          return;
        }
        event.preventDefault();
        const start = pointFromEvent(event, surface.canvas);
        const preview = documentRef.createElement('div');
        preview.className = 'fv-print-mask-block';
        preview.style.background = color;
        preview.style.opacity = '0.72';
        surface.canvas.appendChild(preview);
        drawing = { surface, start, preview, pointerId: event.pointerId };
        surface.canvas.setPointerCapture(event.pointerId);
      });

      surface.canvas.addEventListener('pointermove', event => {
        if (!drawing || drawing.surface !== surface) {
          return;
        }
        const end = pointFromEvent(event, surface.canvas);
        const left = Math.min(drawing.start.x, end.x);
        const top = Math.min(drawing.start.y, end.y);
        drawing.preview.style.left = `${left}px`;
        drawing.preview.style.top = `${top}px`;
        drawing.preview.style.width = `${Math.abs(end.x - drawing.start.x)}px`;
        drawing.preview.style.height = `${Math.abs(end.y - drawing.start.y)}px`;
      });

      surface.canvas.addEventListener('pointerup', event => {
        if (!drawing || drawing.surface !== surface) {
          return;
        }
        const end = pointFromEvent(event, surface.canvas);
        const region = toPercentRegion(
          drawing.start,
          end,
          surface.canvas.getBoundingClientRect(),
          surface.pageIndex
        );
        drawing.preview.remove();
        try {
          surface.canvas.releasePointerCapture(drawing.pointerId);
        } catch {
          // Pointer capture may already be released by the browser.
        }
        drawing = null;
        disarm();
        if (region) {
          regions.push(region);
        }
        renderRegions();
      });

      surface.canvas.addEventListener('pointercancel', () => {
        if (!drawing || drawing.surface !== surface) {
          return;
        }
        drawing.preview.remove();
        drawing = null;
        disarm();
        renderRegions();
      });
    });

    const getActiveSurface = () => {
      const viewport = root.getBoundingClientRect();
      return surfaces
        .map(surface => ({ surface, area: visibleArea(surface.element, viewport) }))
        .sort((left, right) => right.area - left.area)[0]?.surface || surfaces[0];
    };

    addButton.addEventListener('click', () => {
      disarm();
      const activeSurface = getActiveSurface();
      activeSurface?.canvas.classList.add('is-armed');
      addButton.classList.toggle('is-active', Boolean(activeSurface));
    });
    stampButton.addEventListener('click', () => {
      disarm();
      stampInput.click();
    });
    stampInput.addEventListener('change', async () => {
      const file = stampInput.files?.[0];
      stampInput.value = '';
      if (!file) {
        return;
      }
      try {
        const src = await readStampFileAsDataUrl(file, documentRef.defaultView);
        const activeSurface = getActiveSurface();
        if (!activeSurface) {
          return;
        }
        const stamp = normalizeFileViewerPrintStamp({
          src,
          alt: file.name,
          left: 38,
          top: 38,
          width: 24,
          height: 18,
          pageIndex: activeSurface.pageIndex,
        });
        if (stamp) {
          stamps.push(stamp);
          renderRegions();
        }
      } catch {
        // Unsupported or unreadable images are ignored; the document stays untouched.
      }
    });
    clearButton.addEventListener('click', () => {
      regions.splice(0, regions.length);
      stamps.splice(0, stamps.length);
      disarm();
      renderRegions();
    });
    cancelButton.addEventListener('click', () => finish(null));
    confirmButton.addEventListener('click', () => {
      if (!regions.length && !stamps.length) {
        finish(null);
        return;
      }
      finish({
        mask: {
          ...(regions.length ? { regions: regions.map(region => ({ ...region })) } : {}),
          ...(stamps.length ? { stamps: stamps.map(stamp => ({ ...stamp })) } : {}),
          color,
        },
      });
    });

    renderRegions();
  });
};
