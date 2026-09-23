/**
 * Releases streamed text at an even pace instead of in the bursts it arrives in.
 *
 * Network chunks carry anything from one token to a whole paragraph, and
 * rendering each one as it lands made the answer jump. The backlog is released
 * a little every animation frame: fast enough that it never lags far behind
 * (about a fifth of a second), slow enough that a burst reads as typing.
 */

type Schedule = (callback: () => void) => void

/** Frames over which the current backlog is spread. */
const FRAMES_PER_BACKLOG = 12
/** Never slower than this per frame, or a long answer would trail the model. */
const MIN_CHARACTERS_PER_FRAME = 3

/**
 * A hidden tab runs no animation frames at all, so a timer races the frame:
 * whichever comes first releases the next piece.
 */
export function scheduleFrame(callback: () => void): void {
  if (typeof requestAnimationFrame !== 'function') {
    setTimeout(callback, 16)
    return
  }
  let ran = false
  const run = () => {
    if (ran) return
    ran = true
    cancelAnimationFrame(frame)
    clearTimeout(timer)
    callback()
  }
  const frame = requestAnimationFrame(run)
  const timer = setTimeout(run, 100)
}

function isHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

export interface TextSmoother {
  push: (text: string) => void
  /** Resolves once everything pushed so far has been released. */
  drain: () => Promise<void>
  /** Releases the whole backlog at once, e.g. before showing an error. */
  flush: () => void
}

export function createTextSmoother(
  emit: (text: string) => void,
  schedule: Schedule = scheduleFrame,
): TextSmoother {
  let backlog = ''
  let scheduled = false
  let waiters: Array<() => void> = []

  const settle = () => {
    const pending = waiters
    waiters = []
    pending.forEach((resolve) => resolve())
  }

  const tick = () => {
    scheduled = false
    if (!backlog) {
      settle()
      return
    }
    // Nobody watches a hidden tab type; it gets the text in one piece.
    let end = isHidden()
      ? backlog.length
      : Math.min(backlog.length, Math.max(MIN_CHARACTERS_PER_FRAME, Math.ceil(backlog.length / FRAMES_PER_BACKLOG)))
    // Half an emoji renders as a replacement character for one frame.
    const last = backlog.charCodeAt(end - 1)
    if (last >= 0xd800 && last <= 0xdbff && end < backlog.length) end += 1
    const piece = backlog.slice(0, end)
    backlog = backlog.slice(end)
    emit(piece)
    if (backlog) plan()
    else settle()
  }

  const plan = () => {
    if (scheduled) return
    scheduled = true
    schedule(tick)
  }

  return {
    push(text) {
      if (!text) return
      backlog += text
      plan()
    },
    drain() {
      if (!backlog) return Promise.resolve()
      return new Promise((resolve) => {
        waiters.push(resolve)
        plan()
      })
    },
    flush() {
      if (backlog) {
        const rest = backlog
        backlog = ''
        emit(rest)
      }
      settle()
    },
  }
}
