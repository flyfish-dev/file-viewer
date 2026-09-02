//! Microsoft HTML Help metadata decoders used by the viewer manifest.

use std::collections::HashSet;

use encoding_rs::Encoding;
use serde::Serialize;

use crate::{
    error::{CoreError, CoreResult},
    sitemap::SitemapNode,
};

const MAX_METADATA_FIELD_BYTES: usize = 64 * 1024;

/// Shared cap for strings materialized from binary navigation tables. Topic tables
/// may legally reuse offsets, so input-size checks alone do not bound manifest output.
pub struct MetadataStringBudget {
    remaining: usize,
}

impl MetadataStringBudget {
    #[must_use]
    pub fn new(limit: u64) -> Self {
        Self {
            remaining: usize::try_from(limit).unwrap_or(usize::MAX),
        }
    }

    fn charge(&mut self, bytes: usize) -> CoreResult<()> {
        if bytes > self.remaining {
            return Err(CoreError::Limit(
                "binary navigation strings exceed maxMetadataBytes".into(),
            ));
        }
        self.remaining -= bytes;
        Ok(())
    }
}

#[derive(Debug, Clone, Default)]
pub struct SystemInfo {
    pub version: u32,
    pub lcid: u32,
    pub contents_file: Option<String>,
    pub index_file: Option<String>,
    pub default_topic: Option<String>,
    pub title: Option<String>,
    pub default_window: Option<String>,
    pub default_font: Option<String>,
    pub binary_toc: bool,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexNode {
    pub name: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub locals: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub see_also: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<IndexNode>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FullTextMetadata {
    pub available: bool,
    pub byte_length: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub indexed_topic_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_word_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unique_word_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code_page: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lcid: Option<u32>,
}

pub fn parse_system(data: &[u8]) -> CoreResult<SystemInfo> {
    if data.len() < 4 {
        return Err(CoreError::UnsafePath("/#SYSTEM is truncated".into()));
    }
    let mut info = SystemInfo {
        version: le_u32(data, 0)?,
        ..SystemInfo::default()
    };
    let mut pos = 4usize;
    while pos < data.len() {
        let code = le_u16(data, pos)?;
        let length = usize::from(le_u16(data, pos + 2)?);
        pos = pos.checked_add(4).ok_or_else(overflow)?;
        let end = pos.checked_add(length).ok_or_else(overflow)?;
        let value = data
            .get(pos..end)
            .ok_or_else(|| CoreError::UnsafePath("/#SYSTEM record is truncated".into()))?;
        if code == 4 && value.len() >= 4 {
            info.lcid = le_u32(value, 0)?;
        }
        if code == 11 {
            info.binary_toc = true;
        }
        pos = end;
    }

    let encoding = encoding_for_lcid(info.lcid);
    pos = 4;
    while pos < data.len() {
        let code = le_u16(data, pos)?;
        let length = usize::from(le_u16(data, pos + 2)?);
        pos = pos.checked_add(4).ok_or_else(overflow)?;
        let end = pos.checked_add(length).ok_or_else(overflow)?;
        let value = data
            .get(pos..end)
            .ok_or_else(|| CoreError::UnsafePath("/#SYSTEM record is truncated".into()))?;
        let text = || decode_c_string_field(value, encoding);
        match code {
            0 => info.contents_file = nonempty(text()?),
            1 => info.index_file = nonempty(text()?),
            2 => info.default_topic = nonempty(text()?),
            3 => info.title = nonempty(text()?),
            5 => info.default_window = nonempty(text()?),
            16 => info.default_font = nonempty(text()?),
            _ => {}
        }
        pos = end;
    }
    Ok(info)
}

fn nonempty(value: String) -> Option<String> {
    let value = value.trim().to_owned();
    (!value.is_empty()).then_some(value)
}

pub fn encoding_for_lcid(lcid: u32) -> &'static Encoding {
    let label = match lcid & 0xffff {
        0x0404 | 0x0c04 | 0x1404 => b"big5".as_slice(),
        0x0804 | 0x1004 => b"gb18030".as_slice(),
        0x0411 => b"shift_jis".as_slice(),
        0x0412 => b"euc-kr".as_slice(),
        0x0419 | 0x0422 | 0x0423 | 0x042f | 0x0440 | 0x0444 => b"windows-1251".as_slice(),
        0x0408 => b"windows-1253".as_slice(),
        0x041f => b"windows-1254".as_slice(),
        0x040d => b"windows-1255".as_slice(),
        0x0401 | 0x0801 | 0x0c01 | 0x1001 | 0x1401 | 0x1801 | 0x1c01 | 0x2001 | 0x2401 | 0x2801
        | 0x2c01 | 0x3001 | 0x3401 | 0x3801 | 0x3c01 | 0x4001 => b"windows-1256".as_slice(),
        0x0425..=0x0427 => b"windows-1257".as_slice(),
        0x042a => b"windows-1258".as_slice(),
        _ => b"windows-1252".as_slice(),
    };
    Encoding::for_label(label).expect("static encoding label")
}

pub fn language_for_lcid(lcid: u32) -> String {
    match lcid & 0xffff {
        0x0404 => "zh-TW",
        0x0804 => "zh-CN",
        0x0c04 => "zh-HK",
        0x1004 => "zh-SG",
        0x1404 => "zh-MO",
        0x0409 => "en-US",
        0x0809 => "en-GB",
        0x0c09 => "en-AU",
        0x0411 => "ja-JP",
        0x0412 => "ko-KR",
        0x0407 => "de-DE",
        0x040c => "fr-FR",
        0x0410 => "it-IT",
        0x0419 => "ru-RU",
        0x0c0a => "es-ES",
        0x0416 => "pt-BR",
        0x0816 => "pt-PT",
        _ => return format!("und-x-lcid-{lcid:04x}"),
    }
    .into()
}

pub struct TopicTables<'a> {
    pub topics: &'a [u8],
    pub url_table: &'a [u8],
    pub url_strings: &'a [u8],
    pub strings: &'a [u8],
    pub encoding: &'static Encoding,
}

