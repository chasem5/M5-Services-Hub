import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
            </div>
            <h1 className="text-xl font-heading font-bold text-foreground">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              The page ran into an unexpected error. Try refreshing — your data is safe.
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground font-mono bg-muted rounded-lg px-3 py-2 text-left break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <Button onClick={this.handleReset} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
              <Button onClick={() => window.location.reload()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reload page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
