// Root route
import { createRootRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

// Title bar component
function TitleBar({ showBack = false }: { showBack?: boolean }) {
  const navigate = useNavigate();
  const [appWindow, setAppWindow] = useState<ReturnType<
    typeof import('@tauri-apps/api/window').getCurrentWindow
  > | null>(null);

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  useEffect(() => {
    if (isTauri) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        setAppWindow(getCurrentWindow());
      });
    }
  }, []);

  const handleBack = () => {
    navigate({ to: '/' });
  };

  const handleMinimize = () => {
    if (appWindow) {
      void appWindow.minimize();
    }
  };

  const handleMaximize = () => {
    if (appWindow) {
      void appWindow.toggleMaximize();
    }
  };

  const handleClose = () => {
    if (appWindow) {
      void appWindow.close();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[1000] h-[30px] bg-gray-800 select-none grid grid-cols-[1fr_max-content]">
      <div
        className="titlebar-drag-region flex items-center pl-2"
        data-tauri-drag-region={isTauri ? true : undefined}
      >
        {showBack && (
          <button
            className="titlebar-nav-button appearance-none p-0 m-0 border-0 inline-flex justify-center items-center w-[24px] h-[24px] bg-transparent text-gray-400 cursor-pointer transition-colors hover:bg-white/10 rounded"
            onClick={handleBack}
            aria-label="Go back"
            title="Back"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M8 2L4 6l4 4" />
            </svg>
          </button>
        )}
      </div>
      {isTauri && appWindow && (
        <div className="titlebar-controls flex">
          <button
            className="appearance-none p-0 m-0 border-0 inline-flex justify-center items-center w-[30px] h-[30px] bg-transparent text-gray-400 cursor-pointer transition-colors hover:bg-white/10"
            onClick={handleMinimize}
            aria-label="Minimize"
            title="Minimize"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="0" y="5" width="12" height="1" />
            </svg>
          </button>
          <button
            className="appearance-none p-0 m-0 border-0 inline-flex justify-center items-center w-[30px] h-[30px] bg-transparent text-gray-400 cursor-pointer transition-colors hover:bg-white/10"
            onClick={handleMaximize}
            aria-label="Maximize"
            title="Maximize"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <rect x="1" y="1" width="10" height="10" />
            </svg>
          </button>
          <button
            className="appearance-none p-0 m-0 border-0 inline-flex justify-center items-center w-[30px] h-[30px] bg-transparent text-gray-400 cursor-pointer transition-colors hover:bg-red-500 hover:text-white"
            onClick={handleClose}
            aria-label="Close"
            title="Close"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M1 1L11 11M11 1L1 11" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export const Route = createRootRoute({
  component: () => {
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    const location = useLocation();
    const currentPath = location.pathname;
    const showTitleBar = isTauri;
    const routesWithBackButton = ['/replay'];
    const showBack = routesWithBackButton.includes(currentPath);
    return (
      <div className="h-screen flex flex-col bg-gray-900">
        {showTitleBar && <TitleBar showBack={showBack} />}
        <div className={`flex-1 overflow-hidden ${showTitleBar ? 'pt-[30px]' : ''}`}>
          <Outlet />
        </div>
      </div>
    );
  },
});
