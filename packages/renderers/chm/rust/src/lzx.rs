//! Bounded CHM LZX decoder.
//!
//! Adapted from the MIT clean-room implementation in RustChm/FastChm. This version
//! turns every bitstream boundary into a checked result and never allocates more than
//! the caller-requested reset window.

use crate::error::{ParseError, ParseResult};

const NUM_CHARS: usize = 256;
const PRETREE_SYMS: usize = 20;
const ALIGNED_SYMS: usize = 8;
const LEN_SYMS: usize = 249;
const MIN_MATCH: usize = 2;
const NUM_PRIMARY_LENGTHS: usize = 7;
const FRAME: u64 = 0x8000;
const INTEL_TRANSFORM_LIMIT: u64 = FRAME * 32_768;

const EXTRA_BITS: [u8; 51] = [
    0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13,
    13, 14, 14, 15, 15, 16, 16, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17,
];
const POS_BASE: [u32; 51] = [
    0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536,
    2048, 3072, 4096, 6144, 8192, 12288, 16384, 24576, 32768, 49152, 65536, 98304, 131072, 196608,
    262144, 393216, 524288, 655360, 786432, 917504, 1048576, 1179648, 1310720, 1441792, 1572864,
    1703936, 1835008, 1966080, 2097152,
];

struct BitReader<'a> {
    input: &'a [u8],
    position: usize,
    buffer: u64,
    count: u32,
}

impl<'a> BitReader<'a> {
    fn new(input: &'a [u8]) -> Self {
        Self {
            input,
            position: 0,
            buffer: 0,
            count: 0,
        }
    }

    fn ensure(&mut self, bits: u32) -> ParseResult<()> {
        if bits > 32 {
            return Err(ParseError::Lzx("bit read is wider than 32 bits"));
        }
        while self.count < bits {
            let Some(&low) = self.input.get(self.position) else {
                return Err(ParseError::Lzx("unexpected end of compressed input"));
            };
            let high = self.input.get(self.position + 1).copied().unwrap_or(0);
            self.position = (self.position + 2).min(self.input.len());
            let word = u64::from(low) | (u64::from(high) << 8);
            self.buffer = (self.buffer << 16) | word;
            self.count += 16;
        }
        Ok(())
    }

    fn read(&mut self, bits: u32) -> ParseResult<u32> {
        if bits == 0 {
            return Ok(0);
        }
        self.ensure(bits)?;
        let mask = if bits == 32 {
            u64::from(u32::MAX)
        } else {
            (1u64 << bits) - 1
        };
        let value = (self.buffer >> (self.count - bits)) & mask;
        self.count -= bits;
        Ok(value as u32)
    }

    fn align_to_word(&mut self) {
        self.count -= self.count % 16;
    }

    fn read_bytes(&mut self, output: &mut [u8]) -> ParseResult<()> {
        let mut index = 0usize;
        while index < output.len() && self.count >= 8 {
            output[index] = ((self.buffer >> (self.count - 8)) & 0xff) as u8;
            self.count -= 8;
            index += 1;
        }
        let remaining = output.len() - index;
        let end = self
            .position
            .checked_add(remaining)
            .ok_or(ParseError::Overflow)?;
        let source = self
            .input
            .get(self.position..end)
            .ok_or(ParseError::Lzx("uncompressed block exceeds input"))?;
        output[index..].copy_from_slice(source);
        self.position = end;
        Ok(())
    }
}

struct HuffDecoder {
    count: [u32; 18],
    first_code: [u32; 18],
    first_index: [u32; 18],
    max_exclusive: [u32; 18],
    symbols: Vec<u16>,
}

impl HuffDecoder {
    fn new() -> Self {
        Self {
            count: [0; 18],
            first_code: [0; 18],
            first_index: [0; 18],
            max_exclusive: [0; 18],
            symbols: Vec::new(),
        }
    }

