// Index route / 인덱스 라우트 (Home page / 홈 페이지)
import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="p-8 text-center w-full box-border bg-gray-900 min-h-screen">
      <h1 className="mb-4 text-white text-4xl font-semibold">Chrome Remote DevTools Test</h1>
      <p className="mb-8 text-gray-400 text-lg">
        Select a test page to verify CDP domain functionality / CDP 도메인 기능을 확인할 테스트
        페이지를 선택하세요
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 w-full max-w-none mx-0 px-8 box-border">
        <Link
          to="/console"
          className="block p-6 border border-gray-600 rounded-lg no-underline text-inherit transition-all bg-gray-800 shadow-lg hover:border-blue-500 hover:shadow-[0_4px_12px_rgba(100,108,255,0.3)] hover:-translate-y-0.5 hover:bg-gray-700"
        >
          <h2 className="m-0 mb-2 text-blue-400 text-2xl font-semibold">Console</h2>
          <p className="m-0 text-gray-300 text-sm">
            Test console logging and messages / 콘솔 로깅 및 메시지 테스트
          </p>
        </Link>
        <Link
          to="/network"
          className="block p-6 border border-gray-600 rounded-lg no-underline text-inherit transition-all bg-gray-800 shadow-lg hover:border-blue-500 hover:shadow-[0_4px_12px_rgba(100,108,255,0.3)] hover:-translate-y-0.5 hover:bg-gray-700"
        >
          <h2 className="m-0 mb-2 text-blue-400 text-2xl font-semibold">Network</h2>
          <p className="m-0 text-gray-300 text-sm">
            Test network requests (fetch, XHR) / 네트워크 요청 테스트 (fetch, XHR)
          </p>
        </Link>
        <Link
          to="/storage"
          className="block p-6 border border-gray-600 rounded-lg no-underline text-inherit transition-all bg-gray-800 shadow-lg hover:border-blue-500 hover:shadow-[0_4px_12px_rgba(100,108,255,0.3)] hover:-translate-y-0.5 hover:bg-gray-700"
        >
          <h2 className="m-0 mb-2 text-blue-400 text-2xl font-semibold">Storage</h2>
          <p className="m-0 text-gray-300 text-sm">
            Test localStorage and sessionStorage / localStorage 및 sessionStorage 테스트
          </p>
        </Link>
      </div>
    </div>
  );
}
