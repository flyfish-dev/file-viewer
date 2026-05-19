#[derive(Debug)]
struct PreviewPlan<'a> {
    filename: &'a str,
    renderer: &'a str,
    lazy: bool,
}

fn extension(filename: &str) -> &str {
    filename.rsplit_once('.').map(|(_, ext)| ext).unwrap_or("")
}

fn renderer_for(ext: &str) -> &'static str {
    match ext {
        "pdf" => "pdfjs-dist",
        "ofd" => "DLTech21/ofd.js",
        "dxf" => "@cadview/core",
        "rs" | "json" | "yaml" => "highlight.js",
        _ => "fallback",
    }
}

fn plan(filename: &str) -> PreviewPlan<'_> {
    let renderer = renderer_for(extension(filename));
    PreviewPlan {
        filename,
        renderer,
        lazy: renderer != "fallback",
    }
}

fn main() {
    let files = ["invoice.ofd", "drawing.dxf", "main.rs", "archive.bin"];
    for item in files.iter().map(|filename| plan(filename)) {
        println!("{:?}", item);
    }
}
