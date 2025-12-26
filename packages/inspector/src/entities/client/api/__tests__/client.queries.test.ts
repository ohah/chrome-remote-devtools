// Client queries factory tests / 클라이언트 쿼리 팩토리 테스트
import { describe, test, expect } from 'bun:test';
import { clientQueries } from '../client.queries';
import { CLIENT_REFRESH_INTERVAL } from '@/shared/lib';

describe('clientQueries', () => {
  test('should have correct query key structure / 올바른 쿼리 키 구조를 가져야 함', () => {
    const allKey = clientQueries.all();
    const listsKey = clientQueries.lists();
    const listOptions = clientQueries.list();

    expect(allKey).toEqual(['clients']);
    expect(listsKey).toEqual(['clients', 'list']);
    // Compare queryKey as array / queryKey를 배열로 비교
    expect([...listOptions.queryKey]).toEqual(['clients', 'list']);
  });

  test('should have query function / 쿼리 함수를 가져야 함', () => {
    const listOptions = clientQueries.list();

    expect(listOptions.queryFn).toBeDefined();
    expect(typeof listOptions.queryFn).toBe('function');
  });

  test('should have refetchInterval configured / refetchInterval이 설정되어 있어야 함', () => {
    const listOptions = clientQueries.list();

    expect(listOptions.refetchInterval).toBe(CLIENT_REFRESH_INTERVAL);
  });

  test('should have staleTime configured / staleTime이 설정되어 있어야 함', () => {
    const listOptions = clientQueries.list();

    expect(listOptions.staleTime).toBe(1000);
  });

  test('should have placeholderData configured / placeholderData가 설정되어 있어야 함', () => {
    const listOptions = clientQueries.list();

    expect(listOptions.placeholderData).toBeDefined();
    expect(typeof listOptions.placeholderData).toBe('function');
  });

  test('should return queryOptions object / queryOptions 객체를 반환해야 함', () => {
    const listOptions = clientQueries.list();

    expect(listOptions).toHaveProperty('queryKey');
    expect(listOptions).toHaveProperty('queryFn');
    expect(listOptions).toHaveProperty('refetchInterval');
    expect(listOptions).toHaveProperty('staleTime');
  });
});
