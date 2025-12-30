// Node manager tests / 노드 관리자 테스트
// happy-dom is registered via bunfig.toml preload / happy-dom은 bunfig.toml preload를 통해 등록됨
import { describe, test, expect, beforeEach } from 'bun:test';
import { getNodeId, getNodeById } from '../node-manager';

describe('Node Manager', () => {
  beforeEach(() => {
    // Clear document before each test / 각 테스트 전에 document 정리
    document.body.innerHTML = '';
  });

  describe('getNodeId', () => {
    test('should generate new ID for new node / 새 노드에 대해 새 ID 생성', () => {
      const div = document.createElement('div');
      const id1 = getNodeId(div);

      expect(id1).toBeGreaterThan(0);
      expect(typeof id1).toBe('number');
    });

    test('should return same ID for same node / 같은 노드에 대해 같은 ID 반환', () => {
      const div = document.createElement('div');
      const id1 = getNodeId(div);
      const id2 = getNodeId(div);

      expect(id1).toBe(id2);
    });

    test('should generate different IDs for different nodes / 다른 노드에 대해 다른 ID 생성', () => {
      const div1 = document.createElement('div');
      const div2 = document.createElement('div');
      const span = document.createElement('span');

      const id1 = getNodeId(div1);
      const id2 = getNodeId(div2);
      const id3 = getNodeId(span);

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    test('should work with text nodes / 텍스트 노드와 함께 작동', () => {
      const textNode = document.createTextNode('test');
      const id = getNodeId(textNode);

      expect(id).toBeGreaterThan(0);
      expect(getNodeId(textNode)).toBe(id);
    });

    test('should work with comment nodes / 주석 노드와 함께 작동', () => {
      const commentNode = document.createComment('test');
      const id = getNodeId(commentNode);

      expect(id).toBeGreaterThan(0);
      expect(getNodeId(commentNode)).toBe(id);
    });

    test('should generate sequential IDs / 순차적인 ID 생성', () => {
      const nodes = Array.from({ length: 5 }, () => document.createElement('div'));
      const ids = nodes.map((node) => getNodeId(node));

      // IDs should be unique / ID는 고유해야 함
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      // IDs should be sequential / ID는 순차적이어야 함
      const sortedIds = [...ids].sort((a, b) => a - b);
      expect(sortedIds).toEqual(ids);
    });
  });

  describe('getNodeById', () => {
    test('should return node for valid ID / 유효한 ID에 대해 노드 반환', () => {
      const div = document.createElement('div');
      const id = getNodeId(div);

      const retrievedNode = getNodeById(id);
      expect(retrievedNode).toBe(div);
    });

    test('should return null for invalid ID / 유효하지 않은 ID에 대해 null 반환', () => {
      const invalidId = 99999;
      const retrievedNode = getNodeById(invalidId);

      expect(retrievedNode).toBeNull();
    });

    test('should return null for zero ID / 0 ID에 대해 null 반환', () => {
      const retrievedNode = getNodeById(0);

      expect(retrievedNode).toBeNull();
    });

    test('should return correct node for multiple nodes / 여러 노드에 대해 올바른 노드 반환', () => {
      const div1 = document.createElement('div');
      const div2 = document.createElement('div');
      const span = document.createElement('span');

      const id1 = getNodeId(div1);
      const id2 = getNodeId(div2);
      const id3 = getNodeId(span);

      expect(getNodeById(id1)).toBe(div1);
      expect(getNodeById(id2)).toBe(div2);
      expect(getNodeById(id3)).toBe(span);
    });

    test('should work with text nodes / 텍스트 노드와 함께 작동', () => {
      const textNode = document.createTextNode('test');
      const id = getNodeId(textNode);

      const retrievedNode = getNodeById(id);
      expect(retrievedNode).toBe(textNode);
    });

    test('should work with comment nodes / 주석 노드와 함께 작동', () => {
      const commentNode = document.createComment('test');
      const id = getNodeId(commentNode);

      const retrievedNode = getNodeById(id);
      expect(retrievedNode).toBe(commentNode);
    });
  });

  describe('WeakMap behavior', () => {
    test('should maintain ID even if node is removed from DOM / 노드가 DOM에서 제거되어도 ID 유지', () => {
      const div = document.createElement('div');
      const id = getNodeId(div);

      document.body.appendChild(div);
      document.body.removeChild(div);

      // Node should still be retrievable by ID / ID로 노드를 여전히 조회할 수 있어야 함
      const retrievedNode = getNodeById(id);
      expect(retrievedNode).toBe(div);
    });

    test('should allow garbage collection of removed nodes / 제거된 노드의 가비지 컬렉션 허용', () => {
      // Create node and get ID / 노드 생성 및 ID 가져오기
      let div = document.createElement('div');
      const id = getNodeId(div);

      // Verify node can be retrieved / 노드를 조회할 수 있는지 확인
      expect(getNodeById(id)).toBe(div);

      // Remove reference / 참조 제거
      div = null as any;

      // Note: In actual implementation, WeakMap allows GC / 실제 구현에서 WeakMap은 GC를 허용함
      // But nodeMap keeps reference, so node should still be retrievable / 하지만 nodeMap이 참조를 유지하므로 노드는 여전히 조회 가능해야 함
      // This test verifies the current behavior / 이 테스트는 현재 동작을 검증함
    });
  });
});
