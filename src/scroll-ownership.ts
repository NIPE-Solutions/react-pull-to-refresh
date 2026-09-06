import type { RefObject } from 'react'
import { isAtScrollStart } from './mechanics'

export type ScrollTarget = HTMLElement | Window
export type ScrollContainer = ScrollTarget | RefObject<HTMLElement | null>

export function getScrollTop(target: ScrollTarget): number {
  return target === window
    ? window.scrollY || document.documentElement.scrollTop
    : (target as HTMLElement).scrollTop
}

export function isVerticallyScrollable(element: Element): boolean {
  return (
    /^(auto|scroll|overlay)$/.test(getComputedStyle(element).overflowY) &&
    element.scrollHeight > element.clientHeight + 1
  )
}

export function resolveScrollTarget(
  root: HTMLElement,
  explicit?: ScrollContainer,
): ScrollTarget | null {
  if (explicit) return 'current' in explicit ? explicit.current : explicit
  for (
    let element: HTMLElement | null = root;
    element;
    element = element.parentElement
  ) {
    if (isVerticallyScrollable(element)) return element
  }
  return window
}

export function eligibleOrigin(
  root: HTMLElement,
  target: EventTarget | null,
): Element | null {
  const element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null
  if (!element || !root.contains(element)) return null
  if (
    element.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-pull-to-refresh-ignore]',
    )
  )
    return null
  return element
}

export function chainAtTop(
  root: HTMLElement,
  origin: Element,
  owner: ScrollTarget | null,
): boolean {
  if (!owner || !root.contains(origin) || !isAtScrollStart(getScrollTop(owner)))
    return false
  const end =
    owner === window
      ? null
      : (owner as HTMLElement).contains(root)
        ? owner
        : root
  for (
    let element: Element | null = origin;
    element;
    element = element.parentElement
  ) {
    if (isVerticallyScrollable(element) && !isAtScrollStart(element.scrollTop))
      return false
    if (element === end) break
  }
  return true
}
