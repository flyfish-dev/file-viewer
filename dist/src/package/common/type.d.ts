import { App } from 'vue';
/**
 * 渲染器返回的 Vue 包装实例。
 *
 * Vue3 渲染器直接返回 `App`，少量兼容渲染器会返回只暴露 `$el`
 * 与 `unmount()` 的轻量包装对象。
 */
export interface AppWrapper {
    $el: Node;
    unmount(): void;
}
/**
 * 任意渲染器挂载完成后返回的可卸载实例。
 */
export type Rendered = App | AppWrapper;
/**
 * 组件可接受的本地二进制来源。
 *
 * 对外接入时最推荐传入带正确文件名的 `File`。如果业务侧拿到的是
 * `Blob` 或 `ArrayBuffer`，请先包装成 `new File([...], 'demo.pdf')`，
 * 这样渲染器才能通过扩展名选择正确的预览链路。
 */
export type FileRef = File | Blob | ArrayBuffer;
/**
 * 水印配置。
 *
 * `text` 与 `image` 至少设置一个；同时传入时优先使用图片水印。
 * 图片水印可以是 http(s) URL、相对路径或 data URL。
 */
export interface FileViewerWatermarkOptions {
    enabled?: boolean;
    text?: string;
    image?: string;
    opacity?: number;
    rotate?: number;
    gapX?: number;
    gapY?: number;
    width?: number;
    height?: number;
    fontSize?: number;
    color?: string;
    fontFamily?: string;
}
/**
 * 预览器内置操作栏配置。
 */
export interface FileViewerToolbarOptions {
    download?: boolean;
    print?: boolean;
    exportHtml?: boolean;
}
/**
 * 压缩包预览配置。
 */
export interface FileViewerArchiveOptions {
    /**
     * libarchive.js Worker 地址。私有化部署时建议把
     * `worker-bundle.js` 与 `libarchive.wasm` 放在同一目录后传入。
     */
    workerUrl?: string;
    /**
     * 是否启用 IndexedDB 缓存压缩包内已解压的文件。
     */
    cache?: boolean;
    /**
     * 单个压缩包允许解析的最大体积，单位字节。
     */
    maxArchiveSize?: number;
    /**
     * 压缩包内单文件允许在线预览的最大体积，单位字节。
     */
    maxEntryPreviewSize?: number;
}
/**
 * 预览器通用配置。
 */
export interface FileViewerOptions {
    watermark?: boolean | FileViewerWatermarkOptions;
    toolbar?: boolean | FileViewerToolbarOptions;
    archive?: FileViewerArchiveOptions;
}
/**
 * 渲染器可选上下文。
 *
 * 部分格式需要知道原始 URL 的目录，例如 glTF / DAE / FBX 会继续加载
 * 同目录的贴图、bin 或材质文件。没有这些上下文时，渲染器仍应尽力预览
 * 单文件内容，并在资源缺失时给出明确错误。
 */
export interface FileRenderContext {
    filename?: string;
    url?: string;
    options?: FileViewerOptions;
}
/**
 * 文件处理逻辑，用于声明具体格式的异步渲染器。
 *
 * 渲染器只在命中文件扩展名时被按需加载，避免 PDF、OFD、压缩包、
 * 邮件、CAD、3D、Office 等重型依赖进入无关格式的首屏路径。
 *
 * @param buffer 二进制缓存
 * @param target 目标dom
 * @param type 目标扩展名。部分渲染器会用它选择语言、容错策略或格式提示。
 * @param context 原始文件名、远端 URL 等补充上下文。
 */
export type FileHandler = (buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext) => Promise<Rendered>;
/**
 * 文件处理器组合。
 */
export interface FileHandlerComposite {
    accepts: Array<string>;
    handler: FileHandler;
}
