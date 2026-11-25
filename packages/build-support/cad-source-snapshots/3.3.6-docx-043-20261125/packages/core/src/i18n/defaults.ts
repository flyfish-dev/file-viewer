import { FILE_VIEWER_BUILTIN_MESSAGES } from './builtin-messages'
import { FILE_VIEWER_DEFAULT_PLURAL_MESSAGES } from './builtin-plurals'
import { installFileViewerBuiltinLocales } from './locale-registry'

// Default entrypoints keep all seven dictionaries synchronously available.
installFileViewerBuiltinLocales(FILE_VIEWER_BUILTIN_MESSAGES, FILE_VIEWER_DEFAULT_PLURAL_MESSAGES)
