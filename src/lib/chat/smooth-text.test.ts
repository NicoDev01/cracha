import { describe, expect, it } from 'vitest'

import { createTextSmoother } from './smooth-text'

function manualFrames() {
  const queue: Array<() => void> = []
  return {
    schedule: (callback: () => void) => { queue.push(callback) },
    step() { queue.shift()?.() },
    get pending() { return queue.length },
  }
}

describe('createTextSmoother', () => {
  it('spreads a burst over several frames instead of showing it at once', () => {
    const frames = manualFrames()
    const shown: string[] = []
    const smoother = createTextSmoother((text) => shown.push(text), frames.schedule)
    smoother.push('x'.repeat(120))
    frames.step()
    expect(shown.join('')).toHaveLength(10)
    while (frames.pending) frames.step()
    expect(shown.join('')).toBe('x'.repeat(120))
    expect(shown.length).toBeGreaterThan(5)
  })

  it('keeps the original order across pushes', () => {
    const frames = manualFrames()
    let shown = ''
    const smoother = createTextSmoother((text) => { shown += text }, frames.schedule)
    smoother.push('Hallo ')
    frames.step()
    smoother.push('Welt [1].')
    while (frames.pending) frames.step()
    expect(shown).toBe('Hallo Welt [1].')
  })

  it('resolves drain only after the backlog is out', async () => {
    const frames = manualFrames()
    let shown = ''
    const smoother = createTextSmoother((text) => { shown += text }, frames.schedule)
    smoother.push('abcdefghij')
    let drained = false
    const done = smoother.drain().then(() => { drained = true })
    frames.step()
    await Promise.resolve()
    expect(drained).toBe(false)
    while (frames.pending) frames.step()
    await done
    expect(shown).toBe('abcdefghij')
  })

  it('releases everything at once on flush', () => {
    const frames = manualFrames()
    let shown = ''
    const smoother = createTextSmoother((text) => { shown += text }, frames.schedule)
    smoother.push('Teilantwort')
    smoother.flush()
    expect(shown).toBe('Teilantwort')
  })

  it('never splits a surrogate pair across frames', () => {
    const frames = manualFrames()
    const shown: string[] = []
    const smoother = createTextSmoother((text) => shown.push(text), frames.schedule)
    smoother.push('ab😀cd')
    while (frames.pending) frames.step()
    expect(shown.every((piece) => !/[\ud800-\udbff]$/.test(piece))).toBe(true)
    expect(shown.join('')).toBe('ab😀cd')
  })
})
