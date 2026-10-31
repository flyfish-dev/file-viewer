/** Controls only local media already rendered by the viewer. Nothing is played on construction. */
export declare class LocalMediaController {
    private readonly onError?;
    private readonly media;
    private disposed;
    private listeners;
    constructor(root: ParentNode, onError?: ((error: Error) => void) | undefined);
    playFromGesture(id: number, event: Event): Promise<boolean>;
    pause(): void;
    destroy(): void;
}
