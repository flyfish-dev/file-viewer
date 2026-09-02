//! ITSF/ITSP container, PMGL directory, and reset-aware MSCompressed reader.
//!
//! The layout follows the public CHM format description. LZX decoding is adapted from
//! the MIT clean-room RustChm/FastChm reader; unlike their CLI reader, this module keeps
//! extraction bounded to one reset window and caches only five windows.

use std::collections::{HashMap, VecDeque};

use crate::{
    error::{ParseError, ParseResult},
    lzx::decompress_reset_window,
};

const ITSF_V2_LEN: usize = 0x58;
const ITSF_V3_LEN: usize = 0x60;
const ITSP_LEN: usize = 0x54;
const PMGL_HEADER_LEN: usize = 0x14;
const MAX_DIRECTORY_CHUNK: usize = 1024 * 1024;
const MAX_PATH_BYTES: usize = 4096;
const CACHE_WINDOWS: usize = 5;
const LZX_FRAME_LEN: u64 = 0x8000;

const PATH_RESET_TABLE: &str = "::DataSpace/Storage/MSCompressed/Transform/{7FC28940-9D31-11D0-9B27-00A0C91E9C7C}/InstanceData/ResetTable";
const PATH_CONTROL_DATA: &str = "::DataSpace/Storage/MSCompressed/ControlData";
const PATH_SPAN_INFO: &str = "::DataSpace/Storage/MSCompressed/SpanInfo";
const PATH_CONTENT: &str = "::DataSpace/Storage/MSCompressed/Content";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EntryKind {
    File,
    Directory,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EntryCategory {
    Normal,
    Special,
    Metadata,
}

#[derive(Debug, Clone)]
pub struct Entry {
    pub path: String,
    pub length: u64,
    pub kind: EntryKind,
    pub category: EntryCategory,
    section: u32,
    offset: u64,
}

impl Entry {
    #[must_use]
    pub fn is_file(&self) -> bool {
        self.kind == EntryKind::File
    }

    #[must_use]
    pub fn is_directory(&self) -> bool {
        self.kind == EntryKind::Directory
    }

    #[must_use]
    pub fn is_compressed(&self) -> bool {
        self.section == 1
    }
}

struct CompressionState {
    content_start: usize,
    compressed_len: usize,
    uncompressed_len: u64,
    reset_interval: u32,
    window_bits: u32,
    frame_len: u64,
    frame_offsets: Vec<u64>,
    cache: VecDeque<(u64, Vec<u8>)>,
}

impl CompressionState {
    fn read(&mut self, file: &[u8], start: u64, length: u64) -> ParseResult<Vec<u8>> {
        let end = start.checked_add(length).ok_or(ParseError::Overflow)?;
        if end > self.uncompressed_len {
            return Err(ParseError::Compression(
                "entry exceeds the uncompressed section",
            ));
        }
        let capacity = usize::try_from(length).map_err(|_| ParseError::Overflow)?;
        let mut output = Vec::with_capacity(capacity);
        let interval = u64::from(self.reset_interval);
        let mut position = start;
        while position < end {
            let window_index = position / interval;
            self.ensure_window(file, window_index)?;
            let window_start = window_index
                .checked_mul(interval)
                .ok_or(ParseError::Overflow)?;
            let offset =
                usize::try_from(position - window_start).map_err(|_| ParseError::Overflow)?;
            let available =
                usize::try_from((end - position).min(interval - (position - window_start)))
                    .map_err(|_| ParseError::Overflow)?;
            let data = self
                .cache
                .iter()
                .find(|(index, _)| *index == window_index)
                .map(|(_, data)| data)
                .ok_or(ParseError::Compression(
                    "decoded reset window was not cached",
                ))?;
            let slice = data
                .get(offset..offset + available)
                .ok_or(ParseError::Compression(
                    "entry slice exceeds decoded reset window",
                ))?;
            output.extend_from_slice(slice);
            position += available as u64;
        }
        Ok(output)
    }

    fn ensure_window(&mut self, file: &[u8], window_index: u64) -> ParseResult<()> {
        if let Some(position) = self
            .cache
            .iter()
            .position(|(index, _)| *index == window_index)
        {
            if let Some(hit) = self.cache.remove(position) {
                self.cache.push_back(hit);
            }
            return Ok(());
        }
        let uncompressed_start = window_index
            .checked_mul(u64::from(self.reset_interval))
            .ok_or(ParseError::Overflow)?;
        if uncompressed_start >= self.uncompressed_len {
            return Err(ParseError::Compression(
                "reset window is outside the section",
            ));
        }
        let frame_index = usize::try_from(uncompressed_start / self.frame_len)
            .map_err(|_| ParseError::Overflow)?;
        let compressed_offset = *self
            .frame_offsets
            .get(frame_index)
            .ok_or(ParseError::Compression("reset table has no frame offset"))?;
        if compressed_offset > self.compressed_len as u64 {
            return Err(ParseError::Compression(
                "reset offset exceeds compressed content",
            ));
        }
        let compressed_start = self
            .content_start
            .checked_add(usize::try_from(compressed_offset).map_err(|_| ParseError::Overflow)?)
            .ok_or(ParseError::Overflow)?;
        let compressed_end = self
            .content_start
            .checked_add(self.compressed_len)
            .ok_or(ParseError::Overflow)?;
        let compressed = file
            .get(compressed_start..compressed_end)
            .ok_or(ParseError::Compression("compressed content is truncated"))?;
        let output_len =
            (self.uncompressed_len - uncompressed_start).min(u64::from(self.reset_interval));
        let decoded = decompress_reset_window(
            compressed,
            output_len,
            self.reset_interval,
            self.window_bits,
            uncompressed_start,
        )?;
        if self.cache.len() == CACHE_WINDOWS {
            self.cache.pop_front();
        }
        self.cache.push_back((window_index, decoded));
        Ok(())
    }
}

pub struct ChmFile {
    file: Vec<u8>,
    content_offset: u64,
    entries: Vec<Entry>,
    by_path: HashMap<String, usize>,
    compression: Option<CompressionState>,
}

impl ChmFile {
    pub fn from_bytes(
        file: Vec<u8>,
        max_entries: usize,
        max_total_path_bytes: usize,
        max_metadata_bytes: u64,
        max_uncompressed_bytes: u64,
    ) -> ParseResult<Self> {
        let header = parse_itsf(&file)?;
        let entries = parse_directory(
            &file,
            header.directory_offset,
            header.directory_len,
            max_entries,
            max_total_path_bytes,
        )?;
        let mut by_path = HashMap::with_capacity(entries.len());
        for (index, entry) in entries.iter().enumerate() {
            by_path
                .entry(entry.path.to_ascii_lowercase())
                .or_insert(index);
        }
        let mut chm = Self {
            file,
            content_offset: header.content_offset,
            entries,
            by_path,
            compression: None,
        };
        chm.compression = chm.parse_compression(max_metadata_bytes, max_uncompressed_bytes)?;
        Ok(chm)
    }

    #[must_use]
    pub fn entries(&self) -> &[Entry] {
        &self.entries
    }

    #[must_use]
    pub fn has_compression(&self) -> bool {
        self.compression.is_some()
    }

    pub fn read(&mut self, entry: &Entry) -> ParseResult<Vec<u8>> {
        if entry.length == 0 {
            return Ok(Vec::new());
        }
        match entry.section {
            0 => self.read_raw(entry),
            1 => self
                .compression
                .as_mut()
                .ok_or(ParseError::Compression("archive has no usable LZX section"))?
                .read(&self.file, entry.offset, entry.length),
            section => Err(ParseError::UnsupportedSection(section)),
        }
    }

    pub fn find(&self, path: &str) -> ParseResult<&Entry> {
        let index = self
            .by_path
            .get(&path.to_ascii_lowercase())
            .copied()
            .ok_or_else(|| ParseError::NotFound(path.to_owned()))?;
        self.entries
            .get(index)
            .ok_or(ParseError::Directory("entry index is out of range"))
    }

    fn read_raw(&self, entry: &Entry) -> ParseResult<Vec<u8>> {
        if entry.section != 0 {
            return Err(ParseError::Compression("control entry is not uncompressed"));
        }
        let start = self
            .content_offset
            .checked_add(entry.offset)
            .ok_or(ParseError::Overflow)?;
        let end = start
            .checked_add(entry.length)
            .ok_or(ParseError::Overflow)?;
        let start = usize::try_from(start).map_err(|_| ParseError::Overflow)?;
        let end = usize::try_from(end).map_err(|_| ParseError::Overflow)?;
        self.file
            .get(start..end)
            .map(ToOwned::to_owned)
            .ok_or(ParseError::Directory("raw entry exceeds the file"))
    }

    fn parse_compression(
        &self,
        max_metadata_bytes: u64,
        max_uncompressed_bytes: u64,
    ) -> ParseResult<Option<CompressionState>> {
        let Some(content) = self.find_optional(PATH_CONTENT) else {
            return Ok(None);
        };
        let (Some(control), Some(span), Some(reset_table)) = (
            self.find_optional(PATH_CONTROL_DATA),
            self.find_optional(PATH_SPAN_INFO),
            self.find_optional(PATH_RESET_TABLE),
        ) else {
            return Ok(None);
        };
        if [content, control, span, reset_table]
            .iter()
            .any(|entry| entry.section != 0)
        {
            return Err(ParseError::Compression(
                "LZX control streams must be uncompressed",
            ));
        }
        for (name, entry) in [
            ("ControlData", control),
            ("SpanInfo", span),
            ("ResetTable", reset_table),
        ] {
            if entry.length > max_metadata_bytes {
                return Err(ParseError::ResourceLimit(format!(
                    "{name} is {} bytes; maxMetadataBytes is {max_metadata_bytes}",
                    entry.length
                )));
            }
        }
        let control_data = self.read_raw(control)?;
        if control_data.len() < 0x18 || control_data.get(4..8) != Some(b"LZXC") {
            return Err(ParseError::Compression("invalid ControlData"));
        }
        let version = read_u32(&control_data, 8)?;
        let mut reset_interval = read_u32(&control_data, 0x0c)?;
        let mut window_size = read_u32(&control_data, 0x10)?;
        if version == 2 {
            reset_interval = reset_interval
                .checked_mul(0x8000)
                .ok_or(ParseError::Overflow)?;
            window_size = window_size
                .checked_mul(0x8000)
                .ok_or(ParseError::Overflow)?;
        } else if version != 1 {
            return Err(ParseError::Compression("unsupported LZXC version"));
        }
        if !(0x8000..=16 * 1024 * 1024).contains(&reset_interval)
            || !(0x8000..=0x20_0000).contains(&window_size)
            || !window_size.is_power_of_two()
        {
            return Err(ParseError::Compression("invalid LZX window/reset geometry"));
        }

        let span_data = self.read_raw(span)?;
        let uncompressed_len = read_u64(&span_data, 0)?;
        if uncompressed_len > max_uncompressed_bytes {
            return Err(ParseError::ResourceLimit(format!(
                "compressed section declares {uncompressed_len} bytes; maxTotalDecompressedBytes is {max_uncompressed_bytes}"
            )));
        }
        let reset_data = self.read_raw(reset_table)?;
        if reset_data.len() < 0x28 || read_u32(&reset_data, 0)? != 2 {
            return Err(ParseError::Compression("invalid ResetTable header"));
        }
        let frame_count =
            usize::try_from(read_u32(&reset_data, 4)?).map_err(|_| ParseError::Overflow)?;
        let table_offset =
            usize::try_from(read_u32(&reset_data, 0x0c)?).map_err(|_| ParseError::Overflow)?;
        let reset_uncompressed_len = read_u64(&reset_data, 0x10)?;
        let compressed_len = read_u64(&reset_data, 0x18)?;
        let frame_len = read_u64(&reset_data, 0x20)?;
        if frame_count == 0
            || frame_len != LZX_FRAME_LEN
            || frame_len > u64::from(window_size)
            || u64::from(reset_interval) % frame_len != 0
        {
            return Err(ParseError::Compression("invalid reset frame geometry"));
        }
        if reset_uncompressed_len != 0 && reset_uncompressed_len < uncompressed_len {
            return Err(ParseError::Compression(
                "ResetTable span is shorter than SpanInfo",
            ));
        }
        if reset_uncompressed_len > max_uncompressed_bytes {
            return Err(ParseError::ResourceLimit(format!(
                "ResetTable declares {reset_uncompressed_len} bytes; maxTotalDecompressedBytes is {max_uncompressed_bytes}"
            )));
        }
        if compressed_len > content.length {
            return Err(ParseError::Compression(
                "compressed length exceeds Content entry",
            ));
        }
        let max_frame_count = max_uncompressed_bytes.div_ceil(frame_len).saturating_add(1);
        if frame_count as u64 > max_frame_count {
            return Err(ParseError::ResourceLimit(format!(
                "ResetTable contains {frame_count} offsets; safety limit is {max_frame_count}"
            )));
        }
        let table_bytes = frame_count.checked_mul(8).ok_or(ParseError::Overflow)?;
        let table_end = table_offset
            .checked_add(table_bytes)
            .ok_or(ParseError::Overflow)?;
        if table_end > reset_data.len() {
            return Err(ParseError::Compression("reset offsets are truncated"));
        }
        let mut frame_offsets = Vec::with_capacity(frame_count);
        for index in 0..frame_count {
            frame_offsets.push(read_u64(&reset_data, table_offset + index * 8)?);
        }
        if frame_offsets.first().copied().unwrap_or(1) != 0
            || frame_offsets.windows(2).any(|pair| pair[0] > pair[1])
            || frame_offsets.last().copied().unwrap_or(0) > compressed_len
        {
            return Err(ParseError::Compression("reset offsets are not monotonic"));
        }
        let needed_frames = uncompressed_len.div_ceil(frame_len);
        if (frame_count as u64) < needed_frames {
            return Err(ParseError::Compression(
                "reset table has too few frame offsets",
            ));
        }
        let content_start = self
            .content_offset
            .checked_add(content.offset)
            .ok_or(ParseError::Overflow)?;
        let content_start = usize::try_from(content_start).map_err(|_| ParseError::Overflow)?;
        let compressed_len = usize::try_from(compressed_len).map_err(|_| ParseError::Overflow)?;
        let content_end = content_start
            .checked_add(compressed_len)
            .ok_or(ParseError::Overflow)?;
        if content_end > self.file.len() {
            return Err(ParseError::Compression("Content entry exceeds the file"));
        }
        let window_bits = window_size.trailing_zeros();
        Ok(Some(CompressionState {
            content_start,
            compressed_len,
            uncompressed_len,
            reset_interval,
            window_bits,
            frame_len,
            frame_offsets,
            cache: VecDeque::new(),
        }))
    }

    fn find_optional(&self, path: &str) -> Option<&Entry> {
        self.by_path
            .get(&path.to_ascii_lowercase())
            .and_then(|index| self.entries.get(*index))
    }
}

struct ItsfHeader {
    directory_offset: u64,
    directory_len: u64,
    content_offset: u64,
}

fn parse_itsf(file: &[u8]) -> ParseResult<ItsfHeader> {
    if file.len() < ITSF_V2_LEN || file.get(..4) != Some(b"ITSF") {
        return Err(ParseError::Header("missing ITSF signature"));
    }
    let version = read_u32(file, 4)?;
    let header_len = usize::try_from(read_u32(file, 8)?).map_err(|_| ParseError::Overflow)?;
    let minimum = match version {
        2 => ITSF_V2_LEN,
        3 => ITSF_V3_LEN,
        _ => return Err(ParseError::Header("unsupported ITSF version")),
    };
    if header_len < minimum || file.len() < minimum {
        return Err(ParseError::Header("truncated ITSF header"));
    }
    let directory_offset = read_u64(file, 0x48)?;
    let directory_len = read_u64(file, 0x50)?;
    let content_offset = if version == 3 {
        read_u64(file, 0x58)?
    } else {
        directory_offset
            .checked_add(directory_len)
            .ok_or(ParseError::Overflow)?
    };
    let directory_end = directory_offset
        .checked_add(directory_len)
        .ok_or(ParseError::Overflow)?;
    if directory_end > file.len() as u64 || content_offset > file.len() as u64 {
        return Err(ParseError::Header(
            "directory/content offset exceeds the file",
        ));
    }
    Ok(ItsfHeader {
        directory_offset,
        directory_len,
        content_offset,
    })
}

fn parse_directory(
    file: &[u8],
    offset: u64,
    length: u64,
    max_entries: usize,
    max_total_path_bytes: usize,
) -> ParseResult<Vec<Entry>> {
    let start = usize::try_from(offset).map_err(|_| ParseError::Overflow)?;
    let directory_end = usize::try_from(offset.checked_add(length).ok_or(ParseError::Overflow)?)
        .map_err(|_| ParseError::Overflow)?;
    let header = file
        .get(start..start + ITSP_LEN)
        .ok_or(ParseError::Directory("truncated ITSP header"))?;
    if header.get(..4) != Some(b"ITSP") || read_u32(header, 4)? != 1 {
        return Err(ParseError::Directory("invalid ITSP signature/version"));
    }
    let header_len = usize::try_from(read_u32(header, 8)?).map_err(|_| ParseError::Overflow)?;
    if header_len < ITSP_LEN {
        return Err(ParseError::Directory("invalid ITSP header length"));
    }
    let chunk_len = usize::try_from(read_u32(header, 0x10)?).map_err(|_| ParseError::Overflow)?;
    let chunk_count = usize::try_from(read_u32(header, 0x2c)?).map_err(|_| ParseError::Overflow)?;
    if !(PMGL_HEADER_LEN..=MAX_DIRECTORY_CHUNK).contains(&chunk_len) {
        return Err(ParseError::Directory("invalid directory chunk size"));
    }
    let chunks_start = start.checked_add(header_len).ok_or(ParseError::Overflow)?;
    let chunks_bytes = chunk_count
        .checked_mul(chunk_len)
        .ok_or(ParseError::Overflow)?;
    let chunks_end = chunks_start
        .checked_add(chunks_bytes)
        .ok_or(ParseError::Overflow)?;
    if chunks_end > directory_end || chunks_end > file.len() {
        return Err(ParseError::Directory(
            "directory chunks exceed the ITSF directory span",
        ));
    }

    let mut entries = Vec::new();
    let mut total_path_bytes = 0usize;
    for chunk_index in 0..chunk_count {
        let chunk_start = chunks_start + chunk_index * chunk_len;
        let chunk = &file[chunk_start..chunk_start + chunk_len];
        if chunk.get(..4) != Some(b"PMGL") {
            continue; // PMGI index chunks contain no leaf entries.
        }
        let free = usize::try_from(read_u32(chunk, 4)?).map_err(|_| ParseError::Overflow)?;
        let used_end = chunk_len
            .checked_sub(free)
            .ok_or(ParseError::Directory("PMGL free space exceeds chunk"))?;
        if used_end < PMGL_HEADER_LEN {
            return Err(ParseError::Directory("PMGL used range is invalid"));
        }
        let mut position = PMGL_HEADER_LEN;
        while position < used_end {
            let path_len = usize::try_from(read_encint(chunk, &mut position, used_end)?)
                .map_err(|_| ParseError::Overflow)?;
            if path_len > MAX_PATH_BYTES {
                return Err(ParseError::Directory("entry path exceeds 4096 bytes"));
            }
            if entries.len() >= max_entries {
                return Err(ParseError::ResourceLimit(format!(
                    "directory contains more than {max_entries} entries"
                )));
            }
            let path_end = position.checked_add(path_len).ok_or(ParseError::Overflow)?;
            let path_bytes = chunk
                .get(position..path_end)
                .ok_or(ParseError::Directory("entry path is truncated"))?;
            position = path_end;
            let section = u32::try_from(read_encint(chunk, &mut position, used_end)?)
                .map_err(|_| ParseError::Directory("storage section exceeds u32"))?;
            let entry_offset = read_encint(chunk, &mut position, used_end)?;
            let entry_length = read_encint(chunk, &mut position, used_end)?;
            let path =
                decode_directory_path(path_bytes, &mut total_path_bytes, max_total_path_bytes)?;
            let kind = if path.ends_with('/') {
                EntryKind::Directory
            } else {
                EntryKind::File
            };
            let category = if path.starts_with("/#") || path.starts_with("/$") {
                EntryCategory::Special
            } else if path.starts_with('/') {
                EntryCategory::Normal
            } else {
                EntryCategory::Metadata
            };
            entries.push(Entry {
                path,
                length: entry_length,
                kind,
                category,
                section,
                offset: entry_offset,
            });
        }
    }
    Ok(entries)
}

fn decode_directory_path(
    path_bytes: &[u8],
    total_path_bytes: &mut usize,
    max_total_path_bytes: usize,
) -> ParseResult<String> {
    // One path is capped at 4096 raw bytes, so decoding it before charging cannot
    // create an unbounded transient. Charge the actual UTF-8 size before retaining
    // the String in the directory or cloning it into the lookup map.
    let path = String::from_utf8_lossy(path_bytes).into_owned();
    let next = total_path_bytes
        .checked_add(path.len())
        .ok_or(ParseError::Overflow)?;
    if next > max_total_path_bytes {
        return Err(ParseError::ResourceLimit(format!(
            "decoded directory paths exceed {max_total_path_bytes} bytes"
        )));
    }
    *total_path_bytes = next;
    Ok(path)
}

fn read_encint(data: &[u8], position: &mut usize, end: usize) -> ParseResult<u64> {
    let mut value = 0u64;
    for _ in 0..10 {
        if *position >= end {
            return Err(ParseError::Directory("unterminated encoded integer"));
        }
        let byte = *data
            .get(*position)
            .ok_or(ParseError::Directory("encoded integer exceeds chunk"))?;
        *position += 1;
        if value > (u64::MAX >> 7) {
            return Err(ParseError::Overflow);
        }
        value = (value << 7) | u64::from(byte & 0x7f);
        if byte & 0x80 == 0 {
            return Ok(value);
        }
    }
    Err(ParseError::Directory("encoded integer is too long"))
}

fn read_u32(data: &[u8], offset: usize) -> ParseResult<u32> {
    let bytes = data
        .get(offset..offset + 4)
        .ok_or(ParseError::Header("truncated 32-bit field"))?;
    Ok(u32::from_le_bytes(bytes.try_into().expect("fixed slice")))
}

fn read_u64(data: &[u8], offset: usize) -> ParseResult<u64> {
    let bytes = data
        .get(offset..offset + 8)
        .ok_or(ParseError::Header("truncated 64-bit field"))?;
    Ok(u64::from_le_bytes(bytes.try_into().expect("fixed slice")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encoded_integer_is_bounded() {
        let mut position = 0;
        assert_eq!(read_encint(&[0x81, 0x01], &mut position, 2).unwrap(), 129);
        let mut position = 0;
        assert!(read_encint(&[0x80; 10], &mut position, 10).is_err());
    }

    #[test]
    fn malformed_header_never_panics() {
        for length in 0..ITSF_V3_LEN {
            assert!(ChmFile::from_bytes(vec![0; length], 100, 4096, 4096, 1024 * 1024).is_err());
        }
    }

    #[test]
    fn directory_budget_charges_lossy_utf8_expansion() {
        let invalid = vec![0xff; MAX_PATH_BYTES];
        let mut total = 0;
        assert!(matches!(
            decode_directory_path(&invalid, &mut total, MAX_PATH_BYTES),
            Err(ParseError::ResourceLimit(_))
        ));
        assert_eq!(total, 0);

        let mut total = 0;
        let decoded = decode_directory_path(&invalid, &mut total, MAX_PATH_BYTES * 3).unwrap();
        assert_eq!(decoded.len(), MAX_PATH_BYTES * 3);
        assert_eq!(total, decoded.len());
    }

    #[test]
    fn large_directory_lookup_uses_case_insensitive_index() {
        let entries = (0..50_000)
            .map(|index| Entry {
                path: format!("/topic-{index}.html"),
                length: 1,
                kind: EntryKind::File,
                category: EntryCategory::Normal,
                section: 0,
                offset: 0,
            })
            .collect::<Vec<_>>();
        let by_path = entries
            .iter()
            .enumerate()
            .map(|(index, entry)| (entry.path.to_ascii_lowercase(), index))
            .collect();
        let chm = ChmFile {
            file: Vec::new(),
            content_offset: 0,
            entries,
            by_path,
            compression: None,
        };
        for _ in 0..10_000 {
            assert_eq!(
                chm.find("/TOPIC-49999.HTML").unwrap().path,
                "/topic-49999.html"
            );
        }
    }
}
