// Test page route / 테스트 페이지 라우트
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/test')({
  component: TestPage,
});

function TestPage() {
  const navigate = useNavigate();

  // Test functions / 테스트 함수들
  const handleConsoleTest = () => {
    console.log('Console test message from Test Page / 테스트 페이지의 콘솔 테스트 메시지');
    console.warn('Console warning from Test Page / 테스트 페이지의 콘솔 경고');
    console.error('Console error from Test Page / 테스트 페이지의 콘솔 에러');
  };

  const handleNetworkTest = async () => {
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const data = await response.json();
      console.log('Network test response from Test Page / 테스트 페이지의 네트워크 테스트 응답:', data);
    } catch (error) {
      console.error('Network test error from Test Page / 테스트 페이지의 네트워크 테스트 에러:', error);
    }
  };

  const handleStorageTest = () => {
    localStorage.setItem('test-key', `test-value-${Date.now()}`);
    sessionStorage.setItem('test-session', `test-session-value-${Date.now()}`);
    console.log('Storage test completed from Test Page / 테스트 페이지의 스토리지 테스트 완료');
  };

  const handleRouterTest = () => {
    console.log('Navigating to About page / 정보 페이지로 이동');
    navigate({ to: '/about' });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-md dark:shadow-lg">
      <h2 className="m-0 mb-4 text-gray-900 dark:text-gray-100">Test Page / 테스트 페이지</h2>
      <p className="mb-4 text-gray-700 dark:text-gray-300">
        This page contains various test functions / 이 페이지는 다양한 테스트 함수를 포함합니다
      </p>

      <div className="flex gap-4 flex-wrap mb-4">
        <button
          onClick={handleConsoleTest}
          className="px-6 py-3 text-base border-none rounded bg-indigo-500 text-white cursor-pointer transition-colors hover:bg-indigo-600 active:bg-indigo-700"
        >
          Console Test / 콘솔 테스트
        </button>
        <button
          onClick={handleNetworkTest}
          className="px-6 py-3 text-base border-none rounded bg-indigo-500 text-white cursor-pointer transition-colors hover:bg-indigo-600 active:bg-indigo-700"
        >
          Network Test / 네트워크 테스트
        </button>
        <button
          onClick={handleStorageTest}
          className="px-6 py-3 text-base border-none rounded bg-indigo-500 text-white cursor-pointer transition-colors hover:bg-indigo-600 active:bg-indigo-700"
        >
          Storage Test / 스토리지 테스트
        </button>
        <button
          onClick={handleRouterTest}
          className="px-6 py-3 text-base border-none rounded bg-indigo-500 text-white cursor-pointer transition-colors hover:bg-indigo-600 active:bg-indigo-700"
        >
          Router Test / 라우터 테스트
        </button>
      </div>

      <div className="mt-4">
        <Link
          to="/"
          className="px-6 py-3 text-base border-none rounded bg-gray-500 text-white cursor-pointer transition-colors hover:bg-gray-600 active:bg-gray-700 no-underline inline-block"
        >
          Back to Home / 홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

