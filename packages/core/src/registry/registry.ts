import { DEFAULT_RENDERER_DEFINITIONS } from './formats';
import { normalizeFileExtension } from '../source';
import type {
  FileViewerRendererHandlerRegistration,
  FileViewerRendererPluginInput,
  FileViewerRendererPlugin,
  FileViewerRendererPresetInput,
  FileViewerRendererPresetName,
  FileViewerRendererPreset,
  RendererDefinition,
  RendererRegistry,
} from '../contracts/types';

const autoRendererBucketKey = '__flyfish_file_viewer_auto_renderer_presets__';

export interface RegisterFileViewerAutoRendererPresetOptions {
  /**
   * Stable key used to replace an existing auto preset registration.
   */
  id?: string;
  /**
   * Package name is useful for diagnostics and gives generated integrations a
   * deterministic id even when the preset input is an array.
   */
  packageName?: string;
}

export interface FileViewerAutoRendererPresetEntry<Handler = unknown> {
  id: string;
  packageName?: string;
  input: FileViewerRendererPluginInput<Handler>;
}

interface FileViewerAutoRendererBucket {
  version: number;
  presets: Map<string, FileViewerAutoRendererPresetEntry>;
}

const getAutoRendererBucket = (): FileViewerAutoRendererBucket => {
  const host = globalThis as typeof globalThis & {
    [autoRendererBucketKey]?: FileViewerAutoRendererBucket;
  };
  if (!host[autoRendererBucketKey]) {
    host[autoRendererBucketKey] = {
      version: 0,
      presets: new Map(),
    };
  }
  return host[autoRendererBucketKey];
};

const normalizeDefinition = (definition: RendererDefinition): RendererDefinition => ({
  ...definition,
  extensions: definition.extensions.map(normalizeFileExtension),
  enhancesExtensions: definition.enhancesExtensions?.map(normalizeFileExtension),
});

export const createRendererRegistry = (
  initialDefinitions: readonly RendererDefinition[] = DEFAULT_RENDERER_DEFINITIONS
): RendererRegistry => {
  const byId = new Map<string, RendererDefinition>();
  const byExtension = new Map<string, RendererDefinition>();

  const register = (definition: RendererDefinition) => {
    const normalized = normalizeDefinition(definition);
    const existing = byId.get(normalized.id);
    if (existing) {
      existing.extensions.forEach(extension => {
        if (byExtension.get(extension)?.id === existing.id) {
          byExtension.delete(extension);
        }
      });
    }

    byId.set(normalized.id, normalized);
    normalized.extensions.forEach(extension => {
      const owner = byExtension.get(extension);
      if (owner && owner.id !== normalized.id) {
        throw new Error(`File extension "${extension}" is already registered by renderer "${owner.id}".`);
      }
      byExtension.set(extension, normalized);
    });
  };

  initialDefinitions.forEach(register);

  return {
    register,
    unregister(id: string) {
      const existing = byId.get(id);
      if (!existing) {
        return false;
      }
      existing.extensions.forEach(extension => {
        if (byExtension.get(extension)?.id === id) {
          byExtension.delete(extension);
        }
      });
      byId.delete(id);
      return true;
    },
    getById(id: string) {
      return byId.get(id);
    },
    getByExtension(extension: string) {
      return byExtension.get(normalizeFileExtension(extension));
    },
    hasExtension(extension: string) {
      return byExtension.has(normalizeFileExtension(extension));
    },
    list() {
      return Array.from(byId.values());
    },
    listExtensions() {
      return Array.from(byExtension.keys()).sort();
    },
  };
};

export interface InstallFileViewerRendererPluginsOptions<Handler = unknown> {
  registry: RendererRegistry;
  plugins: Iterable<FileViewerRendererPlugin<Handler>>;
  registerHandler?: (registration: FileViewerRendererHandlerRegistration<Handler>) => void;
}

interface RendererEnhancementClaim {
  enhancerId: string;
  ownerId: string;
  extension: string;
}

interface RendererDefinitionInstallPlan {
  definitions: RendererDefinition[];
}

