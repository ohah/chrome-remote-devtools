// Object store for CDP objectId (same as web client: same object = same id, getProperties/releaseObject) / CDP objectId용 객체 저장소 (웹과 동일: 동일 객체 = 동일 id, getProperties/releaseObject)
// Max entries to avoid unbounded growth (align with RN/DevTools-style limits) / 무한 증가 방지 (RN·DevTools 수준 제한)
const MAX_OBJECT_STORE_SIZE = 10_000;

const objectIds = new Map<unknown, string>();
const objects = new Map<string, unknown>();
let nextId = 1;

/** Evict oldest entry when at limit (Map insertion order) / 한도 시 가장 오래된 항목 제거 */
function evictOldestIfNeeded(): void {
  if (objects.size < MAX_OBJECT_STORE_SIZE) return;
  const oldestId = objects.keys().next().value as string | undefined;
  if (oldestId === undefined) return;
  const oldestObj = objects.get(oldestId);
  objects.delete(oldestId);
  if (oldestObj !== undefined) objectIds.delete(oldestObj);
}

/**
 * Get or create objectId for a value; same object reference = same id / 값에 대한 objectId 조회 또는 생성, 동일 참조 = 동일 id
 */
export function getOrCreateObjectId(obj: unknown): string {
  const existing = objectIds.get(obj);
  if (existing) return existing;
  evictOldestIfNeeded();
  const id = String(nextId++);
  objects.set(id, obj);
  objectIds.set(obj, id);
  return id;
}

/**
 * Release object by objectId (DevTools calls Runtime.releaseObject) / objectId로 객체 해제
 */
export function releaseObject(objectId: string): void {
  const obj = objects.get(objectId);
  if (obj !== undefined) {
    objects.delete(objectId);
    objectIds.delete(obj);
  }
}

/**
 * Get stored object by objectId / objectId로 저장된 객체 조회
 */
export function getObject(objectId: string): unknown {
  return objects.get(objectId);
}
