// Tauri route - redirects to default mode / Tauri 라우트 - 기본 모드로 리다이렉트
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/tauri')({
  // Redirect to default mode / 기본 모드로 리다이렉트
  beforeLoad: () => {
    throw redirect({
      to: '/web',
    });
  },
});
