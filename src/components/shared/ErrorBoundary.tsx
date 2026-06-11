import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Catches render-time errors so a single bad screen never blanks the app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("Render error:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <div>
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              {this.state.error.message || "An unexpected error occurred."}
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>Reload app</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
