// Main App component / 메인 App 컴포넌트
import { RouterProvider } from '@tanstack/react-router';
import { router } from '@/app/router';

function App() {
  return <RouterProvider router={router} />;
}

export default App;
