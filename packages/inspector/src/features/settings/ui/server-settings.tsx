// Server settings component
import { useState, useEffect } from 'react';
import { useServerUrl, DEFAULT_SERVER_URL, DEFAULT_METRO_URL } from '@/shared/lib';

interface ServerSettingsProps {
  /** Callback when settings are saved */
  onSave?: () => void;
}

export function ServerSettings({ onSave }: ServerSettingsProps) {
  const {
    normalServerUrl,
    reactotronServerUrl,
    metroUrl,
    isReactotronMode,
    setNormalServerUrl,
    setReactotronServerUrl,
    setMetroUrl,
    resetNormalServerUrl,
    resetReactotronServerUrl,
    resetMetroUrl,
  } = useServerUrl();
  // Use mode-specific URL / 모드별 URL 사용
  const currentModeUrl = isReactotronMode ? reactotronServerUrl : normalServerUrl;
  const currentMetroUrl = metroUrl ?? '';
  const [serverUrl, setServerUrlValue] = useState(currentModeUrl ?? '');
  const [metroUrlValue, setMetroUrlValue] = useState(currentMetroUrl || DEFAULT_METRO_URL);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with store when mode or URL changes / 모드 또는 URL 변경 시 store와 동기화
  useEffect(() => {
    setServerUrlValue(currentModeUrl ?? '');
  }, [currentModeUrl, isReactotronMode]);
  useEffect(() => {
    setMetroUrlValue(currentMetroUrl || DEFAULT_METRO_URL);
  }, [currentMetroUrl]);

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
      if (metroUrlValue.trim()) {
        setMetroUrl(metroUrlValue.trim());
      } else {
        setMetroUrl(DEFAULT_METRO_URL);
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
    // Reset both Server URL and Metro URL to defaults / 두 설정 모두 기본값으로
    if (isReactotronMode) {
      resetReactotronServerUrl();
      setServerUrlValue('http://localhost:9090');
    } else {
      resetNormalServerUrl();
      setServerUrlValue('http://localhost:8080');
    }
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
          value={serverUrl}
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

      {/* Metro URL for /json/list (React Native targets) / React Native 타깃용 Metro URL */}
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

      {/* Actions at bottom: apply to all settings / 하단 액션: 전체 설정에 적용 */}
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
          disabled={isSaving || !serverUrl}
          className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
