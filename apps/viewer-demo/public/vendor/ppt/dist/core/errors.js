export class PptError extends Error {
    code;
    offset;
    constructor(code, message, offset) { super(message); this.name = 'PptError'; this.code = code; this.offset = offset; }
}
