# @file-viewer/renderer-signature

File Viewer 的可选、本地运行的数字签名与时间戳渲染器。它覆盖 CMS/PKCS#7、CAdES 属性、RFC 3161、RFC 5544、ASiC、RFC 4998、JWS/JAdES 元数据以及 OpenPGP，并能把安全提取出的文档交回 File Viewer 的嵌套渲染管线。

[English](./README.en.md)

## 支持范围

- CMS / PKCS#7：`.p7m`、`.p7s`、`.p7b`、`.p7c`、`.pkcs7`、`.cms`、`.cmsc`
- 时间戳：RFC 3161 `.tsq`、`.tsr`、`.tst`，RFC 5544 `.tsd`
- 关联签名容器：ASiC-S / ASiC-E `.asics`、`.scs`、`.asice`、`.sce`
- 归档证据：RFC 4998 `.ers`
- JSON Web Signature：Compact、Flattened JSON、General JSON `.jws`
- OpenPGP：`.asc`、`.sig`、`.pgp`、`.gpg`

签名 renderer 被显式选中后会同时检查扩展名与内容，不会抢占普通 PDF、XML、JSON、EML 或 MSG 的既有路由。ASiC 文档、CMS 封装内容、JWS payload 和可安全提取的 OpenPGP literal data 会通过 `renderNestedBuffer` 继续预览。外部 `dataUri`、`jku`、`x5u`、OCSP、CRL、AIA、TSA、keyserver 和 WKD 地址不会自动请求。

## 按需安装

```ts
import { signatureRenderer } from '@file-viewer/renderer-signature'

const options = {
  rendererMode: 'replace',
  renderers: [signatureRenderer]
}
```

需要预览容器内的 PDF、XML、图片或 Office 文档时，同时注册相应 renderer。此包不会进入冻结的旧版 `preset-all` 或历史 `*-full` 依赖矩阵，避免既有用户升级时突然下载密码学 WASM；File Viewer CLI 的新项目 `full` 选择会按清单安装全部 renderer，也可以只勾选 `signature`。

## 主机输入

`options.signature` 支持：

- `originalContent` / `originalFilename`：分离式 CMS、时间戳、ERS 或 JWS 的原文；
- `openPgpPublicKeys`：OpenPGP 分离签名、cleartext 签名和未加密内嵌签名的公开验证密钥；
- `jwsVerificationKeys`：JWS 的非对称公开 JWK；
- `openPgpLimits` / `containerLimits`：只能在绝对安全上限内调整的资源限制；
- `workerFactory`：严格 Trusted Types/CSP 环境提供的 Worker 创建边界。

严格 Trusted Types 示例：

```ts
const policy = trustedTypes.createPolicy('file-viewer-workers', {
  createScriptURL: (value) => value
})

const signature = {
  workerFactory(kind: 'openpgp' | 'container') {
    const url =
      kind === 'openpgp'
        ? new URL('/file-viewer-assets/signature.worker.js', window.location.origin)
        : new URL('/file-viewer-assets/container.worker.js', window.location.origin)
    return new Worker(policy.createScriptURL(url.href), { type: 'module' })
  }
}
```

策略只能接受应用自己解析出的固定包内 URL，不能把文档内容传入 `createScriptURL`。

## OpenPGP 与体积边界

OpenPGP 后端使用 MIT/Apache-2.0 的 rPGP `0.20.0`，在专用 Worker 中懒加载 WASM；不使用 OpenPGP.js、GnuPG 或 LGPL 源码。公开 API 只暴露分类、受限元数据检查，以及分离、cleartext、未加密内嵌/压缩消息的多签名验证，不暴露 rPGP 底层对象或私钥材料。

当前优化产物的硬门禁为：WASM 不超过 1,600,000 B raw / 450,000 B Brotli，npm tarball 不超过 1,800,000 B。构建会做两次字节级可复现校验。默认解析上限为 32 MiB 输入、16 MiB 提取输出、4096 个包、16 层嵌套、128 个 user ID、128 个子密钥和 256 个签名。

直接调用 ASN.1 API 时，`inspectSignatureContainer` 和 `inspectEvidenceRecord` 还会限制输入、原文、节点、嵌套、摘要算法、证书、CRL、签名人、属性、提取内容、时间证据链和 hash-tree 数量；`options.limits` 只能调低，不能突破绝对上限。

加密消息只报告收件人标识、完整性保护及容器中可见的算法元数据。自动解密、签名、密钥生成、私钥解锁、系统 keyring 导入和在线密钥发现均未开放。

## 验证边界

解析成功不等于签名有效；签名有效也不等于证书或密钥可信、身份可信、策略合规、合格电子签名或法律有效。界面会分别标记结构解析、内容摘要、密码学签名和未执行的信任/策略检查。

ASiC 会在解压前检查中央目录与本地头一致性、数据区间、路径、重复项、符号链接、加密、ZIP64、压缩方法、CRC、压缩率、单项与累计解压量；不安全包直接失败。RFC 4998 当前验证可证明的摘要关系并展示归档时间戳链，不声称完成长期归档策略验证。XAdES/XMLDSig 在 ASiC 中仅做有界结构与引用映射，JAdES 仅报告元数据；PAdES、S/MIME、PGP/MIME 和完整 XML canonicalization / XMLDSig / XAdES / JAdES profile validation 需要对应既有 renderer 的显式集成，当前不伪装成已完成。

## 构建与验收

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.127 --locked
pnpm --filter @file-viewer/renderer-signature build
pnpm --filter @file-viewer/renderer-signature verify
pnpm verify:issue-206-signature
```

发布门禁固定使用 `wasm-bindgen-cli 0.2.127` 和 `wasm-opt -Oz --all-features`。浏览器回归覆盖 Chromium、Firefox、WebKit、严格 CSP/Trusted Types、恶意 DOM 载荷、路径穿越、压缩炸弹、外网请求禁止和 Worker 卸载归零。

完整运行时依赖、选择的许可证分支和对应许可证正文见 `THIRD_PARTY_LICENSES.json`；摘要见 `THIRD_PARTY_NOTICES.md`。
