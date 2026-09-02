use file_viewer_chm_wasm::{ArchiveCore, Limits};

const FIXTURE: &[u8] = include_bytes!("fixtures/complete.chm");

#[test]
fn opens_manifest_and_reads_lzx_entries_from_a_complete_chm() {
    let mut archive = ArchiveCore::open(FIXTURE.to_vec(), Limits::default()).unwrap();
    assert!(archive.entries().len() >= 20);

    let manifest = archive.manifest().unwrap().clone();
    assert_eq!(manifest.title, "File Viewer CHM Fixture");
    assert_eq!(manifest.home_path, "/index.html");
    assert!(manifest.compressed);
    assert!(manifest.has_binary_toc);
    assert!(manifest.has_binary_index);
    assert!(manifest.full_text_index.available);
    assert_eq!(manifest.topics.len(), 2);
    assert_eq!(manifest.contents[0].name, "Welcome");
    assert_eq!(manifest.contents[0].children[0].name, "Setup");
    assert!(manifest.index.iter().any(|item| item.name == "offline"));

    let index = archive.read("/index.html").unwrap();
    assert!(
        index
            .windows(b"Offline CHM preview".len())
            .any(|part| part == b"Offline CHM preview")
    );
    let css = archive
        .read("mk:@MSITStore:complete.chm::/styles/site.css")
        .unwrap();
    assert!(css.starts_with(b"body { color: #123456; }"));
}

#[test]
fn falls_back_to_binary_toc_and_keyword_index() {
    let mut bytes = FIXTURE.to_vec();
    // The generated fixture intentionally retains both source sitemaps and compiled
    // navigation. Hide source sitemap paths without changing container geometry.
    bytes[546..556].copy_from_slice(b"sample.zzz");
    bytes[563..573].copy_from_slice(b"sample.zzy");
    bytes[4417..4427].copy_from_slice(b"absent.hhc");
    bytes[4432..4442].copy_from_slice(b"absent.hhk");
    let mut archive = ArchiveCore::open(bytes, Limits::default()).unwrap();
    let manifest = archive.manifest().unwrap();
    assert_eq!(manifest.contents[0].name, "Welcome");
    assert_eq!(manifest.contents[0].children[0].name, "Setup");
    assert!(manifest.index.iter().any(|item| item.name == "offline"));
    assert!(manifest.warnings.is_empty(), "{:?}", manifest.warnings);
}

#[test]
fn enforces_archive_and_entry_limits_before_allocation() {
    let limits = Limits {
        max_archive_bytes: 1024,
        ..Limits::default()
    };
    assert!(ArchiveCore::open(FIXTURE.to_vec(), limits).is_err());

    let limits = Limits {
        max_entries: 1,
        ..Limits::default()
    };
    let error = ArchiveCore::open(FIXTURE.to_vec(), limits).err().unwrap();
    assert_eq!(error.code(), "CHM_LIMIT_EXCEEDED");

    let limits = Limits {
        max_metadata_bytes: 4,
        ..Limits::default()
    };
    let error = ArchiveCore::open(FIXTURE.to_vec(), limits).err().unwrap();
    assert_eq!(error.code(), "CHM_LIMIT_EXCEEDED");

    let limits = Limits {
        max_total_decompressed_bytes: 1,
        ..Limits::default()
    };
    let error = ArchiveCore::open(FIXTURE.to_vec(), limits).err().unwrap();
    assert_eq!(error.code(), "CHM_LIMIT_EXCEEDED");

    let limits = Limits {
        max_entry_bytes: 16,
        ..Limits::default()
    };
    let mut archive = ArchiveCore::open(FIXTURE.to_vec(), limits).unwrap();
    assert!(archive.read("/index.html").is_err());
}

#[test]
fn rejects_truncated_variants_without_panicking() {
    for cut in [
        0,
        4,
        0x57,
        0x60,
        0x100,
        FIXTURE.len() / 2,
        FIXTURE.len() - 1,
    ] {
        let result = std::panic::catch_unwind(|| {
            ArchiveCore::open(FIXTURE[..cut].to_vec(), Limits::default())
        });
        assert!(result.is_ok(), "parser panicked at truncation {cut}");
        assert!(
            result.unwrap().is_err(),
            "truncated fixture unexpectedly opened at {cut}"
        );
    }
}
