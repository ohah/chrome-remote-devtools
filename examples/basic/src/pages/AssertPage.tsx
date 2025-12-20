import { useEffect } from 'react';
import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertThrows,
  assertManager,
} from '../utils/assert';
import './AssertPage.css';

// Assert test page / Assert 테스트 페이지
function AssertPage() {
  useEffect(() => {
    // Clear previous results / 이전 결과 지우기
    assertManager.clearResults();
  }, []);

  const runBasicTests = () => {
    assertManager.clearResults();

    // Basic equality tests / 기본 동등성 테스트
    assertEqual(1, 1, 'Numbers are equal / 숫자가 동일함');
    assertEqual(1, 2, 'Numbers are not equal / 숫자가 동일하지 않음');
    assertEqual('hello', 'hello', 'Strings are equal / 문자열이 동일함');
    assertEqual('hello', 'world', 'Strings are not equal / 문자열이 동일하지 않음');
    assertEqual(true, true, 'Booleans are equal / 불린이 동일함');
    assertEqual(true, false, 'Booleans are not equal / 불린이 동일하지 않음');
  };

  const runDeepEqualTests = () => {
    assertManager.clearResults();

    // Deep equality tests / 깊은 동등성 테스트
    assertEqual(
      { a: 1, b: 2 },
      { a: 1, b: 2 },
      'Objects are deeply equal / 객체가 깊게 동일함'
    );
    assertEqual(
      { a: 1, b: 2 },
      { a: 1, b: 3 },
      'Objects are not deeply equal / 객체가 깊게 동일하지 않음'
    );
    assertEqual([1, 2, 3], [1, 2, 3], 'Arrays are deeply equal / 배열이 깊게 동일함');
    assertEqual(
      [1, 2, 3],
      [1, 2, 4],
      'Arrays are not deeply equal / 배열이 깊게 동일하지 않음'
    );
    assertEqual(
      { a: { b: { c: 1 } } },
      { a: { b: { c: 1 } } },
      'Nested objects are deeply equal / 중첩 객체가 깊게 동일함'
    );
  };

  const runBooleanTests = () => {
    assertManager.clearResults();

    // Boolean tests / 불린 테스트
    assertTrue(true, 'True is true / 참은 참');
    assertTrue(false, 'False is not true / 거짓은 참이 아님');
    assertFalse(false, 'False is false / 거짓은 거짓');
    assertFalse(true, 'True is not false / 참은 거짓이 아님');
  };

  const runThrowsTests = () => {
    assertManager.clearResults();

    // Throws tests / 예외 테스트
    assertThrows(() => {
      throw new Error('Test error');
    }, 'Function throws error / 함수가 에러를 던짐');
    assertThrows(() => {
      // No error thrown / 에러를 던지지 않음
    }, 'Function does not throw error / 함수가 에러를 던지지 않음');
  };

  const runComplexTests = () => {
    assertManager.clearResults();

    // Complex tests / 복잡한 테스트
    const obj1 = { name: 'Alice', age: 25, hobbies: ['reading', 'coding'] };
    const obj2 = { name: 'Alice', age: 25, hobbies: ['reading', 'coding'] };
    const obj3 = { name: 'Bob', age: 30, hobbies: ['reading'] };

    assertEqual(obj1, obj2, 'Complex objects are equal / 복잡한 객체가 동일함');
    assertEqual(obj1, obj3, 'Complex objects are not equal / 복잡한 객체가 동일하지 않음');

    assertEqual(obj1.name, 'Alice', 'Object property is equal / 객체 속성이 동일함');
    assertEqual(obj1.age, 25, 'Object property number is equal / 객체 속성 숫자가 동일함');
  };

  const runAllTests = () => {
    assertManager.clearResults();
    runBasicTests();
    runDeepEqualTests();
    runBooleanTests();
    runThrowsTests();
    runComplexTests();
  };

  return (
    <div className="assert-page">
      <h1>Assert Test / Assert 테스트</h1>
      <p>
        Run tests and see results in the assert panel below / 테스트를 실행하고 아래 assert 패널에서
        결과를 확인하세요
      </p>

      <div className="test-buttons">
        <button onClick={runBasicTests}>Basic Tests / 기본 테스트</button>
        <button onClick={runDeepEqualTests}>Deep Equal Tests / 깊은 동등성 테스트</button>
        <button onClick={runBooleanTests}>Boolean Tests / 불린 테스트</button>
        <button onClick={runThrowsTests}>Throws Tests / 예외 테스트</button>
        <button onClick={runComplexTests}>Complex Tests / 복잡한 테스트</button>
        <button onClick={runAllTests} className="run-all">
          Run All Tests / 모든 테스트 실행
        </button>
      </div>

      <div className="test-info">
        <h2>About Assertions / Assertion에 대해</h2>
        <p>
          This page demonstrates the use of es-toolkit for assertions. The assert functions use
          es-toolkit's <code>isEqual</code> function to compare values (deep comparison).
        </p>
        <p>
          이 페이지는 es-toolkit을 사용한 assertion을 보여줍니다. assert 함수는 es-toolkit의{' '}
          <code>isEqual</code> 함수를 사용하여 값을 비교합니다 (깊은 비교).
        </p>
        <p>
          All test results are displayed in the assert panel at the bottom of the page. You can use
          these assertions in your actual code as well.
        </p>
        <p>
          모든 테스트 결과는 페이지 하단의 assert 패널에 표시됩니다. 실제 코드에서도 이러한
          assertion을 사용할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

export default AssertPage;
