// Home page route / 홈 페이지 라우트
import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-md dark:shadow-lg">
      <h2 className="m-0 mb-4 text-gray-900 dark:text-gray-100">Home / 홈</h2>
      <p className="mb-4 text-gray-700 dark:text-gray-300">
        Welcome to the Chrome Remote DevTools iframe example / Chrome Remote DevTools iframe 예제에
        오신 것을 환영합니다
      </p>
      <p className="mb-4 text-gray-700 dark:text-gray-300">
        Navigate to different pages to test DevTools functionality / 다른 페이지로 이동하여
        DevTools 기능을 테스트하세요
      </p>
      <div className="flex gap-4 flex-wrap">
        <Link
          to="/test"
          className="px-6 py-3 text-base border-none rounded bg-indigo-500 text-white cursor-pointer transition-colors hover:bg-indigo-600 active:bg-indigo-700 no-underline"
        >
          Go to Test Page / 테스트 페이지로 이동
        </Link>
        <Link
          to="/about"
          className="px-6 py-3 text-base border-none rounded bg-indigo-500 text-white cursor-pointer transition-colors hover:bg-indigo-600 active:bg-indigo-700 no-underline"
        >
          Go to About / 정보 페이지로 이동
        </Link>
      </div>
    </div>
  );
}

