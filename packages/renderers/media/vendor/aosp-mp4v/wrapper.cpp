// SPDX-License-Identifier: Apache-2.0

#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#include "mp4dec_api.h"

struct Mp4vDecoder {
    VideoDecControls controls;
    uint8_t *frames[2];
    int32_t displayWidth;
    int32_t displayHeight;
    int32_t bufferWidth;
    int32_t bufferHeight;
    uint32_t frameCount;
};

static constexpr int32_t kMaxDimension = 8192;
static constexpr size_t kMaxPixels = 35000000;
static constexpr int32_t kMaxConfigBytes = 64 * 1024;

extern "C" {

Mp4vDecoder *mp4v_create(
    const uint8_t *vol,
    int32_t volSize,
    int32_t width,
    int32_t height
) {
    if (
        !vol || volSize <= 0 || volSize > kMaxConfigBytes ||
        width <= 0 || height <= 0 ||
        width > kMaxDimension || height > kMaxDimension ||
        static_cast<size_t>(width) * static_cast<size_t>(height) > kMaxPixels
    ) return nullptr;
    Mp4vDecoder *decoder = static_cast<Mp4vDecoder *>(calloc(1, sizeof(Mp4vDecoder)));
    if (!decoder) return nullptr;

    uint8_t *volBuffers[1] = { const_cast<uint8_t *>(vol) };
    int32_t volSizes[1] = { volSize };
    if (!PVInitVideoDecoder(
        &decoder->controls,
        volBuffers,
        volSizes,
        1,
        width,
        height,
        MPEG4_MODE
    )) {
        free(decoder);
        return nullptr;
    }

    PVSetPostProcType(&decoder->controls, PV_NO_POST_PROC);
    PVGetVideoDimensions(
        &decoder->controls,
        &decoder->displayWidth,
        &decoder->displayHeight
    );
    PVGetBufferDimensions(
        &decoder->controls,
        &decoder->bufferWidth,
        &decoder->bufferHeight
    );
    if (
        decoder->displayWidth <= 0 || decoder->displayHeight <= 0 ||
        decoder->bufferWidth <= 0 || decoder->bufferHeight <= 0 ||
        decoder->displayWidth > kMaxDimension || decoder->displayHeight > kMaxDimension ||
        decoder->bufferWidth > kMaxDimension || decoder->bufferHeight > kMaxDimension ||
        static_cast<size_t>(decoder->bufferWidth) *
            static_cast<size_t>(decoder->bufferHeight) > kMaxPixels
    ) {
        PVCleanUpVideoDecoder(&decoder->controls);
        free(decoder);
        return nullptr;
    }

    const size_t frameSize = static_cast<size_t>(decoder->bufferWidth) *
        static_cast<size_t>(decoder->bufferHeight) * 3 / 2;
    decoder->frames[0] = static_cast<uint8_t *>(malloc(frameSize));
    decoder->frames[1] = static_cast<uint8_t *>(malloc(frameSize));
    if (!decoder->frames[0] || !decoder->frames[1]) {
        free(decoder->frames[0]);
        free(decoder->frames[1]);
        PVCleanUpVideoDecoder(&decoder->controls);
        free(decoder);
        return nullptr;
    }
    PVSetReferenceYUV(&decoder->controls, decoder->frames[1]);
    return decoder;
}

int32_t mp4v_decode(
    Mp4vDecoder *decoder,
    uint8_t *data,
    int32_t size,
    uint32_t timestamp
) {
    if (!decoder || !data || size <= 0) return 0;
    uint8_t *bitstream[1] = { data };
    int32_t sizes[1] = { size };
    uint32_t timestamps[1] = { timestamp };
    uint useExternalTimestamp[1] = { 1 };
    uint8_t *output = decoder->frames[decoder->frameCount & 1];
    if (!PVDecodeVideoFrame(
        &decoder->controls,
        bitstream,
        timestamps,
        sizes,
        useExternalTimestamp,
        output
    )) {
        return 0;
    }
    decoder->frameCount += 1;
    PVGetVideoDimensions(
        &decoder->controls,
        &decoder->displayWidth,
        &decoder->displayHeight
    );
    return 1;
}

int32_t mp4v_reset(Mp4vDecoder *decoder) {
    if (!decoder || !PVResetVideoDecoder(&decoder->controls)) return 0;
    decoder->frameCount = 0;
    const size_t frameSize = static_cast<size_t>(decoder->bufferWidth) *
        static_cast<size_t>(decoder->bufferHeight) * 3 / 2;
    memset(decoder->frames[0], 0, frameSize);
    memset(decoder->frames[1], 0, frameSize);
    PVSetReferenceYUV(&decoder->controls, decoder->frames[1]);
    return 1;
}

uint8_t *mp4v_output(Mp4vDecoder *decoder) {
    if (!decoder || decoder->frameCount == 0) return nullptr;
    return decoder->frames[(decoder->frameCount - 1) & 1];
}

int32_t mp4v_width(Mp4vDecoder *decoder) {
    return decoder ? decoder->displayWidth : 0;
}

int32_t mp4v_height(Mp4vDecoder *decoder) {
    return decoder ? decoder->displayHeight : 0;
}

int32_t mp4v_buffer_width(Mp4vDecoder *decoder) {
    return decoder ? decoder->bufferWidth : 0;
}

int32_t mp4v_buffer_height(Mp4vDecoder *decoder) {
    return decoder ? decoder->bufferHeight : 0;
}

void mp4v_destroy(Mp4vDecoder *decoder) {
    if (!decoder) return;
    PVCleanUpVideoDecoder(&decoder->controls);
    free(decoder->frames[0]);
    free(decoder->frames[1]);
    free(decoder);
}

}
