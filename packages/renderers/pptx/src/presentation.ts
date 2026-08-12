import type { PptxViewer } from './viewer';

export interface PptxPresentationState {
  active: boolean;
  slideNumber: number;
  total: number;
}

export interface PptxPresentationLabels {
  exit?: string;
  hint?: string;
  next?: string;
  previous?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Full-screen slideshow for a rendered PPTX deck.
 *
 * The slides stay where the viewer put them: the whole scale box is moved into an overlay and the
 * inactive slots are hidden with CSS, so the engine's scoped `.flyfish-pptx-content .slide` rules
 * keep applying and no node is cloned. A placeholder marks the original position so exiting puts
 * everything back exactly where it was.
 */
export class PptxPresentation {
  private readonly viewer: PptxViewer;
  private readonly labels: PptxPresentationLabels;
  private overlay: HTMLDivElement | null = null;
  private stage: HTMLDivElement | null = null;
  private counter: HTMLDivElement | null = null;
  private placeholder: Comment | null = null;
  private listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  private layoutFrame = 0;
  private ownsFullscreen = false;
  private current = 1;

  constructor(viewer: PptxViewer, labels: PptxPresentationLabels = {}) {
    this.viewer = viewer;
    this.labels = labels;
  }

  get active() {
    return Boolean(this.overlay);
  }

  get slideNumber() {
    return this.current;
  }

  get state(): PptxPresentationState {
    return { active: this.active, slideNumber: this.current, total: this.viewer.slideCount };
  }

  async enter(slideNumber = this.current) {
    if (this.active || this.viewer.slideCount === 0) {
      return;
    }

    const documentRef = this.viewer.target.ownerDocument || document;
    const overlay = documentRef.createElement('div');
    overlay.className = 'flyfish-pptx-presentation';
    overlay.tabIndex = -1;
    overlay.setAttribute('role', 'region');
    overlay.setAttribute('aria-label', this.labels.hint || 'Slideshow');

    const stage = documentRef.createElement('div');
    stage.className = 'flyfish-pptx-presentation-stage';

    const counter = documentRef.createElement('div');
    counter.className = 'flyfish-pptx-presentation-counter';

    const hint = documentRef.createElement('div');
    hint.className = 'flyfish-pptx-presentation-hint';
    hint.textContent = this.labels.hint || '';
    hint.hidden = !this.labels.hint;

    const exit = documentRef.createElement('button');
    exit.type = 'button';
    exit.className = 'flyfish-pptx-presentation-exit';
    exit.textContent = '✕';
    exit.setAttribute('aria-label', this.labels.exit || 'Exit slideshow');
    exit.addEventListener('click', event => {
      event.stopPropagation();
      this.exit();
    });

    overlay.append(stage, counter, hint, exit);
    this.overlay = overlay;
    this.stage = stage;
    this.counter = counter;

    // Keep the overlay inside whichever root holds the slide styles, or the engine's scoped CSS
    // would not reach the slides once they move.
    const styleRoot = this.viewer.presentationRoot;
    styleRoot.appendChild(overlay);

    // Park a comment where the scale box lived so exit() can restore the exact position.
    this.placeholder = documentRef.createComment('flyfish-pptx-presentation');
    this.viewer.scaleBox.replaceWith(this.placeholder);
    stage.appendChild(this.viewer.scaleBox);
    this.viewer.content.classList.add('is-presenting');

    this.attach(documentRef, overlay);
    this.goTo(slideNumber);

    try {
      await overlay.requestFullscreen?.();
      this.ownsFullscreen = Boolean(documentRef.fullscreenElement === overlay);
    } catch {
      // Fullscreen needs a user gesture and can be blocked by permissions policy. The overlay is
      // position:fixed, so the slideshow still fills the viewport without it.
      this.ownsFullscreen = false;
    }

    overlay.focus({ preventScroll: true });
    this.scheduleLayout();
    this.notify();
  }

  exit() {
    const overlay = this.overlay;
    if (!overlay) {
      return;
    }

    const documentRef = this.viewer.target.ownerDocument || document;
    this.detach();

    if (this.layoutFrame) {
      (documentRef.defaultView || window).cancelAnimationFrame(this.layoutFrame);
      this.layoutFrame = 0;
    }

    this.viewer.content.classList.remove('is-presenting');
    for (const slot of this.slots()) {
      slot.classList.remove('is-active-slide');
    }

    if (this.placeholder?.parentNode) {
      this.placeholder.replaceWith(this.viewer.scaleBox);
    } else {
      this.viewer.target.appendChild(this.viewer.scaleBox);
    }
    this.placeholder = null;

    overlay.remove();
    this.overlay = null;
    this.stage = null;
    this.counter = null;

    if (this.ownsFullscreen && documentRef.fullscreenElement) {
      void documentRef.exitFullscreen?.().catch(() => undefined);
    }
    this.ownsFullscreen = false;

    this.viewer.refreshLayout();
    this.notify();
  }