impl TopicTables<'_> {
    pub fn resolve(
        &self,
        topic: u32,
        budget: &mut MetadataStringBudget,
    ) -> CoreResult<Option<(String, String)>> {
        let Some((title_offset, url_string_offset)) = self.topic_offsets(topic) else {
            return Ok(None);
        };
        let Some(url) =
            decode_prefixed_url(self.url_strings, url_string_offset, self.encoding, budget)?
        else {
            return Ok(None);
        };
        let title = if title_offset == u32::MAX {
            String::new()
        } else {
            let Some(title) = decode_offset_string(
                self.strings,
                usize::try_from(title_offset).map_err(|_| overflow())?,
                self.encoding,
                budget,
            )?
            else {
                return Ok(None);
            };
            title
        };
        Ok(Some((title, url)))
    }

    fn local(&self, topic: u32, budget: &mut MetadataStringBudget) -> CoreResult<Option<String>> {
        let Some((_, url_string_offset)) = self.topic_offsets(topic) else {
            return Ok(None);
        };
        decode_prefixed_url(self.url_strings, url_string_offset, self.encoding, budget)
    }

    fn string(&self, offset: u32, budget: &mut MetadataStringBudget) -> CoreResult<Option<String>> {
        decode_offset_string(
            self.strings,
            usize::try_from(offset).map_err(|_| overflow())?,
            self.encoding,
            budget,
        )
    }

    fn topic_offsets(&self, topic: u32) -> Option<(u32, usize)> {
        let offset = usize::try_from(topic).ok()?.checked_mul(16)?;
        let record = self.topics.get(offset..offset + 16)?;
        let title_offset = le_u32_opt(record, 4)?;
        let url_table_offset = usize::try_from(le_u32_opt(record, 8)?).ok()?;
        let url_record = self
            .url_table
            .get(url_table_offset..url_table_offset + 12)?;
        let url_string_offset = usize::try_from(le_u32_opt(url_record, 8)?).ok()?;
        Some((title_offset, url_string_offset))
    }
}

pub fn parse_binary_toc(
    toc: &[u8],
    tables: &TopicTables<'_>,
    max_nodes: usize,
    max_depth: usize,
    string_budget: &mut MetadataStringBudget,
) -> CoreResult<Vec<SitemapNode>> {
    if toc.len() < 16 {
        return Err(CoreError::UnsafePath("/#TOCIDX is truncated".into()));
    }
    let root = usize::try_from(le_u32(toc, 0)?).map_err(|_| overflow())?;
    let mut visited = HashSet::new();
    let mut count = 0usize;
    parse_toc_siblings(
        toc,
        tables,
        root,
        0,
        max_depth,
        max_nodes,
        &mut count,
        &mut visited,
        string_budget,
    )
}

