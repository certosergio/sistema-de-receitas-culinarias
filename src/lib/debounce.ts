/** Returns a debounced version of `fn` that waits `wait` ms after the last call
 *  before invoking. The returned function exposes a `.cancel()` method and a
 *  `.flush()` method (immediate invocation). */
export default function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): ((...args: A) => void) & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: A | null = null

  const debounced = (...args: A) => {
    lastArgs = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const a = lastArgs
      lastArgs = null
      if (a) fn(...a)
    }, wait)
  }

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    lastArgs = null
  }

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
      const a = lastArgs
      lastArgs = null
      if (a) fn(...a)
    }
  }

  return debounced
}
