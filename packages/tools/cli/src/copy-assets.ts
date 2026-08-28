#!/usr/bin/env node
process.argv.splice(2, 0, 'copy-assets')
await import('./cli.js')
