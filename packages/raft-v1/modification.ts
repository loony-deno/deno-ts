// deno-lint-ignore-file no-explicit-any
export type Changeable = {
  [key: string]: any;
  emit: (event: string, current: any, previous: any) => void;
};

/**
 * Creates a modification function that emits changes with optional suffix.
 *
 * @param suffix - Optional suffix for emitted event names.
 * @returns A function that applies changes and emits events.
 */
export function modification() {
  return function change<T extends Changeable>(
    this: any,
    changed: Partial<T>
  ): T {
    const that: any = this as T;

    if (!changed) return that;

    for (const key in changed) {
      if (key in that && that[key] !== changed[key]) {
        const currently = changed[key];
        // const previously = that[key]

        that[key] = currently;
        // that.emit(`${key}${suffix}`, currently, previously)
      }
    }

    return that;
  };
}
