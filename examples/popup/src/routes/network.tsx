// Network route / 네트워크 라우트
import { createFileRoute } from '@tanstack/react-router';
import NetworkPage from '../pages/NetworkPage';

export const Route = createFileRoute('/network')({
  component: NetworkPage,
});
