#include <string>
#include <vector>
#include "main.hpp"

namespace flyfish {

class PreviewHistory {
 public:
  void push(PreviewFile file) {
    items_.push_back(std::move(file));
  }

  std::size_t readyCount() const {
    std::size_t count = 0;
    for (const auto& item : items_) {
      if (item.status == PreviewStatus::Ready) {
        ++count;
      }
    }
    return count;
  }

 private:
  std::vector<PreviewFile> items_;
};

PreviewHistory createHistory() {
  PreviewHistory history;
  for (auto file : createPreviewQueue({"invoice.ofd", "table.xlsx", "module.cc"})) {
    file.status = PreviewStatus::Ready;
    history.push(file);
  }
  return history;
}

}  // namespace flyfish
