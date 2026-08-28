const path = require('path')

const resolveApp = value => path.resolve(__dirname, value)
const resolvePackageRoot = packageName => path.dirname(require.resolve(`${packageName}/package.json`))
const resolvePackageFile = (packageName, relativePath) => path.join(resolvePackageRoot(packageName), relativePath)

const fileViewerModernDependencyRoots = [
  '@file-viewer',
  '@flyfish-dev',
  '@tonejs',
  'dwf-viewer',
  'pdfjs-dist',
  'e-virt-table',
  'styled-exceljs',
  'three',
  'hls.js',
  'heic2any',
  'occt-import-js'
].map(packageName => resolveApp(`node_modules/${packageName}`))

module.exports = {
  publicPath: process.env.VUE_APP_PUBLIC_PATH || './',
  productionSourceMap: false,
  devServer: {
    hot: false,
    hotOnly: false
  },
  transpileDependencies: [
    /@file-viewer/,
    /@flyfish-dev/,
    /@tonejs/,
    /dwf-viewer/,
    /pdfjs-dist/,
    /e-virt-table/,
    /styled-exceljs/,
    /three/,
    /hls\.js/,
    /heic2any/,
    /occt-import-js/
  ],
  configureWebpack: {
    performance: {
      hints: false
    },
    resolve: {
      alias: {
        // Keep the legacy compatibility demo on Vue's runtime-only build. File
        // Viewer never compiles user-controlled Vue template strings.
        'vue$': 'vue/dist/vue.runtime.esm.js',
        '@file-viewer/core/assets$': resolvePackageFile('@file-viewer/core', 'dist/assets.js'),
        '@file-viewer/core/browser$': resolvePackageFile('@file-viewer/core', 'dist/browser.js'),
        '@file-viewer/core/headless$': resolvePackageFile('@file-viewer/core', 'dist/headless.js'),
        '@file-viewer/docx$': resolvePackageFile('@file-viewer/docx', 'dist/docx-preview.mjs')
      },
      extensions: ['.mjs', '.js', '.vue', '.json']
    }
  },
  chainWebpack(config) {
    config.plugins.delete('hmr')

    config.plugin('replace-three-addons').use(
      require('webpack/lib/NormalModuleReplacementPlugin'),
      [/three\/addons\//, resource => {
        resource.request = resource.request.replace(/three\/addons\//, 'three/examples/jsm/')
      }]
    )

    config.plugin('ignore-fs-promises').use(
      require('webpack/lib/IgnorePlugin'),
      [/^fs\/promises$/]
    )

    config.module
      .rule('node-modules-mjs')
      .test(/\.mjs$/)
      .include
      .add(resolveApp('node_modules'))
      .end()
      .type('javascript/auto')

    const modernDepsRule = config.module
      .rule('file-viewer-modern-deps')
      .test(/\.(mjs|js)$/)

    fileViewerModernDependencyRoots.forEach(depRoot => {
      modernDepsRule.include.add(depRoot)
    })

    modernDepsRule
      .use('babel-loader')
      .loader('babel-loader')
      .options({
        babelrc: false,
        configFile: false,
        compact: false,
        presets: [
          ['@babel/preset-env', {
            modules: false,
            targets: {
              browsers: ['Chrome >= 80', 'Firefox >= 78', 'Safari >= 13', 'Edge >= 80']
            }
          }]
        ],
        plugins: [
          '@babel/plugin-proposal-optional-chaining',
          '@babel/plugin-proposal-nullish-coalescing-operator',
          '@babel/plugin-proposal-class-properties',
          resolveApp('build/babel-transform-import-meta-url.cjs')
        ]
      })
  }
}
