import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 16, color: 'hsl(var(--primary))' }}>&#10013;</div>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 16, lineHeight: 1.6 }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 24px', background: 'hsl(var(--primary))', color: 'white',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
