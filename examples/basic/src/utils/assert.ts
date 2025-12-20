// Assert utility using es-toolkit / es-toolkit을 사용한 assert 유틸리티
import { isEqual } from 'es-toolkit';

export interface AssertResult {
  id: string;
  name: string;
  passed: boolean;
  message?: string;
  timestamp: number;
}

class AssertManager {
  private results: AssertResult[] = [];
  private listeners: Array<(results: AssertResult[]) => void> = [];

  // Add assert result / assert 결과 추가
  addResult(result: AssertResult): void {
    this.results.push(result);
    this.notifyListeners();
  }

  // Get all results / 모든 결과 가져오기
  getResults(): AssertResult[] {
    return [...this.results];
  }

  // Clear all results / 모든 결과 지우기
  clearResults(): void {
    this.results = [];
    this.notifyListeners();
  }

  // Subscribe to result changes / 결과 변경 구독
  subscribe(listener: (results: AssertResult[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Notify listeners / 리스너에 알림
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.results));
  }
}

export const assertManager = new AssertManager();

// Generate unique ID / 고유 ID 생성
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Assert equal / 동등성 검증
export function assertEqual<T>(actual: T, expected: T, name?: string): boolean {
  const passed = isEqual(actual, expected);
  const message = passed
    ? undefined
    : `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`;
  assertManager.addResult({
    id: generateId(),
    name: name || 'assertEqual',
    passed,
    message,
    timestamp: Date.now(),
  });
  return passed;
}

// Assert true / 참 검증
export function assertTrue(condition: boolean, name?: string): boolean {
  const passed = condition === true;
  const message = passed ? undefined : `Expected true, but got false`;
  assertManager.addResult({
    id: generateId(),
    name: name || 'assertTrue',
    passed,
    message,
    timestamp: Date.now(),
  });
  return passed;
}

// Assert false / 거짓 검증
export function assertFalse(condition: boolean, name?: string): boolean {
  const passed = condition === false;
  const message = passed ? undefined : `Expected false, but got true`;
  assertManager.addResult({
    id: generateId(),
    name: name || 'assertFalse',
    passed,
    message,
    timestamp: Date.now(),
  });
  return passed;
}

// Assert throws / 예외 발생 검증
export function assertThrows(fn: () => void, name?: string): boolean {
  try {
    fn();
    const passed = false;
    assertManager.addResult({
      id: generateId(),
      name: name || 'assertThrows',
      passed,
      message: 'Expected function to throw, but it did not',
      timestamp: Date.now(),
    });
    return passed;
  } catch {
    const passed = true;
    assertManager.addResult({
      id: generateId(),
      name: name || 'assertThrows',
      passed,
      timestamp: Date.now(),
    });
    return passed;
  }
}
