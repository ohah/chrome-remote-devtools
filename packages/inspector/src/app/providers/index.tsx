// App providers / 앱 프로바이더
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from '@/app/router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { queryClient } from '@/shared/api/query-client';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <TanStackRouterDevtools router={router} />
    </QueryClientProvider>
  );
}
