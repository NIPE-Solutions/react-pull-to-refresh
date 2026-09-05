import { describe, expect, it } from 'vitest'

import {
  classifyIntent,
  getArmedState,
  getPullMetrics,
  isAtScrollStart,
} from '../src/mechanics'

describe('scroll boundary', () => {
  it.each([
    [-3, true],
    [0, true],
    [0.5, true],
    [1, true],
    [1.01, false],
    [24, false],
  ])('treats scrollTop %s as at-start=%s', (scrollTop, expected) => {
    expect(isAtScrollStart(scrollTop)).toBe(expected)
  })
})

describe('gesture intent', () => {
  it('waits until movement clears the intent slop', () => {
    expect(classifyIntent(3, 4)).toBe('pending')
  })

  it('claims movement that is primarily downward', () => {
    expect(classifyIntent(5, 14)).toBe('pull')
  })

  it.each([
    [14, 5],
    [-14, 5],
    [1, -14],
  ])('rejects non-pull movement (%s, %s)', (deltaX, deltaY) => {
    expect(classifyIntent(deltaX, deltaY)).toBe('reject')
  })
})

describe('pull resistance', () => {
  it('maps finger travel to monotonic visual distance with controlled overshoot', () => {
    expect(getPullMetrics(-20, 72)).toEqual({
      distance: 0,
      progress: 0,
      overshoot: 0,
    })

    const samples = [0, 24, 72, 120, 240].map((travel) =>
      getPullMetrics(travel, 72),
    )

    expect(samples.map(({ distance }) => Math.round(distance))).toEqual([
      0, 24, 72, 91, 118,
    ])
    expect(samples.map(({ progress }) => progress)).toEqual([0, 1 / 3, 1, 1, 1])
    expect(samples[4]?.distance).toBeLessThan(120)
    expect(samples[4]?.overshoot).toBeGreaterThan(0)
  })
})

describe('armed hysteresis', () => {
  it('arms at the threshold and stays armed until six pixels below it', () => {
    expect(getArmedState(false, 71.9, 72)).toBe(false)
    expect(getArmedState(false, 72, 72)).toBe(true)
    expect(getArmedState(true, 67, 72)).toBe(true)
    expect(getArmedState(true, 65.9, 72)).toBe(false)
  })
})
