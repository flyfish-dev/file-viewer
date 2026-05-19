from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class PreviewFile:
    name: str
    size: int
    source: str = "url"

    @property
    def extension(self) -> str:
        return Path(self.name).suffix.removeprefix(".").lower()

    @property
    def is_large(self) -> bool:
        return self.size > 5 * 1024 * 1024


RENDERERS = {
    "pdf": "pdfjs-dist",
    "ofd": "DLTech21/ofd.js",
    "dxf": "@cadview/core",
    "json": "highlight.js",
    "py": "highlight.js",
}


def build_preview_queue(files: Iterable[PreviewFile]) -> list[dict[str, str]]:
    queue = []
    for item in files:
        renderer = RENDERERS.get(item.extension, "fallback")
        queue.append({
            "name": item.name,
            "renderer": renderer,
            "priority": "low" if item.is_large else "normal",
        })
    return queue


samples = [
    PreviewFile("invoice.ofd", 428000),
    PreviewFile("drawing.dxf", 93000),
    PreviewFile("trace.log", 12000),
]

for job in build_preview_queue(samples):
    print(f"{job['name']}: {job['renderer']} ({job['priority']})")
