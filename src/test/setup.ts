import { afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'

beforeAll(() => {
  // jsdom lacks matchMedia (used by the theme watcher)
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    })
  }
  // jsdom scrollTo logs "not implemented" noise
  window.scrollTo = () => undefined
  // blob URLs for the export flow (jsdom lacks them)
  URL.createObjectURL = () => 'blob:mock'
  URL.revokeObjectURL = () => undefined
  // jsdom logs "Not implemented: navigation" when a programmatic blob: link is clicked
  const origClick = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (this.href.startsWith('blob:')) return
    origClick.call(this)
  }
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  // jsdom shares window.location across tests in a file — reset the route
  window.history.replaceState(null, '', '/')
})
