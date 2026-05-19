#pragma once

#include <stddef.h>

typedef enum preview_status {
  PREVIEW_IDLE,
  PREVIEW_LOADING,
  PREVIEW_READY,
  PREVIEW_ERROR
} preview_status_t;

typedef struct preview_file {
  const char* name;
  const char* renderer;
  size_t size;
  preview_status_t status;
} preview_file_t;

const char* viewer_name(void);
const char* preview_extension(const char* filename);
preview_file_t preview_plan_create(const char* filename, size_t size);
int preview_requires_async(preview_file_t file);