const collectRendererEnhancementClaims = (
  registry: RendererRegistry,
  definitions: readonly RendererDefinition[]
) => {
  const normalizedDefinitions = definitions.map(normalizeDefinition);
  const incomingDefinitionsById = new Map<string, RendererDefinition>();
  normalizedDefinitions.forEach(definition => {
    incomingDefinitionsById.set(definition.id, definition);
  });

  const claimsByOwnerAndExtension = new Map<string, RendererEnhancementClaim>();
  for (const definition of registry.list().map(normalizeDefinition)) {
    const ownerId = definition.enhancesRendererId;
    if (!ownerId || !definition.enhancesExtensions?.length) {
      continue;
    }
    const ownedExtensions = new Set(definition.extensions);
    definition.enhancesExtensions.forEach(extension => {
      if (
        ownedExtensions.has(extension) &&
        registry.getByExtension(extension)?.id === definition.id
      ) {
        claimsByOwnerAndExtension.set(`${ownerId}\u0000${extension}`, {
          enhancerId: definition.id,
          ownerId,
          extension,
        });
      }
    });
  }

  for (const definition of normalizedDefinitions) {
    const declaresOwner = definition.enhancesRendererId !== undefined;
    const declaresExtensions = definition.enhancesExtensions !== undefined;
    if (declaresOwner !== declaresExtensions) {
      throw new Error(
        `Renderer "${definition.id}" enhancement must declare both enhancesRendererId and enhancesExtensions.`
      );
    }
    if (!declaresOwner || !declaresExtensions) {
      continue;
    }

    const ownerId = definition.enhancesRendererId?.trim() || '';
    const enhancedExtensions = definition.enhancesExtensions || [];
    if (!ownerId) {
      throw new Error(`Renderer "${definition.id}" enhancement owner must not be empty.`);
    }
    if (!enhancedExtensions.length) {
      throw new Error(`Renderer "${definition.id}" enhancement extensions must not be empty.`);
    }
    if (ownerId === definition.id) {
      throw new Error(`Renderer "${definition.id}" cannot enhance its own definition.`);
    }

    const directlyOwnedExtensions = new Set(definition.extensions);
    for (const extension of enhancedExtensions) {
      if (!extension) {
        throw new Error(`Renderer "${definition.id}" enhancement extension must not be empty.`);
      }
      if (directlyOwnedExtensions.has(extension)) {
        throw new Error(
          `Renderer "${definition.id}" must not own and enhance extension "${extension}" simultaneously.`
        );
      }

      const key = `${ownerId}\u0000${extension}`;
      const existing = claimsByOwnerAndExtension.get(key);
      if (existing && existing.enhancerId !== definition.id) {
        throw new Error(
          `Renderer enhancement collision: extension "${extension}" from "${ownerId}" is claimed by both "${existing.enhancerId}" and "${definition.id}".`
        );
      }
      claimsByOwnerAndExtension.set(key, {
        enhancerId: definition.id,
        ownerId,
        extension,
      });
    }
  }

  for (const claim of claimsByOwnerAndExtension.values()) {
    const owner = incomingDefinitionsById.get(claim.ownerId) || registry.getById(claim.ownerId);
    if (!owner) {
      throw new Error(
        `Renderer "${claim.enhancerId}" enhances unknown renderer "${claim.ownerId}".`
      );
    }

    const ownerExtensions = new Set(owner.extensions.map(normalizeFileExtension));
    const installedExtensionOwner = registry.getByExtension(claim.extension);
    const alreadyInstalled = installedExtensionOwner?.id === claim.enhancerId;
    if (!ownerExtensions.has(claim.extension) && !alreadyInstalled) {
      throw new Error(
        `Renderer "${claim.enhancerId}" cannot enhance extension "${claim.extension}" because renderer "${claim.ownerId}" does not own it.`
      );
    }
  }

  return {
    claims: Array.from(claimsByOwnerAndExtension.values()),
    normalizedDefinitions,
  };
};

