import { Component, ComponentChildren } from "preact";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ComponentChildren;
  fallback?: (error: Error, reset: () => void) => ComponentChildren;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false };

  static override getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(
    error: Error,
    errorInfo: { componentStack: string },
  ) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default fallback UI
      return (
        <div class="bg-red-50 border-4 border-red-200 rounded-chunky p-6 text-center">
          <div class="text-4xl mb-4">😅</div>
          <h3 class="text-xl font-black text-red-800 mb-2">
            Oops! QR Machine Broke
          </h3>
          <p class="text-red-600 mb-4">
            {this.state.error.message ||
              "Something went wonky with the QR generator"}
          </p>
          <button
            type="button"
            onClick={this.reset}
            class="bg-red-500 text-white px-6 py-3 rounded-chunky border-4 border-black shadow-chunky hover:shadow-chunky-hover font-bold transition-all hover:scale-105"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
