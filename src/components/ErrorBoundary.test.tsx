// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function Bomb({ explode = false }: { explode?: boolean }) {
  if (explode) throw new Error('boom')
  return <div>Working content</div>
}

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )
    expect(screen.getByText('Working content')).toBeTruthy()
    expect(screen.queryByText(/unexpected error/i)).toBeNull()
  })

  it('renders the fallback when a child throws', () => {
    // React logs the caught error to console.error — silence it for a clean run.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>
    )

    expect(screen.getByText(/unexpected error/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /reload/i })).toBeTruthy()
    // The original content must not be shown.
    expect(screen.queryByText('Working content')).toBeNull()
    // The boundary logged the error.
    expect(errorSpy).toHaveBeenCalled()
  })

  it('reloads the page when the Reload button is clicked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    })

    render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByRole('button', { name: /reload/i }))
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
