import { PptError } from './core/errors.js';
import { parsePpt } from './ppt/parser.js';
import { DEFAULT_LIMITS } from './ppt/constants.js';
import { renderSlide, defaultPptCss } from './render/svg.js';
import { PptWorkerClient } from './worker-client.js';
import { createCanvasTextMeasurer } from './layout/measure.js';
import { TimelinePlayer } from './playback/timeline.js';
import { runTransition } from './playback/transitions.js';
import { LocalMediaController } from './playback/media.js';
import { resolveInternalNavigation } from './playback/navigation.js';
const viewerCss = `.pptjs-viewer{position:relative;display:grid;place-items:center;width:100%;height:100%;min-height:240px;overflow:hidden;outline:none}.pptjs-viewer:focus-visible{outline:2px solid #2563eb;outline-offset:-2px}.pptjs-stage{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden}.pptjs-stage>.pptjs-slide,.pptjs-transition-old>.pptjs-slide{width:100%;height:100%;max-width:100%;max-height:100%}.pptjs-transition-old{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}.pptjs-empty{font:14px/1.6 system-ui,sans-serif;color:#64748b;padding:24px;text-align:center}`;
const abort = () => new DOMException('The presentation load was cancelled', 'AbortError');
/** A viewer retains one slide DOM; assets are materialized lazily and owned per instance. */
export function createPptViewer(container, options = {}) {
    const owner = container.ownerDocument, root = owner.createElement('div'), stage = owner.createElement('div'), style = owner.createElement('style');
    root.className = 'pptjs-viewer';
    root.tabIndex = 0;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'PowerPoint presentation');
    stage.className = 'pptjs-stage';
    style.textContent = defaultPptCss + viewerCss;
    root.append(style, stage);
    container.replaceChildren(root);
    let value = null, index = 0, sequence = 0, destroyed = false, worker = null, drawSequence = 0;
    let playbackEnabled = false, presentationRunning = false, timeline = null, media = null, cancelTransition, transitionInProgress = false;
    const history = [];
    let autoTimer, autoRemaining, autoStarted = 0;
    const measurer = options.renderOptions?.textMeasurer ?? createCanvasTextMeasurer(owner);
    const urls = new Map();
    const revoke = () => { for (const url of urls.values())
        URL.revokeObjectURL(url); urls.clear(); };
    const empty = (text) => { stage.replaceChildren(); const p = owner.createElement('div'); p.className = 'pptjs-empty'; p.textContent = text; stage.append(p); };
    const assertLive = () => { if (destroyed)
        throw new PptError('VIEWER_DESTROYED', 'The viewer has been destroyed'); };
    const playbackState = () => ({ enabled: playbackEnabled, playing: presentationRunning, effectIndex: timeline?.state.effectIndex ?? 0, effectCount: value?.slides[index]?.timeline?.effects.length ?? 0 });
    const notify = () => options.onPlaybackChange?.(playbackState());
    const pauseTimer = () => { if (autoTimer !== undefined) {
        clearTimeout(autoTimer);
        autoTimer = undefined;
        autoRemaining = Math.max(0, (autoRemaining ?? 0) - (performance.now() - autoStarted));
    } };
    function stopCurrent() { drawSequence++; pauseTimer(); autoRemaining = undefined; transitionInProgress = false; cancelTransition?.(); cancelTransition = undefined; timeline?.destroy(false); timeline = null; media?.destroy(); media = null; }
    function nextVisible() { if (!value)
        return; for (let i = index + 1; i < value.slides.length; i++)
        if (!value.slides[i].hidden)
            return i; return; }
    function armAuto() { if (!playbackEnabled || !presentationRunning || autoRemaining == null || autoTimer !== undefined)
        return; const current = drawSequence; autoStarted = performance.now(); autoTimer = setTimeout(() => { autoTimer = undefined; if (destroyed || current !== drawSequence || !presentationRunning)
        return; autoRemaining = undefined; const next = nextVisible(); if (next == null) {
        presentationRunning = false;
        notify();
    }
    else
        goTo(next); }, autoRemaining); }
    function draw(withTransition = false) {
        if (!value)
            return;
        if (!value.slides.length) {
            empty('此文件没有可显示的幻灯片。');
            return;
        }
        const old = withTransition && playbackEnabled ? stage.firstElementChild : undefined;
        stopCurrent();
        const current = drawSequence, slide = value.slides[index];
        const rendered = renderSlide(value, index, { textLayout: measurer ? 'measured' : 'browser', ...options.renderOptions, textMeasurer: measurer, assetUrl: options.renderOptions?.assetUrl ?? (asset => { let url = urls.get(asset.id); if (!url) {
                const bytes = asset.bytes.byteOffset === 0 && asset.bytes.byteLength === asset.bytes.buffer.byteLength && asset.bytes.buffer instanceof ArrayBuffer ? asset.bytes : new Uint8Array(asset.bytes);
                url = URL.createObjectURL(new Blob([bytes], { type: asset.mimeType }));
                urls.set(asset.id, url);
            } return url; }) });
        stage.innerHTML = rendered.html;
        root.setAttribute('aria-label', `Slide ${index + 1} of ${value.slides.length}`);
        if (typeof stage.querySelectorAll === 'function')
            media = new LocalMediaController(stage, error => options.onError?.(error));
        if (playbackEnabled) {
            timeline = new TimelinePlayer(slide.timeline?.effects ?? [], { resolveTarget: id => stage.querySelector(`[data-ppt-animation="${id}"]`), width: slide.size.width, height: slide.size.height, onState: notify });
            autoRemaining = slide.transition?.autoAdvanceAfterMs;
        }
        const begin = () => { if (destroyed || current !== drawSequence)
            return; if (presentationRunning) {
            timeline?.startAutomatic();
            armAuto();
        } notify(); };
        const incoming = stage.firstElementChild;
        if (old && incoming && playbackEnabled && presentationRunning) {
            const overlay = owner.createElement('div');
            overlay.className = 'pptjs-transition-old';
            overlay.setAttribute('aria-hidden', 'true');
            overlay.append(old);
            stage.append(overlay);
            if (slide.transition?.type !== 7) {
                overlay.style.zIndex = '0';
                incoming.style.position = 'relative';
                incoming.style.zIndex = '1';
            }
            transitionInProgress = true;
            cancelTransition = runTransition(incoming, old, slide.transition, () => { overlay.remove(); if (current === drawSequence)
                transitionInProgress = false; begin(); });
        }
        else
            begin();
        options.onSlideChange?.(index);
    }
    function clear() { sequence++; worker?.destroy(); worker = null; stopCurrent(); value = null; index = 0; history.length = 0; presentationRunning = false; playbackEnabled = false; revoke(); root.removeAttribute('aria-busy'); empty('选择一个演示文稿开始预览。'); notify(); }
    const goTo = (next, recordHistory = true) => { assertLive(); if (!value || !value.slides.length)
        return; if (!Number.isInteger(next) || next < 0 || next >= value.slides.length)
        throw new PptError('SLIDE_INDEX', `Slide index ${next} is outside the presentation`); const changed = next !== index; if (changed && recordHistory) {
        history.push(index);
        if (history.length > 1000)
            history.shift();
    } index = next; draw(changed); };
    function advance() { assertLive(); if (!value)
        return; if (playbackEnabled) {
        presentationRunning = true;
        if (transitionInProgress) {
            cancelTransition?.();
            notify();
            return;
        }
        if (timeline?.advance()) {
            armAuto();
            notify();
            return;
        }
        if (value.slides[index]?.transition?.manualAdvance === false) {
            armAuto();
            notify();
            return;
        }
    } const next = playbackEnabled ? nextVisible() : index + 1; if (next != null && next < value.slides.length)
        goTo(next);
    else {
        presentationRunning = false;
        notify();
    } }
    function setPlaybackEnabled(enabled) { assertLive(); if (playbackEnabled === enabled)
        return; playbackEnabled = enabled; presentationRunning = false; draw(); notify(); }
    function play() { assertLive(); if (!value)
        return; if (!playbackEnabled)
        setPlaybackEnabled(true); presentationRunning = true; if (transitionInProgress)
        cancelTransition?.play();
    else {
        timeline?.play();
        armAuto();
    } notify(); }
    function pause() { assertLive(); presentationRunning = false; pauseTimer(); cancelTransition?.pause(); timeline?.pause(); media?.pause(); notify(); }
    const keydown = (event) => { if (!value || event.altKey || event.ctrlKey || event.metaKey)
        return; const target = event.target; if (target.closest('input,textarea,select,button,a,audio,video,[contenteditable="true"]'))
        return; if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) {
        event.preventDefault();
        advance();
        return;
    } let next = index; if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key))
        next = Math.max(0, index - 1);
    else if (event.key === 'Home')
        next = 0;
    else if (event.key === 'End')
        next = value.slides.length - 1;
    else if (event.key === 'Escape') {
        setPlaybackEnabled(false);
        return;
    }
    else
        return; event.preventDefault(); if (next !== index)
        goTo(next); };
    const click = (event) => { if (!value || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey)
        return; const target = event.target, anchor = target.closest('a'); if (anchor) {
        const href = anchor.getAttribute('href') ?? '', destination = resolveInternalNavigation(href, index, value.slides.length, history[history.length - 1]);
        if (destination != null) {
            event.preventDefault();
            if (href === '#pptjs-back') {
                history.pop();
                goTo(destination, false);
            }
            else
                goTo(destination);
            return;
        }
        if (href.startsWith('#pptjs-'))
            event.preventDefault();
        if (href === '#pptjs-end') {
            setPlaybackEnabled(false);
            return;
        }
        const mediaMatch = /^#pptjs-media=(\d+)$/.exec(href);
        if (mediaMatch)
            void media?.playFromGesture(Number(mediaMatch[1]), event);
        return;
    } if (playbackEnabled && !target.closest('audio,video,button,input,textarea,select,[contenteditable="true"]'))
        advance(); };
    const fontsChanged = () => { measurer?.clear?.(); if (value && !destroyed && !playbackEnabled)
        draw(); };
    owner.fonts?.addEventListener('loadingdone', fontsChanged);
    root.addEventListener('keydown', keydown);
    root.addEventListener('click', click);
    empty('选择一个演示文稿开始预览。');
    return {
        async load(input) {
            assertLive();
            clear();
            const current = sequence;
            root.setAttribute('aria-busy', 'true');
            empty('正在读取演示文稿…');
            const currentOnly = () => { if (destroyed || sequence !== current)
                throw abort(); };
            const progress = (p) => { if (!destroyed && current === sequence)
                options.onProgress?.(p); };
            try {
                const blob = typeof input.arrayBuffer === 'function' && !ArrayBuffer.isView(input) && !(input instanceof ArrayBuffer);
                const maxFileBytes = options.parseOptions?.limits?.maxFileBytes ?? DEFAULT_LIMITS.maxFileBytes;
                if (!Number.isSafeInteger(maxFileBytes) || maxFileBytes <= 0)
                    throw new PptError('INVALID_LIMIT', 'Invalid parse limit maxFileBytes');
                const byteLength = blob ? input.size : input.byteLength;
                if (!Number.isSafeInteger(byteLength) || byteLength < 0)
                    throw new PptError('INVALID_INPUT', 'Expected a Blob, ArrayBuffer or binary view with a valid byte length');
                if (byteLength > maxFileBytes)
                    throw new PptError('LIMIT_FILE', `Presentation file exceeds the configured ${maxFileBytes}-byte limit`);
                const buffer = blob ? await input.arrayBuffer() : input;
                currentOnly();
                let parsed;
                if (options.worker !== false && typeof Worker !== 'undefined') {
                    worker = PptWorkerClient.create(options.workerUrl);
                    parsed = blob ? await worker.parseOwned(buffer, options.parseOptions, progress) : await worker.parse(buffer, options.parseOptions, progress);
                }
                else {
                    progress({ phase: 'parse', elapsedMs: 0 });
                    await new Promise(resolve => setTimeout(resolve, 0));
                    currentOnly();
                    const start = performance.now();
                    parsed = parsePpt(buffer, options.parseOptions);
                    progress({ phase: 'complete', elapsedMs: performance.now() - start, slideCount: parsed.slides.length });
                }
                currentOnly();
                worker?.destroy();
                worker = null;
                value = parsed;
                index = 0;
                root.removeAttribute('aria-busy');
                draw();
                return parsed;
            }
            catch (error) {
                if (destroyed || sequence !== current)
                    throw abort();
                worker?.destroy();
                worker = null;
                root.removeAttribute('aria-busy');
                const e = error instanceof Error ? error : new Error(String(error));
                empty(e.message);
                options.onError?.(e);
                throw e;
            }
        },
        goTo,
        play, pause, advance, setPlaybackEnabled,
        next() { if (value && index + 1 < value.slides.length)
            goTo(index + 1); },
        previous() { if (value && index > 0)
            goTo(index - 1); },
        clear() { assertLive(); clear(); },
        destroy() { if (destroyed)
            return; clear(); destroyed = true; root.removeEventListener('keydown', keydown); root.removeEventListener('click', click); owner.fonts?.removeEventListener('loadingdone', fontsChanged); root.remove(); },
        get value() { return value; }, get slideIndex() { return index; }, get playbackState() { return playbackState(); },
    };
}
