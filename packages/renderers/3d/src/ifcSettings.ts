/** Bounded data-only bridge. This module does not import the optional BIM engines. */
export type IfcSettings = Readonly<Record<string, unknown>>;
const unsafe = (key: string) =>
  key.startsWith("_") || ["constructor", "prototype"].includes(key);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === "object" &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** Copy before allocating a Worker or transferring input. No accessors are executed. */
export function copyIfcSettings(
  value: unknown,
  label = "IFC settings",
): Record<string, unknown> {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new TypeError(`${label} must be a plain record`);
  let nodes = 0,
    characters = 0;
  const active = new Set<object>();
  const copy = (input: unknown, depth: number): unknown => {
    if (++nodes > 2048 || depth > 8)
      throw new RangeError(`${label} exceeds configuration limits`);
    if (typeof input === "string") {
      characters += input.length;
      if (characters > 65536)
        throw new RangeError(`${label} exceeds configuration limits`);
      return input;
    }
    if (input === null || typeof input === "boolean") return input;
    if (typeof input === "number" && Number.isFinite(input)) return input;
    if (!input || typeof input !== "object")
      throw new TypeError(
        `${label} accepts data, not functions or undefined values`,
      );
    if (active.has(input))
      throw new TypeError(`${label} must not contain cycles`);
    active.add(input);
    try {
      if (Object.getPrototypeOf(input) === Set.prototype) {
        if (Reflect.ownKeys(input).length)
          throw new TypeError(
            `${label} collections must not have custom properties`,
          );
        if ((input as Set<unknown>).size > 2048)
          throw new RangeError(`${label} exceeds configuration limits`);
        return new Set(
          [...Set.prototype.values.call(input)].map((v) => copy(v, depth + 1)),
        );
      }
      if (Object.getPrototypeOf(input) === Map.prototype) {
        if (Reflect.ownKeys(input).length)
          throw new TypeError(
            `${label} collections must not have custom properties`,
          );
        if ((input as Map<unknown, unknown>).size > 2048)
          throw new RangeError(`${label} exceeds configuration limits`);
        return new Map(
          [...Map.prototype.entries.call(input)].map(([k, v]) => {
            if (typeof k !== "string" && typeof k !== "number")
              throw new TypeError(
                `${label} Map keys must be strings or numbers`,
              );
            if (typeof k === "string" && unsafe(k))
              throw new TypeError(`${label} contains a reserved key`);
            return [copy(k, depth + 1), copy(v, depth + 1)];
          }),
        );
      }
      const array =
        Array.isArray(input) &&
        Object.getPrototypeOf(input) === Array.prototype;
      if (!array && !isRecord(input))
        throw new TypeError(
          `${label} accepts only plain data, arrays, Sets and Maps`,
        );
      if (array && (input as unknown[]).length > 2048)
        throw new RangeError(`${label} exceeds configuration limits`);
      const output: Record<string, unknown> | unknown[] = array ? [] : {};
      for (const key of Reflect.ownKeys(input)) {
        if (array && key === "length") continue;
        if (typeof key !== "string" || unsafe(key))
          throw new TypeError(`${label} contains a reserved key`);
        const descriptor = Object.getOwnPropertyDescriptor(input, key)!;
        if (!("value" in descriptor))
          throw new TypeError(`${label} must not contain accessors`);
        if (!descriptor.enumerable)
          throw new TypeError(`${label} must contain enumerable data only`);
        if (array && !/^(0|[1-9]\d*)$/.test(key))
          throw new TypeError(`${label} contains an invalid array key`);
        characters += key.length;
        if (characters > 65536)
          throw new RangeError(`${label} exceeds configuration limits`);
        Object.defineProperty(output, key, {
          value: copy(descriptor.value, depth + 1),
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
      if (array && (input as unknown[]).length !== (output as unknown[]).length)
        throw new TypeError(`${label} must not contain sparse trailing arrays`);
      return output;
    } finally {
      active.delete(input);
    }
  };
  return copy(value, 0) as Record<string, unknown>;
}

export function copyIfcImporterSettings(
  value: unknown,
): Record<string, unknown> {
  const result = copyIfcSettings(value, "IFC importer settings");
  for (const key of Object.keys(result)) {
    if (
      ["wasm", "webIfc", "worker", "workerUrl", "process", "dispose"].includes(
        key,
      )
    )
      throw new TypeError(`IFC importer setting is adapter-owned: ${key}`);
  }
  return result;
}

/** Apply only existing public data fields, retaining library-owned Set/Map instances. */
export function applyIfcSettings(target: object, settings: IfcSettings): void {
  const merge = (old: unknown, next: unknown, path: string): unknown => {
    if (old instanceof Set) {
      if (!(next instanceof Set)) throw new TypeError(`${path} requires a Set`);
      old.clear();
      for (const value of next) old.add(value);
      return old;
    }
    if (old instanceof Map) {
      if (!(next instanceof Map)) throw new TypeError(`${path} requires a Map`);
      old.clear();
      for (const [key, value] of next) old.set(key, value);
      return old;
    }
    if (isRecord(old) && isRecord(next)) {
      // Loader/geometry bags accept new upstream fields; collections stay library-owned.
      for (const [key, value] of Object.entries(next)) {
        if (unsafe(key))
          throw new TypeError(`Reserved IFC setting: ${path}.${key}`);
        const descriptor = Object.getOwnPropertyDescriptor(old, key);
        if (
          descriptor &&
          (!("value" in descriptor) || typeof descriptor.value === "function")
        )
          throw new TypeError(`Executable IFC setting: ${path}.${key}`);
        Object.defineProperty(old, key, {
          value: descriptor
            ? merge(descriptor.value, value, `${path}.${key}`)
            : value,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
      return old;
    }
    if (
      old !== null &&
      (typeof old !== typeof next || typeof old === "function")
    )
      throw new TypeError(`Incompatible IFC setting: ${path}`);
    return next;
  };
  for (const [key, value] of Object.entries(settings)) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (
      unsafe(key) ||
      !descriptor ||
      !("value" in descriptor) ||
      !descriptor.writable ||
      typeof descriptor.value === "function"
    )
      throw new TypeError(`Unknown or non-data IFC setting: ${key}`);
    (target as Record<string, unknown>)[key] = merge(
      descriptor.value,
      value,
      key,
    );
  }
}
