#include <stdio.h>
#include <string.h>
#include "main.h"

const char* viewer_name(void) {
  return "Flyfish Viewer";
}

const char* preview_extension(const char* filename) {
  const char* dot = strrchr(filename, '.');
  return dot == NULL ? "" : dot + 1;
}

preview_file_t preview_plan_create(const char* filename, size_t size) {
  const char* extension = preview_extension(filename);
  const char* renderer = "fallback";

  if (strcmp(extension, "pdf") == 0) renderer = "pdfjs-dist";
  if (strcmp(extension, "ofd") == 0) renderer = "DLTech21/ofd.js";
  if (strcmp(extension, "dxf") == 0) renderer = "@cadview/core";
  if (strcmp(extension, "c") == 0) renderer = "highlight.js";

  preview_file_t file = { filename, renderer, size, PREVIEW_IDLE };
  return file;
}

int preview_requires_async(preview_file_t file) {
  return strcmp(file.renderer, "fallback") != 0;
}

int main(void) {
  preview_file_t file = preview_plan_create("drawing.dxf", 32768);
  printf("%s uses %s async=%d\n", file.name, file.renderer, preview_requires_async(file));
  return 0;
}
