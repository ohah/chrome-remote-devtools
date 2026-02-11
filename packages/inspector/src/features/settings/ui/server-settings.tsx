// Server settings component
import { useState, useEffect } from 'react';
import {
  useServerUrl,
  DEFAULT_SERVER_URL,
  DEFAULT_METRO_URL,
  parseServerUrlToBind,
} from '@/shared/lib';

interface ServerSettingsProps {
  /** Callback when settings are saved */
  onSave?: () => void;
}

export function ServerSettings({ onSave }: ServerSettingsProps) {
  const { serverUrl, metroUrl, setServerUrl, setMetroUrl, resetServerUrl, resetMetroUrl } =
    useServerUrl();
  const currentServerUrl = serverUrl ?? '';
  const currentMetroUrl = metroUrl ?? '';
  const [serverUrlValue, setServerUrlValue] = useState(currentServerUrl || DEFAULT_SERVER_URL);
  const [metroUrlValue, setMetroUrlValue] = useState(currentMetroUrl || DEFAULT_METRO_URL);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setServerUrlValue(currentServerUrl || DEFAULT_SERVER_URL);
  }, [currentServerUrl]);
  useEffect(() => {
    setMetroUrlValue(currentMetroUrl || DEFAULT_METRO_URL);
  }, [currentMetroUrl]);

  const handleSave = () => {
    setError(null);
    setIsSaving(true);

    try {
      setServerUrl(serverUrlValue);
      if (metroUrlValue.trim()) {
        setMetroUrl(metroUrlValue.trim());
      } else {
        setMetroUrl(DEFAULT_METRO_URL);
      }

      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri) {
        const { port, host } = parseServerUrlToBind(serverUrlValue);
        import('@tauri-apps/api/core')
          .then(({ invoke }) =>
            invoke('stop_server').then(() => invoke('start_server', { port, host }))
          )
          .catch((e) => console.error('[settings] Failed to restart embedded server:', e));
      }

      onSave?.();
      setTimeout(() => {
        setIsSaving(false);
      }, 500);
    } catch (err) {
      const errorMessage =
        err instanceof Error && err.message.includes('Invalid URL format')
          ? 'Invalid URL format. Please enter a valid URL (e.g., http://localhost:8080)'
          : 'Failed to save server URL. Please check that it is a valid URL.';
      setError(errorMessage);
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setError(null);
    resetServerUrl();
    setServerUrlValue(DEFAULT_SERVER_URL);
    resetMetroUrl();
    setMetroUrlValue(DEFAULT_METRO_URL);
    onSave?.();
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="server-url" className="block text-sm font-medium text-gray-300 mb-2">
          Server URL
        </label>
        <input
          id="server-url"
          type="text"
          value={serverUrlValue}
          onChange={(e) => {
            setServerUrlValue(e.target.value);
            setError(null);
          }}
          placeholder={DEFAULT_SERVER_URL}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Server URL"
        />
        {error && (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-400">Example: {DEFAULT_SERVER_URL}</p>
      </div>

      <div>
        <label htmlFor="metro-url" className="block text-sm font-medium text-gray-300 mb-2">
          Metro URL (for RN dev menu targets)
        </label>
        <input
          id="metro-url"
          type="text"
          value={metroUrlValue}
          onChange={(e) => {
            setMetroUrlValue(e.target.value);
            setError(null);
          }}
          placeholder={DEFAULT_METRO_URL}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Metro URL"
        />
        <p className="mt-2 text-xs text-gray-400">
          Fetches /json/list to show Metro-connected RN apps in tabs. Example: {DEFAULT_METRO_URL}
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
        <button
          type="button"
          onClick={handleReset}
          className="cursor-pointer px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !serverUrlValue}
          className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