    fn build(&mut self, lengths: &[u8], symbol_count: usize) -> ParseResult<()> {
        let lengths = lengths
            .get(..symbol_count)
            .ok_or(ParseError::Lzx("Huffman length table is truncated"))?;
        self.count = [0; 18];
        for &length in lengths {
            if length > 16 {
                return Err(ParseError::Lzx("Huffman code length exceeds 16"));
            }
            self.count[usize::from(length)] += 1;
        }
        let mut code = 0u32;
        let mut index = 0u32;
        for length in 1..=16 {
            let available = 1u32 << length;
            if code
                .checked_add(self.count[length])
                .is_none_or(|end| end > available)
            {
                return Err(ParseError::Lzx("oversubscribed Huffman tree"));
            }
            self.first_code[length] = code;
            self.first_index[length] = index;
            index = index
                .checked_add(self.count[length])
                .ok_or(ParseError::Overflow)?;
            self.max_exclusive[length] = code + self.count[length];
            code = (code + self.count[length]) << 1;
        }
        self.symbols = vec![0; usize::try_from(index).map_err(|_| ParseError::Overflow)?];
        let mut next = self.first_index;
        for (symbol, &length) in lengths.iter().enumerate() {
            if length != 0 {
                let length_index = usize::from(length);
                let target =
                    usize::try_from(next[length_index]).map_err(|_| ParseError::Overflow)?;
                *self
                    .symbols
                    .get_mut(target)
                    .ok_or(ParseError::Lzx("Huffman symbol table overflow"))? =
                    u16::try_from(symbol).map_err(|_| ParseError::Overflow)?;
                next[length_index] += 1;
            }
        }
        Ok(())
    }

    fn decode(&self, reader: &mut BitReader<'_>) -> ParseResult<usize> {
        let mut code = 0u32;
        for length in 1..=16 {
            code = (code << 1) | reader.read(1)?;
            if self.count[length] != 0
                && code >= self.first_code[length]
                && code < self.max_exclusive[length]
            {
                let index = self.first_index[length] + (code - self.first_code[length]);
                return self
                    .symbols
                    .get(usize::try_from(index).map_err(|_| ParseError::Overflow)?)
                    .copied()
                    .map(usize::from)
                    .ok_or(ParseError::Lzx("Huffman symbol is out of range"));
            }
        }
        Err(ParseError::Lzx("invalid Huffman code"))
    }
}

fn read_lengths(reader: &mut BitReader<'_>, lengths: &mut [u8], size: usize) -> ParseResult<()> {
    if size > lengths.len() {
        return Err(ParseError::Lzx("code length output is truncated"));
    }
    let mut pretree_lengths = [0u8; PRETREE_SYMS];
    for length in &mut pretree_lengths {
        *length = reader.read(4)? as u8;
    }
    let mut pretree = HuffDecoder::new();
    pretree.build(&pretree_lengths, PRETREE_SYMS)?;
    let mut index = 0usize;
    while index < size {
        let symbol = pretree.decode(reader)?;
        match symbol {
            17 | 18 => {
                let extra = if symbol == 17 {
                    reader.read(4)? + 4
                } else {
                    reader.read(5)? + 20
                };
                let run = usize::try_from(extra).map_err(|_| ParseError::Overflow)?;
                let end = index.checked_add(run).ok_or(ParseError::Overflow)?;
                if end > size {
                    return Err(ParseError::Lzx("zero code-length run exceeds table"));
                }
                lengths[index..end].fill(0);
                index = end;
            }
            19 => {
                let run = usize::try_from(reader.read(1)? + 4).map_err(|_| ParseError::Overflow)?;
                let delta = pretree.decode(reader)?;
                let end = index.checked_add(run).ok_or(ParseError::Overflow)?;
                if end > size {
                    return Err(ParseError::Lzx("repeated code-length run exceeds table"));
                }
                let new_length = ((i32::from(lengths[index]) - delta as i32 + 17) % 17) as u8;
                lengths[index..end].fill(new_length);
                index = end;
            }
            delta if delta <= 16 => {
                lengths[index] = ((i32::from(lengths[index]) - delta as i32 + 17) % 17) as u8;
                index += 1;
            }
            _ => return Err(ParseError::Lzx("invalid pretree symbol")),
        }
    }
    Ok(())
}

