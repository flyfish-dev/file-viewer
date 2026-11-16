# Demo onboarding in actual iOS Safari

This Xcode UI test checks the welcome card, reachable Upload / Samples buttons,
sample-library sheet and local-file panel in mobile Safari. Desktop WebKit is
verified separately and does not replace this test.

The same test then opens the bundled financial workbook through Safari's native
address field. It checks real accessible toolbar frames and hit targets, exercises
zoom in/out, and opens More actions to click Download. Screenshots and accessibility
trees retain both the expanded menu and the resulting native download UI. These
checks cover the Demo's Vue toolbar; they do not qualify the native Core toolbar
or a separately packed Full distribution.

Use macOS, an existing Xcode installation, XcodeGen, and an already booted iPhone
Simulator. Build the Demo first. In the maintainer checkout, run:

```sh
IOS_SIMULATOR_UDID=<booted-iphone-udid> pnpm verify:demo-onboarding-ios
```

The runner serves the local build on loopback, copies this test project to
`output/demo-onboarding-ios`, and retains the Xcode log, device report and
`.xcresult` screenshots. It does not download a runtime, create or erase a device,
or change Simulator settings. `DEMO_ONBOARDING_IOS_OUTPUT` selects an evidence directory.

Public contributors can copy this directory to a temporary location, run
`xcodegen generate` there, open a locally served Demo in Simulator Safari with
`?lang=en-US&welcome=1`, then run the generated `DemoOnboarding` scheme against
that iPhone. Keep the local HTTP server running while Xcode tests the page.

## 中文

本测试在真实 iOS Simulator 的 Safari 中检查欢迎卡片、上传与样例入口、样例库和本地文件面板；
桌面 WebKit 不能代替。先构建 Demo，准备现有 Xcode、XcodeGen 和已启动的 iPhone，然后执行上面的
维护者命令。日志、设备信息与截图保留在证据目录，不下载运行时、不创建或抹除设备、不修改 Simulator 设置。
随后通过 Safari 原生地址栏加载内置财务表格，检查实际可访问工具栏元素的边界、触达与无重叠，操作缩放并从
更多菜单点击下载，保留截图和可访问性树。这部分覆盖 Demo 的 Vue 工具栏，不代表原生 Core 工具栏或最终 Full 包验收。
公开贡献者可以把本目录复制到临时位置，运行 `xcodegen generate`，在 Safari 打开持续提供服务的本地
Demo（附 `?lang=en-US&welcome=1`），再针对该 iPhone 运行生成的 `DemoOnboarding` scheme。
