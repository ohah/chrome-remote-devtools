// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * MMKVStorageItemsView tests / MMKVStorageItemsView 테스트
 * Unit tests for validateValueForType / validateValueForType 단위 테스트
 */
import { describeWithEnvironment } from '../../testing/EnvironmentHelpers.js';
import { validateValueForType } from './MMKVStorageItemsView.js';
describeWithEnvironment('MMKVStorageItemsView', () => {
    describe('validateValueForType', () => {
        it('accepts any value for string type / string 타입은 모든 값 허용', () => {
            assert.isTrue(validateValueForType('', 'string').valid);
            assert.isTrue(validateValueForType('hello', 'string').valid);
            assert.isTrue(validateValueForType('123', 'string').valid);
            assert.isTrue(validateValueForType('true', 'string').valid);
        });
        it('accepts valid numbers for number type / number 타입은 유효한 숫자 허용', () => {
            assert.isTrue(validateValueForType('0', 'number').valid);
            assert.isTrue(validateValueForType('42', 'number').valid);
            assert.isTrue(validateValueForType('-1', 'number').valid);
            assert.isTrue(validateValueForType('3.14', 'number').valid);
            assert.isTrue(validateValueForType('  42  ', 'number').valid);
        });
        it('rejects invalid values for number type / number 타입은 잘못된 값 거부', () => {
            const empty = validateValueForType('', 'number');
            assert.isFalse(empty.valid);
            assert.isDefined(empty.message);
            const whitespace = validateValueForType('   ', 'number');
            assert.isFalse(whitespace.valid);
            const nan = validateValueForType('abc', 'number');
            assert.isFalse(nan.valid);
            const infinity = validateValueForType('Infinity', 'number');
            assert.isFalse(infinity.valid);
        });
        it('accepts only "true" and "false" for boolean type / boolean 타입은 "true"/"false"만 허용', () => {
            assert.isTrue(validateValueForType('true', 'boolean').valid);
            assert.isTrue(validateValueForType('false', 'boolean').valid);
        });
        it('rejects invalid values for boolean type / boolean 타입은 잘못된 값 거부', () => {
            assert.isFalse(validateValueForType('', 'boolean').valid);
            assert.isFalse(validateValueForType('1', 'boolean').valid);
            assert.isFalse(validateValueForType('0', 'boolean').valid);
            assert.isFalse(validateValueForType('yes', 'boolean').valid);
            assert.isFalse(validateValueForType('True', 'boolean').valid);
            assert.isFalse(validateValueForType('FALSE', 'boolean').valid);
        });
        it('accepts valid JSON array of 0-255 for buffer type / buffer 타입은 0-255 JSON 배열 허용', () => {
            assert.isTrue(validateValueForType('[0,1,2]', 'buffer').valid);
            assert.isTrue(validateValueForType('[255]', 'buffer').valid);
            assert.isTrue(validateValueForType('[]', 'buffer').valid);
            assert.isTrue(validateValueForType('  [0, 128, 255]  ', 'buffer').valid);
        });
        it('rejects invalid values for buffer type / buffer 타입은 잘못된 값 거부', () => {
            const empty = validateValueForType('', 'buffer');
            assert.isFalse(empty.valid);
            assert.isDefined(empty.message);
            assert.isFalse(validateValueForType('   ', 'buffer').valid);
            assert.isFalse(validateValueForType('{}', 'buffer').valid);
            assert.isFalse(validateValueForType('"[1,2]"', 'buffer').valid);
            assert.isFalse(validateValueForType('[1, 256]', 'buffer').valid);
            assert.isFalse(validateValueForType('[-1]', 'buffer').valid);
            assert.isFalse(validateValueForType('[1.5]', 'buffer').valid);
            assert.isFalse(validateValueForType('[1, "x"]', 'buffer').valid);
            assert.isFalse(validateValueForType('not json', 'buffer').valid);
        });
    });
});
//# sourceMappingURL=MMKVStorageItemsView.test.js.map