pub fn decompress_reset_window(
    compressed: &[u8],
    uncompressed_size: u64,
    reset_interval: u32,
    window_bits: u32,
    absolute_output_start: u64,
) -> ParseResult<Vec<u8>> {
    static SLOTS: [usize; 7] = [30, 32, 34, 36, 38, 42, 50];
    if !(15..=21).contains(&window_bits) {
        return Err(ParseError::Lzx("unsupported window size"));
    }
    if reset_interval == 0 || u64::from(reset_interval) < FRAME {
        return Err(ParseError::Lzx("invalid reset interval"));
    }
    let target = usize::try_from(uncompressed_size).map_err(|_| ParseError::Overflow)?;
    if uncompressed_size > u64::from(reset_interval) {
        return Err(ParseError::Lzx("requested output exceeds one reset window"));
    }
    let slot_count = SLOTS[usize::try_from(window_bits - 15).map_err(|_| ParseError::Overflow)?];
    let main_symbols = NUM_CHARS + 8 * slot_count;
    let mut output = Vec::with_capacity(target);
    let mut reader = BitReader::new(compressed);
    let (mut r0, mut r1, mut r2) = (1i32, 1i32, 1i32);
    let mut main_lengths = vec![0u8; main_symbols];
    let mut length_lengths = vec![0u8; LEN_SYMS];
    let mut aligned_lengths = [0u8; ALIGNED_SYMS];
    let mut main_tree = HuffDecoder::new();
    let mut length_tree = HuffDecoder::new();
    let mut aligned_tree = HuffDecoder::new();
    let mut produced = 0u64;
    let mut block_remaining = 0u64;
    let mut frame_remaining = FRAME;
    let mut block_type = 0u32;
    let mut uncompressed_block_needs_pad = false;

    let intel_filesize = if reader.read(1)? != 0 {
        let high = reader.read(16)?;
        let low = reader.read(16)?;
        Some((high << 16) | low)
    } else {
        None
    };
    while produced < uncompressed_size {
        if block_remaining == 0 {
            block_type = reader.read(3)?;
            block_remaining = u64::from(reader.read(24)?);
            if block_remaining == 0 {
                return Err(ParseError::Lzx("zero-length block"));
            }
            match block_type {
                1 | 2 => {
                    if block_type == 2 {
                        for length in &mut aligned_lengths {
                            *length = reader.read(3)? as u8;
                        }
                    }
                    read_lengths(&mut reader, &mut main_lengths, NUM_CHARS)?;
                    let tail_len = main_symbols - NUM_CHARS;
                    read_lengths(&mut reader, &mut main_lengths[NUM_CHARS..], tail_len)?;
                    read_lengths(&mut reader, &mut length_lengths, LEN_SYMS)?;
                    main_tree.build(&main_lengths, main_symbols)?;
                    length_tree.build(&length_lengths, LEN_SYMS)?;
                    if block_type == 2 {
                        aligned_tree.build(&aligned_lengths, ALIGNED_SYMS)?;
                    }
                }
                3 => {
                    uncompressed_block_needs_pad = block_remaining % 2 != 0;
                    reader.align_to_word();
                    let mut recent = [0u8; 12];
                    reader.read_bytes(&mut recent)?;
                    r0 = i32::from_le_bytes(recent[0..4].try_into().expect("fixed slice"));
                    r1 = i32::from_le_bytes(recent[4..8].try_into().expect("fixed slice"));
                    r2 = i32::from_le_bytes(recent[8..12].try_into().expect("fixed slice"));
                }
                _ => return Err(ParseError::Lzx("unsupported block type")),
            }
        }

        if block_type == 3 {
            let chunk = block_remaining
                .min(frame_remaining)
                .min(uncompressed_size - produced);
            let chunk = usize::try_from(chunk).map_err(|_| ParseError::Overflow)?;
            let start = output.len();
            output.resize(start + chunk, 0);
            reader.read_bytes(&mut output[start..])?;
            produced += chunk as u64;
            block_remaining -= chunk as u64;
            frame_remaining -= chunk as u64;
            if block_remaining == 0 && uncompressed_block_needs_pad && produced < uncompressed_size
            {
                let mut padding = [0u8; 1];
                reader.read_bytes(&mut padding)?;
                uncompressed_block_needs_pad = false;
            }
        } else {
            let symbol = main_tree.decode(&mut reader)?;
            if symbol < NUM_CHARS {
                if block_remaining == 0 || frame_remaining == 0 {
                    return Err(ParseError::Lzx("literal crosses a block or frame boundary"));
                }
                output.push(symbol as u8);
                produced += 1;
                block_remaining -= 1;
                frame_remaining -= 1;
            } else {
                let slot = (symbol - NUM_CHARS) >> 3;
                let length_header = (symbol - NUM_CHARS) & 7;
                let mut match_length = length_header + MIN_MATCH;
                if length_header == NUM_PRIMARY_LENGTHS {
                    match_length =
                        length_tree.decode(&mut reader)? + NUM_PRIMARY_LENGTHS + MIN_MATCH;
                }
                let match_offset = match slot {
                    0 => r0,
                    1 => {
                        std::mem::swap(&mut r0, &mut r1);
                        r0
                    }
                    2 => {
                        std::mem::swap(&mut r0, &mut r2);
                        r0
                    }
                    _ => {
                        let extra_bits = *EXTRA_BITS
                            .get(slot)
                            .ok_or(ParseError::Lzx("match slot is out of range"))?;
                        let footer = if block_type == 2 && extra_bits >= 3 {
                            let verbatim = if extra_bits > 3 {
                                reader.read(u32::from(extra_bits - 3))?
                            } else {
                                0
                            };
                            (verbatim << 3)
                                | u32::try_from(aligned_tree.decode(&mut reader)?)
                                    .map_err(|_| ParseError::Overflow)?
                        } else {
                            reader.read(u32::from(extra_bits))?
                        };
                        let base = *POS_BASE
                            .get(slot)
                            .ok_or(ParseError::Lzx("match position base is out of range"))?;
                        let value = i64::from(base) + i64::from(footer) - 2;
                        let value = i32::try_from(value)
                            .map_err(|_| ParseError::Lzx("match offset overflows"))?;
                        r2 = r1;
                        r1 = r0;
                        r0 = value;
                        value
                    }
                };
                if match_offset <= 0
                    || usize::try_from(match_offset).map_or(true, |value| value > output.len())
                {
                    return Err(ParseError::Lzx("match offset is outside the reset window"));
                }
                let match_length_u64 =
                    u64::try_from(match_length).map_err(|_| ParseError::Overflow)?;
                if match_length_u64 > block_remaining || match_length_u64 > frame_remaining {
                    return Err(ParseError::Lzx("match crosses a block or frame boundary"));
                }
                let offset = usize::try_from(match_offset).map_err(|_| ParseError::Overflow)?;
                let source = output.len() - offset;
                for index in 0..match_length {
                    let byte = *output
                        .get(source + index)
                        .ok_or(ParseError::Lzx("overlapping match is out of range"))?;
                    output.push(byte);
                }
                produced = produced
                    .checked_add(match_length_u64)
                    .ok_or(ParseError::Overflow)?;
                block_remaining -= match_length_u64;
                frame_remaining -= match_length_u64;
            }
        }

        if frame_remaining == 0 {
            reader.align_to_word();
            frame_remaining = FRAME;
        }
        if produced > uncompressed_size + 257 {
            return Err(ParseError::Lzx("decoded output exceeded its target"));
        }
    }
    output.truncate(target);
    if let Some(filesize) = intel_filesize.filter(|filesize| *filesize != 0) {
        undo_e8_transform(&mut output, absolute_output_start, filesize);
    }
    Ok(output)
}

