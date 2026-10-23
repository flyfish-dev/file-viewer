# Docker 部署

公开用户推荐直接运行已发布镜像。镜像提供预构建的 File Viewer 静态站点，不需要文档转换后端。

```bash
docker pull flyfishdev/file-viewer:latest
docker run --rm -p 8080:80 flyfishdev/file-viewer:latest
```

访问 `http://localhost:8080` 验证 demo。生产环境建议固定版本标签，不要只依赖 `latest`。

## 私有镜像仓

可以把官方镜像同步到企业内部 Registry，再按现有平台规范部署。Worker、WASM、vendor 和样例资源应与应用一起托管在可信网络内。

## 维护者边界

官方 Docker 镜像构建与发布、发行归档生成、完整 release gate 都属于完整私有工作区的维护者操作，公开 checkout 不提供这些命令。

如需自定义源码部署，请按照[参与开发](./development.md)中的公开构建命令生成 demo，再使用自己的静态 Web 服务发布。
