// Storage route / 스토리지 라우트
import { createFileRoute } from '@tanstack/react-router';
import StoragePage from '../pages/StoragePage';

export const Route = createFileRoute('/storage')({
  component: StoragePage,
});
