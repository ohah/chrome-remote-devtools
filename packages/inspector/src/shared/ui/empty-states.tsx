// Empty state components
import { GetClientsError } from '@/entities/client';

/**
 * Loading state component
 */
export function LoadingState() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-lg" role="status" aria-live="polite" aria-label="Loading clients">
        Loading clients...
      </div>
    </div>
  );
}

/**
 * Error state component props
 */
export interface ErrorStateProps {
  /** Error object */
  error: Error;
  /** Retry callback */
  onRetry: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
}

export function ErrorState({ error, onRetry, isRetrying = false }: ErrorStateProps) {
  // Get specific error message
  const errorMessage =
    error instanceof GetClientsError
      ? error.message
      : 'An unexpected error occurred while loading clients';

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-400">Failed to load clients</h1>
        <p className="text-gray-400 mb-4">{errorMessage}</p>
        <button
          onClick={onRetry}
          disabled={isRetrying}
          aria-label="Retry loading clients"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    </div>
  );
}
