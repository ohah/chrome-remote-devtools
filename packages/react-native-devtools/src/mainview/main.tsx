import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Electroview } from 'electrobun/view';
import './index.css';
import App from './App';

// Init Electrobun RPC so renderer can call main (e.g. fetchUrl to avoid CORS)
if (typeof window !== 'undefined' && window.__electrobunWebviewId != null) {
  const rpc = Electroview.defineRPC({
    handlers: { requests: {}, messages: {} },
  });
  (window as Window & { __electrobunRpc?: typeof rpc }).__electrobunRpc = rpc;
  new Electroview({ rpc });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
