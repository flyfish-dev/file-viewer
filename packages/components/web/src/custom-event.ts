export type FileViewerCustomEventOwner = {
  ownerDocument?: Document | null;
};

export function createFileViewerCustomEvent<Detail>(
  owner: FileViewerCustomEventOwner,
  name: string,
  detail: Detail
): CustomEvent<Detail> {
  const init: CustomEventInit<Detail> = {
    bubbles: true,
    composed: true,
    detail,
  };
  const ownerWindow = owner.ownerDocument?.defaultView;
  const ownerCustomEvent = ownerWindow?.CustomEvent;
  const CustomEventConstructor =
    typeof ownerCustomEvent === 'function'
      ? ownerCustomEvent
      : typeof globalThis.CustomEvent === 'function'
        ? globalThis.CustomEvent
        : undefined;
  if (CustomEventConstructor) {
    return new CustomEventConstructor(name, init) as CustomEvent<Detail>;
  }

  const ownerDocument = owner.ownerDocument;
  if (ownerDocument && typeof ownerDocument.createEvent === 'function') {
    try {
      const legacyEvent = ownerDocument.createEvent('CustomEvent') as CustomEvent<Detail>;
      legacyEvent.initCustomEvent(name, true, false, detail);
      return legacyEvent;
    } catch {
      // Fall through to the standard Event constructor for partial DOM shims.
    }
  }

  const ownerEvent = ownerWindow?.Event;
  const EventConstructor =
    typeof ownerEvent === 'function'
      ? ownerEvent
      : typeof globalThis.Event === 'function'
        ? globalThis.Event
        : undefined;
  if (!EventConstructor) {
    throw new Error(`Cannot dispatch ${name}: this runtime does not provide an Event constructor.`);
  }
  const event = new EventConstructor(name, { bubbles: true, composed: true }) as CustomEvent<Detail>;
  Object.defineProperty(event, 'detail', {
    configurable: false,
    enumerable: true,
    value: detail,
  });
  return event;
}
