# Docker

The published image is the supported Docker path for public consumers. It serves a prebuilt File Viewer site and does not require a conversion backend.

```bash
docker pull flyfishdev/file-viewer:latest
docker run --rm -p 8080:80 flyfishdev/file-viewer:latest
```

Open `http://localhost:8080` and verify that the demo loads. Pin a version tag rather than `latest` for reproducible production deployments.

## Private registries

You may mirror the published image into an internal registry and deploy it with your normal platform controls. Keep Worker, WASM, vendor and sample assets on the same trusted network as the application.

## Maintainer boundary

Building and publishing the official Docker image, producing release archives and running the complete release matrix are maintainer-only operations in the complete private workspace. They are intentionally not exposed as commands in this public checkout.

For a custom source deployment, use the public build commands in [Development](./development.md) and serve the generated demo output with your own static web server.
