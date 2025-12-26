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
    <div className="relative flex items-center">
      <label htmlFor="client-search" className="sr-only">
        Search clients
      </label>
      {/* Search icon / 검색 아이콘 */}
      <svg
        className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        id="client-search"
        type="text"
        placeholder="Search by title, URL, ID, user agent, or IP..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        aria-label="Search clients by title, URL, ID, user agent, or IP address"
        className="pl-10 pr-10 py-2 w-80 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
      />
      {/* Clear button / 지우기 버튼 */}
      {query && (
        <button
          onClick={() => onQueryChange('')}
          className="absolute right-2 p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-600 rounded transition-colors"
          aria-label="Clear search"
          type="button"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
