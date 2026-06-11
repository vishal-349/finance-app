import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataStateProps {
  isLoading: boolean;
  isError?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  onRetry?: () => void;
  /** Skeleton/loader to show while loading. Defaults to a spinner. */
  loadingFallback?: React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * Standardises the loading / error / empty / ready lifecycle so every data
 * view handles all four states consistently.
 */
export function DataState({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  loadingFallback,
  emptyTitle = "Nothing here yet",
  emptyMessage = "Once you add data it will show up here.",
  emptyAction,
  emptyIcon,
  className,
  children,
}: DataStateProps) {
  if (isLoading) {
    return (
      loadingFallback ?? (
        <div className={cn("flex items-center justify-center py-16", className)}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )
    );
  }

  if (isError) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-16 text-center",
          className,
        )}
      >
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to load data."}
          </p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-16 text-center",
          className,
        )}
      >
        {emptyIcon ?? <Inbox className="h-10 w-10 text-muted-foreground" />}
        <div>
          <p className="font-medium">{emptyTitle}</p>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
        {emptyAction}
      </div>
    );
  }

  return <>{children}</>;
}
