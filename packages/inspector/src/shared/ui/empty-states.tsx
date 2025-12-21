// Empty state components / 빈 상태 컴포넌트
import { GetClientsError } from '@/entities/client';

/**
 * Loading state component / 로딩 상태 컴포넌트
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
 * Error state component props / 에러 상태 컴포넌트 props
 */
export interface ErrorStateProps {
  /** Error object / 에러 객체 */
  error: Error;
  /** Retry callback / 재시도 콜백 */
  onRetry: () => void;
  /** Whether retry is in progress / 재시도 진행 중 여부 */
  isRetrying?: boolean;
}

export function ErrorState({ error, onRetry, isRetrying = false }: ErrorStateProps) {
  // Get specific error message / 구체적인 에러 메시지 가져오기
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

/**
 * Empty state component props / 빈 상태 컴포넌트 props
 */
export interface EmptyStateProps {
  /** Empty state message / 빈 상태 메시지 */
  message: string;
  /** Optional description / 선택적 설명 */
  description?: string;
}

export function EmptyState({ message, description }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">{message}</h1>
        {description && <p className="text-gray-600">{description}</p>}
      </div>
    </div>
  );
}
