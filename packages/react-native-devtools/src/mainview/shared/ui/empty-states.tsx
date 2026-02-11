/** Loading state / 로딩 상태 */
export function LoadingState() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-lg text-gray-400" role="status" aria-live="polite" aria-label="Loading">
        Loading...
      </div>
    </div>
  );
}

export interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
  isRetrying?: boolean;
}

/** Error state / 에러 상태 */
export function ErrorState({ error, onRetry, isRetrying = false }: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-400">Error</h1>
        <p className="text-gray-400 mb-4">{error.message}</p>
        <button
          onClick={onRetry}
          disabled={isRetrying}
          aria-label="Retry"
          className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed text-white"
        >
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    </div>
  );
}
