import React from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="max-w-md p-8 bg-white rounded-lg shadow-lg border border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="size-6 text-red-600" />
              <h1 className="text-xl font-bold text-gray-900">Đã xảy ra lỗi</h1>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Ứng dụng gặp lỗi không mong muốn:
              </p>
              <pre className="p-3 bg-red-50 rounded text-xs text-red-800 overflow-auto">
                {this.state.error?.message || 'Unknown error'}
              </pre>
              <pre className="p-3 bg-gray-50 rounded text-xs text-gray-600 overflow-auto max-h-40">
                {this.state.error?.stack}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
