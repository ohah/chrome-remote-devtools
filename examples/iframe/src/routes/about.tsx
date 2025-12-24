// About page route / 정보 페이지 라우트
import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-md dark:shadow-lg">
      <h2 className="m-0 mb-4 text-gray-900 dark:text-gray-100">About / 정보</h2>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Chrome Remote DevTools / Chrome 원격 DevTools
        </h3>
        <p className="mb-2 text-gray-700 dark:text-gray-300">
          This example demonstrates DevTools integration with iframe and popup modes / 이 예제는
          iframe 및 팝업 모드로 DevTools 통합을 보여줍니다
        </p>
        <ul className="list-disc list-inside mb-4 text-gray-700 dark:text-gray-300">
          <li>iframe mode: DevTools displayed in a resizable panel / iframe 모드: 크기 조절 가능한 패널에 DevTools 표시</li>
          <li>popup mode: DevTools opened in a separate popup window / 팝업 모드: 별도의 팝업 창에서 DevTools 열기</li>
          <li>postMessage communication: WebSocket-free communication / postMessage 통신: WebSocket 없는 통신</li>
          <li>Router navigation: Test navigation between pages / 라우터 네비게이션: 페이지 간 네비게이션 테스트</li>
        </ul>
      </div>

      <div className="mt-4">
        <Link
          to="/"
          className="px-6 py-3 text-base border-none rounded bg-gray-500 text-white cursor-pointer transition-colors hover:bg-gray-600 active:bg-gray-700 no-underline inline-block mr-2"
        >
          Back to Home / 홈으로 돌아가기
        </Link>
        <Link
          to="/test"
          className="px-6 py-3 text-base border-none rounded bg-indigo-500 text-white cursor-pointer transition-colors hover:bg-indigo-600 active:bg-indigo-700 no-underline inline-block"
        >
          Go to Test Page / 테스트 페이지로 이동
        </Link>
      </div>
    </div>
  );
}

