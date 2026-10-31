const bounded = (value, max = 86_399_000) => Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));
/** A click begins a step; withPrevious shares the prior start, afterPrevious follows its end. */
export function compileTimeline(effects) {
    const steps = [];
    let step, previous;
    for (const effect of effects) {
        if (!step || effect.trigger === 'click') {
            step = { automatic: effect.trigger !== 'click', effects: [], durationMs: 0 };
            steps.push(step);
            previous = undefined;
        }
        const base = effect.trigger === 'afterPrevious' ? previous?.endMs ?? 0 : effect.trigger === 'withPrevious' ? previous?.startMs ?? 0 : 0;
        const startMs = base + bounded(effect.delayMs), scheduled = { effect, startMs, endMs: startMs + bounded(effect.durationMs) };
        step.effects.push(scheduled);
        step.durationMs = Math.max(step.durationMs, scheduled.endMs);
        previous = scheduled;
    }
    return steps;
}
export function effectKeyframes(effect, width, height, parent = [1, 0, 0, 1]) {
    const entrance = effect.phase === 'entrance', exit = effect.phase === 'exit';
    const visible = { opacity: 1, visibility: 'visible', transform: 'none' }, hidden = { opacity: 0, visibility: 'hidden', transform: 'none' };
    if (effect.kind === 'appear')
        return entrance ? [hidden, visible] : exit ? [visible, hidden] : [visible, visible];
    if (effect.kind === 'fade')
        return entrance ? [hidden, visible] : exit ? [visible, hidden] : [{ opacity: 1 }, { opacity: .35, offset: .5 }, { opacity: 1 }];
    if (effect.kind === 'fly') {
        const direction = effect.direction ?? 'left', dx = direction === 'left' ? -width : direction === 'right' ? width : 0, dy = direction === 'up' ? -height : direction === 'down' ? height : 0;
        let x = dx, y = dy;
        const [a, b, c, d] = parent;
        if (parent.length === 4 && parent.every(Number.isFinite) && Math.abs(a * d - b * c) > 1e-9) {
            const det = a * d - b * c;
            x = (d * dx - c * dy) / det;
            y = (-b * dx + a * dy) / det;
        }
        const clean = (value) => Math.abs(value) < 1e-8 ? 0 : Number(value.toFixed(6));
        const away = { opacity: 0, visibility: 'hidden', transform: `translate(${clean(x)}px,${clean(y)}px)` };
        return exit ? [visible, away] : [away, visible];
    }
    const from = Math.max(.001, Math.min(16, effect.fromScale ?? (entrance ? .01 : 1))), to = Math.max(.001, Math.min(16, effect.toScale ?? (exit ? .01 : 1)));
    return [{ opacity: entrance ? 0 : 1, visibility: entrance ? 'hidden' : 'visible', transform: `scale(${from})` }, { opacity: exit ? 0 : 1, visibility: exit ? 'hidden' : 'visible', transform: `scale(${to})` }];
}
/** Owns only per-shape animation wrappers. Destroy always cancels finished promises safely. */
export class TimelinePlayer {
    effects;
    options;
    steps;
    stepIndex = 0;
    effectIndex = 0;
    animations = [];
    generation = 0;
    destroyed = false;
    running = false;
    paused = false;
    enabled = true;
    constructor(effects, options) {
        this.effects = effects;
        this.options = options;
        this.steps = compileTimeline(effects);
        this.reset();
    }
    get state() { return { enabled: this.enabled, playing: this.running && !this.paused, effectIndex: this.effectIndex, effectCount: this.effects.length }; }
    notify() { this.options.onState?.(this.state); }
    setVisibility(final) { const initial = new Map(); for (const effect of this.effects)
        if (!initial.has(effect.targetShapeId))
            initial.set(effect.targetShapeId, effect); for (const [id, effect] of initial) {
        const target = this.options.resolveTarget(id);
        if (target) {
            target.style.opacity = !final && effect.phase === 'entrance' ? '0' : '';
            target.style.visibility = !final && effect.phase === 'entrance' ? 'hidden' : '';
            target.style.transform = '';
        }
    } }
    reset() { if (this.destroyed)
        return; this.cancelAnimations(); this.stepIndex = 0; this.effectIndex = 0; this.running = false; this.paused = false; this.setVisibility(false); this.notify(); }
    cancelAnimations() { this.generation++; for (const animation of this.animations) {
        animation.finished.catch(() => { });
        animation.cancel();
    } this.animations = []; }
    play() { if (this.destroyed)
        return; if (this.paused) {
        this.paused = false;
        for (const animation of this.animations)
            animation.play();
        this.notify();
        return;
    } if (!this.running)
        this.advance(); }
    startAutomatic() { if (!this.running && this.steps[this.stepIndex]?.automatic)
        this.advance(); }
    pause() { if (this.destroyed || !this.running)
        return; this.paused = true; for (const animation of this.animations)
        animation.pause(); this.notify(); }
    /** Returns false when every effect has been consumed; the viewer may then change slides. */
    advance() {
        if (this.destroyed)
            return false;
        if (this.running) {
            for (const animation of this.animations) {
                try {
                    animation.finish();
                }
                catch { /* A zero-duration cancelled animation can already be idle. */ }
            }
            this.paused = false;
            return true;
        }
        const step = this.steps[this.stepIndex++];
        if (!step)
            return false;
        this.running = true;
        this.paused = false;
        const generation = ++this.generation;
        const pending = [];
        for (const scheduled of step.effects) {
            const target = this.options.resolveTarget(scheduled.effect.targetShapeId);
            if (!target)
                continue;
            target.style.transformBox = 'fill-box';
            target.style.transformOrigin = 'center';
            const parent = (target.getAttribute('data-ppt-parent') ?? '1 0 0 1').split(/\s+/).map(Number);
            const keyframes = effectKeyframes(scheduled.effect, this.options.width, this.options.height, parent);
            const duration = scheduled.effect.kind === 'appear' ? 0 : bounded(scheduled.effect.durationMs);
            const final = () => { const last = keyframes[keyframes.length - 1]; target.style.opacity = String(last.opacity ?? ''); target.style.visibility = String(last.visibility ?? 'visible'); target.style.transform = String(last.transform ?? ''); };
            if (typeof target.animate === 'function') {
                const animation = target.animate(keyframes, { duration, delay: scheduled.startMs, fill: 'forwards', easing: 'linear' });
                this.animations.push(animation);
                pending.push(animation.finished.then(() => { if (this.destroyed || generation !== this.generation)
                    return; final(); animation.cancel(); }, () => { }));
            }
            else
                final();
        }
        this.notify();
        void Promise.all(pending).then(() => { if (this.destroyed || generation !== this.generation)
            return; this.animations = []; this.running = false; this.effectIndex += step.effects.length; this.notify(); if (this.steps[this.stepIndex]?.automatic)
            this.advance();
        else if (this.stepIndex >= this.steps.length)
            this.options.onDone?.(); });
        return true;
    }
    destroy(showFinal = true) { if (this.destroyed)
        return; this.destroyed = true; this.enabled = false; this.cancelAnimations(); this.running = false; if (showFinal) {
        this.setVisibility(true);
        for (const effect of this.effects) {
            const target = this.options.resolveTarget(effect.targetShapeId);
            if (target) {
                target.style.transform = '';
                target.style.transformOrigin = '';
                target.style.transformBox = '';
            }
        }
    } this.notify(); }
}
