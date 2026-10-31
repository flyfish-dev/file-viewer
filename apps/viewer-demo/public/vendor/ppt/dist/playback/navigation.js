/** Internal hyperlinks are resolved by the parser into zero-based, document-local targets. */
export function resolveInternalNavigation(href, current, count, previous) {
    if (!Number.isSafeInteger(count) || count <= 0 || !Number.isSafeInteger(current) || current < 0 || current >= count)
        return undefined;
    const match = /^#pptjs-slide=(0|[1-9]\d*)$/.exec(href);
    if (match) {
        const index = Number(match[1]);
        return Number.isSafeInteger(index) && index < count ? index : undefined;
    }
    if (href === '#pptjs-back')
        return previous != null && Number.isSafeInteger(previous) && previous >= 0 && previous < count ? previous : undefined;
    const targets = { '#pptjs-next': Math.min(count - 1, current + 1), '#pptjs-previous': Math.max(0, current - 1), '#pptjs-first': 0, '#pptjs-last': count - 1 };
    return Object.hasOwn(targets, href) ? targets[href] : undefined;
}
