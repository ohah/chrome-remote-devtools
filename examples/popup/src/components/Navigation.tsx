import { Link, useLocation } from '@tanstack/react-router';

// Navigation component / 네비게이션 컴포넌트
export default function Navigation() {
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Home / 홈' },
    { path: '/console', label: 'Console' },
    { path: '/network', label: 'Network' },
    { path: '/storage', label: 'Storage' },
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-700 shadow-lg sticky top-0 z-[100]">
      <div className="w-full max-w-none mx-0 px-8 flex items-center justify-between h-15 box-border">
        <Link to="/" className="text-xl font-semibold text-blue-400 no-underline">
          Chrome Remote DevTools
        </Link>
        <div className="flex gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 no-underline rounded transition-all text-sm ${
                location.pathname === link.path
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-blue-400'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
