import 'zustand/middleware';

import { devtools as zustandDevtools } from 'zustand/middleware';
import type { DevtoolsOptions } from 'zustand/middleware';
import type { StoreMutatorIdentifier, StateCreator } from 'zustand';

/**
 * Zustand devtools middleware with auto-enabled for React Native
 * React Native를 위해 자동으로 enabled: true가 설정된 Zustand devtools 미들웨어
 *
 * This wrapper automatically sets enabled: true, which is required in React Native
 * because import.meta.env?.MODE is undefined in React Native environment
 * 이 래퍼는 enabled: true를 자동으로 설정합니다. React Native 환경에서는
 * import.meta.env?.MODE가 undefined이므로 필수입니다
 */
export function devtools<
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
  U = T,
>(
  initializer: StateCreator<T, [...Mps, ['zustand/devtools', never]], Mcs, U>,
  devtoolsOptions?: Omit<DevtoolsOptions, 'enabled'>
) {
  return zustandDevtools(initializer, {
    ...devtoolsOptions,
    enabled: true,
  });
}
