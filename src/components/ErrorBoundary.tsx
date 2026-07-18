import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Top-level error boundary. Catches render/lifecycle errors anywhere in the
 * tree and shows a styled fallback (Heritage palette) instead of a blank white
 * screen. React only supports error boundaries as class components.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the error for debugging; a real deployment could report it here.
    console.error('Uncaught error in React tree:', error, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2] p-6">
        <div className="max-w-md w-full bg-white border border-[#1A1C1E]/10 rounded-[8px] p-8 text-center">
          <p className="font-label uppercase tracking-widest text-xs text-[#B8422E] mb-3">
            Something went wrong
          </p>
          <h1 className="font-[Fraunces,serif] text-2xl text-[#1A1C1E] mb-3">
            The app hit an unexpected error
          </h1>
          <p className="text-[#6C7278] text-sm mb-6">
            This is a display glitch, not a problem with your data. Reloading
            usually clears it.
          </p>
          <button
            onClick={this.handleReload}
            className="px-5 py-2 bg-[#B8422E] text-white rounded-[4px] text-sm font-medium hover:bg-[#A33826] transition-colors"
          >
            Reload
          </button>
          {import.meta.env.DEV && (
            <pre className="mt-6 text-left text-xs text-[#6C7278] bg-[#F7F5F2] border border-[#1A1C1E]/8 rounded-[4px] p-3 overflow-x-auto whitespace-pre-wrap">
              {error.message}
            </pre>
          )}
        </div>
      </div>
    )
  }
}
