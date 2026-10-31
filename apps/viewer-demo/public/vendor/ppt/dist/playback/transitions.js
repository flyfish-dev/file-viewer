/** MS-PPT SlideShowSlideInfoAtom subset: cut, fade, alpha-fade, cover, uncover, push, wipe. */
export function transitionFrames(transition) {
    if (!transition || transition.type === 0)
        return undefined;
    const durationMs = Math.max(0, Math.min(10000, Number.isFinite(transition.duration) ? transition.duration : 500)), d = transition.direction ?? 0;
    if ((transition.type === 6 || transition.type === 23) && d === 0)
        return { incoming: [{ opacity: 0 }, { opacity: 1 }], durationMs };
    if ([4, 7, 20].includes(transition.type) && Number.isInteger(d) && d >= 0 && d <= 3) {
        const x = d === 0 ? -100 : d === 2 ? 100 : 0, y = d === 1 ? -100 : d === 3 ? 100 : 0;
        const incoming = [{ transform: `translate(${-x}%,${-y}%)` }, { transform: 'none' }], outgoing = [{ transform: 'none' }, { transform: `translate(${x}%,${y}%)` }];
        return { incoming: transition.type === 7 ? [{ opacity: 1 }, { opacity: 1 }] : incoming, outgoing: transition.type === 4 ? undefined : outgoing, durationMs };
    }
    if (transition.type === 10 && Number.isInteger(d) && d >= 0 && d <= 3) {
        const clip = ['inset(0 0 0 100%)', 'inset(100% 0 0 0)', 'inset(0 100% 0 0)', 'inset(0 0 100% 0)'][d];
        return { incoming: [{ clipPath: clip }, { clipPath: 'inset(0 0 0 0)' }], durationMs };
    }
    return undefined;
}
export function runTransition(incoming, outgoing, transition, onDone) {
    const frames = transitionFrames(transition), animations = [];
    let settled = false;
    const complete = () => { if (settled)
        return; settled = true; for (const animation of animations) {
        animation.finished.catch(() => { });
        animation.cancel();
    } onDone(); };
    const controller = Object.assign(complete, { pause() { if (!settled)
            for (const animation of animations)
                animation.pause(); }, play() { if (!settled)
            for (const animation of animations)
                animation.play(); } });
    if (!frames || typeof incoming.animate !== 'function') {
        complete();
        return controller;
    }
    animations.push(incoming.animate(frames.incoming, { duration: frames.durationMs, fill: 'both', easing: 'linear' }));
    if (outgoing && frames.outgoing && typeof outgoing.animate === 'function')
        animations.push(outgoing.animate(frames.outgoing, { duration: frames.durationMs, fill: 'both', easing: 'linear' }));
    void Promise.all(animations.map(animation => animation.finished.catch(() => { }))).then(complete);
    return controller;
}
