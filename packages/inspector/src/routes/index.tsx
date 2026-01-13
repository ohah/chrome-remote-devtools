// Index route (redirects to /web or /tauri based on environment) / 인덱스 라우트 (환경에 따라 /web 또는 /tauri로 리다이렉트)
import { createFileRoute, redirect } from '@tanstack/react-router';

// Check if running in Tauri / Tauri에서 실행 중인지 확인
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// File-based routing: routes/index.tsx automatically maps to `/`
export const Route = createFileRoute('/')({
  // Redirect based on Tauri environment / Tauri 환경에 따라 리다이렉트
  beforeLoad: () => {
    if (isTauri()) {
      // Redirect to Tauri-specific route / Tauri 전용 라우트로 리다이렉트
      throw redirect({
        to: '/tauri',
      });
    } else {
      // Redirect to web-specific route / 웹 전용 라우트로 리다이렉트
      throw redirect({
        to: '/web',
      });
    }
  },
});
