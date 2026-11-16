import type { ViewerController, ViewerMountOptions, ViewerOptions } from '@file-viewer/web'

/** Supply Full assets for explicitly updated groups without resetting unrelated options. */
export function withFullControllerOptions(
  controller: ViewerController,
  normalize: (input: ViewerMountOptions) => ViewerMountOptions
): ViewerController {
  const load = controller.load.bind(controller)
  const update = controller.update.bind(controller)
  const completeSuppliedOptions = (input: ViewerMountOptions): ViewerMountOptions => {
    // Core owns nullish JS inputs: load({ options: null }) retains its options,
    // while unsupported nullish inputs keep the original async rejection.
    if (input == null || input.options == null) return input
    const normalized = normalize(input)
    const keys = Object.keys(input.options) as Array<keyof ViewerOptions>
    return {
      ...normalized,
      // Keep explicit undefined language fields and an explicit empty object.
      // Completing every group here would replace existing custom asset URLs.
      options: Object.fromEntries(keys.map(key => [key, normalized.options?.[key]]))
    }
  }
  controller.load = input => {
    let completed: ViewerMountOptions
    try {
      completed = completeSuppliedOptions(input)
    } catch (error) {
      return Promise.reject(error)
    }
    return load(completed)
  }
  controller.update = input => {
    let completed: ViewerMountOptions | undefined
    try {
      completed = input === undefined ? undefined : completeSuppliedOptions(input)
    } catch (error) {
      return Promise.reject(error)
    }
    return update(completed)
  }
  return controller
}