#[allow(clippy::too_many_arguments)]
fn parse_toc_siblings(
    toc: &[u8],
    tables: &TopicTables<'_>,
    mut offset: usize,
    depth: usize,
    max_depth: usize,
    max_nodes: usize,
    count: &mut usize,
    visited: &mut HashSet<usize>,
    string_budget: &mut MetadataStringBudget,
) -> CoreResult<Vec<SitemapNode>> {
    if depth >= max_depth {
        return Err(CoreError::Limit(format!(
            "binary TOC nesting exceeds {max_depth}"
        )));
    }
    let mut nodes = Vec::new();
    while offset != 0 {
        if !visited.insert(offset) {
            return Err(CoreError::UnsafePath("binary TOC contains a cycle".into()));
        }
        *count += 1;
        if *count > max_nodes {
            return Err(CoreError::Limit(format!(
                "binary TOC contains more than {max_nodes} nodes"
            )));
        }
        let base = toc
            .get(offset..offset + 20)
            .ok_or_else(|| CoreError::UnsafePath("binary TOC record is truncated".into()))?;
        let properties = le_u32(base, 4)?;
        let reference = le_u32(base, 8)?;
        let next = usize::try_from(le_u32(base, 16)?).map_err(|_| overflow())?;
        let has_children = properties & 4 != 0;
        let has_local = properties & 8 != 0;
        let (mut name, local) = if has_local {
            let (title, url) = tables
                .resolve(reference, string_budget)?
                .unwrap_or_default();
            (title, nonempty(url))
        } else {
            (
                tables.string(reference, string_budget)?.unwrap_or_default(),
                None,
            )
        };
        if name.is_empty() {
            let fallback = local.as_deref().unwrap_or("Untitled");
            string_budget.charge(fallback.len())?;
            name = fallback.to_owned();
        }
        let children = if has_children {
            let child = usize::try_from(le_u32(toc, offset + 20)?).map_err(|_| overflow())?;
            parse_toc_siblings(
                toc,
                tables,
                child,
                depth + 1,
                max_depth,
                max_nodes,
                count,
                visited,
                string_budget,
            )?
        } else {
            Vec::new()
        };
        nodes.push(SitemapNode {
            name,
            local,
            merge: None,
            see_also: None,
            image_number: None,
            children,
        });
        offset = next;
    }
    Ok(nodes)
}

