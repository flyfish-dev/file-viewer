// SPDX-License-Identifier: Apache-2.0

#pragma once

#define ALOGE(...) ((void)0)

static inline int android_errorWriteLog(int, const char *) {
    return 0;
}
