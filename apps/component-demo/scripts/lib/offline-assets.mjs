import { resolve, join } from 'node:path'
import { sanitizeOfflineViewerAssetTree } from '../../../../packages/components/web-full/scripts/offline-asset-sanitize.mjs'
import { verifyComponentHelperLegalMaterials } from './helper-legal-materials.mjs'

const repositoryRoot = resolve(import.meta.dirname, '../../../..')

export function createComponentDemoOfflineAssetSanitizerPlugin(outputDir, options = {}) {
  return {
    name: 'file-viewer-component-demo-offline-asset-sanitizer',
    apply: 'build',
    enforce: 'post',
    async closeBundle() {
      // Bind retained documents to both actual copied helper owners and their
      // complete runtime trees before preserving any original legal bytes.
      const owners = await verifyComponentHelperLegalMaterials({
        sourceRoot: options.sourceRoot || repositoryRoot,
        outputRoot: join(outputDir, 'file-viewer')
      })
      const retainedLegalFiles = owners.flatMap(owner => owner.legal.map(material => ({
        path: `file-viewer/${material.path}`,
        bytes: material.bytes,
        sha256: material.sha256
      })))
      const result = await sanitizeOfflineViewerAssetTree(outputDir, { retainedLegalFiles })
      if (options.log === false) return
      console.log(
        `[${options.label || 'component-demo-offline-assets'}] Sanitized ${result.checkedFiles} shipped text assets; ` +
        `localized ${result.replacementCount} public runtime fallback markers in ` +
        `${result.touchedFiles.length} files`
      )
    }
  }
}