pub fn parse_binary_index(
    btree: &[u8],
    tables: &TopicTables<'_>,
    max_nodes: usize,
    max_depth: usize,
    string_budget: &mut MetadataStringBudget,
) -> CoreResult<Vec<IndexNode>> {
    const HEADER_LEN: usize = 0x4c;
    if btree.len() < HEADER_LEN || btree[0..2] != [0x3b, 0x29] {
        return Err(CoreError::UnsafePath(
            "binary keyword index has an invalid header".into(),
        ));
    }
    let block_len = usize::from(le_u16(btree, 4)?);
    if !(20..=0x10_0000).contains(&block_len) {
        return Err(CoreError::UnsafePath(
            "binary keyword index has an invalid block size".into(),
        ));
    }
    let last_list_block = usize::try_from(le_u32(btree, 26)?).map_err(|_| overflow())?;
    let mut flat = Vec::new();
    let mut expanded_nodes = 0usize;
    let mut previous_depth = None;
    for block_index in 0..=last_list_block {
        let start = HEADER_LEN
            .checked_add(block_index.checked_mul(block_len).ok_or_else(overflow)?)
            .ok_or_else(overflow)?;
        let block = btree.get(start..start + block_len).ok_or_else(|| {
            CoreError::UnsafePath("binary keyword index block is truncated".into())
        })?;
        let free = usize::from(le_u16(block, 0)?);
        let entries = usize::from(le_u16(block, 2)?);
        let end = block_len.checked_sub(free).ok_or_else(overflow)?;
        let mut pos = 12usize;
        for _ in 0..entries {
            expanded_nodes = expanded_nodes.checked_add(1).ok_or_else(overflow)?;
            if expanded_nodes > max_nodes {
                return Err(CoreError::Limit(format!(
                    "keyword index contains more than {max_nodes} nodes"
                )));
            }
            let (name, next) = read_utf16z(block, pos, end, string_budget)?;
            pos = next;
            let flags = le_u16(block, pos)?;
            let depth = le_u16(block, pos + 2)?;
            let depth_usize = usize::from(depth);
            if depth_usize >= max_depth {
                return Err(CoreError::Limit(format!(
                    "binary keyword index nesting exceeds {max_depth}"
                )));
            }
            match previous_depth {
                None if depth != 0 => {
                    return Err(CoreError::UnsafePath(
                        "binary keyword index does not start at depth zero".into(),
                    ));
                }
                Some(previous) if depth_usize > previous + 1 => {
                    return Err(CoreError::UnsafePath(
                        "binary keyword index contains an invalid depth jump".into(),
                    ));
                }
                _ => {}
            }
            previous_depth = Some(depth_usize);
            pos = pos.checked_add(8).ok_or_else(overflow)?; // flags, depth, character index
            pos = pos.checked_add(4).ok_or_else(overflow)?; // reserved
            let count = usize::try_from(le_u32(block, pos)?).map_err(|_| overflow())?;
            pos = pos.checked_add(4).ok_or_else(overflow)?;
            let (locals, see_also) = if flags & 2 != 0 {
                let (target, next) = read_utf16z(block, pos, end, string_budget)?;
                pos = next;
                (Vec::new(), nonempty(target))
            } else {
                if count > max_nodes {
                    return Err(CoreError::Limit(
                        "keyword topic fan-out exceeds the node limit".into(),
                    ));
                }
                expanded_nodes = expanded_nodes.checked_add(count).ok_or_else(overflow)?;
                if expanded_nodes > max_nodes {
                    return Err(CoreError::Limit(format!(
                        "keyword index and topic references contain more than {max_nodes} nodes"
                    )));
                }
                let mut locals = Vec::with_capacity(count);
                let mut seen_topics = HashSet::with_capacity(count);
                for _ in 0..count {
                    let topic = le_u32(block, pos)?;
                    pos = pos.checked_add(4).ok_or_else(overflow)?;
                    if seen_topics.insert(topic)
                        && let Some(local) = tables.local(topic, string_budget)?
                    {
                        locals.push(local);
                    }
                }
                (locals, None)
            };
            pos = pos.checked_add(8).ok_or_else(overflow)?;
            if pos > end {
                return Err(CoreError::UnsafePath(
                    "binary keyword entry exceeds its block".into(),
                ));
            }
            flat.push((
                depth,
                IndexNode {
                    name,
                    locals,
                    see_also,
                    children: Vec::new(),
                },
            ));
        }
    }
    Ok(nest_index(flat))
}

fn nest_index(flat: Vec<(u16, IndexNode)>) -> Vec<IndexNode> {
    let mut roots = Vec::new();
    let mut stack: Vec<(u16, IndexNode)> = Vec::new();
    for (depth, node) in flat {
        while stack
            .last()
            .is_some_and(|(parent_depth, _)| *parent_depth >= depth)
        {
            attach_index_node(&mut roots, &mut stack);
        }
        stack.push((depth, node));
    }
    while !stack.is_empty() {
        attach_index_node(&mut roots, &mut stack);
    }
    roots
}

fn attach_index_node(roots: &mut Vec<IndexNode>, stack: &mut Vec<(u16, IndexNode)>) {
    let (_, node) = stack.pop().expect("stack is not empty");
    if let Some((_, parent)) = stack.last_mut() {
        parent.children.push(node);
    } else {
        roots.push(node);
    }
}

pub fn parse_full_text_metadata(data: &[u8], byte_length: u64) -> FullTextMetadata {
    if data.len() >= 130 && data.get(2) == Some(&0x28) {
        FullTextMetadata {
            available: true,
            byte_length,
            indexed_topic_count: le_u32_opt(data, 4),
            total_word_count: le_u32_opt(data, 66),
            unique_word_count: le_u32_opt(data, 70),
            code_page: le_u32_opt(data, 122),
            lcid: le_u32_opt(data, 126),
        }
    } else {
        FullTextMetadata {
            available: true,
            byte_length,
            indexed_topic_count: None,
            total_word_count: None,
            unique_word_count: None,
            code_page: None,
            lcid: None,
        }
    }
}

