import { Component, ComponentChildren } from "preact";
import { ApiError } from "../utils/api-request.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

const COPY = {
  en: {
    title: "Oops! QR Machine Broke",
    fallback: "Something went wonky with the QR generator",
    retry: "Try Again",
  },
  es: {
    title: "Uy. Se rompió la máquina de QR",
    fallback: "Algo salió torcido con el generador de QR",
    retry: "Reintentar",
  },
} as const;

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ComponentChildren;
  fallback?: (error: Error, reset: () => void) => ComponentChildren;
  lang?: Locale;
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
      const t = COPY[getClientLocale(this.props.lang)];
      return (
        <div class="bg-amber-50 border-4 border-amber-300 rounded-chunky p-6 text-center">
          <div class="text-4xl mb-4">😅</div>
          <h3 class="text-xl font-black text-amber-900 mb-2">
            {t.title}
          </h3>
          <p class="text-amber-800 mb-4">
            {this.state.error instanceof ApiError && this.state.error.message
              ? this.state.error.message
              : t.fallback}
          </p>
          <button
            type="button"
            onClick={this.reset}
            class="bg-amber-500 text-white px-6 py-3 rounded-chunky border-4 border-black shadow-chunky hover:shadow-chunky-hover font-bold transition-all hover:scale-105"
          >
            {t.retry}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
