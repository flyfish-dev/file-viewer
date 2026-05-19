#include <iostream>
#include <map>
#include <string>
#include <vector>
#include "main.hpp"

std::string viewer_name() {
  return "Flyfish Viewer";
}

bool PreviewFile::requiresAsyncChunk() const {
  return renderer != "fallback";
}

std::string extensionOf(const std::string& filename) {
  const auto dot = filename.find_last_of('.');
  return dot == std::string::npos ? "" : filename.substr(dot + 1);
}

std::optional<std::string> rendererFor(const std::string& extension) {
  static const std::map<std::string, std::string> renderers = {
    {"pdf", "pdfjs-dist"},
    {"ofd", "DLTech21/ofd.js"},
    {"dxf", "@cadview/core"},
    {"cpp", "highlight.js"}
  };

  const auto found = renderers.find(extension);
  if (found == renderers.end()) return std::nullopt;
  return found->second;
}

std::vector<PreviewFile> createPreviewQueue(const std::vector<std::string>& filenames) {
  std::vector<PreviewFile> queue;
  for (const auto& name : filenames) {
    queue.push_back({ name, rendererFor(extensionOf(name)).value_or("fallback"), 0 });
  }
  return queue;
}

int main() {
  for (const auto& file : createPreviewQueue({"contract.pdf", "drawing.dxf", "main.cpp"})) {
    std::cout << file.name << " -> " << file.renderer << std::endl;
  }
  return 0;
}
