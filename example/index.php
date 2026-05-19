<?php

declare(strict_types=1);

$renderers = [
    'pdf' => 'pdfjs-dist',
    'ofd' => 'DLTech21/ofd.js',
    'dxf' => '@cadview/core',
    'json' => 'highlight.js',
    'php' => 'highlight.js',
];

function extensionOf(string $filename): string
{
    return strtolower(pathinfo($filename, PATHINFO_EXTENSION));
}

function buildPreviewPlan(array $files, array $renderers): array
{
    return array_map(static function (string $filename) use ($renderers): array {
        $extension = extensionOf($filename);
        $renderer = $renderers[$extension] ?? 'fallback';

        return [
            'filename' => $filename,
            'extension' => $extension,
            'renderer' => $renderer,
            'async' => $renderer !== 'fallback',
        ];
    }, $files);
}

$plans = buildPreviewPlan([
    'invoice.ofd',
    'drawing.dxf',
    'controller.php',
], $renderers);

header('Content-Type: application/json; charset=utf-8');
echo json_encode($plans, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
