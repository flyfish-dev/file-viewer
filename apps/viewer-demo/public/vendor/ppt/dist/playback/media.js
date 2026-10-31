import { PptError } from '../core/errors.js';
/** Controls only local media already rendered by the viewer. Nothing is played on construction. */
export class LocalMediaController {
    onError;
    media;
    disposed = false;
    listeners = [];
    constructor(root, onError) {
        this.onError = onError;
        this.media = Array.from(root.querySelectorAll('audio[data-ppt-media],video[data-ppt-media]'));
        for (const target of this.media) {
            const listener = () => this.onError?.(new PptError('MEDIA_DECODE', `The browser could not decode embedded media (${target.error?.code ?? 'unknown'})`));
            target.addEventListener('error', listener);
            this.listeners.push({ target, listener });
        }
    }
    async playFromGesture(id, event) { if (this.disposed || !event.isTrusted || !['click', 'keydown', 'pointerup'].includes(event.type))
        return false; const target = this.media.find(m => m.dataset.pptMedia === String(id)); if (!target)
        return false; try {
        await target.play();
        return !this.disposed;
    }
    catch (error) {
        if (!this.disposed)
            this.onError?.(error instanceof Error ? error : new Error(String(error)));
        return false;
    } }
    pause() { for (const target of this.media)
        target.pause(); }
    destroy() { if (this.disposed)
        return; this.disposed = true; for (const { target, listener } of this.listeners)
        target.removeEventListener('error', listener); this.listeners = []; for (const target of this.media) {
        target.pause();
        target.removeAttribute('src');
        target.load();
    } }
}
