import { default as FileViewer } from './components/FileViewer';
import { App } from 'vue';
declare interface FileViewerInstaller {
    /**
     * 全局注册 `<file-viewer>` 组件。
     */
    install(app: App): void;
}
/**
 * Vue3 插件安装器。
 */
declare class Installer implements FileViewerInstaller {
    private installed;
    install(app: App): void;
}
declare const _default: Installer;
export default _default;
export { FileViewer };
