export type GestureIntent = 'pending' | 'pull' | 'reject'

export interface PullMetrics {
  distance: number
  progress: number
  overshoot: number
}

const SCROLL_START_TOLERANCE = 1
const INTENT_SLOP = 6
const DIRECTION_DOMINANCE = 1.15
const HYSTERESIS = 6

export function isAtScrollStart(scrollTop: number): boolean {
  return scrollTop <= SCROLL_START_TOLERANCE
}

export function classifyIntent(deltaX: number, deltaY: number): GestureIntent {
  if (Math.hypot(deltaX, deltaY) < INTENT_SLOP) return 'pending'
  if (deltaY > 0 && deltaY > Math.abs(deltaX) * DIRECTION_DOMINANCE) {
    return 'pull'
  }
  return 'reject'
}

export function getPullMetrics(travel: number, threshold: number): PullMetrics {
  const positiveTravel = Math.max(0, travel)
  const directDistance = Math.min(positiveTravel, threshold)
  const excess = Math.max(0, positiveTravel - threshold)
  const resistedOvershoot = 1.27 * excess ** 0.7
  const distance = directDistance + resistedOvershoot

  return {
    distance,
    progress: Math.min(1, distance / threshold),
    overshoot: resistedOvershoot,
  }
}

export function getArmedState(
  wasArmed: boolean,
  distance: number,
  threshold: number,
): boolean {
  return wasArmed
    ? distance >=
        Math.max(0, threshold - Math.min(HYSTERESIS, threshold * 0.25))
    : distance >= threshold
}
