// Server settings component
import { useState, useEffect } from 'react';
import { useServerUrl, DEFAULT_SERVER_URL } from '@/shared/lib';

interface ServerSettingsProps {
  /** Callback when settings are saved */
  onSave?: () => void;
}

export function ServerSettings({ onSave }: ServerSettingsProps) {
  const {
    normalServerUrl,
    reactotronServerUrl,
    isReactotronMode,
    setNormalServerUrl,
    setReactotronServerUrl,
    resetNormalServerUrl,
    resetReactotronServerUrl,
  } = useServerUrl();
  // Use mode-specific URL / 모드별 URL 사용
  const currentModeUrl = isReactotronMode ? reactotronServerUrl : normalServerUrl;
  const [serverUrl, setServerUrlValue] = useState(currentModeUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with store when mode or URL changes / 모드 또는 URL 변경 시 store와 동기화
  useEffect(() => {
    setServerUrlValue(currentModeUrl ?? '');
  }, [currentModeUrl, isReactotronMode]);

  const handleSave = () => {
    setError(null);
    setIsSaving(true);

    try {
      // Set URL based on current mode / 현재 모드에 따라 URL 설정
      if (isReactotronMode) {
        setReactotronServerUrl(serverUrl);
      } else {
        setNormalServerUrl(serverUrl);
      }
      onSave?.();
      // Show success message briefly / 성공 메시지 간단히 표시
      setTimeout(() => {
        setIsSaving(false);
      }, 500);
    } catch (err) {
      // Handle error from Zustand store (may contain Korean text) / Zustand store에서 오는 에러 처리 (한글 포함 가능)
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
    // Reset based on current mode / 현재 모드에 따라 재설정
    if (isReactotronMode) {
      resetReactotronServerUrl();
      setServerUrlValue('http://localhost:9090');
    } else {
      resetNormalServerUrl();
      setServerUrlValue('http://localhost:8080');
    }
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
