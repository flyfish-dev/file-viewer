using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

public static class Program
{
    private static readonly IReadOnlyDictionary<string, string> Renderers =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["pdf"] = "pdfjs-dist",
            ["ofd"] = "DLTech21/ofd.js",
            ["dxf"] = "@cadview/core",
            ["cs"] = "highlight.js",
            ["json"] = "highlight.js"
        };

    public static void Main()
    {
        var files = new[] { "contract.pdf", "invoice.ofd", "program.cs", "archive.bin" };
        var rows = files.Select(CreatePreviewPlan);

        foreach (var row in rows)
        {
            Console.WriteLine($"{row.File,-14} {row.Renderer,-18} async={row.Async}");
        }
    }

    private static PreviewPlan CreatePreviewPlan(string file)
    {
        var extension = Path.GetExtension(file).TrimStart('.');
        var renderer = Renderers.TryGetValue(extension, out var value) ? value : "fallback";
        return new PreviewPlan(file, renderer, renderer != "fallback");
    }
}

public sealed record PreviewPlan(string File, string Renderer, bool Async);
