import type { PptAnimationEffect, PptPlaybackState } from '../types.js';
export interface ScheduledEffect {
    effect: PptAnimationEffect;
    startMs: number;
    endMs: number;
}
export interface AnimationStep {
    automatic: boolean;
    effects: ScheduledEffect[];
    durationMs: number;
}
/** A click begins a step; withPrevious shares the prior start, afterPrevious follows its end. */
export declare function compileTimeline(effects: readonly PptAnimationEffect[]): AnimationStep[];
export declare function effectKeyframes(effect: PptAnimationEffect, width: number, height: number, parent?: readonly number[]): Keyframe[];
export interface TimelineOptions {
    resolveTarget: (shapeId: number) => Element | null;
    width: number;
    height: number;
    onState?: (state: PptPlaybackState) => void;
    onDone?: () => void;
}
/** Owns only per-shape animation wrappers. Destroy always cancels finished promises safely. */
export declare class TimelinePlayer {
    private readonly effects;
    private readonly options;
    private readonly steps;
    private stepIndex;
    private effectIndex;
    private animations;
    private generation;
    private destroyed;
    private running;
    private paused;
    private enabled;
    constructor(effects: readonly PptAnimationEffect[], options: TimelineOptions);
    get state(): PptPlaybackState;
    private notify;
    private setVisibility;
    reset(): void;
    private cancelAnimations;
    play(): void;
    startAutomatic(): void;
    pause(): void;
    /** Returns false when every effect has been consumed; the viewer may then change slides. */
    advance(): boolean;
    destroy(showFinal?: boolean): void;
}