/// Reverse LZX's optional Intel x86 CALL-address preprocessing. The transform is
/// deliberately applied only after successful bounded decompression, and the caller
/// supplies the absolute section offset so random reset-window reads match sequential
/// decoding.
fn undo_e8_transform(output: &mut [u8], absolute_start: u64, filesize: u32) {
    if output.len() <= 10 || absolute_start >= INTEL_TRANSFORM_LIMIT {
        return;
    }
    let mut output_offset = 0usize;
    while output_offset < output.len() {
        let Some(frame_start) = absolute_start.checked_add(output_offset as u64) else {
            return;
        };
        if frame_start >= INTEL_TRANSFORM_LIMIT {
            return;
        }
        let remaining_in_frame = FRAME - frame_start % FRAME;
        let active_before_cutoff = INTEL_TRANSFORM_LIMIT - frame_start;
        let frame_len = usize::try_from(
            remaining_in_frame
                .min(active_before_cutoff)
                .min((output.len() - output_offset) as u64),
        )
        .expect("frame length fits usize");
        undo_e8_frame(
            &mut output[output_offset..output_offset + frame_len],
            frame_start,
            filesize,
        );
        output_offset += frame_len;
    }
}

fn undo_e8_frame(output: &mut [u8], absolute_start: u64, filesize: u32) {
    if output.len() <= 10 {
        return;
    }
    let filesize = i64::from(filesize);
    let absolute_start = absolute_start as i64;
    let mut index = 0usize;
    while index + 10 < output.len() {
        if output[index] != 0xe8 {
            index += 1;
            continue;
        }
        let value_start = index + 1;
        let absolute = i64::from(i32::from_le_bytes(
            output[value_start..value_start + 4]
                .try_into()
                .expect("fixed slice"),
        ));
        let current = absolute_start.saturating_add(index as i64);
        if absolute >= -current && absolute < filesize {
            let relative = if absolute >= 0 {
                absolute - current
            } else {
                absolute + filesize
            };
            if let Ok(relative) = i32::try_from(relative) {
                output[value_start..value_start + 4].copy_from_slice(&relative.to_le_bytes());
            }
        }
        index += 5;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn push_bits(bits: &mut Vec<bool>, width: u32, value: u32) {
        for shift in (0..width).rev() {
            bits.push(value & (1 << shift) != 0);
        }
    }

    fn append_word_aligned_bits(stream: &mut Vec<u8>, bits: &mut Vec<bool>) {
        while !bits.len().is_multiple_of(16) {
            bits.push(false);
        }
        for word_bits in bits.chunks_exact(16) {
            let word = word_bits
                .iter()
                .fold(0u16, |value, bit| (value << 1) | u16::from(*bit));
            stream.extend_from_slice(&word.to_le_bytes());
        }
        bits.clear();
    }

    fn append_recent_offsets(stream: &mut Vec<u8>) {
        for recent in [1i32, 1, 1] {
            stream.extend_from_slice(&recent.to_le_bytes());
        }
    }

    fn uncompressed_stream_with_e8(payload: &[u8], filesize: u32) -> Vec<u8> {
        let mut bits = Vec::new();
        push_bits(&mut bits, 1, 1);
        push_bits(&mut bits, 16, filesize >> 16);
        push_bits(&mut bits, 16, filesize & 0xffff);
        push_bits(&mut bits, 3, 3);
        push_bits(&mut bits, 24, payload.len() as u32);
        let mut stream = Vec::new();
        append_word_aligned_bits(&mut stream, &mut bits);
        append_recent_offsets(&mut stream);
        stream.extend_from_slice(payload);
        stream
    }

    #[test]
    fn rejects_empty_and_unbounded_streams() {
        assert!(decompress_reset_window(&[], 1, 0x10000, 16, 0).is_err());
        assert!(decompress_reset_window(&[0; 8], 0x10001, 0x10000, 16, 0).is_err());
        assert!(decompress_reset_window(&[0; 8], 1, 0x10000, 22, 0).is_err());
    }

    #[test]
    fn reverses_e8_addresses_with_absolute_window_position() {
        let mut bytes = vec![0x90, 0x90, 0xe8];
        bytes.extend_from_slice(&1000i32.to_le_bytes());
        bytes.extend_from_slice(&[0x90; 16]);
        undo_e8_transform(&mut bytes, 100, 4096);
        assert_eq!(i32::from_le_bytes(bytes[3..7].try_into().unwrap()), 898);

        let mut negative = vec![0xe8];
        negative.extend_from_slice(&(-100i32).to_le_bytes());
        negative.extend_from_slice(&[0x90; 16]);
        undo_e8_transform(&mut negative, 100, 4096);
        assert_eq!(i32::from_le_bytes(negative[1..5].try_into().unwrap()), 3996);
    }

    #[test]
    fn consumes_e8_filesize_header_and_decodes_uncompressed_block() {
        let mut transformed = vec![0x90; 24];
        transformed[2] = 0xe8;
        transformed[3..7].copy_from_slice(&1000i32.to_le_bytes());
        let stream = uncompressed_stream_with_e8(&transformed, 4096);
        let output = decompress_reset_window(&stream, 24, 0x10000, 16, 100).unwrap();
        assert_eq!(i32::from_le_bytes(output[3..7].try_into().unwrap()), 898);
    }

    #[test]
    fn consumes_odd_uncompressed_block_padding_before_next_block() {
        let first = b"abc";
        let mut second = vec![0x90; 16];
        second[2] = 0xe8;
        second[3..7].copy_from_slice(&1000i32.to_le_bytes());

        let mut stream = Vec::new();
        let mut bits = Vec::new();
        push_bits(&mut bits, 1, 1);
        push_bits(&mut bits, 16, 0);
        push_bits(&mut bits, 16, 4096);
        push_bits(&mut bits, 3, 3);
        push_bits(&mut bits, 24, first.len() as u32);
        append_word_aligned_bits(&mut stream, &mut bits);
        append_recent_offsets(&mut stream);
        stream.extend_from_slice(first);
        stream.push(0xa5); // required word-alignment padding for the odd raw block

        push_bits(&mut bits, 3, 3);
        push_bits(&mut bits, 24, second.len() as u32);
        append_word_aligned_bits(&mut stream, &mut bits);
        append_recent_offsets(&mut stream);
        stream.extend_from_slice(&second);

        let output = decompress_reset_window(&stream, 19, 0x10000, 16, 100).unwrap();
        assert_eq!(&output[..3], first);
        assert_eq!(i32::from_le_bytes(output[6..10].try_into().unwrap()), 895);
    }

    #[test]
    fn e8_transform_respects_frame_edges_and_one_gib_cutoff() {
        let mut bytes = vec![0x90; FRAME as usize + 24];
        let trailing = FRAME as usize - 8;
        bytes[trailing] = 0xe8;
        bytes[trailing + 1..trailing + 5].copy_from_slice(&1000i32.to_le_bytes());
        let next_frame = FRAME as usize + 2;
        bytes[next_frame] = 0xe8;
        bytes[next_frame + 1..next_frame + 5].copy_from_slice(&50_000i32.to_le_bytes());
        undo_e8_transform(&mut bytes, 0, 100_000);
        assert_eq!(
            i32::from_le_bytes(bytes[trailing + 1..trailing + 5].try_into().unwrap()),
            1000
        );
        assert_eq!(
            i32::from_le_bytes(bytes[next_frame + 1..next_frame + 5].try_into().unwrap()),
            50_000 - next_frame as i32
        );

        let mut after_cutoff = vec![0xe8];
        after_cutoff.extend_from_slice(&1000i32.to_le_bytes());
        after_cutoff.extend_from_slice(&[0x90; 16]);
        undo_e8_transform(&mut after_cutoff, INTEL_TRANSFORM_LIMIT, 4096);
        assert_eq!(
            i32::from_le_bytes(after_cutoff[1..5].try_into().unwrap()),
            1000
        );
    }
}