const createRendererDefinitionInstallPlan = (
  registry: RendererRegistry,
  definitions: readonly RendererDefinition[]
): RendererDefinitionInstallPlan => {
  const { claims, normalizedDefinitions } = collectRendererEnhancementClaims(registry, definitions);
  const claimedExtensionsByOwnerId = new Map<string, Set<string>>();
  claims.forEach(claim => {
    const extensions = claimedExtensionsByOwnerId.get(claim.ownerId) || new Set<string>();
    extensions.add(claim.extension);
    claimedExtensionsByOwnerId.set(claim.ownerId, extensions);
  });

  const applyClaims = (definition: RendererDefinition) => {
    const normalized = normalizeDefinition(definition);
    const extensions = new Set(normalized.extensions);
    normalized.enhancesExtensions?.forEach(extension => extensions.add(extension));
    claimedExtensionsByOwnerId.get(normalized.id)?.forEach(extension => extensions.delete(extension));
    return {
      ...normalized,
      extensions: Array.from(extensions),
    } satisfies RendererDefinition;
  };

  const incomingDefinitionIds = new Set(normalizedDefinitions.map(definition => definition.id));
  const existingOwnerDefinitions = Array.from(claimedExtensionsByOwnerId.keys())
    .filter(ownerId => !incomingDefinitionIds.has(ownerId))
    .map(ownerId => registry.getById(ownerId))
    .filter((definition): definition is RendererDefinition => !!definition)
    .map(applyClaims);
  const regularDefinitions = normalizedDefinitions
    .filter(definition => definition.enhancesRendererId === undefined)
    .map(applyClaims);
  const enhancerDefinitions = normalizedDefinitions
    .filter(definition => definition.enhancesRendererId !== undefined)
    .map(applyClaims);
  const plannedDefinitions = [
    ...existingOwnerDefinitions,
    ...regularDefinitions,
    ...enhancerDefinitions,
  ];

  // Validate the complete ownership transition before mutating the caller's registry.
  const validationRegistry = createRendererRegistry(registry.list());
  plannedDefinitions.forEach(definition => validationRegistry.register(definition));

  return { definitions: plannedDefinitions };
};

const createEnhancementAwareInstallRegistry = (registry: RendererRegistry): RendererRegistry => ({
  register(definition) {
    const plan = createRendererDefinitionInstallPlan(registry, [definition]);
    plan.definitions.forEach(plannedDefinition => registry.register(plannedDefinition));
  },
  unregister: id => registry.unregister(id),
  getById: id => registry.getById(id),
  getByExtension: extension => registry.getByExtension(extension),
  hasExtension: extension => registry.hasExtension(extension),
  list: () => registry.list(),
  listExtensions: () => registry.listExtensions(),
});

const isRendererPreset = <Handler>(
  input: FileViewerRendererPluginInput<Handler>
): input is FileViewerRendererPreset<Handler> => {
  return !!input && typeof input === 'object' && !Array.isArray(input) &&
    Array.isArray((input as { renderers?: unknown }).renderers);
};

export const collectFileViewerRendererPlugins = <Handler = unknown>(
  input?: FileViewerRendererPluginInput<Handler> | null
): FileViewerRendererPlugin<Handler>[] => {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input.flatMap(item => collectFileViewerRendererPlugins(item));
  }

  if (isRendererPreset(input)) {
    return collectFileViewerRendererPlugins(input.renderers);
  }

  return [input as FileViewerRendererPlugin<Handler>];
};

const resolveAutoRendererPresetId = <Handler>(
  input: FileViewerRendererPluginInput<Handler>,
  options: RegisterFileViewerAutoRendererPresetOptions = {}
) => {
  if (options.id) {
    return options.id;
  }
  if (options.packageName) {
    return options.packageName;
  }
  if (isRendererPreset(input)) {
    return input.id;
  }
  if (!Array.isArray(input) && input && typeof input === 'object' && 'id' in input) {
    return String((input as FileViewerRendererPlugin<Handler>).id);
  }
  return 'file-viewer-auto-renderers';
};

