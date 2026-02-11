import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { useSettingsStore } from '@/shared/lib/settings-store';
import { SettingsModal } from '@/features/settings/ui/settings-modal';
import { TitleBar } from '@/widgets/title-bar/TitleBar';
import { MetroDebuggerPage } from '@/features/metro-debugger/ui/MetroDebuggerPage';

const queryClient = new QueryClient();

function AppContent() {
  const isSettingsOpen = useSettingsStore((s) => s.isSettingsOpen);
  const closeSettings = useSettingsStore((s) => s.closeSettings);

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <TitleBar />
      <div className="flex-1 overflow-hidden pt-[35px]">
        <MetroDebuggerPage />
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
