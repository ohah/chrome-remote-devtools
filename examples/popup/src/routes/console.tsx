// Console route / 콘솔 라우트
import { createFileRoute } from '@tanstack/react-router';
import ConsolePage from '../pages/ConsolePage';

export const Route = createFileRoute('/console')({
  component: ConsolePage,
});
