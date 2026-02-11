import * as React from 'react';
import { useSettingsStore, DEFAULT_METRO_URL } from '@/shared/lib/settings-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { metroUrl, setMetroUrl, resetMetroUrl } = useSettingsStore();
  const [metroUrlValue, setMetroUrlValue] = React.useState(metroUrl);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) setMetroUrlValue(metroUrl);
  }, [isOpen, metroUrl]);

  const handleSave = () => {
    setError(null);
    const trimmed = metroUrlValue.trim();
    if (!trimmed) {
      setMetroUrl(DEFAULT_METRO_URL);
      setMetroUrlValue(DEFAULT_METRO_URL);
    } else {
      try {
        new URL(trimmed);
        setMetroUrl(trimmed);
      } catch {
        setError('Invalid URL (e.g. http://localhost:8081)');
        return;
      }
    }
    onClose();
  };

  const handleReset = () => {
    setError(null);
    resetMetroUrl();
    setMetroUrlValue(DEFAULT_METRO_URL);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Metro Debugger Settings</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="metro-url" className="block text-sm font-medium text-gray-300 mb-2">
              Metro URL
            </label>
            <input
              id="metro-url"
              type="text"
              value={metroUrlValue}
              onChange={(e) => setMetroUrlValue(e.target.value)}
              placeholder="http://localhost:8081"
              className={cn(
                'w-full px-3 py-2 rounded-md bg-gray-900 border border-gray-600 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                error && 'border-red-500'
              )}
            />
            {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-gray-400 hover:text-gray-200"
          >
            Reset
          </Button>
          <Button
            variant="secondary"
            onClick={onClose}
            className="bg-gray-700 text-gray-200 hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
