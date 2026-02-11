import { BrowserWindow, BrowserView, Updater, Utils } from 'electrobun/bun';

const DEV_SERVER_PORT = 2420;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

// Ref for window control RPC (set after mainWindow is created) / 창 제어 RPC용
let mainWindowRef: BrowserWindow | null = null;

// RPC: fetch URL from main process + window control / CORS 회피용 fetch + 창 제어
const rpc = BrowserView.defineRPC({
  handlers: {
    requests: {
      fetchUrl: async (params?: unknown) => {
        const { url } = params as { url: string };
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        return res.json();
      },
      closeWindow: async () => {
        mainWindowRef?.close();
      },
      minimizeWindow: async () => {
        if (!mainWindowRef) return;
        if (mainWindowRef.isMaximized()) mainWindowRef.unmaximize();
        mainWindowRef.minimize();
      },
      // Maximize only; restore disabled to avoid CEF freeze on unmaximize/setFrame
      toggleMaximizeWindow: async () => {
        if (!mainWindowRef || mainWindowRef.isMaximized()) return;
        mainWindowRef.maximize();
      },
    },
  },
});

// Check if Vite dev server is running for HMR
async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  if (channel === 'dev') {
    try {
      await fetch(DEV_SERVER_URL, { method: 'HEAD' });
      console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    } catch {
      console.log("Vite dev server not running. Run 'bun run dev:hmr' for HMR support.");
    }
  }
  return 'views://mainview/index.html';
}

// Create the main application window
const url = await getMainViewUrl();

const mainWindow = new BrowserWindow({
  title: 'React Native DevTools',
  url,
  titleBarStyle: 'hidden',
  rpc,
  styleMask: { Resizable: true, Miniaturizable: true, Closable: true },
  frame: {
    width: 1024,
    height: 768,
    x: 200,
    y: 200,
  },
});

mainWindowRef = mainWindow;

// Quit the app when the main window is closed
mainWindow.on('close', () => {
  Utils.quit();
});

console.log('React Tailwind Vite app started!');
