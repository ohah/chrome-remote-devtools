import { RouterProvider } from '@tanstack/react-router';
import { router } from '@/app/router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <TanStackRouterDevtools router={router} />
    </>
  );
}
