import { FileRenderContext, Rendered } from '../common/type';
/**
 * 压缩包内文件和邮件附件的嵌套预览入口。
 *
 * 主预览器的 `util.ts` 会间接导入 `renders.ts`，而 `renders.ts` 又会注册
 * 压缩包与邮件渲染器；在生产构建里从内部组件再动态导入它容易落到应用
 * 主入口 chunk，导致导出被摇掉。这里用独立的按需分发表保持完整支持面，
 * 同时避免 ArchiveViewer / EmailViewer 与主渲染注册表形成循环依赖。
 */
export declare const renderNestedBuffer: (buffer: ArrayBuffer, type: string, target: HTMLDivElement, context?: FileRenderContext) => Promise<Rendered>;
