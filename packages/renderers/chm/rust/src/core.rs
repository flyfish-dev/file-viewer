//! Bounded archive facade and renderer manifest construction.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::{
    chm::{ChmFile, Entry, EntryCategory, EntryKind},
    error::{CoreError, CoreResult},
    metadata::{
        FullTextMetadata, IndexNode, MetadataStringBudget, SystemInfo, TopicTables,
        encoding_for_lcid, language_for_lcid, parse_binary_index, parse_binary_toc,
        parse_full_text_metadata, parse_system,
    },
    sitemap::{SitemapNode, parse_sitemap},
};

const MIB: u64 = 1024 * 1024;
type TopicTableBytes = (Vec<u8>, Vec<u8>, Vec<u8>, Vec<u8>);

#[derive(Debug, Clone, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Limits {
    pub max_archive_bytes: u64,
    /// Backward-compatible WASM caller field. When both are supplied, the stricter
    /// value wins instead of silently relaxing a limit.
    pub max_file_bytes: Option<u64>,
    pub max_entries: usize,
    pub max_entry_bytes: u64,
    pub max_total_decompressed_bytes: u64,
    pub max_total_declared_bytes: Option<u64>,
    pub max_metadata_bytes: u64,
    pub max_sitemap_nodes: usize,
    pub max_sitemap_depth: usize,
    pub max_directory_path_bytes: usize,
}

impl Default for Limits {
    fn default() -> Self {
        Self {
            max_archive_bytes: 256 * MIB,
            max_file_bytes: None,
            max_entries: 100_000,
            max_entry_bytes: 96 * MIB,
            max_total_decompressed_bytes: 2 * 1024 * MIB,
            max_total_declared_bytes: None,
            max_metadata_bytes: 32 * MIB,
            max_sitemap_nodes: 50_000,
            max_sitemap_depth: 256,
            max_directory_path_bytes: 8 * MIB as usize,
        }
    }
}

impl Limits {
    fn validate(&self) -> CoreResult<()> {
        if self.max_archive_bytes == 0
            || self.max_entries == 0
            || self.max_entry_bytes == 0
            || self.max_total_decompressed_bytes == 0
            || self.max_metadata_bytes == 0
            || self.max_sitemap_nodes == 0
            || self.max_sitemap_depth == 0
            || self.max_directory_path_bytes == 0
        {
            return Err(CoreError::Limit("all CHM limits must be non-zero".into()));
        }
        if self.effective_archive_bytes() > 1024 * MIB {
            return Err(CoreError::Limit(
                "maxArchiveBytes cannot exceed the 1 GiB WASM safety ceiling".into(),
            ));
        }
        if self.max_sitemap_depth > 1024 {
            return Err(CoreError::Limit(
                "maxSitemapDepth cannot exceed 1024".into(),
            ));
        }
        if self.max_entries > 250_000
            || self.max_sitemap_nodes > 250_000
            || self.max_directory_path_bytes > 16 * MIB as usize
            || self.max_metadata_bytes > 64 * MIB
            || self.max_entry_bytes > 512 * MIB
            || self.effective_total_bytes() > 8 * 1024 * MIB
        {
            return Err(CoreError::Limit(
                "configured CHM limits exceed the WASM hard safety ceilings".into(),
            ));
        }
        Ok(())
    }

    fn effective_archive_bytes(&self) -> u64 {
        self.max_file_bytes
            .map_or(self.max_archive_bytes, |legacy| {
                legacy.min(self.max_archive_bytes)
            })
    }

