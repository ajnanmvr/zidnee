import { useEffect } from "react";
import { useRouteError } from "react-router-dom";
import { RequestErrorPage } from "@/components/RequestErrorPage";

// Vite (and other bundlers) throw this when a lazy-loaded chunk 404s -
// almost always because the app was redeployed/rebuilt after the chunk
// URLs were captured, and the browser still has the old index in memory.
// A plain reload fetches the current index and resolves it.
const isChunkLoadError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i.test(
    error.message,
  );
};

export const RouteErrorBoundary = () => {
  const error = useRouteError();
  const isStaleChunk = isChunkLoadError(error);

  useEffect(() => {
    if (!isStaleChunk) {
      console.error(error);
    }
  }, [error, isStaleChunk]);

  return (
    <RequestErrorPage
      variant={isStaleChunk ? "update" : "error"}
      onRetry={() => window.location.reload()}
    />
  );
};