  async toggle(slideNumber?: number) {
    if (this.active) {
      this.exit();
      return;
    }
    await this.enter(slideNumber);
  }

  goTo(slideNumber: number) {
    const total = this.viewer.slideCount;
    if (total === 0) {
      return;
    }

    this.current = clamp(Math.round(slideNumber) || 1, 1, total);
    this.viewer.ensureSlideRendered(this.current);
    // Rendering the neighbour keeps the next step instant without defeating virtualization.
    this.viewer.ensureSlideRendered(this.current + 1);

    for (const slot of this.slots()) {
      const isActive = Number(slot.dataset.slideNumber) === this.current;
      slot.classList.toggle('is-active-slide', isActive);
    }

    if (this.counter) {
      this.counter.textContent = `${this.current} / ${total}`;
    }

    if (this.active) {
      this.scheduleLayout();
      this.notify();
    }
  }

  next() {
    if (this.current < this.viewer.slideCount) {
      this.goTo(this.current + 1);
    }
  }

  previous() {
    if (this.current > 1) {
      this.goTo(this.current - 1);
    }
  }

  /** Scale the active slide to fit the overlay, letterboxing whichever axis has slack. */
  layout() {
    const overlay = this.overlay;
    if (!overlay) {
      return;
    }

    const slot = this.slots().find(item => Number(item.dataset.slideNumber) === this.current);
    const slide = slot?.firstElementChild as HTMLElement | null;
    const size = this.viewer.slideDimensions;
    const slideWidth = slide?.offsetWidth || size?.width || 0;
    const slideHeight = slide?.offsetHeight || size?.height || 0;
    if (!slideWidth || !slideHeight) {
      return;
    }

    const viewWidth = overlay.clientWidth;
    const viewHeight = overlay.clientHeight;
    const scale = Math.min(viewWidth / slideWidth, viewHeight / slideHeight);
    const offsetX = Math.max(0, (viewWidth - slideWidth * scale) / 2);
    const offsetY = Math.max(0, (viewHeight - slideHeight * scale) / 2);

    const content = this.viewer.content;
    content.style.width = `${slideWidth}px`;
    content.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

    const scaleBox = this.viewer.scaleBox;
    scaleBox.style.width = '100%';
    scaleBox.style.height = '100%';
    scaleBox.style.minHeight = '';
  }

  destroy() {
    this.exit();
  }

  private slots() {
    return Array.from(
      this.viewer.content.querySelectorAll<HTMLElement>(':scope > .flyfish-pptx-slide-slot')
    );
  }

  private scheduleLayout() {
    const view = this.viewer.target.ownerDocument.defaultView || window;
    if (this.layoutFrame) {
      view.cancelAnimationFrame(this.layoutFrame);
    }
    this.layoutFrame = view.requestAnimationFrame(() => {
      this.layoutFrame = 0;
      this.layout();
    });
  }

  private notify() {
    this.viewer.emitPresentationChange(this.state);
  }

  private on(target: EventTarget, type: string, listener: EventListener) {
    target.addEventListener(type, listener);
    this.listeners.push({ target, type, listener });
  }

  private attach(documentRef: Document, overlay: HTMLElement) {
    const view = documentRef.defaultView || window;

    this.on(documentRef, 'keydown', (event: Event) => this.handleKey(event as KeyboardEvent));
    this.on(overlay, 'click', (event: Event) => this.handleClick(event as MouseEvent));
    this.on(overlay, 'contextmenu', (event: Event) => {
      event.preventDefault();
      this.previous();
    });
    this.on(view, 'resize', () => this.scheduleLayout());
    this.on(documentRef, 'fullscreenchange', () => {
      // Leaving fullscreen with the browser's own Esc must close the slideshow too, otherwise the
      // overlay would stay up as a plain fixed layer.
      if (this.ownsFullscreen && !documentRef.fullscreenElement) {
        this.ownsFullscreen = false;
        this.exit();
      }
    });
  }

  private detach() {
    for (const { target, type, listener } of this.listeners) {
      target.removeEventListener(type, listener);
    }
    this.listeners = [];
  }

  private handleClick(event: MouseEvent) {
    const overlay = this.overlay;
    if (!overlay || (event.target as HTMLElement | null)?.closest('.flyfish-pptx-presentation-exit')) {
      return;
    }
    // PowerPoint advances on click; the left edge is the only place that goes back.
    const bounds = overlay.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / (bounds.width || 1);
    if (ratio < 0.2) {
      this.previous();
    } else {
      this.next();
    }
  }

  private handleKey(event: KeyboardEvent) {
    if (!this.active || event.altKey || event.metaKey || event.ctrlKey) {
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
      case 'Enter':
        event.preventDefault();
        this.next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
        event.preventDefault();
        this.previous();
        break;
      case 'Home':
        event.preventDefault();
        this.goTo(1);
        break;
      case 'End':
        event.preventDefault();
        this.goTo(this.viewer.slideCount);
        break;
      case 'Escape':
        event.preventDefault();
        this.exit();
        break;
      default:
        break;
    }
  }
}
