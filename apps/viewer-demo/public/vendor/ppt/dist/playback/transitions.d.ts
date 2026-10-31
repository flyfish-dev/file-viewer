import type { PptSlide } from '../types.js';
export interface TransitionFrames {
    incoming: Keyframe[];
    outgoing?: Keyframe[];
    durationMs: number;
}
export interface TransitionController {
    (): void;
    pause(): void;
    play(): void;
}
/** MS-PPT SlideShowSlideInfoAtom subset: cut, fade, alpha-fade, cover, uncover, push, wipe. */
export declare function transitionFrames(transition: PptSlide['transition']): TransitionFrames | undefined;
export declare function runTransition(incoming: Element, outgoing: Element | undefined, transition: PptSlide['transition'], onDone: () => void): TransitionController;
