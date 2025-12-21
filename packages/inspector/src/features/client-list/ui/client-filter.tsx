/**
 * Client filter component / 클라이언트 필터 컴포넌트
 */
interface ClientFilterProps {
  /** Search query value / 검색 쿼리 값 */
  query: string;
  /** Callback when query changes / 쿼리 변경 시 콜백 */
  onQueryChange: (query: string) => void;
}

export function ClientFilter({ query, onQueryChange }: ClientFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="client-search" className="sr-only">
        Search clients
      </label>
      <input
        id="client-search"
        type="text"
        placeholder="Search clients..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        aria-label="Search clients by title, URL, ID, user agent, or IP address"
        className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {query && (
        <button
          onClick={() => onQueryChange('')}
          className="px-2 py-1.5 text-sm text-gray-400 hover:text-gray-200"
          aria-label="Clear search"
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  );
}
