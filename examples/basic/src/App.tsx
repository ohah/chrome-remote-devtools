import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ConsolePage from './pages/ConsolePage';
import NetworkPage from './pages/NetworkPage';
import StoragePage from './pages/StoragePage';
import AssertPage from './pages/AssertPage';
import AssertPanel from './components/AssertPanel';

// Navigation component / 네비게이션 컴포넌트
function Navigation() {
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Home / 홈' },
    { path: '/console', label: 'Console' },
    { path: '/network', label: 'Network' },
    { path: '/storage', label: 'Storage' },
    { path: '/assert', label: 'Assert' },
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

// Main App component / 메인 App 컴포넌트
function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col overflow-x-hidden w-screen m-0 p-0">
        <Navigation />
        <main className="flex-1 bg-gray-900 w-full max-w-none m-0 p-0 flex flex-col overflow-x-hidden relative">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/console" element={<ConsolePage />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="/storage" element={<StoragePage />} />
            <Route path="/assert" element={<AssertPage />} />
          </Routes>
        </main>
        <AssertPanel />
      </div>
    </BrowserRouter>
  );
}

export default App;
