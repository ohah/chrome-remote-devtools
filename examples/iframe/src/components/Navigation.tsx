// Navigation component / 네비게이션 컴포넌트
import { Link, useLocation } from '@tanstack/react-router';

interface NavigationProps {
  clientId: string | null;
  showIframe: boolean;
  showPopup: boolean;
  onToggleIframe: () => void;
  onTogglePopup: () => void;
}

export default function Navigation({
  clientId,
  showIframe,
  showPopup,
  onToggleIframe,
  onTogglePopup,
}: NavigationProps) {
  const location = useLocation();

  return (
    <nav className="bg-indigo-600 text-white p-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex gap-4">
          <Link
            to="/"
            className={`px-4 py-2 rounded transition-colors no-underline ${
              location.pathname === '/' ? 'bg-indigo-700' : 'hover:bg-indigo-500'
            }`}
          >
            Home / 홈
          </Link>
          <Link
            to="/test"
            className={`px-4 py-2 rounded transition-colors no-underline ${
              location.pathname === '/test' ? 'bg-indigo-700' : 'hover:bg-indigo-500'
            }`}
          >
            Test / 테스트
          </Link>
          <Link
            to="/about"
            className={`px-4 py-2 rounded transition-colors no-underline ${
              location.pathname === '/about' ? 'bg-indigo-700' : 'hover:bg-indigo-500'
            }`}
          >
            About / 정보
          </Link>
        </div>
        <div className="flex gap-2 items-center">
          <div className="text-sm mr-4">
            <strong>Client ID:</strong> {clientId || 'Not connected / 연결되지 않음'}
          </div>
          <button
            onClick={onToggleIframe}
            className={`px-4 py-2 text-sm border-none rounded transition-colors ${
              showIframe
                ? 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700'
                : 'bg-gray-500 hover:bg-gray-600 active:bg-gray-700'
            }`}
          >
            {showIframe ? 'Hide' : 'Show'} iframe
          </button>
          <button
            onClick={onTogglePopup}
            disabled={!clientId}
            className={`px-4 py-2 text-sm border-none rounded transition-colors ${
              showPopup
                ? 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700'
                : 'bg-gray-500 hover:bg-gray-600 active:bg-gray-700'
            } ${!clientId ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {showPopup ? 'Close' : 'Open'} Popup
          </button>
        </div>
      </div>
    </nav>
  );
}

