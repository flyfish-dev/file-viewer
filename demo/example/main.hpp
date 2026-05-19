#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

std::string viewer_name();

enum class PreviewStatus {
  Idle,
  Loading,
  Ready,
  Error
};

struct PreviewFile {
  std::string name;
  std::string renderer;
  std::size_t size;
  PreviewStatus status = PreviewStatus::Idle;

  bool requiresAsyncChunk() const;
};

std::string extensionOf(const std::string& filename);
std::optional<std::string> rendererFor(const std::string& extension);
std::vector<PreviewFile> createPreviewQueue(const std::vector<std::string>& filenames);
