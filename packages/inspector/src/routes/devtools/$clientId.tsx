// DevTools route / 데브툴 라우트
// File-based routing: routes/devtools/$clientId.tsx automatically maps to `/devtools/$clientId` / 파일 기반 라우팅: routes/devtools/$clientId.tsx가 자동으로 `/devtools/$clientId`에 매핑됨
import { createFileRoute } from '@tanstack/react-router';
import { component } from '@/pages/devtools';

export const Route = createFileRoute('/devtools/$clientId')({
  component,
});

