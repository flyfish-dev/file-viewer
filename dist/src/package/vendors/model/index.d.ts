import { FileRenderContext } from '../../common/type';
export { MODEL_EXTENSIONS } from './shared';
export default function renderModel(buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext): Promise<import('vue').App<Element>>;
