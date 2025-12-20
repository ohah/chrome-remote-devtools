import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ConsolePage from './pages/ConsolePage';
import NetworkPage from './pages/NetworkPage';
import StoragePage from './pages/StoragePage';
import AssertPage from './pages/AssertPage';
import AssertPanel from './components/AssertPanel';
import './App.css';

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
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          Chrome Remote DevTools
        </Link>
        <div className="nav-links">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={location.pathname === link.path ? 'nav-link active' : 'nav-link'}
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
      <div className="app">
        <Navigation />
        <main className="main-content">
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
