// src/components/ErrorBoundary.jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ [ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          color: 'white', 
          background: '#0a0a1a',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: 'Urbanist, sans-serif'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>😕</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#888', marginBottom: '20px', maxWidth: '400px' }}>
            The player encountered an error. Try refreshing the page.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: '#8B5CF6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => e.target.style.background = '#7C3AED'}
            onMouseOut={(e) => e.target.style.background = '#8B5CF6'}
          >
            🔄 Refresh Page
          </button>
          {this.state.error && (
            <details style={{ 
              marginTop: '30px', 
              color: '#666', 
              fontSize: '12px', 
              maxWidth: '500px',
              textAlign: 'left',
              background: '#111120',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #222240'
            }}>
              <summary style={{ cursor: 'pointer', color: '#888' }}>
                Error details
              </summary>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-all',
                marginTop: '10px',
                fontSize: '11px',
                color: '#ff6b6b'
              }}>
                {this.state.error?.toString()}
              </pre>
              {this.state.errorInfo && (
                <pre style={{ 
                  whiteSpace: 'pre-wrap', 
                  wordBreak: 'break-all',
                  marginTop: '10px',
                  fontSize: '10px',
                  color: '#888'
                }}>
                  {this.state.errorInfo?.componentStack}
                </pre>
              )}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}