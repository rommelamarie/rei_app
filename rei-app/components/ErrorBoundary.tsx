import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[999] bg-[#0a0101] text-red-50 p-6 overflow-y-auto font-mono text-sm">
          <h1 className="text-red-600 font-black text-xl uppercase tracking-tighter mb-4">Neural Fault</h1>
          <p className="text-red-200 mb-4 whitespace-pre-wrap break-words">{this.state.error.message}</p>
          <pre className="text-red-800 text-xs whitespace-pre-wrap break-words mb-6">{this.state.error.stack}</pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            className="px-6 py-3 bg-red-600 text-white font-black uppercase text-xs rounded-xl"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
