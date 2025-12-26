// Server settings component
import { useState, useEffect } from 'react';
import { useServerUrl, DEFAULT_SERVER_URL } from '@/shared/lib';

interface ServerSettingsProps {
  /** Callback when settings are saved */
  onSave?: () => void;
}

export function ServerSettings({ onSave }: ServerSettingsProps) {
  const { serverUrl: currentServerUrl, setServerUrl, resetServerUrl } = useServerUrl();
  const [serverUrl, setServerUrlValue] = useState(currentServerUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with store when it changes
  useEffect(() => {
    setServerUrlValue(currentServerUrl ?? '');
  }, [currentServerUrl]);

  const handleSave = () => {
    setError(null);
    setIsSaving(true);

    try {
      setServerUrl(serverUrl);
      onSave?.();
      // Show success message briefly
      setTimeout(() => {
        setIsSaving(false);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save server URL');
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setError(null);
    setServerUrlValue('');
    resetServerUrl();
    onSave?.();
  };

  const hasValue = serverUrl !== null && serverUrl !== '';

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="server-url" className="block text-sm font-medium text-gray-300 mb-2">
          Server URL
        </label>
        <div className="flex gap-2">
          <input
            id="server-url"
            type="text"
            value={serverUrl}
            onChange={(e) => {
              setServerUrlValue(e.target.value);
              setError(null);
            }}
            placeholder={DEFAULT_SERVER_URL}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Server URL"
          />
          <button
            onClick={handleSave}
            disabled={isSaving || !serverUrl}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          {hasValue && (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Reset
            </button>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-400">Example: {DEFAULT_SERVER_URL}</p>
      </div>
    </div>
  );
}