fn decode_c_string_field(value: &[u8], encoding: &'static Encoding) -> CoreResult<String> {
    let scan_len = value.len().min(MAX_METADATA_FIELD_BYTES + 1);
    let end = value[..scan_len]
        .iter()
        .position(|&byte| byte == 0)
        .unwrap_or(scan_len);
    if end > MAX_METADATA_FIELD_BYTES || (end == scan_len && value.len() > MAX_METADATA_FIELD_BYTES)
    {
        return Err(CoreError::Limit(format!(
            "metadata string exceeds {MAX_METADATA_FIELD_BYTES} bytes"
        )));
    }
    let (decoded, _, _) = encoding.decode(&value[..end]);
    if decoded.len() > MAX_METADATA_FIELD_BYTES {
        return Err(CoreError::Limit(format!(
            "decoded metadata string exceeds {MAX_METADATA_FIELD_BYTES} bytes"
        )));
    }
    Ok(decoded.into_owned())
}

fn decode_offset_string(
    data: &[u8],
    offset: usize,
    encoding: &'static Encoding,
    budget: &mut MetadataStringBudget,
) -> CoreResult<Option<String>> {
    let Some(rest) = data.get(offset..) else {
        return Ok(None);
    };
    let value = decode_c_string_field(rest, encoding)?;
    budget.charge(value.len())?;
    Ok(Some(value))
}

fn decode_prefixed_url(
    data: &[u8],
    offset: usize,
    encoding: &'static Encoding,
    budget: &mut MetadataStringBudget,
) -> CoreResult<Option<String>> {
    let Some(offset) = offset.checked_add(8) else {
        return Ok(None);
    };
    decode_offset_string(data, offset, encoding, budget)
}

fn read_utf16z(
    data: &[u8],
    mut pos: usize,
    end: usize,
    budget: &mut MetadataStringBudget,
) -> CoreResult<(String, usize)> {
    let start = pos;
    loop {
        if pos + 2 > end {
            return Err(CoreError::UnsafePath("unterminated UTF-16 keyword".into()));
        }
        let unit = le_u16(data, pos)?;
        pos += 2;
        if unit == 0 {
            break;
        }
        if pos - start > MAX_METADATA_FIELD_BYTES {
            return Err(CoreError::Limit(format!(
                "UTF-16 metadata string exceeds {MAX_METADATA_FIELD_BYTES} bytes"
            )));
        }
    }
    let units = data[start..pos - 2]
        .chunks_exact(2)
        .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
        .collect::<Vec<_>>();
    let value = String::from_utf16_lossy(&units);
    if value.len() > MAX_METADATA_FIELD_BYTES {
        return Err(CoreError::Limit(format!(
            "decoded UTF-16 metadata string exceeds {MAX_METADATA_FIELD_BYTES} bytes"
        )));
    }
    budget.charge(value.len())?;
    Ok((value, pos))
}

fn le_u16(data: &[u8], offset: usize) -> CoreResult<u16> {
    let bytes = data
        .get(offset..offset + 2)
        .ok_or_else(|| CoreError::UnsafePath("metadata integer is truncated".into()))?;
    Ok(u16::from_le_bytes([bytes[0], bytes[1]]))
}

fn le_u32(data: &[u8], offset: usize) -> CoreResult<u32> {
    le_u32_opt(data, offset)
        .ok_or_else(|| CoreError::UnsafePath("metadata integer is truncated".into()))
}

fn le_u32_opt(data: &[u8], offset: usize) -> Option<u32> {
    let bytes = data.get(offset..offset + 4)?;
    Some(u32::from_le_bytes(bytes.try_into().ok()?))
}

