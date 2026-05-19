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
 * 文件处理逻辑，用于声明具体格式的异步渲染器。
 *
 * 渲染器只在命中文件扩展名时被按需加载，避免 PDF、OFD、CAD、Office
 * 等重型依赖进入无关格式的首屏路径。
 *
 * @param buffer 二进制缓存
 * @param target 目标dom
 * @param type 目标扩展名。部分渲染器会用它选择语言、容错策略或格式提示。
 */
export type FileHandler = (buffer: ArrayBuffer, target: HTMLDivElement, type?: string) => Promise<Rendered>;
/**
 * 文件处理器组合。
 */
export interface FileHandlerComposite {
    accepts: Array<string>;
    handler: FileHandler;
}
