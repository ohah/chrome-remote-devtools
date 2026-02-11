// App providers / 앱 프로바이더
import * as Toast from '@radix-ui/react-toast';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { router } from '@/app/router';
import { queryClient } from '@/shared/api/query-client';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toast.Provider duration={3000} label="Notification">
        <TooltipProvider delayDuration={300}>
          <RouterProvider router={router} />
        </TooltipProvider>
        <Toast.Viewport className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1002] flex flex-col gap-2 max-w-[90vw] outline-none" />
      </Toast.Provider>
    </QueryClientProvider>
  );
}
