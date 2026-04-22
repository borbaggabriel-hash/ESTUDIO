import { Component, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@studio/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  static isDomMutationError(error: Error): boolean {
    const msg = error.message || "";
    return (
      msg.includes("insertBefore") ||
      msg.includes("removeChild") ||
      msg.includes("NotFoundError") ||
      msg.includes("The node before which the new node is to be inserted is not a child")
    );
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string | null }) {
    console.error("[ErrorBoundary]", error.message, errorInfo.componentStack);
    if (ErrorBoundary.isDomMutationError(error)) {
      setTimeout(() => window.location.reload(), 300);
    }
  }

  handleReset = () => {
    if (this.state.error && ErrorBoundary.isDomMutationError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 p-8 text-center" data-testid="error-boundary-fallback">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg mb-1">Algo deu errado</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {this.state.error?.message || "Ocorreu um erro inesperado. Tente novamente."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="gap-2 mt-2"
            data-testid="button-error-retry"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