    fn effective_total_bytes(&self) -> u64 {
        self.max_total_declared_bytes
            .map_or(self.max_total_decompressed_bytes, |legacy| {
                legacy.min(self.max_total_decompressed_bytes)
            })
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveEntry {
    pub path: String,
    pub byte_length: u64,
    pub compressed: bool,
    pub kind: &'static str,
    pub category: &'static str,
    pub media_type: String,
}

impl ArchiveEntry {
    fn from_entry(entry: &Entry) -> Self {
        Self {
            path: entry.path.clone(),
            byte_length: entry.length,
            compressed: entry.is_compressed(),
            kind: match entry.kind {
                EntryKind::File => "file",
                EntryKind::Directory => "directory",
            },
            category: match entry.category {
                EntryCategory::Normal => "normal",
                EntryCategory::Special => "special",
                EntryCategory::Metadata => "metadata",
            },
            media_type: media_type(&entry.path).into(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Topic {
    pub path: String,
    pub title: String,
    pub byte_length: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub format_version: u32,
    pub title: String,
    pub home_path: String,
    pub encoding: String,
    pub language: String,
    pub lcid: u32,
    pub compressed: bool,
    pub topics: Vec<Topic>,
    pub contents: Vec<SitemapNode>,
    pub index: Vec<IndexNode>,
    pub has_binary_toc: bool,
    pub has_binary_index: bool,
    pub full_text_index: FullTextMetadata,
    pub merged_archives: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub warnings: Vec<String>,
}

pub struct ArchiveCore {
    chm: ChmFile,
    public_entries: Vec<ArchiveEntry>,
    limits: Limits,
    manifest: Option<Manifest>,
}

impl ArchiveCore {
    pub fn open(bytes: Vec<u8>, limits: Limits) -> CoreResult<Self> {
        limits.validate()?;
        let file_len = u64::try_from(bytes.len())
            .map_err(|_| CoreError::Limit("CHM size does not fit u64".into()))?;
        if file_len > limits.effective_archive_bytes() {
            return Err(CoreError::Limit(format!(
                "archive is {file_len} bytes; maxArchiveBytes is {}",
                limits.effective_archive_bytes()
            )));
        }
        let chm = ChmFile::from_bytes(
            bytes,
            limits.max_entries,
            limits.max_directory_path_bytes,
            limits.max_metadata_bytes,
            limits.effective_total_bytes(),
        )?;
        let entries = chm.entries();
        if entries.len() > limits.max_entries {
            return Err(CoreError::Limit(format!(
                "archive has {} entries; maxEntries is {}",
                entries.len(),
                limits.max_entries
            )));
        }
        let mut total = 0u64;
        for entry in entries
            .iter()
            .filter(|entry| matches!(entry.category, EntryCategory::Normal))
        {
            total = total
                .checked_add(entry.length)
                .ok_or_else(|| CoreError::Limit("declared entry sizes overflow u64".into()))?;
            if total > limits.effective_total_bytes() {
                return Err(CoreError::Limit(format!(
                    "declared content exceeds maxTotalDecompressedBytes ({})",
                    limits.effective_total_bytes()
                )));
            }
        }
        let public_entries = entries.iter().map(ArchiveEntry::from_entry).collect();
        Ok(Self {
            chm,
            public_entries,
            limits,
            manifest: None,
        })
    }

    #[must_use]
    pub fn entries(&self) -> &[ArchiveEntry] {
        &self.public_entries
    }

    pub fn read(&mut self, path: &str) -> CoreResult<Vec<u8>> {
        let path = normalize_member_path(path)?;
        let entry = self.chm.find(&path)?.clone();
        if entry.is_directory() {
            return Err(CoreError::UnsafePath(format!(
                "entry is a directory: {path}"
            )));
        }
        if entry.length > self.limits.max_entry_bytes {
            return Err(CoreError::Limit(format!(
                "entry {path} is {} bytes; maxEntryBytes is {}",
                entry.length, self.limits.max_entry_bytes
            )));
        }
        let output = self.chm.read(&entry)?;
        if output.len() as u64 > self.limits.max_entry_bytes {
            return Err(CoreError::Limit(format!(
                "decoded entry {path} exceeded maxEntryBytes"
            )));
        }
        Ok(output)
    }

    pub fn manifest(&mut self) -> CoreResult<&Manifest> {
        if self.manifest.is_none() {
            self.manifest = Some(self.build_manifest()?);
        }
        Ok(self.manifest.as_ref().expect("manifest was initialized"))
    }

    fn build_manifest(&mut self) -> CoreResult<Manifest> {
        let mut warnings = Vec::new();
        let system = match self.read_metadata_optional("/#SYSTEM") {
            Ok(Some(bytes)) => match parse_system(&bytes) {
                Ok(system) => system,
                Err(error) => {
                    warnings.push(format!("ignored malformed /#SYSTEM: {error}"));
                    SystemInfo::default()
                }
            },
            Ok(None) => SystemInfo::default(),
            Err(error) => {
                warnings.push(format!("could not read /#SYSTEM: {error}"));
                SystemInfo::default()
            }
        };
        let fallback_encoding = encoding_for_lcid(system.lcid);
        let mut selected_encoding = fallback_encoding.name().to_owned();

        let contents_path = self.select_metadata_path(system.contents_file.as_deref(), "hhc");
        let mut contents = Vec::new();
        if let Some(path) = contents_path.as_deref() {
            match self.read_metadata_optional(path) {
                Ok(Some(bytes)) => match parse_sitemap(
                    &bytes,
                    fallback_encoding,
                    self.limits.max_sitemap_nodes,
                    self.limits.max_sitemap_depth,
                ) {
                    Ok((mut nodes, encoding)) => {
                        selected_encoding = encoding;
                        normalize_sitemap_paths(&mut nodes);
                        contents = nodes;
                    }
                    Err(error) => warnings.push(format!(
                        "ignored malformed contents sitemap {path}: {error}"
                    )),
                },
                Ok(None) => {}
                Err(error) => {
                    warnings.push(format!("could not read contents sitemap {path}: {error}"))
                }
            }
        }

        let index_path = self.select_metadata_path(system.index_file.as_deref(), "hhk");
        let mut index = Vec::new();
        if let Some(path) = index_path.as_deref() {
            match self.read_metadata_optional(path) {
                Ok(Some(bytes)) => match parse_sitemap(
                    &bytes,
                    fallback_encoding,
                    self.limits.max_sitemap_nodes,
                    self.limits.max_sitemap_depth,
                ) {
                    Ok((mut nodes, encoding)) => {
                        if contents.is_empty() {
                            selected_encoding = encoding;
                        }
                        normalize_sitemap_paths(&mut nodes);
                        index = nodes.into_iter().map(index_from_sitemap).collect();
                    }
                    Err(error) => {
                        warnings.push(format!("ignored malformed keyword sitemap {path}: {error}"))
                    }
                },
                Ok(None) => {}
                Err(error) => {
                    warnings.push(format!("could not read keyword sitemap {path}: {error}"))
                }
            }
        }

        let has_binary_toc = self.has_entry("/#TOCIDX");
        let has_binary_index = self.has_entry("/$WWKeywordLinks/BTree");
        let mut binary_string_budget = MetadataStringBudget::new(self.limits.max_metadata_bytes);
        if (contents.is_empty() && has_binary_toc) || (index.is_empty() && has_binary_index) {
            match self.load_topic_tables() {
                Ok(Some((topics, url_table, url_strings, strings))) => {
                    let tables = TopicTables {
                        topics: &topics,
                        url_table: &url_table,
                        url_strings: &url_strings,
                        strings: &strings,
                        encoding: fallback_encoding,
                    };
                    if contents.is_empty() && has_binary_toc {
                        match self.read_metadata_optional("/#TOCIDX") {
                            Ok(Some(bytes)) => match parse_binary_toc(
                                &bytes,
                                &tables,
                                self.limits.max_sitemap_nodes,
                                self.limits.max_sitemap_depth,
                                &mut binary_string_budget,
                            ) {
                                Ok(mut nodes) => {
                                    normalize_sitemap_paths(&mut nodes);
                                    contents = nodes;
                                }
                                Err(error) => {
                                    warnings.push(format!("ignored malformed binary TOC: {error}"))
                                }
                            },
                            Ok(None) => {}
                            Err(error) => {
                                warnings.push(format!("could not read binary TOC: {error}"))
                            }
                        }
                    }
                    if index.is_empty() && has_binary_index {
                        match self.read_metadata_optional("/$WWKeywordLinks/BTree") {
                            Ok(Some(bytes)) => match parse_binary_index(
                                &bytes,
                                &tables,
                                self.limits.max_sitemap_nodes,
                                self.limits.max_sitemap_depth,
                                &mut binary_string_budget,
                            ) {
                                Ok(mut nodes) => {
                                    normalize_index_paths(&mut nodes);
                                    index = nodes;
                                }
                                Err(error) => warnings.push(format!(
                                    "ignored malformed binary keyword index: {error}"
                                )),
                            },
                            Ok(None) => {}
                            Err(error) => warnings
                                .push(format!("could not read binary keyword index: {error}")),
                        }
                    }
                }
                Ok(None) => warnings
                    .push("binary navigation streams exist without complete topic tables".into()),
                Err(error) => {
                    warnings.push(format!("could not load binary navigation tables: {error}"))
                }
            }
        }

        let mut title_by_path = HashMap::new();
        collect_titles(&contents, &mut title_by_path);
        let mut topics: Vec<Topic> = self
            .chm
            .entries()
            .iter()
            .filter(|entry| {
                matches!(entry.category, EntryCategory::Normal)
                    && entry.is_file()
                    && is_html_path(&entry.path)
            })
            .map(|entry| Topic {
                path: entry.path.clone(),
                title: title_by_path
                    .get(&entry.path.to_ascii_lowercase())
                    .cloned()
                    .unwrap_or_else(|| filename_title(&entry.path)),
                byte_length: entry.length,
            })
            .collect();
        topics.sort_by(|left, right| {
            left.path
                .to_ascii_lowercase()
                .cmp(&right.path.to_ascii_lowercase())
        });

        if contents.is_empty() {
            contents = topics
                .iter()
                .map(|topic| SitemapNode {
                    name: topic.title.clone(),
                    local: Some(topic.path.clone()),
                    ..SitemapNode::default()
                })
                .collect();
        }
        let home_path = system
            .default_topic
            .as_deref()
            .and_then(|path| normalize_member_path(path).ok())
            .filter(|path| self.has_entry(path))
            .or_else(|| first_local(&contents))
            .filter(|path| self.has_entry(path))
            .or_else(|| topics.first().map(|topic| topic.path.clone()))
            .unwrap_or_default();

        let full_text_entry = self.find_entry("/$FIftiMain").cloned();
        let full_text_index = if let Some(entry) = full_text_entry {
            let prefix = if entry.length <= self.limits.max_metadata_bytes {
                self.chm.read(&entry).unwrap_or_default()
            } else {
                Vec::new()
            };
            parse_full_text_metadata(&prefix, entry.length)
        } else {
            FullTextMetadata {
                available: false,
                byte_length: 0,
                indexed_topic_count: None,
                total_word_count: None,
                unique_word_count: None,
                code_page: None,
                lcid: None,
            }
        };

        let mut merged_archives: Vec<String> = self
            .chm
            .entries()
            .iter()
            .filter(|entry| {
                matches!(entry.category, EntryCategory::Normal) && extension(&entry.path) == "chm"
            })
            .map(|entry| entry.path.clone())
            .collect();
        merged_archives.sort();
        merged_archives.dedup();

        Ok(Manifest {
            format_version: system.version,
            title: system.title.unwrap_or_else(|| "Compiled HTML Help".into()),
            home_path,
            encoding: selected_encoding,
            language: language_for_lcid(system.lcid),
            lcid: system.lcid,
            compressed: self.chm.has_compression(),
            topics,
            contents,
            index,
            has_binary_toc: has_binary_toc || system.binary_toc,
            has_binary_index,
            full_text_index,
            merged_archives,
            warnings,
        })
    }

    fn read_metadata_optional(&mut self, path: &str) -> CoreResult<Option<Vec<u8>>> {
        let Some(entry) = self.find_entry(path).cloned() else {
            return Ok(None);
        };
        if entry.length > self.limits.max_metadata_bytes {
            return Err(CoreError::Limit(format!(
                "metadata entry {path} is {} bytes; maxMetadataBytes is {}",
                entry.length, self.limits.max_metadata_bytes
            )));
        }
        Ok(Some(self.chm.read(&entry)?))
    }

    fn load_topic_tables(&mut self) -> CoreResult<Option<TopicTableBytes>> {
        let Some(topics_entry) = self.find_entry("/#TOPICS").cloned() else {
            return Ok(None);
        };
        let Some(url_table_entry) = self.find_entry("/#URLTBL").cloned() else {
            return Ok(None);
        };
        let Some(url_strings_entry) = self.find_entry("/#URLSTR").cloned() else {
            return Ok(None);
        };
        let Some(strings_entry) = self.find_entry("/#STRINGS").cloned() else {
            return Ok(None);
        };
        let total = [
            &topics_entry,
            &url_table_entry,
            &url_strings_entry,
            &strings_entry,
        ]
        .into_iter()
        .try_fold(0u64, |total, entry| total.checked_add(entry.length))
        .ok_or_else(|| CoreError::Limit("binary navigation table sizes overflow u64".into()))?;
        if total > self.limits.max_metadata_bytes {
            return Err(CoreError::Limit(format!(
                "binary navigation tables total {total} bytes; maxMetadataBytes is {}",
                self.limits.max_metadata_bytes
            )));
        }
        let topics = self.chm.read(&topics_entry)?;
        let url_table = self.chm.read(&url_table_entry)?;
        let url_strings = self.chm.read(&url_strings_entry)?;
        let strings = self.chm.read(&strings_entry)?;
        Ok(Some((topics, url_table, url_strings, strings)))
    }

    fn select_metadata_path(&self, declared: Option<&str>, extension_name: &str) -> Option<String> {
        declared
            .and_then(|path| normalize_member_path(path).ok())
            .filter(|path| self.has_entry(path))
            .or_else(|| {
                self.chm
                    .entries()
                    .iter()
                    .find(|entry| {
                        matches!(entry.category, EntryCategory::Normal)
                            && extension(&entry.path) == extension_name
                    })
                    .map(|entry| entry.path.clone())
            })
    }

    fn find_entry(&self, path: &str) -> Option<&Entry> {
        self.chm.find(path).ok()
    }

    fn has_entry(&self, path: &str) -> bool {
        self.find_entry(path).is_some()
    }
}

fn normalize_sitemap_paths(nodes: &mut [SitemapNode]) {
    for node in nodes {
        if let Some(local) = node.local.take() {
            node.local = normalize_member_path(&local).ok();
        }
        normalize_sitemap_paths(&mut node.children);
    }
}

fn normalize_index_paths(nodes: &mut [IndexNode]) {
    for node in nodes {
        node.locals = node
            .locals
            .drain(..)
            .filter_map(|local| normalize_member_path(&local).ok())
            .collect();
        normalize_index_paths(&mut node.children);
    }
}

fn index_from_sitemap(node: SitemapNode) -> IndexNode {
    IndexNode {
        name: node.name,
        locals: node.local.into_iter().collect(),
        see_also: node.see_also,
        children: node.children.into_iter().map(index_from_sitemap).collect(),
    }
}

fn collect_titles(nodes: &[SitemapNode], output: &mut HashMap<String, String>) {
    for node in nodes {
        if let Some(local) = &node.local {
            output
                .entry(local.to_ascii_lowercase())
                .or_insert_with(|| node.name.clone());
        }
        collect_titles(&node.children, output);
    }
}

fn first_local(nodes: &[SitemapNode]) -> Option<String> {
    for node in nodes {
        if let Some(local) = &node.local {
            return Some(local.clone());
        }
        if let Some(local) = first_local(&node.children) {
            return Some(local);
        }
    }
    None
}

fn normalize_member_path(input: &str) -> CoreResult<String> {
    if input.is_empty()
        || input
            .bytes()
            .any(|byte| byte == 0 || (byte < 0x20 && !byte.is_ascii_whitespace()))
    {
        return Err(CoreError::UnsafePath(
            "empty or control-containing member path".into(),
        ));
    }
    let mut path = input.trim().replace('\\', "/");
    if let Some(marker) = path.find("::/") {
        path = path[marker + 2..].to_owned();
    }
    if path.starts_with("::DataSpace/") {
        if path.split('/').any(|segment| segment == "..") {
            return Err(CoreError::UnsafePath(
                "metadata path traversal is not allowed".into(),
            ));
        }
        return Ok(path);
    }
    if let Some(end) = path.find(['#', '?']) {
        path.truncate(end);
    }
    let mut normalized = String::new();
    for segment in path.split('/') {
        match segment {
            "" | "." => {}
            ".." => {
                return Err(CoreError::UnsafePath(
                    "path traversal is not allowed".into(),
                ));
            }
            _ if segment.contains(':') => {
                return Err(CoreError::UnsafePath(
                    "URL schemes and drive paths are not allowed".into(),
                ));
            }
            _ => {
                normalized.push('/');
                normalized.push_str(segment);
            }
        }
    }
    if normalized.is_empty() {
        return Err(CoreError::UnsafePath(
            "member path resolves to the archive root".into(),
        ));
    }
    Ok(normalized)
}

fn filename_title(path: &str) -> String {
    path.rsplit('/')
        .next()
        .unwrap_or(path)
        .rsplit_once('.')
        .map_or_else(|| path.into(), |(stem, _)| stem.into())
}

fn is_html_path(path: &str) -> bool {
    matches!(extension(path).as_str(), "htm" | "html" | "xhtml" | "shtml")
}

fn extension(path: &str) -> String {
    path.rsplit('.')
        .next()
        .filter(|part| !part.contains('/'))
        .unwrap_or_default()
        .to_ascii_lowercase()
}

fn media_type(path: &str) -> &'static str {
    match extension(path).as_str() {
        "htm" | "html" | "shtml" => "text/html",
        "xhtml" => "application/xhtml+xml",
        "css" => "text/css",
        "js" => "text/javascript",
        "txt" | "hhc" | "hhk" => "text/plain",
        "xml" => "application/xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_html_help_urls_but_rejects_escape() {
        assert_eq!(
            normalize_member_path("mk:@MSITStore:help.chm::/docs/a.htm#x").unwrap(),
            "/docs/a.htm"
        );
        assert_eq!(normalize_member_path("docs\\a.htm").unwrap(), "/docs/a.htm");
        assert!(matches!(
            normalize_member_path("../secret"),
            Err(CoreError::UnsafePath(_))
        ));
        assert!(matches!(
            normalize_member_path("https://example.test/a"),
            Err(CoreError::UnsafePath(_))
        ));
    }

    #[test]
    fn limits_cannot_disable_safety_guards() {
        let limits = Limits {
            max_entries: 0,
            ..Limits::default()
        };
        assert!(matches!(limits.validate(), Err(CoreError::Limit(_))));
    }
}
