export {
  DEFAULT_REGISTERED_EXTENSIONS,
  DEFAULT_RENDERER_DEFINITIONS,
  DEFAULT_STABLE_SUPPORTED_EXTENSIONS,
  DEFAULT_SUPPORTED_EXTENSIONS,
} from './formats.generated';

import { DEFAULT_RENDERER_DEFINITIONS } from './formats.generated';

const extensionsFor = (rendererId: string) => Object.freeze(
  [...(DEFAULT_RENDERER_DEFINITIONS.find(definition => definition.id === rendererId)?.extensions ?? [])]
);

export const ARCHIVE_EXTENSIONS = extensionsFor('archive');
export const MODEL_EXTENSIONS = extensionsFor('model');
export const TEXT_EXTENSIONS = extensionsFor('code');
export const IMAGE_EXTENSIONS = extensionsFor('image');