fn overflow() -> CoreError {
    CoreError::UnsafePath("metadata offset overflow".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_system_strings_and_language() {
        let mut data = 3u32.to_le_bytes().to_vec();
        data.extend_from_slice(&4u16.to_le_bytes());
        data.extend_from_slice(&4u16.to_le_bytes());
        data.extend_from_slice(&0x0804u32.to_le_bytes());
        data.extend_from_slice(&2u16.to_le_bytes());
        data.extend_from_slice(&11u16.to_le_bytes());
        data.extend_from_slice(b"index.html\0");
        let info = parse_system(&data).unwrap();
        assert_eq!(info.default_topic.as_deref(), Some("index.html"));
        assert_eq!(language_for_lcid(info.lcid), "zh-CN");
        assert_eq!(encoding_for_lcid(info.lcid).name(), "gb18030");
    }

    #[test]
    fn parses_many_zero_length_system_records_without_per_record_storage() {
        let mut data = 3u32.to_le_bytes().to_vec();
        data.resize(4 + 4 * 100_000, 0);
        let info = parse_system(&data).unwrap();
        assert_eq!(info.version, 3);
        assert!(info.contents_file.is_none());
        assert_eq!(info.lcid, 0);
    }

    #[test]
    fn nests_keyword_depths() {
        let flat = vec![
            (
                0,
                IndexNode {
                    name: "A".into(),
                    ..IndexNode::default()
                },
            ),
            (
                1,
                IndexNode {
                    name: "A1".into(),
                    ..IndexNode::default()
                },
            ),
            (
                0,
                IndexNode {
                    name: "B".into(),
                    ..IndexNode::default()
                },
            ),
        ];
        let nodes = nest_index(flat);
        assert_eq!(nodes.len(), 2);
        assert_eq!(nodes[0].children[0].name, "A1");
    }

    fn binary_index_with_depths(depths: &[u16]) -> Vec<u8> {
        const HEADER_LEN: usize = 0x4c;
        const BLOCK_LEN: usize = 32 * 1024;
        const ENTRIES_PER_BLOCK: usize = 1_000;
        let block_count = depths.len().div_ceil(ENTRIES_PER_BLOCK);
        let mut btree = vec![0u8; HEADER_LEN + block_count * BLOCK_LEN];
        btree[0..2].copy_from_slice(&[0x3b, 0x29]);
        btree[4..6].copy_from_slice(&(BLOCK_LEN as u16).to_le_bytes());
        btree[26..30].copy_from_slice(&u32::try_from(block_count - 1).unwrap().to_le_bytes());

        for (block_index, chunk) in depths.chunks(ENTRIES_PER_BLOCK).enumerate() {
            let start = HEADER_LEN + block_index * BLOCK_LEN;
            let block = &mut btree[start..start + BLOCK_LEN];
            block[2..4].copy_from_slice(&u16::try_from(chunk.len()).unwrap().to_le_bytes());
            let mut pos = 12usize;
            for &depth in chunk {
                block[pos..pos + 4].copy_from_slice(&[b'x', 0, 0, 0]);
                pos += 4;
                block[pos + 2..pos + 4].copy_from_slice(&depth.to_le_bytes());
                pos += 8; // flags, depth, character index
                pos += 4; // reserved
                pos += 4; // zero topic references
                pos += 8; // trailing fields
            }
            block[0..2].copy_from_slice(&u16::try_from(BLOCK_LEN - pos).unwrap().to_le_bytes());
        }
        btree
    }

    #[test]
    fn rejects_deep_or_discontinuous_binary_keyword_index_before_nesting() {
        let tables = TopicTables {
            topics: &[],
            url_table: &[],
            url_strings: &[],
            strings: &[],
            encoding: encoding_for_lcid(0x0409),
        };
        let depths = (0..50_000).map(|depth| depth as u16).collect::<Vec<_>>();
        let deep = binary_index_with_depths(&depths);
        let mut budget = MetadataStringBudget::new(1024 * 1024);
        let error = parse_binary_index(&deep, &tables, 60_000, 256, &mut budget).unwrap_err();
        assert!(matches!(error, CoreError::Limit(message) if message.contains("nesting")));

        let discontinuous = binary_index_with_depths(&[0, 2]);
        let mut budget = MetadataStringBudget::new(1024);
        let error = parse_binary_index(&discontinuous, &tables, 10, 256, &mut budget).unwrap_err();
        assert!(matches!(error, CoreError::UnsafePath(message) if message.contains("depth jump")));
    }

    #[test]
    fn binary_index_budgets_topic_references_before_allocation() {
        const HEADER_LEN: usize = 0x4c;
        const BLOCK_LEN: usize = 96;
        let mut btree = vec![0u8; HEADER_LEN + BLOCK_LEN];
        btree[0..2].copy_from_slice(&[0x3b, 0x29]);
        btree[4..6].copy_from_slice(&(BLOCK_LEN as u16).to_le_bytes());

        let block = &mut btree[HEADER_LEN..];
        block[2..4].copy_from_slice(&1u16.to_le_bytes());
        let mut pos = 12usize;
        block[pos..pos + 2].copy_from_slice(&(b'k' as u16).to_le_bytes());
        pos += 2;
        block[pos..pos + 2].copy_from_slice(&0u16.to_le_bytes());
        pos += 2;
        pos += 8; // flags, depth, character index
        pos += 4; // reserved
        block[pos..pos + 4].copy_from_slice(&2u32.to_le_bytes());
        pos += 4;
        pos += 8; // two topic references
        pos += 8; // trailing fields
        block[0..2].copy_from_slice(&((BLOCK_LEN - pos) as u16).to_le_bytes());

        let tables = TopicTables {
            topics: &[],
            url_table: &[],
            url_strings: &[],
            strings: &[],
            encoding: encoding_for_lcid(0x0409),
        };
        let mut budget = MetadataStringBudget::new(1024);
        assert!(matches!(
            parse_binary_index(&btree, &tables, 2, 16, &mut budget),
            Err(CoreError::Limit(_))
        ));
        let mut budget = MetadataStringBudget::new(1024);
        assert_eq!(
            parse_binary_index(&btree, &tables, 3, 16, &mut budget)
                .unwrap()
                .len(),
            1
        );
    }

    #[test]
    fn binary_index_repeated_offsets_share_string_budget() {
        const HEADER_LEN: usize = 0x4c;
        const BLOCK_LEN: usize = 256;
        let mut btree = vec![0u8; HEADER_LEN + BLOCK_LEN];
        btree[0..2].copy_from_slice(&[0x3b, 0x29]);
        btree[4..6].copy_from_slice(&(BLOCK_LEN as u16).to_le_bytes());
        let block = &mut btree[HEADER_LEN..];
        block[2..4].copy_from_slice(&2u16.to_le_bytes());
        let mut pos = 12usize;
        for name in ["one", "two"] {
            for unit in name.encode_utf16().chain(std::iter::once(0)) {
                block[pos..pos + 2].copy_from_slice(&unit.to_le_bytes());
                pos += 2;
            }
            pos += 8; // flags, depth, character index
            pos += 4; // reserved
            block[pos..pos + 4].copy_from_slice(&1u32.to_le_bytes());
            pos += 4;
            block[pos..pos + 4].copy_from_slice(&0u32.to_le_bytes());
            pos += 4;
            pos += 8; // trailing fields
        }
        block[0..2].copy_from_slice(&((BLOCK_LEN - pos) as u16).to_le_bytes());

        let mut topics = vec![0u8; 16];
        topics[4..8].copy_from_slice(&u32::MAX.to_le_bytes());
        let url_table = vec![0u8; 12];
        let mut url_strings = vec![0u8; 8];
        url_strings.extend_from_slice(b"/same/repeated/topic/path/that/is/long.html\0");
        let tables = TopicTables {
            topics: &topics,
            url_table: &url_table,
            url_strings: &url_strings,
            strings: &[],
            encoding: encoding_for_lcid(0x0409),
        };

        let mut budget = MetadataStringBudget::new(70);
        assert!(matches!(
            parse_binary_index(&btree, &tables, 10, 16, &mut budget),
            Err(CoreError::Limit(_))
        ));
        let mut budget = MetadataStringBudget::new(1024);
        let index = parse_binary_index(&btree, &tables, 10, 16, &mut budget).unwrap();
        assert_eq!(index.len(), 2);
        assert_eq!(index[0].locals, index[1].locals);
    }

    #[test]
    fn metadata_string_field_is_individually_bounded() {
        let value = vec![b'x'; MAX_METADATA_FIELD_BYTES + 1];
        assert!(matches!(
            decode_c_string_field(&value, encoding_for_lcid(0x0409)),
            Err(CoreError::Limit(_))
        ));
    }
}
