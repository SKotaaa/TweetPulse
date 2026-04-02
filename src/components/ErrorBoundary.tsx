import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let displayMessage = 'An unexpected error occurred.';
      let errorDetail = '';

      if (this.state.error?.message) {
        try {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            const msg = parsed.error.toLowerCase();
            if (msg.includes('offline') || msg.includes('timed out')) {
              displayMessage = 'Network issue: Firestore is unreachable. Please check your connection.';
            } else if (msg.includes('permission-denied') || msg.includes('insufficient permissions')) {
              displayMessage = 'Access denied: You do not have permission to perform this action.';
            } else {
              displayMessage = parsed.error;
            }
            errorDetail = `Operation: ${parsed.operationType} at ${parsed.path}`;
          } else {
            displayMessage = this.state.error.message;
          }
        } catch {
          displayMessage = this.state.error.message;
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 transition-colors duration-300">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Something went wrong</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">
              {displayMessage}
            </p>
            {errorDetail && (
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">
                {errorDetail}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
