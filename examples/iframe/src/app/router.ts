// Create router instance / 라우터 인스턴스 생성
import { createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';

// Create router / 라우터 생성
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Register router for type safety / 타입 안전성을 위한 라우터 등록
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

