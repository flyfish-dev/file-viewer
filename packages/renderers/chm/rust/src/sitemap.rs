//! Bounded parser for legacy HTML Help sitemap documents (`.hhc` / `.hhk`).
//!
//! These files are HTML-shaped rather than standards-compliant HTML. A small tolerant
//! tokenizer is both smaller and safer in WASM than executing them in a DOM.

use encoding_rs::Encoding;
use serde::Serialize;

use crate::error::{CoreError, CoreResult};

const MAX_SITEMAP_FIELD_BYTES: usize = 64 * 1024;

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SitemapNode {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub local: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub merge: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub see_also: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_number: Option<i32>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<SitemapNode>,
}

#[derive(Default)]
struct PendingNode {
    name: String,
    local: Option<String>,
    merge: Option<String>,
    see_also: Option<String>,
    image_number: Option<i32>,
}

impl PendingNode {
    fn set(&mut self, name: &str, value: String) {
        if name.eq_ignore_ascii_case("name") && self.name.is_empty() {
            self.name = value;
        } else if name.eq_ignore_ascii_case("local") && self.local.is_none() {
            self.local = nonempty(value);
        } else if name.eq_ignore_ascii_case("merge") && self.merge.is_none() {
            self.merge = nonempty(value);
        } else if name.eq_ignore_ascii_case("see also") && self.see_also.is_none() {
            self.see_also = nonempty(value);
        } else if (name.eq_ignore_ascii_case("imagenumber")
            || name.eq_ignore_ascii_case("image number"))
            && self.image_number.is_none()
        {
            self.image_number = value.trim().parse().ok();
        }
    }

    fn finish(self) -> Option<SitemapNode> {
        if self.name.is_empty()
            && self.local.is_none()
            && self.merge.is_none()
            && self.see_also.is_none()
        {
            return None;
        }
        Some(SitemapNode {
            name: self.name,
            local: self.local,
            merge: self.merge,
            see_also: self.see_also,
            image_number: self.image_number,
            children: Vec::new(),
        })
    }
}

fn nonempty(value: String) -> Option<String> {
    let value = value.trim().to_owned();
    (!value.is_empty()).then_some(value)
}

#[derive(Clone, Copy, Default, PartialEq, Eq)]
enum TagKind {
    Ul,
    Object,
    Param,
    #[default]
    Other,
}

#[derive(Default)]
struct Tag {
    kind: TagKind,
    closing: bool,
    object_type: Option<String>,
    param_name: Option<String>,
    param_value: Option<String>,
}

/// Decode an HTML Help text stream and report the selected encoding label.
pub fn decode_document(data: &[u8], fallback: &'static Encoding) -> (String, String) {
    if data.starts_with(&[0xff, 0xfe]) {
        let units: Vec<u16> = data[2..]
            .chunks_exact(2)
            .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
            .collect();
        return (String::from_utf16_lossy(&units), "UTF-16LE".into());
    }
    if data.starts_with(&[0xfe, 0xff]) {
        let units: Vec<u16> = data[2..]
            .chunks_exact(2)
            .map(|pair| u16::from_be_bytes([pair[0], pair[1]]))
            .collect();
        return (String::from_utf16_lossy(&units), "UTF-16BE".into());
    }
    let label = sniff_charset(data);
    let encoding = label
        .as_deref()
        .and_then(|value| Encoding::for_label(value.as_bytes()))
        .unwrap_or(fallback);
    let offset = usize::from(data.starts_with(&[0xef, 0xbb, 0xbf])) * 3;
    let (decoded, _, _) = encoding.decode(&data[offset..]);
    (decoded.into_owned(), encoding.name().to_owned())
}