export const registerFileViewerAutoRendererPreset = <Handler = unknown>(
  input: FileViewerRendererPluginInput<Handler>,
  options: RegisterFileViewerAutoRendererPresetOptions = {}
) => {
  const bucket = getAutoRendererBucket();
  const id = resolveAutoRendererPresetId(input, options);
  const existing = bucket.presets.get(id);
  if (existing?.input !== input || existing.packageName !== options.packageName) {
    bucket.presets.set(id, {
      id,
      packageName: options.packageName,
      input: input as FileViewerRendererPluginInput,
    });
    bucket.version += 1;
  }

  return () => {
    unregisterFileViewerAutoRendererPreset(id);
  };
};

export const unregisterFileViewerAutoRendererPreset = (id: string) => {
  const bucket = getAutoRendererBucket();
  const removed = bucket.presets.delete(id);
  if (removed) {
    bucket.version += 1;
  }
  return removed;
};

export const clearFileViewerAutoRendererPresets = () => {
  const bucket = getAutoRendererBucket();
  if (!bucket.presets.size) {
    return;
  }
  bucket.presets.clear();
  bucket.version += 1;
};

export const listFileViewerAutoRendererPresets = <Handler = unknown>() =>
  Array.from(getAutoRendererBucket().presets.values()).map(
    entry => entry.input as FileViewerRendererPluginInput<Handler>
  );

export const listFileViewerAutoRendererPresetEntries = <Handler = unknown>() =>
  Array.from(getAutoRendererBucket().presets.values()).map(entry => ({
    ...entry,
    input: entry.input as FileViewerRendererPluginInput<Handler>,
  }));

export const findFileViewerAutoRendererPreset = <Handler = unknown>(
  id: FileViewerRendererPresetName | string
) => {
  const bucket = getAutoRendererBucket();
  const direct = bucket.presets.get(id);
  if (direct) {
    return direct.input as FileViewerRendererPluginInput<Handler>;
  }

  const packageSuffix = id.startsWith('@file-viewer/preset-')
    ? id
    : `@file-viewer/preset-${id}`;
  return Array.from(bucket.presets.values()).find(entry =>
    entry.packageName === packageSuffix ||
    entry.id === packageSuffix
  )?.input as FileViewerRendererPluginInput<Handler> | undefined;
};

export const getFileViewerAutoRendererPresetVersion = () => getAutoRendererBucket().version;

export const hasFileViewerRendererPresetName = (
  input?: FileViewerRendererPresetInput | null
): boolean => {
  if (!input) {
    return false;
  }
  if (typeof input === 'string') {
    return true;
  }
  if (Array.isArray(input)) {
    return input.some(item => hasFileViewerRendererPresetName(item));
  }
  return false;
};

/**
 * Normalizes `options.preset` / `options.presets` into renderer plugin inputs.
 *
 * Passing a preset object is the most portable integration style because it
 * works in any bundler. String selectors intentionally only resolve presets
 * that are already registered by a side-effect import or by build tooling.
 */
export const resolveFileViewerRendererPresetInputs = <Handler = unknown>(
  input?: FileViewerRendererPresetInput<Handler> | null
): FileViewerRendererPluginInput<Handler>[] => {
  if (!input) {
    return [];
  }
  if (typeof input === 'string') {
    const preset = findFileViewerAutoRendererPreset<Handler>(input);
    return preset ? [preset] : [];
  }
  if (Array.isArray(input)) {
    return input.flatMap(item => resolveFileViewerRendererPresetInputs<Handler>(item));
  }
  return [input as FileViewerRendererPluginInput<Handler>];
};

export const installFileViewerRendererPlugins = async <Handler = unknown>({
  registry,
  plugins,
  registerHandler,
}: InstallFileViewerRendererPluginsOptions<Handler>) => {
  const pluginList = Array.from(plugins);
  const definitions = pluginList.flatMap(plugin => [...(plugin.definitions || [])]);
  const plan = createRendererDefinitionInstallPlan(registry, definitions);
  plan.definitions.forEach(definition => registry.register(definition));
  const installRegistry = createEnhancementAwareInstallRegistry(registry);

  for (const plugin of pluginList) {
    plugin.handlers?.forEach(registration => {
      registerHandler?.(registration);
    });

    await plugin.install?.({ registry: installRegistry, registerHandler });
  }

  return registry;
};
