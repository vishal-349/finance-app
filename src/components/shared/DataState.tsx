import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatFirestoreError } from "@/lib/firebaseError";

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
    const formatted = formatFirestoreError(error);
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-16 text-center",
          className,
        )}
      >
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div className="max-w-md space-y-1">
          <p className="font-medium">{formatted?.title ?? "Something went wrong"}</p>
          <p className="text-sm text-muted-foreground">
            {formatted?.message ?? "Failed to load data."}
          </p>
          {formatted?.code && (
            <p className="text-xs text-muted-foreground/70">code: {formatted.code}</p>
          )}
          {formatted?.hint && (
            <code className="mt-1 inline-block rounded bg-muted px-2 py-1 text-xs">
              {formatted.hint}
            </code>
          )}
          {formatted?.indexUrl && (
            <a
              href={formatted.indexUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-xs text-primary underline underline-offset-2"
            >
              Create the index in Firebase console →
            </a>
          )}
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
