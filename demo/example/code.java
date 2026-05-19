import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

public final class PreviewFile {
    private static final Map<String, String> RENDERERS = Map.of(
        "pdf", "pdfjs-dist",
        "ofd", "DLTech21/ofd.js",
        "dxf", "@cadview/core",
        "json", "highlight.js"
    );

    private final String name;
    private final long size;

    public PreviewFile(String name, long size) {
        this.name = name;
        this.size = size;
    }

    public String extension() {
        int index = name.lastIndexOf('.');
        return index >= 0 ? name.substring(index + 1).toLowerCase(Locale.ROOT) : "";
    }

    public Optional<String> renderer() {
        return Optional.ofNullable(RENDERERS.get(extension()));
    }

    public boolean requiresAsyncChunk() {
        return renderer().isPresent() || size > 1024 * 1024;
    }

    public static void main(String[] args) {
        List<PreviewFile> files = List.of(
            new PreviewFile("contract.pdf", 827_000),
            new PreviewFile("invoice.ofd", 4_278_691),
            new PreviewFile("snippet.java", 2_400)
        );

        files.forEach(file -> System.out.printf(
            "%s -> %s async=%s%n",
            file.name,
            file.renderer().orElse("fallback"),
            file.requiresAsyncChunk()
        ));
    }
}