fn sniff_charset(data: &[u8]) -> Option<String> {
    let ascii: String = data
        .iter()
        .take(8192)
        .map(|byte| {
            if byte.is_ascii() {
                byte.to_ascii_lowercase() as char
            } else {
                ' '
            }
        })
        .collect();
    let start = ascii.find("charset")? + "charset".len();
    let bytes = ascii.as_bytes();
    let mut pos = start;
    while pos < bytes.len()
        && (bytes[pos].is_ascii_whitespace() || matches!(bytes[pos], b'=' | b'\'' | b'"'))
    {
        pos += 1;
    }
    let end = (pos..bytes.len())
        .find(|&index| !matches!(bytes[index], b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.'))
        .unwrap_or(bytes.len());
    (pos < end).then(|| ascii[pos..end].to_owned())
}

/// Parse a decoded sitemap into a bounded tree.
pub fn parse_sitemap(
    data: &[u8],
    fallback: &'static Encoding,
    max_nodes: usize,
    max_depth: usize,
) -> CoreResult<(Vec<SitemapNode>, String)> {
    let (text, encoding) = decode_document(data, fallback);
    let bytes = text.as_bytes();
    let mut levels: Vec<Vec<SitemapNode>> = vec![Vec::new()];
    let mut pending = PendingNode::default();
    let mut sitemap_object = false;
    let mut node_count = 0usize;
    let mut pos = 0usize;

    while pos < bytes.len() {
        let Some(relative) = bytes[pos..].iter().position(|&byte| byte == b'<') else {
            break;
        };
        pos += relative;
        if bytes[pos..].starts_with(b"<!--") {
            pos = bytes[pos + 4..]
                .windows(3)
                .position(|window| window == b"-->")
                .map_or(bytes.len(), |end| pos + 4 + end + 3);
            continue;
        }
        let Some(end) = find_tag_end(bytes, pos + 1) else {
            break;
        };
        let tag = parse_tag(&text[pos + 1..end])?;
        pos = end + 1;

        match (tag.closing, tag.kind) {
            (false, TagKind::Ul) => {
                if levels.len() >= max_depth {
                    return Err(CoreError::Limit(format!(
                        "sitemap nesting exceeds {max_depth}"
                    )));
                }
                levels.push(Vec::new());
            }
            (true, TagKind::Ul) => close_level(&mut levels),
            (false, TagKind::Object) => {
                sitemap_object = tag
                    .object_type
                    .as_deref()
                    .is_some_and(|value| value.eq_ignore_ascii_case("text/sitemap"));
                if sitemap_object {
                    pending = PendingNode::default();
                }
            }
            (false, TagKind::Param) if sitemap_object => {
                if let (Some(name), Some(value)) = (tag.param_name, tag.param_value) {
                    pending.set(&name, decode_entities(&value));
                }
            }
            (true, TagKind::Object) if sitemap_object => {
                if let Some(node) = std::mem::take(&mut pending).finish() {
                    node_count += 1;
                    if node_count > max_nodes {
                        return Err(CoreError::Limit(format!(
                            "sitemap contains more than {max_nodes} nodes"
                        )));
                    }
                    levels.last_mut().expect("root level exists").push(node);
                }
                sitemap_object = false;
            }
            _ => {}
        }
    }
    while levels.len() > 1 {
        close_level(&mut levels);
    }
    Ok((levels.pop().unwrap_or_default(), encoding))
}

fn close_level(levels: &mut Vec<Vec<SitemapNode>>) {
    if levels.len() <= 1 {
        return;
    }
    let children = levels.pop().unwrap_or_default();
    let parent_level = levels.last_mut().expect("root level exists");
    if let Some(parent) = parent_level.last_mut() {
        parent.children.extend(children);
    } else {
        parent_level.extend(children);
    }
}

fn find_tag_end(bytes: &[u8], mut pos: usize) -> Option<usize> {
    let mut quote = None;
    while pos < bytes.len() {
        match (quote, bytes[pos]) {
            (None, b'\'' | b'"') => quote = Some(bytes[pos]),
            (Some(expected), actual) if expected == actual => quote = None,
            (None, b'>') => return Some(pos),
            _ => {}
        }
        pos += 1;
    }
    None
}

fn parse_tag(source: &str) -> CoreResult<Tag> {
    let bytes = source.as_bytes();
    let mut tag = Tag::default();
    let mut pos = 0usize;
    while pos < bytes.len() && bytes[pos].is_ascii_whitespace() {
        pos += 1;
    }
    if bytes.get(pos) == Some(&b'/') {
        tag.closing = true;
        pos += 1;
    }
    let name_start = pos;
    while pos < bytes.len()
        && !bytes[pos].is_ascii_whitespace()
        && !matches!(bytes[pos], b'/' | b'>')
    {
        pos += 1;
    }
    let name = &source[name_start..pos];
    tag.kind = if name.eq_ignore_ascii_case("ul") {
        TagKind::Ul
    } else if name.eq_ignore_ascii_case("object") {
        TagKind::Object
    } else if name.eq_ignore_ascii_case("param") {
        TagKind::Param
    } else {
        TagKind::Other
    };

    while pos < bytes.len() {
        while pos < bytes.len() && (bytes[pos].is_ascii_whitespace() || bytes[pos] == b'/') {
            pos += 1;
        }
        let key_start = pos;
        while pos < bytes.len()
            && !bytes[pos].is_ascii_whitespace()
            && !matches!(bytes[pos], b'=' | b'/')
        {
            pos += 1;
        }
        if key_start == pos {
            break;
        }
        let key = &source[key_start..pos];
        while pos < bytes.len() && bytes[pos].is_ascii_whitespace() {
            pos += 1;
        }
        let mut value = "";
        if bytes.get(pos) == Some(&b'=') {
            pos += 1;
            while pos < bytes.len() && bytes[pos].is_ascii_whitespace() {
                pos += 1;
            }
            if matches!(bytes.get(pos), Some(b'\'' | b'"')) {
                let quote = bytes[pos];
                pos += 1;
                let start = pos;
                while pos < bytes.len() && bytes[pos] != quote {
                    pos += 1;
                }
                value = &source[start..pos];
                pos += usize::from(pos < bytes.len());
            } else {
                let start = pos;
                while pos < bytes.len() && !bytes[pos].is_ascii_whitespace() && bytes[pos] != b'/' {
                    pos += 1;
                }
                value = &source[start..pos];
            }
        }
        let destination = match tag.kind {
            TagKind::Object if key.eq_ignore_ascii_case("type") => &mut tag.object_type,
            TagKind::Param if key.eq_ignore_ascii_case("name") => &mut tag.param_name,
            TagKind::Param if key.eq_ignore_ascii_case("value") => &mut tag.param_value,
            _ => continue,
        };
        if destination.is_none() {
            if value.len() > MAX_SITEMAP_FIELD_BYTES {
                return Err(CoreError::Limit(format!(
                    "sitemap field exceeds {MAX_SITEMAP_FIELD_BYTES} bytes"
                )));
            }
            *destination = Some(value.to_owned());
        }
    }
    Ok(tag)
}

fn decode_entities(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut rest = value;
    while let Some(amp) = rest.find('&') {
        output.push_str(&rest[..amp]);
        rest = &rest[amp..];
        let scan_end = rest.len().min(13);
        let Some(semi) = rest.as_bytes()[1..scan_end]
            .iter()
            .position(|&byte| byte == b';')
            .map(|index| index + 1)
        else {
            output.push('&');
            rest = &rest[1..];
            continue;
        };
        let entity = &rest[1..semi];
        let decoded = match entity {
            "amp" => Some('&'),
            "lt" => Some('<'),
            "gt" => Some('>'),
            "quot" => Some('"'),
            "apos" => Some('\''),
            "nbsp" => Some(' '),
            _ if entity.starts_with("#x") || entity.starts_with("#X") => {
                u32::from_str_radix(&entity[2..], 16)
                    .ok()
                    .and_then(char::from_u32)
            }
            _ if entity.starts_with('#') => entity[1..].parse().ok().and_then(char::from_u32),
            _ => None,
        };
        if let Some(character) = decoded {
            output.push(character);
        } else {
            output.push_str(&rest[..=semi]);
        }
        rest = &rest[semi + 1..];
    }
    output.push_str(rest);
    output
}

#[cfg(test)]
mod tests {
    use super::*;
    use encoding_rs::UTF_8;

    #[test]
    fn parses_nested_contents_without_running_html() {
        let source = br#"<UL><LI><OBJECT type='text/sitemap'><param name='Name' value='Intro &amp; Setup'><param name='Local' value='intro.htm'></OBJECT><UL><LI><OBJECT type='text/sitemap'><param name='Name' value='Child'><param name='Local' value='child.htm'></OBJECT></UL></UL>"#;
        let (nodes, encoding) = parse_sitemap(source, UTF_8, 20, 8).unwrap();
        assert_eq!(encoding, "UTF-8");
        assert_eq!(nodes[0].name, "Intro & Setup");
        assert_eq!(nodes[0].children[0].local.as_deref(), Some("child.htm"));
    }

    #[test]
    fn rejects_pathological_nesting() {
        let source = b"<ul><ul><ul><ul>";
        assert!(matches!(
            parse_sitemap(source, UTF_8, 10, 3),
            Err(CoreError::Limit(_))
        ));
    }

    #[test]
    fn ignores_many_irrelevant_attributes_without_collecting_them() {
        let mut source = String::from("<object type='text/sitemap' ");
        source.push_str(&"ignored ".repeat(50_000));
        source.push_str("><param name='Name' value='Bounded'></object>");
        let (nodes, _) = parse_sitemap(source.as_bytes(), UTF_8, 10, 4).unwrap();
        assert_eq!(nodes.len(), 1);
        assert_eq!(nodes[0].name, "Bounded");
    }

    #[test]
    fn rejects_oversized_relevant_attribute() {
        let source = format!(
            "<object type='text/sitemap'><param name='Name' value='{}'></object>",
            "x".repeat(MAX_SITEMAP_FIELD_BYTES + 1)
        );
        assert!(matches!(
            parse_sitemap(source.as_bytes(), UTF_8, 10, 4),
            Err(CoreError::Limit(_))
        ));
    }

    #[test]
    fn decodes_ampersand_bomb_with_bounded_entity_scan() {
        let source = "&".repeat(MAX_SITEMAP_FIELD_BYTES);
        let started = std::time::Instant::now();
        assert_eq!(decode_entities(&source), source);
        assert!(started.elapsed() < std::time::Duration::from_millis(500));
        assert_eq!(
            decode_entities("汉&not-an-entity 文&amp;字"),
            "汉&not-an-entity 文&字"
        );
    }
}
