---
description: "贡献 File Viewer 文档和界面翻译，保持 API 示例、语言回退、隐私说明与无障碍一致。"
---

# 翻译贡献指南

[English](../../guide/translations.md)

文档目前有英文和简体中文路由，Demo 与共享预览器另有日文和德文字典。这不代表所有文档页面都有日文、
德文翻译。语言与评审礼仪见[国际协作](collaboration.md)。

## 文本所在位置

| 界面 | 维护源 |
| --- | --- |
| 英文 / 中文文档 | `docs/guide/`、`docs/zh/guide/` |
| Demo 界面 | `apps/viewer-demo/src/composables/useDemoCopy.ts`、`useDemoCopy.ja.ts`、`useDemoCopy.de.ts` |
| Demo 欢迎卡片 | `apps/viewer-demo/src/composables/useDemoWelcome.ts` |
| 共享预览器 | `packages/core/src/i18n/messages.ts`、`messages.ja.ts`、`messages.de.ts` |
| 官网 | `apps/official-site/src/App.vue` 及静态 HTML 元数据 |
| 包说明 | 英文 `README.md`、中文 `README.zh-CN.md`；`README.en.md` 是兼容副本 |

不要编辑生成的 `apps/docs-site/content/` 或构建产物。组件 README 中 `FILE_VIEWER_GENERATED` 标记之间
的章节来自维护者生成器，应修改维护源，避免独立改动生成区。使用 `pnpm docs:packages:sync` 同步英文兼容
副本和语言链接，再用 `pnpm docs:packages:check` 校验。维护者的规范源码工作区还会在同步时重新生成标记章节；
公开贡献者可以在 PR 提议措辞，并标明需要重新生成的章节。

## 保持含义与行为一致

API 名、导入路径、命令、版本号、URL 参数、代码语法、占位符、插值和原始错误消息保持不变。翻译说明文字时，
也要同步无障碍标签；添加文档时保留稳定链接并提供对应语言入口。格式限制、实验状态、隐私与安全声明应等价，
不要把“预览”翻成格式转换或完整编辑承诺。

语言选择器使用语言本名，不用国旗代表语言。日期和示例避免地域歧义。标注机器辅助翻译，并对不确定措辞请求
评审。新增语言要覆盖完整键集合、明确回退、接入选择器，并评审共享预览器与 Demo 两侧文本；只加字典不够。

## 验证实际体验

执行对应文档构建或包类型检查；日文、德文 Demo 改动再运行 `pnpm test:i18n`。在真实浏览器打开翻译页面，
检查导航、搜索、代码复制、键盘焦点、读屏标签、暗色、200% 字号缩放、长单词和窄屏。可见改动保留截图，
记录实际验证过的语言和浏览器。
