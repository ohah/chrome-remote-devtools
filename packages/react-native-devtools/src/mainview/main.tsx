import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Electroview } from 'electrobun/view';
import './index.css';
import App from './App';

// Init Electrobun RPC after load so preload-injected globals are set (fetchUrl, window controls)
function initElectrobunRpc() {
  if (typeof window === 'undefined' || window.__electrobunWebviewId == null) return;
  const rpc = Electroview.defineRPC({
    handlers: { requests: {}, messages: {} },
  });
  (window as Window & { __electrobunRpc?: typeof rpc }).__electrobunRpc = rpc;
  new Electroview({ rpc });
}
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') initElectrobunRpc();
  else window.addEventListener('load', initElectrobunRpc);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
