export class IworkContainerMismatchError extends Error {
  readonly actualRendererId: string;

  constructor(actualRendererId: string, message: string) {
    super(message);
    this.name = 'IworkContainerMismatchError';
    this.actualRendererId = actualRendererId;
  }
}
